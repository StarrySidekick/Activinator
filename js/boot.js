/* Activinator — the entry point and the one listener set.
   Everything routes through act(): to add something the app can do, add a
   data-act and a case here. Nothing binds a listener inside a render. */
import { S, load, save, reset as wipeAll, exportJSON, importJSON, pool, byId, remember } from './state.js';
import { TAGS } from './data.js';
import { learn } from './taste.js';
import { render, reset as redeal, say, takeBack, more, toast, top } from './deck.js';
import { deal } from './deal.js';
import { wire as wireSwipe } from './swipe.js';
import * as P from './panels.js';

const act = (name, el) => {
  const v = el && el.dataset.v, id = el && el.dataset.id;
  switch (name) {
    case 'menu':   return P.menuPanel();
    case 'ctx':    return P.ctxPanel();
    case 'browse': return P.browsePanel();
    case 'taste':  return P.tastePanel();
    case 'add':    return P.addPanel();
    case 'backup': return P.backupPanel();
    case 'closepanel': return P.closePanel();

    case 'like': case 'dislike': case 'skip': return say(name);
    case 'undo':  return takeBack();
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
      if (had === want) delete S.seen[id];
      else { learn(c, want === 'like' ? 1 : 0, 1); S.seen[id] = { v:want, at:new Date().toISOString() }; }
      save(); redeal();
      const box = document.getElementById('browerows');
      if (box) return P.browseSearch(document.querySelector('[data-in="q"]').value);
      return;
    }

    case 'wipe':
      if (!el.dataset.sure) { el.dataset.sure = 1; el.innerHTML = 'Sure? Everything goes.<small>Tap again.</small>'; return; }
      wipeAll(); redeal(); P.closePanel(); return toast('Forgotten');

    case 'download': {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([exportJSON()], { type:'application/json' }));
      a.download = 'activinator-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      return toast('Downloaded');
    }
    case 'restore': {
      const t = document.querySelector('[data-in="restore"]');
      try { importJSON(t.value); redeal(); P.closePanel(); toast('Restored'); }
      catch (err) { toast('That is not an Activinator file'); }
      return;
    }

    case 'dtag':
      P.DRAFT.tags = P.DRAFT.tags.includes(v) ? P.DRAFT.tags.filter(t => t !== v) : P.DRAFT.tags.concat(v);
      break;
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
  });

  /* A keyboard is a Mac, and on a Mac the arrows are the swipe. */
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input,textarea')) return;
    const k = { ArrowRight:'like', ArrowLeft:'dislike', ArrowUp:'skip' }[e.key];
    if (k) { e.preventDefault(); return say(k); }
    if (e.key === 'z' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); return takeBack(); }
    if (e.key === 'Escape') return P.closePanel();
    if (e.key === ' ') { e.preventDefault(); document.querySelector('.card.top')?.classList.toggle('flip'); }
  });

  wireSwipe(document.getElementById('deck'));
};

load(TAGS);
wire();
redeal();

if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

/* One handle for the console and for the smoke test. */
window.ACT = { S, render, redeal, say, takeBack, pool, deal, panels:P, save };
