/**
 * Prevent accidental reintroduction of superseded Drawary screenshots.
 * Ref: docs/approvedSourceManifest.json.
 * This is a provenance guard, not a pixel-parity assertion.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
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
// The approved screenshot uses the official purple 3D help/list icons.
// Verify both the references AND immutable bytes rather than retaining the
// earlier simplified help_question_final/help_list_final substitutes.
check(help.includes('/assets/ui-icons/icon_help.webp') && help.includes('/assets/ui-icons/icon_list.webp'), '#55 original approved icon paths missing');
const iconSHA256 = name => createHash('sha256').update(readFileSync(new URL('public/assets/ui-icons/'+name, root))).digest('hex');
check(iconSHA256('icon_help.webp') === '5733d3fff7df110135ead8bc7254f8811553f1986deac199260cab6ee2ffac3e', '#55 approved help icon bytes changed');
check(iconSHA256('icon_list.webp') === 'e1c4efabf9e1eba62e1e6a8e98dc94abe97af9461f76d66146956e560372ce37', '#55 approved list icon bytes changed');
const faq = read('src/screens/FaqScreen.tsx');
check(faq.includes('/assets/ui-icons/icon_help.webp'), '#56 approved FAQ intro icon missing');
// #05 approved screen V3 originals (not substituted generic app icons).
const sha256 = file => createHash('sha256').update(readFileSync(new URL(file,root))).digest('hex');
const search = read('src/screens/GlobalSearchScreen.tsx');
const newDrawerCSS = read('src/screens/NewDrawerScreen.css');
check(sha256('public/assets/global-search-approved/brand.webp')==='c30c2858726c583e3c7a0aacecce055431cd2ec2aa91944b885129d22cfd735e', '#05 approved brand bytes changed');
check(sha256('public/assets/global-search-approved/search_empty.webp')==='8959228f8decff0878d5e9fc35f6388efd5d92a558c4003bb8680555b27b59a2', '#05 approved mascot bytes changed');
check(search.includes('/assets/global-search-approved/brand.webp') && search.includes('/assets/global-search-approved/search_empty.webp'), '#05 source assets disconnected');
check(search.includes('모든 서랍에서 함께 찾아드려요.'), '#05 approved empty-state copy changed');
check(newDrawerCSS.includes('#08 approved 390x844 sheet:'), '#08 approved sheet geometry override removed');
if (!process.exitCode) console.log('Final approval source guards passed (#05, #08, #55, #59). Pixel audit remains separate.');
