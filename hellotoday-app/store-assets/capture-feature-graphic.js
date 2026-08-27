// Renders the Play Store feature graphic (1024x500) from a standalone HTML
// template using the app's own icon and real tagline copy (see
// app/src/main/assets/index.html's translations table), then screenshots
// it. Not shipped inside the app -- store listing art only.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname);
const ICON_PATH = path.join(__dirname, '..', 'art', 'HelloToday-icon-512.png');
const iconDataUri = 'data:image/png;base64,' + fs.readFileSync(ICON_PATH).toString('base64');

const FONT_STYLESHEET_URL = 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@600;700&display=swap';

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

const html = (fontCss) => `<!doctype html><html><head><meta charset="utf-8"><style>
${fontCss}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1024px;height:500px;overflow:hidden}
body{
  background:radial-gradient(620px 620px at 760px 40px, #f3e4da 0%, #f8f5ed 62%);
  font-family:'Noto Sans KR',sans-serif;
  display:flex;
  align-items:center;
  padding:0 72px;
}
.copy{flex:1;min-width:0}
.eyebrow{
  font-size:14px;
  font-weight:700;
  letter-spacing:.16em;
  text-transform:uppercase;
  color:#66705b;
  margin-bottom:18px;
}
h1{
  font-family:'Noto Serif KR',Georgia,serif;
  font-weight:700;
  font-size:74px;
  line-height:1.05;
  letter-spacing:-.01em;
  color:#292b27;
  margin-bottom:22px;
}
p{
  font-family:'Noto Serif KR',Georgia,serif;
  font-size:30px;
  color:#686b63;
  line-height:1.5;
}
.icon-wrap{
  flex:none;
  width:340px;
  height:340px;
  display:flex;
  align-items:center;
  justify-content:center;
}
.icon-wrap img{
  width:300px;
  height:300px;
  border-radius:64px;
  box-shadow:0 24px 60px rgba(102,112,91,.22);
}
</style></head><body>
  <div class="copy">
    <div class="eyebrow">Howling Creative Studio</div>
    <h1>Hello,<br>Today</h1>
    <p>하루의 틈에,<br>작은 안부</p>
  </div>
  <div class="icon-wrap"><img src="${iconDataUri}" alt=""></div>
</body></html>`;

(async () => {
  const fontCss = await fetchInlinedGoogleFontCss(FONT_STYLESHEET_URL);
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined
  });
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
  await page.setContent(html(fontCss));
  await page.waitForTimeout(200);
  const outFile = path.join(OUT_DIR, 'feature-graphic-1024x500.png');
  await page.screenshot({ path: outFile });
  console.log('captured', outFile);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
