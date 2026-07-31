// A "quest" implies someone else asked for it -- completing a task you
// both created and assigned only to yourself isn't a request fulfilled, so
// it shouldn't count toward a shared room's ranking (points/streak/badges
// server-side in finalize_task_completion, and the weekly breakdown's
// MVP/count here).
// Two exceptions: a personal (1-member) room has no one else who could ever
// ask, and a task assigned to everyone (or left unassigned -- "whoever gets
// to it") is shared responsibility regardless of who created or finished it.
export function questCountsTowardRanking(
  createdBy: string,
  completedBy: string | null,
  assigneeCount: number,
  memberCount: number,
): boolean {
  if (memberCount <= 1) return true;
  if (assigneeCount === 0 || assigneeCount === memberCount) return true;
  return createdBy !== completedBy;
}
