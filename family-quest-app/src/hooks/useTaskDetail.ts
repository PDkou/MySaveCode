import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { levelForPoints } from '../lib/gamification';
import type { CompletionResult } from '../lib/gamification';
import type { BadgeKey, TaskActivityRow, TaskCommentRow, TaskRecurrence, TaskRow } from '../types/database';

export interface TaskEditInput {
  title: string;
  details: string;
  dueAt: string | null;
  assigneeIds: string[];
  recurrence: TaskRecurrence;
  startsAt: string | null;
  recurrenceWeekdays: number[] | null;
}

interface UseTaskDetailResult {
  task: TaskRow | null;
  assigneeIds: string[];
  activities: TaskActivityRow[];
  comments: TaskCommentRow[];
  loading: boolean;
  notFound: boolean;
  completeTask: (completionNote: string, completionPhotoPath: string | null) => Promise<CompletionResult | null>;
  reopenTask: () => Promise<void>;
  updateTask: (input: TaskEditInput) => Promise<void>;
  addComment: (body: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
}

export function useTaskDetail(taskId: string | undefined): UseTaskDetailResult {
  const { user } = useAuth();
  const [task, setTask] = useState<TaskRow | null>(null);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [activities, setActivities] = useState<TaskActivityRow[]>([]);
  const [comments, setComments] = useState<TaskCommentRow[]>([]);
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

  const loadComments = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    setComments(data ?? []);
  }, []);

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      setAssigneeIds([]);
      setActivities([]);
      setComments([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all([loadTask(taskId), loadAssignees(taskId), loadActivities(taskId), loadComments(taskId)]).finally(() => {
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_comments', filter: `task_id=eq.${taskId}` },
        () => {
          void loadComments(taskId);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [taskId, loadTask, loadAssignees, loadActivities, loadComments]);

  const completeTask = useCallback(async (completionNote: string, completionPhotoPath: string | null): Promise<CompletionResult | null> => {
    if (!taskId || !task || !user) return null;
    const familyId = task.family_id;

    // Snapshot the completer's points/streak/badges before the RPC runs so
    // the celebration UI can diff before vs. after -- complete_task itself
    // still returns just the task row (unchanged API), see schema.sql.
    const [{ data: prevMember }, { data: prevBadgeRows }] = await Promise.all([
      supabase.from('family_members').select('points, xp, current_streak').eq('family_id', familyId).eq('user_id', user.id).maybeSingle(),
      supabase.from('member_badges').select('badge_key').eq('family_id', familyId).eq('user_id', user.id),
    ]);
    const prevBadgeKeys = new Set((prevBadgeRows ?? []).map((b) => b.badge_key));

    // RPC rather than a plain update: completing a recurring task also
    // creates its next occurrence (copying assignees) in the same
    // transaction as the completion.
    const { error } = await supabase.rpc('complete_task', {
      p_task_id: taskId,
      p_completion_note: completionNote.trim(),
      p_completion_photo_path: completionPhotoPath,
    });
    if (error) throw error;
    await loadTask(taskId);
    await loadActivities(taskId);

    if (!prevMember) return null;

    const [{ data: newMember }, { data: newBadgeRows }] = await Promise.all([
      supabase.from('family_members').select('points, xp, current_streak').eq('family_id', familyId).eq('user_id', user.id).maybeSingle(),
      supabase.from('member_badges').select('badge_key').eq('family_id', familyId).eq('user_id', user.id),
    ]);
    if (!newMember) return null;

    const newBadges = (newBadgeRows ?? [])
      .map((b) => b.badge_key as BadgeKey)
      .filter((key) => !prevBadgeKeys.has(key));
    const prevLevel = levelForPoints(prevMember.xp);
    const newLevel = levelForPoints(newMember.xp);

    return {
      pointsGained: newMember.points - prevMember.points,
      newPoints: newMember.points,
      newLevel,
      leveledUp: newLevel > prevLevel,
      newStreak: newMember.current_streak,
      streakIncreased: newMember.current_streak > prevMember.current_streak,
      newBadges,
    };
  }, [taskId, task, user, loadTask, loadActivities]);

  const reopenTask = useCallback(async () => {
    if (!taskId) return;
    // RPC rather than a plain update: it also rolls back the completer's
    // points/streak/completed_count so toggling complete/reopen doesn't
    // let those climb forever -- see reopen_task in schema.sql.
    const { error } = await supabase.rpc('reopen_task', { p_task_id: taskId });
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
      p_starts_at: input.startsAt,
      p_recurrence_weekdays: input.recurrence === 'weekly' ? input.recurrenceWeekdays : null,
    });
    if (error) throw error;

    await loadTask(taskId);
    await loadAssignees(taskId);
  }, [taskId, loadTask, loadAssignees]);

  const addComment = useCallback(async (body: string) => {
    const trimmed = body.trim();
    if (!taskId || !task || !user || !trimmed) return;
    const { error } = await supabase.from('task_comments').insert({
      task_id: taskId,
      family_id: task.family_id,
      author_id: user.id,
      body: trimmed,
    });
    if (error) throw error;
    await loadComments(taskId);
  }, [taskId, task, user, loadComments]);

  const deleteComment = useCallback(async (commentId: string) => {
    if (!taskId) return;
    const { error } = await supabase.from('task_comments').delete().eq('id', commentId);
    if (error) throw error;
    await loadComments(taskId);
  }, [taskId, loadComments]);

  return {
    task,
    assigneeIds,
    activities,
    comments,
    loading,
    notFound,
    completeTask,
    reopenTask,
    updateTask,
    addComment,
    deleteComment,
  };
}
