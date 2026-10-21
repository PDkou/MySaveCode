# V2-12-18 Fixes after the first phone test (2026-10-20)

Reported by the owner: (1) Korean left in other languages, (2) the phone's back button, (3) odd focus on some fields.

## 1. Korean left after switching language
Crawled every screen (and the screens reached by tapping, 26–50 states) in English and Japanese, and also switched ko → en at
runtime; collected every visible text, `aria-label`, `placeholder`, `alt`, `title`. Remaining Korean in the web app:
the language picker's own preview (by design: choosing a card previews that language) and screen-reader texts of that screen (fixed:
`alt`/`aria-label` now follow the chosen language) and the developer-only demo route `#/field-edit` without a selected field.
Found and fixed on the Android side (the phone's language, not the app's, was used): dialog buttons of `confirm()` (확인/취소),
fingerprint window, reminder channel name, mail subject, print job name, and the **WebView's own language** (date picker, number
format). Now `DrawaryNative.setLanguage` sends the app language; the shell uses it for its texts and re-creates the window once
when it changes (the process locale is set before the WebView starts). Still the phone's language (cannot be changed by an app):
the launcher name under the icon, the notification-permission and file-chooser system windows, the keyboard.
If Korean shows somewhere else, send the screen name and I will trace it.

## 2. Phone back button
`window.__drawaryBack()` (App.tsx `hardwareBack`) is asked first by the shell: it closes an open dialog / pop-up menu / PIN gate,
else does what that screen's own back arrow does (full route map), goes to Home from the other tabs, steps back one onboarding
slide, ignores the restore while it writes, and returns false on Home / lock screen so the shell sends the app to the background.
Before, it walked the WebView's history (every tab switch and "back" arrow had added entries).

## 3. Field focus
Cause: four screens' unscoped `button/input:focus-visible` rules leaked app-wide (a square ring inside rounded boxes) while fields
inside clipped boxes (date, number, notes, search) showed no focus at all, and item edit had none. Now: those rules are scoped; one
zero-specificity baseline ring (`:where`) for fields that draw nothing; boxes with a bare input inside (search, FAQ search, filter /
sort search, field name and option rows, item form date/number/notes) take the ring themselves — violet border + soft halo, the same
look everywhere. The item form's star / on-off / select controls had no styling at all (browser defaults); styled to match
(no approved design exists for these three).

