/* Activinator — the table.

   A place to handle cards rather than decide about them. The deck is the app;
   this is the thing next to it, for working out how cards should behave before
   any of it becomes how the deck behaves. So it is deliberately separate: it
   deals from its own shuffled pile, it teaches the taste model nothing, it
   does not touch the round, and closing it throws the whole table away.

   What it does: tap the pile to deal a card, drag a card anywhere, tap a card
   to turn it over, shuffle, or gather everything back in. How many cards it is
   laid out for is a number you set, and it decides how big a card is drawn —
   which is the whole of "how many can I see at once".

   Cards land on a random side. On a two-sided pack — Words and Italian — that
   means half of them arrive showing the meaning and half showing the word,
   which is the point: it is a deck you can test yourself with rather than read
   off. On every other pack the other side is the pack's own printed back, so a
   card that lands face down is a card face down on a table. */
import { S, save, pool } from './state.js';
import { PACKS } from './data.js';
import { live } from './deal.js';
import { esc, markHTML, indexOf } from './cards.js';
import { toast } from './deck.js';

const host = () => document.getElementById('table');
const $ = (s) => host() && host().querySelector(s);

/* The pile is seeds in a shuffled order, dealt off the front. `OUT` is what is
   on the table, in the order it was dealt — the index is what decides which
   slot of the layout a card was given. */
let PILE = [];
let OUT = [];
let Z = 10;
let open = false;

const rand = (n) => (Math.random() * n) | 0;
/* Fisher–Yates, because a `sort(() => Math.random() - .5)` shuffle is not one:
   the comparator is inconsistent and the browser is entitled to anything. */
const shuffled = (a) => {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) { const j = rand(i + 1); [x[i], x[j]] = [x[j], x[i]]; }
  return x;
};

const packOf = (c) => PACKS.find(p => p.id === c.pack) || {};

/* — laying the table —
   The number you set is how many cards have to fit, and that is what decides
   how big one is drawn. Try every number of columns and keep whichever gives
   the widest card: at four that is two by two on a phone and four in a row on
   something wider, worked out rather than chosen. */
const GAP = 10;
const gridFor = (n, w, h) => {
  let best = { cols: 1, rows: 1, cw: 0 };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const cw = Math.min((w - GAP * (cols + 1)) / cols,
                        ((h - GAP * (rows + 1)) / rows) * 7 / 12);
    if (cw > best.cw) best = { cols, rows, cw };
  }
  return best;
};

/* Where the i-th card dealt goes. Past the number the table is laid out for it
   starts round again, a little down and across each time — a table you have
   over-dealt is a table with cards on top of cards, which is what a table is. */
const slotOf = (i) => {
  const felt = $('.felt');
  const n = Math.max(1, S.table.n);
  const w = felt.clientWidth, h = felt.clientHeight;
  const { cols, rows, cw } = gridFor(n, w, h);
  const ch = cw * 12 / 7;
  const k = i % n, lap = (i / n) | 0;
  const row = (k / cols) | 0;
  /* Three cards in a two-wide grid is a row of two and a row of one, and the
     one goes in the middle. A last row left hanging off to the left reads as a
     card missing rather than as a table laid for three. */
  const inRow = Math.min(cols, n - row * cols);
  const y0 = (h - (rows * ch + (rows - 1) * GAP)) / 2;
  const x0 = (w - (inRow * cw + (inRow - 1) * GAP)) / 2;
  /* Kept on the table. Deal enough past what it is laid out for and the offset
     that stacks them would walk the last ones off the edge, and a card you
     cannot see is a card you have lost. */
  const fit = (v, size, room) => Math.max(0, Math.min(v, room - size));
  return { w: cw, h: ch, lap,
           x: fit(x0 + (k % cols) * (cw + GAP) + lap * 13, cw, w),
           y: fit(y0 + row * (ch + GAP) + lap * 13, ch, h) };
};

/* — a card on the table —
   Side A is the card as the deck prints it: the corner index and the thing
   itself. Side B is either the meaning, on a pack that says it is two-sided,
   or the pack's own printed back on every other one.

   On a verb card the meaning is a paragraph — the English first, then the
   tenses — so the first line is set as the headline and the rest goes under it
   small. That is what makes "one side the Italian, one side the English" true
   of a card that also has to carry a conjugation table. */
