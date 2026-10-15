# V2-09-21~24 — closed 2026-10-15

## #21 표 보기 - 검색 상태

No separate TSX exists -- only `render.html` (a self-contained static
preview) + `CONFIRMED.md`'s behavioral spec (same stale-README-vs-
CONFIRMED.md pattern as prior screens; CONFIRMED.md wins). Markup/CSS
(`.ts-*` classes) extracted from `render.html` via regex, since the
file's base64-inlined icons make it too large to read normally.
Implemented as a real internal state of `TableViewScreen` (not a
separate route), per the README's own framing ("20번 표 보기 구조 그대로
계승"): substring match across all visible column values, live-filters
as you type, "취소" restores the tools row and clears the query, clear
button restores all rows, empty-results state supported.

## #22 표 보기 - 정렬 상태

Ported from `Drawary_22_FINAL_CONFIRMED_CODE`'s `TableSortV3.tsx`/
`table-sort-v3.css` into `TableSortScreen.tsx`/`.css`. Quick-candidate
logic (last-used first, backfilled by drawer order, max 3, photo type
excluded) and type-dependent direction labels are untouched. The
confirmed source's own 취소/적용하기 buttons had no `onClick` at all --
added real `onCancel`/`onApply` wiring since this screen needs to
actually close and report a choice back to `TableViewScreen`.

**Bug found and fixed during this batch's own QA**: the sort direction
was initially inverted -- clicking "낮은순" (ascending) sorted the table
descending and vice versa. Found via an explicit low-to-high /
high-to-low round-trip test (clicked 가격 + 낮은순 + 적용하기, expected
the cheapest row first, got the most expensive). Root cause: the
comparator's `direction === 1 ? cmp : -cmp` had the branches swapped
relative to the labels (`direction 0` = labels[0], the ascending
option; `direction 1` = labels[1], descending) -- fixed to
`direction === 0 ? cmp : -cmp` and re-verified both directions for
구매일/제품명/가격.

## #23 표 보기 - 필터 상태

Ported near-verbatim from `Drawary_23_FINAL_CONFIRMED_CODE`'s
`TableFilter.tsx`/`table-filter.css` into `TableFilterScreen.tsx`/`.css`
-- the most functionally complete of the table-state screens; all
filter-predicate logic (`contains`/`equals`/`gte`/`lte`/`between`/date
`before`/`after`/checkbox/photo operators), quick-field candidates, and
AND/OR match-mode were already correct and already had real
`onCancel`/`onApply` wiring in the given source. Only the curly quotes
in `labelForRule` were swapped for plain quotes.

`TableViewScreen` stores the exact `filteredRows` array
`TableFilterScreen` itself computes and reports via `onApply`'s second
argument, rather than re-deriving the filter predicates a second time
-- avoiding a duplicate, possibly-diverging implementation.

## #24 서랍 관리 메인

No separate TSX/CSS exists, only `render.html` + `CONFIRMED.md`'s
structural spec. Markup/CSS (`.manage-*`/`.drawer-summary*` classes,
renamed to this file's `dm-` prefix) and all 7 row labels extracted
verbatim from `render.html` via regex. Icons are approved
`ui-icons/*.webp` assets chosen to match `24_CONFIRMED_RENDER.png`'s
icons one-for-one (pencil, 4-square grid, sort arrows, bell,
circular-refresh, share-box, trash) -- each verified by opening the
candidate asset directly, not guessed from filenames. Destinations
(#25/#26/#27/#29/#33/#28, plus the existing backup/export flow) don't
exist yet, so every row is an intentional no-op for now.

## QA (all four)

- Compiled-browser Chromium render at 390x844, 320x640, 430x932.
- #21: searching "롬앤" returns 1 result; an unmatched query shows the
  empty-results row; "취소" restores the tools row. No console/HTTP
  errors.
- #22: after the direction-bug fix, verified both directions explicitly
  (가격 낮은순 -> cheapest row first; 가격 높은순 -> priciest row first).
- #23: adding a "가격 ≤ 30,000" condition shows "조건에 맞는 보관품 3개"
  in the preview and the live count; applying it actually filters the
  table to 3 rows.
- #24: reached via #15's "•••" menu's "서랍 관리" (previously a no-op);
  back returns to #15. Pixel-diff against `24_CONFIRMED_RENDER.png`:
  mean 2.17, 97.0% identical, 2.7% diff>30 -- one of the closest
  matches this session.
- No numeric pixel-diff was produced for #21/#22/#23 against their
  confirmed renders/images: #21 and #22's visual structure was checked
  directly against their reference PNGs by eye (both matched closely);
  #23 has no standalone confirmed PNG to diff against in the available
  archives, only the TSX/CSS source, so it was verified purely by
  behavior (the interaction tests above).
