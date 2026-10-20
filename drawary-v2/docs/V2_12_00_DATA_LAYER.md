# V2-12 step 0: on-device data layer

Screens are frozen (visual edits closed 2026-10-20). This step adds **no UI change**; it is the storage foundation the later steps wire screens to. Nothing imports it yet, so the app behaves exactly as before.

## Shape

- Local only: IndexedDB, no server, no account. Matches the HelloToday / Drawary WebView-shell pattern.
- `src/data/types.ts` -- Drawer (서랍), Field (서랍 칸), RecordItem (보관품), PhotoSet. Field kinds are the same 10 the UI already offers (`text`, `long_text`, `number`, `currency`, `date`, `photo`, `select`, `check`, `rating`, `link`).
- `src/data/db.ts` -- one connection, versioned migrations (append-only), `withTx` resolves only after the transaction commits.
- `src/data/validation.ts` -- name length (20), per-kind value checks, required fields (an unchecked checkbox counts as answered), unknown field ids rejected.
- `src/data/repository.ts` -- CRUD, ordering, cascade deletes (drawer -> fields/records/photos; field -> its value in every record; record -> photos), settings, `resetAllData`.
- `src/data/store.ts` -- in-memory mirror + `useStore()` hook. Writes are serialized and the mirror refreshes only after the save succeeds.

## Decisions worth knowing

- Photos stay out of record values (`photos` store keyed by record id, max 3, images only). `null` = never set, `[]` = cleared.
- A field's kind cannot change after creation (existing values would stop matching).
- Currency is an integer (KRW); dates are `YYYY-MM-DD` and must be real calendar dates.
- A fresh install starts **empty** (that is what screen #4 is for). Demo data is not auto-seeded.
- `resetAllData` also clears settings (screen #53 says app settings are deleted too).
- The legacy photo DB (`drawary-v2-record-photos`, used by #17/#19) is untouched for now; it is migrated into `photos` when those screens are wired (step 1).

## Verification

- `npm test`: 31 tests (schema, drawers, fields, records, photos, settings/reset, store). A mutation check (breaking cascade-delete and date validation on purpose) made the matching tests fail, then passed again once restored.
- Real Chromium (not the fake IndexedDB used by the tests): wrote a full scenario, did a hard reload, and confirmed drawers/fields/records/photo (size preserved), setting, ordering under two simultaneous writes, rejection of an invalid write, cascade delete, and reset.
- `npm run typecheck` and `npm run build` pass; build output unchanged because nothing imports the layer yet.

## Not done here

Wiring screens, home rendering from real data (#3/#4/#6), the legacy photo migration, backup/restore snapshot format.
