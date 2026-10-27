// Headless checks for the engine in index.html. Run: node tests/run.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const src = html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const sandbox = {}; vm.createContext(sandbox);
vm.runInContext(src + '\nthis.Contra = Contra;', sandbox);
const { Contra } = sandbox;

let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failures++; };
const wrap = a => ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;

const text = fs.readFileSync(path.join(__dirname, '..', 'dances', '111.txt'), 'utf8');
const dance = Contra.parseDance(text);
check(dance.title === '111' && dance.author === 'Chris Page', `title and author read (${dance.title} by ${dance.author})`);
check(dance.parts.map(p => p.name).join() === 'A1,A2,B1,B2', 'four parts A1 A2 B1 B2');
check(dance.parts.flatMap(p => p.calls).every(k => k.fig), 'every figure recognised');
const allem = dance.parts[0].calls[1];
check(allem.fig === 'allemande' && allem.who === 'robins' && allem.hand === 'L' && allem.turns === 1.5, 'Women allemande left 1 & 1/2 -> robins, left, 1.5 turns');
const circ = dance.parts[3].calls[0];
check(circ.fig === 'circle' && circ.dir === 'L' && circ.turns === 0.75, 'Circle left 3/4 read as 0.75 turns');

for (const [lines, sets] of [[1, 1], [2, 3], [4, 6]]) {
  const c = Contra.compile(dance, { lines, sets });
  const label = `${lines} line(s) x ${sets} hands-four(s)`;
  check(c.total === 64, `${label}: 64 beats`);
  check(c.warnings.length === 0, `${label}: no warnings ${c.warnings.map(w => w.text).join(' | ')}`);
  check(c.progression.good === c.progression.total, `${label}: progression ${c.progression.good}/${c.progression.total}`);

  // Continuity: nobody jumps between figures, and nothing is NaN.
  let maxJump = 0, maxTurn = 0, nan = false;
  for (const d of c.dancers) for (const k of c.calls) {
    const before = Contra.poseAt(c, d.id, k.t0 - 1e-6), after = Contra.poseAt(c, d.id, k.t0 + 1e-6);
    maxJump = Math.max(maxJump, Math.hypot(after.x - before.x, after.y - before.y));
    maxTurn = Math.max(maxTurn, Math.abs(wrap(after.a - before.a)));
    if ([after.x, after.y, after.a].some(Number.isNaN)) nan = true;
  }
  check(!nan, `${label}: no NaN positions`);
  check(maxJump < 0.01, `${label}: no position jumps between figures (max ${maxJump.toFixed(4)} m)`);
  check(maxTurn < 0.05, `${label}: no facing jumps between figures (max ${maxTurn.toFixed(3)} rad)`);
}

// Spot checks on 111 with one hands-four: where everyone is after key figures.
const c = Contra.compile(dance, { lines: 1, sets: 1 });
const at = (id, t) => Contra.poseAt(c, id, t);
const near = (p, x, y) => Math.hypot(p.x - x, p.y - y) < 0.05;
check(near(at('0.1R', 16), 0.6, -0.6) && near(at('0.2R', 16), -0.6, 0.6), 'after the robins allemande 1½ the robins have swapped corners');
check(near(at('0.1L', 64), 0.6, -0.6) && near(at('0.1R', 64), -0.6, -0.6), 'ones end at the bottom, on the same side they started');

// Speeds per figure, at 120 beats per minute (2 beats per second). Not a pass/fail check yet.
console.log('\nPeak speed per figure at 120 bpm:');
for (const k of c.calls) {
  let peak = 0;
  for (const d of c.dancers) for (let t = k.t0; t < k.t1; t += 0.02) {
    const p = at(d.id, t), q = at(d.id, t + 0.02);
    peak = Math.max(peak, Math.hypot(q.x - p.x, q.y - p.y) / (0.02 / 2));
  }
  console.log(`  ${k.part} (${String(k.beats).padStart(2)}) ${k.text.padEnd(34)} ${peak.toFixed(2)} m/s`);
}
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
