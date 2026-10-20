/**
 * Auto-lock locks the app when it goes to the background. Opening the photo
 * chooser, saving a file or printing also sends an Android app to the
 * background for a moment; those actions call `suspendAutoLock` so the user is
 * not asked for the PIN in the middle of what they started.
 */
let until = 0;

export const autoLockSuspended = (now = Date.now()): boolean => now < until;

/** No auto-lock for the next `ms` milliseconds. */
export function suspendAutoLock(ms = 10_000, now = Date.now()): void {
  until = Math.max(until, now + ms);
}

/** The thing that needed the pause is over: allow auto-lock again after a short grace (the app often becomes visible a moment later). */
export function endAutoLockSuspension(graceMs = 3_000, now = Date.now()): void {
  until = now + graceMs;
}

/** For tests. */
export const resetAutoLockGuard = (): void => { until = 0; };
