// Smoke test for the aesthetics studio. Needs the server running
// (scripts/serve.sh) and playwright. Run from the repo root:
//   node test/smoke.mjs
// Every value in the printed summary should be truthy and `errors` should be [].
// One screenshot per aesthetic lands in test/shots/ — look at them: seven
// aesthetics wearing the whole page is the claim this thing makes.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';

const URL = process.env.AES_URL || 'http://127.0.0.1:8020/index.html';
const CHROME = process.env.ACT_CHROME;   // e.g. /opt/pw-browsers/chromium
mkdirSync(new globalThis.URL('./shots', import.meta.url).pathname, { recursive: true });

const index = JSON.parse(readFileSync(new globalThis.URL('../library/index.json', import.meta.url), 'utf8'));

(async () => {
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 2 })).newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
  const shot = async (n) => { await page.waitForTimeout(250); await page.screenshot({ path: `test/shots/${n}.png` }); };

  await page.goto(URL);
  await page.waitForTimeout(700);

  // — every library file loads and lists —
  const listed = await page.locator('#list .who').count();

  // — the aesthetic paints the whole page: the body itself changes colour,
  //   the entrance/hover/ambient choices land as attributes on <html> —
  const bodies = [], accents = [], attrs = [];
  for (const id of index) {
    await page.click(`[data-id="${id}"]`);
    // Let the entrance finish before the shot: the last staged element starts
    // at index × stagger (up to ~800ms) and then runs its own duration.
    await page.waitForTimeout(1500);
    bodies.push(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
    accents.push(await page.evaluate(() => getComputedStyle(document.querySelector('.pv-primary')).backgroundColor));
    attrs.push(await page.evaluate(() => {
      const h = document.documentElement.dataset;
      return [h.enter, h.hover, h.ambient, h.corner, h.dividers].join('|');
    }));
    await shot(id);
  }
  const accentsDiffer = new Set(accents).size === index.length;
  const bodiesDiffer = new Set(bodies).size >= index.length - 1;  // two creams may collide
  const attrsCarry = attrs.every((x) => x.split('|').every(Boolean));
  const carcaCut = attrs[index.indexOf('carca')].includes('cut');
  const gothicTwinkles = attrs[index.indexOf('starful-gothic')].includes('twinkle');

  // — the entrance actually ran: staged elements carry .arrived —
  const arrived = await page.evaluate(() =>
    document.querySelectorAll('#demo [data-stag].arrived').length > 5);

  // — the ornament divider prints the aesthetic's glyph —
  await page.click('[data-id="victoria"]');
  await page.waitForTimeout(650);
  const ornament = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.pv-orn'), '::before').content.includes('❦'));

  // — plain room: the editor chrome goes neutral, the demo stays painted —
  const chromeBefore = await page.evaluate(() => getComputedStyle(document.querySelector('.top')).backgroundColor);
  await page.click('#plainbtn');
  await page.waitForTimeout(500);   // the chrome fades over .35s; read it settled
  const chromeAfter = await page.evaluate(() => getComputedStyle(document.querySelector('.top')).backgroundColor);
  const demoStillPainted = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.pv-primary')).backgroundColor !== 'rgb(74, 80, 88)');
  await shot('victoria-plain');
  await page.click('#plainbtn');

  // — the after-dark toggle shows only where a dark set exists, and repaints —
  const darkShown = await page.locator('#darkbtn:visible').count() === 1;
  const bgLight = await page.evaluate(() => getComputedStyle(document.querySelector('.pv-hero')).backgroundColor);
  await page.click('#darkbtn');
  const bgDark = await page.evaluate(() => getComputedStyle(document.querySelector('.pv-hero')).backgroundColor);
  await shot('victoria-dark');
  await page.click('#darkbtn');
  await page.click('[data-id="aeros"]');
  await page.waitForTimeout(400);
  const darkHiddenOnAeros = await page.locator('#darkbtn:visible').count() === 0;

  // — an edit forks a working copy, repaints live, and revert drops it —
  await page.click('[data-id="victoria"]');
  await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelectorAll('details.sec').forEach((d) => { d.open = true; }));
  const accentBox = page.locator('input.hex[data-path="color.roles.accent"]');
  await accentBox.fill('#FF0000');
  await page.waitForTimeout(200);
  const editRepaints = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.pv-primary')).backgroundColor) === 'rgb(255, 0, 0)';
  const editFlagged = (await page.locator('[data-id="victoria"] .who-tags').innerText()).includes('edited');
  page.once('dialog', (d) => d.accept());
  await page.click('#revert');
  await page.waitForTimeout(400);
  const reverted = await accentBox.inputValue() === '#A9793F';

  // — the motion controls exist and the exports carry the new tokens —
  const motionControls = await page.locator('select[data-path="motion.entrance"], select[data-path="motion.hover"], select[data-path="motion.ambient"]').count() === 3;
  const guide = await page.locator('#out').inputValue();
  const guideOk = guide.startsWith('# Victoria') && guide.includes('## Motion') && guide.includes('Entrance: fade');
  await page.click('[data-tab="css"]');
  const css = await page.locator('#out').inputValue();
  const cssOk = css.includes('--victoria-entrance: fade;') && css.includes('--victoria-ornament: "❦";');
  await page.click('[data-tab="json"]');
  const json = JSON.parse(await page.locator('#out').inputValue());
  const jsonOk = json.format === 'aesthetic/1' && json.decor.ornament === '❦' && json.motion.hover === 'lift';

  const summary = { listed: listed === index.length, accentsDiffer, bodiesDiffer,
    attrsCarry, carcaCut, gothicTwinkles, arrived, ornament,
    plainSwitches: chromeBefore !== chromeAfter, demoStillPainted,
    darkShown, darkRepaints: bgLight !== bgDark, darkHiddenOnAeros,
    editRepaints, editFlagged, reverted, motionControls, guideOk, cssOk, jsonOk,
    errors: errs };
  console.log(JSON.stringify(summary, null, 2));
  await browser.close();
  const bad = Object.entries(summary).filter(([k, v]) => k !== 'errors' && !v).map(([k]) => k);
  if (bad.length || errs.length) { console.error('FAIL:', bad.join(', ') || errs[0]); process.exit(1); }
  console.log('aesthetics studio smoke: all good');
})();
