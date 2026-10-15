# V2-09-09 / Screen 09 서랍 칸 정하기 — closed 2026-10-15

- Source: `Drawary_09_FIELD_SETUP_FINAL_CONFIRMED_CODE.zip`
  (`화면 상태: 확정`, `코드 상태: 확정`) — a real DOM/React component in the
  archive itself, not an image-background screen; its own doc says the
  reference PNG is QA-only.
- `DrawerFieldsConfirmed.tsx`/`drawer-fields-confirmed.css` ported into
  `src/screens/DrawerFieldsScreen.tsx`/`.css`, unchanged except the field-type
  icon paths (`./icons/field_*.webp` → `/assets/field-types/field_*.webp`).
  CSS is otherwise byte-identical.
- No footer: this is a sub-flow screen reached via the bottom nav's center
  "+", and App.tsx's existing convention already shows no nav on sub-flow
  screens — nothing to drop or unify here, unlike #05/#38.
- Wired into `#/create-drawer` (replacing the dev placeholder) via a new
  `FixedCanvas height={844}` wrapper, since this screen (unlike Home/Search/
  Settings) has no separate external nav height to subtract.
- `onAddField`/`onEditField`/`onQuickAdd`/`onReorder` have no destination
  screen yet (#10 새 서랍 칸 추가, #11 서랍 칸 수정 aren't integrated) and are
  left unwired. `onComplete` has no #12 생성 완료 to land on yet either, so
  it returns to the previous tab for now — all intentional placeholders,
  not guessed behavior.
- Found and removed dead code: the `create-drawer` route's final ternary
  branch (the old dev-placeholder JSX) became unreachable once this real
  screen took the `route === 'create-drawer'` case ahead of it.

## QA — compiled React browser, 390×844 / 320×640 / 430×932

- `npm run build`/`typecheck`: 0 errors.
- All 4 default rows render (제품명/구매일/가격/메모) with correct field-type
  labels and icons.
- `onBack` and `onComplete` both route to `#/home` (via `returnToTab`); no
  console/page errors (the one 404 seen is the same one-off browser-context
  resource already identified as a non-issue in every earlier QA doc this
  session).
- 320×640: content scales down via `FixedCanvas`; only the empty bottom
  padding below the "서랍 만들기 완료하기" button is clipped (verified via
  `getBoundingClientRect` — ~52px of the scaled 692.5px host falls outside
  the 640px viewport), no visible content (text/buttons) is cut off.
- 430×932: renders at the approved 1:1 size, centered.
- **Status: React-integrated AND compiled-browser-QA-verified.**
