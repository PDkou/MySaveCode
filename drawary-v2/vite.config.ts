import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// __APP_VERSION__: the version shown on the info screen (package.json). Not 1.0.0 yet: set the release version here and in android/app/build.gradle.kts (versionName) together when it is decided.
export default defineConfig({ plugins: [react()], base: './', define: { __APP_VERSION__: JSON.stringify(version) } });
