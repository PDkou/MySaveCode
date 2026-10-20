/*
 * Store screenshots, step 1: real captures of the compiled app (npm run build && npx vite preview --port 5301) with
 * clearly-sample content, one set per language, plus the caption overlay (title + subtitle from
 * release/store/locale_copy.json, placed on the bars of the approved empty phone frames).
 * Step 2 (compose.py) puts them into the frames. Usage: NODE_PATH=<playwright> node capture.cjs <outDir> [baseUrl]
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2]; const BASE = process.argv[3] || 'http://localhost:5301/';
const COPY = JSON.parse(fs.readFileSync(path.join(__dirname, '../../release/store/locale_copy.json'), 'utf8'));
fs.mkdirSync(OUT, { recursive: true });

// Sample content in each language (product names are the ones in the approved design mockups).
const L = {
  KR: { locale: 'ko-KR', drawers: ['화장품', '책', '여행', '식물', '선물', '문서'],
    fields: ['제품명', '브랜드', '구매일', '가격', '별점', '메모'], memo: '발색이 자연스럽고 지속력이 좋아요.',
    items: [['립 틴트', '롬앤 쥬시래스팅 틴트', '2024-03-12'], ['쿠션 파운데이션', '클리오 킬커버 쿠션', '2024-02-28'], ['아이섀도우 팔레트', '데이지크 섀도우 팔레트', '2024-01-20'], ['향수', '샤넬 코코 마드모아젤', '2023-12-10']],
    query: '발색', newName: '화장품', home: '화장품 서랍', other: '책 서랍' },
  JP: { locale: 'ja-JP', drawers: ['コスメ', '本', '旅行', '植物', 'ギフト', '書類'],
    fields: ['商品名', 'ブランド', '購入日', '価格', '評価', 'メモ'], memo: '発色が自然で、持ちも良いです。',
    items: [['リップティント', 'ロムアンド ジューシーラスティングティント', '2024-03-12'], ['クッションファンデ', 'クリオ キルカバー クッション', '2024-02-28'], ['アイシャドウパレット', 'デイジーク シャドウパレット', '2024-01-20'], ['香水', 'シャネル ココ マドモアゼル', '2023-12-10']],
    query: '発色', newName: 'コスメ' },
  EN: { locale: 'en-US', drawers: ['Cosmetics', 'Books', 'Travel', 'Plants', 'Gifts', 'Documents'],
    fields: ['Product', 'Brand', 'Bought on', 'Price', 'Rating', 'Notes'], memo: 'Natural colour and it lasts all day.',
    items: [['Lip tint', 'rom&nd Juicy Lasting Tint', '2024-03-12'], ['Cushion foundation', 'Clio Kill Cover Cushion', '2024-02-28'], ['Eyeshadow palette', 'Dasique Shadow Palette', '2024-01-20'], ['Perfume', 'Chanel Coco Mademoiselle', '2023-12-10']],
    query: 'colour', newName: 'Cosmetics' },
};
const STYLE = [['cosmetics', 'pink'], ['books', 'blue'], ['travel', 'yellow'], ['plants', 'green'], ['gifts', 'peach'], ['documents', 'lavender']];
const COUNTS = [4, 12, 6, 8, 3, 5];
const PHOTOS = ['sample_lip', 'sample_cushion', 'sample_palette', 'sample_perfume'];

const seed = async ({ c: { drawers, fields, memo, items }, STYLE, COUNTS, PHOTOS }) => {
  const db = await new Promise((res, rej) => { const r = indexedDB.open('drawary-v2'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const blobs = await Promise.all(PHOTOS.map(async (p) => (await fetch(`/fixtures/${p}.webp`)).blob()));
  const tx = db.transaction(['drawers', 'fields', 'records', 'photos'], 'readwrite');
  const now = Date.now();
  drawers.forEach((name, i) => {
    tx.objectStore('drawers').put({ id: 'd' + i, name, iconKey: STYLE[i][0], colorKey: STYLE[i][1], order: i, createdAt: now, updatedAt: now });
    const kinds = ['text', 'text', 'date', 'currency', 'rating', 'long_text'];
    fields.forEach((f, k) => tx.objectStore('fields').put({ id: `f${i}_${k}`, drawerId: 'd' + i, name: f, kind: kinds[k], required: k === 0, options: [], order: k }));
    for (let r = 0; r < COUNTS[i]; r++) {
      const base = i === 0 && r < 4 ? items[r] : [`${name} ${r + 1}`, '', `2024-0${1 + (r % 9)}-1${r % 9}`];
      const values = { [`f${i}_0`]: base[0], [`f${i}_1`]: base[1], [`f${i}_2`]: base[2], [`f${i}_3`]: 12000 + r * 3500, [`f${i}_4`]: 4, [`f${i}_5`]: memo };
      const id = `r${i}_${r}`;
      tx.objectStore('records').put({ id, drawerId: 'd' + i, values, createdAt: now - r * 1000, updatedAt: now - r * 1000 });
      if (i === 0 && r < 4) tx.objectStore('photos').put({ recordId: id, photos: [blobs[r]] });
    }
  });
  await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
};

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  // The frames' phone screen is 573 x 1131 of a 941 x 1672 canvas; the final image is 1080 x 1920.
  const W = 390, H = Math.round(390 * 1131 / 573), FINAL = 1080 / 941, DSF = (573 * FINAL) / 390;
  for (const [lang, c] of Object.entries(L)) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DSF, locale: c.locale });
    await ctx.addInitScript(() => { try { localStorage.setItem('drawary_onboarding_done', '1'); } catch (e) {} });
    const p = await ctx.newPage();
    await p.goto(BASE + '#/home'); await p.waitForTimeout(800);
    await p.evaluate(seed, { c, STYLE, COUNTS, PHOTOS }); await p.reload(); await p.waitForTimeout(1000);
    const shot = async (name) => { await p.waitForTimeout(500); await p.screenshot({ path: path.join(OUT, `${lang}_${name}.png`) }); };
    await shot('A');                                                       // home with the drawers
    await p.goto(BASE + '#/create-drawer'); await p.waitForTimeout(500);   // making a drawer: name, icon, colour
    await p.locator('input').first().fill(c.newName); await shot('B');
    await p.goto(BASE + '#/search'); await p.waitForTimeout(500);          // search results
    await p.locator('input[type=search]').fill(c.query); await shot('C');
    await p.goto(BASE + '#/home'); await p.waitForTimeout(500);            // a drawer with photos
    await p.locator('button[aria-label$="' + (lang === 'KR' ? '서랍' : lang === 'JP' ? '' : '') + '"]').first().click().catch(() => {});
    await shot('D');
    await p.goto(BASE + '#/data-management'); await shot('E');             // backup / lock: staying in control
    await ctx.close();
  }
  // Captions: transparent 1080 x 1920 overlays, text centred on the bars of the frames.
  const page = await (await browser.newContext({ viewport: { width: 1080, height: 1920 } })).newPage();
  for (const lang of Object.keys(L)) for (const s of 'ABCDE') {
    const ri = COPY.render_info[`${lang}_${s}`];
    const box = (r, color, weight) => { const [x0, y0, x1, y1] = r.bbox; return `<div style="position:absolute;left:${x0 * FINAL}px;top:${y0 * FINAL}px;width:${(x1 - x0) * FINAL}px;height:${(y1 - y0) * FINAL}px;display:flex;align-items:center;justify-content:center;font:${weight} ${r.font_size * FINAL}px 'Noto Sans KR','Noto Sans JP',sans-serif;color:${color};white-space:nowrap;letter-spacing:-0.01em">${ri === undefined ? '' : ''}%T%</div>`; };
    const html = `<!doctype html><meta charset=utf-8><link rel=stylesheet href="${BASE}fonts/noto-sans-kr/fonts.css"><link rel=stylesheet href="${BASE}fonts/noto-sans-jp/fonts.css"><body style="margin:0;background:transparent;position:relative;width:1080px;height:1920px">`
      + box(ri.title_render, '#4a33b0', 800).replace('%T%', ri.title) + box(ri.subtitle_render, '#6a5bb0', 600).replace('%T%', ri.subtitle);
    await page.route('**/__caption.html', (r) => r.fulfill({ contentType: 'text/html', body: html }));
    await page.goto(BASE + '__caption.html'); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, `${lang}_${s}_caption.png`), omitBackground: true });
    await page.unroute('**/__caption.html');
  }
  await browser.close();
})();
