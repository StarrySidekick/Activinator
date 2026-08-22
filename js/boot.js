/* Activinator — the entry point and the one listener set.
   Everything routes through act(): to add something the app can do, add a
   data-act and a case here. Nothing binds a listener inside a render. */
import { S, load, save, reset as wipeAll, exportJSON, importJSON, pool } from './state.js';
import { learn, unlearn } from './taste.js';
import { render, reset as redeal, say, takeBack, more, retwist, toast, top } from './deck.js';
import { deal } from './deal.js';
import { wire as wireSwipe } from './swipe.js';
import * as P from './panels.js';

const act = (name, el, e) => {
  const v = el && el.dataset.v, id = el && el.dataset.id;
  switch (name) {
    case 'ctx':   return P.ctxPanel();
    case 'list':  return P.listPanel();
    case 'taste': return P.tastePanel();
    case 'add':   return P.addPanel();
    case 'backup':return P.backupPanel();
    case 'closepanel': return P.closePanel();

    case 'yes': case 'no': case 'now': return say(name);
    case 'undo': return takeBack();
    case 'more': return more();
    case 'retwist': return retwist();
    case 'never': return say('never');

    /* Context filters what is dealt and teaches nothing: a wet Tuesday is not
       evidence about what you are like. */
    case 'setwho':   S.ctx.who = v; break;
    case 'setwhere': S.ctx.where = v; break;
    case 'settime':  S.ctx.time = +v; break;

    case 'tick': {
      const l = S.list.find(x => x.at === id); if (!l) return;
      l.done = l.done ? null : new Date().toISOString();
      // Having done it is better evidence than having fancied it — and
      // un-ticking has to put the weights back exactly where they were.
      if (l.done) l.mark = learn(l.card, 1, 1.5);
      else { unlearn(l.mark); l.mark = null; }
      if (l.done) {
        const day = l.done.slice(0, 10);
        const gap = S.streak.day ? (new Date(day) - new Date(S.streak.day)) / 864e5 : 99;
        S.streak = { day, n: gap === 0 ? S.streak.n : gap === 1 ? S.streak.n + 1 : 1 };
        toast(S.streak.n > 1 ? `Done — ${S.streak.n} days running` : 'Done');
      }
      break;
    }
    case 'unlist': S.list = S.list.filter(x => x.at !== id); break;
    case 'clearlist': S.list = S.list.filter(l => !l.done); break;

    /* A no was about that evening. Forgiveness is a button, not a schedule. */
    case 'forgive':
      for (const k of Object.keys(S.seen)) if (S.seen[k].v === 'no') delete S.seen[k];
      save(); redeal(); P.closePanel(); return toast('All back in');

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

    case 'dwho':   P.DRAFT.who = v; break;
    case 'dwhere': P.DRAFT.where = v; break;
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
    const n = el.dataset.act;
    if (n === 'nerve' || n === 'dmin') return;      // sliders are input events
    e.preventDefault(); act(n, el, e);
  });

  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.act === 'nerve') { S.nerve = +el.value / 100; save(); redeal();
      const l = el.previousElementSibling; if (l) l.textContent = `Nerve — ${el.value}% wildcards`; return; }
    if (el.dataset.act === 'dmin') { P.DRAFT.min = +el.value;
      const l = el.previousElementSibling; if (l) l.textContent = 'How long — ' + minText(+el.value); return; }
    if (el.dataset.in && el.dataset.in !== 'restore') P.DRAFT[el.dataset.in] = el.value;
  });

  /* A keyboard is a Mac, and on a Mac the arrows are the swipe. */
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input,textarea')) return;
    const k = { ArrowRight:'yes', ArrowLeft:'no', ArrowUp:'now' }[e.key];
    if (k) { e.preventDefault(); return say(k); }
    if (e.key === 'z' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); return takeBack(); }
    if (e.key === 'Escape') return P.closePanel();
    if (e.key === ' ') { e.preventDefault(); document.querySelector('.card.top')?.classList.toggle('flip'); }
  });

  wireSwipe(document.getElementById('deck'));
};

// duplicated from cards.js on purpose — importing it here for one slider label
// would drag the whole renderer into the boot path
const minText = (m) => m <= 15 ? 'Ten minutes' : m < 45 ? m + ' minutes' : m < 75 ? 'About an hour'
  : m < 135 ? 'An hour or two' : m < 200 ? 'A few hours' : m < 330 ? 'An afternoon'
  : m < 560 ? 'A whole day' : 'Overnight';

load();
wire();
redeal();

if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

/* One handle for the console and for the smoke test. */
window.ACT = { S, render, redeal, say, takeBack, pool, deal, panels:P, save };
