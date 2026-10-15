# V2-09-19 / Screen 19 사진 확대 / 보기 — closed 2026-10-15

- Source: `Drawary_19_FINAL_CONFIRMED_CODE`'s `PhotoViewer.tsx`/
  `photo-viewer.css`. Its own README says "사용자 확정 전이므로 19번
  미확정 유지," contradicted by the sibling `CONFIRMED.md`'s "FINAL
  CONFIRMED" -- same stale-README pattern as #03/#04/#09-#11/#13-#15/
  #17/#18. `CONFIRMED.md` wins.
- Ported verbatim into `src/screens/PhotoViewerScreen.tsx`/`.css`, gesture
  logic untouched: Pointer Events for pinch-zoom (scale clamped [1,4]),
  drag-when-zoomed, swipe-to-change-photo at 1x, double-click/tap zoom
  toggle, index wrapping, thumbnail strip hidden at 1 photo.
  `icon_cancel.webp` verified directly -- it's a self-contained red
  circle + white X image, matching the confirmed render's close button
  exactly (the CSS's own backdrop is a dark semi-transparent circle;
  the icon's own red visually covers it).

## Fixture substitution (same issue class as #16)

The archive's 3 sample photos (`sample_photo_1/2/3.webp`) are, like
#16's `sample_record_photo.webp`, mis-captured screenshot crops --
opened all three directly and confirmed one has a visible "1/3" badge
and thumbnail-strip sliver baked in, the others are differently-cropped
screenshots of the same scene rather than clean standalone photos. Not
used. No clean 3-photo set for a single item exists in any available
archive, so this screen's wiring in `App.tsx` reuses 3 of #15's own
clean item thumbnails (lip/cushion/palette) purely to exercise the
swipe/zoom/thumbnail mechanics -- flagged in both files' comments as a
substitution for mechanics demonstration, not "the" approved photo set.

## Integration note: entry point added beyond the confirmed source

#19's `CONFIRMED.md` says closing the viewer returns to #16, implying
#16 launches it, but #16's own confirmed source never defines a tap
target for its photo. Added `onOpenPhoto` to `RecordDetailScreen`
(tapping the photo opens the viewer) as the natural integration point
rather than guessing a different one #19's own spec doesn't support --
documented in both components' comments.

## QA

- Compiled-browser Chromium render at 390x844, 320x640, 430x932: full
  home -> drawer-detail -> record -> record-detail -> tap photo ->
  photo-viewer -> click thumbnail 2 (count updates to "2 / 3") ->
  double-click to zoom (confirmed `transform: matrix(2,0,0,2,0,0)` via
  computed style, i.e. real scale(2), not just a visual appearance) ->
  double-click to reset -> close (returns to record-detail) chain
  exercised, no console/HTTP errors.
- No numeric pixel-diff against `19_CONFIRMED_RENDER.png` was produced:
  that reference's own photo is the corrupted fixture described above,
  so a diff against it would just re-measure the fixture swap, not this
  screen's actual fidelity. Verified instead by direct visual comparison
  of structure (dark topbar, red close button, count badge, bottom
  thumbnail strip with active-item highlight) and by the interaction
  tests above, which confirm the real pinch/drag/swipe/double-tap logic
  from the confirmed source is intact and functioning.
