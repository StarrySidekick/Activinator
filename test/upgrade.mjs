// Upgrade test for Activinator. Needs the server running and playwright.
//   node test/upgrade.mjs
//
// The smoke test starts every run with an empty browser profile, so it only
// ever exercises a first install. This one starts from the shapes a phone that
// has had the app on it for a while actually has saved, which is the half of
// the code that only ever runs on somebody's real device.
//
// It exists because that half was not tested and broke: a `ctx` saved under
// the old vocabulary said `where:'any'`, the new filter had no entry for it,
// and the throw during the first render left a blank screen with the buttons
// still sitting on it.
import { chromium } from 'playwright';
import { idOf } from '../js/vocab.js';
const URL = process.env.ACT_URL || 'http://127.0.0.1:8010/index.html';
const CHROME = process.env.ACT_CHROME;

// v0.1–0.3: a different list of activities under the same positional ids, a
// shortlist, descriptions, and where/who as fields on a written activity.
const V1 = {
  v:1, w:{ outdoors:.5, social:-.3, cheap:.4, nature:.6 }, bias:.1, swipes:23,
  seen:{ s3:{v:'yes',at:'2026-08-20T10:00:00Z'}, s9:{v:'no',at:'2026-08-20T11:00:00Z'},
         s12:{v:'never',at:'2026-08-20T12:00:00Z'} },
  list:[{ id:'s3', card:{t:'Old thing', tags:['outdoors'], min:60}, at:'x', done:null }],
  mine:[{ id:'m1', t:'My own activity', d:'gone', tags:['outdoors','social'],
          who:'group', where:'out', min:45, cost:0, src:'mine' }],
  ctx:{ who:'any', where:'any', time:0 }, nerve:.3, streak:{day:null,n:0}
};

// v0.4–0.5: today's list, but ids were still the position in it.
const V2 = {
  v:2, w:{ outdoors:.5, friends:-.2 }, bias:0, swipes:9,
  seen:{ s12:{v:'never',at:'2026-08-21T10:00:00Z'}, s20:{v:'like',at:'2026-08-21T11:00:00Z'} },
  recent:['s12','s20'], mine:[], ctx:{ who:'', where:'', time:'' }, nerve:.3,
  packs:{ core:false }        // a pack you switched off stays off across an update
};

// v0.6–0.8: today's shape, before a card could be rewritten. Nothing here
// knows the word `edits`, and the pack that arrived with this version has to
// switch itself on.
const V3 = {
  v:3, w:{ outdoors:.4, spooky:.2 }, bias:0, swipes:31,
  seen:{}, recent:[], mine:[], ctx:{ who:'', where:'outdoors', time:'' }, nerve:.5,
  packs:{ core:false, winter:true }   // winter shipped then and does not exist now
};

// v0.9–0.12: a rewrite is kept beside the card it rewrites, and the deck has
// no idea it has ever dealt anything. A vocabulary
// change has to reach into it the same way it reaches into the weights — an
// edit carrying a tag that no longer means anything would put that tag back
// into the pool by the side door.
const REWROTE = 'Walk to the furthest point you can reach in thirty minutes';
const V4 = {
  v:4, w:{ outdoors:.4 }, bias:0, swipes:12, seen:{}, recent:[], mine:[],
  ctx:{ who:'', where:'', time:'' }, nerve:.3, packs:{},
  // a saved table setting the app cannot use — a nonsense here is a table with
  // no cards on it, so it has to be put back to a number
  table:{ n:'lots' },
  edits:{
    // an id is the hash of the title the pack has, which is what lets a rewrite
    // be a rewrite of that card rather than a new one
    [idOf(REWROTE)]: { t:'Walk as far as you can get in half an hour',
                       tags:['travel','move','casual','outdoors','social','nonsense','short','free'],
                       min:30, cost:0 },
    // and one whose card has left the packs: it cannot be applied, and it is
    // not thrown away either, because it may not have been exported yet
    ZZZ: { t:'A card that is not there any more', tags:['outdoors','casual'], min:20, cost:0 }
  }
};

