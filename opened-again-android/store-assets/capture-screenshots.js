// Captures this app's actual Play Store screenshots (real screens, not
// mockups) by driving index.html headlessly through preview mode's
// built-in demo() dataset, once per locale in LOCALES below. Re-run after
// data/copy changes to regenerate screenshots-<locale>/*.png.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const LOCALES = ['ko', 'ja'];

async function captureLocale(browser, locale) {
  const OUT = path.resolve(__dirname, locale === 'ko' ? 'screenshots' : `screenshots-${locale}`);
  fs.mkdirSync(OUT, { recursive: true });

  // 393x699 CSS viewport at ~2.75x device scale renders like a real phone (1080x1920 output),
  // matching the exact resolution the sibling app's store screenshots already used.
  const page = await browser.newPage({ viewport: { width: 393, height: 699 }, deviceScaleFactor: 2.748 });

  const url = 'file://' + path.resolve(__dirname, '../app/src/main/assets/index.html') + '?onboarding=0&preview=1';
  await page.goto(url);
  await page.waitForTimeout(300);

  // Force the UI language -- index.html defaults to navigator.language,
  // which this headless browser always reports as 'en-US' regardless of
  // the OS locale, so it has to be set explicitly via the same in-app
  // mechanism cycleLang() uses (state.settings.language) rather than via
  // browser locale emulation.
  await page.evaluate((lang) => { state.settings.language = lang; render(); }, locale);
  await page.waitForTimeout(100);

  // 1. Hero shot: force the LEGENDARY card into the daily reveal screen
  // (demo()'s cards[0] is HIDDEN by default -- LEGENDARY is the more
  // striking first impression for the store listing).
  await page.evaluate(() => {
    const legendary = state.data.report.cards.find(c => c.rarity === 'LEGENDARY');
    state.revealItem = { ...legendary, startTime: Date.now() - 1000, endTime: Date.now() };
    render();
  });
  await page.waitForTimeout(1400); // let the entrance animation settle
  await page.screenshot({ path: path.join(OUT, '01_reveal_legendary.png') });

  // 2. Home ("cases") tab: today's incident cards list.
  await page.evaluate(() => { dismissReveal(); setTab('cases'); });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, '02_home_cases.png') });

  // 3. Records tab: today's usage summary/stats.
  await page.evaluate(() => setTab('records'));
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, '03_records.png') });

  // 4. Archive tab: discovery collection progress.
  await page.evaluate(() => setTab('archive'));
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, '04_archive.png') });

  // 5. Incident detail page: open the LEGENDARY card's detail.
  await page.evaluate(() => {
    setTab('cases');
    const card = state.data.report.cards.find(c => c.rarity === 'LEGENDARY');
    if (card) { state.detailItem = card; render(); }
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, '05_detail_legendary.png') });

  await page.close();
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader'] });
  for (const locale of LOCALES) await captureLocale(browser, locale);
  await browser.close();
  console.log('done');
})();
