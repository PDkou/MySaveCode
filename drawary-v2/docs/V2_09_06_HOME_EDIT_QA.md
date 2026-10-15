# V2-09-06 / Screen 06 홈 편집 모드 — closed 2026-10-15

- Source: `HomeEditMode_CANDIDATE_V3.tsx` / `home-edit-mode-v3.css`
  (`DRAWARY_HANDOFF/SCREEN_ORIGINALS/06/...`, STATUS.md: design approved,
  source classified `CANDIDATE_SOURCE_NEEDS_PARITY`). Reuses #03's same
  confirmed base image (`home_footer_centered.webp`) as a delta overlay,
  same approach already used for `HomeScreen.tsx`.
- Ported into `src/screens/HomeEditScreen.tsx`/`.css`; wired as `#/home-edit`,
  reachable from #03's existing (previously no-op) "편집" hotspot. "완료"
  returns to `#/home`; delete/reorder are local no-ops pending the V2-12
  data layer (same caveat as #09's quick-add/reorder).

## Two revisions to the "완료" control, in order

1. **First pass, against `Drawary_06_Home_Edit_V14.png`** (from the
   2026-10-15 render-comparison package): that image showed "완료" as a
   filled lavender pill (fill `#F1ECFF`, border `#CEC2F7`), unlike the V3
   candidate's plain transparent text link. Pixel-sampled and implemented
   as a pill.
2. **Superseded same day** by a second upload,
   `Drawary_59_Approved_Screens_Individual_Flat_2026-10-15.zip`, whose
   `06_Home_Edit_USER_APPROVED_2026-10-15.png` is explicitly called out in
   its own `READ_ME_FIRST.txt` as a newer re-approval: "06번은 pill 제거 후
   완료 텍스트를 내 서랍과 수평 정렬한 이미지로 새롭게 확정." That README
   also explicitly cautions this image is a **user-approved generated
   image, not a claimed browser-code render** ("브라우저에서 실제 코드를
   실행한 렌더라고 주장하면 안 됩니다") -- so it's the current design
   target, not a pixel-diff baseline the way `*_CONFIRMED_RENDER.png`
   files are for other screens.
   - Re-implemented accordingly: removed the pill entirely, right-aligned
     a smaller (15px vs. the heading's ~20px+) plain purple (`#7657e8`)
     text sharing the same row/baseline as the base image's "내 서랍"
     heading (pixel-measured from the approved image: "완료"'s text
     bottom sits within 1px of "내 서랍"'s text bottom, at ~85% of its
     height).

## Reconstructed icon (flagged, not an approved binary)

The candidate TSX references `./assets/icon_reorder.svg`, which was never
actually present in that archive (its folder listing has `icon_add`,
`icon_delete`, `icon_grid`, `icon_home`, `icon_search`, `icon_theme` only
-- no reorder icon file). No equivalent exists among the 294 approved
WebP assets either (`icon_grid.webp`/`icon_sort.webp` are both visually
different glyphs, checked directly). The delete icon (`icon_delete.webp`)
*is* a real, verified-matching approved asset and is used as-is.

Reconstructed the reorder glyph as an inline SVG (3 equal horizontal bars
+ a vertical double-arrow, solid `#8C74E8`), pixel-matched against a
magnified crop of the V14 render's icon -- same CSS/SVG-glyph
reconstruction approach already used for #11's reorder handle. This is
new code, not approved artwork, and is called out here rather than
silently presented as a found asset.

## QA

- Compiled-browser Chromium render at 390x844, 320x640, 430x932: no real
  console/HTTP errors (one isolated first-navigation 404 reproduced the
  known favicon-on-cold-context false alarm, confirmed non-issue via a
  fresh single-navigation re-run per this session's established pattern).
- Interaction: #03's "편집" hotspot -> `#/home-edit`; delete/reorder
  buttons fire without crashing; "완료" returns to `#/home`.
- Visual comparison against `06_Home_Edit_USER_APPROVED_2026-10-15.png`:
  matches on content, layout, colors, and the specific "완료" revision
  (no pill, right-aligned, same row as "내 서랍"). A numeric pixel-diff
  was **not** produced as a pass/fail metric here: that reference image is
  892x1763, a different aspect ratio than the app's 390x844 (0.5059 vs.
  0.4621), so a naive resize stretches content non-uniformly and produces
  a misleading diff number -- consistent with the package's own caveat
  that this specific image isn't a browser-code render to diff against
  pixel-for-pixel. Verified by direct visual inspection instead.
