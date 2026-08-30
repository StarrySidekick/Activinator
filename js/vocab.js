/* Activinator — the vocabulary.
   Tags, their groups, their marks, and the three questions the deck asks. It
   is its own module because `scripts/build-activities.mjs` validates the packs
   against it, and importing data.js to do that would mean importing the
   activities the build has not written yet. */

/* The vocabulary, in the order it is read and drawn. A tag belongs to exactly
   one group; the group is for reading, not for scoring. Labels are lower case
   everywhere, including here. */
const GROUPS = [
  ['Doing',      ['create','organize','clean','repair','try','play','move','learn','kindness']],
  ['Making',     ['writing','visualart','drawing','painting','sculpting','mixedmedia','clothes','music','acting','dancing','film']],
  ['Experience', ['watch','listen','read','travel','eat']],
  ['Thinking',   ['question']],                                // a card that asks rather than tells
  ['Where',      ['anywhere','indoors','outdoors','home']],
  ['Who',        ['solo','partner','friends','newpeople']],
  ['How hard',   ['casual','engaging','challenging']],          // a scale: exactly one
  ['Mood',       ['adventurous','funny','mindful','spooky','nostalgic','romantic']],
  ['Duration',   ['quick','short','medium','long','allday']],   // derived from the minutes
  ['Cost',       ['free','frugal','costly']]                    // derived from the cost
];

const TAGS = {
  create:'create', organize:'organize', clean:'clean', repair:'repair', try:'try',
  play:'play', move:'move', learn:'learn', kindness:'kindness',

  writing:'writing', visualart:'visual art', drawing:'drawing', painting:'painting',
  sculpting:'sculpting', mixedmedia:'mixed media', clothes:'clothes', music:'music',
  acting:'acting', dancing:'dancing', film:'film',

  watch:'watch', listen:'listen', read:'read', travel:'travel', eat:'eat',

  question:'question',

  anywhere:'anywhere', indoors:'indoors', outdoors:'outdoors', home:'home',

  solo:'solo', partner:'partner', friends:'friends', newpeople:'new people',

  casual:'casual', engaging:'engaging', challenging:'challenging',

  adventurous:'adventurous', funny:'funny', mindful:'mindful', spooky:'spooky',
  nostalgic:'nostalgic', romantic:'romantic',

  quick:'quick', short:'short', medium:'medium length', long:'long', allday:'all day',

  free:'free', frugal:'frugal', costly:'costly'
};

/* Activinator — the marks.
   Hand-drawn silhouettes, one per tag, in the manner of the suits on a playing
   card: solid, symmetrical where they can be, and readable at fourteen pixels
   because that is the size they are actually used at. No emoji — those are
   somebody else's drawings and they never sat right on cream paper.

   Every path is a 24×24 box filled with `evenodd`, so a subpath inside another
   is a hole and a subpath inside that is filled again — which is how the eye
   gets a pupil and the key gets its bow.

   The four scales — who, how hard, duration, cost — are families rather than
   pictures. One pip, two pips, three; one bar, two, three; a dial filling by
   fifths; a diamond hollow, part-filled, solid. A scale drawn as five
   unrelated pictures is a scale nobody can read. */
