// Runs every figure from the starting (improper) formation, after long lines so dancers arrive facing the way
// the figure starts (as they would in a dance), and checks the motion is sane.
// Run: node tests/figures.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const sandbox = {}; vm.createContext(sandbox);
vm.runInContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1] + '\nthis.Contra = Contra;', sandbox);
const { Contra } = sandbox;

const { FIGS: BASE, ENGLISH, LEADINS, TRIPLET, SQUARE } = require('./cases');
const FIGS = BASE.slice();
const wrap = a => ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
let failures = 0;
const rows = [];
for (const [beats, text] of FIGS) {
  const dance = Contra.parseDance(`A1\n(8) In long lines, go forward and back\n(${beats}) ${text}`);
  const call = dance.parts[0].calls[1];
  const c = Contra.compile(dance, { lines: 1, sets: 2, passes: 1 });
  let peak = 0, spin = 0, nan = false, off = false;
  for (const d of c.dancers) {
    let prev = Contra.poseAt(c, d.id, 8);
    for (let t = 8.02; t <= 8 + beats + 1e-9; t += 0.02) {
      const p = Contra.poseAt(c, d.id, t);
      if ([p.x, p.y, p.a].some(v => Number.isNaN(v) || v === undefined)) nan = true;
      if (Math.abs(p.x) > 3 || Math.abs(p.y) > 5) off = true;
      peak = Math.max(peak, Math.hypot(p.x - prev.x, p.y - prev.y) / 0.01);         // 0.02 beats = 0.01 s at 120 bpm
      spin = Math.max(spin, Math.abs(wrap(p.a - prev.a)) / 0.01 * 180 / Math.PI);
      prev = p;
    }
  }
  const ok = call.fig && !nan && !off && peak < 5 && spin < 1500;
  if (!ok) failures++;
  rows.push(`${ok ? 'PASS' : 'FAIL'}  ${text.padEnd(42)} ${String(call.fig).padEnd(17)} peak ${peak.toFixed(2)} m/s, turning up to ${Math.round(spin)}°/s${nan ? ', NaN' : ''}${off ? ', leaves the floor' : ''}`);
}
// English figures again, in a proper set (as English dances usually are).
for (const [beats, text] of FIGS.filter(([b, t]) => ENGLISH.test(t))) {
  const dance = Contra.parseDance(`FormationBase: Duple Minor - Proper\nA1\n(8) In long lines, go forward and back\n(${beats}) ${text}`);
  const call = dance.parts[0].calls[1], c = Contra.compile(dance, { lines: 1, sets: 2, passes: 1 });
  let peak = 0, spin = 0, nan = false;
  for (const d of c.dancers) {
    let prev = Contra.poseAt(c, d.id, 8);
    for (let t = 8.02; t <= 8 + beats + 1e-9; t += 0.02) {
      const p = Contra.poseAt(c, d.id, t);
      if ([p.x, p.y, p.a].some(v => Number.isNaN(v))) nan = true;
      peak = Math.max(peak, Math.hypot(p.x - prev.x, p.y - prev.y) / 0.01); spin = Math.max(spin, Math.abs(wrap(p.a - prev.a)) / 0.01 * 180 / Math.PI); prev = p;
    }
  }
  const ok = call.fig && !nan && peak < 5 && spin < 1500;
  if (!ok) failures++;
  rows.push(`${ok ? 'PASS' : 'FAIL'}  ${('[proper] ' + text).padEnd(42)} ${String(call.fig).padEnd(17)} peak ${peak.toFixed(2)} m/s, turning up to ${Math.round(spin)}°/s`);
}

