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
  recent:['s12','s20'], mine:[], ctx:{ who:'', where:'', time:'' }, nerve:.3
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
    mineDealable: ACT.deal(400).some(c => c.id === 'm1')
  }));
  await a.page.screenshot({ path:'test/shots/upgrade-v1.png' });

  // — from v2 —
  const b = await boot(browser, V2);
  const two = await b.page.evaluate(() => {
    const twelve = ACT.pool()[12].id, twenty = ACT.pool()[20].id;
    return {
      cards: document.querySelectorAll('#deck .card').length,
      // the list has not been reordered since, so position maps cleanly onto
      // the stable id — and the thing you banned must still be banned
      remapped: ACT.S.seen[twelve] && ACT.S.seen[twelve].v === 'never' &&
                ACT.S.seen[twenty] && ACT.S.seen[twenty].v === 'like',
      noPositionalIds: !Object.keys(ACT.S.seen).some(k => /^s\d+$/.test(k)),
      neverStillOut: !ACT.deal(400).some(c => c.id === twelve),
      v: ACT.S.v
    };
  });

  const out = {
    v1: { cards: oldTitles.cards, v: oldTitles.v, ctxReset: oldTitles.ctx === '{"who":"","where":"","time":""}',
      seenDropped: oldTitles.seenDropped, keptWeight: oldTitles.keptWeight,
      renamedWeight: oldTitles.renamedWeight, droppedWeight: oldTitles.droppedWeight,
      listGone: oldTitles.listGone, mineDealable: oldTitles.mineDealable,
      mineHasWhere: ['anywhere','indoors','outdoors','home'].some(t => oldTitles.mine.tags.includes(t)),
      mineHasDuration: ['quick','short','medium','long','allday'].some(t => oldTitles.mine.tags.includes(t)),
      mineHasCost: ['free','frugal','costly'].some(t => oldTitles.mine.tags.includes(t)),
      mineRenamed: oldTitles.mine.tags.includes('friends'),
      errors: a.errs },
    v2: { ...two, errors: b.errs }
  };
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
  const v1ok = out.v1.cards === 3 && out.v1.v === 3 && out.v1.ctxReset && out.v1.seenDropped &&
    out.v1.keptWeight && out.v1.renamedWeight && out.v1.droppedWeight && out.v1.listGone &&
    out.v1.mineDealable && out.v1.mineHasWhere && out.v1.mineHasDuration && out.v1.mineHasCost &&
    out.v1.mineRenamed && !a.errs.length;
  const v2ok = out.v2.cards === 3 && out.v2.v === 3 && out.v2.remapped && out.v2.noPositionalIds &&
    out.v2.neverStillOut && !b.errs.length;
  process.exit(v1ok && v2ok ? 0 : 1);
})();
