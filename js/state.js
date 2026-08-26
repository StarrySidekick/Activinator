/* Activinator — state and storage.
   One key in localStorage, one shape, one place that touches it. Everything
   the app knows about you is here: the weights it has learned, what you have
   said about what, and what you have written yourself. */
import { SEEDS, PACKS, TAGS, WHO, WHERE, TIME, DURATIONS, COSTS, durationOf } from './data.js';

const KEY = 'activinator.v1';
const APP_VERSION = '0.10';
const DATA_V = 3;

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
  ctx: { who:'', where:'', time:'' },
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
  o.recent = [];               // ids changed shape; what you saw last week is not worth keeping

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
const pool = () => SEEDS.filter(a => packOn(a.pack)).concat(S.mine);
const byId = id => pool().find(c => c.id === id);

/* What you have been shown lately, so it does not come straight back. Nothing
   is removed from the pool by this — it only sinks for a while. */
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

export { S, KEY, APP_VERSION, DATA_V, RECENT_N, fresh, load, save, pool, packOn, byId, remember,
         exportJSON, importJSON };
export const setUndo = v => { undo = v; };
export const getUndo = () => undo;
export const reset = () => { S = fresh(); save(); return S; };
