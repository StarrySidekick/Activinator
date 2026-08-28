/* The painter. One aesthetic goes onto the document root as CSS custom
   properties plus a handful of data- attributes for the discrete choices
   (corners, entrance, hover, ambient, dividers, links). Everything visual in
   the studio — the demo site *and* the editor chrome around it — reads those
   tokens, so choosing an aesthetic restyles the entire page. That is the
   claim the format makes: if the studio needs a colour the tokens don't
   carry, the format is missing a parameter.

   The editor's form column can be dropped back to neutral grey with the
   plain-room toggle (data-plain on <html>) when an aesthetic gets too loud
   to work inside — the demo stays painted either way. */

import { ROLES } from './schema.js';

const px = (n) => n + 'px';

/* Mix hex `c` toward hex `into` — how backdrop strength works: a texture at
   .6 is the same pattern drawn in colours walked 40% back toward the page,
   which is what Bureau's boardAlpha did with layered opacity. */
function toward (c, into, keep) {
  const n = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  if (!/^#[0-9a-f]{6}$/i.test(c) || !/^#[0-9a-f]{6}$/i.test(into)) return c;
  const [a, b] = [n(c), n(into)];
  return '#' + a.map((x, i) => Math.round(x * keep + b[i] * (1 - keep))
    .toString(16).padStart(2, '0')).join('');
}

/* The backdrop — Bureau's boards generalised. A texture is a background the
   surfaces sit on, not a property of the surfaces. */
function backdrop (t, bg) {
  const { kind, a, b } = t;
  if (kind === 'checker') {
    return `repeating-conic-gradient(${a} 0% 25%, ${b} 0% 50%) 0 0 / 64px 64px`;
  }
  if (kind === 'stars') {
    const star = (x, y, r, o) =>
      `radial-gradient(circle at ${x}px ${y}px, rgba(244,246,248,${o}) ${r}px, transparent ${r + 0.6}px)`;
    return [star(18, 32, 1.1, .9), star(70, 12, .8, .7), star(120, 58, 1.3, .8),
      star(160, 24, .7, .6), star(52, 84, .9, .75), star(140, 100, .8, .5),
      star(96, 40, .6, .5)].join(', ') + ` 0 0 / 180px 120px, ${bg}`;
  }
  if (kind === 'sheen') {
    return `linear-gradient(115deg, rgba(255,255,255,.35) 0%, rgba(255,255,255,0) 38%, rgba(255,255,255,.18) 55%, rgba(255,255,255,0) 70%), linear-gradient(${a}, ${b})`;
  }
  if (kind === 'grain') {
    return `repeating-linear-gradient(0deg, ${a} 0 2px, ${b} 2px 4px)`;
  }
  return bg;
}

/* Paint one aesthetic onto one element — in practice document.documentElement.
   `dark` asks for the after-dark seven when the aesthetic has them; without
   them it is a no-op, which is Bureau's rule too — light or dark is a fact
   about the style. */
export function apply (el, a, dark) {
  const roles = (dark && a.color.darkRoles) ? a.color.darkRoles : a.color.roles;
  const v = (k, val) => el.style.setProperty('--v-' + k, val);
  const d = (k, val) => { el.dataset[k] = val; };
  for (const [k] of ROLES) v(k.toLowerCase(), roles[k]);
  v('display', a.type.display.stack);
  v('display-weight', a.type.display.weight);
  v('display-style', a.type.display.style || 'normal');
  v('display-tracking', a.type.display.tracking);
  v('display-transform', a.type.display.transform);
  v('body', a.type.body.stack);
  v('body-weight', a.type.body.weight);
  v('leading', a.type.body.lineHeight);
  v('size', px(a.type.baseSize));
  ['h3', 'h2', 'h1'].forEach((h, i) =>
    v(h, (a.type.baseSize * Math.pow(a.type.scale, i + 1)).toFixed(1) + 'px'));
  /* cut corners are a clip, so the radii double as the chamfer size */
  v('r-sm', px(a.shape.radiusSm));
  v('r-md', px(a.shape.radiusMd));
  v('r-lg', px(a.shape.radiusLg));
  v('cut', px(Math.max(4, a.shape.radiusMd)));
  v('cut-lg', px(Math.max(6, a.shape.radiusLg)));
  d('corner', a.shape.corner || 'round');
  v('bw', px(a.shape.border));
  v('bstyle', a.shape.borderStyle || 'solid');
  v('gap', (a.space.unit * a.space.density).toFixed(1) + 'px');
  v('shadow', a.elevation.shadow);
  v('shadow-lg', a.elevation.shadowLg);
  v('gloss', a.effects.gloss);
  v('glass', px(a.effects.glass));
  v('grain', a.effects.grain);
  /* the ornament reaches CSS as a quoted string so `content` can print it */
  v('ornament', JSON.stringify(a.decor.ornament || '·'));
  d('dividers', a.decor.dividers || 'line');
  d('underline', a.decor.underline || 'solid');
  v('speed', a.motion.speed + 'ms');
  v('ease', a.motion.easing);
  v('stagger', (a.motion.stagger == null ? 40 : a.motion.stagger) + 'ms');
  d('enter', a.motion.entrance || 'none');
  d('hover', a.motion.hover || 'none');
  d('ambient', a.motion.ambient || 'none');
  const t = { ...a.texture };
  /* the backdrop colours are daylight colours; after dark the same pattern is
     drawn as a whisper over the dark page, or the room stays lit while the
     desk goes dark — the screenshot that caught this looked exactly that wrong */
  if (dark && a.color.darkRoles) {
    t.a = toward(t.a, roles.bg, 0.12);
    t.b = toward(t.b, roles.bg, 0.12);
  }
  const keep = t.alpha == null ? 1 : t.alpha;
  t.a = toward(t.a, roles.bg, keep);
  t.b = toward(t.b, roles.bg, keep);
  el.style.setProperty('--v-backdrop',
    t.kind === 'none' ? roles.bg : backdrop(t, roles.bg));
}

/* Rerun the entrance: everything staggered leaves and arrives again. The
   class flip is split across a frame so the animation genuinely restarts. */
export function replay (root) {
  const staged = [...root.querySelectorAll('[data-stag]')];
  staged.forEach((el, i) => {
    el.classList.remove('arrived');
    el.style.animationDelay = `calc(var(--v-stagger) * ${i})`;
  });
  requestAnimationFrame(() => requestAnimationFrame(() =>
    staged.forEach((el) => el.classList.add('arrived'))));
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* The parts of the demo that are content rather than paint. */
export function fill (root, a) {
  const q = (sel) => root.querySelector(sel);
  const all = (sel) => root.querySelectorAll(sel);
  for (const el of all('.pv-name')) el.textContent = a.name;
  q('.pv-tagline').textContent = a.tagline || '—';
  const s = a.voice.samples;
  q('.pv-toast').textContent = s[0] || 'On the list';
  const cards = all('.pv-card-copy');
  cards.forEach((el, i) => { el.textContent = s[i + 1] || el.dataset.fallback; });
  q('.pv-chips').innerHTML = (a.mood.length ? a.mood : ['unnamed'])
    .slice(0, 5).map((m) => `<span class="pv-chip" data-stag>${esc(m)}</span>`).join('');
  q('.pv-swatches').innerHTML = [
    ...ROLES.map(([k, label]) => ({ name: label, hex: (a.color.roles[k] || '') })),
    ...a.color.palette,
  ].map((sw) => `<span class="pv-sw" title="${esc(sw.name)}: ${esc(sw.hex)}" style="background:${esc(sw.hex)}"></span>`).join('');
  q('.pv-story').textContent = a.story
    ? a.story.split('\n')[0]
    : 'No story yet. The place section is where this page gets its words.';
}
