# backup

Everything related to Drawary that was on the `drawary/59-design-rebuild-20261014` branch, as of 2026-10-26 (before its cleanup).

## Drawary_backup_20261026.zip: the files
- `drawary-v2/` the Drawary app (now in its own repository, `PDkou/drawary`, with its full history)
- `drawary-app/` the older Drawary Android app
- `category-data-app/` the earlier category/data app Drawary grew out of
- `README.md`, `.gitignore` the root files that mention Drawary
- `.github/workflows/` every Drawary workflow (`drawary-v2-*`, `build-drawary-*`)

## Drawary_history_20261026.bundle.part00 / 01 / 02: the git history
One git bundle of the whole branch history (every commit, 1,093), split into three pieces because GitHub does not take files over 100 MB.
To restore it:

    cat Drawary_history_20261026.bundle.part* > Drawary_history_20261026.bundle
    git clone Drawary_history_20261026.bundle -b tmp-drawary-history drawary-history


`HelloToday_backup_20261026.zip` is a full copy of `PDkou/MySaveCode`'s `hellotoday-app/` folder (the Hello, Today Android app)
as of 2026-10-26, right before that folder's content moved out to its own repository, `PDkou/hello-today`. History was **not**
preserved in the new repo (it starts from a fresh first commit), so this zip is the only place the exact pre-split tree —
including `app/halloween-2026/original-backup/`, build/CI config, and docs as they stood on the `HelloToday` branch — is kept
with the original nested `hellotoday-app/` path intact.
