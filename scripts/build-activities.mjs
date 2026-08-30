// Builds js/activities.js from the CSVs in packs/.
//   node scripts/build-activities.mjs
//
// The packs are the source of truth for what is in the deck. Edit a CSV — by
// hand, or by exporting a spreadsheet over it — run this, and commit both the
// CSV and the generated file. Nothing fetches anything at runtime: the app has
// to open on a train.
//
// Columns: title, minutes, cost, tags, definition (optional)
//   minutes    a whole number. The duration band is worked out from it.
//   cost       free | frugal | costly (0 | 1 | 2 also accepted)
//   tags       space-separated, all from the vocabulary, and NOT duration or
//              cost tags — those two are derived, and saying them twice is how
//              they come to disagree.
//   definition on cards that teach a word, the meaning — printed separately
//              from the word itself. Newlines survive (quote the cell), which
//              is how a verb card carries its conjugations.
//
// A pack may declare "lang" in index.json (e.g. "it-IT"); its cards then get
// a speak button that says the title out loud in that language.
//
// Every row must name exactly one place and exactly one how-hard. Anything
// else is refused with the file and line, because a bad row that builds is a
// card that quietly never gets dealt.
//
// Two rows with the same title are refused as well — the id comes from the
// title. Two rows that merely say nearly the same thing are reported at the end
// and build anyway: some of those pairs are deliberate.
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { TAGS, GROUPS, DURATIONS, COSTS, durationOf, idOf } from '../js/vocab.js';

const dir = new URL('../packs/', import.meta.url);
const read = (f) => readFileSync(new URL(f, dir), 'utf8');

/* A real CSV parser, because a title like "Skateboard, badly, in an empty car
   park" is exactly the kind of row a split(',') loses. */
const parseCSV = (text) => {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(v => v.trim()));
};

const WHERE = GROUPS.find(g => g[0] === 'Where')[1];
const HARD  = GROUPS.find(g => g[0] === 'How hard')[1];
const errors = [];
const titles = new Map();

const build = (meta) => {
  const file = meta.id + '.csv';
  if (!existsSync(new URL(file, dir))) { errors.push(`${file}: no such pack`); return null; }
  const rows = parseCSV(read(file));
  const head = rows.shift().map(h => h.trim().toLowerCase());
  const want = ['title', 'minutes', 'cost', 'tags'];
  if (want.some((w, i) => head[i] !== w))
    errors.push(`${file}:1  header must be "${want.join(',')}" — found "${head.join(',')}"`);
  if (head.length > 4 && head[4] !== 'definition')
    errors.push(`${file}:1  the only fifth column is "definition" — found "${head[4]}"`);

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
    const d = (r[4] || '').trim();
    if (d) item.d = d;
    if (meta.lang) item.lang = meta.lang;
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
${packs.map(p => `  { id:${JSON.stringify(p.id)}, name:${JSON.stringify(p.name)}, note:${JSON.stringify(p.note)}, on:${!!p.on}, items:[
${p.items.map(a => `    {id:'${a.id}',t:${JSON.stringify(a.t)},tags:${JSON.stringify(a.tags)},min:${a.min},cost:${a.cost}${a.d ? `,d:${JSON.stringify(a.d)}` : ''}${a.lang ? `,lang:${JSON.stringify(a.lang)}` : ''}},`).join('\n')}
  ]},`).join('\n')}
];
`;
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
  sayDupes();
  process.exit(0);
}

writeFileSync(target, out);
console.log(packs.map(p => `${p.items.length.toString().padStart(4)}  ${p.id}${p.on ? '' : '  (off by default)'}`).join('\n'));
console.log(`${packs.reduce((n, p) => n + p.items.length, 0)} activities → js/activities.js`);
sayDupes();
