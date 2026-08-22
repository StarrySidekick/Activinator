# Activinator

A deck of things to actually go and do. It deals you one activity at a time;
you swipe right on the ones you fancy and left on the ones you don't, and it
works out what you are like — while deliberately, permanently, keeping some of
the deck outside what it thinks you are like.

The point is a scroll where every card is a launchpad off the phone. Same
thumb, opposite direction.

It lives in this repository for now because it was started from a phone. It is
self-contained in `activinator/` — no imports from Bureau, no shared files — so
moving it to its own repository is `git mv activinator ../activinator` plus
undoing two things: the assemble step in `.github/workflows/pages.yml`, and the
`/activinator/` guard in `web/sw.js`. Both are marked.

## Running it

```bash
scripts/serve.sh              # http://localhost:8010
node test/smoke.mjs           # headless check, needs the server running
```

Open it over http, never as a `file://` URL — the service worker won't register
and the manifest won't load, so you'd be testing a different app than the one
that ships.

`test/smoke.mjs` needs Playwright (`npm i playwright` at the repo root, which is
already a dependency there). It exercises dealing, the flip, a real dragged
swipe, undo, the context filter, all four panels, writing your own, persistence
across a reload and an offline reload. Screenshots land in `test/shots/` — look
at them, this is a visual app and a passing assertion doesn't mean it looks
right.

`scripts/icons.py` redraws `icons/` with nothing but the standard library.

## Deploying

Live at **https://starrysidekick.github.io/bureau/activinator/**. Pushing to
`main` deploys it — `.github/workflows/pages.yml` assembles `web/` at the root
with `activinator/` beside it, minus `test/` and `scripts/`.

After changing anything in `js/`, `css/` or `index.html`, bump `CACHE` in
`sw.js` **and** `APP_VERSION` in `js/state.js`. Without the cache bump an
installed copy keeps serving the old version, and the symptom — "my change
didn't deploy" — points at the wrong culprit. A new file must also be added to
`SHELL` in `sw.js` or it won't be there offline. An already-open page finishes
on the old assets, so a bump takes effect on the **second** launch.

**It shares an origin with Bureau, and a cache store belongs to the origin
rather than to a service worker's scope.** Both workers therefore see each
other's caches in `caches.keys()`, and the usual `filter(k => k !== CACHE)` on
activate reads as "delete everything anybody else put here". It did exactly
that: one visit to Activinator wiped Bureau's entire shell, and Bureau's next
launch quietly rebuilt a partial one from whatever that page happened to
request. Both workers now reap **only their own prefix**. In the same vein,
Bureau's worker skips `/activinator/` altogether — its navigation branch stores
whatever it fetched as Bureau's own shell, so without that guard opening this
app once left Bureau opening into this app whenever it was offline.

`test/deploy.mjs` at the repository root is the guard on both of those. It is
the one test that has to run against the assembled site rather than either app
alone.

## How it works

**An activity is a title and a set of tags.** `{t, tags, who, where, min,
cost}` — and no description. A card is one thing to go and do; a second
sentence explaining it is a second sentence you have to read before you can
swipe, so the title has to carry the whole idea. Tags are the entire feature
space: the model learns one weight per tag and nothing else, which is why a tag
like `screenfree` or `spooky` is worth adding and a tag like `nice` is not.

**The vocabulary is grouped, and the groups mean different things.** `GROUPS`
in `data.js`: what you're *doing* (create, organize, clean, repair, try, watch,
listen, read, travel, eat, play, move, learn, kindness), what you're *making*
if you are (writing, visual art and its five kinds, music, acting, dancing,
film), *where* (indoors↔outdoors, nature, water, city), *who* (solo↔social,
romantic), *how hard* (casual→engaging→challenging, a scale — exactly one per
activity), *mood* (adventurous, funny, mindful, spooky, nostalgic), and the
practical facts. Nesting is deliberate: a painting activity carries `create`,
`visualart` and `painting`, so taste can learn that you like making things,
or visual art specifically, or painting and not sculpting.

