# CLAUDE.md — Drawary V2 implementation rules (USER DESIGN LOCK)

> Last verified: 2026-10-15. This file is written as an instruction document for Claude Code working in the Drawary V2 repository. **Read it and the current repository docs before modifying any code.**

## Repo / branch / boundary

- Repo: `PDkou/MySaveCode`.
- Work on branch: `drawary/59-design-rebuild-20261014` (confirm current branch; never substitute `main`).
- Allowed application directory: `drawary-v2/`.
- Leave `category-data-app/`, `drawary-app/` and every unrelated project untouched. **These previous implementation directories are NOT sources of truth or a source to copy from.**
- Always inspect `drawary-v2/docs/SOURCE_OF_TRUTH.md`, `docs/INTEGRATION_CHECKLIST.md`, `docs/V2_06_UPLOAD_STATUS.md`, `docs/V2_07_SCREEN47_QA.md`, and `docs/V2_08_NAVIGATION_QA.md` before starting. Resolve outdated/conflicting history in favor of latest dated, verified design approvals and actual current branch state.
- Read `drawary-v2/src/App.tsx`, existing V2 components and `src/screens/` before editing. Preserve all previously validated work.

## Project

- Korean `나만의 서랍장`; English `Drawary`; Japanese `ひきだし帳`.
- Local-first drawer/table organizer. No user account, login, proprietary server or unnecessary data transfer. Google Drive is an OPTIONAL future backup destination, not the app backend.
- User-facing Korean vocabulary: `서랍` (database), `서랍 칸` (field/column), `보관품` (row/item), `서랍 채우기`, `담기`. Never casually replace with developer terms like 'DB field' or 'record' in UI.
- KR/JA/EN languages; Android first. Portrait/landscape/foldable must be accounted for.

## Nonnegotiable locked designs

1. User has ALREADY approved all **59 screen designs**. **Do not request 59 approvals again.** No redesign or unsolicited aesthetic changes. Integrating code is not approving a new design.
2. For each screen, obtain the latest specific approved image AND accompanying standalone HTML/CSS/JS/TSX export / verified approved asset pack **before implementing**. `docs/` and source-pack manifests are supporting evidence; absence of actual approved source is a **BLOCKER**, not authorization to guess.
3. Do not use old GitHub app assets, old app CSS, old splash animation, stock artwork, synthetic placeholder drawings, OS emoji or AI-generated approximations. Preserve exact approved WebP artwork. The approved screen-47 SVG+CSS rotating spinner is an explicit exception because it exists in the APPROVED source.
4. Approved style: ivory/cream and lavender, muted coral/sage/mustard/sky, rounded shapes, approved girl mascot. Colors/layout/typography/icon geometry/spacing/text are locked except where user explicitly authorized later global typography normalization.
5. Approved assets: 294 WebP files already Git-verified in `drawary-v2/public/assets/`. Archive `02A_DRAWARY_ASSETS_FINAL_STRUCTURED.zip` SHA-256 `5af682379b673eabc2847acd85e58cd15f3d17b69645c036049002a9386a1ae4`. **Do not re-import blindly**, duplicate assets unnecessarily, or replace files with lookalikes.
6. Approved V4 bottom nav already built: 390x94 artwork, tab centers x=50/121/269/341, center '+' action only, 66px active pill; scale as ONE whole unit for widths <390; center unscaled for >=390. Visible on tab screens only. Never redesign it.
7. Approved #47 backup progress: yellow-folder-holding girl, white rounded panel, purple rotating SVG/CSS spinner, exact Korean copy. Standalone approved; NOT React-integrated. Original special mascot binary is NOT yet in GitHub, and MUST NOT be substituted.
8. **Design approved / source integrated into React / compiled React browser QA / business function implemented / Android verified** are five DISTINCT status columns. Never claim completion solely from static mockup, passing build or standalone fixture.

## Verified status at handoff (2026-10-15)

- Screen designs: 59 / 59 APPROVED and frozen.
- V2-01 through V2-08: foundational milestones completed.
- V2-06: 294 original WebP imported and tree checksum validated.
- V2-07: #47 standalone animation approved; actual React integration & backup logic pending.
- V2-08: fixed approved bottom navigation and responsive routing harness, cloud TypeScript/Vite build and Chromium test fixture passed; placeholder route bodies are NOT finished screens.
- V2-09-01: **#01 splash React component and six exact image files staged and committed** in commit `3b7799c7af69264657790098f7f1ef1a012a986a`, with `#/splash` QA route. GitHub Actions build run `38669460377` SUCCESS. **Cold-start timing, onboarding transition, and compiled React runtime/browser parity QA are NOT done.** Do not redo #01 from scratch or report fully tested.
- #02–#59 approved designs generally NOT integrated into this V2 app. For #02–#04, exact user-confirmed source archives are included in this handoff package; #05–#59 need source-by-source final packages/references found and verified before implementation. `#47` has repo HTML and design lock; mascot binary must still be supplied from approved archive.
- Old Oct-13 trackers (38/44 confirmed) are outdated snapshots; do not restart design confirmation based on them.

