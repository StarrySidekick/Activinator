# Intent

What this is for, and what to build next. This copy was written **2026-09-16**,
on the `claude/activitnator-bespoke-migration-8c9ylk` branch — the repo's own
registered default, confirmed with `git symbolic-ref refs/remotes/origin/HEAD`
today, not assumed. Read this before choosing what to build, and read the next
section first: it is not about direction, it is about which branch you are
standing on, and that has been true for three weeks now.

## Read this before touching anything: the branch you are on is stale, and getting staler

**This is the second time this file has had to say that.** A session on
2026-09-13 (`claude/epic-cori-tmfyve`) found the same thing and wrote nearly
the same warning, in a version of this file that never reached this branch —
it was committed on its own branch, per that session's own instructions not to
touch `main` or push to the default branch directly, and nobody has merged it
since. This is a rewrite of that finding, current as of today, because the gap
it described has only grown.

**The registered default branch sits at `484b55c`** ("The Pages URL keeps the
repository's capital A"), dated **2026-08-26**. `main` is a straight
continuation of that same commit — not a fork, `git merge-base` confirms the
default branch's tip is a plain ancestor of `main`'s, so there is no actual
divergent history between the two, only a lot of one-sided distance. `main`
carries, on top of that point: the whole card-and-table redesign from early
September (dealing onto a table, Bicycle/tarot proportions, one-sided cards,
turning a card in two halves), `js/hour.js` (time of day as context that
offers and never filters), a `source` column on pack rows (`seed`/`mine`/
`folk`) with a `--placeholders` build flag, and its own `INTENT.md` — none of
which exist on this branch. `main`'s own tip has not moved since **2026-09-07**.

**Since then, at least seven more overnight sessions have each branched off
`main`'s tip independently and pushed their own unmerged branch**, none of
them reaching `main` and none of them (except this file's previous attempt)
touching the actual default branch at all:

| Branch | Date | What it adds, on top of `main` |
| --- | --- | --- |
| `claude/epic-cori-b23q2h` | 09-08 | Search reads the meaning of an activity, not only the words in its title |
| `claude/epic-cori-qipvjq` | 09-09 | A hint at which placeholders are already real; one favicon fix |
| `claude/epic-cori-00cmm0` | 09-10 | Curating a card ends somewhere better than "take it to a session" |
| `claude/epic-cori-9t6mbq` | 09-11 | The Quotes deck brought back as real content |
| `claude/epic-cori-tmfyve` | 09-13 | The default-branch/INTENT.md warning this section is a rewrite of |
| `claude/epic-cori-r9ci7w` | 09-14 | **Consolidates four of the above** (curation-apply, search-by-definition, folk-hints, the favicon fix, Quotes) into one branch, plus a fix for a bug combining them surfaced |
| `claude/epic-cori-87ulcd` | 09-15 | "A rewrite marks itself mine too" — branched fresh off `main`'s tip again, **not** off `r9ci7w`, so it does not carry that consolidation and the two would need a real merge (both touch `js/panels.js`, `js/state.js`, `sw.js`, `test/smoke.mjs`) to combine |

None of this was reconciled tonight either. Bringing `main`'s work into a
branch based on the actual default branch is a fast-forward with nothing to
lose — the default branch has no commits `main` lacks. Merging the seven
proposal branches into one another is a separate, harder problem: `r9ci7w`
already did four of them, `87ulcd` still needs combining with that result, and
whichever of those Timothy actually wants is not something a session working
inside "don't push to main, don't push to the default branch" can resolve on
its own — every night so far has correctly treated that as a call above its
pay grade and left it written down instead. This is that, again, more
current.

**The simplest actual fix costs nothing and needs five minutes of a human's
attention on github.com:** either point the repo's default branch at `main`
(Settings → Branches → Default branch), or, if `r9ci7w`'s consolidation is the
one worth keeping, merge it to `main` first and then repoint. Either way the
stale `claude/activitnator-bespoke-migration-8c9ylk` branch can be deleted
once nothing depends on it being "default" — check the workflow trigger below
first, since it was pointed at that branch's exact name for the years until
that's fixed too.

The Pages deploy is not silently broken by any of this, only by luck: the
workflow triggers on push to `main`, and `main` is what everyone has actually
been pushing to (right up until 09-07), so the live site reflects `main`'s tip
regardless of which branch GitHub calls default. What genuinely would break —
a push straight to the registered default branch deploying nothing — is now
guarded: tonight's session (2026-09-16) added that branch's name to
`.github/workflows/pages.yml`'s trigger list, so it can't happen silently
again while the pointer is wrong.

## What it is for

Timothy's deck of things to actually go and do. One user.

## The honest state of it, as of `main`

Quoting `main`'s own `INTENT.md` (2026-09-06), since it is truer than anything
this branch could say on the subject: **"He does not use it yet, and he named
why: the activities and card content are AI-generated and it shows."**
*"Content is placeholder in a lot of ways."* Anything that makes the content
feel like it came from somewhere real outranks anything else in this repo, and
no feature fixes it.

**That problem is not visible from this branch at all, which is worth knowing
rather than being reassuring.** The packs `main` measured as 1,260 of 1,498
rows placeholder — Questions, Ask a partner, Tableaus, Visualizations — don't
exist here; this branch only ships `packs/core.csv` (303 rows) and
`packs/winter.csv` (12), both written before the placeholder problem was named
and both reading as specific, considered, in-voice content on inspection
tonight — not the generic-suggestion problem `main`'s measurement is about. So
the content problem is real, but it is a problem with packs that live on
`main`, and fixing it here would mean fixing packs that are not in front of
you. Do not invent new activity or quote content on this branch to "fix" a
number that does not exist here — that is exactly the kind of unreviewed,
Timothy's-voice authorship the standing instructions for this project rule
out.

## What is next

Once the branches are reconciled: whatever `main`'s own `INTENT.md` says,
since it is the newer and more informed answer to that question. Short
version — better ways of coming up with activities that feel authentic rather
than generated, with Timothy's own input in the loop; the language packs
(Words, Italian) possibly wanting to be their own thing rather than mixed into
one deck; a feed that eventually carries more than activities, including
events from Proximi; and Bureau tasks being pullable in, later, designed
around but not built yet.

## This session's own changes (2026-09-16)

Done directly on the default branch, since the reconciliation above still
needs a human call this session couldn't make on its own: this file
(rewritten with the current, wider gap); the workflow fix (both branch names
now trigger a deploy); `README.md` and `packs/index.json` both still called
`winter.csv` an example pack to delete or fill in — it has real rows and is
just seasonal, off by default the way a winter pack should be outside winter;
`package.json` gained `"type": "module"` to stop Node warning about every
`.mjs` script's own imports, since nothing here is CommonJS; and
`test/version.mjs`, a new no-browser check that `CACHE` in `sw.js` and
`APP_VERSION` in `js/state.js` still agree and that `SHELL` lists every file
actually in `css/` and `js/` — the exact two things the README and CLAUDE.md
both call "the easiest thing to forget" and neither previously checked.

Housekeeping checked and green on this branch as found: `node test/smoke.mjs`
(all assertions true, no console errors), `node test/upgrade.mjs` (both
saved-shape cases pass), `node scripts/build-activities.mjs --check` (315
activities, matches the packs), and the new `node test/version.mjs`.
Screenshots in `test/shots/` look right at phone width. None of that tells you
anything about `main`'s much larger surface area, which has its own tests and
its own screenshots to check.
