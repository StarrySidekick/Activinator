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
  // The dock sleeps, so pressing one of its marks means waking it first — which
  // is what a finger does by touching the screen at all.
  const dock = async (sel) => { await page.evaluate(() => ACT.wake()); await page.click(sel); };

  await page.goto(URL);
  await page.waitForTimeout(700);
  const dealt = await page.locator('#deck .card').count();
  await shot('01-deck');

  const manifestOk = await page.evaluate(async () => {
    const j = await (await fetch('manifest.webmanifest')).json();
    return j.name === 'Activinator' && j.icons.length === 3;
  });

  // — the card fills the screen. The top card is the LAST in the DOM, because
  //   the hand is painted back to front; the first one is scaled down behind it. —
  const fullBleed = await page.evaluate(() => {
    const r = document.querySelector('.card.top').getBoundingClientRect();
    return Math.round(r.width) === innerWidth && Math.round(r.height) === innerHeight;
  });

  // — the front is emblems and the activity, and nothing else. A definition
  //   card may also carry its meaning and a speak button, but those live
  //   inside the word group; nothing from the back leaks forward. —
  const frontIsBare = await page.evaluate(() => {
    const f = document.querySelector('.card.top .front');
    const kids = [...f.children].filter(el => !el.classList.contains('stamp'));
    const word = kids[1];
    return kids.length === 2 && kids[0].classList.contains('marks') &&
           word.classList.contains('word') && word.firstElementChild.classList.contains('t') &&
           [...word.children].every(el => el.matches('.t, .def, .speak')) &&
           !f.querySelector('.taglist, .kicker, .why, .odds, .facts');
  });
  const emblems = await page.locator('.card.top .marks .mark').count();

  // — flip: the front must not be readable through the back, and it must turn back —
  await page.locator('.card.top').click();
  await page.waitForTimeout(600);
  const flipped = await page.locator('.card.top.flip').count() === 1;
  const frontHidden = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.card.top .front')).opacity === '0');
  await shot('02-back');
  await page.locator('.card.top').click();
  await page.waitForTimeout(600);
  const flipsBack = await page.locator('.card.top.flip').count() === 0;

  // — a swipe right is a like, and it moves the deck on —
  const first = await page.locator('.card.top .t').innerText();
  const firstId = await page.evaluate(() => ACT.S && document.querySelector('.card.top').dataset.key);
  const box = await page.locator('.card.top').boundingBox();
  await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(box.x + box.width/2 + i*26, box.y + box.height/2 - i*3); await page.waitForTimeout(12); }
  await shot('03-mid-swipe');
  await page.mouse.up();
  await page.waitForTimeout(500);
  const liked = await page.evaluate(() => Object.values(ACT.S.seen).some(s => s.v === 'like'));
  const moved = (await page.locator('.card.top .t').innerText()) !== first;
  const learned = await page.evaluate(() => Object.keys(ACT.S.w).length > 0);

  // — undo takes the learning back with it, not just the card —
  const wBefore = await page.evaluate(() => JSON.stringify(ACT.S.w));
  await dock('[data-act="undo"]');
  await page.waitForTimeout(400);
  const undone = await page.evaluate(() => Object.keys(ACT.S.seen).length === 0);
  const backAgain = (await page.locator('.card.top .t').innerText()) === first;
  const unlearned = wBefore !== '{}' && await page.evaluate(() =>
    ACT.S.swipes === 0 && Object.values(ACT.S.w).every(v => Math.abs(v) < 1e-9));

  // — a swipe up is not a verdict: it passes the card on and teaches nothing —
  const skipped = await page.evaluate(async () => {
    const before = ACT.S.swipes, w = JSON.stringify(ACT.S.w);
    const t = document.querySelector('.card.top .t').innerText;
    ACT.say('skip');
    await new Promise(r => setTimeout(r, 420));
    return ACT.S.swipes === before && JSON.stringify(ACT.S.w) === w &&
           Object.values(ACT.S.seen).some(s => s.v === 'skip') &&
           document.querySelector('.card.top .t').innerText !== t;
  });

  // — nothing leaves the pool. Dislike everything and the deck still deals;
  //   only "never again" takes something out. —
  const poolIsForever = await page.evaluate(() => {
    const id = ACT.pool()[0].id;
    for (const c of ACT.pool()) ACT.S.seen[c.id] = { v:'dislike', at:new Date().toISOString() };
    const stillDeals = ACT.deal(3).length === 3;
    ACT.S.seen[id] = { v:'never', at:new Date().toISOString() };
    const goneForGood = !ACT.deal(400).some(c => c.id === id);
    ACT.S.seen = {}; ACT.redeal();
    return stillDeals && goneForGood;
  });

  // — the context is a hard filter, and it is the same tags the cards carry —
  const ctxHonoured = await page.evaluate(() => {
    const was = JSON.stringify(ACT.S.ctx);
    ACT.S.ctx = { who:'partner', where:'outdoors', time:'medium' };
    const WHO = ['solo','partner','friends','newpeople'];
    let ok = true;
    for (let i = 0; i < 50 && ok; i++) for (const c of ACT.deal(6)) {
      const named = WHO.filter(t => c.tags.includes(t));
      if (named.length && !named.includes('partner')) ok = false;
      if (!c.tags.includes('outdoors') && !c.tags.includes('anywhere')) ok = false;
      if (c.tags.includes('long') || c.tags.includes('allday')) ok = false;
    }
    ACT.S.ctx = JSON.parse(was); ACT.redeal();
    return ok;
  });

  // — one button per corner, and none of them over the middle of the card —
  const corners = await page.evaluate(() => {
    const at = (sel) => { const r = document.querySelector(sel).getBoundingClientRect();
      return [r.left + r.width/2 < innerWidth/2 ? 'L' : 'R', r.top + r.height/2 < innerHeight/2 ? 'T' : 'B'].join(''); };
    const seen = { menu:at('.dock .menu'), browse:at('.dock .browse'),
                   undo:at('.dock .undo'), add:at('.dock .add') };
    return new Set(Object.values(seen)).size === 4 ? seen : null;
  });

  // — a pack switched off leaves the pool; switched back on it returns, and
  //   what you said about its activities was never touched —
  const packs = await page.evaluate(() => {
    const { PACKS } = ACT;
    const core = PACKS.find(p => p.id === 'core');
    const before = ACT.pool().length;
    ACT.S.packs.core = false;
    const off = ACT.pool().length;
    ACT.S.packs.core = true;
    const back = ACT.pool().length;
    // Every pack ships switched on now, so this switches one off to have
    // something to switch back on.
    const other = PACKS.find(p => p.id !== 'core');
    ACT.S.packs[other.id] = false;
    const without = ACT.pool().length;
    ACT.S.packs[other.id] = true;
    const withExtra = ACT.pool().length;
    ACT.S.packs[other.id] = other.on;
    ACT.redeal();
    return { shipsMoreThanOne: PACKS.length > 1, off: off === before - core.items.length,
             back: back === before, adds: withExtra === without + other.items.length };
  });

  // — it deals in rounds: everything once, then it says so and waits. It used
  //   not to — both draws picked at random from a wide slice of the ranking, so
  //   the same card came back within a few dozen swipes. —
  const rounds = await page.evaluate(async () => {
    const packs = JSON.stringify(ACT.S.packs), pass = JSON.stringify(ACT.S.pass);
    const seenWas = JSON.stringify(ACT.S.seen), recentWas = JSON.stringify(ACT.S.recent);
    for (const k of Object.keys(ACT.S.packs)) ACT.S.packs[k] = (k === 'q-partner');
    ACT.S.pass = { n:1, done:[] }; ACT.S.seen = {}; ACT.redeal();

    const total = ACT.pool().length, dealt = [];
    let guard = 0;
    while (ACT.top() && guard++ < 400) { dealt.push(ACT.top().id); ACT.say(guard % 4 ? 'like' : 'dislike'); }
    await new Promise(r => setTimeout(r, 420));

    const n = ACT.S.pass.n;
    const out = {
      wholeDeck: total > 20 && dealt.length === total,
      noRepeats: new Set(dealt).size === dealt.length,
      saysSo: /whole deck/.test((document.querySelector('.empty h2') || {}).textContent || ''),
      // it waits to be asked rather than reshuffling behind you
      waits: ACT.S.pass.n === n,
      goesRound: (ACT.goRound(), ACT.S.pass.n === n + 1 && ACT.cycle().left === total && !!ACT.top())
    };
    ACT.S.packs = JSON.parse(packs); ACT.S.pass = JSON.parse(pass);
    ACT.S.seen = JSON.parse(seenWas); ACT.S.recent = JSON.parse(recentWas);
    ACT.redeal();
    return out;
  });

  // — undo puts the card back into the round as well as into the hand —
  const undoRound = await page.evaluate(async () => {
    const t = ACT.top().id;
    ACT.say('dislike');
    await new Promise(r => setTimeout(r, 400));
    const gone = ACT.S.pass.done.includes(t);
    ACT.takeBack();
    await new Promise(r => setTimeout(r, 200));
    return gone && !ACT.S.pass.done.includes(t) && ACT.top().id === t;
  });

  // — the marks sleep, and the first tap on a sleeping one only wakes it: a
  //   mark you cannot see is not a button you meant to press —
  await page.evaluate(() => ACT.sleep());
  await page.waitForTimeout(350);
  const hiddenDock = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.dock .menu')).opacity === '0');
  await shot('10-dock-asleep');
  await page.click('[data-act="menu"]'); await page.waitForTimeout(300);
  const firstTapOnlyWakes = await page.locator('.panel').count() === 0 &&
    await page.evaluate(() => document.body.classList.contains('awake'));
  await page.click('[data-act="menu"]'); await page.waitForTimeout(350);
  const secondTapOpens = await page.locator('.panel').count() === 1;
  await page.click('.panel .x[aria-label="Close"]'); await page.waitForTimeout(300);
  // and a verdict puts them away again
  await page.evaluate(() => ACT.wake());
  await page.evaluate(() => ACT.say('skip'));
  await page.waitForTimeout(420);
  const verdictSleeps = await page.evaluate(() => !document.body.classList.contains('awake'));
  const dockSleeps = { hiddenDock, firstTapOnlyWakes, secondTapOpens, verdictSleeps };

  // — the dock reaches everything —
  await dock('[data-act="menu"]'); await page.waitForTimeout(400);
  await shot('04-menu');
  const menuOpen = await page.locator('.panel h2').innerText() === 'Activinator';
  await page.click('[data-act="ctx"]'); await page.waitForTimeout(400);
  await page.click('[data-act="setwho"][data-v="partner"]'); await page.waitForTimeout(350);
  const ctxKept = await page.evaluate(() => ACT.S.ctx.who === 'partner');
  await shot('05-context');
  await page.click('[data-act="setwho"][data-v=""]'); await page.waitForTimeout(300);
  await page.click('.panel .x[aria-label="Close"]'); await page.waitForTimeout(300);

  // — all activities, searchable, and liking one there is the same act —
  await dock('[data-act="browse"]'); await page.waitForTimeout(400);
  const allRows = await page.locator('.brow').count();
  await page.fill('[data-in="q"]', 'graveyard');
  await page.waitForTimeout(300);
  const searched = await page.locator('.brow').count();
  const keptFocus = await page.evaluate(() => document.activeElement.dataset.in === 'q');
  await shot('06-browse');
  await page.locator('.brow .bset.like').first().click();
  await page.waitForTimeout(300);
  const browseLiked = await page.evaluate(() => Object.values(ACT.S.seen).some(s => s.v === 'like'));
  await page.click('.panel .x[aria-label="Close"]'); await page.waitForTimeout(300);

  // — swipe a dozen so taste has something to show —
  for (let i = 0; i < 14; i++) { await page.click('#deck'); await page.waitForTimeout(60);
    await page.evaluate(i => ACT.say(i % 3 ? 'like' : 'dislike'), i); await page.waitForTimeout(120); }
  await dock('[data-act="menu"]'); await page.waitForTimeout(300);
  await page.click('[data-act="taste"]'); await page.waitForTimeout(400);
  const bars = await page.locator('.bar').count();
  await shot('07-taste');
  await page.click('.panel .x[aria-label="Close"]'); await page.waitForTimeout(300);

  // — writing your own: it needs enough tags to be filterable at all —
  await dock('[data-act="add"]'); await page.waitForTimeout(400);
  await page.fill('[data-in="t"]', 'Walk the whole canal path');
  await page.click('[data-act="savemine"]'); await page.waitForTimeout(250);
  const refusedBare = await page.evaluate(() => ACT.S.mine.length === 0);
  for (const v of ['outdoors','solo','engaging','long','move']) {
    await page.click(`[data-act="dtag"][data-v="${v}"]`); await page.waitForTimeout(120);
  }
  await shot('08-add');
  await page.click('[data-act="savemine"]'); await page.waitForTimeout(400);
  const mine = await page.evaluate(() => ACT.S.mine.length === 1 && ACT.pool().some(c => c.src === 'mine'));

  // — and it comes back out as a row a pack would accept —
  await dock('[data-act="menu"]'); await page.waitForTimeout(300);
  await page.click('[data-act="packs"]'); await page.waitForTimeout(400);
  const mineRow = await page.evaluate(() => {
    const t = document.querySelector('.pbody textarea');
    return t ? t.value.trim() : '';
  });
  // Pack-shaped means the build would take it: the derived tags left out, and
  // exactly one place and one how-hard, which is what the build insists on.
  const rowIsPackShaped = (() => {
    const m = /^"?Walk the whole canal path"?,(\d+),(free|frugal|costly),(.+)$/.exec(mineRow);
    if (!m) return false;
    const tags = m[3].split(' ');
    const one = (ks) => tags.filter(t => ks.includes(t)).length === 1;
    return !tags.some(t => ['quick','short','medium','long','allday','free','frugal','costly'].includes(t)) &&
      one(['anywhere','indoors','outdoors','home']) && one(['casual','engaging','challenging']);
  })();
  await page.click('.panel .x[aria-label="Close"]'); await page.waitForTimeout(300);

  // — rewriting the card in front of you. The hand must not move: the point of
  //   an edit is that you were about to swipe this one and wanted it to say
  //   something better first. —
  const was = await page.locator('.card.top .t').innerText();
  const editId = await page.evaluate(() => ACT.top().id);
  await page.locator('.card.top').click();               // the button is on the back
  await page.waitForTimeout(550);
  await page.click('.card.top [data-act="edit"]'); await page.waitForTimeout(400);
  const prefilled = await page.inputValue('[data-in="t"]') === was;
  await page.fill('[data-in="t"]', 'A better way of putting it');
  await shot('10-rewrite');
  await page.click('[data-act="saveedit"]'); await page.waitForTimeout(450);
  const rewritten = await page.evaluate(([id, t]) => ({
    sameCard: ACT.top().id === id,                       // the hand did not move
    stored: !!ACT.S.edits[id],
    onCard: document.querySelector('.card.top .t').innerText === t,
    inPool: ACT.pool().find(c => c.id === id).t === t
  }), [editId, 'A better way of putting it']);
  await shot('11-rewritten');

  // — and everything judged or rewritten comes back out as pack rows —
  await dock('[data-act="menu"]'); await page.waitForTimeout(300);
  await page.click('[data-act="curate"]'); await page.waitForTimeout(400);
  await shot('12-curate');
  const lines = (await page.evaluate(() => document.querySelector('.pbody textarea').value)).split('\n');
  const row = lines.find(l => l.includes('A better way of putting it'));
  const curation = {
    head: lines[0] === 'verdict,pack,title,minutes,cost,tags,definition,was',
    keeps: lines.some(l => l.startsWith('keep,')),
    cuts: lines.some(l => l.startsWith('cut,')),
    // the title it used to have is the last column, because that is the row a
    // rewrite replaces and a rewritten title no longer matches the CSV
    rewrite: !!row && /^(edit|keep|cut|out),/.test(row) && row.includes(was),
    // a skip is not a verdict, so it is not in here
    noSkips: !lines.some(l => l.startsWith('skip,'))
  };
  await page.click('.panel .x[aria-label="Close"]'); await page.waitForTimeout(300);

  // — it survives a reload, and it opens with the network off —
  await page.reload(); await page.waitForTimeout(700);
  const persisted = await page.evaluate(() => ACT.S.swipes > 10 && ACT.S.mine.length === 1);
  const editPersisted = await page.evaluate(([id, t]) =>
    ACT.S.v === 5 && ACT.pool().find(c => c.id === id).t === t, [editId, 'A better way of putting it']);

  // — and a rewrite can be taken back off, leaving the pack's own words —
  await page.evaluate(id => ACT.panels.editPanel(id), editId);
  await page.waitForTimeout(400);
  await page.click('[data-act="unedit"]'); await page.waitForTimeout(400);
  const unedited = await page.evaluate(([id, t]) =>
    !ACT.S.edits[id] && ACT.pool().find(c => c.id === id).t === t, [editId, was]);

  // — a card that teaches something carries its meaning into the rewrite, or
  //   half of what is on it could not be fixed —
  const defEditable = await page.evaluate(() => {
    const c = ACT.pool().find(x => x.d);
    if (!c) return true;                       // no pack carries one: nothing to say
    ACT.panels.editPanel(c.id);
    const f = document.querySelector('[data-in="d"]');
    const ok = !!f && f.value === c.d;
    ACT.panels.closePanel();
    return ok;
  });
  await page.waitForTimeout(300);
  const swReady = await page.evaluate(() => navigator.serviceWorker.ready.then(r => !!r.active).catch(() => false));
  await ctx.setOffline(true);
  await page.reload(); await page.waitForTimeout(800);
  const offline = await page.locator('#deck .card').count() > 0;
  await shot('09-offline');
  await ctx.setOffline(false);

  console.log({ dealt, manifestOk, fullBleed, frontIsBare, emblems, corners, packs, flipped, frontHidden,
    flipsBack, liked, moved, learned, undone, backAgain, unlearned, skipped, poolIsForever,
    ctxHonoured, menuOpen, ctxKept, allRows, searched, keptFocus, browseLiked, bars,
    refusedBare, mine, mineRow, rowIsPackShaped, rounds, undoRound, dockSleeps, prefilled, rewritten, curation,
    editPersisted, unedited, defEditable, persisted, swReady, offline, errors: errs });
  await browser.close();
  const ok = dealt === 3 && manifestOk && fullBleed && frontIsBare && emblems > 2 && corners && flipped &&
    frontHidden && flipsBack && liked && moved && learned && undone && backAgain && unlearned &&
    skipped && poolIsForever && ctxHonoured && menuOpen && ctxKept && allRows > 250 &&
    searched > 0 && searched < allRows && keptFocus && browseLiked && bars > 0 && refusedBare &&
    mine && persisted && swReady && offline && prefilled && editPersisted && unedited &&
    defEditable && undoRound && Object.values(rounds).every(Boolean) &&
    Object.values(dockSleeps).every(Boolean) &&
    Object.values(rewritten).every(Boolean) && Object.values(curation).every(Boolean) &&
    packs.shipsMoreThanOne && packs.off && packs.back && packs.adds && rowIsPackShaped && !errs.length;
  process.exit(ok ? 0 : 1);
})();
