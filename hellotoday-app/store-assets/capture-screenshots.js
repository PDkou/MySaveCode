// Captures Play Store listing screenshots by driving the real
// app/src/main/assets/index.html in headless Chromium (same page the app
// itself loads, not a mockup), once per store listing language this app
// maintains full copy for (see PLAY_CONSOLE_LAUNCH.md -- default language
// is English as of 2026-09-04, with Korean and Japanese as additional
// translations).
//
// This sandbox has no Korean/Japanese-capable system font installed, unlike
// a real device or Android Studio's emulator, so Google Fonts is injected
// here purely for rendering these screenshots -- the shipped app itself is
// untouched and keeps relying on the OS's own fonts.
//
// Run: NODE_PATH=/opt/node22/lib/node_modules PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium \
//        node store-assets/capture-screenshots.js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const day = 86400000;

// state.settings.language (not the browser's navigator.language/Playwright
// context locale) is what actually drives which copy index.html's l()
// helper renders, so switching locales mid-session is just a matter of
// setting that field and re-rendering -- no page reload or separate
// browser context needed.
const LOCALES = {
  en: {
    outDir: 'screenshots-en',
    googleFont: { family: 'Noto+Sans:wght@400;500;700|Noto+Serif:wght@500;600;700' },
    people: [
      { name: 'Mom', relation: 'Family', memo: 'She mentioned going to the hospital together next week' },
      { name: 'Alex', relation: 'Friend', memo: '' }
    ]
  },
  ko: {
    outDir: 'screenshots',
    googleFont: { family: 'Noto+Sans+KR:wght@400;500;700|Noto+Serif+KR:wght@500;600;700' },
    people: [
      { name: '엄마', relation: '가족', memo: '다음 주에 병원 같이 가기로 했다고 하셨음' },
      { name: '민수', relation: '친구', memo: '' }
    ]
  },
  ja: {
    outDir: 'screenshots-ja',
    googleFont: { family: 'Noto+Sans+JP:wght@400;500;700|Noto+Serif+JP:wght@500;600;700' },
    people: [
      { name: 'お母さん', relation: '家族', memo: '来週、病院に一緒に行くことになったと話していた' },
      { name: 'ミンス', relation: '友人', memo: '' }
    ]
  }
};

// Chromium refuses to load a cross-origin stylesheet into a file:// page
// (Playwright's addStyleTag({url}) fails there with an opaque "Event"
// error), so the font is fetched here in Node and inlined as data: URIs
// instead -- no network request happens inside the page at all.
async function fetchInlinedGoogleFontCss(familySpec) {
  const families = familySpec.split('|').map(f => `family=${f}`).join('&');
  const url = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  const cssRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
  let css = await cssRes.text();
  const urls = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(m => m[1]);
  for (const fontUrl of urls) {
    const bytes = Buffer.from(await (await fetch(fontUrl)).arrayBuffer());
    css = css.split(fontUrl).join(`data:font/woff2;base64,${bytes.toString('base64')}`);
  }
  return css;
}

function fontOverride(code) {
  const sans = { en: 'Noto Sans', ko: 'Noto Sans KR', ja: 'Noto Sans JP' }[code];
  const serif = { en: 'Noto Serif', ko: 'Noto Serif KR', ja: 'Noto Serif JP' }[code];
  return `
    html, body, button, input, select, textarea { font-family: '${sans}', sans-serif !important; }
    .brand, .hero, .quote, .log .memo, .tutorial h1 { font-family: '${serif}', serif !important; }
  `;
}

async function shot(page, outDir, file, mutate, arg) {
  await page.evaluate(mutate, arg);
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(outDir, file) });
  console.log('captured', path.join(outDir, file));
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    // The page needs zero real network once its fonts are inlined below --
    // pointing the browser at a proxy port nothing listens on makes any
    // stray Chromium background request (Gaia checkin, captive-portal
    // probe, etc.) fail instantly instead of hanging on a slow round-trip
    // through the sandbox's proxy (this bit us building the feature
    // graphics in this same session).
    proxy: { server: 'http://127.0.0.1:1' }
  });
  // 360x640 @ deviceScaleFactor 3 -> 1080x1920 PNG, well within Play's
  // phone-screenshot bounds (320-3840px per side, max 2:1 aspect ratio).
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 });
  page.on('pageerror', e => console.error('PAGEERROR:', String(e)));

  await page.goto('file://' + path.join(__dirname, '..', 'app/src/main/assets/index.html'));

  for (const [code, locale] of Object.entries(LOCALES)) {
    const outDir = path.join(__dirname, locale.outDir);
    fs.mkdirSync(outDir, { recursive: true });

    const fontCss = await fetchInlinedGoogleFontCss(locale.googleFont.family);
    const fontStyleHandle = await page.addStyleTag({ content: fontCss });
    const overrideStyleHandle = await page.addStyleTag({ content: fontOverride(code) });
    await page.waitForTimeout(300); // fonts are already inline; just let layout settle

    const [p1, p2] = locale.people;

    // Onboarding sequence -- these three tutorial screens already carry the
    // app's own pitch copy, so they double as the first three store shots.
    await shot(page, outDir, '01-onboarding-add.png', (lang) => {
      state.settings.language = lang;
      state.settings.tutorialDone = false;
      tutorialStep = 0;
      render();
    }, code);
    await shot(page, outDir, '02-onboarding-remind.png', () => { tutorialStep = 1; render(); });
    await shot(page, outDir, '03-onboarding-record.png', () => { tutorialStep = 2; render(); });

    // Today: a reminder that's due, with a memo carried over from last time.
    // coachDone is set alongside tutorialDone -- otherwise maybeShowCoachmark()
    // covers the "I reached out" button with a one-time tooltip, which is
    // onboarding chrome, not something that belongs in a store screenshot.
    await shot(page, outDir, '04-today-due.png', (people) => {
      state.settings.tutorialDone = true;
      state.settings.coachDone = true;
      state.people = [{
        id: 1, name: people[0].name, relation: people[0].relation, reminderMode: 'random',
        interval: 21, minDays: 14, maxDays: 28,
        nextAt: now() - day, lastAt: now() - 20 * day,
        memo: people[0].memo, topic: seeds[0]
      }, {
        id: 2, name: people[1].name, relation: people[1].relation, reminderMode: 'fixed',
        interval: 30, minDays: 14, maxDays: 28,
        nextAt: now() + 6 * day, lastAt: now() - 24 * day,
        memo: people[1].memo, topic: seeds[1]
      }];
      focusedPersonId = 1;
      tab = 'today'; overlay = null;
      render();
    }, [p1, p2]);

    // People: the registered list, showing the free-tier count.
    await shot(page, outDir, '05-people-list.png', () => { tab = 'people'; render(); });

    // Premium upsell sheet -- shown once the free cap (2) is hit.
    await shot(page, outDir, '06-premium.png', () => {
      overlay = { type: 'premium' };
      render();
    });

    // Settings: theme picker.
    await shot(page, outDir, '07-settings-theme.png', () => {
      overlay = null; tab = 'settings';
      render();
    });

    await fontStyleHandle.evaluate(node => node.remove());
    await overrideStyleHandle.evaluate(node => node.remove());
  }

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