const MARKS = {
  // — doing —
  create:'M12 1.6c.9 4.6 2.4 6.1 7 7-4.6.9-6.1 2.4-7 7-.9-4.6-2.4-6.1-7-7 4.6-.9 6.1-2.4 7-7Z M19.4 15.2c.4 2.1 1.1 2.8 3.2 3.2-2.1.4-2.8 1.1-3.2 3.2-.4-2.1-1.1-2.8-3.2-3.2 2.1-.4 2.8-1.1 3.2-3.2Z',
  organize:'M3 3h8v8H3Z M13 3h8v8h-8Z M3 13h8v8H3Z M13 13h8v8h-8Z',
  clean:'M12 1.8c.6.7 7.4 8.6 7.4 13A7.4 7.4 0 0 1 4.6 14.8c0-4.4 6.8-12.3 7.4-13Z M12 5.6c-1.9 2.4-5.4 7.2-5.4 9.2a5.4 5.4 0 0 0 2.3 4.4c-.6-1-.9-2.1-.9-3.3 0-2 1.6-5 4-8Z',
  repair:'M12 1.8 21 7v10l-9 5.2L3 17V7Z M12 7.6A4.4 4.4 0 1 0 12 16.4 4.4 4.4 0 0 0 12 7.6Z',
  try:'M4.8 2.6h14.4a2.2 2.2 0 0 1 2.2 2.2v14.4a2.2 2.2 0 0 1-2.2 2.2H4.8a2.2 2.2 0 0 1-2.2-2.2V4.8a2.2 2.2 0 0 1 2.2-2.2Z M7.6 5.9a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Z M12 10.3a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Z M16.4 14.7a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Z',
  play:'M12 1.8a3.4 3.4 0 0 1 2 6.2c1.9 1.2 3.1 3.1 3.4 5.6H6.6c.3-2.5 1.5-4.4 3.4-5.6a3.4 3.4 0 0 1 2-6.2Z M6.2 15.2h11.6l1.6 6.8H4.6Z',
  move:'M2.6 3.4 12.4 12l-9.8 8.6Z M11.6 3.4 21.4 12l-9.8 8.6Z',
  learn:'M12 2.4 23 8l-11 5.6L1 8Z M5.6 11.2v4.6c0 2.2 2.9 3.9 6.4 3.9s6.4-1.7 6.4-3.9v-4.6L12 14.6Z',
  kindness:'M12 6.4c-.9-2.4-2.2-3.6-3.8-3.6a2.6 2.6 0 0 0 0 5.2H12Zm0 0c.9-2.4 2.2-3.6 3.8-3.6a2.6 2.6 0 0 1 0 5.2H12Z M2.8 9.2h18.4v3.6H2.8Z M4.4 14h15.2v7.6H4.4Z M10.6 9.2h2.8v12.4h-2.8Z',

  // — making —
  writing:'M12 22.4 6.9 12.6c-1-2-.6-4.6 1-6.6L12 1.6l4.1 4.4c1.6 2 2 4.6 1 6.6Z M12 7.3a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Z M11.3 11.6h1.4v7.6h-1.4Z',
  visualart:'M12 2.6c5.6 0 9.6 3.5 9.6 7.7 0 2.7-2 4.3-4.4 4.3h-1.9c-1.3 0-2.3.9-2.3 2 0 .5.2.9.5 1.3.3.4.5.8.5 1.3 0 1.2-1 2-2.3 2C6.4 21.2 2.4 16.8 2.4 11.8c0-5.1 4.2-9.2 9.6-9.2Z M7.4 8.4a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z M11.2 5.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z M15.8 6.8a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z',
  drawing:'M17.4 1.8 22.2 6.6 19.6 9.2 14.8 4.4Z M13.4 5.8 18.2 10.6 7.9 20.9 3.1 16.1Z M2 17.4 6.6 22 1.4 22.6Z',
  painting:'M18.4 1.8a3 3 0 0 1 3.8 3.8c-.5 1.5-5.8 6.6-7.4 8.2l-4.6-4.6c1.6-1.6 6.7-6.9 8.2-7.4Z M9.4 10.6l4 4-1.6 1.6c-.7.7-1.6 1-2.5.8-1.2-.3-2 .3-2.5 1.2-.7 1.3-2 2.5-3.8 2.7-.6.1-1-.4-.8-1 .5-1.3.4-2.5-.1-3.4-.3-.5 0-1.1.6-1.2 1.4-.3 2.3-1.1 2.8-2.1.4-.9 1.2-1.4 2.2-1.4.5 0 1-.2 1.7-.8Z',
  sculpting:'M12 2.2a3.7 3.7 0 1 1 0 7.4 3.7 3.7 0 0 1 0-7.4Z M12 10.6c3.7 0 6.4 2.5 7 6.6H5c.6-4.1 3.3-6.6 7-6.6Z M4 18.4h16v3.4H4Z',
  mixedmedia:'M2.4 11.6h10.4v10.4H2.4Z M15.2 2.2a6.6 6.6 0 1 1 0 13.2 6.6 6.6 0 0 1 0-13.2Z',
  clothes:'M8.6 1.8 4 4.4 1.6 9.2l4.2 2.2 1-1.9V22.2h10.4V9.5l1 1.9 4.2-2.2L20 4.4l-4.6-2.6c-.6 1.5-1.9 2.4-3.4 2.4S9.2 3.3 8.6 1.8Z',
  music:'M17.6 1.6c.5 3.6-1 5.6-4.3 6.6v8.2a4.1 3.2 0 1 1-2-2.7V1.6Z',
  acting:'M3.6 3.4h16.8c0 7.4-1.6 11.6-4.2 14.2-1.6 1.6-3.2 2.8-4.2 2.8s-2.6-1.2-4.2-2.8C5.2 15 3.6 10.8 3.6 3.4Z M8.6 7.4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z M15.4 7.4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z M7.6 13.4h8.8c-.6 2.2-2.4 3.6-4.4 3.6s-3.8-1.4-4.4-3.6Z',
  dancing:'M14.2 1.8a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2Z M20.6 2.4 22.4 4.8l-5.6 3.7 1.1 3 4 5.1-2.5 1.9-4.2-5.4-1 1.6 2 6.6-3 .9-2.2-7.3c-.2-.8-.1-1.7.3-2.4l2.3-3.8-2.1.7-3.9 3.3-2-2.4 4.4-3.7c.3-.3.7-.5 1.1-.6l4-1.2c1-.3 2 .1 2.6.9Z',
  film:'M2.6 2.6h18.8v18.8H2.6Z M4.6 4.9h2.6v2.2H4.6z M16.8 4.9h2.6v2.2h-2.6z M4.6 9.1h2.6v2.2H4.6z M16.8 9.1h2.6v2.2h-2.6z M4.6 13.3h2.6v2.2H4.6z M16.8 13.3h2.6v2.2h-2.6z M4.6 17.5h2.6v2.2H4.6z M16.8 17.5h2.6v2.2h-2.6z M8.4 6.4h7.2v4.6H8.4z M8.4 13h7.2v4.6H8.4z',

  // — experience —
  watch:'M12 4.4c5.6 0 9.8 4.4 10.8 7.6-1 3.2-5.2 7.6-10.8 7.6S2.2 15.2 1.2 12C2.2 8.8 6.4 4.4 12 4.4Z M12 6.6c-3.9 0-7.1 3-8.3 5.4 1.2 2.4 4.4 5.4 8.3 5.4s7.1-3 8.3-5.4c-1.2-2.4-4.4-5.4-8.3-5.4Z M12 8.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z',
  listen:'M2.4 9h4L11 4.6v14.8L6.4 15h-4Z M13.6 8.2a5.4 5.4 0 0 1 0 7.6l-1.7-1.7a3 3 0 0 0 0-4.2Z M16.4 5.2a8.6 8.6 0 0 1 0 13.6l-1.7-1.7a6.4 6.4 0 0 0 0-10.2Z',
  read:'M12 6.2C10 4.4 6.6 3.6 2.6 4v13.8c4-.4 7.4.4 9.4 2.2 2-1.8 5.4-2.6 9.4-2.2V4c-4-.4-7.4.4-9.4 2.2Z M11.2 8.1c-1.8-1.2-4.2-1.8-6.7-1.8v9.4c2.5 0 4.9.5 6.7 1.5Z M12.8 8.1v9.1c1.8-1 4.2-1.5 6.7-1.5V6.3c-2.5 0-4.9.6-6.7 1.8Z',
  travel:'M12 1.2 13.7 10.3 22.8 12 13.7 13.7 12 22.8 10.3 13.7 1.2 12 10.3 10.3Z M17.8 6.2 14.6 9.4 14.6 6.2Z M17.8 17.8 14.6 14.6 17.8 14.6Z M6.2 17.8 9.4 14.6 9.4 17.8Z M6.2 6.2 9.4 9.4 6.2 9.4Z',
  eat:'M11 4.6h2v2.2h-2Z M3.8 7.4h16.4v2.4H3.8Z M5 10.2h14v3.6c0 3.9-3.1 7-7 7s-7-3.1-7-7Z M1.4 11h3.6v2.8H1.4Z M19 11h3.6v2.8H19Z',

  // — thinking: the glyph itself, since that is what the card is doing —
  question:'M6.1 7.6A5.9 5.9 0 0 1 17.9 7.6C17.9 11.4 13.4 11.8 13.4 15V17.6H10.6V14.4C10.6 11.4 15.3 11 15.3 7.6A3.3 3.3 0 0 0 8.7 7.6Z M12 19.2a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8Z',

  // — where —
  anywhere:'M12 1.9a10.1 10.1 0 1 0 0 20.2 10.1 10.1 0 0 0 0-20.2Zm0 1.6a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Z M12 3.6c-2.1 0-3.6 3.8-3.6 8.4s1.5 8.4 3.6 8.4 3.6-3.8 3.6-8.4S14.1 3.6 12 3.6Zm0 1.5c.9 0 2.1 2.9 2.1 6.9s-1.2 6.9-2.1 6.9-2.1-2.9-2.1-6.9S11.1 5.1 12 5.1Z M3.8 11.3h16.4v1.5H3.8Z',
  indoors:'M2.6 2.6h18.8v18.8H2.6Z M5.2 5.2h5.5v5.5H5.2Z M13.3 5.2h5.5v5.5h-5.5Z M5.2 13.3h5.5v5.5H5.2Z M13.3 13.3h5.5v5.5h-5.5Z',
  outdoors:'M12 1.6 16.8 8.4H7.2Z M12 6.2 18 14H6Z M12 10.6 20.6 20.4H3.4Z M10.6 19.6h2.8v2.8h-2.8Z',
  home:'M12 1.9 22.8 11.5H19.5V22H4.5V11.5H1.2Z M10.4 14.6h3.2V22h-3.2Z',

  // — who: pips, the way a card counts —
  solo:'M12 7.4a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2Z',
  partner:'M7.8 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z M16.2 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z',
  friends:'M12 3.4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z M6.6 13.2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z M17.4 13.2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z',
  newpeople:'M12 3.4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm0 1.7a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6Z M6.6 13.2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z M17.4 13.2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z',

  // — how hard: one bar, two, three —
  casual:'M4 15.4h4v5.4H4Z M10 10.6h4v10.2h-4Zm1.2 1.2v7.8h1.6v-7.8Z M16 5.4h4v15.4h-4Zm1.2 1.2v13h1.6v-13Z',
  engaging:'M4 15.4h4v5.4H4Z M10 10.6h4v10.2h-4Z M16 5.4h4v15.4h-4Zm1.2 1.2v13h1.6v-13Z',
  challenging:'M4 15.4h4v5.4H4Z M10 10.6h4v10.2h-4Z M16 5.4h4v15.4h-4Z',

  // — duration: a dial filling by fifths —
  quick:'M12 2.2a9.8 9.8 0 1 0 0 19.6 9.8 9.8 0 0 0 0-19.6Zm0 1.9a7.9 7.9 0 1 1 0 15.8 7.9 7.9 0 0 1 0-15.8Z M12 12 L12 3 A9 9 0 0 1 20.56 9.22 Z',
  short:'M12 2.2a9.8 9.8 0 1 0 0 19.6 9.8 9.8 0 0 0 0-19.6Zm0 1.9a7.9 7.9 0 1 1 0 15.8 7.9 7.9 0 0 1 0-15.8Z M12 12 L12 3 A9 9 0 0 1 17.29 19.28 Z',
  medium:'M12 2.2a9.8 9.8 0 1 0 0 19.6 9.8 9.8 0 0 0 0-19.6Zm0 1.9a7.9 7.9 0 1 1 0 15.8 7.9 7.9 0 0 1 0-15.8Z M12 12 L12 3 A9 9 0 1 1 6.71 19.28 Z',
  long:'M12 2.2a9.8 9.8 0 1 0 0 19.6 9.8 9.8 0 0 0 0-19.6Zm0 1.9a7.9 7.9 0 1 1 0 15.8 7.9 7.9 0 0 1 0-15.8Z M12 12 L12 3 A9 9 0 1 1 3.44 9.22 Z',
  allday:'M12 2.2a9.8 9.8 0 1 0 0 19.6 9.8 9.8 0 0 0 0-19.6Z',

  // — cost: a diamond, hollow to solid —
  free:'M12 1.8 21.4 12 12 22.2 2.6 12Z M12 5.2 5.7 12l6.3 6.8 6.3-6.8Z',
  frugal:'M12 1.8 21.4 12 12 22.2 2.6 12Z M12 5.2 5.7 12l6.3 6.8 6.3-6.8Z M12 8 16.7 12 12 16 7.3 12Z',
  costly:'M12 1.8 21.4 12 12 22.2 2.6 12Z',

  // — mood. Red, the way half a deck is red. —
  adventurous:'M1.8 20.8 8.6 7.4 12.4 14.6 14.8 10.4 22.2 20.8Z',
  funny:'M12 1.9a10.1 10.1 0 1 0 0 20.2 10.1 10.1 0 0 0 0-20.2Z M8.5 7.6a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z M15.5 7.6a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z M6.2 13.2h11.6a5.8 5.8 0 0 1-11.6 0Z',
  mindful:'M12 1.8c3.5 3.8 5.6 6.7 5.6 10 0 3.8-2.5 6.5-5.6 6.5S6.4 15.6 6.4 11.8c0-1.7.5-3 1.5-4.5.5 1.3 1.2 2.1 2.1 2.5-.4-2.7.4-5.2 2-8Z M9 19.4h6v2.8H9Z',
  spooky:'M12 1.8c4.5 0 8.2 3.7 8.2 8.2v12.2l-2.8-2.1-2.7 2.1-2.7-2.1-2.7 2.1-2.7-2.1-2.8 2.1V10c0-4.5 3.7-8.2 8.2-8.2Z M9.2 8a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Z M14.8 8a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Z',
  nostalgic:'M12 1.6a5.4 5.4 0 0 0-1.4 10.6v9.9h2.8v-2h2.6v-2.4h-2.6v-1.7h2.6v-2.4h-2.6v-1.4A5.4 5.4 0 0 0 12 1.6Z M12 4.9a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
  romantic:'M12 21.4C4.1 16 1.4 12.5 1.4 8.8 1.4 5.5 4 3 7.2 3c2 0 3.8 1 4.8 2.6C13.1 4 14.9 3 16.8 3 20 3 22.6 5.5 22.6 8.8c0 3.7-2.7 7.2-10.6 12.6Z'
};

