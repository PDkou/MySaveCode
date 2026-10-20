/*
 * Accessibility audit (axe-core in real Chromium) over the screens of the compiled app, with seeded sample data.
 * Run:  npm run build && npx vite preview --port 5301 &
 *       NODE_PATH=<dir with playwright and axe-core node_modules> node scripts/a11y_audit.cjs [baseUrl] [locale]
 * Prints, per rule, how many nodes fail and on which screens. Changes nothing in the app.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = process.argv[2] || 'http://localhost:5301/';
const LOCALE = process.argv[3] || 'ko-KR';

const ROUTES = ['home', 'search', 'stats', 'settings', 'create-drawer', 'splash', 'onboarding', 'home-empty', 'new-field', 'creation-complete',
  'notification-common', 'theme-settings', 'security-settings', 'lock-detail', 'pin-setup', 'data-management', 'backup-type', 'backup-destination',
  'restore-file-picker', 'data-reset-confirm', 'language-settings', 'help-main', 'faq', 'guide', 'info', 'feedback', 'home-edit',
  'notification-settings', 'recurrence-management', 'drawer-fields'];
// Screens that need an open drawer / item: reached by clicking.
const SEED = `(async () => {
  const open = () => new Promise((res, rej) => { const r = indexedDB.open('drawary-v2'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const db = await open();
  const tx = db.transaction(['drawers','fields','records'], 'readwrite');
  const now = Date.now();
  tx.objectStore('drawers').put({ id: 'd1', name: '화장품', iconKey: 'cosmetics', colorKey: 'pink', order: 0, createdAt: now, updatedAt: now });
  tx.objectStore('drawers').put({ id: 'd2', name: '책', iconKey: 'books', colorKey: 'sky', order: 1, createdAt: now, updatedAt: now });
  const F = [['f1','이름','text'],['f2','구매일','date'],['f3','가격','currency'],['f4','메모','long_text'],['f5','별점','rating']];
  F.forEach(([id,name,kind],i) => tx.objectStore('fields').put({ id, drawerId: 'd1', name, kind, required: i===0, options: [], order: i }));
  for (let i = 0; i < 4; i++) tx.objectStore('records').put({ id: 'r'+i, drawerId: 'd1', values: { f1: '립 틴트 '+i, f2: '2026-10-2'+i, f3: 12000+i*1000, f4: '발색이 좋아요', f5: 4 }, createdAt: now-i, updatedAt: now-i });
  await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
})()`;

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: LOCALE });
  await ctx.addInitScript(() => { try { localStorage.setItem('drawary_onboarding_done', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept());
  await page.goto(BASE + '#/home'); await page.waitForTimeout(800);
  await page.evaluate(SEED); await page.reload(); await page.waitForTimeout(800);
  const rules = {};
  const audit = async (label) => {
    await page.addScriptTag({ content: axeSource }).catch(() => {});
    const res = await page.evaluate(() => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } }));
    for (const v of res.violations) {
      const r = (rules[v.id] ||= { impact: v.impact, help: v.help, nodes: 0, screens: {}, sample: [] });
      r.nodes += v.nodes.length; r.screens[label] = (r.screens[label] || 0) + v.nodes.length;
      for (const n of v.nodes.slice(0, 2)) if (r.sample.length < 4) r.sample.push(label + ' :: ' + n.target.join(' ') + ' :: ' + (n.any[0] || n.all[0] || n.none[0] || {}).message);
    }
  };
  for (const route of ROUTES) {
    await page.goto(BASE + '#/' + route); await page.waitForTimeout(500);
    await audit(route);
  }
  // Open a drawer, then its screens.
  await page.goto(BASE + '#/home'); await page.waitForTimeout(500);
  await page.getByText('화장품').first().click(); await page.waitForTimeout(500);
  await audit('drawer-detail');
  await page.getByText('립 틴트 0').first().click().catch(() => {}); await page.waitForTimeout(500);
  await audit('record-detail');
  await browser.close();
  const out = Object.entries(rules).sort((a, b) => b[1].nodes - a[1].nodes);
  for (const [id, r] of out) {
    console.log(`\n[${r.impact}] ${id} — ${r.help} — ${r.nodes} nodes on ${Object.keys(r.screens).length} screens`);
    console.log('  screens: ' + Object.entries(r.screens).map(([s, n]) => s + '(' + n + ')').join(', '));
    r.sample.forEach((s) => console.log('  e.g. ' + s));
  }
  if (!out.length) console.log('no violations');
})();
