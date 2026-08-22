/* Activinator — the deck itself: what is in the hand, and what a verdict does.
   A verdict lands the instant you let go — the state is written, the queue
   moves, the list updates — and the card flies off over the top of all that.
   Nothing waits for an animation, ever. */
import { S, save, setUndo, getUndo } from './state.js';
import { deal, retwist as reroll } from './deal.js';
import { learn, unlearn } from './taste.js';
import { cardHTML } from './cards.js';

const $ = s => document.querySelector(s);
const HAND = 3;                       // how many are in the DOM at once
let Q = [];

const now = () => new Date().toISOString();

const toast = (msg) => {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 1700);
};

/* Top up to a full hand, never dealing something already in it. */
const refill = () => {
  if (Q.length >= HAND + 1) return;
  Q = Q.concat(deal(HAND + 2 - Q.length, Q.map(c => c.id)));
};

const reset = () => { Q = []; refill(); render(); };

/* The two behind the top card sit back and down, so the deck reads as a
   deck. Written inline rather than as classes: a drag overwrites the top
   card's transform every frame and must not have to fight a stylesheet. */
const FAN = ['translate(0,0)', 'translateY(7px) rotate(-2.4deg) scale(.985)',
             'translateY(13px) rotate(2.8deg) scale(.968)'];
const place = (els) => {
  els.forEach((el, i) => {
    el.classList.toggle('top', i === 0);
    el.style.transform = FAN[i] || FAN[2];
    el.style.opacity = 1 - i * .14;
  });
};

const emptyHTML = () => {
  const filtered = S.ctx.who !== 'any' || S.ctx.where !== 'any' || S.ctx.time;
  return `<div class="empty">
    <h2>That is the lot, for now.</h2>
    <p>${filtered
      ? 'Nothing left that fits what you asked for. Widen it and there will be plenty.'
      : 'You have been through everything the deck can make of what it knows. Bring back the ones you passed on, or write your own.'}</p>
    <button data-act="${filtered ? 'ctx' : 'forgive'}">${filtered ? 'Change what you asked for' : 'Bring back the passes'}</button>
    <button data-act="add">Write your own</button>
  </div>`;
};

const render = () => {
  const deck = $('#deck');
  deck.innerHTML = Q.length
    ? Q.slice(0, HAND).map(c => cardHTML(c)).reverse().join('')   // top card last in DOM
    : emptyHTML();
  // reverse() above paints the top card over the others; place() reads the
  // real order back off the array, so it walks the nodes in the same order.
  const els = [...deck.querySelectorAll('.card')].reverse();
  els.forEach((el, i) => { el.style.zIndex = 10 - i; el.dataset.depth = i; });
  place(els);
  $('#listn').textContent = S.list.filter(l => !l.done).length || '';
  $('.act.undo').classList.toggle('on', !!getUndo());
  $('#ctxline').textContent = ctxLine();
};

const CTXWHO   = { any:'Anyone', solo:'Just me', two:'The two of us', group:'A few of us' };
const CTXWHERE = { any:'Anywhere', home:'At home', out:'Out' };
const CTXTIME  = { 0:'Any length', 30:'Half an hour', 90:'An evening', 300:'An afternoon', 600:'A whole day' };
/* The bar says what you have asked for, and when you have asked for nothing
   it says so in words rather than printing three synonyms for "any". */
const ctxLine = () => {
  const p = [];
  if (S.ctx.who !== 'any')   p.push(CTXWHO[S.ctx.who]);
  if (S.ctx.where !== 'any') p.push(CTXWHERE[S.ctx.where]);
  if (S.ctx.time)            p.push(CTXTIME[S.ctx.time]);
  return p.length ? p.join(' · ') : 'Up for anything';
};

const top = () => Q[0];

/* yes | now | no | never. Strength is how much the verdict counts: doing it
   now is better evidence than fancying it, and never is a verdict about a
   whole kind of thing rather than about tonight. */
const WEIGHT = { yes:[1, 1], now:[1, 1.4], no:[0, 1], never:[0, 2.2] };

const say = (v) => {
  const c = top(); if (!c) return;
  const [y, strength] = WEIGHT[v];
  const mark = learn(c, y, strength);
  S.seen[c.id] = { v, at: now() };
  let entry = null;
  if (v === 'yes' || v === 'now') {
    entry = { id: c.id, card: { t:c.t, d:c.d, twist:c.twist, tags:c.tags, min:c.min, where:c.where, who:c.who, cost:c.cost },
              at: now(), now: v === 'now', done: null };
    S.list.unshift(entry);
  }
  setUndo({ card: c, v, entry, mark });
  Q.shift(); save(); refill();

  // The card leaves over the top of a queue that has already moved on.
  const el = document.querySelector('#deck .card.top');
  if (el) {
    const off = window.innerWidth * 1.4;
    const to = v === 'now' ? `translate(0,${-window.innerHeight}px) rotate(-4deg)`
      : v === 'yes' ? `translate(${off}px,-40px) rotate(22deg)`
      : `translate(${-off}px,-40px) rotate(-22deg)`;
    el.classList.remove('top'); el.classList.add('gone'); el.style.transform = to;
    setTimeout(() => el.remove(), 360);
    const rest = [...document.querySelectorAll('#deck .card:not(.gone)')];
    rest.forEach(r => r.classList.add('rest'));
    place(rest);
    setTimeout(() => { render(); }, 340);
  } else render();

  toast(v === 'yes' ? 'On the list' : v === 'now' ? 'Off you go, then' :
        v === 'never' ? 'Never again' : 'Noted');
};

/* Undo has to take the learning back with it, or it is a lie: the card
   returns and the weights it moved stay moved. */
const takeBack = () => {
  const u = getUndo(); if (!u) return;
  unlearn(u.mark);
  delete S.seen[u.card.id];
  if (u.entry) S.list = S.list.filter(l => l !== u.entry);
  Q.unshift(u.card);
  setUndo(null); save(); render();
  toast('Back it comes');
};

/* "More like this" is a yes with its thumb on the scales, and it keeps the
   card in the hand rather than filing it — you have not agreed to do it. */
const more = () => {
  const c = top(); if (!c) return;
  learn(c, 1, 1.6);
  toast('More of this sort of thing');
  render();
};

/* Re-rolling lands you back on the front, because the new twist is the thing
   you just asked to see. */
const retwist = () => {
  const c = top(); if (!c) return;
  const t = reroll(c);
  if (!t) return toast('Nothing else to try with this one');
  Q[0] = t; render(); toast('Different twist');
};

export { Q, retwist, render, refill, reset, say, takeBack, more, toast, top, ctxLine, place };