/* Mood is red and everything else is ink — half a deck is red, and it is the
   half that is about how a thing feels. */
const REDS = new Set(['adventurous','funny','mindful','spooky','nostalgic','romantic']);

/* The three questions the deck asks before it deals, each one an axis of the
   vocabulary rather than a parallel set of words. The first option in each
   never filters. */
const WHO   = [['','anyone'],['solo','solo'],['partner','partner'],['friends','friends'],['newpeople','new people']];
const WHERE = [['','anywhere at all'],['indoors','indoors'],['outdoors','outdoors'],['home','home']];
const TIME  = [['','any length'],['quick','quick'],['short','short'],['medium','medium length'],['long','long'],['allday','all day']];

/* Duration is a band, not a number. The minutes stay because a band has to be
   worked out from something and because the list still says how long a thing
   takes, but nothing else reads them. */
const DURATIONS = ['quick','short','medium','long','allday'];
const durationOf = (min) => min < 5 ? 'quick' : min < 30 ? 'short'
  : min <= 120 ? 'medium' : min < 360 ? 'long' : 'allday';
const COSTS = ['free','frugal','costly'];

/* An id is derived from the title, never from the position in the list. It was
   `'s' + index`, which meant inserting one activity silently re-pointed every
   verdict after it at a different thing — a "never again" landing on somebody
   else's card. Retitling an activity loses its history, which is right: it is
   a different thing now. */
const idOf = (t) => {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  return 'a' + (h >>> 0).toString(36);
};
export { TAGS, GROUPS, MARKS, REDS, WHO, WHERE, TIME, DURATIONS, COSTS, durationOf, idOf };
