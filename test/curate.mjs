/* The Curate loop's other half, on its own — no browser. The README's
   "Curating" section describes it as "take it to a session, or edit the
   packs by it yourself"; scripts/apply-curation.mjs is that second half
   mechanised, and this is the pattern test/hour.mjs already set: pure
   functions, tested directly, so the CLI stays a thin wrapper nobody has to
   drive through a browser to trust.
     node test/curate.mjs */
import { readFileSync, readdirSync } from 'fs';
import { parseCurationCSV, parsePack, serializePack, applyRow } from '../scripts/curation.mjs';

const fails = [];
const ok = (name, cond, got) => cond ? console.log('  ok   ' + name)
                                     : fails.push(`${name} — got ${JSON.stringify(got)}`);

/* — parsing the export — */
const CSV = [
  'verdict,pack,title,minutes,cost,tags,definition,was',
  'keep,core,A kept card,30,free,create casual anywhere,,',
  'cut,core,A cut card,20,free,create casual anywhere,,',
  'out,core,A never-again card,15,free,create casual anywhere,,',
  'edit,words,Nuovo titolo,10,free,learn engaging anywhere,"means new, freshly made",Vecchio titolo'
].join('\n');
const rows = parseCurationCSV(CSV);
ok('reads one row per line after the header', rows.length === 4, rows.length);
ok('splits the verdict and the pack', rows[0].v === 'keep' && rows[0].pack === 'core', rows[0]);
ok('an unedited row carries no `was`', rows[0].was === '', rows[0].was);
ok('a rewrite carries the title the pack still has', rows[3].was === 'Vecchio titolo', rows[3]);
ok('a quoted definition survives', rows[3].d === 'means new, freshly made', rows[3].d);

let threw = null;
try { parseCurationCSV('title,minutes\nx,1'); } catch (e) { threw = e.message; }
ok('refuses a file that is not shaped like a curation export', !!threw, threw);

/* — a pack round-trips byte for byte when nothing about it changed —
   which is what lets applying a curation touch only the rows it actually
   changes, rather than reformatting a whole file around one rewrite. Proved
   here on synthetic text with the two shapes that actually appear in
   packs/ — a plain row and a multi-line quoted definition — and again below
   against every real file, since a real pack is the thing this has to be
   true of. */
const PACK = 'title,minutes,cost,tags,definition\n' +
  'Plain one,30,free,create casual anywhere,\n' +
  '"A title, with a comma",20,frugal,learn engaging home,"line one\nline two"\n';
{
  const p = parsePack(PACK);
  ok('a pack round-trips unchanged', serializePack(p) === PACK, serializePack(p));
}

for (const f of readdirSync(new URL('../packs/', import.meta.url))) {
  if (!f.endsWith('.csv')) continue;
  const text = readFileSync(new URL('../packs/' + f, import.meta.url), 'utf8');
  const round = serializePack(parsePack(text));
  ok(`packs/${f} round-trips unchanged`, round === text,
    round.length !== text.length ? `${round.length} chars vs ${text.length}` : 'differs, same length');
}

/* — applying a row — */
const fresh = () => parsePack(
  'title,minutes,cost,tags,source\n' +
  'Keep me,30,free,create casual anywhere,seed\n' +
  'Cut me,20,free,create casual anywhere,seed\n' +
  'Rewrite me,15,free,create casual anywhere,seed\n'
);

{
  const p = fresh();
  const { action } = applyRow(p, { v: 'cut', pack: 'core', t: 'Cut me', min: '20', cost: 'free', tags: 'create casual anywhere', d: '', was: '' });
  ok('cut removes the row', action === 'removed' && p.items.length === 2, p.items.map(i => i.title));
  ok('cut leaves the others alone', p.items.some(i => i.title === 'Keep me'), p.items);
}

{
  const p = fresh();
  const { action } = applyRow(p, { v: 'out', pack: 'core', t: 'Cut me', min: '20', cost: 'free', tags: 'create casual anywhere', d: '', was: '' });
  ok('out removes the row the same way cut does', action === 'removed', action);
}

{
  const p = fresh();
  const { action } = applyRow(p, { v: 'keep', pack: 'core', t: 'Keep me', min: '30', cost: 'free', tags: 'create casual anywhere', d: '', was: '' });
  ok('an unedited keep is a no-op', action === 'unchanged' && p.items.length === 3, p.items);
  ok('a no-op keep does not touch the source column', p.items[0].source === 'seed', p.items[0]);
}

{
  const p = fresh();
  const { action } = applyRow(p, {
    v: 'edit', pack: 'core', t: 'Rewrite me, better', min: '15', cost: 'free',
    tags: 'create casual anywhere', d: '', was: 'Rewrite me'
  });
  const row = p.items.find(i => i.title === 'Rewrite me, better');
  ok('edit matches on `was`, not on the new title', action === 'updated' && !!row, p.items);
  ok('edit leaves the row count alone', p.items.length === 3, p.items.length);
  ok('a rewrite does not touch the source column', row.source === 'seed', row);
}

{
  // a card can be rewritten and judged in the same sitting — `keep` then
  // carries the rewrite exactly as `edit` does, per curationCSV in panels.js
  const p = fresh();
  const { action } = applyRow(p, {
    v: 'keep', pack: 'core', t: 'Rewrite me, better', min: '15', cost: 'free',
    tags: 'create casual anywhere', d: '', was: 'Rewrite me'
  });
  ok('a keep carrying a `was` applies the rewrite too', action === 'updated', action);
  ok('and the row is still in the pack afterwards', p.items.some(i => i.title === 'Rewrite me, better'), p.items);
}

ok('a row matching nothing is reported rather than silently dropped',
  applyRow(fresh(), { v: 'cut', pack: 'core', t: 'Never existed', min: '1', cost: 'free', tags: '', d: '', was: '' }).action === 'missing');

{
  // a pack with no definition column must not grow one silently, and a
  // definition arriving for it anyway is worth a warning rather than a loss
  const p = fresh();
  const { action, warn } = applyRow(p, {
    v: 'edit', pack: 'core', t: 'Rewrite me', min: '15', cost: 'free',
    tags: 'create casual anywhere', d: 'a meaning this pack has nowhere to put', was: 'Rewrite me'
  });
  ok('a definition with nowhere to go is reported rather than silently dropped', !!warn, warn);
  ok('and no definition column is added', !('definition' in p.items[2]), p.items[2]);
}

/* — a definition column is threaded through untouched when there is nothing
     to change about it, and updated when there is — */
{
  const p = parsePack('title,minutes,cost,tags,definition\nA word,10,free,learn engaging anywhere,old meaning\n');
  applyRow(p, { v: 'edit', pack: 'words', t: 'A word', min: '10', cost: 'free', tags: 'learn engaging anywhere', d: 'new meaning', was: 'A word' });
  ok('a definition is rewritten in place', p.items[0].definition === 'new meaning', p.items[0]);
}

if (fails.length) { console.error('\nFAIL\n' + fails.join('\n')); process.exit(1); }
console.log('\ncuration applies cleanly');
