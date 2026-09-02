/* Activinator — what gets dealt next.
   Nothing ever leaves the pool. A dislike is not a deletion: it sinks, and it
   can surface again months later when you are a different mood. Only "never
   again", said deliberately on the back of a card, takes something out.

   Ranking alone collapses — tell an app what you like twenty times and it will
   spend the rest of its life showing you that — so a fixed share of every hand
   is dealt against what it knows, and says so on its face.

   **It builds a pile, once, and then deals off the top of it.** That is the
   whole of "nothing repeats until you have been through everything": a card
   that has come off the pile is not in the pile any more, and the only way it
   comes back is you shuffling it back in. There was a round here doing the same
   job with bookkeeping — a list of what had been said about, and a screen at
   the end of it — and a pile is the same guarantee without anything to keep.

   The pile is stacked rather than jumbled: the top of it is what the model
   thinks you will go for, with a share of wildcards mixed through at the rate
   the nerve slider asks for, and no two neighbours leaning on the same tag. A
   run of five outdoor cards reads as a broken app even when each one is
   individually right. */
import { S, pool } from './state.js';
import { DURATIONS, PACKS } from './data.js';
import { scoreOf, chanceOf, reasons, warm } from './taste.js';

/* What a verdict is worth next time round. Liked things come up more, disliked
   things less, and a skip means nothing at all — it was not about the card. */
const BIAS = { like: 0.8, dislike: -0.8, skip: 0 };

/* How far something sinks for having just been in front of you. It is the only
   thing keeping a hand from repeating, and it wears off completely. */
const RECENCY = 2.6;

const rank = t => DURATIONS.indexOf(t);
const durationOfCard = c => DURATIONS.find(d => c.tags.includes(d));

/* Where and who are tags, so the filter is a tag test — but neither is a flat
   list of equals. `home` is indoors, so asking for indoors gets it; `anywhere`
   is a card saying it does not care, so it answers to everything. */
const PLACES = { home:['home','anywhere'], indoors:['indoors','home','anywhere'],
                 outdoors:['outdoors','anywhere'] };
const WHO = ['solo','partner','friends','newpeople'];

/* Who is a constraint rather than a description: a card that names nobody works
   however you like, so it answers to whoever you asked for. */
const fits = (c) => {
  const x = S.ctx || {};
  // A filter value the vocabulary does not know is ignored rather than obeyed.
  // `PLACES[x.where]` on a value saved by an older version was undefined, and
  // calling `.some` on it threw during boot — which is a blank screen, not a
  // bad filter. Migration should never let that value through; this is so that
  // a value that slips past anyway costs a wrong filter and not the app.
  if (x.where && PLACES[x.where] && !PLACES[x.where].some(t => c.tags.includes(t))) return false;
  if (x.who && WHO.includes(x.who)) {
    const named = WHO.filter(t => c.tags.includes(t));
    if (named.length && !named.includes(x.who)) return false;
  }
  if (x.time && rank(x.time) >= 0 && rank(durationOfCard(c)) > rank(x.time)) return false;
  return true;
};

const live = (c) => (S.seen[c.id] || {}).v !== 'never';

/* A dealt card is a seed plus the sentence explaining why it is in front of
   you, and nothing else. */
let n = 0;
const cardOf = (seed, kind) => ({
  key: 'c' + (++n), id: seed.id, seed, kind,
  t: seed.t, tags: seed.tags, min: seed.min, cost: seed.cost,
  d: seed.d, lang: seed.lang,
  /* A card in a two-sided pack is printed on both sides — the word on one, the
     meaning on the other — so it can be dealt either way up and turned over to
     check yourself. Everything else has one face and its back is what the app
     knows about it. */
  twoSided: !!((PACKS.find(p => p.id === seed.pack) || {}).twosided && seed.d),
  edit: seed.edit, was: seed.was          // a rewrite says so on the back of the card
});

/* The line on the back. The honest reason, not a flourish. */
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

