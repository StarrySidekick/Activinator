/* Activinator — the deck's raw material.
   An activity is a title and a set of tags. There is no description: a card is
   one thing to go and do, and a second sentence explaining it is a second
   sentence you have to read before you can swipe. The title has to carry it.

   Tags are the whole feature space — the model learns one weight per tag and
   nothing else — so the vocabulary below is the vocabulary of what it can have
   an opinion about. Adding a tag adds a dimension; adding a vague one adds
   noise. */

/* The vocabulary, in the order the groups are shown. A tag belongs to exactly
   one group; the group is for reading, not for scoring. */
const GROUPS = [
  ['Doing',     ['create','organize','clean','repair','try','watch','listen','read','travel','eat','play','move','learn','kindness']],
  ['Making',    ['writing','visualart','drawing','painting','sculpting','mixedmedia','clothes','music','acting','dancing','film']],
  ['Where',     ['indoors','outdoors','nature','water','city']],
  ['Who',       ['solo','social','romantic']],
  ['How hard',  ['casual','engaging','challenging']],   // a scale: pick exactly one
  ['Mood',      ['adventurous','funny','mindful','spooky','nostalgic']],
  ['Practical', ['cheap','splurge','quick','longhaul','screenfree','morning','night']]
];

const TAGS = {
  create:'creating', organize:'organising', clean:'cleaning', repair:'repairing',
  try:'trying something new', watch:'watching', listen:'listening', read:'reading',
  travel:'going somewhere', eat:'food', play:'playing', move:'moving',
  learn:'learning', kindness:'kindness',

  writing:'writing', visualart:'visual art', drawing:'drawing', painting:'painting',
  sculpting:'sculpting', mixedmedia:'mixed media', clothes:'clothes', music:'music',
  acting:'acting', dancing:'dancing', film:'film',

  indoors:'indoors', outdoors:'outdoors', nature:'nature', water:'water', city:'the city',

  solo:'on your own', social:'with people', romantic:'romantic',

  casual:'casual', engaging:'engaging', challenging:'challenging',

  adventurous:'adventurous', funny:'funny', mindful:'mindful', spooky:'spooky',
  nostalgic:'nostalgia',

  cheap:'free or nearly', splurge:'worth spending on', quick:'quick',
  longhaul:'a long one', screenfree:'screen-free', morning:'early', night:'after dark'
};

