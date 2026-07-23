import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { useFamily } from './FamilyContext';
import type { TaskRow } from '../types/database';

export interface NewTaskInput {
  title: string;
  details: string;
  assignedTo: string | null;
  dueAt: string | null;
}

interface TasksContextValue {
  tasks: TaskRow[];
  loading: boolean;
  createTask: (input: NewTaskInput) => Promise<void>;
  refresh: () => Promise<void>;
}

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { family } = useFamily();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (familyId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTasks(data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!family) {
      setTasks([]);
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
    const { error } = await supabase.from('tasks').insert({
      family_id: family.id,
      title: input.title.trim(),
      details: input.details.trim() ? input.details.trim() : null,
      created_by: user.id,
      assigned_to: input.assignedTo,
      due_at: input.dueAt,
    });
    if (error) throw error;
    await refresh();
  }, [family, user, refresh]);

  const value = useMemo<TasksContextValue>(() => ({
    tasks,
    loading,
    createTask,
    refresh,
  }), [tasks, loading, createTask, refresh]);

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return ctx;
}
