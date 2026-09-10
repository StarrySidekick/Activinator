# Intent

What this is for, and what to build next. Recorded **2026-09-06** from Timothy's
own answers to a direct set of questions, so this is *stated* intent rather than
intent inferred from the code.

**Read this before choosing what to build.** Where it disagrees with the rest of
the docs about **direction**, this file is newer and wins. Where it disagrees
about **mechanics** — how the code works, what was decided deliberately, the
invariants — the other docs win, always.

When something here is done, or turns out to be wrong, **edit it**. A stale
intent file is worse than no intent file.

## What it is for

Timothy's deck of things to actually go and do. One user.

## The honest state of it

**He does not use it yet, and he named why: the activities and card content are
AI-generated and it shows.** In his words, *"content is placeholder in a lot of
ways."*

That is the real problem with this app. It is not a missing feature, and no
feature fixes it. Anything that makes the content feel like it came from
somewhere real outranks anything else in this repo.

## What is next

**Better ways of coming up with activities** — ones that feel authentic, or that
are *genuinely* random rather than random in the way a generator is random.
More of Timothy's own input in the loop, whether that is him writing them, him
curating them, or the app drawing on something real in the world.

**First step taken 2026-09-06: the deck now says whose cards these are.** A
content problem needs a size before it needs a solution, and there was no way to
ask how much of the deck was placeholder. Every pack row can carry a `source` —
`seed`, `mine` or `folk` — a pack can declare a default, and the build prints the
split on every run. It is authoring-only and is never emitted into
`js/activities.js`; the app has no use for it.

**The number today is 238 of 1,498, or 16%**, and all of that is the Words and
Italian packs, which are real dictionary entries and real conjugations rather
than suggestions somebody generated. **Core, Questions, Ask a partner, Tableaus
and Visualizations are 1,260 rows of placeholder**, which is the honest picture
and is now printed rather than felt.

`node scripts/build-activities.mjs --placeholders` lists them so they can be
rewritten in a sitting instead of hunted one at a time.

**The loop is closed at the other end too.** `S.mine` already let him write
activities on the device and export them as pack rows; those rows now come out
marked `mine`, so pasting one into a pack moves the number without anything
further to remember.

**What this does not do** is make a single card better. It counts. The actual
work — rewriting 1,260 rows, or finding a source of activities that is real
rather than generated — is still ahead, and this is the instrument for telling
whether it is going anywhere.

## Two structural notes he raised, worth designing around

- **The language elements are almost their own thing**, separate from the
  activities. They may want to be their own deck, their own mode, or their own
  app.
- **Activities are one thing; the feed that brings everything together is
  another.** That feed should eventually carry more than activities — including
  **events from Proximi**.

## Later, but do not foreclose it

Tasks from **Bureau** being pullable into Activinator's lists. Not now, but do
not build anything that makes it harder.

**Second step, 2026-09-10: curating a card used to end at "take it to a
session."** Menu → Curate could tell you what had been kept, cut and
rewritten, but turning that file into edits in `packs/*.csv` meant reading
eight columns by eye and finding the matching row by hand — friction on the
one loop that actually lets Timothy fix a card himself.
`node scripts/apply-curation.mjs <curation.csv>` does that mechanically now:
a cut or an out removes the row, a keep or an edit writes the row's own words
into the pack (matched by `was` when it was rewritten before it was judged),
and it rebuilds `js/activities.js` at the end. It touches only the rows a
verdict actually names — a pack round-trips byte-identical when nothing in it
changed — and it never touches a row's `source` column, so applying a rewrite
does not by itself claim the words are his; that judgment is still his to make
by hand in the CSV. Verified against a real export from a running instance of
the app, not only against synthetic rows. This is still the instrument, not the
content — the 1,260 placeholder rows are exactly where they were.

## Already done, contrary to older notes

The **"the clock offers; it never filters"** work is **merged**. It landed as
`2df2b1e` on `main`; `js/hour.js` and `test/hour.mjs` are present and wired in.
Scheduled-run notes describing it as stranded on
`claude/daily-task-automation-c9qrrv` are out of date — that branch points at the
same commit as `main`.