/* title | tags | who | where | minutes | cost (0 free, 1 small, 2 real) */
const RAW = [
// — create: writing —
['Write the first page of the thing you keep meaning to write','create writing challenging indoors','any','any',45,0],
['Write a letter by hand and actually post it','create writing kindness casual','any','home',40,0],
['Write down everything you remember about one particular day','create writing nostalgic engaging','any','any',40,0],
['Sit in a café and describe a stranger in two hundred words','create writing engaging city indoors','any','out',35,1],
['Keep a one-line diary for the rest of the week','create writing mindful casual quick','any','any',10,0],
['Write a completely serious review of a sandwich','create writing funny casual','any','any',30,0],
['Write a poem in a form you have never used','create writing try challenging','any','any',50,0],
['Write the best possible argument for the thing you disagree with','create writing challenging','any','any',45,0],
['Write a scene that is nothing but dialogue','create writing engaging','any','any',40,0],
['Write down the story your family always tells','create writing nostalgic engaging','any','any',45,0],
['Write a letter to yourself to open in a year','create writing mindful casual','any','home',30,0],
['Invent a word and use it all week','create writing funny casual quick','any','any',15,0],
['Write six-word stories until one of them lands','create writing funny casual','any','any',25,0],
['Write the opening of a horror story set in your own house','create writing spooky engaging','any','home',40,0],
['Keep a notebook in your pocket all day and fill it','create writing engaging','any','any',60,0],
['Write instructions for something you do without thinking','create writing funny engaging','any','home',35,0],

// — create: drawing —
['Draw the room you are in, badly','create visualart drawing casual indoors mindful','any','home',25,0],
['Redraw a logo you see every day, from memory','create visualart drawing funny casual quick','any','home',25,0],
['Draw the same object ten times','create visualart drawing engaging','any','home',45,0],
['Draw somebody without once looking at the paper','create visualart drawing funny casual quick','any','any',20,0],
['Fill one whole page with nothing but circles','create visualart drawing mindful casual','any','home',25,0],
['Draw your street from memory, then walk it and check','create visualart drawing engaging city','any','any',60,0],
['Draw with your other hand for half an hour','create visualart drawing funny casual','any','home',30,0],
['Draw a map of somewhere you have never been','create visualart drawing engaging adventurous','any','home',45,0],
['Sit somewhere public and sketch whatever is in front of you','create visualart drawing engaging city','any','out',45,0],
['Draw a comic strip about your own week','create visualart drawing funny engaging','any','home',60,0],
['Copy a drawing by somebody far better than you','create visualart drawing learn engaging','any','home',60,0],
['Draw the floor plan of every home you have lived in','create visualart drawing nostalgic engaging','any','home',50,0],

// — create: painting —
['Paint something you are not allowed to be good at','create visualart painting casual','any','home',40,1],
['Paint the view out of one window','create visualart painting engaging','any','home',75,1],
['Mix one colour until it is exactly right','create visualart painting mindful engaging','any','home',40,1],
['Paint something using one colour and white','create visualart painting challenging try','any','home',60,1],
['Paint over something you had already finished','create visualart painting try engaging','any','home',45,0],
['Paint a portrait from a photograph on your phone','create visualart painting challenging','any','home',90,1],
['Buy the cheapest canvas there is and ruin it on purpose','create visualart painting funny casual','any','home',40,1],
['Paint something the size of a postcard and post it to somebody','create visualart painting kindness casual','any','home',45,1],

// — create: sculpting, mixed media, clothes —
['Cast your own hand in plaster','create visualart sculpting engaging','any','home',90,1],
['Make something out of what is in the recycling','create visualart mixedmedia funny casual','any','home',60,0],
['Carve a stamp out of an eraser and print with it','create visualart mixedmedia engaging','any','home',45,0],
['Make a collage out of one magazine','create visualart mixedmedia casual','any','home',45,1],
['Model something out of clay with your eyes shut','create visualart sculpting funny try casual','any','home',40,1],
['Make a zine — eight pages out of one sheet of paper','create visualart mixedmedia writing engaging','any','home',90,0],
['Bind your own notebook','create visualart mixedmedia learn engaging','any','home',75,1],
['Mend a garment so that the mend shows','create clothes repair mindful engaging','any','home',45,0],
['Dye something you had got bored of','create clothes try engaging','any','home',90,1],
['Take a jacket in until it actually fits you','create clothes repair challenging','any','home',120,1],
['Make one thing you would otherwise have bought','create visualart mixedmedia challenging try','any','home',120,1],
['Print photographs out and put them on a wall','create visualart nostalgic casual','any','any',45,1],
['Make a mask','create visualart sculpting spooky engaging','any','home',90,1],
['Sew something with no pattern','create clothes challenging try','any','home',120,1],
['Build a tiny shelf for the place that has needed one for months','create repair challenging indoors','any','home',120,1],

// — create: music —
['Learn one song all the way through, including the part you skip','create music learn engaging','any','home',60,0],
['Make a playlist that tells a story','create music organize casual','any','any',45,0],
['Make a mixtape for one specific person','create music kindness nostalgic engaging','any','home',60,0],
['Record the sound of somewhere and keep it','create music listen casual quick outdoors','any','out',20,0],
['Write a song about something extremely boring','create music writing funny engaging','any','home',60,0],
['Sing somewhere with very good reverb','create music funny casual quick','any','any',15,0],
['Learn the first four bars on an instrument you cannot play','create music try challenging','any','home',45,0],
['Work out a song by ear, with no tabs','create music challenging learn','any','home',60,0],
['Play music with somebody else in the room','create music social engaging','group','any',90,0],
['Make a beat out of household objects','create music funny engaging','any','home',45,0],
['Sing the harmony instead of the tune','create music try engaging','any','any',25,0],
['Busk once, badly, for nobody','create music challenging adventurous city','any','out',60,0],
['Write down every song you loved at fifteen','create music nostalgic casual','any','any',30,0],
['Learn a song in a language you do not speak','create music try engaging','any','home',60,0],

// — create: acting —
['Read a play out loud, all the parts, on your own','create acting funny engaging','any','home',90,0],
['Learn a monologue and perform it to a mirror','create acting challenging','any','home',60,0],
['Do a scene with somebody, both of you terrible','create acting social funny engaging','group','home',60,0],
['Record yourself telling a story and watch it back','create acting challenging','any','home',40,0],
['Learn to do one convincing accent','create acting try engaging','any','home',45,0],
['Improvise a scene with one rule neither of you can break','create acting social funny engaging','group','home',45,0],
['Read a picture book out loud with full commitment','create acting funny casual quick','any','home',15,0],

// — create: dancing —
['Dance to three songs with the door shut','create dancing funny move casual quick','any','home',15,0],
['Learn one dance properly from a video','create dancing learn move engaging','any','home',60,0],
['Go dancing somewhere you would normally leave early','create dancing social move night adventurous engaging','group','out',180,1],
['Dance in the kitchen while the dinner cooks','create dancing romantic funny casual quick','two','home',10,0],
['Learn the steps to something out of a film','create dancing nostalgic learn engaging','any','home',60,0],
['Move for one whole song with your eyes closed','create dancing mindful move casual quick','any','home',10,0],
['Slow dance to one song in the kitchen','create dancing romantic music casual quick','two','home',10,0],

// — create: film and photographs —
['Shoot a one-minute film on your phone with no cuts','create film challenging','any','any',60,0],
['Film the same place at four different times of day','create film mindful engaging outdoors','any','out',90,0],
['Make a title sequence for a film that does not exist','create film funny engaging','any','home',90,0],
['Learn to edit one thing properly','create film learn challenging','any','home',120,0],
['Film somebody you love doing the thing they always do','create film kindness nostalgic engaging','any','any',45,0],
['Remake a scene you know by heart, badly','create film acting funny social engaging','group','any',120,0],
['Shoot a whole roll of film and wait a week for it','create film visualart adventurous engaging outdoors city','any','out',120,1],
['Make a stop-motion ten seconds long','create film funny challenging','any','home',120,0],
['Take a hundred photographs of one object','create visualart engaging learn','any','home',45,0],
['Photograph ten things that are all the same colour','create visualart engaging outdoors city','any','out',60,0],
['Take photographs at night on a long exposure','create visualart film spooky night engaging outdoors','any','out',90,0],

// — organise —
['Clear one surface completely and then stop','organize clean mindful casual quick','any','home',30,0],
['Rearrange one room properly','organize move challenging indoors','any','home',150,0],
['Put every photograph from one year into an album','organize nostalgic engaging','any','any',60,0],
['Deal with the drawer of paper','organize challenging','any','home',60,0],
['Work out one thing about your own money','organize learn engaging','any','home',40,0],
['Write down ten things you would do with a free Saturday','organize writing casual quick','any','any',20,0],
['Put your books in an order that means something','organize funny engaging','any','home',60,0],
['Cancel one subscription you had forgotten about','organize casual quick','any','home',15,0],
['Plan next week on paper rather than on a screen','organize mindful casual screenfree','any','home',30,0],
['Give away five things today','organize kindness casual','any','home',45,0],
['Name every file on your desktop properly','organize casual','any','home',40,0],
['Make a list of everybody you owe a message','organize kindness casual quick','any','any',20,0],
['Sort your clothes into what you actually wear','organize challenging clothes','any','home',90,0],
['Empty one box you have not opened since you moved','organize nostalgic engaging','any','home',60,0],
['Write down what you want this year to have in it','organize writing mindful engaging','any','any',45,0],
['Put every tool back where tools go','organize repair casual','any','home',40,0],
['Put your affairs in order for exactly one hour','organize mindful engaging','any','home',60,0],

// — clean —
['Clean the one thing you always look past','clean casual quick','any','home',25,0],
['Wash the windows and notice the difference all week','clean engaging','any','home',60,0],
['Clean your keyboard properly','clean casual quick','any','home',20,0],
['Descale everything that can be descaled','clean engaging','any','home',45,0],
['Take everything out of the fridge and start again','clean engaging','any','home',60,0],
['Polish something until it looks new','clean mindful engaging','any','home',40,0],
['Clean your shoes','clean mindful casual quick','any','home',25,0],
['Sweep outside your own front door','clean kindness casual quick outdoors','any','home',20,0],
['Do the washing up with the radio on and no hurry','clean mindful listen casual','any','home',30,0],
['Clean out whatever you drive or ride','clean engaging outdoors','any','home',60,0],

// — repair —
['Fix the thing you have been stepping over','repair casual quick','any','home',30,0],
['Find out what is actually wrong with it before buying another','repair learn engaging','any','home',45,0],
['Glue the broken thing back together and let the join show','repair create mindful engaging','any','home',45,0],
['Sharpen every knife in the house','repair engaging learn','any','home',40,1],
['Oil the hinge that has been squeaking for months','repair casual quick','any','home',15,0],
['Replace a fuse, a washer or a battery yourself','repair learn casual','any','home',30,1],
['Take something broken apart just to see inside it','repair try challenging','any','home',60,0],
['Patch the wall you have been ignoring','repair engaging','any','home',60,1],
['Restring, retune or re-fit something you own','repair engaging learn','any','home',45,1],
['Fix somebody else’s broken thing','repair kindness social engaging','any','any',60,0],
['Learn how the boiler, the fuse box or the lock actually works','repair learn engaging','any','home',40,0],

// — try —
['Try a class you would be visibly bad at','try learn social challenging','any','out',90,2],
['Learn twenty words of a language you will never speak','try learn casual','any','any',30,0],
['Teach yourself one knot','try learn casual quick screenfree','any','any',15,0],
['Learn to do one pull-up','try move challenging','any','home',20,1],
['Learn to fold one good paper thing','try create casual mindful','any','home',30,0],
['Learn to make one cocktail properly','try eat learn engaging night','any','home',40,1],
['Cook with one ingredient you have never used','try eat engaging','any','home',90,1],
['Learn five trees on your own street','try learn nature casual outdoors','any','out',40,0],
['Learn to identify five birds by their sound','try learn nature mindful outdoors engaging','any','out',45,0],
['Try the food you decided you hated as a child','try eat funny casual','any','any',40,1],
['Learn one card trick well enough to fool somebody','try play funny engaging','any','home',60,0],
['Learn to juggle three things','try play move challenging','any','any',45,0],
['Write with your other hand for a whole day','try funny casual','any','any',20,0],
['Learn to whistle properly','try funny casual quick','any','any',20,0],
['Find out where your water comes from, then go and look at it','try learn outdoors nature engaging','any','any',90,0],

// — watch —
['Watch a film by somebody whose name you do not know','watch try engaging night indoors','any','home',120,1],
['Watch something in a language you do not speak','watch try engaging night','any','home',110,0],
['Go to a matinee on your own','watch solo casual city indoors','solo','out',150,2],
['Watch the film one of you loves and the other has never seen','watch romantic engaging night','two','home',150,0],
['Watch the sun come up','watch mindful morning outdoors nature engaging','any','out',75,0],
['Watch a horror film with all the lights off','watch spooky night engaging','any','home',110,0],
['Go to a gallery and look at one room only','watch city mindful engaging indoors','any','out',60,1],
['Watch a sport you do not understand until you work out the rules','watch try funny engaging','any','any',90,0],
['Watch the film that terrified you as a child','watch spooky nostalgic engaging','any','home',110,0],
['Sit somewhere busy and watch people for an hour','watch mindful city casual','any','out',60,0],
['Watch a documentary about something you would never choose','watch try engaging','any','home',90,0],
['Go to a play, even a bad one','watch acting city social night splurge engaging','any','out',180,2],
['Watch the whole credits and look up one name','watch funny casual quick','any','home',15,0],
['Watch a thunderstorm from somewhere dry','watch mindful nature casual','any','any',30,0],

// — listen —
['Listen to an album in the dark, start to finish','listen music mindful night screenfree engaging','any','home',45,0],
['Find out what your favourite band listened to','listen music learn engaging','any','any',60,0],
['Go and see live music by somebody you have never heard of','listen music social night city splurge adventurous engaging','any','out',180,2],
['Learn the names of five instruments in a piece you love','listen music learn engaging','any','any',35,0],
['Listen to a whole radio station from another country','listen try casual','any','any',45,0],
['Sit outside and listen with your eyes closed for ten minutes','listen mindful outdoors casual quick','any','out',15,0],
['Listen to the album that was everything when you were seventeen','listen music nostalgic casual','any','any',45,0],
['Ask somebody to play you their favourite song and say nothing','listen music social kindness casual quick','group','any',20,0],
['Listen to a podcast about something you would never search for','listen try casual','any','any',45,0],
['Put on music from the year you were born','listen music nostalgic funny casual','any','any',40,0],

// — read —
['Read the Wikipedia article you keep meaning to read','read learn casual quick','any','any',30,0],
['Reread the book that mattered when you were seventeen','read nostalgic engaging','any','home',180,0],
['Read a whole magazine about something you know nothing about','read try casual','any','any',60,1],
['Read a short story out loud to somebody','read social kindness engaging','group','home',45,0],
['Read the same short story as somebody else and argue about it','read romantic social engaging','two','home',90,0],
['Read a ghost story in bed with one lamp on','read spooky night casual','any','home',45,0],
['Go to a library with no idea what you want','read adventurous city casual indoors','any','out',60,0],
['Read the first chapter of five books and keep one','read casual','any','any',60,1],
['Read a poem a day until the week is out','read mindful casual quick','any','any',10,0],
['Read something written more than two hundred years ago','read challenging try','any','any',60,0],
['Read the local history of your own street','read learn nostalgic city engaging','any','any',90,0],
['Read a whole book in one sitting','read challenging longhaul','any','home',300,0],

// — travel —
['Walk to the furthest point you can reach in thirty minutes','travel move outdoors city casual','any','out',60,0],
['Take the first bus that arrives and ride it to the end','travel adventurous funny city engaging','any','out',180,1],
['Get off two stops early and walk the rest','travel move outdoors casual city','any','out',45,0],
['Take a train one stop past where you usually get off','travel romantic adventurous engaging','two','out',240,1],
['Go somewhere by train with no bag and come back at night','travel adventurous longhaul splurge engaging','any','out',480,2],
['Climb the highest thing nearby and look at where you live','travel move outdoors city engaging','any','out',90,0],
['Find water and follow it downstream until it gets boring','travel outdoors nature move engaging water','any','out',120,0],
['Walk one long road from end to end','travel move outdoors city longhaul challenging','any','out',180,0],
['Go to the place tourists come to and be a tourist','travel city funny casual','any','out',120,1],
['Sleep outside','travel outdoors nature night adventurous challenging','any','out',600,1],
['Walk a route you know well, at night','travel outdoors night mindful casual','any','out',45,0],
['Go somewhere with no map and no plan','travel adventurous outdoors screenfree engaging','any','out',75,0],
['Find the oldest thing near you and go and stand next to it','travel city learn nostalgic casual','any','out',75,0],
['Get up at five and go somewhere','travel morning outdoors adventurous engaging','any','out',180,0],
['Cycle somewhere you would normally drive','travel move outdoors city engaging','any','out',75,0],
['Go and look at a building you have only ever seen photographs of','travel city learn engaging','any','out',120,1],
['Take a ferry for no reason','travel water adventurous casual outdoors','any','out',120,1],
['Go somewhere neither of you has ever been','travel romantic adventurous outdoors engaging','two','out',240,1],

// — eat —
['Cook something you have never cooked, properly','eat create engaging indoors','any','home',120,1],
['Make bread from scratch','eat create longhaul engaging','any','home',240,0],
['Eat at the place you always walk past','eat city social casual','any','out',90,1],
['Make a proper breakfast on a weekday','eat mindful morning kindness casual','any','home',45,0],
['Bake something and give it away','eat create kindness social engaging','any','home',120,1],
['Have a picnic in unglamorous weather','eat outdoors mindful casual screenfree','any','out',75,1],
['Shop at a market instead of a supermarket','eat social city morning casual','any','out',75,1],
['Cook the thing your family used to make','eat create nostalgic kindness engaging','any','home',120,1],
['Eat somewhere serving a cuisine you cannot name','eat try adventurous social city casual','any','out',90,1],
['Cook one dish together with no recipe between you','eat romantic create social engaging','two','home',120,1],
['Go out for breakfast before work','eat romantic morning city casual','two','out',75,1],
['Make the most complicated thing in the book','eat challenging create longhaul','any','home',300,2],
['Eat by candlelight on an ordinary Tuesday','eat romantic mindful casual night','two','home',60,0],
['Cook for somebody who does not usually get cooked for','eat kindness social create engaging','group','home',150,1],
['Grow one thing you can eat','eat nature create outdoors engaging','any','home',60,1],
['Pick something wild and eat it','eat nature outdoors try learn engaging','any','out',60,0],
['Eat a meal with no phone anywhere in the room','eat mindful screenfree casual','any','any',45,0],
['Make something you have only ever bought','eat create try engaging','any','home',90,1],

// — play —
['Play a board game with actual people at an actual table','play social funny engaging indoors','group','home',120,1],
['Go to a pub quiz and lose','play social funny night city engaging','group','out',150,1],
['Play the game you loved as a child','play nostalgic funny casual','any','home',60,0],
['Learn a card game nobody you know plays','play try learn engaging','any','home',45,0],
['Fly a kite badly','play outdoors funny move casual','any','out',60,1],
['Take up a sport you are too old to start','play move try challenging social','group','out',90,1],
['Throw something at a wall and catch it a thousand times','play move mindful casual','any','any',30,0],
['Play hide and seek with somebody far too old for it','play funny social romantic casual','group','home',30,0],
['Set a puzzle going and leave it out all week','play mindful casual indoors','any','home',30,1],
['Skateboard, badly, in an empty car park','play move funny outdoors adventurous casual','any','out',60,1],
['Play chess against a stranger in a park','play social challenging city outdoors','any','out',60,0],
['Do a jigsaw and talk the whole way through it','play romantic mindful social screenfree casual','two','home',150,1],
['Play twenty questions about something real','play funny social casual quick','group','any',20,0],
['Swim somewhere outdoors','play water move outdoors adventurous engaging','any','out',90,1],
['Invent a game out of the things on the table','play funny social create casual','group','any',30,0],
['Play arcade games with actual coins','play nostalgic funny social city casual','group','out',60,1],

// — move —
['Run the loop you always mean to run, slowly','move outdoors engaging','any','out',40,0],
['Walk ten thousand steps in one go','move outdoors longhaul challenging','any','out',120,0],
['Swim lengths until you lose count','move water mindful engaging','any','out',60,1],
['Carry something heavy up a hill','move outdoors challenging','any','out',45,0],
['Do the exercise you are worst at','move challenging try','any','home',30,0],
['Walk there and get the bus back','move outdoors travel casual city','any','out',90,1],
['Take the stairs everywhere for a day','move casual funny','any','any',20,0],
['Move every joint you own, once','move mindful casual quick','any','home',15,0],
['Race somebody to the end of the road','move funny social casual quick outdoors','group','out',15,0],
['Stretch on the floor for twenty minutes','move mindful casual quick','any','home',25,0],

// — mindful —
['Do nothing for twenty minutes on purpose','mindful screenfree casual quick indoors','any','home',20,0],
['Have a bath with the phone in another room','mindful screenfree casual night','any','home',45,0],
['Go to bed absurdly early','mindful casual quick','any','home',30,0],
['Delete one app for a week','mindful organize casual quick','any','any',10,0],
['Walk with no destination and no podcast','mindful outdoors move screenfree casual','any','out',45,0],
['Sit in one place outdoors for a whole hour','mindful nature outdoors screenfree engaging','any','out',60,0],
['Watch the fire, or the rain, or the kettle','mindful casual quick','any','any',15,0],
['Say nothing for the first hour you are awake','mindful morning challenging','any','home',60,0],
['Plant something','mindful nature create outdoors casual','any','any',60,1],
['Lie on the floor and listen to one long piece of music','mindful listen music casual','any','home',40,0],
['Look at the sky until you have found five things in it','mindful outdoors nature casual quick','any','out',20,0],

// — kindness and people —
['Ring somebody instead of texting them','social kindness casual quick','any','any',25,0],
['Have people over for something small','social kindness eat engaging','group','home',180,1],
['Organise the thing everybody says they want to do','social organize kindness challenging','group','any',30,0],
['Ask somebody to teach you what they are good at','social learn kindness engaging','group','any',90,0],
['Have one long conversation with no phones on the table','social screenfree mindful engaging','any','any',120,0],
['Walk beside somebody instead of sitting opposite them','social move outdoors mindful casual','group','out',75,0],
['Do the errand somebody else has been dreading','social kindness casual','any','any',45,0],
['Turn up to a local meeting about something','social learn city kindness engaging','any','out',90,0],
['Volunteer for exactly one shift','social kindness challenging','any','out',180,0],
['Write to somebody who will never expect it','kindness writing nostalgic casual','any','any',30,0],
['Pick up litter along one street','kindness outdoors move casual quick','any','out',30,0],
['Leave something good for a stranger to find','kindness funny create casual quick','any','out',25,0],
['Start the group chat that becomes a monthly thing','social organize kindness casual quick','group','any',20,0],
['Introduce two people who should already know each other','social kindness casual quick','any','any',20,0],
['Sit with somebody who is having a bad month','social kindness mindful engaging','group','any',120,0],
['Cook for your neighbours','social kindness eat engaging','any','home',150,1],

// — romantic —
['Interview each other about something you have never asked about','romantic social mindful engaging','two','any',60,0],
['Get dressed up for no occasion at all','romantic funny night city splurge casual','two','out',180,2],
['Plan a trip you might never take','romantic organize engaging','two','home',90,0],
['Walk home instead of getting a taxi','romantic outdoors night move casual','two','out',60,0],
['Write down five things you each want this year and compare','romantic organize writing engaging','two','any',45,0],
['Learn something together, badly','romantic try learn funny engaging','two','home',45,0],
['Reread the messages from when you first met','romantic nostalgic casual quick','two','any',30,0],
['Take a proper photograph of each other','romantic create visualart engaging','two','any',45,0],
['Cook the meal from the night it started','romantic eat nostalgic engaging','two','home',120,1],
['Give each other an hour with no interruptions','romantic mindful casual','two','home',60,0],
['Go out on a weeknight as though it were a weekend','romantic adventurous night city casual','two','out',150,1],
['Watch the stars from somewhere with no streetlights','romantic outdoors nature night mindful engaging','two','out',120,0],
['Argue properly about something that does not matter','romantic funny engaging','two','any',30,0],
['Do the thing the other one always suggests','romantic kindness casual','two','any',90,0],

// — spooky —
['Walk a graveyard at dusk','spooky outdoors night mindful casual','any','out',45,0],
['Read about the strangest thing that ever happened where you live','spooky read learn engaging','any','any',45,0],
['Tell ghost stories with the lights off','spooky social funny night engaging','group','home',60,0],
['Find the most abandoned-looking building near you and go and look','spooky travel city adventurous casual','any','out',60,0],
['Watch the horror film you have been avoiding','spooky watch night challenging','any','home',110,0],
['Learn one genuinely unsettling fact and sit with it','spooky learn casual quick','any','any',20,0],
['Go somewhere very quiet at three in the morning','spooky outdoors night adventurous challenging','any','out',60,0],
['Read a folk tale from wherever your family is from','spooky read nostalgic learn engaging','any','any',45,0],
['Make a playlist for a haunting','spooky create music funny casual','any','any',40,0]
];

