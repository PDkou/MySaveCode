import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Usage: node scripts/verify-approved-sources.mjs source-stage
const base = resolve(process.argv[2] || 'source-stage');
const selfDir = fileURLToPath(new URL('.', import.meta.url));
const manifest = JSON.parse(readFileSync(join(selfDir, '../docs/approvedSourceManifest.json'), 'utf8'));
const errors = [];
const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

for (const [id, screen] of Object.entries(manifest.approvedFinalHtml)) {
  const target = join(base, screen.file);
  if (!existsSync(target)) {
    errors.push('Screen ' + id + ': missing HTML: ' + screen.file);
    continue;
  }
  if (sha256(target) !== screen.sha256) errors.push('Screen ' + id + ': HTML SHA-256 mismatch');
  const html = readFileSync(target, 'utf8');
  const embeddedAssets = [...html.matchAll(/\\bsrc="(assets\\/[^"]+)"/g)].map(match => match[1]);
  const expected = screen.requiredAssets.map(name => 'assets/' + name);
  for (const file of expected) {
    if (!embeddedAssets.includes(file)) errors.push('Screen ' + id + ': expected asset not referenced ' + file);
    if (!existsSync(join(base, 'approved_57_59', id, file))) errors.push('Screen ' + id + ': missing asset file ' + file);
  }
  for (const file of embeddedAssets) {
    if (!existsSync(join(base, 'approved_57_59', id, file))) errors.push('Screen ' + id + ': unresolved HTML src ' + file);
  }
}

for (const [name, bundle] of Object.entries(manifest.archives)) {
  const sub = name.startsWith('02A_') ? 'shared_assets' : 'older_visual_references';
  const path = join(base, sub, name);
  if (!existsSync(path)) errors.push('Missing archive: ' + name);
  else if (sha256(path) !== bundle.sha256) errors.push('Archive hash mismatch: ' + name);
}

if (errors.length) {
  for (const problem of errors) process.stderr.write('FAIL ' + problem + '\\n');
  process.exitCode = 1;
} else {
  process.stdout.write('PASS: final screen 57–59 HTML, referenced assets and master archive checksums verified.\\n');
}
