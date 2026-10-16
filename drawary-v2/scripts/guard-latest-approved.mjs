/**
 * Prevent accidental reintroduction of superseded Drawary screenshots.
 * Ref: docs/approvedSourceManifest.json.
 * This is a provenance guard, not a pixel-parity assertion.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const root = new URL('..', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const manifest = JSON.parse(read('docs/approvedSourceManifest.json'));
const feedback = read('src/screens/FeedbackScreen.tsx');
const help = read('src/screens/HelpMainScreen.tsx');
const check = (condition, message) => {
  if (!condition) { console.error('FINAL APPROVAL GUARD FAILED: '+message); process.exitCode=1; }
};
check(manifest.approvedFinalHtml['59']?.sha256==='481c8d9ecf680b3c4c84b2f0295e1401216742a5ec3fab1a27c3611905f484df', '#59 approved source manifest changed');
check(feedback.includes('작은 의견 하나가<br />더 편리한 Drawary를<br />만들어요.'), '#59 revised headline changed');
check(feedback.includes('/assets/mascot/mascot_lean_on_drawer.webp'), '#59 revised mascot replaced');
check(!feedback.includes('mascot_feedback_approved.webp'), '#59 obsolete 10/08 screenshot crop reintroduced');
check(help.includes('mascot_help_approved.webp'), '#55 confirmed mascot missing');
check(help.includes('help_question_final.webp')&&help.includes('help_list_final.webp'), '#55 confirmed icons missing');
if (!process.exitCode) console.log('Final approval source guards passed (#55, #59). Pixel audit remains separate.');
