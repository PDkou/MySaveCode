import type { PlannedNotification } from '../flow/notificationPlan';

/**
 * What the Android WebView shell is expected to expose as `window.DrawaryNative`.
 * Nothing here exists in a plain browser, so every call is optional; the app
 * works without it, it just cannot ring while closed. The shell is built in
 * step 6 (Android QA).
 */
export interface DrawaryNativeApi {
  /**
   * Replaces ALL scheduled notifications with this list (JSON of PlannedNotification[],
   * soonest first). Called after every data change and when the app opens.
   */
  setNotificationPlan?: (json: string) => void;
  /** True when the phone has a fingerprint/face lock set up that the app may use. */
  isBiometricAvailable?: () => boolean;
  /**
   * Shows the system fingerprint/face prompt. Resolves true only when the user
   * passed it; false when cancelled or failed (never rejects). The shell wraps
   * its callback-based Android BiometricPrompt into this promise.
   */
  authenticateBiometric?: () => Promise<boolean>;
}

declare global {
  interface Window { DrawaryNative?: DrawaryNativeApi }
}

export const hasNativeNotifications = (): boolean =>
  typeof window !== 'undefined' && typeof window.DrawaryNative?.setNotificationPlan === 'function';

export function syncNotificationPlan(plan: readonly PlannedNotification[]): void {
  if (!hasNativeNotifications()) return;
  try { window.DrawaryNative!.setNotificationPlan!(JSON.stringify(plan)); }
  catch (e) { console.error('알림 목록을 보내지 못했어요', e); }
}

export const hasNativeBiometric = (): boolean => {
  if (typeof window === 'undefined') return false;
  const n = window.DrawaryNative;
  try { return typeof n?.authenticateBiometric === 'function' && n.isBiometricAvailable?.() === true; }
  catch { return false; }
};

/** The system prompt; false when there is none, or it was cancelled or failed. */
export async function authenticateBiometric(): Promise<boolean> {
  if (!hasNativeBiometric()) return false;
  try { return (await window.DrawaryNative!.authenticateBiometric!()) === true; }
  catch { return false; }
}
