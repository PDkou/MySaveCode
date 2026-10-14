# Approved screen-source import status (2026-10-14)

We inventoried **59 user-approved Drawary screens** and verified the **source bytes** for the latest final **57, 58, 59** designs against a local staging package. This is a real provenance and asset-link check, **not** a completed React integration.

## Verified latest screen sources

| Screen | Final reference | HTML SHA-256 prefix | Images referenced | React V2 status |
|---|---|---|---:|---|
| 57 사용 가이드 | 57 GUIDE REFINED | `41d2e0c175de` | 5 | Not imported |
| 58 정보 | 58 INFO | `ccc081c61a58` | 1 | Not imported |
| 59 피드백 | 59 FEEDBACK REFINED | `481c8d9ecf68` | 5 | Not imported |

The extracted sources contain the original HTML and all referenced files under their own `assets/` directories, with no missing `<img src="assets/...">` targets.

- 59 must use **the refined user-approved feedback screen**, not older `10_feedback_final.png`.
- 57 must use **the refined guide screen**, not older `08_guide_final.png`.
- 46 uses **the selected merged screen**.
- 47 final standalone implementation is **not confirmed**, despite design approval.

## Other materials inventoried

- Official structured WebP library archive: 314 entries; original archive SHA-256 is recorded in `approvedSourceManifest.json`.
- Older confirmed visual boards archive: original archive SHA-256 recorded; not necessarily individual final 1–38 render/code exports.
- 16 candidate source archives for the 39–56 range; each must be cross-checked with the last confirmed design before implementation.

## GitHub upload status

The V2 GitHub branch contains this **metadata and verification script**. The original **binary PNG/WebP files and the complete HTML source have NOT yet been uploaded to the repository**. A local staging package was prepared with exact file bytes; do not imply `public/assets/` exists in V2 yet.

To validate a copy after extracting the package into `drawary-v2/source-stage/`:

```bash
node scripts/verify-approved-sources.mjs source-stage
```

After verifying source bytes, port the HTML/CSS behaviors into real React components with navigation/state, and render/QA against reference images. Never substitute a screenshot as an interactive screen.

## Data safety

Legacy JSON, SAF backup import/export, notifications, photos and Android wrapper are retained in old folders until V2 passes migration and functionality checks.
