# Store listing material

- `*/feature_graphic_1024x500.png`: the Play Store feature graphic, Korean / Japanese / English. **Final** (user decision 2026-10-20: the Part A/B review versions count as final).
- `locale_copy.json`: the store image texts per language and screenshot.
- Portrait screenshots (5 per language): to be made from real captures of the finished app (step 6), picking the screens that show the app best; the empty phone frames are in `public/assets/store/store_screenshot_bg_candidate_*.webp`.

## Screenshots (made 2026-10-20)

`KR|JP|EN/screenshot_01_home … screenshot_05_backup.png`, 1080 × 1920 (9:16). Each is a real capture of the compiled app
(sample content in that language; product names are those of the approved design mockups) placed into the empty phone frame
`store_screenshot_bg_candidate_{a..e}.webp`, with the title/subtitle from `locale_copy.json` on the frame's bars.
Screens: 1 home, 2 new drawer, 3 search, 4 drawer with photos, 5 data management (backup). Rebuild:
`npm run build && npx vite preview --port 5301`, then `node scripts/store/capture.cjs <dir>` and `python3 scripts/store/compose.py <dir>`.
Captions use a deep-violet (#4a33b0 / #6a5bb0) Noto Sans; the caption colour is my choice (the bars were empty).

## App icon (2026-10-22)

The owner's concept 01 ("peek over drawer", `app_icon_source_01_peek_over_drawer.png`, 1254 px, a rounded picture on a white canvas) is the app icon.
`python3 -I scripts/make_app_icon.py release/store/app_icon_source_01_peek_over_drawer.png` rebuilds everything from it: the Android adaptive-icon
layers (`android/app/src/main/res/mipmap-nodpi/ic_launcher_*.webp`), the Android 10-11 splash icon, and the Play Store icon
`play_icon_512.png` (512 x 512, full square). The white corners of the source are replaced by the picture's own colours continued outward.
The picture is cut a little by a round phone mask (the lower corners of the drawer); a re-render with a full-bleed background and no rounded frame
would be cleaner (the owner's README says dedicated foreground/background layers can be made after approval).
