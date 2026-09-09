# START HERE — Opened Again Visual Asset Handoff

This package is the consolidated visual handoff as of 2026-09-09.

## Apply as final/current
1. `runtime/incidents/card_ready/` — 14 IncidentType-specific illustrations, normalized to 1200×675. Use `docs/ASSET_MANIFEST.json` for exact mapping.
2. `runtime/brand/rarity_symbols/` — 6 small symbols for pill-style rarity badges. Build pill background/label in CSS/Canvas; do not bake the old round badge into the pill.
3. `runtime/onboarding/{ko,jp}/` — localized 1/2 and 2/2 onboarding compositions.
4. `runtime/states/` — empty-state and locked-card visuals.
5. `runtime/share/backgrounds/` — complete non-tiled share backgrounds (common + six rarity variants) in square and vertical sizes.
6. `runtime/brand/logo/` — corrected Korean/Japanese logo crops.
7. Baseline character/props/frame/UI icon folders are carried forward from the current clean asset pack.

## Do NOT use as runtime
- `reference_only/static_share_templates/`: completed static card art; using it as a background causes duplicated frames/characters.
- `reference_only/design_system/`: style reference only.
- `legacy_current/background_tile/bg_pattern_beige.png`: old non-seamless tile, superseded by full-size share backgrounds.
- `legacy_current/badges_round/`: existing round badges retained only for compatibility/reference; target direction is pill + new symbol.

## App icon
The launcher icon redesign is **not finalized**. Do not treat any previous adaptive/legacy icon proposal as approved. Keep the project's current icon until a later approved icon pack arrives.

## Implementation note for incident art
All runtime incident files are 1200×675. `render_mode` in `ASSET_MANIFEST.json` says `overlay` for transparent compositions or `scene` for full-background scenes. This distinction is intentional and avoids accidental cropping.
