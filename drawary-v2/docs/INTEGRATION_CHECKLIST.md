# V2 implementation checklist

## V2 milestone progress (2026-10-15)
- [x] V2-06: 294 approved WebP assets imported and exact original tree verified.
- [x] V2-07: screen 47 standalone HTML/CSS and Chromium render explicitly confirmed by user (global font harmonization deferred). React integration pending.
- [x] V2-08: approved V4 shared navbar, responsive shell, and tab/subflow routing scaffold committed. GitHub Actions TypeScript/Vite build **success**; Chromium fixture passed four viewports. Actual locked screen bodies still pending.
- [x] V2-09-01: #01 splash — React-integrated AND compiled-browser-QA-verified (0.0 diff / 100% identical, 3 viewports). See `docs/V2_09_01_SPLASH_QA.md`.
- [x] V2-09-02: #02 onboarding — React-integrated AND compiled-browser-QA-verified (8/8 slides, nav/skip/start/swipe all exercised). See `docs/V2_09_02_ONBOARDING_QA.md`. One doc-vs-code discrepancy flagged (keyboard nav claimed in archive docs, absent from the confirmed TSX) — not invented, reported as an open question.
- [x] V2-09-03/04: #03 home (filled) + #04 home (empty) — React-integrated AND compiled-browser-QA-verified, including a new `FixedCanvas` wrapper so the fixed-390px artwork scales instead of clipping at 320px. See `docs/V2_09_03_04_HOME_QA.md`. `#/home-empty` is a standalone QA route; live empty/filled switching needs the V2-12 data layer. Drawer-open/edit hotspots are intentionally inert — no destination screen exists yet.
- [ ] V2-09: screens 05–28 remaining.

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
- [ ] 05–07 Search and statistics
- [ ] 08–19 Drawer creation, field editing, item details and photos
- [ ] 20–28 Table, sorting, filtering and drawer management
- [ ] 29–37 Notifications and recurrence
- [ ] 38–44 Settings, security, lock, theme, data hub
- [ ] 45–53 Backup, restore and reset (47 standalone code user-approved, React integration incomplete)
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
