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

  // — a card is a card: seven by twelve, out to both edges of the screen, with
  //   the rest of the hand squared up dead under it so what you see is one
  //   card. The top card is the LAST in the DOM, because the hand is painted
  //   back to front. —
  const cardShaped = await page.evaluate(() => {
    const r = document.querySelector('.card.top').getBoundingClientRect();
    const under = [...document.querySelectorAll('#deck .card:not(.top)')];
    const same = (a) => Math.abs(a.left - r.left) < 0.5 && Math.abs(a.top - r.top) < 0.5 &&
                        Math.abs(a.width - r.width) < 0.5 && Math.abs(a.height - r.height) < 0.5;
    return {
      tarot: Math.abs(r.width / r.height - 7 / 12) < 0.01,
      edgeToEdge: r.left < 0.5 && innerWidth - r.right < 0.5,
      roomAboveAndBelow: r.top > 8 && innerHeight - r.bottom > 8,
      // squared up rather than fanned: the hand sits under it exactly
      squareStack: under.length === 2 && under.every(c => same(c.getBoundingClientRect()))
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

  // — turning a card over. Two halves of one rotation, and it never turns past
  //   90°: m11 is the cosine of the angle, so it runs 1 → 0 out to edge-on and
  //   0 → 1 back out the other side. The assertion that matters is the last
  //   one: m11 never goes negative, on the container or on the face that is
  //   showing. A face drawn with a negative m11 is a face seen from behind,
  //   which is mirrored text — which is what turning the whole 180° with both
  //   faces on the card gave on a browser that does not honour
  //   backface-visibility inside a 3D subtree. Sampled frame by frame, because
  //   a screenshot cannot catch the middle of half a second. —
  const turn = await page.evaluate(async () => {
    const card = document.querySelector('.card.top');
    const inner = card.querySelector('.cardin');
    const cosOf = () => +new DOMMatrixReadOnly(getComputedStyle(inner).transform).m11.toFixed(3);
    const faces = () => [...card.querySelectorAll('.face')]
      .filter(f => getComputedStyle(f).display !== 'none').length;
    const behind = () => {
      const o = document.querySelector('#deck .card:not(.top)');
      return o ? getComputedStyle(o).visibility : 'hidden';
    };
    const seen = [];
    ACT.flip(card);
    const t0 = performance.now();
    await new Promise(done => {
      const tick = () => { seen.push([cosOf(), behind(), faces()]);
        performance.now() - t0 < 700 ? requestAnimationFrame(tick) : done(); };
      requestAnimationFrame(tick);
    });
    const cos = seen.map(s => s[0]);
    const mid = seen.filter(s => Math.abs(s[0]) < 0.9);
    const half = cos.indexOf(Math.min(...cos.map(Math.abs)) * Math.sign(cos[0] || 1));
    return {
      startsSquare: cos[0] > 0.99,
      passesEdgeOn: Math.min(...cos.map(Math.abs)) < 0.12,
      opensBackOut: cos[cos.length - 1] > 0.99,
      /* Never seen from behind. This is the whole bug: a negative m11 is a
         mirrored face, and no frame of the turn is allowed one. */
      neverMirrored: cos.every(c => c >= -0.01),
      // one face in the layout at a time, all the way through
      oneFaceThroughout: seen.every(s => s[2] === 1),
      // the hand behind is out of sight for the whole of it, so the gap that
      // opens as the card goes edge-on shows the room and not another card
      handHidden: mid.length > 3 && mid.every(s => s[1] === 'hidden')
    };
  });
  const flipped = await page.locator('.card.top.flip').count() === 1;
  // The front is not there at all rather than facing away: nothing that is not
  // being looked at is painted, so nothing can show through anything.
  const frontHidden = await page.evaluate(() => {
    const card = document.querySelector('.card.top');
    return getComputedStyle(card.querySelector('.face.front')).display === 'none' &&
           getComputedStyle(card.querySelector('.face.back')).display !== 'none';
  });
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

  // — and everything judged or rewritten comes back out as pack rows.
  //   One card with a multi-line definition is judged on purpose, so the row
  //   that spans lines is always in here rather than turning up on the two
  //   percent of runs where the deck happened to deal one. —
  await page.evaluate(() => {
    const c = ACT.pool().find(x => (x.d || '').includes('\n'));
    if (c) { ACT.S.seen[c.id] = { v:'like', at:new Date().toISOString() }; ACT.save(); }
  });
  await menu();
  await page.click('[data-act="curate"]'); await page.waitForTimeout(400);
  await shot('12-curate');
  /* A CSV is not its lines. A quoted cell may contain newlines — an Italian
     verb card carries its conjugations one tense to a line — so splitting on
     every newline cuts that row up and the last column of it lands on a line of
     its own. This test did exactly that, and passed for weeks because the card
     it happens to rewrite is whatever the deck dealt: it only failed on the two
     percent of runs that landed on a verb. Records, the way the build's own
     parser reads them. */
  const records = (text) => {
    const out = []; let cur = '', q = false;
    for (const ch of text) {
      if (ch === '"') { q = !q; cur += ch; }
      else if (ch === '\n' && !q) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    if (cur) out.push(cur);
    return out;
  };
  /* The same reading, one level down: a comma inside quotes is part of a cell. */
  const cells = (line) => {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const lines = records(await page.evaluate(() => document.querySelector('.pbody textarea').value));
  const row = lines.find(l => l.includes('A better way of putting it'));
  const curation = {
    head: lines[0] === 'verdict,pack,title,minutes,cost,tags,definition,was',
    keeps: lines.some(l => l.startsWith('keep,')),
    cuts: lines.some(l => l.startsWith('cut,')),
    // the title it used to have is the last column, because that is the row a
    // rewrite replaces and a rewritten title no longer matches the CSV
    rewrite: !!row && /^(edit|keep|cut|out),/.test(row) && row.includes(was),
    // a skip is not a verdict, so it is not in here
    noSkips: !lines.some(l => l.startsWith('skip,')),
    /* Eight columns on every row, quotes and embedded newlines and all. This is
       the assertion that would have caught the split above, and the one that
       says the file is pasteable rather than merely present. */
    eightColumns: lines.length > 3 && lines.every(l => cells(l).length === 8)
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
  // — the table: dealing, handling, and staying out of the deck's way —
  const table = await page.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const T = ACT.table;
    const deckWas = JSON.stringify({ w: ACT.S.w, done: ACT.S.pass.done.length, swipes: ACT.S.swipes });
    ACT.panels.closePanel();
    T.openTable();
    await wait(120);
    const felt = document.querySelector('#table .felt');
    const opened = !!felt && T.pileSize() > 0;

    /* Dealt one at a time off the pile, and the pile knows it. */
    const p0 = T.pileSize();
    document.querySelector('.pile').click(); await wait(320);
    const dealsOne = T.onTable().length === 1 && T.pileSize() === p0 - 1;

    const packs = ACT.PACKS;
    const two = packs.filter(p => p.twosided).map(p => p.id);
    const twoSided = two.length === 2 && two.includes('words') && two.includes('italian') &&
      packs.every(p => !p.twosided || p.items.every(a => !!a.d));

    /* Only a two-sided pack has a second side, so the coin is only tossed for
       those. Deal twenty of them: landing all one way up is a one in half a
       million coincidence, and landing all one way up every run is a bug. So
       the pile is narrowed to those packs to ask the question at all. */
    const was = JSON.stringify(ACT.S.packs);
    for (const k of Object.keys(ACT.S.packs)) ACT.S.packs[k] = two.includes(k);
    T.closeTable(); T.openTable(); await wait(120);
    for (let i = 0; i < 20; i++) { document.querySelector('.pile').click(); await wait(28); }
    const sides = new Set(T.onTable().map(o => o.side));
    const bothSides = sides.has(0) && sides.has(1);
    /* Two sides means two faces, and the other one is the meaning in words —
       never a printed pattern, which bled through the front and is gone.

       Asked of each card against its own pack rather than of the whole table.
       Switching every pack but the two-sided ones off does not empty the pile
       of one-sided cards: anything you wrote yourself is in the pool whatever
       the packs say, by design, and this test writes one earlier. Demanding two
       faces of everything on the table failed on the runs that dealt it. */
    const twoFaced = T.onTable().every((o, i) => {
      const seed = ACT.pool().find(c => c.id === o.id) || {};
      const p = ACT.PACKS.find(x => x.id === seed.pack) || {};
      const both = !!(p.twosided && seed.d);
      const e = document.querySelectorAll('.tcard')[i];
      return e.querySelectorAll('.face').length === (both ? 2 : 1) &&
             !e.querySelector('.printed') &&
             e.classList.contains('oneside') === !both &&
             (both || o.side === 0) &&
             (!both || !!e.querySelector('.face.b .t'));
    });

    /* And a one-sided pack has one face, is always dealt face up, and does not
       turn over when you tap it — there is nothing on the other side. */
    ACT.S.packs = JSON.parse(was);
    for (const k of Object.keys(ACT.S.packs)) ACT.S.packs[k] = (k === 'core');
    T.closeTable(); T.openTable(); await wait(120);
    for (let i = 0; i < 8; i++) { document.querySelector('.pile').click(); await wait(28); }
    const ones = [...document.querySelectorAll('.tcard')];
    const oneSided = ones.length === 8 &&
      ones.every(e => e.querySelectorAll('.face').length === 1 &&
                      e.classList.contains('oneside') && !e.classList.contains('flip')) &&
      T.onTable().every(o => o.side === 0);
    ones[0].click(); await wait(600);
    const wontTurn = !ones[0].classList.contains('flip');
    ACT.S.packs = JSON.parse(was);
    T.closeTable(); T.openTable(); await wait(120);
    for (let i = 0; i < 20; i++) { document.querySelector('.pile').click(); await wait(28); }

    /* Laid out for the number you asked for, inside the felt, at a card's
       proportion. The rect is the rotated box, so measure the layout box. */
    T.setN(4); await wait(60);
    /* Re-asked for, not the one captured at the top: opening the table again
       replaces the whole screen, and the old node measures nothing at all. */
    const felt2 = document.querySelector('#table .felt');
    const cards = [...document.querySelectorAll('.tcard')];
    const laidOut = cards.length > 8 && cards.every(e =>
      e.offsetTop >= -1 && e.offsetTop + e.offsetHeight <= felt2.clientHeight + 1 &&
      e.offsetLeft >= -1 && e.offsetLeft + e.offsetWidth <= felt2.clientWidth + 1 &&
      Math.abs(e.offsetWidth / e.offsetHeight - 7 / 12) < 0.02);
    const setting = ACT.S.table.n === 4;

    /* Shuffle is the pile and leaves the table alone; gather is the table and
       ends in a shuffle. They were briefly one function. */
    const outWas = T.onTable().length, pileWas = T.pileSize();
    T.shuffle(); await wait(60);
    const shuffleKeepsTable = T.onTable().length === outWas && T.pileSize() === pileWas;
    T.gather(); await wait(400);
    const gatherReturns = T.onTable().length === 0 && T.pileSize() === pileWas + outWas;

    T.closeTable(); await wait(300);
    const closes = !document.querySelector('#table .felt') && !ACT.table.isOpen();
    /* Nothing it did was about the deck. */
    const deckUntouched = JSON.stringify({ w: ACT.S.w, done: ACT.S.pass.done.length, swipes: ACT.S.swipes }) === deckWas;
    return { opened, dealsOne, bothSides, twoSided, twoFaced, oneSided, wontTurn,
             laidOut, setting, shuffleKeepsTable, gatherReturns, closes, deckUntouched };
  });

  // — and it can be handled: a tap turns a card over, a drag moves it. Only a
  //   two-sided card has a second side to turn to, so the pile is those. —
  const packsWere = await page.evaluate(() => JSON.stringify(ACT.S.packs));
  await page.evaluate(() => {
    const two = ACT.PACKS.filter(p => p.twosided).map(p => p.id);
    for (const k of Object.keys(ACT.S.packs)) ACT.S.packs[k] = two.includes(k);
    ACT.table.openTable(); ACT.table.setN(2);
  });
  await page.waitForTimeout(200);
  await page.click('.pile'); await page.waitForTimeout(320);
  await page.click('.pile'); await page.waitForTimeout(320);
  await shot('13-table');
  const tc = await page.locator('.tcard').first();
  const wasFlipped = await tc.evaluate(e => e.classList.contains('flip'));
  await tc.click(); await page.waitForTimeout(600);
  const tapTurns = await tc.evaluate((e, was) => e.classList.contains('flip') !== was, wasFlipped);
  /* And it is never drawn mirrored on the way. One face in the layout at a
     time, and the container never past 90° — a negative m11 is a face seen from
     behind, which is text backwards.

     The sampler is armed first and the turn started by a real tap, because a
     hand-made PointerEvent is not a pointer: setPointerCapture throws on one,
     and the throw comes out of the app's own pointerdown handler. */
  await page.evaluate(() => {
    const card = document.querySelector('.tcard');
    const inner = card.querySelector('.tcardin');
    window.__turn = [];
    const t0 = performance.now();
    const tick = () => {
      const t = getComputedStyle(inner).transform;
      window.__turn.push([+new DOMMatrixReadOnly(t === 'none' ? '' : t).m11.toFixed(3),
        [...card.querySelectorAll('.face')].filter(f => getComputedStyle(f).display !== 'none').length]);
      if (performance.now() - t0 < 800) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await tc.click();
  await page.waitForTimeout(850);
  const tableTurnClean = await page.evaluate(() => {
    const seen = window.__turn || [];
    return seen.length > 10 && seen.every(s => s[0] >= -0.01 && s[1] === 1) &&
           Math.min(...seen.map(s => Math.abs(s[0]))) < 0.12;
  });
  const tb0 = await tc.evaluate(e => [e.offsetLeft, e.offsetTop, e.classList.contains('flip')]);
  const tbox = await tc.boundingBox();
  await page.mouse.move(tbox.x + tbox.width / 2, tbox.y + tbox.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(tbox.x + tbox.width / 2 + i * 11, tbox.y + tbox.height / 2 + i * 7); await page.waitForTimeout(12); }
  await page.mouse.up();
  await page.waitForTimeout(300);
  const tb1 = await tc.evaluate(e => [e.offsetLeft, e.offsetTop, e.classList.contains('flip')]);
  await shot('14-table-handled');
  // a drag moves the card and must not also turn it over
  const dragMoves = Math.abs(tb1[0] - tb0[0]) > 40 && Math.abs(tb1[1] - tb0[1]) > 20 && tb1[2] === tb0[2];
  /* — the pile: a tap deals one, a press picks it up, a shake in your hand
       shuffles it, and letting go drops it back in its slot. — */
  const pileBox = await page.locator('.pile').boundingBox();
  const dealtBefore = await page.evaluate(() => ACT.table.onTable().length);
  await page.mouse.move(pileBox.x + pileBox.width / 2, pileBox.y + pileBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(430);                       // past the hold
  const lifted = await page.evaluate(() => !!document.querySelector('.pile.lifted'));
  await page.mouse.move(200, 420); await page.waitForTimeout(60);
  const follows = await page.evaluate(() => {
    const r = document.querySelector('.pile').getBoundingClientRect();
    return Math.abs(r.left + r.width / 2 - 200) < 40 && r.bottom < 420;
  });
  // a shake is reversals, so a straight drag must not have shuffled it
  const quietSoFar = await page.evaluate(() => document.querySelector('#toast').textContent);
  for (const x of [120, 280, 120, 280, 120, 280]) { await page.mouse.move(x, 420); await page.waitForTimeout(40); }
  await page.waitForTimeout(150);
  const shookShuffles = await page.evaluate(() => /Shuffled/.test(document.querySelector('#toast').textContent));
  await page.mouse.up(); await page.waitForTimeout(320);
  const dropped = await page.evaluate(() => {
    const p = document.querySelector('.pile'), slot = document.querySelector('.pileslot');
    if (!p || !slot || p.classList.contains('lifted')) return false;
    const a = p.getBoundingClientRect(), b = slot.getBoundingClientRect();
    return Math.abs(a.left - b.left) < 2 && Math.abs(a.top - b.top) < 2;
  });
  // and picking it up is not dealing: no card came off during any of that
  const heldDealtNothing = await page.evaluate(d => ACT.table.onTable().length === d, dealtBefore);
  await page.click('.pile'); await page.waitForTimeout(320);
  const tapDeals = await page.evaluate(d => ACT.table.onTable().length === d + 1, dealtBefore);
  const shakeSwitch = await page.evaluate(async () => {
    const was = ACT.S.table.shake;
    document.querySelector('[data-act="tshake"]').click();
    await new Promise(r => setTimeout(r, 120));
    const flipped = ACT.S.table.shake !== was;
    document.querySelector('[data-act="tshake"]').click();
    await new Promise(r => setTimeout(r, 120));
    return flipped && ACT.S.table.shake === was;
  });
  Object.assign(table, { lifted, follows, shookShuffles, dropped, heldDealtNothing,
                         tapDeals, shakeSwitch,
                         straightDragIsNotAShake: !/Shuffled/.test(quietSoFar) });
  await page.evaluate((w) => { ACT.table.closeTable(); ACT.S.packs = JSON.parse(w); ACT.save(); ACT.redeal(); }, packsWere);
  await page.waitForTimeout(300);
  table.tapTurns = tapTurns; table.dragMoves = dragMoves;
  table.turnClean = tableTurnClean;

  /* — a panel opened and closed inside one frame must not leave the host
       taking taps. `.on` is added a frame late so the sheet has something to
       slide in from, and that callback used to fire after the close and put it
       back on an empty host: an invisible full-screen layer over the deck and
       the table that ate every tap, with nothing on screen to say why. — */
  const ghostPanel = await page.evaluate(async () => {
    ACT.panels.menuPanel(); ACT.panels.closePanel();     // same tick, open and shut
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const h = document.getElementById('panelhost');
    return !h.classList.contains('on') && getComputedStyle(h).pointerEvents === 'none';
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
    editPersisted, unedited, defEditable, table, ghostPanel, persisted, swReady, offline, errors: errs });
  await browser.close();
  const ok = dealt === 3 && manifestOk && frontIsBare && emblems > 0 && flipped &&
    Object.values(cardShaped).every(Boolean) && Object.values(cornerIndex).every(Boolean) &&
    Object.values(turn).every(Boolean) &&
    frontHidden && flipsBack && liked && moved && learned && undone && backAgain && unlearned &&
    skipped && poolIsForever && ctxHonoured && menuOpen && ctxKept && allRows > 250 &&
    searched > 0 && searched < allRows && keptFocus && browseLiked && bars > 0 && refusedBare &&
    mine && persisted && swReady && offline && prefilled && editPersisted && unedited &&
    defEditable && undoRound && Object.values(rounds).every(Boolean) &&
    Object.values(table).every(Boolean) && ghostPanel &&
    Object.values(oneButton).every(Boolean) &&
    Object.values(rewritten).every(Boolean) && Object.values(curation).every(Boolean) &&
    packs.shipsMoreThanOne && packs.off && packs.back && packs.adds && rowIsPackShaped && !errs.length;
  process.exit(ok ? 0 : 1);
})();
