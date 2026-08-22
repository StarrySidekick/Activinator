/* Activinator — what gets dealt next.
   Ranking alone collapses: tell an app what you like twenty times and it will
   spend the rest of its life showing you that. This app exists to widen what
   you do, so a fixed share of every hand is a wildcard, and a wildcard says on
   its face that it is one. Nothing is dealt without a reason it can print. */
import { S, pool } from './state.js';
import { scoreOf, chanceOf, reasons, warm } from './taste.js';

const DAY = 864e5;
const ago = iso => (Date.now() - new Date(iso).getTime()) / DAY;

/* How long a verdict silences a card. A no is not forever — you were tired,
   or it was raining. A never is. */
const QUIET = { no: 45, yes: 120, now: 120, done: 150, never: 1e6 };

const awake = (c) => {
  const s = S.seen[c.id];
  if (!s) return true;
  if (S.list.some(l => l.id === c.id && !l.done)) return false;   // already on the list
  return ago(s.at) > (QUIET[s.v] ?? 30);
};

const fits = (c) => {
  const x = S.ctx;
  if (x.who !== 'any' && c.who !== 'any' && c.who !== x.who) return false;
  if (x.who === 'solo' && (c.who === 'two' || c.who === 'group')) return false;
  if (x.where !== 'any' && c.where !== 'any' && c.where !== x.where) return false;
  if (x.time && c.min > x.time) return false;
  return true;
};

/* A dealt card is a seed plus the sentence explaining why it is in front of
   you, and nothing else. There is no variation on a seed and no pairing of two
   of them: a card is one thing to go and do. */
let n = 0;
const cardOf = (seed, kind) => ({
  key: 'c' + (++n), id: seed.id, seed, kind,
  t: seed.t, tags: seed.tags, min: seed.min, who: seed.who,
  where: seed.where, cost: seed.cost
});

/* The line under the title. It is the honest reason, not a flourish: what it
   thinks it knows, or that it is guessing, or that this is a deliberate shot
   in the dark. */
const why = (card) => {
  if (card.kind === 'wild') return 'A wildcard — nothing like what you have been picking.';
  if (!warm()) return 'Still working you out. Keep swiping.';
  const r = reasons(card, 2);
  if (!r.length) return 'No strong feelings either way about this one.';
  const up = r.filter(x => x.up).map(x => x.label);
  const down = r.filter(x => !x.up).map(x => x.label);
  if (up.length && !down.length) return 'You go for ' + up.join(' and ') + '.';
  if (down.length && !up.length) return 'You usually pass on ' + down.join(' and ') + '.';
  return 'You go for ' + up.join(' and ') + ', but not ' + down.join(' and ') + '.';
};

/* How well a tag is known. A tag it has barely met is worth a wildcard on:
   curiosity is cheaper than regret. */
const seenTag = (g) => Math.abs(S.w[g] || 0);
const fresher = (a, b) => {
  const av = a.tags.reduce((s, g) => s + seenTag(g), 0) / a.tags.length;
  const bv = b.tags.reduce((s, g) => s + seenTag(g), 0) / b.tags.length;
  return av - bv;
};

const rand = a => a[(Math.random() * a.length) | 0];

/* Deal `want` cards. Mostly the top of the ranking, with wildcards spliced in
   at the rate the nerve slider asks for, and no two neighbours leaning on the
   same tag — a run of five outdoor cards reads as a broken app even when each
   one is individually right. */
const deal = (want = 6, exclude = []) => {
  const skip = new Set(exclude);
  const live = pool().filter(c => fits(c) && awake(c) && !skip.has(c.id));
  if (!live.length) return [];

  const ranked = live.map(c => ({ c, s: scoreOf(c) })).sort((a, b) => b.s - a.s);
  const cold = !warm();
  const nerve = cold ? 0.85 : S.nerve;
  const strangers = live.slice().sort(fresher);   // least-known tags first

  const out = [];
  const used = new Set();
  const lean = [];                                 // dominant tag of the last two
  const takeable = (c) => !used.has(c.id) &&
    !(c.tags.filter(g => lean.includes(g)).length >= 2);

  while (out.length < want) {
    const wild = Math.random() < nerve;
    let seed = null;
    if (wild) {
      const bag = strangers.slice(0, Math.max(8, strangers.length >> 1)).filter(takeable);
      seed = bag.length ? rand(bag) : null;
    } else {
      const top = ranked.slice(0, Math.max(6, ranked.length >> 2)).map(r => r.c).filter(takeable);
      seed = top.length ? rand(top) : null;
    }
    if (!seed) {
      const any = live.filter(c => !used.has(c.id));
      if (!any.length) break;
      seed = rand(any);
    }
    used.add(seed.id);
    lean.push(...seed.tags.slice(0, 2)); while (lean.length > 4) lean.shift();

    const card = cardOf(seed, 'plain');

    /* A wildcard is a card dealt against what it knows, so on the first day it
       knows nothing and there is nothing to deal against — labelling the whole
       first hand "wildcard" teaches you that the word means nothing. */
    card.wild = wild && !cold;
    if (card.wild) card.kind = 'wild';
    card.why = why(card);
    card.odds = chanceOf(card);
    out.push(card);
  }
  return out;
};

export { deal, fits, awake, why };
