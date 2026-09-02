/* Activinator — the entry point and the one listener set.
   Everything routes through act(): to add something the app can do, add a
   data-act and a case here. Nothing binds a listener inside a render. */
import { S, load, save, reset as wipeAll, exportJSON, importJSON, pool, byId, remember,
         donePass, undonePass } from './state.js';
import { learn } from './taste.js';
import { render, reset as redeal, goRound, say, takeBack, more, toast, top,
         flip } from './deck.js';
import { deal, cycle } from './deal.js';
import { PACKS } from './data.js';
import { wire as wireSwipe } from './swipe.js';
import * as P from './panels.js';
import * as T from './table.js';

/* There is no server, so every way out of the app is a file the browser makes
   for itself. */
const today = () => new Date().toISOString().slice(0, 10);
const offer = (name, text, type) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return toast('Downloaded');
};

const act = (name, el) => {
  const v = el && el.dataset.v, id = el && el.dataset.id;
  switch (name) {
    case 'menu':   return P.menuPanel();
    case 'ctx':    return P.ctxPanel();
    case 'browse': return P.browsePanel();
    case 'packs': case 'decks': return P.packsPanel();
    case 'taste':  return P.tastePanel();
    case 'add':    return P.addPanel();
    case 'curate': return P.curatePanel();
    case 'backup': return P.backupPanel();
    case 'closepanel': return P.closePanel();

    /* The table is a surface rather than a panel, so opening it closes the
       panel you came from — there is nothing to go back to underneath it. It
       deals from its own pile, teaches nothing and touches no round. */
    case 'table':      P.closePanel(); return T.openTable();
    case 'closetable': return T.closeTable();
    case 'dealone':    return T.dealOne();
    case 'tshuffle':   return T.shuffle();
    case 'tgather':    return T.gather();
    case 'tablen':     return T.setN(v);

    /* Speech synthesis is the one voice that works on a train: it is in the
       browser, it costs nothing, and on an iPhone the Italian voice is already
       installed. A local voice is preferred because the network ones lag. */
    case 'speak': {
      if (!('speechSynthesis' in window)) return toast('No voice on this device');
      const u = new SpeechSynthesisUtterance(el.dataset.say);
      u.lang = el.dataset.lang; u.rate = .9;
      const same = speechSynthesis.getVoices().filter(x => x.lang.replace('_', '-').startsWith(u.lang.slice(0, 2)));
      if (same.length) u.voice = same.find(x => x.localService) || same[0];
      speechSynthesis.cancel(); speechSynthesis.speak(u);
      return;
    }

    /* Rewriting works on whatever card asked — the back of the top one has no
       id to give, because there is only ever one card being decided about. */
    case 'edit':     return P.editPanel(id || (top() || {}).id);
    case 'saveedit': return P.saveEdit();
    case 'unedit':   return P.unedit();

    case 'like': case 'dislike': case 'skip': return say(name);
    case 'newpass': return goRound();
    case 'more':  return more();
    case 'never': return say('never');

    /* Context filters what is dealt and teaches nothing: a wet Tuesday is not
       evidence about what you are like. */
    case 'setwho':   S.ctx.who = v; break;
    case 'setwhere': S.ctx.where = v; break;
    case 'settime':  S.ctx.time = v; break;

    /* Liking from the browser counts exactly as liking on a card, or the two
       lists would disagree about what you think. */
    case 'blike': case 'bdislike': {
      const c = byId(id); if (!c) return;
      const want = name === 'blike' ? 'like' : 'dislike';
      const had = (S.seen[id] || {}).v;
      /* Judging one here counts exactly as judging it on a card, which means it
         is out of this round too — or the deck would deal you the thing you
         just made your mind up about. */
      if (had === want) { delete S.seen[id]; undonePass(id); }
      else { learn(c, want === 'like' ? 1 : 0, 1); S.seen[id] = { v:want, at:new Date().toISOString() };
             donePass(id); }
      save(); redeal();
      const box = document.getElementById('browerows');
      if (box) return P.browseSearch(document.querySelector('[data-in="q"]').value);
      return;
    }

    case 'wipe':
      if (!el.dataset.sure) { el.dataset.sure = 1; el.innerHTML = 'Sure? Everything goes.<small>Tap again.</small>'; return; }
      wipeAll(); redeal(); P.closePanel(); return toast('Forgotten');

    case 'download':
      return offer('activinator-' + today() + '.json', exportJSON(), 'application/json');
    case 'curatefile':
      return offer('activinator-curation-' + today() + '.csv', P.curationCSV(), 'text/csv');
    case 'restore': {
      const t = document.querySelector('[data-in="restore"]');
      try { importJSON(t.value); redeal(); P.closePanel(); toast('Restored'); }
      catch (err) { toast('That is not an Activinator file'); }
      return;
    }

    case 'togglepack': S.packs[id] = !S.packs[id]; break;

    /* A draft is not saved and not dealt from, so picking a tag redraws the
       panel and nothing else. Redealing here would shuffle the hand under a
       card you are in the middle of rewriting. */
    case 'dtag':
      P.DRAFT.tags = P.DRAFT.tags.includes(v) ? P.DRAFT.tags.filter(t => t !== v) : P.DRAFT.tags.concat(v);
      return P.refreshPanel();
    case 'savemine': return P.saveMine();
    default: return;
  }
  save(); redeal(); P.refreshPanel();
};

const wire = () => {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    if (el.dataset.act === 'nerve') return;          // the slider is an input event
    e.preventDefault(); act(el.dataset.act, el);
  });

  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.act === 'nerve') { S.nerve = +el.value / 100; save(); redeal();
      const l = el.previousElementSibling; if (l) l.textContent = `Nerve — ${el.value}% wildcards`; return; }
    // Searching must not redraw the panel: the field is the thing being typed in.
    if (el.dataset.in === 'q') return P.browseSearch(el.value);
    if (el.dataset.in === 't') P.DRAFT.t = el.value;
    if (el.dataset.in === 'd') P.DRAFT.d = el.value;
  });

  /* A keyboard is a Mac, and on a Mac the arrows are the swipe. */
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input,textarea')) return;
    /* Escape still closes the table; everything else on this keyboard is the
       deck's, and the deck is underneath it. A card swiped out of sight is a
       card you did not decide about. */
    if (T.isOpen() && e.key !== 'Escape') return;
    const k = { ArrowRight:'like', ArrowLeft:'dislike', ArrowUp:'skip' }[e.key];
    if (k) { e.preventDefault(); return say(k); }
    // Down is the swipe that takes the last card back, on a keyboard too.
    if (e.key === 'ArrowDown') { e.preventDefault(); return takeBack(); }
    if (e.key === 'z' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); return takeBack(); }
    if (e.key === 'Escape') return T.isOpen() ? T.closeTable() : P.closePanel();
    if (e.key === ' ') { e.preventDefault(); flip(document.querySelector('.card.top')); }
  });

  wireSwipe(document.getElementById('deck'));
};

load();
wire();
redeal();

if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

/* One handle for the console and for the smoke test. */
window.ACT = { S, render, redeal, goRound, say, takeBack, top, pool, deal, cycle, flip,
               PACKS, panels:P, table:T, save };
