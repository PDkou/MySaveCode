import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// __APP_VERSION__: the version shown on the info screen (package.json; the Android versionName is kept the same).
export default defineConfig({ plugins: [react()], base: './', define: { __APP_VERSION__: JSON.stringify(version) } });
