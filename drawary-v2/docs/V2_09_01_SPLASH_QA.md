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
- Original official V2 WebP library 294 assets remain untouched.

## Compiled React browser QA — closed 2026-10-15

- `npm install` + `npm run build` (`tsc -b && vite build`) succeed with 0 errors.
- `npm run preview` served the compiled app; Chromium (Playwright, `/opt/pw-browsers/chromium`) loaded `#/splash` at **390×844, 320×640, 430×932** with `networkidle` + a 1800ms settle wait (covers the longest entrance-animation delay+duration, 900ms+700ms=1600ms for `decor-bl`, so every element is in its final resting state before the screenshot).
- No console/page errors on any of the three viewports (an isolated single-page re-run confirmed the one 404 seen in the first multi-viewport pass was a one-off browser-context favicon request, not a missing app asset — all 6 approved images decode and render).
- Pixel-diffed the compiled V2 `#/splash` screenshot against a same-settings Chromium render of the approved standalone `Drawary_01_SPLASH_SOURCE_RENDER_CANDIDATE/index.html` at all three viewports: **0.0 mean abs RGB diff, 100% identical pixels** at each size (`SplashScreen.css` is a byte-for-byte copy of the approved `<style>` block, so this is expected and confirms no drift was introduced porting it into the scoped CSS module).
- **Status: React-integrated AND compiled-browser-QA-verified.** Cold-start timing and the #02 onboarding transition are still open — intentionally out of scope for #01 alone (see App.tsx comment); they land when #02 is wired in.