/* The three questions the deck asks before it deals. `any` never filters. */
const WHO  = [['any','Anyone'],['solo','Just me'],['two','The two of us'],['group','A few of us']];
const WHERE= [['any','Anywhere'],['home','At home'],['out','Out']];
const TIME = [[0,'Any length'],[30,'Half an hour'],[90,'An evening'],[300,'An afternoon'],[600,'A whole day']];

/* Length, cost and company are facts about an activity, so they are tags too —
   otherwise the model can learn that you like cooking but never that you only
   ever say yes to the quick ones. */
const SEEDS = RAW.map(([t, tg, who, where, min, cost], i) => {
  const tags = tg.split(' ');
  if (cost === 0) tags.push('cheap'); if (cost === 2) tags.push('splurge');
  if (min <= 30) tags.push('quick'); if (min >= 240) tags.push('longhaul');
  if (who === 'solo') tags.push('solo');
  if (who === 'two') tags.push('romantic');
  if (who === 'group') tags.push('social');
  // At home is indoors unless the activity says otherwise — the garden, the
  // doorstep and the balcony are the ones that say otherwise. Without this the
  // indoors/outdoors axis is lopsided and the model can only learn one pole.
  if (where === 'home' && !tags.includes('outdoors')) tags.push('indoors');
  return { id:'s'+i, t, tags:[...new Set(tags)], who, where, min, cost, src:'seed' };
});

export { TAGS, GROUPS, SEEDS, WHO, WHERE, TIME };
