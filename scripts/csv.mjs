/* A real CSV parser, shared by the build and by anything else that has to
   read or write a pack — because a title like "Skateboard, badly, in an
   empty car park" is exactly the kind of row a split(',') loses, and a
   second parser drifting from this one is how that stops being true in only
   one of the two places that need it. */
const parseCSV = (text) => {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(v => v.trim()));
};

/* The write side to match: quote a cell only when it needs it. Round-tripping
   every pack CSV through parseCSV then this comes out byte-identical to what
   is in packs/ today — that is the guarantee scripts/curation.mjs leans on to
   touch only the rows a curation export actually changes. */
const q = (v) => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);

export { parseCSV, q };
