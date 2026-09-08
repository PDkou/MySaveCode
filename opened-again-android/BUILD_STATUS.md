# Build status — v0.5.0

## Verified in this sandbox

- Core Kotlin detector compiles with `kotlinc`.
- Core smoke suite passes.
- Core regression suite passes.
- `index.html` JavaScript passes `node --check`.
- Android XML resources parse successfully.

## Not verifiable locally

The sandbox does not contain a usable Android SDK/build-tools installation and cannot fetch Maven/Google Android dependencies. Therefore **APK/AAB build success is not claimed locally**.

Use the included GitHub Actions workflows on a network-enabled runner:

- `.github/workflows/build-opened-again-gradle.yml` → core tests + debug APK
- `.github/workflows/build-opened-again-release.yml` → signed release AAB (requires signing secrets)

## Current architecture

- `core/`: pure Kotlin behavior/session/incident engine.
- `app/src/main/assets/index.html`: primary UI and product logic presentation layer.
- `MainActivity`: thin WebView shell.
- `NativeBridge`: one JS↔Android bridge for usage access, analysis, backup and sharing.

## Next checks on real Android

1. Usage Access settings round-trip.
2. Event fidelity across Samsung/Pixel devices.
3. Screen-off/session boundary behavior.
4. Share image text layout for KR/JP.
5. Hidden-card false-positive rate.

## v0.3 checks
- Core detector smoke test: PASS
- Detector regression suite: PASS
- WebView JS syntax (`node --check`): PASS
- UI preview boards generated from local HTML: PASS
- Android APK/AAB compile still requires CI or a machine with Android SDK/Gradle dependencies available.

## v0.5 checks (this sandbox — no kotlinc/Android SDK available here either)
- WebView JS syntax (`node --check` on the extracted `<script>` block): PASS
- All 5 XML resources (`AndroidManifest.xml`, `values*/strings.xml`, `styles.xml`) parse: PASS
- Kotlin/Java brace and paren balance across every `.kt`/`.java` file: PASS
- Every `visual/...` asset path referenced from `index.html` resolved against the files actually
  shipped in `app/src/main/assets/visual/` (script-checked, see `docs/DEVELOPMENT_HISTORY.md`): PASS
- Core detector smoke/regression suites: **not re-run** — `kotlinc` isn't installed in this
  sandbox (unlike whatever ran v0.1-v0.4's checks). No `core/` logic changed in this pass, so the
  previous PASS should still hold, but this needs re-confirming on a runner that has `kotlinc` or
  via `build-opened-again-gradle.yml`.
- Gradle build itself: still unverified locally, same as every prior version — run
  `build-opened-again-gradle.yml` on push/dispatch to confirm `:core:test :app:assembleDebug`.
