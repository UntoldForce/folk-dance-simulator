// Puts every dance in library/ (see tools/fetch-contradb.js) into one text file, separated by lines of =====, to load
// in the simulator's Dances panel ("Check many dances") and look through the ones with problems.
// Run: node tools/bundle-library.js [output file]     (default library/all-dances.txt)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', 'library'), out = process.argv[2] || path.join(root, 'all-dances.txt');
const files = fs.readdirSync(root, { recursive: true }).filter(f => f.endsWith('.txt') && !/report\.txt$|all-dances\.txt$/.test(f))
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
fs.writeFileSync(out, files.map(f => fs.readFileSync(path.join(root, f), 'utf8').trim()).join('\n\n=====\n\n') + '\n');
console.log(`${files.length} dances in ${out}`);
