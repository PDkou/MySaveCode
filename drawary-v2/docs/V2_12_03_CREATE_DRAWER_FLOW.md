# V2-12 step 1-B: create-drawer flow is saved (#8 -> #9 -> #10/#11 -> #12)

Visuals are untouched: #9, #10, #11 and #12 render **pixel-identical** (0 changed pixels, real Chromium, default state) before and after this step. Only data and behavior were wired.

**One user-approved visual addition (2026-10-20, after a preview):** #8's name field now shows a `0/20` counter inside its right edge, styled like #10's (11px, `#a0a7b7`). The field gets 54px right padding so text never runs under it; the icon grid below did not move (0px, measured). Counting is by JavaScript string length, so an emoji counts as 2 (same as #10).

## How it works

- The name/icon/color from #8 and the field list edited in #9/#10/#11 live in an in-memory draft (`src/flow/drawerDraft.ts`, held in `App.tsx`). Backing out (`닫기` on #8) throws the draft away; coming back from #9 to #8 shows what was typed.
- `서랍 만들기 완료하기` calls `createDrawerWithFields`: the drawer and all its fields are written in **one transaction**. A bad field leaves nothing behind; a double tap creates one drawer (ref guard + serialized writes).
- #12 shows the saved drawer's real name, icon and field count. `서랍 채우기` -> #13; `나중에` -> the tab the flow started from. Home shows the new drawer.

## Rules added (and where they are tested)

- A drawer needs at least one field. Select fields need 2+ distinct, non-empty options. Field names are unique within a drawer (case/space-insensitive), also when renaming. A field's kind cannot change.
- Name limits: drawer 20 characters (input is capped), field 20.
- 39 tests (was 31): atomic creation, rollback, duplicate names, repeated select options, and the draft helpers. Mutation-checked: disabling the duplicate-name check or the "at least one field" check makes the matching tests fail.

## Decisions and deviations to know about

- **Starting fields.** The approved #9 shows 제품명 / 구매일 / 가격 / 메모, so every new drawer starts with those four (any can be edited or deleted), whatever its name.
- **Quick-add chips** create: 별점 -> rating, 사용기한 -> date, the other six (브랜드, 구매처, 카테고리, 색상, 용량, 한줄평) -> plain text. Tapping one already present shows a message instead of adding a duplicate. `카테고리` is text, not select, because a select needs options the chip cannot know.
- **#11 (edit a field).** Opens straight on the edit view of the tapped field (the archive's demo list view only appears for the direct `#/field-edit` URL and for #26's manage route, which is still demo until 1-D). The type row shows the field's real type but is not tappable (kind is fixed). The `선택 옵션` section only appears for select fields, as in #10.
- **Validation messages** (empty name, duplicate, <2 options, no fields) are `window.alert` boxes -- no approved design shows an error state.
- **Drag-reorder in #9** was written against element pointer capture, which is lost when rows reorder; it now follows `window` pointer events (same fix as the home grid). Not visible in the approved design.
- `NewFieldScreen`'s `FieldKind` now comes from `data/types.ts` (identical values).

## Verified (real Chromium, real IndexedDB)

Empty store -> #8 (next disabled until named) -> #9 (4 defaults) -> quick-add + duplicate message -> add a rating field and a select field through #10 -> empty name rejected -> rename a field, rename clash rejected, delete a field -> drag-reorder -> double-tap complete -> #12 shows `책 서랍을 만들었어요.` / `서랍칸 6개 준비 완료` / books icon -> exactly one drawer with fields in the dragged order persisted across reload -> home lists it -> a new flow starts blank. Also: a select field edited down to one option is rejected; removing every field then completing is rejected with nothing saved. `tsc -b`, `npm run build`, 54/54 route smoke pass.

## Not done

Drawer detail (#15) and everything after it still show demo records; #26 (edit fields of an existing drawer) and its #10/#11 reuse are not wired (1-D).
