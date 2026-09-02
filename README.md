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

The smoke test exercises dealing, the shape of the card and the hand squared up under it, the corner index, the bare front and its emblems, the
flip, a real dragged swipe, undo, that a skip teaches nothing, that nothing
leaves the pool but "never again" does, the context filter, the one button, search,
liking from the browser, writing your own, rewriting the card in front of you,
the curation export, the table — dealing, both sides, the layout, shuffle
against gather, a tap that turns and a drag that does not, and that none of it
touched the deck — that a whole round deals everything exactly once and then
says so, that a swipe down puts a card back into the round, persistence across a
reload and an offline reload. Screenshots land in `test/shots/` — look
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

Two rows with the same title are refused, because the id comes from the title.
Two rows that merely say *nearly* the same thing build fine and are the same
card to a reader — which is what a repeat feels like, whatever the dealer is
doing — so the build prints them at the end with their files and lines and
carries on. It is a read-through, not an error: some of those pairs are
deliberate, and only somebody reading them can tell which.

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

**A pack says how its own deck is printed.** `mark`, `ink` and `back` in
`packs/index.json` — the emblem on the card back, the colour it is printed in,
and which of the eight repeating fields it is printed on. The emblem is one of
the drawn marks, so the build refuses a pack that names a picture nobody has
drawn. Menu → Decks lays them out as what they are: eight decks face down on a
table, tap one to take it off or put it back. A list of names with tickboxes is
a settings screen, and choosing what to be dealt is not a setting.

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

Every question also carries the `question` tag, which is the whole of the
*thinking* group: a card that asks rather than tells. It is a tag rather than a
property of the pack because taste is one weight per tag and nothing else — the
question packs can be switched off, but "you go for being asked something" is a
thing the model can only learn if the cards say so.

**A pack is a kind of thing, never a stage of one.** Activities, questions,
words, quotes, Italian, tableaus, visualizations: switching one off is saying
"not that sort of card today", which is the only thing the switch should mean.
There was a `candidates` pack for a while — ten new activities for every label
in the vocabulary, held apart until they had been judged — and it was a
misreading of what curating needs. Curating reads every card in every pack, so
nothing has to be held anywhere to be curated; those 346 activities are in
`core` with the rest of them, and the ones that do not earn their place get
swiped left and cut in the next compile.

## Curating

Swiping is how the deck learns about you. **Curating is how the packs learn**,
and it is a separate act with a separate way out, because a verdict that lives
only in localStorage is a verdict nobody can act on: the CSVs are the source of
truth and nothing in the app writes to them.

Menu → Curate is every card you have judged or rewritten, as one file:

    verdict,pack,title,minutes,cost,tags,definition,was
    keep,core,Draw everybody on the bus,45,free,create visualart drawing engaging indoors,,

`keep` is a swipe right, `cut` a swipe left, `out` is "never again", and `edit`
is one you rewrote but have not judged yet. A skip is not a verdict and is not
in there. The middle columns are exactly a pack row — `definition` included, so
a kept word card keeps its meaning — and a keeper pastes into a CSV unedited; `was` is the title the pack still has, and it is filled in
only for a rewrite — that is the row the new one replaces, since a rewritten
title no longer matches anything in the file. Take it to a session, or edit the
packs by it yourself.

Switching a pack off hides its cards from the deck and changes nothing here.

**Rewriting a card, on the back of it, is part of curating rather than a way of
writing your own.** A card you would go for if it said something slightly
different is not a card to swipe left on — left teaches the model something
untrue about a whole set of tags, and leaves the sentence that was nearly right
sitting in the pack. Rewrite it, swipe it, and the curation carries the new
wording back.

The rewrite is kept beside the card, in `S.edits`, under the id the *original*
title gave it. So everything you have already said about that card survives
being rewritten, the pack stays the source of truth for anyone who has not
rewritten it, and the change can be exported as a change rather than as a new
card. "Put it back as it was" throws the rewrite away; so does rewriting it
into exactly what the pack already said.

