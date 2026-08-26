/* What an aesthetic *is*: the aesthetic/1 format, and the field spec the
   editor form is generated from. One file owns both so a control and the
   value it edits can never drift apart — a field the form doesn't know is a
   field nobody can tune, and a field the format doesn't know is a knob wired
   to nothing.

   The shape leans on Bureau's style system (five chrome colours that derive
   everything, a named palette for the things painted in the style) but is
   app-agnostic: nothing in here knows about desks or decks. */

export const FORMAT = 'aesthetic/1';

/* The colour roles. Seven rather than Bureau's five because an aesthetic
   travelling between apps can't derive its surfaces on arrival — the guide
   has to say what they are. Order matters: it is the order swatches render
   in, everywhere. */
export const ROLES = [
  ['bg',      'Background', 'The room. What everything else sits on.'],
  ['surface', 'Surface',    'Cards, panels, paper — the thing content is printed on.'],
  ['ink',     'Ink',        'The text. Rarely pure black; the ink says a lot about the place.'],
  ['inkSoft', 'Soft ink',   'Secondary text: captions, labels, the quiet lines.'],
  ['line',    'Line',       'Rules and borders, used at low strength.'],
  ['accent',  'Accent',     'The one colour that acts: buttons, links, the thing to press.'],
  ['glow',    'Glow',       'The accent’s highlight — focus rings, shimmer, the lit edge.'],
];

export const TEXTURES = ['none', 'checker', 'stars', 'sheen', 'grain'];

/* A blank aesthetic — every path the format has, with quiet defaults. Doubles
   as the upgrade net: anything an older file lacks is filled from here. */
export function blank (id = 'untitled') {
  return {
    format: FORMAT,
    id,
    name: 'Untitled',
    status: 'draft',
    tagline: '',
    lineage: '',
    story: '',
    mood: [],
    principles: [],
    do: [],
    dont: [],
    voice: { tone: '', samples: [] },
    color: {
      roles: {
        bg: '#F4F1EA', surface: '#FCFAF5', ink: '#26221C', inkSoft: '#5C564C',
        line: '#8A8478', accent: '#5A6382', glow: '#9FB2D8',
      },
      darkRoles: null,
      palette: [],
    },
    type: {
      display: { stack: 'Georgia, serif', weight: '600', tracking: '0em', transform: 'none' },
      body: { stack: 'Georgia, serif', weight: '400', lineHeight: 1.5 },
      mono: { stack: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace' },
      baseSize: 16,
      scale: 1.25,
    },
    shape: { radiusSm: 4, radiusMd: 8, radiusLg: 14, border: 1 },
    space: { unit: 8, density: 1 },
    elevation: {
      shadow: '0 1px 3px rgba(0,0,0,.12)',
      shadowLg: '0 8px 24px rgba(0,0,0,.16)',
    },
    motion: { speed: 180, easing: 'ease-out', character: '' },
    texture: { kind: 'none', a: '#FFFFFF', b: '#EEEEEE', alpha: 1, notes: '' },
    notes: '',
  };
}

/* Fill the gaps in a loaded aesthetic from the blank, one level deep — enough
   for this shape, which never nests further than color.roles. Arrays and
   scalars are taken as found. */
export function upgrade (a) {
  const base = blank(a.id || 'untitled');
  const out = { ...base, ...a };
  for (const k of Object.keys(base)) {
    if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
      out[k] = { ...base[k], ...(a[k] || {}) };
      for (const kk of Object.keys(base[k])) {
        const b = base[k][kk], v = out[k][kk];
        if (b && typeof b === 'object' && !Array.isArray(b)) out[k][kk] = { ...b, ...(v || {}) };
      }
    }
  }
  out.format = FORMAT;
  return out;
}

/* The form, section by section. Field kinds the editor knows how to draw:
     text · textarea · number · range · select · color · lines · swatches
   `path` is dot-notation into the aesthetic. `lines` edits an array of
   strings, one per line. `swatches` edits color.palette. */
