#!/usr/bin/env node
// Inlines dist-preview/ (the single-file, no-service-worker build --
// see package.json's build:preview) into one self-contained HTML file
// for publishing as a live-preview Artifact. Not part of the app's real
// build output (dist/, used for hosting and bundled into drawary-app/);
// this exists purely so UI changes can be reviewed on a real phone/tablet
// without a full Android build. See the project's README for the loop:
// npm run build:preview && node scripts/build-preview-artifact.js
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'dist-preview');
const OUT = path.resolve(__dirname, '..', 'preview-artifact.html');

const assetsDir = path.join(SRC, 'assets');
if (!fs.existsSync(assetsDir)) {
  console.error(`${assetsDir} not found -- run "npm run build:preview" first.`);
  process.exit(1);
}
const files = fs.readdirSync(assetsDir);
const jsFile = files.find((f) => f.endsWith('.js'));
const cssFile = files.find((f) => f.endsWith('.css'));
if (!jsFile || !cssFile) {
  console.error('Expected exactly one .js and one .css in dist-preview/assets -- build output shape changed?');
  process.exit(1);
}

let js = fs.readFileSync(path.join(assetsDir, jsFile), 'utf8');
const css = fs.readFileSync(path.join(assetsDir, cssFile), 'utf8');

// Runtime-referenced images (<img src="./icons/...">, e.g. SplashScreen.tsx
// and Home.tsx's header logo) are plain string literals, not Vite asset
// imports -- Vite has no idea they exist, so they end up in the bundle as
// bare "./icons/xxx.png" paths. That's fine for dist/ (icons/ sits right
// next to index.html) and drawary-app's bundled assets, but this preview
// is a single standalone file with no icons/ folder alongside it. Inline
// each referenced icon as a data URI so it still renders here.
const iconsDir = path.join(SRC, 'icons');
const iconRefs = [...js.matchAll(/\.\/icons\/([\w.-]+\.png)/g)].map((m) => m[1]);
for (const name of new Set(iconRefs)) {
  const iconPath = path.join(iconsDir, name);
  if (!fs.existsSync(iconPath)) {
    console.error(`Referenced ./icons/${name} but ${iconPath} doesn't exist.`);
    process.exit(1);
  }
  const dataUri = `data:image/png;base64,${fs.readFileSync(iconPath).toString('base64')}`;
  js = js.split(`./icons/${name}`).join(dataUri);
}

if (js.includes('</script')) {
  console.error('Bundled JS contains a literal "</script" sequence -- would break inlining. Investigate before publishing.');
  process.exit(1);
}

const html = `<title>Drawary</title>
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${js}
</script>
`;

fs.writeFileSync(OUT, html, 'utf8');
console.log(`wrote ${OUT} (${(html.length / 1024).toFixed(1)} KB)`);