Rewriting does not deal a new hand. The point of an edit is that you were about
to swipe *this* card, so the hand keeps its place and only the words change —
odds and reason included, since both were worked out from words that just
moved.

## How it works

**An activity is a title and a set of tags.** `{t, tags, who, where, min,
cost}` — and no description. A card is one thing to go and do; a second
sentence explaining it is a second sentence you have to read before you can
swipe, so the title has to carry the whole idea. Tags are the entire feature
space: the model learns one weight per tag and nothing else, which is why a tag
like `screenfree` or `spooky` is worth adding and a tag like `nice` is not.

**The vocabulary is grouped, and the groups mean different things.** `GROUPS`
in `data.js` — ten of them: *doing* (create, organize, clean, repair, try,
play, move, learn, kindness), *making* if you are (writing, visual art and its
five kinds, music, acting, dancing, film), *experience* (watch, listen, read,
travel, eat), *thinking* (question), *where*, *who*, *how hard*
(casual→engaging→challenging, a scale, exactly one per activity), *mood*
(adventurous, funny, mindful, spooky, nostalgic, romantic), *duration* and
*cost*.

**A question is a card that asks rather than tells.** *Thinking* is its own
group because a prompt to work something out is not a thing to go and do and
should not be learned as one: liking "decide which ten things you would keep"
says something about sitting and thinking, not about being indoors on your own.
It is one tag today and the group has room for more.

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
the back of the card.

**It deals in rounds, and a round ends on a screen you have to answer.** Say
anything about a card — like, don't like, even skip — and it is out until the
round is over. Ranking decides what comes first; the round decides that there
is an end to it, and that everything gets there once. When there is nothing
left, the deck says *that is the whole deck* and waits: going round again is a
button, because a deck that quietly reshuffles is a deck you cannot tell you
have finished. `S.pass` is the whole of it — which round you are on, and the
ids it has already dealt. Menu → what it thinks you are like shows how far
round you are.

It did not used to, and the symptom was cards coming back within a few dozen
swipes on a deck that takes all day to get through. Both draws picked at
**random from a wide slice** of the ranking — the top quarter of sixteen
hundred cards is four hundred, and random draws from four hundred repeat inside
about twenty-five. Worse, the card you had just swiped was eligible again the
moment it left the hand: only the ranking sank it, and the wildcard draw sorts
by how well a tag is known and never reads the ranking at all. So the thing you
had just said no to could come straight back, labelled *a wildcard*.

Recency survives all that, doing the one job the round cannot: the last forty
you were shown are kept out of the **next** round's opening hand, so going
round again does not start with the cards it just ended on. It is a soft bar —
if honouring it would leave too little to deal, it is dropped, because an empty
hand is worse than a card you saw a while ago.

**Running out of things that fit is not the end of a round.** Ask for twenty
minutes and you can exhaust everything quick long before the round is done; the
deck says so, counts what is still to come, and offers the filter first. Going
round anyway is there and says what it costs, because it would throw away
everything you got through outside the filter. The round belongs to the deck,
not to the filter — which is also why the progress bar does not move when you
change your mind about the afternoon.

**A share of every hand is dealt against what it knows.** `S.nerve` (a slider,
default 30%) is how often the dealer picks from the activities whose tags it
knows *least* about rather than from the top of the ranking. A wildcard says on
its face that it is one — except on the first day, when it knows nothing and
there is nothing to deal against, so nothing is labelled.

**A card is a card, at tarot proportions.** Seven by twelve — a 70 by 120 mm
tarot card, corners cut to 6 mm — rather than the poker two-and-a-half by
three-and-a-half it was first drawn at. Both are real cards; only one of them
is the shape of a phone. At poker proportions a card as wide as the screen is
only ever about that-and-a-half tall, so a third of a phone stayed empty table
no matter what; a tarot card is nearly as tall as the screen already is and
still reads unmistakably as a card. The whole geometry is `--cardw` in
`css/base.css` and the `aspect-ratio` and `--radius` on `.card`: change the
proportion in one place and the settings button, which sits on the card's own
corner, has to move with it — that is what the `1.7143` (12/7) in `.settings`
is. `.stack` in `css/panels.css` is the same card on the deck table and has to
change with it, or the table is a picture of a different deck.

