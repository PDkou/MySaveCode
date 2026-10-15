# Drawary final design lock policy (Screen 47)

- `docs/design-locks/screen-47.json` contains the **2026-10-15 user-approved reference and verified SHA-256 hashes**.
- `reference/screen-47/index.html` contains **the exact standalone HTML/CSS/SVG approved by the user**, not a new interpretation.
- The mascot is **the yellow-folder girl extracted from the user's original screenshot**. The matching binary PNG is in `Drawary_47_APPROVED_FINAL_2026-10-15.zip`. GitHub still lacks the exact binary, so browser opening of the committed HTML on GitHub without that PNG will not reproduce the full illustration.
- Do not silently substitute `state_backup_in_progress.webp`, older 11-4 spinner-only visuals, or an AI-generated replacement for the final mascot.
- The approved standalone code includes a real rotating CSS/SVG spinner; no simulated percentage.
- User explicitly **deferred typography normalization** to the global pass across all 59 screens. Do not change this screen alone for font reasons.
- `scripts/check-design-locks.mjs` runs on GitHub Actions, enforcing the approved HTML content hash, metadata and required content. This protects against accidental changes but does not replace visual QA.

**Checklist:** V2-06 complete; V2-07 complete (standalone screen only); next V2-08 common layout/navbar/navigation. React app routing and actual backup operations remain pending. Other projects and older GitHub app not used as sources.
