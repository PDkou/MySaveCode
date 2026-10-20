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
