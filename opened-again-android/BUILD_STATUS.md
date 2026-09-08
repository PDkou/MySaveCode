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
- Core detector smoke/regression suites: not re-run locally (`kotlinc` isn't installed in this
  sandbox), but confirmed via CI below (`:core:test` is part of the same Gradle invocation).
- **Gradle build: confirmed green on CI** — `build-opened-again-gradle.yml` run #4
  (https://github.com/PDkou/MySaveCode/actions/runs/34182266931) passed
  `:core:test :app:assembleDebug` and produced a real `opened-again-debug-apk` artifact
  (11.2MB). This is the first time this app has actually compiled with a real Android
  SDK/Gradle/AGP toolchain — three real bugs in the imported v0.4 source surfaced and were
  fixed to get here (all pre-existing, none introduced by the v0.5 asset-wiring pass):
  1. `app/build.gradle.kts`: `java.util.Properties()` didn't resolve because the Android/Kotlin
     plugins contribute a top-level `java` Gradle-DSL accessor that shadows the `java.*` package
     prefix in that scope — fixed by importing `Properties` and using the bare name.
  2. `values/strings.xml`: an unescaped apostrophe in `today_representative`
     ("TODAY'S REPRESENTATIVE CASE") broke AAPT resource compilation — fixed by escaping it.
  3. `app/build.gradle.kts` never pinned a JVM target, so AGP defaulted javac to 1.8 while the
     Kotlin plugin defaulted kotlinc to 17 (the CI JDK) — fixed with explicit
     `compileOptions` + `kotlin { jvmToolchain(17) }`.
