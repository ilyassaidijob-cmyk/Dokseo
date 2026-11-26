'use strict';
/* Dokseo: shared helpers, saving, and the game rules (XP, coins, streaks, quests, achievements, pets). */
const VERSION = '1.0.0';

/* ---------- small helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const pad2 = n => String(n).padStart(2, '0');
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function hexToRgb(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function rgbToHex(r, g, b) { return '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join(''); }
function shade(hex, amt) { const [r, g, b] = hexToRgb(hex); const f = v => amt < 0 ? v * (1 + amt) : v + (255 - v) * amt; return rgbToHex(f(r), f(g), f(b)); }
function mix(a, b, t) { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)); }
function hueOf(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx === mn) return 400 + mx; let h = mx === r ? (g - b) / (mx - mn) : mx === g ? 2 + (b - r) / (mx - mn) : 4 + (r - g) / (mx - mn);
  return (h * 60 + 360) % 360;
}
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function dayKey(d = new Date()) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function keyToDate(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function fmtDur(sec) { sec = Math.round(sec || 0); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60); return h ? `${h}h ${pad2(m)}m` : `${m} min`; }
function fmtClock(sec) { sec = Math.max(0, Math.floor(sec)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return (h ? h + ':' + pad2(m) : m) + ':' + pad2(s); }
function fmtDate(ts) { return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'value') el.value = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(3)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}
function mkCanvas(w, hh) { const c = document.createElement('canvas'); c.width = w; c.height = hh; return c; }
function b64ToBuf(b64) { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }

/* ---------- storage (IndexedDB, with an in-memory fallback) ---------- */
const DB = (() => {
  let db = null; const mem = { kv: new Map(), pdfs: new Map() };
  function open() {
    return new Promise(res => {
      try {
        const r = indexedDB.open('dokseo', 1);
        r.onupgradeneeded = () => { const d = r.result; for (const n of ['kv', 'pdfs']) if (!d.objectStoreNames.contains(n)) d.createObjectStore(n); };
        r.onsuccess = () => { db = r.result; res(true); };
        r.onerror = () => res(false); r.onblocked = () => res(false);
      } catch (e) { res(false); }
    });
  }
  function run(store, mode, fn) {
    return new Promise((res, rej) => {
      try {
        const t = db.transaction(store, mode), req = fn(t.objectStore(store));
        t.oncomplete = () => res(req && req.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
      } catch (e) { rej(e); }
    });
  }
  return {
    open,
    get: (s, k) => db ? run(s, 'readonly', st => st.get(k)) : Promise.resolve(mem[s].get(k)),
    put: (s, k, v) => db ? run(s, 'readwrite', st => st.put(v, k)) : (mem[s].set(k, v), Promise.resolve()),
    del: (s, k) => db ? run(s, 'readwrite', st => st.delete(k)) : (mem[s].delete(k), Promise.resolve()),
    clear: s => db ? run(s, 'readwrite', st => st.clear()) : (mem[s].clear(), Promise.resolve()),
    persistent: () => !!db
  };
})();

/* ---------- event bus ---------- */
const Bus = {
  m: {},
  on(e, f) { (this.m[e] ||= []).push(f); },
  emit(e, d) { for (const f of this.m[e] || []) { try { f(d); } catch (err) { console.error(err); } } }
};

/* ---------- game state ---------- */
const DEFAULT_SETTINGS = {
  music: 0.35, sfx: 0.6, ambientVol: 0.5, ambient: 'off', dailyGoal: 30, yearlyGoal: 12,
  readerTheme: 'day', brightness: 1, spread: true, flip: true, zoom: 1, sort: 'added', filter: 'all',
  showMini: true, miniCorner: 'br', reduceMotion: false, focusMin: 25, breakMin: 5
};
function newState() {
  return {
    v: 1, created: Date.now(), profile: null, tutorialDone: false, coins: 150, xp: 0, level: 1,
    books: [], shelves: [], quotes: [], days: {}, owned: {}, equip: {}, decor: {}, pet: null,
    quests: null, ach: {}, totalSec: 0, minAcc: 0,
    stats: { booksAdded: 0, shelvesBuilt: 0, highlights: 0, pagesTurned: 0, longest: 0 },
    settings: { ...DEFAULT_SETTINGS }, starterAdded: false
  };
}
let S = newState();
const Store = {
  _t: 0,
  async load() {
    await DB.open();
    let s = null; try { s = await DB.get('kv', 'save'); } catch (e) { console.warn(e); }
    S = s ? migrate(s) : newState();
    return S;
  },
  save() { clearTimeout(this._t); this._t = setTimeout(() => this.saveNow(), 500); },
  async saveNow() { clearTimeout(this._t); try { await DB.put('kv', 'save', JSON.parse(JSON.stringify(S))); } catch (e) { console.warn('save failed', e); } }
};
function migrate(s) {
  const d = newState();
  for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
  s.settings = { ...DEFAULT_SETTINGS, ...s.settings };
  s.stats = { ...d.stats, ...s.stats };
  return s;
}

/* ---------- levels & rewards ---------- */
const LEVELS = [null,
  { name: 'Reading Room', desc: 'Your cozy first room with 3 shelf spots.' },
  { name: 'Comfy Corner', desc: 'An armchair with a reading lamp, plus cherry and sage wood.' },
  { name: 'Fireplace Lounge', desc: 'A new room with a crackling fireplace and 3 more shelf spots.' },
  { name: 'Shelf Decorations', desc: 'Candles, succulents and more for your shelf tops, plus white wood.' },
  { name: 'Garden Nook', desc: 'A sunny room with a big window and 3 more shelf spots.' },
  { name: 'Candle Theme', desc: 'Read by warm candlelight (new reader theme).' },
  { name: 'Grand Hall', desc: 'A big hall with a chandelier and 4 more shelf spots.' },
  { name: 'Fancy Woods', desc: 'Rosewood and ebony shelves.' },
  { name: 'Gold Trim', desc: 'Golden shelves for your favorite books.' },
  { name: 'Starlight Room', desc: 'Read under the stars, with 4 more shelf spots.' }
];
const xpFor = L => 50 * L * (L - 1);
function levelFromXp(xp) { let L = 1; while (xpFor(L + 1) <= xp) L++; return L; }
function levelProgress() { const L = S.level, a = xpFor(L), b = xpFor(L + 1); return { L, cur: S.xp - a, need: b - a, pct: (S.xp - a) / (b - a) }; }
function addXP(n) {
  if (!n) return;
  S.xp += n; const L = levelFromXp(S.xp);
  if (L > S.level) { const from = S.level; S.level = L; Bus.emit('levelup', { from, to: L }); if (L >= 5) Ach.unlock('level5'); if (L >= 10) Ach.unlock('level10'); }
  Bus.emit('xp'); Store.save();
}
function addCoins(n, why) { if (!n) return; S.coins = Math.max(0, S.coins + n); Bus.emit('coins', { n, why }); Store.save(); }

/* ---------- days, streaks, reading log ---------- */
function today() { return S.days[dayKey()] ||= { sec: 0, pages: 0, v: 0 }; }
function streak() {
  let n = 0, d = new Date();
  if (!S.days[dayKey(d)]?.v) d = addDays(d, -1);
  while (S.days[dayKey(d)]?.v) { n++; d = addDays(d, -1); }
  return n;
}
function markVisit() {
  const d = today();
  if (d.v) return 0;
  d.v = 1;
  const st = streak();
  S.stats.longest = Math.max(S.stats.longest || 0, st);
  if (st >= 3) Ach.unlock('streak3'); if (st >= 7) Ach.unlock('streak7'); if (st >= 30) Ach.unlock('streak30');
  const bonus = Math.min(50, 5 * st);
  Store.save();
  return bonus;
}
const Reading = {
  // called once per second of active reading
  tick(book) {
    const d = today(); d.sec += 1; book.sec = (book.sec || 0) + 1; S.totalSec = (S.totalSec || 0) + 1;
    S.minAcc = (S.minAcc || 0) + 1;
    if (S.minAcc >= 60) {
      S.minAcc -= 60; addCoins(1); addXP(2); Pets.readMinute(); Quests.progress('read', 1);
      const hr = new Date().getHours();
      if (hr < 4) Ach.unlock('nightowl'); if (hr >= 4 && hr < 7) Ach.unlock('earlybird');
      if (d.sec >= 7200) Ach.unlock('marathon');
      if (S.totalSec >= 3600) Ach.unlock('hour1'); if (S.totalSec >= 36000) Ach.unlock('hour10'); if (S.totalSec >= 360000) Ach.unlock('hour100');
    }
    if (!d.goal && d.sec >= S.settings.dailyGoal * 60) { d.goal = 1; addCoins(15, 'Daily goal'); addXP(10); Bus.emit('dailygoal'); }
    Store.save();
  },
  pages(book, newMax) {
    const diff = newMax - (book.maxPage || 1);
    if (diff <= 0) return;
    book.maxPage = newMax; today().pages += diff; S.stats.pagesTurned += diff; Quests.progress('pages', diff); Store.save();
  }
};

/* ---------- books ---------- */
function bookStatus(b) { return b.finished ? 'finished' : (b.sec > 60 || (b.maxPage || 1) > 1) ? 'reading' : 'new'; }
function bookPct(b) { if (b.finished) return 1; return b.pages ? clamp((b.page || 1) / b.pages, 0, 1) : 0; }
function shelfById(id) { return S.shelves.find(s => s.id === id); }
function shelfBooks(shelfId) {
  const list = S.books.filter(b => b.shelf === shelfId);
  const mode = S.settings.sort;
  const cmp = {
    added: (a, b) => a.added - b.added,
    title: (a, b) => a.title.localeCompare(b.title),
    progress: (a, b) => bookPct(b) - bookPct(a),
    color: (a, b) => hueOf(a.color) - hueOf(b.color),
    recent: (a, b) => (b.lastOpened || 0) - (a.lastOpened || 0)
  }[mode] || ((a, b) => a.added - b.added);
  return list.sort(cmp);
}
const SHELF_CAP = 24;
function finishedCount() { return S.books.filter(b => b.finished).length; }

/* ---------- quests ---------- */
const QUEST_POOL = [
  { id: 'read10', text: 'Read for 10 minutes', kind: 'read', goal: 10, reward: 15 },
  { id: 'read20', text: 'Read for 20 minutes', kind: 'read', goal: 20, reward: 25 },
  { id: 'read30', text: 'Read for 30 minutes', kind: 'read', goal: 30, reward: 35 },
  { id: 'pages10', text: 'Turn 10 pages', kind: 'pages', goal: 10, reward: 15 },
  { id: 'pages25', text: 'Turn 25 pages', kind: 'pages', goal: 25, reward: 25 },
  { id: 'quote1', text: 'Save a quote', kind: 'quote', goal: 1, reward: 15 },
  { id: 'hl3', text: 'Highlight 3 passages', kind: 'highlight', goal: 3, reward: 15 },
  { id: 'pet', text: 'Pet your cat', kind: 'pet', goal: 1, reward: 10, cat: true },
  { id: 'add1', text: 'Add a book to a shelf', kind: 'add', goal: 1, reward: 15 },
  { id: 'bookmark', text: 'Bookmark a page', kind: 'bookmark', goal: 1, reward: 10 }
];
const Quests = {
  def(id) { return QUEST_POOL.find(q => q.id === id); },
  ensure() {
    const k = dayKey();
    if (S.quests && S.quests.day === k) return;
    const pool = QUEST_POOL.filter(q => !q.cat || S.pet);
    const reads = pool.filter(q => q.kind === 'read'), others = pool.filter(q => q.kind !== 'read');
    const list = [pick(reads)];
    while (list.length < 3 && others.length) list.push(others.splice(Math.floor(Math.random() * others.length), 1)[0]);
    S.quests = { day: k, list: list.map(q => ({ id: q.id, prog: 0, done: false, claimed: false })) };
    Store.save();
  },
  progress(kind, n = 1) {
    this.ensure(); let changed = false;
    for (const q of S.quests.list) {
      const d = this.def(q.id); if (!d || d.kind !== kind || q.done) continue;
      q.prog = Math.min(d.goal, q.prog + n); changed = true;
      if (q.prog >= d.goal) { q.done = true; Bus.emit('questdone', d); }
    }
    if (changed) { Bus.emit('quests'); Store.save(); }
  },
  claim(i) {
    const q = S.quests.list[i]; if (!q || !q.done || q.claimed) return;
    q.claimed = true; addCoins(this.def(q.id).reward, 'Quest'); addXP(5); Bus.emit('quests');
  },
  unclaimed() { this.ensure(); return S.quests.list.filter(q => q.done && !q.claimed).length; }
};

/* ---------- achievements ---------- */
const ACH = [
  { id: 'firstbook', name: 'First Book', desc: 'Add your first book', icon: '📖', coins: 20 },
  { id: 'builder', name: 'Shelf Builder', desc: 'Build a new shelf', icon: '🪵', coins: 30 },
  { id: 'finish1', name: 'The End', desc: 'Finish a book', icon: '🏁', coins: 50 },
  { id: 'finish5', name: 'Bookworm', desc: 'Finish 5 books', icon: '🐛', coins: 100 },
  { id: 'finish10', name: 'Library Legend', desc: 'Finish 10 books', icon: '👑', coins: 200 },
  { id: 'streak3', name: 'Warming Up', desc: 'Visit 3 days in a row', icon: '🔥', coins: 30 },
  { id: 'streak7', name: 'Purple Reader', desc: 'Visit 7 days in a row', icon: '💜', coins: 70 },
  { id: 'streak30', name: 'Unstoppable', desc: 'Visit 30 days in a row', icon: '🌟', coins: 300 },
  { id: 'hour1', name: 'First Hour', desc: 'Read for 1 hour in total', icon: '⏳', coins: 30 },
  { id: 'hour10', name: 'Ten Hours', desc: 'Read for 10 hours in total', icon: '⌛', coins: 100 },
  { id: 'hour100', name: 'Hundred Hours', desc: 'Read for 100 hours in total', icon: '🏆', coins: 500 },
  { id: 'nightowl', name: 'Night Owl', desc: 'Read after midnight', icon: '🦉', coins: 50 },
  { id: 'earlybird', name: 'Early Bird', desc: 'Read before 7 am', icon: '🌅', coins: 50 },
  { id: 'marathon', name: 'Marathon', desc: 'Read 2 hours in one day', icon: '🏃', coins: 100 },
  { id: 'quotes10', name: 'Quote Collector', desc: 'Save 10 quotes', icon: '❝', coins: 50 },
  { id: 'hl25', name: 'Highlighter Pro', desc: 'Make 25 highlights', icon: '🖍️', coins: 50 },
  { id: 'catparent', name: 'Cat Parent', desc: 'Adopt a cat', icon: '🐱', coins: 20 },
  { id: 'fashion', name: 'Fashionista', desc: 'Own 5 shop items', icon: '👗', coins: 50 },
  { id: 'level5', name: 'Growing Library', desc: 'Reach level 5', icon: '🏠', coins: 100 },
  { id: 'level10', name: 'Starlight', desc: 'Reach level 10', icon: '✨', coins: 300 }
];
const Ach = {
  unlock(id) {
    if (S.ach[id]) return; const a = ACH.find(x => x.id === id); if (!a) return;
    S.ach[id] = Date.now(); addCoins(a.coins, 'Achievement'); Bus.emit('ach', a); Store.save();
  },
  checkBooks() {
    const f = finishedCount();
    if (S.stats.booksAdded >= 1) this.unlock('firstbook');
    if (f >= 1) this.unlock('finish1'); if (f >= 5) this.unlock('finish5'); if (f >= 10) this.unlock('finish10');
    if (S.quotes.length >= 10) this.unlock('quotes10');
    if ((S.stats.highlights || 0) >= 25) this.unlock('hl25');
    if (Object.keys(S.owned).filter(k => !k.startsWith('mystery')).length >= 5) this.unlock('fashion');
  }
};

/* ---------- pets ---------- */
const Pets = {
  decay() {
    if (!S.pet) return; const now = Date.now(); const mins = (now - (S.pet.t || now)) / 60000; S.pet.t = now;
    S.pet.hunger = clamp(S.pet.hunger - mins / 18, 0, 100);
  },
  readMinute() {
    if (!S.pet) return; S.pet.readMin = (S.pet.readMin || 0) + 1;
    if (S.pet.readMin % 10 === 0) { S.pet.bowl = Math.min(3, (S.pet.bowl || 0) + 1); Bus.emit('treat'); }
  },
  eat() {
    if (!S.pet || !S.pet.bowl) return false;
    S.pet.bowl--; S.pet.hunger = Math.min(100, S.pet.hunger + 30); S.pet.fed = (S.pet.fed || 0) + 1;
    if (S.pet.fed === 20) Bus.emit('catgrown');
    Bus.emit('fed'); Store.save(); return true;
  },
  mood() { const hg = S.pet ? S.pet.hunger : 0; return hg > 60 ? 'happy' : hg > 30 ? 'ok' : 'hungry'; },
  grown() { return (S.pet?.fed || 0) >= 20; }
};
