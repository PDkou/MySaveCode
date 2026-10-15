# V2-09-16 / Screen 16 보관품 상세 — closed 2026-10-15

- Source: `Drawary_16_FINAL_CONFIRMED_CODE`'s `RecordDetail.tsx`/
  `record-detail.css` (`CONFIRMED.md`: "FINAL CONFIRMED / Revised" --
  no README/CONFIRMED contradiction this time, both agree it's final).
- Ported verbatim into `src/screens/RecordDetailScreen.tsx`/`.css`.
  Each field's `type` auto-maps to one of the 10 approved
  `field-types/*.webp` icons (text/note/number/currency/date/photo/
  select/checkbox/rating/link) per `CONFIRMED.md`; prices are shown as
  stored, never given an invented currency symbol. Asset paths fixed
  from the archive's flat layout to this app's real nested layout.
- Wired as `#/record-detail`, reachable from #15's record rows
  (previously a no-op). Uses that same clicked record's own demo title
  (from #15's `DEFAULT_RECORDS`, now exported) so the content actually
  carries over rather than always showing a hardcoded sample. #13/#14's
  "담기" now also returns here via `#/drawer-detail`.
  "수정하기"(#17)/"보관품 삭제"(#18) have no destination screens yet,
  intentional no-ops.

## A mislabeled fixture found and fixed during this batch's own QA

The archive's own `public/fixtures/sample_record_photo.webp` turned out
to be a mis-captured screenshot crop -- it has a "1/3" photo-count badge
and a sliver of a thumbnail strip baked into it, not a clean product
photo. Confirmed by comparing it directly against `16_CONFIRMED_MAIN.png`,
which shows a clean zoomed lipstick photo with no UI chrome. Deleted
that fixture and reused #14's own `sample_selected_photo.webp` instead
(both #14 and #16 are the same 롬앤 쥬시래스팅 틴트 record, so the same
clean product photo is the correct choice, not a substitution).

For #15's other 3 demo records (cushion/palette/perfume), no
full-resolution photo was ever provided -- only their small 92x98 list
thumbnails. Opening those from #15 shows that same small thumbnail
upscaled into #16's larger photo frame (soft/low-res) rather than
inventing a higher-resolution photo that doesn't exist; this is called
out in `App.tsx`'s own comment at the `record-detail` route, not
silently left to look like a defect.

## QA

- Compiled-browser Chromium render at 390x844, 320x640, 430x932: full
  home -> drawer-detail -> record row -> record-detail -> menu ->
  back chain exercised, no console/HTTP errors.
- Pixel-diff against both confirmed renders came back elevated overall
  (`16_CONFIRMED_MAIN.png`: mean 9.17, 67.2% identical, 21.2% diff>30;
  `16_CONFIRMED_MENU_OPEN.png`: mean 9.01, 69.0%, 20.5%) -- isolating the
  photo region (y 92-338) from the rest of the page shows why: outside
  the photo, mean 4.26 / 5.9% diff>30 (solidly normal AA-noise range);
  inside the photo alone, mean 21.1 / 58.6%. The amplified diff shows a
  double-outlined lipstick silhouette, i.e. the same photo at a slightly
  different crop/zoom than whatever source the confirmed render was
  generated from -- not a wrong photo, a wrong layout, or a code defect.
  This is disclosed rather than chased further: no higher-resolution
  source photo exists in the available archives to match the reference's
  exact crop, and the rest of the screen (text, icons, button, menu,
  layout) matches cleanly.