const sideB = (c) => {
  const p = packOf(c);
  if (p.twosided && c.d) {
    const [head, ...rest] = String(c.d).split('\n');
    return `<div class="face b">
      ${indexOf(c)}
      <div class="word">
        <h2 class="t">${esc(head)}</h2>
        ${rest.length ? `<p class="tdef">${esc(rest.join('\n'))}</p>` : ''}
      </div>
    </div>`;
  }
  return `<div class="face b printed ${p.back ? 'back-' + esc(p.back) : ''}"
    style="--ink:${esc(p.ink || '#2a2f3a')}">${p.mark ? markHTML(p.mark, 'pip') : ''}</div>`;
};

const cardHTML = (o) => `<article class="tcard ${o.side ? 'flip' : ''}" data-tk="${o.k}">
  <div class="tcardin">
    <div class="face a">
      ${indexOf(o.c)}
      <div class="word"><h2 class="t">${esc(o.c.t)}</h2></div>
    </div>
    ${sideB(o.c)}
  </div>
</article>`;

/* Position and size are inline, because a drag rewrites them every frame and
   must not have to fight a stylesheet. */
const place = (o) => {
  const s = slotOf(o.i);
  if (o.x == null) { o.x = s.x; o.y = s.y; }
  o.el.style.width = s.w + 'px';
  o.el.style.left = o.x + 'px';
  o.el.style.top = o.y + 'px';
  o.el.style.transform = `rotate(${o.rot}deg)`;
  o.el.style.zIndex = o.z;
};

/* Relaying the table — after the number changes, or the screen turns — moves
   every card back to its slot. Anything you dragged goes back where the table
   would have put it, because the alternative is cards the size of the old
   layout sitting at coordinates from it. */
const relay = () => {
  OUT.forEach(o => { o.x = o.y = null; place(o); });
};

const dealOne = () => {
  if (!PILE.length) return toast('The pile is empty');
  const c = PILE.shift();
  const o = { k: 'k' + (Z++), c, i: OUT.length, z: Z,
              side: Math.random() < 0.5 ? 1 : 0,   // a random side up, as dealt
              rot: (Math.random() * 5 - 2.5), x: null, y: null };
  OUT.push(o);
  $('.felt').insertAdjacentHTML('beforeend', cardHTML(o));
  o.el = $(`.tcard[data-tk="${o.k}"]`);
  place(o);
  /* Dealt, rather than appearing: it comes off the pile and lands. */
  o.el.animate([{ transform: `translate(0,${window.innerHeight * .4}px) scale(.8) rotate(0deg)`, opacity: 0 },
                { transform: `rotate(${o.rot}deg)`, opacity: 1 }],
               { duration: 260, easing: 'cubic-bezier(.2,.8,.25,1)' });
  count();
};

/* Shuffling is a thing you watch happen, or it is a button claiming to have
   done something you have no way of checking. */
const riffle = () => {
  const p = $('.pile');
  if (!p) return;
  p.classList.remove('riffle'); void p.offsetWidth; p.classList.add('riffle');
};

/* Shuffle is about the pile and leaves the table alone; gather is about the
   table and ends in a shuffle. They were briefly the same function, which made
   two buttons that did the same thing and no way to shuffle what you had not
   dealt yet. */
const shuffle = () => {
  PILE = shuffled(PILE);
  riffle(); count();
  toast(`Shuffled — ${PILE.length} in the pile`);
};

const takeIn = () => {
  PILE = PILE.concat(OUT.map(o => o.c));
  OUT.forEach(o => o.el.remove());
  OUT = [];
};

const gather = () => {
  if (!OUT.length) return shuffle();
  const felt = $('.felt');
  const n = OUT.length;
  /* Back into the pile rather than fading where they lie: they go to where the
     pile is, which is under the middle-left of the bar. */
  OUT.forEach(o => o.el.animate(
    [{ transform: `rotate(${o.rot}deg)`, opacity: 1 },
     { transform: `translate(${34 - o.x}px,${felt.clientHeight - o.y + 20}px) scale(.55) rotate(0deg)`, opacity: 0 }],
    { duration: 260, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }));
  setTimeout(() => {
    takeIn();
    PILE = shuffled(PILE);
    riffle(); count();
    toast(`${n} back in, and shuffled`);
  }, 250);
};

const count = () => {
  const n = $('.pilen');
  if (n) n.textContent = PILE.length;
  const p = $('.pile');
  if (p) p.classList.toggle('empty', !PILE.length);
};

/* — picking a card up —
   The same shape as the swipe: the card follows your hand exactly, and what
   you did is decided on release. A tap that barely moved turns it over; a drag
   leaves it where you let go. Picking one up brings it to the front, because a
   card you have your finger on is the top card whatever order it was dealt in. */
