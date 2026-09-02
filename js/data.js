/* Activinator — the deck's raw material, assembled.
   The vocabulary is in vocab.js and the activities are in activities.js, which
   is generated from the CSVs in packs/. This joins the two, so every other
   module can go on importing one place for both.

   An activity is a title and a set of tags. There is no description: a card is
   one thing to go and do, and a second sentence explaining it is a second
   sentence you have to read before you can swipe. The title has to carry it.

   To change what is in the deck, edit a CSV in packs/ and run
   `node scripts/build-activities.mjs`. Never edit js/activities.js. */
import { PACKS } from './activities.js';
export * from './vocab.js';

/* Every activity in every pack, each carrying the pack it came from so the
   pool can be filtered by which ones are switched on. */
const SEEDS = PACKS.flatMap(p => p.items.map(a => ({ ...a, pack: p.id, src: 'seed' })));

export { PACKS, SEEDS };
