import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const lock = JSON.parse(readFileSync(join(root, 'docs/design-locks/screen-47.json'), 'utf8'));
const source = readFileSync(join(root, 'reference/screen-47/index.html'), 'utf8');
const manifest = readFileSync(join(root, 'src/screenManifest.ts'), 'utf8');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const problems = [];

const referenceSha = '87d4618781b3d5559576a81a509574e09655add59b453e73c66d5418a6b52ccb';
const htmlSha = '82329d86f964d0dbfad8a02ec38f1ed828f2247348e34b932ec4b9875321e366';
const artSha = 'cab7be0d343e09cbb152283e33dc321e95e57ba95651f876dfb36026cafd5ca7';
if (lock.screenId !== 47 || lock.designStatus !== 'USER_APPROVED_LOCKED' || lock.standaloneCodeStatus !== 'USER_APPROVED_LOCKED')
  problems.push('Screen 47 user approval must remain locked');
if (lock.approvedAssets.exactWholeScreenUserUploaded.sha256 !== referenceSha)
  problems.push('Screen 47 approved user reference digest modified');
if (lock.approvedAssets.extractedCharacterCutout.sha256 !== artSha)
  problems.push('Screen 47 approved mascot artwork digest modified');
if (lock.approvedStandaloneSource.sha256 !== htmlSha || sha256(source) !== htmlSha)
  problems.push('Screen 47 approved standalone HTML/CSS modified');
if (!manifest.includes('standaloneCodeApproved: true'))
  problems.push('Screen 47 standalone approval missing from manifest');
for (const required of ['백업하기','백업하고 있어요','잠시만 기다려주세요.','데이터를 안전하게 정리하고 있습니다.','loading-ring','approved_character_cutout.png']) {
  if (!source.includes(required)) problems.push('Screen 47 required visual/text missing: ' + required);
}
if (!lock.finalDesignRequirements.doNotUsePriorSpinnerOnly11_4)
  problems.push('Do not fall back to the old spinner-only version');
const imageInRepo = join(root, 'reference/screen-47/assets/approved_character_cutout.png');
if (existsSync(imageInRepo) && sha256(readFileSync(imageInRepo)) !== artSha)
  problems.push('Screen 47 mascot image bytes changed');
const appScreen = join(root, 'src/screens/BackupProgressScreen.tsx');
if (existsSync(appScreen)) {
  const code = readFileSync(appScreen, 'utf8');
  if (!code.includes('approved_character_cutout.png') && !code.includes('ApprovedScreen47Artwork'))
    problems.push('React screen 47 must reference approved artwork, not another mascot');
}
if (problems.length) {
  for (const msg of problems) console.error('DESIGN LOCK FAILED: ' + msg);
  process.exit(1);
}
console.log('PASS: screen 47 reference, standalone HTML and approval hashes locked.');
