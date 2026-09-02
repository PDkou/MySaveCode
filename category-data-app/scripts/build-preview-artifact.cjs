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

const js = fs.readFileSync(path.join(assetsDir, jsFile), 'utf8');
const css = fs.readFileSync(path.join(assetsDir, cssFile), 'utf8');

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
