# 또 열었네? / また開いた？ — Android MVP v0.5

MONI, a dry-humored detective cat, turns automatic smartphone-usage patterns into collectible incident cards.

## Product rules

- No account/server required for MVP.
- User input is near-zero; usage data is analyzed locally.
- Core rarity: NORMAL / RARE / EPIC / LEGENDARY.
- Hidden incident families remain undisclosed until discovered.
- KR / JP / EN copy is kept together in the WebView UI through `l(ko, ja, en)`.

## Modules

- `core/` — pure Kotlin session building, detection, scoring and daily summary.
- `app/` — Android WebView shell, usage-event collector, JS bridge and share-card renderer.
- `app/src/main/assets/index.html` — main UI.

## Local checks available here

```bash
./scripts/test-core.sh
node --check .core-build/index-script.js
```

Android build validation must run on a network-enabled runner. See `BUILD_STATUS.md` and
`../.github/workflows/build-opened-again-*.yml` (this app lives inside the `MySaveCode`
monorepo, so its CI workflows are at the repo root, not under this folder).

## Signing & Play Console

This app is not yet signed for release -- `keystore.properties` doesn't exist
in this repo (it's gitignored, alongside `*.jks`/`*.keystore`), and
`app/build.gradle.kts`'s `release` signing config only registers itself when
that file is present.

**Generating the upload keystore** (one-time). This is the app's permanent
publishing identity -- losing it (without Play App Signing enrollment) can
permanently block future updates, and it must never be reused from another
app's keystore, since Play Console binds an upload key to one specific app
listing:

```bash
keytool -genkeypair -v \
  -keystore opened-again-release.jks \
  -alias opened_again_upload \
  -keyalg RSA -keysize 2048 -validity 10957 \
  -storetype PKCS12
```
(`-validity 10957` is 30 years -- an upload key needs to outlive the app by a
wide margin. `keytool` prompts for the store password, key password, and the
certificate's distinguished-name fields; none of the DN fields affect Play
Store review, so placeholder values are fine.)

**Local builds** -- create `opened-again-android/keystore.properties`
(gitignored) next to this README:
```properties
storeFile=/absolute/or/relative/path/to/opened_again_release.jks
storePassword=...
keyAlias=opened_again_upload
keyPassword=...
```

**CI signed release builds** (`.github/workflows/build-opened-again-release.yml`,
manual `workflow_dispatch`) read the same four values from GitHub Actions
repository secrets instead of a committed file:

| Secret | Value |
|---|---|
| `OPENEDAGAIN_KEYSTORE_B64` | `base64 -w0 opened_again_release.jks` (or `base64 -i ...` on macOS) |
| `OPENEDAGAIN_STORE_PASSWORD` | the store password chosen above |
| `OPENEDAGAIN_KEY_ALIAS` | `opened_again_upload` (or whatever alias was chosen) |
| `OPENEDAGAIN_KEY_PASSWORD` | the key password chosen above |

(Renamed from a generic `ANDROID_*` prefix to `OPENEDAGAIN_*` -- this is a
monorepo with another Android app's own signing secrets living in the same
repo Settings, and the generic prefix didn't say which app it belonged to.)

Add these under the repo's Settings -> Secrets and variables -> Actions
before running that workflow -- it fails fast with a clear error naming the
missing secret otherwise. The workflow decodes the keystore to a temp file,
writes a throwaway `keystore.properties`, builds the AAB, then deletes both
regardless of build outcome (`if: always()`), so the key material never
persists on the runner past that one job.

## Design/product docs

- `docs/PRODUCT_SPEC.md` — product rules, user flow, incident catalog, tone
- `docs/ARCHITECTURE.md` — module boundaries and responsibilities
- `docs/INCIDENT_DETECTION_SPEC.md` — detection thresholds/rules per incident type
- `docs/UI_UX_SPEC.md` — screen/card/share UX baseline
- `docs/DATA_STORAGE_SPEC.md` — current storage + recommended Room expansion
- `docs/LOCALIZATION_SPEC.md` — KR/JP/EN copy rules
- `docs/BUILD_RELEASE_GUIDE.md` — build/CI/release status
- `docs/CORE_DATA_MODELS.md` — core Kotlin data model reference
- `docs/DEVELOPMENT_HISTORY.md` — v0.1 → v0.5 changelog
- `docs/OPEN_ISSUES_AND_NEXT.md` — outstanding work, on-device verification checklist

## v0.3 UI preview-first update

- WebView home UI upgraded to the fixed MONI visual system.
- Incident cards now use distinct NORMAL / RARE / EPIC / LEGENDARY / HIDDEN treatments.
- HIDDEN has two visual families: ANOMALY (deep navy/cyan) and DREAM (opal).
- Card detail bottom sheet added.
- Archive now shows rarity progression and hidden unlock state using locally persisted discovery data.
- Records screen now includes top-app usage summary.
- Demo/preview mode is available with `index.html?preview=1&tab=cases|archive|records`.
- Static review boards are in `previews/` so design changes can be reviewed before implementation is finalized.

### Preview files
- `previews/ui_preview_board.png` — home / archive / records + rarity palette
- `previews/hidden_cards_preview.png` — the two official HIDDEN card families


## v0.4 asset integration test
- Split MONI asset pack copied into `app/src/main/assets/visual/`
- Header/app icon/hero/card scenes/archive thumbnails/record decorations now reference split assets.
- This version intentionally tests direct reuse of raster-cut assets. Some source-sheet residue and crop contamination remain and should be cleaned before production.

## v0.5 final asset pack (v1.2)
- Replaced the v0.4 placeholder asset paths with the independently generated and QA-validated
  final pack (`art/ASSET_INDEX.md` / `art/QA_REPORT.md` — 105/105 PNGs passed).
- Every `visual/...` reference in `index.html` (badges, card templates, card-example thumbnails,
  character poses, backgrounds, logo, app icon) now points at a real file that ships in
  `app/src/main/assets/visual/`; verified with a script that resolves each path against disk.
- UI icons ship as the language-neutral `visual/ui/icons/unlabeled/` set only. The Japanese-labeled
  reference icons and the icon→label JSON mapping moved to `art/reference/` (not packaged into the
  app) — actual in-app copy still comes from the `l(ko, ja, en)` inline pattern, per this repo's
  own `templates/android-webview-app-template.md` rule against separate translation-table files.
- English (`en`) strings already exist throughout via `l(ko, ja, en)`, but the language switch
  (`supported` in `index.html`) currently exposes only `ko`/`ja` — English isn't a product target
  yet. Turning it on later is a one-line change (add `'en'` back to `supported`).
