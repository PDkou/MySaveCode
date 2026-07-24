import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // injectManifest (rather than the default generateSW) lets sw.ts add
      // its own push/notificationclick handlers for due-task reminders --
      // generateSW only supports Workbox's built-in runtime-caching hooks.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Family Quest',
        short_name: 'FamilyQuest',
        description: '가족과 함께하는 생활 퀘스트 / 家族でこなす生活クエスト',
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
        // v0.1 does not need full offline support (see handoff doc section
        // 12). This just precaches the built app shell so a repeat visit
        // opens instantly; all Supabase API calls always go to the network.
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        // Pretendard's dynamic-subset woff2 files are fetched on demand per
        // unicode range and are large in aggregate; only precache the app
        // shell above, let the service worker's default runtime handling
        // (network, browser HTTP cache) serve font files as they're used.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
