# V2 implementation checklist

## V2 milestone progress (2026-10-15)
- [x] V2-06: 294 approved WebP assets imported and exact original tree verified.
- [x] V2-07: screen 47 standalone HTML/CSS and Chromium render explicitly confirmed by user (global font harmonization deferred). React integration pending.
- [x] V2-08: approved V4 shared navbar, responsive shell, and tab/subflow routing scaffold committed. GitHub Actions TypeScript/Vite build **success**; Chromium fixture passed four viewports. Actual locked screen bodies still pending.
- [x] V2-09-01: #01 splash — React-integrated AND compiled-browser-QA-verified (0.0 diff / 100% identical, 3 viewports). See `docs/V2_09_01_SPLASH_QA.md`.
- [x] V2-09-02: #02 onboarding — React-integrated AND compiled-browser-QA-verified (8/8 slides, nav/skip/start/swipe all exercised). See `docs/V2_09_02_ONBOARDING_QA.md`. One doc-vs-code discrepancy flagged (keyboard nav claimed in archive docs, absent from the confirmed TSX) — not invented, reported as an open question.
- [x] V2-09-03/04: #03 home (filled) + #04 home (empty) — React-integrated AND compiled-browser-QA-verified, including a new `FixedCanvas` wrapper so the fixed-390px artwork scales instead of clipping at 320px. See `docs/V2_09_03_04_HOME_QA.md`. `#/home-empty` is a standalone QA route; live empty/filled switching needs the V2-12 data layer. Drawer-open/edit hotspots are intentionally inert — no destination screen exists yet.
- [x] V2-09-05: #05 global search — body integrated (candidate's own footer ignored, real V4 nav used instead), mock records pending V2-12, a real native-vs-custom clear-icon bug found+fixed. See `docs/V2_09_05_06_38_RESOLUTION_QA.md`.
- [x] V2-09-38: #38 settings home — body integrated; found the candidate's bundled "confirmed" nav is a different, older lineage than this repo's real V4 component and kept the real one. See same doc.
- [x] V2-09-06: #06 home edit mode — React-integrated as `HomeEditScreen` at `#/home-edit`, reachable from #03's "편집" hotspot. The "완료" control went through two revisions same day (V14's pill, then a newer user re-approval removing the pill and right-aligning plain text on the "내 서랍" row) — implemented against the latest. Reorder icon reconstructed as inline SVG (no matching approved asset exists); delete icon uses the real approved `icon_delete.webp`. See `docs/V2_09_06_HOME_EDIT_QA.md`.
- [x] V2-09-07: #07 통계 — no approved source exists (`NO_FINAL_CODE_IMAGE_ONLY`); reconstructed as real React/CSS from the two approved reference renders and wired as the real `#/stats` tab body. Colors sampled directly from the references; brand header reuses the real approved `brand_lockup_horizontal.webp`. See `docs/V2_09_07_STATS_QA.md`.
- [x] V2-09-08: #08 새 서랍 만들기 — no approved source exists (`NO_FINAL_CODE_IMAGE_ONLY`); reconstructed as a bottom sheet (name/icon/color) over a dimmed Home, reusing #11's modal-sheet convention. **Navigation restructure**: this is the real first step of the create-drawer flow, which previously skipped straight to #09 -- every existing "+" entry point now correctly lands here first via the same `navigate('create-drawer')` call, and #09 moved to its own `#/drawer-fields` route. See `docs/V2_09_08_NEW_DRAWER_QA.md`.
- [x] V2-09-09: #09 서랍 칸 정하기 — React-integrated AND compiled-browser-QA-verified, now wired as `#/drawer-fields`, reached only after #08. See `docs/V2_09_09_FIELD_SETUP_QA.md` (route name updated since that doc was written).
- [x] V2-09-10/11/12: #10 새 서랍 칸 추가, #11 서랍 칸 수정 (list view reconstructed from its own CSS after finding the bundled TSX was stale), #12 생성 완료 — all React-integrated, compiled-browser-QA-verified, and chained from #09's buttons (navigation only, no shared data model yet). See `docs/V2_09_10_11_12_QA.md`.
- [x] V2-09-13: #13 서랍 채우기 — React-integrated, compiled-browser-QA-verified, chained from #12. Also closes the loop on #09–#13 all being pixel-diffed against their own confirmed render PNGs (not just eyeballed), catching and fixing one test-script mistake (#10B compared against the wrong field-type state) and independently validating #11A's reconstructed list view against a real confirmed reference. See `docs/V2_09_13_FILL_DRAWER_QA.md`.
- [x] V2-09-14: #14 사진 선택/등록 상태 — not a separate screen: per its own CONFIRMED.md, it's #13's registered-photo state. Merged into the existing `FillDrawerScreen` as a conditional branch (photo card/remove/count/thumbnails) rather than a parallel duplicate. `onAddPhoto` now adds a copied QA fixture photo to local state so the registered state is reachable without a real Android Photo Picker. Pixel-diffed against its own confirmed render (mean 4.07 / 89.2% identical / 5.8% diff>30). See `docs/V2_09_14_PHOTO_STATE_QA.md`.
- [x] V2-09-15: #15 서랍 상세/보관품 목록 — React-integrated AND compiled-browser-QA-verified, wired as `#/drawer-detail` reachable from #03's 5 drawer-card hotspots (previously all no-ops). Found+fixed a real clipping bug (missing `FixedCanvas` wrapper broke it at 320px). Pixel-diffed against both confirmed renders (main: mean 2.63/94.7%/3.3%; menu-open: mean 2.84/94.4%/3.6% -- among the closest matches this session). See `docs/V2_09_15_DRAWER_DETAIL_QA.md`.
- [x] V2-09-16: #16 보관품 상세 — React-integrated AND compiled-browser-QA-verified, wired as `#/record-detail` reachable from #15's record rows (previously a no-op). Found+fixed a mislabeled archive fixture (a screenshot-crop artifact, not a clean photo) and substituted #14's correct matching photo instead. Pixel-diff elevated only in the photo region (same photo, slightly different crop/zoom than the reference's source); everything else (text/icons/layout) is normal AA-noise range. See `docs/V2_09_16_RECORD_DETAIL_QA.md`.
- [x] V2-07/09-47: #47 backup progress — the long-standing `ASSET_BLOCKED` on the approved mascot binary is resolved: the user pushed `mascot_backup_progress.webp` directly to GitHub (commit `7f5574e`, verified via `git fetch`/`git log`, merged into this branch with no conflicts). React-integrated as `BackupProgressScreen` at `#/backup-progress`, compiled-browser-QA-verified at 3 viewports, pixel-diffed against the confirmed comparison package's `code_render_390x844.png` (mean diff 6.86 / 85.3% identical / 9.6% diff>30 — normal AA-noise range). See updated `docs/V2_07_SCREEN47_QA.md`.
- [ ] V2-09: screens 14–28 remaining.

