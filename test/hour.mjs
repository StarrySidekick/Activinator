/* The clock's rule, on its own. No browser: this is arithmetic about hours,
   and a test that had to run at midnight to check the midnight case would
   never be run. `suggestionFor` and `offerNow` both take an injectable `now`
   for exactly that reason.
   node test/hour.mjs */
import { suggestionFor, offerNow } from '../js/hour.js';

const fails = [];
const ok = (name, cond, got) => cond ? console.log('  ok   ' + name)
                                     : fails.push(`${name} — got ${JSON.stringify(got)}`);
const at = (h, m = 0) => new Date(2026, 8, 5, h, m);

// Late runs across midnight, so it is a test rather than a pair of numbers.
for (const h of [22, 23, 0, 3, 5]) {
  ok(`${h}:00 is late`, suggestionFor(at(h))?.id === 'late', suggestionFor(at(h)));
}
for (const h of [6, 9, 14, 18, 21]) {
  ok(`${h}:00 has nothing to say`, suggestionFor(at(h)) === null, suggestionFor(at(h)));
}

// Three ways it declines to show, each a case where offering would presume.
ok('offers when the hour warrants it and nothing is set',
   offerNow({ who: '', where: '', time: '' }, null, at(23))?.id === 'late');
ok('says nothing in the afternoon',
   offerNow({ who: '', where: '', time: '' }, null, at(14)) === null);
ok('will not override a where you set yourself',
   offerNow({ where: 'outdoors' }, null, at(23)) === null);
ok('will not override a duration you set yourself',
   offerNow({ time: 'long' }, null, at(23)) === null);
ok('stays dismissed once dismissed',
   offerNow({}, 'late', at(23)) === null);
ok('a who of your own does not silence it — it suggests neither',
   offerNow({ who: 'solo' }, null, at(23))?.id === 'late');

// What it writes has to be ordinary context, or Right now cannot show it.
const s = suggestionFor(at(23));
ok('suggests only fields the context panel owns',
   Object.keys(s.ctx).every(k => ['who', 'where', 'time'].includes(k)), Object.keys(s.ctx));

if (fails.length) { console.error('\nFAIL\n' + fails.join('\n')); process.exit(1); }
console.log('\nthe clock behaves');
