/* Activinator — state and storage.
   One key in localStorage, one shape, one place that touches it. Everything
   the app knows about you is here: the weights it has learned, what you have
   said about what, and what you have written yourself. */
import { SEEDS, PACKS, TAGS, WHO, WHERE, TIME, DURATIONS, COSTS, durationOf } from './data.js';

const KEY = 'activinator.v1';
const APP_VERSION = '0.27';
const DATA_V = 6;

/* `w` is the taste model: one weight per tag, plus a bias. `seen` is the last
   thing you said about each activity — nothing leaves the pool because of it,
   it only changes how often a thing comes round. `recent` is what has been in
   front of you lately, so the deck does not repeat itself. */
const fresh = () => ({
  v: DATA_V,
  w: {}, bias: 0, swipes: 0,
  seen: {},                    // id -> {v:'like'|'dislike'|'skip'|'never', at:ISO}
  recent: [],                  // ids, most recent first
  mine: [],                    // activities you wrote yourself
  edits: {},                   // id -> {t, tags, min, cost}: a pack card, rewritten
  ctx: { who:'', where:'', time:'' },
  table: { n: 1,                // how many cards the table is laid out for
           shake: true },       // and whether shaking the phone shuffles it

  packs: Object.fromEntries(PACKS.map(p => [p.id, p.on])),
  nerve: 0.3
});

let S = fresh();
let undo = null;               // the last swipe, for taking it back

/* — migration —
   This is the half of the app that only ever runs on somebody's real phone,
   which is exactly why it has to be tested against real old shapes. It was
   not, and a saved `ctx` of `{where:'any'}` — a value the new vocabulary has
   no entry for — threw during the first render and left a blank screen with
   the buttons still on it. */
const RENAMED = { social:'friends' };
const ok = (list, v) => list.some(o => o[0] === v);

/* A written activity kept `who` and `where` as fields, and its tags predate
   the duration and cost bands. Left alone it would never be dealt under any
   filter and would carry no marks. */
const fixMine = (m) => {
  let tags = (m.tags || []).map(t => RENAMED[t] || t).filter(t => t in TAGS);
  if (m.where === 'home') tags.push('home');
  else if (m.where === 'out') tags.push(tags.includes('outdoors') ? 'outdoors' : 'indoors');
  else if (m.where === 'any') tags.push('anywhere');
  if (m.who === 'solo') tags.push('solo');
  else if (m.who === 'two') tags.push('partner');
  else if (m.who === 'group') tags.push('friends');
  if (!tags.some(t => ['anywhere','indoors','outdoors','home'].includes(t))) tags.push('anywhere');
  const min = m.min || 60;
  if (!tags.some(t => DURATIONS.includes(t))) tags.push(durationOf(min));
  if (!tags.some(t => COSTS.includes(t))) tags.push(COSTS[m.cost || 0]);
  return { id: m.id, t: m.t, tags: [...new Set(tags)], min, cost: m.cost || 0, src: 'mine' };
};

