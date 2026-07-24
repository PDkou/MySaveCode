import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabaseClient';
import type { TaskActivityRow, TaskRecurrence, TaskRow } from '../types/database';

export interface TaskEditInput {
  title: string;
  details: string;
  dueAt: string | null;
  assigneeIds: string[];
  recurrence: TaskRecurrence;
}

interface UseTaskDetailResult {
  task: TaskRow | null;
  assigneeIds: string[];
  activities: TaskActivityRow[];
  loading: boolean;
  notFound: boolean;
  completeTask: (completionNote: string) => Promise<void>;
  reopenTask: () => Promise<void>;
  updateTask: (input: TaskEditInput) => Promise<void>;
}

export function useTaskDetail(taskId: string | undefined): UseTaskDetailResult {
  const [task, setTask] = useState<TaskRow | null>(null);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [activities, setActivities] = useState<TaskActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const loadTask = useCallback(async (id: string) => {
    const { data, error } = await supabase.from('tasks').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    setTask(data);
    setNotFound(!data);
  }, []);

  const loadAssignees = useCallback(async (id: string) => {
    const { data, error } = await supabase.from('task_assignees').select('user_id').eq('task_id', id);
    if (error) throw error;
    setAssigneeIds((data ?? []).map((row) => row.user_id));
  }, []);

  const loadActivities = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('task_activities')
      .select('*')
      .eq('task_id', id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    setActivities(data ?? []);
  }, []);

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      setAssigneeIds([]);
      setActivities([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all([loadTask(taskId), loadAssignees(taskId), loadActivities(taskId)]).finally(() => {
      if (!cancelled) setLoading(false);
    });

    const channel = supabase
      .channel(`task-detail-${taskId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `id=eq.${taskId}` },
        () => {
          void loadTask(taskId);
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_assignees', filter: `task_id=eq.${taskId}` },
        () => {
          void loadAssignees(taskId);
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_activities', filter: `task_id=eq.${taskId}` },
        () => {
          void loadActivities(taskId);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [taskId, loadTask, loadAssignees, loadActivities]);

  const completeTask = useCallback(async (completionNote: string) => {
    if (!taskId) return;
    // RPC rather than a plain update: completing a recurring task also
    // creates its next occurrence (copying assignees) in the same
    // transaction as the completion.
    const { error } = await supabase.rpc('complete_task', {
      p_task_id: taskId,
      p_completion_note: completionNote.trim(),
    });
    if (error) throw error;
    await loadTask(taskId);
    await loadActivities(taskId);
  }, [taskId, loadTask, loadActivities]);

  const reopenTask = useCallback(async () => {
    if (!taskId) return;
    const { error } = await supabase
      .from('tasks')
      .update({
        status: 'open',
        completed_at: null,
        completed_by: null,
        completion_note: null,
      })
      .eq('id', taskId);
    if (error) throw error;
    await loadTask(taskId);
    await loadActivities(taskId);
  }, [taskId, loadTask, loadActivities]);

  const updateTask = useCallback(async (input: TaskEditInput) => {
    if (!taskId) return;
    // One RPC (one DB transaction) instead of update + delete + insert as
    // three separate calls -- see create_task for why that matters.
    const { error } = await supabase.rpc('update_task', {
      p_task_id: taskId,
      p_title: input.title.trim(),
      p_details: input.details.trim() ? input.details.trim() : null,
      p_due_at: input.dueAt,
      p_assignee_ids: input.assigneeIds,
      p_recurrence: input.recurrence,
    });
    if (error) throw error;

    await loadTask(taskId);
    await loadAssignees(taskId);
  }, [taskId, loadTask, loadAssignees]);

  return {
    task,
    assigneeIds,
    activities,
    loading,
    notFound,
    completeTask,
    reopenTask,
    updateTask,
  };
}
