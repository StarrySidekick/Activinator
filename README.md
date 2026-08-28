# Activinator

A deck of things to actually go and do. It deals you one activity at a time,
full screen; you swipe right on the ones you would probably do and left on the
ones you wouldn't, and it works out what you are like — while deliberately,
permanently, keeping some of the deck outside what it thinks you are like.

The point is a scroll where every card is a launchpad off the phone. Same
thumb, opposite direction.

It started life inside the Bureau repository because it was started from a
phone; it lives in its own repository now, with its history carried over. It
still shares nothing with Bureau — no imports, no files — but it does still
share an **origin** (see Deploying), which is the one fact from the old
arrangement that moving repositories did not change.

## Running it

```bash
scripts/serve.sh                        # http://localhost:8010
node scripts/build-activities.mjs       # packs/*.csv → js/activities.js
node test/smoke.mjs                     # headless check, needs the server running
node test/upgrade.mjs                   # boots from old saved states
```

Open it over http, never as a `file://` URL — the service worker won't register
and the manifest won't load, so you'd be testing a different app than the one
that ships.

`test/smoke.mjs` needs Playwright (`npm i`). `test/upgrade.mjs` is the other half, and the more important one: it boots the
app from the shapes a phone that has had it installed for a while actually has
saved. That path only ever runs on somebody's real device, it was not tested,
and it broke — a `ctx` saved under the old vocabulary said `where:'any'`, the
new filter had no entry for it, and the throw during the first render left a
blank screen with the buttons still sitting on it. Add a case to it whenever
the saved shape changes.

The smoke test exercises dealing, the full-bleed card, the four corners, the bare front and its emblems, the
flip, a real dragged swipe, undo, that a skip teaches nothing, that nothing
leaves the pool but "never again" does, the context filter, the dock, search,
liking from the browser, writing your own, persistence across a reload and an
offline reload. Screenshots land in `test/shots/` — look
at them, this is a visual app and a passing assertion doesn't mean it looks
right.

`scripts/icons.py` redraws `icons/` with nothing but the standard library.
`test/marks.mjs` renders the contact sheet of every tag mark.

## Deploying

Live at **https://starrysidekick.github.io/Activinator/**. Pushing to `main`
deploys it — `.github/workflows/pages.yml` rebuilds `js/activities.js` from
`packs/` and force-pushes the app files to the `gh-pages` branch, which Pages
serves, leaving the tooling (`test/`, `scripts/`, `packs/`) behind. That branch
is entirely generated: never commit to it. (Branch mode rather than Bureau's
artifact flow because creating a Pages site is an admin-only API call the
workflow token isn't allowed — pushing a `gh-pages` branch enables Pages by
itself.)

It used to live at `/Bureau/activinator/`, and Bureau's site keeps a hand-off
stub there: a self-destructing `sw.js` that unregisters the old worker and
clears the old caches, and an `index.html` that redirects here. A phone that
installed the old copy walks itself over the next time it opens the app online.
Its saved state needs no walking — localStorage belongs to the origin, not the
path, and the origin is the same.

After changing anything in `js/`, `css/` or `index.html`, bump `CACHE` in
`sw.js` **and** `APP_VERSION` in `js/state.js`. Without the cache bump an
installed copy keeps serving the old version, and the symptom — "my change
didn't deploy" — points at the wrong culprit. A new file must also be added to
`SHELL` in `sw.js` or it won't be there offline. An already-open page finishes
on the old assets, so a bump takes effect on the **second** launch.

**It still shares an origin with Bureau, and a cache store belongs to the
origin rather than to a service worker's scope.** Project sites all live on
`starrysidekick.github.io`, so moving repositories moved the path and nothing
else. Both workers therefore see each other's caches in `caches.keys()`, and
the usual `filter(k => k !== CACHE)` on activate reads as "delete everything
anybody else put here". It did exactly that, back when the two were served from
one repository: one visit to Activinator wiped Bureau's entire shell, and
Bureau's next launch quietly rebuilt a partial one from whatever that page
happened to request. Both workers reap **only their own prefix**, and that must
survive the move — the origin is still shared. Bureau's `test/deploy.mjs` is
the guard on its half.

