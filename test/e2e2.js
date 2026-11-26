// Second walk-through: menus, shelves, search, finishing a book, pets. Usage: node test/e2e2.js <outdir>
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.argv[2] || '.';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  const shot = async n => { await p.screenshot({ path: path.join(OUT, n + '.png') }); console.log('shot', n); };
  const wait = ms => p.waitForTimeout(ms);
  const hold = async (key, ms) => { await p.keyboard.down(key); await wait(ms); await p.keyboard.up(key); };
  const btn = name => p.getByRole('button', { name, exact: true });
  await p.goto('http://localhost:8765/index.html'); await wait(1000);
  await p.click('#m-start'); await p.fill('#cr-name', 'Jun'); await btn('Boy').click(); await btn('Round').click(); await btn("Let's read!").click(); await wait(600);
  await p.getByRole('button', { name: 'Skip tutorial' }).click(); await wait(300);
  // hover the welcome book
  const bookPos = await p.evaluate(() => { const b = S.books[0]; return { x: 40 - 24 + 2, y: 28 + 7 + 19 - 8 }; });
  const sc = await p.evaluate(() => { const c = document.querySelector('#world'); return c.getBoundingClientRect().width / c.width; });
  const camY = await p.evaluate(() => Math.min(0, 236 - document.querySelector('#world').height));
  const toScreen = (x, y) => ({ x: x * sc, y: (y - camY) * sc });
  let sp = toScreen(bookPos.x + 1, bookPos.y);
  await p.mouse.move(sp.x, sp.y); await wait(500);
  await shot('u01-hover');
  await p.mouse.click(sp.x, sp.y, { button: 'right' }); await wait(300);
  await shot('u02-context');
  await p.locator('#ctxmenu button', { hasText: 'Details' }).click(); await wait(300);
  await shot('u03-details');
  await btn('Close').click(); await wait(200);
  // edit shelf via plaque
  await p.locator('.wlabel.plaque').first().click(); await wait(400);
  await p.locator('.modal input[type=text]').fill('Korean Novels');
  await p.locator('.sw.wood').nth(3).click(); await btn('Cactus · Lv 4').click().catch(() => {});
  await wait(200); await shot('u04-shelfedit');
  await btn('Save').click(); await wait(300);
  // build a new shelf
  await p.locator('.wlabel.empty').first().click(); await wait(1500);
  await shot('u05-build');
  await p.locator('.modal .chip.sm', { hasText: 'Fantasy' }).click(); await btn('Build shelf').click(); await wait(500);
  // quests and view popovers
  await p.click('#hud-quests'); await wait(300); await shot('u06-quests');
  await p.click('#hud-view'); await wait(300); await shot('u07-view');
  await btn('Pick a book for me').click(); await wait(2500); await shot('u08-wheel');
  await p.keyboard.press('Escape'); await wait(300);
  // add the long book onto the want-to-read pile
  await p.setInputFiles('#file-input', path.join(__dirname, 'long-test-book.pdf')); await wait(1500);
  await p.locator('.addrow input[type=checkbox]').check();
  await btn('Put on the shelf').click(); await wait(5000);
  await shot('u09-pile');
  await p.locator('.wlabel', { hasText: 'Want to read' }).click(); await wait(2500);
  await shot('u10-pilemodal');
  await p.locator('.wrow .btn', { hasText: 'Read' }).first().click(); await wait(5500);
  await shot('u11-longbook');
  await btn('Search').click(); await p.fill('.rd-panel input[type=search]', 'moonberry'); await p.keyboard.press('Enter'); await wait(2500);
  await shot('u12-search');
  await p.locator('.pitem').first().click(); await wait(1800);
  await shot('u13-jump');
  await btn('Contents').click(); await wait(400); await shot('u14-toc');
  await p.keyboard.press('b'); await wait(300);
  await btn('Notes').click(); await wait(300); await p.locator('.ptabs button', { hasText: 'Bookmarks' }).click(); await wait(300);
  await shot('u15-bookmark');
  await p.keyboard.press('Escape'); await wait(200);
  await btn('Focus').click(); await wait(400);
  await btn('Sounds').click(); await wait(300); await p.locator('.rd-panel .ptabs button', { hasText: 'Rain' }).click(); await wait(400);
  await shot('u16-focus-sounds');
  await p.keyboard.press('Escape'); await wait(200);
  await p.evaluate(() => { const b = Reader.book; b.sec = 4000; });
  await btn('✓ Finished').click(); await wait(400);
  await p.locator('.stars button').nth(4).click(); await p.locator('.moods button').nth(0).click(); await p.locator('.modal textarea').fill('Loved the cozy rain scenes.');
  await shot('u17-finish');
  await btn('Finish book').click(); await wait(1200);
  await shot('u18-finished');
  await p.keyboard.press('Escape'); await wait(2500);
  await shot('u19-back');
  await btn('Yay!').click().catch(() => {}); await wait(600);
  // settings
  await p.click('#hud-menu'); await wait(300); await shot('u20-pause');
  await btn('Settings').click(); await wait(400); await shot('u21-settings');
  await p.keyboard.press('Escape'); await wait(400);
  // pets + owl + mystery
  await p.evaluate(() => { S.coins = 5000; S.owned.cat = true; S.pet = { name: 'Bori', fur: 'calico', hunger: 40, bowl: 2, fed: 0, t: Date.now(), acc: { hat: true }, readMin: 0 }; S.owned.owl = true; S.decor.owl = 'on'; Store.save(); });
  await wait(7000); await shot('u22-cat-eats');
  await p.click('#hud-shop'); await wait(400);
  await p.locator('.card', { hasText: 'Mystery box' }).locator('.act button').click(); await wait(1800);
  await shot('u23-mystery');
  await btn('Yay!').click(); await wait(200);
  await p.getByRole('button', { name: '← Back to the library' }).click(); await wait(500);
  await p.evaluate(() => addXP(120)); await wait(900); await shot('u24-owl');
  await wait(1500); await shot('u25-letter');
  await btn('Yay!').click().catch(() => {}); await wait(800);
  await p.setViewportSize({ width: 1024, height: 640 }); await wait(800); await shot('u26-small');
  console.log('ERRORS:\n' + errs.join('\n'));
  await browser.close();
})();
