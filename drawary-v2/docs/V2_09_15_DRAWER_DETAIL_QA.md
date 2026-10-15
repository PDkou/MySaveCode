# V2-09-15 / Screen 15 서랍 상세 / 보관품 목록 — closed 2026-10-15

- Source: `Drawary_15_FINAL_CONFIRMED_CODE`'s `DrawerDetail.tsx`/
  `drawer-detail.css`. Its own README says "사용자 확정 전이므로 15번
  미확정 유지," contradicted by the sibling `CONFIRMED.md`'s "FINAL
  CONFIRMED" in the same archive -- same stale-README pattern as
  #03/#04/#09-#11/#13/#14. `CONFIRMED.md` (and the unflagged top-level
  `STATUS.md`) wins.
- Ported verbatim into `src/screens/DrawerDetailScreen.tsx`/`.css`.
  Asset paths fixed from the archive's flat layout
  (`/assets/icon_table.webp` etc.) to this app's real nested layout
  (`/assets/ui-icons/...`, `/assets/drawer-icons/...`). The 4 sample
  records' thumbnails are the archive's own QA fixtures, copied to
  `public/fixtures/` (same convention as #14's photo fixture) -- not
  production data, since there's no real drawer/item data model yet
  (V2-12 territory).
- Wired as `#/drawer-detail`, reachable from #03's 5 drawer-card
  hotspots (previously all no-ops) -- the header's drawer name now
  changes per card clicked, though the record list itself is the same
  4 demo items regardless of which card was opened (honest about what's
  actually wired, not faked per-drawer content). "표로 보기"(#20)/"서랍
  관리"(#24) and opening a record (item detail, #16+) have no
  destination screens yet, intentional no-ops.
- #13/#14's `FillDrawerScreen`'s "서랍 채우기" entry point now also
  reaches here (previously only reachable via #09→#12), and its 담기
  button's `onSave` now returns to `#/drawer-detail` instead of being
  unwired.

## QA

- Compiled-browser Chromium render at 390x844, 320x640, 430x932:
  reached via the real home drawer-card hotspot, `•••` menu opens/closes,
  "서랍 채우기" -> fill-drawer -> 담기 -> back to drawer-detail, back
  button -> home. No console/HTTP errors.
- **Bug found and fixed during this batch's own QA**: the screen was
  initially wired without the `FixedCanvas` wrapper every other fixed-390px
  screen in this app uses, so at 320px width it clipped on the right
  ("서랍 채" cut off) instead of scaling down. Fixed by wrapping it in
  `FixedCanvas height={844}`, matching #09-#14's established pattern;
  re-verified clean at all three viewports.
- Pixel-diff against both of the archive's own confirmed renders:
  `15_CONFIRMED_MAIN.png` -- mean diff 2.63, 94.7% identical, 3.3%
  diff>30; `15_CONFIRMED_MENU_OPEN.png` -- mean diff 2.84, 94.4%
  identical, 3.6% diff>30. Both are among the closest matches this
  session, solidly within the established AA-noise range.
