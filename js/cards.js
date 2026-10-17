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

/* The corner index. A playing card carries its rank and suit in two opposite
   corners, the second one upside down so it reads whichever way up the card is
   held; ours carry the three most particular of its marks. Three because an
   index is read at a glance — a column of seven silhouettes is a list, and the
   whole set is on the back anyway. */
const indexOf = (c) => {
  const three = emblemsOf(c).slice(0, 3).map(g => markHTML(g)).join('');
  return `<span class="idx tl">${three}</span><span class="idx br">${three}</span>`;
};

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
      ${indexOf(c)}
      <div class="word">
        <h2 class="t">${esc(c.t)}</h2>
        ${c.d ? `<p class="def">${esc(c.d)}</p>` : ''}
        ${c.lang ? `<button class="speak" data-act="speak" data-say="${esc(c.t)}"
          data-lang="${esc(c.lang)}" aria-label="say it out loud">${markHTML('listen')}</button>` : ''}
      </div>
    </div>
    <div class="face back">
      ${/* A two-sided card leads its back with the meaning, set the way the word
            is set on the front: that is the other side of the card, and it has
            to be the loudest thing on it. What the app knows follows underneath,
            because a card still has a back even when both its sides are
            printed. */ ''}
      ${c.twoSided ? `<div class="other">
        <h2 class="t">${esc(String(c.d).split('\n')[0])}</h2>
        ${String(c.d).split('\n').slice(1).join('\n').trim()
          ? `<p class="tdef">${esc(String(c.d).split('\n').slice(1).join('\n'))}</p>` : ''}
      </div>` : ''}
      <p class="kicker">${c.kind === 'wild' ? 'wildcard' : esc(TAGS[c.tags[0]] || 'what this is')}${
        c.edit ? `<span class="dot"></span><span class="k2">rewritten</span>` : ''}</p>
      <h3>${esc(c.t)}</h3>
      ${c.d && !c.twoSided ? `<p class="def">${esc(c.d)}</p>` : ''}
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
      ${/* The verdict is on the back as well as under your thumb. With one card
            out, a swipe is the verdict and these are a second way to it; with a
            spread out, a drag moves the card you are holding, so this is the
            only way — every card carries its own, named by id. */ ''}
      <div class="backrow verdict">
        <button data-act="like" data-id="${esc(c.id)}" class="yes">Like</button>
        <button data-act="dislike" data-id="${esc(c.id)}" class="no">Don’t like</button>
      </div>
      <div class="backrow">
        <button data-act="more" data-id="${esc(c.id)}">More like this</button>
        <button data-act="edit" data-id="${esc(c.id)}">Rewrite it</button>
        <button data-act="never" data-id="${esc(c.id)}" class="never">Never again</button>
      </div>
    </div>
   </div>
  </article>`;
};

export { cardHTML, emblemsOf, emblemRow, indexOf, markHTML, lengthOf, esc };
