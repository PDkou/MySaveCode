# V2-12 step 2: search, table view, sort/filter, export (#5, #20-#23, #27)

Layout of the approved screens is unchanged. Added or changed visuals are listed below.

## What works

- **#5 전체 검색**: searches every drawer's 보관품 by title, subtitle, drawer name and any value (what is shown and, for text/dates, what is stored: `2024-03` and `2024. 03` both find a date). A result opens #16; back returns to the search with the query still typed (the opened record's origin -- search, table or drawer list -- is remembered for back and after delete).
- **#20 표 보기**: the drawer's 서랍 칸 are the columns, the 보관품 the rows. First column stays fixed and the rest scroll sideways. A field of kind `사진` shows a 사진 column (`2장`). Dates are `2024. 03. 12.`, money has no symbol, ratings are stars.
- **#21 검색**: substring match over every shown cell, live; `취소` restores all rows.
- **#22 정렬**: one sort at a time, as approved. Numbers sort as numbers, dates as dates, text by 가나다; **empty cells always go last**; photo columns cannot be sorted. `초기화` now **removes** the sort (before it only reset the direction).
- **#23 필터**: any number of conditions per the approved cards; the operators per kind are the approved ones (text/long text/link/select: 포함·일치·비어 있음; number/money/rating: 이상·이하·범위; date: 이전·이후·범위; check: 체크됨/체크 안 됨; photo: 사진 있음/없음). The condition editor was a static mock-up (read-only boxes, a canned example rule); it is now a real editor -- pick the operator, type or pick the value(s), and an unusable value (`abc` for money, a missing date, a range with the small value last) shows a message and keeps `이 조건 추가` off. With 2+ rules `모두 맞는 보관품` (default) / `하나라도 맞는 보관품` appears, and the preview count updates live. No "AND/OR" wording is shown.
- **#27 정렬/필터 설정** (from #24) edits the same sort/filter as the table.
- The chosen sort/filter is **remembered per drawer** (setting `tableview.<drawerId>`) and removed with the drawer. A filter or sort that points at a deleted field is ignored.
- **Export (`•••` in #20)**: `CSV로 내보내기` and `PDF로 내보내기` export exactly the rows on screen (filter, sort and search applied). CSV is UTF-8 with a BOM and CRLF so Excel reads Korean; values are machine-friendly (ISO dates, plain numbers, `체크함`/`체크 안 함`, photo count); a cell that starts like a formula (`=`, `+`, `-`, `@`) gets a leading `'` so a spreadsheet will not run it. PDF is the browser's print dialog on a landscape A4 table (choose "PDF로 저장"); fonts are the bundled Noto Sans KR.

## Decisions and deviations to know about

- **The `•••` export menu** has no approved design; it copies #15's `•••` menu (same box, arrow, row style, `icon_share.webp`).
- **Table sort of a check column** uses the existing label pair (`가나다순`/`역순`); it puts unchecked first in the first direction. Left as the approved logic.
- **A saved filter or sort is not shown anywhere on #20** (no approved indicator): the table just opens already filtered. Open question for the user whether to add a small marker.
- **#20's header count** is always the drawer's total records; #21 shows its own result count.
- **Android**: CSV download and the print dialog need native handling in the WebView shell (Android QA). In headless Chromium here a *Korean* download file name was reported as `download` by Playwright while an ASCII name was kept; not checked in a real browser or on a device.
- `mockData.ts` (the QA search records) is deleted.

## Verified

- `npm test` 71 (was 52): typed filter/sort/search, input checks, CSV/print builders, record naming. `tsc -b`, `npm run build`, 54/54 route smoke; the 1-B/1-C/1-D browser flows re-run and pass.
- Real Chromium + IndexedDB: global search (title, other drawer's memo, stored vs shown date, drawer name, no result) -> open -> back keeps query; table headers/rows, sticky first column and horizontal scroll; search; sort by price high-to-low, then rating low-to-high (empty last); saved in settings and still applied after reload; filter with price <= 30,000 + date after + text (3 rules, all vs any, preview counts 2 / 4 / result), invalid value message, photo filter; row -> #16 -> back to the table; #24's sort/filter entry; CSV content for a sorted view and for a search-narrowed view; print DOM and a real PDF rendered with print media (only the print root visible).

## Not done

Notifications and recurrence (step 3); the Android file/print bridge (step 6).
