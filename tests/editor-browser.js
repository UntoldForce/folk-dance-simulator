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
  await p.locator('#rows').scrollIntoViewIfNeeded();
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

  // Move explorer: opens from the builder, closes with Escape, and works for every move.
  await p.click('.chip:has-text("Robins chain")'); await p.waitForTimeout(200);
  check(await p.locator('#bPrev').isVisible(), 'the builder shows a live preview of the move');
  await p.click('#bExplore'); await p.waitForTimeout(400);
  check(await p.evaluate(() => $('explorer').open && /Robins pull by right/.test($('exDesc').textContent)), 'Explore opens the move with its description');
  await p.keyboard.press('Escape');
  check(!(await p.evaluate(() => $('explorer').open)), 'Escape closes the explorer');
  const opened = await p.evaluate(() => POOL.filter(d => { openExplorer(d, { ...d.d }, d.beats || 4); const ok = $('explorer').open; $('explorer').close(); return ok; }).length);
  const total = await p.evaluate(() => POOL.length);
  check(opened === total, `every move opens in the explorer (${opened} of ${total})`);

  // Collisions: every move in the list, with each choice of who and side, as its preview plays it and again on a
  // fuller floor (three hands-fours, so neighbouring groups can get in each other's way). Nobody should pass
  // closer than 0.38 m (where the dots would overlap).
  const bumps = await p.evaluate(() => {
    const out = [], close = (c, t0, t1) => { let m = Infinity, who = '';
      for (let t = t0; t <= t1 + 1e-9; t += 0.05) { const ps = c.dancers.map(d => Contra.poseAt(c, d.id, t));
        for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) { const d = Math.hypot(ps[i].x - ps[j].x, ps[i].y - ps[j].y); if (d < m) { m = d; who = `${c.dancers[i].role} ${c.dancers[i].num}, ${c.dancers[j].role} ${c.dancers[j].num} at beat ${(t - t0).toFixed(1)}`; } } }
      return { m, who }; };
    let n = 0;
    for (const def of POOL.filter(d => d.fig)) {
      const variants = [{ ...def.d }];
      for (const w of def.who || []) if (w !== def.d.who) variants.push({ ...def.d, who: w });
      if (def.side && def.d.side) variants.push({ ...def.d, side: def.d.side === 'L' ? 'R' : 'L' });
      for (const m of variants) for (const sets of [1, 3]) {
        const { text } = previewText(def, m, def.beats || 4), c = Contra.compile(Contra.parseDance(text), { lines: 1, sets: def.square === 'Grid Square' ? 2 : sets, passes: 1, loop: false });
        const k = c.calls[c.calls.length - 1], r = close(c, k.t0, k.t1); n++;
        if (r.m < 0.38) out.push(`${text.split('\n').pop()} [${sets} hands-four${sets > 1 ? 's' : ''}]: ${r.m.toFixed(2)} m (${r.who})`);
      }
    }
    return { out, n };
  });
  check(bumps.out.length === 0, `no move has dancers bumping into each other (${bumps.n} versions checked)${bumps.out.length ? '\n      ' + bumps.out.join('\n      ') : ''}`);

  // Move list: the most common moves first; search by name, by the other role names, or an older name.
  check(await p.locator('.pgroup.common .chip').count() >= 15, 'the most common moves are shown first');
  const found = async q => { await p.fill('#poolSearch', q); await p.waitForTimeout(50); return p.locator('#pool .chip').allTextContents(); };
  const chain = await found('chain');
  check(chain.length >= 3 && chain.every(x => /chain/i.test(x)), `searching "chain" shows only chains (${chain.length})`);
  check((await found('gypsy')).some(x => /shoulder round/i.test(x)), 'searching "gypsy" finds the shoulder round');
  check((await found('ladies chain')).some(x => /robins chain/i.test(x)), 'searching "ladies chain" finds the robins chain');
  check((await found('zzz')).length === 0 && await p.locator('#pool .hint').isVisible(), 'a search with no matches says so');
  await p.fill('#poolSearch', ''); await p.waitForTimeout(50);
  check(/problems?/.test(await p.locator('#checksOpen').textContent()) && /passed/.test(await p.locator('#checksOpen').textContent()), 'the Checks counts are labelled');

  // Dances panel: the examples are the test dances in dances/; save and load your own; next end effect.
  const fs = require('fs'), files = ['square', 'grid-square', 'circle-mixer', 'triplet', 'tempest'].map(n => fs.readFileSync(path.join(__dirname, '..', 'dances', `${n}-test.txt`), 'utf8').trimEnd());
  check(await p.evaluate(f => EXAMPLES.slice(1).every((t, i) => t === f[i]), files), 'the example dances match the test dances in dances/');
  await p.click('#dancesOpen'); await p.click('#exampleList .dlist:has-text("Simple Square")'); await p.waitForTimeout(150);
  check(await p.evaluate(() => state.c.kind === 'square' && !$('dances').open), 'an example loads from the Dances panel');
  await p.click('#dancesOpen'); await p.click('#saveDance'); await p.waitForTimeout(50);
  check(await p.locator('#myList .dlist:has-text("Simple Square")').count() === 1, 'Save this dance adds it to My dances');
  await p.click('#dancesClose');

  // Journey chart: the timeline's second view; clicking a couple's line follows them and goes to that moment.
  await p.click('#reset2'); await p.waitForTimeout(150);
  await p.click('#viewJourney'); await p.waitForTimeout(150);
  check(await p.locator('#journeyCanvas').isVisible() && !(await p.locator('#rows').isVisible()), 'Journey swaps the part rows for the couple journey chart');
  const spot = await p.evaluate(() => { const d = journeyData(), v = journeyView($('journeyCanvas')), k = d.couples[2], [t, y] = k.pts[3]; return { id: k.id, x: v.r.left + v.X(t + 0.5 * state.c.perPass) , y: v.r.top + v.Y((y + k.pts[4][1]) / 2), t }; });
  await p.mouse.click(spot.x, spot.y); await p.waitForTimeout(100);
  check(await p.evaluate(s => state.highlight === s.id && passAt(state.t) === 3, spot), 'clicking a couple\'s line in the chart follows that couple and goes to that time through');
  check(await p.evaluate(() => state.journeyChart.couples.some(k => k.pts.some(q => q[2]))), 'the chart knows when couples wait out at the ends');
  await p.click('#viewParts'); await p.waitForTimeout(100);
  check(await p.locator('#rows').isVisible(), 'Parts brings the rows back');

  // Formation pictures: the common formations, one click each.
  check(!(await p.locator('.fpick').first().isVisible()), 'the formation pictures start folded away');
  await p.click('#formPicksBox summary'); await p.waitForTimeout(50);
  check(await p.locator('.fpick').count() === 6 && await p.locator('.fpick svg rect').count() > 0, 'six common formations are shown as pictures (larks as squares, robins as circles)');
  await p.click('.fpick[data-key="becketCW"]'); await p.waitForTimeout(100);
  check(await p.evaluate(() => $('formation').value === 'becketCW' && /Becket/.test($('danceText').value) && document.querySelector('.fpick[aria-pressed="true"]').dataset.key === 'becketCW'), 'clicking the Becket picture sets the formation and marks it');
  await p.click('.fpick[data-key="improper"]'); await p.waitForTimeout(100);
  await p.click('#formPicksBox summary');

  // Floor outlines: worked out once per time through; "out" labels stay put (they don't follow the couple about).
  check(await p.evaluate(() => { const c = state.c, a = settingShapes(c, 1); return a.some(s => s.corners) && a.some(s => s.label === 'out') && settingShapes(c, 1) === a; }),
    'hands-four outlines and "out" labels are fixed for each time through');

  // Workspace: nothing scrolls on a computer screen; the timeline sits right under the floor.
  await p.click('#reset2'); await p.waitForTimeout(200);
  for (const [w, h] of [[1440, 900], [1366, 768], [1920, 1080]]) {
    await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(150);
    const lay = await p.evaluate(() => ({ sh: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth, fl: $('floor').getBoundingClientRect(), tl: document.querySelector('.timeline').getBoundingClientRect() }));
    check(lay.sh <= h && lay.sw <= w && lay.tl.bottom <= h && lay.tl.top >= lay.fl.bottom && lay.tl.top - lay.fl.bottom < 20 && lay.fl.height > 250,
      `${w}×${h}: no scrolling, timeline right under the floor (floor ${Math.round(lay.fl.height)} px tall)`);
  }
  await p.setViewportSize({ width: 1440, height: 1100 });
  await p.click('#settingsOpen'); await p.waitForTimeout(100);
  check(await p.locator('#settings').isVisible() && await p.locator('#lines').isVisible(), 'Settings opens a side panel with the floor settings');
  await p.keyboard.press('Escape');
  check(!(await p.locator('#settings').isVisible()), 'and Escape closes it');
  await p.click('#checksOpen'); await p.waitForTimeout(100);
  check(await p.locator('#checks li').count() > 0, 'Checks opens the list of checks');
  await p.click('#checksClose');
  const nPass = await p.locator('#passStrip .pbox').count();
  await p.locator('#passStrip .pbox').nth(3).click(); await p.waitForTimeout(100);
  check(nPass === 8 && await p.evaluate(() => passAt(state.t) === 3), 'the times-through strip has a box per time through, and clicking one goes there');
  check(await p.locator('#passStrip .pbox .m').count() > 0, 'times when a couple waits out at an end are marked');
  const rb = await p.locator('#ruler').boundingBox();
  await p.mouse.move(rb.x + rb.width * 0.5, rb.y + 8); await p.mouse.down(); await p.mouse.move(rb.x + rb.width * 0.75, rb.y + 8, { steps: 4 }); await p.mouse.up();
  const local = await p.evaluate(() => state.t - passAt(state.t) * state.c.perPass);
  check(Math.abs(local % 16 - 12) < 0.3, `dragging along the beat ruler moves through the part (now beat ${(local % 16 + 1).toFixed(1)})`);
  await p.evaluate(() => seek(0)); await p.click('#nextEnd');
  check(await p.evaluate(() => { const p = passAt(state.t), k = q => state.c.passes[q].outs.map(o => o.couple).sort().join(); return p > 0 && state.t === p * state.c.perPass && k(p) !== k(p - 1); }), 'Next end effect jumps to a time through where who waits out changes');
  await p.evaluate(() => { seek(3 * state.c.perPass); });
  await p.evaluate(() => { $('loop').value = 'figure'; seek(3 * state.c.perPass + 9); setPlaying(true); });
  await p.waitForTimeout(3500);
  const inFig = await p.evaluate(() => { setPlaying(false); const k = state.c.calls[Contra.callIndexAt(state.c, state.t)]; return k.text; });
  check(/allemande/i.test(inFig), `Loop: this figure keeps playing the same figure (${inFig})`);
  await p.evaluate(() => { $('loop').value = 'all'; });

  // Settings: music starts off; hands toggle; references open in a pop-up.
  check(await p.evaluate(() => !$('music').checked && !$('melody').checked), 'music and melody start off');
  await p.click('#hands'); await p.waitForTimeout(100); await p.click('#hands'); await p.waitForTimeout(100);
  check(await p.evaluate(() => $('hands').checked), 'the hands switch turns off and back on');
  check(!(await p.locator('#refsDialog').isVisible()), 'references are hidden until asked for');
  await p.click('#refsOpen'); await p.waitForTimeout(150);
  check(await p.locator('#refsDialog').isVisible() && (await p.locator('#refsDialog a').count()) >= 6, 'the References button opens the list of sources');
  await p.click('#refsClose');
  check(!(await p.locator('#refsDialog').isVisible()), 'and it closes again');

  check(errs.length === 0, `no page errors ${errs.join(' | ')}`);
  await b.close();
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})();
