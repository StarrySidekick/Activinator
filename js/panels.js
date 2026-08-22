/* Activinator — panels.
   One panel at a time, up from the bottom, over a deck that stays where it is.
   `body` is a function, not a string, so a panel can redraw itself from state
   after any change — no handler rebuilds a panel by hand. */
import { S, save, APP_VERSION, pool, exportJSON, importJSON } from './state.js';
import { TAGS, GROUPS, WHO, WHERE, TIME, DURATIONS, COSTS } from './data.js';
import { opinions } from './taste.js';
import { reset as redeal, toast } from './deck.js';
import { esc, emblemRow, markHTML, lengthOf } from './cards.js';

const host = () => document.getElementById('panelhost');
let PANEL = null;

const openPanel = (spec) => {
  PANEL = spec;
  host().innerHTML = `<div class="scrim" data-act="closepanel"></div>
    <section class="panel" role="dialog" aria-label="${esc(spec.title)}">
      <div class="phead"><i class="grab"></i>
        ${spec.back ? `<button class="x" data-act="${esc(spec.back)}" aria-label="Back">‹</button>` : ''}
        <h2>${esc(spec.title)}</h2>
        <button class="x" data-act="closepanel" aria-label="Close">✕</button></div>
      <div class="pbody">${spec.body()}</div>
    </section>`;
  requestAnimationFrame(() => host().classList.add('on'));
};
const refreshPanel = () => {
  if (!PANEL) return;
  const b = host().querySelector('.pbody');
  if (b) { const y = b.scrollTop; b.innerHTML = PANEL.body(); b.scrollTop = y; }
};
const closePanel = () => {
  PANEL = null; host().classList.remove('on');
  setTimeout(() => { if (!PANEL) host().innerHTML = ''; }, 260);
};
const panelKey = () => PANEL && PANEL.key;

const chips = (act, opts, cur) => `<div class="chips">${opts.map(([v, label]) =>
  `<button data-act="${act}" data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${
    markHTML(v)}${esc(label)}</button>`).join('')}</div>`;

/* — the hub. One button on the deck reaches everything, so the deck itself can
     be the whole screen. — */
const menuPanel = () => openPanel({ key:'menu', title:'Activinator', body: () => `
  <button class="pbtn" data-act="ctx">Right now<small>${esc(ctxLine())}</small></button>
  <button class="pbtn" data-act="browse">All activities<small>${pool().length} of them, searchable</small></button>
  <button class="pbtn" data-act="add">Write your own<small>Anything it would never think of</small></button>
  <button class="pbtn" data-act="taste">What it thinks you are like<small>${S.swipes} swipes in</small></button>
  <button class="pbtn" data-act="backup">Back it up<small>There is no server, so this is the only copy</small></button>
  <p class="pnote" style="text-align:center;color:var(--dim-2);margin-top:18px">Activinator ${esc(APP_VERSION)} —
  everything is on this device and nowhere else.</p>` });

const labelOf = (list, v) => (list.find(o => String(o[0]) === String(v)) || [, ''])[1];
const ctxLine = () => {
  const p = [];
  if (S.ctx.who)   p.push(labelOf(WHO, S.ctx.who));
  if (S.ctx.where) p.push(labelOf(WHERE, S.ctx.where));
  if (S.ctx.time)  p.push(labelOf(TIME, S.ctx.time));
  return p.length ? p.join(' · ') : 'up for anything';
};

/* — what you are in the mood for. Three axes of the vocabulary, not a second
     set of words that has to be kept in step with it. — */
const ctxPanel = () => openPanel({ key:'ctx', title:'Right now', back:'menu', body: () => `
  <div class="prow"><p class="plabel">Who is in</p>${chips('setwho', WHO, S.ctx.who)}</div>
  <div class="prow"><p class="plabel">Where</p>${chips('setwhere', WHERE, S.ctx.where)}</div>
  <div class="prow"><p class="plabel">How long you have</p>${chips('settime', TIME, S.ctx.time)}</div>
  <p class="pnote">This filters the deck and teaches it nothing — a wet Tuesday is not
  evidence about what you are like. How long you have is a ceiling, so anything
  shorter is fair game too.</p>` });

/* — everything there is, searchable. The deck decides what you see; this is
     for when you want to go and look. — */
let QUERY = '';
const matches = (c) => {
  if (!QUERY) return true;
  const q = QUERY.toLowerCase();
  return c.t.toLowerCase().includes(q) || c.tags.some(g => (TAGS[g] || g).includes(q));
};
const MARK = { like:'♥', dislike:'✕', never:'⊘' };
const browseRows = () => {
  const rows = pool().filter(matches);
  if (!rows.length) return `<p class="pnote">Nothing matches that.</p>`;
  return rows.map(c => {
    const v = (S.seen[c.id] || {}).v;
    return `<div class="brow ${v || ''}">
      <div class="bwrap"><div class="btitle">${esc(c.t)}</div>
        ${emblemRow(c)}</div>
      <button class="bset like" data-act="blike" data-id="${esc(c.id)}" aria-label="Like">♥</button>
      <button class="bset dis" data-act="bdislike" data-id="${esc(c.id)}" aria-label="Do not like">✕</button>
      ${v ? `<span class="bstate">${MARK[v]}</span>` : ''}
    </div>`;
  }).join('');
};
const browsePanel = () => openPanel({ key:'browse', title:'All activities', back:'menu', body: () => `
  <input class="field" data-in="q" placeholder="Search — a word, or a tag" value="${esc(QUERY)}">
  <p class="pnote">${pool().filter(matches).length} of ${pool().length}. Liking one here counts
  the same as liking it on a card.</p>
  <div id="browerows">${browseRows()}</div>` });