**It goes out to both edges of the screen, and the hand behind it is squared
up.** `--cardw` is `100vw` unless the height cannot take a card that wide. The
two cards under the top one used to be fanned a degree or so off true, the way
a real deck never quite squares up — and the cost was that the card stopped
reading as the full width of the screen: you saw the corners of the ones
underneath and the whole thing looked inset. They sit exactly under it now, to
the pixel, so what you see is one card. They still have to be there: the top
card flies off the moment you let go, and the next one has to already be
underneath it or the screen goes empty for the length of the throw.

**The radius has to be named on every rounded thing, never inherited.**
`border-radius: inherit` takes the value from the *parent element*, and
`.cardin` sits between `.card` and `.face` with no radius of its own — so for a
while every corner in the app was square while the only rounded element was the
one that paints nothing. Hence `--radius`, set on `.card` and read by `.cardin`
and `.face`. It is two percentages with a slash because a corner arc on a box
that is not square needs one number for the horizontal radius and one for the
vertical, or the arc comes out an ellipse.

**There is a table above and below it and none at either side.** The card used
to be full bleed on every edge, which meant it could not have corners, and
corners are most of what makes a card a card. Seven by twelve at the full width
of a phone leaves room top and bottom and none at the sides, which is exactly
the room the corners need.

**The stock has an air-cushion finish.** A real card is embossed with a grid of
dimples about half a millimetre apart, which is what stops a pile of them
sticking together. It is a three-pixel `radial-gradient` at 5% opacity — meant
to be findable and never noticeable, because a texture you can see is worse
than none.

**A panel opened and closed inside one frame left an invisible layer over
everything.** `#panelhost` is `pointer-events:none` until it gets `.on`, and
`openPanel` adds that a frame late so the sheet has something to slide in from.
Closing removes it synchronously — so a same-tick open-and-shut let the pending
frame put `.on` back on a host with nothing in it: a full-screen
`pointer-events:auto` layer, invisible, swallowing every tap on the deck and on
the table, with nothing on the screen to say why. The callback is guarded on
`PANEL` still being the panel it was opened for. Anything else that adds a class
a frame late wants the same guard.

**There is one button in the whole app, and you meet it only once you have
turned a card over.** It is the app's own mark, top right of the back, and it
opens the hub — which is where everything is. There were four marks in the
corners before that, and every one of them but this was a quick link into that
same hub: four things standing in front of the one thing you are deciding
about. The front of a card is now the activity and nothing else at all.

**It lives outside `#frame` rather than in it, and that is load-bearing.** The
card carries a `perspective` and `.cardin` is `preserve-3d` for the turn, and a
3D rendering context sorts what it contains by depth rather than by the z-index
of anything beside it — so the row of emblems at the head of the card took the
taps meant for the button, whatever z-index it was given. That was true the
first time the flip was in 3D, stopped mattering for the one commit the flip
was not, and is true again. Leave the button where it is.

**Undo is a swipe down**, the opposite of the way the card left, and the card
comes back the way it went: down from the top rather than appearing. There is
no undo button, so nothing has to sit on the card waiting to be needed. Up is
unchanged — it passes the card on without saying anything about it.

**The flip is one movement, in two halves, and it never turns past 90°.** Out
to edge-on in 230 ms accelerating, the face swapped there where the card is a
line and there is nothing to see, then out again from edge-on the other way in
230 ms decelerating. The jump from -90° to +90° is between two identical
pictures — a card with no width — so what you see is one sweep, the near edge
crossing the middle and coming out the far side.

