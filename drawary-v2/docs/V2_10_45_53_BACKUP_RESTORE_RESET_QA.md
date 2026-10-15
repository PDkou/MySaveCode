# V2-10-45~53 — closed 2026-10-15

Two linear wizards plus one standalone confirmation, all entered from
#44 (데이터 관리 허브): 백업 (#45→#46→#47→#48), 복원 (#49→#50→#51→#52),
초기화 (#53). Like #39-44, these are a different, older dated archive
batch (`*_CANDIDATE_2026-10-14`) with no CONFIRMED.md -- each screen's
only real source is a self-contained `index.html`. All ported into
React 1:1 where real interaction logic existed; #46 had none at all
(see below).

## #45 백업 시작 / 종류 선택

Ported from `Drawary_45_BACKUP_TYPE_CONFIRMED_2026-10-14`'s
`index.html` -- the real radio-group logic (click + arrow-key
navigation) ported to `useState`. README.md's confirmed micro-tweak
(두 선택 카드 높이 111→101px, 아이콘 61→55px) matched exactly from the
given CSS. Reached from #44's "백업하기" row; "다음" -> #46.

## #46 저장 위치 선택

Ported from `CONFIRMED_MERGED_LAYOUT`'s `index.html` -- a pure static
mockup with **no JS at all**, not even on the back button. Radio
selection, back, and "다음" are all new, built from the markup/CSS
structure + `render_390x844.png` (a full-viewport screenshot with cream
padding around the actual 390x844 frame, not a clean crop -- pixel-diff
against it isn't meaningful without precisely re-cropping it, so this
screen was verified by eye against that reference instead).

**Asset gap (real, not approximated)**: the archive's own
`assets/drive_logo_from_11-3_exact.png` (the real Google Drive logo)
is missing from this handoff package entirely -- confirmed by listing
the archive's directory, which has no `assets/` folder at all.
Redrawing Google's trademark to fill the gap would be fabricating brand
art, so the existing generic `icon_upload.webp` (a plain cloud-upload
illustration, not a lookalike logo) was substituted for the Google
Drive row instead -- disclosed in code and here, not silently swapped,
and consistent with Google Drive backend integration itself not being
implemented anywhere in this app.

## #47 백업 진행 (already integrated, now actually wired into the flow)

Previously React-integrated as a standalone QA route only reachable
from Settings (see `docs/V2_07_SCREEN47_QA.md`). This batch chains it
into the real #45→#46→#47→#48 flow: back now returns to #46 (not
Settings), and a new `onComplete` prop (fires after a fixed 1.6s demo
delay, since there's no real backup engine to call it) advances to #48.

## #48 백업 완료

Ported from `Drawary_48_BACKUP_SUCCESS_CANDIDATE_2026-10-14`'s
`index.html`. Its back arrow is a plain `aria-hidden="true"` `<div>`,
not a button at all -- kept decorative-only, matching the source
exactly rather than inventing a navigation it never had. Location/
description text reflects the real `backupDestination`/`backupMode`
state chosen in #45/#46 (not hardcoded), though the sample filename
itself is the archive's own displayed value since there's no real
backup engine yet. "확인" -> #44.

## #49 복원 파일 선택

Ported from `Drawary_49_RESTORE_FILE_PICKER_CANDIDATE_2026-10-14`'s
`index.html` -- the real native `<input type="file">` picker (both the
card and the bottom button open it), same `.zip`/`.json` extension
filter with silent rejection on a wrong extension. Reached from #44's
"복원하기" row; a valid file selection -> #50.

## #50 복원 내용 확인

Ported from `Drawary_50_LINEBREAK_REFINED_CANDIDATE`'s `index.html` --
the real confirm-dialog logic (overlay, Escape-to-close, backdrop-click-
to-close, focus management) ported 1:1. New `ui_grid.webp`/
`ui_settings.webp` assets copied in from this archive (visually
distinct from this app's existing `icon_grid.webp`, byte-different, so
kept as this screen's own files rather than substituted).

**Bug found and fixed during this screen's own QA**: a forced `<br />`
was added into the "복원 전에 내용을 한 번 더 확인해 주세요" heading on
the first port (going from README.md's own description of a line-break
fix), but the archive's actual `index.html` markup has no `<br>` there
at all, and the reference render confirms it's one line -- the README
was describing something not reflected in the given source, same
stale-doc-vs-actual-code pattern already established this session.
Removed the incorrect break; re-diffed from mean 12.17 (after the
fix) vs the reference, down from a much worse mismatch with it in.

## #51 복원 진행

Ported from `Drawary_51_RESTORE_PROGRESS_CANDIDATE_2026-10-14`'s
`index.html` -- same CSS-only rotating spinner (not an image),
`prefers-reduced-motion` support, no mock percentage. Same `onComplete`
auto-advance pattern added as #47 (fixed demo delay, disclosed, not a
real restore). Reached from #50's confirm dialog; completes -> #52.

## #52 복원 완료

Ported from `Drawary_52_RESTORE_SUCCESS_CANDIDATE_2026-10-14`'s
`index.html`. Unlike #48's decorative-only back arrow, this one's back
button is real and wired in the source -- kept functional. "확인" and
back both -> #44 (returning to the review screen after a completed
restore doesn't make sense).

## #53 데이터 초기화 확인

Ported from `Drawary_53_DATA_RESET_CONFIRM_CANDIDATE_2026-10-14`'s
`index.html` -- the real checkbox-gated destructive-action logic
ported 1:1 ("데이터 초기화" stays disabled until the acknowledgment
checkbox is checked). New `state_generic_warning.webp`/`ui_delete.webp`
assets copied in. Per the archive's own comment ("UI preview only. No
deletion... is performed here") and README.md ("실제 앱 내 비가역
초기화 연결 금지"), confirming does not delete anything -- just
navigates back to #44, same as cancelling.

## QA

- `npm run typecheck` and `npm run build` both clean.
- Full backup flow exercised end to end via real clicks (not direct
  URL loads): #44 "백업하기" -> #45 (switched to "사진 제외", confirmed
  mutually exclusive with "사진 포함") -> #46 (switched to "Google
  Drive", confirmed selected) -> #47 (auto-completes after ~1.6s) ->
  #48 (confirmed it reads back "Google Drive" / "사진 제외 백업" from
  the actual state chosen two screens earlier, not hardcoded) -> "확인"
  -> lands on `#/data-management`.
