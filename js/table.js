/* Activinator — the table.

   The app is a table with a pile on it. Cards come off the pile onto the felt,
   you say what you think of them, and they go. How many are on the felt at once
   is a number you set: at one it is the deck it has always been — a card the
   width of the screen, swipe right for yes — and at more than one it is a
   spread you can lay out, move about and turn over.

   **There is no round any more.** There was: a list of what you had said
   something about, and a screen at the end telling you that was the whole deck.
   A pile is the same guarantee with nothing to keep — a card off the pile is not
   in the pile, and the only way it comes back is you shuffling it back in. So
   "nothing repeats until you have been through everything" is not a rule the app
   enforces, it is what a pile *is*.

   The gesture depends on the count, and it has to: at one card, dragging is the
   verdict, because that is the whole app. At more than one, dragging moves the
   card you are holding, because there is a spread to arrange and a verdict you
   can give from the back of any of them. */
import { S, save, setUndo, getUndo, remember, pool, byId } from './state.js';
import { buildPile, dealt, why } from './deal.js';
import { learn, unlearn, chanceOf } from './taste.js';
import { cardHTML } from './cards.js';
import { toast } from './toast.js';

const $ = (s) => document.querySelector(s);
const felt = () => $('#deck');
const now = () => new Date().toISOString();

/* PILE is seeds, face down, dealt off the front. OUT is what is on the felt, in
   the order it was dealt — the index is which slot of the layout it was given.
   OUT[0] is the card a verdict is about when there is only one. */
let PILE = [];
let OUT = [];
let Z = 10;

const one = () => S.table.n === 1;
const top = () => OUT[0] && OUT[0].c;

const rand = (n) => (Math.random() * n) | 0;
/* Fisher–Yates, because `sort(() => Math.random() - .5)` is not a shuffle: the
   comparator is inconsistent and the browser is entitled to anything. */
const shuffled = (a) => {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) { const j = rand(i + 1); [x[i], x[j]] = [x[j], x[i]]; }
  return x;
};

/* Two states the one button reads: `reading` is a card turned over, `bare` is
   nothing on the felt at all. */
const know = () => {
  const el = $('#deck .card.top');
  document.body.classList.toggle('reading', !!el && el.classList.contains('flip'));
  document.body.classList.toggle('bare', !OUT.length);
  document.body.classList.toggle('spread', !one());
};

/* — laying the table —
   The number is how many have to fit, and that is what decides how big a card is
   drawn. Try every number of columns and keep whichever gives the widest card:
   at one that is the full width of the screen, which is the deck as it has
   always looked. */
const GAP = 10;
const gridFor = (n, w, h) => {
  let best = { cols: 1, rows: 1, cw: 0 };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const cw = Math.min((w - GAP * (cols - 1)) / cols,
                        ((h - GAP * (rows - 1)) / rows) * 7 / 12);
    if (cw > best.cw) best = { cols, rows, cw };
  }
  return best;
};

const slotOf = (i) => {
  const f = felt();
  const n = Math.max(1, S.table.n);
  const w = f.clientWidth, h = f.clientHeight;
  const { cols, rows, cw } = gridFor(n, w, h);
  const ch = cw * 12 / 7;
  const k = i % n, lap = (i / n) | 0;
  const row = (k / cols) | 0;
  /* Three cards in a two-wide grid is a row of two and a row of one, and the one
     goes in the middle. A last row hanging off to the left reads as a card
     missing rather than as a table laid for three. */
  const inRow = Math.min(cols, n - row * cols);
  const y0 = (h - (rows * ch + (rows - 1) * GAP)) / 2;
  const x0 = (w - (inRow * cw + (inRow - 1) * GAP)) / 2;
  /* Kept on the felt. Deal past what it is laid out for and the offset that
     stacks them would walk the last ones off the edge, and a card you cannot see
     is a card you have lost. */
  const fit = (v, size, room) => Math.max(0, Math.min(v, room - size));
  return { w: cw, h: ch,
           x: fit(x0 + (k % cols) * (cw + GAP) + lap * 13, cw, w),
           y: fit(y0 + row * (ch + GAP) + lap * 13, ch, h) };
};