**Never both faces at once, and never `backface-visibility`.** It was a single
460 ms `rotateY(-180deg)` with both faces on the card and `backface-visibility`
holding back whichever faced away. That is much the tidier thing to write, and
it asks the browser to honour `backface-visibility` inside a `preserve-3d`
subtree. Where it does not — Timothy's phone, and Chromium composes it
correctly so no test here caught it — both faces paint, they are coplanar, and
what you get is the *front* showing through the back, mirrored: text backwards.
It is what the printed card backs were bleeding through as too; removing them
treated the symptom.

Ninety degrees is the most a face can turn and still only ever be seen from the
front. One face is in the layout at a time (`display:none` on the other), so
there is nothing behind anything to show through. The smoke test samples the
turn frame by frame and asserts the container's `m11` never goes negative and
exactly one face is displayed throughout — a negative `m11` is a face seen from
behind, which is the bug.

It turns **negative**, which lifts the right edge up out of the screen towards
you, the way you turn a card you are holding. Positive pushes that edge away
and reads as the card going backwards.

The two other things that made earlier versions look wrong are fixed rather
than avoided. The drop shadow is on `.card`, which does not rotate — a shadow
swinging round with the card was most of what made it look like a rotating
picture instead of a turning card; the hairline edge stays on `.face` and does
turn, because that one belongs to the card. And `body.turning` hides the rest
of the hand for the length of the turn: the cards behind are dead in line and
the same cream, so as the card goes edge-on the gap showed another card rather
than the room, and it read as the card being somehow behind itself.

The version before this one avoided 3D entirely — two 170 ms phases squeezing
to nothing with `scaleX` and opening out again. It was smooth and it still read
wrong, because it is the same motion twice, once forwards and once in reverse:
however it is eased, a card that goes out and comes back looks like it sprang
back rather than turned over.

`flip()` in `js/deck.js` owns the timing — it has to, because the two halves
need the transition turned off between them, which a class cannot do.
`turn()` in `js/table.js` is the same thing for a card on the table.
`data-turning` stops a second tap landing mid-turn, and `know()` runs at the
halfway point rather than at either end — at the start the button on the back fades in over a card still showing
its face, and at the end it arrives after the card has settled, which is late.

`theme-color` is the ink, flat. Safari tints its own toolbars with it, and while
the card was the screen deck.js had to swap it to the paper colour and back so
the bands above and below matched the card. The card is on a table now and the
table is the same dark all the way out, so there is nothing left to keep in
step.

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
| `state.js` | The one localStorage key, the shape, the rewrites, export/import. Nothing else touches storage. |
| `taste.js` | The model: `scoreOf`, `learn`, `unlearn`, `opinions`, `reasons`. |
| `deal.js` | What gets dealt next — the round, filtering, ranking, verdict bias, recency, wildcards, and the `why` line. |
| `cards.js` | How a card is printed: `cardHTML`, the accent colour, the wording of a length. The front is the title and nothing else; the back carries everything the app knows. |
| `deck.js` | The hand, the verdicts, undo, the stack, the empty deck. |
| `swipe.js` | Pointer drag, the two stamps, and the tap that flips. Right is like, left is not, up is neither — which is why up has no stamp — and down is not about this card at all: it takes the last one back. |
| `panels.js` | Every panel: the hub, right now, all activities, taste, write your own, rewrite this card, curate, backup. |
| `table.js` | The table: its own shuffled pile, dealing, dragging, turning a card over, shuffle and gather. Touches nothing the deck owns. |
| `boot.js` | One delegated listener set. To add an action, add a `data-act` and a case in `act()`. |

Four stylesheets: `base.css` (the room), `deck.css` (the card), `panels.css`, `table.css`.

After changing anything in `js/`, `css/` or `index.html`, bump `CACHE` in
`sw.js` **and** `APP_VERSION` in `js/state.js`. Without the cache bump an
installed copy keeps serving the old version, and the symptom — "my change
didn't deploy" — points at the wrong culprit. A new file must also be added to
`SHELL` in `sw.js` or it won't be there offline.

## The table

