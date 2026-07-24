import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { useTasks } from '../context/TasksContext';
import { supabase } from '../lib/supabaseClient';
import type { TaskActivityRow } from '../types/database';

export interface NotificationItem extends TaskActivityRow {
  taskTitle: string;
}

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
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  const load = useCallback(async (familyId: string) => {
    const { data, error } = await supabase
      .from('task_activities')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return;
    setActivities(data ?? []);
  }, []);

  useEffect(() => {
    if (!family) {
      setActivities([]);
      return;
    }

    void load(family.id);

    const channel = supabase
      .channel(`notifications-${family.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'task_activities', filter: `family_id=eq.${family.id}` },
        () => {
          void load(family.id);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [family, load]);

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
  // created/are assigned it and someone else completed or reopened it.
  const notifications = useMemo<NotificationItem[]>(() => {
    if (!user) return [];
    return activities
      .filter((activity) => {
        if (activity.actor_id === user.id) return false;
        const task = taskById.get(activity.task_id);
        if (!task) return false;
        const assignees = assigneesByTaskId.get(activity.task_id) ?? [];
        if (activity.action === 'created') {
          return assignees.includes(user.id);
        }
        if (activity.action === 'completed' || activity.action === 'reopened') {
          return task.created_by === user.id || assignees.includes(user.id);
        }
        return false;
      })
      .map((activity) => ({
        ...activity,
        taskTitle: taskById.get(activity.task_id)?.title ?? '',
      }));
  }, [activities, taskById, assigneesByTaskId, user]);

  const unreadCount = useMemo(() => {
    if (!lastSeen) return notifications.length;
    return notifications.filter((item) => item.created_at > lastSeen).length;
  }, [notifications, lastSeen]);

  const markAllRead = useCallback(() => {
    if (!user || notifications.length === 0) return;
    const latest = notifications[0].created_at;
    window.localStorage.setItem(lastSeenKey(user.id), latest);
    setLastSeen(latest);
  }, [user, notifications]);

  return { notifications, unreadCount, markAllRead };
}
