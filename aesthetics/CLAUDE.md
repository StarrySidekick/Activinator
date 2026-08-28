# Aesthetics — working notes for Claude Code

A workbench for Timothy's aesthetics. Each one is a full style guide kept as
JSON; the studio edits them and wears whichever is selected.

**Start here each session: `README.md` is the reference** — the format, the
studio, the deploy, the tests, the file map. Read it before changing
behaviour.

## Running it

```bash
scripts/serve.sh                # http://localhost:8020
node test/smoke.mjs             # headless check, needs the server running
```

Run the smoke test after any non-trivial change and **look at the
screenshots** in `test/shots/`. This is an app whose entire job is how things
look; a passing assertion has never once meant it looked right. Two real bugs
were caught that way already — a strength slider wired to nothing, and a
room that stayed daylight while the desk went dark.

## Building something in an aesthetic

When Timothy says "build this in Aeros" (or Victoria, Starful Gothic, Golf 97,
Girando, Stelaine, Carca), read `library/<id>.aesthetic.json` and follow it.
**The story, philosophy, do/don't and voice in the file are instructions, not
flavour** — the numbers say what to use, those say what for. The guide export
(`asGuide` in `js/export.js`) is the same content written out to hand over
whole.

## The three rules easiest to forget

- **`library/*.aesthetic.json` is the source of truth.** The studio is a
  static page and cannot write it; edits live in localStorage until exported
  and committed. A change nobody committed does not exist tomorrow.
- **A shadowless aesthetic stores a zero shadow, never `none`.** Shadows get
  composed into lists (`inset …, var(--shadow)`), and `none` is only legal as
  the sole value of the property. Starful Gothic is the one this bit.
- **`js/schema.js` owns both the format and the form.** Add a field to
  `blank()` *and* to `SECTIONS`, or you get a value nobody can edit or a knob
  wired to nothing. `upgrade()` backfills older files and saved working
  copies, so adding a field is safe.

## How the painting works

`apply()` in `js/preview.js` sets `--v-*` custom properties and a few
`data-*` attributes (corner, enter, hover, ambient, dividers, underline) on
`<html>`. Everything visual reads those: the demo site straight, the editor
chrome through a `--c-*` mapping that the plain-room toggle re-points at
neutral greys. Nothing is styled per-aesthetic in CSS — if something needs a
special case, the format is missing a parameter. That is the test the whole
thing is built to pass.

Cut corners are a `clip-path`, and a clip cuts the shadow off too; in a
cut-corner aesthetic, depth comes from borders.

## Style

No dependencies, no build step, no framework. Two-space indent, single quotes,
template literals for HTML. Comments explain *why*. Copy is plain, specific and
unexcited — "On the list", not "Added successfully!".
