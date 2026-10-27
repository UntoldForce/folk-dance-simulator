# Figure notes for the engine

Our own working notes on how each figure moves, written for building the simulator.
The authoritative definitions are in the glossary of [The Caller's Box](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm)
(by Chris Page and Michael Dyck); each figure links to its entry there. These notes paraphrase
and add what the engine needs (paths, turn direction, where people end). They are not a copy of the glossary.

Status: **built** = animated in the simulator; **planned** = not animated yet (dancers stand still during it).

Figures marked built were animated from the descriptions here and in The Caller's Box glossary. These are
approximations Ryan should check by eye: hey for four (start positions other than diagonal starters), robins/larks
chain, right and left through, flutterwheel, star promenade and weathervane, give and take, figure eight, slice,
shift, veer, lead down, down and up the hall, cast off, petronella, poussette, California twirl, star through,
roll away, balance the wave (forward and back only), cross (treated as a pass through), turn as a couple and
butterfly whirl (half a turn as a couple). Not animated: hey for three, contra corners, Dixie twirl.

Typical beats come from the [ContraLab](https://contralab.org/) Contra Timing Chart where it lists the figure
(Ryan supplied the chart). Pull by isn't in the chart; per Contrafusion it typically takes 4 beats, or 2 when done rapidly as a single change. The simulator notes any figure given fewer beats than the chart, and any 8- or 16-beat
figure that doesn't start on a phrase boundary (8-beat calls start an 8-beat phrase; 16-beat calls start A1, A2, B1 or B2).

## Conventions

- **Up** is toward the band. **Ones** progress down the set, **twos** up.
- **Clockwise** seen from above is the direction of circle left, allemande right, right shoulder round and swing.
  Counter-clockwise is circle right, allemande left, left shoulder round.
- **After a swing** the lark is on the left and the robin on the right, facing whatever the next figure needs.
- **Improper:** from proper (all larks on one side), the ones cross over. **Becket:** start beside your partner on the side.
- **Neighbor** with one person means the opposite-role neighbor unless "same-role" is said.
  **Shadow:** someone in your hands-four, not your partner, who takes your partner's role there.
- **Allemande amounts** count from when the two are first close. In the center of the set they are in halves:
  a half means someone crosses the set.
- **Ending a figure:** dancers finish each figure already facing the way the next figure needs (Ryan's rule),
  turning over the last part of the figure (up to 1½ beats). Anyone who stands still in the next figure finishes facing
  into the set instead (e.g. in "111" the robins end the partner pull by facing in while the larks pull by).
- **Hey amounts:** ¼ = two passes; ½ = three or four passes (everyone crosses); full = seven or eight passes.

### How dances are written (The Caller's Box layout)

| Mark | Meaning |
|---|---|
| `(8)` | Beats for the figure |
| `;` | Then (one figure after another) |
| `,` or `\|\|` | At the same time (two figures at once) |
| `[...]` | Who does it |
| `R` / `L` | Right / left (hand or shoulder), e.g. `(NR)` = neighbor, right |
| `~` | Partial pass, ending shoulder to shoulder |
| `&`, `/` | Numbers: `1 & 1/2` |

## Categories in the editor

Moves are grouped by what they do to the dancers' positions. Each category has a color and an icon in the editor.

| # | Category | What it does |
|---|---|---|
| 1 | Turn with one person | Two dancers connect and revolve around each other; where they end depends on the amount |
| 2 | Trade places | Two dancers swap spots |
| 3 | Go out and come back | Dancers move but end where they started |
| 4 | Hands-four rotations | All four turn together as a unit, by an amount |
| 5 | Couple turns | Two dancers side by side turn as a pair to face a new direction |
| 6 | Two-couple exchanges | Couples swap sides of the set through a structured pattern |
| 7 | Weaves | Dancers thread past each other along a figure-eight path |
| 8 | Travel and progress | Couples move along the set or to new neighbors |

The full list of moves in each category is the `POOL` list in `index.html`. Moves that aren't animated yet can still be
placed in a dance; dancers stand still during them and the checks show a caution.

## Figures

| Figure | Who | Typical beats | How it moves | Ends | Status |
|---|---|---|---|---|---|
| [Long lines forward and back](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#long-lines-go-forward-and-back) | Everyone, hands joined along each side | 8 (forward and back) | Four small steps toward the center, four back. Partners come close enough to clap or bump (about 0.4 m apart, center to center); this is intended, and collision checks must not flag it | Where they started | built |
| [Balance](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#balance) | Pair (or ring, wave, line) | 4 | Footwork in place, usually toward and away from someone. `(RH)` = right hands joined | Where they started | built (pairs) |
| [Allemande](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#allemande) | Pair | 8 | Face each other as you meet, then forearm grip and turn close together (about 0.6 m apart, near swing distance): right = clockwise, left = counter-clockwise | Depends on amount; 1½ trades places | built |
| [Pull by](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#pull-by) | Pair | 4 (2 when done rapidly) | Take the named hand and pass by that shoulder, keep going | On the far side, facing on | built |
| [Box the gnat](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#box-the-gnat) | Pair facing, right hands | 4 | Ryan's beat-by-beat: beat 1 both pull in close; beat 2 push back out a little; beats 3–4 circle around each other to trade places while the lark turns right and the robin turns left under the arch | Traded, facing, at arm's length; lark lets go at the end of beat 4 | built |
| [Swing](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#swing) | Pair | 4–8 or longer; balance and swing is usually 4 + 12 (or a double balance 8 + 8) | Ballroom-style hold, clockwise around each other (walk or buzz step) | Lark left, robin right, facing as the next figure needs | built |
| [Circle left / right](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#circle-left-right) | Hands-four | 8 | Hands in a ring, everyone facing the center; the ring draws in so neighbors are about 0.9 m apart (about 1.3 m across); left = clockwise, right = counter-clockwise, by the amount | Facing as the next figure needs | built |
| [Swat the flea](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#swat-the-flea) | Pair facing, left hands | 4 | Mirror image of box the gnat | Traded, facing | built |
| [California twirl](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#california-twirl) | Pair side by side, lark's right with robin's left | 4 | Raise hands, trade places, robin under the arch | Traded, facing the opposite way | built |
| [Do-si-do](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#do-si-do) | Pair | 8 | Walk forward passing right shoulders, step right, back up to place; no turning of the body | Where they started | built |
| [Seesaw](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#seesaw) | Pair | 8 | Do-si-do by the left shoulder | Where they started | built |
| [Shoulder round](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#shoulder-round) (formerly "gypsy") | Pair | 8 | Like an allemande without touching, looking at each other; right shoulder = clockwise. "Gypsy" in older dances is read and shown as shoulder round | Depends on amount | built |
| [Star](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#star) | Hands-four | 8 to go once around | Named hand in the center (wrist grip, or [hands-across](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#hands-across-star)), walk forward around | By the amount | built |
| [Ladies (robins) chain](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#ladies-chain) | Robins, with a lark each | 8 across; 16 over and back | Robins pull by right across, veer right, then [courtesy turn](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#courtesy-turn) with the lark on the other side | Robins have crossed | built |
| [Courtesy turn](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#courtesy-turn) | Couple side by side | 4 | Counter-clockwise around a point between them: lark backs up, robin walks forward | Usually half way round | built |
| [Gents (larks) chain](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#gents-chain) | Larks | 8 | Mirror of the ladies chain: larks pull by left, clockwise courtesy turn | Larks have crossed | built |
| [Right and left through](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#right-and-left-through) | Two couples facing | 8 across; 16 over and back | Pass through (or pull by right), then courtesy turn with the one you travel with | Couples traded sides | built |
| [Pass through](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#pass-through) | Pairs facing | 4 | Walk forward passing the named shoulder, no hands | Past, facing on | built |
| [Hey](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#hey) | Four | 16 full; hey for three 12–16 | Figure-eight weave with an extra loop; centers pass one shoulder, then everyone the other shoulder on the sides; ends loop | Half: everyone crossed; full: home | built |
| [Mad robin](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#mad-robin) | Pair beside each other, facing someone across | 8 | Sideways do-si-do around the person beside you, keeping eye contact across | Where they started | built |
| [Petronella turn](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#petronella-turn) | Hands-four in a ring | 4, with a clap-clap on beats 3½–4 | Drop hands, move one place to the right, spinning clockwise | One place to the right | built |
| [Roll away (half sashay)](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#roll-away) | Pair side by side | 4 | One sidesteps; the other rolls in front of them a full turn without turning their back | Traded, facing the same way | built |
| [Slice](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#slice) | Couples on the side | 8 | As couples, four steps forward on the named diagonal, then back four facing straight across | One place along | built |
| [Give and take](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#give-and-take) | Two couples facing | 4 | Two steps in, take two hands with the person across; the named one pulls them back to their side | Usually into a swing | built |
| [Gate](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#gate) | Pair side by side, near hands | 4–8 | Pivot around the middle: one walks forward, the other backs up | By the amount | built |
| [Star promenade](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#star-promenade) / [butterfly whirl](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#butterfly-whirl) | Two couples | 4 + 4 | Centers hold hands in the middle, arms around partners, all rotate; then couples spin as a unit | Usually across the set | built |
| [Line of four down / up the hall](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#line-of-four-go-down-up-the-hall) | Hands-four in a line | 8 + 8 | Walk down the hall in a line, turn (alone or as couples), come back | Back in the set | built |
| [Turn alone](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#turn-alone) | Individuals | 1–2 | Face the other way; direction depends on the figures around it | Same place, turned 180° | built |
| [Contra corners](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#contra-corners) | Ones (actives) | 16 | Allemandes: across right ⅝, first corner left 1, across right ¾, second corner left 1 | Unusual position; usually into a center swing | planned |
