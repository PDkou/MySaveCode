# V2-12 step 1-C: 보관품 (records) are real -- fill, list, detail, edit, delete, photos (#13-#19)

Layout of the approved screens is unchanged. Checked against the approved renders with the same four fields and sample text (real Chromium, mean abs pixel diff): **#13 0.84**, **#15 0.93**; #16/#17 follow the same layout (their larger diff in my checks is only different sample content). What changed is the data behind them.

## How it works

- **#13/#14 서랍 채우기**: the form is built from the open drawer's real 서랍 칸 (all 10 kinds), starts empty, and `담기` saves the record **and its photos in one transaction** (`createRecord(..., photos)`), then opens #15. Required fields and number/money parsing are checked with messages (`window.alert`, as in 1-B). A second tap while saving is ignored.
- **#15 서랍 상세**: that drawer's records, newest first, with the first photo as thumbnail (the drawer's own icon when there is none). The search box filters by any value (what is shown, e.g. `13,000` or `2024. 03`).
- **#16 보관품 상세**: heading + filled fields (money as stored with thousands separators and no symbol, dates `2024. 03. 12. (화)`, rating as stars). Tapping the photo opens #19 with that record's photos only. Menu -> #18 confirm -> deletes the record **and its photos**, back to #15.
- **#17 보관품 수정**: every field editable; `수정 완료` saves values (and photos if changed) in one transaction. Back discards.
- Reloading on a record screen returns to #15 (the open record is not remembered); a record route with nothing to show redirects to #15 / home.

## Decisions and deviations to know about

- **Photos are a set of up to 3 at the top of every form, not a row.** A field of kind `사진` therefore has no row of its own (it is effectively "photos on", which every drawer already has). In #17, `사진 바꾸기` **replaces** the whole set with the newly picked photos and `×` removes them all (one photo shown, as approved).
- **Record title.** #15/#16 name a record from its first filled text-like field (글자/긴 글/선택/링크), the second becomes the small subtitle in #15, the first date is the date line (else the day it was added). In #16 the title field is not repeated in the list. A record with nothing text-like falls back to its first number/money/date, then `이름 없는 보관품`.
- **Kinds the approved forms never drew** (number, select, check, rating, link) use the same input box, colors and sizes as `.fd-input`/`.re-input`; check is a tick box, rating five tappable stars (tap the current score again to clear), select a native dropdown. No approved design exists for these. Date uses the browser's native date control (so a Korean device shows its own date format, not the sample's free text `2024. 03. 12. (화)`), money/number are typed freely (`13,000원` is accepted).
- **No empty-list message in #15** (none is in the approved design): a drawer with no records shows an empty list and the `서랍 채우기` button.
- **Legacy photo store** (`drawary-v2-record-photos`) is no longer used. It only ever held photos for the demo records, so there was nothing real to migrate; it is left in place, not deleted.
- **Table view (#20) still shows demo rows** (step 2); tapping a row there opens the drawer's newest real record.
- **Photo picking** uses the browser file chooser (`<input type=file>`); on Android the WebView shell must provide the chooser (Android QA). Photos are stored as the picked files, uncompressed.
- Notification/recurrence wizards now read the real drawer's date fields and records for their pickers (their saving is still step 3).

## Verified

- `npm test` 49 (was 39): atomic create/update with photos (a bad photo or missing required value writes nothing), value parsing, formatting, titles, search. `tsc -b`, `npm run build`, 54/54 route smoke.
- Real Chromium + real IndexedDB: open an empty drawer -> fill (required missing and bad price rejected, 3-photo cap, photo removal) -> saved once on a double tap -> list row/thumbnail -> search by price/no match -> detail -> photo viewer -> edit text/number/photo set -> detail updated, photo count updated -> discard keeps old photos -> reload keeps data -> delete via #18 removes the record and its photos. A drawer with all 10 kinds: required select blocks saving, every kind round-trips through save -> detail -> edit.

## Not done

Table/search/filter/export (step 2); a photo-field marker with its own row (see above); editing an existing drawer's fields (1-D, so a later field delete/rename will be reflected here automatically).
