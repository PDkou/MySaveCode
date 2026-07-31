const STORAGE_PREFIX = 'fq_onboarding_seen_';

export function hasSeenOnboarding(userId: string): boolean {
  try {
    return localStorage.getItem(STORAGE_PREFIX + userId) === '1';
  } catch {
    // Storage can be unavailable (private browsing, quota) -- fail open so a
    // broken localStorage never permanently blocks the family-setup flow
    // behind a screen that can't be dismissed-and-remembered.
    return true;
  }
}

export function markOnboardingSeen(userId: string): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + userId, '1');
  } catch {
    // Worst case the screen just reappears next launch -- harmless.
  }
}
