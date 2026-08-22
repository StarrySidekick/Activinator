/* Activinator — the deck's raw material.
   An activity is a title and a set of tags. There is no description: a card is
   one thing to go and do, and a second sentence explaining it is a second
   sentence you have to read before you can swipe. The title has to carry it.

   Tags are the whole feature space — the model learns one weight per tag and
   nothing else — and they are also what the deck filters on. Where and who are
   tags like everything else rather than fields of their own: two places to say
   where something happens is two places to keep in step, and they drifted. */

/* The vocabulary, in the order it is read and drawn. A tag belongs to exactly
   one group; the group is for reading, not for scoring. Labels are lower case
   everywhere, including here. */
const GROUPS = [
  ['Doing',      ['create','organize','clean','repair','try','play','move','learn','kindness']],
  ['Making',     ['writing','visualart','drawing','painting','sculpting','mixedmedia','clothes','music','acting','dancing','film']],
  ['Experience', ['watch','listen','read','travel','eat']],
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

/* title | tags | minutes | cost (0 free, 1 frugal, 2 costly) */
const RAW = [
['Write the first page of the thing you keep meaning to write','create writing challenging anywhere',45,0],
['Write a letter by hand and actually post it','create writing kindness casual home',40,0],
['Write down everything you remember about one particular day','create writing nostalgic engaging anywhere',40,0],
['Sit in a café and describe a stranger in two hundred words','create writing engaging indoors',35,1],
['Keep a one-line diary for the rest of the week','create writing mindful casual anywhere',10,0],
['Write a completely serious review of a sandwich','create writing funny casual anywhere',30,0],
['Write a poem in a form you have never used','create writing try challenging anywhere',50,0],
['Write the best possible argument for the thing you disagree with','create writing challenging anywhere',45,0],
['Write a scene that is nothing but dialogue','create writing engaging anywhere',40,0],
['Write down the story your family always tells','create writing nostalgic engaging anywhere',45,0],
['Write a letter to yourself to open in a year','create writing mindful casual home',30,0],
['Invent a word and use it all week','create writing funny casual anywhere',15,0],
['Write six-word stories until one of them lands','create writing funny casual anywhere',25,0],
['Write the opening of a horror story set in your own house','create writing spooky engaging home',40,0],
['Keep a notebook in your pocket all day and fill it','create writing engaging anywhere',60,0],
['Write instructions for something you do without thinking','create writing funny engaging home',35,0],
['Draw the room you are in, badly','create visualart drawing casual mindful home',25,0],
['Redraw a logo you see every day, from memory','create visualart drawing funny casual home',25,0],
['Draw the same object ten times','create visualart drawing engaging home',45,0],
['Draw somebody without once looking at the paper','create visualart drawing funny casual anywhere',20,0],
['Fill one whole page with nothing but circles','create visualart drawing mindful casual home',25,0],
['Draw your street from memory, then walk it and check','create visualart drawing engaging anywhere',60,0],
['Draw with your other hand for half an hour','create visualart drawing funny casual home',30,0],
['Draw a map of somewhere you have never been','create visualart drawing engaging adventurous home',45,0],
['Sit somewhere public and sketch whatever is in front of you','create visualart drawing engaging indoors',45,0],
['Draw a comic strip about your own week','create visualart drawing funny engaging home',60,0],
['Copy a drawing by somebody far better than you','create visualart drawing learn engaging home',60,0],
['Draw the floor plan of every home you have lived in','create visualart drawing nostalgic engaging home',50,0],
['Paint something you are not allowed to be good at','create visualart painting casual home',40,1],
['Paint the view out of one window','create visualart painting engaging home',75,1],
['Mix one colour until it is exactly right','create visualart painting mindful engaging home',40,1],
['Paint something using one colour and white','create visualart painting challenging try home',60,1],
['Paint over something you had already finished','create visualart painting try engaging home',45,0],
['Paint a portrait from a photograph on your phone','create visualart painting challenging home',90,1],
['Buy the cheapest canvas there is and ruin it on purpose','create visualart painting funny casual home',40,1],
['Paint something the size of a postcard and post it to somebody','create visualart painting kindness casual home',45,1],
['Cast your own hand in plaster','create visualart sculpting engaging home',90,1],
['Make something out of what is in the recycling','create visualart mixedmedia funny casual home',60,0],
['Carve a stamp out of an eraser and print with it','create visualart mixedmedia engaging home',45,0],
['Make a collage out of one magazine','create visualart mixedmedia casual home',45,1],
['Model something out of clay with your eyes shut','create visualart sculpting funny try casual home',40,1],
['Make a zine — eight pages out of one sheet of paper','create visualart mixedmedia writing engaging home',90,0],
['Bind your own notebook','create visualart mixedmedia learn engaging home',75,1],
['Mend a garment so that the mend shows','create clothes repair mindful engaging home',45,0],
['Dye something you had got bored of','create clothes try engaging home',90,1],
['Take a jacket in until it actually fits you','create clothes repair challenging home',120,1],
['Make one thing you would otherwise have bought','create visualart mixedmedia challenging try home',120,1],
['Print photographs out and put them on a wall','create visualart nostalgic casual anywhere',45,1],
['Make a mask','create visualart sculpting spooky engaging home',90,1],
['Sew something with no pattern','create clothes challenging try home',120,1],
['Build a tiny shelf for the place that has needed one for months','create repair challenging home',120,1],
['Learn one song all the way through, including the part you skip','create music learn engaging home',60,0],
['Make a playlist that tells a story','create music organize casual anywhere',45,0],
['Make a mixtape for one specific person','create music kindness nostalgic engaging home',60,0],
['Record the sound of somewhere and keep it','create music listen casual outdoors',20,0],
['Write a song about something extremely boring','create music writing funny engaging home',60,0],
['Sing somewhere with very good reverb','create music funny casual anywhere',3,0],
['Learn the first four bars on an instrument you cannot play','create music try challenging home',45,0],
['Work out a song by ear, with no tabs','create music challenging learn home',60,0],
['Play music with somebody else in the room','create music friends engaging anywhere',90,0],
['Make a beat out of household objects','create music funny engaging home',45,0],
['Sing the harmony instead of the tune','create music try engaging anywhere',25,0],
['Busk once, badly, for nobody','create music challenging adventurous indoors newpeople friends',60,0],
['Write down every song you loved at fifteen','create music nostalgic casual anywhere',30,0],
['Learn a song in a language you do not speak','create music try engaging home',60,0],
['Read a play out loud, all the parts, on your own','create acting funny engaging home',90,0],
['Learn a monologue and perform it to a mirror','create acting challenging home',60,0],
['Do a scene with somebody, both of you terrible','create acting friends funny engaging home',60,0],
['Record yourself telling a story and watch it back','create acting challenging home',40,0],
['Learn to do one convincing accent','create acting try engaging home',45,0],
['Improvise a scene with one rule neither of you can break','create acting friends funny engaging home',45,0],
['Read a picture book out loud with full commitment','create acting funny casual home',4,0],
['Dance to three songs with the door shut','create dancing funny move casual home',15,0],
['Learn one dance properly from a video','create dancing learn move engaging home',60,0],
['Go dancing somewhere you would normally leave early','create dancing friends move adventurous engaging indoors newpeople',180,1],
['Dance in the kitchen while the dinner cooks','create dancing romantic funny casual home partner',10,0],
['Learn the steps to something out of a film','create dancing nostalgic learn engaging home',60,0],
['Move for one whole song with your eyes closed','create dancing mindful move casual home',10,0],
['Slow dance to one song in the kitchen','create dancing romantic music casual home partner',10,0],
['Shoot a one-minute film on your phone with no cuts','create film challenging anywhere',60,0],
['Film the same place at four different times of day','create film mindful engaging outdoors',90,0],
['Make a title sequence for a film that does not exist','create film funny engaging home',90,0],
['Learn to edit one thing properly','create film learn challenging home',120,0],
['Film somebody you love doing the thing they always do','create film kindness nostalgic engaging anywhere',45,0],
['Remake a scene you know by heart, badly','create film acting funny friends engaging anywhere',120,0],
['Shoot a whole roll of film and wait a week for it','create film visualart adventurous engaging outdoors',120,1],
['Make a stop-motion ten seconds long','create film funny challenging home',120,0],
['Take a hundred photographs of one object','create visualart engaging learn home',45,0],
['Photograph ten things that are all the same colour','create visualart engaging outdoors',60,0],
['Take photographs at night on a long exposure','create visualart film spooky engaging outdoors',90,0],
['Clear one surface completely and then stop','organize clean mindful casual home',30,0],
['Rearrange one room properly','organize move challenging home',150,0],
['Put every photograph from one year into an album','organize nostalgic engaging anywhere',60,0],
['Deal with the drawer of paper','organize challenging home',60,0],
['Work out one thing about your own money','organize learn engaging home',40,0],
['Write down ten things you would do with a free Saturday','organize writing casual anywhere',20,0],
['Put your books in an order that means something','organize funny engaging home',60,0],
['Cancel one subscription you had forgotten about','organize casual home',15,0],
['Plan next week on paper rather than on a screen','organize mindful casual home',30,0],
['Give away five things today','organize kindness casual home',45,0],
['Name every file on your desktop properly','organize casual home',40,0],
['Make a list of everybody you owe a message','organize kindness casual anywhere',20,0],
['Sort your clothes into what you actually wear','organize challenging clothes home',90,0],
['Empty one box you have not opened since you moved','organize nostalgic engaging home',60,0],
['Write down what you want this year to have in it','organize writing mindful engaging anywhere',45,0],
['Put every tool back where tools go','organize repair casual home',40,0],
['Put your affairs in order for exactly one hour','organize mindful engaging home',60,0],
['Clean the one thing you always look past','clean casual home',25,0],
['Wash the windows and notice the difference all week','clean engaging home',60,0],
['Clean your keyboard properly','clean casual home',20,0],
['Descale everything that can be descaled','clean engaging home',45,0],
['Take everything out of the fridge and start again','clean engaging home',60,0],
['Polish something until it looks new','clean mindful engaging home',40,0],
['Clean your shoes','clean mindful casual home',25,0],
['Sweep outside your own front door','clean kindness casual home',20,0],
['Do the washing up with the radio on and no hurry','clean mindful listen casual home',30,0],
['Clean out whatever you drive or ride','clean engaging home',60,0],
['Fix the thing you have been stepping over','repair casual home',30,0],
['Find out what is actually wrong with it before buying another','repair learn engaging home',45,0],
['Glue the broken thing back together and let the join show','repair create mindful engaging home',45,0],
['Sharpen every knife in the house','repair engaging learn home',40,1],
['Oil the hinge that has been squeaking for months','repair casual home',5,0],
['Replace a fuse, a washer or a battery yourself','repair learn casual home',30,1],
['Take something broken apart just to see inside it','repair try challenging home',60,0],
['Patch the wall you have been ignoring','repair engaging home',60,1],
['Restring, retune or re-fit something you own','repair engaging learn home',45,1],
['Fix somebody else’s broken thing','repair kindness engaging anywhere',60,0],
['Learn how the boiler, the fuse box or the lock actually works','repair learn engaging home',40,0],
['Try a class you would be visibly bad at','try learn challenging indoors newpeople friends',90,2],
['Learn twenty words of a language you will never speak','try learn casual anywhere',30,0],
['Teach yourself one knot','try learn casual anywhere',15,0],
['Learn to do one pull-up','try move challenging home',20,1],
['Learn to fold one good paper thing','try create casual mindful home',30,0],
['Learn to make one cocktail properly','try eat learn engaging home',40,1],
['Cook with one ingredient you have never used','try eat engaging home',90,1],
['Learn five trees on your own street','try learn casual outdoors',40,0],
['Learn to identify five birds by their sound','try learn mindful engaging outdoors',45,0],
['Try the food you decided you hated as a child','try eat funny casual anywhere',40,1],
['Learn one card trick well enough to fool somebody','try play funny engaging home',60,0],
['Learn to juggle three things','try play move challenging anywhere',45,0],
['Write with your other hand for a whole day','try funny casual anywhere',20,0],
['Learn to whistle properly','try funny casual anywhere',20,0],
['Find out where your water comes from, then go and look at it','try learn engaging anywhere',90,0],
['Watch a film by somebody whose name you do not know','watch try engaging home',120,1],
['Watch something in a language you do not speak','watch try engaging home',110,0],
['Go to a matinee on your own','watch solo casual indoors',150,2],
['Watch the film one of you loves and the other has never seen','watch romantic engaging home partner',150,0],
['Watch the sun come up','watch mindful engaging outdoors',75,0],
['Watch a horror film with all the lights off','watch spooky engaging home',110,0],
['Go to a gallery and look at one room only','watch mindful engaging indoors',60,1],
['Watch a sport you do not understand until you work out the rules','watch try funny engaging anywhere',90,0],
['Watch the film that terrified you as a child','watch spooky nostalgic engaging home',110,0],
['Sit somewhere busy and watch people for an hour','watch mindful casual indoors',60,0],
['Watch a documentary about something you would never choose','watch try engaging home',90,0],
['Go to a play, even a bad one','watch acting engaging indoors newpeople friends',180,2],
['Watch the whole credits and look up one name','watch funny casual home',4,0],
['Watch a thunderstorm from somewhere dry','watch mindful casual anywhere',30,0],
['Listen to an album in the dark, start to finish','listen music mindful engaging home',45,0],
['Find out what your favourite band listened to','listen music learn engaging anywhere',60,0],
['Go and see live music by somebody you have never heard of','listen music adventurous engaging indoors newpeople friends',180,2],
['Learn the names of five instruments in a piece you love','listen music learn engaging anywhere',35,0],
['Listen to a whole radio station from another country','listen try casual anywhere',45,0],
['Sit outside and listen with your eyes closed for ten minutes','listen mindful casual outdoors',15,0],
['Listen to the album that was everything when you were seventeen','listen music nostalgic casual anywhere',45,0],
['Ask somebody to play you their favourite song and say nothing','listen music friends kindness casual anywhere',20,0],
['Listen to a podcast about something you would never search for','listen try casual anywhere',45,0],
['Put on music from the year you were born','listen music nostalgic funny casual anywhere',40,0],
['Read the Wikipedia article you keep meaning to read','read learn casual anywhere',30,0],
['Reread the book that mattered when you were seventeen','read nostalgic engaging home',180,0],
['Read a whole magazine about something you know nothing about','read try casual anywhere',60,1],
['Read a short story out loud to somebody','read friends kindness engaging home',45,0],
['Read the same short story as somebody else and argue about it','read romantic friends engaging home partner',90,0],
['Read a ghost story in bed with one lamp on','read spooky casual home',45,0],
['Go to a library with no idea what you want','read adventurous casual indoors',60,0],
['Read the first chapter of five books and keep one','read casual anywhere',60,1],
['Read a poem a day until the week is out','read mindful casual anywhere',10,0],
['Read something written more than two hundred years ago','read challenging try anywhere',60,0],
['Read the local history of your own street','read learn nostalgic engaging anywhere',90,0],
['Read a whole book in one sitting','read challenging home',300,0],
['Walk to the furthest point you can reach in thirty minutes','travel move casual outdoors',60,0],
['Take the first bus that arrives and ride it to the end','travel adventurous funny engaging indoors',180,1],
['Get off two stops early and walk the rest','travel move casual outdoors',45,0],
['Take a train one stop past where you usually get off','travel romantic adventurous engaging indoors partner',240,1],
['Go somewhere by train with no bag and come back at night','travel adventurous engaging indoors',480,2],
['Climb the highest thing nearby and look at where you live','travel move engaging outdoors',90,0],
['Find water and follow it downstream until it gets boring','travel move engaging outdoors',120,0],
['Walk one long road from end to end','travel move challenging outdoors',180,0],
['Go to the place tourists come to and be a tourist','travel funny casual indoors',120,1],
['Sleep outside','travel adventurous challenging outdoors',600,1],
['Walk a route you know well, at night','travel mindful casual outdoors',45,0],
['Go somewhere with no map and no plan','travel adventurous engaging outdoors',75,0],
['Find the oldest thing near you and go and stand next to it','travel learn nostalgic casual indoors',75,0],
['Get up at five and go somewhere','travel adventurous engaging outdoors',180,0],
['Cycle somewhere you would normally drive','travel move engaging outdoors',75,0],
['Go and look at a building you have only ever seen photographs of','travel learn engaging indoors',120,1],
['Take a ferry for no reason','travel adventurous casual outdoors',120,1],
['Go somewhere neither of you has ever been','travel romantic adventurous engaging outdoors partner',240,1],
['Cook something you have never cooked, properly','eat create engaging home',120,1],
['Make bread from scratch','eat create engaging home',240,0],
['Eat at the place you always walk past','eat casual indoors newpeople friends',90,1],
['Make a proper breakfast on a weekday','eat mindful kindness casual home',45,0],
['Bake something and give it away','eat create kindness engaging home',120,1],
['Have a picnic in unglamorous weather','eat mindful casual outdoors',75,1],
['Shop at a market instead of a supermarket','eat casual indoors newpeople friends',75,1],
['Cook the thing your family used to make','eat create nostalgic kindness engaging home',120,1],
['Eat somewhere serving a cuisine you cannot name','eat try adventurous casual indoors',90,1],
['Cook one dish together with no recipe between you','eat romantic create friends engaging home partner',120,1],
['Go out for breakfast before work','eat romantic casual indoors partner',75,1],
['Make the most complicated thing in the book','eat challenging create home',300,2],
['Eat by candlelight on an ordinary Tuesday','eat romantic mindful casual home partner',60,0],
['Cook for somebody who does not usually get cooked for','eat kindness friends create engaging home',150,1],
['Grow one thing you can eat','eat create engaging home',60,1],
['Pick something wild and eat it','eat try learn engaging outdoors',60,0],
['Eat a meal with no phone anywhere in the room','eat mindful casual anywhere',45,0],
['Make something you have only ever bought','eat create try engaging home',90,1],
['Play a board game with actual people at an actual table','play friends funny engaging home',120,1],
['Go to a pub quiz and lose','play friends funny engaging indoors newpeople',150,1],
['Play the game you loved as a child','play nostalgic funny casual home',60,0],
['Learn a card game nobody you know plays','play try learn engaging home',45,0],
['Fly a kite badly','play funny move casual outdoors',60,1],
['Take up a sport you are too old to start','play move try challenging friends indoors newpeople',90,1],
['Throw something at a wall and catch it a thousand times','play move mindful casual anywhere',30,0],
['Play hide and seek with somebody far too old for it','play funny friends romantic casual home',30,0],
['Set a puzzle going and leave it out all week','play mindful casual home',30,1],
['Skateboard, badly, in an empty car park','play move funny adventurous casual outdoors',60,1],
['Play chess against a stranger in a park','play challenging outdoors newpeople friends',60,0],
['Do a jigsaw and talk the whole way through it','play romantic mindful friends casual home partner',150,1],
['Play twenty questions about something real','play funny friends casual anywhere',20,0],
['Swim somewhere outdoors','play move adventurous engaging outdoors',90,1],
['Invent a game out of the things on the table','play funny friends create casual anywhere',30,0],
['Play arcade games with actual coins','play nostalgic funny friends casual indoors',60,1],
['Run the loop you always mean to run, slowly','move engaging outdoors',40,0],
['Walk ten thousand steps in one go','move challenging outdoors',120,0],
['Swim lengths until you lose count','move mindful engaging outdoors',60,1],
['Carry something heavy up a hill','move challenging outdoors',45,0],
['Do the exercise you are worst at','move challenging try home',30,0],
['Walk there and get the bus back','move travel casual outdoors',90,1],
['Take the stairs everywhere for a day','move casual funny anywhere',20,0],
['Move every joint you own, once','move mindful casual home',4,0],
['Race somebody to the end of the road','move funny friends casual outdoors',15,0],
['Stretch on the floor for twenty minutes','move mindful casual home',25,0],
['Do nothing for twenty minutes on purpose','mindful casual home',20,0],
['Have a bath with the phone in another room','mindful casual home',45,0],
['Go to bed absurdly early','mindful casual home',30,0],
['Delete one app for a week','mindful organize casual anywhere',10,0],
['Walk with no destination and no podcast','mindful move casual outdoors',45,0],
['Sit in one place outdoors for a whole hour','mindful engaging outdoors',60,0],
['Watch the fire, or the rain, or the kettle','mindful casual anywhere',15,0],
['Say nothing for the first hour you are awake','mindful challenging home',60,0],
['Plant something','mindful create casual anywhere',60,1],
['Lie on the floor and listen to one long piece of music','mindful listen music casual home',40,0],
['Look at the sky until you have found five things in it','mindful casual outdoors',4,0],
['Ring somebody instead of texting them','kindness casual anywhere',25,0],
['Have people over for something small','friends kindness eat engaging home',180,1],
['Organise the thing everybody says they want to do','friends organize kindness challenging anywhere',30,0],
['Ask somebody to teach you what they are good at','friends learn kindness engaging anywhere newpeople',90,0],
['Have one long conversation with no phones on the table','mindful engaging anywhere',120,0],
['Walk beside somebody instead of sitting opposite them','friends move mindful casual outdoors',75,0],
['Do the errand somebody else has been dreading','kindness casual anywhere',45,0],
['Turn up to a local meeting about something','learn kindness engaging indoors newpeople friends',90,0],
['Volunteer for exactly one shift','kindness challenging indoors newpeople friends',180,0],
['Write to somebody who will never expect it','kindness writing nostalgic casual anywhere',30,0],
['Pick up litter along one street','kindness move casual outdoors',30,0],
['Leave something good for a stranger to find','kindness funny create casual indoors',25,0],
['Start the group chat that becomes a monthly thing','friends organize kindness casual anywhere',20,0],
['Introduce two people who should already know each other','kindness casual anywhere newpeople friends',20,0],
['Sit with somebody who is having a bad month','friends kindness mindful engaging anywhere',120,0],
['Cook for your neighbours','kindness eat engaging home newpeople friends',150,1],
['Interview each other about something you have never asked about','romantic friends mindful engaging anywhere partner',60,0],
['Get dressed up for no occasion at all','romantic funny casual indoors partner',180,2],
['Plan a trip you might never take','romantic organize engaging home partner',90,0],
['Walk home instead of getting a taxi','romantic move casual outdoors partner',60,0],
['Write down five things you each want this year and compare','romantic organize writing engaging anywhere partner',45,0],
['Learn something together, badly','romantic try learn funny engaging home partner',45,0],
['Reread the messages from when you first met','romantic nostalgic casual anywhere partner',30,0],
['Take a proper photograph of each other','romantic create visualart engaging anywhere partner',45,0],
['Cook the meal from the night it started','romantic eat nostalgic engaging home partner',120,1],
['Give each other an hour with no interruptions','romantic mindful casual home partner',60,0],
['Go out on a weeknight as though it were a weekend','romantic adventurous casual indoors partner',150,1],
['Watch the stars from somewhere with no streetlights','romantic mindful engaging outdoors partner',120,0],
['Argue properly about something that does not matter','romantic funny engaging anywhere partner',30,0],
['Do the thing the other one always suggests','romantic kindness casual anywhere partner',90,0],
['Walk a graveyard at dusk','spooky mindful casual outdoors',45,0],
['Read about the strangest thing that ever happened where you live','spooky read learn engaging anywhere',45,0],
['Tell ghost stories with the lights off','spooky friends funny engaging home',60,0],
['Find the most abandoned-looking building near you and go and look','spooky travel adventurous casual indoors',60,0],
['Watch the horror film you have been avoiding','spooky watch challenging home',110,0],
['Learn one genuinely unsettling fact and sit with it','spooky learn casual anywhere',20,0],
['Go somewhere very quiet at three in the morning','spooky adventurous challenging outdoors',60,0],
['Read a folk tale from wherever your family is from','spooky read nostalgic learn engaging anywhere',45,0],
['Make a playlist for a haunting','spooky create music funny casual anywhere',40,0],
['Step outside and look up for two minutes','mindful outdoors casual',2,0],
['Send somebody a photograph of what you can see right now','kindness anywhere casual',2,0],
['Write one sentence about today','create writing home solo casual',3,0],
['Learn one word in another language','learn try anywhere solo casual',3,0],
['Stand on one leg until you cannot','move play funny anywhere casual',2,0],
['Put on one song and do nothing else','listen music mindful home solo casual',4,0],
['Look up what your street is named after','learn read anywhere solo casual',4,0],
['Water the plants','clean mindful home solo casual',4,0],
['Say the thing you have been meaning to say','kindness anywhere partner friends challenging',3,0],
['Open a window and listen for one minute','listen mindful home solo casual',2,0],
['Draw one small thing in the corner of a page','create drawing visualart home solo casual',4,0],
['Take one photograph of something completely ordinary','create visualart anywhere solo casual',3,0]
];

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

const SEEDS = RAW.map(([t, tg, min, cost]) => {
  const tags = tg.split(' ');
  tags.push(durationOf(min), COSTS[cost]);
  return { id: idOf(t), t, tags:[...new Set(tags)], min, cost, src:'seed' };
});

export { TAGS, GROUPS, MARKS, REDS, SEEDS, WHO, WHERE, TIME, DURATIONS, COSTS, durationOf, idOf };
