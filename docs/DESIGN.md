# Contra Dance Simulator — Design (Phase 0)

Status: Phase 0 decisions agreed (see below). The original brief is in [BRIEF.md](BRIEF.md).

## Existing tools

- [upadouble.info](https://upadouble.info/dance.php?id=OhGeez) — animated top-down contra dances (larks as rectangles, robins as ellipses), but only for dances already on the site; no dance entry or timing checks.
- [Taminations](https://www.squaredancehistory.org/items/show/739) — 500+ modern western square dance call animations with a sequencer; no contra.
- A hobby [contra simulation in J](https://code.jsoftware.com/wiki/User:Brian_Schott/code/turtleGraphics/3Dogl).

Nothing found combines dance entry, timing/speed checks and progression checks.

## Decisions

1. **Units:** meters internally (speeds in m/s, accelerations in m/s²); feet only as a display option later.
2. **Figures always name who does them** ("neighbors swing"); no inference.
3. **Invalid dances still run**, and the problems are flagged, so people can see why a dance breaks.
4. **End effects are always shown**, including the waiting couple's cross-over, animated.
5. **Multiple lines are part of the engine from Phase 1**, not a later visual add-on.

## Coordinate system

- **World frame in meters**, shared by all lines. Time in **beats**; a measure (bar) is 2 beats and is the main unit for entering and displaying figure lengths. Tempo converts beats to seconds.
- +y points up the hall toward the band; +x runs across the hall. Facing angle in radians, measured the standard math way: 0 = facing +x, π/2 = facing up the hall.
- **Each line has its own placement** (origin and direction) in the world frame. Lines default to side by side across the hall, but are not assumed to be parallel or equally spaced, so later formations (squares, grid squares) fit the same model.
- Defaults (configurable): partners 1.2 m apart across the line, neighbors 1.0 m apart along it (holding hands in long lines), one hands-four = 2.0 m of line, hand-hold radius ≈ 0.4 m, line centers 3 m apart.

## Data model

```
Dancer   { id, role: 'lark'|'robin', coupleId }
Couple   { id, startSlot }
Pose     { x, y, θ, hands: { L: dancerId|null, R: dancerId|null } }
Dance    { title, formation, progression: 1, parts: { A1:[Call], A2:…, B1:…, B2:… } }
Call     { figure: 'allemande', who: 'neighbors', params: { hand:'R', turns:1.5 }, beats: 8 }
Segment  { t0, t1, path(u) → {x, y, θ}, hands }   // u runs from 0 to 1
```

**Key decision:** the engine compiles the dance into a list of Segments per dancer, so `pose(dancer, t)` is a pure function of time. Scrubbing, stepping, looping, trails and speed calculations follow directly; nothing is simulated step by step.

**Groups are derived from position in the world frame**, re-done at the start of every time through: pair each couple facing down with the couple below it in the same line. A couple left over at an end is out, swaps role, crosses over and comes back in. This one rule handles progression, end effects and multiple progressions; "who meets whom" is a log of these pairings. Because grouping works on world positions rather than line numbers, figures that reach between lines can be added without changing the engine.

## Figures

A figure is a reusable rule: given its group's current poses and parameters, it returns a path and hand usage for each dancer, and sets the end state the next figure starts from. Paths are built from a few primitives: `orbit` (circle around a point), `line`, `track` (follow a shared closed loop) and `ease`.

```js
// Allemande right 1½ (pair, 8 beats). A right-hand turn is clockwise seen from above.
figure('allemande', { group: 'pair', beats: 8, params: { hand: 'R', turns: 1 } },
  ([a, b], p) => {
    const c = mid(a, b), sweep = p.turns * 2*PI * (p.hand === 'R' ? -1 : 1);
    return [a, b].map(d => ({
      path: orbit(c, angleFrom(c, d), sweep, radius: ease(dist(a,b)/2 → HAND_R → dist(a,b)/2)),
      facing: 'tangent',
      hands: { [p.hand]: other(d) }
    }));
  });   // after 1½ turns the two have swapped places and face the other way
```

```js
// Partner swing (pair, 8 beats). Swings rotate clockwise, about 1 turn per 2 beats.
// The final angle is solved so the swing ends robin on the lark's right, facing as asked.
figure('swing', { group: 'pair', beats: 8, params: { end: 'across' | 'up' | 'down' } },
  ([lark, robin], p) => {
    const c = mid(lark, robin);
    const sweep = -solveSweep(nominal: beats/2 * 2*PI, endFacing: p.end, robinOnRight: true);
    return both(orbit(c, …, sweep, radius: 0.9), facing: 'toward-center ± 90°',
                hands: { lark.R: robin, robin.L: lark });
  });
```

```js
// Hey for four (group of 4, 16 beats). All four follow ONE figure-eight track
// through the four spots, a quarter of the track apart.
figure('hey', { group: 'four', beats: 16, params: { start: 'robins-R', fraction: 1 } },
  (four, p) => {
    const T = figureEight(spotsOf(four), loopRadius: 0.45);
    const s0 = phaseOffsets(four, p.start);
    return four.map((d, i) => ({
      path: u => T.at(s0[i] + u * p.fraction * T.length),
      facing: 'tangent', hands: none,
      passes: derivePasses(T, s0)    // R, L, R, L shoulders, for later checks
    }));
  });   // half hey = fraction 0.5; fitting it into 8 beats doubles the speed
```

## Dance entry format

```
title: Test Dance
formation: duple-improper
progression: 1
A1: neighbors balance 4; neighbors swing 12
A2: long lines 8; robins chain 8
B1: partners balance 4; partners swing 12 end=across
B2: circle left 3/4 8; neighbors allemande right 1.5 8
```

Each part must total 16 beats (8 bars); the parser checks this.

## Technology

One HTML file, plain JavaScript, Canvas 2D for the floor, ordinary HTML for controls. No server, no build step.

- Since the engine gives every position at any moment, drawing is "clear and redraw every dot"; trails are simple lines.
- Canvas stays smooth with hundreds of dancers; clicking a dancer is a nearest-dot lookup.
- The engine never touches the page, so it can be tested headlessly (positions, progression, speeds) before each step is reviewed in a browser.

## Phased build plan

| Phase | Delivers | Size |
|---|---|---|
| 1 | Animate all of "111" by Chris Page once through: duple improper, 1–4 lines, play/pause/scrub/step, A/B timeline, Caller's Box text entry; long lines, allemande, balance, pull by, box the gnat, swing, circle | ~900 lines |
| 2 | Groups re-formed each time through, progression, end effects, highlight one couple, "who met whom" log | +300 |
| 3 | Text entry format, full figure library (~25 figures at 30–60 lines each) | +1,000 |
| 4 | Speed per dancer and per figure, configurable threshold, rush warnings | +200 |
| 5 | Becket formation, slide progression, quintuple-progression test ("40 Years of Penguin Pam") | +200 |
| 6 | Hands (simple model) | +300 |
| 7 | Squares, then grid squares | +700 and up |

## Hands (Phase 6)

Each figure already declares which hand holds whom and for how long, so the simple version is cheap:

- **Same hand needed twice** — overlapping hand use is flagged.
- **No time to let go** — a hand released and retaken within ~½ beat is flagged.
- **Collisions** — dancers closer than ~0.45 m are flagged, checking each pair every ⅒ beat.

Crossed arms and body twist need dancers modeled as bodies rather than dots; left out.

## Startup decisions

1. **Multiple lines:** always modeled by the engine; figures between lines are rare, so their controls and checks live under **Advanced settings**.
2. **Acceleration and direction of travel are first-class checks**, not extras. Many dances fail because they *feel* wrong even though they work on paper; that feeling comes from acceleration. See "Motion and flow" below.
3. **Every number is adjustable**, starting from: 120 beats/min, speed warning above 2.0 m/s, alert above 2.5 m/s.
4. **Entry format:** the layout The Caller's Box uses: part labels (A1, A2, B1, B2) and one figure per line with its length in beats in brackets, e.g. `(8) Women allemande left 1 & 1/2`. Men/Women and Gents/Ladies are read as Larks/Robins. Lengths can be displayed in bars.
5. **Test dances:** contradb's figure vocabulary (49 figure types, see below) is the reference for the figure library. The dances themselves are not in that repository.
6. **Desktop first**; phone and tablet layout later.

## End effects (Phase 2 decisions)

- **Hands-fours re-form every time through** from where couples stand: each ones couple takes hands with the twos couple one place below. Anyone left over is out at an end.
- **Waiting couples cross over at the start of their wait** (the first 8 beats), then face in. At the top a twos couple becomes ones; at the bottom ones become twos.
- **Waiting couples swing their partner when the line swings partners**, then open back out to their places facing each other. Otherwise they stand facing in.
- **Times through is adjustable, 1 to 30, default 8.**

## Dance editor (decisions)

- The timeline is the editor: four rows (A1, A2, B1, B2), each 16 beats wide; each figure is a block as wide as its length.
- Drag a block to move it within or between parts; drag its right edge to change its length, snapping to 2 beats (Shift for 1 beat).
- A part that goes over 16 beats keeps its figures and is flagged in red; the dance still runs.
- A pool of moves (the figures the simulator knows) sits right beside the part rows, so drags are short and need no scrolling; drag one into a part, or click it to add it to the end of the part that's playing. The Caller's Box text has its own panel on the right.
- The part that's playing is highlighted as the music goes.
- Clicking a block opens its settings (who, hand, amount, direction, beats, remove). Every change rewrites the text, re-runs the dance, and can be undone.

## Motion and flow (the "feel" checks)

The engine measures, for every dancer at every moment:

- **Speed** (m/s) — rushed or dawdling.
- **Speeding up / slowing down** (tangential acceleration, m/s²) — sudden starts and stops.
- **Turning force** (centripetal acceleration v²/r, m/s²) — tight, fast curves; swings and fast allemandes.
- **Spin rate** of the body (°/s) — twirls, swings, turn-alones; a dizziness measure.
- **Flow reversals** — a figure that ends travelling or turning one way followed by one that starts the opposite way (e.g. clockwise into counter-clockwise).

To make these numbers meaningful, figure paths must **join smoothly**: each figure declares how dancers enter and leave it (direction and speed), and the engine blends the joins instead of letting dots jump or turn instantly. Where a smooth join needs more acceleration than is comfortable, that is exactly what gets flagged.

## Basic vs Advanced settings

The engine always computes everything; the interface only decides what to show.

- **Basic:** the animation, the A1/A2/B1/B2 timeline, tempo, play/scrub, and red/yellow flags on the timeline where something is too fast, too abrupt, or reverses flow.
- **Advanced settings:** floor dimensions, every threshold, which checks are on, number and placement of lines, figures and checks between lines (e.g. lines too close together), per-dancer graphs of speed and acceleration over time.

## Figure vocabulary reference

contradb (github.com/contradb/contra, AGPL) defines these figure types, used here as a checklist for the figure library (vocabulary only; no code copied): allemande, allemande orbit, arch & dive, balance, balance the ring, box circulate, box the gnat, butterfly whirl, California twirl, chain, circle, contra corners, cross trails, do-si-do, dolphin hey, down/up the hall, figure 8, form long waves / a long wave / an ocean wave, gate, give & take, facing star, gyre, hey, long lines, mad robin, pass by, pass through, petronella, poussette, promenade, pull by (dancers / direction), revolving door, right left through, Rory O'More, roll away, slice, slide along set, square through, star, star promenade, stand still, swing, turn alone, zig zag.
