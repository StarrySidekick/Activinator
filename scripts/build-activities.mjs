// Builds js/activities.js from the CSVs in packs/.
//   node scripts/build-activities.mjs
//
// The packs are the source of truth for what is in the deck. Edit a CSV — by
// hand, or by exporting a spreadsheet over it — run this, and commit both the
// CSV and the generated file. Nothing fetches anything at runtime: the app has
// to open on a train.
//
// Columns: title, minutes, cost, tags, then definition and source (both
// optional, either order)
//   minutes    a whole number. The duration band is worked out from it.
//   cost       free | frugal | costly (0 | 1 | 2 also accepted)
//   tags       space-separated, all from the vocabulary, and NOT duration or
//              cost tags — those two are derived, and saying them twice is how
//              they come to disagree.
//   definition on cards that teach a word, the meaning — printed separately
//              from the word itself. Newlines survive (quote the cell), which
//              is how a verb card carries its conjugations.
//   source     seed | mine | folk. Who wrote the row. Authoring-only: it is
//              counted here and never emitted into js/activities.js. Absent
//              means seed, because everything written before the column
//              existed was generated. `--placeholders` lists what is left.
//
// A pack may declare "lang" in index.json (e.g. "it-IT"); its cards then get
// a speak button that says the title out loud in that language.
//
// A pack may also declare "twosided": true. Its cards are printed on both
// sides — the word on one, the meaning on the other — rather than the meaning
// sitting under the word, which is how they are dealt on the table. Every row
// in such a pack must have a definition, or there is nothing on the back.
//
// Every row must name exactly one place and exactly one how-hard. Anything
// else is refused with the file and line, because a bad row that builds is a
// card that quietly never gets dealt.
//
// Two rows with the same title are refused as well — the id comes from the
// title. Two rows that merely say nearly the same thing are reported at the end
// and build anyway: some of those pairs are deliberate.
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { TAGS, GROUPS, MARKS, DURATIONS, COSTS, durationOf, idOf } from '../js/vocab.js';
import { parseCSV } from './csv.mjs';

const dir = new URL('../packs/', import.meta.url);
const read = (f) => readFileSync(new URL(f, dir), 'utf8');

/* Who wrote a row.
   -----------------------------------------------------------------------
   Timothy's own reason for not using this app: "the activities and card
   content are AI generated and I want a way for that not to be the case."
   That is not a feature request, it is a content problem, and the first thing
   a content problem needs is a way to see how big it is.

   So every row can say where it came from. It is deliberately AUTHORING-ONLY
   and is not emitted into js/activities.js — the app has no use for it, and
   shipping a field nothing reads to fifteen hundred cards is dead weight. The
   build counts it, and `--placeholders` prints the rows still waiting.

   Absent means `seed`, because that is the honest default: everything written
   before this column existed was generated. */
const SOURCES = ['seed', 'mine', 'folk'];
const SOURCE_NOTE = {
  seed: 'generated, still a placeholder',
  mine: "Timothy's own",
  folk: 'a real thing that exists — a known game, a tradition, a standard exercise'
};

const WHERE = GROUPS.find(g => g[0] === 'Where')[1];
const HARD  = GROUPS.find(g => g[0] === 'How hard')[1];
const errors = [];
const provenance = [];
const titles = new Map();

