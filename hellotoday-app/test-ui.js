const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined
  });
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + path.join(__dirname, 'app/src/main/assets/index.html'));
  await page.getByRole('button', { name: '다음' }).click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: '다음' }).click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: '시작하기' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '사람 등록' }).click();
  if ((await page.locator('#preminderMode').inputValue()) !== 'random') throw new Error('new person does not default to random reminders');
  await page.locator('#pname').fill('엄마');
  await page.locator('#prelation').fill('가족');
  await page.getByRole('button', { name: '저장' }).click();
  await page.getByRole('button', { name: '연락했어요' }).click();
  await page.locator('#cmemo').fill('다음 주 병원 방문 예정');
  await page.getByRole('button', { name: '기록하기' }).click();
  await page.getByRole('button', { name: '오늘' }).click();
  if (!(await page.getByText('지난번에 남긴 메모').isVisible())) throw new Error('memo was not carried to the next reminder');
  if (!(await page.getByRole('button', { name: '내일 다시' }).isVisible())) throw new Error('tomorrow button is missing');
  if (!(await page.getByRole('button', { name: '날짜 변경' }).isVisible())) throw new Error('change-date button is missing');
  await page.screenshot({ path: '/tmp/hello-today-phone.png', fullPage: false });
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('UI flow: tutorial fades → add → complete → memo → snooze buttons, OK');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
