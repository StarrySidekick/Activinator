/* Activinator — how a card is printed.
   One function decides what an activity looks like, the way one function
   decides in Bureau. Every branch below is on a property of the card, never
   on the title or the id. */
import { TAGS } from './data.js';
import { S } from './state.js';
import { reasons } from './taste.js';

const esc = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

/* The card's own colour, read off what it is made of. First match wins, so
   the list is in order of how much a tag says about the activity. */
const FAMILY = [
  ['romance','#B0576B'], ['nature','#5F8A63'], ['outdoors','#6F8F5E'], ['water','#4E82A0'],
  ['food','#C0703A'], ['making','#A8703F'], ['creative','#9B5F86'], ['music','#7A63A8'],
  ['words','#5A6BA8'], ['learning','#48789B'], ['physical','#4F8F8A'], ['social','#C08A3E'],
  ['kindness','#7E9B58'], ['watching','#8A6BA0'], ['city','#8A8070'], ['calm','#6C7A8C'],
  ['adventure','#B0743E']
];
const accentOf = (c) => {
  for (const [tag, hex] of FAMILY) if (c.tags.includes(tag)) return hex;
  return '#7d8496';
};

/* Minutes as somebody would say them. A card that says "150 min" is a
   spreadsheet; a card that says "a couple of hours" is a suggestion. */
const lengthOf = (m) => {
  if (m <= 15) return 'Ten minutes';
  if (m < 45)  return m + ' minutes';
  if (m < 75)  return 'About an hour';
  if (m < 135) return 'An hour or two';
  if (m < 200) return 'A few hours';
  if (m < 330) return 'An afternoon';
  if (m < 560) return 'A whole day';
  return 'Overnight';
};
const WHERE = { home:'At home', out:'Out', any:'Wherever' };
const WHO   = { any:'Anyone', solo:'On your own', two:'The two of you', group:'A few of you' };
const COST  = ['Free', 'Costs a bit', 'Worth spending on'];

const kickerOf = (c) => {
  if (c.kind === 'wild')   return ['Wildcard', 'try it and see'];
  if (c.kind === 'twist')  return ['With a twist', TAGS[c.tags[0]] || ''];
  if (c.kind === 'double') return ['Two in one', 'same afternoon'];
  return [TAGS[c.tags[0]] || 'Something to do', c.src === 'mine' ? 'yours' : ''];
};

/* A fact that applies to everything is not a fact. "Wherever" and "alone or
   not" are what the card says when it has nothing to say, so they are left
   off the front and kept for the back, where you went looking for detail. */
const factsOf = (c, all) => [
  lengthOf(c.min),
  (all || c.where !== 'any') ? WHERE[c.where] : null,
  (all || c.who !== 'any') ? WHO[c.who] : null,
  (all || c.cost) ? COST[c.cost] : null
].filter(Boolean).map(f => `<li>${esc(f)}</li>`).join('');

const cardHTML = (c) => {
  const [k1, k2] = kickerOf(c);
  const r = reasons(c, 6);
  return `<article class="card" data-key="${c.key}" style="--accent:${accentOf(c)}">
   <div class="cardin">
    <div class="face front">
      <div class="stamp s-yes">Yes</div>
      <div class="stamp s-no">Not me</div>
      <div class="stamp s-now">Now</div>
      <p class="kicker">${esc(k1)}${k2 ? `<span class="dot"></span><span class="k2">${esc(k2)}</span>` : ''}</p>
      <h2 class="t">${esc(c.t)}</h2>
      <p class="d">${esc(c.d)}</p>
      ${c.twist ? `<p class="twist">${esc(c.twist)}</p>` : ''}
      <ul class="facts">${factsOf(c)}</ul>
      <p class="why"><b>Why this</b> ${esc(c.why)}</p>
      <p class="flipnote">Tap the card for more</p>
    </div>
    <div class="face back">
      <p class="kicker">What this is made of</p>
      <h3>${esc(c.t)}</h3>
      <ul class="taglist">${c.tags.map(g => {
        const w = S.w[g] || 0;
        return `<li class="${w > .12 ? 'up' : w < -.12 ? 'down' : ''}">${esc(TAGS[g] || g)}</li>`;
      }).join('')}</ul>
      <ul class="facts" style="margin-top:16px">${factsOf(c, true)}</ul>
      <p class="odds">It puts your odds of going for this at
        <b>${Math.round((c.odds || .5) * 100)}%</b>.</p>
      <div class="meter"><i style="width:${Math.round((c.odds || .5) * 100)}%"></i></div>
      ${r.length ? `<p class="pnote" style="color:var(--text-3);margin-top:8px">On the strength of
        ${r.slice(0,3).map(x => esc(x.label) + (x.up ? '' : ' — against')).join(', ')}.</p>` : ''}
      ${c.twist ? `<p class="twist" style="margin-top:18px">${esc(c.twist)}</p>` : ''}
      <div class="backrow">
        ${c.twist ? '<button data-act="retwist">Different twist</button>' : ''}
        <button data-act="more">More like this</button>
        <button data-act="never" class="never">Never again</button>
      </div>
    </div>
   </div>
  </article>`;
};

export { cardHTML, accentOf, lengthOf, esc, WHERE, WHO, COST };
