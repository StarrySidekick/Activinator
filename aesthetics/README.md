# Aesthetics

Timothy's aesthetics — Victoria, Starful Gothic, Aeros, Golf 97, Girando,
Stelaine, Carca, and whatever comes next. Each one is a whole style guide: a
story (most of them are places in the mind), a design philosophy, a voice, and
every parameter — colour, type, shape, space, depth, texture, decor, motion —
it takes to build something *in* that aesthetic without asking any further
questions.

**The studio wears the aesthetic it is editing.** Picking one on the left
repaints the entire page, not a preview pane: the buttons you are clicking,
the panels around the form, the type you are reading. The demo column is a
small working site — nav, hero, cards, a form, links, a footer, a toast —
that never changes shape, so the only thing that ever changes is the
aesthetic. If it looks right there, it will look right in a real app; if the
studio needs a colour the tokens don't carry, the format is missing a
parameter.

## The files are the point

**`library/*.aesthetic.json` is the source of truth.** The editor is an
editing surface; the committed JSON is the memory. A session that starts
tomorrow knows exactly what Girando is because it reads
`library/girando.aesthetic.json`, and nothing else.

To use one: *"Build this in Aeros — read `library/aeros.aesthetic.json`."*
The file carries the philosophy and the voice alongside the tokens, so the
guide export isn't decoration — it is the part that says what the numbers
are *for*.

Three of the seven are seeded from real, committed data — Bureau's style
system: Victoria from Victorian, Starful Gothic from Starry Sidekick, Aeros
from Aero. The other four are **drafts**: every value is a starting guess,
and their stories say so in the first line. Rewrite them; a draft's story is
a placeholder, not canon.

## Running it

```bash
scripts/serve.sh                # http://localhost:8020
node test/smoke.mjs             # headless check, needs the server running
```

Over http, not `file://` — the library is fetched. It is also live at
**https://starrysidekick.github.io/Aesthetics/**, which is what makes it work
from a phone. Pushing to `main` deploys it (`.github/workflows/pages.yml`
force-pushes the site to `gh-pages`, which Pages serves; that branch is
entirely generated — never commit to it).

Edits live in localStorage as a working copy per aesthetic; the committed file
shows through until you touch something, and **Revert to file** throws the
working copy away. Shipping a change is an export: the JSON tab, Copy or
Download, and commit it over the file in `library/` — or paste it at a session
and say "commit this". **New** starts a blank one, **Fork** copies the current
one, **Import** reads a `.aesthetic.json` back in.

Two toggles worth knowing: **After dark** appears only for aesthetics that
carry a second set of seven, and **Plain room** drops the *editor chrome* back
to neutral grey when an aesthetic is too loud to work inside — the demo stays
painted, because plain is for the tools, never the picture.

The three exports, per aesthetic:

- **JSON** — the aesthetic itself (`girando.aesthetic.json`). Canonical.
- **CSS** — the same values as custom properties, prefixed with the id
  (`--girando-accent`), so two aesthetics can coexist on one page.
- **Guide** — a markdown style guide: story, philosophy, voice, every token,
  and the CSS block, in one hand-overable document.

## The format (aesthetic/1)

`js/schema.js` owns it — the blank, the upgrade path, and the field spec the
form is generated from, in one file so a control and the value it edits cannot
drift apart. The shape:

- **identity** — id, name, status (`draft`/`canon`), tagline, lineage
- **the place** — `story` (the vibe, written as somewhere you can stand) and
  `mood` words
- **philosophy** — `principles`, `do`, `dont`
- **voice** — tone, and sample copy the aesthetic would actually say. The demo
  prints it: the first sample is the toast, the rest fill the cards.
- **color** — seven roles (bg, surface, ink, soft ink, line, accent, glow), an
  optional after-dark seven, and a named palette ("a style has to answer *what
  is your umber*" — Bureau's rule, kept)
- **type** — display/body/mono stacks, weight, posture, tracking, case, base
  size, scale ratio
- **shape & space** — round or **cut** corners, three radii, border width and
  style, space unit, density
- **elevation & effects** — two shadows, plus **gloss** (a wet highlight),
  **glass** (frosted blur behind the bar) and **grain** (film over the room)
- **texture** — backdrop kind (none / checker / stars / sheen / grain), its two
  colours, strength, and free-text notes for what parameters can't say
- **decor** — an ornament glyph, divider style, and how links underline
- **motion** — speed, easing, **entrance** (fade / rise / drop / turn / grow),
  **stagger**, **on touch** (lift / glow / tilt / press), **ambient** (drift /
  twinkle / shimmer), and a sentence of character

Two rules the format inherited the hard way. A shadowless aesthetic stores a
*zero* shadow, never `none` — shadows get composed into lists where `none` is
illegal, which is why Starful Gothic reads the way it does. And a **cut**
corner is a clip, so it clips the shadow too: carve depth with borders there.

Change the shape by editing `blank()` and, if a control should exist for it,
`SECTIONS` — `upgrade()` fills anything missing from older files, so adding a
field never breaks a committed aesthetic or a saved working copy.

Hand-drawn assets are out of scope for now — `texture.notes` and `notes` hold
the intent in words until there are assets to hang on it, the same way Bureau
parked Skeuomorphic.

## Testing

```bash
npm i                           # playwright, the only dependency
scripts/serve.sh                # in one terminal
node test/smoke.mjs
```

It loads every library file through the real studio, screenshots each
aesthetic's whole page into `test/shots/`, and checks that the page itself
repaints, that the discrete choices land as attributes, that entrances run,
that plain room switches the chrome without touching the demo, and that an
edit, a revert and the three exports all work. **Look at the screenshots** —
seven aesthetics wearing one page is the visual claim this makes, and a
passing assertion doesn't mean Victoria looks like Victoria.

## The files

| File | What lives there |
| --- | --- |
| `library/*.aesthetic.json` | The aesthetics. The only files that matter. |
| `library/index.json` | Which ids exist, in shelf order. |
| `js/schema.js` | The format: blank, upgrade, field spec, ROLES. |
| `js/preview.js` | Paints an aesthetic onto the document root; the entrance replay. |
| `js/editor.js` | The studio: list, generated form, working copies, events. |
| `js/export.js` | JSON / CSS / guide generators. |
| `index.html`, `css/studio.css` | The room and the demo site inside it. |

No dependencies, no build step, no framework. Two-space indent, single quotes,
template literals for HTML. Comments explain *why*. Copy is plain, specific and
unexcited — "On the list", not "Added successfully!".
