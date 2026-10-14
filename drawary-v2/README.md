# Drawary V2 — 59 approved screens rebuild

The separate implementation for **나만의 서랍장 / Drawary / ひきだし帳**.

## Status (2026-10-14)

- **Visual designs approved by user:** 59 of 59.
- **New React app implementation:** foundation scaffold only; 0 of 59 integrated.
- **Approved standalone code / mockups are not equivalent to an integrated app.**
- Screen 47's asset-based visual proposal is approved, but its final code implementation is not.
- Android integrations, data migration, backup, photos, notifications and release QA are pending.

The app currently displays a **development-only integration inventory**, NOT the approved production UI. Do not ship this screen.

## Original project (KEEP)

- `../category-data-app/`: original web application
- `../drawary-app/`: original Android wrapper
- Git branch `claude/category-data-management-app-jo6f6i`: old implementation, unchanged
- New work branch: `drawary/59-design-rebuild-20261014`

Do not delete or overwrite the old implementation. Swap Android integration only after parity checks and approval.

## Commands

```sh
cd drawary-v2
npm install
npm run typecheck
npm run build
npm run dev
```

## Implementation rules

1. Source of truth: user-approved 59 screen renders, standalone HTML and WebP/PNG assets; no speculative redesign or replacement art.
2. Integrate real React navigation, state and features; do not substitute full-screen images for interactive UI.
3. Preserve local data and establish backward-compatible migration/backup restoration before removing old code.
4. Do not claim Google Drive works until authorization, selection, export and import are actually tested.
5. Do not claim feedback is submitted until an actual delivery channel confirms that.
6. Check landscape, foldable, safe areas, Korean/Japanese/English and all screen states.
7. Periodic full review: punctuation/spacing and large white wrapper panels are **deferred**, not authorized as isolated changes.

See `docs/INTEGRATION_CHECKLIST.md` and `src/screenManifest.ts`.
