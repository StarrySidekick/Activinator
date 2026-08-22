/* Activinator — how a card is printed.
   The front is the activity and nothing else. Not a description, not the tags,
   not how long it takes: a card you have to read twice is a card you stop
   swiping. Everything the app knows about the activity is on the back, for
   when you have decided you want it.

   Every branch below is on a property of the card, never on its title or id. */
import { TAGS } from './data.js';
import { S } from './state.js';
import { reasons } from './taste.js';

const esc = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

/* The card's colour, read off what it is made of. First match wins, so the
   list runs from what says most about an activity to what says least: the
   mood it is in, then what it is made of, then what you do, then where. */
const FAMILY = [
  ['romantic','#B0576B'], ['spooky','#6E5183'],
  ['writing','#5A6BA8'], ['music','#7A63A8'], ['film','#4F5B8C'], ['dancing','#C25E7E'],
  ['acting','#A85A7A'], ['painting','#B06A3C'], ['drawing','#8A6BA0'],
  ['sculpting','#8A7B5E'], ['clothes','#A0566B'], ['mixedmedia','#8F6BA8'],
  ['visualart','#9B5F86'],
  ['eat','#C0703A'], ['travel','#B0743E'], ['play','#4F8F8A'], ['move','#3F8F7A'],
  ['create','#9B5F86'], ['repair','#A8703F'], ['clean','#5E8A8A'], ['organize','#6C7A8C'],
  ['read','#5A6BA8'], ['listen','#7A63A8'], ['watch','#8A6BA0'], ['learn','#48789B'],
  ['try','#C08A3E'], ['kindness','#7E9B58'],
  ['nature','#5F8A63'], ['outdoors','#6F8F5E'], ['water','#4E82A0'], ['city','#8A8070']
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

const factsOf = (c) => [lengthOf(c.min), WHERE[c.where], WHO[c.who], COST[c.cost]]
  .map(f => `<li>${esc(f)}</li>`).join('');

const cardHTML = (c) => {
  const odds = Math.round((c.odds || .5) * 100);
  const r = reasons(c, 3);
  return `<article class="card" data-key="${c.key}" style="--accent:${accentOf(c)}">
   <div class="cardin">
    <div class="face front">
      <div class="stamp s-yes">Yes</div>
      <div class="stamp s-no">Not me</div>
      <div class="stamp s-now">Now</div>
      <h2 class="t">${esc(c.t)}</h2>
    </div>
    <div class="face back">
      <p class="kicker">${c.kind === 'wild' ? 'Wildcard' : esc(TAGS[c.tags[0]] || 'What this is')}</p>
      <h3>${esc(c.t)}</h3>
      <ul class="facts">${factsOf(c)}</ul>
      <ul class="taglist">${c.tags.map(g => {
        const w = S.w[g] || 0;
        return `<li class="${w > .12 ? 'up' : w < -.12 ? 'down' : ''}">${esc(TAGS[g] || g)}</li>`;
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

export { cardHTML, accentOf, lengthOf, esc, WHERE, WHO, COST };
