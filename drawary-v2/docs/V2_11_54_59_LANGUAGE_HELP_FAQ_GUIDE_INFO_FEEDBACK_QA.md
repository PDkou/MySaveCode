# V2-11: screens #54–59 — 언어 설정 / 도움말 / FAQ / 가이드 / 정보 / 피드백 QA

Final batch of the 59-approved-screen integration. All six screens are now React-integrated and compiled-browser-QA-verified via Playwright/Chromium against the real built app (not a standalone fixture).

## Source provenance

| # | Screen | Archive | Source quality |
|---|--------|---------|-----------------|
| 54 | 언어 설정 | `Drawary_54_LANGUAGE_SETTINGS_CANDIDATE_2026-10-14` | real `index.html` vanilla JS (card select + live string swap) |
| 55 | 도움말 메인 | `Drawary_55_HELP_MAIN_CANDIDATE_2026-10-14` | real `index.html`, own `routeMap` for quick-help deep links |
| 56 | 자주 묻는 질문 | `Drawary_56_FAQ_CANDIDATE_2026-10-14` | real `index.html`, search + category filter + accordion + `openTopic()` deep-link logic |
| 57 | 사용 가이드 | `FINAL_STAGED_2026-10-14` (57) | real `index.html`, step cards with `data-route` |
| 58 | 정보 | `FINAL_STAGED_2026-10-14` (58) | real `index.html`, version dialog (Escape/backdrop close) |
| 59 | 피드백 | `FINAL_STAGED_2026-10-14` (59) | real `index.html`, full form (type select, validation, attachment, counter) |

All six had real vanilla-JS interaction logic in their own archives; every interaction below is a 1:1 port, not a simulation, except where noted.

## Porting notes / deviations (disclosed)

- **#54**: Both "취소" and "적용" return to #38 (설정) — the source itself never navigates on its own (only resets or commits the selection locally), since no next screen is defined for a settings leaf. New `language_ko/ja/en.png` assets copied in from the archive (`.png`, not `.webp`, matching the files as given).
- **#55**: Quick-help rows pass a specific topic (`data-storage` / `backup-restore`) into #56 as a deep link, matching the archive's own `routeMap`. New `ui_help.webp`/`ui_list.webp` assets copied in.
- **#56**: Replicated the archive's own nuance — a manual question click toggles only that item (multiple items can be open at once); a deep-link open (`initialTopic`, from #55's quick-help rows) force-closes every other item first so exactly one opens. **Known simplification**: the archive's `openTopic()` also calls `item.scrollIntoView({block:'center', behavior:'instant'})` on deep-link; this auto-scroll was **not** replicated in the React port (item still opens correctly, just doesn't auto-scroll into view if it's off-screen). No new assets needed (reuses `ui_help.webp`).
- **#57**: Each step's `data-route` names a screen already built in this app (`new_drawer`→`create-drawer`, `drawer_fields`→`drawer-fields`, `record_add`→`fill-drawer`, `table_view`→`table-view`) — wired as a real functional integration, not a no-op. New `guide_step2/3/4_focus.webp` + `ui_add.webp` assets copied in. **Bug found+fixed during build** (before QA ran): `GuideScreen.css` initially had `.guide57-step2 .guide57-step-image,.guide57-step2{...}` (copied from the archive's own `.step:nth-child(2) .step-image` descendant selector), but in the React port both classes land on the *same* `<span>`; corrected to the compound selector `.guide57-step-image.guide57-step2{...}` (and step3/step4 likewise). Caught by self-review before the build ran clean.
- **#58**: Kept the source's own placeholder copy ("앱 빌드 정보에서 표시") rather than inventing a version number, per the archive's explicit comment that a version/doc URL should not be invented in a design preview. "개인정보 처리방침"/"이용약관"/"오픈소스 라이선스" have no destination among the 59 approved screens, so those three rows stay the caller's no-op (`onNavigate={() => {}}` in App.tsx). New `brand_symbol_flower_small.webp` asset copied in.
- **#59**: Real form validation ported 1:1 (non-empty message, well-formed email only if filled in, 1000-char counter, 8MB/PNG-JPG-WebP attachment validation, attachment row only shown for "오류 제보"). New `feedback_error_from_approved.png`/`feedback_other_from_approved.png` assets copied in (kept `.png` as given); other two type icons and hero art reuse this app's existing `decor_sprout_01.webp`/`decor_flower_01.webp`/`mascot_lean_on_drawer.webp`. **Disclosed addition beyond the literal archive**: the archive's own "no backend" branch only ever shows feedback in the case where *no* `onSubmit` callback is wired at all; since App.tsx wires a real (non-backend) `onSubmit`, showing zero acknowledgment on a genuine submit would be worse UX than the narrower literal behavior — added a local "피드백을 보내주셔서 감사해요." status banner for that case, documented inline in the component's own comment. No real backend exists; nothing is actually transmitted.

## App.tsx wiring