const build = (meta) => {
  const file = meta.id + '.csv';
  /* A pack says how its own deck is printed — the emblem on the back and the
     ink it is printed in. The emblem is one of the drawn marks, so a pack
     cannot name a picture that does not exist. */
  if (meta.mark && !MARKS[meta.mark])
    errors.push(`index.json: ${meta.id} wants the mark "${meta.mark}", which is not drawn`);
  /* A two-sided pack prints its meaning on the other side of the card rather
     than under the word, so every card in it has to have a meaning to print. */
  if ('source' in meta && !SOURCES.includes(meta.source))
    errors.push(`index.json: ${meta.id} — "source" must be ${SOURCES.join(' | ')}, not ${JSON.stringify(meta.source)}`);
  if ('twosided' in meta && typeof meta.twosided !== 'boolean')
    errors.push(`index.json: ${meta.id} — "twosided" is true or false, not ${JSON.stringify(meta.twosided)}`);
  if (!existsSync(new URL(file, dir))) { errors.push(`${file}: no such pack`); return null; }
  const rows = parseCSV(read(file));
  const head = rows.shift().map(h => h.trim().toLowerCase());
  const want = ['title', 'minutes', 'cost', 'tags'];
  if (want.some((w, i) => head[i] !== w))
    errors.push(`${file}:1  header must be "${want.join(',')}" — found "${head.join(',')}"`);
  /* Two optional columns after the four, in either order. `source` is who wrote
     the row and is authoring-only — see the note by SOURCES. */
  const OPTIONAL = ['definition', 'source'];
  const extra = head.slice(4).filter(Boolean);
  const stray = extra.filter(h => !OPTIONAL.includes(h));
  if (stray.length)
    errors.push(`${file}:1  the only optional columns are ${OPTIONAL.join(' and ')} — found "${stray.join('", "')}"`);
  const col = Object.fromEntries(OPTIONAL.map(h => [h, head.indexOf(h)]));

  const items = [];
  rows.forEach((r, n) => {
    const at = `${file}:${n + 2}`;
    const t = (r[0] || '').trim();
    const min = Number((r[1] || '').trim());
    const rawCost = (r[2] || '').trim().toLowerCase();
    const tags = (r[3] || '').trim().split(/[\s,]+/).filter(Boolean);
    if (!t) return errors.push(`${at}  no title`);
    if (titles.has(t)) return errors.push(`${at}  same title as ${titles.get(t)} — ids come from the title, so this would collide`);
    titles.set(t, at);
    if (!Number.isInteger(min) || min <= 0) errors.push(`${at}  minutes must be a whole number, found "${r[1]}"`);
    const cost = COSTS.includes(rawCost) ? COSTS.indexOf(rawCost)
      : /^[012]$/.test(rawCost) ? Number(rawCost) : -1;
    if (cost < 0) errors.push(`${at}  cost must be ${COSTS.join(' | ')}, found "${r[2]}"`);

    const unknown = tags.filter(g => !(g in TAGS));
    if (unknown.length) errors.push(`${at}  not in the vocabulary: ${unknown.join(', ')}`);
    const derived = tags.filter(g => DURATIONS.includes(g) || COSTS.includes(g));
    if (derived.length) errors.push(`${at}  ${derived.join(', ')} is worked out from the minutes and cost columns — leave it out`);
    const where = tags.filter(g => WHERE.includes(g));
    if (where.length !== 1) errors.push(`${at}  needs exactly one of ${WHERE.join(' | ')}, found ${where.length}`);
    const hard = tags.filter(g => HARD.includes(g));
    if (hard.length !== 1) errors.push(`${at}  needs exactly one of ${HARD.join(' | ')}, found ${hard.length}`);

    const item = { id: idOf(t), t, tags: [...new Set(tags.concat(durationOf(min), COSTS[cost]))], min, cost };
    const d = col.definition >= 0 ? (r[col.definition] || '').trim() : '';
    if (d) item.d = d;

    /* A pack may declare its own default in index.json — the Italian and Words
       packs are real conjugations and real dictionary entries, which is a
       different thing from a generated suggestion however the row was typed.
       A row may still override its pack. */
    const src = (col.source >= 0 ? (r[col.source] || '').trim().toLowerCase() : '')
      || meta.source || 'seed';
    if (!SOURCES.includes(src))
      errors.push(`${at}  source must be ${SOURCES.join(' | ')}, found "${r[col.source]}"`);
    /* Not attached to the item — authoring only. Carried alongside so the
       tally and --placeholders can find it. */
    provenance.push({ src, at, pack: meta.id, title: t });
    if (meta.lang) item.lang = meta.lang;
    if (meta.twosided && !d)
      errors.push(`${at}  ${meta.id} is two-sided, so this row needs a definition to print on the other side`);
    items.push(item);
  });
  return { ...meta, items };
};

const index = JSON.parse(read('index.json'));
const packs = index.map(build).filter(Boolean);

/* Identical titles are refused above, because the id comes from the title and
   two rows sharing one would be the same card twice. Near-identical titles
   build perfectly and are the same card to a reader — which is what a repeat
   feels like from the deck, whatever the dealer is doing. So they are reported
   rather than refused: some are deliberate pairs ("the hardest thing about
   being human" wants "the best thing" beside it), and only somebody reading
   them can tell which is which. */
const STOP = new Set(('a an and are as at be been by can could did do does for from get go had has have'
  + ' how if in into is it its just like made make no not of off on once one only or out over own so'
  + ' some something somebody than that the their them then there they this to too until up use very'
  + ' was way we were what when where which while who why will with would you your').split(' '));
const keyWords = (t) => new Set(t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ')
  .filter(w => w.length > 2 && !STOP.has(w)));

/* A title with one word left after the small ones are dropped matches anything
   containing that word — `Niente` against `Fa niente` is a hundred per cent and
   tells nobody anything. Two identical titles are refused by the build itself,
   so nothing is lost by leaving the very short ones out of this. */
const comparable = (w) => w.size >= 2;

const near = () => {
  const rows = packs.flatMap(p => p.items.map(a => ({ t: a.t, at: titles.get(a.t), w: keyWords(a.t) })))
    .filter(r => comparable(r.w));
  const out = [];
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    const A = rows[i].w, B = rows[j].w;
    let both = 0; for (const x of A) if (B.has(x)) both++;
    if (!both) continue;
    const same = both / (A.size + B.size - both);
    if (same >= 0.6) out.push({ same, a: rows[i], b: rows[j] });
  }
  return out.sort((x, y) => y.same - x.same);
};

