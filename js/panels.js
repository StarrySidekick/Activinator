/* Activinator — panels.
   One panel at a time, up from the bottom, over a deck that stays where it is.
   `body` is a function, not a string, so a panel can redraw itself from state
   after any change — no handler rebuilds a panel by hand. */
import { S, save, APP_VERSION, all, pool, packOn, byId, baseById, exportJSON, importJSON } from './state.js';
import { TAGS, GROUPS, PACKS, WHO, WHERE, TIME, DURATIONS, COSTS, durationOf } from './data.js';
import { opinions } from './taste.js';
import { cycle } from './deal.js';
import { reset as redeal, restack, toast } from './deck.js';
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
  <button class="pbtn" data-act="decks">Decks<small>${PACKS.filter(p => packOn(p.id)).length} of ${PACKS.length} on the table</small></button>
  <button class="pbtn" data-act="add">Write your own<small>Anything it would never think of</small></button>
  <button class="pbtn" data-act="table">The table<small>Deal them out and handle them — a place to try things</small></button>
  <button class="pbtn" data-act="curate">Curate<small>${curationRows().length} to take back to the packs</small></button>
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

/* — the decks. A pack is a CSV in packs/, built into the app rather than
     fetched: the deck has to deal on a train. Switching one off takes its cards
     out of the pool and leaves everything you have said about them alone, so
     switching it back on picks up where you were.

     It is drawn as what it is — a deck of cards, face down, in the ink that
     pack is printed in and carrying one of the drawn marks as its emblem. A
     list of names with tickboxes is a settings screen; a table with eight decks
     laid out on it is the thing you are actually choosing between. — */
const deckOf = (p) => {
  const on = packOn(p.id);
  return `<button class="deck ${on ? 'on' : 'off'} back-${esc(p.back)}"
      data-act="togglepack" data-id="${esc(p.id)}"
      style="--ink:${esc(p.ink)}" aria-pressed="${on}">
    <span class="stack">
      <i></i><i></i>
      <span class="face">${markHTML(p.mark, 'pip')}</span>
    </span>
    <span class="dname">${esc(p.name)}</span>
    <span class="dcount">${p.items.length} cards</span>
  </button>`;
};

const packsPanel = () => openPanel({ key:'packs', title:'Decks', back:'menu', body: () => `
  <div class="table">${PACKS.map(deckOf).join('')}</div>
  <p class="pnote">Tap a deck to take it off the table or put it back. What you have said
  about its cards is kept either way, and the round is not shortened by it — the deck you
  put away simply is not dealt. They are built into the app, so they work with the
  aeroplane mode on.</p>
  ${S.mine.length ? `<div class="prow"><p class="plabel">Yours, as pack rows</p>
    <textarea class="field pickme" style="min-height:96px;font-size:11px" readonly>${esc(mineCSV())}</textarea>
    <p class="pnote">${S.mine.length} written on this device, and they live only on it.
    Paste these into a pack — a CSV in packs/, or the spreadsheet you build one from —
    and they ship with the app instead of sitting on one phone.</p></div>` : ''}` });

/* What you have written, in the shape a pack is written in. Duration and cost
   are columns on the way out because they are columns on the way in — the tags
   for them are derived, and a row carrying both would be refused by the build. */
