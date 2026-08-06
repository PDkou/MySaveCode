// Which app shell this build is (2026-08 family/business app split --
// see business-quest-app/, a sibling Vite project that imports this same
// src/ tree via a '@core' alias). Set per-app via VITE_APP_MODE in each
// app's own .env (family-quest-app/.env has none -> defaults to 'family';
// business-quest-app/.env sets VITE_APP_MODE=business). Everything else in
// this shared source tree stays app-mode-agnostic -- this is the one
// read point components should branch on, rather than each reaching into
// import.meta.env directly.
export type AppMode = 'family' | 'business';

export const APP_MODE: AppMode = import.meta.env.VITE_APP_MODE === 'business' ? 'business' : 'family';
