import type { PlannedNotification } from '../flow/notificationPlan';
import { saveBlob } from './fileSave';
import { t } from '../i18n';

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
  /**
   * Saves a backup file on the phone (the shell chooses/asks for the place) and resolves with where it went, for #48.
   * `base64` is the whole file. Rejects when the person cancels or it cannot be saved.
   */
  saveBackupFile?: (fileName: string, base64: string) => Promise<string>;
  /** Same, to the person's Google Drive (sign-in and permission are the shell's job). Resolves with the place to show. */
  saveBackupToDrive?: (fileName: string, base64: string) => Promise<string>;
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

export const hasNativeDriveBackup = (): boolean => typeof window !== 'undefined' && typeof window.DrawaryNative?.saveBackupToDrive === 'function';

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/**
 * Hands a finished backup file to the person. Android shell: its own save (device) or Drive upload. Plain browser:
 * an ordinary download (device); Drive needs the shell and says so. Resolves with the place to show on #48.
 */
export async function deliverBackup(destination: 'device' | 'drive', fileName: string, blob: Blob): Promise<string> {
  const native = typeof window === 'undefined' ? undefined : window.DrawaryNative;
  if (destination === 'drive') {
    if (typeof native?.saveBackupToDrive !== 'function') throw new Error(t('Google Drive 백업은 안드로이드 앱에서 사용할 수 있어요.'));
    return native.saveBackupToDrive(fileName, await blobToBase64(blob));
  }
  if (typeof native?.saveBackupFile === 'function') return native.saveBackupFile(fileName, await blobToBase64(blob));
  saveBlob(blob, fileName);
  return 'Download';
}
