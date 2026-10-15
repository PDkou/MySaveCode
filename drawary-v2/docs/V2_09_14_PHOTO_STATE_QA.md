# V2-09-14 / Screen 14 사진 선택/등록 상태 — closed 2026-10-15

- Source: `Drawary_14_FINAL_CONFIRMED_CODE/PhotoRegisteredState.tsx`/
  `photo-state.css` (classified `RECOVERED_ORIGINAL_WITH_CODE`; its
  README says "사용자 확정 전이므로 14번은 미확정 유지," contradicted by
  the sibling `CONFIRMED.md`'s "FINAL CONFIRMED" in the same archive --
  same stale-README pattern as #03/#04/#09/#10/#11/#13.
  `CONFIRMED.md`/top-level `STATUS.md` (최종 디자인 승인: YES) wins.
- **Not a new screen**: per #14's own `CONFIRMED.md`, this is the
  *registered-photo* state of the exact same screen as #13 (same title
  `{drawerName} 서랍 채우기`, same 제품명/구매일/가격/메모 fields, same
  담기 button) -- #13 is its empty-photo state. Merged into the existing
  `FillDrawerScreen.tsx`/`.css` as a conditional branch on
  `photoUris.length`, rather than creating a parallel duplicate screen.
  CSS classes from #14's `ps-*` prefix were re-added under this file's
  existing `fd-*` prefix (`fd-photo-card`, `fd-remove`, `fd-count`,
  `fd-thumbs`), values unchanged from the confirmed source.
- Per `CONFIRMED.md`: photo selection assumes the Android Photo Picker,
  returning real URIs for dynamic preview; the archive's own sample
  image is explicitly a render-QA fixture, not a fixed app asset. This
  app has no Android picker to call yet, so `onAddPhoto` now also pushes
  that same QA fixture (copied to `public/fixtures/sample_selected_photo.webp`,
  matching the archive's own path) into local state -- enough to exercise
  the registered-state UI in a browser -- while still invoking a
  caller-supplied `onAddPhoto` first, so a real picker integration can
  take over without changing this component's shape. `maxPhotos` is now
  a real prop (default 3, matching the reference) instead of implicit.
  Asset paths fixed from the archive's flat layout
  (`/assets/field_photo.webp` etc.) to this app's real nested layout
  (`/assets/field-types/...`, `/assets/ui-icons/...`), same fix already
  applied for #13/#11/#12.

## QA

- Compiled-browser Chromium render at 390x844: empty state unchanged
  (no regression), clicking the empty-photo placeholder or "사진
  추가하기"/"사진 더 담기" adds the fixture photo; a second photo reveals
  the thumbnail strip with the active-photo purple border; the × button
  removes the current photo and the count/thumbnails update correctly.
  No console/HTTP errors.
- Pixel-diff against the archive's own `14_CONFIRMED_RENDER.png`:
  mean diff 4.07, 89.2% identical, 5.8% diff>30 -- solidly within this
  session's established AA-noise range (mean 2-8, bigdiff 3-13%).
