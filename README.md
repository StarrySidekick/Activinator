# Activinator

A deck of things to actually go and do. It deals you one activity at a time;
you swipe right on the ones you fancy and left on the ones you don't, and it
works out what you are like — while deliberately, permanently, keeping some of
the deck outside what it thinks you are like.

The point is a scroll where every card is a launchpad off the phone. Same
thumb, opposite direction.

It lives in this repository for now because it was started from a phone. It is
entirely self-contained in `activinator/` — no imports from Bureau, no shared
files, nothing added to Bureau's build or deploy — so moving it to its own
repository is `git mv activinator ../activinator` and nothing else.

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

## It is not deployed yet

Nothing in this repository's Pages workflow knows about `activinator/` — it
uploads `web/` and only `web/`. To put this on a phone, either give it its own
repository (the intention) or add one step to `.github/workflows/pages.yml` that
copies `activinator/` into the artifact alongside Bureau. That is a decision
about publishing to a live site, so it is left for you to make.

## How it works

**Everything is one object with tags.** A seed activity is `{t, d, tags, who,
where, min, cost}`. Tags are the whole feature space: the model learns one
weight per tag and nothing else. That is why a tag like `screenfree` or
`morning` is worth adding and a tag like `nice` is not.

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

**Nothing is dealt without a reason it can print.** Every card carries `why`:
what it thinks it knows, or that it is still guessing, or that this is a
deliberate shot in the dark.

**A twist is a second sentence, never a splice.** Generated variety comes from
`TWISTS` — "Leave the phone at home for it", "Only use what is already in the
house" — appended whole. Grammar-spliced titles eventually produce a sentence no
person would say. A twist adds its own tags, so taste has a view about twists.

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
| `data.js` | The 130 seed activities, the twists, the tag vocabulary, the three context questions. The substance of the app. |
| `state.js` | The one localStorage key, the shape, export/import. Nothing else touches storage. |
| `taste.js` | The model: `scoreOf`, `learn`, `unlearn`, `opinions`, `reasons`. |
| `deal.js` | What gets dealt next — filtering, ranking, wildcards, twists, doubles, and the `why` line. |
| `cards.js` | How a card is printed: `cardHTML`, the accent colour, the wording of a length. |
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
