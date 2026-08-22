/* Activinator — panels.
   One panel at a time, up from the bottom, over a deck that stays where it
   is. `body` is a function, not a string, so a panel can redraw itself from
   state after any change — no handler rebuilds a panel by hand. */
import { S, save, APP_VERSION, exportJSON, importJSON } from './state.js';
import { TAGS, GROUPS, WHO, WHERE, TIME } from './data.js';
import { opinions, learn } from './taste.js';
import { reset as redeal, render, toast } from './deck.js';
import { esc, lengthOf } from './cards.js';

const host = () => document.getElementById('panelhost');
let PANEL = null;

const openPanel = (spec) => {
  PANEL = spec;
  host().innerHTML = `<div class="scrim" data-act="closepanel"></div>
    <section class="panel" role="dialog" aria-label="${esc(spec.title)}">
      <div class="phead"><i class="grab"></i><h2>${esc(spec.title)}</h2>
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
  `<button data-act="${act}" data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${esc(label)}</button>`).join('')}</div>`;

/* — what you are in the mood for. Three questions, and every one of them has
     an answer that means "do not filter on this". — */
const ctxPanel = () => openPanel({ key:'ctx', title:'Right now', body: () => `
  <div class="prow"><p class="plabel">Who is in</p>${chips('setwho', WHO, S.ctx.who)}</div>
  <div class="prow"><p class="plabel">Where</p>${chips('setwhere', WHERE, S.ctx.where)}</div>
  <div class="prow"><p class="plabel">How long you have</p>${chips('settime', TIME, S.ctx.time)}</div>
  <p class="pnote">This filters the deck. It does not teach it anything — a rainy Tuesday
  is not evidence about what you like.</p>` });

/* — the list: what you said yes to. Doing one is stronger evidence than
     liking the look of it, so ticking it teaches again. — */
const listPanel = () => openPanel({ key:'list', title:'The list', body: () => {
  const live = S.list.filter(l => !l.done), done = S.list.filter(l => l.done);
  const row = (l) => `<div class="item ${l.done ? 'done' : ''}">
      <button class="tick" data-act="tick" data-id="${esc(l.at)}">✓</button>
      <div class="iwrap"><div class="itxt">${esc(l.card.t)}</div>
        <div class="imeta">${l.now && !l.done ? '<span class="nowtag">Doing it now</span>' : ''}
          <span>${esc(lengthOf(l.card.min))}</span></div></div>
      <button class="del" data-act="unlist" data-id="${esc(l.at)}" aria-label="Remove">✕</button>
    </div>`;
  if (!S.list.length) return `<p class="pnote">Nothing yet. Swipe right on anything you fancy
    and it lands here — the list is the point of the swiping.</p>`;
  return (live.length ? `<p class="plabel">To do</p>${live.map(row).join('')}` : '')
    + (done.length ? `<div class="prow" style="margin-top:14px"><p class="plabel">Done — ${done.length}</p>
        ${done.map(row).join('')}
        <button class="pbtn" data-act="clearlist">Clear the finished ones</button></div>` : '');
} });

/* — what it has worked out. This screen is the argument for the whole app:
     if it cannot show you its opinions and let you throw them away, it is
     just another feed with a different shape. — */
const tastePanel = () => openPanel({ key:'taste', title:'What it thinks you are like', body: () => {
  const ops = opinions(), up = ops.filter(o => o.v > 0).slice(0, 7), down = ops.filter(o => o.v < 0).slice(-6).reverse();
  const max = Math.max(.35, ...ops.map(o => Math.abs(o.v)));
  const bar = (o) => `<div class="bar ${o.v < 0 ? 'down' : ''}"><span class="bl">${esc(o.label)}</span>
    <span class="bt"><i style="${o.v > 0 ? 'left:50%' : 'right:50%;left:auto'};width:${Math.round(Math.abs(o.v) / max * 48)}%"></i></span></div>`;
  const done = S.list.filter(l => l.done).length;
  return `
  <div class="prow"><div class="stat">
    <span><b>${S.swipes}</b>swipes</span>
    <span><b>${S.list.filter(l => !l.done).length}</b>on the list</span>
    <span><b>${done}</b>actually done</span>
  </div>${S.swipes < 12 ? `<p class="pnote">Under a dozen swipes it is mostly guessing, and it
    deals almost at random on purpose. Keep going.</p>` : ''}</div>

  ${up.length ? `<div class="prow"><p class="plabel">You go for</p>${up.map(bar).join('')}</div>` : ''}
  ${down.length ? `<div class="prow"><p class="plabel">You pass on</p>${down.map(bar).join('')}</div>` : ''}

  <div class="prow"><p class="plabel">Nerve — ${Math.round(S.nerve * 100)}% wildcards</p>
    <input type="range" min="0" max="80" value="${Math.round(S.nerve * 100)}" data-act="nerve">
    <p class="pnote">How often it deals something it does not think you will like. Turn it
    down and it will agree with you all day; that is how an app stops being any use.</p></div>

  <div class="prow">
    <button class="pbtn" data-act="add">Write your own<small>Anything it would never think of</small></button>
    <button class="pbtn" data-act="forgive">Bring back the passes<small>Everything you said no to becomes fair game again</small></button>
    <button class="pbtn" data-act="backup">Back it up<small>Export and import — there is no server, so this is the only copy</small></button>
    <button class="pbtn warn" data-act="wipe">Forget everything<small>Weights, list, the lot</small></button>
  </div>
  <p class="pnote" style="text-align:center;color:var(--dim-2)">Activinator ${esc(APP_VERSION)} —
  everything is on this device and nowhere else.</p>`;
} });

/* — your own activities. They go in the same pool as the library and are
     scored the same way, which is what stops "mine" being a second app. — */
const DRAFT = { t:'', who:'any', where:'any', min:60, tags:[] };
const addPanel = () => openPanel({ key:'add', title:'Write your own', body: () => `
  <div class="prow"><p class="plabel">The thing</p>
    <input class="field" data-in="t" placeholder="Walk the whole of the canal" value="${esc(DRAFT.t)}">
    <p class="pnote">However you write it is how it will read on the card, so write the
    whole thing — there is nowhere else for it to go.</p></div>
  <div class="prow"><p class="plabel">Who</p>${chips('dwho', WHO, DRAFT.who)}</div>
  <div class="prow"><p class="plabel">Where</p>${chips('dwhere', WHERE, DRAFT.where)}</div>
  <div class="prow"><p class="plabel">How long — ${esc(lengthOf(DRAFT.min))}</p>
    <input type="range" min="10" max="600" step="10" value="${DRAFT.min}" data-act="dmin"></div>
  ${GROUPS.map(([name, keys]) => `<div class="prow"><p class="plabel">${esc(name)}</p>
    <div class="chips">${keys.map(k =>
      `<button data-act="dtag" data-v="${k}" class="${DRAFT.tags.includes(k) ? 'on' : ''}">${esc(TAGS[k])}</button>`).join('')}</div></div>`).join('')}
  <p class="pnote">Tags are the only thing it learns from. Pick the ones that are
  actually true and leave the rest.</p>
  <button class="pbtn" data-act="savemine">Put it in the deck</button>` });

const backupPanel = () => openPanel({ key:'backup', title:'Back it up', body: () => `
  <div class="prow"><p class="plabel">Out</p>
    <button class="pbtn" data-act="download">Download a copy</button>
    <textarea class="field pickme" style="min-height:110px;font-size:11px" readonly>${esc(exportJSON())}</textarea></div>
  <div class="prow"><p class="plabel">In</p>
    <textarea class="field" data-in="restore" placeholder="Paste a copy here"></textarea>
    <button class="pbtn warn" data-act="restore">Replace everything with that</button></div>` });

/* Saving a written activity: it needs a title and at least one tag, because a
   card with no tags teaches nothing and can never be scored. */
const saveMine = () => {
  if (!DRAFT.t.trim()) return toast('It needs a name');
  if (!DRAFT.tags.length) return toast('Pick a tag or two');
  const tags = [...new Set(DRAFT.tags.concat(
    DRAFT.min <= 30 ? ['quick'] : DRAFT.min >= 240 ? ['longhaul'] : []))];
  S.mine.unshift({ id:'m' + Date.now().toString(36), t:DRAFT.t.trim(),
    tags, who:DRAFT.who, where:DRAFT.where, min:+DRAFT.min, cost:0, src:'mine' });
  Object.assign(DRAFT, { t:'', tags:[] });
  save(); redeal(); closePanel(); toast('In the deck');
};

export { openPanel, closePanel, refreshPanel, panelKey, ctxPanel, listPanel,
         tastePanel, addPanel, backupPanel, saveMine, DRAFT };
