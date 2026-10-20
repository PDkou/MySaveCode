# V2-12 step 3: notifications (#29-#32) and recurrence (#33-#37)

Screen layouts are unchanged; the three visible additions are listed under "Additions". **Delivery of notifications while the app is closed is not done here: it needs the Android shell (step 6).**

## Notifications

- **Rule** = "N days before the date in this date field, at this time" (`당일` = 0, 1-90 days, `HH:MM`). One rule covers every record of the drawer that has a date in that field. The same rule cannot be added twice; only a date field of that drawer is accepted.
- #29 lists the drawer's rules; #30 offers only the drawer's real date fields; #31 saves the rule; #32 summarises it. Tapping a rule in #29 asks to delete it.
- Notifications are **separate from recurrence**: they only read dates, so a record a recurrence rule makes simply has its own date and is covered by the same rule.
- `computeNotificationPlan` (`src/flow/notificationPlan.ts`) lists the notifications still to come, soonest first (default 60, for the phone's alarm quota): past moments and records without a date are skipped. Text: title = drawer name, body = `<record title> · <field> 7일 전` / `당일`.
- **Bridge to Android**: after every data change the app calls `window.DrawaryNative.setNotificationPlan(json)` if it exists (contract in `src/data/nativeBridge.ts`: it replaces ALL scheduled notifications with the list, each item has a stable `key`). In a plain browser nothing happens; there is no web push fallback because no approved screen asks for notification permission.

## Recurrence

- **A rule never edits the record it was made from.** Each due period adds a NEW record.
- Rule = target record + date field + weekly/monthly/yearly + interval (1-99) + end (never / N new records / until a date). Adding a rule creates nothing.
- **Which periods are made.** Periods are counted from the target's date in the chosen field (fixed when the rule is made). Only periods *after today* are ever made: a 2026-09-15 purchase repeated monthly, set up on 2026-10-20, first makes 2026-11-15 (not the past 09-15/10-15). A period is made on its date (or the next time the app is opened after it).
- **What a new record contains.** A copy of the target's values (from the target as it is now, or from its saved copy if it was deleted) with the date field moved to that period. **Photos are not copied.** Required fields do not block a generated record (a required field added later would otherwise stop the series).
- **Month ends** are counted from the base, so Jan 31 -> Feb 28 -> Mar 31 (not Mar 28); Feb 29 yearly -> Feb 28 in other years.
- **End condition.** `count` = number of NEW records (the original is not counted); `date` is inclusive. A finished rule shows `끝남`; a running one `사용 중` or `N개 만듦` in #33.
- **When it runs:** when the app opens, when it returns to the foreground, and every 10 minutes while open. Each record and the rule's progress are written in one transaction, so a period is never made twice (also if two runs overlap). After a long absence it catches up in order, at most 60 records per rule per run.
- Deleting a rule (tap it in #33, confirm) keeps the records it made. Deleting its date field or its drawer removes the rule. A duplicate rule (same target, field, cycle, interval) is refused. A target without a date in the chosen field shows a message in #34 and does not continue.

## Additions (no approved design shows them)

1. #29: the "이 서랍의 알림" section now lists saved notifications (drawn like the `알림 공통 설정` card below them).
2. #33: a rule row's status text can be `N개 만듦` / `끝남`; tapping a row asks to delete it.
3. #34: tapping `반복할 보관품` opens a searchable list built from #22's picker sheet (the archive's own demo cycled through records one tap at a time, unusable with real data).

## Open decisions / not done

- **`알림 공통 설정`** (default notification time, `알림 쉬는 시간`) has **no approved screen** among the 59, so it is not built and quiet hours are not applied; notifications fire at each rule's time.
- **Photos on generated records**: not copied (storage and privacy); copy them instead if you want.
- Notification **delivery**, the permission prompt and the Android alarm limits: step 6.
- Texts are Korean only (step 4 adds JA/EN).

## Verified

- `npm test` 96 (was 71): period maths (weeks, month-end clamps, leap years), due/cap/end conditions, rule validation, each rule type creating NEW records while the original (values, `updatedAt`, photos) is untouched, idempotency (same day twice and two concurrent runs), catch-up after an absence, count and inclusive end date, deleted target, required field added later, cascades on field/drawer delete, the v1 -> v2 database upgrade keeping data, and the notification plan. Mutation-checked (breaking the progress counter or the date shift fails the tests).
- Real Chromium + IndexedDB: #29-#32 end to end (duplicate refused, delete declined/accepted), #33-#37 end to end (picker + search, undated target refused, rule saved, duplicate refused), then with the clock moved: one new record on its date, the list shows both, the original unchanged, and a count-2 rule finishing; the Android bridge received the upcoming list. `tsc -b`, `npm run build`, 54/54 route smoke, earlier flows re-run.
