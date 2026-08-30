/* Activinator — the deck itself: what is in the hand, and what a verdict does.
   A verdict lands the instant you let go — the state is written, the queue
   moves on — and the card flies off over the top of all that. Nothing waits
   for an animation, ever. */
import { S, save, setUndo, getUndo, remember, donePass, undonePass, newPass, pool, byId } from './state.js';
import { deal, cycle, why } from './deal.js';
import { learn, unlearn, chanceOf } from './taste.js';
import { cardHTML } from './cards.js';

const $ = s => document.querySelector(s);
const HAND = 3;                       // how many are in the DOM at once
let Q = [];

const now = () => new Date().toISOString();

/* — the dock sleeps —
   Four marks in the corners of a full-bleed card are four things in front of
   the one thing you are meant to be looking at. They fade out, any touch brings
   them back, and a verdict puts them away again — you have moved on. They are
   woken once at launch so that the app never opens on a screen with nothing on
   it, and boot.js swallows the first tap on one, so a mark you cannot see is
   never a button you press by accident. */
const DOZE = 4200;
let dozer = null;
const sleep = () => { clearTimeout(dozer); document.body.classList.remove('awake'); };
const wake = () => {
  document.body.classList.add('awake');
  clearTimeout(dozer); dozer = setTimeout(sleep, DOZE);
};
const awake = () => document.body.classList.contains('awake');

const toast = (msg) => {
  const t = $('#toast'); if (!msg) return;
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 1500);
};

const refill = () => {
  if (Q.length >= HAND + 1) return;
  Q = Q.concat(deal(HAND + 2 - Q.length, Q.map(c => c.id)));
};

const reset = () => { Q = []; refill(); render(); };

/* Rewriting a card must not deal a new hand: the whole point of an edit is that
   you were about to swipe *this* one and wanted it to say something better
   first. The hand keeps its order and each card is re-read from the pool, odds
   and reason included — they were worked out from words that have changed. */
const restack = () => {
  Q = Q.map(c => {
    const s = byId(c.id); if (!s) return c;
    const card = { ...c, t:s.t, tags:s.tags, min:s.min, cost:s.cost, d:s.d, lang:s.lang,
                   edit:s.edit, was:s.was };
    card.why = why(card); card.odds = chanceOf(card);
    return card;
  });
  render();
};

/* The two behind the top card fan out behind it, so the deck reads as a deck.
   Written inline rather than as classes: a drag overwrites the top card's
   transform every frame and must not have to fight a stylesheet. */
/* Full-bleed cards cannot fan sideways — an offset would show as a misaligned
   edge against the screen. They sit back instead, and step forward as the one
   above them leaves. */
const FAN = ['translate(0,0)', 'scale(.965)', 'scale(.93)'];
const place = (els) => {
  els.forEach((el, i) => {
    el.classList.toggle('top', i === 0);
    el.style.transform = FAN[i] || FAN[2];
    el.style.opacity = 1;
  });
};

/* An empty deck has three causes and they need different answers: there is
   nothing to ask of, you have asked for something nothing matches, or you have
   been through everything that does match. Sending you to the filters when
   every pack is switched off is a dead end, and calling the end of a round
   "nothing fits" would be a lie about the one thing you wanted to be told. */
const emptyHTML = () => {
  if (pool().length === 0) return `<div class="empty">
      <h2>Nothing to deal.</h2>
      <p>Every pack is switched off, so the deck has nothing in it.</p>
      <button data-act="packs">Switch a pack on</button>
    </div>`;

  const c = cycle();
  if (!c.fits) return `<div class="empty">
      <h2>Nothing fits what you asked for.</h2>
      <p>Widen it and there will be plenty — nothing is ever used up.</p>
      <button data-act="ctx">Change what you asked for</button>
    </div>`;

  /* Running out of things that fit is not the end of the round, and offering
     "go round again" as the answer to it would quietly throw away everything
     you had got through outside the filter. Widening it is the answer; going
     round anyway is there, and says what it costs. */
  if (c.left) return `<div class="empty">
      <h2>Nothing left that fits.</h2>
      <p>You have been through all ${c.fits} that match what you asked for. There are
      ${c.left} others still to come this round.</p>
      <button data-act="ctx">Ask for something else</button>
      <button class="quiet" data-act="newpass">Start the deck again anyway</button>
    </div>`;

  /* The end of a round is the one moment the deck has something to say, so it
     says it and waits. Going round again is a button rather than a reshuffle
     you never see. */
  return `<div class="empty">
      <h2>That is the whole deck.</h2>
      <p>All ${c.total} of them, this time round — round ${c.n}. Nothing has repeated,
      and nothing will until you go round again.</p>
      <button data-act="newpass">Go round again</button>
    </div>`;
};