- Full restore flow exercised end to end: #44 "복원하기" -> #49 (selected
  a simulated `.zip` file via Playwright's `setInputFiles`, confirmed
  the filename appears in the picker card) -> #50 (confirmed the exact
  filename carries through; opened the confirm dialog, closed it with
  Escape, reopened and confirmed) -> #51 (auto-completes) -> #52
  (confirmed result values) -> "확인" -> `#/data-management`. Separately
  verified a `.txt` file selection is silently rejected and stays on
  `#/restore-file-picker`.
- Reset flow exercised end to end: #44 -> #53 (confirmed "데이터 초기화"
  is `disabled` before the checkbox, becomes enabled only after
  checking it) -> confirmed -> `#/data-management`.
- Compiled-browser Chromium render at 390x844 for all eight screens,
  plus 320x640/430x932 spot-checks on #45/#46/#50/#53 -- no clipping
  or distortion.
- Pixel-diffed against confirmed renders where available and clean
  (390x844, not a padded full-viewport screenshot): #45 mean 11.21 /
  90.0% identical / 6.0% diff>30; #50 mean 12.17 / 90.5% identical /
  6.5% diff>30 (after the line-break fix above); #53 mean 8.58 / 95.4%
  identical / 4.1% diff>30 -- all within the normal AA-noise range.
  #46's own reference is a 794x1123 full-viewport screenshot with
  padding around the device frame, not a clean 390x844 crop; a naive
  resize-to-fit produces a meaningless huge diff (confirmed by cropping
  and re-checking), so it was verified visually/structurally against
  that reference by eye instead, same as prior screens whose reference
  wasn't a directly diffable code render. #48/#49/#51/#52 likewise
  verified visually against their own reference renders/behavior rather
  than numerically.
- One console `404` was observed once during this batch's multi-page
  run -- same unreproducible single-occurrence pattern already
  investigated and documented in earlier QA docs this session, not
  chased further again.
