// Downloads dances from ContraDB (contradb.com) and writes each in The Caller's Box layout, for testing the
// simulator against many real dances. Only dances their owner has marked "shared everywhere" are kept. The files
// go in library/contradb/ (not part of the repository: the dances belong to their choreographers).
// Run: node tools/fetch-contradb.js [first id] [last id]     (one request at a time, with a pause between)
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const [first = 1, last = 600] = process.argv.slice(2).map(Number);
const out = path.join(__dirname, '..', 'library', 'contradb');
fs.mkdirSync(out, { recursive: true });

const unescape = s => s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
// ContraDB's formations, as The Caller's Box names them.
const FORMATION = { improper: 'Duple Minor - Improper', 'becket cw': 'Becket - CW', 'becket ccw': 'Becket - CCW', proper: 'Duple Minor - Proper',
  indecent: 'Duple Minor - Indecent', 'all improper': 'Duple Minor - All Improper', 'triple minor': 'Triple Minor - Proper', 'four face four': 'Four Facing Four',
  'sicilian circle': 'Sicilian Circle', square: 'Square', 'circle mixer': 'Circle Mixer' };

function convert(html, id) {
  if (!/shared everywhere/.test(html)) return null;
  const title = unescape((html.match(/<h1 class="dance-show-title">([\s\S]*?)<\/h1>/) || [])[1] || '');
  const by = unescape((html.match(/dance-show-choreographer">by: ([\s\S]*?)<\/p>/) || [])[1] || '');
  const form = unescape((html.match(/dance-show-formation">formation: ([\s\S]*?)<\/p>/) || [])[1] || '').toLowerCase();
  const rows = [...html.matchAll(/<tr class="a[12]b[12][^"]*">\s*<td>([^<]*)<\/td>\s*<td class=dance-show-beats>(\d*)<\/td>\s*<td><div class="show-figure">([\s\S]*?)<\/div>/g)];
  if (!title || !rows.length) return null;
  const lines = [title, `by ${by}`, '', `Permission: shared everywhere on ContraDB (https://contradb.com/dances/${id})`, '',
    `FormationBase:\t${FORMATION[form] || form}`, 'Progression:\tSingle', 'Figures:'];
  for (const [, part, beats, text] of rows) {
    if (part.trim()) lines.push('', part.trim());
    // ContraDB's own role names (gentlespoons, ladles). Its progression mark ⁋ is kept: the simulator reads it as
    // the point where couples move on to new neighbors.
    const t = unescape(text).replace(/\bgentlespoons\b/gi, 'larks').replace(/\bladles\b/gi, 'robins').replace(/\bgentlespoon\b/gi, 'lark').replace(/\bladle\b/gi, 'robin').replace(/\s*⁋\s*/g, ' ⁋').trim();
    lines.push(`(${beats || 0}) ${t}`);
  }
  return lines.join('\n') + '\n';
}

let kept = 0;
for (let id = first; id <= last; id++) {
  try {
    const html = execFileSync('curl', ['-sS', '-m', '20', `https://contradb.com/dances/${id}`], { encoding: 'utf8' });
    const text = convert(html, id);
    if (text) { fs.writeFileSync(path.join(out, `${id}.txt`), text); kept++; }
  } catch (e) { /* missing or unreachable: skip */ }
  execFileSync('sleep', ['0.3']);
}
console.log(`Kept ${kept} shared dances from ids ${first}–${last} in ${out}`);
