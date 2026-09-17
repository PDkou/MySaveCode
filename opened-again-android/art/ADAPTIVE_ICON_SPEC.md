# ADAPTIVE_ICON_SPEC

## v2 (2026-09-17) -- current

Director-supplied rebrand: MONI as a noir detective (deerstalker cap, phone,
magnifying glass, floating app/message icons, connection-line motif) on a
deep indigo/purple background -- replaces the v1 light-blue/simple-cat icon
below. Source pack: `art/icon_pack_2026-09-17/` (`README_KR.txt` there has
the original file-by-file notes).

**Files used:**
- `moni_adaptive_safe_flat_1024.png` -> `ic_launcher_foreground` (all densities)
- `moni_adaptive_background_1024.png` -> `ic_launcher_background` (all densities)
- `moni_app_icon_master_1024.png` -> legacy `ic_launcher`/`ic_launcher_round`
  (pre-API-26 fallback; this app's `minSdk = 29` means these two are never
  actually shown on a real device -- API 26+ always resolves the adaptive
  icon below instead -- generated anyway for tooling/completeness)
- `moni_play_store_512.png` -- NOT bundled into the app; upload directly to
  Play Console's store listing "app icon" slot when that's set up
- `moni_adaptive_safezone_preview_1024.png` / `preview_*_mask_512.jpg` /
  `moni_small_size_readability_preview.png` -- QA reference only, never
  shipped as launcher artwork (same rule as v1's own safezone preview)

**Important limitation vs. v1:** this pack does NOT include a true alpha-
transparent foreground cutout -- `moni_adaptive_safe_flat_1024.png` is a
flat, fully-opaque composite (the whole scene incl. its own indigo backdrop,
padded inward for OEM mask safety), by the source pack's own README
("'진짜 분리형 foreground/background XML'이 아니라 안전영역 검토용/플랫
후보" -- not a true separated foreground/background XML, a safe-zone/flat
candidate). In practice the opaque foreground fully covers
`ic_launcher_background` in steady state; the background layer only
matters for whatever brief background-only frame some launchers render
during their own press/parallax animation, which is why it's still the
matching gradient rather than a plain color. Verified via a composited
render (background + foreground stacked, then square/circle/rounded-rect
masks applied) that nothing important is lost under a worst-case circular
crop -- see this version's own DEVELOPMENT_HISTORY.md entry for the
verification screenshot description. If a real layered/parallax adaptive
icon is wanted later, ask the source for a proper alpha-cutout foreground
matching this same composition.

## v1 (superseded)

## Files
- `adaptive_foreground_moni_1080.png`: transparent foreground master
- `adaptive_background_blue_1080.png`: solid background layer
- 432px versions: xxxhdpi-ready reference exports

## Safe zone
The complete MONI foreground is scaled to fit inside the Android adaptive-icon central 66/108 safe area on a 1080px master canvas.
Safe-zone box in the master: `(210, 210) - (870, 870)`.

Background RGB used: `(122, 184, 251)` sampled from the legacy app icon background.

`adaptive_safezone_preview.png` contains a red safe-zone guide for QA only and must not ship as the launcher artwork.
