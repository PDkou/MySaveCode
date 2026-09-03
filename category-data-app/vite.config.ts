import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths -- this build isn't only ever served from a
  // domain root. The same dist/ output also gets bundled as local
  // in-app assets inside drawary-app/ (the native Android WebView shell,
  // see its README) and loaded from a non-root virtual origin
  // (https://appassets.androidplatform.net/assets/dist/); absolute "/"
  // paths would 404 there.
  base: './',
  define: {
    // See src/main.tsx and package.json's build:preview script -- true
    // only for the standalone single-file build used for quick live
    // previews (published as an Artifact rather than installed).
    __DISABLE_SW__: JSON.stringify(!!process.env.DISABLE_SW),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Plain generateSW is enough here -- unlike family-quest-app/
      // business-quest-app this app has no push notifications or other
      // custom service-worker logic, so there's no need for their
      // injectManifest + hand-written sw.ts setup.
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: '나만의 서랍장 (Drawary)',
        short_name: '서랍장',
        description: '나만의 카테고리를 만들고 항목을 기록하는 개인 데이터 관리 앱',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        // 'any' rather than 'portrait' -- phones AND tablets, and the
        // dedicated table screen (TableScreen.tsx) specifically benefits
        // from landscape on a tablet (more table columns visible without
        // horizontal scrolling).
        orientation: 'any',
        background_color: '#f4eff9',
        theme_color: '#6F5499',
        lang: 'ko',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-192-maskable.png',
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
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
