import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { useTasks } from '../context/TasksContext';
import { supabase } from '../lib/supabaseClient';
import type { TaskActivityAction, TaskActivityRow, TaskCommentRow } from '../types/database';

export type NotificationItem =
  | {
      kind: 'activity';
      id: string;
      task_id: string;
      taskTitle: string;
      actor_id: string;
      created_at: string;
      action: TaskActivityAction;
    }
  | {
      kind: 'comment';
      id: string;
      task_id: string;
      taskTitle: string;
      actor_id: string;
      created_at: string;
      body: string;
    };

const lastSeenKey = (userId: string) => `notif-last-seen-${userId}`;

interface UseNotificationsResult {
  notifications: NotificationItem[];
  unreadCount: number;
  markAllRead: () => void;
}

export function useNotifications(): UseNotificationsResult {
  const { user } = useAuth();
  const { family } = useFamily();
  const { tasks, assigneesByTaskId } = useTasks();
  const [activities, setActivities] = useState<TaskActivityRow[]>([]);
  const [comments, setComments] = useState<TaskCommentRow[]>([]);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  // Guard each list's overlapping fetches independently -- both are called
  // from the mount effect and again from their own realtime INSERT channel
  // below, so two fetches for the same list can land out of order and let a
  // slower, staler response overwrite a fresher one (same class of race as
  // FamilyContext.load() had, 2026-08 bug report).
  const activitiesSeqRef = useRef(0);
  const commentsSeqRef = useRef(0);

  const loadActivities = useCallback(async (familyId: string) => {
    const mySeq = ++activitiesSeqRef.current;
    const { data, error } = await supabase
      .from('task_activities')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error || activitiesSeqRef.current !== mySeq) return;
    setActivities(data ?? []);
  }, []);

  const loadComments = useCallback(async (familyId: string) => {
    const mySeq = ++commentsSeqRef.current;
    const { data, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error || commentsSeqRef.current !== mySeq) return;
    setComments(data ?? []);
  }, []);

  // Keyed on family.id, not the family object itself -- FamilyContext.load()
  // mints a new family object on every refresh (including silent background
  // ones from unrelated actions elsewhere), which would otherwise tear down
  // and recreate this realtime subscription -- and refetch both lists --
  // on every one of those instead of only when the active family changes.
  const familyId = family?.id;
  useEffect(() => {
    if (!familyId) {
      setActivities([]);
      setComments([]);
      return;
    }

    void loadActivities(familyId);
    void loadComments(familyId);

    const channel = supabase
      .channel(`notifications-${familyId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'task_activities', filter: `family_id=eq.${familyId}` },
        () => {
          void loadActivities(familyId);
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'task_comments', filter: `family_id=eq.${familyId}` },
        () => {
          void loadComments(familyId);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [familyId, loadActivities, loadComments]);

  useEffect(() => {
    if (!user) {
      setLastSeen(null);
      return;
    }
    setLastSeen(window.localStorage.getItem(lastSeenKey(user.id)));
  }, [user]);

  const taskById = useMemo(() => {
    const map = new Map<string, (typeof tasks)[number]>();
    tasks.forEach((task) => map.set(task.id, task));
    return map;
  }, [tasks]);

  // A notification is relevant when someone else acted on a task the
  // current user cares about: they were assigned it (created), or they
  // created/are assigned it and someone else completed/reopened/commented
  // on it -- a reply or emoji reaction after completion is exactly the
  // kind of thing that should surface here, not just silently sit unseen.
  const isRelevant = useCallback((taskId: string, actorId: string) => {
    if (!user || actorId === user.id) return false;
    const task = taskById.get(taskId);
    if (!task) return false;
    const assignees = assigneesByTaskId.get(taskId) ?? [];
    return task.created_by === user.id || assignees.includes(user.id);
  }, [user, taskById, assigneesByTaskId]);

  const relevantNotifications = useMemo<NotificationItem[]>(() => {
    if (!user) return [];

    const activityItems: NotificationItem[] = activities
      .filter((activity) => {
        if (activity.actor_id === user.id) return false;
        const task = taskById.get(activity.task_id);
        if (!task) return false;
        if (activity.action === 'created') {
          const assignees = assigneesByTaskId.get(activity.task_id) ?? [];
          return assignees.includes(user.id);
        }
        return isRelevant(activity.task_id, activity.actor_id);
      })
      .map((activity) => ({
        kind: 'activity' as const,
        id: activity.id,
        task_id: activity.task_id,
        taskTitle: taskById.get(activity.task_id)?.title ?? '',
        actor_id: activity.actor_id,
        created_at: activity.created_at,
        action: activity.action,
      }));

    const commentItems: NotificationItem[] = comments
      .filter((comment) => isRelevant(comment.task_id, comment.author_id))
      .map((comment) => ({
        kind: 'comment' as const,
        id: comment.id,
        task_id: comment.task_id,
        taskTitle: taskById.get(comment.task_id)?.title ?? '',
        actor_id: comment.author_id,
        created_at: comment.created_at,
        body: comment.body,
      }));

    return [...activityItems, ...commentItems].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }, [activities, comments, taskById, assigneesByTaskId, user, isRelevant]);

  // Once seen, a notification drops off the list entirely rather than
  // lingering (read but still shown) forever -- "seen" here means the
  // panel was closed after showing it, not the moment it's opened (see
  // NotificationBell: markAllRead is called on close, not on open, so the
  // list a user is currently looking at doesn't vanish out from under them
  // the instant they open it).
  const notifications = useMemo<NotificationItem[]>(() => {
    if (!lastSeen) return relevantNotifications;
    return relevantNotifications.filter((item) => item.created_at > lastSeen);
  }, [relevantNotifications, lastSeen]);

  const markAllRead = useCallback(() => {
    if (!user || relevantNotifications.length === 0) return;
    const latest = relevantNotifications[0].created_at;
    window.localStorage.setItem(lastSeenKey(user.id), latest);
    setLastSeen(latest);
  }, [user, relevantNotifications]);

  return { notifications, unreadCount: notifications.length, markAllRead };
}
