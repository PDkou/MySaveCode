# V2-08 common shell / footer / routing

2026-10-15. **V2-08 complete for common nav/router foundation: GitHub Actions TypeScript + Vite build success; standalone CSS/interaction browser QA success. Compiled React browser QA and real screen integration still pending.**

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
- **GitHub Actions verified:** workflow `Drawary V2 build QA`, run [38666893643](https://github.com/PDkou/MySaveCode/actions/runs/38666893643), concluded **success** on commit `823c128e1d86c8c81b65c16ca3e24a6134ec99ba`. Steps `Install V2 dependencies`, `Check TypeScript and build web app`, and `Guard approved screen 47` all succeeded. Design-lock workflow [38666893590](https://github.com/PDkou/MySaveCode/actions/runs/38666893590) also succeeded. Local npm build could not run due DNS `EAI_AGAIN`, but cloud build did run and pass.
- **Remaining limitations:** Chromium test is a faithful DOM/CSS/navigation preflight built from original approved assets, not the compiled React app. Actual user-approved tab screen bodies, device/browser runtime integration, and Android build QA are separate follow-up tasks.

## Scope
- Components implemented: `src/components/BottomNav_FINAL_CONFIRMED.tsx`, `bottom-nav-final.css`, `ResponsiveBottomNav.tsx`; shared host routing in `src/App.tsx` and `src/styles.css`.
- Actual approved #3 home, #5 search, #7 statistics, #38 settings screens still await real React screen implementation (V2-09 / V2-11).
- Preserve accepted 47 backup progress implementation and design locks; the new shell does not touch them.
- **V2-08 checked off as a common navigation engineering milestone** after successful cloud build and four-viewport browser preflight. Not considered full product/UI acceptance; completed 59-screen React integrations still 0.
