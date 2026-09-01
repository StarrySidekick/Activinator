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
  // There is one button in the app and it is on the back of the card, so
  // reaching the menu means turning a card over first.
  const reading = () => page.evaluate(() => document.body.classList.contains('reading'));
  const menu = async () => {
    // Turn a card over first — and go by the state the app is actually in
    // rather than by one tap, since a tap during a card leaving does nothing.
    for (let i = 0; i < 4 && !(await reading()); i++) {
      await page.locator('.card.top').click();
      await page.waitForTimeout(560);
    }
    await page.click('.settings'); await page.waitForTimeout(400);
  };

  await page.goto(URL);
  await page.waitForTimeout(700);
  const dealt = await page.locator('#deck .card').count();
  await shot('01-deck');

  const manifestOk = await page.evaluate(async () => {
    const j = await (await fetch('manifest.webmanifest')).json();
    return j.name === 'Activinator' && j.icons.length === 3;
  });

  // — a card is a card: seven by twelve, a tarot card's proportion, on a table
  //   with the rest of the deck showing under it. The top card is the LAST in
  //   the DOM, because the hand is painted back to front. —
  const cardShaped = await page.evaluate(() => {
    const r = document.querySelector('.card.top').getBoundingClientRect();
    const under = [...document.querySelectorAll('#deck .card:not(.top)')];
    return {
      tarot: Math.abs(r.width / r.height - 7 / 12) < 0.01,
      onATable: r.top > 40 && innerHeight - r.bottom > 40,
      asWideAsItCanBe: r.width > innerWidth * 0.85,
      // the rest of the deck is under it, off true, so the pile reads as a pile
      stacked: under.length === 2 && under.every(c => /rotate/.test(c.style.transform))
    };
  });

  // — the front is a corner index and the activity, and nothing else. A
  //   definition card may also carry its meaning and a speak button, but those
  //   live inside the word group; nothing from the back leaks forward. —
  const frontIsBare = await page.evaluate(() => {
    const f = document.querySelector('.card.top .front');
    const kids = [...f.children].filter(el => !el.classList.contains('stamp'));
    const word = kids[2];
    return kids.length === 3 && kids[0].matches('.idx.tl') && kids[1].matches('.idx.br') &&
           word.classList.contains('word') && word.firstElementChild.classList.contains('t') &&
           [...word.children].every(el => el.matches('.t, .def, .speak')) &&
           !f.querySelector('.taglist, .kicker, .why, .odds, .facts');
  });
  // — and the index is in two opposite corners, the second one upside down —
  const cornerIndex = await page.evaluate(() => {
    const f = document.querySelector('.card.top .front').getBoundingClientRect();
    const tl = document.querySelector('.card.top .idx.tl');
    const br = document.querySelector('.card.top .idx.br');
    const a = tl.getBoundingClientRect(), b = br.getBoundingClientRect();
    return {
      countsThree: tl.querySelectorAll('.mark').length <= 3 && tl.querySelectorAll('.mark').length > 0,
      sameBothEnds: tl.innerHTML === br.innerHTML,
      topLeft: a.top - f.top < f.height * .12 && a.left - f.left < f.width * .12,
      bottomRight: f.bottom - b.bottom < f.height * .12 && f.right - b.right < f.width * .12,
      upsideDown: /matrix\(-1/.test(getComputedStyle(br).transform)
    };
  });
  const emblems = await page.locator('.card.top .idx.tl .mark').count();

  // — turning a card over. It squeezes to nothing, the face is swapped while
  //   there is nothing to see, and it opens out again — so the two faces are
  //   never both painted, whatever the browser thinks of backface-visibility. —
  const turn = await page.evaluate(async () => {
    const card = document.querySelector('.card.top');
    const inner = card.querySelector('.cardin');
    const xOf = () => +new DOMMatrixReadOnly(getComputedStyle(inner).transform).a.toFixed(3);
    const front = () => getComputedStyle(card.querySelector('.face.front')).display;
    const seen = [];
    ACT.flip(card);
    const t0 = performance.now();
    await new Promise(done => {
      const tick = () => { seen.push([xOf(), front()]);
        performance.now() - t0 < 420 ? requestAnimationFrame(tick) : done(); };
      requestAnimationFrame(tick);
    });
    const xs = seen.map(s => s[0]);
    return {
      startsWide: xs[0] > 0.9,
      squeezes: Math.min(...xs) < 0.1,
      opensBack: xs[xs.length - 1] > 0.95,
      // the swap happens edge-on and never while the card is open
      swappedEdgeOn: seen.filter((s, i) => i && s[1] !== seen[i - 1][1]).every(s => s[0] < 0.25)
    };
  });
  const flipped = await page.locator('.card.top.flip').count() === 1;
  const frontHidden = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.card.top .front')).display === 'none');
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

  // — a swipe down takes the last card back, and takes the learning with it —
  const wBefore = await page.evaluate(() => JSON.stringify(ACT.S.w));
  const down = await page.locator('.card.top').boundingBox();
  await page.mouse.move(down.x + down.width/2, down.y + down.height/2);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(down.x + down.width/2, down.y + down.height/2 + i*28); await page.waitForTimeout(12); }
  await page.mouse.up();
  await page.waitForTimeout(500);
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

  // — one button in the whole app, on the back of the card, top right —
  const oneButton = await page.evaluate(async () => {
    // one piece of chrome in the whole app, and no dock left anywhere
    const only = document.querySelectorAll('body > button[data-act]').length === 1 &&
                 !document.querySelector('.dock');
    const hidden = getComputedStyle(document.querySelector('.settings')).opacity === '0';
    ACT.flip(document.querySelector('.card.top'));
    await new Promise(r => setTimeout(r, 550));
    const st = document.querySelector('.settings');
    const r = st.getBoundingClientRect();
    const out = { only, hidden,
      shownWhenReading: getComputedStyle(st).opacity === '1',
      topRight: r.top < innerHeight / 2 && r.left + r.width / 2 > innerWidth / 2,
    };
    ACT.flip(document.querySelector('.card.top'));
    await new Promise(r => setTimeout(r, 550));
    out.hiddenAgain = getComputedStyle(st).opacity === '0';
    return out;
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

  // — the one button reaches everything —
  await menu();
  await shot('04-menu');
  const menuOpen = await page.locator('.panel h2').innerText() === 'Activinator';
  await page.click('[data-act="ctx"]'); await page.waitForTimeout(400);
  await page.click('[data-act="setwho"][data-v="partner"]'); await page.waitForTimeout(350);
  const ctxKept = await page.evaluate(() => ACT.S.ctx.who === 'partner');
  await shot('05-context');
  await page.click('[data-act="setwho"][data-v=""]'); await page.waitForTimeout(300);
  await page.click('.panel .x[aria-label="Close"]'); await page.waitForTimeout(300);

  // — all activities, searchable, and liking one there is the same act —
  await menu(); await page.click('[data-act="browse"]'); await page.waitForTimeout(400);
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
  await menu();
  await page.click('[data-act="taste"]'); await page.waitForTimeout(400);
  const bars = await page.locator('.bar').count();
  await shot('07-taste');
  await page.click('.panel .x[aria-label="Close"]'); await page.waitForTimeout(300);

  // — writing your own: it needs enough tags to be filterable at all —
  await menu(); await page.click('[data-act="add"]'); await page.waitForTimeout(400);
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
  await menu();
  await page.click('[data-act="decks"]'); await page.waitForTimeout(400);
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
  // the buttons are on the back, and the menu may have left it turned already
  if (await page.locator('.card.top.flip').count() === 0) {
    await page.locator('.card.top').click(); await page.waitForTimeout(550);
  }
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
  await menu();
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

  console.log({ dealt, manifestOk, cardShaped, frontIsBare, cornerIndex, emblems, packs, turn, flipped, frontHidden,
    flipsBack, liked, moved, learned, undone, backAgain, unlearned, skipped, poolIsForever,
    ctxHonoured, menuOpen, ctxKept, allRows, searched, keptFocus, browseLiked, bars,
    refusedBare, mine, mineRow, rowIsPackShaped, rounds, undoRound, oneButton, prefilled, rewritten, curation,
    editPersisted, unedited, defEditable, persisted, swReady, offline, errors: errs });
  await browser.close();
  const ok = dealt === 3 && manifestOk && frontIsBare && emblems > 0 && flipped &&
    Object.values(cardShaped).every(Boolean) && Object.values(cornerIndex).every(Boolean) &&
    Object.values(turn).every(Boolean) &&
    frontHidden && flipsBack && liked && moved && learned && undone && backAgain && unlearned &&
    skipped && poolIsForever && ctxHonoured && menuOpen && ctxKept && allRows > 250 &&
    searched > 0 && searched < allRows && keptFocus && browseLiked && bars > 0 && refusedBare &&
    mine && persisted && swReady && offline && prefilled && editPersisted && unedited &&
    defEditable && undoRound && Object.values(rounds).every(Boolean) &&
    Object.values(oneButton).every(Boolean) &&
    Object.values(rewritten).every(Boolean) && Object.values(curation).every(Boolean) &&
    packs.shipsMoreThanOne && packs.off && packs.back && packs.adds && rowIsPackShaped && !errs.length;
  process.exit(ok ? 0 : 1);
})();
