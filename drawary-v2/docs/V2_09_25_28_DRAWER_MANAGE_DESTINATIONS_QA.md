# V2-09-25~28 — closed 2026-10-15

## #25 서랍 이름 / 아이콘 변경

Ported from `Drawary_25_FINAL_CONFIRMED_CODE`'s `NameIconChange.tsx`/
`name-icon-change.css` into `NameIconChangeScreen.tsx`/`.css` -- only the
icon asset path changed, from the archive's flat `/assets/drawer_icon_*
.webp` convention to this app's actual `/assets/drawer-icons/` directory
(the 24 icons are the same already-imported approved WebP set #09/#24
use, confirmed present on disk before wiring, not guessed). Fixed the
`min-height:844px` root class to `height:844px;overflow:hidden` before
it could cause the same `FixedCanvas` clipping bug #15/#24 already hit
once each.

Reached from #24's "서랍 이름 / 아이콘 변경" row. Save/cancel both return
to #24; per CONFIRMED.md ("저장 후 24번 서랍 관리로 복귀하며 상단 정보 즉시
갱신") the edited name/icon are held in shared `App.tsx` state
(`drawerDetailName`/`drawerIconId`, new), not local to either screen, so
#24's header literally re-renders from the same state #25 just wrote.
"저장" stays disabled until the trimmed name is non-empty AND something
actually changed from the initial values, matching CONFIRMED.md's "빈
이름 저장 불가" / "변경 사항이 없으면 저장 비활성 전제".

## #26 서랍칸 편집

**Not a new screen.** Per `REUSE_MAPPING.md`: 베이스는 #09
(`DrawerFieldsScreen`), 추가는 #10 (`NewFieldScreen`), 수정은 #11
(`DrawerFieldEditScreen`), 순서 변경은 #09/#11의 기존 손잡이 방식 -- all
reused verbatim, not reimplemented. Only the differences the mapping
calls out were added, as three new props on `DrawerFieldsScreen`
(`title`, `completeLabel`, `contextLabel`) so the existing
creation-flow call sites keep their old defaults untouched:
- 진입점: #24's "서랍칸 편집" row (new `drawer-fields-manage` route)
- 제목/맥락: title → "서랍칸 편집"; `contextLabel` renders the mapping's
  own **approved visual refinement** -- drawer name + field count on one
  flex row with `align-items:baseline; justify-content:center`, i.e. one
  baseline, centered as a group, exactly as specified ("같은 한 줄에서
  동일 베이스라인으로 맞춘다" / "중앙 정렬")
- 완료/뒤로가기: completeLabel → "완료"; both return to #24
  (`drawer-manage`), not the creation flow's `creation-complete`
- 신규 생성 플로우용 문구 미사용: the default `title`/`completeLabel`
  values (서랍 칸 정하기 / 서랍 만들기 완료하기) are untouched for the
  existing creation-flow route, which passes no overrides

#10/#11 reuse needed their own `*-manage` routes (`new-field-manage`,
`field-edit-manage`) purely for back-navigation targeting -- same
components, same files, just returning to `drawer-fields-manage` instead
of `drawer-fields`. Doing this surfaced a real pre-existing bug:
`DrawerFieldEditScreen` had **no `onBack` prop at all** -- its list-view
back button (`.df-back`) had no `onClick`, a dead button in the existing
`field-edit` route too. Added the prop and wired both routes.

## #27 정렬 / 필터 설정

New `TableSortFilterEntryScreen.tsx`/`.css`, rendered as a local overlay
inside `DrawerManageScreen` (not a route), matching the component-local-
modal convention already used for #18. No separate TSX exists for this
screen, only `render.html` (base64-inlined icons, extracted via regex
same as #21/#24) + CONFIRMED.md's spec: "27번은 진입 선택만 담당" --
정렬 선택 시 #22 (`TableSortScreen`) 그대로, 필터 선택 시 #23
(`TableFilterScreen`) 그대로, 로직 중복 구현 금지. Both are rendered
unmodified, fed this screen's own demo table columns/rows (same local-
demo-state caveat already documented for #20's own table -- no real
per-drawer table data exists yet, V2-12 territory). Icons
(`icon_sort.webp`/`icon_filter.webp`) are the exact assets already used
elsewhere in this app for the same meaning, not guessed from
render.html's unlabeled base64 data.

## #28 서랍 삭제 확인

New `DrawerDeleteConfirmScreen.tsx`/`.css`, ported near-verbatim from
`Drawary_28_FINAL_CONFIRMED_CODE`'s `DrawerDeleteConfirm.tsx`/
`drawer-delete-confirm.css` (only the icon path remapped to
`/assets/ui-icons/icon_delete.webp`). Rendered as a local overlay inside
`DrawerManageScreen`, reusing #18's delete-sheet pattern per CONFIRMED.md
("18번 보관품 삭제 확인의 삭제 바텀시트 패턴 재사용"). Confirming calls
`onDeleteDrawer`, which per CONFIRMED.md ("삭제 후 홈 복귀") navigates all
the way to the home tab -- not back to #24 or #15.

## Bugs found and fixed during this batch

- `DrawerFieldEditScreen`'s back button had no `onClick` at all (see
  #26 above) -- fixed for both the new `field-edit-manage` route and the
  pre-existing `field-edit` route.
- Three `font:inherit` declarations (in the new `.nic-actions button`,
  `.ddc-actions button`, `.tsf-option`/`.tsf-cancel` rules) were placed
  *after* explicit `font-size`/`font-weight` in the same rule --
  `font:inherit` is a shorthand that resets the whole font property set,
  so it silently wiped out those explicit values. Caught by re-reading
  the generated CSS before building, not by a visual diff. Fixed by
  moving the reset to its own unscoped `button{font:inherit}` rule at
  the top of each file, matching the convention already used in
  `TableViewScreen.css`/`RecordDetailScreen.css`.
- `.nic-page` was ported with `min-height:844px` (the archive's own
  value) instead of this app's `height:844px;overflow:hidden`
  convention -- fixed proactively before QA, same clipping-bug class as
  #15/#24.

## QA

- `npm run typecheck` and `npm run build` both clean.
- Compiled-browser Chromium render at 390x844, 320x640, 430x932 for all
  four screens -- no clipping at 320px, no distortion at 430px.
- #25: typed a new name, picked a different icon, confirmed "저장"
  enables only once something actually changed; clicked save and
  confirmed (a) the route returns to `#/drawer-manage` and (b) `#24`'s
  own header text reads the new name immediately (`뷰티 보관함`) --
  the shared-state "즉시 갱신" requirement, verified by reading the DOM,
  not just eyeballing a screenshot. Pixel-diff against
  `25_CONFIRMED_RENDER.png`: mean 17.89 / 84.6% identical / 10.4%
  diff>30 -- elevated mainly because the reference shows "저장" active
  (purple) while the base/unedited state here correctly shows it
  disabled (grey) per CONFIRMED.md's own "변경 사항이 없으면 저장
  비활성 전제"; structurally and color-wise otherwise a close match.
