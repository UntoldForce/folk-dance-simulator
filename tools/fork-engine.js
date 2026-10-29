// The games in games/ each carry their own copy of the simulator's engine (the <script id="engine"> block of
// index.html), so each stays one self-contained file. This copies the current engine into them, for when an
// improvement to the simulator should reach the games too. Run: node tools/fork-engine.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), block = /<script id="engine">[\s\S]*?<\/script>/;
const engine = fs.readFileSync(path.join(root, 'index.html'), 'utf8').match(block)[0];
for (const f of fs.readdirSync(path.join(root, 'games')).filter(f => f.endsWith('.html'))) {
  const file = path.join(root, 'games', f), text = fs.readFileSync(file, 'utf8');
  if (!block.test(text)) continue;
  const next = text.replace(block, () => engine);
  console.log(next === text ? `${f}: already up to date` : `${f}: engine updated`);
  fs.writeFileSync(file, next);
}
