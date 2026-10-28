// Checks that dancers never walk into each other: in every move (from tests/cases.js) and every test dance,
// no two dancers' centers come closer than BODY metres. The dots are drawn 0.19 m across the middle, so closer
// than about 0.38 m they overlap on screen; a swing holds partners 0.5 m apart, a do-si-do passes back to back at 0.5 m.
// Run: node tests/collisions.js   (add -v to list the closest approach in every move)
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const sandbox = {}; vm.createContext(sandbox);
vm.runInContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1] + '\nthis.Contra = Contra;', sandbox);
const { Contra } = sandbox;
const { FIGS, ENGLISH, LEADINS, TRIPLET, SQUARE } = require('./cases');
const BODY = 0.38, NUDGE = 0.3, verbose = process.argv.includes('-v');

// The closest any two dancers come between beats t0 and t1, and who and when.
function closest(c, t0, t1) {
  const ids = c.dancers.map(d => d.id), name = Object.fromEntries(c.dancers.map(d => [d.id, `${d.role} ${d.num}`]));
  let best = { d: Infinity };
  for (let t = t0; t <= t1 + 1e-9; t += 0.05) {
    const ps = ids.map(id => Contra.poseAt(c, id, t));
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const d = Math.hypot(ps[i].x - ps[j].x, ps[i].y - ps[j].y);
      if (d < best.d) best = { d, t, who: `${name[ids[i]]} and ${name[ids[j]]}` };
    }
  }
  return best;
}

// The lead-in each move is danced after: its usual set-up (Contra.SETUP, as the move builder's preview uses),
// otherwise long lines forward and back.
function leadIn(text, base) {
  const k = Contra.parseDance(`${base}A1\n(8) ${text}`).parts[0].calls[0], s = Contra.SETUP[k.fig];
  if (s === 'pair' || s === 'facing') return `(8) ${(k.who === 'neighbors') === (s === 'pair') ? 'Neighbor' : 'Partner'} swing`;
  return s || '(8) In long lines, go forward and back';
}
const cases = [];
const add = (label, text, opts, window) => cases.push({ label, text, opts, window });
for (const [beats, t] of FIGS) add(t, `A1\n${leadIn(t, '')}\n(${beats}) ${t}`, { lines: 1, sets: 3, passes: 1 }, 1);
for (const [beats, t] of FIGS.filter(([b, t]) => ENGLISH.test(t)))
  add('[proper] ' + t, `FormationBase: Duple Minor - Proper\nA1\n${leadIn(t, 'FormationBase: Duple Minor - Proper\n')}\n(${beats}) ${t}`, { lines: 1, sets: 3, passes: 1 }, 1);
for (const [form, lead, beats, t] of LEADINS) add('[lead-in] ' + t, `FormationBase: ${form}\nA1\n${lead}\n(${beats}) ${t}`, { lines: 1, sets: 3, passes: 1 }, 1);
for (const [beats, t] of TRIPLET) add('[triplet] ' + t, `FormationBase: Triplet - Proper\nA1\n(8) In long lines, go forward and back\n(${beats}) ${t}`, { lines: 1, sets: 1, passes: 1 }, 1);
for (const [beats, t] of SQUARE) add('[square] ' + t, `FormationBase: Square\nA1\n(8) Heads forward and back\n(${beats}) ${t}`, { lines: 1, sets: 1, passes: 1 }, 1);
// Each test dance at two sizes (a ring's size, and which couples meet, depend on how many there are).
for (const f of fs.readdirSync(path.join(__dirname, '..', 'dances'))) for (const [lines, sets] of [[2, 3], [1, 4]])
  add(`[dance] ${f} (${lines} line${lines > 1 ? 's' : ''}, ${sets} sets)`, fs.readFileSync(path.join(__dirname, '..', 'dances', f), 'utf8'), { lines, sets }, null);

let failures = 0;
for (const k of cases) {
  const c = Contra.compile(Contra.parseDance(k.text), k.opts);
  const t0 = k.window == null ? 0 : c.calls[k.window].t0, t1 = k.window == null ? c.total : c.calls[k.window].t1;
  const b = closest(c, t0, t1), ok = b.d >= BODY;
  // How far dancers had to ease aside to make room (a large nudge means the move itself needs fixing).
  const raw = Contra.compile(Contra.parseDance(k.text), { ...k.opts, room: false });
  let nudge = 0;
  for (let t = t0; t <= t1 + 1e-9; t += 0.1) for (const d of c.dancers) { const p = Contra.poseAt(c, d.id, t), q = Contra.poseAt(raw, d.id, t); nudge = Math.max(nudge, Math.hypot(p.x - q.x, p.y - q.y)); }
  // (Whole test dances combine figures freely, so only the moves on their own are held to this.)
  if (nudge > NUDGE && k.window != null) { failures++; console.log(`FAIL  ${k.label.padEnd(58)} dancers had to step ${nudge.toFixed(2)} m aside to make room`); }
  if (!ok) failures++;
  if (!ok || verbose) console.log(`${ok ? 'PASS' : 'FAIL'}  ${k.label.padEnd(58)} closest ${b.d.toFixed(2)} m, nudged ${nudge.toFixed(2)} m${ok ? '' : `: ${b.who}, beat ${(b.t - t0).toFixed(2)}`}`);
}
console.log(failures ? `\n${failures} of ${cases.length} moves and dances have dancers bumping into each other` : `\nNo collisions in ${cases.length} moves and dances`);
process.exit(failures ? 1 : 0);
