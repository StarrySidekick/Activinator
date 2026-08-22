/* Activinator — state and storage.
   One key in localStorage, one shape, one place that touches it. Everything
   the app knows about you is here: the weights it has learned, what you have
   said about what, and what you have written yourself. */
import { SEEDS } from './data.js';

const KEY = 'activinator.v1';
const APP_VERSION = '0.5';

/* `w` is the taste model: one weight per tag, plus a bias. `seen` is the last
   thing you said about each activity — nothing leaves the pool because of it,
   it only changes how often a thing comes round. `recent` is what has been in
   front of you lately, so the deck does not repeat itself. */
const fresh = () => ({
  v: 2,
  w: {}, bias: 0, swipes: 0,
  seen: {},                    // id -> {v:'like'|'dislike'|'skip'|'never', at:ISO}
  recent: [],                  // ids, most recent first
  mine: [],                    // activities you wrote yourself
  ctx: { who:'', where:'', time:'' },
  nerve: 0.3
});

let S = fresh();
let undo = null;               // the last swipe, for taking it back

/* Tags were renamed and regrouped, and a weight is keyed on a tag. Left alone,
   the model would keep an opinion about words that no longer mean anything and
   lose the one it had about `social` under its new name. */
const RENAMED = { social:'friends' };
const migrate = (o) => {
  if (o.v >= 2) return o;
  const w = {};
  for (const [k, v] of Object.entries(o.w || {})) {
    const k2 = RENAMED[k] || k;
    if (k2 in TAGSET) w[k2] = (w[k2] || 0) + v;
  }
  o.w = w;
  o.seen = Object.fromEntries(Object.entries(o.seen || {})
    .map(([id, s]) => [id, { ...s, v: s.v === 'yes' || s.v === 'now' ? 'like' : s.v === 'no' ? 'dislike' : s.v }]));
  delete o.list;               // liking is not a commitment any more, so there is no list
  o.recent = []; o.v = 2;
  return o;
};
let TAGSET = {};               // filled on load, from the live vocabulary

const load = (tags) => {
  TAGSET = tags || {};
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

/* Everything the deck may deal: the library plus whatever you have written. */
const pool = () => SEEDS.concat(S.mine);
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

export { S, KEY, APP_VERSION, RECENT_N, fresh, load, save, pool, byId, remember,
         exportJSON, importJSON };
export const setUndo = v => { undo = v; };
export const getUndo = () => undo;
export const reset = () => { S = fresh(); save(); return S; };