const migrate = (o) => {
  const from = o.v || 1;

  if (from < 2) {
    /* Everything before this was a different list of activities under the same
       positional ids, so a verdict cannot honestly be carried across: `s12`
       used to be one thing and is now another. Losing them beats re-pointing
       them at somebody else's card. The weights are keyed on tags, so those
       do come across. */
    o.seen = {};
    delete o.list;             // liking is not a commitment any more
  } else if (from < 3) {
    /* Ids used to be the position in the list, and back then there was one
       list — the one that is now the core pack. Map against that pack rather
       than against every pack flattened, or adding a pack ahead of it in
       packs/index.json would silently re-point every one of these. */
    const was = (PACKS.find(p => p.id === 'core') || PACKS[0] || { items: [] }).items;
    const seen = {};
    for (const [id, v] of Object.entries(o.seen || {})) {
      const m = /^s(\d+)$/.exec(id);
      const to = m ? (was[+m[1]] || {}).id : id;
      if (to) seen[to] = v;
    }
    o.seen = seen;
  }

  const w = {};
  for (const [k, v] of Object.entries(o.w || {})) {
    const k2 = RENAMED[k] || k;
    if (k2 in TAGS) w[k2] = (w[k2] || 0) + v;
  }
  o.w = w;

  o.seen = Object.fromEntries(Object.entries(o.seen || {}).map(([id, s]) =>
    [id, { ...s, v: s.v === 'yes' || s.v === 'now' ? 'like' : s.v === 'no' ? 'dislike' : s.v }]));
  o.mine = (o.mine || []).map(fixMine);

  /* A rewrite is kept beside the activity rather than in it, so anything the
     vocabulary no longer knows has to be dropped here too — an edit carrying a
     dead tag would put it back into the pool by the side door. An edit whose
     activity has since left the packs is left alone: it costs nothing, and
     throwing it away would lose a rewrite that has not been exported yet. */
  o.edits = Object.fromEntries(Object.entries(o.edits || {}).map(([id, e]) =>
    [id, { ...e, tags: (e.tags || []).map(t => RENAMED[t] || t).filter(t => t in TAGS) }]));
  o.recent = [];               // ids changed shape; what you saw last week is not worth keeping

  /* The round is gone. It was bookkeeping for a guarantee — nothing repeats
     until you have been through everything — that a pile gives you for free by
     being a pile: cards come off the top and do not come back until you shuffle
     them back in. Anything saved under it is dropped rather than translated,
     because there is nothing on this side to translate it into. */
  delete o.pass;

  /* The table is a place to play with cards rather than part of the deck, so
     it keeps one number and nothing else: how many it is laid out for, which
     is what decides how big a card is drawn there. A saved state from before
     it existed has no opinion and takes the default; anything unrecognised is
     put back to it, because a nonsense here is a table with no cards on it. */
  /* The table is the app now rather than a room off it, so `n` means something
     different from what it meant when it was a sandbox: it is how the deck is
     laid out on opening. A value saved under the old meaning goes back to one,
     which is the deck as it has always looked. */
  const t = o.table || {};
  const n = from >= 6 ? Math.round(Number(t.n)) : 1;
  o.table = { n: n >= 1 && n <= 8 ? n : 1,
              shake: t.shake === undefined ? true : !!t.shake };

  /* A filter is ephemeral, and one saved under the old vocabulary means
     nothing under this one. Anything unrecognised goes back to "no filter"
     rather than being carried forward as a word the deck cannot answer. */
  const c = o.ctx || {};
  o.ctx = { who: ok(WHO, c.who) ? c.who : '',
            where: ok(WHERE, c.where) ? c.where : '',
            time: ok(TIME, c.time) ? c.time : '' };

  /* A pack the saved state has never heard of takes the default it ships
     with, and one it has an opinion about keeps it. */
  o.packs = Object.fromEntries(PACKS.map(p =>
    [p.id, (o.packs && p.id in o.packs) ? !!o.packs[p.id] : p.on]));

  o.v = DATA_V;
  return o;
};

const load = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) S = Object.assign(fresh(), migrate(JSON.parse(raw)));
  } catch (e) { /* private browsing, corrupt json — start fresh rather than die */ }
  return S;
};

let timer = null;
const save = () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { /* quota or private mode: never let a failed save take the app down */ }
  }, 200);
};

/* Everything the deck may deal: the packs you have switched on, plus whatever
   you have written. A pack added by a later version is on or off by whatever
   it says about itself, so switching one off never gets undone by an update
   and a new one does not arrive silently disabled. */
const packOn = (id) => S.packs && id in S.packs ? S.packs[id]
  : (PACKS.find(p => p.id === id) || {}).on !== false;

/* A rewrite lives beside the activity, never in it. The id still comes from the
   original title, so everything you have already said about a card survives
   being rewritten — and the pack stays the source of truth for anyone who has
   not rewritten it, which is what makes the edit exportable as a change rather
   than as a new card. */
const edited = (a) => {
  const e = S.edits && S.edits[a.id];
  return e ? { ...a, ...e, edit: true, was: a.t } : a;
};
/* `all` is every activity there is, rewritten where you have rewritten it, and
   `pool` is the part of it the deck may deal. Curating works from `all`: a
   verdict you gave a card is still a verdict after you switch its pack off. */
const all = () => SEEDS.concat(S.mine).map(edited);
const pool = () => all().filter(a => a.src === 'mine' || packOn(a.pack));
const byId = id => pool().find(c => c.id === id);

/* The activity as its pack has it, for deciding whether a rewrite still says
   anything different. */
const baseById = id => SEEDS.find(a => a.id === id) || S.mine.find(a => a.id === id);

/* What you have been shown lately, so it does not come straight back. Nothing
   is removed from the pool by this — it only sinks for a while, and it is what
   keeps the first cards of a new round from being the last of the old one. */
const RECENT_N = 40;
const remember = (id) => {
  S.recent = [id, ...S.recent.filter(x => x !== id)].slice(0, RECENT_N);
};

const exportJSON = () => JSON.stringify(S, null, 1);
const importJSON = (txt) => {
  const o = JSON.parse(txt);
  if (!o || typeof o !== 'object' || !('w' in o)) throw new Error('Not an Activinator file');
  S = Object.assign(fresh(), migrate(o)); save(); return S;
};

export { S, KEY, APP_VERSION, DATA_V, RECENT_N, fresh, load, save, all, pool, packOn, byId,
         baseById, remember, exportJSON, importJSON };
export const setUndo = v => { undo = v; };
export const getUndo = () => undo;
export const reset = () => { S = fresh(); save(); return S; };
