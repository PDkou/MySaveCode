# V2-12: sharper drawer icons from the user's icon sheet

**Source.** The user supplied the icon sheet (1254x1254 PNG, transparent background, 24 icons on a 5x5 grid in alphabetical key order: baby, books, cafe, camera, car, clothes, cosmetics, documents, electronics, finance, fitness, food, games, gifts, health, hobby, home, misc, movies, music, pets, plants, shopping, travel). They said it is "probably final".

**Earlier mistake, corrected.** An earlier note said no sharp plants icon existed in the approved material. In fact `PART01/.../08/PRE_INHERITANCE.../drawers/plants.webp` does; the shared bottom-nav package also holds sharp cosmetics/books/travel/other. Those were not used: the sheet covers all 24.

**How the sheet was cut.** Icons were found by connected components on the alpha channel (24 of 24 found, pieces of multi-part icons such as fork+spoon, the three dots and the paw merged by grid cell), each kept with a 14px soft edge and never grabbing a neighbour. Checked on dark, cream and card-colored backgrounds: no white halo, no leftover fragments.

**How they replace the old files.** Same names (`drawer_icon_<key>.webp`), WebP quality 92 with alpha (about 250 KB for all 24, was about 60 KB). Each new file is scaled so the icon's visible glyph has the **same size and position inside its canvas as the old file** (canvases are now 207-331 px, were 59-77 px), so no screen moves. Home card placement (`DRAWER_ICON_BOUNDS` in `src/data/drawerStyle.ts`) was regenerated from the new files.

**Checked.** Before/after screenshots of home, edit home, create-drawer picker, name/icon change, drawer detail, drawer manage and search: pixels change only inside icon areas. Against the approved #3 render the five sample icons sit within 1-3 px (mean diff 2.83 overall, was 2.90) and now show the approved sharp art.

**Revert.** Restore the 24 files from the commit before this one.

**Not changed.** The logo (the repo's lockup is already the closest of the lockup files in the approved material).
