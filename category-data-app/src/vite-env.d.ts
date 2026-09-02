/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Set via vite.config.ts's `define`, true only for the standalone
// single-file preview build (npm run build:preview) -- see main.tsx.
declare const __DISABLE_SW__: boolean;
