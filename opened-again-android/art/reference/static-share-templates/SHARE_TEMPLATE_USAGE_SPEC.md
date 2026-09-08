# SHARE_TEMPLATE_USAGE_SPEC

## Decision
`share_template_square.png` / `share_template_vertical.png` are **static finished reference/promo templates**, not runtime dynamic incident templates.

## Runtime share card rule
Use the current dynamic composition path:

1. Base: `bg_pattern_beige.png` (or another background-only asset)
2. Rarity frame: rendered dynamically according to incident rarity
3. MONI pose: rendered dynamically according to incident type
4. Incident title/metrics/time: rendered dynamically
5. Badge: rendered from corrected `assets/badges/*.png`

Do **not** place `share_template_square/vertical.png` behind the runtime card because they already contain a fixed frame and fixed MONI pose and will collide with dynamic content.

## Static template use
The two completed templates may still be used for:
- store screenshots / promotional art
- random precomposed share images
- visual reference for spacing and decorative density

They should not be referenced by the incident-specific renderer.