**Length, cost and company are tags too**, derived in `data.js` rather than
written out. Without them the model could learn that you like cooking but never
that you only ever say yes to the quick ones.

**Taste is online logistic regression, and it is small on purpose.** Score is
the bias plus the mean of the card's tag weights; the update is one gradient
step per swipe. It fits on the taste screen, which is the test: an app whose job
is to widen what you do has to be able to show you what it thinks and let you
throw it away.

**Learning returns a mark, and undo restores it.** `learn()` hands back the
weights as they were. Reversing the arithmetic instead looks right and isn't —
the error term gets recomputed from weights the update itself moved, so undo
left the model slightly different every time.

**A share of every hand is dealt against what it knows.** `S.nerve` (a slider,
default 30%) is how often the dealer picks from the activities whose tags it
knows *least* about rather than from the top of the ranking. A wildcard says on
its face that it is one — except on the first day, when it knows nothing and
there is nothing to deal against, so nothing is labelled.

**Nothing is dealt without a reason it can print.** Every card carries `why` —
what it thinks it knows, or that it is still guessing, or that this is a
deliberate shot in the dark. It is on the back, with the tags and the odds,
because the front is for deciding and the back is for understanding.

**The flip does not rely on `backface-visibility`.** Safari drops it the moment
anything in the card builds its own rendering layer, and then the front's type
shows through the back and neither face is readable. The hidden face is also
made transparent, swapped at the halfway point of the turn so the change
happens edge-on.

**Context filters, it does not teach.** Who's in, where, and how long you have
are a hard filter on what can be dealt. A wet Tuesday is not evidence about what
you like.

**A verdict lands the instant you let go.** State is written, the queue moves,
the list updates — and the card flies off over the top of all that. Nothing ever
waits for an animation.

**A no is not forever.** Verdicts go quiet for a while (`QUIET` in `deal.js`) and
come back; only "never again" is permanent, and there is a button to forgive
every pass at once.

**Doing it counts for more than fancying it.** Ticking something off the list
learns again, harder, and un-ticking puts the weights back exactly.

## The files

| Module | What lives there |
| --- | --- |
| `data.js` | The 291 activities, the tag vocabulary and its groups, the three context questions. The substance of the app. |
| `state.js` | The one localStorage key, the shape, export/import. Nothing else touches storage. |
| `taste.js` | The model: `scoreOf`, `learn`, `unlearn`, `opinions`, `reasons`. |
| `deal.js` | What gets dealt next — filtering, ranking, wildcards, and the `why` line. |
| `cards.js` | How a card is printed: `cardHTML`, the accent colour, the wording of a length. The front is the title and nothing else; the back carries everything the app knows. |
| `deck.js` | The hand, the verdicts, undo, the fan, the empty deck. |
| `swipe.js` | Pointer drag, the stamps, and the tap that flips. |
| `panels.js` | Every panel: right now, the list, taste, write your own, backup. |
| `boot.js` | One delegated listener set. To add an action, add a `data-act` and a case in `act()`. |

Three stylesheets: `base.css` (the room), `deck.css` (the card), `panels.css`.

After changing anything in `js/`, `css/` or `index.html`, bump `CACHE` in
`sw.js` **and** `APP_VERSION` in `js/state.js`. Without the cache bump an
installed copy keeps serving the old version, and the symptom — "my change
didn't deploy" — points at the wrong culprit. A new file must also be added to
`SHELL` in `sw.js` or it won't be there offline.

## Not yet

- Sync between devices. Export/import JSON is the bridge, as in Bureau.
- Anything that phones home. There is no server and there is not going to be
  one; the whole model is a few dozen numbers in localStorage.
- Time of day and weather as context. Both are obvious and both need care —
  a filter you didn't set is a filter you can't understand.

## Style

No dependencies, no build step, no framework. Two-space indent, single quotes,
template literals for HTML. Comments explain *why*. Copy is plain, specific and
unexcited — "On the list", not "Added successfully!".
