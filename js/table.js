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

   Only a two-sided pack — Words and Italian — has two sides here, and those
   land on a random side: half arrive showing the meaning and half the word,
   which is the point, since that is a deck you can test yourself with rather
   than read off. Everything else is one-sided and always dealt face up, and
   tapping it does nothing, because there is nothing on the other side of it.

   There was a printed back for those cards for one version — the ink and
   pattern the decks on the Decks table are drawn with — and it bled through
   the front, so the pattern sat over the words. It is out until the two-sided
   dynamic is settled; the pattern classes it used are still in panels.css,
   where the Decks table uses them. */
import { S, save, pool } from './state.js';
import { PACKS } from './data.js';
import { live } from './deal.js';
import { esc, indexOf } from './cards.js';
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
const twoSided = (c) => !!(packOf(c).twosided && c.d);

const sideB = (c) => {
  if (!twoSided(c)) return '';
  const [head, ...rest] = String(c.d).split('\n');
  return `<div class="face b">
      ${indexOf(c)}
      <div class="word">
        <h2 class="t">${esc(head)}</h2>
        ${rest.length ? `<p class="tdef">${esc(rest.join('\n'))}</p>` : ''}
      </div>
    </div>`;
};

/* A one-sided card has one face and says so, so nothing tries to turn it over
   and there is no second face to bleed through the first. */