const mineCSV = () => S.mine.map(a =>
  [q(a.t), a.min, COSTS[a.cost] || 'free', q(packTags(a))].join(',')).join('\n');

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
  const c = cycle();
  return `
  <div class="prow"><div class="stat">
    <span><b>${S.swipes}</b>swipes</span>
    <span><b>${n('like')}</b>liked</span>
    <span><b>${n('dislike')}</b>not</span>
    <span><b>${n('never')}</b>out</span>
  </div>${S.swipes < 12 ? `<p class="pnote">Under a dozen swipes it is mostly guessing, and it
    deals almost at random on purpose. Keep going.</p>` : ''}</div>

  <div class="prow"><p class="plabel">Round ${c.n}</p>
    <div class="rounds"><i style="width:${c.total ? Math.round(c.gone / c.total * 100) : 0}%"></i></div>
    <p class="pnote">${c.gone} of ${c.total} this time round, ${c.left} to go. Nothing comes
    back until you have been through the lot — and then the deck says so and waits. What you
    have asked for filters the deck; it does not shorten the round.</p></div>

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
     what stops "mine" being a second app. Rewriting a card that came from a
     pack is the same screen: a card is a title and a set of tags whoever wrote
     it, and there is nothing else to ask about. — */
const DRAFT = { id:null, t:'', tags:[], min:0, d:null };
const REP = { quick:3, short:20, medium:75, long:180, allday:480 };   // a band needs a number behind it

const draftBody = (note, buttons) => `
  <div class="prow"><p class="plabel">The thing</p>
    <input class="field" data-in="t" placeholder="Walk the whole of the canal" value="${esc(DRAFT.t)}">
    <p class="pnote">${note}</p></div>
  ${DRAFT.d === null ? '' : `<div class="prow"><p class="plabel">What it means</p>
    <textarea class="field" data-in="d">${esc(DRAFT.d)}</textarea>
    <p class="pnote">The meaning, printed under the word. Only the packs that teach
    something carry one, and the line breaks in it are kept.</p></div>`}
  ${GROUPS.map(([name, keys]) => `<div class="prow"><p class="plabel">${esc(name)}</p>
    <div class="chips">${keys.map(k =>
      `<button data-act="dtag" data-v="${k}" class="${DRAFT.tags.includes(k) ? 'on' : ''}">${markHTML(k)}${esc(TAGS[k])}</button>`).join('')}</div></div>`).join('')}
  <p class="pnote">Tags are the only thing it learns from, and the emblems on the card are
  these. Pick the ones that are actually true.</p>${buttons}`;

const addPanel = () => {
  Object.assign(DRAFT, { id:null, t:'', tags:[], min:0, d:null });
  openPanel({ key:'add', title:'Write your own', back:'menu', body: () => draftBody(
    `However you write it is how it reads on the card, so write the whole thing — there
     is nowhere else for it to go.`,
    `<button class="pbtn" data-act="savemine">Put it in the deck</button>`) });
};

/* — rewriting a card before you swipe it. A card you would go for if it said
     something slightly different is not a card to swipe left on: swiping left
     teaches the model something untrue about a whole set of tags, and the pack
     keeps the sentence that was nearly right. Rewrite it, swipe it, and the
     curation carries the new wording back to the pack. — */
const editPanel = (id) => {
  const c = byId(id); if (!c) return;
  /* The definition field appears only on a card that has one: a null means
     "this kind of card does not carry a meaning", which is not the same as an
     empty one. */
  Object.assign(DRAFT, { id, t:c.t, tags:c.tags.slice(), min:c.min, d:c.d == null ? null : c.d });
  openPanel({ key:'edit', title:'Rewrite this card', body: () => draftBody(
    `Say it the way you would want to read it on the card. The id comes from the
     original title, so everything you have already said about this one stays
     attached to it.`,
    `<button class="pbtn" data-act="saveedit">Use this instead</button>
     ${S.edits[DRAFT.id] ? `<button class="pbtn warn" data-act="unedit">Put it back as
       it was<small>${esc(baseById(DRAFT.id).t)}</small></button>` : ''}`) });
};

const backupPanel = () => openPanel({ key:'backup', title:'Back it up', back:'menu', body: () => `
  <div class="prow"><p class="plabel">Out</p>
    <button class="pbtn" data-act="download">Download a copy</button>
    <textarea class="field pickme" style="min-height:110px;font-size:11px" readonly>${esc(exportJSON())}</textarea></div>
  <div class="prow"><p class="plabel">In</p>
    <textarea class="field" data-in="restore" placeholder="Paste a copy here"></textarea>
    <button class="pbtn warn" data-act="restore">Replace everything with that</button></div>` });

/* Saving a written activity. It asks for exactly what a pack row has to have,
   so that what you write on your phone can be pasted into packs/ and build
   without being edited first. Anything less and it is invisible the moment you
   ask the deck for something, and teaches nothing either way. */
const HARD = GROUPS.find(g => g[0] === 'How hard')[1];
const has = keys => keys.some(k => DRAFT.tags.includes(k));

/* `who` is a constraint rather than a description: a card names nobody unless
   it needs somebody. Writing one from nothing asks for it anyway, because you
   are describing a thing you have in mind and it is the question people forget
   — but a rewrite must be allowed to leave it off, or every pack card that
   answers to whoever you asked for would come back naming one person. */
const complain = (needWho) => {
  if (!DRAFT.t.trim()) return 'It needs a name';
  if (!has(['anywhere','indoors','outdoors','home'])) return 'Say where';
  if (needWho && !has(['solo','partner','friends','newpeople'])) return 'Say who with';
  if (!has(HARD)) return 'Say how hard';
  if (!has(DURATIONS)) return 'Say how long';
  return null;
};

const saveMine = () => {
  const bad = complain(true); if (bad) return toast(bad);
  const tags = DRAFT.tags.slice();
  if (!has(COSTS)) tags.push('free');
  const dur = DURATIONS.find(d => tags.includes(d));
  S.mine.unshift({ id:'m' + Date.now().toString(36), t:DRAFT.t.trim(), tags,
    min: REP[dur], cost: Math.max(0, COSTS.findIndex(k => tags.includes(k))), src:'mine' });
  Object.assign(DRAFT, { id:null, t:'', tags:[], min:0, d:null });
  save(); redeal(); closePanel(); toast('In the deck');
};

/* A rewrite is kept beside the card it rewrites, under the id the original
   title gave it. One that ends up saying exactly what the pack says is not a
   rewrite at all, and it is thrown away rather than exported as a change. */
const same = (a, b) => a.t === b.t && a.min === b.min && a.cost === b.cost &&
  (a.d || '') === (b.d || '') &&
  a.tags.length === b.tags.length && a.tags.every(t => b.tags.includes(t));

const saveEdit = () => {
  const base = baseById(DRAFT.id); if (!base) return closePanel();
  const bad = complain(false); if (bad) return toast(bad);
  const tags = DRAFT.tags.slice();
  if (!has(COSTS)) tags.push(COSTS[base.cost] || 'free');
  const dur = DURATIONS.find(d => tags.includes(d));
  /* The minutes are kept unless the band you picked no longer covers them.
     Working them out from the band every time would round every rewritten card
     to the middle of it — an hour and a half quietly becoming seventy-five
     minutes because you changed a word in the title. */
  const next = { t: DRAFT.t.trim(), tags,
    min: durationOf(DRAFT.min) === dur ? DRAFT.min : REP[dur],
    cost: Math.max(0, COSTS.findIndex(k => tags.includes(k))) };
  if (DRAFT.d !== null) next.d = DRAFT.d;
  if (base.src === 'mine') Object.assign(S.mine.find(m => m.id === base.id), next);
  else if (same(base, next)) delete S.edits[base.id];
  else S.edits[base.id] = next;
  save(); restack(); closePanel(); toast('Rewritten');
};

const unedit = () => {
  delete S.edits[DRAFT.id];
  save(); restack(); closePanel(); toast('Back as it was');
};

/* — curating. Swiping is how the deck learns; this is how the packs learn.
     A verdict that lives only in localStorage is a verdict nobody can act on:
     the packs are the source of truth, so everything you have judged or
     rewritten has to be able to come back out in the shape they are written
     in. A skip is not a verdict and is not here. — */
const VERDICT = { like:'keep', dislike:'cut', never:'out' };
const RANK = { keep:0, cut:1, out:2, edit:3 };
const curationRows = () => all()
  .map(c => {
    const v = VERDICT[(S.seen[c.id] || {}).v] || (c.edit ? 'edit' : null);
    return v ? { v, c } : null;
  })
  .filter(Boolean)
  .sort((a, b) => RANK[a.v] - RANK[b.v] || a.c.t.localeCompare(b.c.t));

/* The columns a pack is written in, with the verdict in front of them and the
   title it used to have behind — that last one is how the next compile finds
   the row a rewrite replaces, since a rewritten title is a different string
   from the one in the CSV. `definition` is empty on everything but the packs
   that carry one, and it is here rather than left out because a kept word card
   without its meaning is not a row anybody can paste back. */
const q = (v) => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
const packTags = (c) => c.tags.filter(g => !DURATIONS.includes(g) && !COSTS.includes(g)).join(' ');
const curationCSV = () => ['verdict,pack,title,minutes,cost,tags,definition,was',
  ...curationRows().map(({ v, c }) => [v, c.pack || 'mine', q(c.t), c.min,
    COSTS[c.cost] || 'free', q(packTags(c)), q(c.d || ''),
    q(c.edit && c.was !== c.t ? c.was : '')].join(','))
].join('\n');

const curatePanel = () => openPanel({ key:'curate', title:'Curate', back:'menu', body: () => {
  const rows = curationRows();
  const n = v => rows.filter(r => r.v === v).length;
  return `
  <div class="prow"><div class="stat">
    <span><b>${n('keep')}</b>keep</span>
    <span><b>${n('cut')}</b>cut</span>
    <span><b>${n('out')}</b>out</span>
    <span><b>${n('edit')}</b>rewritten</span>
  </div>
  <p class="pnote">Right is keep, left is cut, never again is out, and rewritten is one
  you have changed but not yet judged. Switching a pack off hides its cards from the
  deck and changes nothing here.</p></div>
  ${rows.length ? `<div class="prow"><p class="plabel">Out</p>
    <button class="pbtn" data-act="curatefile">Download the curation</button>
    <textarea class="field pickme" style="min-height:150px;font-size:11px" readonly>${esc(curationCSV())}</textarea>
    <p class="pnote">One row per verdict, in the columns a pack is written in with the
    verdict in front. Take it to a session and the packs get edited by it: what kept
    stays, what was cut or went out comes out, and a rewritten row replaces the one named
    in the last column. Nothing here changes a pack on its own — the CSVs in packs/ are
    still the only thing the deck is built from.</p></div>`
  : `<p class="pnote">Nothing judged yet. Swipe a few and they turn up here.</p>`}`;
} });

export { openPanel, closePanel, refreshPanel, panelKey, menuPanel, ctxPanel, packsPanel, browsePanel,
         browseSearch, tastePanel, addPanel, editPanel, backupPanel, curatePanel, curationCSV,
         curationRows, saveMine, saveEdit, unedit, ctxLine, DRAFT };
