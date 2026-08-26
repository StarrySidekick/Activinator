# The aesthetics studio

A workbench for Timothy's aesthetics — Victoria, Starful Gothic, Aeros,
Golf 97, Girando, Stelaine, Carca, and whatever comes next. Each one is a
whole style guide: a story (most of them are places in the mind), a design
philosophy, a voice, and every parameter — colour roles, a named palette,
type, shape, space, depth, texture, motion — that it takes to build something
*in* that aesthetic without asking any further questions.

It lives inside the Activinator repository for convenience, but it is
deliberately self-contained — nothing in here imports from the app and
nothing in the app imports from here — so it can lift out into its own
repository whenever it outgrows this one.

## The files are the point

**`library/*.aesthetic.json` is the source of truth**, exactly as the packs
are for the deck. The editor is an editing surface; the committed JSON is the
memory. A session that starts tomorrow knows exactly what Girando is because
it reads `library/girando.aesthetic.json`, and nothing else.

To use one: *"Build this in Aeros — read
`aesthetics/library/aeros.aesthetic.json`."* The file carries the philosophy
and the voice alongside the tokens, so the guide section of the export isn't
decoration — it is the part that tells a builder what the numbers are *for*.

Three of the seven are seeded from real, committed data — Bureau's style
system (`web/js/look.js`, `docs/STYLES.md`): Victoria from Victorian, Starful
Gothic from Starry Sidekick, Aeros from Aero. The other four are **drafts**:
every value is a starting guess, and the stories say so in their first line.
Rewrite them in the editor; a draft's story is a placeholder, not a canon.

## Running the editor

```bash
scripts/serve.sh              # from the repo root, then
                              # http://localhost:8010/aesthetics/
```

Over http, not `file://` — the library is fetched. Once merged to `main` it
is also live at `https://starrysidekick.github.io/Activinator/aesthetics/`,
so it works from a phone.

Edits live in localStorage as a working copy per aesthetic; the committed
file shows through until you touch something, and **Revert to file** throws
the working copy away. Shipping a change is an export: the JSON tab, Copy or
Download, and commit it over the file in `library/` — or paste it at a
session and say "commit this". **New** starts a blank one, **Fork** copies
the current one, **Import** reads a `.aesthetic.json` back in.

The three exports, per aesthetic:

- **JSON** — the aesthetic itself (`girando.aesthetic.json`). Canonical.
- **CSS** — the same numbers as custom properties, prefixed with the id
  (`--girando-accent`), for dropping straight into a project.
- **Guide** — a markdown style guide: story, philosophy, voice, every token,
  and the CSS block, in one hand-overable document.

## The format (aesthetic/1)

`js/schema.js` owns it — the blank, the upgrade path, and the field spec the
form is generated from, in one file so a control and the value it edits
cannot drift apart. The shape, briefly:

- **identity** — id, name, status (`draft`/`canon`), tagline, lineage
- **the place** — `story` (the vibe, written as somewhere you can stand) and
  `mood` words
- **philosophy** — `principles`, `do`, `dont`
- **voice** — tone, and sample copy the aesthetic would actually say
- **color** — seven roles (bg, surface, ink, soft ink, line, accent, glow),
  an optional after-dark seven, and a named palette ("a style has to answer
  *what is your umber*" — Bureau's rule, kept)
- **type** — display/body/mono stacks, weights, tracking, case, base size,
  scale ratio
- **shape & space** — three radii, border width, space unit, density
- **elevation** — two shadows, stored as strings. A shadowless aesthetic
  stores a *zero* shadow, never `none`: shadows get composed into lists,
  where `none` is illegal. Starful Gothic carries that lesson.
- **texture** — backdrop kind (none / checker / stars / sheen / grain), its
  two colours, strength, and free-text notes for what parameters can't say
- **motion** — speed, easing, and a sentence of character

Change the shape by editing `blank()` and, if a control should exist for it,
`SECTIONS` — `upgrade()` fills anything missing from older files, so adding
a field never breaks a committed aesthetic.

Hand-drawn assets are out of scope on purpose for now — `texture.notes` and
`notes` hold the intent in words until assets exist to hang on it, the same
way Bureau parked Skeuomorphic.

## Testing

```bash
scripts/serve.sh              # in one terminal
node aesthetics/test/smoke.mjs
```

Needs Playwright (`npm i` at the repo root). It loads every library file
through the real editor, screenshots each aesthetic's preview into
`test/shots/`, and exercises an edit, a revert and the exports. **Look at
the screenshots** — seven aesthetics through one preview is the visual claim
this whole thing makes, and a passing assertion doesn't mean Victoria looks
like Victoria.

## The files

| File | What lives there |
| --- | --- |
| `library/*.aesthetic.json` | The aesthetics. The only files that matter. |
| `library/index.json` | Which ids exist, in shelf order. |
| `js/schema.js` | The format: blank, upgrade, field spec, ROLES. |
| `js/editor.js` | The studio: list, generated form, working copies, events. |
| `js/preview.js` | Paints the fake screen from an aesthetic's tokens. |
| `js/export.js` | JSON / CSS / guide generators. |
| `index.html`, `css/editor.css` | The room. Deliberately nobody: the studio's own chrome is quiet grey so it argues with none of the seven. |
