# V2-09-17 / Screen 17 보관품 수정 — closed 2026-10-15

- Source: `Drawary_17_FINAL_CONFIRMED_CODE`'s `RecordEdit.tsx`/
  `record-edit.css`. Its own README says "사용자 확정 전이므로 17번
  미확정 유지," contradicted by the sibling `CONFIRMED.md`'s "FINAL
  CONFIRMED" in the same archive -- same stale-README pattern as
  #03/#04/#09-#11/#13-#15. `CONFIRMED.md` (and the unflagged top-level
  `STATUS.md`) wins.
- `CONFIRMED.md` flags that this screen's confirmed baseline is the
  *first* candidate (V1) -- a later V2 draft adding a field-label icon
  per row was explicitly rolled back. The given TSX already has plain
  text labels with no per-row icon, confirming it already is V1; no
  further reconciliation needed.
- Ported verbatim into `src/screens/RecordEditScreen.tsx`/`.css`. Asset
  paths fixed to this app's real nested layout. The sample photo
  fixture (`sample_edit_photo.webp`) visibly has a thumbnail-strip
  sliver and a corner button baked into it -- checked directly against
  `17_CONFIRMED_RENDER.png` and confirmed this *is* what the reference
  itself shows, unlike #16's equivalent fixture (which was a mislabeled
  screenshot crop). Used as-is, not substituted.
- Wired as `#/record-edit`, reachable from #16's "수정하기" (previously
  a no-op). Per `CONFIRMED.md`, "수정 완료" returns to #16 (보관품 상세).

## Real bug found and fixed during this batch's own QA

`RecordEditScreen`'s `photoUri` prop defaults to the sample fixture only
when the prop is literally `undefined`. The initial `App.tsx` wiring
represented "no photo" (after clicking the × remove button) by setting
state to `undefined` -- which meant the component's own default
parameter silently put the fixture photo right back on the very next
render, so the "등록된 사진이 없어요" empty state was unreachable in
practice. Found via an isolated click test
(`.re-photo-empty` never appeared after clicking `.re-photo-remove`).
Fixed by representing "no photo" as `''` instead of `undefined` in
`App.tsx`'s state, and documented the gotcha directly in
`RecordEditScreen.tsx`'s own header comment for future integrators.
Re-verified: the empty state now appears correctly and stays.

## QA

- Compiled-browser Chromium render at 390x844, 320x640, 430x932: full
  home -> drawer-detail -> record -> record-detail -> 수정하기 ->
  record-edit -> remove photo (now works) -> edit product-name field ->
  수정 완료 -> back to record-detail chain exercised, no console/HTTP
  errors.
- Pixel-diff against `17_CONFIRMED_RENDER.png`: mean diff 2.05, 97.1%
  identical, 2.5% diff>30 -- one of the closest matches this session,
  including the photo region (the fixture genuinely matches the
  reference here, unlike #16).

## 2026-10-15 follow-up: user-requested empty-state restyle

The user compared #17's empty-photo state (plain generic icon +
"등록된 사진이 없어요" caption on a solid pink card, as in the archive's
own source) against #13's empty-photo state (dashed border + the same
cute illustration, `state_photo_empty.webp`) and asked for the #13
treatment instead, finding it cleaner. This is a deliberate deviation
from the archived source at the user's explicit request, not a port --
documented in `RecordEditScreen.tsx`'s own header comment. Changed
`.re-photo-card.is-empty` to a dashed `#d7c9ba` border on `#fffaf5`
(matching #13's `.fd-photo-empty` exactly) and swapped the icon+caption
for the same illustration asset, sized to fill the card. Re-verified:
no regression on the photo-present state or the back/save navigation
chain.