const boot = async (browser, state) => {
  const ctx = await browser.newContext({ viewport:{ width:390, height:844 }, hasTouch:true, isMobile:true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(s => localStorage.setItem('activinator.v1', s), JSON.stringify(state));
  await page.goto(URL);
  await page.waitForTimeout(800);
  return { ctx, page, errs };
};

(async () => {
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});

  // — from v1 —
  const a = await boot(browser, V1);
  const oldTitles = await a.page.evaluate(() => ({
    cards: document.querySelectorAll('#deck .card').length,
    ctx: JSON.stringify(ACT.S.ctx),
    v: ACT.S.v,
    // ids over there meant different activities, so a verdict cannot be
    // carried across without re-pointing it at somebody else's card
    seenDropped: Object.keys(ACT.S.seen).length === 0,
    // weights are keyed on tags, so those do come across — renamed where the
    // tag was renamed, dropped where the word no longer means anything
    keptWeight: ACT.S.w.outdoors === .5,
    renamedWeight: ACT.S.w.friends === -.3,
    droppedWeight: !('nature' in ACT.S.w) && !('cheap' in ACT.S.w),
    listGone: !('list' in ACT.S),
    // a written activity has to end up filterable and marked, or it is invisible
    mine: ACT.S.mine[0],
    /* Dealable, asked of the filters rather than of a draw. `deal(400)` is 400
       random picks weighted by taste, so a specific card turning up in it is
       likely and not certain — this failed about one run in four and said
       nothing true when it did. What the migration has to get right is that the
       card passes: it is in the pool, nothing has banned it, and it answers the
       filter. */
    mineDealable: (() => {
      const c = ACT.pool().find(x => x.id === 'm1');
      return !!c && ACT.buildPile().length > 0 &&
             (ACT.S.seen['m1'] || {}).v !== 'never' && ACT.fits(c);
    })(),
    // a state saved before packs existed takes the defaults each pack ships with
    packsDefaulted: JSON.stringify(ACT.S.packs) ===
      JSON.stringify(Object.fromEntries(ACT.PACKS.map(p => [p.id, p.on])))
  }));
  await a.page.screenshot({ path:'test/shots/upgrade-v1.png' });

  // — from v2 —
  const b = await boot(browser, V2);
  const two = await b.page.evaluate(() => {
    // The ids these were saved as counted positions in what is now the core
    // pack, so that is what they have to be looked up against — and the pool
    // is no help here, because this saved state has core switched off.
    const core = ACT.PACKS.find(p => p.id === 'core').items;
    const twelve = core[12].id, twenty = core[20].id;
    const dealable = () => { ACT.S.packs.core = true; const d = ACT.buildPile();
      ACT.S.packs.core = false; return d; };
    return {
      // core is off in this saved state, so the deck deals from what is left
      cards: document.querySelectorAll('#deck .card').length,
      // the list has not been reordered since, so position maps cleanly onto
      // the stable id — and the thing you banned must still be banned
      remapped: ACT.S.seen[twelve] && ACT.S.seen[twelve].v === 'never' &&
                ACT.S.seen[twenty] && ACT.S.seen[twenty].v === 'like',
      noPositionalIds: !Object.keys(ACT.S.seen).some(k => /^s\d+$/.test(k)),
      neverStillOut: !dealable().some(c => c.id === twelve),
      packKept: ACT.S.packs.core === false,
      newPackDefaulted: ACT.PACKS.filter(p => p.id !== 'core')
        .every(p => ACT.S.packs[p.id] === p.on),
      v: ACT.S.v
    };
  });

  // — from v3: no edits, and a pack it has never heard of —
  const c = await boot(browser, V3);
  const three = await c.page.evaluate(() => ({
    cards: document.querySelectorAll('#deck .card').length,
    v: ACT.S.v,
    editsEmpty: ACT.S.edits && Object.keys(ACT.S.edits).length === 0,
    // the round is gone; anything saved under it is dropped rather than carried
    roundGone: !('pass' in ACT.S),
    packKept: ACT.S.packs.core === false,          // an opinion about a pack survives
    goneDropped: !('winter' in ACT.S.packs),       // a pack that no longer exists leaves
    newPackDefaulted: ACT.PACKS.filter(p => p.id !== 'core')
      .every(p => ACT.S.packs[p.id] === p.on),
    ctxKept: ACT.S.ctx.where === 'outdoors',
    curates: ACT.panels.curationRows().length === 0,
    // a state from before the table existed arrives with a table it can open
    tableDefaulted: ACT.S.table && ACT.S.table.n === 1 && ACT.S.table.shake === true
  }));

  // — from v4: a rewrite is carried across, cleaned against the vocabulary —
  const d = await boot(browser, V4);
  const four = await d.page.evaluate(id => {
    const c = ACT.pool().find(a => a.id === id) || {};
    return {
      orphanKept: !!ACT.S.edits.ZZZ,
      // a state from before the deck dealt in rounds starts round one, whole
      roundGone: !('pass' in ACT.S),
      applied: c.t === 'Walk as far as you can get in half an hour' && c.edit === true,
      wasKept: c.was === 'Walk to the furthest point you can reach in thirty minutes',
      renamed: (c.tags || []).includes('friends'),     // social was renamed, not dropped
      cleaned: !(c.tags || []).includes('nonsense'),   // a word the vocabulary lost is gone
      // and it has to come back out of the curation under the title the pack
      // still has, or the next compile cannot find the row it replaces
      inCuration: ACT.panels.curationCSV().split('\n').some(l =>
        l.startsWith('edit,') && l.includes('Walk as far as you can get in half an hour') &&
        l.includes('Walk to the furthest point you can reach in thirty minutes')),
      // and a table setting that is not a number goes back to one
      tableFixed: ACT.S.table.n === 1 && ACT.S.table.shake === true
    };
  }, idOf(REWROTE));
  await d.page.screenshot({ path:'test/shots/upgrade-v4.png' });

  const out = {
    v1: { cards: oldTitles.cards, v: oldTitles.v, ctxReset: oldTitles.ctx === '{"who":"","where":"","time":""}',
      seenDropped: oldTitles.seenDropped, keptWeight: oldTitles.keptWeight,
      renamedWeight: oldTitles.renamedWeight, droppedWeight: oldTitles.droppedWeight,
      listGone: oldTitles.listGone, mineDealable: oldTitles.mineDealable,
      mineHasWhere: ['anywhere','indoors','outdoors','home'].some(t => oldTitles.mine.tags.includes(t)),
      mineHasDuration: ['quick','short','medium','long','allday'].some(t => oldTitles.mine.tags.includes(t)),
      mineHasCost: ['free','frugal','costly'].some(t => oldTitles.mine.tags.includes(t)),
      mineRenamed: oldTitles.mine.tags.includes('friends'),
      packsDefaulted: oldTitles.packsDefaulted,
      errors: a.errs },
    v2: { ...two, errors: b.errs },
    v3: { ...three, errors: c.errs },
    v4: { ...four, errors: d.errs }
  };
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
  const v1ok = out.v1.cards === 1 && out.v1.v === 6 && out.v1.ctxReset && out.v1.seenDropped &&
    out.v1.keptWeight && out.v1.renamedWeight && out.v1.droppedWeight && out.v1.listGone &&
    out.v1.mineDealable && out.v1.mineHasWhere && out.v1.mineHasDuration && out.v1.mineHasCost &&
    out.v1.mineRenamed && out.v1.packsDefaulted && !a.errs.length;
  const v2ok = out.v2.cards >= 0 && out.v2.v === 6 && out.v2.remapped && out.v2.noPositionalIds &&
    out.v2.neverStillOut && out.v2.packKept && out.v2.newPackDefaulted && !b.errs.length;
  const v3ok = out.v3.cards === 1 && out.v3.v === 6 && out.v3.editsEmpty && out.v3.roundGone &&
    out.v3.tableDefaulted &&
    out.v3.packKept &&
    out.v3.goneDropped && out.v3.newPackDefaulted && out.v3.ctxKept && out.v3.curates &&
    !c.errs.length;
  const v4ok = out.v4.orphanKept && out.v4.roundGone && out.v4.applied && out.v4.wasKept &&
    out.v4.tableFixed && out.v4.renamed &&
    out.v4.cleaned && out.v4.inCuration && !d.errs.length;
  process.exit(v1ok && v2ok && v3ok && v4ok ? 0 : 1);
})();
