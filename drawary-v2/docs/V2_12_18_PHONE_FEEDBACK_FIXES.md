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
