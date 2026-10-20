# 2026-10-20 "5 requested resources" package -- what it contained

Received as `Drawary_5_Requested_Resources_2026-10-20.zip` (17 files). **It carried no new final asset.** Every image in it is byte-identical (MD5) to a file already in `public/assets`; the rest are notes and links.

| # | Item | In the package | Status |
| --- | --- | --- | --- |
| 1 | Google Drive logo (#46) | Only a link to `public/assets/ui/google_drive_2026.png` | Already in the repo and already used by #46 (commit bb69c5a). Not verified against the original approval (`drive_logo_from_11-3_exact.png` is still missing). An older note here saying a generic icon was substituted was out of date; the screen comment is corrected. |
| 2 | #04 empty home, JA/EN | The approved Korean render, identical to `home/home_empty_candidate.webp` | **Still blocked for JA/EN**: the Korean text is baked into the image and no text-free art or localized images exist. See "#04" below. |
| 3 | Android notification icon | `notification_icon.webp` (163x163, near-white) + the DO_NOT_SHIP reference; both already in the repo | Usable as the source for the Android small icon (step 6). It shows four faint thin arcs in the corners besides the flower; Android would draw them as thin white marks, so a clean flower-only silhouette should be made and approved when the shell is built. Not converted or tested on a device. |
| 4 | Store images | The same 1 feature graphic + 5 screenshot backgrounds, all named *candidate* | Not final; finals are still needed for release (step 6). |
| 5 | #07 stats originals | The two approved renders (already used) + links to the current React reconstruction | Original HTML/CSS still not found; the screen stays a reconstruction. Real statistics are not wired yet. |

## #04 (empty home) and other languages

The screen is: header (same as home), a girl-on-drawer illustration, a title, two lines of text and the `+ 첫 서랍 만들기` button. Everything except the illustration can be drawn as text. The illustration art is **not** `mascot_lean_on_drawer.webp` (different pose, closed eyes, grey drawer; checked), so it exists only inside the baked image. Options: (a) supply the illustration as a separate text-free image, (b) crop that region (about 205x185 px, no text in it) out of the approved render and use it at 1x (soft on high-density screens), (c) separate Japanese/English renders. Until one is chosen the screen stays the Korean baked image in every language.