const cardHTML = (o) => `<article class="tcard ${twoSided(o.c) ? '' : 'oneside'} ${o.side ? 'flip' : ''}"
  data-tk="${o.k}">
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
  o.el.style.setProperty('--tw', s.w + 'px');
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
              /* A random side up, as dealt — but only where there is a second
                 side to land on. A one-sided card dealt face down would be a
                 card with nothing on it. */
              side: twoSided(c) && Math.random() < 0.5 ? 1 : 0,
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

/* — shaking —
   Two ways, and they end in the same place. Shake the phone and the pile
   shuffles. Or pick the pile up — press and hold it — and shake it in your
   hand, which is how a deck is actually shuffled by somebody standing up.

   A shake is direction changes, not speed: something fast in one direction is
   a throw, and something that keeps reversing is a shake. Both counters want
   the reversals to be worth something, so a small jitter while you hold the
   pile still is not a shuffle. */
const SHAKE_GAP = 700;          // one shuffle per shake, not one per reversal
let lastShake = 0;
const shookIt = () => {
  const now = Date.now();
  if (now - lastShake < SHAKE_GAP) return;
  lastShake = now;
  shuffle();
  if (navigator.vibrate) navigator.vibrate(18);
};

/* The phone itself. `devicemotion` is behind a permission prompt on iOS that
   can only be asked for from a tap, so it is asked for by the switch — turning
   it on is the gesture. Nothing is listened for while it is off. */
const M = { x:0, y:0, z:0, n:0, at:0 };
const onMotion = (e) => {
  const a = e.accelerationIncludingGravity || e.acceleration;
  if (!a) return;
  const d = Math.abs((a.x || 0) - M.x) + Math.abs((a.y || 0) - M.y) + Math.abs((a.z || 0) - M.z);
  M.x = a.x || 0; M.y = a.y || 0; M.z = a.z || 0;
  const now = Date.now();
  if (now - M.at > 500) M.n = 0;            // the run has gone cold
  if (d > 14) { M.n++; M.at = now; }
  if (M.n >= 3) { M.n = 0; shookIt(); }
};
const listenMotion = (on) => {
  removeEventListener('devicemotion', onMotion);
  if (on) addEventListener('devicemotion', onMotion);
};

/* iOS will only hand this over from inside a gesture, and only once — after a
   refusal it says no without asking again, so the switch has to say what
   happened rather than sit there looking on. */
let motionOK = false;
const askMotion = async () => {
  const DM = window.DeviceMotionEvent;
  if (!DM) return false;
  if (typeof DM.requestPermission !== 'function') { motionOK = true; return true; }  // not iOS
  try { motionOK = (await DM.requestPermission()) === 'granted'; return motionOK; }
  catch (e) { return false; }
};

const setShake = async () => {
  if (S.table.shake) {
    S.table.shake = false; save(); listenMotion(false);
  } else {
    if (!(await askMotion())) return toast('This device will not report movement');
    S.table.shake = true; save(); listenMotion(true);
  }
  const b = $('[data-act="tshake"]');
  if (b) {
    b.classList.toggle('on', S.table.shake);
    b.querySelector('span').textContent = S.table.shake ? 'on' : 'off';
  }
  toast(S.table.shake ? 'Shake the phone to shuffle' : 'Shaking does nothing now');
};

/* — the pile, in your hand —
   A tap deals one. Press and hold and the pile comes off the table and follows
   your finger; shake it there and it shuffles; let go and it drops back into
   its slot. Which is, near enough, how you shuffle a deck standing up.

   The slot in the bar keeps its size while the pile is away, so nothing in the
   row moves under your finger. */
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

const movePile = (x, y) => {
  const p = $('.pile'); if (!p) return;
  /* Above the finger rather than under it, or the thing you are holding is the
     one thing you cannot see. */
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

/* Reversals of direction while you hold it, which is a shake and not a swipe. */
const pileShake = (x) => {
  const dx = x - P.x;
  if (Math.abs(dx) < 9) return;
  const dir = Math.sign(dx);
  const now = Date.now();
  if (now - P.at > 450) P.n = 0;
  if (dir !== P.dir && P.dir !== 0) { P.n++; P.at = now; }
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
  if (!P.held) {
    // moved before the hold landed: that was a swipe at the bar, not a press
    if (P.moved > 12) clearTimeout(P.timer);
    P.y = e.clientY;
    return;
  }
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

/* — picking a card up —
   The same shape as the swipe: the card follows your hand exactly, and what
   you did is decided on release. A tap that barely moved turns it over; a drag
   leaves it where you let go. Picking one up brings it to the front, because a
   card you have your finger on is the top card whatever order it was dealt in. */
const G = { on: false, o: null, x: 0, y: 0, ox: 0, oy: 0, moved: 0, t: 0, id: 0 };

const down = (e) => {
  if (e.target.closest('.pile')) return pileDown(e);
  const el = e.target.closest('.tcard');
  if (!el) return;
  const o = OUT.find(x => x.k === el.dataset.tk);
  if (!o) return;
  G.on = true; G.o = o; G.id = e.pointerId; G.t = Date.now(); G.moved = 0;
  G.x = e.clientX; G.y = e.clientY; G.ox = o.x; G.oy = o.y;
  o.z = ++Z; el.style.zIndex = o.z;
  el.classList.add('held');
  /* A pointer that has already been released — a synthetic event, an
       assistive device, a release that beat us here — throws rather than
       no-opping, and an exception thrown out of a pointerdown handler takes
       the rest of the gesture with it. Capture is an improvement on the
       drag, not a requirement of it. */
  try { el.setPointerCapture?.(e.pointerId); } catch (err) { /* not capturable */ }
};

const move = (e) => {
  if (P.on) return pileMove(e);
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
  if (P.on) return pileUp(e);
  if (!G.on || e.pointerId !== G.id) return;
  G.on = false;
  const o = G.o;
  o.el.classList.remove('held');
  if (G.moved < 9 && Date.now() - G.t < 500) turn(o);
};

/* The same two halves as the deck's flip, and for the same reason — see the
   note in deck.css. Out to edge-on, swap the face where there is nothing to
   see, out again from edge-on the other way. Nothing is ever turned past 90°,
   so no face is ever seen from behind. */
const TURN = 460, HALF = TURN / 2;
const turn = (o) => {
  if (o.el.dataset.turning || !twoSided(o.c)) return;
  const inner = o.el.querySelector('.tcardin');
  if (!inner) return;
  o.el.dataset.turning = '1';
  const lift = () => (o.el.classList.contains('held') ? ' scale(1.04)' : '');
  inner.style.transition = `transform ${HALF}ms cubic-bezier(.4,0,1,1)`;
  inner.style.transform = 'rotateY(-90deg)' + lift();
  setTimeout(() => {
    o.side = o.side ? 0 : 1;
    o.el.classList.toggle('flip');
    inner.style.transition = 'none';
    inner.style.transform = 'rotateY(90deg)' + lift();
    inner.getBoundingClientRect();     // reflow, or there is nothing to animate from
    inner.style.transition = `transform ${HALF}ms cubic-bezier(0,0,.6,1)`;
    inner.style.transform = 'rotateY(0deg)' + lift();
    setTimeout(() => {
      inner.style.transition = ''; inner.style.transform = '';
      delete o.el.dataset.turning;
    }, HALF);
  }, HALF);
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
      <!-- The slot holds the pile's place in the row so the buttons do not jump
           sideways when you pick the pile up and it goes to your finger. -->
      <span class="pileslot">
        <button class="pile" aria-label="Deal a card. Hold to pick the pile up.">
          <i></i><i></i><span class="pface"></span>
          <span class="pilen">0</span>
        </button>
      </span>
      <button class="tbtn" data-act="tshuffle">Shuffle</button>
      <button class="tbtn" data-act="tgather">Gather</button>
    </div>
    <div class="trow">
      <button class="chip toggle ${S.table.shake ? 'on' : ''}" data-act="tshake">
        Shake to shuffle<span>${S.table.shake ? 'on' : 'off'}</span>
      </button>
    </div>
  </div>`;

