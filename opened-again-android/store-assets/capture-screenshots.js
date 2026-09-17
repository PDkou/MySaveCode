// Captures this app's actual Play Store screenshots (real screens, not
// mockups) by driving index.html headlessly through preview mode's
// built-in demo() dataset. Re-run after data/copy changes to regenerate
// screenshots/*.png with the latest content.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.resolve(__dirname, 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader'] });
  // 393x699 CSS viewport at ~2.75x device scale renders like a real phone (1080x1920 output),
  // matching the exact resolution the sibling app's store screenshots already used.
  const page = await browser.newPage({ viewport: { width: 393, height: 699 }, deviceScaleFactor: 2.748 });

  const url = 'file://' + path.resolve(__dirname, '../app/src/main/assets/index.html') + '?onboarding=0&preview=1';
  await page.goto(url);
  await page.waitForTimeout(300);

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

  await browser.close();
  console.log('done');
})();