/* Everything that decides where a card sits in the hand. */
const weightOf = (c) => {
  let s = scoreOf(c);
  const seen = S.seen[c.id];
  if (seen) s += BIAS[seen.v] || 0;
  const i = S.recent.indexOf(c.id);
  if (i >= 0) s -= RECENCY * (1 - i / S.recent.length);
  return s;
};

/* How well a tag is known. A tag it has barely met is worth a wildcard on:
   curiosity is cheaper than regret. */
const fresher = (a, b) => {
  const av = a.tags.reduce((s, g) => s + Math.abs(S.w[g] || 0), 0) / a.tags.length;
  const bv = b.tags.reduce((s, g) => s + Math.abs(S.w[g] || 0), 0) / b.tags.length;
  return av - bv;
};
const rand = a => a[(Math.random() * a.length) | 0];

/* Build the pile: every card that may be dealt, stacked in the order it will
   come off. Seeds rather than dealt cards — the sentence on the back and the
   odds are worked out when a card actually reaches the table, and doing it for
   fifteen hundred cards up front is fifteen hundred sentences nobody reads.

   The order is the old dealer's, run until it has used everything up instead of
   until it has six: mostly the top of the ranking, wildcards spliced in at the
   rate the nerve slider asks for, and no two neighbours leaning on the same tag.
   What is left over when those runs dry goes on the bottom in whatever order it
   comes, which is what the bottom of a pile is.

   `recent` sinks what you have just been shown, so a reshuffle does not open on
   the cards it closed with. */
const buildPile = () => {
  const all = pool().filter(c => live(c) && fits(c));
  if (!all.length) return [];

  /* weightOf already sinks what is in `recent`, which is what keeps a reshuffle
     from opening on the cards it closed with. */
  const ranked = all.map(c => ({ c, s: weightOf(c) })).sort((a, b) => b.s - a.s);
  const cold = !warm();
  const nerve = cold ? 0.85 : S.nerve;
  const strangers = all.slice().sort(fresher);

  const out = [];
  const used = new Set();
  const lean = [];
  const takeable = (c) => !used.has(c.id) && !(c.tags.filter(g => lean.includes(g)).length >= 2);

  /* Cursors rather than re-filtering the whole pool every time round. This runs
     once per card, and re-filtering fifteen hundred cards fifteen hundred times
     is the difference between opening the app and waiting for it. */
  const rAt = { i: 0 }, sAt = { i: 0 };
  /* A window off the top of what is left, rather than the very top card, or the
     pile comes out in flat ranking order and every sitting opens the same way. */
  const pick = (list, at, get) => {
    const win = [];
    for (let i = at.i; i < list.length && win.length < 12; i++) {
      const c = get(list[i]);
      if (takeable(c)) win.push(c);
    }
    return win.length ? win[(Math.random() * win.length) | 0] : null;
  };
  const rc = x => x.c, sc = x => x;

  while (out.length < all.length) {
    const wild = Math.random() < nerve;
    let seed = wild ? pick(strangers, sAt, sc) : pick(ranked, rAt, rc);
    /* Both windows can come back empty when what is left all leans the same
       way. The lean rule is a nicety and running out of cards is not, so it
       gives way rather than ending the pile early. */
    if (!seed) seed = pick(ranked, rAt, rc) || pick(strangers, sAt, sc);
    if (!seed) { for (const c of all) if (!used.has(c.id)) { seed = c; break; } }
    if (!seed) break;

    used.add(seed.id);
    while (rAt.i < ranked.length && used.has(ranked[rAt.i].c.id)) rAt.i++;
    while (sAt.i < strangers.length && used.has(strangers[sAt.i].id)) sAt.i++;
    lean.push(...seed.tags.slice(0, 2)); while (lean.length > 4) lean.shift();
    seed.wild = wild && !cold;
    out.push(seed);
  }
  return out;
};

/* One card, off the top of the pile and onto the table: the seed plus the
   sentence explaining why it is in front of you, and nothing else. */
const dealt = (seed) => {
  const card = cardOf(seed, seed.wild ? 'wild' : 'plain');
  card.wild = !!seed.wild;
  card.why = why(card);
  card.odds = chanceOf(card);
  return card;
};

export { buildPile, dealt, cardOf, fits, live, why, durationOfCard };
