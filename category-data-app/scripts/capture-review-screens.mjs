import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const BASE_URL = process.env.DRAWARY_PREVIEW_URL || 'http://127.0.0.1:4173';
const OUT = process.env.DRAWARY_SCREENSHOT_DIR || 'review-screens';

await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  locale: 'ko-KR',
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

async function ready() {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.bottom-nav', { timeout: 10000 });
}

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}

try {
  await ready();
  await shot('01-home');

  await page.getByRole('button', { name: '설정', exact: true }).click();
  await page.getByRole('heading', { name: '설정', exact: true }).waitFor();
  await shot('02-settings');

  await page.getByRole('button', { name: '보기', exact: true }).nth(0).click();
  await page.getByRole('heading', { name: '도움말', exact: true }).waitFor();
  await shot('03-help');
  await page.getByRole('button', { name: '뒤로' }).click();
  await page.getByRole('heading', { name: '설정', exact: true }).waitFor();

  await page.getByRole('button', { name: '보기', exact: true }).nth(1).click();
  await page.getByRole('heading', { name: '정보', exact: true }).waitFor();
  await shot('04-info');
  await page.getByRole('button', { name: '뒤로' }).click();
  await page.getByRole('heading', { name: '설정', exact: true }).waitFor();

  await page.getByRole('button', { name: '보기', exact: true }).nth(2).click();
  await page.getByRole('heading', { name: '피드백', exact: true }).waitFor();
  await shot('05-feedback');

  console.log('Captured review screens:', OUT);
} finally {
  await browser.close();
}
