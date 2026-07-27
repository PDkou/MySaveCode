import type { TaskRow } from '../types/database';

export type TaskDisplayStatus = 'scheduled' | 'open' | 'done';

// An open task due more than a day out (a freshly-spawned recurring task
// due next Saturday, say) would otherwise sit in the "in progress" bucket
// all week even though there's nothing to do yet. This computes a
// display-only status from due_at vs. today -- the stored open/done status
// on the row itself never changes.
export function displayStatusForTask(task: Pick<TaskRow, 'status' | 'due_at'>): TaskDisplayStatus {
  if (task.status === 'done') return 'done';
  if (task.due_at) {
    const due = new Date(task.due_at);
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const today = new Date();
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (dueDay.getTime() > todayDay.getTime()) return 'scheduled';
  }
  return 'open';
}
