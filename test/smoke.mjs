// Smoke test for the aesthetics studio. Needs the repo server running
// (scripts/serve.sh) and playwright. Run from the repo root:
//   node aesthetics/test/smoke.mjs
// Every value in the printed summary should be truthy and `errors` should be [].
// One screenshot per aesthetic lands in aesthetics/test/shots/ — look at them:
// seven aesthetics through one preview is the claim this thing makes.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';

const URL = process.env.AES_URL || 'http://127.0.0.1:8010/aesthetics/index.html';
const CHROME = process.env.ACT_CHROME;   // e.g. /opt/pw-browsers/chromium
mkdirSync(new globalThis.URL('./shots', import.meta.url).pathname, { recursive: true });

const index = JSON.parse(readFileSync(new globalThis.URL('../library/index.json', import.meta.url), 'utf8'));

(async () => {
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 })).newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
  const shot = async (n) => { await page.waitForTimeout(250); await page.screenshot({ path: `aesthetics/test/shots/${n}.png` }); };

  await page.goto(URL);
  await page.waitForTimeout(600);

  // — every library file loads and lists —
  const listed = await page.locator('#list .who').count();

  // — each aesthetic paints the preview differently; screenshot each one —
  const accents = [];
  for (const id of index) {
    await page.click(`[data-id="${id}"]`);
    await page.waitForTimeout(250);
    accents.push(await page.evaluate(() =>
      getComputedStyle(document.querySelector('.pv-primary')).backgroundColor));
    await shot(id);
  }
  const allDiffer = new Set(accents).size === index.length;

  // — the after-dark toggle shows only where a dark set exists, and repaints —
  await page.click('[data-id="victoria"]');
  const darkShown = await page.locator('#darkbtn:visible').count() === 1;
  const bgLight = await page.evaluate(() => getComputedStyle(document.querySelector('.pv-card')).backgroundColor);
  await page.click('#darkbtn');
  const bgDark = await page.evaluate(() => getComputedStyle(document.querySelector('.pv-card')).backgroundColor);
  await shot('victoria-dark');
  await page.click('#darkbtn');
  await page.click('[data-id="aeros"]');
  const darkHiddenOnAeros = await page.locator('#darkbtn:visible').count() === 0;

  // — an edit forks a working copy, repaints live, and revert drops it —
  await page.click('[data-id="victoria"]');
  await page.evaluate(() => document.querySelectorAll('details.sec').forEach((d) => { d.open = true; }));
  const accentBox = page.locator('input.hex[data-path="color.roles.accent"]');
  await accentBox.fill('#FF0000');
  await page.waitForTimeout(200);
  const editedAccent = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.pv-primary')).backgroundColor);
  const editFlagged = (await page.locator('[data-id="victoria"] .who-tags').innerText()).includes('edited');
  const editSurvives = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('aestheticsStudio.v1')).edits.victoria.color.roles.accent === '#FF0000');
  page.once('dialog', (d) => d.accept());
  await page.click('#revert');
  await page.waitForTimeout(300);
  const reverted = await accentBox.inputValue() === '#A9793F';

  // — the three exports say what they are —
  const guide = await page.locator('#out').inputValue();
  const guideOk = guide.startsWith('# Victoria') && guide.includes('## Philosophy') && guide.includes('--victoria-accent');
  await page.click('[data-tab="json"]');
  const json = JSON.parse(await page.locator('#out').inputValue());
  const jsonOk = json.format === 'aesthetic/1' && json.id === 'victoria';
  await page.click('[data-tab="css"]');
  const cssOk = (await page.locator('#out').inputValue()).includes('--victoria-p-claret: #8E3B38;');

  // — a new aesthetic is born blank and editable —
  await page.click('[data-act="new"]');
  await page.waitForTimeout(200);
  const born = await page.locator('#title').innerText() === 'Untitled';

  const summary = { listed: listed === index.length, allDiffer, darkShown,
    darkRepaints: bgLight !== bgDark, darkHiddenOnAeros,
    editRepaints: editedAccent === 'rgb(255, 0, 0)', editFlagged, editSurvives,
    reverted, guideOk, jsonOk, cssOk, born, errors: errs };
  console.log(JSON.stringify(summary, null, 2));
  await browser.close();
  const bad = Object.entries(summary).filter(([k, v]) => k !== 'errors' && !v).map(([k]) => k);
  if (bad.length || errs.length) { console.error('FAIL:', bad.join(', ') || errs[0]); process.exit(1); }
  console.log('aesthetics studio smoke: all good');
})();
