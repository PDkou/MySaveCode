# backup

Everything related to Drawary that was on the `drawary/59-design-rebuild-20261014` branch, as of 2026-10-26 (before its cleanup).

## Drawary_backup_20261026.zip: the files
- `drawary-v2/` the Drawary app (now in its own repository, `PDkou/drawary`, with its full history)
- `drawary-app/` the older Drawary Android app
- `category-data-app/` the earlier category/data app Drawary grew out of
- `README.md`, `.gitignore` the root files that mention Drawary
- `.github/workflows/` every Drawary workflow (`drawary-v2-*`, `build-drawary-*`)

## Drawary_history_20261026.bundle.part00 / 01: the git history
One git bundle of the whole branch history (every commit), split into three pieces because GitHub does not take files over 100 MB.
To restore it:

    cat Drawary_history_20261026.bundle.part* > Drawary_history_20261026.bundle
    git clone Drawary_history_20261026.bundle -b tmp-drawary-history drawary-history
