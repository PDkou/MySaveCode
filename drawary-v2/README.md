# Drawary V2

**나만의 서랍장 / Drawary / ひきだし帳**

This is an independent new React/Vite app based **only on the 59 user-approved screen designs and original user-approved assets**. At the user's request, **ignore the previous GitHub Drawary app's contents entirely**. Other repository folders remain untouched as separate archival work.

## Status
- Visual approvals: **59/59**
- Standalone final code status: **screen 47 still needs final confirmation**
- React V2 real screen integration: **0/59**
- Current V2 landing page: **developer-only progress inventory**, not an approved product screen
- Actual binary assets on V2 GitHub branch: **not yet uploaded**
- Approved local asset import package: prepared and verified (294 original assets)
- Android integration, backup, recurrence, photos, release build: not yet verified

## Quick start
```sh
cd drawary-v2
npm install
npm run dev
```

## Approved asset import
Provide the original final approved `02A_DRAWARY_ASSETS_FINAL_STRUCTURED.zip` archive, then:
```sh
python scripts/import-approved-assets.py /path/to/02A_DRAWARY_ASSETS_FINAL_STRUCTURED.zip
```

Read [the source of truth policy](docs/SOURCE_OF_TRUTH.md). Do not copy code, designs, images or splash behavior from the old GitHub app.

## Next milestones
1. Import 294 original assets into the V2 checkout and verify SHA-256 manifest.
2. Locate the exact approved screenshot/source code for **screen 01 splash** (do not substitute an old implementation).
3. Integrate screen 01 as a real React screen and validate a 390×844 Chromium render.
4. Implement 02 onboarding, 03 home and subsequent approved screens while preserving the locked visual design.

The old folders and branch are not modified. This rebuild has not yet undergone production build or device QA.