const G = { on: false, o: null, x: 0, y: 0, ox: 0, oy: 0, moved: 0, t: 0, id: 0 };

const down = (e) => {
  const el = e.target.closest('.tcard');
  if (!el) return;
  const o = OUT.find(x => x.k === el.dataset.tk);
  if (!o) return;
  G.on = true; G.o = o; G.id = e.pointerId; G.t = Date.now(); G.moved = 0;
  G.x = e.clientX; G.y = e.clientY; G.ox = o.x; G.oy = o.y;
  o.z = ++Z; el.style.zIndex = o.z;
  el.classList.add('held');
  el.setPointerCapture?.(e.pointerId);
};

const move = (e) => {
  if (!G.on || e.pointerId !== G.id) return;
  const dx = e.clientX - G.x, dy = e.clientY - G.y;
  G.moved = Math.max(G.moved, Math.abs(dx) + Math.abs(dy));
  if (G.moved < 6) return;
  /* You can hang a card over the edge, but not push it off: its middle stays
     on the felt, so there is always something left to pick back up. */
  const felt = $('.felt'), o = G.o;
  const w = o.el.offsetWidth, h = o.el.offsetHeight;
  o.x = Math.max(-w / 2, Math.min(G.ox + dx, felt.clientWidth - w / 2));
  o.y = Math.max(-h / 2, Math.min(G.oy + dy, felt.clientHeight - h / 2));
  o.el.style.left = o.x + 'px';
  o.el.style.top = o.y + 'px';
};

const up = (e) => {
  if (!G.on || e.pointerId !== G.id) return;
  G.on = false;
  const o = G.o;
  o.el.classList.remove('held');
  if (G.moved < 9 && Date.now() - G.t < 500) turn(o);
};

const TURN = 460;
const turn = (o) => {
  if (o.el.dataset.turning) return;
  o.el.dataset.turning = '1';
  o.side = o.side ? 0 : 1;
  o.el.classList.toggle('flip');
  setTimeout(() => { delete o.el.dataset.turning; }, TURN);
};

/* — the screen —
   Its own layer over everything, rather than a panel: a panel is a sheet you
   read and this is a surface you work on. */
const HTML = () => `
  <div class="thead">
    <h2>The table</h2>
    <button class="x" data-act="closetable" aria-label="Close">✕</button>
  </div>
  <div class="felt"></div>
  <div class="tbar">
    <div class="trow">
      <p class="tlabel">Laid out for</p>
      <div class="chips tiny">${[1, 2, 3, 4, 6, 8].map(n =>
        `<button data-act="tablen" data-v="${n}" class="${S.table.n === n ? 'on' : ''}">${n}</button>`).join('')}</div>
    </div>
    <div class="trow">
      <button class="pile" data-act="dealone" aria-label="Deal a card">
        <i></i><i></i><span class="pface"></span>
        <span class="pilen">0</span>
      </button>
      <button class="tbtn" data-act="tshuffle">Shuffle</button>
      <button class="tbtn" data-act="tgather">Gather</button>
    </div>
  </div>`;

const openTable = () => {
  if (open) return;
  open = true;
  document.body.classList.add('tabled');
  host().innerHTML = HTML();
  host().addEventListener('pointerdown', down);
  host().addEventListener('pointermove', move);
  host().addEventListener('pointerup', up);
  host().addEventListener('pointercancel', up);
  /* Its own pile, from the packs that are on the table, minus anything you
     have said "never again" to. It is not the round and never touches it. */
  PILE = shuffled(pool().filter(live));
  OUT = [];
  count();
  requestAnimationFrame(() => host().classList.add('on'));
};

const closeTable = () => {
  if (!open) return;
  open = false;
  document.body.classList.remove('tabled');
  host().classList.remove('on');
  setTimeout(() => { if (!open) host().innerHTML = ''; }, 240);
};

const setN = (n) => {
  S.table.n = Math.max(1, Math.min(8, Number(n) || 3));
  save();
  host().querySelectorAll('[data-act="tablen"]').forEach(b =>
    b.classList.toggle('on', Number(b.dataset.v) === S.table.n));
  relay();
};

addEventListener('resize', () => { if (open) relay(); });

export { openTable, closeTable, dealOne, shuffle, gather, setN, relay };
export const isOpen = () => open;
export const onTable = () => OUT.map(o => ({ id: o.c.id, t: o.c.t, side: o.side }));
export const pileSize = () => PILE.length;
