# V2-08 common shell / footer / routing

2026-10-15. **Implementation staged in GitHub; final React production build not yet independently verified.**

## Approval basis (NOT old GitHub code)
- Exact user-confirmed archive: `Drawary_CONFIRMED_SHARED_BOTTOM_NAV_V4_DYNAMIC_2026-10-13.zip`, `CONFIRMED.md`.
- `BottomNav_FINAL_CONFIRMED.tsx` and `bottom-nav-final.css` copied unchanged from that archive.
- 5 image assets copied unchanged byte-for-byte from that archive into `public/assets/nav/`.
- No legacy GitHub Drawary icons, app UI, or source code used.

## Locked geometry / behavior
- 390×94 coordinate space; left centers 50/121, right centers 269/341; plus is fixed in approved base and action-only; 66px light-purple active pill; label CSS unified.
- Visible persistent nav on #3/#4/#5/#6/#7/#38 (and later persistent-tab screens); no forced footer in subflows, splash or onboarding.
- Responsive wrapper scales the whole approved 390×94 surface **as one unit** at widths below 390, never recomputes individual icon positions. At >=390 it remains centered and unscaled.
- Developer-only route harness: home/search/stats/settings and create-drawer subflow; click callbacks, URL hashes, browser navigation events, selected tab and return-to-previous-tab; routes are NOT real product screens.
- The root still displays a conspicuous **development-only placeholder**, so none of the 59 locked production screen designs are silently replaced or counted integrated.

## Browser preflight QA
- An independent HTML/JS test fixture built from the exact confirmed CSS and images was run in Chromium using `page.set_content` (inline image data, because this environment blocks localhost/file navigation).
- 390×844: all 4 tabs changed route; one selected tab; plus hides nav; return restores prior tab.
- 320×640: footer scaled to 320px; same route checks passed.
- 430×932: footer width stays 390px, centered; same checks passed.
- 844×390: 390px footer inside centered app shell; same route checks passed.
- Browser JS runtime errors: **zero** in fixture.
- Global TypeScript `transpileModule` TSX *syntax* diagnostics: **zero** for 4 modules.
- **Limitations:** npm install/build unavailable locally due DNS `EAI_AGAIN` to npm registry; fixture is a DOM/CSS routing preflight, not compiled React code. Formal `npm run build` and Android testing remain pending.

## Scope
- Components implemented: `src/components/BottomNav_FINAL_CONFIRMED.tsx`, `bottom-nav-final.css`, `ResponsiveBottomNav.tsx`; shared host routing in `src/App.tsx` and `src/styles.css`.
- Actual approved #3 home, #5 search, #7 statistics, #38 settings screens still await real React screen implementation (V2-09 / V2-11).
- Preserve accepted 47 backup progress implementation and design locks; the new shell does not touch them.
- Avoid marking V2-08 as production verified before a successful build and direct React/browser QA.
