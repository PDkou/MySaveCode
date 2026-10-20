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

## Google Drive backup (built 2026-10-20)

Not an OAuth/REST upload: that needs a Google Cloud OAuth client (package + signing SHA-1), the Play Services library and the
INTERNET permission, and could not be tested here. Instead `saveBackupToDrive` opens Android's own "save to" window (title = the
backup file name). **Google Drive appears in it when the Drive app is installed and the person taps it**; the Drive app uploads
the file. The app itself keeps no account and no network access. After saving, #48 shows where the file went (Google Drive /
Download / phone / chosen place, from the provider that was picked). Closing the window without saving → "저장을 취소했어요."
and back to #46. Auto-lock is paused (2 min) while the window is open. Restore from Drive: the restore screen's file chooser
(`onShowFileChooser`) lists Drive too. Limits: the person must choose Drive themselves (the window cannot be pre-selected
reliably); without the Drive app the window offers other places. **Device: not tested.**

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
