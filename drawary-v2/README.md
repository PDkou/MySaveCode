# Drawary V2

**나만의 서랍장 / Drawary / ひきだし帳**

Independent rebuild based **only on the 59 user-approved screen designs and original approved assets**. At the user's request, **ignore previous GitHub Drawary app code, visuals, and assets**. Old directories are preserved and not used as references.

## Status (2026-10-15)
- Visual approvals: **59/59**.
- Standalone source approvals: **59/59**. Screen 47's final Chromium rendering and HTML/CSS were expressly approved on 2026-10-15 (global font normalization deferred).
- React V2 functional app integration: **0/59**. This project currently displays a developer-only progress inventory.
- Approved assets: **294 original WebP images imported and SHA-verified in GitHub** (V2-06 completed).
- Screen 47 has one further mascot cutout from the *user-provided full-screen approved screenshot*. That image is stored in the standalone approval ZIP, **not yet present in the GitHub branch**.
- Backups, photos, notification scheduling, Android build and functional QA are **not implemented or validated**.

## Key evidence
- [Source-of-truth policy](docs/SOURCE_OF_TRUTH.md)
- [47 confirmed lock](docs/design-locks/screen-47.json)
- [47 QA approval log](docs/V2_07_SCREEN47_QA.md)
- [47 approved standalone HTML/CSS](reference/screen-47/index.html)
- [V2-06 exact approved asset verification](docs/V2_06_UPLOAD_STATUS.md)

## Start
```sh
cd drawary-v2
npm install
npm run dev
```

## Next checklist step
**V2-08: common shell, bottom navigation and routing** based on the locked 59 designs. Do not silently change approved visuals. Screen 47's actual React integration and mascot PNG import are follow-on integration tasks; font unification will be handled globally.
