# V2-09-13 / Screen 13 서랍 채우기 — closed 2026-10-15

- Source: `Drawary_13_FINAL_CONFIRMED_CODE.zip`. `FillDrawer.tsx`/`fill-drawer.css`
  ported into `src/screens/FillDrawerScreen.tsx`/`.css` verbatim; only the
  archive's flat asset paths (`/assets/state_photo_empty.webp`,
  `/assets/field_photo.webp`, `/assets/icon_calendar.webp`) were fixed to
  this app's real layout (`/assets/states/photo/...`,
  `/assets/field-types/...`, `/assets/ui-icons/...`).
- Its own `README.md` says "13번은 아직 사용자 최종 확정 전", contradicted by
  the sibling `CONFIRMED.md`'s "FINAL CONFIRMED" in the same archive --
  same stale-README pattern as #03/#04/#09/#10. `CONFIRMED.md` (and the
  top-level audit's non-flagged classification) wins.
- Wired as its own route (`#/fill-drawer`) and chained from #12's
  "서랍 채우기" button.

## QA — actual pixel comparison against the archive's own confirmed render

This batch (#09–#13) is the first time this session ran a real pixel diff
against each screen's own `*_CONFIRMED_RENDER.png` / `REFERENCE_APPROVED_RENDER.png`
rather than only eyeballing a screenshot — #09–#12 had been QA'd by build +
interaction testing + visual inspection only, without that pixel-level
check, until it was done retroactively here.

| Screen | vs. | mean abs diff | identical % | diff>30 % | verdict |
|---|---|---|---|---|---|
| #09 | `REFERENCE_APPROVED_RENDER.png` (393×849, 3px frame vs. this app's 390×844) | size differs by the reference's own border; content/layout match on visual inspection | — | — | OK |
| #09 | `QA_FINAL_CODE_RENDER.png` | 3.26 | 93.5% | 5.3% | OK (AA noise range) |
| #10A (type list) | `10A_CONFIRMED_RENDER.png` | 2.89 | 94.7% | 4.5% | OK |
| #10B (detail, "선택" type) | `10B_CONFIRMED_RENDER.png` | 3.84 | 86.3% | 7.4% | OK, see below |
| #11A (list, reconstructed) | `11A_CONFIRMED_LIST.png` | — | — | 12.6% | **OK, see below** |
| #11B (edit) | `11B_CONFIRMED_EDIT.png` | 5.87 | 79.8% | 10.3% | OK |
| #11C (delete confirm) | `11C_CONFIRMED_DELETE_CONFIRM.png` | 3.86 | 82.3% | 7.2% | OK |
| #12 | `12_CONFIRMED_RENDER.png` | 2.33 | 96.3% | 3.2% | OK |
| #13 | `13_CONFIRMED_RENDER.png` | 2.31 | 96.9% | 2.7% | OK |

**Methodology mistake found and fixed while running this**: the first
#10B comparison came back at mean diff 15.78 / 29.4% diff>30 -- far
outside every other screen's AA-noise range. Cause: the verification
script clicked the *first* type row ("글자") to reach the detail screen,
but `10B_CONFIRMED_RENDER.png` shows the detail screen's actual confirmed
state, reached via the "선택" (select) row (the component's own default
`kind` state, and the one that shows the options UI). Re-ran against the
correct state (reusing the already-captured `newfield_detail_select.png`
from the #10 QA pass) and it dropped to the normal range shown above. This
was a test-script error, not a `NewFieldScreen` defect -- the component
itself was never changed.

**#11A validates the CSS-based list-view reconstruction**: since this was
the riskiest piece of this whole batch (rebuilding markup the bundled TSX
never actually rendered, from its paired CSS's class names alone), the
existence of an actual confirmed reference specifically for this exact
view (`11A_CONFIRMED_LIST.png`) made it possible to check the
reconstruction directly rather than only by internal consistency. Visual
comparison: same purple help-banner copy and bold emphasis
("수정"/"손잡이"), same 7 rows with icon/name/type/›-hint/handle, no swipe
demo in either -- the 12.6% diff>30 pixels are entirely thin glow outlines
around row borders/icons/text in an amplified diff image (a small
cumulative sub-pixel offset down a 7-row list plus the usual font AA),
not a content or layout mismatch.
