/* Activinator — what gets dealt next.
   Nothing ever leaves the pool. A dislike is not a deletion: it sinks, and it
   can surface again months later when you are a different mood. Only "never
   again", said deliberately on the back of a card, takes something out.

   Ranking alone collapses — tell an app what you like twenty times and it will
   spend the rest of its life showing you that — so a fixed share of every hand
   is dealt against what it knows, and says so on its face.

   **It deals in rounds.** Ranking says what comes first; the round says that
   everything comes once. A card you have said something about is out until the
   round ends, and the round ends when there is nothing left in it — which is a
   screen you have to answer, not a silent reshuffle.

   It did not used to. Both draws picked at random from a wide slice of the
   ranking — the top quarter of sixteen hundred cards is four hundred — and the
   wildcard draw sorted by how well a tag was known and so did not even look at
   what you had just been shown. The card you swiped a minute ago was eligible
   again the moment it left the hand, and repeats turned up within a few dozen
   swipes on a deck it would take all day to get through. */
import { S, pool } from './state.js';
import { DURATIONS } from './data.js';
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

/* Where the round stands. The round belongs to the deck rather than to the
   filter: `total` and `left` count everything switched on, because "how far
   through the deck am I" should not change when you say you only have twenty
   minutes. `fits` and `fitsLeft` are the same question about what can actually
   be dealt this minute, which is what tells an empty screen which of the two
   things has happened. */
const cycle = () => {
  const done = new Set(S.pass.done);
  const there = pool().filter(live);
  const here = there.filter(fits);
  const left = there.filter(c => !done.has(c.id)).length;
  return { n: S.pass.n, total: there.length, left, gone: there.length - left,
           fits: here.length, fitsLeft: here.filter(c => !done.has(c.id)).length };
};

/* A dealt card is a seed plus the sentence explaining why it is in front of
   you, and nothing else. */
let n = 0;
const cardOf = (seed, kind) => ({
  key: 'c' + (++n), id: seed.id, seed, kind,
  t: seed.t, tags: seed.tags, min: seed.min, cost: seed.cost,
  d: seed.d, lang: seed.lang,
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

/* Deal `want` cards: mostly the top of the ranking, wildcards spliced in at the
   rate the nerve slider asks for, and no two neighbours leaning on the same tag
   — a run of five outdoor cards reads as a broken app even when each one is
   individually right. */
const deal = (want = 6, exclude = []) => {
  const skip = new Set(exclude);
  const done = new Set(S.pass.done);
  /* The round is the hard part of this filter: a card you have said something
     about is not dealt again until the round is over, however well it scores.
     Nothing here starts a new round — an empty hand is a question for the
     screen to ask, because a deck that quietly reshuffles is a deck you cannot
     tell you have finished. */
  const all = pool().filter(c => live(c) && fits(c) && !skip.has(c.id) && !done.has(c.id));
  if (!all.length) return [];

  /* What you were just shown is out of the next hand as well as the last one.
     Sinking it in the ranking was not enough: the wildcard draw sorts by how
     well a tag is known and never reads the ranking at all, which is how the
     card you swiped a minute ago came back labelled "a wildcard". Inside a
     round the round itself covers this; it is the first hand after going round
     again that needs it. A soft bar — if honouring it would leave too little to
     deal from, it is dropped, because an empty hand is worse than a card you
     saw a while ago. */
  const back = new Set(S.recent);
  const notLately = all.filter(c => !back.has(c.id));
  const draw = notLately.length >= Math.max(want, 8) ? notLately : all;

  const ranked = draw.map(c => ({ c, s: weightOf(c) })).sort((a, b) => b.s - a.s);
  const cold = !warm();
  const nerve = cold ? 0.85 : S.nerve;
  const strangers = draw.slice().sort(fresher);

  const out = [];
  const used = new Set();
  const lean = [];
  const takeable = (c) => !used.has(c.id) && !(c.tags.filter(g => lean.includes(g)).length >= 2);

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
      const any = all.filter(c => !used.has(c.id));
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

export { deal, cycle, fits, live, why, durationOfCard };
