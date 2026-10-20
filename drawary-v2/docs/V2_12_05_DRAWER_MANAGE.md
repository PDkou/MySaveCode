# V2-12 step 1-D: managing an existing drawer (#24, #25, #26, #28)

Layout of the approved screens is unchanged; the data behind them is real.

## What works

- **#24 서랍 관리**: shows the real field and record counts. `서랍 삭제` (#28) deletes the drawer **with its fields, records and photos** and returns home (the approved sheet's copy about "알림·반복 설정도 함께 삭제" is kept; those settings do not exist yet).
- **#25 이름 / 아이콘 변경**: saves to the drawer (name up to 20 with the screen's own counter, 24 icons); blank name or no change keeps `저장` disabled. The new name/icon show at once in #24, #15 and home.
- **#26 서랍칸 편집** (reuse of #9/#10/#11): saved straight away, no draft. The list is the drawer's real fields; `서랍 칸 추가` goes through #10; the suggestion chips add a field at once; tapping a row opens #11 on that field (name, required, select options); drag the handle to reorder (saved when released); `완료` returns to #24.

## Rules and decisions

- Same rules as 1-B: names unique within a drawer, select needs 2+ distinct options, a field's kind cannot change.
- **The last remaining field cannot be deleted** (a drawer without fields cannot hold records): message `서랍 칸은 최소 1개 있어야 해요.`
- **Removing a choice from a select field** that records already use first asks to confirm (`...보관품 N개의 값이 지워져요`), then clears that value from those records in the same transaction. Declining keeps everything.
- **Deleting a field** (#11's own confirm sheet) removes its value from every record of that drawer.
- Making a field `필수` does not change existing records; it applies the next time a record is saved.
- `정렬 / 필터 설정`, `알림 설정`, `반복 관리`, `백업 / 내보내기` rows on #24 are not wired in this step (steps 2, 3, 5).

## Verified

- `npm test` 52 (was 49): choice removal clears only the affected values, a rejected update leaves values alone, the last field cannot be deleted. `tsc -b`, `npm run build`, 54/54 route smoke.
- Real Chromium + IndexedDB, two drawers with records: #24 counts -> rename + icon (blank name and no-change disabled) -> quick-add (duplicate refused with a message) -> add a number field through #10 -> rename (clash refused) -> remove a used choice (declining keeps data, accepting clears 2 records only) -> drag a field to the top (order saved) -> delete a field (values removed) -> counts update -> delete drawer (home lists the other drawer; the deleted one's fields and records are gone) -> deleting the only field of the other drawer is refused. The 1-B and 1-C flows were re-run after the shared drag code changed and still pass.

## Not done

Table/sort/filter/search/export (step 2), notifications and recurrence (step 3), backup row (step 5).
