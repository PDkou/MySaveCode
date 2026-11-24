# ADAPTIVE_ICON_SPEC

## v3 (2026-11-24) -- current

Seasonal Christmas refresh -- director already swapped the Play Store
listing icon to this image directly in Play Console, then asked whether
the in-app launcher icon should match it too. Source: director-supplied
1254x1254 image (MONI as the same noir detective, now in a Santa-style
cap, holiday wreath/ornaments/gift-box motif, pine-green backdrop
replacing v2's indigo/purple). Source pack: `art/icon_pack_2026-11-24/`.

**Unlike v2's source, this image has no pre-baked rounded-square card
shape** -- it's a plain full-bleed square (confirmed no black corner
artifacts), so the rounded look for the legacy `ic_launcher`/
`ic_launcher_round` fallbacks is applied here instead of inherited from
the source art.

**Files used:**
- `moni_adaptive_safe_flat_1024_xmas.png` -> `ic_launcher_foreground`
  (all densities) -- full master scaled to 61% (the same 66/108 Android
  safe-zone ratio v1's spec below documents) and centered on the
  background gradient, so OEM mask cropping can't cut into MONI/the
  phone/the magnifying glass.
- `moni_adaptive_background_1024_xmas.png` -> `ic_launcher_background`
  (all densities) -- radial gradient (`#1d4a2c` center -> `#0a1a10`
  edge) sampled from the source image's own corner tone, same role as
  v2's indigo gradient (only ever visible during a launcher's own
  press/parallax animation, since the opaque foreground fully covers it
  at rest).
- `moni_app_icon_master_1024_xmas.png` -> legacy `ic_launcher`/
  `ic_launcher_round`, each with a mask applied directly (rounded-rect
  for `ic_launcher`, circle for `ic_launcher_round`) since the source
  has no rounding of its own. Same `minSdk = 29` caveat as v2: never
  actually shown on a real device, generated for tooling/completeness
  only.
- `moni_play_store_512_xmas.png` -- NOT bundled into the app; this is
  just the master resized for the icon-pack record. The director
  already uploaded the Play Store listing icon directly in Play
  Console, independent of this file.
- `preview_circle_mask_contrast.png` / `preview_squircle_mask_contrast.png`
  -- QA reference only (magenta-background debug renders used to verify
  the safe-zone crop, since the real background color is so close to
  the artwork's own corner tone that a crop against it is invisible by
  design). Never shipped as launcher artwork.

Verified the same way as v2: composited background+foreground, then
circle and rounded-rect masks applied, confirming MONI/phone/magnifying
glass all stay inside both crops with margin to spare.

## v2 (2026-09-17) -- superseded

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