/* Wired once, not once per open. The host element outlives the screen inside
   it, so a listener added here every time the table opens is a listener that
   accumulates: the named ones are deduped by identity, but a click handler
   written inline is a new function each time, and after two visits one tap on
   the pile dealt two cards. */
let wired = false;
const wire = () => {
  if (wired) return;
  wired = true;
  const h = host();
  /* A tap on the pile is handled in pointerup, so that a press-and-hold can be
     a press-and-hold instead. That leaves the keyboard with nothing: a button
     activated by Enter or Space fires a click and no pointer events at all.
     `detail` is 0 on exactly those, and on a script's own .click(), so this is
     the keyboard's way in and never a second deal on a real tap. */
  h.addEventListener('click', (e) => {
    if (open && e.target.closest('.pile') && e.detail === 0) dealOne();
  });
  h.addEventListener('pointerdown', down);
  h.addEventListener('pointermove', move);
  h.addEventListener('pointerup', up);
  h.addEventListener('pointercancel', up);
};

const openTable = () => {
  if (open) return;
  open = true;
  document.body.classList.add('tabled');
  host().innerHTML = HTML();
  wire();
  /* Its own pile, from the packs that are on the table, minus anything you
     have said "never again" to. It is not the round and never touches it. */
  PILE = shuffled(pool().filter(live));
  OUT = [];
  count();
  /* Only while the table is up. A listener on the accelerometer that outlives
     the screen it belongs to is a battery bill for nothing. iOS will already
     have been asked when the switch was turned on; where it has not, this does
     nothing until it is. */
  listenMotion(!!S.table.shake && (!window.DeviceMotionEvent ||
    typeof window.DeviceMotionEvent.requestPermission !== 'function' || motionOK));
  requestAnimationFrame(() => { if (open) host().classList.add('on'); });
};

const closeTable = () => {
  if (!open) return;
  open = false;
  listenMotion(false);
  clearTimeout(P.timer); P.on = false; P.held = false;
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

export { openTable, closeTable, dealOne, shuffle, gather, setN, setShake, relay };
export const isOpen = () => open;
export const onTable = () => OUT.map(o => ({ id: o.c.id, t: o.c.t, side: o.side }));
export const pileSize = () => PILE.length;
