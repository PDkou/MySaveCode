# Drawary Android app (WebView shell)

The whole app is the web app (`../dist`, built by `npm run build`) packed into the APK and shown in one WebView.
Nothing else is needed on the phone: no server, no account, **no INTERNET permission**. Purchases (Premium, coffee support) go through Google Play Billing, which talks to the Play Store app on the phone.

## Build

CI does it (`.github/workflows/drawary-v2-android.yml`, run it from the Actions tab or by pushing). The run's artifacts:
`drawary-debug-apk` (install this on a phone to try it) and `drawary-release-test-apk` (minified with R8; signed with the
debug key unless `android/keystore.properties` exists, so **not for the store**).

Locally (needs the Android SDK, platform 36): `cd drawary-v2 && npm ci && npm run build && cd android && ./gradlew assembleDebug`.

Feedback address: `feedbackEmail` in `android/gradle.properties` (db5704@gmail.com, given by the owner); the repository variable
`DRAWARY_FEEDBACK_EMAIL` (CI) or `-PfeedbackEmail=…` (local) overrides it. Empty = the share sheet opens instead.

## How the pieces fit

| File | Job |
| --- | --- |
| `AssetServer.java` | Serves `assets/www/` at `https://appassets.androidplatform.net/` (secure origin for `crypto.subtle`, no `file://`); blocks every other address; adds a Content-Security-Policy and injects `assets/native_shim.js` into `index.html`. |
| `assets/native_shim.js` | Turns the Java object `__DrawaryAndroid` into `window.DrawaryNative` (the contract in `src/data/nativeBridge.ts`), wrapping the calls that finish later in Promises. |
| `NativeBridge.java` | The Java side of that contract: reminders, fingerprint/face, save file, print, screen protection, feedback mail. |
| `BillingBridge.java` | Google Play Billing for the one-time products (`premium_unlock`, `support_coffee`, `support_latte`, `support_tip_1..6`; ids in `src/flow/premium.ts`): asks what is owned and the prices (`queryBilling`), opens the purchase sheet (`purchase`), acknowledges Premium, consumes the support products so they can be bought again. The web app only keeps the yes/no result (`premium` setting) and re-checks with Play whenever it opens. |
| `NotificationScheduler.java` + `ReminderReceiver` + `BootReceiver` | Reminders while the app is closed (see below). |
| `MainActivity.startDriveSave` + `NativeBridge.saveBackupToDrive` | "Google Drive" backup: the file goes straight to the Google Drive app's own "save to Drive" screen (account and folder chosen there); without the Drive app the phone's own save window opens. No sign-in, OAuth client or network permission in this app. The Drive screen gives no result, so #48 says "sent to Google Drive", not "saved". Restore from Drive: the restore screen's file chooser lists Drive as well. |
| `FileSaver.java` | Backup / CSV to `Download/Drawary` through MediaStore (no storage permission). |
| `FeedbackMailer.java` + `AttachmentProvider.java` | Opens the mail app with the message (and the screenshot of an error report). |
| `MainActivity.java` | Hosts the WebView: back button, insets/keyboard, photo chooser, alert/confirm dialogs, FLAG_SECURE, external links. |

Per-language app name: `res/values/` (Drawary), `values-ko/` (나만의 서랍장), `values-ja/` (ひきだし帳).

## Reminders

The page sends the whole upcoming list whenever data changes; it is stored, and one alarm is set for the next entry.
Android 10-11: exact times. Android 12+: "allow while idle" alarms, which can come a few minutes late — exact alarms need a
permission Google Play only gives alarm/calendar apps, so it is deliberately not requested. The list is used again after
a restart, app update or clock change. Android 13+: the notification permission is asked when the first reminder exists.

## Not verified on a phone

CI proves it **compiles, packs and minifies**. Nothing here has been run on a device or emulator yet (the build sandbox has
no Android SDK). Things to look at first on a phone: the WebView shows the app (not a white screen — if it does, check
`chrome://inspect` and whether the missing INTERNET permission blocks the virtual address), fingerprint prompt, the back
button, keyboard not covering inputs, backup lands in `Download/Drawary`, "Google Drive" backup (Drive's save screen opens with the file; save; the file shows up in Drive; also try with the Drive app disabled), restore from Drive, reminders ring, print/PDF dialog, no screenshot
when the app lock is on.
