# V2-10-29~37 — closed 2026-10-15

Two linear wizards, both entered from #24 (서랍 관리): 알림 설정
(#29→#30→#31→#32→#24) and 반복 관리 (#33→#34→#35→#36→#37→#24).

## #29 알림 설정

Ported from `Drawary_29_FINAL_CONFIRMED_CODE`'s `NotificationSettings.tsx`/
`notification-settings.css` -- only asset paths remapped. Reached from
#24's "알림 설정" row. "알림 추가하기" -> #30. "알림 공통 설정" has no
destination among #25-#37, so it's an intentional no-op.

**Bug found and fixed**: the archive's own CSS applied
`filter:brightness(0) invert(1)` to the "알림 추가하기" button's icon,
assuming a flat single-color glyph. This app's actual `icon_add.webp` is
a complete colored badge (purple circle + white plus) -- inverting it
collapsed the plus into a solid white blob. #15 (`DrawerDetailScreen`)
already uses the same asset unfiltered; dropped the filter to match that
real precedent.

## #30 날짜 칸 선택

Ported from `Drawary_30_FINAL_CONFIRMED_CODE`'s `DateFieldSelection.tsx`/
`date-field-selection.css`. `dateFields` is fed `DEFAULT_DRAWER_FIELDS`
filtered to `kind === 'date'` -- for this demo drawer that's exactly one
field (구매일), exercising CONFIRMED.md's own "날짜 서랍칸이 1개뿐이면
기본 선택" case for real (verified: the ✓ badge is present without any
click). "다음" -> #31.

## #31 알림 시점 / 시간 설정

No separate TSX exists, only `render.html` + CONFIRMED.md's spec.
Markup/CSS extracted via regex (base64-inlined icons) and built as a
real interactive component: the 6 preset timing chips default to 7일 전
per CONFIRMED.md; "직접 설정하기" reveals a stepper (1-90일 전) for a
custom value (the stepper convention #35/#36 already use for free-form
counts, since no dedicated input screen exists for this); the time row
is a real `<input type="time">` overlaid on the display, defaulting to
09:00, changeable by tapping it.

**Bug found and fixed during this batch's own QA**: the drawer-context
card ("화장품 / 알림을 추가할 서랍", same markup as #30's own context
card) IS present in render.html's actual body markup, but was missed on
the first port -- the extraction focused on the timing/time sections and
the card was overlooked. Caught by comparing the rendered output against
`31_CONFIRMED_RENDER.png`, which clearly shows it; added back with the
`drawerName`/`drawerIconUri` props this needed.

## #32 알림 완료

Ported from `Drawary_32_FINAL_CONFIRMED_CODE`'s `NotificationComplete.tsx`/
`notification-complete.css`. "알림 더 추가하기" -> #30; "확인" -> #24.

## #33 반복 관리

Ported from `Drawary_33_FINAL_CONFIRMED_CODE`'s `RecurrenceManagement.tsx`/
`recurrence-management.css`. CONFIRMED.md: 반복은 알림이 아니라 "다음
주기용 보관품 자동 생성" -- 기존 보관품을 갱신하지 않는다.

**Gap found and filled**: the archive's own CSS never defines
`.rule-card`/`.rule-list` at all, even though its TSX renders both for
the `rules.length > 0` branch -- a real gap in the given source. Added
`.rm-rule-card`/`.rm-rule-list` styled consistently with this screen's
own `.rm-empty` card and #36's active-state treatment, verified visually
once a real rule exists (see QA below), rather than guessing a
different look.

## #34 반복 대상 / 날짜 칸

Ported from `Drawary_34_FINAL_CONFIRMED_CODE`'s `RecurrenceTargetDate.tsx`/
`recurrence-target-date.css`. The archive's own `onSelectTarget` takes no
argument at all -- a picker screen for "which 보관품" was presumably
meant to exist, but none of the 59 approved screens is one. Wired to
cycle through the target list on each tap instead of inventing a new
screen (same "local demo state" substitute already used for #09's
quick-add chips and #22's quick-sort candidates). Target candidates
reuse #15's own `DEFAULT_RECORDS` (real per-drawer item data already in
this app) rather than inventing a "선크림" item that exists nowhere else,
even though CONFIRMED.md's own illustrative example uses that name --
disclosed, not silently substituted.

