# V2-09-05 / V2-09-38 — resolution-doc fixes, closed 2026-10-15

Applies `DRAWARY_CLAUDE_ISSUES_RESOLUTION_2026-10-15.md`'s per-screen rulings.
Status vocabulary below follows that doc's forced definitions
(`DESIGN_LOCKED`, `SOURCE_CANDIDATE_PARITY_REQUIRED`, etc.).

## #02 온보딩 — keyboard bug fixed

Resolution doc: register the missing arrow-key handler as a real bug and
either implement+test it, or correct the spec. Implemented: `OnboardingScreen.tsx`
now has a `keydown` listener (`ArrowLeft`→prev, `ArrowRight`→next), reusing the
exact same bounds-safe `prev`/`next` the buttons and swipe gesture already use —
no new navigation semantics. QA: `ArrowRight` ×2 from slide 1 lands on slide 3
(dot index 2); one `ArrowLeft` back lands on slide 2 (dot index 1). Status:
`SOURCE_EXACT_VERIFIED` (the gap was in the shipped code, not the design).

## #05 글로벌 검색 — `SOURCE_CANDIDATE_PARITY_REQUIRED` → body integrated, footer unified

- Body (header/search box/result cards/both empty states) ported from
  `GlobalSearch_NEW_CANDIDATE.tsx` into `src/screens/GlobalSearchScreen.tsx` +
  `.css`, values taken from the candidate's own standalone `index.html`
  `<style>` block.
- Footer: the candidate ships **two different** self-drawn footers (a plain
  CSS-grid `<nav>` in the TSX; a baked-image `.exact-footer` with V4-matching
  hotspot x/width values in the sibling `index.html`) — neither is used.
  Per the resolution doc, both are ignored and the screen renders no footer
  at all; `App.tsx` supplies the one real, already-approved
  `ResponsiveBottomNav` (V4) externally, same pattern as #03/#04 home.
- No real drawer/item data layer exists yet (V2-12). `src/mockData.ts` holds
  5 sample records (reusing #03 Home's own confirmed drawer names) so the
  actual filtering/rendering logic runs against real component code instead
  of waiting on the data layer — explicitly labeled as temporary, not
  confirmed product content.
- **Bug found during QA (not present in the candidate's own narrower manual
  testing)**: Chromium renders a native clear icon for `type="search"` once
  a value is set, stacking a second "×" next to this screen's own custom
  clear button. Fixed by suppressing `::-webkit-search-cancel-button` /
  `-webkit-search-decoration` — the custom button already covers that job.

### QA — compiled React browser, 390×844 / 320×640 / 430×932
- `npm run build`/`typecheck`: 0 errors.
- Typing "틴트" → 2 result cards (both 화장품 tint items); clearing to a
  non-matching query → "검색 결과가 없어요" empty state; no query → the
  "찾고 싶은 보관품이 있나요?" prompt state. All three visually match the
  candidate's own styling exactly.
- Exactly one `.drawary-dynamic-bottom-nav` element renders on the page —
  confirms no duplicate footer from the dropped candidate nav markup.
- 320×640 / 430×932: `FixedCanvas` keeps the fixed-width body scaling
  correctly, no clipping, consistent with Home/Settings.
- Zero console/page errors after the clear-icon fix.
- **Status: React-integrated AND compiled-browser-QA-verified** for the body;
  `onOpenRecord` is an intentional no-op (no drawer/item detail screen exists
  yet) and the record data is mock, pending V2-12.

## #38 설정 홈 — `SOURCE_CANDIDATE_PARITY_REQUIRED` → body integrated, footer unified

- Body (header/hero/7-row list) ported from the V22 candidate's
  `SettingsHome.tsx` into `src/screens/SettingsHomeScreen.tsx` + `.css`. One
  adaptation: the candidate's header reserved a 44px column for a back
  button; Settings is a root bottom-nav tab here (same as Home/Search,
  neither of which has a back button either), so that column and button are
  dropped and the title is centered in the remaining space. Every other
  value (colors, row height, icon box size, spacing) is unchanged.
- Footer: the candidate's own `SettingsHome.tsx` **embeds its own copy** of
  `BottomNavFinalConfirmed`/`bottom-nav-final.css`, and its README claims
  these are byte-identical to the approved shared nav. A direct `diff`
  against this repo's already-integrated component (present since V2-08,
  before this screen was touched) shows they are **two different
  lineages**, not a byte match:
  - Candidate's bundled copy: class prefix `drawary-confirmed-bottom-nav`,
    base artwork `footer_neutral.webp`, per-tab active-label drawn as a
    raster image (`active_*_overlay.png`) clipped over the neutral artwork.
    README traces it to `Drawary_CONFIRMED_SHARED_BOTTOM_NAV_2026-10-09.zip`.
  - This repo's component: class prefix `drawary-dynamic-bottom-nav`, base
    artwork `footer_background_plus_only.webp`, active label drawn as live
    DOM text with a color class. Traces to
    `Drawary_CONFIRMED_SHARED_BOTTOM_NAV_V4_DYNAMIC_2026-10-13.zip` — dated
    later, and the one `CLAUDE.md` rule 6 names explicitly as "V4...
    already built... never redesign."
  - Per the resolution doc's own source-priority order (GitHub V2's confirmed
    shared V4 navbar outranks an older per-screen candidate's bundled copy),
    kept this repo's V4 component and did not import the candidate's copy.
    `SettingsHomeScreen` renders no nav of its own; `App.tsx` supplies the
    real `ResponsiveBottomNav` externally, same as #03/#04/#05 — this is
    also how the resolution doc's "중복 하단바 제거" instruction is satisfied,
    since there was never a second one rendered.

