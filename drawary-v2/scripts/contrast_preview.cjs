/*
 * Colour-contrast preview (changes nothing in src/). For every text colour that fails WCAG AA (4.5:1) in the audit,
 * finds the least-darker version of the SAME hue/saturation that passes on every background it appears on, writes
 * them as CSS variable overrides to <outDir>/contrast_override.css, re-audits with the override injected, and saves
 * before/after screenshots of a few screens.
 * Run:  npx vite preview --port 5301 &  NODE_PATH=<playwright+axe-core> node scripts/contrast_preview.cjs <outDir>
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = 'http://localhost:5301/';
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const ROUTES = ['home', 'search', 'stats', 'settings', 'create-drawer', 'onboarding', 'new-field', 'creation-complete', 'notification-common', 'theme-settings',
  'security-settings', 'lock-detail', 'pin-setup', 'data-management', 'backup-type', 'backup-destination', 'restore-file-picker', 'data-reset-confirm',
  'language-settings', 'help-main', 'faq', 'guide', 'info', 'feedback', 'notification-settings', 'recurrence-management', 'drawer-fields'];
const SHOTS = ['settings', 'stats', 'help-main', 'backup-type', 'language-settings', 'drawer-detail'];

const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgb2hex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const lum = (c) => { const f = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
function rgb2hsl([r, g, b]) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; const d = mx - mn;
  if (d) { s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; }
function hsl2rgb([h, s, l]) { const f = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  if (!s) return [l * 255, l * 255, l * 255]; const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255]; }
const darken = (fg, bgs, target = 4.6) => { const [h, s, l0] = rgb2hsl(hex2rgb(fg)); for (let l = l0; l > 0; l -= 0.005) { const c = hsl2rgb([h, s, l]); if (bgs.every((b) => ratio(c, hex2rgb(b)) >= target)) return rgb2hex(c); } return '#000000'; };

const SEED = `(async () => {
  const db = await new Promise((res) => { const r = indexedDB.open('drawary-v2'); r.onsuccess = () => res(r.result); });
  const tx = db.transaction(['drawers','fields','records'], 'readwrite'); const now = Date.now();
  tx.objectStore('drawers').put({ id: 'd1', name: '화장품', iconKey: 'cosmetics', colorKey: 'pink', order: 0, createdAt: now, updatedAt: now });
  tx.objectStore('drawers').put({ id: 'd2', name: '책', iconKey: 'books', colorKey: 'blue', order: 1, createdAt: now, updatedAt: now });
  [['f1','이름','text'],['f2','구매일','date'],['f3','가격','currency'],['f4','메모','long_text'],['f5','별점','rating']].forEach(([id,name,kind],i) => tx.objectStore('fields').put({ id, drawerId: 'd1', name, kind, required: i===0, options: [], order: i }));
  for (let i = 0; i < 4; i++) tx.objectStore('records').put({ id: 'r'+i, drawerId: 'd1', values: { f1: '립 틴트 '+i, f2: '2026-10-2'+i, f3: 12000+i*1000, f4: '발색이 좋아요', f5: 4 }, createdAt: now-i, updatedAt: now-i });
  await new Promise((res) => { tx.oncomplete = res; });
})()`;

async function run(browser, css, shotPrefix) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR' });
  await ctx.addInitScript(() => { try { localStorage.setItem('drawary_onboarding_done', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  await page.goto(BASE + '#/home'); await page.waitForTimeout(600); await page.evaluate(SEED); await page.reload(); await page.waitForTimeout(700);
  const pairs = {}; let total = 0;
  const audit = async (label) => {
    if (css) await page.addStyleTag({ content: css });
    await page.addScriptTag({ content: axeSource }).catch(() => {});
    const res = await page.evaluate(() => window.axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast'] } }));
    for (const v of res.violations) for (const n of v.nodes) {
      const d = (n.any[0] || {}).data || {}; if (!d.fgColor) continue; total++;
      const e = (pairs[d.fgColor] ||= { bgs: new Set(), nodes: 0 }); e.bgs.add(d.bgColor); e.nodes++;
    }
    if (shotPrefix && SHOTS.includes(label)) await page.screenshot({ path: path.join(OUT, `${shotPrefix}_${label}.png`) });
  };
  for (const r of ROUTES) { await page.goto(BASE + '#/' + r); await page.waitForTimeout(450); await audit(r); }
  await page.goto(BASE + '#/home'); await page.waitForTimeout(400);
  await page.getByText('화장품').first().click(); await page.waitForTimeout(500); await audit('drawer-detail');
  await page.getByText('립 틴트 0').first().click(); await page.waitForTimeout(500); await audit('record-detail');
  await ctx.close();
  return { pairs, total };
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const before = await run(browser, '', 'before');
  const map = {};
  for (const [fg, e] of Object.entries(before.pairs)) map[fg] = darken(fg, [...e.bgs]);
  const css = ':root{' + Object.entries(map).map(([fg, to]) => `--tc-${fg.slice(1)}:${to}`).join(';') + '}';
  fs.writeFileSync(path.join(OUT, 'contrast_override.css'), css + '\n');
  fs.writeFileSync(path.join(OUT, 'contrast_map.json'), JSON.stringify(map, null, 1));
  const after = await run(browser, css, 'after');
  console.log('failing text nodes before:', before.total, ' distinct colours:', Object.keys(before.pairs).length);
  console.log('failing text nodes after override:', after.total);
  for (const [fg, e] of Object.entries(after.pairs)) console.log('  still failing', fg, [...e.bgs].join(','), e.nodes);
  await browser.close();
})();
