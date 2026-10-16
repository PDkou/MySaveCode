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
const context = await browser.newContext({ viewport: { width:390, height:844 }, deviceScaleFactor:1, reducedMotion:'reduce' });
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
      visibleRoute:document.querySelector('[data-route]')?.getAttribute('data-route') ?? null
    }));
    const broken = check.images.filter(i => !i.ok);
    report.routes.push({route, status:response?.status() ?? null, visibleRoute:check.visibleRoute, textLength:check.htmlLength, brokenImages:broken, errors});
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
 const ok = !item.fatal && item.status===200 && !(item.brokenImages?.length) && !(item.errors?.length) && item.textLength>0;
 lines.push(`| ${item.route} | ${ok?'PASS':'REVIEW'} | ${item.brokenImages?.length??'—'} | ${item.errors?.length??'—'} |`);
}
writeFileSync(join(output,'report.md'),lines.join('\n')+'\n');
const bad=report.routes.filter(item => item.fatal || item.status !==200 || item.brokenImages?.length || item.errors?.length || item.textLength===0);
console.log(`Captured ${report.routes.length} React routes. Issues: ${bad.length}. Reports at ${output}/`);
if (bad.length) process.exitCode=1;