if (errors.length) {
  console.error(`\n${errors.length} problem${errors.length > 1 ? 's' : ''} in packs/:\n`);
  for (const e of errors) console.error('  ' + e);
  console.error('\nNothing written.\n');
  process.exit(1);
}

const out = `/* GENERATED FILE — do not edit.
   Built from packs/*.csv by scripts/build-activities.mjs. Change an activity
   by changing the CSV and running that, then commit both. */
export const PACKS = [
${packs.map(p => `  { id:${JSON.stringify(p.id)}, name:${JSON.stringify(p.name)}, note:${JSON.stringify(p.note)}, on:${!!p.on}, mark:${JSON.stringify(p.mark || '')}, ink:${JSON.stringify(p.ink || '#3E5140')}, back:${JSON.stringify(p.back || 'lattice')}, twosided:${!!p.twosided}, items:[
${p.items.map(a => `    {id:'${a.id}',t:${JSON.stringify(a.t)},tags:${JSON.stringify(a.tags)},min:${a.min},cost:${a.cost}${a.d ? `,d:${JSON.stringify(a.d)}` : ''}${a.lang ? `,lang:${JSON.stringify(a.lang)}` : ''}},`).join('\n')}
  ]},`).join('\n')}
];
`;
/* How much of the deck is still generated, per pack.
   Printed on every build, because the number Timothy cares about here is not
   how many cards there are but how many of them are his. */
const sayProvenance = () => {
  const byPack = new Map();
  for (const r of provenance) {
    const p = byPack.get(r.pack) || byPack.set(r.pack, { seed: 0, mine: 0, folk: 0 }).get(r.pack);
    p[r.src]++;
  }
  const seed = provenance.filter(r => r.src === 'seed').length;
  const own = provenance.length - seed;
  console.log('\nwhose cards these are');
  for (const [pack, p] of byPack) {
    const n = p.seed + p.mine + p.folk;
    const pct = n ? Math.round(((n - p.seed) / n) * 100) : 0;
    console.log(`  ${String(n - p.seed).padStart(4)} of ${String(n).padEnd(5)} ${String(pct + '%').padStart(4)}  ${pack}`);
  }
  console.log(`  ${String(own).padStart(4)} of ${String(provenance.length).padEnd(5)} ` +
    `${String(Math.round((own / provenance.length) * 100) + '%').padStart(4)}  all packs, not generated`);
  if (seed) console.log(`\n  node scripts/build-activities.mjs --placeholders   lists the ${seed} still waiting`);
};

/* The rows still marked seed, so they can be rewritten in a sitting rather than
   hunted for one at a time. */
const sayPlaceholders = () => {
  const seeds = provenance.filter(r => r.src === 'seed');
  if (!seeds.length) { console.log('nothing is marked seed — every card says where it came from'); return; }
  let pack = null;
  for (const r of seeds) {
    if (r.pack !== pack) { pack = r.pack; console.log(`\n${pack}`); }
    console.log(`  ${r.at.padEnd(22)} ${r.title}`);
  }
  console.log(`\n${seeds.length} rows still generated. Mark one \`mine\` in its source column once it is yours,`);
  console.log('or `folk` if it is a real thing that already exists in the world.');
};

if (process.argv.includes('--placeholders')) { sayPlaceholders(); process.exit(0); }

const dupes = near();
const sayDupes = () => {
  if (!dupes.length) return;
  console.error(`\n${dupes.length} pair${dupes.length > 1 ? 's' : ''} of cards say nearly the same thing:\n`);
  for (const { same, a, b } of dupes)
    console.error(`  ${Math.round(same * 100)}%  ${a.at}  ${a.t}\n        ${b.at}  ${b.t}`);
  console.error('\nDeliberate pairs are fine — this is a read-through, not an error.\n');
};

const target = new URL('../js/activities.js', import.meta.url);

/* `--check` builds and compares instead of writing, so a CSV edited without a
   rebuild fails the tests rather than shipping a deck that does not match the
   packs it came from. */
if (process.argv.includes('--check')) {
  const have = existsSync(target) ? readFileSync(target, 'utf8') : '';
  if (have !== out) {
    console.error('js/activities.js is out of date — run: node scripts/build-activities.mjs');
    process.exit(1);
  }
  console.log(`js/activities.js is up to date (${packs.reduce((n, p) => n + p.items.length, 0)} activities)`);
  sayProvenance();
  sayDupes();
  process.exit(0);
}

writeFileSync(target, out);
console.log(packs.map(p => `${p.items.length.toString().padStart(4)}  ${p.id}${p.on ? '' : '  (off by default)'}`).join('\n'));
console.log(`${packs.reduce((n, p) => n + p.items.length, 0)} activities → js/activities.js`);
sayProvenance();
sayDupes();
