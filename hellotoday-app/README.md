# Hello, Today (`studio.howling.hellotoday`)

An Android app that reminds you to check in on the people you care about —
family, friends — and keeps a short memo of what you talked about each time,
so the next reminder can surface "지난번에 남긴 메모" (the note from last time).
Local notifications only; no backend, no accounts.

This project was handed over as a complete, working source drop (v0.4.14,
versionCode 28) and imported here as-is on 2026-08-27. It has no history in
this repo before that commit — treat the import commit as the baseline, not
as "day one" of the app.

## How it's built

**Gradle**, as of 2026-08-27 (migrated from a hand-rolled `aapt2/d8`
shell script — see `git log -- hellotoday-app/build.sh` for that era).
The app is the single `:app` module; there's nothing else in this repo's
Gradle setup.

```bash
cd hellotoday-app
echo "sdk.dir=$(cd .. && pwd)/android-sdk" > local.properties   # not committed; per-machine
./gradlew assembleDebug     # -> app/build/outputs/apk/debug/app-debug.apk
./gradlew bundleDebug       # -> app/build/outputs/bundle/debug/app-debug.aab
./gradlew bundleRelease     # AAB for Play Console (unsigned unless you wire up signingConfigs)
```

`local.properties` (or `$ANDROID_HOME`) has to point at a real SDK
checkout with `platforms/` and `build-tools/` — the `android-sdk-slim`
Release below, same as before. That's separate from where the *Android
Gradle Plugin itself* and any library dependency (Play Billing included)
come from, which is Google's/Maven's servers over the network at
configure/sync time — the local SDK doesn't substitute for that.

