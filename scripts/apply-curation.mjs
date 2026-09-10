/* Applies a Curate export back onto packs/*.csv and rebuilds js/activities.js.
     node scripts/apply-curation.mjs path/to/curation.csv [--dry-run]

   "Curating" in the README describes the loop: Menu → Curate exports every
   card you have judged or rewritten, as pack rows with the verdict in front;
   "Take it to a session, or edit the packs by it yourself." This is that —
   the part that used to mean reading eight columns by eye and finding the
   right row in the right file, done instead by the same match a rewrite
   already carries: `was`, the title the pack still has, where there is one.

   Nothing here writes a word of card copy. It moves verdicts and rewrites
   that already exist in the export — typed on a phone, by a person — onto
   the CSVs that are the actual source of truth. A pack this run never
   touches is left exactly as it was on disk, byte for byte. */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import { parseCurationCSV, parsePack, serializePack, applyRow } from './curation.mjs';

const file = process.argv[2];
const dry = process.argv.includes('--dry-run');
if (!file || file.startsWith('--')) {
  console.error('usage: node scripts/apply-curation.mjs <curation.csv> [--dry-run]');
  process.exit(1);
}

const packsDir = new URL('../packs/', import.meta.url);
let rows;
try { rows = parseCurationCSV(readFileSync(file, 'utf8')); }
catch (e) { console.error(e.message); process.exit(1); }

if (!rows.length) { console.log('nothing judged or rewritten in that file'); process.exit(0); }

/* A card written on the phone (Write your own) carries no pack — the export
   says `mine`, because that is the only word curationCSV has for "there is
   no CSV this lives in". There is genuinely nothing here to edit: it is not
   a pack row anywhere, only a device's own S.mine. */
const byPack = new Map();
const mineRows = [];
for (const row of rows) {
  if (row.pack === 'mine') { mineRows.push(row); continue; }
  if (!byPack.has(row.pack)) byPack.set(row.pack, []);
  byPack.get(row.pack).push(row);
}

let removed = 0, updated = 0, unchanged = 0, missing = 0, skipped = 0;
const lines = [];

for (const [packId, packRows] of byPack) {
  const path = new URL(packId + '.csv', packsDir);
  if (!existsSync(path)) {
    lines.push(`${packId}: no such pack — ${packRows.length} row(s) skipped`);
    skipped += packRows.length;
    continue;
  }
  const pack = parsePack(readFileSync(path, 'utf8'));
  let dirty = false;
  for (const row of packRows) {
    const { action, warn } = applyRow(pack, row);
    const name = row.was ? `"${row.was}" -> "${row.t}"` : `"${row.t}"`;
    if (action === 'removed') { removed++; dirty = true; lines.push(`${packId}: ${row.v} — removed ${name}`); }
    else if (action === 'updated') { updated++; dirty = true; lines.push(`${packId}: rewrote ${name}`); }
    else if (action === 'unchanged') unchanged++;
    else if (action === 'missing') { missing++; lines.push(`${packId}: not found — ${name} (already applied?)`); }
    else { skipped++; lines.push(`${packId}: unrecognised verdict "${row.v}" on ${name}`); }
    if (warn) lines.push(`${packId}: ${name} ${warn}`);
  }
  /* Only a pack this run actually changed gets written — parsePack then
     serializePack round-trips byte-identical (test/curate.mjs guards it), so
     a pack with nothing but `unchanged` rows in it is left untouched rather
     than quietly reformatted for no reason. */
  if (dirty && !dry) writeFileSync(path, serializePack(pack));
}

console.log(lines.join('\n'));
console.log(`\n${removed} removed, ${updated} rewritten, ${unchanged} already matched, ` +
  `${missing} not found, ${skipped} skipped` + (dry ? '  (dry run — nothing written)' : ''));
if (mineRows.length)
  console.log(`\n${mineRows.length} row(s) were written on a phone, not from a pack — nothing to edit for ` +
    'them here. Copy the ones worth keeping into a pack yourself (Menu → Packs has them as pack rows).');

if (!dry && (removed || updated)) {
  console.log('\nrebuilding js/activities.js —\n');
  try {
    execFileSync(process.execPath, [new URL('build-activities.mjs', import.meta.url).pathname], { stdio: 'inherit' });
  } catch (e) {
    console.error('\nthe rebuild failed — the packs were changed but js/activities.js was not. Fix the row the ' +
      'error names, then run: node scripts/build-activities.mjs');
    process.exit(1);
  }
}
