# Contra Dance Simulator — Design (Phase 0)

Status: draft, pending answers to the open questions below. The original brief is in [BRIEF.md](BRIEF.md).

## Existing tools

- [upadouble.info](https://upadouble.info/dance.php?id=OhGeez) — animated top-down contra dances (larks as rectangles, robins as ellipses), but only for dances already on the site; no dance entry or timing checks.
- [Taminations](https://www.squaredancehistory.org/items/show/739) — 500+ modern western square dance call animations with a sequencer; no contra.
- A hobby [contra simulation in J](https://code.jsoftware.com/wiki/User:Brian_Schott/code/turtleGraphics/3Dogl).

Nothing found combines dance entry, timing/speed checks and progression checks.

## Open questions

1. Feet or meters? (Proposed: feet internally, metric display option.)
2. Must every figure name who does it ("neighbors swing"), or should the engine infer it? (Proposed: explicit in v1.)
3. If a dance doesn't work, run it and flag the problem, or refuse it? (Proposed: run and flag.)
4. End effects: should a waiting couple's cross-over be animated, or jump?
5. Multiple lines: purely visual until grid squares, or interacting sooner?

## Coordinate system

- Distances in feet, time in **beats**. Tempo only converts beats to seconds (for speed checks).
- **+y points up the hall toward the band**; **x runs across the set**, x = 0 at each line's center.
- Defaults (configurable): partners 4 ft apart across, neighbors 4 ft apart along the line, one hands-four = 8 ft of hall, hand-hold radius ≈ 1.25 ft.
- Facing θ in radians, 0 = up the hall.

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

**Groups are derived from position**, re-done at the start of every time through: pair each couple facing down with the couple below it. A couple left over at an end is out, swaps role, and comes back in. This one rule handles progression, end effects and multiple progressions; "who meets whom" is a log of these pairings.

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
    const T = figureEight(spotsOf(four), loopRadius: 1.5);
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

Each part must total 16 beats; the parser checks this.

## Technology

One HTML file, plain JavaScript, Canvas 2D for the floor, ordinary HTML for controls. No server, no build step.

- Since the engine gives every position at any moment, drawing is "clear and redraw every dot"; trails are simple lines.
- Canvas stays smooth with hundreds of dancers; clicking a dancer is a nearest-dot lookup.
- The engine never touches the page, so it can be tested headlessly (positions, progression, speeds) before each step is reviewed in a browser.

## Phased build plan

| Phase | Delivers | Size |
|---|---|---|
| 1 | Duple improper with 2–4 hands-fours, beat clock, play/pause/scrub/step, A/B timeline; balance, swing, circle left, long lines | ~600 lines |
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
- **Collisions** — dancers closer than ~1.5 ft are flagged, checking each pair every ⅒ beat.

Crossed arms and body twist need dancers modeled as bodies rather than dots; left out.
