// Runs every dance in library/ (see tools/fetch-contradb.js) through the simulator and reports what it can't do
// yet: figures it doesn't recognise (most common first), dances whose progression goes wrong, dancers bumping,
// hand problems and crashes. Not a pass/fail test: a to-do list. Run: node tests/library.js [-v]
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const sandbox = {}; vm.createContext(sandbox);
vm.runInContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1] + '\nthis.Contra = Contra;', sandbox);
const { Contra } = sandbox;
const verbose = process.argv.includes('-v');

const root = path.join(__dirname, '..', 'library');
const files = fs.existsSync(root) ? fs.readdirSync(root, { recursive: true }).filter(f => f.endsWith('.txt') && !/report\.txt$|all-dances\.txt$/.test(f)).map(f => path.join(root, f)) : [];
if (!files.length) { console.log('No dances in library/. Run: node tools/fetch-contradb.js'); process.exit(0); }

const unread = new Map(), formations = new Map(), problems = { crash: [], progression: [], bump: [], hands: [], length: [] };
let clean = 0, allRead = 0;
// A figure's text with who and amounts taken out, so the same figure is counted together.
const shape = t => t.toLowerCase().replace(/\b(partners?|neighbou?rs?|shadows?|larks?|robins?|ones|twos|1s|2s|first|second|next|new|original)\b/g, '')
  .replace(/[\d½¼¾/&.,()]+/g, ' ').replace(/\s+/g, ' ').trim();
for (const f of files) {
  const name = path.relative(root, f), text = fs.readFileSync(f, 'utf8');
  let dance, c;
  try {
    dance = Contra.parseDance(text);
    formations.set(dance.formation, (formations.get(dance.formation) || 0) + 1);
    c = Contra.compile(dance, { lines: 1, sets: 3, passes: 4 });
  } catch (e) { problems.crash.push(`${name}: ${e.message}`); continue; }
  const calls = dance.parts.flatMap(p => p.calls), miss = calls.filter(k => !k.fig);
  for (const k of miss) { const s = shape(k.text); unread.set(s, [(unread.get(s) || [0])[0] + 1, k.text]); }
  if (!miss.length) allRead++;
  const bad = c.progression.firstBad !== -1, bumps = c.warnings.filter(w => w.bump), hands = c.warnings.filter(w => w.hands && w.level === 'warn');
  const long = c.perPass !== 64;
  if (!miss.length && bad) problems.progression.push(`${name} (${dance.title}): goes wrong in time ${c.progression.firstBad + 1}`);
  if (bumps.length) problems.bump.push(`${name} (${dance.title}): ${bumps[0].text}`);
  if (hands.length) problems.hands.push(`${name} (${dance.title}): ${hands[0].text}`);
  if (long) problems.length.push(`${name} (${dance.title}): ${c.perPass} beats`);
  if (!miss.length && !bad && !bumps.length && !hands.length) clean++;
}

const pct = n => `${Math.round((100 * n) / files.length)}%`;
const lines = [`${files.length} dances. Every figure read: ${allRead} (${pct(allRead)}). Read, progress correctly, no bumps or hand problems: ${clean} (${pct(clean)}).`, '',
  'Formations: ' + [...formations].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', '), '',
  'Figures not read yet (times seen, an example):',
  ...[...unread].sort((a, b) => b[1][0] - a[1][0]).slice(0, verbose ? 400 : 60).map(([s, [n, ex]]) => `  ${String(n).padStart(4)}  ${ex}`), ''];
for (const [k, label] of [['crash', 'Crashes'], ['progression', 'Progression goes wrong (every figure read)'], ['bump', 'Dancers bump'], ['hands', 'Hand problems'], ['length', 'Not 64 beats (often the transcription)']])
  lines.push(`${label}: ${problems[k].length}`, ...problems[k].slice(0, verbose ? 1000 : 15).map(s => '  ' + s), '');
const report = lines.join('\n');
fs.writeFileSync(path.join(root, 'report.txt'), report);
console.log(report);