- #26: verified title/context/complete-label render as expected
  (`서랍칸 편집` / `화장품 4개 서랍칸` / `완료`); clicked "서랍 칸 추가" ->
  lands on `#/new-field-manage`; clicked a field row -> lands on
  `#/field-edit-manage`; clicked that screen's back button -> returns to
  `#/drawer-fields-manage` (confirming the new `onBack` prop works);
  clicked "완료" -> returns to `#/drawer-manage`. No confirmed render PNG
  exists for #26 (REUSE_MAPPING-only screen), so verified structurally/
  behaviorally instead.
- #27: opened the entry sheet from #24's "정렬 / 필터 설정" row; picked
  "정렬" -> `TableSortScreen`'s own sheet (`.sv3-sheet`) appears
  unmodified; cancelled -> back to #24 (not the entry sheet); reopened,
  picked "필터" -> `TableFilterScreen`'s own sheet (`.tf-sheet`) appears
  unmodified; cancelled -> back to #24; reopened and cancelled the entry
  sheet itself -> overlay fully gone. Pixel-diff against
  `27_CONFIRMED_RENDER.png`: mean 16.24 / 86.0% identical / 8.1%
  diff>30 -- slightly above the usual AA-noise band but structurally a
  close match (dimmed background + sheet layout/copy identical).
- #28: opened the confirm sheet from #24's "서랍 삭제" row; verified the
  dynamic copy reads the live `drawerName`/`recordCount` ('화장품' /
  24개 보관품); "취소" closes the sheet back to #24; "삭제하기" navigates
  all the way to `#/home` per CONFIRMED.md. Pixel-diff against
  `28_CONFIRMED_RENDER.png`: mean 10.08 / 89.2% identical / 5.2%
  diff>30 -- close to the normal AA-noise band.
- One console `404` was observed on the very first page load of a
  multi-page batch script, but did not reproduce in three separate
  isolated repro attempts (same route, same interactions, fresh
  browser/page each time) and no app resource request ever showed a
  matching 404 via `page.on('response')` -- concluded to be Chromium
  tab-chrome noise (e.g. an automatic favicon probe), not a real app
  defect, and not chased further.
