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
  const odd = Contra.parseDance('FormationBase: Zia\nA1\n(8) In long lines, go forward and back');
  check(odd.warnings.some(w => /isn't supported yet/.test(w.text)), 'a zia is flagged as not supported yet');
}

// Triple minor, four facing four and Sicilian circle: groups keep forming and everyone progresses.
{
  const run = (f, body, sets, passes) => Contra.compile(Contra.parseDance(`FormationBase: ${f}\nA1\n${body}`), { lines: 1, sets, passes });
  for (const f of ['Triple Minor - Proper', 'Triple Minor - Ones Improper']) {
    const c = run(f, '(8) In long lines, go forward and back\n(4) Ones cast off', 3, 12);
    check(c.progression.firstBad === -1 && c.passes.every((p, i) => p.groups.length === [3, 3, 2][i % 3]), `${f}: progresses 12 times through, groups ${c.passes.map(p => p.groups.length).join(',')}`);
    check(c.passes[1].outs.some(o => o.couple === '0.2' && o.end === 'top') && c.passes[2].outs.some(o => o.couple === '0.2'), `${f}: a couple reaching the top waits out twice`);
    check(c.passes[2].outs.some(o => o.couple === '0.7' && o.end === 'bottom') && !c.passes[3].outs.some(o => o.couple === '0.7'), `${f}: ones reaching the bottom wait once`);
  }
  const f4 = run('Four Facing Four', '(8) Neighbor pass through', 2, 9);
  check(f4.progression.firstBad === -1 && f4.passes.every((p, i) => p.groups.length === (i % 2 ? 2 : 4)), `four facing four: lines pass through to new lines, ends turn around (${f4.passes.map(p => p.groups.length).join(',')})`);
  const si = run('Sicilian Circle', '(8) Neighbor pass through', 4, 9);
  check(si.progression.firstBad === -1 && si.passes.every(p => p.groups.length === 4 && p.outs.length === 0), 'Sicilian circle: couples progress around the circle with no ends');
  for (const f of ['Duple Minor - Progressed Improper', 'Duple Minor - Reverse Progression Improper']) {
    const c = run(f, '(4) Ones cast off', 3, 10);
    check(c.passes.every((p, i) => p.groups.length === (i % 2 ? 2 : 3)), `${f}: couples at the ends wait one time and come back in (${c.passes.map(p => p.groups.length).join(',')})`);
  }
}

// Squares and grid squares.
{
  check(['Square', 'Grid Square', 'Double Square', 'Hexagon'].map(f => Contra.parseDance(`FormationBase: ${f}\nA1\n(8) Circle left`).formation).join() === 'square,gridSquare,improper,improper',
    'square and grid square read; double squares and hexagons flagged as not supported yet');
  const sq = Contra.parseDance(fs.readFileSync(path.join(__dirname, '..', 'dances', 'square-test.txt'), 'utf8'));
  check(sq.parts.flatMap(p => p.calls).every(k => k.fig), 'square test dance: every figure recognised');
  const c = Contra.compile(sq, { lines: 1, sets: 1, passes: 3 });
  const home = c.dancers.every(d => Math.hypot(c.final[d.id].x - c.start[d.id].x, c.final[d.id].y - c.start[d.id].y) < 0.05);
  check(c.warnings.length === 0 && c.progression.firstBad === -1 && home, 'square: forward and back, chains, right and left throughs, grand right and left and promenade home bring everyone home');
  check(c.passes.every(p => p.groups.length === 1 && p.groups[0].members.length === 4 && p.outs.length === 0), 'square: one square of four couples, nobody out');
  const swap = Contra.compile(Contra.parseDance('FormationBase: Square\nA1\n(8) Corner swing\n(8) Promenade 1/2'), { lines: 1, sets: 1, passes: 1 });
  const near = (a, b) => Math.hypot(swap.final[a].x - swap.final[b].x, swap.final[a].y - swap.final[b].y) < 1.1;
  check(near('0.1L', '0.4R') && near('0.3L', '0.2R') && swap.progression.firstBad === -1, 'square: after a corner swing, each lark promenades with his corner');
  const grid = Contra.compile(Contra.parseDance(fs.readFileSync(path.join(__dirname, '..', 'dances', 'grid-square-test.txt'), 'utf8')), { lines: 2, sets: 2, passes: 6 });
  const visits = Contra.meetings(grid, '0.1').map(m => m.square);
  check(grid.warnings.length === 0 && grid.progression.firstBad === -1 && grid.passes.every(p => p.groups.length === 4), `grid square: couples pass to the next square and every square keeps dancing (couple 0.1 in squares ${visits.join(',')})`);
  check(new Set(visits).size > 1, 'grid square: a couple travels to other squares');
}

// Other formations: fixed sets, circle mixers, tempest, grid contras.
{
  const read = f => Contra.parseDance(`FormationBase: ${f}\nA1\n(8) Circle left`).formation;
  check(['Triplet - Proper', 'Triplet - Improper', 'Two couple longways set', 'Quadruplet', '5 couple longways set', 'Circle Mixer', 'Tempest', 'Grid Contra - Improper', 'Hexagon'].map(read).join()
    === 'set3Proper,set3Improper,set2Improper,set4Proper,set5Proper,circleMixer,tempest,gridContra,improper', 'formations read: sets of 2-6 couples, circle mixer, tempest, grid contra; hexagon flagged');
  const file = f => Contra.parseDance(fs.readFileSync(path.join(__dirname, '..', 'dances', f), 'utf8'));
  const tri = Contra.compile(file('triplet-test.txt'), { lines: 1, sets: 1, passes: 6 });
  const tops = tri.passes.map(p => p.groups[0].members[0]);
  check(tri.warnings.length === 0 && tri.progression.firstBad === -1 && tops.join() === '0.1,0.2,0.3,0.1,0.2,0.3',
    `triplet: everyone ends in a place every time, and each couple takes a turn at the top (${tops.join(', ')})`);
  const mix = Contra.compile(file('circle-mixer-test.txt'), { lines: 1, sets: 3, passes: 4 });
  const robinNear = c => c.dancers.filter(d => d.role === 'robin').sort((a, b) => Math.hypot(c.final[a.id].x - c.final['0.1L'].x, c.final[a.id].y - c.final['0.1L'].y) - Math.hypot(c.final[b.id].x - c.final['0.1L'].x, c.final[b.id].y - c.final['0.1L'].y))[0].id;
  check(mix.warnings.length === 0 && mix.progression.firstBad === -1 && mix.couples.length === 10 && robinNear(mix) !== '0.1R',
    `circle mixer: 10 couples, everyone ends in a place, and lark 1 has a new partner (${robinNear(mix)})`);
  const tp = Contra.compile(file('tempest-test.txt'), { lines: 1, sets: 2, passes: 1 });
  check(tp.passes[0].groups.length === 4 && tp.passes[0].outs.length === 0 && tp.dancers.length === 16, 'tempest: two minor sets of four couples, each ones couple with its side couple');
  const g111 = Contra.compile(Contra.parseDance(text.replace('Duple Minor - Improper', 'Grid Contra - Improper')), { lines: 3, sets: 3, passes: 4 });
  check(g111.progression.firstBad === -1 && Math.abs(g111.bounds.maxX - g111.bounds.minX - 6) < 0.01, 'grid contra: "111" progresses in three lines packed side by side');
  const ecd = Contra.parseDance('A1\n(8) Partner side right\n(8) Sharp siding\n(8) Up a double and back\n(4) 1st corners hole in the wall cross\n(8) Partner Bentley allemande right\n(8) Hey for three\n(8) Rights and lefts\n(8) 2s and 3s first corners do-si-do');
  check(ecd.parts[0].calls.map(k => k.fig).join() === 'siding,sharpSiding,upDouble,holeInWall,bentleyAllemande,heyThree,squareThrough,dosido'
    && ecd.parts[0].calls[7].turns === 1 && ecd.parts[0].calls[7].who === 'firstCorners', 'English figures read (and couple numbers are not read as amounts)');
}

// Hands.
{
  const c = Contra.compile(dance, { lines: 1, sets: 2, passes: 1 });
  const H = Contra.handsAt(c, 12), r1 = H['0.1R'].L, r2 = H['0.2R'].L;
  check(r1.held && r2.held && Math.hypot(r1.x - r2.x, r1.y - r2.y) < 0.05 && !H['0.1L'].L.held, 'hands: robins join left hands in their allemande; larks\' hands are free');
  const ring = Contra.handsAt(c, 52);
  check(c.dancers.every(d => ring[d.id].L.held && ring[d.id].R.held), 'hands: everyone holds both hands in the circle');
  check(!c.warnings.some(w => w.hands), '"111" has no hand problems');
  const far = Contra.compile(Contra.parseDance('FormationBase: Triplet - Proper\nA1\n(4) 1s and 3s first corners balance (RH)'), { lines: 1, sets: 1, passes: 1 });
  check(far.warnings.some(w => w.hands && /stretch/.test(w.text)), 'hands: a hand balance between couples two places apart is flagged as out of reach');
  // A balance by the right into a pull by right: the same hands stay joined across the change of figure.
  const kept = [19.9, 20, 20.1, 20.4].every(t => Contra.handsAt(c, t)['0.1L'].R.held);
  check(kept, 'hands: partners keep right hands joined from the balance into the pull by');
  const sw = Contra.handsAt(c, 40)['0.1L'];
  check(sw.L.held && sw.R.held && sw.R.touch, 'hands: in a swing the lark holds her right hand with his left, his right hand at her back');
  const quick = Contra.compile(Contra.parseDance('A1\n(4) Neighbor balance (RH)\n(4) Partner pull by right'), { lines: 1, sets: 1, passes: 1 });
  check(quick.warnings.some(w => w.hands && /almost at once/.test(w.text)), 'hands: letting go of a neighbor\'s hand and taking a partner\'s at once is noted');
  const holdsOf = text => Contra.compile(Contra.parseDance(`A1\n(8) Neighbor swing\n(8) ${text}`), { lines: 1, sets: 1, passes: 1 }).calls[1].holds.length;
  check(['Square through 2', 'Flutterwheel', 'Robins give and take'].every(f => holdsOf(f) > 0), 'hands: square through, flutterwheel and give and take take hands');
}

// More formations from the glossary: six facing six, singlet, whole-set longways dances; the new contra moves.
{
  const read = f => Contra.parseDance(`FormationBase: ${f}\nA1\n(8) Circle left`).formation;
  check(['Six Facing Six', 'Singlet', 'Longways set', 'Three facing three', 'Zia'].map(read).join() === 'sixFacingSix,singlet,set6Proper,improper,improper', 'six facing six, singlet and whole-set longways read; three facing three and zia flagged');
  const six = Contra.compile(Contra.parseDance('FormationBase: Six Facing Six\nA1\n(8) Neighbor pass through'), { lines: 1, sets: 2, passes: 4 });
  check(six.progression.firstBad === -1 && six.passes[0].groups.length === 6, 'six facing six: lines of three couples pass through to new lines');
  const sg = Contra.compile(Contra.parseDance('FormationBase: Singlet\nA1\n(8) Partner do-si-do'), { lines: 1, sets: 1, passes: 2 });
  check(sg.couples.length === 1 && sg.progression.firstBad === -1, 'singlet: one couple dancing on its own');
  const figs = Contra.parseDance('A1\n(2) Turn alone\n(8) Partner promenade across the set\n(4) Dixie twirl\n(16) Ones turn contra corners\n(8) Weathervane').parts[0].calls;
  check(figs.map(k => k.fig).join() === 'turnAlone,promenadeAcross,dixieTwirl,contraCorners,starPromenade' && figs[4].turns === 1, 'turn alone, promenade across, Dixie twirl and contra corners read; a weathervane goes once around');
  const pa = Contra.compile(Contra.parseDance('A1\n(8) Partner swing\n(8) Partner promenade across the set'), { lines: 1, sets: 1, passes: 1 });
  const across = ['0.1L', '0.1R', '0.2L', '0.2R'].every(id => Math.sign(pa.final[id].x) !== Math.sign(Contra.poseAt(pa, id, 8).x));
  check(across, 'promenade across: each couple ends on the other side of the set');
}

// Waves: a wave of four across the set and long waves on the sides, alternate dancers facing opposite ways, hands joined.
{
  const w = Contra.compile(Contra.parseDance('A1\n(4) Form a wave of four (NR, WL)\n(4) Balance the wave\n(6) Trade the wave'), { lines: 1, sets: 1, passes: 1 });
  const at = t => ['0.1L', '0.1R', '0.2L', '0.2R'].map(id => ({ id, ...Contra.poseAt(w, id, t) })).sort((a, b) => a.x - b.x);
  const line = at(4), level = line.every(d => Math.abs(d.y - line[0].y) < 0.05), alt = line.every((d, i) => i === 0 || Math.cos(d.a - line[i - 1].a) < -0.9);
  check(level && alt && line[1].id.endsWith('R') && line[2].id.endsWith('R'), `wave of four (NR, WL): a line across the set, facing alternately, robins in the center (${line.map(d => d.id).join(' ')})`);
  const H = Contra.handsAt(w, 6);
  check(line.every(d => H[d.id].L.held || H[d.id].R.held), 'balance the wave: everyone holds hands with the dancers beside them');
  const after = at(14);
  check(after[1].id.endsWith('L') && after[2].id.endsWith('L'), `trade the wave: ends become centers (${after.map(d => d.id).join(' ')})`);
  const altWave = Contra.compile(Contra.parseDance('A1\n(8) Circle left 3/4; form wave of four (NR, PL)\n(4) Balance the wave'), { lines: 1, sets: 1, passes: 1 });
  const row = ['0.1L', '0.1R', '0.2L', '0.2R'].map(id => ({ id, ...Contra.poseAt(altWave, id, 8) })).sort((a, b) => a.x - b.x);
  const alternates = row.every((d, i) => i === 0 || d.id.slice(-1) !== row[i - 1].id.slice(-1)), partnersMid = row[1].id.slice(0, 3) === row[2].id.slice(0, 3);
  check(alternates && partnersMid && row.every((d, i) => i === 0 || Math.cos(d.a - row[i - 1].a) < -0.9), `alternating wave of four (NR, PL): lark, robin, lark, robin, partners in the center (${row.map(d => d.id).join(' ')})`);
  const lw = Contra.compile(Contra.parseDance('A1\n(8) Neighbor do-si-do; form long waves (NR, women face in)\n(4) Circulate'), { lines: 1, sets: 1, passes: 1 });
  const facesIn = id => { const p = Contra.poseAt(lw, id, 8); return Math.cos(p.a) * -p.x > 0; };
  check(facesIn('0.1R') && facesIn('0.2R') && !facesIn('0.1L') && !facesIn('0.2L'), 'form long waves (women face in): robins face in, larks out');
  const crossed = id => Math.sign(lw.final[id].x) !== Math.sign(Contra.poseAt(lw, id, 8).x);
  check(crossed('0.1R') && crossed('0.2R') && !crossed('0.1L') && !crossed('0.2L'), 'circulate: those facing in cross the set, those facing out loop on their own side');
  const po = Contra.compile(Contra.parseDance('A1\n(8) Neighbor swing\n(4) Pass the ocean'), { lines: 1, sets: 1, passes: 1 });
  const ys = ['0.1L', '0.1R', '0.2L', '0.2R'].map(id => po.final[id].y);
  check(Math.max(...ys) - Math.min(...ys) < 0.1, 'pass the ocean: from couples on the sides into a wave of four across the set');
}

// English: in a proper set the chevron progresses the couples, and a neighbour is the dancer beside you.
{
  const ch = Contra.compile(Contra.parseDance('FormationBase: Duple Minor - Proper\nA1\n(8) First corners chevron'), { lines: 1, sets: 3, passes: 6 });
  check(ch.progression.firstBad === -1, `chevron in a proper set: everyone progresses one place, proper, every time through (${ch.progression.good}/${ch.progression.total})`);
  const nb = Contra.compile(Contra.parseDance('FormationBase: Duple Minor - Proper\nA1\n(8) Neighbour back to back'), { lines: 1, sets: 1, passes: 1 });
  const moved = t => nb.dancers.filter(d => Math.abs(Contra.poseAt(nb, d.id, t).y - nb.start[d.id].y) > 0.2).map(d => d.id).sort().join();
  check(moved(4) === '0.1L,0.1R,0.2L,0.2R' && nb.dancers.every(d => Math.abs(Contra.poseAt(nb, d.id, 4).x - nb.start[d.id].x) < 0.35),
    'proper set: neighbours (beside you, same side) back to back along their own side');
}

// English gate: neighbours on each side turn a full circle, mirror images, the ones stepping into the middle first.
{
  const c = Contra.compile(Contra.parseDance('FormationBase: Duple Minor - Proper\nA1\n(8) 2s gate the 1s'), { lines: 1, sets: 1, passes: 1 });
  const at = (id, t) => Contra.poseAt(c, id, t), inward = id => Math.abs(at(id, 1).x) < Math.abs(c.start[id].x) - 0.05;
  const home = c.dancers.every(d => Math.hypot(c.final[d.id].x - c.start[d.id].x, c.final[d.id].y - c.start[d.id].y) < 0.05);
  const half = c.dancers.every(d => Math.abs(at(d.id, 4).y + c.start[d.id].y) < 0.15);
  check(home && half && inward('0.1L') && inward('0.1R') && !inward('0.2L') && !inward('0.2R'),
    'English gate: a full circle on each side (traded halfway, home at the end), the ones walking into the middle first');
}

// Corners in a three-couple set count from the middle couple.
{
  const c = Contra.compile(Contra.parseDance('FormationBase: Triplet - Proper\nA1\n(8) First corners do-si-do\n(8) Second corners do-si-do'), { lines: 1, sets: 1, passes: 1 });
  const mover = t => c.dancers.filter(d => { const a = Contra.poseAt(c, d.id, t), b = c.start[d.id]; return Math.hypot(a.x - b.x, a.y - b.y) > 0.3; }).map(d => d.id).sort().join();
  check(mover(4) === '0.1L,0.2L,0.2R,0.3R' && mover(12) === '0.1R,0.2L,0.2R,0.3L', `three-couple set: first corners are 1L-2R and 2L-3R, second corners 1R-2L and 2R-3L (${mover(4)} / ${mover(12)})`);
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
// Reading real dances (from testing against ContraDB): several figures on one line, other spellings, who.
{
  const read = l => Contra.parseDance('A1\n' + l).parts[0].calls.map(k => `${k.beats} ${k.fig} ${k.who || ''}`.trim()).join(' | ');
  const bs = Contra.parseDance('A1\n(16) Neighbors balance & swing'), bsc = Contra.compile(bs, { lines: 1, sets: 2, passes: 1 });
  check(bs.parts[0].calls.length === 1 && Contra.serialize(bs).includes('(16) Neighbors balance & swing'), 'a line with two figures stays one figure in the dance, written as it was');
  check(bsc.calls.map(k => `${k.beats} ${k.fig} ${k.who} ${k.src}`).join(' | ') === '4 balance neighbors 0 | 12 swing neighbors 0', 'and is danced as its two steps, the second by the same people');
  check(read('(8) Women allemande left 1 & 1/2') === '8 allemande robins' && read('(8) long lines forward & back') === '8 longLines all' && read('(8) In long lines, go forward and back') === '8 longLines all', '"1 & 1/2", "forward & back" and names with "and" stay whole');
  check(/circle/.test(read('(8) circle left 3 places')) && Contra.parseDance('A1\n(8) circle left 3 places').parts[0].calls[0].turns === 0.75, '"circle left 3 places" is three quarters');
  check(['(8) larks do si do 1½', '(8) robins gyre once', '(8) right left through', '(8) partners see saw', '(4) partners pass by right shoulders'].map(read).join() === '8 dosido larks,8 shoulderRound robins,8 rightLeftThrough all,8 seesaw partners,4 passThrough partners', 'ContraDB spellings: do si do, gyre, right left through, see saw, pass by');
  check(read('(8) robins do si do 1½ or swing to partner') === '8 dosido robins', 'who is the first dancers named, and "or ..." alternatives are ignored');
  check(read('(2) slide left along set') === '2 shift all' && read('(4) swing through') === '4 swingThrough all', '"slide left along the set" is a shift; "swing through" is the wave figure, not a swing');
  check(['(8) twos arch ones dive', '(8) larks cross trails', '(8) partner right elbow', '(8) larks right-hand chain'].map(read).join() === '8 archDive all,8 crossTrails all,8 armTurn partners,8 chain larks', 'arch and dive, cross trails, elbow turns and the right-hand chain are read');
  const box = Contra.compile(Contra.parseDance('A1\n(8) Neighbors swing\n(8) Balance & box circulate - robins cross while larks loop right'), { lines: 1, sets: 1, passes: 1 });
  check(box.calls.map(k => k.fig).join() === 'swing,balance,boxCirculate' && box.calls[2].who === 'robins', '"balance & box circulate - robins cross" is a balance then a box circulate with the robins crossing');
  check(Contra.parseDance('A1\n(8) Ones swing, end facing down').parts[0].calls[0].end === -Math.PI / 2, '"end facing down" is read');
  // A dance that progresses partway through B2 (pass through to new neighbors after a circle) comes out right.
  const mid = Contra.compile(Contra.parseDance('A1\n(4) Neighbors balance\n(12) Neighbors swing\nA2\n(8) Long lines forward & back\n(8) Robins chain\nB1\n(4) Partners balance\n(12) Partners swing\nB2\n(6) Circle left 3 places\n(2) Pass through\n(8) Next neighbors do si do'), { lines: 1, sets: 3, passes: 4 });
  check(mid.progression.firstBad === -1, `circle left 3/4, pass through to the next neighbors, do-si-do with them: progresses (${mid.passes.map(p => p.check.good + '/' + p.check.total).join(', ')})`);
}

// Checking many dances at once (the Dances panel): splitting a file of dances, and the quick review of each.
{
  const fine = fs.readFileSync(path.join(__dirname, '..', 'dances', fs.readdirSync(path.join(__dirname, '..', 'dances'))[0]), 'utf8');
  const many = Contra.splitDances(`${fine}\n=====\nBroken\nA1\n(8) Frobnicate the robins\n\n  ======== \n\n${fine}`);
  check(many.length === 3 && many[1].startsWith('Broken'), 'a file with dances separated by lines of ===== is split into each dance');
  const ok = Contra.review(fine), bad = Contra.review(many[1]);
  check(ok.ok && ok.title && ok.progression === -1 && !ok.unread.length, `a test dance reviews with no problems (${ok.title})`);
  check(!bad.ok && bad.title === 'Broken' && bad.unread.join() === 'Frobnicate the robins', 'a dance with a move it can\'t read lists that move');
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
