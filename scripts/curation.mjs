/* Applying a Curate export back onto packs/*.csv, as pure functions — no
   file I/O here, which is what lets test/curate.mjs exercise it directly the
   way test/hour.mjs exercises js/hour.js, and what keeps scripts/apply-
   curation.mjs itself a thin CLI around this.

   The export is `curationCSV()` in js/panels.js: one row per card you have
   judged or rewritten, in the columns a pack is written in, with the verdict
   in front and — only when the row was rewritten — the title the pack still
   has, in the last column. See "Curating" in the README before changing the
   shape either side reads. */
import { parseCSV, q } from './csv.mjs';

const CURATION_HEAD = ['verdict', 'pack', 'title', 'minutes', 'cost', 'tags', 'definition', 'was'];

/** The export, parsed. Throws on anything that is not shaped like one, rather
    than silently reading garbage as an empty curation. */
const parseCurationCSV = (text) => {
  const rows = parseCSV(text);
  if (!rows.length) return [];
  const head = rows.shift().map(h => h.trim().toLowerCase());
  if (CURATION_HEAD.some((w, i) => head[i] !== w))
    throw new Error(`not a curation export — expected "${CURATION_HEAD.join(',')}", found "${head.join(',')}"`);
  return rows.map(r => ({
    v: (r[0] || '').trim(), pack: (r[1] || '').trim(), t: r[2] || '',
    min: (r[3] || '').trim(), cost: (r[4] || '').trim(), tags: r[5] || '',
    d: r[6] || '', was: r[7] || ''
  }));
};

/** A pack's own CSV, kept as its header plus one object per row, with exactly
    the columns that pack has — so a pack with no `definition` column never
    grows one and a pack with no `source` column never grows one either. */
const parsePack = (text) => {
  const rows = parseCSV(text);
  const head = rows.shift().map(h => h.trim());
  const items = rows.map(r => Object.fromEntries(head.map((h, i) => [h, r[i] || ''])));
  return { head, items };
};

/** The inverse of parsePack. Round-tripping every file in packs/ through
    parsePack then this comes out byte-identical to what is on disk — that is
    what lets applying a curation touch only the rows it actually changes,
    rather than reformatting a whole pack around one rewritten title. */
const serializePack = ({ head, items }) =>
  [head.join(','), ...items.map(it => head.map(h => q(it[h] || '')).join(','))].join('\n') + '\n';

/** One curation row against one already-parsed pack. Matches on `was` when
    the card was rewritten before it was judged — the pack still has the
    original title, since nothing in the app ever writes to packs/ — and on
    the row's own title otherwise. Mutates `pack.items` in place and reports
    what happened rather than throwing: a row that matches nothing is either
    already applied or the export has gone stale, and either way the right
    answer is to say so and carry on, the way the build itself reports a bad
    row rather than dying on the first one. */
const applyRow = (pack, row) => {
  const match = row.was || row.t;
  const i = pack.items.findIndex(it => it.title === match);
  if (i < 0) return { action: 'missing' };

  if (row.v === 'cut' || row.v === 'out') {
    pack.items.splice(i, 1);
    return { action: 'removed' };
  }
  if (row.v !== 'keep' && row.v !== 'edit') return { action: 'unknown' };

  /* keep or edit: bring the row's own words into the pack. A `keep` with no
     `was` is very often the text that is already there — nothing to touch —
     but a card can be rewritten and then swiped in the same sitting, and a
     `keep` carries that rewrite exactly as an `edit` does. */
  const it = pack.items[i];
  const hasDef = pack.head.includes('definition');
  const changed = it.title !== row.t || (it.tags || '') !== row.tags ||
    Number(it.minutes) !== Number(row.min) || it.cost !== row.cost ||
    (hasDef && (it.definition || '') !== row.d);
  it.title = row.t; it.minutes = row.min; it.cost = row.cost; it.tags = row.tags;
  if (hasDef) it.definition = row.d || '';
  const warn = !hasDef && row.d
    ? 'carries a definition, but this pack has no definition column — dropped' : null;
  return { action: changed ? 'updated' : 'unchanged', warn };
};

export { parseCurationCSV, parsePack, serializePack, applyRow, CURATION_HEAD };