## Baseline & safety
- [x] New branch `drawary/59-design-rebuild-20261014` created.
- [x] Preserve `category-data-app/`, `drawary-app/` and other projects.
- [x] User-approved visual inventory: 59 screens.
- [x] Initial React/TypeScript/Vite scaffold committed.
- [ ] Import exact approved screen code, images, fonts and WebP assets into V2.
- [ ] Verify the exact source file for each of the 59 screens.
- [ ] Migrate user data safely; test old JSON format.
- [ ] Establish fallback/rollback and Android package update strategy.

## Screen integration
- [x] 01 Splash — React-integrated, QA-verified
- [x] 02 Onboarding — React-integrated, QA-verified
- [x] 03 Home (filled) — React-integrated, QA-verified
- [x] 04 Home (empty) — React-integrated, QA-verified (standalone QA route, not yet the live conditional)
- [x] 05 Global search — React-integrated, QA-verified (body only; mock data pending V2-12)
- [x] 06 Home edit mode — React-integrated, QA-verified (standalone QA route + live #03 hotspot)
- [x] 07 Statistics — React-integrated, QA-verified (reconstructed from reference image, no approved source existed)
- [x] 08 새 서랍 만들기 — React-integrated, QA-verified (reconstructed; now the real first step of create-drawer, #09 moved to `#/drawer-fields`)
- [x] 09–13 서랍 칸 정하기/추가/수정/생성 완료/서랍 채우기 — all React-integrated, QA-verified (navigation only, no shared data model yet)
- [x] 14 사진 선택/등록 상태 — merged into #13's FillDrawerScreen as its registered-photo state (not a separate screen), QA-verified
- [x] 15 서랍 상세/보관품 목록 — React-integrated, QA-verified, live from #03's drawer-card hotspots
- [x] 16 보관품 상세 — React-integrated, QA-verified, live from #15's record rows
- [ ] 17–19 Item edit, delete confirm and related
- [ ] 20–28 Table, sorting, filtering and drawer management
- [ ] 29–37 Notifications and recurrence
- [ ] 38–44 Settings, security, lock, theme, data hub
- [ ] 45–53 Backup, restore and reset (47 React-integrated and QA-verified; 45/46/48–53 still incomplete)
- [ ] 54–59 Language, help, FAQ, guide, about and feedback

## Platform behavior
- [ ] Local persistence and error handling
- [ ] Android photo picker / persistable URIs / reconnect flow
- [ ] Storage Access Framework backup import/export
- [ ] Google Drive auth and file workflow (not yet implemented)
- [ ] User-choice merge/replace backup semantics and clear warnings
- [ ] OS notification scheduling & recurrence item-creation semantics
- [ ] PIN/biometrics security
- [ ] Full application navigation and responsive orientation/foldable handling (V2-08 foundation done; deep routes and device QA pending)
- [ ] KR/JP/EN text and common typography
- [ ] Feedback delivery and accurate send/cancel status
- [ ] Accessibility, state recovery, empty/error states

## Final QA
- [ ] 59-screen approved-image vs real-React-screen comparison
- [ ] Entire app punctuation / whitespace consistency sweep
- [ ] Large white outer panel usage audit
- [ ] Browser release build, Android integration, real-device QA
- [ ] Only after parity verification, discuss replacing or archiving old Drawary code
