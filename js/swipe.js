/* Activinator — the swipe.
   Pointer events, so a finger and a mouse are the same code path. The card
   follows your hand exactly and commits on release: no threshold snapping
   mid-gesture, because a card that leaves before you let go is a card you did
   not decide about.

   Right is like, left is not, and up is neither — up passes the card on
   without saying anything about it, which is why it has no stamp. Down is not
   about this card at all: it takes the last one back, which is the opposite of
   the way it left. */
import { say, takeBack, flip } from './deck.js';

const G = { on:false, el:null, x:0, y:0, dx:0, dy:0, t:0, moved:0, id:0, read:false };

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
  const el = e.target.closest('.card.top');
  if (!el) return;
  if (e.target.closest('button')) return;
  // A flipped card is being read, not decided about: it takes the tap that
  // turns it back over and nothing else. Bailing out here entirely was how a
  // flipped card became a card you could not turn back.
  G.read = el.classList.contains('flip');
  G.on = true; G.el = el; G.x = e.clientX; G.y = e.clientY;
  G.dx = G.dy = G.moved = 0; G.t = Date.now(); G.id = e.pointerId;
  el.classList.remove('rest');
  /* A pointer that has already been released — a synthetic event, an
       assistive device, a release that beat us here — throws rather than
       no-opping, and an exception thrown out of a pointerdown handler takes
       the rest of the gesture with it. Capture is an improvement on the
       drag, not a requirement of it. */
  try { el.setPointerCapture?.(e.pointerId); } catch (err) { /* not capturable */ }
};

const move = (e) => {
  if (!G.on || e.pointerId !== G.id) return;
  G.dx = e.clientX - G.x; G.dy = e.clientY - G.y;
  G.moved = Math.max(G.moved, Math.abs(G.dx) + Math.abs(G.dy));
  if (G.read) return;
  paint(G.el, G.dx, G.dy, G.el.getBoundingClientRect().width);
};

const up = (e) => {
  if (!G.on || e.pointerId !== G.id) return;
  G.on = false;
  const el = G.el, r = el.getBoundingClientRect();
  const v = G.read ? null : verdictOf(G.dx, G.dy, r.width, r.height, Date.now() - G.t);
  /* Down is not a verdict about this card — it is the last one coming back —
     so the card you were holding stays where it is and the returning one drops
     in over it. */
  if (v === 'back') { takeBack(); return; }
  if (v) { say(v); return; }

  if (G.moved < 9 && Date.now() - G.t < 500) flip(el);
  el.classList.add('rest');
  el.style.transform = 'translate(0,0)';
  ['.s-yes','.s-no'].forEach(s => { const n = el.querySelector(s); if (n) n.style.opacity = 0; });
};

const wire = (host) => {
  host.addEventListener('pointerdown', down);
  host.addEventListener('pointermove', move);
  host.addEventListener('pointerup', up);
  host.addEventListener('pointercancel', up);
};

export { wire, verdictOf };