## #35 매주 / 매월 / 매년 설정

Ported from `Drawary_35_FINAL_CONFIRMED_CODE`'s
`RecurrenceCycleSettings.tsx`/`recurrence-cycle.css`, renamed to this
app's `*Screen` convention. `cycleMeta` exported as `CYCLE_META` (plus a
`cycleLabel()` helper) so #36/#37 -- which only display an
already-committed cycle+interval -- can format the same "N개월마다"
label without duplicating the mapping.

## #36 반복 종료 조건

Ported from `Drawary_36_FINAL_CONFIRMED_CODE`'s
`RecurrenceEndConditionScreen.tsx`/`recurrence-end-condition.css`. The
archive's own CSS never styles the bare `<input type="date">` rendered
for the "날짜 정하기" branch; added matching field styling rather than
leaving it unstyled browser-default. This is also where App.tsx actually
commits the new rule into `recurrenceRules` -- the last step with user
input before the #37 summary screen.

## #37 반복 완료

Ported from `Drawary_37_FINAL_CONFIRMED_CODE`'s `RecurrenceComplete.tsx`/
`recurrence-complete.css`. "반복 더 추가하기" -> #34 (clearing the
target/date selection so the next pass starts fresh); "확인" -> #24.

## QA

- `npm run typecheck` and `npm run build` both clean.
- Full notification wizard round-trip exercised end to end: #29's "알림
  추가하기" -> #30 (single date field auto-selected) -> "다음" -> #31
  (changed timing to 3일 전, opened "직접 설정하기" and incremented to
  4일 전, changed time to 14:30 via the real time input) -> "알림
  설정하기" -> #32 (summary correctly reads 구매일/4일 전/14:30) ->
  "확인" -> lands on `#/drawer-manage`. "알림 더 추가하기" from #32
  separately verified to return to `#/notification-date-field`.
- Full recurrence wizard round-trip exercised end to end: #33 (empty
  state confirmed) -> "반복 설정하기" -> #34 (target selector starts as
  "보관품을 선택해 주세요", cycles to "롬앤 쥬시래스팅 틴트" on tap; date
  field auto-selected; "다음" enabled only once both are set) -> #35
  (switched 매달→매주, incremented interval to 3, preview text updates
  live: "구매일을 기준으로 3주마다...") -> #36 (switched to "횟수 정하기",
  incremented count to 13) -> #37 (summary correctly reads 화장품·롬앤
  쥬시래스팅 틴트 / 구매일 / 3주마다 / 13개 생성 후 종료) -> "확인" ->
  `#/drawer-manage`. Re-visited `#/recurrence-management` directly
  afterward and confirmed the new rule now renders via the newly-added
  `.rm-rule-card` (count: 1, non-empty state) -- the actual state commit
  in #36 and the previously-untested CSS gap-fill both verified together.
- Compiled-browser Chromium render at 390x844 for every screen in both
  wizards, plus 320x640/430x932 spot-checks on #31/#35/#36 (grids and
  steppers are the layouts most likely to break at non-390 widths) --
  no clipping or distortion found. #31 at 320x640 showed the bottom
  action bar partially outside the single-viewport (non-fullPage)
  screenshot; a `fullPage` capture confirmed this is a screenshot
  framing artifact, not a real layout bug -- the actions bar is
  correctly contained within `FixedCanvas`'s scaled host, same
  `position:absolute;bottom:32px` pattern every other screen already
  uses without issue.
- Pixel-diffed against confirmed renders where available: #31 mean
  11.71 / 90.9% identical / 6.9% diff>30 (normal range, now including
  the restored context card); #33 (empty state) and #35 visually
  near-identical to their references by eye (demo data differs only in
  the expected ways -- record count and target-item name, both
  previously disclosed).
- One console `404` was observed once more during this batch's run,
  same unreproducible single-occurrence pattern already investigated
  and documented in `V2_09_25_28_DRAWER_MANAGE_DESTINATIONS_QA.md` --
  not chased further again.
