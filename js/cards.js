/* Activinator — how a card is printed.
   The front is a row of emblems and the activity. Nothing else: no
   description, no tag names, no reason — a card you have to read twice is a
   card you stop swiping. The emblems say what kind of thing it is without
   spending a line on words, and everything the app actually knows is on the
   back, for once you have decided you are interested. */
import { TAGS, MARKS, REDS, GROUPS } from './data.js';
import { S } from './state.js';
import { reasons } from './taste.js';

const esc = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

/* Emblems come out in the vocabulary's own order, so the same kinds of thing
   sit in the same place on every card and the row can be read by shape.

   The general tag is dropped when a particular one is there. A drawing carries
   `create`, `visualart` and `drawing` so that taste can learn at all three
   depths — but on the front that is three emblems saying one thing, and the
   specific one already says it. */
const ORDER = GROUPS.flatMap(([, keys]) => keys);
const MEDIA = ['writing','visualart','drawing','painting','sculpting','mixedmedia',
               'clothes','music','acting','dancing','film'];
const FINER = ['drawing','painting','sculpting','mixedmedia','clothes'];
const emblemsOf = (c) => {
  const hide = new Set();
  if (MEDIA.some(m => c.tags.includes(m))) hide.add('create');
  if (FINER.some(m => c.tags.includes(m))) hide.add('visualart');
  return ORDER.filter(g => c.tags.includes(g) && !hide.has(g));
};

/* One drawn mark. `evenodd` is what makes a subpath inside another a hole —
   the eye's pupil, the key's bow, the hollow half of a diamond — so every mark
   is authored expecting it. Mood is red, the way half a deck is red. */
const markHTML = (g, cls = '') => !MARKS[g] ? '' :
  `<span class="mark ${REDS.has(g) ? 'red' : ''} ${cls}" title="${esc(TAGS[g] || g)}" aria-label="${esc(TAGS[g] || g)}"
    ><svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="${MARKS[g]}"/></svg></span>`;

const emblemRow = (c) => `<p class="marks">${emblemsOf(c).map(g => markHTML(g)).join('')}</p>`;

/* Minutes as somebody would say them. The duration tag is the band; this is
   the actual figure, and it only appears on the back. */
const lengthOf = (m) => {
  if (m < 5)   return m + ' minutes';
  if (m < 45)  return m + ' minutes';
  if (m < 75)  return 'about an hour';
  if (m < 135) return 'an hour or two';
  if (m < 200) return 'a few hours';
  if (m < 330) return 'an afternoon';
  if (m < 560) return 'a whole day';
  return 'overnight';
};

const cardHTML = (c) => {
  const odds = Math.round((c.odds || .5) * 100);
  const r = reasons(c, 3);
  return `<article class="card" data-key="${c.key}">
   <div class="cardin">
    <div class="face front">
      <div class="stamp s-yes">Like</div>
      <div class="stamp s-no">Don’t Like</div>
      ${emblemRow(c)}
      <h2 class="t">${esc(c.t)}</h2>
    </div>
    <div class="face back">
      <p class="kicker">${c.kind === 'wild' ? 'wildcard' : esc(TAGS[c.tags[0]] || 'what this is')}</p>
      <h3>${esc(c.t)}</h3>
      <p class="pnote" style="color:var(--text-3);margin-top:8px">${esc(lengthOf(c.min))}</p>
      <ul class="taglist">${c.tags.map(g => {
        const w = S.w[g] || 0;
        return `<li class="${w > .12 ? 'up' : w < -.12 ? 'down' : ''}">${markHTML(g)}${esc(TAGS[g] || g)}</li>`;
      }).join('')}</ul>
      <p class="odds">It puts your odds of going for this at <b>${odds}%</b>.</p>
      <div class="meter"><i style="width:${odds}%"></i></div>
      <p class="why">${esc(c.why || '')}</p>
      ${r.length ? `<p class="pnote" style="color:var(--text-3);margin-top:6px">On the strength of
        ${r.map(x => esc(x.label) + (x.up ? '' : ' — against')).join(', ')}.</p>` : ''}
      <div class="backrow">
        <button data-act="more">More like this</button>
        <button data-act="never" class="never">Never again</button>
      </div>
    </div>
   </div>
  </article>`;
};

export { cardHTML, emblemsOf, emblemRow, markHTML, lengthOf, esc };
