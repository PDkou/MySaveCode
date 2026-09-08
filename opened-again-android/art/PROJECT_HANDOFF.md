# PROJECT_HANDOFF

Use this pack as the current baseline.

## Recommended implementation flow
1. Use `assets/cards/frames` + `assets/badges` to render incident rarities.
2. Use `assets/character/*` for mascot placement.
3. Use `assets/backgrounds/share_template_*` when building social share cards.
4. Use `assets/cards/examples` as direct reference for future incident art.

## Notes
- UI icons are delivered as image assets. Some include Japanese labels.
- `boards/` contains the original source sheets used for extraction.


## UI localization note
Use `assets/ui/icons/unlabeled/` in production. Keep `assets/ui/icons/labeled/jp/` only as a reference set. Pair the unlabeled icons with locale text from `assets/ui/labels/*.json`.
