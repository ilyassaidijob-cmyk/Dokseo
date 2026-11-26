'use strict';
/* Dokseo: start-up. */
async function ensureStarter() {
  if (S.starterAdded) return;
  if (!S.shelves.length) S.shelves.push({ id: uid(), slot: 0, name: 'My Books', wood: 'oak', top: 'plant' });
  let buf = null;
  try {
    if (window.DOKSEO_STARTER_B64) buf = b64ToBuf(window.DOKSEO_STARTER_B64);
    else { const r = await fetch('starter/welcome.pdf'); if (r.ok) buf = await r.arrayBuffer(); }
  } catch (e) { console.warn('starter book', e); }
  if (buf) {
    await DB.put('pdfs', 'welcome', buf);
    S.books.push({ id: 'welcome', title: 'Welcome to Dokseo', author: 'Dubu the shop cat', pages: 8, color: '#c88f99', h: 15, shelf: S.shelves[0].id, added: Date.now(), page: 1, maxPage: 1, sec: 0, highlights: [], bookmarks: [], want: false });
  }
  S.starterAdded = true;
  await Store.saveNow();
}
(async function boot() {
  await Store.load();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* not supported */ }
  Pets.decay(); Quests.ensure();
  await ensureStarter();
  World.init(); World.start(); UI.init();
  $('#hud-coin-ic').src = iconURL('coin', 2);
  UI.show('menu');
  const wake = () => { if (Sound.init() && S.settings.music > 0 && !Reader.isOpen) Sound.startMusic(); };
  addEventListener('pointerdown', wake, { once: true }); addEventListener('keydown', wake, { once: true });
  setInterval(() => { Pets.decay(); Store.save(); }, 60000);
  addEventListener('beforeunload', () => { Store.saveNow(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { Store.saveNow(); Sound.stopMusic(); }
    else { Pets.decay(); if (Sound.ready && S.settings.music > 0 && !Reader.isOpen) Sound.startMusic(); }
  });
  if (!DB.persistent()) UI.toast('Saving is not available in this browser window, so progress will reset when you close it.');
})();
