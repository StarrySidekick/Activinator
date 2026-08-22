// Smoke test for Activinator. Needs the server running (scripts/serve.sh) and playwright.
//   npm i playwright && scripts/serve.sh & && node test/smoke.mjs
// Every value in the printed summary should be truthy and `errors` should be [].
// Screenshots land in test/shots/ — look at them, this is a visual app.
import { chromium } from 'playwright';
const URL = process.env.ACT_URL || 'http://127.0.0.1:8010/index.html';
const CHROME = process.env.ACT_CHROME;   // e.g. /opt/pw-browsers/chromium

(async () => {
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  const ctx = await browser.newContext({ viewport:{ width:390, height:844 }, deviceScaleFactor:2,
    hasTouch:true, isMobile:true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  const shot = async n => { await page.waitForTimeout(300); await page.screenshot({ path:`test/shots/${n}.png` }); };

  await page.goto(URL);
  await page.waitForTimeout(600);
  const dealt = await page.locator('#deck .card').count();
  await shot('01-deck');

  const manifestOk = await page.evaluate(async () => {
    const j = await (await fetch('manifest.webmanifest')).json();
    return j.name === 'Activinator' && j.icons.length === 3;
  });

  // — the card flips —
  // The front is the activity and nothing else. The stamps live there too but
  // are inked on by the drag, so they are not part of what you read.
  const frontIsBare = await page.evaluate(() => {
    const f = document.querySelector('.card.top .front');
    const kids = [...f.children].filter(el => !el.classList.contains('stamp'));
    const text = kids.map(el => el.innerText.trim()).join('');
    return kids.length === 1 && kids[0].classList.contains('t') &&
           text === f.querySelector('.t').innerText.trim() &&
           !f.querySelector('.facts, .taglist, .kicker, .why, .odds, .twist, .d');
  });

  await page.locator('.card.top').click();
  await page.waitForTimeout(600);
  const flipped = await page.locator('.card.top.flip').count() === 1;
  // …and the front must not be readable through the back once it is turned.
  const frontHidden = await page.evaluate(() => {
    const f = document.querySelector('.card.top .front');
    return getComputedStyle(f).opacity === '0' || getComputedStyle(f).backfaceVisibility === 'hidden';
  });
  const backOpaque = await page.evaluate(() => {
    const b = document.querySelector('.card.top .back');
    const bg = getComputedStyle(b).backgroundColor;
    return getComputedStyle(b).opacity === '1' && !/rgba\(.*,\s*0?\.\d+\)/.test(bg);
  });
  await shot('02-back');
  // a flipped card must turn back over, which it once could not
  await page.locator('.card.top').click();
  await page.waitForTimeout(600);
  const flipsBack = await page.locator('.card.top.flip').count() === 0;

  // — a swipe right files it and the deck moves on —
  const first = await page.locator('.card.top .t').innerText();
  const box = await page.locator('.card.top').boundingBox();
  await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(box.x + box.width/2 + i*26, box.y + box.height/2 - i*3); await page.waitForTimeout(12); }
  await shot('03-mid-swipe');
  await page.mouse.up();
  await page.waitForTimeout(500);
  const listed = await page.evaluate(() => ACT.S.list.length);
  const moved  = (await page.locator('.card.top .t').innerText()) !== first;
  const learned = await page.evaluate(() => Object.keys(ACT.S.w).length > 0);

  // — undo puts the card back and takes the learning back with it —
  const wBefore = await page.evaluate(() => JSON.stringify(ACT.S.w));
  await page.click('[data-act="undo"]');
  await page.waitForTimeout(400);
  const undone = await page.evaluate(() => ACT.S.list.length === 0);
  const backAgain = (await page.locator('.card.top .t').innerText()) === first;
  const wAfter = await page.evaluate(() => JSON.stringify(ACT.S.w));
  // undo must take the learning back with it, not just the card
  const unlearned = wBefore !== wAfter && await page.evaluate(() =>
    ACT.S.swipes === 0 && Object.values(ACT.S.w).every(v => Math.abs(v) < 1e-9));

  // — pass with the button —
  await page.click('[data-act="no"]');
  await page.waitForTimeout(450);
  const passed = await page.evaluate(() => Object.values(ACT.S.seen).some(s => s.v === 'no'));

  // — the panels —
  await page.click('[data-act="ctx"]'); await page.waitForTimeout(350);
  await shot('04-context');
  await page.click('[data-act="setwho"][data-v="two"]'); await page.waitForTimeout(350);
  const ctxKept = await page.evaluate(() => ACT.S.ctx.who === 'two');
  await shot('05-context-set');
  await page.click('.panel .x'); await page.waitForTimeout(300);
  await shot('06-two-of-us');

  // — the context is a hard filter: nothing outside it may ever be dealt,
  //   twists and doubles included, however the dice fall —
  const ctxHonoured = await page.evaluate(() => {
    const was = JSON.stringify(ACT.S.ctx);
    ACT.S.ctx = { who:'two', where:'out', time:90 };
    let ok = true;
    for (let i = 0; i < 60 && ok; i++) for (const c of ACT.deal(6)) {
      const s = c.seed;
      if (c.min > 90) ok = false;
      if (s.who !== 'any' && s.who !== 'two') ok = false;
      if (s.where !== 'any' && s.where !== 'out') ok = false;
    }
    ACT.S.ctx = JSON.parse(was);
    return ok;
  });

  await page.click('[data-act="ctx"]'); await page.waitForTimeout(300);
  await page.click('[data-act="setwho"][data-v="any"]'); await page.waitForTimeout(300);
  await page.click('.panel .x'); await page.waitForTimeout(300);

  // — swipe a dozen so taste has something to show —
  for (let i = 0; i < 14; i++) { await page.click(i % 3 ? '[data-act="yes"]' : '[data-act="no"]'); await page.waitForTimeout(140); }
  await page.click('[data-act="taste"]'); await page.waitForTimeout(400);
  const bars = await page.locator('.bar').count();
  await shot('07-taste');
  await page.click('.panel .x'); await page.waitForTimeout(300);

  await page.click('[data-act="list"]'); await page.waitForTimeout(350);
  const items = await page.locator('.item').count();
  await page.locator('.item .tick').first().click(); await page.waitForTimeout(300);
  const ticked = await page.evaluate(() => ACT.S.list.some(l => l.done));
  await shot('08-list');
  await page.click('.panel .x'); await page.waitForTimeout(300);

  // — writing your own puts it in the same pool —
  await page.click('[data-act="taste"]'); await page.waitForTimeout(300);
  await page.click('[data-act="add"]'); await page.waitForTimeout(350);
  await page.fill('[data-in="t"]', 'Walk the whole canal path');
  await page.click('[data-act="dtag"][data-v="outdoors"]');
  await page.waitForTimeout(200);
  await shot('09-add');
  await page.click('[data-act="savemine"]'); await page.waitForTimeout(400);
  const mine = await page.evaluate(() => ACT.S.mine.length === 1 && ACT.pool().some(c => c.src === 'mine'));

  // — it survives a reload, and it opens with the network off —
  await page.reload(); await page.waitForTimeout(700);
  const persisted = await page.evaluate(() => ACT.S.swipes > 10 && ACT.S.mine.length === 1);
  const swReady = await page.evaluate(() => navigator.serviceWorker.ready.then(r => !!r.active).catch(() => false));
  await ctx.setOffline(true);
  await page.reload(); await page.waitForTimeout(800);
  const offline = await page.locator('#deck .card').count() > 0;
  await shot('10-offline');
  await ctx.setOffline(false);

  console.log({ dealt, manifestOk, frontIsBare, flipped, frontHidden, backOpaque, flipsBack,
    listed, moved, learned, undone, backAgain,
    unlearned, passed, ctxKept, ctxHonoured, bars, items, ticked, mine, persisted, swReady,
    offline, errors: errs });
  await browser.close();
  const ok = dealt === 3 && manifestOk && frontIsBare && flipped && frontHidden && backOpaque &&
    flipsBack && listed === 1 && moved && learned &&
    undone && backAgain && passed && ctxKept && ctxHonoured && bars > 0 && items > 0 && ticked && mine &&
    persisted && swReady && offline && !errs.length;
  process.exit(ok ? 0 : 1);
})();
