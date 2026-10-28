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
  const problems = c.warnings.filter(w => w.level !== 'info'), infos = c.warnings.filter(w => w.level === 'info');
  check(problems.length === 0, `${label}: no warnings ${problems.map(w => w.text).join(' | ')}`);
  check(infos.length === 5 && infos.filter(w => /pull by/.test(w.text)).length === 4 && infos.some(w => /Circle left 3\/4/.test(w.text)),
    `${label}: timing notes for the four 2-beat pull-bys and the 6-beat circle`);
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
check(near(at('0.1R', 16), 0.6, -0.5) && near(at('0.2R', 16), -0.6, 0.5), 'after the robins allemande 1½ the robins have swapped corners');
check(near(at('0.1L', 64), 0.6, -0.5) && near(at('0.1R', 64), -0.6, -0.5), 'ones end at the bottom, on the same side they started');

// Box the gnat (A2, beats 28-32): pull in close, push back out, then circle around each other while turning.
const gap = t => { const a = at('0.1L', t), b = at('0.2R', t); return Math.hypot(a.x - b.x, a.y - b.y); };
check(gap(28) > 0.95 && gap(29) < 0.55 && gap(30) > 0.85, `box the gnat: pull in close on beat 1, push out on beat 2 (${gap(28).toFixed(2)} -> ${gap(29).toFixed(2)} -> ${gap(30).toFixed(2)} m)`);
const L0 = at('0.1L', 28), R0 = at('0.2R', 28), L30 = at('0.1L', 30), L1 = at('0.1L', 32), R1 = at('0.2R', 32);
const d2 = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
check(d2(L30, L0) < d2(L30, R0), 'box the gnat: no trading of places before beat 3');
check(d2(L1, R0) < d2(L1, L0) && d2(R1, L0) < d2(R1, R0) && Math.abs(gap(32) - 0.9) < 0.05, `box the gnat: places traded by the end of beat 4, at arm's length (${gap(32).toFixed(2)} m)`);
const turned = id => Math.abs(Math.abs(at(id, 32).a - at(id, 30).a) - Math.PI) < 0.05;
check(turned('0.1L') && turned('0.2R') && at('0.1L', 32).a < at('0.1L', 30).a && at('0.2R', 32).a > at('0.2R', 30).a,
  'box the gnat: lark turns 180 degrees to the right, robin 180 degrees to the left');
const L34 = at('0.1L', 34);
check(Math.abs(L34.x - (-0.6)) < 0.05 && Math.abs(L34.y - 0.5) < 0.05, 'the neighbor pull by after box the gnat carries the lark on to a full place');

// Robins stand still during the men's pull by, so they finish the partner pull by facing into the set.
const facesIn = (id, t) => { const p = at(id, t); return Math.cos(p.a) * Math.sign(-p.x) > 0.95; };
check(facesIn('0.1R', 22) && facesIn('0.2R', 22), 'robins finish the partner pull by right facing into the set (A2)');
check(facesIn('0.1R', 34) && facesIn('0.2R', 34), 'robins finish the neighbor pull by right facing into the set (B1)');

// Each figure ends with dancers already facing the way the next figure needs.
const facing = (id, t, otherId) => { const p = at(id, t), q = at(otherId, t); return Math.cos(p.a - Math.atan2(q.y - p.y, q.x - p.x)) > 0.98; };
check(facing('0.1R', 16, '0.1L') && facing('0.1L', 16, '0.1R'), 'after the robins allemande, partners already face each other for the partner balance');
check(facing('0.1L', 24, '0.2R') && facing('0.2R', 24, '0.1L'), "after the men's pull by, neighbors already face each other for the neighbor balance");
check(facing('0.1L', 20, '0.1R') && facing('0.1R', 20, '0.1L'), 'after the partner balance, partners face each other to pull by');

check(facing('0.1R', 8, '0.2R') && facing('0.2R', 8, '0.1R'), 'robins face each other as the allemande starts');
let closestR = 9; for (let t = 9; t < 15; t += 0.05) { const a = at('0.1R', t), b = at('0.2R', t); closestR = Math.min(closestR, Math.hypot(a.x - b.x, a.y - b.y)); }
check(Math.abs(closestR - 0.6) < 0.03, `robins allemande close together (${closestR.toFixed(2)} m apart)`);
let circleFacesIn = true;
for (let t = 48; t <= 52.5; t += 0.25) {
  const ps = ['0.1L', '0.1R', '0.2L', '0.2R'].map(id => at(id, t)), cx = ps.reduce((s, p) => s + p.x, 0) / 4, cy = ps.reduce((s, p) => s + p.y, 0) / 4;
  for (const p of ps) if (Math.cos(p.a - Math.atan2(cy - p.y, cx - p.x)) < 0.98) circleFacesIn = false;
}
check(circleFacesIn, 'everyone faces the center during the circle');
const ringGap = Math.hypot(at('0.1L', 51).x - at('0.2R', 51).x, at('0.1L', 51).y - at('0.2R', 51).y);
check(Math.abs(ringGap - 0.9) < 0.03 || Math.abs(Math.hypot(at('0.1L', 51).x - at('0.1R', 51).x, at('0.1L', 51).y - at('0.1R', 51).y) - 0.9) < 0.03,
  `the circle is drawn in so hands can reach (neighbors in the ring ${ringGap.toFixed(2)} m apart)`);

