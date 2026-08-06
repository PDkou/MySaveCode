import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    // Everything beyond this app's own thin entry point (src/main.tsx,
    // src/sw.ts) lives in the real family-quest-app/src tree and is
    // imported from there via this alias -- see tsconfig.app.json's
    // matching "paths" entry (kept in sync with this) and
    // family-quest-app/src/lib/appMode.ts for how app-mode-specific
    // behavior branches inside that shared tree.
    alias: {
      '@core': path.resolve(__dirname, '../family-quest-app/src'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Same injectManifest strategy as family-quest-app, for the same
      // reason (sw.ts needs custom push/notificationclick handlers, not
      // just Workbox's built-in runtime-caching hooks) -- see that app's
      // vite.config.ts for the original comment this mirrors.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: '컴퍼니 퀘스트',
        short_name: 'CompanyQuest',
        description: '팀과 함께하는 업무 퀘스트 관리',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f6f4ef',
        theme_color: '#182640',
        lang: 'ko',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