// Moves that need a particular lead-in: [formation, lead-in, beats, figure].
for (const [form, lead, beats, text] of LEADINS) {
  const dance = Contra.parseDance(`FormationBase: ${form}\nA1\n${lead}\n(${beats}) ${text}`);
  const call = dance.parts[0].calls[1], c = Contra.compile(dance, { lines: 1, sets: 3, passes: 1 }), t0 = c.calls[1].t0;
  let peak = 0, spin = 0, nan = false;
  for (const d of c.dancers) {
    let prev = Contra.poseAt(c, d.id, t0);
    for (let t = t0 + 0.02; t <= t0 + beats + 1e-9; t += 0.02) {
      const p = Contra.poseAt(c, d.id, t);
      if ([p.x, p.y, p.a].some(v => Number.isNaN(v))) nan = true;
      peak = Math.max(peak, Math.hypot(p.x - prev.x, p.y - prev.y) / 0.01); spin = Math.max(spin, Math.abs(wrap(p.a - prev.a)) / 0.01 * 180 / Math.PI); prev = p;
    }
  }
  const ok = call.fig && !nan && peak < 5 && spin < 1500 && !c.warnings.some(w => /needs both corners/.test(w.text));
  if (!ok) failures++;
  FIGS.push([beats, text]);
  rows.push(`${ok ? 'PASS' : 'FAIL'}  ${('[lead-in] ' + text).padEnd(42)} ${String(call.fig).padEnd(17)} peak ${peak.toFixed(2)} m/s, turning up to ${Math.round(spin)}°/s`);
}

// Hey for three, in a three-couple set.
for (const [beats, text] of TRIPLET) {
  const dance = Contra.parseDance(`FormationBase: Triplet - Proper\nA1\n(8) In long lines, go forward and back\n(${beats}) ${text}`);
  const call = dance.parts[0].calls[1], c = Contra.compile(dance, { lines: 1, sets: 1, passes: 1 });
  let peak = 0, nan = false, moved = 0;
  for (const d of c.dancers) {
    let prev = Contra.poseAt(c, d.id, 8);
    for (let t = 8.02; t <= 8 + beats + 1e-9; t += 0.02) {
      const p = Contra.poseAt(c, d.id, t);
      if ([p.x, p.y, p.a].some(v => Number.isNaN(v))) nan = true;
      peak = Math.max(peak, Math.hypot(p.x - prev.x, p.y - prev.y) / 0.01); moved = Math.max(moved, Math.hypot(p.x - c.start[d.id].x, p.y - c.start[d.id].y)); prev = p;
    }
  }
  const ok = /heyThree|crossoverMirrorHey/.test(call.fig) && !nan && peak < 5 && moved > 0.5;
  if (!ok) failures++;
  FIGS.push([beats, text]);
  rows.push(`${ok ? 'PASS' : 'FAIL'}  ${('[triplet] ' + text).padEnd(42)} ${String(call.fig).padEnd(17)} peak ${peak.toFixed(2)} m/s`);
}

for (const [beats, text] of SQUARE) {
  const dance = Contra.parseDance(`FormationBase: Square\nA1\n(8) Heads forward and back\n(${beats}) ${text}`);
  const call = dance.parts[0].calls[1];
  const c = Contra.compile(dance, { lines: 1, sets: 1, passes: 1 });
  let peak = 0, spin = 0, nan = false, off = false;
  for (const d of c.dancers) {
    let prev = Contra.poseAt(c, d.id, 8);
    for (let t = 8.02; t <= 8 + beats + 1e-9; t += 0.02) {
      const p = Contra.poseAt(c, d.id, t);
      if ([p.x, p.y, p.a].some(v => Number.isNaN(v) || v === undefined)) nan = true;
      if (Math.abs(p.x) > 3 || Math.abs(p.y) > 3) off = true;
      peak = Math.max(peak, Math.hypot(p.x - prev.x, p.y - prev.y) / 0.01);
      spin = Math.max(spin, Math.abs(wrap(p.a - prev.a)) / 0.01 * 180 / Math.PI);
      prev = p;
    }
  }
  const ok = call.fig && !nan && !off && peak < 5 && spin < 1500;
  if (!ok) failures++;
  rows.push(`${ok ? 'PASS' : 'FAIL'}  ${('[square] ' + text).padEnd(42)} ${String(call.fig).padEnd(17)} peak ${peak.toFixed(2)} m/s, turning up to ${Math.round(spin)}°/s${nan ? ', NaN' : ''}${off ? ', leaves the floor' : ''}`);
}
console.log(rows.join('\n'));
console.log(failures ? `\n${failures} figure(s) failed` : `\nAll ${FIGS.length + SQUARE.length} figures run`);
process.exit(failures ? 1 : 0);