/* Position and size are inline, because a drag rewrites them every frame and
   must not have to fight a stylesheet. `--tw` is the card's own width, which is
   what everything drawn inside the card is measured from. */
const place = (o) => {
  const s = slotOf(o.i);
  if (o.x == null) { o.x = s.x; o.y = s.y; }
  o.el.style.width = s.w + 'px';
  o.el.style.setProperty('--tw', s.w + 'px');
  o.el.style.left = o.x + 'px';
  o.el.style.top = o.y + 'px';
  o.el.style.transform = 'none';
  o.el.style.zIndex = o.z;
  o.el.classList.toggle('top', o === OUT[0]);
};

/* Laid out again — after the number changes, or the screen turns. Anything you
   dragged goes back where the table would have put it, because the alternative
   is cards the size of the old layout sitting at coordinates from it. */
const relay = () => { OUT.forEach(o => { o.x = o.y = null; place(o); }); know(); };

const addCard = (o) => {
  felt().insertAdjacentHTML('beforeend', cardHTML(o.c));
  o.el = felt().lastElementChild;
  if (o.side) o.el.classList.add('flip');
  place(o);
};

const render = () => {
  const f = felt();
  f.innerHTML = OUT.length ? '' : emptyHTML();
  OUT.forEach(addCard);
  know();
};

/* Nothing on the felt has two causes and they need different answers: there is
   nothing in the pool to deal, or the pile is spent. Sending you to the filters
   when every deck is switched off is a dead end. */
const emptyHTML = () => {
  if (pool().length === 0) return `<div class="empty">
      <h2>Nothing to deal.</h2>
      <p>Every deck is switched off, so there is nothing to put in the pile.</p>
      <button data-act="packs">Switch a deck on</button>
    </div>`;
  if (PILE.length) return `<div class="empty">
      <h2>Nothing laid out.</h2>
      <p>${PILE.length} in the pile. Tap it to deal one.</p>
    </div>`;
  return `<div class="empty">
      <h2>That is the whole pile.</h2>
      <p>Every card that fits what you asked for has been off the top of it.
      Gather them up and shuffle to go again.</p>
      <button data-act="tgather">Gather and shuffle</button>
    </div>`;
};

/* — dealing —
   A card off the top, into the next slot, landing rather than appearing. */
const dealOne = (quiet) => {
  if (!PILE.length) { if (!quiet) toast('The pile is empty'); return false; }
  const c = dealt(PILE.shift());
  const o = { k: 'k' + (Z++), c, i: OUT.length, z: Z,
              /* A random side up, but only where there is a second side to land
                 on. A one-sided card dealt face down is a card with nothing on
                 it — and with one card out, the back is what the app knows, so
                 that always starts face up. */
              side: !one() && c.twoSided && Math.random() < 0.5 ? 1 : 0,
              x: null, y: null };
  if (!OUT.length) felt().innerHTML = '';         // clear whatever empty screen was up
  OUT.push(o);
  addCard(o);
  o.el.animate([{ transform: `translate(0,${window.innerHeight * .35}px) scale(.85)`, opacity: 0 },
                { transform: 'none', opacity: 1 }],
               { duration: 240, easing: 'cubic-bezier(.2,.8,.25,1)' });
  count(); know();
  return true;
};

/* The felt keeps itself full to the number it is laid out for, which is what
   makes one card behave exactly like the deck always has: a verdict takes one
   away and the next is already there. Tapping the pile deals past that, on
   purpose — a table you have over-dealt is a table with cards on cards. */
const fill = () => { while (OUT.length < S.table.n && dealOne(true)); };
const refresh = () => { fill(); if (!OUT.length) render(); else know(); };

/* Rewriting a card must not deal a new one: the whole point of an edit is that
   you were about to swipe *this* one and wanted it to say something better
   first. Each card is re-read from the pool, odds and reason included — they
   were worked out from words that have changed. */
const restack = () => {
  OUT.forEach(o => {
    const s = byId(o.c.id); if (!s) return;
    o.c = { ...o.c, t:s.t, tags:s.tags, min:s.min, cost:s.cost, d:s.d, lang:s.lang,
            edit:s.edit, was:s.was };
    o.c.why = why(o.c); o.c.odds = chanceOf(o.c);
  });
  render();
};

/* — the pile — */
const build = () => { PILE = buildPile(); count(); };

