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

### 6.1 Tab screens: search, stats, settings (added after the home / drawer / table were approved) — approved by the owner (2026-10-21); still needs browser QA on a real device

The first audit of all screens in landscape found only those three had their own layout. Added (same approved pieces, nothing redrawn):
- Stats (`wide` and `land`): the approved cards in two columns (KPI cards across the top, chart and upcoming events side by side, per-drawer insights below in two columns).
- Search (`wide`): the approved search screen as a 430 column on the left; the chosen result opens beside it as the item pane (same "수정하기" / "삭제하기" as the drawer view).
- Settings (`wide` and `land`): the seven approved rows (same icons, titles, texts) as a grid of cards that fills the window (3 columns on a tablet, 2 on a landscape phone); nothing is open at first. In `wide`, a card opens that settings screen magnified (up to 1.35x, one piece, `PaneMagnifier`) and centered, The seven first-level screens (theme, security, data management, language, help, info, feedback) are re-arranged for the wide page with CSS only (`wide/wideSettings.css`, scoped under `.wide-sd`): hero across, option rows / cards in columns (3 cards for security, data and language, 5 theme styles in a row, 2 columns for help and info, 4 feedback kinds in a row). Their texts, icons, colours and behaviour are unchanged. The screens they lead to (lock > PIN, backup / restore / reset, FAQ / guide, ...) open magnified in one centered column. The screens keep their own back arrow, which now simply leads back (finally to the grid). On a landscape phone the opened screens stay phone screens.
- Also fixed: the two-pane fallback overflowed sideways on 837 dp-wide windows (panes now shrink).
Preview images: `docs/preview/wide/*_s*_*.png`. Not verified: real devices. Every other screen (forms and flows) still shows as the phone screen: beside the home list in `wide`, as a centered column in `land`.

