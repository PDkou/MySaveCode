const STORAGE_PREFIX = 'fq_tutorial_seen_';

export function hasSeenTutorial(userId: string): boolean {
  try {
    return localStorage.getItem(STORAGE_PREFIX + userId) === '1';
  } catch {
    // Storage can be unavailable (private browsing, quota) -- fail open so a
    // broken localStorage never permanently blocks the dashboard behind a
    // tour that can't be dismissed-and-remembered.
    return true;
  }
}

export function markTutorialSeen(userId: string): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + userId, '1');
  } catch {
    // Worst case the tour just replays next launch -- harmless.
  }
}
