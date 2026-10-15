import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const lock = JSON.parse(readFileSync(join(root, 'docs/design-locks/screen-47.json'), 'utf8'));
const manifest = readFileSync(join(root, 'src/screenManifest.ts'), 'utf8');
const errors = [];

if (lock.screenId !== 47 || lock.designStatus !== 'USER_APPROVED_LOCKED') errors.push('Screen 47 approval lock missing/invalid');
if (lock.approvalDate !== '2026-10-14') errors.push('Screen 47 user approval date changed');
if (!lock.finalDesignRequirements.oneMascotIllustration || !lock.finalDesignRequirements.loadingSpinner)
  errors.push('Screen 47 must retain mascot illustration + spinner');
if (!lock.finalDesignRequirements.doNotUsePriorSpinnerOnly11_4)
  errors.push('Old 11-4 spinner-only design must remain disallowed');
if (!manifest.includes('standaloneCodeApproved: index !== 46'))
  errors.push('Do not mark screen 47 standalone code approved in screenManifest without verified final source/QA');

const candidate = join(root, 'src/screens/BackupProgressScreen.tsx');
if (existsSync(candidate)) {
  const source = readFileSync(candidate, 'utf8');
  const hasMascot = ['<img', '<picture', '<ApprovedIllustration', '<MascotIllustration', '<AssetImage'].some(token => source.includes(token));
  const hasSpinner = /spinner|loading.?ring|progress.?ring|aria-busy/i.test(source);
  if (!hasMascot || !hasSpinner) errors.push('Screen 47 code needs approved mascot artwork AND spinner (reject 11-4 spinner-only fallback)');
  if (lock.finalReferenceArtwork.sha256 === null)
    errors.push('Screen 47 implementation must NOT be added before exact final approved whole-screen reference is verified and hashed');
}
if (errors.length) {
  for (const error of errors) console.error('DESIGN LOCK FAILED: ' + error);
  process.exit(1);
}
console.log('Design lock 47: approval preserved; no unverified screen-47 code integrated.');
