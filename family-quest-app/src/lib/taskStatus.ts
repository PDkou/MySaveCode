import type { TaskRow } from '../types/database';

export type TaskDisplayStatus = 'scheduled' | 'open' | 'pending_confirmation' | 'done' | 'failed';

function isFutureDay(dateString: string): boolean {
  const date = new Date(dateString);
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = new Date();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return day.getTime() > todayDay.getTime();
}

// An open task that hasn't started yet (a freshly-spawned recurring task
// starting next Saturday, say) would otherwise sit in the "in progress"
// bucket all week even though there's nothing to do yet. This computes a
// display-only status -- the stored open/done status on the row itself
// never changes. Prefers the explicit starts_at when set; falls back to
// due_at for tasks that never got a start date (most one-off tasks).
export function displayStatusForTask(task: Pick<TaskRow, 'status' | 'starts_at' | 'due_at'>): TaskDisplayStatus {
  if (task.status === 'done' || task.status === 'pending_confirmation' || task.status === 'failed') return task.status;
  if (task.starts_at) {
    return isFutureDay(task.starts_at) ? 'scheduled' : 'open';
  }
  if (task.due_at && isFutureDay(task.due_at)) return 'scheduled';
  return 'open';
}
