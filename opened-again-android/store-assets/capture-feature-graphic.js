// Renders capture-feature-graphic.html once per locale into
// feature-graphic-1024x500-<locale>.png. Re-run after editing LOCALES below.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const LOCALES = {
  ko: { brand: 'Howling Creative Studio', title: '또 열었네?', tagline: '오늘 하루,<br>사건 발생' },
  ja: { brand: 'Howling Creative Studio', title: 'また開いた？', tagline: '本日、<br>事件発生' },
};

const template = fs.readFileSync(path.resolve(__dirname, 'capture-feature-graphic.html'), 'utf8');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader'] });
  for (const [locale, t] of Object.entries(LOCALES)) {
    const html = template
      .replace('{{BRAND}}', t.brand)
      .replace('{{TITLE}}', t.title)
      .replace('{{TAGLINE}}', t.tagline);
    const tmpFile = path.resolve(__dirname, `.tmp-feature-graphic-${locale}.html`);
    fs.writeFileSync(tmpFile, html);

    const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });
    await page.goto('file://' + tmpFile);
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.resolve(__dirname, `feature-graphic-1024x500-${locale}.png`) });
    await page.close();
    fs.unlinkSync(tmpFile);
  }
  await browser.close();
  console.log('done');
})();