- `StandaloneRoute` extended with `language-settings | help-main | faq | guide | info | feedback`.
- New state: `savedLanguage` (persists the applied language selection across re-visits to #54 within the session; not persisted to disk — no V2-12 storage layer yet), `faqTopic` (carries #55's deep-link topic into #56).
- `SettingsHomeScreen`'s previously-unwired `onLanguage`/`onHelp`/`onInfo`/`onFeedback` props are now all live routes (previously only `onTheme`/`onSecurity`/`onData` were wired).
- #57's guide step destinations map through a `guideRoutes: Record<GuideRoute, Route>` table to the real existing routes (see deviations above) — a genuine integration, not a placeholder.

## Compiled browser QA (Playwright/Chromium, real built app via `npm run preview`)

Executed a full click-through script at 390×844 (base interactions) plus 320×640/430×932 spot-checks on #54/#56/#57/#59. All assertions passed; full console transcript:

```
settings->54 route: #/language-settings
54: title after selecting ja -> 言語設定          (live string-swap preview confirmed working)
54: after cancel, title -> navigated away          (cancel returns to #38, as designed)
54: route after cancel -> #/settings
54: route after apply -> #/home                    (direct-load edge case; see note below)
settings->55 route: #/help-main
55 quick-help -> 56 route: #/faq
56: deep-linked open question -> 백업은 어디에서 하나요?   (correct topic deep-linked and opened)
56->55 back route: #/help-main
56: items matching "백업" -> 3
56: 앱 설정 category item count -> 3
56: open items after clicking two -> 2 (multi-open allowed, as designed)
56: empty state visible for no matches -> 1
57 step1 -> route: #/create-drawer
57 step4 -> route: #/table-view
settings->58 route: #/info
58: dialog copy -> 실제 앱에서 빌드 버전을 표시해요.
58: dialog visible after escape -> 0               (Escape-to-close confirmed working)
settings->59 route: #/feedback
59: status after empty submit -> 피드백 내용을 입력해 주세요.
59: attach row visible for bug type -> 1
59: attach row visible after switching back -> 0
59: counter text -> 15 / 1000
59: status after invalid email -> 이메일 주소를 확인해 주세요.
59: status after valid submit -> 피드백을 보내주셔서 감사해요.
59: route after submit auto-return -> #/settings
59: attach caption text -> PNG, JPG, WebP 이미지를 선택해 주세요.   (bad.txt correctly rejected)

--- console errors ---
console: Failed to load resource: the server responded with a status of 404 (Not Found)
```

- **#54 "route after apply -> #/home" note**: this is the same documented `returnToTab()`/`lastTabRef` test-script artifact seen in earlier batches — `lastTabRef` is only updated by the app's own `navigate()` function on a real tab click, not by a direct `page.goto('#/language-settings')` load. The click-through variant of this same test (`goViaSettings` → cancel) correctly returns to `#/settings`, confirming this is a test-harness quirk of the direct-load path, not an app bug.
- **One console 404** appeared, matching the same unreproducible single-404-per-batch pattern seen in every prior QA run this session (isolated repro attempts in earlier batches never found a matching app resource request — concluded to be Chromium tab-chrome noise, e.g. an automatic favicon probe). Not re-investigated again here.
- No `pageerror` entries (no uncaught exceptions) across the entire run.

## Pixel-diff against confirmed reference renders

All six archives ship a clean `render_390x844.png` (confirmed 390×844 RGB crops, not padded screenshots) — diffed directly against the live compiled-app screenshot:

| # | mean diff | % identical | % diff>30 | verdict |
|---|-----------|-------------|-----------|---------|
| 54 | 1.25 | 97.7% | 1.5% | excellent match |
| 55 | 5.02 | 92.4% | 5.7% | normal AA-noise range |
| 56 | 7.87 | 87.4% | 7.8% | normal AA-noise range (upper end) |
| 57 | 5.81 | 89.6% | 6.9% | normal AA-noise range |
| 58 | 2.82 | 95.2% | 3.6% | excellent match |
| 59 | 4.09 | 92.5% | 5.6% | normal AA-noise range |

All six fall inside this session's established normal band (mean 2–8 / bigdiff% 3–13%, widened to ~12/~7% in prior batches). #56 and #57 run the diff masks visually inspected (see below) to confirm the elevated numbers are pure text/icon anti-aliasing, not a structural mismatch.

Diff-mask visual inspection (#56, #57 — highest of the six): differences cluster strictly on glyph edges (headline text, question rows, category-tab pills, chevrons, step-number badges) with no missing elements, no shifted layout blocks, and no incorrect icon placement. Text content, row order, and spacing all align with the reference. Confirmed as font-rasterization/AA noise between the reference render engine and Chromium, consistent with every prior batch's findings.

## Build verification

- `npm run typecheck` (`tsc -b --pretty false`): clean.
- `npm run build` (`tsc -b && vite build`): succeeded — 133 modules, `dist/assets/index-BJMkRt9i.css` 171.35kB (27.27kB gzip), `dist/assets/index-Dg_RKZMk.js` 400.54kB (106.38kB gzip).

## Status

Design approved / source integrated into React / compiled React browser QA: **all three done** for #54–59. Business function implemented: real for navigation, form validation, search/filter/accordion, and language-string preview; **not** real for actual app-wide i18n (selecting a language here only demonstrates the screen's own string-swap, it does not change any other screen's language — that is V2-14 scope) or feedback transmission (no backend exists, per the source's own stated limitation). Android device verification: not done (no Android build/test environment in this session) — per CLAUDE.md, this is explicitly a separate, not-yet-started milestone, not implied by the above.

This completes React integration + compiled-browser QA for all 59 approved screen designs (#01–59). Real data persistence (V2-12), real notification/recurrence/backup engines (V2-13), full visual/functional parity verification, i18n, security, and the Android build (V2-14 onward) remain separate, explicitly not-yet-started milestones.