/* Round n+1: the pool comes back, and nothing about what you like is touched. */
const goRound = () => {
  const n = newPass().n;
  reset();
  toast(`Round ${n}`);
};

const render = () => {
  const deck = $('#deck');
  deck.innerHTML = Q.length
    ? Q.slice(0, HAND).map(c => cardHTML(c)).reverse().join('')   // top card last in DOM
    : emptyHTML();
  const els = [...deck.querySelectorAll('.card')].reverse();
  els.forEach((el, i) => { el.style.zIndex = 10 - i; });
  place(els);
  $('.dock .undo').classList.toggle('on', !!getUndo());
  /* No card under the marks means no paper for them to be ink on. */
  document.body.classList.toggle('bare', !Q.length);
};

const top = () => Q[0];

/* like | dislike | skip | never. A skip says nothing about the card — it is
   not a soft no — so it teaches nothing and carries no weight. Never is a
   verdict about a whole kind of thing, and it is the only one that takes
   something out of the pool. */
const WEIGHT = { like:[1, 1], dislike:[0, 1], never:[0, 2.2] };

const say = (v) => {
  const c = top(); if (!c) return;
  const mark = v === 'skip' ? null : learn(c, WEIGHT[v][0], WEIGHT[v][1]);
  S.seen[c.id] = { v, at: now() };
  remember(c.id);
  /* Out of the round, whatever you said — a skip included. A skip is not a
     verdict, but it is still a card you have been shown, and a round that gave
     you the skipped ones again would not be a round. */
  donePass(c.id);
  setUndo({ card: c, v, mark });
  Q.shift(); save(); refill();

  const el = document.querySelector('#deck .card.top');
  if (el) {
    const off = window.innerWidth * 1.4;
    const to = v === 'skip' ? `translate(0,${-window.innerHeight}px) rotate(-3deg)`
      : v === 'like' ? `translate(${off}px,-40px) rotate(22deg)`
      : `translate(${-off}px,-40px) rotate(-22deg)`;
    el.classList.remove('top'); el.classList.add('gone'); el.style.transform = to;
    setTimeout(() => el.remove(), 360);
    const rest = [...document.querySelectorAll('#deck .card:not(.gone)')];
    rest.forEach(r => r.classList.add('rest'));
    place(rest);
    setTimeout(() => render(), 340);
  } else render();

  sleep();
  toast(v === 'like' ? 'Like' : v === 'dislike' ? 'Don’t like'
      : v === 'never' ? 'Out of the pool' : '');
};

/* Undo has to take the learning back with it, or it is a lie: the card returns
   and the weights it moved stay moved. */
const takeBack = () => {
  const u = getUndo(); if (!u) return;
  unlearn(u.mark);
  delete S.seen[u.card.id];
  S.recent = S.recent.filter(x => x !== u.card.id);
  undonePass(u.card.id);
  Q.unshift(u.card);
  setUndo(null); save(); render();
  toast('Back it comes');
};

/* "More like this" is a like with its thumb on the scales, and it keeps the
   card in the hand — you have not passed it yet. */
const more = () => {
  const c = top(); if (!c) return;
  learn(c, 1, 1.6);
  toast('More of this sort of thing');
  render();
};

export { Q, render, refill, reset, restack, goRound, say, takeBack, more, toast, top,
         wake, sleep, awake };
