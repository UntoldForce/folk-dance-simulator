// Drives the editor in a real browser (needs Playwright). Run: node tests/editor-browser.js
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  let failures = 0;
  const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failures++; };
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1440, height: 1100 } });
  // (The first-visit tour is tested on its own below; here it has been seen already.)
  await p.addInitScript(() => { try { localStorage.setItem('contra.toured', '1'); } catch (e) {} });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(300);
  check(await p.evaluate(() => state.doc.title === '111' && /111 by Chris Page/.test($('danceTitle').textContent)), 'the dance on the floor at first is 111 by Chris Page');
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
  await p.evaluate(() => { const f = drawPuzzled; window.puzzledOn = new Set(); drawPuzzled = (g, ...a) => { puzzledOn.add(g.canvas.id); return f(g, ...a); }; });
  await p.waitForTimeout(600);
  check(await p.evaluate(() => [...puzzledOn].every(id => id === 'floor')), 'confused-dancer bubbles are only drawn on the main floor, not in move previews');
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
  check(await p.evaluate(f => EXAMPLES.slice(2).every((t, i) => t === f[i]), files), 'the example dances match the test dances in dances/');
  check(await p.evaluate(f => EXAMPLES[0] === f[0] && EXAMPLES[1] === f[1], ['111', '3-33-33'].map(n => fs.readFileSync(path.join(__dirname, '..', 'dances', `${n}.txt`), 'utf8').trimEnd())), 'the featured dances start with 111 (the default) and 3, 33-33');
  await p.click('#dancesOpen'); await p.click('#exampleList .dlist:has-text("Simple Square")'); await p.waitForTimeout(150);
  check(await p.evaluate(() => state.c.kind === 'square' && !$('dances').open), 'an example loads from the Dances panel');
  await p.click('#dancesOpen'); await p.click('#saveDance'); await p.waitForTimeout(300);
  check(/Added “Simple Square.*” to your card box/.test(await p.textContent('#saveNote')), 'Save to my card box (in the Dances panel) adds the dance as a card');
  await p.click('#dancesClose');

  // Check many dances: load files (one holding two dances), list problems first, step through them with ‹ ›.
  const tmp = require('os').tmpdir(), broken = 'Broken Reel\nA1\n(8) Frobnicate the robins\n(8) Neighbors swing';
  fs.writeFileSync(path.join(tmp, 'two.txt'), `${files[0]}\n\n=====\n\n${broken}`);
  fs.writeFileSync(path.join(tmp, 'one.txt'), fs.readFileSync(path.join(__dirname, '..', 'dances', '111.txt'), 'utf8').replace(/^.*/, 'Second Broken\nA1\n(8) Wibble\n\n=====\n\n$&'));
  await p.click('#dancesOpen');
  await p.setInputFiles('#bulkFile', [path.join(tmp, 'two.txt'), path.join(tmp, 'one.txt')]);
  await p.waitForFunction(() => bulk.items.length === 4 && !bulk.queue.length);
  check(await p.locator('#bulkList .dlist').count() === 2 && /Can't read: Frobnicate/.test(await p.locator('#bulkList .why').first().textContent()), 'loaded files are checked, and the list shows only the problem dances, saying what is wrong');
  await p.selectOption('#bulkKind', 'all');
  check(await p.locator('#bulkList .dlist').count() === 4 && /4 dances checked, 2 with no problems/.test(await p.textContent('#bulkNote')), 'All dances lists every one, with a count');
  await p.selectOption('#bulkKind', 'problems');
  await p.click('#bulkList .dlist >> nth=0'); await p.waitForTimeout(150);
  check(await p.evaluate(() => !$('dances').open && /Frobnicate/.test($('danceText').value) && !$('bulkStep').hidden && $('bulkPos').textContent === '1 of 2'), 'clicking one opens it, with ‹ 1 of 2 › at the top');
  await p.click('#bulkNext'); await p.waitForTimeout(150);
  check(await p.evaluate(() => /Wibble/.test($('danceText').value) && $('bulkPos').textContent === '2 of 2' && $('bulkNext').disabled), '› goes to the next problem dance');
  await p.click('#dancesOpen'); await p.click('#exampleList .dlist >> nth=0'); await p.waitForTimeout(100);
  check(await p.evaluate(() => $('bulkStep').hidden), 'opening a dance from elsewhere hides ‹ ›');
  await p.click('#dancesOpen'); await p.click('#bulkClear');
  check(await p.locator('#bulkList .dlist').count() === 0 && await p.locator('#bulkBar').isHidden(), 'Clear empties the list');
  await p.click('#dancesClose');

  // Journey chart: the timeline's second view; clicking a couple's line follows them and goes to that moment.
  await p.click('#reset2'); await p.waitForTimeout(150);
  check(await p.evaluate(() => state.doc.title === '111'), 'the Load button loads the sample dance, 111');
  await p.evaluate(() => { $('danceText').value = EXAMPLES[0]; state.sel = null; build(); commit(true); }); await p.waitForTimeout(150);
  await p.click('#viewJourney'); await p.waitForTimeout(150);
  check(await p.locator('#journeyCanvas').isVisible() && !(await p.locator('#rows').isVisible()), 'Journey swaps the part rows for the couple journey chart');
  const spot = await p.evaluate(() => { const d = journeyData(), v = journeyView($('journeyCanvas')), k = d.couples[2], [t, y] = k.pts[3]; return { id: k.id, x: v.r.left + v.X(t + 0.5 * state.c.perPass) , y: v.r.top + v.Y((y + k.pts[4][1]) / 2), t }; });
  await p.mouse.click(spot.x, spot.y); await p.waitForTimeout(100);
  check(await p.evaluate(s => state.highlight === s.id && passAt(state.t) === 3, spot), 'clicking a couple\'s line in the chart follows that couple and goes to that time through');
  check(await p.evaluate(() => state.journeyChart.couples.some(k => k.pts.some(q => q[2]))), 'the chart knows when couples wait out at the ends');
  await p.click('#viewParts'); await p.waitForTimeout(100);
  check(await p.locator('#rows').isVisible(), 'Parts brings the rows back');

  // "Balance & swing" on one line: one block, shown as the Balance and swing move, lit while either step plays.
  await p.evaluate(() => { $('danceText').value = 'A1\n(16) Neighbors balance & swing\nA2\n(16) Partners balance and swing'; build(); seek(10); });
  await p.waitForTimeout(100);
  check(await p.evaluate(() => document.querySelectorAll('.fblk[data-part="0"]').length === 1 && moveOf(state.doc.parts[0].calls[0]).label === 'Balance and swing' && document.querySelector('.fblk[data-part="0"]').classList.contains('active')),
    'a balance & swing line is one block (the Balance and swing move), lit during its swing');
  await p.evaluate(() => { $('danceText').value = EXAMPLES[0]; state.sel = null; build(); commit(true); }); await p.waitForTimeout(100);

  // Formation and progression, with pictures of the common formations: folded under one line saying what they are.
  check(!(await p.locator('.fpick').first().isVisible()) && !(await p.locator('#formation').isVisible()) && await p.textContent('#setupSum') === 'Improper · single progression',
    'formation, progression and the pictures start folded away under "Formation Improper · single progression"');
  check(await p.locator('#setupPic svg').count() === 1 && /Change/.test(await p.evaluate(() => getComputedStyle(document.querySelector('.sumchange'), '::before').content)), 'the folded line looks like a button: a picture of the formation and "Change ▾"');
  await p.click('#setupBox summary'); await p.waitForTimeout(50);
  check(await p.locator('.fpick').count() === 6 && await p.locator('.fpick svg rect').count() > 0, 'six common formations are shown as pictures (larks as squares, robins as circles)');
  await p.click('.fpick[data-key="becketCW"]'); await p.waitForTimeout(100);
  check(await p.evaluate(() => $('formation').value === 'becketCW' && /Becket/.test($('danceText').value) && document.querySelector('.fpick[aria-pressed="true"]').dataset.key === 'becketCW'), 'clicking the Becket picture sets the formation and marks it');
  check(await p.textContent('#setupSum') === 'Becket (clockwise) · single progression', 'and the folded line says so');
  await p.selectOption('#progression', '2'); await p.waitForTimeout(100);
  check(/double progression/.test(await p.textContent('#setupSum')) && /Progression:\s*Double/.test(await p.evaluate(() => $('danceText').value)), 'changing the progression updates the dance and the line');
  await p.selectOption('#progression', '1');
  await p.click('.fpick[data-key="improper"]'); await p.waitForTimeout(100);
  await p.click('#setupBox summary');

  // Floor outlines: worked out once per time through; "out" labels stay put (they don't follow the couple about).
  check(await p.evaluate(() => { const c = state.c, a = settingShapes(c, 1); return a.some(s => s.corners) && a.some(s => s.label === 'out') && settingShapes(c, 1) === a; }),
    'hands-four outlines and "out" labels are fixed for each time through');

  // Workspace: nothing scrolls on a computer screen; the timeline sits right under the floor.
  await p.evaluate(() => { $('danceText').value = EXAMPLES[0]; state.sel = null; build(); commit(true); }); await p.waitForTimeout(200);
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
  check(await p.evaluate(() => $('puzzled').checked && typeof drawPuzzled === 'function'), 'confused dancers say so, unless turned off in Settings');
  check(!(await p.locator('#refsDialog').isVisible()), 'references are hidden until asked for');
  await p.click('#helpOpen'); await p.click('#helpRefs'); await p.waitForTimeout(150);
  check(await p.locator('#refsDialog').isVisible() && (await p.locator('#refsDialog a').count()) >= 6, 'the References button opens the list of sources');
  await p.click('#refsClose');
  check(!(await p.locator('#refsDialog').isVisible()), 'and it closes again');

  // The move card on a computer: pinned at the top of the editor, nothing dimmed; Add keeps it open (to add more).
  await p.evaluate(() => { $('danceText').value = EXAMPLES[0]; state.sel = null; build(); commit(true); }); await p.waitForTimeout(100);
  await p.click('.chip:has-text("Swing") >> nth=0'); await p.waitForTimeout(200);
  check(await p.evaluate(() => getComputedStyle($('builder')).position === 'sticky' && $('cardScrim').hidden), 'on a computer the move card is pinned above the move list, with nothing dimmed');
  await p.click('.seg button[data-who="neighbors"]'); await p.waitForTimeout(100);
  check(/Neighbor/.test(await p.textContent('#bLine')) && await p.getAttribute('.seg button[data-who="neighbors"]', 'aria-pressed') === 'true', 'Partners and Neighbors are big buttons on the card');
  const n0 = await p.evaluate(() => state.doc.parts[0].calls.length);
  await p.selectOption('#bPart', '0'); await p.click('#bAdd'); await p.waitForTimeout(150);
  check(await p.evaluate(n => state.doc.parts[0].calls.length === n + 1, n0) && await p.isVisible('#builder') && /Added to A1/.test(await p.textContent('.bnote')), 'Add puts it in the part and keeps the card open, saying so');
  const name0 = await p.textContent('.bhead strong'); await p.click('#bNextMove'); await p.waitForTimeout(100);
  check((await p.textContent('.bhead strong')) !== name0 && await p.locator('#pool .chip.cur').count() >= 1, '› shows the next move in the list, marked in the list');
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  check(await p.isHidden('#builder'), 'Escape closes the card');

  // The move card on a phone: slides up in front, the rest dimmed; Add closes it, back where you were in the list.
  {
    const { devices } = require('playwright'), ctx = await b.newContext({ ...devices['iPhone 13'] }), q = await ctx.newPage();
    await q.addInitScript(() => { try { localStorage.setItem('contra.toured', '1'); } catch (e) {} });
    q.on('pageerror', e => errs.push(e.message));
    await q.goto('file://' + path.join(__dirname, '..', 'index.html')); await q.evaluate(() => localStorage.clear()); await q.reload(); await q.waitForTimeout(300);
    // On a phone the page opens for watching: the editor is behind "Edit this dance".
    check(await q.isHidden('.side') && await q.isVisible('#editToggle'), 'on a phone the editor starts hidden, behind "Edit this dance"');
    await q.tap('#editToggle'); await q.waitForTimeout(400);
    check(await q.isVisible('.side'), '"Edit this dance" shows the editor');
    const chip = q.locator('.chip:has-text("Petronella")').first(); await chip.scrollIntoViewIfNeeded(); const y0 = await q.evaluate(() => scrollY);
    await chip.tap(); await q.waitForTimeout(300);
    const box = await q.locator('#builder').boundingBox(), vh = await q.evaluate(() => innerHeight);
    check(await q.isVisible('#cardScrim') && Math.abs(box.y + box.height - vh) < 2 && await q.evaluate(y => scrollY === y, y0), 'on a phone, tapping a move slides the card up from the bottom, dims the rest, and keeps your place in the list');
    const n = await q.evaluate(() => state.doc.parts.reduce((s, x) => s + x.calls.length, 0));
    await q.tap('#bAdd'); await q.waitForTimeout(200);
    check(await q.isHidden('#builder') && await q.isHidden('#cardScrim') && await q.evaluate(n => state.doc.parts.reduce((s, x) => s + x.calls.length, 0) === n + 1, n), 'Add puts the move in and closes the card');
    await chip.tap(); await q.waitForTimeout(300); await q.mouse.click(200, 40); await q.waitForTimeout(200);
    check(await q.isHidden('#builder'), 'tapping the dimmed page closes the card');
    await q.locator('.fblk').first().scrollIntoViewIfNeeded(); await q.locator('.fblk').first().tap(); await q.waitForTimeout(300);
    check(await q.isVisible('#bDone') && await q.isVisible('#bRemove'), 'tapping a figure in the rows opens the same card to change it, with Done and Remove');
    await ctx.close();
  }

  // Dance card tab: outside Claude the photo button is hidden and points to the Claude copy; a card typed in as
  // written (shorthand, ditto marks, no beats) loads as a dance.
  {
    await p.click('#tabCard');
    check(await p.isHidden('#photoRow') && await p.isVisible('#photoElsewhere') && /claude\.ai/.test(await p.getAttribute('#openInClaude', 'href')), 'Dance card tab: away from Claude, no photo button, and a link to open the simulator in Claude');
    await p.fill('#cardText', 'Sidmouth Swirl    4x4  Bob Isaacs\nA1 Lines F&B; all circle R ½\nA2 corner alle L; grand R&L (starting w/ P)\nB1 all 8 "spin the top": P alle R½, robins star, L orbit to meet P\n" " " " P alle R½, larks star, R " " "\nB2 P B&S');
    await p.click('#cardLoad');
    const st = await p.textContent('#cardStatus'), title = await p.evaluate(() => state.doc.title), n = await p.evaluate(() => state.doc.parts.reduce((s, x) => s + x.calls.length, 0));
    check(/^Loaded/.test(st) && title === 'Sidmouth Swirl' && n === 7, `a typed dance card loads as the dance (${title}, ${n} moves): ${st}`);
    await p.click('#tabEditor');
  }

  // First visit: the tour opens by itself, steps through the basics lighting up each part, and once finished
  // doesn't come back; Help explains more and can show it again.
  for (const [label, opts] of [['computer', { viewport: { width: 1440, height: 1000 } }], ['phone', { ...require('playwright').devices['iPhone 13'] }]]) {
    const ctx = await b.newContext(opts), q = await ctx.newPage();
    q.on('pageerror', e => errs.push(e.message));
    await q.goto('file://' + path.join(__dirname, '..', 'index.html'));
    await q.waitForSelector('#tour:not([hidden])', { timeout: 3000 }).catch(() => {});
    check(await q.isVisible('#tourCard') && /Welcome/.test(await q.textContent('#tourTitle')), `${label}: on a first visit the tour opens with a welcome`);
    let n = 1, onScreen = true;
    while (!/Done/.test(await q.textContent('#tourNext')) && n < 20) {
      await q.click('#tourNext'); await q.waitForTimeout(350); n++;
      const box = await q.locator('#tourCard').boundingBox(), vp = q.viewportSize();
      if (!(box.x >= 0 && box.y >= 0 && box.x + box.width <= vp.width + 1 && box.y + box.height <= vp.height + 1)) onScreen = false;
    }
    check(n === (label === 'phone' ? 4 : 10) && onScreen, `${label}: the tour has ${label === 'phone' ? 4 : 10} steps, its card always fully on screen (${n})`);
    await q.click('#tourNext'); await q.waitForTimeout(100);
    check(await q.isHidden('#tour'), `${label}: Done closes the tour`);
    await q.reload(); await q.waitForTimeout(1200);
    check(await q.isHidden('#tour'), `${label}: the tour doesn't open again on the next visit`);
    if (label === 'phone') { await q.click('#menuOpen'); check(await q.isVisible('#phoneMenu'), 'phone: the ☰ Menu opens, with everything else in it'); await q.click('#phoneMenu [data-go="helpOpen"]'); }
    else await q.click('#helpOpen');
    check(await q.isVisible('#helpDialog') && (await q.locator('#helpDialog details').count()) >= 8, `${label}: Help opens the full guide`);
    await q.click('#helpTour'); await q.waitForTimeout(200);
    check(await q.isHidden('#helpDialog') && await q.isVisible('#tourCard'), `${label}: Help can show the tour again`);
    await q.keyboard.press('Escape');
    check(await q.isHidden('#tour'), `${label}: Escape closes the tour`);
    await ctx.close();
  }

  // My card box (Christine Merryman's idea): the caller's own dances as index cards, kept on this device; added from the
  // floor, a dance card or a file; searched, sorted, rated; exported one card or all as a text file. Dances saved the
  // old way move in.
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true }), q = await ctx.newPage();
    q.on('pageerror', e => errs.push(e.message));
    await q.addInitScript(() => { try { localStorage.setItem('contra.toured', '1'); if (!sessionStorage.getItem('seeded')) { localStorage.setItem('contra.saved', JSON.stringify({ 'Old Favourite': 'Old Favourite\nby Someone\n\nFormation: Becket\n\nA1\n(8) Long lines forward and back\n(8) Robins chain\nA2\n(8) Circle left 3 places\n(8) Slide left along set\nB1\n(16) Neighbors balance & swing\nB2\n(16) Partners balance & swing\n' })); sessionStorage.setItem('seeded', '1'); } } catch (e) {} });
    await q.goto('file://' + path.join(__dirname, '..', 'index.html')); await q.waitForTimeout(800);
    await q.click('#boxOpen'); await q.waitForTimeout(300);
    check(await q.isVisible('#cardBox') && (await q.locator('#boxGrid .icard').count()) === 1 && /Old Favourite/.test(await q.textContent('#boxGrid')), 'card box: a dance saved the old way has moved in as a card');
    await q.click('#boxAdd'); await q.waitForTimeout(300);
    check((await q.locator('#boxGrid .icard').count()) === 2 && /Added “111”/.test(await q.textContent('#boxNote')), 'card box: "Add the dance on the floor" adds 111 as a card');
    const card = q.locator('#boxGrid .icard', { hasText: '111' });
    check(/A1/.test(await card.textContent()) && /Chris Page/.test(await card.textContent()) && /Improper/.test(await card.textContent()), 'a card shows its title, type of dance, choreographer and the dance part by part');
    await q.fill('#boxSearch', 'chris'); await q.waitForTimeout(100);
    check((await q.locator('#boxGrid .icard').count()) === 1, 'search finds cards by choreographer');
    await q.fill('#boxSearch', 'slide left'); await q.waitForTimeout(100);
    check((await q.locator('#boxGrid .icard').count()) === 1 && /Old Favourite/.test(await q.textContent('#boxGrid')), 'search finds cards by their moves');
    await q.fill('#boxSearch', ''); await q.selectOption('#boxForm', { label: 'Becket' }); await q.waitForTimeout(100);
    check((await q.locator('#boxGrid .icard').count()) === 1, 'filter by type of dance');
    await q.selectOption('#boxForm', ''); await q.selectOption('#boxSort', 'title'); await q.waitForTimeout(100);
    check(/^111/.test((await q.locator('#boxGrid .icard .ititle').first().textContent()).trim()), 'sort by title');
    await q.locator('#boxGrid .icard', { hasText: '111' }).click(); await q.waitForTimeout(200);
    check(await q.isVisible('#boxDetail') && await q.isVisible('#detailCard .icard.full'), 'tapping a card opens it full size');
    await q.locator('#detailDiff button').nth(2).click(); await q.locator('#detailFlow button').nth(4).click();
    await q.fill('#detailTags', 'classic, easy'); await q.locator('#detailTags').dispatchEvent('change');
    await q.fill('#detailNotes', 'Good first dance\nTeach the allemande'); await q.locator('#detailNotes').dispatchEvent('change'); await q.waitForTimeout(200);
    const [dl] = await Promise.all([q.waitForEvent('download'), q.click('#detailExport')]);
    const exported = require('fs').readFileSync(await dl.path(), 'utf8');
    check(dl.suggestedFilename() === '111.txt' && /Difficulty: 3/.test(exported) && /Flow: 5/.test(exported) && /Tags: classic, easy/.test(exported) && /Notes: Teach the allemande/.test(exported) && /\(8\) In long lines/.test(exported),
      'export one card: a text file with the dance, its ratings, tags and notes');
    await q.click('#detailBack'); await q.selectOption('#boxSort', 'diff'); await q.selectOption('#boxTag', 'easy'); await q.waitForTimeout(100);
    check((await q.locator('#boxGrid .icard').count()) === 1 && /★★★/.test(await q.textContent('#boxGrid')), 'filter by tag; the card shows its ratings');
    await q.selectOption('#boxTag', '');
    const [all] = await Promise.all([q.waitForEvent('download'), q.click('#boxExport')]);
    const allText = require('fs').readFileSync(await all.path(), 'utf8');
    check(/^card-box-\d{4}-\d\d-\d\d\.txt$/.test(all.suggestedFilename()) && (allText.match(/^=====/mg) || []).length === 1, 'Export all: every card in one text file, separated by =====');
    // Import into a fresh box: the cards come back with their ratings, tags and notes.
    const ctx2 = await b.newContext({ viewport: { width: 1280, height: 900 } }), r = await ctx2.newPage();
    r.on('pageerror', e => errs.push(e.message));
    await r.addInitScript(() => { try { localStorage.setItem('contra.toured', '1'); } catch (e) {} });
    await r.goto('file://' + path.join(__dirname, '..', 'index.html')); await r.waitForTimeout(800);
    await r.click('#boxOpen'); await r.setInputFiles('#boxImport', { name: 'box.txt', mimeType: 'text/plain', buffer: Buffer.from(allText) }); await r.waitForTimeout(500);
    check(/Imported 2 cards/.test(await r.textContent('#boxNote')) && (await r.locator('#boxGrid .icard').count()) === 2, 'import the exported file into another card box: both cards');
    await r.locator('#boxGrid .icard', { hasText: '111' }).click(); await r.waitForTimeout(200);
    check((await r.inputValue('#detailTags')) === 'classic, easy' && (await r.inputValue('#detailNotes')) === 'Good first dance\nTeach the allemande' && (await r.locator('#detailDiff button[aria-pressed="true"]').count()) === 3,
      'an imported card keeps its ratings, tags and notes');
    await r.click('#detailDance'); await r.waitForTimeout(400);
    check(!(await r.isVisible('#cardBox')) && (await r.evaluate(() => state.doc.title)) === '111', '"Dance it" puts the card\'s dance on the floor');
    // From the Dance card tab, a typed card goes straight into the box.
    await r.click('#tabCard'); await r.fill('#cardText', 'Sidmouth Swirl    4x4  Bob Isaacs\nA1 Lines F&B; all circle R ½\nA2 corner alle L; grand R&L (starting w/ P)\nB1 all 8 "spin the top": P alle R½, robins star, L orbit to meet P\n" " " " P alle R½, larks star, R " " "\nB2 P B&S');
    await r.click('#cardSave'); await r.waitForTimeout(300);
    await r.click('#boxOpen'); await r.waitForTimeout(300);
    check(/Saved “Sidmouth Swirl”/.test(await r.textContent('#cardStatus')) && /Sidmouth Swirl/.test(await r.textContent('#boxGrid')) && /Four facing four/.test(await r.textContent('#boxGrid')), 'Dance card tab: "Save to my card box" adds the card');
    // Backing up by email: the card box says the cards are kept only on this device, and offers to email a backup.
    check(/only on this device/.test(await r.textContent('.boxlocal')) && await r.isVisible('#boxEmail'), 'the card box says cards are kept only on this device, with a button to email a backup');
    const [bk] = await Promise.all([r.waitForEvent('download', { timeout: 3000 }).catch(() => null), r.click('#boxEmail')]);
    const note = await r.textContent('#boxNote');
    check((bk ? /attach that file/.test(note) : /email has opened with your cards/.test(note)), `email a backup: the file is saved (or put in the email) and a new email opens: ${note}`);
    await ctx.close(); await ctx2.close();
  }
  // The card box on a phone: full screen, one card per row.
  {
    const { devices } = require('playwright'), ctx = await b.newContext({ ...devices['iPhone 13'] }), q = await ctx.newPage();
    q.on('pageerror', e => errs.push(e.message));
    await q.addInitScript(() => { try { localStorage.setItem('contra.toured', '1'); } catch (e) {} });
    await q.goto('file://' + path.join(__dirname, '..', 'index.html')); await q.waitForTimeout(800);
    await q.click('#menuOpen'); await q.click('#phoneMenu [data-go="boxOpen"]'); await q.click('#boxAdd'); await q.waitForTimeout(300);
    const box = await q.locator('#cardBox').boundingBox(), c1 = await q.locator('#boxGrid .icard').first().boundingBox(), vp = q.viewportSize();
    check(box.width >= vp.width - 2 && c1.x >= 0 && c1.x + c1.width <= vp.width, 'card box on a phone: fills the screen, cards fit across');
    await ctx.close();
  }

  // Phone-friendly (Christine): a play bar always at the bottom, the expert controls behind More, one dot for the checks;
  // the move list folded; the Caller view, the dance card as a caller reads it.
  {
    const { devices } = require('playwright'), ctx = await b.newContext({ ...devices['iPhone 13'] }), q = await ctx.newPage();
    q.on('pageerror', e => errs.push(e.message));
    await q.addInitScript(() => { try { localStorage.setItem('contra.toured', '1'); } catch (e) {} });
    await q.goto('file://' + path.join(__dirname, '..', 'index.html')); await q.waitForTimeout(800);
    const bar = await q.locator('#playbar').boundingBox(), vh = q.viewportSize().height;
    check(bar && Math.abs(bar.y + bar.height - vh) < 2 && await q.isVisible('#pbPlay'), 'phone: the play bar sits at the bottom of the screen');
    await q.evaluate(() => window.scrollTo(0, 2000)); await q.waitForTimeout(100);
    const bar2 = await q.locator('#playbar').boundingBox();
    check(Math.abs(bar2.y + bar2.height - vh) < 2, 'phone: the play bar stays there while scrolling');
    await q.tap('#pbFwd'); await q.tap('#pbFwd'); await q.waitForTimeout(100);
    check(/A1 · beat 3/.test(await q.textContent('#pbWhere')) && /long lines/i.test(await q.textContent('#pbWhat')), `phone: the play bar steps the dance and says where it is (${await q.textContent('#pbWhere')})`);
    check(await q.isHidden('#loop') && await q.isHidden('#passStrip'), 'phone: the expert controls start hidden');
    await q.evaluate(() => window.scrollTo(0, 0)); await q.tap('#tbMore'); await q.waitForTimeout(100);
    check(await q.isVisible('#loop') && await q.isVisible('#passStrip'), 'phone: More shows them');
    check(await q.isVisible('#checkDot') && /warn|bad|ok/.test(await q.getAttribute('#checkDot', 'class')) && await q.isHidden('#checksOpen'), 'phone: the checks are one coloured dot');
    await q.tap('#menuOpen'); await q.tap('#phoneMenu [data-go="callerOpen"]'); await q.waitForTimeout(300);
    check(await q.isVisible('#callerView') && (await q.locator('#cvCard .iline.cur').count()) === 1, 'phone: the Caller view opens from the menu, with the current line highlighted');
    await ctx.close();
  }
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } }), q = await ctx.newPage();
    q.on('pageerror', e => errs.push(e.message));
    await q.addInitScript(() => { try { localStorage.setItem('contra.toured', '1'); } catch (e) {} });
    await q.goto('file://' + path.join(__dirname, '..', 'index.html')); await q.waitForTimeout(800);
    check(await q.isHidden('#playbar') && await q.isHidden('#menuOpen') && await q.isVisible('#dancesOpen'), 'computer: no play bar or menu; the buttons are as before');
    check((await q.locator('#pool details.pgroup[open]').count()) === 0 && await q.isVisible('#pool .pgroup.common'), 'the move list starts folded: the most common moves, the groups closed');
    await q.fill('#poolSearch', 'chain'); await q.waitForTimeout(100);
    check((await q.locator('#pool details.pgroup[open]').count()) > 0, 'searching opens the groups with matches');
    await q.fill('#poolSearch', '');
    await q.evaluate(t => { $('danceText').value = t; build(); }, require('fs').readFileSync(path.join(__dirname, '..', 'dances', '111.txt'), 'utf8')); await q.waitForTimeout(200);
    await q.click('#callerOpen'); await q.waitForTimeout(300);
    const lines = q.locator('#cvCard .iline');
    check(await q.isVisible('#callerView') && (await lines.count()) === 12 && /111/.test(await q.textContent('#cvCard header')), 'Caller view: the dance on a card, every line');
    check(/In long lines/.test(await q.textContent('#cvNow')) && /Robins allemande/.test(await q.textContent('#cvNext')) && /in 8 beats/.test(await q.textContent('#cvIn')), `Caller view: now, and the next call with the beats until it (${await q.textContent('#cvIn')})`);
    for (let i = 0; i < 5; i++) await q.click('#cvFwd');
    await q.waitForTimeout(150);
    check(/in 3 beats/.test(await q.textContent('#cvIn')) && /soon/.test(await q.getAttribute('#cvNextBox', 'class')), 'Caller view: the next call lights up in the last beats before it');
    for (let i = 0; i < 4; i++) await q.click('#cvFwd');
    await q.waitForTimeout(150);
    check((await lines.nth(1).getAttribute('class')).includes('cur') && /Robins allemande/.test(await q.textContent('#cvNow')), 'Caller view: the highlight moves on to the next line');
    await q.click('#cvPlay'); await q.waitForTimeout(600);
    check(await q.evaluate(() => state.playing) && (await q.textContent('#cvPlay')) === 'Pause', 'Caller view: Play plays the dance');
    await q.click('#cvPlay'); await q.click('#cvClose');
    await ctx.close();
  }

  // Following a couple in 3, 33-33 names their 1st, 2nd and 3rd neighbors, in the follow box and with tags on the floor.
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } }), q = await ctx.newPage();
    q.on('pageerror', e => errs.push(e.message));
    await q.addInitScript(() => { try { localStorage.setItem('contra.toured', '1'); localStorage.setItem('contra.set.lines', '1'); localStorage.setItem('contra.set.sets', '4'); } catch (e) {} });
    await q.goto('file://' + path.join(__dirname, '..', 'index.html')); await q.waitForTimeout(800);
    await q.evaluate(() => { $('danceText').value = EXAMPLES[1]; state.sel = null; build(); commit(true); }); await q.waitForTimeout(200);
    await q.evaluate(() => { state.highlight = state.c.couples.find(k => k.num === 3).id; showJourney(); seek(2); }); await q.waitForTimeout(200);
    const txt = await q.textContent('#followNbrs');
    check(/Lark 3's neighbors: 1st robin 4 · 2nd robin 6 · 3rd robin 8/.test(txt) && /Robin 3's neighbors: 1st lark 4/.test(txt), `following couple 3 names their 1st, 2nd and 3rd neighbors (${txt.replace(/\n/g, ' / ')})`);
    await ctx.close();
  }

  check(errs.length === 0, `no page errors ${errs.join(' | ')}`);
  await b.close();
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})();