- AGP `8.11.0`, Gradle `8.13` (pinned in `gradle/wrapper/gradle-wrapper.properties`).
  8.11.0 is the *minimum* AGP with API 36 support (8.7's ceiling is API 35;
  see `app/build.gradle.kts`'s comment).
- `compileSdk 36` / `targetSdk 36` / `buildToolsVersion "36.0.0"`. **Not a
  free choice**: Google Play requires new apps and updates to target API 36
  (Android 16) from **2026-08-31**
  ([source](https://developer.android.com/google/play/requirements/target-sdk));
  this app hasn't been submitted yet, so there was no reason to land on
  anything lower. (An earlier pass here briefly set both to 35 to match
  what the SDK bundle carried at the time — that missed this deadline
  entirely and was corrected same-day. `fetch-android-sdk.yml` now packages
  platform/build-tools 36 alongside 35.)
- No Debug keystore to manage: AGP's debug build type auto-generates and
  reuses `~/.android/debug.keystore` per machine, so the old committed-vs-
  regenerated `debug.keystore` dance is gone entirely.

**Why migrate off the manual script**: two things this app needs next —
Google Play Billing (a premium unlock) and an AAB for Play Console (Google
has required AAB for new-app submissions since August 2021) — are only
officially distributed/produced through Gradle. The old script could only
ever produce a plain APK and had no path to a Maven dependency without
hand-unpacking an AAR on every version bump.

### The Android SDK this needs

Same situation `game/` is in with its Godot binary: this sandbox has
`dl.google.com` blocked, so it can't run `sdkmanager` (or resolve the
Android Gradle Plugin itself) directly. `.github/workflows/fetch-android-sdk.yml`
runs on a GitHub-hosted runner (unrestricted network), packages
`build-tools/{35.0.1,36.0.0}/` + `platforms/{android-35,android-36}/`,
and publishes them as this repo's `android-sdk-slim` Release asset:

```bash
curl -sSL -o /tmp/android-sdk-slim.zip \
  https://github.com/PDkou/MySaveCode/releases/download/android-sdk-slim/android-sdk-slim.zip
unzip -q /tmp/android-sdk-slim.zip -d /home/user/MySaveCode   # -> MySaveCode/android-sdk/
```

That gets you the SDK, but **not** a working Gradle build in this sandbox —
AGP itself (and any Gradle dependency, Play Billing included) resolves from
Google's/Maven's servers, which are blocked here the same way. Verifying an
actual Gradle build has to happen off-sandbox:
`.github/workflows/build-hellotoday-gradle.yml` runs `./gradlew assembleDebug`
on a GitHub-hosted runner and uploads the resulting APK as a workflow
artifact — run that (workflow_dispatch) after touching anything under
`hellotoday-app`'s Gradle files, since this sandbox can't confirm it itself
beyond "the wrapper downloads and the project configures up to the first
network-bound plugin."

Before the migration (2026-08-27, on the old `build.sh`): built clean
end-to-end (`javac` → `d8` → `aapt2` → `apksigner`, `apksigner verify`
passed) against this same SDK bundle, and `assets/index.html` diffed
byte-identical (SHA-256) against the originally-handed-off
`HelloToday-v0.4.14-debug.apk`. That's evidence the SDK bundle and source
are sound; it doesn't by itself prove the *new* Gradle config compiles —
see the CI run before trusting it.

## Where the logic actually lives

Almost everything is in `app/src/main/assets/index.html` — a single
self-contained HTML/CSS/JS file (no framework, no bundler) rendered
full-screen inside a bare `WebView`. The Java under
`app/src/main/java/studio/howling/hellotoday/` is thin native glue around
it:

- `MainActivity` — hosts the `WebView`, exposes a `HelloNative` JS bridge
  (local JSON backup/export via `Storage Access Framework`, language sync,
  premium purchase entry points).
- `ReminderScheduler` / `ReminderReceiver` / `NotificationActionReceiver` /
  `NotificationActionStore` — schedules and fires the local "check in on
  X" notifications and their inline actions (연락했어요 / 내일 다시 / 날짜 변경).
  `BootReceiver` re-arms them after a reboot or app update.
- `PremiumBilling` — Google Play Billing wrapper for the premium unlock
  (see below).

When changing behavior, change `index.html` first — it's the app, the same
way `RunManager.gd` is the whole economy in `game/`.

## Premium unlock (Play Billing)

One-time, non-consumable purchase (`PremiumBilling.PRODUCT_ID =
"premium_unlimited_people"`) that lifts the free tier's people-count cap.
The cap itself (`FREE_PEOPLE_LIMIT`, currently 2) was already implemented
in `index.html` before this — `openPerson()` blocked a 3rd person with a
toast; the only thing added 2026-08-27 was an actual way to lift it.

- **JS side** (`index.html`): `state.settings.premium` gates `openPerson()`;
  hitting the cap opens `overlay={type:'premium'}` (an upsell sheet, not
  just a toast) with `buyPremium()`/`restorePremium()` calling into
  `HelloNative`. `window.onPremiumStatus(bool)` / `onPremiumPrice(text)` /
  `onPurchaseFailed()` are the native → JS callbacks, same
  `window.xyz=function(){}` pattern as `restoreBackupFromNative` etc.
- **Native side** (`PremiumBilling.java`): owns the `BillingClient`
  (Billing Library 9.1.0, `app/build.gradle.kts`), queries product details
  and owned purchases on connect, and re-syncs on every `onResume()` (so a
  purchase completed in Play's own UI is picked up without relying solely
  on `onPurchasesUpdated`). Cached unlock state lives in its own
  SharedPreferences file (`hello_today_premium`), deliberately separate
  from `deleteAllDataConfirmed()`'s `localStorage.removeItem` — clearing
  app data doesn't un-purchase anything; `index.html` re-syncs from
  `HelloNative.isPremium()` right after a reset for the same reason.
- **No backend verification.** Purchases are trusted from `BillingClient`'s
  own `PURCHASED` state rather than a server-side receipt check — this app
  has no backend to do that. Accepted tradeoff for a small personal-use
  unlock; revisit with real receipt verification if this product line ever
  becomes worth attacking.
- **Not yet done, and blocking a real purchase from working**: the
  `premium_unlimited_people` in-app product has to be created in Play
  Console (Monetize → Products → In-app products) after the app's first
  upload — nothing here can create it remotely. Until then,
  `queryProductDetailsAsync` returns empty and `buyPremium()` fails
  through `onPurchaseFailed()` (verify this in the CI-built APK on a real
  device/Play-signed build once the app exists in Play Console, not in the
  Node tests below — Billing doesn't run in a JS `vm` context or Playwright).

## Testing

Two scripts, both runnable with plain Node — no Android build needed to
exercise the web layer. They read `app/src/main/assets/index.html` now
(path changed by the Gradle migration; the scripts themselves were updated
to match):

```bash
cd hellotoday-app
# Executes the page's inline <script> in a Node `vm` context against a
# mocked DOM/localStorage/HelloNative bridge, then asserts specific
# strings/markup/behavior are present. Fast, no browser.
node test-regression.js
```

```bash
# Drives the real page in a real Chromium via Playwright: tutorial → add
# person → contact → memo → snooze controls. Needs the sandbox's
# pre-installed Chromium and a Korean locale — the app's copy is chosen by
# navigator.language/Intl, and this sandbox's default Chromium locale is
# English, so the Korean button labels the script looks for
# ('다음', '시작하기', ...) never appear without it:
NODE_PATH=/opt/node22/lib/node_modules PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium \
  node -e "
    const fs = require('fs');
    let s = fs.readFileSync('test-ui.js', 'utf8');
    s = s.replace('viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 }',
                  \"viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, locale: 'ko-KR' }\");
    fs.writeFileSync('/tmp/test-ui-ko.js', s);
  " && node /tmp/test-ui-ko.js
```

Verified at import time: `test-regression.js` passes clean. `test-ui.js`
gets past the tutorial/add-person/contact flow once the locale is forced to
`ko-KR`, but still fails its last assertion ("memo was not carried to the
next reminder") in this sandbox — not yet root-caused; could be a timing/
date-rollover dependency in how the "오늘" tab decides a reminder is due,
or something else about running headless vs. the original dev machine.
Don't assume it's fixed — re-check it before relying on this script for a
regression gate.

## Notes for whoever picks this up next

- `test-regression.js`'s asserted strings (e.g. `'Hello, Today 0.4.14'`,
  exact button-label triples, specific CSS selectors) are pinned to this
  exact version's copy/markup. A deliberate UI/copy change will break it on
  purpose — update the assertions alongside the change, the same way
  `test_all_charms.gd` in `game/` is expected to be re-run (not silently
  patched around) after a rules change.
- `expectedArt` in `test-regression.js` pins the SHA-256 of the three
  illustration PNGs under `app/src/main/assets/img/` — replacing artwork
  must update those hashes too.
- Play Billing is integrated (see "Premium unlock" above) but untested
  against a real Play Console listing, since the in-app product doesn't
  exist there yet. Don't assume the purchase flow works end-to-end until
  it's been through that once.
