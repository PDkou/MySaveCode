// Renders the Play Store feature graphic (1024x500) from a standalone HTML
// template using the app's own icon and real tagline copy (see
// app/src/main/assets/index.html's translations table), then screenshots
// it. Not shipped inside the app -- store listing art only.
//
// Generates one file per store listing language (see PLAY_CONSOLE_LAUNCH.md
// -- default language is English as of 2026-09-04, with Korean and Japanese
// as additional translations). Play Console falls back to the default
// listing's graphic for any language without its own, but each of the
// three languages this app actually maintains full copy for gets a
// matching graphic rather than showing a Korean-only tagline everywhere.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname);
const ICON_PATH = path.join(__dirname, '..', 'art', 'HelloToday-icon-512.png');
const iconDataUri = 'data:image/png;base64,' + fs.readFileSync(ICON_PATH).toString('base64');

// Everything but the tagline is plain ASCII ("Hello, Today" / "HOWLING
// CREATIVE STUDIO"), which Georgia/system sans-serif already render fine --
// so only the localized tagline needs a webfont, and only for its own exact
// characters. Google's css2 API's `text=` param subsets the returned woff2
// down to just those glyphs; without it, a family like Noto Serif JP ships
// its *entire* CJK repertoire (tens of MB per weight) baked into one
// @font-face, which is what made an earlier version of this script hang --
// page.setContent() choking on an HTML string with ~100MB of inlined font
// data. A glyph a subsetted font doesn't contain still falls back to the
// next font in the family list, so this can't drop any character silently.
const LOCALES = {
  en: {
    file: 'feature-graphic-1024x500-en.png',
    heading: 'Hello,<br>Today',
    tagline: 'In life’s small gaps,<br>a small hello.',
    serifFont: "Georgia,serif",
    googleFont: null
  },
  ko: {
    file: 'feature-graphic-1024x500-ko.png',
    heading: 'Hello,<br>Today',
    tagline: '하루의 틈에,<br>작은 안부',
    serifFont: "'Noto Serif KR',Georgia,serif",
    googleFont: { family: 'Noto+Serif+KR', text: '하루의틈에작은안부' }
  },
  ja: {
    file: 'feature-graphic-1024x500-ja.png',
    heading: 'Hello,<br>Today',
    tagline: '日々のすきまに、<br>小さな安否を。',
    serifFont: "'Noto Serif JP',Georgia,serif",
    googleFont: { family: 'Noto+Serif+JP', text: '日々のすきまに、小さな安否を。' }
  }
};

const FONT_MIME = { woff2: 'font/woff2', woff: 'font/woff', truetype: 'font/ttf', opentype: 'font/otf' };

async function fetchInlinedGoogleFontCss(family, text) {
  // A subset this small (see LOCALES' comment) often comes back as a plain
  // .ttf rather than .woff2 -- match the format() hint so the data: URI's
  // MIME type is actually correct, not just assumed to be woff2.
  const url = `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}&display=swap`;
  const cssRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
  let css = await cssRes.text();
  const matches = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)\s*format\('([a-z0-9]+)'\)/g)];
  for (const [fullMatch, fontUrl, format] of matches) {
    const bytes = Buffer.from(await (await fetch(fontUrl)).arrayBuffer());
    const mime = FONT_MIME[format] || 'font/woff2';
    css = css.replace(fullMatch, `url(data:${mime};base64,${bytes.toString('base64')}) format('${format}')`);
  }
  return css;
}

const html = (fontCss, locale) => `<!doctype html><html><head><meta charset="utf-8"><style>
${fontCss || ''}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1024px;height:500px;overflow:hidden}
body{
  background:radial-gradient(620px 620px at 760px 40px, #f3e4da 0%, #f8f5ed 62%);
  font-family:sans-serif;
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
  font-family:Georgia,serif;
  font-weight:700;
  font-size:74px;
  line-height:1.05;
  letter-spacing:-.01em;
  color:#292b27;
  margin-bottom:22px;
}
p{
  font-family:${locale.serifFont};
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
    <h1>${locale.heading}</h1>
    <p>${locale.tagline}</p>
  </div>
  <div class="icon-wrap"><img src="${iconDataUri}" alt=""></div>
</body></html>`;

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ['--disable-background-networking', '--disable-component-update', '--disable-sync', '--disable-domain-reliability'],
    // This page needs zero real network once fonts are inlined below (icon
    // and fonts both end up as data: URIs) -- pointing the browser at a
    // proxy port nothing listens on makes any stray Chromium background
    // request (Gaia checkin, captive-portal probe, etc.) fail instantly
    // instead of hanging on a slow round-trip through the sandbox's proxy.
    proxy: { server: 'http://127.0.0.1:1' }
  });
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
  for (const [code, locale] of Object.entries(LOCALES)) {
    const fontCss = locale.googleFont
      ? await fetchInlinedGoogleFontCss(locale.googleFont.family, locale.googleFont.text)
      : null;
    await page.setContent(html(fontCss, locale));
    await page.waitForTimeout(200);
    const outFile = path.join(OUT_DIR, locale.file);
    await page.screenshot({ path: outFile });
    console.log('captured', code, outFile);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
