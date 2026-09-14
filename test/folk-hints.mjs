/* The folk-candidate hint, on its own. No browser: this is string matching,
   not the app.
   node test/folk-hints.mjs */
import { folkHint } from '../scripts/folk-hints.mjs';

const fails = [];
const ok = (name, cond, got) => cond ? console.log('  ok   ' + name)
                                     : fails.push(`${name} — got ${JSON.stringify(got)}`);

// Names it a real, specific thing to catch.
ok('finds a named question game',
   folkHint('Ask each other Would you rather until somebody stalls') === 'would you rather');
ok('finds a named format at the front of the title',
   folkHint('Twenty questions, but about the room you are sitting in') === 'twenty questions');
ok('is case-insensitive',
   folkHint('WOULD YOU RATHER, five rounds') === 'would you rather');
ok('finds a poetic form',
   folkHint('Write a haiku about the last thing you ate') === 'haiku');
ok('finds a real-world tradition',
   folkHint('Go to a pub quiz with people you just met') === 'pub quiz');

// This is what proves the test can fail, not just pass: break the thing on
// purpose and watch it catch it. `chess` describes a chess-shaped activity
// but names nothing more specific than the game everybody already knows is
// real — it must NOT be treated as evidence a placeholder is folk, or the
// list starts vouching for anything with a familiar word in it.
ok('an ordinary word is not a named format',
   folkHint('Play chess with a stranger in the park') === null);
ok('an unrelated placeholder finds nothing',
   folkHint('Write the first page of the thing you keep meaning to write') === null);
ok('empty title finds nothing', folkHint('') === null);
ok('undefined title finds nothing', folkHint(undefined) === null);

if (fails.length) { console.error('\nFAIL\n' + fails.join('\n')); process.exit(1); }
console.log('\nthe hint finds what it should and nothing else');
