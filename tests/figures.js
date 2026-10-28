// Runs every figure from the starting (improper) formation, after long lines so dancers arrive facing the way
// the figure starts (as they would in a dance), and checks the motion is sane.
// Run: node tests/figures.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const sandbox = {}; vm.createContext(sandbox);
vm.runInContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1] + '\nthis.Contra = Contra;', sandbox);
const { Contra } = sandbox;

const FIGS = [
  [8, 'Partner right shoulder round 1'], [8, 'Neighbor gypsy left shoulder'], [8, 'Neighbor arm right 1'], [8, 'Partner two-hand turn clockwise 1'],
  [4, 'Partner pass through by the right'], [4, 'Robins trade by right'], [4, 'Ones cross by right'], [4, 'Neighbor swat the flea'],
  [4, 'Partner California twirl'], [4, 'Neighbor star through'], [4, 'Partner roll away with a half sashay'], [4, 'Partner half sashay'],
  [8, 'Neighbor do-si-do 1 & 1/2'], [8, 'Partner seesaw'], [8, 'Mad robin clockwise around neighbor'], [4, 'Set to partner'],
  [4, 'Turn single right'], [4, 'Balance the wave'], [4, 'Balance the ring'], [8, 'Star right 1'], [8, 'Star left 3/4'],
  [4, 'Petronella turn'], [8, 'Partner poussette clockwise 1/2'], [4, 'Broken circle left 1/4'], [4, 'Star promenade 1/2'], [8, 'Weathervane 1/2'],
  [4, 'Partner courtesy turn'], [4, 'Partner turn as a couple'], [4, 'Neighbor gate counterclockwise 1/2'], [4, 'Partner butterfly whirl'],
  [8, 'Robins chain'], [8, 'Larks chain'], [8, 'Right and left through'], [8, 'Flutterwheel'], [8, 'Reverse flutterwheel'],
  [8, 'Square through 2'], [16, 'Square through 4'], [4, 'Robins give and take'], [8, 'Half hey, robins pass right to start'],
  [16, 'Hey for four, larks pass left to start'], [8, 'Ones half figure eight'], [16, 'Ones figure eight'], [8, 'Slice left'], [4, 'Shift left'],
  [2, 'Veer right'], [8, 'Ones lead down the center'], [8, 'Down the hall in a line of four'], [8, 'Up the hall in a line of four'],
  [4, 'Ones cast off'], [4, 'Ones cast down'],
  // English country dance figures
  [8, 'Partner side right'], [8, 'Neighbor siding left'], [8, 'Partner sharp siding'], [8, 'Up a double and back'], [4, 'Fall back'],
  [2, 'Honour your partner'], [2, 'Clap'], [4, 'Neighbor hole in the wall cross'], [8, 'Partner turn by the right hand 1'],
  [4, 'Neighbor left hand turn 1/2'], [8, 'Partner Bentley allemande right'], [8, 'Neighbor back to back'],
  [8, 'Partner half draw poussette clockwise'], [16, 'Rights and lefts, 4 changes'], [8, 'First corners do-si-do'], [8, 'Half open ladies chain'], [8, 'First corners chevron, crossing by the right'], [16, 'Ones dolphin hey across the set'], [16, 'Double figure eight, 2s cross up as 1s cast down'],
];
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
for (const [beats, text] of FIGS.filter(([b, t]) => /side|siding|double|fall back|honour|hole in the wall|hand turn|turn by|bentley|back to back|draw poussette|rights and lefts|corners|chevron|dolphin/i.test(t))) {
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

// Hey for three, in a three-couple set.
for (const [beats, text] of [[8, 'Hey for three on the sides, right shoulders to start'], [8, 'Half hey for three on the sides']]) {
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
  const ok = call.fig === 'heyThree' && !nan && peak < 5 && moved > 0.5;
  if (!ok) failures++;
  FIGS.push([beats, text]);
  rows.push(`${ok ? 'PASS' : 'FAIL'}  ${('[triplet] ' + text).padEnd(42)} ${String(call.fig).padEnd(17)} peak ${peak.toFixed(2)} m/s`);
}

// Square figures, in a square, after the heads go forward and back.
const SQUARE = [[16, 'Promenade home'], [8, 'Grand right and left'], [16, 'Grand right and left all the way'], [8, 'Heads pass through to the next square'],
  [8, 'Corner allemande left 1'], [8, 'Partner swing'], [8, 'Heads ladies chain'], [8, 'Sides right and left through'], [8, 'Circle left 1/2'],
  [8, 'Larks star right 1'], [8, 'Sides forward and back']];
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
