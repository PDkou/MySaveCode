# Release manifest

Nothing here has ever been uploaded to Play Console — this table is a version↔commit log for a
sandbox that can't create git tags, not a store release history yet.

| Version | Version code | Commit | Status | Notes |
|---|---:|---|---|---|
| 0.2.0 | 2 | pending | development | WebView shell + native usage-analysis bridge + incident cards |
| 0.5.0 | 5 | pending | development | Final v1.2 asset pack wired into `index.html` (badges, card templates/examples, character poses, backgrounds, logo, app icon); imported into the `MySaveCode` monorepo as `opened-again-android/` |
| 0.6.0 | 6 | pending | development | `ShareCardRenderer` now draws the same final asset pack (background, card template art + tint, rarity badge, character pose, logo) instead of flat shapes/text; `shareIncident()` takes the in-app selected language for the logo |
| 0.7.0 | 7 | pending | development | Fixed a wrong-asset-folder bug from 0.6: card backgrounds now use `cards/frames/*` (the real blank frames) instead of `cards/templates/*`/`cards/examples/*` (finished mockups with baked-in placeholder text), which were also getting destructively cropped due to an aspect-ratio mismatch. Verified by rendering index.html in headless Chromium and inspecting screenshots. |
