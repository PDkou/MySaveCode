# V2-12-15 Android WebView shell (step 6)

Code: `android/` (see `android/README.md`). CI: `.github/workflows/drawary-v2-android.yml`.

| Column | Status |
| --- | --- |
| Source integrated | yes — `android/`, web side: `src/data/nativeBridge.ts`, `src/data/fileSave.ts`, `src/App.tsx` |
| Compiles / packs / minifies (R8) | see the CI run; Java also type-checked locally against the Android 16 API jar |
| Browser QA of the bridge contract | yes: the real `native_shim.js` + the same CSP + a fake Java object in Chromium (backup saves through `saveFile`, feedback through `sendFeedback`, secure-screen call, first-run flow) |
| **Android verified on a device** | **no** — nothing has been run on a phone/emulator |

## Web ↔ shell contract (`window.DrawaryNative`)

`setNotificationPlan(json)`, `isBiometricAvailable()`, `authenticateBiometric()`, `saveFile(name, mime, base64)`,
`printPage()`, `setSecureScreen(bool)`, `sendFeedback(json)`; `saveBackupToDrive(name, base64)` opens the phone's own save window and the person picks Google Drive in it (see below). Every call is optional in the page: a plain browser still works (downloads, `window.print()`,
the feedback screen says it cannot send).

## Google Drive backup (built 2026-10-20, changed the same day to "send straight to Drive")

Not an OAuth/REST upload (needs a Google Cloud OAuth client, Play Services and the INTERNET permission; could not be tested here;
decided against by the owner after weighing it, can be added later). `saveBackupToDrive` hands the backup file (a read-only
`content://` URI from `AttachmentProvider`, `cache/backup/`) to the **Google Drive app's own "save to Drive" screen**
(`ACTION_SEND` to `com.google.android.apps.docs`); the person picks account and folder there and saves. The app keeps no account and
has no network access. Without the Drive app, the phone's own save window opens instead (`ACTION_CREATE_DOCUMENT`, Drive is one of
its places when installed; closing it → "저장을 취소했어요."). **The Drive screen gives no result, so the app cannot know whether the
person finished saving**: #48 therefore shows "저장 위치: Google Drive로 보냄" (sent), not "saved". Auto-lock is paused while away.
Restore from Drive: the restore screen's file chooser (`onShowFileChooser`) lists Drive too. **Device: not tested.**

## First-run flow

Cold start without a `#/…` address: splash (assumption: 1.6 s, the last 0.25 s fading; nothing approved says how long) →
onboarding unless it was seen or drawers already exist (e.g. after a restore) → home. The history entry is replaced, so the
Android back button never returns to the splash/onboarding. Data reset clears the "seen" mark.

## Decisions I made (change on request)

- No INTERNET permission (the page cannot reach any server; Content-Security-Policy + blocked requests as well).
- `allowBackup=false`, no device-transfer: the person's own backup file is the only copy path.
- Reminders: exact on Android 10–11, "allow while idle" (may be minutes late) on 12+ — exact-alarm permission is not requested.
- Back button = browser-style history (screens push history entries).
- Screenshot protection (`FLAG_SECURE`) follows the app-lock setting, also applied before the first frame on a cold start.
- Application id `com.howlingcreativestudio.drawary` (same as the earlier wrapper), `minSdk 29`, `targetSdk 36`.
- System splash (Android 12+ forces one before the app's own approved #01 splash) = the app icon itself, as the owner chose; Android 10–11 get the same icon on cream via `windowBackground`. The small flower logo (`splash_symbol`) is no longer used in the APK. Owner plans to unify app icon, Play Store icon and splash on one artwork.
- `release/store/play_icon_512_candidate.png`: the adaptive-icon artwork as a 512 px square (upscaled from 432 px, slightly soft), a stand-in until the final icon exists.
- App icon and Play Store icon: on hold (owner 2026-10-20), kept as is until a larger original is available.
- Icon art comes from the approved Android assets; they are small (≈ 160–340 px), so the 432 px adaptive layers and the
  Play Store 512 px icon are upscaled and slightly soft. A larger original would fix that.
