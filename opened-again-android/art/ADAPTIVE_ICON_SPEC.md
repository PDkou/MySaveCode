# ADAPTIVE_ICON_SPEC

## Files
- `adaptive_foreground_moni_1080.png`: transparent foreground master
- `adaptive_background_blue_1080.png`: solid background layer
- 432px versions: xxxhdpi-ready reference exports

## Safe zone
The complete MONI foreground is scaled to fit inside the Android adaptive-icon central 66/108 safe area on a 1080px master canvas.
Safe-zone box in the master: `(210, 210) - (870, 870)`.

Background RGB used: `(122, 184, 251)` sampled from the legacy app icon background.

`adaptive_safezone_preview.png` contains a red safe-zone guide for QA only and must not ship as the launcher artwork.
