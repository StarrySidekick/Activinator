/* A hint, not a verdict: named real things hiding among the placeholders.
   -----------------------------------------------------------------------
   "the app... says whose cards these are" — a `seed` row is generated, a
   `folk` one is "a real thing that exists — a known game, a tradition, a
   standard exercise". Most of the 1,260 still-seed rows are ordinary
   AI-suggested activities and genuinely are placeholders. A few of them
   already describe something with an actual name — "Would you rather", a
   six-word story, twenty questions, a pub quiz — and are folk already, they
   just haven't been marked.

   This does not mark anything. Reclassifying a row is exactly the kind of
   call that stays Timothy's — the number is a promise about what he can
   trust the deck to be, and moving it by a script's own guess is the thing
   the instrument exists to catch, not the thing it should do. What this
   does is point: `folkHint(title)` says which named thing a title mentions,
   so a read-through can start with the rows most likely to already be real
   rather than reading all twelve hundred in title order.

   The list is deliberately short and deliberately unambiguous — established
   names for a game, a poetic form, a tradition or a standard exercise, not
   ordinary phrases that happen to describe one. "Play chess" does not
   qualify a chess-shaped activity as folk on its own; "Would you rather"
   names an actual thing. False negatives are fine here (a miss just means a
   row waits for a human read, same as before); a false positive would put a
   word in Timothy's mouth, so an entry only goes in this list if the name
   could not plausibly mean anything else. */
const NAMED = [
  'would you rather', 'twenty questions', 'truth or dare', 'never have i ever',
  'two truths and a lie', 'charades', 'pictionary', 'scrabble', 'jenga', 'bingo',
  'mad libs', 'exquisite corpse',
  'six-word story', 'found poem', 'erasure poem', 'haiku', 'limerick', 'sonnet', 'villanelle',
  'crossword', 'word search', 'sudoku', 'jigsaw',
  'capture the flag', 'freeze tag', 'hide and seek', 'musical chairs', 'duck duck goose',
  'hopscotch', 'double dutch', 'cat’s cradle', 'cat\'s cradle', 'rock paper scissors', 'tic-tac-toe',
  'scavenger hunt', 'geocaching', 'letterboxing', 'postcrossing', 'couch to 5k',
  'time capsule', 'bucket list', 'vision board', 'mood board',
  'trivia night', 'pub quiz', 'open mic', 'karaoke', 'silent disco', 'flash mob',
  'book club', 'supper club', 'potluck', 'clothing swap', 'seed swap', 'skill share', 'time bank',
];

/* Case-insensitive, and matched as a whole phrase rather than word-by-word —
   "twenty" alone means nothing, "twenty questions" is the game. Returns the
   name it found, or null. */
const folkHint = (title) => {
  const t = String(title || '').toLowerCase();
  return NAMED.find(name => t.includes(name)) || null;
};

export { NAMED, folkHint };
