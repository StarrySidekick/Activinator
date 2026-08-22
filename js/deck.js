/* Activinator — the deck itself: what is in the hand, and what a verdict does.
   A verdict lands the instant you let go — the state is written, the queue
   moves on — and the card flies off over the top of all that. Nothing waits
   for an animation, ever. */
import { S, save, setUndo, getUndo, remember } from './state.js';
import { deal } from './deal.js';
import { learn, unlearn } from './taste.js';
import { cardHTML } from './cards.js';

const $ = s => document.querySelector(s);
const HAND = 3;                       // how many are in the DOM at once
let Q = [];

const now = () => new Date().toISOString();

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

const emptyHTML = () => `<div class="empty">
    <h2>Nothing fits what you asked for.</h2>
    <p>Widen it and there will be plenty — nothing is ever used up, it only
    sinks for a while.</p>
    <button data-act="ctx">Change what you asked for</button>
  </div>`;

const render = () => {
  const deck = $('#deck');
  deck.innerHTML = Q.length
    ? Q.slice(0, HAND).map(c => cardHTML(c)).reverse().join('')   // top card last in DOM
    : emptyHTML();
  const els = [...deck.querySelectorAll('.card')].reverse();
  els.forEach((el, i) => { el.style.zIndex = 10 - i; });
  place(els);
  $('.dock .undo').classList.toggle('on', !!getUndo());
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

export { Q, render, refill, reset, say, takeBack, more, toast, top };