## Where the activities live

**The packs are the source of truth, and they are CSVs in `packs/`.** One file
per pack, plus `packs/index.json` giving each one a name, a note and whether it
ships switched on. `node scripts/build-activities.mjs` turns them into
`js/activities.js` — a generated file, never edited by hand — and the app
imports that.

    title,minutes,cost,tags
    Walk to the furthest point you can reach in thirty minutes,60,free,travel move outdoors casual

`minutes` is a whole number and the duration band is worked out from it;
`cost` is free | frugal | costly; `tags` are space-separated, all from the
vocabulary, and must **not** include a duration or cost tag — those two are
derived, and saying them twice is how they come to disagree. Every row needs
exactly one place and exactly one how-hard.

A pack that teaches words adds a fifth column, `definition`: the word is the
title and the meaning is printed separately, smaller, under it. Newlines
survive inside a quoted cell, which is how an Italian verb card carries its
conjugations one tense to a line. A pack may also declare `"lang"` in
`index.json` (Italian says `"it-IT"`); its cards then get a speak button that
says the title out loud through the browser's own speech synthesis — no
network, no dependency, and on an iPhone the Italian voice is already there.

The build refuses anything else, with the file and the line. That is the point
of it: a bad row that builds is a card that quietly never gets dealt. It earned
its keep on the first run by catching an unquoted comma in a title of mine and
a tag that had been removed from the vocabulary two versions earlier.

`node scripts/build-activities.mjs --check` rebuilds and compares instead of
writing, so a CSV edited without a rebuild fails the tests rather than shipping
a deck that does not match the packs it came from. The Pages workflow does not
check — it rebuilds and deploys what it built, because that is what makes
editing a CSV from a phone a complete workflow.

### Three ways to add an activity

All three end in the same place — a row in a CSV in `packs/`, committed. That
file is the memory: a session that starts tomorrow knows exactly what is in the
deck because it reads the packs, and nothing else.

1. **Say so.** "Add these five" in a session, and they go into the CSV, get
   built, tested and committed. Easiest from a phone, and the commit is the
   record.
2. **Edit the CSV on github.com.** The deploy builds the packs itself rather
   than trusting the committed `js/activities.js`, so a row added in the web
   editor is live as soon as Pages finishes — no machine, no build step. A CSV
   the build refuses fails the deploy instead of shipping a broken deck. The
   committed generated file will be stale until somebody rebuilds it; the job
   log says so, and the next session commits the rebuild.
3. **Write one in the app, then promote it.** Write your own puts it on that
   phone and nowhere else. Menu → Packs shows everything you have written as
   pack rows to copy — the same four columns, the derived tags left out — so it
   pastes into a CSV or a spreadsheet and builds unedited. Write Your Own asks
   for exactly what a pack row must have for that reason.

**A spreadsheet is an editing surface, not the source of truth.** If a sheet is
a nicer place to work than a CSV: File → Share → Publish to web → the tab →
CSV → Publish, then `scripts/pull-sheet.sh <that-url> <pack-id>`. It writes the
CSV into `packs/`, rebuilds, and you commit both. No credentials, no API, and
nothing fetched while the app is running — the deck has to deal on a train, and
a sheet you can edit from a phone is also a sheet that can be empty at the
moment somebody opens the app.

**Switching a pack off** takes its activities out of the pool and leaves every
verdict about them untouched, so switching it back on picks up where it was. A
pack a saved state has never heard of takes the default it ships with, which is
what lets a new pack arrive in an update without being silently disabled — and
lets one you switched off stay off.

Besides the core deck (named **Activities**) there are content packs where the
card carries the content itself: **Words** (esoteric words with their
definitions), **Quotes** (only lines verified as actually said or written by
the person named — the famous misattributions are deliberately absent),
**Italian** (strict definitions, verbs with their conjugations, a voice to say
them), **Tableaus** (a scene in a sentence, to work off — it doesn't have to
make sense), and **Visualizations** (impossible objects to picture). No poems,
though — a real poem on a card means reproducing the whole work, and
public-domain ones would be a separate decision.

