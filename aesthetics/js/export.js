/* The three ways an aesthetic leaves the studio.

   JSON is the aesthetic — the file that lives in library/ and the one a future
   session is pointed at. CSS is the same numbers wearing tokens, for dropping
   into a project. Markdown is the guide: the story, the philosophy and the
   tokens in one document a person (or a Claude) can read top to bottom and
   then build in the style without asking anything else. */

import { ROLES } from './schema.js';

export const asJSON = (a) => JSON.stringify(a, null, 2) + '\n';

/* Token names are prefixed with the aesthetic's id so two of them can coexist
   on one page — swapping aesthetics is swapping one attribute, not a war over
   --accent. */
export function asCSS (a) {
  const p = '--' + a.id.replace(/[^a-z0-9-]/g, '');
  const r = a.color.roles;
  const t = a.type;
  const line = (k, v) => `  ${p}-${k}: ${v};`;
  const roles = (set) => ROLES.map(([k]) => line(k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()), set[k]));
  const out = [
    `/* ${a.name} — ${a.tagline || 'an aesthetic'} */`,
    `/* Generated from ${a.id}.aesthetic.json — edit the aesthetic, not this. */`,
    ':root {',
    ...roles(r),
    ...a.color.palette.map((s) => line('p-' + s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), s.hex)),
    line('display', t.display.stack),
    line('body', t.body.stack),
    line('mono', t.mono.stack),
    line('display-weight', t.display.weight),
    line('display-style', t.display.style || 'normal'),
    line('display-tracking', t.display.tracking),
    line('display-transform', t.display.transform),
    line('body-weight', t.body.weight),
    line('leading', t.body.lineHeight),
    line('size', t.baseSize + 'px'),
    line('scale', t.scale),
    line('corner', a.shape.corner || 'round'),
    line('r-sm', a.shape.radiusSm + 'px'),
    line('r-md', a.shape.radiusMd + 'px'),
    line('r-lg', a.shape.radiusLg + 'px'),
    line('border', a.shape.border + 'px'),
    line('border-style', a.shape.borderStyle || 'solid'),
    line('unit', a.space.unit + 'px'),
    line('density', a.space.density),
    line('shadow', a.elevation.shadow),
    line('shadow-lg', a.elevation.shadowLg),
    line('gloss', a.effects.gloss),
    line('glass', a.effects.glass + 'px'),
    line('grain', a.effects.grain),
    line('ornament', JSON.stringify(a.decor.ornament || '')),
    line('dividers', a.decor.dividers),
    line('underline', a.decor.underline),
    line('speed', a.motion.speed + 'ms'),
    line('ease', a.motion.easing),
    line('entrance', a.motion.entrance),
    line('stagger', a.motion.stagger + 'ms'),
    line('hover', a.motion.hover),
    line('ambient', a.motion.ambient),
    '}',
  ];
  if (a.color.darkRoles) {
    out.push('', '@media (prefers-color-scheme: dark) {', '  :root {',
      ...roles(a.color.darkRoles).map((l) => '  ' + l), '  }', '}');
  }
  return out.join('\n') + '\n';
}

/* The guide. Written to be handed over whole: “build this in Girando” should
   need nothing but this document. */
export function asGuide (a) {
  const r = a.color.roles;
  const list = (xs) => xs.filter(Boolean).map((x) => `- ${x}`).join('\n');
  const roleRows = (set) => ROLES
    .map(([k, label, hint]) => `| ${label} | \`${set[k]}\` | ${hint} |`).join('\n');
  const s = [];
  s.push(`# ${a.name}`);
  if (a.tagline) s.push(`\n*${a.tagline}*`);
  s.push(`\n> Status: ${a.status}${a.lineage ? ` · ${a.lineage}` : ''}`);
  if (a.story) s.push(`\n## The place\n\n${a.story}`);
  if (a.mood.length) s.push(`\nMood: ${a.mood.join(' · ')}`);
  if (a.principles.length) s.push(`\n## Philosophy\n\n${list(a.principles)}`);
  if (a.do.length) s.push(`\n**Do**\n\n${list(a.do)}`);
  if (a.dont.length) s.push(`\n**Don’t**\n\n${list(a.dont)}`);
  if (a.voice.tone || a.voice.samples.length) {
    s.push('\n## Voice');
    if (a.voice.tone) s.push(`\n${a.voice.tone}`);
    if (a.voice.samples.length) s.push(`\nIt would say:\n\n${list(a.voice.samples.map((x) => `“${x}”`))}`);
  }
  s.push(`\n## Colour\n\n| Role | Hex | Used for |\n| --- | --- | --- |\n${roleRows(r)}`);
  if (a.color.darkRoles) s.push(`\nAfter dark:\n\n| Role | Hex | Used for |\n| --- | --- | --- |\n${roleRows(a.color.darkRoles)}`);
  if (a.color.palette.length) {
    s.push(`\nPalette — what things get painted in:\n\n| Name | Hex |\n| --- | --- |\n` +
      a.color.palette.map((p) => `| ${p.name} | \`${p.hex}\` |`).join('\n'));
  }
  s.push(`\n## Type\n
- Display: \`${a.type.display.stack}\` — weight ${a.type.display.weight}${a.type.display.style === 'italic' ? ', italic' : ''}, tracking ${a.type.display.tracking}, ${a.type.display.transform === 'none' ? 'as written' : a.type.display.transform}
- Body: \`${a.type.body.stack}\` — weight ${a.type.body.weight}, line height ${a.type.body.lineHeight}
- Mono: \`${a.type.mono.stack}\`
- Base ${a.type.baseSize}px, scale ${a.type.scale}`);
  s.push(`\n## Shape, space, depth\n
- ${a.shape.corner === 'cut' ? 'Cut (chamfered) corners' : 'Rounded corners'}; radii ${a.shape.radiusSm} / ${a.shape.radiusMd} / ${a.shape.radiusLg} px; borders ${a.shape.border}px ${a.shape.borderStyle}
- Space unit ${a.space.unit}px at density ×${a.space.density}
- Shadow: \`${a.elevation.shadow}\`; lifted: \`${a.elevation.shadowLg}\`
- Effects: gloss ${a.effects.gloss}, glass ${a.effects.glass}px, grain ${a.effects.grain}
- Backdrop: ${a.texture.kind}${a.texture.kind !== 'none' ? ` (\`${a.texture.a}\` / \`${a.texture.b}\` at ${a.texture.alpha})` : ''}${a.texture.notes ? ` — ${a.texture.notes}` : ''}`);
  s.push(`\n## Decor\n
- Ornament: ${a.decor.ornament ? `“${a.decor.ornament}”` : 'none'}; dividers: ${a.decor.dividers}; links underline: ${a.decor.underline}`);
  s.push(`\n## Motion\n
- ${a.motion.speed}ms, \`${a.motion.easing}\`
- Entrance: ${a.motion.entrance}, staggered ${a.motion.stagger}ms apart
- On touch: ${a.motion.hover}; ambient: ${a.motion.ambient}${a.motion.character ? `\n- ${a.motion.character}` : ''}`);
  if (a.notes) s.push(`\n## Notes\n\n${a.notes}`);
  s.push(`\n---\n\nCSS tokens:\n\n\`\`\`css\n${asCSS(a)}\`\`\``);
  s.push(`\nGenerated by the aesthetics studio from \`${a.id}.aesthetic.json\` — the JSON is the source of truth.`);
  return s.join('\n') + '\n';
}