// Writing a dance back out gives the same dance when read again, and new lines read back as written.
const again = Contra.parseDance(Contra.serialize(dance));
check(JSON.stringify(again.parts) === JSON.stringify(dance.parts) && again.title === dance.title && again.author === dance.author, 'writing the dance out and reading it back gives the same dance');
const made = [
  { fig: 'allemande', who: 'neighbors', hand: 'R', turns: 1.5 }, { fig: 'balance', who: 'partners', hand: 'R' }, { fig: 'pullBy', who: 'larks', hand: 'L' },
  { fig: 'boxTheGnat', who: 'neighbors' }, { fig: 'swing', who: 'neighbors' }, { fig: 'circle', dir: 'R', turns: 0.75 }, { fig: 'longLines' },
];
check(made.every(k => { const r = Contra.parseDance('A1\n(8) ' + Contra.callText(k)).parts[0].calls[0];
  return r.fig === k.fig && (k.who === undefined || r.who === k.who || k.fig === 'longLines') && (k.hand === undefined || r.hand === k.hand) && (k.turns === undefined || r.turns === k.turns) && (k.dir === undefined || r.dir === k.dir); }),
  `figure lines written by the editor read back the same (${made.map(Contra.callText).join(' | ')})`);

// ---------- Phase 2: many times through ----------
{
  const m = Contra.compile(dance, { lines: 1, sets: 3, passes: 8 });
  check(m.total === 8 * 64 && m.passes.length === 8, 'eight times through = 512 beats');
  check(m.progression.firstBad === -1, `progression works every time through (${m.passes.map(p => p.check.good + '/' + p.check.total).join(', ')})`);
  check(m.passes[0].outs.length === 0 && m.passes[1].outs.map(o => o.couple + ' ' + o.end).join() === '0.2 top,0.5 bottom',
    `time 2: couple 2 out at the top, couple 5 out at the bottom (${m.passes[1].outs.map(o => o.couple + ' ' + o.end).join()})`);
  check(m.passes[2].outs.length === 0 && m.passes[2].groups.length === 3, 'time 3: everyone back in, three hands-fours');
  check(m.passes.every((p, i) => p.groups.length === (i % 2 ? 2 : 3)), `hands-fours keep forming every time through (${m.passes.map(p => p.groups.length).join(', ')})`);
  const mt = (id, t) => Contra.poseAt(m, id, t);
  check(mt('0.2L', 64 + 8).x > 0.5 && mt('0.2R', 64 + 8).x < -0.5, 'couple 2 crosses over in the first 8 beats of waiting at the top');
  const facesInAt = (id, t) => { const p = mt(id, t); return Math.cos(p.a) * Math.sign(-p.x) > 0.95; };
  check(facesInAt('0.2L', 64 + 9) && facesInAt('0.2R', 64 + 9), 'after crossing, the waiting couple faces in');
  const swingGap = Math.hypot(mt('0.2L', 64 + 42).x - mt('0.2R', 64 + 42).x, mt('0.2L', 64 + 42).y - mt('0.2R', 64 + 42).y);
  check(swingGap < 0.6, `the waiting couple swings with the line in B1 (${swingGap.toFixed(2)} m apart)`);
  const met = Contra.meetings(m, '0.1').map(x => x.with || 'out ' + x.out).join(', ');
  check(met === '2, 4, 6, 5, 3, out bottom, 2, 4', `couple 1 meets 2, 4, 6, 5, 3 going down, waits at the bottom, then comes back up as a two (${met})`);
  let jump = 0, nan = false;
  for (const d of m.dancers) for (const k of m.calls) {
    const a = mt(d.id, k.t0 - 1e-6), b = mt(d.id, k.t0 + 1e-6);
    jump = Math.max(jump, Math.hypot(a.x - b.x, a.y - b.y), Math.abs(wrap(a.a - b.a)) / 10);
    if ([b.x, b.y, b.a].some(Number.isNaN)) nan = true;
  }
  check(!nan && jump < 0.01, `no jumps or turns-in-place between figures over eight times through (max ${jump.toFixed(4)})`);
  const big = Contra.compile(dance, { lines: 4, sets: 6, passes: 12 });
  check(big.progression.firstBad === -1, '4 lines x 6 hands-fours, 12 times through: progression works throughout');
}

