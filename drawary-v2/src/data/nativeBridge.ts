import type { PlannedNotification } from '../flow/notificationPlan';
import { saveBlob, blobToBase64 } from './fileSave';
import { suspendAutoLock, endAutoLockSuspension } from './appLockGuard';
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
  /** The app's language ('ko' | 'ja' | 'en'): the shell's own texts (fingerprint window, reminder channel, mail subject) follow it. */
  setLanguage?: (lang: string) => void;
  /** True when the phone has a fingerprint/face lock set up that the app may use. */
  isBiometricAvailable?: () => boolean;
  /**
   * Shows the system fingerprint/face prompt. Resolves true only when the user
   * passed it; false when cancelled or failed (never rejects). The shell wraps
   * its callback-based Android BiometricPrompt into this promise.
   */
  authenticateBiometric?: () => Promise<boolean>;
  /**
   * Saves any generated file (backup, CSV, ...) in the phone's Download folder and resolves with the place to
   * show (e.g. "Download/Drawary"). `base64` is the whole file. Rejects when it cannot be saved.
   */
  saveFile?: (fileName: string, mimeType: string, base64: string) => Promise<string>;
  /**
   * Like saveFile, but the person chooses where the file goes: the phone's own "save as" window opens. Resolves with the place
   * to show; rejects with message 'cancelled' when the window is closed without saving.
   */
  saveFileAs?: (fileName: string, mimeType: string, base64: string) => Promise<string>;
  /** Opens the system print / "save as PDF" dialog for the page (a WebView cannot do `window.print()` itself). */
  printPage?: () => void;
  /** True = the screen must not be captured or shown in the recent-apps list (the app lock is on). */
  setSecureScreen?: (secure: boolean) => void;
  /**
   * Hands a finished feedback message to the person's mail app (To: the support address the shell was built
   * with). JSON of {@link NativeFeedback}. Resolves true when a mail app was opened, false when there is none.
   */
  sendFeedback?: (json: string) => Promise<boolean>;
  /**
   * Hands a backup to Google Drive: the Drive app's own "save to Drive" screen opens with the file (without the Drive app, the
   * phone's save window opens instead). No sign-in or network code in this app. Resolves with the text to show as the place
   * ("Sent to Google Drive" — whether the person finishes in Drive cannot be seen — or where the save window put it);
   * rejects with message 'cancelled' when the save window is closed without saving.
   */
  saveBackupToDrive?: (fileName: string, base64: string) => Promise<string>;
  /**
   * Asks Google Play what the person owns and what the products cost. Resolves with `{ premium: boolean, prices: { [productId]: priceText } }`
   * (an object or its JSON); rejects when Play cannot be reached.
   */
  queryBilling?: () => Promise<unknown>;
  /**
   * Opens Google Play's purchase sheet for one product id. Resolves with 'ok' | 'owned' | 'cancelled' | 'pending' | 'error' | 'unavailable'
   * (see src/data/billing.ts); never rejects. Support products are consumed right after a purchase so they can be bought again.
   */
  purchase?: (productId: string) => Promise<string>;
  /**
   * Opens the phone's photo picker (up to `max` pictures) and resolves with `{ photos: [{ name, data }], failed, reason }`: each picture is
   * already a JPEG (scaled down, HEIC converted, camera rotation applied) as base64; `failed` pictures could not be read (`reason` says why).
   * Rejects with message 'cancelled' when nothing was picked.
   */
  pickPhotos?: (max: number) => Promise<NativePhotoResult>;
  /** Opens a web address (the studio's privacy policy / terms pages) in the phone's browser. Only the studio's own https addresses are opened. */
  openLink?: (url: string) => void;
}

declare global {
  interface Window {
    DrawaryNative?: DrawaryNativeApi;
    /** Set by the app: the phone's back button was pressed. true = handled inside the app, false = leave the app. */
    __drawaryBack?: () => boolean;
  }
}

export const hasNativeNotifications = (): boolean =>
  typeof window !== 'undefined' && typeof window.DrawaryNative?.setNotificationPlan === 'function';

