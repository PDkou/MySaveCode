/**
 * Drawary V2 visual QA: captures actual Vite/React routes, not HTML recreations.
 * A screenshot is diagnostic evidence, NOT proof of approved-design parity.
 * The 6 locked screens are captured but this script never changes source.
 */
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const match = source.match(/const STANDALONE_ROUTES:[^=]*=\s*\[([\s\S]*?)\];/);
if (!match) throw new Error('Unable to find approved route inventory in App.tsx');
const routeNames = [...match[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
const routes = [...new Set(['home','search','stats','settings','create-drawer',...routeNames])];
const origin = process.env.DRAWARY_QA_ORIGIN || 'http://127.0.0.1:5173';
const output = process.env.DRAWARY_QA_OUTPUT || 'qa-screenshots';
mkdirSync(join(output,'screens'), { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
// Korean phone: the app starts in the phone's language, and this QA's texts are Korean.
const context = await browser.newContext({ viewport: { width:390, height:844 }, deviceScaleFactor:1, reducedMotion:'reduce', locale:'ko-KR' });
await context.addInitScript(() => { try { localStorage.setItem('drawary_onboarding_done', '1'); } catch (e) { /* ignore */ } });
const report = { source: 'actual React Vite application', size:'390x844', timestamp:new Date().toISOString(), routes: [] };
for (const route of routes) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
  try {
    const response = await page.goto(`${origin}/#/${route}`,{waitUntil:'networkidle',timeout:30000});
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images, img => img.complete ? null : new Promise(resolve => { img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});setTimeout(resolve,4000); })));
    });
    await page.screenshot({path:join(output,'screens',`${route}.png`),animations:'disabled',timeout:20000});
    const check = await page.evaluate(() => ({
      title:document.title,
      htmlLength:document.body.innerText.length,
      images:Array.from(document.images,img => ({url:img.getAttribute('src'),ok:img.complete && img.naturalWidth>0})),
      visibleRoute:document.querySelector('[data-route]')?.getAttribute('data-route') ?? null,
      newDrawerNext: (() => {
        const button=document.querySelector('.new-drawer-next');
        if (!button) return null;
        const rect=button.getBoundingClientRect();
        return { top:rect.top,bottom:rect.bottom,left:rect.left,right:rect.right };
      })()
    }));
    const broken = check.images.filter(i => !i.ok);
    // #08: approved Next CTA must remain fully inside 390x844 viewport.
    const newDrawerClipped = route==='create-drawer'
      && (!check.newDrawerNext || check.newDrawerNext.bottom>844 || check.newDrawerNext.top<0 || check.newDrawerNext.left<0 || check.newDrawerNext.right>390);
    if (newDrawerClipped) errors.push('Approved #08 Next button is clipped or missing');
    report.routes.push({route, status:response?.status() ?? null, visibleRoute:check.visibleRoute, textLength:check.htmlLength, brokenImages:broken, errors, newDrawerNext:check.newDrawerNext});

    // Capture every confirmed #05 search state with the real React handlers.
    if (route==='search') {
      // Search reads the real on-device data, which is empty in CI: put one sample item in first.
      await page.evaluate(async () => {
        const db = await new Promise((res, rej) => { const r = indexedDB.open('drawary-v2'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        const tx = db.transaction(['drawers', 'fields', 'records'], 'readwrite'); const now = Date.now();
        tx.objectStore('drawers').put({ id: 'qa-d', name: '화장품', iconKey: 'cosmetics', colorKey: 'pink', order: 0, createdAt: now, updatedAt: now });
        tx.objectStore('fields').put({ id: 'qa-f', drawerId: 'qa-d', name: '제품명', kind: 'text', required: true, options: [], order: 0 });
        tx.objectStore('records').put({ id: 'qa-r', drawerId: 'qa-d', values: { 'qa-f': '립 틴트' }, createdAt: now, updatedAt: now });
        await new Promise((res) => { tx.oncomplete = res; });
      });
      await page.reload({ waitUntil: 'networkidle' });
      const input=page.locator('.global-search-box input[type="search"]');
      if (await input.count() !== 1) {
        errors.push('Approved #05 search input missing');
      } else {
        if (await input.evaluate(el => document.activeElement===el)) {
          errors.push('Approved #05 idle state incorrectly auto-focused');
        }
        await input.fill('틴트');
        await page.screenshot({path:join(output,'screens','search-results.png'),animations:'disabled'});
        if (!(await page.locator('.global-search-result-card').count())) {
          errors.push('Approved #05 results state has no cards');
        }
        await input.fill('없는검색어');
        await page.screenshot({path:join(output,'screens','search-no-results.png'),animations:'disabled'});
        if (!(await page.getByText('검색 결과가 없어요.').count())) {
          errors.push('Approved #05 no-results state missing');
        }
      }
    }
    // Also check #08's enabled Next button, not only its disabled state.
    if (route==='create-drawer') {
      const nameInput=page.locator('#new-drawer-name');
      if (await nameInput.count()===1) {
        await nameInput.fill('화장품');
        await page.screenshot({path:join(output,'screens','create-drawer-enabled.png'),animations:'disabled'});
        if (!(await page.locator('.new-drawer-next').isEnabled())) {
          errors.push('Approved #08 valid name must enable Next');
        }
      } else {
        errors.push('Approved #08 drawer name input missing');
      }
    }
  } catch (error) {
    report.routes.push({route, fatal:String(error), errors});
  } finally {
    await page.close();
  }
}
await browser.close();
writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2));
const lines = ['# Drawary V2 actual React visual QA','','Viewport: 390×844. Screenshots are NOT final approved design comparisons.','',
'| Route | Result | Broken images | Browser errors |','|---|---|---:|---:|'];
for (const item of report.routes) {
 const ok = !item.fatal && item.status===200 && !(item.brokenImages?.length) && !(item.errors?.length) && (item.textLength>0 || item.route==='splash');
 lines.push(`| ${item.route} | ${ok?'PASS':'REVIEW'} | ${item.brokenImages?.length??'—'} | ${item.errors?.length??'—'} |`);
}
writeFileSync(join(output,'report.md'),lines.join('\n')+'\n');
const bad=report.routes.filter(item => item.fatal || item.status !==200 || item.brokenImages?.length || item.errors?.length || (item.textLength===0 && item.route!=='splash'));
console.log(`Captured ${report.routes.length} React routes. Issues: ${bad.length}. Reports at ${output}/`);
if (bad.length) process.exitCode=1;