// A sequence with a chain and a hey: worked out by hand, every dancer's place after each figure.
{
  const seq = Contra.parseDance(`A1\n(4) Neighbor balance\n(12) Neighbor swing\nA2\n(8) Robins chain\n(8) Half hey, robins pass right to start\nB1\n(4) Partner balance\n(12) Partner swing\nB2\n(8) Circle left 3/4\n(8) Neighbor swing`);
  const k = Contra.compile(seq, { lines: 1, sets: 1, passes: 1 }), q = (id, t) => Contra.poseAt(k, id, t);
  const at4 = (t, want) => Object.entries(want).every(([id, [x, y]]) => Math.hypot(q(id, t).x - x, q(id, t).y - y) < 0.06);
  check(at4(16, { '0.1L': [0.6, -0.5], '0.2R': [0.6, 0.5], '0.2L': [-0.6, 0.5], '0.1R': [-0.6, -0.5] }), 'after the neighbor swing, everyone is on the side with robins on the right');
  check(at4(24, { '0.1R': [0.6, 0.5], '0.1L': [0.6, -0.5], '0.2R': [-0.6, -0.5], '0.2L': [-0.6, 0.5] }), 'robins chain: robins cross and courtesy turn, ending on the right of the lark there');
  check(at4(32, { '0.1L': [-0.6, 0.5], '0.1R': [-0.6, -0.5], '0.2L': [0.6, -0.5], '0.2R': [0.6, 0.5] }), 'half hey: everyone ends diagonally across from where they started');
  const robinsMeet = Math.hypot(q('0.1R', 26).x - q('0.2R', 26).x, q('0.1R', 26).y - q('0.2R', 26).y);
  check(robinsMeet < 1.0, `half hey: the robins pass close in the middle first (${robinsMeet.toFixed(2)} m apart at beat 3 of the hey)`);
}

// ---------- Formations ----------
{
  const side = (c, id) => Math.sign(c.start[id].x);
  const lay = name => Contra.compile(Contra.parseDance(`FormationBase: ${name}\nA1\n(8) In long lines, go forward and back`), { lines: 1, sets: 2, passes: 1 });
  const expect = {
    'Duple Minor - Improper': [1, -1, -1, 1], 'Duple Minor - Proper': [-1, 1, -1, 1], 'Duple Minor - Indecent': [-1, 1, 1, -1],
    'Duple Minor - All Improper': [1, -1, 1, -1], 'Duple Minor - Progressed Improper': [1, -1, -1, 1], 'Duple Minor - Reverse Progression Improper': [-1, 1, 1, -1],
  };
  for (const [name, [l1, r1, l2, r2]] of Object.entries(expect)) {
    const c = lay(name);
    const ok = side(c, '0.1L') === l1 && side(c, '0.1R') === r1 && side(c, '0.2L') === l2 && side(c, '0.2R') === r2 && c.passes[0].groups.length === 2 && !c.warnings.some(w => /isn't supported/.test(w.text));
    check(ok, `${name}: couples start on the right sides and form two hands-fours`);
  }
  const pi = lay('Duple Minor - Progressed Improper');
  check(pi.start['0.1L'].y < pi.start['0.2L'].y, 'progressed improper: the ones start below the twos');
  for (const [name, onesSide] of [['Duple Minor - Becket CW', 1], ['Duple Minor - Becket CCW', -1]]) {
    const c = lay(name), same = id => side(c, id + 'L') === side(c, id + 'R');
    check(same('0.1') && same('0.2') && side(c, '0.1L') === onesSide && side(c, '0.2L') === -onesSide && c.passes[0].groups.length === 2,
      `${name}: partners side by side, ones on the ${onesSide > 0 ? '+x' : '-x'} side, two hands-fours`);
  }
  // A Becket dance that progresses by slicing: every time through, couples face a new couple across;
  // couples out at the ends cross the set together and come back in.
  const b = Contra.compile(Contra.parseDance('FormationBase: Duple Minor - Becket CW\nA1\n(8) Slice left'), { lines: 1, sets: 3, passes: 8 });
  check(b.progression.firstBad === -1, `Becket slice left progresses every time through (${b.passes.map(p => p.check.good + '/' + p.check.total).join(', ')})`);
  check(b.passes[1].outs.length === 2, 'Becket: the second time through, a couple waits out at each end');
  check(b.passes.every((p, i) => p.groups.length === (i % 2 ? 2 : 3)), `Becket: couples come back in, so hands-fours keep forming (${b.passes.map(p => p.groups.length).join(', ')})`);
  const pr = Contra.compile(Contra.parseDance('FormationBase: Duple Minor - Proper\nA1\n(8) In long lines, go forward and back'), { lines: 1, sets: 2, passes: 1 });
  check(pr.warnings.every(w => !/isn't supported/.test(w.text)), 'proper is a supported formation');
  const odd = Contra.parseDance('FormationBase: Triple Minor - Proper\nA1\n(8) In long lines, go forward and back');
  check(odd.warnings.some(w => /isn't supported yet/.test(w.text)), 'a triple minor is flagged as not supported yet');
}

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