const count = () => {
  const n = $('.pilen');
  if (n) n.textContent = PILE.length;
  const p = $('.pile');
  if (p) p.classList.toggle('empty', !PILE.length);
};

/* Shuffling is a thing you watch happen, or it is a button claiming to have done
   something you have no way of checking. */
const riffle = () => {
  const p = $('.pile');
  if (!p) return;
  p.classList.remove('riffle'); void p.offsetWidth; p.classList.add('riffle');
};

/* Shuffle is the pile and leaves the felt alone; gather is the felt, and ends in
   a shuffle. They were briefly the same function, which made two buttons that
   did the same thing and no way to shuffle what you had not dealt yet. */
const shuffle = () => {
  PILE = shuffled(PILE);
  riffle(); count();
  toast(`Shuffled — ${PILE.length} in the pile`);
};

/* Gathering up is how you start again: everything on the felt goes back in, and
   so does everything already off the pile this sitting. It is the only way round
   twice, which is why it is a button and not something that happens quietly. */
const gather = () => {
  const done = () => {
    const seeds = buildPile();
    PILE = shuffled(seeds);
    OUT.forEach(o => o.el && o.el.remove());
    OUT = [];
    riffle(); count();
    render(); fill();
  };
  if (!OUT.length) { const n = PILE.length; done(); return toast(`Shuffled — ${PILE.length} in the pile`); }
  const f = felt(), n = OUT.length;
  OUT.forEach(o => o.el.animate(
    [{ transform: 'none', opacity: 1 },
     { transform: `translate(${34 - o.x}px,${f.clientHeight - o.y + 30}px) scale(.5)`, opacity: 0 }],
    { duration: 260, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }));
  setTimeout(() => { done(); toast(`${n} back in, and shuffled`); }, 250);
};

/* Rebuilt from what the pool is now. Switching a deck off has to change what is
   in the pile, and there is no round left to preserve. */
const rebuild = () => {
  OUT.forEach(o => o.el && o.el.remove());
  OUT = [];
  build();
  render();
  fill();
};

/* — shaking —
   Shake the phone and the pile shuffles. Or pick the pile up and shake it in
   your hand, which is how a deck is shuffled by somebody standing up. A shake is
   direction changes, not speed: fast in one direction is a throw, and something
   that keeps reversing is a shake. */
const SHAKE_GAP = 700;
let lastShake = 0;
const shookIt = () => {
  const t = Date.now();
  if (t - lastShake < SHAKE_GAP) return;
  lastShake = t;
  shuffle();
  if (navigator.vibrate) navigator.vibrate(18);
};

const M = { x:0, y:0, z:0, n:0, at:0 };
const onMotion = (e) => {
  const a = e.accelerationIncludingGravity || e.acceleration;
  if (!a) return;
  const d = Math.abs((a.x || 0) - M.x) + Math.abs((a.y || 0) - M.y) + Math.abs((a.z || 0) - M.z);
  M.x = a.x || 0; M.y = a.y || 0; M.z = a.z || 0;
  const t = Date.now();
  if (t - M.at > 500) M.n = 0;
  if (d > 14) { M.n++; M.at = t; }
  if (M.n >= 3) { M.n = 0; shookIt(); }
};
const listenMotion = (on) => {
  removeEventListener('devicemotion', onMotion);
  if (on) addEventListener('devicemotion', onMotion);
};

/* iOS hands this over only from inside a gesture, and only once — after a
   refusal it says no without asking again, so the switch has to say what
   happened rather than sit there looking on. */
let motionOK = false;
const askMotion = async () => {
  const DM = window.DeviceMotionEvent;
  if (!DM) return false;
  if (typeof DM.requestPermission !== 'function') { motionOK = true; return true; }
  try { motionOK = (await DM.requestPermission()) === 'granted'; return motionOK; }
  catch (e) { return false; }
};
const motionReady = () => !window.DeviceMotionEvent ||
  typeof window.DeviceMotionEvent.requestPermission !== 'function' || motionOK;

const setShake = async (on) => {
  const want = on === undefined ? !S.table.shake : !!on;
  if (want && !(await askMotion())) { toast('This device will not report movement'); return false; }
  S.table.shake = want; save();
  listenMotion(want && motionReady());
  toast(want ? 'Shake the phone to shuffle' : 'Shaking does nothing now');
  return true;
};

