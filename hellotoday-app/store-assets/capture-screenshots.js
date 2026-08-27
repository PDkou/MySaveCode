// Captures Play Store listing screenshots by driving the real
// app/src/main/assets/index.html in headless Chromium (same page the app
// itself loads, not a mockup) with realistic Korean sample data.
//
// This sandbox has no Korean-capable system font installed, unlike a real
// device or Android Studio's emulator, so Google Fonts is injected here
// purely for rendering these screenshots -- the shipped app itself is
// untouched and keeps relying on the OS's own Noto Sans/Serif KR.
//
// Run: NODE_PATH=/opt/node22/lib/node_modules PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium \
//        node store-assets/capture-screenshots.js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, 'screenshots');
fs.mkdirSync(OUT_DIR, { recursive: true });

const FONT_STYLESHEET_URL = 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@500;600;700&display=swap';
const FONT_OVERRIDE = `
  html, body, button, input, select, textarea { font-family: 'Noto Sans KR', sans-serif !important; }
  .brand, .hero, .quote, .log .memo, .tutorial h1 { font-family: 'Noto Serif KR', serif !important; }
`;

const day = 86400000;

// Chromium refuses to load a cross-origin stylesheet into a file:// page
// (Playwright's addStyleTag({url}) fails there with an opaque "Event"
// error), so the font is fetched here in Node and inlined as data: URIs
// instead -- no network request happens inside the page at all.
async function fetchInlinedGoogleFontCss(cssUrl) {
  const cssRes = await fetch(cssUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
  let css = await cssRes.text();
  const urls = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(m => m[1]);
  for (const url of urls) {
    const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
    css = css.split(url).join(`data:font/woff2;base64,${bytes.toString('base64')}`);
  }
  return css;
}

async function shot(page, file, mutate) {
  await page.evaluate(mutate);
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT_DIR, file) });
  console.log('captured', file);
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined
  });
  // 360x640 @ deviceScaleFactor 3 -> 1080x1920 PNG, well within Play's
  // phone-screenshot bounds (320-3840px per side, max 2:1 aspect ratio).
  const page = await browser.newPage({
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 3,
    locale: 'ko-KR'
  });
  page.on('pageerror', e => console.error('PAGEERROR:', String(e)));

  const inlinedFontCss = await fetchInlinedGoogleFontCss(FONT_STYLESHEET_URL);

  await page.goto('file://' + path.join(__dirname, '..', 'app/src/main/assets/index.html'));
  await page.addStyleTag({ content: inlinedFontCss });
  await page.addStyleTag({ content: FONT_OVERRIDE });
  await page.waitForTimeout(300); // fonts are already inline; just let layout settle

  // Onboarding sequence -- these three tutorial screens already carry the
  // app's own pitch copy, so they double as the first three store shots.
  await shot(page, '01-onboarding-add.png', () => {
    state.settings.tutorialDone = false;
    tutorialStep = 0;
    render();
  });
  await shot(page, '02-onboarding-remind.png', () => { tutorialStep = 1; render(); });
  await shot(page, '03-onboarding-record.png', () => { tutorialStep = 2; render(); });

  // Today: a reminder that's due, with a memo carried over from last time.
  await shot(page, '04-today-due.png', () => {
    state.settings.tutorialDone = true;
    state.people = [{
      id: 1, name: '엄마', relation: '가족', reminderMode: 'random',
      interval: 21, minDays: 14, maxDays: 28,
      nextAt: now() - day, lastAt: now() - 20 * day,
      memo: '다음 주에 병원 같이 가기로 했다고 하셨음', topic: seeds[0]
    }, {
      id: 2, name: '민수', relation: '친구', reminderMode: 'fixed',
      interval: 30, minDays: 14, maxDays: 28,
      nextAt: now() + 6 * day, lastAt: now() - 24 * day,
      memo: '', topic: seeds[1]
    }];
    focusedPersonId = 1;
    tab = 'today'; overlay = null;
    render();
  });

  // People: the registered list, showing the free-tier count.
  await shot(page, '05-people-list.png', () => { tab = 'people'; render(); });

  // Premium upsell sheet -- shown once the free cap (2) is hit.
  await shot(page, '06-premium.png', () => {
    overlay = { type: 'premium' };
    render();
  });

  // Settings: theme picker.
  await shot(page, '07-settings-theme.png', () => {
    overlay = null; tab = 'settings';
    render();
  });

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
