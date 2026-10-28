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

Built October 2026, with a Hands switch (on by default, remembered).

- **Each figure lists its holds** (`HOLDS` in the engine): who holds whom, with which hand ('R', 'L', or 'near' for
  whichever hand is toward the other), from when to when in the figure. A star's hands reach into the middle.
  Examples: allemande, arm and hand turns (the named hand); two-hand turn and poussette (both hands); swing
  (ballroom hold); courtesy turn (left hands in front, right behind her back); circles and long lines (neighbors'
  near hands); chains and right and left through (pull by in the middle, then a courtesy turn); promenade (skating
  hold); grand right and left (right, left, right... with each one met); lead down, down and up the hall, up a double.
  Figures without hands (do-si-do, hey, siding, shoulder round...) list none.
- **Geometry** (`handsAt`): shoulders 0.17 m either side, arms reach 0.6 m. Held hands meet halfway between the
  two shoulders, easing in and out over 0.4 beats; free hands rest by the side.
- **Drawing:** held arms reach to a small dot where the hands meet; a dashed red line shows hands that can't reach.
- In a three-couple set, first and second corners count from the middle couple (the tutorial's diagram): the
  middle robin's first corner is the lark above her and the middle lark's is the robin below him.
- **Checks**, over the middle of each hold: hands that would need to be more than about 1.5 m apart, one hand held by
  two people at once (problems), and a hand reaching across the body (a caution; figures that cross arms on purpose,
  such as the swing, courtesy turn and promenade, are left out).

Revised October 2026 (the rest of the plan):
- **Holds carry across figures.** When the same two people keep the same hands from one figure into the next (a
  balance into a pull by, a circle into a balance), it is one hold: hands no longer let go and re-grab at the join
  (`joinHolds`).
- **Hands on someone:** a hold can end on a place on the other dancer instead of their hand (`back`, `shoulderR`).
  The swing is now his left hand holding her right out to the side and his right hand at her back; the courtesy
  turn is left hands joined in front and his right hand at her back. Drawn as an open ring instead of a dot.
- **Hands meet in front** when two side by side would otherwise join hands inside a body (courtesy turn, promenade).
- **Lines** (down and up the hall, Dixie twirl) say which hand takes which: each takes the right hand of the one on
  their right in their left, rather than "the nearer hand", which flipped while dancers turned.
- **More figures take hands:** square through and rights and lefts (a hand with each one met, right then left),
  flutterwheel, give and take (two hands), slice (lines), forward and back (a ring, or couples' inside hands).
- **Drawing:** arms are drawn over the dancers with a thin light edge, so close holds show; free hands are hidden
  at the sides (the faded stubs are gone); an arm reaches out as a hold begins and comes back as it ends.
- **New check:** a hand let go of one person and taken by someone else within a quarter of a beat (a note).

Left out: elbows, crossed arms and body twist beyond the facing (dancers are dots).

## Collisions (October 2026)

Dancers are drawn 0.38 m across; `bodyGap` (0.4 m) is the closest two dancers' middles may come.

- **Figures are built to keep clear.** Couples turning together (courtesy turn, chains, gates, Dixie twirl) draw in
  hip to hip while turned across their line (`coupleTuck`); pair turns in a line (shoulder round, two-hand and
  hand turns, Bentley allemande) squeeze into an oval along the line (`ovalAt`, `roomBeside`) so they miss the
  pairs beside them; poussette couples close to arm's length and go round wide enough to pass; star through's lark
  passes behind the robin; figure eights round the one they cast around at about 0.42 m; a partner swing from
  straight across finishes level with the other couple, and a pair swinging while the others stand finishes in the
  middle if its side is taken.
- **Then everyone makes room** (`makeRoom`, after each figure is planned): where two dancers would still pass
  closer than `bodyGap`, both ease aside, sideways to the way they pass and keeping to one side all the way past,
  spread smoothly over the beats around. Nobody is moved at the start or end of a figure, so figures still join up.
  Nudges in single moves are under 0.3 m (`tests/collisions.js` checks).
- **Real bumps are reported:** if two dancers are still closer than about 0.32 m, the checks list it ("lark 1 and
  robin 2 bump into each other"), which usually means the figures don't fit together as written.
- `tests/collisions.js` runs every move (with its usual set-up, `Contra.SETUP`) and every test dance;
  `tests/editor-browser.js` runs every move in the list with each choice of who and side, as its preview plays it
  and with three hands-fours.

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

## Formations

Chosen with the Formation dropdown or the `FormationBase:` line.

| Formation | Start | Ends of the set |
|---|---|---|
| Improper | Ones crossed (lark on the +x side, the caller's left looking down), twos proper; ones above twos | Wait one time, partners trade sides, switch role |
| Proper | Every lark on the -x side. "Neighbour" here means the dancer beside you on your side (the English meaning) | Wait one time, switch role (no crossing) |
| Indecent | Twos crossed, ones proper | As improper |
| All improper | Both couples crossed | As proper |
| Progressed improper | Ones below twos (improper after trading with neighbors) | Wait one time and switch role (Ryan); the couple lets the next couple past, moving two places toward the set |
| Reverse progression improper | Twos (top) crossed, ones below them proper | As progressed improper |
| Becket clockwise / counter-clockwise | Partners side by side on one side, couples facing across; clockwise has the ones (progressing down) on the +x side | Cross the set as a couple, diagonally one place, switch role |
| Triple minor (proper / ones improper) | Hands-six: ones, then two couples below them | At the top a couple waits out twice and comes back in as ones; ones reaching the bottom wait once and come back in as twos; at the very bottom the ones dance a hands-four with the one couple left |
| Four facing four | Lines of four across the hall, ones' lines facing down, twos' up; each couple meets the couple it faces as a hands-four | A line at the end turns around (each couple turning as a couple) and switches role |
| Sicilian circle | Couples facing couples around a circle; ones face counter-clockwise, twos clockwise; robins on the larks' right | None: the circle has no ends |
| Square | Four couples facing the center, 1.6 m from it; couple 1 at the top with backs to the band, then 2, 3, 4 counter-clockwise; robins on the larks' right | None. One square per "Squares across" |
| Grid contra (improper) | Duple improper lines packed side by side (the sides of neighboring lines 1.2 m apart); a couple belongs to whichever line it now stands in, so it can travel between lines | As improper, at the ends of each line. The figures that move couples between lines depend on the dance and haven't been checked against a real grid contra yet |
| Tempest | Each minor set is four couples: the ones' line of four faces down between two twos couples standing on the sides facing across; each ones couple dances with the side couple nearest it (2.4 m between minor sets) | At the bottom the ones' line splits into two side couples (twos); at the top two side couples join into a line (ones). Not yet checked against a real tempest dance |
| Two- to six-couple sets (proper, or improper with the odd couples crossed) | One fixed set per line, couples 1 m apart; "triplet", "quadruplet", "doublet" and "N couple longways set" are read | None. Couples are numbered by place each time through, so whoever is at the top is the first couple. Figures for four go to the named couples ("1s and 3s") or to each hands-four from the top (1s with 2s, 3s with 4s); long lines, up a double and the like use the whole set; circles open back out to places at the end |
| Circle mixer | One big ring of couples facing in (4 + 2 x "Circle size" couples), robins on the larks' right | None. Like a square: everyone takes the nearest place, so partners change; "corner" and "neighbor" mean the robin on the lark's left. Figures for two couples aren't defined here |
| Grid square | Squares packed edge to edge (couples of neighboring squares back to back, 1 m apart), "Squares across" by "Rows of squares" | Passing to the next square: a couple with no square beyond them stops in the opposite place of their own square and courtesy turns to face back in |

Each group re-forms every time through from where couples stand. In four facing four and Sicilian circles every
hands-four is planned in its own turned frame (ones couple on one side facing the twos), so figures work the same
way as in a Becket hands-four. In a hands-six, figures for four use the ones and twos; circles and lines use all six.

**Squares.** Each time through (and after couples pass to the next square), every dancer takes the nearest lark's or
robin's spot, so partners can change (after a corner swing, the corner is the new partner). In a square:

- "Heads ..." or "Sides ..." at the start of a figure names who dances it. Figures for four (chains, right and left
  through, hey) are danced by the heads unless the sides are named, planned like a Becket hands-four across the square.
- Circles, stars, balances and forward and back use the whole square unless heads or sides (or larks/robins for a
  star) are named. Long lines in a square become everyone forward and back.
- Couple figures pair up within the square: partners, corners (the robin on the lark's left; "neighbor" means corner
  here), heads or sides. A swing ends in the lark's place.
- New figures: promenade (home, or by an amount), grand right and left (half meets partners on the far side; all
  the way goes home), forward and back, and pass through to the next square.
- The check: after each time through, everyone stands in a place in a square, facing roughly in (within 90°, since
  they may already be turning toward the next figure).
- Circle mixers use the same machinery with any number of couples (promenade, grand right and left and corners work
  the same way); fixed sets use the same check, with places on either side of the set, facing across.

Also: six facing six (four facing four with lines of three couples), singlet (one couple), and a whole-set
"longways set" (shown as a six-couple proper set, like the Virginia Reel).

Not supported yet (checked against The Caller's Box glossary, October 2026): zia (contra lines crossing at right
angles, with squares where they meet), three facing three, tri-contra and circles of threesomes (partnerships of
three), scatter mixers, solo dances, double quadrilles and hexagons (more than one couple to a side, or six couples),
five-couple squares (a couple in the middle), horseshoes (top couple improper, the rest Becket) and triangles. Dances
in these are flagged and shown as improper. Not modelled within supported formations: indecent and proper Becket, a
doublet's rotating progression (neighbours become partners and the top of the hall turns 90 degrees each time), and
the tempest's usual progression (the ones' line goes down the hall and returns only as far as new neighbours).

## Waves

A wave of four (short wave) is a line of four across the set, alternate dancers facing opposite ways, hands joined;
long waves run down each side, alternately facing in and out. Dances reach them with a figure ending "; form wave of
four (NR,WL)" / "; form long waves (NR, women face in)" (the figure takes three quarters of its time, then everyone
steps into the wave), with "form ..." on its own, or with pass the ocean / pass the sea. The parentheses give the ends'
relationship and hand, and the centers (short) or who faces in (long). Figures from a wave (balance, trade the wave,
slide, spin the top, circulate, walk and dodge, scoot back) read the dancers' facing, so the engine keeps each
dancer's facing when it looks ahead to them (`keepsFacing`).

**Taminations** (github.com/bradchristie/taminations-flutter, tamtwirlers.org) animates modern western square dance
calls. It is GPL-3 licensed, so its code and animation data must not be copied into this MIT project; its CALLERLAB
definitions (which CALLERLAB allows to be reproduced with its notice) and its animations are used as references only.
One idea worth borrowing later: it works out hand holds from where dancers stand rather than listing them per figure.

## Workspace layout (October 2026, Ryan's request)

Like a video editor (Ryan's example: Adobe Premiere), nothing scrolls on a computer screen:
- **Top bar:** title, dance name, and three buttons: **Checks** (with its counts), **⚙ Settings**, **References**.
  Checks and Settings open as panels at the right edge, over the editor, so the floor stays in view.
- **The floor** fills whatever space is left. **The timeline is docked right under it:** play and step buttons,
  speed, a **Loop** menu (whole dance, this time through, this part, this figure) and the Hands switch; a
  **times-through strip** (one box per time through; click to go there; a mark above or below a box means a couple
  waits out at the top or bottom that time; a red edge means the progression went wrong); a **beat ruler** with the
  playhead (drag along it to move through the part); and the A1–B2 rows, where clicking an empty stretch jumps there.
  These replace the two old sliders.
- **Settings panel:** the floor (lines, hands-fours, times through), music (tempo, music, melody), how it looks (trail,
  role names), how it's danced (swing rate). Settings are remembered on the device.
- **The editor** (moves, builder, text) sits at the right and scrolls on its own. The move list starts with a
  **Most common** row (19 everyday contra moves, each edged in its category's colour), then the categories. A
  **search box** filters the list by name; it understands the other role names ("ladies chain") and older names
  ("gypsy").
- **Checks** shows labelled counts in the top bar: problems, cautions, passed.
- **Dances panel** (top bar): the examples ("111" and one dance for each other formation, the same text as the files in
  `dances/`, which the browser test checks) and **My dances**, saved by title on the device.
- **Next end effect** jumps to the start of the next time through where who is waiting out changes.
- **Journey chart:** the timeline's second view (**Parts | Journey**). Each couple in a line is a line on the chart:
  across, the whole run (bands for each time through); up and down, where the couple stands along the set at the
  start of each time through, top of the hall at the top. A hollow dot means that couple waits out at an end that
  time. The couple being followed is bold. Click a line to follow that couple; click anywhere to go to that moment.
  Shown for dances in lines (contra, English sets, Becket, triple minor, tempest, four facing four); squares and
  circles get a note instead.
- Phones start with one line (until a choice is remembered).
- **Formation pictures** above the Formation menu, folded away by default ("Common formations, as pictures") to leave room for the moves; opening them is remembered: the common formations, grouped Contra (improper, Becket), English
  (proper, three-couple set) and Square & circle (square, circle mixer). Each picture is drawn from where the
  simulator starts everyone (larks as squares, robins as circles, a tick for facing, the band as a dotted line at
  the top), so it always matches the floor. The menu still holds every formation.
- Narrow or short screens (under 1000 px wide or 560 px tall) fall back to a scrolling page: floor and timeline
  first, the editor below.

## Dance editor (decisions)

- The timeline is the editor: four rows (A1, A2, B1, B2), each 16 beats wide; each figure is a block as wide as its length.
- Drag a block to move it within or between parts; drag its right edge to change its length, snapping to 2 beats (Shift for 1 beat).
- A part that goes over 16 beats keeps its figures and is flagged in red; the dance still runs.
- The right-hand panel is wider and stays in view while the page scrolls. Its Editor tab holds the move builder and the pool of moves (drag into the part rows under the floor); its Text tab holds the same dance as Caller's Box text. Undo and Redo sit beside the tabs.
- The move builder shows a live preview: one hands-four dancing just that move on a loop, with the chosen modifiers. Moves that need a starting position get a short set-up first (e.g. a neighbor swing before a chain). **Explore** opens a larger view with play/pause, speed, a beat slider, a plain description, which way it turns, its usual length, and a note when the animation is an approximation.
- Following a couple is a small card at the top right of the floor: who they're with this time through, who's next, and the whole journey on request.
- The part that's playing is highlighted as the music goes.
- **Role names** are a choice: Larks / Robins (default), Gents / Ladies, or Men / Women. The floor, editor, readout and checks use the chosen names, and new figures are written with them; the dance text keeps its original wording otherwise. Choosing a gendered pair shows an info icon whose tooltip encourages gender-free calling.
- Every move is a base move plus modifiers: who dances it, which side (hand, shoulder or direction, with an arrow showing the way it turns), how far (fractions such as "once and a half", places around a ring for circles and stars, or half/full), and beats.
- The move builder at the top of the Moves column sets these with dropdowns, side toggles, a dial showing how far the move goes, and a beats stepper. Clicking a move in the pool sets up a new one (add it to a chosen part, or drag it in by its handle); clicking a figure in the rows changes it in place. Every change rewrites the text, re-runs the dance, and can be undone.

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