export const SECTIONS = [
  { id: 'identity', title: 'Identity', blurb: 'What it is called and where it came from.', fields: [
    { path: 'name', label: 'Name', kind: 'text' },
    { path: 'id', label: 'Id', kind: 'text', hint: 'lowercase, hyphens — the filename' },
    { path: 'status', label: 'Status', kind: 'select', options: ['draft', 'canon'], hint: 'draft = still finding itself' },
    { path: 'tagline', label: 'Tagline', kind: 'text', hint: 'one line that names the whole thing' },
    { path: 'lineage', label: 'Lineage', kind: 'text', hint: 'where it grew from, if anywhere' },
  ]},
  { id: 'place', title: 'The place', blurb: 'Most of these aesthetics are places in the mind. Say where this one is.', fields: [
    { path: 'story', label: 'Story', kind: 'textarea', rows: 6, hint: 'the vibe, written as a place you can stand in' },
    { path: 'mood', label: 'Mood words', kind: 'lines', hint: 'one per line' },
  ]},
  { id: 'philosophy', title: 'Philosophy', blurb: 'The rules of the place — what design decisions it makes for you.', fields: [
    { path: 'principles', label: 'Principles', kind: 'lines', hint: 'one per line; the load-bearing beliefs' },
    { path: 'do', label: 'Do', kind: 'lines' },
    { path: 'dont', label: 'Don’t', kind: 'lines' },
  ]},
  { id: 'voice', title: 'Voice', blurb: 'How things are worded inside it.', fields: [
    { path: 'voice.tone', label: 'Tone', kind: 'textarea', rows: 3 },
    { path: 'voice.samples', label: 'Sample copy', kind: 'lines', hint: 'phrases the aesthetic would actually say' },
  ]},
  { id: 'color', title: 'Colour', blurb: 'Seven roles carry the chrome; the palette is everything painted in it.', fields: [
    ...ROLES.map(([k, label, hint]) => ({ path: `color.roles.${k}`, label, kind: 'color', hint })),
    { path: 'color.darkRoles', label: 'After dark', kind: 'darkroles', hint: 'a second set of the seven, for styles that change when the lights go out' },
    { path: 'color.palette', label: 'Palette', kind: 'swatches', hint: 'named colours things get painted in — a style has to answer “what is your umber”' },
  ]},
  { id: 'type', title: 'Type', blurb: 'The faces and the scale.', fields: [
    { path: 'type.display.stack', label: 'Display face', kind: 'text', mono: true },
    { path: 'type.display.weight', label: 'Display weight', kind: 'select', options: ['300', '400', '500', '600', '700', '800'] },
    { path: 'type.display.tracking', label: 'Display tracking', kind: 'text', hint: 'e.g. 0em, .04em' },
    { path: 'type.display.transform', label: 'Display case', kind: 'select', options: ['none', 'uppercase', 'lowercase', 'capitalize'] },
    { path: 'type.body.stack', label: 'Body face', kind: 'text', mono: true },
    { path: 'type.body.weight', label: 'Body weight', kind: 'select', options: ['300', '400', '500', '600'] },
    { path: 'type.body.lineHeight', label: 'Line height', kind: 'range', min: 1.1, max: 2, step: 0.05 },
    { path: 'type.mono.stack', label: 'Mono face', kind: 'text', mono: true },
    { path: 'type.baseSize', label: 'Base size', kind: 'range', min: 13, max: 20, step: 1, unit: 'px' },
    { path: 'type.scale', label: 'Scale ratio', kind: 'range', min: 1.05, max: 1.5, step: 0.01, hint: 'each heading step is this much bigger' },
  ]},
  { id: 'shape', title: 'Shape & space', blurb: 'How much the corners give, how the page breathes.', fields: [
    { path: 'shape.radiusSm', label: 'Radius, small', kind: 'range', min: 0, max: 24, step: 1, unit: 'px' },
    { path: 'shape.radiusMd', label: 'Radius, medium', kind: 'range', min: 0, max: 32, step: 1, unit: 'px' },
    { path: 'shape.radiusLg', label: 'Radius, large', kind: 'range', min: 0, max: 48, step: 1, unit: 'px' },
    { path: 'shape.border', label: 'Border width', kind: 'range', min: 0, max: 4, step: 0.5, unit: 'px' },
    { path: 'space.unit', label: 'Space unit', kind: 'range', min: 4, max: 12, step: 1, unit: 'px' },
    { path: 'space.density', label: 'Density', kind: 'range', min: 0.75, max: 1.5, step: 0.05, hint: 'multiplies every gap' },
  ]},
  { id: 'depth', title: 'Depth & texture', blurb: 'Whether things cast shadows, and what the room is made of.', fields: [
    { path: 'elevation.shadow', label: 'Shadow', kind: 'text', mono: true, hint: 'a box-shadow, or 0 0 0 transparent for none' },
    { path: 'elevation.shadowLg', label: 'Shadow, lifted', kind: 'text', mono: true },
    { path: 'texture.kind', label: 'Backdrop', kind: 'select', options: TEXTURES },
    { path: 'texture.a', label: 'Backdrop colour A', kind: 'color' },
    { path: 'texture.b', label: 'Backdrop colour B', kind: 'color' },
    { path: 'texture.alpha', label: 'Backdrop strength', kind: 'range', min: 0, max: 1, step: 0.05 },
    { path: 'texture.notes', label: 'Texture notes', kind: 'textarea', rows: 2, hint: 'for textures no parameter can say — weave, gloss, hand-drawn things' },
  ]},
  { id: 'motion', title: 'Motion', blurb: 'How the place moves.', fields: [
    { path: 'motion.speed', label: 'Speed', kind: 'range', min: 0, max: 600, step: 10, unit: 'ms' },
    { path: 'motion.easing', label: 'Easing', kind: 'text', mono: true },
    { path: 'motion.character', label: 'Character', kind: 'textarea', rows: 2, hint: 'e.g. “nothing bounces; things settle like paper”' },
  ]},
  { id: 'notes', title: 'Notes', blurb: 'Anything the other sections could not hold.', fields: [
    { path: 'notes', label: 'Notes', kind: 'textarea', rows: 5 },
  ]},
];

/* Dot-path get and set, shared by the form and the exporters. */
export function get (obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}
export function set (obj, path, value) {
  const ks = path.split('.');
  const last = ks.pop();
  const host = ks.reduce((o, k) => (o[k] = o[k] || {}), obj);
  host[last] = value;
}
