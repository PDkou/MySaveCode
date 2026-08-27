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

Not a Gradle project. `build.sh` calls the Android build tools directly:
`aapt2 compile/link → javac → d8 → apksigner`, writing
`build/HelloToday-<version>-debug.apk`. It expects:

- A local Android SDK checkout at `../android-sdk` (sibling of this
  directory, **not** committed) containing `build-tools/35.0.1/` (aapt2, d8,
  apksigner, zipalign) and `platforms/android-35/android.jar`.
- A JDK on `PATH` capable of `-source 8 -target 8` (any modern JDK works;
  the repo sandbox has OpenJDK 21).
- `debug.keystore` is **not** committed (regenerable, debug-only, no secret
  worth tracking) — `build.sh` creates one automatically on first run if
  missing.

None of that Android SDK is present in this sandbox as of the import, the
same situation `game/` is in with its Godot binary — it has to be obtained
before `build.sh` can actually be run here.

## Where the logic actually lives

Almost everything is in `assets/index.html` — a single self-contained
HTML/CSS/JS file (no framework, no bundler) rendered full-screen inside a
bare `WebView`. The Java under `src/studio/howling/hellotoday/` is thin
native glue around it:

- `MainActivity` — hosts the `WebView`, exposes a `HelloNative` JS bridge
  (local JSON backup/export via `Storage Access Framework`, language sync).
- `ReminderScheduler` / `ReminderReceiver` / `NotificationActionReceiver` /
  `NotificationActionStore` — schedules and fires the local "check in on
  X" notifications and their inline actions (연락했어요 / 내일 다시 / 날짜 변경).
  `BootReceiver` re-arms them after a reboot or app update.

When changing behavior, change `assets/index.html` first — it's the app,
the same way `RunManager.gd` is the whole economy in `game/`.

## Testing

Two scripts, both runnable with plain Node — no Android build needed to
exercise the web layer:

```bash
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
  illustration PNGs under `assets/img/` — replacing artwork must update
  those hashes too.