### QA — compiled React browser, 390×844 / 320×640 / 430×932
- `npm run build`/`typecheck`: 0 errors.
- All 7 rows render (테마/보안/데이터/언어/도움말/정보/피드백); exactly one
  `.drawary-dynamic-bottom-nav` element on the page.
- 320×640 / 430×932 via `FixedCanvas`: no clipping.
- Zero console/page errors.
- **Status: React-integrated AND compiled-browser-QA-verified** for the body
  and the (unified) footer. Row targets (#39/#40/#44/#54/#55/#58/#59) are
  intentional no-ops — none of those screens are integrated yet.

## #06 홈 편집 모드 — not started this batch

`SOURCE_CANDIDATE_PARITY_REQUIRED`: code is V3, the bundled comparison image
is a later V14. Per the resolution doc, V14 is the visual reference and V3
code is only a starting point — this needs the V14 image pulled up and
diffed against a V3 render before any code changes, which hasn't been done
yet. Left for the next batch rather than guessed at.

## #07/#08 — feasibility only, not started this batch

Per the resolution doc, these move from "blocked" to
`SOURCE_REFERENCE_IMAGE_ONLY`: reproducing the approved PNGs as real DOM/CSS/
React is explicitly permitted now, labeled as reconstructed code (not
"recovered original"). Feasibility: both PNGs are static 390-wide full-screen
renders with clearly legible text/layout, the same kind of source this
session already reverse-engineered successfully for #03/#04's hotspot
coordinates and for the bottom-nav pixel math earlier in the project — so
starting is realistic. Undetermined before starting:
- Exact interactive regions/targets (#07 통계 and #08 새 서랍 만들기 have
  no hotspot coordinates anywhere, unlike #03/#04's confirmed TSX) — will
  need to be inferred from the image's own visual affordances (buttons,
  input-looking fields) and flagged per-element as "assumed, not specified"
  rather than asserted as confirmed.
- Whether #08 needs live data (e.g., field-type picker state) that has no
  confirmed interaction spec at all, only a single static frame.
Not implemented yet this batch — queued for next.

## #47 — still blocked

`ASSET_BLOCKED`, unchanged: `assets/approved_character_cutout.png`
(570×434, SHA-256 `cab7be0d...`) is still not present in any delivered
archive. Not substituting; no other action taken this batch.