### The question packs

The deck is a template as much as an app, and the question packs are the first
thing built on it that is not an activity: **questions**. They live in two
packs — one for everything, and one apart for the ones to ask a partner.
They are ordinary pack rows on purpose, so everything already works: the same
build checks them, taste learns from them, and Menu → Packs is the toggle
between things to do, questions, or both — per category, no new machinery.

The columns just read a little differently on a question. `minutes` is how
long the conversation deserves, so the duration band still means something;
how-hard is depth — `casual` is small talk with better aim, `engaging` takes a
real answer, `challenging` is the ones you circle before answering; `who` is
who it is for (`solo` means ask yourself); the moods mean what they always
mean. Every question is `free` and `anywhere`, which is true and also means
the context filter never hides them for the wrong reason.

## How it works

**An activity is a title and a set of tags.** `{t, tags, who, where, min,
cost}` — and no description. A card is one thing to go and do; a second
sentence explaining it is a second sentence you have to read before you can
swipe, so the title has to carry the whole idea. Tags are the entire feature
space: the model learns one weight per tag and nothing else, which is why a tag
like `screenfree` or `spooky` is worth adding and a tag like `nice` is not.

**The vocabulary is grouped, and the groups mean different things.** `GROUPS`
in `data.js` — nine of them: *doing* (create, organize, clean, repair, try,
play, move, learn, kindness), *making* if you are (writing, visual art and its
five kinds, music, acting, dancing, film), *experience* (watch, listen, read,
travel, eat), *where*, *who*, *how hard* (casual→engaging→challenging, a scale,
exactly one per activity), *mood* (adventurous, funny, mindful, spooky,
nostalgic, romantic), *duration* and *cost*.

Nesting is deliberate: a painting activity carries `create`, `visualart` and
`painting`, so taste can learn that you like making things, or visual art
specifically, or painting and not sculpting. The general tag is dropped when
drawing the emblems, because there it would be three pictures saying one thing.

**There is one where and one who, and they are tags rather than fields.** Two
places to say where a thing happens is two places to keep in step, and they
drifted. `where` is exactly one of `anywhere | indoors | outdoors | home`, and
`home` means indoors, so asking for indoors gets it. `who` is a *constraint*,
not a description: an activity names nobody unless it needs somebody, so it
answers to whoever you asked for — `solo partner friends` on five cards in six
told the reader nothing and the model less.

**Duration and cost are bands, derived from the minutes and the cost.**
`quick` under five minutes, `short` under thirty, `medium` up to two hours,
`long` beyond that, `allday` from six hours. The minutes stay because a band
has to be worked out from something, but nothing else reads them.

**Taste is online logistic regression, and it is small on purpose.** Score is
the bias plus the mean of the card's tag weights; the update is one gradient
step per swipe. It fits on the taste screen, which is the test: an app whose job
is to widen what you do has to be able to show you what it thinks and let you
throw it away.

**Learning returns a mark, and undo restores it.** `learn()` hands back the
weights as they were. Reversing the arithmetic instead looks right and isn't —
the error term gets recomputed from weights the update itself moved, so undo
left the model slightly different every time.

**Nothing ever leaves the pool.** A dislike is not a deletion: it sinks — the
verdict is worth ±0.8 on the ranking — and it can surface again months later
when you are a different mood. A swipe up is not a soft no at all: it passes
the card on without saying anything about it, teaches nothing, and carries no
weight. The only thing that takes an activity out for good is "never again", on
the back of the card. What keeps a hand from repeating is recency: the last
forty things you were shown sink by up to 2.6 and then wear off completely.

**A share of every hand is dealt against what it knows.** `S.nerve` (a slider,
default 30%) is how often the dealer picks from the activities whose tags it
knows *least* about rather than from the top of the ranking. A wildcard says on
its face that it is one — except on the first day, when it knows nothing and
there is nothing to deal against, so nothing is labelled.

**The card is the screen.** Full bleed, no radius, no edge. The two behind it
sit back rather than beside it and step forward as the one above leaves; an
offset would show as a misaligned edge against the screen itself. One button
sits in each corner so that none of them is ever over the middle of it — where
you go and what you look for along the top, what you make and what you take
back along the bottom — and undo appears only when there is something to take
back, because a dead button is furniture.

