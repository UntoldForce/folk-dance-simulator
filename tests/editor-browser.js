// Drives the editor in a real browser (needs Playwright). Run: node tests/editor-browser.js
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  let failures = 0;
  const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failures++; };
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1440, height: 1100 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(300);
  await p.locator('.editor').scrollIntoViewIfNeeded();
  const lines = re => p.evaluate(r => $('danceText').value.split('\n').filter(l => new RegExp(r, 'i').test(l)), re);

  // Resize: A1's long lines one bar shorter.
  const g = await p.locator('.fblk[data-part="0"][data-index="0"] .grip').boundingBox(), tr = await p.locator('.ptrack[data-part="0"]').boundingBox();
  await p.mouse.move(g.x + 4, g.y + 10); await p.mouse.down(); await p.mouse.move(g.x + 4 - (tr.width / 16) * 2, g.y + 10, { steps: 6 }); await p.mouse.up();
  check((await lines('long lines'))[0].startsWith('(6)'), 'dragging a figure\'s edge shortens it by a bar');
  await p.keyboard.press('Control+z');
  check((await lines('long lines'))[0].startsWith('(8)'), 'undo puts it back');

  // Move: A2's box the gnat to the start of B2.
  const blk = await p.locator('.fblk[data-part="1"][data-index="4"]').boundingBox(), b2 = await p.locator('.ptrack[data-part="3"]').boundingBox();
  await p.mouse.move(blk.x + 10, blk.y + 10); await p.mouse.down(); await p.mouse.move(b2.x + 3, b2.y + 20, { steps: 10 }); await p.mouse.up();
  const text = await p.evaluate(() => $('danceText').value);
  check(/B2\n\(4\) Neighbor box the gnat/.test(text), 'dragging a figure moves it to the start of another part');
  await p.keyboard.press('Control+z');

  // Builder: robins allemande left once and a half, added to A2.
  await p.click('.chip:has-text("Allemande")');
  await p.selectOption('#bWho', 'robins'); await p.click('.seg button[data-side="L"]'); await p.selectOption('#bAmt', '1.5');
  check((await p.locator('#bLine').innerText()) === '(8) Robins allemande left 1 & 1/2', 'the builder previews the line with its modifiers');
  await p.selectOption('#bPart', '1'); await p.click('#bAdd');
  check((await lines('^\\(8\\) robins allemande left 1 & 1/2')).length === 1, 'Add puts the set-up move into the chosen part');

  // Changing a placed figure: the B2 circle keeps 3 places and switches to circle right.
  await p.click('.fblk[data-part="3"][data-index="0"]');
  check((await p.locator('#bAmt').inputValue()) === '0.75', 'a placed circle left 3/4 reads back as 3 places');
  await p.click('.seg button[data-side="R"]');
  check((await lines('^\\(6\\) circle right 3/4')).length === 1, 'switching the side rewrites it as circle right 3/4');

  // A move not animated yet keeps its modifiers.
  await p.click('.chip:has-text("Do-si-do")'); await p.selectOption('#bAmt', '1.5'); await p.click('#bMore');
  await p.selectOption('#bPart', '2'); await p.click('#bAdd');
  check((await lines('do-si-do'))[0] === '(10) Neighbor do-si-do 1 & 1/2', 'a do-si-do 1½ for 10 beats is added');
  check((await p.locator('#bAmt').inputValue()) === '1.5', 'and reads back as once and a half');

  // Dragging a set-up move in by the builder's handle.
  await p.click('.chip:has-text("Pull by")'); await p.click('.seg button[data-side="L"]');
  const h = await p.locator('#bDrag').boundingBox(), a1 = await p.locator('.ptrack[data-part="0"]').boundingBox();
  await p.mouse.move(h.x + 10, h.y + 8); await p.mouse.down(); await p.mouse.move(a1.x + a1.width - 4, a1.y + 20, { steps: 12 }); await p.mouse.up();
  check((await lines('^\\(4\\) partner pull by left')).length === 1, 'a set-up pull by left can be dragged into a part');

  // New dance: four empty parts; playing an empty dance does nothing; a first move can be built.
  await p.click('#newDance'); await p.click('#play'); await p.waitForTimeout(400); await p.click('#play');
  check((await p.locator('.fblk').count()) === 0 && (await p.locator('#danceTitle').innerText()) === 'New dance', 'New dance starts four empty parts');
  await p.click('.chip:has-text("Circle")'); await p.selectOption('#bAmt', '0.75'); await p.selectOption('#bPart', '0'); await p.click('#bAdd');
  check(/A1\n\(8\) Circle left 3\/4/.test(await p.evaluate(() => $('danceText').value)), 'a first move can be added to the new dance');

  check(errs.length === 0, `no page errors ${errs.join(' | ')}`);
  await b.close();
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})();