export function syncLanguage(lang: string): void {
  try { window.DrawaryNative?.setLanguage?.(lang); } catch (e) { console.error('language not sent', e); }
}

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

export interface NativePhotoResult {
  photos: { name: string; data: string }[];
  failed: number;
  reason: string;
}

export interface NativeFeedback {
  type: string;
  message: string;
  email: string;
  /** Screenshot for an error report, base64 without the data: prefix. */
  attachmentBase64?: string;
  attachmentName?: string;
  attachmentMime?: string;
}

export const hasNativeSave = (): boolean => typeof window !== 'undefined' && typeof window.DrawaryNative?.saveFile === 'function';
export const hasNativePrint = (): boolean => typeof window !== 'undefined' && typeof window.DrawaryNative?.printPage === 'function';
export const hasNativeFeedback = (): boolean => typeof window !== 'undefined' && typeof window.DrawaryNative?.sendFeedback === 'function';

export function setSecureScreen(secure: boolean): void {
  try { window.DrawaryNative?.setSecureScreen?.(secure); } catch (e) { console.error('화면 보호를 바꾸지 못했어요', e); }
}

/** Opens the mail app with the feedback. False when the shell cannot (no mail app) or this is a plain browser. */
export async function sendNativeFeedback(f: Omit<NativeFeedback, 'attachmentBase64' | 'attachmentName' | 'attachmentMime'> & { attachment: File | null }): Promise<boolean> {
  if (!hasNativeFeedback()) return false;
  const payload: NativeFeedback = { type: f.type, message: f.message, email: f.email };
  if (f.attachment) {
    payload.attachmentBase64 = await blobToBase64(f.attachment);
    payload.attachmentName = f.attachment.name;
    payload.attachmentMime = f.attachment.type;
  }
  try { return (await window.DrawaryNative!.sendFeedback!(JSON.stringify(payload))) === true; }
  catch { return false; }
}

export const hasNativeDriveBackup = (): boolean => typeof window !== 'undefined' && typeof window.DrawaryNative?.saveBackupToDrive === 'function';

/**
 * Hands a finished backup file to the person. Android shell: its own save (device) or Drive upload. Plain browser:
 * an ordinary download (device); Drive needs the shell and says so. Resolves with the place to show on #48.
 */
export async function deliverBackup(destination: 'device' | 'drive', fileName: string, blob: Blob): Promise<string> {
  const native = typeof window === 'undefined' ? undefined : window.DrawaryNative;
  if (destination === 'drive') {
    if (typeof native?.saveBackupToDrive !== 'function') throw new Error(t('Google Drive 백업은 안드로이드 앱에서 사용할 수 있어요.'));
    // The Drive app (or the phone's save window) takes this app to the background for as long as the person needs.
    suspendAutoLock(120_000);
    try {
      const place = await native.saveBackupToDrive(fileName, await blobToBase64(blob));
      endAutoLockSuspension(20_000); // still away in Drive for a moment: no PIN right as it opens
      return place;
    } catch (e) {
      endAutoLockSuspension();
      throw new Error(e instanceof Error && e.message === 'cancelled' ? t('저장을 취소했어요.') : t('Google Drive에 저장하지 못했어요.'));
    }
  }
  return saveBlob(blob, fileName);
}

/**
 * Hands a generated file (CSV, PDF) to the person and lets them choose the place. Android shell: the phone's save window.
 * Plain browser: an ordinary download. Rejects with message 'cancelled' when the person closes the window.
 */
export async function saveBlobAs(blob: Blob, fileName: string): Promise<string> {
  const native = typeof window === 'undefined' ? undefined : window.DrawaryNative;
  if (typeof native?.saveFileAs !== 'function') return saveBlob(blob, fileName);
  // The save window takes this app to the background for as long as the person needs.
  suspendAutoLock(120_000);
  try {
    const place = await native.saveFileAs(fileName, blob.type || 'application/octet-stream', await blobToBase64(blob));
    endAutoLockSuspension(20_000);
    return place;
  } catch (e) {
    endAutoLockSuspension();
    throw e;
  }
}
