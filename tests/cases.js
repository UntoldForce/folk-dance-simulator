// The moves the figure and collision tests run, each from a suitable start. Used by tests/figures.js and
// tests/collisions.js.
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
  [8, 'Partner half draw poussette clockwise'], [16, 'Rights and lefts, 4 changes'], [8, 'First corners do-si-do'], [8, 'Half open ladies chain'], [8, 'First corners chevron, crossing by the right'], [16, 'Ones dolphin hey across the set'], [4, 'Turn single cloverleaf'], [4, 'Turn single up'], [8, 'Robins lead between and cast across'], [8, 'Ones long cast down'],
  [8, 'First lark crosses for a hey for three with the robins'], [16, 'Double figure eight, 2s cross up as 1s cast down'],
];
// English figures, run again in a proper set.
const ENGLISH = /side|siding|double|fall back|honour|hole in the wall|hand turn|turn by|bentley|back to back|draw poussette|rights and lefts|corners|chevron|dolphin|cast|hey for three|turn single/i;
// Moves that need a particular lead-in: [formation, lead-in, beats, figure].
const LEADINS = [
  ['Triple Minor - Proper', '(4) Ones cast off', 16, 'Ones turn contra corners'],
  ['Duple Minor - Improper', '(8) Partner swing', 8, 'Partner promenade across the set'],
  ['Duple Minor - Improper', '(8) Down the hall in a line of four', 4, 'Dixie twirl'],
  ['Duple Minor - Improper', '(8) Down the hall in a line of four', 2, 'Turn alone'],
  ['Duple Minor - Improper', '(4) Form a wave of four (NR, WL)', 4, 'Balance the wave'],
  ['Duple Minor - Improper', '(4) Form a wave of four (NR, WL)', 6, 'Trade the wave'],
  ['Duple Minor - Improper', '(4) Form a wave of four (NR, WL)', 4, 'Slide right'],
  ['Duple Minor - Improper', '(4) Form a wave of four (NR, WL)', 8, 'Spin the top'],
  ['Duple Minor - Improper', '(4) Form a wave of four (NR, WL)', 8, 'Swing through'],
  ['Duple Minor - Improper', '(8) Neighbor swing', 4, 'Box circulate, robins cross'],
  ['Duple Minor - Improper', '(8) Neighbor swing', 4, 'Box circulate, larks cross'],
  ['Duple Minor - Improper', '(8) In long lines, go forward and back', 4, 'Twos arch, ones dive'],
  ['Duple Minor - Improper', '(8) In long lines, go forward and back', 4, 'Cross trails'],
  ['Duple Minor - Improper', '(4) Form long waves (NR, robins face in)', 4, 'Circulate'],
  ['Duple Minor - Improper', '(4) Form long waves (NR, robins face in)', 4, 'Walk and dodge'],
  ['Duple Minor - Improper', '(4) Form long waves (NR, robins face in)', 8, 'Scoot back'],
  ['Duple Minor - Improper', '(8) Neighbor swing', 4, 'Pass the ocean'],
  ['Duple Minor - Improper', '(8) Neighbor swing', 4, 'Pass the sea'],
  ['Duple Minor - Improper', '(4) Long lines forward', 8, 'Circle left 3/4; form wave of four (NR, WL)'],
  ['Duple Minor - Improper', '(4) Long lines forward', 8, 'Neighbor do-si-do 1 & 1/4; form long waves (NR, women face in)'],
];
// Hey for three, in a three-couple set.
const TRIPLET = [[8, 'Hey for three on the sides, right shoulders to start'], [8, 'Half hey for three on the sides'], [16, 'Ones crossover mirror hey']];
// Square figures, in a square, after the heads go forward and back.
const SQUARE = [[16, 'Promenade home'], [8, 'Grand right and left'], [16, 'Grand right and left all the way'], [8, 'Heads pass through to the next square'],
  [8, 'Corner allemande left 1'], [8, 'Partner swing'], [8, 'Heads ladies chain'], [8, 'Sides right and left through'], [8, 'Circle left 1/2'],
  [8, 'Larks star right 1'], [8, 'Sides forward and back']];
module.exports = { FIGS, ENGLISH, LEADINS, TRIPLET, SQUARE };
