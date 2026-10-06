import { chromium } from 'playwright';

const BASE_URL = process.env.DRAWARY_PREVIEW_URL || 'http://127.0.0.1:4173';

const cases = [
  { browserLocale: 'ko-KR', expectedLang: 'ko', nav: ['홈', '검색', '설정'] },
  { browserLocale: 'ja-JP', expectedLang: 'ja', nav: ['ホーム', '検索', '設定'] },
  { browserLocale: 'en-US', expectedLang: 'en', nav: ['Home', 'Search', 'Settings'] },
];

const browser = await chromium.launch({ headless: true });

async function openReadyPage(context) {
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.bottom-nav', { timeout: 10000 });
  return page;
}

try {
  for (const testCase of cases) {
    const context = await browser.newContext({ locale: testCase.browserLocale });
    const page = await openReadyPage(context);

    const lang = await page.locator('html').getAttribute('lang');
    if (lang !== testCase.expectedLang) {
      throw new Error(`initial locale mismatch for ${testCase.browserLocale}: expected html lang ${testCase.expectedLang}, got ${lang}`);
    }

    for (const label of testCase.nav) {
      await page.getByRole('button', { name: label, exact: true }).waitFor({ state: 'visible' });
    }

    await context.close();
  }

  const context = await browser.newContext({ locale: 'en-US' });
  let page = await openReadyPage(context);

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('heading', { name: 'Settings', exact: true }).waitFor();

  await page.getByRole('button', { name: '日本語', exact: true }).click();
  await page.getByRole('heading', { name: '設定', exact: true }).waitFor();

  const switchedLang = await page.locator('html').getAttribute('lang');
  if (switchedLang !== 'ja') {
    throw new Error(`language switch did not update html lang: expected ja, got ${switchedLang}`);
  }

  const savedLocale = await page.evaluate(() => localStorage.getItem('drawary.locale'));
  if (savedLocale !== 'ja') {
    throw new Error(`language switch did not persist localStorage: expected ja, got ${savedLocale}`);
  }

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.bottom-nav', { timeout: 10000 });
  await page.getByRole('button', { name: '設定', exact: true }).click();
  await page.getByRole('heading', { name: '設定', exact: true }).waitFor();

  const reloadedLang = await page.locator('html').getAttribute('lang');
  if (reloadedLang !== 'ja') {
    throw new Error(`saved locale was not restored after reload: expected ja, got ${reloadedLang}`);
  }

  await context.close();
  console.log('Drawary runtime i18n verification passed.');
} finally {
  await browser.close();
}