**An activity's id comes from its title, never from its place in the list.**
It was `'s' + index`, which meant inserting one activity silently re-pointed
every verdict after it at a different thing — a "never again" landing on
somebody else's card. Retitling one loses its history, which is right: it is a
different thing now.

**The front is a row of marks and the activity.** No description, no tag names,
no reason. The marks say what kind of thing it is without spending a line on
words, and they come out in the vocabulary's own order so the row can be read
by shape. The general one is dropped where a particular one is present, since
create + visual art + drawing is three pictures saying one thing.

**The marks are drawn, in the manner of the suits on a playing card.** Solid
silhouettes, `MARKS` in `data.js`, one 24×24 path each, filled `evenodd` so a
subpath inside another is a hole — that is how the eye gets its pupil and the
key its bow. Mood is red and everything else is ink, the way half a deck is
red. They were emoji for one version, which are somebody else's drawings and
never sat right on cream paper.

The four scales are families rather than pictures: one pip, two, three for who;
a meter of one, two, three bars for how hard, with the slots you have not
reached drawn hollow; a dial filling by fifths for duration; a diamond from
hollow to solid for cost. A scale drawn as five unrelated pictures is a scale
nobody can read.

`node test/marks.mjs` renders every mark to `test/shots/marks.png`, large and
at the size it is really used. **Draw one, run it, look at it** — paths written
blind are paths that look wrong, and half the first set had to be redrawn after
seeing that sheet.

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

**Liking is not committing, so there is no list.** Right means "I would
probably do this" and left means "I probably wouldn't" — neither files anything
anywhere. What there is instead is every activity, searchable, behind the
magnifier; liking one there counts exactly as liking it on a card, or the two
would disagree about what you think.

## The files

| Module | What lives there |
| --- | --- |
| `vocab.js` | The tag vocabulary: tags, groups, marks, the three context questions. Its own module so the build can validate against it. |
| `activities.js` | **Generated.** Every pack, built from `packs/*.csv`. Never edit it. |
| `data.js` | Joins the two, so everything else imports one place for both. |
| `state.js` | The one localStorage key, the shape, export/import. Nothing else touches storage. |
| `taste.js` | The model: `scoreOf`, `learn`, `unlearn`, `opinions`, `reasons`. |
| `deal.js` | What gets dealt next — filtering, ranking, verdict bias, recency, wildcards, and the `why` line. |
| `cards.js` | How a card is printed: `cardHTML`, the accent colour, the wording of a length. The front is the title and nothing else; the back carries everything the app knows. |
| `deck.js` | The hand, the verdicts, undo, the stack, the empty deck. |
| `swipe.js` | Pointer drag, the two stamps, and the tap that flips. Right is like, left is not, up is neither — which is why up has no stamp. |
| `panels.js` | Every panel: the hub, right now, all activities, taste, write your own, backup. |
| `boot.js` | One delegated listener set. To add an action, add a `data-act` and a case in `act()`. |

Three stylesheets: `base.css` (the room), `deck.css` (the card), `panels.css`.

After changing anything in `js/`, `css/` or `index.html`, bump `CACHE` in
`sw.js` **and** `APP_VERSION` in `js/state.js`. Without the cache bump an
installed copy keeps serving the old version, and the symptom — "my change
didn't deploy" — points at the wrong culprit. A new file must also be added to
`SHELL` in `sw.js` or it won't be there offline.

## The aesthetics studio

`aesthetics/` is a separate thing sharing the repository: a workbench for
Timothy's aesthetics (Victoria, Starful Gothic, Aeros, Golf 97, Girando,
Stelaine, Carca) — each a full style guide with a story, a philosophy and
every visual parameter, kept as `aesthetics/library/*.aesthetic.json`. It is
self-contained — no imports either way, not in the service-worker shell — and
deploys alongside the app at `/Activinator/aesthetics/`. Its own
`aesthetics/README.md` is the reference; "build this in Aeros" plus the JSON
file is the intended workflow.

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
