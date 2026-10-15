# V2-10-39~44 — closed 2026-10-15

Unlike #25-37's "FINAL_CONFIRMED_CODE" archives, #39-44 are a different,
older dated batch (`*_CONFIRMED_2026-10-13`) with no CONFIRMED.md and no
separate TSX/CSS -- each screen's only real source is a single
self-contained `index.html` (real HTML/CSS/vanilla-JS, not a static
mockup). All ported into React 1:1, not simulated.

## #39 테마 설정

Ported from `Drawary_39_CONFIRMED_2026-10-13`'s `index.html`. The
vanilla JS's own click handler (toggle `aria-pressed` across the 5
theme buttons) ported to `useState`. README.md's confirmed rule
checked and matched exactly: 5 themes, no accent-color swatch, 라벤더
default, 2x2+center-card layout, 5 distinct flower WebPs.

**Asset gap filled**: the 5 `theme_flower_*.webp` files didn't exist in
this app's `public/assets/` yet. Copied from the archive into a new
`public/assets/theme/` directory (each opened and visually verified
before copying, not assumed from filenames).

## #40 보안 설정

Ported from `Drawary_40_SECURITY_CONFIRMED_2026-10-13`'s `index.html`.
README.md: 신규 승인 에셋 `icon_security_biometric.webp` (+ `_512`
downscaled variant). Both copied in; the actual `<img>` uses the `_512`
variant (49KB) rather than the full original (426KB), which is far
larger than this icon ever renders at -- the same "_512 variant for
real use, full original kept for completeness" pattern this app
already follows for `icon_app_512.webp`. "자동 잠금" reuses the
existing `icon_lock.webp` with a CSS-drawn clock overlay exactly as the
source's own comment specifies (no new art). "앱 잠금" row -> #41.

## #41 잠금 설정 상세

Ported from `Drawary_41_LOCK_DETAIL_CONFIRMED_2026-10-13`'s
`index.html`. The archive's own script comment is explicit: "Do not
turn on a lock when PIN has not yet been configured" -- `hasPin` (real
shared App.tsx state, set once #42's flow actually completes) gates the
switch for real, not just visually; added a `:disabled` dimmed style
since the archive's own CSS had no visual cue for that state. "PIN
설정 / 변경" -> #42.

## #42 PIN 설정 / 변경

Ported from `Drawary_42_PIN_SETUP_CONFIRMED_2026-10-13`'s `index.html`
-- the real new->confirm->done state machine (with mismatch recovery
back to "new") ported 1:1 as `useState`, not simulated. New
`icon_keypad_erase.webp` asset copied in from the archive.

**Gap filled, and a real bug caught+fixed during this screen's own
QA**: the archive's markup has no "다음" affordance once PIN entry is
confirmed -- it just disables the keypad and shows feedback text. Added
a `.ps42-done-confirm` "확인" button so the completed PIN can actually
be handed back to the caller. First attempt stacked this button *after*
the existing bottom-note, which pushed it below the fixed 844px panel
(`scrollHeight` 804 vs `clientHeight` 726, confirmed via
`getBoundingClientRect`) -- fixed by having the button replace the
bottom-note in the same vertical slot instead of adding to it, which
also let `.ps42-panel` go back to `overflow:hidden` (matching this
app's convention) instead of the `overflow-y:auto` band-aid from the
first attempt.

## #43 앱 잠금 화면

Ported from `Drawary_43_APP_LOCK_CONFIRMED_2026-10-13`'s `index.html`
-- the real verify/error-shake/unlock logic ported 1:1. No back button
at all, matching the source exactly (a fullscreen authentication gate
has nowhere to go back to). `correctPin` uses the real PIN #42
committed (shared App.tsx state), falling back to the archive's own
hardcoded demo PIN (`2468`) only when none has been set yet -- not
reachable from any row in this app's current flow (none of #40-#44
actually re-launches the app to trigger it, and simulating an app
restart is out of scope for a browser harness), so it's kept as a
standalone QA route, same reasoning as #01's own standalone
splash-timing route.

## #44 데이터 관리 허브

Ported from `Drawary_44_DATA_MANAGEMENT_HUB_CONFIRMED_2026-10-13`'s
`index.html`. README.md: 38/40 확정 디자인 계승, 기존 02A WebP 5개 사용
(mascot_default.webp already present), 메뉴 이동은 현재 프리뷰용
(백업→#45, 복원→#49, 초기화→#53). None of #45/#49/#53 exist yet, so
those three rows stay intentional no-ops. Back -> #38, per the
archive's own `data-back="38"`.

## Wiring into #38

`SettingsHomeScreen` already had `onTheme`/`onSecurity`/`onData` props
from an earlier batch but the `settings` tab route rendered it with no
props at all (all three silently no-op). Wired to `navigate('theme-
settings')` / `navigate('security-settings')` / `navigate('data-
management')`.

## QA

- `npm run typecheck` and `npm run build` both clean.
- Full click-through exercised end to end: #38 (clicked the real
  bottom-nav "설정" tab, not a direct URL load, so `lastTabRef` is set
  correctly) -> 테마 설정 row -> #39 (coral selected, lavender
  deselected, confirmed mutually exclusive; back correctly returns to
  `#/settings` via the real tab-click path) -> 보안 설정 row -> #40
  (toggled 생체 인증 on) -> 앱 잠금 row -> #41 (app-lock switch
  confirmed `disabled` before any PIN exists) -> PIN 설정/변경 row ->
  #42 (entered a mismatched confirm PIN first, verified it resets to
  "새 PIN 입력" with the exact feedback text; then entered a matching
  PIN 1357/1357, verified "PIN 설정 완료" + "PIN을 설정했어요." +
  confirm button all appear) -> clicked 확인 -> back on #41, switch now
  genuinely enabled (not just re-rendered) -> toggled it on -> #44
  (reached independently via #38, back returns to #38).
- #43 (standalone QA route) tested with a wrong PIN first (0000 against
  the demo PIN 2468) -> correct mismatch feedback and shake triggered;
  then the correct demo PIN -> "잠금 해제 완료" / "내 서랍을 열었어요."
  and keypad disables.
- Compiled-browser Chromium render at 390x844 for all six screens, plus
  320x640/430x932 spot-checks on #39/#42/#43/#44 -- no clipping or
  distortion.
- Pixel-diffed against confirmed renders where available: #40 mean
  8.20 / 83.3% identical / 4.1% diff>30; #42 (base "new PIN" state)
  mean 10.68 / 74.6% identical / 6.4% diff>30 -- both close to the
  normal AA-noise range. #39/#41/#43/#44 verified structurally/visually
  against their own reference PNGs by eye (all close matches); no
  numeric diff run for those since their references are the same
  "design preview" screenshots rather than a parity-tracked baseline.
- One console `404` was observed once during this batch's multi-page
  run -- same unreproducible single-occurrence pattern already
  investigated and documented in two earlier QA docs this session, not
  chased further again.
