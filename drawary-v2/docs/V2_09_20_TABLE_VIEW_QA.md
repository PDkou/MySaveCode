# V2-09-20 / Screen 20 표 보기 — closed 2026-10-15

- Source: `Drawary_20_FINAL_CONFIRMED_CODE`'s `TableView.tsx`/
  `table-view.css`. Same stale-README-vs-CONFIRMED.md pattern as prior
  screens; CONFIRMED.md wins. README also establishes #21/#22/#23 as
  search/sort/filter *states* of this same screen, same "one screen,
  several states" pattern as #13/#14.
- Ported verbatim into `TableViewScreen.tsx`/`.css`. 5 demo rows match
  `20_CONFIRMED_RENDER.png` exactly (read off the render, not invented).
  Horizontal scroll (`overflow-x:auto`) and sticky first column
  (`position:sticky`) are real CSS, not simulated.
- Wired as `#/table-view`, reachable from #15's "•••" menu's "표로
  보기" (previously a no-op). 검색/정렬/필터 are no-ops pending #21-23;
  CSV/PDF export ("•••") has no destination yet. Row click opens #16
  (always the "lip" demo record, since the table's own rows don't map
  to #15's `DEFAULT_RECORDS` -- different sample sets; real per-row
  linking needs V2-12).

## QA

- Compiled-browser Chromium render at 390x844, 320x640, 430x932: full
  home->drawer-detail->table-view->horizontal-scroll->row-click
  (opens record-detail)->back chain exercised, no console/HTTP errors.
- Pixel-diff against `20_CONFIRMED_RENDER.png`: mean 4.11, 90.7%
  identical, 7.1% diff>30 -- normal AA-noise range.
