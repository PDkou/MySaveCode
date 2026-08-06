# MySaveCode — repo layout

This repo holds several unrelated projects. The one under active development
is the quest/task-management PWA, now split into two separately-deployed
apps sharing one codebase (2026-08):

- **`family-quest-app/`** — the "Family Quest" app, and also where the
  actual shared source lives (`src/`, `public/`, `supabase/schema.sql`).
  Build/dev/deploy this exactly as before.
- **`business-quest-app/`** — "Company Quest" (컴퍼니 퀘스트), a thin sibling
  app for team/business use. Has its own `index.html`, `vite.config.ts`,
  PWA manifest/branding, and a two-file `src/` (`main.tsx`, `sw.ts`) — every
  other component/page/lib file is imported straight from
  `family-quest-app/src` via a `@core` alias (see that app's
  `vite.config.ts`/`tsconfig.app.json`). There is no code fork: a bug fix or
  feature added to `family-quest-app/src` applies to both apps automatically.

Both apps currently point at the **same Supabase project** (same
`VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` in each app's own
`.env`) — splitting the backend too is a deliberately deferred follow-up,
not done yet.

## What actually differs between the two apps today

Startlingly little, by design — see `family-quest-app/src/lib/appMode.ts`,
the one place shared code branches on which app it's running in
(`VITE_APP_MODE` env var, set per-app in each `.env`):

- Which `room_type` (`'family'` vs `'business'`) the onboarding/add-room
  flow creates — no more in-app toggle between the two (see
  `FamilyOnboardingForms.tsx`), since a family-app user should never see a
  "회사/팀" option and vice versa.
- App name/tagline branding text (`src/i18n/index.ts` overrides
  `app.name`/`app.tagline` for the business build) and the PWA
  manifest/`index.html` metadata per app.

Everything else (routing, all pages/components, the tycoon, gamification,
Supabase RPCs, RLS) is identical and shared. Deeper business-specific
behavior (different feature set, different visual theme) is a future task,
not yet built.

## Working with the workspace

This is an npm workspace rooted here (see `package.json`'s `"workspaces"`)
— `node_modules` is hoisted to this root, not duplicated per app. Run
`npm install` from **this directory**, not from inside either app, after
pulling changes that touch either app's `package.json`.

```bash
# family app
cd family-quest-app && npm run dev    # or: npm run build

# business app
cd business-quest-app && npm run dev  # or: npm run build
```

Each app builds/deploys completely independently (two separate hosting
projects, e.g. two Vercel projects, each rooted at its own app directory) —
they just happen to share source code and a database.

## Other projects in this repo (unrelated)

- `game/` — a separate Godot/GDScript project ("Hungry Pack"), see its own
  `CLAUDE.md`.
- `web_test/`, `reports/` — standalone artifacts, not part of either app's
  build.