## 4. Landscape, short screens, foldables (found by testing sizes, 2026-10-21)
Tested 844×390 (landscape), 393×780 and 360×640 (phone minus its bars), 345×882 (fold cover), 690×829 (fold inner), tablets.
**Real bug:** whole screens are 844 px tall designs; whenever the window was shorter (landscape, or a phone's window after the
status/navigation bars) the bottom buttons (save, next, send, the PIN keypad's last row) were cut off and nothing scrolled, so e.g.
the PIN could not be typed in landscape. Now: the app shell scrolls when a screen is taller than the window (landscape), and in
portrait a full screen scales down proportionally to fit the height (never below 0.6; not while a text field has the keyboard
open). At 390×844 nothing changes (58 captured screens pixel-identical before/after). Wide windows: see §5.

## 5. Tablets (2026-10-21)
`AppScaler` (src/components/AppScaler.tsx): on a window whose shorter side is >= 600 dp (Android's tablet line) the app is laid out
exactly as on a phone and magnified **as one piece** with a transform (wrapper = window / scale), so every approved screen, the bottom nav
and the sheets keep their proportions: portrait tablets get scale min(width/430, height/844), at most 2 (800×1280 → 1.52, 834×1194 → 1.41).
Phones get no wrapper at all (58 screens at 390×844 compared before/after: identical). Landscape tablets and near-square foldables
(1280×800, 690×829) are limited by height: the whole 844 px screen is fitted to the height (≈0.95–0.98) and centred — nothing is cut
or needs scrolling, but there are wide empty sides; a real wide layout (two panes) needs designs from the owner. Pointer maths that
moves things by pixels divides by the scale (photo pan; the home reorder already measured its own scale). Keyboard open: the scale is
frozen so the screen does not jump. Tested in Chromium only (hit-testing and clicks work under the transform); real tablet: not tested.

## 6. Landscape layouts (landscape phones, landscape tablets, unfolded foldables) — layout approved by the owner in chat; real-device check pending

Why: section 5 left landscape windows with one fitted phone screen. The owner asked for a real wide layout and supplied three
reference proposals (home, drawer list, table view; non-final, not approved sources). This is my reading of them.

Window classes (`src/components/appScale.ts`, `layoutKindFor`):
- `single` — phones in portrait, portrait tablets, near-square windows: unchanged (48 captures at 390x844, 320x640, 430x932 and 800x1280 are pixel-identical to the previous build apart from sub-threshold render noise).
- `land` — a phone turned sideways (short side < 600 dp, width >= 640): no sidebar.
- `wide` — a tablet / unfolded foldable in landscape (short side >= 600 dp, width >= 800 dp, width >= 1.15 x height): sidebar layouts, magnified as one piece from 800 dp wide / 844 dp tall like section 5.

What each class gets (home, drawer #15 and table #20 only; every other screen keeps its phone screen, in `wide` next to the tab screen as in the first preview):
- Home: the approved drawer cards (same 165 x 158 card, art and colours) in as many columns as fit. `wide` adds a drawer sidebar (every drawer with its count, "모든 서랍"; no "새 서랍 만들기" button there - the nav's + does that); `land` puts the brand and counts in the top row and shrinks the grid to 80%.
- Drawer (wide): the item pane has "수정하기" and "삭제하기" buttons side by side (no second "•••" menu; the drawer's own "•••" stays by the search box). Left column = back arrow, drawer name and count, 카드 보기 / 표 보기, filter chips. Right = search + "•••" (표로 보기 / 서랍 관리, as in #15). `wide`: list (#15's own row design) beside the chosen item (#16's content, embedded); `land`: grid of item cards, tapping one opens #16 as on a phone.
- Table: the approved table fills the window; `wide` adds the same drawer sidebar (switching drawer keeps the table open). Sort / filter sheets are the approved ones.
- The approved bottom nav stays at the bottom (390 artwork centered); in these three screens it is shown on a landscape window although on phones it is hidden there (the proposals show it).

Decisions taken as recommended and approved by the owner in chat: filter chips come from the drawer's first select field (none when it has none; the "전체" chip clears); no gear icon in the header (settings is a tab), no card/list toggle on the home (no list design exists), no "칼럼 설정" button (no such feature).

Added by me, not from an approved design: sidebar, chip column, 카드 보기 / 표 보기 switch, item card for `land`, the hint texts (new KR/JA/EN strings), the divider lines, spacing and sizes.
Preview images: `docs/preview/wide/` (Chromium; sample data; 1280x800, 1920x1200, 844x390 landscape phone, 837x697 foldable).
Not verified: real devices; `land` is cramped (the approved nav alone is 94 of ~390 px), so the lists scroll.

### 6.1 Tab screens: search, stats, settings (added after the home / drawer / table were approved) — PREVIEW, awaiting owner approval

The first audit of all screens in landscape found only those three had their own layout. Added (same approved pieces, nothing redrawn):
- Stats (`wide` and `land`): the approved cards in two columns (KPI cards across the top, chart and upcoming events side by side, per-drawer insights below in two columns).
- Search (`wide`): the approved search screen as a 430 column on the left; the chosen result opens beside it as the item pane (same "수정하기" / "삭제하기" as the drawer view).
- Settings (`wide` and `land`): the seven approved rows (same icons, titles, texts) as a grid of cards that fills the window (3 columns on a tablet, 2 on a landscape phone); nothing is open at first. In `wide`, a card opens that settings screen magnified (up to 1.35x, one piece, `PaneMagnifier`) and centered, The seven first-level screens (theme, security, data management, language, help, info, feedback) are re-arranged for the wide page with CSS only (`wide/wideSettings.css`, scoped under `.wide-sd`): hero across, option rows / cards in columns (3 cards for security, data and language, 5 theme styles in a row, 2 columns for help and info, 4 feedback kinds in a row). Their texts, icons, colours and behaviour are unchanged. The screens they lead to (lock > PIN, backup / restore / reset, FAQ / guide, ...) open magnified in one centered column. The screens keep their own back arrow, which now simply leads back (finally to the grid). On a landscape phone the opened screens stay phone screens.
- Also fixed: the two-pane fallback overflowed sideways on 837 dp-wide windows (panes now shrink).
Preview images: `docs/preview/wide/*_s*_*.png`. Not verified: real devices. Every other screen (forms and flows) still shows as the phone screen: beside the home list in `wide`, as a centered column in `land`.
