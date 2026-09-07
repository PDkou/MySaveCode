// Bridge to the optional native Android wrapper (drawary-app/, a thin
// WebView shell around this same built web app -- see its README). This
// file is a no-op when running as a plain website/installed PWA:
// `window.DrawaryNative` is simply undefined there, so every call site
// checks for it and falls back to the web-native behavior (blob download,
// <input type="file">, window.print()).
//
// The wrapper needs a bridge at all because a bare WebView doesn't support
// some things a real browser does out of the box:
// - blob: downloads via <a download> aren't reliably saved to a real file
//   from inside a WebView, so backup export/import goes through Android's
//   Storage Access Framework instead (see MainActivity.java's
//   NativeBridge).
// - window.print() has no built-in handler in a bare WebView; the native
//   side hooks it up via WebView.createPrintDocumentAdapter() +
//   android.print.PrintManager, which is what actually produces the "save
//   as PDF" dialog on Android.
export interface DrawaryNativeBridge {
  exportBackup: (json: string) => void;
  // Generalized version of exportBackup for any other exported file (CSV,
  // see lib/csv.ts) -- kept as its own method rather than widening
  // exportBackup's signature since the backup flow's success/failure
  // callbacks (onDrawaryBackupExported/Failed below) are specifically
  // tied to BackupSheet.tsx's import/export UI.
  exportFile: (content: string, filename: string, mimeType: string) => void;
  importBackup: () => void;
  // Generalized version of importBackup for any other imported file (CSV,
  // see CsvImportModal.tsx) -- same reasoning as exportFile above: kept
  // separate since importBackup's callback also validates the content is
  // JSON before handing it to JS, which a CSV import shouldn't do.
  importFile: (mimeType: string) => void;
  printPage: () => void;
  appVersion?: () => string;
  // Real OS notifications for date-field reminders (see
  // hooks/useReminderSync.ts / MainActivity's ReminderScheduler) --
  // Android-only, hence optional: there's no equivalent for the plain
  // web/PWA build, which keeps relying on the in-app "다가오는 일정"
  // panel alone (Home.tsx). `key` is `${entryId}:${fieldId}`, `atMillis`
  // a plain epoch-millisecond timestamp.
  scheduleReminder?: (key: string, atMillis: number, title: string, body: string) => void;
  cancelReminder?: (key: string) => void;
}

declare global {
  interface Window {
    DrawaryNative?: DrawaryNativeBridge;
    // Callbacks the native side invokes back into JS -- assigned by
    // whichever component is currently listening (BackupSheet.tsx /
    // CsvImportModal.tsx).
    onDrawaryBackupExported?: () => void;
    onDrawaryBackupExportFailed?: () => void;
    onDrawaryBackupImported?: (json: string) => void;
    onDrawaryBackupImportFailed?: () => void;
    onDrawaryFileImported?: (content: string) => void;
    onDrawaryFileImportFailed?: () => void;
  }
}

export function getNativeBridge(): DrawaryNativeBridge | undefined {
  return typeof window !== 'undefined' ? window.DrawaryNative : undefined;
}

// The plain web/PWA blob-download dance -- pulled out here since it's
// needed by more than one export flow now (BackupSheet.tsx's JSON export
// had it inline first; lib/csv.ts's CSV export reuses this instead of a
// third copy).
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
