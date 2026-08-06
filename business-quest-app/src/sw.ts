// Thin re-export -- the actual service worker logic (precache, push
// notification handling) lives in @core/sw.ts and is app-mode-agnostic;
// see main.tsx's header comment for why this app only has these two "own"
// files.
export * from '@core/sw.ts';
