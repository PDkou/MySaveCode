# Source-of-truth rule: approved design ONLY

User instruction (2026-10-15): **ignore all content from the previous GitHub Drawary implementation for now**.

## Allowed sources
1. User-approved Drawary screen renderings and HTML/CSS/JS exports (59 designs approved).
2. Original assets from the final approved asset ZIP, verified by SHA-256.
3. New V2 code written from those approved files and the current user instructions.

## Not allowed as a design or implementation source
- Previous GitHub Drawary React components, splash animation, UI CSS, icon sprites and navigation structure.
- Previous Android wrapper implementation.
- Previous GitHub assets, even if their filenames seem relevant.
- Any guessed replacement visual when the approved final source has not been located.

The previous directories are preserved only to avoid destructive changes. They are **not** the working reference or a dependency of V2.

## Verified original asset archive
- Name: `02A_DRAWARY_ASSETS_FINAL_STRUCTURED.zip`
- SHA-256: `5af682379b673eabc2847acd85e58cd15f3d17b69645c036049002a9386a1ae4`
- Content used: **294 original binary assets** under `assets_app/`.
- Subfolders: `android`, `brand`, `decor`, `drawer-icons`, `field-types`, `mascot`, `onboarding`, `states`, `store`, `ui-icons`.
- Local import pack produced: `Drawary_V2_OFFICIAL_ASSETS_2026-10-15.zip`, independently checksum-verified.
- **GitHub status**: the importer and this policy document are committed, but the 294 binary assets themselves are not yet committed.

## Work boundary
- 59/59 visual designs approved.
- 0/59 integrated into React V2.
- Do not claim an implemented or approved animated splash based on the static splash artwork alone.
- Before implementing any screen, locate the latest approved design for that specific screen; do not invent it.
- Screen 47 is visual-approved; the final standalone implementation still needs verification.

To import locally in an actual checkout:

```sh
cd drawary-v2
python scripts/import-approved-assets.py /path/to/02A_DRAWARY_ASSETS_FINAL_STRUCTURED.zip
```

The importer requires the exact original approved ZIP SHA-256; it does not read any original app GitHub directories.
