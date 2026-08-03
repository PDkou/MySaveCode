import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { useFamily } from './FamilyContext';
import type { TaskRecurrence, TaskRow } from '../types/database';

export interface NewTaskInput {
  title: string;
  details: string;
  assigneeIds: string[];
  dueAt: string | null;
  recurrence: TaskRecurrence;
  startsAt: string | null;
  recurrenceWeekdays: number[] | null;
  stakePoints: number;
}

// Thrown by createTask specifically for create_task's 'insufficient_points'
// error, so the form can show a targeted message instead of the generic
// "something went wrong" -- everything else about task creation still just
// throws the raw Supabase error, unchanged.
export class InsufficientPointsError extends Error {}

// create_task's 'stake_too_low' -- no free quests in a shared room, 5
// minimum. The form validates this client-side before submitting, so this
// mainly guards a direct API call bypassing the UI.
export class StakeTooLowError extends Error {}

const UNDO_WINDOW_MS = 5000;

interface TasksContextValue {
  tasks: TaskRow[];
  assigneesByTaskId: Map<string, string[]>;
  loading: boolean;
  createTask: (input: NewTaskInput) => Promise<void>;
  completeTasks: (taskIds: string[]) => Promise<void>;
  togglePin: (taskId: string, pinned: boolean) => Promise<void>;
  requestDelete: (taskIds: string[]) => void;
  pendingDeleteCount: number;
  undoPendingDelete: () => void;
  refresh: () => Promise<void>;
}

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { family } = useFamily();
  const [rawTasks, setRawTasks] = useState<TaskRow[]>([]);
  const [assigneesByTaskId, setAssigneesByTaskId] = useState<Map<string, string[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const pendingTimerRef = useRef<number | null>(null);

  // Guards against overlapping load() calls landing out of order -- this is
  // called from the initial mount, from every mutation's refresh(), and from
  // two separate realtime channels below, so a single completion can easily
  // fire 2-3 overlapping loads. Without this, a slower earlier response could
  // land after a faster later one and briefly flash a stale task list (e.g.
  // a just-completed task flickering back to "open") -- same class of race
  // as FamilyContext.load() had (2026-08 bug report).
  const loadSeqRef = useRef(0);

  // `silent` skips the loading flag -- right for the very first load, but
  // every task mutation (create/complete/pin/delete) also calls this via
  // refresh(), and the realtime subscription below calls it on every
  // postgres_changes event (including echoes of your own writes). None of
  // those should swap the whole task list out for a spinner and back; the
  // list should just update in place.
  const load = useCallback(async (familyId: string, options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    const mySeq = ++loadSeqRef.current;
    if (!silent) setLoading(true);
    try {
      const [{ data: taskRows, error: tasksErr }, { data: assigneeRows, error: assigneesErr }] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .eq('family_id', familyId)
          .order('due_at', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false }),
        supabase.from('task_assignees').select('task_id, user_id').eq('family_id', familyId),
      ]);
      if (tasksErr) throw tasksErr;
      if (assigneesErr) throw assigneesErr;
      if (loadSeqRef.current !== mySeq) return;

      const map = new Map<string, string[]>();
      (assigneeRows ?? []).forEach((row) => {
        const list = map.get(row.task_id) ?? [];
        list.push(row.user_id);
        map.set(row.task_id, list);
      });

      setRawTasks(taskRows ?? []);
      setAssigneesByTaskId(map);
    } finally {
      if (!silent && loadSeqRef.current === mySeq) setLoading(false);
    }
  }, []);

  // Keyed on family.id, not the family object itself -- FamilyContext.load()
  // mints a new family object on every refresh (including silent background
  // ones triggered by totally unrelated actions elsewhere, e.g. equipping a
  // badge), and depending on the object would tear down/recreate this
  // realtime subscription and re-run the non-silent initial load on every
  // one of those, flashing the whole task list to a spinner for no reason.
  const familyId = family?.id;
  useEffect(() => {
    if (!familyId) {
      setRawTasks([]);
      setAssigneesByTaskId(new Map());
      setLoading(false);
      return;
    }

    void load(familyId);

    const channel = supabase
      .channel(`tasks-changes-${familyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `family_id=eq.${familyId}` },
        () => {
          void load(familyId, { silent: true });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_assignees', filter: `family_id=eq.${familyId}` },
        () => {
          void load(familyId, { silent: true });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [familyId, load]);

  const refresh = useCallback(async () => {
    if (family) {
      await load(family.id, { silent: true });
    }
  }, [family, load]);

  const createTask = useCallback(async (input: NewTaskInput) => {
    if (!family || !user) return;
    // A single RPC (one DB transaction) instead of two separate insert
    // calls, so a dropped connection between them (flaky mobile network)
    // can't leave the task created but reported to the user as failed.
    const { error } = await supabase.rpc('create_task', {
      p_family_id: family.id,
      p_title: input.title.trim(),
      p_details: input.details.trim() ? input.details.trim() : null,
      p_due_at: input.dueAt,
      p_assignee_ids: input.assigneeIds,
      p_recurrence: input.recurrence,
      p_starts_at: input.startsAt,
      p_recurrence_weekdays: input.recurrence === 'weekly' ? input.recurrenceWeekdays : null,
      p_stake_points: input.stakePoints,
    });
    if (error) {
      if (error.message?.includes('insufficient_points')) throw new InsufficientPointsError(error.message);
      if (error.message?.includes('stake_too_low')) throw new StakeTooLowError(error.message);
      throw error;
    }

    await refresh();
  }, [family, user, refresh]);

  // Bulk "mark as done" from the dashboard's select mode -- a faster,
  // note-free counterpart to the single-task completion flow (which
  // requires a completion note/photo). Pre-filtered to 'open' tasks here
  // for clarity, though report_task_completion's own atomic status check
  // would reject an already-reported/done one regardless.
  const completeTasks = useCallback(async (taskIds: string[]) => {
    if (!family || taskIds.length === 0) return;
    const openIds = rawTasks.filter((task) => taskIds.includes(task.id) && task.status === 'open').map((task) => task.id);
    await Promise.all(
      openIds.map((id) =>
        supabase.rpc('report_task_completion', { p_task_id: id, p_completion_note: '', p_completion_photo_path: null }),
      ),
    );
    await refresh();
  }, [family, rawTasks, refresh]);

  const togglePin = useCallback(async (taskId: string, pinned: boolean) => {
    const { error } = await supabase.from('tasks').update({ pinned }).eq('id', taskId);
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const commitPendingDelete = useCallback(async (ids: string[]) => {
    if (pendingTimerRef.current !== null) {
      window.clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    setPendingDeleteIds(null);
    const { error } = await supabase.from('tasks').delete().in('id', ids);
    if (error) {
      // The tasks were only optimistically hidden, never actually removed
      // from the server; refreshing brings them back into view so a failed
      // delete doesn't silently disappear.
      await refresh();
      throw error;
    }
    await refresh();
  }, [refresh]);

  // Deleting doesn't hit the database immediately -- the task(s) are hidden
  // right away, but the actual delete only fires after UNDO_WINDOW_MS
  // unless undoPendingDelete() cancels it first.
  const requestDelete = useCallback((taskIds: string[]) => {
    if (taskIds.length === 0) return;

    if (pendingTimerRef.current !== null) {
      window.clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
      setPendingDeleteIds((prev) => {
        if (prev) void commitPendingDelete(prev);
        return null;
      });
    }

    setPendingDeleteIds(taskIds);
    pendingTimerRef.current = window.setTimeout(() => {
      pendingTimerRef.current = null;
      void commitPendingDelete(taskIds);
    }, UNDO_WINDOW_MS);
  }, [commitPendingDelete]);

  const undoPendingDelete = useCallback(() => {
    if (pendingTimerRef.current !== null) {
      window.clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    setPendingDeleteIds(null);
  }, []);

  useEffect(() => {
    return () => {
      if (pendingTimerRef.current !== null) {
        window.clearTimeout(pendingTimerRef.current);
      }
    };
  }, []);

  const tasks = useMemo(() => {
    if (!pendingDeleteIds) return rawTasks;
    const hidden = new Set(pendingDeleteIds);
    return rawTasks.filter((task) => !hidden.has(task.id));
  }, [rawTasks, pendingDeleteIds]);

  // Home screen app badge: count of open tasks assigned to me. No-op where
  // the Badging API doesn't exist (iOS Safari, most non-Chromium browsers).
  useEffect(() => {
    if (!navigator.setAppBadge) return;
    const myOpenCount = user
      ? tasks.filter((task) => task.status === 'open' && (assigneesByTaskId.get(task.id) ?? []).includes(user.id)).length
      : 0;
    if (myOpenCount > 0) {
      void navigator.setAppBadge(myOpenCount);
    } else {
      void navigator.clearAppBadge?.();
    }
  }, [tasks, assigneesByTaskId, user]);

  const value = useMemo<TasksContextValue>(() => ({
    tasks,
    assigneesByTaskId,
    loading,
    createTask,
    completeTasks,
    togglePin,
    requestDelete,
    pendingDeleteCount: pendingDeleteIds?.length ?? 0,
    undoPendingDelete,
    refresh,
  }), [tasks, assigneesByTaskId, loading, createTask, completeTasks, togglePin, requestDelete, pendingDeleteIds, undoPendingDelete, refresh]);

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return ctx;
}
