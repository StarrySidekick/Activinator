/* Activinator — what it works out about you.
   A card is a bag of tags; taste is one weight per tag, learned online. The
   whole model is here and it is deliberately small enough to print on the
   taste screen: if it cannot be explained back to you in a sentence, it is
   the wrong model for an app whose job is to widen what you do. */
import { S, save } from './state.js';
import { TAGS } from './data.js';

const sig = x => 1 / (1 + Math.exp(-x));

/* Dividing by sqrt(n) keeps a card with eight tags from shouting over one
   with three — the score is the average opinion, not the total. */
const scoreOf = (card) => {
  const t = card.tags;
  if (!t.length) return S.bias;
  let s = 0; for (const g of t) s += (S.w[g] || 0);
  return S.bias + s / Math.sqrt(t.length);
};

const chanceOf = card => sig(scoreOf(card));

/* Logistic update. `strength` is how much a verdict counts: a swipe is 1,
   doing it is 1.5 (you did it, which is better evidence than liking the look
   of it), and never is a verdict about a whole kind of thing.

   It returns a mark — the weights as they were — because taking a swipe back
   has to restore them exactly. Reversing the arithmetic instead looks right
   and is not: the error term is recomputed from weights the update itself
   moved, so undo left the model a little different every time. */
const learn = (card, y, strength = 1) => {
  const t = card.tags; if (!t.length) return null;
  const err = (y - sig(scoreOf(card))) * strength;
  const lr = 0.42 / Math.sqrt(t.length);
  const before = {};
  for (const g of t) { before[g] = S.w[g] || 0; S.w[g] = before[g] * 0.997 + lr * err; }
  const db = 0.12 * err;
  S.bias += db; S.swipes += 1;
  save();
  return { before, db };
};

const unlearn = (mark) => {
  if (!mark) return;
  for (const g in mark.before) S.w[g] = mark.before[g];
  S.bias -= mark.db;
  S.swipes = Math.max(0, S.swipes - 1);
  save();
};

/* The two or three tags doing the most work on this card, for the line that
   tells you why you are looking at it. */
const reasons = (card, n = 2) => card.tags
  .map(g => [g, S.w[g] || 0])
  .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
  .slice(0, n).filter(([, v]) => Math.abs(v) > 0.08)
  .map(([g, v]) => ({ tag: g, label: TAGS[g] || g, up: v > 0 }));

/* Sorted opinions, for the taste screen. Only tags it has actually met. */
const opinions = () => Object.entries(S.w)
  .filter(([, v]) => Math.abs(v) > 0.04)
  .sort((a, b) => b[1] - a[1])
  .map(([g, v]) => ({ tag: g, label: TAGS[g] || g, v }));

/* Under this many swipes it is guessing, and it should say so. */
const warm = () => S.swipes >= 12;

export { scoreOf, chanceOf, learn, unlearn, reasons, opinions, warm, sig };