/* — the pile, in your hand —
   A tap deals one. Press and hold and the pile comes off the table and follows
   your finger; shake it there and it shuffles; let go and it drops back into its
   slot. The slot keeps its size while the pile is away, so nothing in the bar
   moves under your finger. */
const HOLD = 320;
const P = { on:false, id:0, x:0, y:0, moved:0, held:false, timer:0, dir:0, n:0, at:0 };

const liftPile = () => {
  const p = $('.pile'); if (!p) return;
  P.held = true;
  const r = p.getBoundingClientRect();
  p.style.width = r.width + 'px'; p.style.height = r.height + 'px';
  p.classList.add('lifted');
  movePile(P.x, P.y);
  if (navigator.vibrate) navigator.vibrate(12);
  toast('Shake it');
};

/* Above the finger rather than under it, or the thing you are holding is the one
   thing you cannot see. */
const movePile = (x, y) => {
  const p = $('.pile'); if (!p) return;
  p.style.left = (x - p.offsetWidth / 2) + 'px';
  p.style.top = (y - p.offsetHeight - 18) + 'px';
};

const dropPile = () => {
  const p = $('.pile'), slot = $('.pileslot');
  P.held = false;
  if (!p || !slot) return;
  const from = p.getBoundingClientRect(), to = slot.getBoundingClientRect();
  p.classList.remove('lifted');
  p.style.left = p.style.top = p.style.width = p.style.height = '';
  p.animate([{ transform: `translate(${from.left - to.left}px,${from.top - to.top}px)` },
             { transform: 'none' }],
            { duration: 220, easing: 'cubic-bezier(.2,.8,.25,1)' });
};

const pileShake = (x) => {
  const dx = x - P.x;
  if (Math.abs(dx) < 9) return;
  const dir = Math.sign(dx);
  const t = Date.now();
  if (t - P.at > 450) P.n = 0;
  if (dir !== P.dir && P.dir !== 0) { P.n++; P.at = t; }
  P.dir = dir; P.x = x;
  if (P.n >= 3) { P.n = 0; shookIt(); }
};

