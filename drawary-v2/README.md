# Drawary V2
**나만의 서랍장 / Drawary / ひきだし帳**

Independent user-approved design rebuild. **Do not use old GitHub Drawary source or assets.**

## Status
- Designs **59/59** approved; standalone 47 backed by exact user-approved Chromium-rendered HTML and source hashes.
- V2-06 original 294 assets: imported and Git-verified.
- V2-07 screen 47 standalone source: approved; not yet React-integrated.
- **V2-08 common footer and navigation: source implemented, 4 viewport browser fixture QA passed. React build is pending network access to npm.**
- Actual finished app screens **0/59**; app currently shows clearly labeled development-only tab/navigation placeholders.
- Real backup, notifications, data storage, migration, Android device QA: pending.

## Development
```bash
cd drawary-v2
npm install
npm run build
npm run dev
```
View the dev-only navigation harness; tapping home, search, stats, settings changes the route, and central + opens a subflow (without bottom footer). These are not full product screens.

## Evidence
- `docs/V2_08_NAVIGATION_QA.md` details fixed V4 artwork/geometry and test limitations.
- `docs/V2_07_SCREEN47_QA.md` and `docs/design-locks/screen-47.json` lock screen 47.
- `docs/V2_06_UPLOAD_STATUS.md` locks approved original asset import.

Next: V2-08 formal React build; then V2-09 approved actual screens 01–28.
