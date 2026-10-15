# V2-09-02 / Screen 02 onboarding — integration + QA (closed 2026-10-15)

- Source: user-approved `Drawary_02_ONBOARDING_FINAL_CONFIRMED.zip`, confirmed 2026-10-08
  (`CONFIRMED_STATUS.txt`: 화면 상태/코드 상태 모두 확정).
- `OnboardingScreen_FINAL_CONFIRMED.tsx` ported verbatim into `src/screens/OnboardingScreen.tsx`
  — only the image path changed, from the archive's relative
  `./icons/drawary/onboarding/final/` to this app's `/assets/onboarding/final/`
  convention (same treatment #01 splash got). No markup, class names, copy,
  or interaction logic were altered.
- `src/screens/OnboardingScreen.css` is newly written (no separate CSS file shipped
  in the archive) by taking the exact color/size/position values from the
  archive's standalone `index.html` preview `<style>` block and remapping its
  shorter demo-only selectors (`.screen`/`.card`/`.art`/...) onto the class
  names the confirmed TSX actually renders (`.onboarding-screen`/
  `.onboarding-card`/`.onboarding-art`/...). No values were changed.
- The 8 approved WebP illustrations (`intro/create/fields/fill/views/reminder/backup/complete.webp`)
  were copied byte-for-byte from the archive into `public/assets/onboarding/final/`.
  **Note**: `public/assets/onboarding/scene_0N_*.webp` (8 files, already in the
  repo) are a *different*, older illustration set — different SHA-256, not
  referenced anywhere in `src/`. Left untouched (not deleted) since removing
  unused files wasn't asked for; flagging here so they aren't mistaken for the
  confirmed set.
- Route `#/onboarding` exposes the screen in the V2-08 developer harness, same pattern as `#/splash`.
  `onDone` (fired by both "시작하기" and "건너뛰기") sets `localStorage['drawary_onboarding_done']='1'`
  and navigates to `#/home`, exactly as confirmed.

## Discrepancy found vs. the archive's own documentation (not fixed — flagging only)

`README.txt` / `CONFIRMED_STATUS.txt` both list "키보드 ←→ 유지" (keyboard
left/right navigation preserved) as verified behavior. The confirmed
`OnboardingScreen_FINAL_CONFIRMED.tsx` itself has **no keyboard event
handler at all** — only `onTouchStart`/`onTouchEnd` (swipe) and the nav
buttons' `onClick`. I ported the TSX verbatim rather than add a handler the
approved source doesn't have, per "integrating code is not approving a new
design." Flagging as a genuine product question: was keyboard nav meant to
ship and got dropped from this export, or was the status doc just stale?

## QA — compiled React browser, 390×844 / 320×640 / 430×932

- `npm run build` (`tsc -b && vite build`): 0 errors.
- Playwright/Chromium against the compiled `npm run preview` build:
  - All 8 slides reachable forward via the "next" button; "이전" (prev) button
    correctly absent on slide 1 (no `index>0`) and on slide 8 (`last`, replaced
    by "시작하기"); next/next/prev from slide 1 correctly lands on slide 2 (dot
    index 1).
  - Touch swipe-left (`touchstart`/`touchend` with a >40px delta) advances to
    the next slide, matching the confirmed swipe threshold.
  - "건너뛰기" (skip, slide 1 only) → `#/home`, `drawary_onboarding_done` set to `'1'`.
  - "시작하기" (start, slide 8 only, reached via 7× next) → `#/home`, flag set to `'1'`.
  - No console/page errors at any viewport; the one 404 seen in a multi-step
    run was isolated and reproduced as a one-off browser-context resource
    (not any of the 8 app images — confirmed by an isolated single-navigation
    re-run with a response listener showing zero 404s).
  - All three viewports screenshot cleanly (`onboarding_320x640_slide1/8.png`,
    `onboarding_430x932_slide1/8.png`).
- Pixel comparison, all 8 slides, compiled V2 screenshot vs. the archive's own
  `review/01.webp`–`08.webp` (same 390×844): mean abs RGB diff 2.09–2.38/255,
  55.5–56.1% exactly-identical pixels. Diff is confined to glyph/illustration
  **edges only** (confirmed via an 8×-amplified diff visualization — solid
  fill regions are zero-diff; the diff outlines text and character strokes),
  consistent with WebP re-encode / sub-pixel antialiasing noise between
  whatever pipeline produced the archive's reference WebPs and this
  Chromium's direct PNG screenshot — not a layout, color, or content defect.
  Pixels with diff > 30/255 are 2.1–2.2% of the frame at every slide checked,
  all on those same edges.
- **Status: React-integrated AND compiled-browser-QA-verified**, including
  the keyboard-nav gap noted above.
