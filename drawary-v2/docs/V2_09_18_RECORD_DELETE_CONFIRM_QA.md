# V2-09-18 / Screen 18 보관품 삭제 확인 — closed 2026-10-15

- Source: `Drawary_18_FINAL_CONFIRMED_CODE`'s `RecordDeleteConfirm.tsx`/
  `record-delete-confirm.css` (that archive also bundles `RecordDetail.tsx`/
  `record-detail.css` as context -- those are #16's own files, already
  integrated, not a new component here). `CONFIRMED.md`: "11번 서랍칸
  삭제 확인의 바텀시트 패턴 재사용" -- confirmed by direct comparison:
  same handle size/color, icon box, button heights/radii/colors as
  #11C's `.df-modal-backdrop`/`.df-confirm-sheet`. Its own README says
  "사용자 확정 전이므로 18번 미확정 유지," contradicted by the sibling
  `CONFIRMED.md`'s "FINAL CONFIRMED" -- same stale-README pattern as
  #03/#04/#09-#11/#13-#15/#17. `CONFIRMED.md` wins.
- Ported verbatim into `src/screens/RecordDeleteConfirmScreen.tsx`/`.css`.
  One correction made during the port: the source's curly quotes
  (`‘{recordTitle}’`) were initially typed as straight quotes by mistake;
  caught and fixed to `&lsquo;`/`&rsquo;` before the pixel-diff pass below.
- Rendered as a local overlay inside `RecordDetailScreen` (triggered
  from its "•••" menu's "보관품 삭제"), matching the established
  component-local-modal convention already used for #11's delete
  confirm, rather than a separate top-level route. `onDelete` only
  fires once the user actually confirms in the sheet, not just from
  opening the menu.
- Wired so "삭제하기" returns to `#/drawer-detail` (#15), per
  `CONFIRMED.md`: "삭제 완료 후 15번 서랍 상세로 복귀." No real deletion
  from a data model happens (navigation-only, same V2-12 caveat as
  #09-#13's local demo state).

## QA

- Compiled-browser Chromium render at 390x844, 320x640, 430x932: full
  home -> drawer-detail -> record -> record-detail -> "•••" -> "보관품
  삭제" -> sheet open -> 취소 (closes, stays on record-detail) -> reopen
  -> 삭제하기 (returns to drawer-detail) chain exercised, no
  console/HTTP errors.
- Pixel-diff against `18_CONFIRMED_RENDER.png` came back elevated
  overall (mean 7.58, 65.1% identical, 19.6% diff>30), but isolating
  the sheet region (y 560-844, the actual #18-specific content) from
  the photo region behind it (y 92-338, inherited from #16) shows why:
  sheet alone -- mean 4.67 / 6.95% diff>30 (normal AA-noise range);
  photo alone -- mean 15.3 / 49.8%. This is the same already-documented
  #16 photo-crop mismatch (see `docs/V2_09_16_RECORD_DETAIL_QA.md`)
  propagating into #18's dimmed background, not a new defect introduced
  here. The amplified diff confirms clean single-outline text throughout
  the sheet (no ghosting/doubling), only the lipstick photo shows the
  same known double-silhouette offset as #16.
