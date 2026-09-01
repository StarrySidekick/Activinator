/* Activinator — service worker.
   Bump CACHE when anything in css/ or js/ changes (or index.html) and the next
   launch picks it up. A new file must also be added to SHELL or it will not be
   there offline. An already-open page finishes on the old assets, so a bump
   takes effect on the second launch, not the first. */
const CACHE = 'activinator-v19';
const SHELL = [
  './', './index.html',
  './css/base.css', './css/deck.css', './css/panels.css',
  './js/boot.js', './js/state.js', './js/data.js', './js/vocab.js', './js/activities.js', './js/taste.js',
  './js/deal.js', './js/cards.js', './js/deck.js', './js/swipe.js', './js/panels.js',
  './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png',
  './icons/apple-touch-icon.png'
];

/* cache:'reload' so a bump cannot refill the new cache from the browser's own
   stale copies — that lands a new stylesheet beside an old module and the
   symptom points at the code rather than at here. */
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(SHELL.map(u => new Request(u, { cache:'reload' }))))
    .then(() => self.skipWaiting()));
});

/* Only ever delete Activinator's own old caches. A cache store belongs to the
   whole origin rather than to a scope, so `k !== CACHE` means "everything
   anybody else put here" — and while this is served alongside another app on
   one origin, that wipes the other app's offline copy every time you open
   this one. */
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks
      .filter(k => k.startsWith('activinator-') && k !== CACHE)
      .map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

/* Cache first: the whole app is the shell, and it must open on the tube. */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok && new URL(e.request.url).origin === location.origin) {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy));
    }
    return res;
  }).catch(() => caches.match('./index.html'))));
});
