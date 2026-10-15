# V2-09-01 / Screen 01 splash — integration patch (review pending)

- Source: user-approved screen-01 `Drawary_01_SPLASH_SOURCE_RENDER_CANDIDATE.zip`, whose 390×844 Chromium preview was accepted on 2026-10-08 and recorded as screen/code confirmed in the tracking CSV.
- No old GitHub Drawary files were fetched or imported.
- Original standalone CSS and JSX kept; only asset URLs changed to `/assets/splash-approved/` (six exact binary originals) and CSS moved into a scoped module file.
- Route `#/splash` exposes the screen for testing in current V2-08 developer harness. No auto-dismiss time or onboarding navigation was invented; these require flow integration with screen 02.
- The V4 bottom navbar does NOT appear in the splash route.
- All other routes preserve the V2-08 developer harness and are not actual approved production screens.

## QA preflight

- Original approved standalone HTML rendered in Chromium 390×844 using exact, self-contained user-approved image bytes.
- Visual pixel comparison to recorded approved PNG `01_splash_phone_390x844_preview.png`: average absolute RGB error 0.689/255 per channel and 93.2% exactly identical pixels (minor screenshot animation/raster differences), all six images decode successfully.
- **React compile/build/in-browser runtime for this patch not yet verified locally** because node_modules unavailable and container networking blocked; a GitHub Actions build must pass after applying the patch.
- Before marking React integrated/approved, verify compiled V2 page `#/splash` at 390×844, 320×640, 430×932, check browser errors, compare against accepted preview, and obtain user sign-off.
- Original official V2 WebP library 294 assets remain untouched.