**Menu → The table.** A surface to handle cards on, rather than a deck that
hands them to you one at a time. It is a place to try things: how big a card
should be, what a spread reads like, whether a two-sided card is better than a
card with the meaning printed under the word. Nothing tried here is a decision
about the deck until it is moved into the deck.

It is deliberately walled off. It deals from **its own shuffled pile**, built
when you open it from the packs that are switched on, minus anything you have
said "never again" to. It teaches the taste model nothing, it does not touch
the round, and closing it throws the whole table away. The smoke test asserts
that last part — the weights, the round and the swipe count all have to come
out the other side untouched.

- **Tap the pile to deal a card**, one at a time, as many as you like.
- **Laid out for 1–8** is the one setting, and it is not really about how many
  you get: it is what decides how big a card is drawn. The layout tries every
  number of columns and keeps whichever gives the widest card, so four is two
  by two on a phone and four in a row on anything wider, worked out rather than
  chosen. A last row that does not fill goes in the middle. Deal past the
  number it is laid out for and they stack a little down and across, clamped so
  nothing walks off the edge — a card you cannot see is a card you have lost.
  Type is sized in `cqw`, the card's own width, so one rule covers every size.
- **Drag a card** anywhere. Picking one up brings it to the front. You can hang
  it over the edge but not push it off: its middle stays on the felt, so there
  is always something to pick back up.
- **Tap a card to turn it over**, the same 460 ms rotation the deck uses. A tap
  that moved less than nine pixels in under half a second is a tap; anything
  else was a drag.
- **Shuffle** is the pile and leaves the table alone. **Gather** is the table:
  everything goes back in and the pile is shuffled. They were briefly the same
  function, which made two buttons that did the same thing and no way at all to
  shuffle what you had not dealt yet.

**Two-sided packs.** `"twosided": true` in `packs/index.json` — Words and
Italian have it. A card in such a pack is printed on both sides: the word on
one and the meaning on the other, rather than the meaning set under the word.
The build refuses a row in a two-sided pack with no definition, because there
would be nothing on the back of it.

On a verb card the meaning is a paragraph — the English first, then the tenses
— so the first line is set as the headline and the rest goes under it small.
That is what makes "one side the Italian, one side the English" true of a card
that also has to carry a conjugation table.

**Every other pack is one-sided here**: one face, always dealt face up, and
tapping it does nothing because there is nothing on the other side. There was a
printed back for those cards for one version — the field of ink and pattern the
decks on the Decks table are drawn with — and it bled through the front, so the
pattern sat over the words. It is out until the two-sided dynamic is settled.
The pattern classes it used are still in `panels.css`, where the Decks table
uses them.

**Cards land on a random side**, where there is a second side to land on. On a
two-sided pack that is the point: half arrive showing the meaning and half the
word, which is a deck you can test yourself with rather than read off.

**`setPointerCapture` throws on a pointer that is already gone**, rather than
doing nothing, and an exception out of a `pointerdown` handler takes the rest
of the gesture with it. Capture improves a drag; it is not required for one. It
is in a `try` in both `swipe.js` and `table.js`.

**Do not put `container-type` on a face that turns over.** The type here is
sized from `--tw`, the card's own width in pixels, written by `table.js` when it
places the card. It was a container query, which reads far better — until you
notice that `container-type` computes to `contain: layout style inline-size`,
and layout containment on the very element carrying `backface-visibility` and
the half-turn is exactly the thing that can flatten it. The face that should
have been facing away came through the front.

## The aesthetics studio

It used to live here, in `aesthetics/`. It is its own repository now —
**https://github.com/StarrySidekick/Aesthetics**, live at
**https://starrysidekick.github.io/Aesthetics/** — carried over with its
history by `git subtree split`, the same way this app left Bureau. It shared
nothing with the deck but a folder, and it had outgrown being a folder.

That is where Victoria, Starful Gothic, Aeros, Golf 97, Girando, Stelaine and
Carca are kept, each as a full style guide in
`library/<id>.aesthetic.json`. "Build this in Aeros" plus that file is the
intended workflow, here as anywhere else.

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
