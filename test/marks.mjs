// Renders every mark in the vocabulary to test/shots/marks.png, large and at
// the size it is actually used, grouped the way the vocabulary is grouped.
//   node test/marks.mjs
// Paths written blind are paths that look wrong: draw one, run this, look at
// it. Half of the first set had to be redrawn after seeing this sheet — a nib
// that read as a map pin, an ear as a balloon, a vase as a ring.
import { chromium } from 'playwright';
import { MARKS, TAGS, GROUPS, REDS } from '../js/data.js';
const CHROME = process.env.ACT_CHROME;

const cell = (k) => `<figure class="${REDS.has(k) ? 'red' : ''}">
  <svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="${MARKS[k]}"/></svg>
  <svg class="sm" viewBox="0 0 24 24"><path fill-rule="evenodd" d="${MARKS[k]}"/></svg>
  <figcaption>${TAGS[k]}</figcaption></figure>`;

const html = `<style>
 body{background:#F5F0E4;color:#241f18;font:13px/1.3 -apple-system,sans-serif;margin:0;padding:22px}
 h3{font:600 11px/1 sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#8b8172;margin:22px 0 10px}
 .row{display:flex;flex-wrap:wrap;gap:16px}
 figure{margin:0;width:88px;text-align:center}
 svg{width:52px;height:52px;fill:currentColor;display:block;margin:0 auto}
 svg.sm{width:20px;height:20px;margin-top:5px}
 .red{color:#9E3B34}
 figcaption{margin-top:5px;font-size:10.5px;color:#5c5346}
</style>` + GROUPS.map(([g, keys]) =>
  `<h3>${g}</h3><div class="row">${keys.map(cell).join('')}</div>`).join('');

const b = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
const p = await (await b.newContext({ viewport:{ width:820, height:1400 }, deviceScaleFactor:2 })).newPage();
await p.setContent(html);
await p.waitForTimeout(300);
await p.screenshot({ path:'test/shots/marks.png', fullPage:true });
await b.close();
const missing = Object.keys(TAGS).filter(k => !MARKS[k]);
console.log(`${Object.keys(MARKS).length} marks drawn → test/shots/marks.png`,
  missing.length ? `\nTAGS WITH NO MARK: ${missing}` : '');
process.exit(missing.length ? 1 : 0);
