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
`printPage()`, `setSecureScreen(bool)`, `sendFeedback(json)`; `saveBackupToDrive` is intentionally absent (Drive upload is
optional/last and not built). Every call is optional in the page: a plain browser still works (downloads, `window.print()`,
the feedback screen says it cannot send).

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
- Icon art comes from the approved Android assets; they are small (≈ 160–340 px), so the 432 px adaptive layers and the
  Play Store 512 px icon are upscaled and slightly soft. A larger original would fix that.