## Roadmap and autonomous execution

- V2-09: screens **01–28** integration. V2-09-01 is partially integrated; check QA and start #02 onboarding; then #03/#04 home. Continue #05–#28 only after approved sources are available.
- V2-10: screens **29–44**; V2-11: **45–59**; V2-12 actual data storage/search/photos; V2-13 notifications/recurrence/backup/restore; V2-14 full visual and functional parity verification; then i18n, security, Android build and real-device QA.
- Internally implement in small testable batches (e.g. 02–04, 05–07, 08–12...), commit at verified checkpoints. **Do not wait for the user to type 'confirmed' after each screen.** Ask only about a genuine product decision, unresolved contradictory approved sources, or a source file that the user must provide.
- Each screen: source evidence and filename/commit recorded -> code integration into V2 -> real rendered React browser screenshot (390x844, 320x640, 430x932, plus orientation tests for relevant screens) -> visually compare to exact approved screenshot -> exercise actual interactions -> TS build/test -> document proof -> commit.
- Screenshot parity must be based on the ACTUAL compiled React app, not standalone HTML mock, if claiming React parity. Do not fabricate test output/metrics. If Playwright/Chromium is unavailable, report the limitation and leave browser QA unchecked.
- On any missing source: mark `BLOCKED_SOURCE_MISSING` in the intake tracker, list exact missing file(s), and continue with another ready screen; **never approximate the missing UI**.
- Keep work limited to this branch. No force push, no rebase/merge/delete of old directories without user authorization.
- Preserve app semantic functionality requirements: recurrence **creates new items** (does not mutate original), notifications tied to date fields and separate from recurrence, table first column sticky and horizontal scrolling, up to three fast sort/filter conditions, AND/OR labels, no photo sorting, CSV/PDF table export, Android photo URI handling, local-only data privacy and optional backup.

## Source intake and progress bookkeeping

- This handoff includes approved original archive ZIPs for #01–#04, **not all 59**. `APPROVED_SOURCE_PACKS_01_TO_04/` is review input, not code to copy wholesale. Do not import any unwanted legacy baseline bundled inside other archives. Work ONLY from explicitly approved screen code and assets.
- To locate input archive path, ask the operator to provide the absolute path to the extracted handoff folder. Read each archive's `CONFIRMED_STATUS`, `README`, latest TSX and reference browser render.
- GitHub `reference/screen-47/index.html` is a special **approved standalone source** but its exact original mascot needs additional approved archive bytes.
- Keep a per-screen table: `screen_id`, `approved_design_status`, `approved_source_path`, `React_integration_status`, `compiled_browser_QA`, `function_status`, `issue`, `commit`. Do not conflate these.
- Report each batch in Korean: screen numbers completed, commit SHAs, builds/tests actually executed, source references, blocking source files, next batch. If no source for a screen, report blocked rather than invent a completion percentage.

## Start now

1. Confirm branch HEAD and inspect the latest state; the snapshot above can become stale.
2. Review source ZIPs #02–#04, lock files and design screenshots; compare their source code with current V2 architecture and shared bottom nav before porting.
3. Resolve the missing compiled React browser QA of #01 as available, then implement #02 onboarded 8-page flow and transition behavior from approved source; integrate #03/#04 exactly into the V2 app without altering the approved footer.
4. Run real build and browser QA; commit only verified changes. Build failures and missing references must be reported explicitly.
5. Continue autonomously within available approved source packages, without per-screen user approvals. Request additional final source archives for #05 onward in BATCHES; do not infer designs from screenshot names or project history.

## Release versioning (user rule, 2026-10-22)

- Every new build that goes to Google Play gets a new version NAME as well as a higher versionCode: middle number = a new feature, last number = a bug fix or small change, first number = a major release (only the user decides that; official release is expected to be 1.0.0).
- Change the name with `node scripts/bump-version.mjs x.y.z` (updates package.json, package-lock.json, android/app/build.gradle.kts), then commit; see `docs/RELEASE_AAB.md`. Builds 1-3 were all 0.1.0 inside the app (the user typed "0.1.1" as the Play release name of build 3). Build 4 is the first to follow this rule: 0.1.2; build 5: 0.1.3; build 6: 0.1.4.
- Release notes (user rule, 2026-10-23): keep them plain and short, one or two factual sentences per language (ko-KR, en-US, ja-JP), no marketing tone. Give all three languages together in one block.
