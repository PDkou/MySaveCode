/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Set via vite.config.ts's `define`, true only for the standalone
// single-file preview build (npm run build:preview) -- see main.tsx.
declare const __DISABLE_SW__: boolean;

// Set via vite.config.ts's `define` from package.json's version --
// Settings.tsx's web-build fallback for the app-version footer (the
// native Android build reports its own versionName instead).
declare const __APP_VERSION__: string;