const pileDown = (e) => {
  P.on = true; P.id = e.pointerId; P.moved = 0; P.held = false;
  P.x = e.clientX; P.y = e.clientY; P.dir = 0; P.n = 0; P.at = 0;
  clearTimeout(P.timer);
  P.timer = setTimeout(liftPile, HOLD);
  const p = $('.pile');
  try { p && p.setPointerCapture && p.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
};

const pileMove = (e) => {
  if (!P.on || e.pointerId !== P.id) return;
  P.moved = Math.max(P.moved, Math.abs(e.clientX - P.x) + Math.abs(e.clientY - P.y));
  if (!P.held) { if (P.moved > 12) clearTimeout(P.timer); P.y = e.clientY; return; }
  P.y = e.clientY;
  movePile(e.clientX, e.clientY);
  pileShake(e.clientX);
};

const pileUp = (e) => {
  if (!P.on || e.pointerId !== P.id) return;
  P.on = false;
  clearTimeout(P.timer);
  if (P.held) return dropPile();
  if (P.moved < 12) dealOne();
};

/* — turning a card over —
   Two halves of one rotation, and it never turns past 90°: out to edge-on, the
   face swapped where the card is a line and there is nothing to see, then out
   again from edge-on the other way. See the long note in css/deck.css for why it
   is not one 180° sweep with backface-visibility. */
const TURN = 460, HALF = TURN / 2;
const flip = (el) => {
  if (!el || el.dataset.turning) return;
  const inner = el.querySelector('.cardin');
  if (!inner) return;
  const o = OUT.find(x => x.el === el);
  el.dataset.turning = '1';
  el.classList.add('turning');
  document.body.classList.add('turning');
  inner.style.transition = `transform ${HALF}ms cubic-bezier(.4,0,1,1)`;
  inner.style.transform = 'rotateY(-90deg)';
  setTimeout(() => {
    el.classList.toggle('flip');
    if (o) o.side = o.side ? 0 : 1;
    know();
    /* Straight to the far side without animating through: the two are the same
       picture, and animating between them is the turn going backwards. */
    inner.style.transition = 'none';
    inner.style.transform = 'rotateY(90deg)';
    inner.getBoundingClientRect();     // reflow, or there is nothing to animate from
    inner.style.transition = `transform ${HALF}ms cubic-bezier(0,0,.6,1)`;
    inner.style.transform = 'rotateY(0deg)';
    setTimeout(() => {
      inner.style.transition = ''; inner.style.transform = '';
      el.classList.remove('turning');
      document.body.classList.remove('turning');
      delete el.dataset.turning;
      know();
    }, HALF);
  }, HALF);
};

/* — verdicts —
   like | dislike | skip | never. A skip says nothing about the card — it is not
   a soft no — so it teaches nothing and carries no weight. Never is a verdict
   about a whole kind of thing, and it is the only one that takes something out
   of the pool for good. */
const WEIGHT = { like:[1, 1], dislike:[0, 1], never:[0, 2.2] };

const say = (v, id) => {
  const o = id ? OUT.find(x => x.c.id === id) : OUT[0];
  if (!o) return;
  const c = o.c;
  document.body.classList.remove('turning');
  const mark = v === 'skip' ? null : learn(c, WEIGHT[v][0], WEIGHT[v][1]);
  S.seen[c.id] = { v, at: now() };
  remember(c.id);
  setUndo({ card: c, v, mark, side: o.side });
  save();

  const el = o.el;
  OUT = OUT.filter(x => x !== o);
  OUT.forEach((x, i) => { x.i = i; });
  if (el) {
    const off = window.innerWidth * 1.4;
    const to = v === 'skip' ? `translate(0,${-window.innerHeight}px) rotate(-3deg)`
      : v === 'like' ? `translate(${off}px,-40px) rotate(22deg)`
      : `translate(${-off}px,-40px) rotate(-22deg)`;
    el.classList.remove('top'); el.classList.add('gone'); el.style.transform = to;
    setTimeout(() => el.remove(), 360);
  }
  /* The rest close up into their slots and the next comes off the pile at once —
     nothing waits for an animation, ever. */
  OUT.forEach(x => { x.el.classList.add('rest'); x.x = x.y = null; place(x); });
  know();
  fill();
  if (!OUT.length) render();

  toast(v === 'like' ? 'Like' : v === 'dislike' ? 'Don’t like'
      : v === 'never' ? 'Out of the pool' : '');
};

/* Undo takes the learning back with it, or it is a lie: the card returns and the
   weights it moved stay moved. It comes back the way it went — down from the top
   — because a swipe down is the opposite of the way it left. */
const takeBack = () => {
  const u = getUndo(); if (!u) return;
  unlearn(u.mark);
  delete S.seen[u.card.id];
  S.recent = S.recent.filter(x => x !== u.card.id);
  setUndo(null); save();

  /* One goes back on top of the pile if the felt filled up behind it, or undoing
     a verdict would quietly deal you a card. */
  while (OUT.length >= Math.max(S.table.n, 1)) {
    const last = OUT.pop();
    last.el.remove();
    PILE.unshift(last.c.seed || last.c);
  }
  const o = { k: 'k' + (Z++), c: u.card, i: 0, z: ++Z, side: u.side || 0, x: null, y: null };
  OUT.unshift(o);
  OUT.forEach((x, i) => { x.i = i; });
  if (!felt().querySelector('.card')) felt().innerHTML = '';
  addCard(o);
  OUT.forEach(x => { x.x = x.y = null; place(x); });
  count(); know();

  o.el.style.transition = 'none';
  o.el.style.transform = `translate(0,${-window.innerHeight}px) rotate(-2deg)`;
  o.el.getBoundingClientRect();
  o.el.style.transition = '';
  o.el.classList.add('rest');
  o.el.style.transform = 'none';
  toast('Back it comes');
};

/* "More like this" is a like with its thumb on the scales, and it keeps the card
   where it is — you have not passed it yet. */
const more = (id) => {
  const o = id ? OUT.find(x => x.c.id === id) : OUT[0];
  if (!o) return;
  learn(o.c, 1, 1.6);
  save();
  toast('More of this sort of thing');
};

/* — handling a card —
   At one card a drag is the verdict: right is like, left is not, up is a pass
   and down takes the last one back. At more than one a drag moves the card you
   are holding — there is a spread to arrange, and every card's back carries the
   verdict. A tap turns a card over either way. */
const G = { on:false, o:null, x:0, y:0, ox:0, oy:0, moved:0, t:0, id:0, read:false, verdict:false };

const verdictOf = (dx, dy, w, h, ms) => {
  const vx = Math.abs(dx) / Math.max(ms, 1);
  const upright = Math.abs(dy) > Math.abs(dx) * 1.5;
  if (dy < -h * .18 && upright) return 'skip';
  if (dy > h * .18 && upright) return 'back';
  if (dx > w * .26 || (dx > 44 && vx > .55)) return 'like';
  if (dx < -w * .26 || (dx < -44 && vx > .55)) return 'dislike';
  return null;
};

const paint = (el, dx, dy, w) => {
  el.style.transform = `translate(${dx}px,${dy}px) rotate(${dx / 17}deg)`;
  const q = el.querySelector('.s-yes'), n = el.querySelector('.s-no');
  if (q) q.style.opacity = Math.min(1, Math.max(0, dx) / (w * .22));
  if (n) n.style.opacity = Math.min(1, Math.max(0, -dx) / (w * .22));
};

const down = (e) => {
  if (e.target.closest('.pile')) return pileDown(e);
  if (e.target.closest('button')) return;
  const el = e.target.closest('.card');
  if (!el) return;
  const o = OUT.find(x => x.el === el);
  if (!o) return;
  /* A verdict only where there is one card: at more than one, a drag is how you
     move the thing you are holding. */
  G.verdict = one() && o === OUT[0];
  if (!G.verdict) { o.z = ++Z; el.style.zIndex = o.z; }
  /* A flipped card is being read, not decided about: it takes the tap that turns
     it back over and nothing else. */
  G.read = el.classList.contains('flip') && G.verdict;
  G.on = true; G.o = o; G.id = e.pointerId; G.t = Date.now(); G.moved = 0;
  G.x = e.clientX; G.y = e.clientY; G.ox = o.x; G.oy = o.y;
  el.classList.remove('rest');
  if (!G.verdict) el.classList.add('held');
  try { el.setPointerCapture && el.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
};

const move = (e) => {
  if (P.on) return pileMove(e);
  if (!G.on || e.pointerId !== G.id) return;
  const dx = e.clientX - G.x, dy = e.clientY - G.y;
  G.moved = Math.max(G.moved, Math.abs(dx) + Math.abs(dy));
  if (G.read) return;
  if (G.verdict) return paint(G.o.el, dx, dy, G.o.el.getBoundingClientRect().width);
  if (G.moved < 6) return;
  const f = felt(), o = G.o;
  const w = o.el.offsetWidth, h = o.el.offsetHeight;
  /* You can hang a card over the edge but not push it off: its middle stays on
     the felt, so there is always something to pick back up. */
  o.x = Math.max(-w / 2, Math.min(G.ox + dx, f.clientWidth - w / 2));
  o.y = Math.max(-h / 2, Math.min(G.oy + dy, f.clientHeight - h / 2));
  o.el.style.left = o.x + 'px';
  o.el.style.top = o.y + 'px';
};

const up = (e) => {
  if (P.on) return pileUp(e);
  if (!G.on || e.pointerId !== G.id) return;
  G.on = false;
  const o = G.o, el = o.el;
  el.classList.remove('held');
  const tap = G.moved < 9 && Date.now() - G.t < 500;

  if (G.verdict && !G.read) {
    const r = el.getBoundingClientRect();
    const v = verdictOf(e.clientX - G.x, e.clientY - G.y, r.width, r.height, Date.now() - G.t);
    if (v === 'back') { takeBack(); return; }
    if (v) { say(v); return; }
  }
  if (tap) flip(el);
  if (G.verdict) {
    el.classList.add('rest');
    el.style.transform = 'none';
    ['.s-yes', '.s-no'].forEach(s => { const n = el.querySelector(s); if (n) n.style.opacity = 0; });
  }
};

/* — the bar —
   The pile, how many the table is laid out for, and the two things you can do to
   a pile. It is always there now, which is why the one button in the app lives
   in it rather than on the back of a card. */
const barHTML = () => `
  <div class="trow">
    <p class="tlabel">Laid out for</p>
    <div class="chips tiny">${[1, 2, 3, 4, 6, 8].map(n =>
      `<button data-act="tablen" data-v="${n}" class="${S.table.n === n ? 'on' : ''}">${n}</button>`).join('')}</div>
  </div>
  <div class="trow">
    <span class="pileslot">
      <button class="pile" aria-label="Deal a card. Hold to pick the pile up.">
        <i></i><i></i><span class="pface"></span>
        <span class="pilen">0</span>
      </button>
    </span>
    <button class="tbtn" data-act="tshuffle">Shuffle</button>
    <button class="tbtn" data-act="tgather">Gather</button>
  </div>
  ${/* The one button in the app. It used to sit on the back of a card and
        appear only once you had turned one over, because there was nothing else
        on screen for it to belong to. There is a bar now, so it lives in it. A
        gear rather than a mark of our own: the drawn marks are the vocabulary
        and this is not part of it. */ ''}
  <button class="settings" data-act="menu" aria-label="Settings"><svg viewBox="0 0 24 24" aria-hidden="true">
    <path fill-rule="evenodd" d="M9.83 1.32 L14.17 1.32 L14.34 4.35 A8.0 8.0 0 0 1 15.76 4.94 L18.02 2.91 L21.09 5.98 L19.06 8.24 A8.0 8.0 0 0 1 19.65 9.66 L22.68 9.83 L22.68 14.17 L19.65 14.34 A8.0 8.0 0 0 1 19.06 15.76 L21.09 18.02 L18.02 21.09 L15.76 19.06 A8.0 8.0 0 0 1 14.34 19.65 L14.17 22.68 L9.83 22.68 L9.66 19.65 A8.0 8.0 0 0 1 8.24 19.06 L5.98 21.09 L2.91 18.02 L4.94 15.76 A8.0 8.0 0 0 1 4.35 14.34 L1.32 14.17 L1.32 9.83 L4.35 9.66 A8.0 8.0 0 0 1 4.94 8.24 L2.91 5.98 L5.98 2.91 L8.24 4.94 A8.0 8.0 0 0 1 9.66 4.35 Z M12 8.5a3.5 3.5 0 1 0 0 7.0a3.5 3.5 0 1 0 0-7.0Z"/>
  </svg></button>`;

const drawBar = () => { $('#tbar').innerHTML = barHTML(); count(); };

const setN = (n) => {
  S.table.n = Math.max(1, Math.min(8, Number(n) || 1));
  save();
  document.querySelectorAll('[data-act="tablen"]').forEach(b =>
    b.classList.toggle('on', Number(b.dataset.v) === S.table.n));
  /* Coming down to fewer than are out puts the extras back on top of the pile
     rather than leaving them stacked on each other. */
  while (OUT.length > S.table.n) {
    const last = OUT.pop();
    last.el.remove();
    PILE.unshift(last.c.seed || last.c);
  }
  OUT.forEach((x, i) => { x.i = i; });
  relay();
  refresh();
  count();
};

let wired = false;
const wire = () => {
  if (wired) return;
  wired = true;
  const h = $('#frame');
  /* A tap on the pile is handled in pointerup, so a press-and-hold can be one.
     That leaves the keyboard with nothing — Enter or Space on a button fires a
     click and no pointer events at all — so this is for `detail === 0`, which is
     exactly keyboard activation and never a real tap. */
  h.addEventListener('click', (e) => {
    if (e.target.closest('.pile') && e.detail === 0) dealOne();
  });
  h.addEventListener('pointerdown', down);
  h.addEventListener('pointermove', move);
  h.addEventListener('pointerup', up);
  h.addEventListener('pointercancel', up);
  addEventListener('resize', relay);
};

const start = () => {
  wire();
  drawBar();
  build();
  render();
  fill();
  listenMotion(!!S.table.shake && motionReady());
};

export { start, render, restack, rebuild, gather, shuffle, setN, setShake, say, takeBack,
         more, flip, top, relay, dealOne, know, verdictOf };
export const onTable = () => OUT.map(o => ({ id: o.c.id, t: o.c.t, side: o.side }));
export const pileSize = () => PILE.length;
