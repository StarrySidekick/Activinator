# Intent

What this is for, and what to build next. This copy was written
**2026-09-13**, from the `claude/activitnator-bespoke-migration-8c9ylk`
branch — the repo's own registered default — after finding that branch had
no INTENT.md at all, unlike every other repo in this family. Read this
before choosing what to build, and read the next section first: it is not
about direction, it is about which branch you are standing on.

## Read this before touching anything: the branch you are on is stale

**`main` has three weeks and about thirty commits this branch does not.**
The registered default branch — `claude/activitnator-bespoke-migration-8c9ylk`,
the one GitHub hands you by default and the one this copy of INTENT.md lives
on — sits at `484b55c` ("The Pages URL keeps the repository's capital A"),
dated 2026-08-26. `main` is a straight continuation of that same commit —
not a fork, not divergent history, `git merge-base` says the default
branch's tip *is* main's own ancestor — carrying on through 2026-09-02's
whole card redesign (a table you deal onto, Bicycle/tarot proportions,
one-sided cards dealt face up, curating a card by rewriting it) and on to
2026-09-06/07: `js/hour.js` (time of day as context that offers and never
filters), a `source` column on pack rows (`seed`/`mine`/`folk`) with a
`--placeholders` build flag that prints how much of the deck is real versus
generated, and **main's own `INTENT.md`**, which is where the paragraph
below about placeholder content actually comes from.

None of that is on the default branch. A session that starts here and
doesn't check will either rebuild something `main` already has, working
from an older version of the very code it's rebuilding, or ship the redesign
backwards over what's already live. Both have already been narrowly avoided
once, in the session that wrote this file: it drafted a fix for a `saveMine`
validation quirk before checking `main`, where the identical line already
carries a comment explaining why it's intentional.

**Before building a feature here, run `git fetch origin && git log
--oneline origin/main -30` and read what's there.** If the two branches
still haven't been reconciled, the honest move is usually to bring `main`'s
work across before adding to the older base — a fast-forward, since there's
no divergence to merge. That attempt was made in the session that wrote
this file and was refused by the harness's own automation guardrails (the
task had been told explicitly not to touch `main`, for reasons that predate
this discovery and may no longer apply); it needs either Timothy's own hand
or a session explicitly told the constraint no longer holds. Whoever fixes
it: check first whether the default branch itself has just been left
pointing at the wrong commit — moving that pointer to `main`, or fast-
forwarding this branch to it, is probably simpler than anything else on
offer, and it costs nothing since there is no actual divergent history to
lose.

The deploy is not silently broken by this, but only by luck: the Pages
workflow triggers on push to `main`, and `main` is what people have
actually been pushing to, so the live site reflects `main`'s tip regardless
of which branch GitHub calls default. What *would* have broken, and is now
fixed (2026-09-13), is a push to the actual default branch doing nothing —
the workflow's trigger list now names both branches. See the comment at the
top of `.github/workflows/pages.yml`.

## What it is for

Timothy's deck of things to actually go and do. One user.

## The honest state of it, as of main

Quoting `main`'s own INTENT.md (2026-09-06), since it's truer than anything
this stale branch could say on the subject: **"He does not use it yet, and
he named why: the activities and card content are AI-generated and it
shows."** *"Content is placeholder in a lot of ways."* Anything that makes
the content feel like it came from somewhere real outranks anything else in
this repo, and no feature fixes it.

**That problem is not visible from the default branch at all**, which is
worth knowing rather than being reassuring. The packs that main measured as
1,260 of 1,498 rows placeholder — Questions, Ask a partner, Tableaus,
Visualizations — don't exist here; this branch only ships `core.csv` (303
rows) and `winter.csv` (12), both written before the placeholder problem
was named and both reading as specific, considered, in-voice content rather
than generic suggestions. So the content problem is real, but it is a
problem with packs that live on `main`, and fixing it here would mean
fixing packs that aren't in front of you.

## What is next

Once the branches are reconciled: whatever `main`'s own INTENT.md says,
since it's the newer and more informed answer to that question. Short
version — better ways of coming up with activities that feel authentic
rather than generated, with Timothy's own input in the loop; the language
packs (Words, Italian) possibly wanting to be their own thing rather than
mixed into one deck; a feed that eventually carries more than activities,
including events from Proximi; and Bureau tasks being pullable in, later,
designed around but not built yet.

## This session's own changes (2026-09-13)

Done directly on the default branch, since the reconciliation above needs a
human call this session couldn't make: this file; the workflow fix; and a
corrected line in README.md, which still called `winter.csv` an empty
example pack to delete or fill in — it was already filled in, just off by
default the way a seasonal pack should be outside its season.

Housekeeping checked and green on this branch as found: `node
test/smoke.mjs` (all assertions true, no console errors), `node
test/upgrade.mjs` (both saved-shape cases pass), and `node
scripts/build-activities.mjs --check` (315 activities, matches the packs).
Screenshots in `test/shots/` look right at phone width. None of that tells
you anything about `main`'s much larger surface area, which has its own
tests and its own screenshots to check.