/* Typing must not redraw the panel — the field is the thing being typed in. */
const browseSearch = (v) => {
  QUERY = v;
  const box = document.getElementById('browerows');
  if (box) box.innerHTML = browseRows();
};

/* — what it has worked out. This screen is the argument for the whole app: if
     it cannot show you its opinions and let you throw them away, it is just
     another feed with a different shape. — */
const tastePanel = () => openPanel({ key:'taste', title:'What it thinks you are like', back:'menu', body: () => {
  const ops = opinions(), up = ops.filter(o => o.v > 0).slice(0, 8), down = ops.filter(o => o.v < 0).slice(-7).reverse();
  const max = Math.max(.35, ...ops.map(o => Math.abs(o.v)));
  const bar = (o) => `<div class="bar ${o.v < 0 ? 'down' : ''}"><span class="bl">${markHTML(o.tag)}${esc(o.label)}</span>
    <span class="bt"><i style="${o.v > 0 ? 'left:50%' : 'right:50%;left:auto'};width:${Math.round(Math.abs(o.v) / max * 48)}%"></i></span></div>`;
  const n = v => Object.values(S.seen).filter(s => s.v === v).length;
  return `
  <div class="prow"><div class="stat">
    <span><b>${S.swipes}</b>swipes</span>
    <span><b>${n('like')}</b>liked</span>
    <span><b>${n('dislike')}</b>not</span>
    <span><b>${n('never')}</b>out</span>
  </div>${S.swipes < 12 ? `<p class="pnote">Under a dozen swipes it is mostly guessing, and it
    deals almost at random on purpose. Keep going.</p>` : ''}</div>

  ${up.length ? `<div class="prow"><p class="plabel">You go for</p>${up.map(bar).join('')}</div>` : ''}
  ${down.length ? `<div class="prow"><p class="plabel">You pass on</p>${down.map(bar).join('')}</div>` : ''}

  <div class="prow"><p class="plabel">Nerve — ${Math.round(S.nerve * 100)}% wildcards</p>
    <input type="range" min="0" max="80" value="${Math.round(S.nerve * 100)}" data-act="nerve">
    <p class="pnote">How often it deals something it does not think you will like. Turn it
    down and it will agree with you all day; that is how an app stops being any use.</p></div>

  <div class="prow">
    <button class="pbtn warn" data-act="wipe">Forget everything<small>Weights, verdicts, the lot</small></button>
  </div>`;
} });

/* — your own activities, in the same pool and scored the same way, which is
     what stops "mine" being a second app. — */
const DRAFT = { t:'', tags:[] };
const REP = { quick:3, short:20, medium:75, long:180, allday:480 };   // a band needs a number behind it
const addPanel = () => openPanel({ key:'add', title:'Write your own', back:'menu', body: () => `
  <div class="prow"><p class="plabel">The thing</p>
    <input class="field" data-in="t" placeholder="Walk the whole of the canal" value="${esc(DRAFT.t)}">
    <p class="pnote">However you write it is how it reads on the card, so write the whole
    thing — there is nowhere else for it to go.</p></div>
  ${GROUPS.map(([name, keys]) => `<div class="prow"><p class="plabel">${esc(name)}</p>
    <div class="chips">${keys.map(k =>
      `<button data-act="dtag" data-v="${k}" class="${DRAFT.tags.includes(k) ? 'on' : ''}">${markHTML(k)}${esc(TAGS[k])}</button>`).join('')}</div></div>`).join('')}
  <p class="pnote">Tags are the only thing it learns from, and the emblems on the card are
  these. Pick the ones that are actually true.</p>
  <button class="pbtn" data-act="savemine">Put it in the deck</button>` });

const backupPanel = () => openPanel({ key:'backup', title:'Back it up', back:'menu', body: () => `
  <div class="prow"><p class="plabel">Out</p>
    <button class="pbtn" data-act="download">Download a copy</button>
    <textarea class="field pickme" style="min-height:110px;font-size:11px" readonly>${esc(exportJSON())}</textarea></div>
  <div class="prow"><p class="plabel">In</p>
    <textarea class="field" data-in="restore" placeholder="Paste a copy here"></textarea>
    <button class="pbtn warn" data-act="restore">Replace everything with that</button></div>` });

/* Saving a written activity. It needs a name, somewhere, somebody and a
   length, because a card with no tags teaches nothing and can never be
   filtered — and it would be invisible the moment you asked for anything. */
const saveMine = () => {
  if (!DRAFT.t.trim()) return toast('It needs a name');
  const has = keys => keys.some(k => DRAFT.tags.includes(k));
  if (!has(['anywhere','indoors','outdoors','home'])) return toast('Say where');
  if (!has(['solo','partner','friends','newpeople'])) return toast('Say who with');
  if (!has(DURATIONS)) return toast('Say how long');
  const tags = DRAFT.tags.slice();
  if (!has(COSTS)) tags.push('free');
  const dur = DURATIONS.find(d => tags.includes(d));
  S.mine.unshift({ id:'m' + Date.now().toString(36), t:DRAFT.t.trim(), tags,
    min: REP[dur], cost: Math.max(0, COSTS.findIndex(k => tags.includes(k))), src:'mine' });
  Object.assign(DRAFT, { t:'', tags:[] });
  save(); redeal(); closePanel(); toast('In the deck');
};

export { openPanel, closePanel, refreshPanel, panelKey, menuPanel, ctxPanel, browsePanel,
         browseSearch, tastePanel, addPanel, backupPanel, saveMine, ctxLine, DRAFT };