Later changes to the wide settings pages (owner requests in chat):
- Cards of security / data management / language fill the page height (tiles); short pages (help, info, theme) are centred.
- Theme: one large preview of the chosen theme (the approved card preview's pieces enlarged: flower, accent bar, fields, name) above the five approved cards.
- One header and one back arrow for every settings screen in wide windows (the shared ScreenHeader look: 72 px bar, centred 21 px title #1b2d65, 44 px chevron button), applied by CSS over the twelve screens that had their own header markup, and over the restore-style ScreenHeader screens (`wide/wideSettings.css`). Phone screens are unchanged.

## 7. Correction: screens that could not be scrolled to the end (found while checking the wide settings screens)

What was wrong (it affected phones too, not only the wide layouts):
- The landscape fix of section 4 was verified with `scrollIntoView`, which also scrolls `overflow:hidden` boxes, so it passed although a finger could not scroll there. In fact `FixedCanvas`'s host was a flex item that shrank to the app shell's height and clipped what was below it, with nothing to scroll: in a landscape phone the lower part of full screens (PIN keypad rows, "피드백 보내기", ...) could not be reached. Fix: the host keeps its height (`flex: none`), so the app shell scrolls.
- Fixed 844 px screens clipped long content in every orientation: "담기" in the fill form, "수정 완료" in the item editor, "완료" in the field editors, and the last items of a long drawer list (found with an 8-field / 8-item sample drawer on a 360 x 640 and a 390 x 844 phone). Fix: `FixedCanvas grow` (the screen's own height becomes a minimum) for the forms and field screens; the drawer list (#15) scrolls inside its screen so the header, search and "서랍 채우기" stay put.
- The wide settings pane's magnification no longer exceeds the pane's height (a whole phone screen has to fit).

How it was checked this time: for each screen at 844x390, 837x697, 360x640, 390x844, 1280x800 and 1920x1200, real mouse-wheel scrolling (no scripted scrolling), then whether every button / input of the screen is inside the visible area. Result: no unreachable control, except the create-drawer sheet's "다음", which scrolls inside the sheet itself (a false alarm of the check). Not yet checked on a real device.

Theme page (wide), second version: the abstract large preview was replaced by a live one (`ThemeLivePreview`): the real approved home screen (its top part) and the real approved bottom nav, drawn in the chosen theme. The theme colours and pictures are applied to just that piece through `data-preview-theme` (`scripts/make_theme_css.py` now also writes the colour blocks for `[data-preview-theme=...]`; `themedImages.ts` swaps pictures per preview). The five choices below it are compact (flower, accent bar, name). The brand logo and the drawer card artwork do not change with the theme (in the real app neither does).

Theme: logo and flower follow the theme, and the preview shows the page gradient (owner request). The in-app header logos (`brand_lockup_horizontal`, `brand_symbol_flower_small`, the search screen's `brand.webp`) now exist in one version per theme under `public/assets-theme/<theme>/` (same recolouring rule as the icons: only lavender-hue pixels change; green leaves, yellow centre and outlines stay). Not recoloured: the app icon, splash, onboarding, store images and every other brand file (brand identity). The live preview in the theme settings now also paints the themed page background (`--theme-bg`). This changes the app on phones too: the logo on Home / Stats / Search / Info changes with the theme.

Theme: the flower in the logo is the theme's own flower (owner request). The in-app logo versions (`brand_lockup_horizontal`, `brand_symbol_flower_small`, the search screen's `brand.webp`) are composed by `scripts/make_theme_assets.py` (`compose_logo`): the wordmark is recoloured as before, and the lavender flower is replaced by that theme's approved flower (`assets/theme/theme_flower_<theme>.webp`: coral tulip, sage flower, mustard daisy, sky bluebell) with the same white sticker outline. Lavender keeps the approved logo. The flower is scaled to fit the old flower's box, so tall/wide shapes sit a little smaller or larger than the lavender flower; the outline of the mustard and sky flowers is boxy at the bottom because those artworks end in a flat cut.

## 8. Sharpness, press feedback, logo size (owner requests)

- Theme logo flowers: each theme flower now takes the footprint of the lavender flower it replaces (as tall as the old flower's box, or as wide as the gap before the "D" allows).
- Bottom nav looked soft: its four icons and the "+" were 1x pictures (41 px icon, 55 px button) shown on 3x screens. They are rebuilt at 4x from the same approved icons (`scripts/make_nav_hires.py`: `ui-icons/icon_home|search|grid|flower|add`, placed in the old pictures' boxes; the "+" is drawn over the footer picture's). Geometry unchanged (the footer picture itself is flat and stays 1x). Theme copies regenerated.
- Press feedback: every button dips to 96 % while held and eases back (`scale`, zero-specificity rule in `styles.css`; rows 98.5 %, switches 92 %); tabs of the bottom nav get a soft disc under the finger and the "+" dips. Disabled for `prefers-reduced-motion`.
- Wide drawer view: "서랍 채우기" sits in its own bar under the list instead of on top of the items.
- Sharpness audit (390 px wide, 3x screen; image pixels per shown pixel, 3 or more is crisp). Soft, because the approved pictures exist only at low resolution: onboarding `intro.webp` (1.0), `home_empty_art.webp` (1.0, full screen), `mascot_help_approved` (1.0), `feedback_*_from_approved.png` (1.1), `mascot_celebrate` (1.2), `state_generic_warning` (1.8), guide step pictures (1.9-2.0), `ui_add.webp` (1.9), `mascot_backup_progress` (2.2). They need higher-resolution originals from the design side; nothing can be recovered from the small files.

### 8.1 New high-resolution pictures from the owner (2026-10-21)

The owner supplied nine new pictures (1254 px; one 1448x1086). Applied with `scripts/make_new_art.py` (trim, scale to ~3x the shown size, WebP):
onboarding `intro` (1), empty home mascot `home_empty_art` (2; the baked logo is now the real themed logo image, mascot on flat cream) and `mascot_lean_on_drawer` (2, also used by the guide and feedback heroes), `mascot_help_approved` (3), `mascot_celebrate` (5), `state_generic_warning` (6), `guide_step3_focus` (7), `ui_add` (8), `mascot_backup_progress` (9: now the cloud mascot instead of the folder one — owner-supplied).
Second delivery (same day, applied too): warning triangle and pink speech bubble as the feedback icons (`feedback_error/other_from_approved.webp`, replacing the 44 px PNGs), and new guide step 2 / step 4 pictures. The heart speech bubble (first delivery, picture 4) stays unused.
All twelve soft pictures from the sharpness audit are now replaced by high-resolution art.
Also fixed: the feedback hero card clipped its last text line (fixed height 145 px -> min-height).
Feedback screen (owner idea, approved): a fifth type "응원 메시지" with the heart speech bubble (first delivery, picture 4 -> `feedback_cheer.webp`; mail type key `cheer`); "기타" now sits alone on the last row. A "store review" link was tried inside that tab and removed: the owner wants it in Settings instead, on hold until the app is on Google Play (store URL would be `https://play.google.com/store/apps/details?id=com.howlingcreativestudio.drawary`; the app shell opens external links on the phone).

### 8.2 Top logo of the tab screens, one size and one place (owner request)

Measured before: phone home/stats 196 px wide but search 151 px (other file, lower and further right, no tagline); landscape phone home 120 / search 151 / stats 196; tablet sidebar 152; settings had no logo.
Now: the logo size and place come from CSS variables in `styles.css` (`--brand-w`, `--brand-ink-left/-top`, derived box position and tagline offset, because the logo picture has an empty margin round the drawing). 196 px on phones and in the wide panes, 170 px above the tablet drawer list, 130 px and higher on landscape phones (`:root[data-layout-kind="land"]`, set by `AppScaler`). Home, search, stats and settings (new: logo + tagline + left-aligned title like search/stats; its title colour now matches) use the same lockup picture; search no longer uses `global-search-approved/brand.webp`. In the wide panes the drawing lines up with the content's left edge.
Titles of the tab screens (search, stats, settings) are now one style too: 20 px, weight 800, navy #28396d, left edge at 20 px, and the same height below the logo on phones (title top at y 108). The search screen's side margins moved from 22 to 20 px to match. (Home keeps "내 서랍" as a section heading with the counts beside it.)

### 8.3 One header, one big button, one spelling (owner request after the "unnatural places" audit)

Found by measuring every screen at 390x844: back-arrow screens had title sizes 20-24 px, weights 700-900, nine navy/blue shades, title heights 33-66 px and back arrows at x 0-35 / y 22-69; bottom buttons had corner radius 13-28, height 49-55 px, font 13.5-17 px in two colour families; "서랍칸" and "서랍 칸" were mixed.
- `src/screens/UnifiedHeader.css` (loaded last, more specific than the per-screen styles): every screen with a back arrow has a 44 px back button with the same chevron and a centred 21 px / 800 / #28396d title, both centred 36 px from the top of the header, whatever the header's own height (those heights are kept, so nothing below moves). Drawer / item / table headers keep their second line and the "•••" button, which now sits on the title row; its pop-up hangs just under it. The four `ApprovedHeaderRestore*.css` per-route files are deleted. Drawer manage / name-icon change start at the top of the page like the others (header height 61 -> 89 so the content stays where it was).
- `src/screens/UnifiedButtons.css`: primary bottom buttons are the soft purple gradient of the backup "다음" (slightly deeper left end, faint text shadow for contrast), corner radius 13, height 54, 16 px / 800; secondary buttons ("이전", "취소", "나중에") have the same height and rounding, white with a thin border. Danger buttons stay red. Sheet buttons (sort / filter / confirm sheets) are untouched.
- "서랍칸" -> "서랍 칸" everywhere in `src` (duplicate i18n keys merged).

### 8.4 "템플릿으로 시작" (owner idea, preview awaiting approval)

Nine ready-made drawers (최애 굿즈, 화장품, 읽은 책, 영화·드라마, 카페·맛집, 식물, 여행 기록, 게임·음반, 가계부) in `src/flow/drawerTemplates.ts`, translated in `src/i18n/messages/templates.ts`. New route `#/templates` (`TemplatePickerScreen`): a card per template, a sheet shows its fields, "이 템플릿으로 시작" fills the create-drawer flow (name, icon, colour, fields) and continues on the field list (#09), where everything can still be changed; nothing is stored until "서랍 만들기 완료하기". Entry points: "템플릿으로 시작" on the empty home and in the new-drawer sheet; "직접 만들기" goes to the empty sheet.

### 8.5 Premium screen (preview awaiting approval; purchase not connected)

`src/screens/PremiumScreen.tsx` at `#/premium`: hero, what Premium includes (unlimited drawers, 5 themes, repeat, table export), one "프리미엄 시작 · price" button, "구매 복원", and the optional "개발자에게 커피 한 잔" support products (coffee / latte / cake). Prices on the screen are samples; Google Play billing is added with the Android build (one-time product for Premium, three consumable products for support). Not yet reachable from Settings and nothing is locked yet (free limits: 5 drawers, Lavender theme only, no repeat, no export).


### 8.6 Japanese/English line breaks, "・", support amounts, copy QA

- Japanese and English no longer get the Korean hard line breaks: `tl()`/`tx()` turn a `\n` into a space (en) or a `<wbr>` (ja) and `styles.css` balances the lines (`text-wrap`, `word-break: auto-phrase` for ja). Hero cards (guide, help, feedback) keep their text clear of the mascot in ja/en.
- No "・" or "·" in any text, any language (app, privacy policy, terms): words are joined with 와/과, 、, "and" or a comma; short facts on one line use `dot()` (", " / "、"). Premium price sample is ¥1,200 (owner agreed; launch discount planned).
- Android `versionName` is "0.1.0" (versionCode 1), same as `package.json`.
- Premium screen: coffee, latte and "개발자 기분 좋게 하기" (opens a small dialog with fixed amounts ¥100–¥10,000; Google Play has no typed amount, so each is its own support product). Sample Premium price ¥1,200.
- Owner's copy QA (`Drawary_KO_JA_EN_Copy_QA_2026-10-22.md`, 81 suggestions) applied except: [8] EN "Ended" (status label, correct), [479] "Paused" (status label), [647] KO "선택" (small badge, kept), [387] JA "マイひきだし" (kept), [569/578] "After" (the filter is strictly after, so EN stays). [190] JA/EN were adjusted to the real `{count}` value ("3 items") and the drawer name that is already quoted.
