# V2-12 step 5: backup, restore, reset (#44–#53)

| | #44 hub | #45/#46 backup choices | #47/#48 backup | #49–#52 restore | #53 reset |
|---|---|---|---|---|---|
| Design approved | yes | yes | yes | yes | yes |
| Source integrated | yes | yes | yes | yes | yes |
| Browser QA (real Chromium, whole flow) | yes | yes | yes | yes | yes |
| Business function | yes | yes | yes (device); **Drive: shell only** | yes | yes |
| Android verified | no | no | no (saving to a folder needs the shell) | no (file chooser needs the shell) | no |

## The backup file
- **With photos**: `Drawary_Backup_YYYY-MM-DD.zip` = `backup.json` + `photos/<recordId>/<n>.<ext>` (stored, not compressed: photos are already compressed). **Without photos**: `Drawary_Backup_YYYY-MM-DD.json` (readable text).
- `backup.json`: `{ app: "drawary", format: 1, createdAt, includesPhotos, drawers, fields, records, notificationRules, recurrenceRules, settings, photos }`. Settings that travel: theme, language, 알림 공통 설정, each drawer's table view (sort/filter). **Never**: PIN, lock settings, wrong-try count (`security.*`).
- A file made by a computer's zip tool (deflate) can also be read.
- `src/backup/zip.ts` (writer/reader, CRC checked, size limits, no ZIP64/encryption), `src/backup/backupFile.ts` (create/read/validate), `data/repository.ts` (`loadAllPhotos`, `replaceAllData`).

## Safety rules (decided here)
- **Reading is complete and strict before anything is changed**: JSON/zip structure, field kinds, duplicate ids, drawers/fields that must exist, photo files that must exist and be images (max 3 per record); a newer file format is refused with "update the app". Things that only point at something missing are dropped instead of failing: values of unknown fields, notification/repeat rules whose date field is missing or out of range, settings that are not on the allowed list.
- **Restore replaces everything in ONE all-or-nothing write**: if any step fails, nothing changes (tested). The device's PIN and lock stay as they are.
- **Restore and reset ask for the PIN when the app lock is on** (the same PIN screen in "verify" mode, with its own line of copy; wrong tries count toward the same pause rule). Backup itself does not.
- **Reset** (the screen's own text: "서랍과 기록, 앱 설정 등의 데이터가 삭제돼요"): drawers, fields, items, photos, notification/repeat rules and ALL settings (theme back to lavender, language back to the phone's, PIN and lock gone, onboarding shown again next start). Backup files outside the app are not touched. The #53 README said "no deletion until the spec is decided"; this is that spec, requested by the user in the step-5 checklist.
- Backup contains everything readable and is **not encrypted** (the data on the phone is not either). A password option would be a new screen; not built.

## Where things are shown
- #48 shows the real file name and place ("Download" in a browser; the shell tells where it saved). #50 counts drawers/items/photos from the chosen file; #52 shows what was restored.
- Not translated/changed: the screens' copy. New copy: the PIN screen's two purpose lines, the error messages, "Google Drive 백업은 안드로이드 앱에서 사용할 수 있어요."

## Android shell contract (step 6)
`window.DrawaryNative.saveBackupFile(fileName, base64) -> Promise<string place>` and `saveBackupToDrive(fileName, base64) -> Promise<string place>` (sign-in/permission are the shell's job; Drive is optional and last). The restore file chooser is the normal `<input type=file>` the shell must support.

## Not done / open
- Google Drive upload itself (needs a Google sign-in client in the shell). In a browser the Drive choice explains that and stays on #46.
- Very large photo libraries are read into memory (fine for phones with a few hundred photos; a streaming zip would be needed for thousands).
- Restore does not run the repeat rules by itself; they run at the next app start as usual.

## Tests
`src/backup/zip.test.ts` (6), `src/backup/backup.test.ts` (12: round trip with/without photos, PIN left out, restore replaces + keeps this device's PIN, all-or-nothing, 12 ways a file can be wrong; mutation-checked), real-Chromium flow `backup5.js` (30 checks: backup with/without photos, real download, Drive message, reset, restore from the zip and equality of the whole state, bad file, PIN gates with the lock on).
