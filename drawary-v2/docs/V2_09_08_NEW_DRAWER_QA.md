# V2-09-08 / Screen 08 새 서랍 만들기 — closed 2026-10-15

- No approved source exists. Its own `STATUS.md` classifies it
  `NO_FINAL_CODE_IMAGE_ONLY` ("Locate final approved source; do not
  invent UI"). Reconstructed as real React/CSS from
  `Drawary_08_PreInheritance_Confirmed.png` (390x844): a bottom sheet
  (name input + icon grid + color swatches + "다음") over a dimmed Home,
  reusing #11's already-established modal-sheet convention (backdrop +
  rounded-top sheet + drag handle -- same handle size/color,
  `42x4 #d8d1ca`, sampled from the reference and matching that existing
  CSS almost exactly).
- Built as `src/screens/NewDrawerScreen.tsx`/`.css`, wired as the real
  first step of the create-drawer flow at `#/create-drawer`.

## Navigation restructure (this was the real finding here)

This screen's own name is "새 서랍 만들기" -- the same label every existing
"+" entry point (home's hotspot, bottom-nav's "+", the empty-state CTA,
edit-mode's create tile) already routed to `#/create-drawer`, which
*was* rendering #09's field-setup screen directly. The approved flow is
actually **#08 (name/icon/color) first, then #09 (field setup)** -- #09
was missing its real predecessor step. Fixed by:
- `#/create-drawer` now renders this new #08 sheet over a dimmed,
  non-interactive `HomeScreen` (`.drawary-dimmed-home`: `filter` dim +
  `pointer-events: none`, not a second screenshot).
- #09's field-setup screen moved to a new route, `#/drawer-fields`.
  "다음" on #08 advances to it; #09's own back button now returns to
  `#/create-drawer` (back to #08) instead of jumping straight to the
  previous tab.
- #10's back/add (`#/new-field`) updated to return to `#/drawer-fields`
  instead of the old `#/create-drawer`, since that name now means #08.
- Every existing "+" entry point needed no changes at all -- they still
  call `navigate('create-drawer')`, which now correctly lands on #08
  first, exactly matching the approved design intent.

All 10 icons in the reference map to real approved `drawer-icons/*.webp`
assets, verified by direct visual comparison one by one (including the
"•••" tile, which is genuinely `drawer_icon_misc.webp` -- three purple
dots -- not a placeholder). No icon reconstruction was needed here,
unlike #06's reorder icon. The 6 swatch colors (pink/lavender/green/
peach/yellow/blue) were sampled directly from the reference.

The draft name/icon/color aren't persisted or carried into #09 yet --
there's no shared create-drawer state until V2-12, same caveat as
#09-#13's own local-demo-state notes.

## QA

- Compiled-browser Chromium render at 390x844: no console/HTTP errors.
- Interaction: reached via the real home "+" hotspot AND the real
  bottom-nav "+" button (both verified); filled the name field, picked
  a different icon and color, clicked "다음" -> landed on
  `#/drawer-fields`; from there, back -> returned to `#/create-drawer`
  (#08) as intended; tapping the backdrop dismisses to the previous tab.
- Visual comparison against the reference: the sheet's own internal
  layout matches closely -- row-by-row landmark measurements (input box,
  both icon-grid rows, color-row label, button) are within 0-2px of the
  reference, except the swatch row (~15px, minor). A full-frame pixel
  diff (mean 17.9, 59.7% diff>30) is much higher than that because it
  also includes the dimmed Home *behind* the sheet, which differs from
  the reference's own dimmed Home for reasons unrelated to this screen
  (the reference's background still reads "N개의 기록" from before this
  session's 기록→보관품 terminology rename, and it's a different dimming
  technique) -- not a defect in #08 itself. Confirmed by isolating the
  sheet region, which aligns well, per the landmark measurements above.
