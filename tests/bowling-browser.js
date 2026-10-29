// Dancer Bowling (games/dancer-bowling.html) on a phone-sized screen: it starts, a drag launches your dancer up
// the hall, the throw ends and the next dancer comes up; ten throws end the game. Run: node tests/bowling-browser.js
const path = require('path');
const { chromium, devices } = require('playwright');
(async () => {
  let failures = 0;
  const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failures++; };
  const b = await chromium.launch(), ctx = await b.newContext({ ...devices['iPhone 13'] }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(__dirname, '..', 'games', 'dancer-bowling.html')); await p.waitForTimeout(400);
  check(await p.locator('#start').isVisible(), 'the title card shows how to play');
  check(await p.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), 'nothing scrolls on a phone');
  await p.tap('#play'); await p.waitForTimeout(200);
  check(await p.evaluate(() => phase === 'aim' && C.dancers.length === 12), 'the game starts with a line of twelve dancers as pins');
  const box = await p.locator('#lane').boundingBox(), x = box.x + box.width / 2, y = box.y + box.height * 0.6;
  await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + 8, y + 40, { steps: 4 }); await p.mouse.move(x, y + 80, { steps: 4 });
  check(/Gentle|Just right|Too hard/.test(await p.textContent('#hint')), 'while pulling back, the strength and spin are shown');
  await p.mouse.up();
  check(await p.evaluate(() => phase === 'roll' && ball.vy > 0), 'letting go sends your dancer up the hall');
  await p.waitForFunction(() => phase === 'aim' && throwNo === 2, null, { timeout: 15000 });
  check(true, 'the throw ends and the next dancer comes up');
  // A gentle, clockwise-spinning roll into a swinging dancer swings on through for points.
  const swung = await p.evaluate(() => {
    soundOn = false; danceT = 40; newBall(); phase = 'roll';
    const id = pinIds.find(id => pinMotion(id, danceT).w < -1), q = pinAt(id, danceT);
    Object.assign(ball, { x: q.x, y: q.y - 0.6, vx: 0, vy: 2.5, spin: -6 });
    const before = score; for (let i = 0; i < 120 && phase === 'roll'; i++) step(1 / 240);
    return score - before;
  });
  check(swung >= 100, `rolling into a swinging dancer with the same spin scores (${swung})`);
  const oof = await p.evaluate(() => {
    danceT = 40; newBall(); phase = 'roll';
    const id = pinIds[0], q = pinAt(id, danceT);
    Object.assign(ball, { x: q.x, y: q.y - 0.6, vx: 0, vy: 7, spin: 0 });
    const before = score + 1000; score += 1000; for (let i = 0; i < 60 && phase === 'roll'; i++) step(1 / 240);
    return score - before;
  });
  check(oof < 0, `crashing in too hard loses points (${oof})`);
  await p.evaluate(() => { throwNo = THROWS; endThrow('gutter'); });
  await p.waitForTimeout(1900);
  check(await p.locator('#end').isVisible(), 'after the tenth dancer, the final score shows');
  check(errs.length === 0, `no page errors ${errs.join(' | ')}`);
  await b.close();
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})();
