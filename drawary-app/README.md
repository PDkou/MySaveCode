# Drawary (`com.howlingcreativestudio.drawary`)

The Android build of **나만의 서랍장 / Drawary** — a personal data-tracker
app where the user defines their own categories (가계부, 옷장, 화장품, ...),
their own fields per category, and gets an auto-generated, sortable table
of what they've entered, with PDF export. Local storage only; no backend,
no accounts.

This project is a **thin native WebView shell around `category-data-app/`**
(the actual web app — React/Vite, see its own README/CLAUDE.md), following
the same pattern as `hellotoday-app/` on the `HelloToday` branch: bundle
the built web output as local assets and render it full-screen inside a
WebView, rather than a live-hosted TWA. This app has no live web hosting
requirement at all as a result.

## How it's built

**Gradle**, same version pins as `hellotoday-app/` (same repo, same Google
Play target-API deadline — see that project's README for why AGP 8.11.0 /
compileSdk·targetSdk 36 aren't a free choice):

```bash
cd drawary-app
echo "sdk.dir=$(cd .. && pwd)/android-sdk" > local.properties   # not committed; per-machine
./gradlew assembleDebug     # -> app/build/outputs/apk/debug/app-debug.apk
./gradlew bundleDebug       # -> app/build/outputs/bundle/debug/app-debug.aab
./gradlew bundleRelease     # AAB for Play Console (unsigned unless keystore.properties is wired up)
```

Same sandbox limitation as `hellotoday-app/`: this repo's CCR sandbox has
`dl.google.com` blocked, so it can't resolve the Android Gradle Plugin or
any Maven dependency to actually prove a Gradle build compiles.
`.github/workflows/build-drawary-gradle.yml` runs `./gradlew assembleDebug
bundleDebug` on a GitHub-hosted runner (unrestricted network) and uploads
the resulting APK/AAB as workflow artifacts — run that (workflow_dispatch)
after touching anything under `drawary-app/`'s Gradle files or after
re-syncing the bundled web assets (below).

The `android-sdk-slim` GitHub Release (build-tools 35.0.1/36.0.0 +
platforms android-35/android-36) that `hellotoday-app/` publishes is
repo-wide, not branch-specific, so it's reused here as-is for local
`sdk.dir` purposes — no need for a second copy of
`fetch-android-sdk.yml`.

## Keeping the bundled web assets in sync

`app/src/main/assets/dist/` is a **copy** of `category-data-app/dist/`
(the Vite production build), not a build step Gradle runs itself. After
changing anything under `category-data-app/src`, rebuild and re-copy:

```bash
cd category-data-app && npm run build
rm -rf ../drawary-app/app/src/main/assets/dist
cp -r dist ../drawary-app/app/src/main/assets/dist
```

`category-data-app/vite.config.ts` sets `base: './'` specifically so this
bundle also works when served from a non-root virtual origin (below) —
don't remove that when touching the Vite config.

## Where the logic actually lives

Almost everything is in the bundled web app
(`category-data-app/src/`, copied into `assets/dist/`) — the same
"change the web app first" rule as `hellotoday-app/`'s single
`index.html`/`RunManager.gd` in `game/`. `MainActivity.java` is thin
native glue around it:

- Loads `assets/dist/index.html` over
  `https://appassets.androidplatform.net/assets/dist/` via
  `androidx.webkit.WebViewAssetLoader`, **not** a plain `file://` URL —
  the web bundle's entry script is an ES module
  (`<script type="module">`), which WebView's engine can refuse
  same-directory relative imports for under `file://`; a real (if
  virtual) origin sidesteps that.
- Exposes a `DrawaryNative` JS bridge (see
  `category-data-app/src/lib/native.ts` for the JS-side contract) for the
  two things a bare WebView can't do that this app actually needs:
  - **Backup export/import** — `blob:` downloads via `<a download>`
    aren't reliably saved to a real file from inside a WebView, so this
    goes through Android's Storage Access Framework
    (`ACTION_CREATE_DOCUMENT` / `ACTION_OPEN_DOCUMENT`) instead, same as
    `hellotoday-app`'s contact/photo pickers use SAF-style intents.
  - **PDF export** — `window.print()` has no built-in effect in a bare
    WebView; `printPage()` hands off to `android.print.PrintManager` +
    `WebView.createPrintDocumentAdapter()`, which is what actually
    produces the "Save as PDF" dialog, rendering the same `@media print`
    CSS the web build already uses for the browser/PWA print path (see
    `PrintView.tsx`).
- No `android:screenOrientation` lock (`hellotoday-app` pins portrait) —
  the web UI was specifically built to support landscape too (see
  `TableScreen.tsx`/`global.css`'s safe-area handling), so this app
  follows the device's own rotation setting.
- No permissions declared at all: this app makes no network calls and has
  no notifications/alarms, unlike `hellotoday-app` (ads, reminders).

## Icon / branding

`app/src/main/res/drawable-nodpi/ic_launcher_art.png` + the adaptive-icon
XML in `mipmap-anydpi-v26/` mirror `hellotoday-app`'s structure exactly
(single foreground art PNG + a background color) — see that project's
`res/` for the original pattern. Launcher label is localized per-language
(`values/`, `values-ko/`, `values-ja/strings.xml`) independently of the
web UI's own language (Korean-only for now) — see `res/values*/strings.xml`.

## Signing & Play Console

Not yet submitted. When ready, follow `hellotoday-app/README.md`'s
"Signing & Play Console" section for the general process (same Play
Console account) — `keystore.properties` (never committed) supplies the
upload-key signing config the same way.
