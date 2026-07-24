import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { useFamily } from './FamilyContext';
import type { TaskRow } from '../types/database';

export interface NewTaskInput {
  title: string;
  details: string;
  assigneeIds: string[];
  dueAt: string | null;
}

interface TasksContextValue {
  tasks: TaskRow[];
  assigneesByTaskId: Map<string, string[]>;
  loading: boolean;
  createTask: (input: NewTaskInput) => Promise<void>;
  refresh: () => Promise<void>;
}

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { family } = useFamily();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [assigneesByTaskId, setAssigneesByTaskId] = useState<Map<string, string[]>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (familyId: string) => {
    setLoading(true);
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

      const map = new Map<string, string[]>();
      (assigneeRows ?? []).forEach((row) => {
        const list = map.get(row.task_id) ?? [];
        list.push(row.user_id);
        map.set(row.task_id, list);
      });

      setTasks(taskRows ?? []);
      setAssigneesByTaskId(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!family) {
      setTasks([]);
      setAssigneesByTaskId(new Map());
      setLoading(false);
      return;
    }

    void load(family.id);

    const channel = supabase
      .channel(`tasks-changes-${family.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `family_id=eq.${family.id}` },
        () => {
          void load(family.id);
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_assignees', filter: `family_id=eq.${family.id}` },
        () => {
          void load(family.id);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [family, load]);

  const refresh = useCallback(async () => {
    if (family) {
      await load(family.id);
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
    });
    if (error) throw error;

    await refresh();
  }, [family, user, refresh]);

  const value = useMemo<TasksContextValue>(() => ({
    tasks,
    assigneesByTaskId,
    loading,
    createTask,
    refresh,
  }), [tasks, assigneesByTaskId, loading, createTask, refresh]);

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return ctx;
}
