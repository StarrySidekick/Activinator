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

## Already done, contrary to older notes

The **"the clock offers; it never filters"** work is **merged**. It landed as
`2df2b1e` on `main`; `js/hour.js` and `test/hour.mjs` are present and wired in.
Scheduled-run notes describing it as stranded on
`claude/daily-task-automation-c9qrrv` are out of date — that branch points at the
same commit as `main`.

## A housekeeping note, 2026-09-09

**GitHub's own default branch for this repo is stale and should be
repointed.** It is still set to `claude/activitnator-bespoke-migration-8c9ylk`,
which stopped moving on 2026-08-26. `main` has 31 commits past that point —
the whole table rework, the tarot card, the flip, the aesthetics-studio
split, the question packs, "the clock offers" — none of which the registered
default branch has. A scheduled run briefed to "branch from the default
branch, well ahead of main" is being pointed at exactly the wrong one; this
session found `main` and a further branch a day ahead of it
(`claude/epic-cori-b23q2h`, one unmerged commit: "Search reads the meaning
too, not only the word") and built on that instead, flagging the discrepancy
rather than quietly discarding a month of work. Whoever next has GitHub open:
Settings → Branches → change the default to `main` (or merge and delete the
stale one) so this stops recurring.

Otherwise: a full pass tonight (smoke, upgrade, hour — all green against the
state left by the search fix) found nothing broken and nothing rotten. One
real small thing fixed: `icons/icon-32.png` has been referenced by
`index.html` since the very first commit and was never in `sw.js`'s `SHELL`,
so the tab favicon was never actually available offline. `CACHE`/
`APP_VERSION` bumped to v31/0.31 with it.

**On the actual content problem, deliberately not touched:** the honest
next step is still rewriting or replacing the 1,260 `seed` rows, and that is
still not something to solve by having an AI write different placeholder
text — that is the same failure mode with new words. What this session did
add is `scripts/folk-hints.mjs`, wired into `--placeholders`: it flags a
`seed` row whose title already names an actual game, poetic form or
tradition ("Would you rather", a haiku, a pub quiz, twenty questions) rather
than describing a generic activity. It does not reclassify anything —
the `source` column is untouched, on purpose, because moving that number by
a script's own guess is exactly what the instrument exists to catch rather
than do. **22 rows hit tonight** (`node scripts/build-activities.mjs
--placeholders`, printed inline as `— names "X", maybe folk?`) — mostly the
sixteen "Would you rather" questions, plus a pub quiz, hide and seek, a
jigsaw, twenty questions, a crossword and a time capsule. Marking those
`folk` is a two-minute pass through an already-short list, and it is a real
number moving for a real reason rather than a metric being nudged.
