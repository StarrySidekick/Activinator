# Activinator — working notes for Claude Code

Activinator is Timothy's deck of things to actually go and do — one activity at
a time, full screen, swipe right on what you'd probably do. It is a personal
app, not a product, and design decisions should be made for one user.

**Start here each session: `README.md` is the reference** — how it works, where
the activities live, the deploy, the tests, and the file map. Read it before
changing behaviour; the hard-won lessons (the shared origin with Bureau, the
undo arithmetic, ids from titles) are all recorded there.

## Running it

```bash
scripts/serve.sh                        # http://localhost:8010
node scripts/build-activities.mjs       # packs/*.csv → js/activities.js
node test/smoke.mjs                     # headless check, needs the server running
node test/upgrade.mjs                   # boots from old saved states
```

Tests need Playwright (`npm i`). Run the smoke test after any non-trivial
change and **look at the screenshots** in `test/shots/` — this is a visual app
and a passing assertion doesn't mean it looks right. Add a case to
`test/upgrade.mjs` whenever the saved shape changes.

## The three rules easiest to forget

- After changing anything in `js/`, `css/` or `index.html`, bump `CACHE` in
  `sw.js` **and** `APP_VERSION` in `js/state.js`. A new file must also join
  `SHELL` in `sw.js` or it won't be there offline.
- `js/activities.js` is **generated** from `packs/*.csv` — never edit it by
  hand. The packs are the source of truth.
- `sw.js` reaps only `activinator-` caches. The app shares the
  `starrysidekick.github.io` origin with Bureau, and a cache store belongs to
  the origin, not to a scope — the general filter wiped Bureau's shell once.
  See "Deploying" in the README before touching the service worker.

## The aesthetics studio

Moved out. It is its own repository now — `StarrySidekick/Aesthetics`, live at
https://starrysidekick.github.io/Aesthetics/ — and nothing in this one depends
on it. If Timothy names an aesthetic (Victoria, Starful Gothic, Aeros, Golf 97,
Girando, Stelaine, Carca) while working on the deck, that repository is where
the style guide lives; read the JSON there rather than looking for a folder
here.

## Style

No dependencies, no build step, no framework. Two-space indent, single quotes,
template literals for HTML. Comments explain *why*. Copy is plain, specific and
unexcited — "On the list", not "Added successfully!".
