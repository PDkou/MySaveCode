# V2-12 step 1-A: home (#3 / #6) drawn from real drawers

The approved #3 and #6 were flat 390x844 images with hotspots on top, so a drawer the user just created could never appear. `HomeScreen.tsx` now redraws the same layout as DOM from the on-device store. #4 (empty home) is still the approved image; it shows when there are no drawers.

## What was measured, what was not

Positions were measured off the approved #3 render and the result pixel-diffed against it (390x750 crop, real Chromium, 5 seeded drawers):

| | mean abs diff | pixels with diff > 30 |
| --- | --- | --- |
| first draft | 3.81 | 4.7% |
| after tuning | 2.71 | 3.5% |

Every text block, icon and the dashed card now sit within 1-3px of the approved render (`meas.py` bbox comparison). The remaining difference is **not geometry**; it is:

- **Icon artwork.** The approved render used sharper icon art that is not in `public/assets` (the shared nav package has separate 3-4x `cosmetics/books/travel/other.webp`, none for plants). The 24 approved `drawer-icons/*.webp` already in the repo are used instead, sized so each glyph fits the same ~56px box as the approved cards. Not imported: copying the extra files would mean adding assets outside the verified 294.
- **Brand lockup.** Every lockup in `public/assets/brand` has a faint white sticker outline; the approved render has none. Not substituted.
- **Font.** The sandbox has no Korean font installed, so text weight/face differ from the approved render. The stack (`Noto Sans CJK KR`, ...) is what a device will resolve.
- **Blue card tint** (`#e1edfa`) is derived; no approved home render shows a blue card.

## #6 edit mode

Same geometry as #3, `편집` becomes `완료`, each card gets a delete badge (left) and a reorder badge (right), as the previous implementation did. The `06_Home_Edit_USER_APPROVED_2026-10-15.png` reference is a full-phone screenshot with a more compact header and 167x150 cards, so it does **not** match #3's geometry; this build follows #3. Which one wins is a product decision that has not been made.

## Interactions that are new (not shown in any approved image)

- Reorder: press-and-drag the reorder badge; the grid reflows live and the order is saved on release (move/up are tracked on `window`, because moving the card's DOM node drops element pointer capture; the first version lost the drop and never saved).
- Delete: `window.confirm` naming the drawer; cascades to its fields, records and photos.

## Verified

- `npm test` 31/31, `tsc -b`, `npm run build`, 54/54 route smoke.
- Real Chromium: tap card -> `#/drawer-detail`; `+` card -> `#/create-drawer`; edit -> drag first card to third -> order persisted across a hard reload; delete -> confirm dialog -> row gone; `완료` -> `#/home`.

## Not done

Drawer detail still shows demo records; create-drawer, fields and record screens are not saved yet (steps 1-B to 1-D).
