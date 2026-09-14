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
content — the placeholder rows were exactly where they were.

**Quotes restored, 2026-09-11.** 109 lines verified as actually said or
written by the person named — cut from the deck on 2026-09-01 in an unrelated
card-geometry commit and never brought back, so the README kept describing a
pack that did not exist. Real content going missing silently is exactly the
kind of thing the `source` count exists to catch, and it hadn't, because
nothing was watching for a pack disappearing rather than a row staying
`seed`. One line was fixed while it was back on the table: the Toni Morrison
card read as a paraphrase ("If you surrender to the air, you can ride it")
rather than the words the novel actually has ("surrendered… could"); it now
reads as printed in *Song of Solomon*, with the book named the way every
other literary quote in the pack names its source.

**Search reads the definition, 2026-09-08.** A word card's title is the word
itself, so a search that only read the title could never find "Petrichor" by
typing "rain" — the direction you actually remember a meaning from, on a
card whose whole reason for existing is that the word was the unfamiliar
half. `js/panels.js`'s browse search now matches a card's definition too.

**A hint at which placeholders are already real, 2026-09-09.** Rewriting
1,260 rows by having an AI write different placeholder text is the same
failure mode with new words, and is deliberately not what this is.
`scripts/folk-hints.mjs`, wired into `--placeholders`, flags a `seed` row
whose title already names an actual game, poetic form or tradition ("Would
you rather", a haiku, a pub quiz, twenty questions) rather than describing a
generic activity — a place to look, never a verdict, and it never reclassifies
anything itself: moving the count by a script's own guess is exactly what the
instrument exists to catch rather than do.

**Those hints acted on, 2026-09-14.** The pass the 2026-09-09 note called "a
two-minute job" — 22 rows across `core.csv` and `questions.csv`: sixteen
"Would you rather" questions, a pub quiz, hide and seek, a jigsaw, twenty
questions, a crossword and a time capsule, all real, named, pre-existing
games rather than generated suggestions. Marked `folk` by hand, one row at a
time, checked against the actual title text rather than trusted from the
hint output; `questions.csv` gained a `source` column in the process, since
it never had one. Verified with `test/curate.mjs`'s round-trip check (every
pack, parsed and re-serialized, comes back byte-identical) and confirmed
`--placeholders` no longer lists any of the 22.

**The number today is 369 of 1,607, or 23%** — Words, Italian and Quotes are
real in full; Core carries 5 folk rows and Questions 17, out of 649 and 309.
**1,238 rows are still placeholder**, which is the honest picture and is
still ahead of anyone. `node scripts/build-activities.mjs --placeholders`
lists what is left, folk-hints included, so it can be worked through in a
sitting instead of hunted one at a time.

**The loop is closed at the other end too.** `S.mine` already let him write
activities on the device and export them as pack rows; those rows now come out
marked `mine`, so pasting one into a pack moves the number without anything
further to remember.

**What none of this does** is make a single card better. It counts, and it
recovers real content that already existed but had gone missing or unmarked.
The actual work — rewriting the 1,238 rows still generated, or finding a
source of activities that is real rather than generated — is still ahead,
and the tools above are the instrument for telling whether it is going
anywhere, not a substitute for it.

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

## A housekeeping note, 2026-09-09, still true 2026-09-14

**GitHub's own registered default branch for this repo is stale and should
be repointed.** It is still `claude/activitnator-bespoke-migration-8c9ylk`,
which stopped moving on 2026-08-26 — checked again today via the API and it
has not changed. `main` has (as of today) 33 commits past that point: the
whole table rework, the tarot card, the flip, the aesthetics-studio split,
the question packs, "the clock offers", search-by-definition, folk-hints,
the curation-apply workflow and Quotes coming back. A scheduled run briefed
to "branch from the default branch, well ahead of main" is being pointed at
exactly the wrong one every time it runs, and it has now cost several
sessions independently rediscovering the same fact rather than doing new
work. **Whoever next has GitHub open: Settings → Branches → change the
default to `main`** (or fast-forward the stale branch to it and delete the
duplicate) so this stops recurring. Nothing here needs Timothy's judgment —
the two branches have never diverged, `main` is a strict continuation of the
older one's own history, so repointing loses nothing.

**A consequence worth naming: the same staleness bred a small swarm of
unmerged siblings.** Five independent sessions in the six days before this
one each branched from `main` (once removed from the stale default),
solved a real, separate piece of the same "content is placeholder" problem,
and pushed to their own `claude/epic-cori-*` branch without any way to see
the others: search-by-definition, folk-hints, the curation-apply workflow,
Quotes restored, and one that did nothing but document the staleness itself.
**This session merged four of those five into this branch** — search,
folk-hints, curation-apply and Quotes — rather than adding a sixth
independent attempt at the same underlying problem; the fifth (the
documentation-only one) is folded into this note. One real interaction
surfaced only by combining them: `packs/quotes.csv`, restored from a
pre-redesign commit, had one row quoted for no reason (no comma inside it),
which is harmless CSV but fails the curation tool's byte-identical
round-trip guarantee — fixed by dropping the needless quotes, matching every
other row in the file. Until the default branch is repointed, **check
`git log --all --oneline | head -50` and diff against `main` before
building anything content- or tooling-related here** — the next unmerged
sibling is one un-briefed session away from happening again.
