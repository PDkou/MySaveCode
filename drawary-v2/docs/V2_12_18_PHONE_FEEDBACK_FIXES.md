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

## 6. Wide windows: two columns (landscape tablets, unfolded foldables) — PREVIEW, awaiting owner approval

Why: section 5 left landscape tablets with one fitted phone screen and empty sides. The owner asked for a real wide layout.

What it is (no approved screen is redrawn):
- A window at least 600 dp on the short side, at least 884 dp wide and at least 1.2 times wider than tall (`isWideWindow`) shows two phone-width (430) columns with a thin divider.
- Left column = the tab the person is on (home / search / stats / settings) with the approved bottom nav, exactly as on a phone.
- Right column = whatever they opened from it (drawer, item, theme settings, ...). With nothing open it shows one quiet hint line (new text, KR/JA/EN: "왼쪽에서 고르면 여기에 열려요.").
- Splash, onboarding, PIN screens and the backup/restore progress screens stay full width.
- The two columns are magnified as one piece on big tablets (`WIDE_CONTENT_WIDTH` = 884), same as section 5.
- Phones, portrait tablets and near-square windows are unchanged (still one column). `App.tsx` now picks screens through `renderRoute(route)`; with one column it returns exactly what it returned before.

Preview images: `docs/preview/wide/` (Chromium 1280×800 and 1920×1200, sample data).
Not decided / not verified: the hint line and divider are my additions (not from an approved design); the bottom nav keeps its white band, which shows as a pale strip against the cream background; nothing here was run on a real tablet.
