/* Activinator — state and storage.
   One key in localStorage, one shape, one place that touches it. Everything
   the app knows about you is here: the weights it has learned, what you said
   about what, and what is on the list. */
import { SEEDS } from './data.js';

const KEY = 'activinator.v1';
const APP_VERSION = '0.1';

/* `w` is the taste model: one weight per tag, plus a bias. `seen` is what
   each card was told and when, so a no can expire rather than being a life
   sentence. `list` is what you said yes to and have not finished. */
const fresh = () => ({
  v: 1,
  w: {}, bias: 0, swipes: 0,
  seen: {},                    // id -> {v:'yes'|'no'|'now'|'never'|'done', at:ISO}
  list: [],                    // {id, card, at, now:bool, done:ISO|null}
  mine: [],                    // activities you wrote yourself
  ctx: { who:'any', where:'any', time:0 },
  nerve: 0.3,                  // how often it deals a wildcard
  streak: { day:null, n:0 }
});

let S = fresh();
let undo = null;               // the last swipe, for taking it back

const load = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) S = Object.assign(fresh(), JSON.parse(raw));
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
const byId = id => pool().find(c => c.id === id) || (S.list.find(l => l.id === id) || {}).card;

const exportJSON = () => JSON.stringify(S, null, 1);
const importJSON = (txt) => {
  const o = JSON.parse(txt);
  if (!o || typeof o !== 'object' || !('w' in o)) throw new Error('Not an Activinator file');
  S = Object.assign(fresh(), o); save(); return S;
};

export { S, KEY, APP_VERSION, fresh, load, save, pool, byId, exportJSON, importJSON };
export const setUndo = v => { undo = v; };
export const getUndo = () => undo;
export const reset = () => { S = fresh(); save(); return S; };
