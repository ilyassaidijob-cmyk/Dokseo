// End-to-end walk through the app with screenshots. Usage: node test/e2e.js <outdir> [part]
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.argv[2] || '.';
const PART = process.argv[3] || 'all';
const URL = 'http://localhost:8765/index.html';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  const shot = async n => { await p.screenshot({ path: path.join(OUT, n + '.png') }); console.log('shot', n); };
  const wait = ms => p.waitForTimeout(ms);
  const hold = async (key, ms) => { await p.keyboard.down(key); await wait(ms); await p.keyboard.up(key); };
  await p.goto(URL); await wait(1200);
  await shot('t01-menu');
  await p.click('#m-start'); await wait(500);
  await p.fill('#cr-name', 'Mina');
  await p.getByRole('button', { name: 'Buns' }).click();
  await shot('t02-creator');
  await p.getByRole('button', { name: "Let's read!" }).click(); await wait(800);
  await shot('t03-game');
  await hold('ArrowRight', 500); await wait(300);
  await hold('ArrowLeft', 2600); await wait(200);
  await hold('ArrowUp', 700); await wait(700);
  await shot('t04-shelf');
  await p.keyboard.press('e'); await wait(700);
  await shot('t05-entering');
  await wait(3200);
  await shot('t06-reader');
  await p.keyboard.press('ArrowRight'); await wait(280);
  await shot('t07-flip');
  await wait(900);
  await p.keyboard.press('ArrowRight'); await wait(1200);
  // select some text on the right page
  const spans = await p.$$('#rd-p1 .textLayer span');
  console.log('spans on right page', spans.length);
  if (spans.length > 6) {
    const a = await spans[2].boundingBox(), b = await spans[5].boundingBox();
    await p.mouse.move(a.x + 2, a.y + a.height / 2); await p.mouse.down(); await p.mouse.move(b.x + b.width - 2, b.y + b.height / 2, { steps: 8 }); await p.mouse.up(); await wait(400);
    await shot('t08-selection');
    await p.getByRole('button', { name: '❝ Save quote' }).click(); await wait(700);
  }
  await shot('t09-quote');
  await p.getByRole('button', { name: 'Style' }).click(); await wait(300);
  await p.locator('.theme.th-night').click(); await wait(900);
  await shot('t10-night');
  await p.locator('.theme.th-day').click(); await wait(300);
  await p.keyboard.press('Escape'); await wait(300);
  await p.keyboard.press('Escape'); await wait(1500);
  await shot('t11-back');
  // add a book
  await p.setInputFiles('#file-input', path.join(__dirname, 'long-test-book.pdf')); await wait(1500);
  await shot('t12-add');
  await p.getByRole('button', { name: 'Put on the shelf' }).click(); await wait(4500);
  await shot('t13-placed');
  // shop
  await p.evaluate(() => { S.coins = 9000; UI.refreshHUD(); });
  await p.click('#hud-shop'); await wait(600);
  await shot('t14-shop');
  const buyNamed = async (name) => { const card = p.locator('.card', { hasText: name }).first(); await card.locator('.act button').click(); await wait(250); };
  for (const n of ['Purple lightstick', 'Lavender bucket hat', 'Purple fairy lights', '7 idol-style posters', 'Convenience store corner', 'Cherry blossom tree', 'Moving portraits', 'Floating candles', 'Red & white banner', 'Football', 'Ultras drum']) await buyNamed(n);
  await buyNamed('Kitten'); await wait(300);
  await p.locator('.modal input[type=text]').fill('Mochi'); await p.getByRole('button', { name: 'Adopt' }).click(); await wait(400);
  await buyNamed('Bow for your cat');
  await shot('t15-shop-bought');
  await p.getByRole('button', { name: '← Back to the library' }).click(); await wait(1500);
  await hold('ArrowDown', 700); await wait(1200);
  await shot('t16-decorated');
  // stats with sample history
  await p.evaluate(() => { for (let i = 1; i < 200; i++) { if (Math.random() < 0.55) { const k = dayKey(addDays(new Date(), -i)); S.days[k] = { sec: Math.floor(Math.random() * 5400), pages: Math.floor(Math.random() * 40), v: 1 }; } } S.totalSec += 50000; });
  await p.click('#hud-stats'); await wait(700);
  await shot('t17-stats');
  await p.getByRole('button', { name: 'Quote Journal' }).click(); await wait(300);
  await shot('t18-quotes');
  await p.keyboard.press('Escape'); await wait(400);
  // level up to 3: unlock fireplace lounge
  await p.evaluate(() => addXP(320)); await wait(800);
  await shot('t19-levelup');
  await p.getByRole('button', { name: 'Yay!' }).click(); await wait(3200);
  await shot('t20-unlocked');
  await hold('ArrowRight', 3200); await wait(600);
  await shot('t21-lounge');
  console.log('ERRORS:\n' + errs.join('\n'));
  await browser.close();
})();
