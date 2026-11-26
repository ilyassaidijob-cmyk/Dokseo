'use strict';
/* Dokseo: the library you walk around in. Rooms, shelves, books, your character, pets and little animations. */
const GLOWS = [];
function glow(x, y, r, rgb, a) { GLOWS.push([x, y, r, rgb, a]); }

const World = (() => {
  const WH = 236, WALL = 100, WW = 2000, TOPPAD = 72;
  const SW = 56, SHH = 78, SBOT = WALL + 6, STOP = SBOT - SHH;
  const ROWTOP = [STOP + 7, STOP + 30, STOP + 53], ROWH = 19, NUMCOL = 8;
  const FLOOR_MIN = SBOT + 4, FLOOR_MAX = WH - 4;
  const SECTIONS = [
    { x: 0, w: 400, lv: 1, name: 'Reading Room', wall: '#ecdfd7', pat: '#e4d3c7', wains: '#e0cfc2', floor: '#d4bcab' },
    { x: 400, w: 400, lv: 3, name: 'Fireplace Lounge', wall: '#f0e0d2', pat: '#e8d2bf', wains: '#dcc4b0', floor: '#d6b8a2' },
    { x: 800, w: 400, lv: 5, name: 'Garden Nook', wall: '#e5e7d8', pat: '#d8dac6', wains: '#cfd3bc', floor: '#d2c0a8' },
    { x: 1200, w: 400, lv: 7, name: 'Grand Hall', wall: '#ecdde2', pat: '#e0ccd3', wains: '#d6bec7', floor: '#c9ad9c' },
    { x: 1600, w: 400, lv: 10, name: 'Starlight Room', wall: '#dfdeea', pat: '#d0cee2', wains: '#c4c1d8', floor: '#bfb3bd' }
  ];
  const SLOTS = [40, 102, 164, 440, 502, 712, 884, 1062, 1124, 1240, 1302, 1498, 1560, 1640, 1702, 1858, 1920].map((x, i) => ({ i, x, s: Math.floor(x / 400) }));
  const WALL_SPOTS = [224, 372, 648, 770, 830, 1176, 1358, 1442, 1754, 1974].map((x, i) => ({ id: 'W' + i, x, s: Math.floor(x / 400) }));
  const FLOOR_SPOTS = [[150, 226, 'S'], [318, 234, 'L'], [440, 226, 'S'], [680, 226, 'L'], [780, 226, 'S'], [840, 226, 'S'], [972, 170, 'L'], [1100, 226, 'L'], [1180, 226, 'S'], [1230, 226, 'S'], [1400, 184, 'L'], [1570, 226, 'S'], [1630, 226, 'S'], [1880, 226, 'L'], [1975, 226, 'S']]
    .map(([x, y, size], i) => ({ id: 'F' + i, x, y, size, s: Math.floor(x / 400) }));
  const SHOP = { x: 56, y: 186 }, BOWL = { x: 190, y: 218 }, BED = { x: 216, y: 214 }, TABLE = { x: 251, y: 150, w: 96, h: 22 };
  const WINDOWS = [
    { kind: 'rect', x: 260, y: 20, w: 78, h: 42, s: 0 },
    { kind: 'arch', x: 926, y: 16, w: 92, h: 58, s: 2 },
    { kind: 'round', cx: 1800, cy: 44, r: 24, s: 4 }
  ];

  let cv, ctx, W = 400, H = 236, scale = 3, camX = 0, camY = 0, active = false, running = false;
  let bg = null, last = 0, T = 0, mouse = null, hoverBook = null, cut = null, focus = null, lastSection = -1;
  const keys = {}, hold = { l: false, r: false, u: false, d: false };
  const anim = new Map();          // per-book drawn position and pull-out amount
  const particles = [];
  const pl = { x: 200, y: 132, dir: 0, flip: false, walkT: 0, moving: false, row: 1, path: null, onArrive: null, carry: null, hide: false, scale: 1, hop: 0, hopV: 0, stepT: 0, dance: 0 };
  const cat = { x: 230, y: 200, state: 'sit', t: 0, tx: null, ty: null, flip: false, frame: 0, bubble: 0, think: 2, petT: 0 };
  const ball = { x: 320, y: 206, vx: 0, vy: 0, spin: 0 };
  const owl = { fly: null };
  let drumHit = 0, unlockQueue = [], placeQueue = [], envCache = { t: -99 };
  let els = {};

  /* ---------- helpers ---------- */
  const unlocked = i => SECTIONS[i].lv <= S.level;
  const lastUnlocked = () => { let k = 0; while (k + 1 < SECTIONS.length && unlocked(k + 1)) k++; return k; };
  const maxX = () => { const k = lastUnlocked(); return k + 1 < SECTIONS.length ? SECTIONS[k + 1].x - 10 : WW - 10; };
  const shelfAtSlot = i => S.shelves.find(s => s.slot === i);
  const slotOf = sh => SLOTS[sh.slot];
  const sectionAt = x => clamp(Math.floor(x / 400), 0, SECTIONS.length - 1);
  function blockers() {
    const list = [
      { x: TABLE.x - 4, y: TABLE.y - 4, w: TABLE.w + 8, h: TABLE.h + 12 },
      { x: 10, y: 188, w: 92, h: 48 },
    ];
    if (S.level >= 2) list.push({ x: 366, y: 152, w: 32, h: 24 });
    if (unlocked(1)) list.push({ x: 562, y: 156, w: 36, h: 24 });
    if (unlocked(4)) list.push({ x: 1786, y: 150, w: 28, h: 22 });
    for (const [id, spot] of Object.entries(S.decor)) {
      const it = itemById(id), fs = FLOOR_SPOTS.find(f => f.id === spot); if (!it || !fs) continue;
      const hw = it.size === 'L' ? 30 : 11; list.push({ x: fs.x - hw, y: fs.y - 12, w: hw * 2, h: 14 });
    }
    return list;
  }
  let BLOCK = [];
  function isBlocked(x, y) { if (x < 10 || x > maxX() || y < FLOOR_MIN || y > FLOOR_MAX) return true; for (const r of BLOCK) if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) return true; return false; }

  /* ---------- pathfinding (A* on a small grid) ---------- */
  const GRID = 6;
  function findPath(sx, sy, tx, ty) {
    const gw = Math.ceil(WW / GRID), y0 = FLOOR_MIN, gh = Math.ceil((FLOOR_MAX - y0) / GRID) + 1;
    const cx = x => clamp(Math.round(x / GRID), 0, gw - 1), cy = y => clamp(Math.round((y - y0) / GRID), 0, gh - 1);
    const px = i => i * GRID, py = j => y0 + j * GRID;
    const free = (i, j) => !isBlocked(px(i), py(j));
    let [si, sj, ti, tj] = [cx(sx), cy(sy), cx(tx), cy(ty)];
    if (!free(ti, tj)) { // nearest free cell to the target
      let best = null, bd = 1e9;
      for (let r = 1; r < 12 && !best; r++) for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) { const i = ti + di, j = tj + dj; if (i < 0 || j < 0 || i >= gw || j >= gh || !free(i, j)) continue; const d = di * di + dj * dj; if (d < bd) { bd = d; best = [i, j]; } }
      if (!best) return null; [ti, tj] = best;
    }
    const N = gw * gh, gs = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const heap = []; const push = (f, n) => { heap.push([f, n]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], e = heap.pop(); if (heap.length) { heap[0] = e; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    const hfn = (i, j) => { const dx = Math.abs(i - ti), dy = Math.abs(j - tj); return dx + dy - 0.59 * Math.min(dx, dy); };
    const s = sj * gw + si, goal = tj * gw + ti; gs[s] = 0; push(hfn(si, sj), s);
    let found = false, iter = 0;
    while (heap.length && iter++ < 40000) {
      const [, n] = pop(); if (closed[n]) continue; closed[n] = 1; if (n === goal) { found = true; break; }
      const i = n % gw, j = (n / gw) | 0;
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        if (!di && !dj) continue; const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= gw || nj >= gh) continue;
        const m = nj * gw + ni; if (closed[m] || !free(ni, nj)) continue; if (di && dj && (!free(i + di, j) || !free(i, j + dj))) continue;
        const ng = gs[n] + (di && dj ? 1.41 : 1); if (ng < gs[m]) { gs[m] = ng; from[m] = n; push(ng + hfn(ni, nj), m); }
      }
    }
    if (!found) return null;
    const pts = []; for (let n = goal; n !== -1 && n !== s; n = from[n]) pts.push({ x: px(n % gw), y: py((n / gw) | 0) });
    pts.reverse();
    if (pts.length) { pts[pts.length - 1] = isBlocked(tx, ty) ? pts[pts.length - 1] : { x: tx, y: ty }; }
    // string pulling
    const out = []; let cur = { x: sx, y: sy }, k = 0;
    while (k < pts.length) { let far = k; for (let m = pts.length - 1; m > k; m--) if (los(cur, pts[m])) { far = m; break; } out.push(pts[far]); cur = pts[far]; k = far + 1; }
    return out;
  }
  function los(a, b) { const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.ceil(d / 3); for (let i = 1; i <= n; i++) { const t = i / n; if (isBlocked(lerp(a.x, b.x, t), lerp(a.y, b.y, t))) return false; } return true; }
  function walkTo(x, y, cb) {
    const path = findPath(pl.x, pl.y, x, y);
    if (!path) { if (cb) cb(); return; }
    pl.path = path; pl.onArrive = cb || null;
  }

  /* ---------- environment: time of day + weather ---------- */
  function env() {
    if (T - envCache.t < 5) return envCache;
    const now = new Date(), hr = now.getHours() + now.getMinutes() / 60, seed = hash(dayKey());
    const month = now.getMonth(), winter = month === 11 || month <= 1;
    let weather = 'clear'; const r = (seed % 100) / 100;
    if (S.decor.firstsnow) weather = 'snow'; else if (winter && r < 0.35) weather = 'snow'; else if (r < 0.25) weather = 'rain';
    const night = hr >= 20 || hr < 6, dusk = (hr >= 17 && hr < 20) || (hr >= 6 && hr < 8);
    const sky = hr >= 6 && hr < 9 ? ['#f3d6c2', '#fbeee2'] : hr >= 9 && hr < 17 ? ['#cfe3ec', '#eef6f8'] : hr >= 17 && hr < 20 ? ['#e8a890', '#f6d2b8'] : ['#2e3458', '#414c72'];
    envCache = { t: T, hr, night, dusk, weather, sky };
    return envCache;
  }

  /* ---------- static background ---------- */
  function buildBg() {
    bg = mkCanvas(WW, WH + TOPPAD); const g = bg.getContext('2d'); g.translate(0, TOPPAD);
    const r = (c, x, y, w, hh) => R(g, c, x, y, w, hh);
    r('#d9c6b8', 0, -TOPPAD, WW, TOPPAD); for (let x = 0; x < WW; x += 48) { r('#cdb8a8', x, -TOPPAD, 4, TOPPAD); r('#e3d2c5', x + 4, -TOPPAD, 1, TOPPAD); }
    for (const [i, sec] of SECTIONS.entries()) {
      const x0 = sec.x, x1 = sec.x + sec.w;
      r(sec.wall, x0, 0, sec.w, WALL); r('#d9c6b8', x0, 0, sec.w, 6); r('#c3a492', x0, 6, sec.w, 2);
      for (let x = x0; x < x1; x += 4) if ((x / 4) % 7 === 0) r(sec.pat, x, 8, 1, WALL - 30);
      if (i === 3) for (let x = x0 + 14; x < x1; x += 28) for (let y = 18; y < WALL - 30; y += 16) { r(sec.pat, x, y, 2, 2); r(sec.pat, x - 1, y + 1, 4, 1); }
      if (i === 4) for (let k = 0; k < 40; k++) r(sec.pat, x0 + (k * 97) % sec.w, 12 + (k * 53) % (WALL - 42), 1, 1);
      r(sec.wains, x0, WALL - 22, sec.w, 22); r('#c3a492', x0, WALL - 23, sec.w, 2); r('#f6efe9', x0, WALL - 21, sec.w, 1);
      for (let x = x0 + 8; x < x1 - 30; x += 40) { r(shade(sec.wains, -0.05), x, WALL - 17, 32, 12); r(shade(sec.wains, 0.25), x + 1, WALL - 16, 30, 1); }
      r('#b29580', x0, WALL - 2, sec.w, 2);
      r(sec.floor, x0, WALL, sec.w, WH - WALL);
      const ln = shade(sec.floor, -0.08), hl = shade(sec.floor, 0.14);
      for (let y = WALL + 8, k = 0; y < WH; y += 9, k++) { r(ln, x0, y, sec.w, 1); r(hl, x0, y + 1, sec.w, 1); for (let x = x0 + ((k * 37) % 70); x < x1; x += 70) r(ln, x, y - 8, 1, 8); }
      if (i > 0) { r('#b29580', x0 - 3, 0, 6, WALL); r('#c9ae98', x0 - 2, 0, 2, WALL); r(OL, x0 - 3, WALL - 2, 6, 2); }
    }
    // Reading Room: window, rug
    winFrame(g, 256, 16, 86, 50); r(OL, 253, 64, 92, 5); r('#e9ddd3', 254, 65, 90, 3);
    r(OL, 312, 54, 12, 10); r('#c9a46a', 313, 55, 10, 8); for (const [x, y] of [[311, 47], [316, 44], [320, 48], [314, 50], [322, 52]]) { r(OL, x - 1, y - 1, 6, 5); r('#a8a060', x, y, 4, 3); }
    r('#e3d3c6', 232, 130, 140, 64); r('#f6efe9', 234, 132, 136, 60); r('#ece2d8', 238, 136, 128, 52); for (let x = 240; x < 366; x += 8) { r('#e3d3c6', x, 131, 2, 1); r('#e3d3c6', x, 192, 2, 1); }
    // Fireplace Lounge
    if (unlocked(1)) {
      const fx = 545; r(OL, fx - 1, 38, 72, 69); r('#bfb2ae', fx, 39, 70, 67);
      for (let y = 42; y < 104; y += 6) for (let x = fx + ((y / 6) % 2) * 5; x < fx + 66; x += 10) r('#aa9d99', x, y, 9, 1);
      r(OL, fx + 13, 62, 44, 44); r('#3a2a2e', fx + 14, 63, 42, 43); r('#2a1e22', fx + 14, 63, 42, 4);
      r(OL, fx - 5, 34, 80, 7); r('#9b7a67', fx - 4, 35, 78, 5); r('#b29580', fx - 4, 35, 78, 1);
      r(OL, fx + 6, 24, 10, 10); r('#c9a46a', fx + 7, 25, 8, 9); r(OL, fx + 52, 27, 12, 7); r('#7f97a8', fx + 53, 28, 10, 5); r('#e6a3b4', fx + 30, 28, 8, 6);
      r('#d9b8a6', 520, 150, 120, 50); r('#e6cbbb', 522, 152, 116, 46); for (let k = 0; k < 6; k++) r('#d0a896', 530 + k * 18, 160, 8, 30);
    }
    // Garden Nook
    if (unlocked(2)) {
      archFrame(g, 922, 12, 100, 66); r(OL, 918, 76, 108, 5); r('#e9ddd3', 919, 77, 106, 3);
      for (const [x, c] of [[930, '#a8b08a'], [948, '#8c9a6a'], [1000, '#a8b08a']]) { r(OL, x - 1, 66, 12, 10); r('#c98a7a', x, 67, 10, 9); r(OL, x - 3, 56, 16, 11); r(c, x - 2, 57, 14, 9); r(shade(c, 0.25), x, 58, 4, 2); }
      for (const x of [812, 1188]) { r(OL, x - 7, 92, 14, 14); r('#c98a7a', x - 6, 93, 12, 12); for (const [dx, dy] of [[-8, -18], [0, -26], [6, -16], [-4, -12], [4, -22]]) { r(OL, x + dx - 1, 92 + dy - 1, 8, 7); r('#8c9a6a', x + dx, 92 + dy, 6, 5); } }
    }
    // Grand Hall
    if (unlocked(3)) {
      r('#b98a8f', 1300, 140, 200, 70); r('#cfa3a7', 1303, 143, 194, 64); r('#b98a8f', 1310, 150, 180, 50); r('#d9b5b8', 1313, 153, 174, 44); for (let k = 0; k < 9; k++) r('#c9a46a', 1320 + k * 20, 175, 4, 4);
      r(OL, 1385, 18, 30, 89); r('#7e5f4e', 1386, 19, 28, 87); r('#957461', 1387, 20, 2, 85); r(OL, 1390, 24, 20, 20); r(CREAM, 1391, 25, 18, 18); r('#c9a46a', 1399, 27, 2, 8); r('#c9a46a', 1399, 33, 7, 2); r(OL, 1390, 52, 20, 40); r('#523b30', 1391, 53, 18, 38);
    }
    // Starlight Room
    if (unlocked(4)) {
      roundFrame(g, 1800, 44, 24); r(OL, 1770, 70, 60, 5); r('#d2d0e2', 1771, 71, 58, 3);
      r('#8a7aa8', 1730, 140, 140, 60); r('#9e8fbb', 1733, 143, 134, 54); for (let k = 0; k < 14; k++) r('#f2d36b', 1740 + (k * 37) % 120, 150 + (k * 23) % 44, 1, 1);
    }
    // clear the glass so the live sky shows through
    g.save(); g.globalCompositeOperation = 'destination-out';
    for (const w of WINDOWS) {
      if (!unlocked(w.s)) continue;
      if (w.kind === 'rect') { g.fillRect(w.x, w.y, 37, w.h); g.fillRect(w.x + 41, w.y, 37, w.h); }
      else if (w.kind === 'arch') { archPath(g, w.x, w.y, w.w, w.h); g.fill(); }
      else { g.beginPath(); g.arc(w.cx, w.cy, w.r, 0, Math.PI * 2); g.fill(); }
    }
    g.restore();
    if (unlocked(2)) { r('#b29580', 970, 18, 4, 56); r('#b29580', 928, 44, 88, 3); }
    if (unlocked(4)) { r('#b29580', 1799, 20, 2, 48); r('#b29580', 1776, 43, 48, 2); }
    // locked rooms
    const k = lastUnlocked();
    if (k + 1 < SECTIONS.length) {
      const sec = SECTIONS[k + 1], x = sec.x;
      r('#d6c7bb', x, -TOPPAD, WW - x, WH + TOPPAD);
      for (let y = -TOPPAD; y < WH; y += 8) for (let xx = x + ((y / 8) % 2) * 8; xx < WW; xx += 16) r('#cdbdb0', xx, y, 8, 1);
      r(OL, x - 9, -TOPPAD, 18, WH + TOPPAD); r('#9b7a67', x - 8, -TOPPAD, 16, WH + TOPPAD); r('#b29580', x - 7, -TOPPAD, 2, WH + TOPPAD);
      for (let y = 4; y < WH; y += 24) r('#7e604f', x - 8, y, 16, 2);
      r(OL, x - 13, 112, 26, 80); r('#c88f99', x - 12, 113, 24, 78); for (let i = 0; i < 24; i += 4) r('#b47c87', x - 12 + i, 113, 1, 78); r('#d9a6ae', x - 12, 113, 24, 3);
      r(OL, x - 9, 140, 18, 14); r('#c9a46a', x - 8, 141, 16, 12); r(OL, x - 5, 134, 10, 7); r('#c9a46a', x - 4, 135, 8, 6); r('#f6efe9', x - 2, 137, 4, 3); r(OL, x - 1, 145, 2, 4);
    }
    BLOCK = blockers();
  }
  function winFrame(g, x, y, w, hh) { R(g, OL, x - 2, y - 4, w + 4, 5); R(g, '#b29580', x - 1, y - 3, w + 2, 3); R(g, OL, x, y, w, hh); R(g, '#9b7a67', x + 1, y + 1, w - 2, hh - 2); R(g, '#b29580', x + 4, y + 4, w - 8, hh - 8); R(g, '#9b7a67', x + 41, y + 4, 4, hh - 8); }
  function archPath(g, x, y, w, hh) { const r = w / 2; g.beginPath(); g.moveTo(x, y + hh); g.lineTo(x, y + r); g.arc(x + r, y + r, r, Math.PI, 0); g.lineTo(x + w, y + hh); g.closePath(); }
  function archFrame(g, x, y, w, hh) { g.fillStyle = OL; archPath(g, x - 3, y - 3, w + 6, hh + 6); g.fill(); g.fillStyle = '#9b7a67'; archPath(g, x - 2, y - 2, w + 4, hh + 4); g.fill(); g.fillStyle = '#b29580'; archPath(g, x, y, w, hh); g.fill(); }
  function roundFrame(g, cx, cy, r) { g.fillStyle = OL; g.beginPath(); g.arc(cx, cy, r + 5, 0, Math.PI * 2); g.fill(); g.fillStyle = '#9b8fb0'; g.beginPath(); g.arc(cx, cy, r + 4, 0, Math.PI * 2); g.fill(); g.fillStyle = '#b5abc8'; g.beginPath(); g.arc(cx, cy, r + 1, 0, Math.PI * 2); g.fill(); }

  /* ---------- live window views ---------- */
  const snow = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random() }));
  function drawSky(g, e) {
    for (const w of WINDOWS) {
      if (!unlocked(w.s)) continue;
      let x, y, ww, hh;
      if (w.kind === 'round') { x = w.cx - w.r; y = w.cy - w.r; ww = hh = w.r * 2; } else { x = w.x; y = w.y; ww = w.w; hh = w.h; }
      if (x + ww < camX || x > camX + W) continue;
      g.save(); g.beginPath(); if (w.kind === 'round') g.arc(w.cx, w.cy, w.r, 0, Math.PI * 2); else g.rect(x, y, ww, hh); g.clip();
      const starry = e.night || w.kind === 'round';
      R(g, starry && w.kind === 'round' && !e.night ? '#4a4a7a' : e.sky[0], x, y, ww, hh); R(g, starry && w.kind === 'round' && !e.night ? '#5d5f8e' : e.sky[1], x, y + hh * 0.55, ww, hh * 0.45);
      if (starry) { for (let i = 0; i < 18; i++) { const sx = x + ((i * 37) % ww), sy = y + ((i * 23) % (hh * 0.8)); if (Math.sin(T * 2 + i * 1.3) > -0.3) R(g, '#f6efe9', sx, sy, 1, 1); } const mx = Math.round(x + ww * 0.7), my = Math.round(y + 5); R(g, '#f6efe9', mx + 2, my, 4, 8); R(g, '#f6efe9', mx + 1, my + 1, 6, 6); R(g, '#f6efe9', mx, my + 2, 8, 4); const sk = e.night ? e.sky[0] : '#4a4a7a'; R(g, sk, mx + 3, my - 1, 4, 7); R(g, sk, mx + 4, my, 4, 6); }
      else { for (let i = 0; i < 3; i++) { const cx = x + ((T * 3 + i * 47) % (ww + 30)) - 15, cy = y + 6 + i * 9; R(g, '#ffffff', cx, cy, 14, 3); R(g, '#ffffff', cx + 3, cy - 2, 7, 2); } }
      if (e.weather === 'rain') { g.fillStyle = e.night ? '#7d8bb8' : '#9fb5cc'; for (let i = 0; i < 26; i++) { const sx = x + ((i * 53) % ww), sy = y + (((T * 90 + i * 31) % (hh + 10)) - 10); g.fillRect(Math.round(sx), Math.round(sy), 1, 4); } }
      if (e.weather === 'snow') { g.fillStyle = '#ffffff'; for (const f of snow) { const sx = x + ((f.x * ww + Math.sin(T + f.y * 9) * 3) % ww), sy = y + ((f.y * hh + T * 9 * f.s) % hh); g.fillRect(Math.round(sx), Math.round(sy), 1, 1); } R(g, '#f6f8fa', x, y + hh - 3, ww, 3); }
      g.restore();
    }
  }

  /* ---------- shelves and books ---------- */
  function drawShelf(g, slot, sh, t) {
    const w = WOODS[sh.wood] || WOODS.oak, L = slot.x - SW / 2, Tp = STOP;
    R(g, OL, L - 1, Tp - 1, SW + 2, SHH + 2); R(g, w.m, L, Tp, SW, SHH); R(g, w.l, L + 1, Tp, SW - 2, 2); R(g, w.d, L, Tp + SHH - 4, SW, 4);
    for (const ry of ROWTOP) { R(g, OL, L + 3, ry - 1, SW - 6, ROWH + 1); R(g, w.b, L + 4, ry, SW - 8, ROWH); R(g, shade(w.b, -0.12), L + 4, ry, SW - 8, 2); R(g, w.l, L + 3, ry + ROWH, SW - 6, 1); R(g, w.d, L + 3, ry + ROWH + 1, SW - 6, 1); }
    if (sh.wood === 'gold') { R(g, '#f2d36b', L, Tp, SW, 1); R(g, '#f2d36b', L + 1, Tp + 2, 1, SHH - 7); R(g, '#f2d36b', L + SW - 2, Tp + 2, 1, SHH - 7); }
    R(g, OL, L + 3, SBOT, 5, 3); R(g, OL, L + SW - 8, SBOT, 5, 3);
    g.globalAlpha = 0.16; R(g, OL, L, SBOT + 1, SW, 3); g.globalAlpha = 1;
    drawTopDeco(g, sh.top || 'none', slot.x, Tp, t);
  }
  function bookTarget(b) {
    const sh = shelfById(b.shelf); if (!sh) return null; const slot = slotOf(sh); if (!slot) return null;
    const idx = shelfBooks(sh.id).indexOf(b); const row = Math.floor(idx / NUMCOL), col = idx % NUMCOL;
    if (row > 2) return null;
    return { x: slot.x - 24 + col * 6, y: ROWTOP[row] + ROWH - b.h, row, col };
  }
  function bookAnim(b) { let a = anim.get(b.id); if (!a) { const t = bookTarget(b); a = { x: t ? t.x : 0, y: t ? t.y : 0, pull: 0 }; anim.set(b.id, a); } return a; }
  function passesFilter(b) {
    const f = S.settings.filter; if (f === 'all') return true;
    if (f === 'want') return !!b.want; return bookStatus(b) === f;
  }
  function drawBook(g, b, a, alpha) {
    const p = a.pull, big = p > 0.5, x = Math.round(a.x) - (big ? 1 : 0), y = Math.round(a.y) + Math.round(p * 3), w = big ? 7 : 5, hh = b.h;
    g.globalAlpha = alpha;
    R(g, OL, x, y, w, hh); R(g, b.color, x + 1, y + 1, w - 2, hh - 1); R(g, shade(b.color, 0.22), x + 1, y + 1, 1, hh - 1);
    const band = shade(b.color, 0.5); R(g, band, x + 1, y + 3, w - 2, 1); R(g, band, x + 1, y + hh - 3, w - 2, 1);
    if (b.finished) R(g, '#e8c25a', x + 1, y + 1, w - 2, 1);
    else if (bookStatus(b) === 'reading') R(g, '#d98e9a', x + w - 2, y + hh, 1, 3);
    if (b.want && !b.finished) R(g, '#9fb5cc', x + 1, y + 1, 1, 2);
    if (big) { R(g, OL, x, y - 2, w, 3); R(g, '#f6efe9', x + 1, y - 1, w - 2, 1); g.globalAlpha = alpha * 0.25; R(g, OL, x, y + hh, w, 2); }
    g.globalAlpha = 1;
  }
  function bookAt(x, y) {
    for (const b of S.books) { if (b.placing) continue; const a = anim.get(b.id); if (!a) continue; const lift = a.pull * 3; if (x >= a.x - 0.5 && x < a.x + 5.5 && y >= a.y - 2 && y <= a.y + b.h + 3 + lift) return b; }
    return null;
  }

  /* ---------- furniture and features ---------- */
  function drawTable(g, t) {
    const Tb = TABLE; g.globalAlpha = 0.16; R(g, OL, Tb.x + 2, Tb.y + Tb.h + 6, Tb.w - 4, 4); g.globalAlpha = 1;
    R(g, OL, Tb.x + 6, Tb.y + 14, 8, 14); R(g, '#8a6a58', Tb.x + 7, Tb.y + 14, 6, 13); R(g, OL, Tb.x + Tb.w - 14, Tb.y + 14, 8, 14); R(g, '#8a6a58', Tb.x + Tb.w - 13, Tb.y + 14, 6, 13);
    R(g, OL, Tb.x - 1, Tb.y - 1, Tb.w + 2, Tb.h - 3); R(g, '#b29580', Tb.x, Tb.y, Tb.w, Tb.h - 5); R(g, '#c3a492', Tb.x + 1, Tb.y, Tb.w - 2, 2); R(g, '#9b7a67', Tb.x, Tb.y + Tb.h - 9, Tb.w, 5); R(g, OL, Tb.x, Tb.y + Tb.h - 4, Tb.w, 1);
    for (let x = Tb.x + 30; x < Tb.x + 78; x += 4) R(g, '#f6efe9', x, Tb.y + 8, 2, 1);
    R(g, OL, Tb.x + 10, Tb.y - 3, 22, 12); R(g, CREAM, Tb.x + 11, Tb.y - 2, 10, 10); R(g, CREAM, Tb.x + 22, Tb.y - 2, 9, 10); R(g, '#d9c6b8', Tb.x + 21, Tb.y - 2, 1, 10);
    for (let i = 0; i < 3; i++) { R(g, '#c3a492', Tb.x + 13, Tb.y + i * 3, 6, 1); R(g, '#c3a492', Tb.x + 24, Tb.y + i * 3, 5, 1); }
    R(g, OL, Tb.x + 46, Tb.y, 10, 10); R(g, '#f6efe9', Tb.x + 47, Tb.y + 1, 8, 8); R(g, '#9b7a67', Tb.x + 47, Tb.y + 1, 8, 2); R(g, OL, Tb.x + 56, Tb.y + 3, 2, 4);
    for (let i = 0; i < 2; i++) { const k = (t * 0.5 + i / 2) % 1; g.globalAlpha = 0.5 * (1 - k); R(g, CREAM, Tb.x + 49 + i * 3 + Math.sin(t * 3 + i) * 1.2, Tb.y - 4 - k * 10, 1, 3); g.globalAlpha = 1; }
    R(g, OL, Tb.x + 62, Tb.y + 6, 13, 8); R(g, '#f6efe9', Tb.x + 63, Tb.y + 7, 11, 6); R(g, '#e6c7b8', Tb.x + 64, Tb.y + 9, 9, 3); R(g, '#d0575a', Tb.x + 67, Tb.y + 5, 3, 2);
    const want = S.books.filter(b => b.want && !b.finished).slice(0, 5);
    const pile = want.length ? want.map(b => b.color) : ['#e3d3c6'];
    pile.forEach((c, i) => { const y = Tb.y - 1 - i * 4, x = Tb.x + 78 + (i % 2); R(g, OL, x - 1, y - 1, 16, 5); R(g, c, x, y, 14, 3); R(g, shade(c, 0.45), x + 2, y + 1, 10, 1); });
  }
  function drawArmchair(g, x, y, faceLeft) {
    g.globalAlpha = 0.16; R(g, OL, x - 14, y + 1, 28, 3); g.globalAlpha = 1;
    R(g, OL, x - 13, y - 26, 26, 27); R(g, '#c88f99', x - 12, y - 25, 24, 18); R(g, '#d9a6ae', x - 10, y - 23, 20, 3);
    R(g, '#b47c87', x - 12, y - 9, 24, 6); R(g, '#e3b8bf', x - 10, y - 13, 20, 4);
    R(g, '#b47c87', faceLeft ? x + 7 : x - 12, y - 18, 5, 14); R(g, '#b47c87', faceLeft ? x - 12 : x + 7, y - 14, 5, 10);
    R(g, OL, x - 11, y - 3, 3, 4); R(g, OL, x + 8, y - 3, 3, 4);
  }
  function drawLamp(g, x, y, e) { R(g, OL, x - 1, y - 40, 2, 40); R(g, OL, x - 5, y - 2, 10, 2); R(g, OL, x - 8, y - 50, 16, 11); R(g, '#f2d9a0', x - 7, y - 49, 14, 9); R(g, '#f8e8c0', x - 5, y - 48, 4, 2); if (e.night || e.dusk) glow(x, y - 44, 32, '255,210,140', e.night ? 0.3 : 0.16); }
  function drawShop(g, t) {
    // awning and Dubu the shop cat behind the counter
    R(g, OL, 14, 150, 3, 44); R(g, OL, 95, 150, 3, 44);
    R(g, OL, 10, 142, 92, 12); for (let i = 0; i < 90; i += 10) R(g, (i / 10) % 2 ? CREAM : '#d98e9a', 11 + i, 143, Math.min(10, 90 - i), 9);
    for (let i = 0; i < 90; i += 10) { R(g, (i / 10) % 2 ? CREAM : '#d98e9a', 11 + i, 152, Math.min(10, 90 - i), 2); R(g, (i / 10) % 2 ? CREAM : '#d98e9a', 13 + i, 154, Math.min(6, 90 - i - 2), 1); }
    const near = focus && focus.type === 'shop';
    const spr = catSprite('cream', near ? 'happy' : 'sit', Math.floor(t * 1.5) % 2, true, { bow: true });
    g.drawImage(spr, 56 - 15, 196 - 26);
    R(g, OL, 14, 192, 84, 34); R(g, '#b29580', 15, 193, 82, 6); R(g, '#c3a492', 15, 193, 82, 2); R(g, '#9b7a67', 15, 199, 82, 26);
    for (let x = 19; x < 95; x += 12) R(g, '#8a6a58', x, 202, 8, 20);
    R(g, OL, 22, 185, 10, 8); R(g, '#e8f0f2', 23, 186, 8, 7); R(g, '#e8c25a', 24, 189, 6, 3);
    R(g, OL, 78, 186, 14, 7); R(g, '#9a7fa0', 79, 187, 12, 2); R(g, '#7f97a8', 80, 189, 11, 3);
    if (env().night) glow(56, 170, 34, '255,210,150', 0.2);
  }
  function drawFire(g, t) {
    const fx = 580, base = 104;
    for (let i = 0; i < 10; i++) { const fl = Math.sin(t * 9 + i * 1.9) * 3 + Math.sin(t * 5 + i) * 2, hgt = 10 + ((i * 7) % 9) + fl; R(g, '#e8885a', fx - 16 + i * 3.3, base - hgt, 3, hgt); R(g, '#f2b25a', fx - 15 + i * 3.3, base - hgt * 0.7, 2, hgt * 0.7); R(g, '#fbe39a', fx - 15 + i * 3.3, base - hgt * 0.35, 1, hgt * 0.35); }
    R(g, '#6e4a3a', fx - 16, base - 2, 32, 3); glow(fx, base - 12, 70, '255,150,80', 0.26 + Math.sin(t * 8) * 0.03);
  }
  function drawChandelier(g, t) {
    const cx = 1400; R(g, OL, cx - 1, 0, 2, 14); R(g, OL, cx - 22, 14, 44, 3); R(g, '#c9a46a', cx - 21, 15, 42, 1); R(g, OL, cx - 2, 12, 4, 8);
    for (let i = 0; i < 5; i++) { const x = cx - 20 + i * 10, fl = Math.sin(t * 10 + i) > 0 ? 1 : 0; R(g, CREAM, x, 9, 2, 5); R(g, '#f2a33a', x, 6 - fl, 2, 2 + fl); glow(x + 1, 7, 18, '255,210,140', 0.22); }
  }
  function drawClock(g, t) { const sw = Math.round(Math.sin(t * 3) * 5); R(g, '#c9a46a', 1399 + sw, 58, 2, 24); R(g, OL, 1397 + sw, 80, 6, 6); R(g, '#e8c25a', 1398 + sw, 81, 4, 4); const a = (t / 10) % (Math.PI * 2); R(g, OL, 1400 + Math.round(Math.cos(a) * 6), 34 + Math.round(Math.sin(a) * 6), 1, 1); }
  function drawTelescope(g, x, y) { g.globalAlpha = 0.16; R(g, OL, x - 10, y, 20, 3); g.globalAlpha = 1; R(g, OL, x - 8, y - 14, 2, 14); R(g, OL, x + 6, y - 14, 2, 14); R(g, OL, x - 1, y - 16, 2, 16); R(g, OL, x - 10, y - 30, 24, 9); R(g, '#c9a46a', x - 9, y - 29, 22, 7); R(g, '#e8cd96', x - 9, y - 29, 22, 2); R(g, OL, x + 12, y - 33, 6, 13); R(g, '#9b8fb0', x + 13, y - 32, 4, 11); }

  /* ---------- the player ---------- */
  function eqForDraw() { return S.equip || {}; }
  function sprites() { return charSprites(S.profile || defaultLook(), eqForDraw()); }
  function drawPlayer(g) {
    if (pl.hide || !S.profile) return;
    const sp = sprites(); let dir = pl.dir, flip = pl.flip, f = pl.moving ? Math.floor(pl.walkT * 7) % 4 : 0;
    if (pl.dance > 0) { const k = Math.floor(T * 4) % 4; dir = k % 2 ? 2 : 0; flip = k === 3; f = k % 2 ? 1 : 3; }
    const spr = (pl.carry ? sp.hold : sp.walk)[dir][f], px = Math.round(pl.x), py = Math.round(pl.y - pl.hop);
    g.globalAlpha = 0.2; R(g, OL, px - 6, Math.round(pl.y) - 1, 12, 2); g.globalAlpha = 1;
    g.save(); g.translate(px, py); if (dir === 2 && flip) g.scale(-1, 1); if (pl.scale !== 1) g.scale(pl.scale, pl.scale); g.drawImage(spr, -11, -29); g.restore();
    if (pl.carry) { const c = pl.carry.color; R(g, OL, px - 6, py - 33, 12, 7); R(g, c, px - 5, py - 32, 10, 5); R(g, shade(c, 0.5), px - 5, py - 30, 10, 1); }
    const eq = eqForDraw();
    if (eq.hand === 'lightstick' && !pl.carry && dir !== 1) glow(px + (dir === 2 ? (flip ? -2 : 2) : 5), py - 21, 18, '190,150,255', 0.35 + Math.sin(T * 6) * 0.08);
  }

  /* ---------- the cat ---------- */
  function catAcc() { const a = (S.pet && S.pet.acc) || {}; return { bow: !!a.bow, hat: !!a.hat, scarf: !!a.scarf }; }
  function updateCat(dt) {
    if (!S.pet) return;
    cat.t += dt; cat.think -= dt; if (cat.petT > 0) cat.petT -= dt;
    const mood = Pets.mood(), sleepSpot = S.decor.catbed ? BED : { x: 232, y: 204 };
    const goTo = (x, y, st) => { cat.tx = x; cat.ty = y; cat.after = st; };
    if (cat.petT > 0) { cat.state = 'happy'; return; }
    if (cat.tx != null) {
      const dx = cat.tx - cat.x, dy = cat.ty - cat.y, d = Math.hypot(dx, dy);
      if (d < 2) { cat.tx = null; cat.state = cat.after || 'sit'; cat.t = 0; }
      else { const sp = (mood === 'happy' ? 46 : 34) * dt; cat.x += dx / d * Math.min(sp, d); cat.y += dy / d * Math.min(sp, d); cat.flip = dx < 0; cat.state = 'walk'; }
      return;
    }
    if (cat.state === 'eat') { if (cat.t > 2.2) { Pets.eat(); sfx('eat'); spawn('heart', cat.x, cat.y - 16, 3); cat.state = 'happy'; cat.t = 0; cat.petT = 1.2; } return; }
    if (cat.think > 0) return;
    cat.think = 2 + Math.random() * 3;
    if (S.pet.bowl > 0 && S.pet.hunger < 95) { goTo(BOWL.x + 12, BOWL.y, 'eat'); cat.flip = true; return; }
    if (mood === 'hungry') { goTo(BOWL.x + 14, BOWL.y + 1, 'sad'); if (Math.random() < 0.4) { cat.bubble = 2.5; } return; }
    const dp = Math.hypot(pl.x - cat.x, pl.y - cat.y);
    if (mood === 'happy' && dp > 46 && Math.abs(pl.x - cat.x) < 600 && S.profile) { goTo(pl.x + (pl.x > cat.x ? -18 : 18), clamp(pl.y + 6, FLOOR_MIN + 4, FLOOR_MAX), 'sit'); return; }
    if (cat.state === 'sit' && Math.random() < 0.3) { goTo(sleepSpot.x, sleepSpot.y, 'sleep'); return; }
    if (cat.state === 'sleep' && Math.random() < 0.75) return;
    if (Math.random() < 0.5) goTo(clamp(cat.x + rnd(-60, 60), 120, Math.min(maxX() - 20, 380)), clamp(cat.y + rnd(-20, 20), 186, FLOOR_MAX), 'sit');
  }
  function drawCatSprite(g) {
    if (!S.pet) return;
    const st = cat.state === 'sad' ? 'sad' : cat.state === 'happy' ? 'happy' : cat.state, fr = cat.state === 'walk' ? Math.floor(cat.t * 8) % 2 : Math.floor(cat.t * 1.2) % 2;
    const spr = catSprite(S.pet.fur, st === 'sad' ? 'sit' : st, fr, Pets.grown(), catAcc());
    const x = Math.round(cat.x), y = Math.round(cat.y);
    g.globalAlpha = 0.18; R(g, OL, x - 8, y - 1, 16, 2); g.globalAlpha = 1;
    g.save(); g.translate(x, y); if (cat.flip) g.scale(-1, 1); g.drawImage(spr, -15, -26); g.restore();
    if (cat.state === 'sleep' && Math.floor(T * 2) % 3 === 0 && Math.random() < 0.05) spawn('z', x + 6, y - 14, 1);
    if (cat.bubble > 0) { cat.bubble -= 1 / 60; R(g, OL, x + 4, y - 30, 16, 11); R(g, CREAM, x + 5, y - 29, 14, 9); R(g, OL, x + 7, y - 19, 2, 2); g.drawImage(iconCanvas('fish', 1), x + 7, y - 29); }
  }
  function drawBowl(g) {
    if (!S.pet) return; const n = S.pet.bowl || 0;
    R(g, OL, BOWL.x - 7, BOWL.y - 5, 14, 5); R(g, '#d98e9a', BOWL.x - 6, BOWL.y - 4, 12, 3); R(g, '#e6a3b4', BOWL.x - 6, BOWL.y - 4, 12, 1);
    for (let i = 0; i < n; i++) R(g, '#8fa8bf', BOWL.x - 5 + i * 4, BOWL.y - 6, 3, 2);
  }

  /* ---------- particles ---------- */
  function spawn(kind, x, y, n = 1) {
    for (let i = 0; i < n; i++) particles.push({ kind, x: x + rnd(-4, 4), y: y + rnd(-2, 2), vx: kind === 'spark' ? rnd(-40, 40) : rnd(-6, 6), vy: kind === 'spark' ? rnd(-60, -10) : -rnd(12, 22), l: kind === 'spark' ? rnd(0.5, 1) : rnd(1.2, 1.8), c: pick(['#e8c25a', CREAM, '#d98e9a', '#c9b2e6']) });
  }
  function drawParticles(g, dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.l -= dt; if (p.l <= 0) { particles.splice(i, 1); continue; }
      if (p.kind === 'spark') { p.vy += 120 * dt; } p.x += p.vx * dt; p.y += p.vy * dt;
      g.globalAlpha = clamp(p.l * 1.5, 0, 1);
      if (p.kind === 'spark') R(g, p.c, p.x, p.y, 1, 1);
      else if (p.kind === 'heart') { const x = Math.round(p.x), y = Math.round(p.y); R(g, '#d98e9a', x, y, 2, 2); R(g, '#d98e9a', x + 3, y, 2, 2); R(g, '#d98e9a', x, y + 1, 5, 2); R(g, '#d98e9a', x + 1, y + 3, 3, 1); R(g, '#d98e9a', x + 2, y + 4, 1, 1); }
      else if (p.kind === 'note') { const x = Math.round(p.x), y = Math.round(p.y); R(g, '#9b74d6', x + 2, y - 5, 1, 6); R(g, '#9b74d6', x, y, 3, 2); R(g, '#9b74d6', x + 3, y - 5, 2, 1); }
      else if (p.kind === 'z') { g.fillStyle = '#9b7a67'; g.font = '7px "Pixelify Sans", monospace'; g.fillText('z', p.x, p.y); }
      g.globalAlpha = 1;
    }
  }

  /* ---------- decorations ---------- */
  function wallSpotById(id) { return WALL_SPOTS.find(s => s.id === id); }
  function floorSpotById(id) { return FLOOR_SPOTS.find(s => s.id === id); }
  function freeSpotFor(item) {
    const used = new Set(Object.values(S.decor));
    if (item.place === 'wall') return (WALL_SPOTS.find(s => unlocked(s.s) && !used.has(s.id)) || {}).id || null;
    if (item.place === 'floor') return (FLOOR_SPOTS.find(s => unlocked(s.s) && !used.has(s.id) && (s.size === 'L' || item.size === 'S')) || {}).id || null;
    return item.place;
  }

  /* ---------- drawing a frame ---------- */
  function draw(dt) {
    const g = ctx, e = env();
    GLOWS.length = 0;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    g.translate(-camX, -camY);
    drawSky(g, e);
    g.drawImage(bg, camX, camY + TOPPAD, W, H, camX, camY, W, H);
    const x0 = camX - 40, x1 = camX + W + 40;
    if (S.decor.fairylights) drawCeilDecor(g, 'fairylights', T, Math.max(0, x0), Math.min(maxX(), x1));
    for (const [id, spot] of Object.entries(S.decor)) { const ws = wallSpotById(spot); if (ws && ws.x > x0 - 40 && ws.x < x1 + 40 && DECOR_DRAW[id]) DECOR_DRAW[id](g, ws.x, 14, T); }
    if (unlocked(1) && x1 > 500 && x0 < 660) drawFire(g, T);
    if (unlocked(3) && x1 > 1360 && x0 < 1440) { drawChandelier(g, T); drawClock(g, T); }
    // shelves
    for (const slot of SLOTS) {
      if (slot.x < x0 - 40 || slot.x > x1 + 40 || !unlocked(slot.s)) continue;
      const sh = shelfAtSlot(slot.i);
      if (sh) drawShelf(g, slot, sh, T);
      else { g.globalAlpha = 0.5 + Math.sin(T * 3) * 0.18; g.strokeStyle = '#9b7a67'; g.setLineDash([3, 3]); g.strokeRect(slot.x - SW / 2 + 0.5, STOP + 0.5, SW - 1, SHH - 1); g.setLineDash([]); R(g, '#9b7a67', slot.x - 1, STOP + 34, 2, 10); R(g, '#9b7a67', slot.x - 5, STOP + 38, 10, 2); g.globalAlpha = 1; }
    }
    for (const b of S.books) { if (b.placing) continue; const a = bookAnim(b); if (a.x < x0 || a.x > x1) continue; drawBook(g, b, a, passesFilter(b) ? 1 : 0.22); }
    if (S.owned.owl && S.decor.owl !== 'off' && !owl.fly) { const first = S.shelves.slice().sort((a, b) => a.slot - b.slot)[0]; if (first) drawOwl(g, slotOf(first).x - 22, STOP - 1, T); }
    if (!e.night && e.hr > 7 && e.hr < 18) { g.globalAlpha = 0.14; g.fillStyle = '#fffaf0'; g.beginPath(); g.moveTo(262, 62); g.lineTo(338, 62); g.lineTo(372, 196); g.lineTo(286, 196); g.closePath(); g.fill(); if (unlocked(2)) { g.beginPath(); g.moveTo(930, 74); g.lineTo(1016, 74); g.lineTo(1050, 210); g.lineTo(950, 210); g.closePath(); g.fill(); } g.globalAlpha = 1; }
    // depth-sorted floor things
    const items = [
      { y: TABLE.y + TABLE.h, f: () => drawTable(g, T) },
      { y: 226, f: () => drawShop(g, T) }
    ];
    if (S.level >= 2) { items.push({ y: 172, f: () => drawLamp(g, 360, 172, e) }); items.push({ y: 176, f: () => drawArmchair(g, 382, 176, true) }); }
    if (unlocked(1)) items.push({ y: 180, f: () => drawArmchair(g, 580, 180, false) });
    if (unlocked(4)) items.push({ y: 172, f: () => drawTelescope(g, 1800, 172) });
    for (const [id, spot] of Object.entries(S.decor)) { const fs = floorSpotById(spot); if (fs && DECOR_DRAW[id] && fs.x > x0 - 60 && fs.x < x1 + 60) items.push({ y: fs.y, f: () => DECOR_DRAW[id](g, fs.x, fs.y, T, dt, id === 'drum' && drumHit > 0) }); }
    if (S.decor.catbed) items.push({ y: BED.y, f: () => DECOR_DRAW.catbed(g, BED.x, BED.y) });
    if (S.pet) { items.push({ y: BOWL.y, f: () => drawBowl(g) }); items.push({ y: cat.y + 0.5, f: () => drawCatSprite(g) }); }
    if (S.decor.football) items.push({ y: ball.y, f: () => drawBall(g, dt) });
    items.push({ y: pl.y + 0.3, f: () => drawPlayer(g) });
    items.sort((a, b) => a.y - b.y).forEach(it => it.f());
    if (S.decor.candles) drawCeilDecor(g, 'candles', T, Math.max(0, x0), Math.min(maxX(), x1));
    if (S.decor.stars7) drawCeilDecor(g, 'stars7', T, Math.max(0, x0), Math.min(maxX() + 10, x1));
    if (owl.fly) drawOwlFlight(g, dt);
    drawParticles(g, dt);
    // light: night tint plus glows
    if (e.night || e.dusk) { g.fillStyle = e.night ? 'rgba(46,34,78,0.15)' : 'rgba(120,70,60,0.06)'; g.fillRect(camX, camY, W, H); }
    if (GLOWS.length) {
      g.globalCompositeOperation = 'lighter';
      for (const [x, y, r, rgb, a] of GLOWS) { if (x + r < camX || x - r > camX + W) continue; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
      g.globalCompositeOperation = 'source-over';
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (cut) runCut(dt);
  }
  function drawBall(g, dt) {
    const dx = ball.x - pl.x, dy = ball.y - pl.y;
    if (Math.hypot(dx, dy) < 8 && pl.moving) { const d = Math.hypot(dx, dy) || 1; ball.vx = dx / d * 130; ball.vy = dy / d * 130; sfx('pop'); }
    ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.vx *= Math.pow(0.2, dt); ball.vy *= Math.pow(0.2, dt);
    if (ball.x < 14 || ball.x > maxX() - 4) { ball.vx *= -0.8; ball.x = clamp(ball.x, 14, maxX() - 4); }
    if (ball.y < FLOOR_MIN + 4 || ball.y > FLOOR_MAX) { ball.vy *= -0.8; ball.y = clamp(ball.y, FLOOR_MIN + 4, FLOOR_MAX); }
    if (isBlocked(ball.x, ball.y)) { ball.vx *= -1; ball.vy *= -1; ball.x += ball.vx * dt * 2; ball.y += ball.vy * dt * 2; }
    ball.spin += Math.hypot(ball.vx, ball.vy) * dt;
    const x = Math.round(ball.x) - 4, y = Math.round(ball.y) - 8, o = Math.floor(ball.spin / 3) % 3;
    g.globalAlpha = 0.2; R(g, OL, x, y + 8, 9, 2); g.globalAlpha = 1; R(g, OL, x, y, 9, 9); R(g, '#f6efe9', x + 1, y + 1, 7, 7); R(g, '#d0575a', x + 1 + o, y + 3, 3, 3); R(g, OL, x + 2 + o, y + 4, 1, 1);
  }

  /* ---------- owl letter flight ---------- */
  function flyOwl(cb) {
    if (!S.owned.owl || S.decor.owl === 'off') { cb && cb(); return; }
    const first = S.shelves.slice().sort((a, b) => a.slot - b.slot)[0]; if (!first) { cb && cb(); return; }
    owl.fly = { t: 0, sx: slotOf(first).x - 22, sy: STOP - 1, cb };
  }
  function drawOwlFlight(g, dt) {
    const f = owl.fly; f.t += dt; const k = clamp(f.t / 1.4, 0, 1), tx = pl.x + 10, ty = pl.y - 34;
    const x = lerp(f.sx, tx, k), y = lerp(f.sy, ty, k) - Math.sin(k * Math.PI) * 30;
    drawOwl(g, x, y, T, true); if (k < 1) { R(g, OL, x + 7, y - 5, 7, 5); R(g, CREAM, x + 8, y - 4, 5, 3); R(g, '#d0575a', x + 10, y - 3, 1, 1); }
    if (f.t > 1.6 && !f.done) { f.done = true; spawn('spark', tx, ty, 14); sfx('sparkle'); const cb = f.cb; setTimeout(() => { owl.fly = null; cb && cb(); }, 200); }
  }

  /* ---------- cutscenes ---------- */
  function runCut(dt) {
    cut.t += dt; const t = cut.t, g = ctx;
    if (cut.type === 'place') {
      const b = cut.b, tg = bookTarget(b), sx = pl.x, sy = pl.y - 30, k = Math.min(1, t / 0.55);
      pl.carry = null;
      if (!tg) { b.placing = false; cut = null; nextPlace(); return; }
      const x = lerp(sx, tg.x + 2, k), y = lerp(sy, tg.y + b.h / 2, k) - Math.sin(k * Math.PI) * 20;
      if (k < 1) { g.save(); g.translate(-camX, -camY); R(g, OL, x - 3, y - 6, 7, 12); R(g, b.color, x - 2, y - 5, 5, 10); g.restore(); }
      else { b.placing = false; const a = bookAnim(b); a.x = tg.x; a.y = tg.y; a.pull = 1; spawn('spark', tg.x + 2, tg.y, 18); sfx('place'); Bus.emit('placed', b); cut = null; pl.dir = 0; nextPlace(); }
      return;
    }
    if (cut.type === 'enter') {
      const b = cut.b, a = bookAnim(b), sx0 = a.x + 2 - camX, sy0 = a.y + b.h / 2 - camY;
      const k = clamp((t - 0.25) / 0.7, 0, 1), e = 1 - Math.pow(1 - k, 3), cx = W / 2, cy = H / 2 - 8, x = lerp(sx0, cx, e), y = lerp(sy0, cy, e), s = 1 + e * 6;
      if (t < 0.05 && !cut.snd) { cut.snd = 1; sfx('open'); }
      g.globalAlpha = e * 0.5; R(g, '#644836', 0, 0, W, H); g.globalAlpha = 1;
      if (k < 0.85) { const w = 5 * s * 1.5, hh = b.h * s / 1.3 + 6; R(g, OL, x - w / 2 - 1, y - hh / 2 - 1, w + 2, hh + 2); R(g, b.color, x - w / 2, y - hh / 2, w, hh); R(g, shade(b.color, 0.5), x - w / 2, y - hh / 2 + 3, w, 2); R(g, shade(b.color, 0.5), x - w / 2, y + hh / 2 - 5, w, 2); }
      else { const ow = 64, oh = 42; R(g, OL, cx - ow / 2 - 2, cy - oh / 2 - 2, ow + 4, oh + 4); R(g, b.color, cx - ow / 2 - 1, cy - oh / 2 - 1, ow + 2, oh + 2); R(g, CREAM, cx - ow / 2 + 2, cy - oh / 2 + 1, ow / 2 - 3, oh - 3); R(g, CREAM, cx + 1, cy - oh / 2 + 1, ow / 2 - 3, oh - 3); for (let i = 0; i < 4; i++) { R(g, '#d9c6b8', cx - ow / 2 + 6, cy - 12 + i * 5, 18 - (i % 2) * 4, 2); R(g, '#d9c6b8', cx + 6, cy - 12 + i * 5, 19 - (i % 3) * 3, 2); } }
      const j = clamp((t - 0.95) / 0.55, 0, 1);
      if (t > 0.95) {
        pl.hide = true; const px = lerp(pl.x - camX, cx, j), py = lerp(pl.y - camY, cy, j) - Math.sin(j * Math.PI) * 36, sc = 1 - j * 0.85;
        if (j < 1) { g.save(); g.translate(px, py); g.scale(sc, sc); g.drawImage(sprites().hold[0][0], -11, -29); g.restore(); }
        if (j > 0.9 && !cut.sp) { cut.sp = 1; spawn('spark', cx + camX, cy + camY, 30); sfx('sparkle'); }
      }
      if (t > 1.5) { g.globalAlpha = clamp((t - 1.5) / 0.3, 0, 1); R(g, CREAM, 0, 0, W, H); g.globalAlpha = 1; }
      if (t > 1.85) { const bk = cut.b; cut = null; pl.hide = false; setActive(false); running = false; Bus.emit('enteredBook', bk); }
      return;
    }
    if (cut.type === 'exit') {
      g.globalAlpha = 1 - clamp(t / 0.35, 0, 1); R(g, CREAM, 0, 0, W, H); g.globalAlpha = 1;
      pl.scale = clamp(0.3 + t * 2, 0, 1); if (t > 0.05 && !cut.sp) { cut.sp = 1; spawn('spark', pl.x, pl.y - 14, 20); }
      if (t > 0.45) { pl.scale = 1; cut = null; if (unlockQueue.length) startUnlock(); else nextPlace(); }
      return;
    }
    if (cut.type === 'unlock') {
      const sec = SECTIONS[cut.k], px = sec.x;
      if (t < 1.2) { camTarget = clamp(px - W / 2, 0, WW - W); }
      if (t > 1.2 && !cut.done) { cut.done = true; buildBg(); for (let i = 0; i < 40; i++) spawn('spark', px + rnd(-10, 10), rnd(60, 220), 1); sfx('level'); Bus.emit('roomUnlocked', sec); }
      if (t < 1.2) { const flash = clamp((t - 0.9) / 0.3, 0, 1); g.globalAlpha = flash * 0.8; R(g, CREAM, 0, 0, W, H); g.globalAlpha = 1; }
      else if (t < 1.6) { g.globalAlpha = 1 - clamp((t - 1.2) / 0.4, 0, 1); R(g, CREAM, 0, 0, W, H); g.globalAlpha = 1; }
      if (t > 2.6) { cut = null; camTarget = null; if (unlockQueue.length) startUnlock(); else nextPlace(); }
    }
  }
  let camTarget = null;
  function startUnlock() { const k = unlockQueue.shift(); if (k == null) return; cut = { type: 'unlock', t: 0, k }; }
  function nextPlace() {
    if (cut || !placeQueue.length) return;
    const b = placeQueue.shift(); const sh = shelfById(b.shelf); if (!sh) { b.placing = false; nextPlace(); return; }
    pl.carry = b; const slot = slotOf(sh);
    walkTo(slot.x, FLOOR_MIN + 1, () => { pl.dir = 1; cut = { type: 'place', t: 0, b }; });
  }

  /* ---------- update ---------- */
  function selectedOnShelf(sh) {
    const list = shelfBooks(sh.id); if (!list.length) return null;
    const slot = slotOf(sh), col = clamp(Math.floor((pl.x - (slot.x - 24)) / 6), 0, NUMCOL - 1);
    let best = null, bd = 1e9;
    list.forEach((b, i) => { if (i >= NUMCOL * 3) return; const r = Math.floor(i / NUMCOL), c = i % NUMCOL, d = Math.abs(c - col) + 40 * Math.abs(r - pl.row); if (d < bd) { bd = d; best = b; } });
    return best;
  }
  function computeFocus() {
    if (cut || !S.profile) return null;
    if (Math.hypot(pl.x - SHOP.x, pl.y - SHOP.y) < 30) return { type: 'shop' };
    if (pl.y <= FLOOR_MIN + 8) {
      const slot = SLOTS.find(s => unlocked(s.s) && Math.abs(pl.x - s.x) < 27);
      if (slot) { const sh = shelfAtSlot(slot.i); if (sh) return { type: 'shelf', shelf: sh, book: selectedOnShelf(sh) }; return { type: 'build', slot }; }
    }
    if (S.pet && Math.hypot(pl.x - cat.x, pl.y - cat.y) < 22) return { type: 'cat' };
    if (Math.hypot(pl.x - (TABLE.x + 86), pl.y - (TABLE.y - 4)) < 26 || (pl.y > TABLE.y - 8 && pl.y < TABLE.y + 6 && Math.abs(pl.x - (TABLE.x + TABLE.w + 8)) < 10)) return { type: 'pile' };
    const drumSpot = S.decor.drum && floorSpotById(S.decor.drum);
    if (drumSpot && Math.hypot(pl.x - drumSpot.x, pl.y - (drumSpot.y - 14)) < 24) return { type: 'drum' };
    return null;
  }
  function update(dt) {
    if (drumHit > 0) drumHit -= dt;
    let mx = 0, my = 0;
    if (active && !cut) {
      if (keys.arrowleft || keys.a || hold.l) mx = -1; if (keys.arrowright || keys.d || hold.r) mx = 1;
      if (keys.arrowup || keys.w || hold.u) my = -1; if ((keys.arrowdown || keys.s || hold.d) && !keys._eatDown) my = 1;
    }
    if (mx || my) { pl.path = null; pl.onArrive = null; }
    else if (pl.path && pl.path.length) {
      const p = pl.path[0], dx = p.x - pl.x, dy = p.y - pl.y, d = Math.hypot(dx, dy);
      if (d < 1.6) { pl.x = p.x; pl.y = p.y; pl.path.shift(); if (!pl.path.length) { pl.path = null; const cb = pl.onArrive; pl.onArrive = null; if (cb) cb(); } }
      else { mx = dx / d; my = dy / d; }
    }
    pl.moving = !!(mx || my);
    if (pl.moving) {
      const sp = 76 * dt, n = Math.hypot(mx, my) || 1, nx = pl.x + mx / n * sp, ny = pl.y + my / n * sp;
      const following = !!pl.path;
      if (following || !isBlocked(nx, pl.y)) pl.x = clamp(nx, 10, maxX()); if (following || !isBlocked(pl.x, ny)) pl.y = clamp(ny, FLOOR_MIN, FLOOR_MAX);
      pl.walkT += dt; pl.stepT += dt; if (pl.stepT > 0.28) { pl.stepT = 0; sfx('step'); }
      if (Math.abs(mx) > Math.abs(my) * 1.01) { pl.dir = 2; pl.flip = mx < 0; } else pl.dir = my < 0 ? 1 : 0;
      if ((S.equip || {}).hand === 'wand' && Math.random() < 0.3) spawn('spark', pl.x - (pl.flip ? -6 : 6), pl.y - 14, 1);
      pl.dance = 0;
    }
    if (pl.hop > 0 || pl.hopV) { pl.hopV -= 400 * dt; pl.hop += pl.hopV * dt; if (pl.hop <= 0) { pl.hop = 0; pl.hopV = 0; } }
    // dancing in front of the mirror
    const mirrorSpot = S.decor.mirror && wallSpotById(S.decor.mirror);
    if (mirrorSpot && !pl.moving && !cut && pl.y < FLOOR_MIN + 14 && Math.abs(pl.x - mirrorSpot.x) < 14) { pl.dance += dt; if (Math.random() < 0.05) spawn('note', pl.x + rnd(-8, 8), pl.y - 30, 1); } else if (!pl.moving) pl.dance = 0;
    updateCat(dt);
    // camera
    const lim = maxX() + 90, want = camTarget != null ? camTarget : pl.x - W / 2;
    const tx = W >= lim ? 0 : clamp(want, 0, lim - W);
    camX = lerp(camX, tx, Math.min(1, dt * 6)); if (Math.abs(camX - tx) < 0.3) camX = tx;
    camY = H >= WH ? WH - H : clamp(Math.round(pl.y - H * 0.6), 0, WH - H);
    camX = Math.round(camX);
    // books
    hoverBook = (mouse && active && !cut) ? bookAt(mouse.x, mouse.y) : null;
    focus = active ? computeFocus() : null;
    const sel = cut && cut.b ? cut.b : (hoverBook || (focus && focus.type === 'shelf' ? focus.book : null));
    for (const b of S.books) {
      const a = bookAnim(b), tg = bookTarget(b); if (!tg) continue;
      a.x = lerp(a.x, tg.x, Math.min(1, dt * 7)); a.y = lerp(a.y, tg.y, Math.min(1, dt * 7)); if (Math.abs(a.x - tg.x) < 0.2) a.x = tg.x; if (Math.abs(a.y - tg.y) < 0.2) a.y = tg.y;
      a.pull = lerp(a.pull, b === sel ? 1 : 0, Math.min(1, dt * 10));
    }
    const sec = sectionAt(pl.x); if (sec !== lastSection) { if (lastSection !== -1 && active) Bus.emit('enterRoom', SECTIONS[sec]); lastSection = sec; }
  }

  /* ---------- labels, prompt and tooltip (DOM) ---------- */
  const labelPool = []; let labelN = 0;
  function label(text, x, y, cls, onclick) {
    let el = labelPool[labelN]; if (!el) { el = h('div', { class: 'wlabel' }); els.labels.appendChild(el); labelPool.push(el); el.addEventListener('click', ev => { ev.stopPropagation(); if (el._click) el._click(); }); }
    labelN++;
    if (el._t !== text) { el.textContent = text; el._t = text; }
    if (el._c !== cls) { el.className = 'wlabel ' + (cls || ''); el._c = cls; }
    el._click = onclick || null; el.style.pointerEvents = onclick ? 'auto' : 'none';
    el.style.transform = `translate(${Math.round((x - camX) * scale)}px, ${Math.round((y - camY) * scale)}px) translate(-50%, -50%)`;
    el.style.display = '';
  }
  function placeLabels() {
    labelN = 0;
    if (active || cut) {
      for (const slot of SLOTS) {
        if (!unlocked(slot.s) || slot.x < camX - 40 || slot.x > camX + W + 40) continue;
        const sh = shelfAtSlot(slot.i);
        if (sh) label(sh.name, slot.x, STOP + 1, 'plaque', () => Bus.emit('editShelf', sh));
        else label('+ Build shelf', slot.x, STOP + 26, 'empty', () => walkTo(slot.x, FLOOR_MIN + 1, () => { pl.dir = 1; Bus.emit('buildShelf', slot.i); }));
      }
      const k = lastUnlocked();
      if (k + 1 < SECTIONS.length) { const sec = SECTIONS[k + 1]; if (sec.x > camX - 40 && sec.x < camX + W + 40) label(`🔒 ${sec.name} · Level ${sec.lv}`, sec.x, 126, 'locked'); }
      if (S.profile && TABLE.x + 86 > camX && TABLE.x < camX + W) { const n = S.books.filter(b => b.want && !b.finished).length; label(n ? `Want to read (${n})` : 'Want to read', TABLE.x + 86, TABLE.y - 26, 'small', () => Bus.emit('wantPile')); }
      if (SHOP.x < camX + W + 60) label('Shop', SHOP.x, 147, 'shoplbl', () => walkTo(SHOP.x, SHOP.y - 2, () => { pl.dir = 0; Bus.emit('openShop'); }));
    }
    for (let i = labelN; i < labelPool.length; i++) labelPool[i].style.display = 'none';
    // prompt above the player
    const pr = els.prompt; let txt = '';
    if (focus && active) {
      if (focus.type === 'shop') txt = '<b>E</b> Shop';
      else if (focus.type === 'shelf') txt = focus.book ? '<b>E</b> Read · <b>↑↓</b> Row · <b>C</b> Edit shelf' : '<b>N</b> Add a book here · <b>C</b> Edit shelf';
      else if (focus.type === 'build') txt = '<b>E</b> Build a shelf';
      else if (focus.type === 'cat') txt = `<b>E</b> Pet ${esc(S.pet.name)}`;
      else if (focus.type === 'pile') txt = '<b>E</b> Want-to-read pile';
      else if (focus.type === 'drum') txt = '<b>E</b> Play the drum';
    }
    if (txt && !pl.moving) { if (pr._t !== txt) { pr.innerHTML = txt; pr._t = txt; } pr.style.display = 'block'; const pw = pr.offsetWidth; pr.style.transform = `translate(${Math.round(clamp((pl.x - camX) * scale, pw / 2 + 6, innerWidth - pw / 2 - 6))}px, ${Math.round((pl.y - 40 - camY) * scale)}px) translate(-50%, -100%)`; }
    else pr.style.display = 'none';
    // tooltip
    const tb = hoverBook || (focus && focus.type === 'shelf' && !pl.moving ? focus.book : null), tip = els.tip;
    if (tb && active && !cut) {
      if (tip._b !== tb || tip._v !== tb.page) {
        tip._b = tb; tip._v = tb.page; const st = bookStatus(tb);
        const line = tb.finished ? `★ Finished${tb.rating ? ' · ' + '★'.repeat(tb.rating) : ''}` : st === 'reading' ? `Reading · page ${tb.page || 1} of ${tb.pages}` : `Not started · ${tb.pages} pages`;
        tip.innerHTML = `<b></b><div class="a"></div><div>${line}</div><div class="bar"><i style="width:${Math.round(bookPct(tb) * 100)}%"></i></div><div class="hint">${hoverBook ? 'Click to read · right-click for options' : 'E to read'}</div>`;
        tip.querySelector('b').textContent = tb.title; tip.querySelector('.a').textContent = tb.author || '';
      }
      const a = bookAnim(tb); tip.style.display = 'block';
      const tw = tip.offsetWidth, sx = clamp((a.x + 2 - camX) * scale, tw / 2 + 6, innerWidth - tw / 2 - 6), sy = Math.max(tip.offsetHeight + 90, (a.y - 4 - camY) * scale);
      tip.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`;
    } else { tip.style.display = 'none'; tip._b = null; }
  }

  /* ---------- input ---------- */
  function onKey(e) {
    const k = e.key.toLowerCase();
    if (!active) return;
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(k)) e.preventDefault();
    if (cut) return;
    const f = focus;
    if (f && f.type === 'shelf' && (k === 'arrowup' || k === 'w') && !keys[k] && pl.y <= FLOOR_MIN + 1) { pl.row = clamp(pl.row - 1, 0, 2); keys[k] = true; keys._eatUp = true; return; }
    if (f && f.type === 'shelf' && (k === 'arrowdown' || k === 's') && pl.row < 2 && !keys[k]) { pl.row++; keys[k] = true; keys._eatDown = true; return; }
    if (e.repeat && (k === 'e' || k === 'enter')) return;
    keys[k] = true;
    if (k === 'e' || k === 'enter') act();
    else if (k === ' ') { if (!pl.hop) { pl.hopV = 110; pl.hop = 0.01; sfx('hop'); } }
    else if (k === 'n') Bus.emit('addBook');
    else if (k === 'c' && f && f.type === 'shelf') Bus.emit('editShelf', f.shelf);
  }
  function act() {
    const f = focus; if (!f) return;
    if (f.type === 'shop') Bus.emit('openShop');
    else if (f.type === 'shelf' && f.book) openBook(f.book);
    else if (f.type === 'shelf') Bus.emit('addBook', f.shelf);
    else if (f.type === 'build') Bus.emit('buildShelf', f.slot.i);
    else if (f.type === 'cat') petCat();
    else if (f.type === 'pile') Bus.emit('wantPile');
    else if (f.type === 'drum') { drumHit = 0.15; sfx('drum'); spawn('note', pl.x, pl.y - 30, 1); }
  }
  function petCat() { if (!S.pet) return; cat.petT = 2; cat.tx = null; cat.state = 'happy'; cat.t = 0; spawn('heart', cat.x, cat.y - 16, 4); sfx('purr'); Quests.progress('pet'); Bus.emit('pet'); }
  function onKeyUp(e) { const k = e.key.toLowerCase(); keys[k] = false; if (k === 'arrowdown' || k === 's') keys._eatDown = false; if (k === 'arrowup' || k === 'w') keys._eatUp = false; }
  function toWorld(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / scale + camX, y: (e.clientY - r.top) / scale + camY }; }
  function onClick(e) {
    if (!active || cut || !S.profile) return; Sound.init();
    const m = toWorld(e), b = bookAt(m.x, m.y);
    if (b) { openBook(b); return; }
    if (Math.abs(m.x - SHOP.x) < 46 && m.y > 140 && m.y < 228) { walkTo(SHOP.x, SHOP.y - 2, () => { pl.dir = 0; Bus.emit('openShop'); }); return; }
    if (S.pet && Math.hypot(m.x - cat.x, m.y - (cat.y - 6)) < 12) { walkTo(cat.x + (pl.x < cat.x ? -14 : 14), cat.y, () => petCat()); return; }
    if (m.x > TABLE.x + 74 && m.x < TABLE.x + 98 && m.y > TABLE.y - 26 && m.y < TABLE.y + 4) { walkTo(TABLE.x + TABLE.w + 8, TABLE.y, () => Bus.emit('wantPile')); return; }
    const slot = SLOTS.find(s => unlocked(s.s) && Math.abs(m.x - s.x) < 28 && m.y > STOP && m.y < SBOT);
    if (slot) { const sh = shelfAtSlot(slot.i); walkTo(slot.x, FLOOR_MIN + 1, () => { pl.dir = 1; if (!sh) Bus.emit('buildShelf', slot.i); }); return; }
    walkTo(clamp(m.x, 10, maxX()), clamp(m.y, FLOOR_MIN, FLOOR_MAX));
  }
  function onContext(e) {
    if (!active || cut) return; const m = toWorld(e), b = bookAt(m.x, m.y);
    if (b) { e.preventDefault(); Bus.emit('bookMenu', { book: b, x: e.clientX, y: e.clientY }); }
  }

  /* ---------- public actions ---------- */
  function openBook(b) {
    if (cut || Reader.isOpen) return;
    const sh = shelfById(b.shelf); if (!sh) return;
    const tg = bookTarget(b); if (tg) pl.row = tg.row;
    walkTo(slotOf(sh).x + (tg ? clamp(tg.x + 2 - slotOf(sh).x, -20, 20) : 0), FLOOR_MIN + 1, () => { pl.dir = 1; cut = { type: 'enter', t: 0, b }; });
  }
  function placeBooks(list) { for (const b of list) { b.placing = true; placeQueue.push(b); } nextPlace(); }
  function afterReader() { setActive(true); start(); cut = { type: 'exit', t: 0 }; pl.dir = 0; sfx('close'); }
  function queueUnlock(k) { if (!unlockQueue.includes(k)) unlockQueue.push(k); if (active && !cut) startUnlock(); }

  /* ---------- setup ---------- */
  function resize() {
    const sc = Math.max(1, Math.floor(innerHeight / WH));
    scale = sc; W = Math.ceil(innerWidth / sc); H = Math.ceil(innerHeight / sc);
    cv.width = W; cv.height = H; cv.style.width = W * sc + 'px'; cv.style.height = H * sc + 'px'; ctx.imageSmoothingEnabled = false;
  }
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; T += dt;
    update(dt); draw(dt); placeLabels();
    requestAnimationFrame(frame);
  }
  function start() { if (running) return; running = true; last = performance.now(); requestAnimationFrame(frame); }
  function setActive(v) { active = v; if (!v) { for (const k in keys) keys[k] = false; hold.l = hold.r = hold.u = hold.d = false; pl.path = pl.path; } els.prompt && (els.prompt.style.display = 'none'); }
  function init() {
    cv = $('#world'); ctx = cv.getContext('2d');
    els = { labels: $('#labels'), prompt: $('#prompt'), tip: $('#tip') };
    resize(); addEventListener('resize', () => { resize(); });
    addEventListener('keydown', onKey); addEventListener('keyup', onKeyUp);
    cv.addEventListener('mousemove', e => { mouse = toWorld(e); cv.style.cursor = active && bookAt(mouse.x, mouse.y) ? 'pointer' : 'default'; });
    cv.addEventListener('mouseleave', () => { mouse = null; });
    cv.addEventListener('click', onClick); cv.addEventListener('contextmenu', onContext);
    for (const [id, side] of [['#t-left', 'l'], ['#t-right', 'r'], ['#t-up', 'u'], ['#t-down', 'd']]) {
      const b = $(id); if (!b) continue;
      b.addEventListener('pointerdown', e => { e.preventDefault(); hold[side] = true; });
      for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => { hold[side] = false; });
    }
    const tact = $('#t-act'); if (tact) tact.addEventListener('click', () => act());
    buildBg();
    if (S.pet) { cat.x = 232; cat.y = 204; }
  }
  function rebuild() { buildBg(); }
  function previewShelf(g, st, books) {
    g.clearRect(0, 0, g.canvas.width, g.canvas.height); g.imageSmoothingEnabled = false;
    const slot = { x: 32 }; drawShelf(g, slot, st, T);
    const list = books && books.length ? books.slice(0, 24) : Array.from({ length: 11 }, (_, i) => ({ color: BOOK_COLORS[(i * 5) % BOOK_COLORS.length], h: 12 + (i * 7) % 4 }));
    list.forEach((b, i) => { const row = Math.floor(i / NUMCOL), col = i % NUMCOL; drawBook(g, b, { x: slot.x - 24 + col * 6, y: ROWTOP[row] + ROWH - b.h, pull: 0 }, 1); });
  }
  function resetPlayer() { pl.x = 200; pl.y = 132; pl.dir = 0; pl.path = null; camX = 0; }

  return {
    init, start, rebuild, resize, setActive, previewShelf, openBook, placeBooks, afterReader, queueUnlock, flyOwl, freeSpotFor, resetPlayer, petCat, walkTo,
    SECTIONS, SLOTS, unlocked, lastUnlocked,
    get active() { return active; }, get busy() { return !!cut || placeQueue.length > 0; }, get player() { return pl; }, get focus() { return focus; },
    stopFrames() { running = false; }
  };
})();
