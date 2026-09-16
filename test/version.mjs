// Checks the one thing the "three rules easiest to forget" in CLAUDE.md and
// the bottom of the README both state and neither enforces: CACHE in sw.js
// and APP_VERSION in js/state.js move together, and every file under css/ and
// js/ is in sw.js's SHELL so it is actually there offline.
//   node test/version.mjs
// No server, no browser — it reads the files on disk, the way Bureau's own
// test/version.mjs does for the same reason in that repo.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(path.join(ROOT, f), 'utf8');

const sw = read('sw.js');
const state = read('js/state.js');

const cacheM = sw.match(/const CACHE = 'activinator-v(\d+)'/);
const verM = state.match(/const APP_VERSION = '0\.(\d+)'/);
if (!cacheM) throw new Error("sw.js: couldn't find CACHE = 'activinator-vN'");
if (!verM) throw new Error("js/state.js: couldn't find APP_VERSION = '0.N'");

const cacheN = cacheM[1], verN = verM[1];
const agree = cacheN === verN;

// SHELL entries are './js/x.js' / './css/x.css' — strip the './' to compare
// against what's actually on disk.
const shellM = sw.match(/const SHELL = \[([\s\S]*?)\];/);
if (!shellM) throw new Error("sw.js: couldn't find the SHELL array");
const shell = new Set([...shellM[1].matchAll(/'\.\/([^']+)'/g)].map(m => m[1]));

const onDisk = [
  ...readdirSync(path.join(ROOT, 'js')).map(f => `js/${f}`),
  ...readdirSync(path.join(ROOT, 'css')).map(f => `css/${f}`),
];
const missing = onDisk.filter(f => !shell.has(f));

const result = { cacheN, verN, agree, missingFromShell: missing };
console.log(result);

if (!agree) {
  throw new Error(`CACHE is v${cacheN} but APP_VERSION is 0.${verN} — bump both together (README "Deploying", CLAUDE.md).`);
}
if (missing.length) {
  throw new Error(`Not in sw.js's SHELL, so not there offline: ${missing.join(', ')}`);
}
