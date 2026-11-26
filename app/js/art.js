'use strict';
/* Dokseo: pixel art drawn from code. Soft pastel palette, cocoa outlines, chibi characters. */
const OL = '#644836', COL = '#5b3546', CREAM = '#fbf8f4';
function R(g, c, x, y, w, hh) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, hh); }
function outline(cv, color = COL) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, im = g.getImageData(0, 0, W, H), d = im.data, out = new Uint8ClampedArray(d), [r, gg, b] = hexToRgb(color);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4; if (d[i + 3]) continue;
    if ((x > 0 && d[i - 1]) || (x < W - 1 && d[i + 7]) || (y > 0 && d[i - W * 4 + 3]) || (y < H - 1 && d[i + W * 4 + 3])) { out[i] = r; out[i + 1] = gg; out[i + 2] = b; out[i + 3] = 255; }
  }
  g.putImageData(new ImageData(out, W, H), 0, 0); return cv;
}
const SpriteCache = new Map();
function cached(key, make) { let c = SpriteCache.get(key); if (!c) { if (SpriteCache.size > 600) SpriteCache.clear(); c = make(); SpriteCache.set(key, c); } return c; }

/* ---------- palettes ---------- */
const SKINS = ['#f7dccb', '#efc5a8', '#d9a07a', '#a8714f'];
const HAIRS = ['#6e4a3a', '#3a2a2e', '#d9b77a', '#b5605a', '#e6a3b4', '#a8b8c8', '#e9e1d8'];
const HAIR_PURPLE = '#9b74d6';
const OUTFITS = ['#c9a4c8', '#e6a3b4', '#a8b08a', '#8fa8bf', '#e0b86a', '#f2ece4', '#c98a7a', '#8a7a9a'];
const HAIR_STYLES = ['Long', 'Bob', 'Buns', 'Short', 'Ponytail'];
const EYE_STYLES = ['Happy', 'Round', 'Sleepy'];
const HOUSE_SCARVES = [['#8f3e44', '#d8b25a', 'Red & gold'], ['#3f6a4a', '#c9ccd0', 'Green & silver'], ['#3d5a8a', '#b08a5a', 'Blue & bronze'], ['#d8b25a', '#3a3340', 'Yellow & black']];
const BOOK_COLORS = ['#b5605a', '#8c9a6a', '#c9a46a', '#9a7fa0', '#7f97a8', '#c98a7a', '#a8b08a', '#8a5a4d', '#d4b98f', '#6f8a8a', '#c07a8a', '#9b8a6a'];
const WOODS = {
  oak: { name: 'Oak', m: '#9b7a67', l: '#b29580', d: '#7e604f', b: '#6e5242', lv: 1 },
  walnut: { name: 'Walnut', m: '#7e5f4e', l: '#957461', d: '#654a3c', b: '#523b30', lv: 1 },
  birch: { name: 'Birch', m: '#c9ae98', l: '#dcc5b1', d: '#ae927d', b: '#957a66', lv: 1 },
  cherry: { name: 'Cherry', m: '#a66f60', l: '#bd8a7a', d: '#8a5a4d', b: '#714a40', lv: 2 },
  sage: { name: 'Sage', m: '#9aa58a', l: '#b2bba2', d: '#7f8a70', b: '#6a735d', lv: 2 },
  white: { name: 'White', m: '#e9ddd3', l: '#f6efe9', d: '#cdbcae', b: '#b29d8d', lv: 4 },
  rose: { name: 'Rosewood', m: '#b98a8f', l: '#cfa3a7', d: '#9c6f75', b: '#7d565c', lv: 8 },
  ebony: { name: 'Ebony', m: '#5a4a52', l: '#73626b', d: '#43363d', b: '#2f252b', lv: 8 },
  gold: { name: 'Gold trim', m: '#c9a46a', l: '#e8cd96', d: '#a8854e', b: '#6e5242', lv: 9 }
};
const TOP_DECOS = {
  none: { name: 'Nothing', lv: 1 }, plant: { name: 'Plant', lv: 1 }, books: { name: 'Book stack', lv: 1 }, vase: { name: 'Flowers', lv: 1 }, globe: { name: 'Globe', lv: 1 },
  candle: { name: 'Candles', lv: 4 }, cactus: { name: 'Cactus', lv: 4 }, teacup: { name: 'Teacup', lv: 4 }, hourglass: { name: 'Hourglass', lv: 4 }, starlamp: { name: 'Star lamp', lv: 10 }
};
const FURS = {
  orange: { name: 'Orange', m: '#e8b07a', l: '#f6d2a8', d: '#c98a5a' },
  black: { name: 'Black', m: '#4a3c44', l: '#6a5a62', d: '#2e242a' },
  white: { name: 'White', m: '#f6efe9', l: '#ffffff', d: '#d9cfc6' },
  gray: { name: 'Gray', m: '#a8a0a8', l: '#c8c0c8', d: '#857d85' },
  calico: { name: 'Calico', m: '#f6efe9', l: '#ffffff', d: '#d9cfc6', p1: '#e8b07a', p2: '#5a4a52' },
  cream: { name: 'Cream', m: '#efd9b8', l: '#f9ecd6', d: '#d4b994' }
};
function defaultLook(gender = 'girl') {
  return { gender, name: '', hairStyle: gender === 'boy' ? 3 : 0, hair: HAIRS[0], skin: SKINS[0], outfit: gender === 'boy' ? OUTFITS[3] : OUTFITS[0], eyes: 0, glasses: false };
}

/* ---------- chibi character ----------
   dir: 0 front, 1 back, 2 side (faces right; flip for left)
   pose: walk | hold (book above head) | read (holding a book in front) */
function charFrame(look, eq, dir, frame, pose) {
  const CW = 22, CH = 31, OX = 3, OY = 10;
  const cv = mkCanvas(CW, CH), g = cv.getContext('2d');
  const P = (c, x, y, w = 1, hh = 1) => { g.fillStyle = c; g.fillRect(x + OX, y + OY, w, hh); };
  const girl = look.gender !== 'boy', skin = look.skin, hair = look.hair, hdk = shade(hair, -0.22), hlt = shade(hair, 0.28), cheek = '#eaa0a0';
  const front = dir === 0, back = dir === 1, side = dir === 2;
  const bob = (frame === 1 || frame === 3) ? 1 : 0, y0 = -bob, hy = y0;
  const o = eq.outfit;
  let top = look.outfit, bottom = girl ? shade(look.outfit, -0.14) : '#7a6a72', skirt = girl, longSkirt = false;
  const shoe = '#7a5a5a';
  if (o === 'robe') { top = '#4e4656'; bottom = '#3e3746'; skirt = true; longSkirt = true; }
  else if (o === 'hanbok') { top = girl ? '#f2b8c0' : '#a8c3d8'; bottom = girl ? '#9ab8d6' : '#f2ece4'; longSkirt = girl; }
  else if (o === 'uniform') { top = '#4e5a7a'; bottom = girl ? '#8a7a9a' : '#4e5a7a'; }
  else if (o === 'jersey') { top = '#d0575a'; bottom = '#f6efe9'; skirt = false; }
  else if (o === 'hoodie') { top = '#9a7fa0'; bottom = '#6f5f7a'; skirt = false; }
  else if (o === 'stage') { top = '#3a3340'; bottom = '#2e2834'; }
  else if (o === 'coat') { top = '#c9a46a'; bottom = '#c9a46a'; skirt = true; longSkirt = true; }
  const tdk = shade(top, -0.18), tlt = shade(top, 0.25);
  const lu = frame === 1 ? 1 : 0, ru = frame === 3 ? 1 : 0, hs = look.hairStyle;

  // 1) hair that hangs behind the body
  if (hs === 0) {
    if (front) { P(hair, 1, 4 + hy, 14, 10); P(hdk, 1, 12 + hy, 2, 2); P(hdk, 13, 12 + hy, 2, 2); }
    else if (back) { P(hair, 1, 3 + hy, 14, 11); P(hdk, 2, 12 + hy, 12, 2); }
    else { P(hair, 1, 3 + hy, 6, 11); P(hdk, 1, 12 + hy, 3, 2); }
  } else if (hs === 4) {
    if (front) { P(hair, 13, 2 + hy, 3, 9); P(hdk, 14, 9 + hy, 2, 2); }
    else if (back) { P(hair, 6, 6 + hy, 4, 9); P(hdk, 6, 13 + hy, 4, 2); }
    else { P(hair, 0, 2 + hy, 4, 9); P(hdk, 0, 9 + hy, 3, 2); }
  }
  if (o === 'hoodie' && !back) P(shade(top, -0.1), 2, 8 + hy, 12, 4);

  // 2) legs and shoes
  const legC = skirt ? skin : bottom, Lx = 5, Rx = side ? 8 : 9;
  if (longSkirt) { if (!lu) P(shoe, Lx, 18, 2, 1); if (!ru) P(shoe, Rx, 18, 2, 1); }
  else {
    if (lu) P(shoe, Lx, 17, 2, 1); else { P(legC, Lx, 17, 2, 1); P(shoe, Lx, 18, 2, 1); }
    if (ru) P(shoe, Rx, 17, 2, 1); else { P(legC, Rx, 17, 2, 1); P(shoe, Rx, 18, 2, 1); }
  }
  // 3) lower body
  if (longSkirt) { P(bottom, 3, 15 + y0, 10, 3 - y0); P(shade(bottom, -0.15), 3, 17, 10, 1); }
  else if (skirt) { P(bottom, 3, 15 + y0, 10, 2 - y0); P(shade(bottom, -0.15), 3, 16, 10, 1); }
  else { P(bottom, 4, 15 + y0, 8, 2 - y0); P(shade(bottom, -0.2), 7, 16, 2, 1); }
  // 4) torso
  if (o === 'hoodie') { P(top, 3, 11 + y0, 10, 4); if (!back) { P(tdk, 6, 13 + y0, 4, 2); P('#f6efe9', 6, 11 + y0, 1, 2); P('#f6efe9', 9, 11 + y0, 1, 2); } }
  else { P(top, 4, 11 + y0, 8, 4); P(tlt, 5, 11 + y0, 1, 3); }
  if (!back) {
    if (o === 'robe') { P('#f6efe9', 6, 11 + y0, 4, 1); P('#a65a5a', 7, 12 + y0, 2, 3); }
    else if (o === 'hanbok') { P('#fbf6f0', 6, 11 + y0, 1, 2); P('#fbf6f0', 7, 12 + y0, 2, 1); P('#d0575a', 8, 13 + y0, 2, 1); P('#d0575a', 9, 14 + y0, 1, 2); }
    else if (o === 'uniform') { P('#fbf6f0', 7, 11 + y0, 2, 4); P('#d0575a', 7, 12 + y0, 2, 2); }
    else if (o === 'jersey') { P('#f6efe9', 4, 11 + y0, 1, 4); P('#f6efe9', 11, 11 + y0, 1, 4); P('#f6efe9', 7, 12 + y0, 2, 2); }
    else if (o === 'stage') { P('#d8b25a', 4, 11 + y0); P('#d8b25a', 11, 11 + y0); P('#f2ece4', 8, 11 + y0, 1, 4); P('#d8b25a', 7, 12 + y0); P('#d8b25a', 7, 14 + y0); }
    else if (o === 'coat') { P(shade(top, -0.25), 4, 14 + y0, 8, 1); P('#f2ece4', 6, 11 + y0, 4, 1); P(shade(top, -0.2), 7, 12 + y0, 1, 5); }
    else if (o !== 'hoodie') P('#fbf6f0', 6, 11 + y0, 4, 1);
  }
  // 5) arms
  if (pose === 'read') { P(tdk, 3, 12 + y0, 2, 2); P(tdk, 11, 12 + y0, 2, 2); P(skin, 5, 13 + y0); P(skin, 10, 13 + y0); }
  else if (pose !== 'hold') {
    if (side) { const sw = frame === 1 ? 1 : frame === 3 ? -1 : 0; P(tdk, 7 + sw, 12 + y0, 2, 3); P(skin, 7 + sw, 15 + y0, 2, 1); }
    else { P(tdk, 3, 11 + y0, 1, 4); P(tdk, 12, 11 + y0, 1, 4); P(skin, 3, 15 + y0); P(skin, 12, 15 + y0); }
  }
  // 6) scarf
  const sc = eq.neck === 'wscarf' ? ['#d0575a', '#f6efe9'] : eq.neck === 'hscarf' ? HOUSE_SCARVES[eq.neckVar || 0] : null;
  if (sc) { P(sc[0], 4, 10 + y0, 8, 2); P(sc[1], 6, 10 + y0, 1, 2); P(sc[1], 9, 10 + y0, 1, 2); if (!back) for (let i = 0; i < 4; i++) P(sc[i % 2], side ? 5 : 9, 12 + y0 + i, 2, 1); }

  // 7) head
  const glasses = look.glasses || eq.face === 'wizglasses', gc = eq.face === 'wizglasses' ? '#c9a46a' : COL;
  if (front) {
    P(skin, 3, 3 + hy, 10, 8);
    P(hair, 2, 0 + hy, 12, 4); P(hair, 3, -1 + hy, 10, 1); P(hlt, 5, 0 + hy, 4, 1);
    if (hs === 0) { P(hair, 2, 4 + hy, 2, 6); P(hair, 12, 4 + hy, 2, 6); P(hair, 4, 4 + hy, 3, 1); P(hair, 9, 4 + hy, 3, 1); P(hair, 7, 4 + hy, 1, 2); }
    else if (hs === 1) { P(hair, 1, 3 + hy, 3, 7); P(hair, 12, 3 + hy, 3, 7); P(hair, 4, 4 + hy, 8, 1); P(hair, 5, 5 + hy); P(hair, 10, 5 + hy); }
    else if (hs === 2) { P(hair, 0, -3 + hy, 4, 4); P(hair, 12, -3 + hy, 4, 4); P(hlt, 1, -3 + hy, 2, 1); P(hlt, 13, -3 + hy, 2, 1); P(hair, 2, 4 + hy, 2, 4); P(hair, 12, 4 + hy, 2, 4); P(hair, 4, 4 + hy, 2, 1); P(hair, 8, 4 + hy, 4, 1); }
    else if (hs === 3) { P(hair, 2, 4 + hy, 1, 3); P(hair, 13, 4 + hy, 1, 3); P(hair, 4, 4 + hy, 2, 1); P(hair, 7, 4 + hy, 2, 2); P(hair, 10, 4 + hy, 2, 1); P(hair, 4, -2 + hy, 2, 1); P(hair, 9, -2 + hy, 2, 1); }
    else { P(hair, 2, 4 + hy, 2, 3); P(hair, 12, 4 + hy, 2, 3); P(hair, 4, 4 + hy, 4, 1); P(hair, 9, 4 + hy, 3, 1); }
    const ey = 7 + hy;
    if (look.eyes === 1) { P(COL, 4, ey - 1, 2, 2); P(COL, 10, ey - 1, 2, 2); P('#ffffff', 4, ey - 1); P('#ffffff', 10, ey - 1); }
    else if (look.eyes === 2) { P(COL, 4, ey, 2, 1); P(COL, 10, ey, 2, 1); }
    else { P(COL, 4, ey); P(COL, 5, ey - 1); P(COL, 6, ey); P(COL, 9, ey); P(COL, 10, ey - 1); P(COL, 11, ey); }
    P(cheek, 3, 8 + hy, 2, 1); P(cheek, 11, 8 + hy, 2, 1); P('#b06a6a', 7, 9 + hy, 2, 1);
    if (glasses) { P(gc, 4, ey - 2, 2, 1); P(gc, 3, ey - 1, 1, 2); P(gc, 6, ey - 1, 1, 2); P(gc, 4, ey + 1, 2, 1); P(gc, 10, ey - 2, 2, 1); P(gc, 9, ey - 1, 1, 2); P(gc, 12, ey - 1, 1, 2); P(gc, 10, ey + 1, 2, 1); P(gc, 7, ey - 1, 2, 1); }
    if (eq.mark === 'scar') { P('#c85a5a', 10, 2 + hy); P('#c85a5a', 9, 3 + hy); P('#c85a5a', 10, 4 + hy); }
  } else if (back) {
    P(hair, 2, -1 + hy, 12, 12); P(hair, 1, 1 + hy, 14, 9); P(hlt, 5, 0 + hy, 5, 1);
    if (hs === 2) { P(hair, 0, -3 + hy, 4, 4); P(hair, 12, -3 + hy, 4, 4); }
    if (hs === 3) { P(hair, 4, -2 + hy, 2, 1); P(hair, 9, -2 + hy, 2, 1); }
    if (hs === 4) P('#d98e9a', 7, 5 + hy, 2, 2);
    if (o === 'hoodie') P(shade(top, -0.1), 3, 8 + hy, 10, 4);
  } else {
    P(skin, 6, 3 + hy, 8, 8);
    P(hair, 3, -1 + hy, 10, 4); P(hair, 2, 0 + hy, 12, 3); P(hlt, 6, 0 + hy, 4, 1);
    P(hair, 2, 3 + hy, 5, hs === 3 ? 4 : 8); P(hair, 11, 3 + hy, 3, 2);
    if (hs === 1) P(hair, 1, 3 + hy, 6, 7);
    if (hs === 2) { P(hair, 1, -3 + hy, 5, 4); P(hlt, 2, -3 + hy, 2, 1); }
    if (hs === 3) { P(hair, 5, -2 + hy, 2, 1); P(hair, 9, -2 + hy, 2, 1); }
    const ey = 7 + hy;
    if (look.eyes === 1) { P(COL, 10, ey - 1, 2, 2); P('#ffffff', 10, ey - 1); }
    else if (look.eyes === 2) P(COL, 10, ey, 2, 1);
    else { P(COL, 10, ey); P(COL, 11, ey - 1); P(COL, 12, ey); }
    P(cheek, 11, 8 + hy, 2, 1); P('#b06a6a', 13, 9 + hy);
    if (glasses) { P(gc, 10, ey - 2, 2, 1); P(gc, 9, ey - 1, 1, 2); P(gc, 12, ey - 1, 1, 2); P(gc, 10, ey + 1, 2, 1); P(gc, 13, ey - 1); }
  }
  // 8) headwear
  const hat = eq.hat;
  if (hat === 'wizhat') { const HC = '#4e4656'; P(HC, 0, 1 + hy, 16, 2); P('#3e3746', 0, 2 + hy, 16, 1); P(HC, 3, -2 + hy, 10, 3); P(HC, 4, -4 + hy, 8, 2); P(HC, 5, -6 + hy, 6, 2); P(HC, 6, -7 + hy, 4, 1); P(HC, 8, -8 + hy, 4, 1); P(HC, 10, -9 + hy, 3, 1); P('#d8b25a', 3, 0 + hy, 10, 1); P('#f2d36b', 7, -4 + hy); }
  else if (hat === 'bucket') { P('#c9b2e6', 2, -2 + hy, 12, 4); P('#b49ad6', 0, 2 + hy, 16, 1); P(shade('#c9b2e6', 0.4), 4, -2 + hy, 4, 1); }
  else if (hat === 'catears') { P('#4a3c44', 2, -1 + hy, 12, 1); P('#4a3c44', 2, -4 + hy, 3, 3); P('#4a3c44', 11, -4 + hy, 3, 3); P('#e6a3b4', 3, -3 + hy, 1, 2); P('#e6a3b4', 12, -3 + hy, 1, 2); }
  else if (girl && hs !== 2) { const bx = side ? 3 : back ? 6 : 11; P('#d98e9a', bx, -1 + hy, 3, 2); P('#f2b8c0', bx + 1, -1 + hy); }
  // 9) arms up holding a book, or a hand item
  if (pose === 'hold') { P(top, 0, 4 + y0, 2, 7); P(top, 14, 4 + y0, 2, 7); P(skin, 0, 3 + y0, 2, 1); P(skin, 14, 3 + y0, 2, 1); }
  else if (!back && pose !== 'read') {
    const lx = side ? 11 : 13;
    if (eq.hand === 'lightstick') { P(COL, lx, 11 + y0, 1, 5); P('#f1e9ff', lx - 1, 7 + y0, 3, 4); P('#b49ad6', lx - 1, 9 + y0, 3, 1); }
    else if (eq.hand === 'wand') { P('#6e4a3a', lx, 9 + y0, 1, 6); P('#fbf8f4', lx, 8 + y0); }
  }
  return outline(cv, COL);
}
function charSprites(look, eq) {
  return cached('c:' + JSON.stringify(look) + JSON.stringify(eq), () => {
    const mk = pose => [0, 1, 2].map(d => [0, 1, 2, 3].map(f => charFrame(look, eq, d, f, pose)));
    return { walk: mk('walk'), hold: mk('hold'), read: charFrame(look, eq, 0, 0, 'read') };
  });
}

/* ---------- cats ---------- */
function catFrame(fur, pose, frame, grown, acc = {}) {
  const F = FURS[fur] || FURS.orange, CW = 34, CH = 28, AX = 15, AY = 26;
  const cv = mkCanvas(CW, CH), g = cv.getContext('2d');
  const P = (c, x, y, w = 1, hh = 1) => { g.fillStyle = c; g.fillRect(AX + x, AY + y, w, hh); };
  const s = grown ? 1 : 0, bw = 12 + s * 3, bh = 6 + s, bx = -7 - s * 2;
  const sleeping = pose === 'sleep', eating = pose === 'eat', walking = pose === 'walk';
  const bodyH = sleeping ? bh - 1 : bh, bodyY = -1 - bodyH;
  let hw = 8 + s, hh = 7 + s, hx = bx + bw - 3, hy = bodyY - hh + 2;
  if (sleeping) { hx = bx + bw - 5; hy = bodyY - 1; }
  if (eating) { hx = bx + bw - 1; hy = bodyY + 1; }
  const breath = (pose === 'sit' || sleeping) && frame % 2 ? 1 : 0;
  // tail
  if (sleeping) { P(F.m, bx - 1, -3, bw - 3, 2); P(F.d, bx - 1, -2, 3, 1); }
  else if (walking) { const tw = frame % 2; P(F.m, bx - 2, bodyY - 2 - tw, 2, 4); P(F.m, bx - 3, bodyY - 5 - tw, 2, 3); }
  else { P(F.m, bx - 2, bodyY + 1, 2, 4); P(F.m, bx - 3, bodyY - 2, 2, 4); P(F.d, bx - 3, bodyY - 3, 2, 1); }
  // body
  P(F.m, bx, bodyY - breath, bw, bodyH + breath);
  P(F.l, bx + 2, bodyY + bodyH - 3, bw - 6, 2);
  if (F.p1) { P(F.p1, bx + 1, bodyY - breath, 4, 3); P(F.p2, bx + bw - 7, bodyY + 1, 3, 2); }
  // legs
  if (walking) { const a = frame % 2; P(F.d, bx + 1 + a, -1, 2, 1); P(F.d, bx + 5 - a, -1, 2, 1); P(F.d, bx + bw - 6 + a, -1, 2, 1); P(F.d, bx + bw - 3 - a, -1, 2, 1); }
  else if (!sleeping) { P(F.l, bx + bw - 6, -1, 2, 1); P(F.l, bx + bw - 3, -1, 2, 1); }
  // head + ears
  P(F.m, hx, hy, hw, hh);
  P(F.m, hx, hy - 2, 2, 2); P(F.m, hx + hw - 2, hy - 2, 2, 2);
  P('#eaa0a0', hx, hy - 1); P('#eaa0a0', hx + hw - 1, hy - 1);
  if (F.p1) P(F.p2, hx, hy, 3, 2);
  const ey = hy + 3, closed = sleeping || eating || pose === 'happy';
  if (closed) { P(COL, hx + 1, ey + 1, 2, 1); P(COL, hx + hw - 3, ey + 1, 2, 1); }
  else { P(COL, hx + 2, ey, 1, 2); P(COL, hx + hw - 3, ey, 1, 2); }
  P('#d98e9a', hx + (hw >> 1), ey + 2);
  if (pose === 'sad') { P(COL, hx + 1, ey - 1); P(COL, hx + hw - 2, ey - 1); }
  // accessories
  if (acc.scarf) { P('#d0575a', hx - 1, hy + hh - 1, hw + 1, 1); P('#f6efe9', hx + 1, hy + hh - 1); P('#f6efe9', hx + 4, hy + hh - 1); P('#d0575a', hx + 1, hy + hh, 2, 2); }
  else P(acc.collar || '#c9a4c8', hx, hy + hh - 1, hw, 1);
  if (acc.bow) { P('#e6a3b4', hx - 1, hy - 3, 2, 2); P('#e6a3b4', hx + 2, hy - 3, 2, 2); P('#c07a8a', hx + 1, hy - 3, 1, 2); }
  if (acc.hat) { const HC = '#4e4656'; P(HC, hx, hy - 1, hw, 1); P(HC, hx + 2, hy - 3, hw - 4, 2); P(HC, hx + 3, hy - 5, hw - 6, 2); P(HC, hx + 4, hy - 6, 2, 1); P('#d8b25a', hx + 2, hy - 2, hw - 4, 1); }
  return outline(cv, COL);
}
function catSprite(fur, pose, frame, grown, acc) {
  return cached(`cat:${fur}:${pose}:${frame}:${grown ? 1 : 0}:${acc ? JSON.stringify(acc) : ''}`, () => catFrame(fur, pose, frame, grown, acc || {}));
}
function drawOwl(g, x, y, t, flap) {
  const bl = (t % 4) < 0.15;
  if (flap) { const w = Math.sin(t * 20) > 0 ? -3 : 0; R(g, OL, x - 5, y - 9 + w, 5, 3); R(g, OL, x + 8, y - 9 + w, 5, 3); }
  R(g, OL, x - 1, y - 11, 10, 11); R(g, '#b29580', x, y - 10, 8, 10); R(g, '#e3d3c6', x + 2, y - 6, 4, 5);
  R(g, '#b29580', x, y - 11, 2, 1); R(g, '#b29580', x + 6, y - 11, 2, 1);
  R(g, bl ? '#b29580' : CREAM, x + 1, y - 9, 3, 3); R(g, bl ? '#b29580' : CREAM, x + 4, y - 9, 3, 3);
  if (!bl) { R(g, COL, x + 2, y - 8, 1, 1); R(g, COL, x + 5, y - 8, 1, 1); }
  R(g, '#c9a46a', x + 3, y - 6, 2, 1);
}

/* ---------- shelf top decorations (cx = shelf center, T = shelf top y) ---------- */
function drawTopDeco(g, kind, cx, T, t) {
  if (kind === 'plant') { R(g, OL, cx + 6, T - 9, 13, 9); R(g, '#c98a7a', cx + 7, T - 8, 11, 8); for (const [x, y] of [[cx + 3, T - 16], [cx + 9, T - 20], [cx + 15, T - 17], [cx + 6, T - 13], [cx + 17, T - 12], [cx + 12, T - 14]]) { R(g, OL, x - 1, y - 1, 7, 6); R(g, '#8c9a6a', x, y, 5, 4); R(g, '#a8b08a', x + 1, y, 2, 1); } R(g, '#8c9a6a', cx + 18, T - 8, 2, 8); }
  else if (kind === 'books') { R(g, OL, cx - 20, T - 9, 14, 9); R(g, '#b5605a', cx - 19, T - 8, 12, 3); R(g, '#7f97a8', cx - 18, T - 5, 11, 4); R(g, CREAM, cx - 19, T - 6, 12, 1); }
  else if (kind === 'vase') { R(g, OL, cx - 16, T - 12, 8, 12); R(g, '#f6efe9', cx - 15, T - 11, 6, 11); R(g, OL, cx - 18, T - 19, 12, 7); R(g, '#d98e9a', cx - 17, T - 18, 4, 4); R(g, '#e0b86a', cx - 13, T - 18, 4, 4); R(g, '#c9a4c8', cx - 15, T - 16, 3, 3); R(g, '#8c9a6a', cx - 13, T - 13, 1, 2); }
  else if (kind === 'globe') { R(g, OL, cx - 17, T - 15, 12, 12); R(g, '#7f97a8', cx - 16, T - 14, 10, 10); R(g, '#a8b08a', cx - 14, T - 12, 4, 3); R(g, '#a8b08a', cx - 10, T - 8, 3, 3); R(g, OL, cx - 12, T - 3, 2, 3); R(g, OL, cx - 15, T - 1, 8, 1); }
  else if (kind === 'candle') { for (const [dx, hh] of [[10, 10], [15, 7]]) { const fl = Math.sin(t * 11 + dx) > 0 ? 1 : 0; R(g, OL, cx + dx - 1, T - hh - 1, 4, hh + 1); R(g, CREAM, cx + dx, T - hh, 2, hh); R(g, '#f2a33a', cx + dx, T - hh - 3 - fl, 2, 2 + fl); if (typeof glow === 'function') glow(cx + dx + 1, T - hh - 3, 14, '255,200,110', 0.25); } }
  else if (kind === 'cactus') { R(g, OL, cx + 8, T - 7, 10, 7); R(g, '#c9a46a', cx + 9, T - 6, 8, 6); R(g, OL, cx + 10, T - 17, 6, 10); R(g, '#8c9a6a', cx + 11, T - 16, 4, 9); R(g, '#f2b8c0', cx + 12, T - 18, 2, 2); }
  else if (kind === 'teacup') { R(g, OL, cx - 18, T - 7, 12, 7); R(g, CREAM, cx - 17, T - 6, 10, 5); R(g, '#e6a3b4', cx - 17, T - 4, 10, 1); R(g, OL, cx - 7, T - 5, 2, 3); R(g, OL, cx - 20, T - 1, 16, 1); for (let i = 0; i < 2; i++) { const k = (t * 0.5 + i / 2) % 1; g.globalAlpha = 0.5 * (1 - k); R(g, CREAM, cx - 14 + i * 3, T - 10 - k * 8, 1, 3); g.globalAlpha = 1; } }
  else if (kind === 'hourglass') { R(g, OL, cx + 9, T - 14, 10, 14); R(g, '#c9a46a', cx + 9, T - 14, 10, 2); R(g, '#c9a46a', cx + 9, T - 2, 10, 2); R(g, '#e8f0f2', cx + 11, T - 12, 6, 10); R(g, '#e0b86a', cx + 12, T - 6, 4, 4); R(g, '#e0b86a', cx + 13, T - 9, 2, 3); }
  else if (kind === 'starlamp') { const p = (Math.sin(t * 2) + 1) / 2; R(g, OL, cx - 4, T - 16, 8, 16); R(g, '#3e4a6e', cx - 3, T - 15, 6, 13); R(g, '#f2d36b', cx - 1, T - 12, 2, 2); R(g, '#f2d36b', cx - 2, T - 8, 1, 1); R(g, '#f2d36b', cx + 1, T - 6, 1, 1); if (typeof glow === 'function') glow(cx, T - 9, 18, '242,211,107', 0.15 + p * 0.1); }
}

/* ---------- misc pixel icons for the interface ---------- */
function iconCanvas(kind, scale = 3) {
  return cached('icon:' + kind + scale, () => {
    const cv = mkCanvas(11, 11), g = cv.getContext('2d'), P = (c, x, y, w = 1, hh = 1) => R(g, c, x, y, w, hh);
    if (kind === 'coin') { P(OL, 3, 1, 5, 9); P(OL, 1, 3, 9, 5); P(OL, 2, 2, 7, 7); P('#e8c25a', 3, 2, 5, 7); P('#e8c25a', 2, 3, 7, 5); P('#f6dd8a', 3, 3, 2, 2); P('#c9a046', 5, 4, 1, 3); }
    else if (kind === 'fish') { P(OL, 1, 3, 7, 5); P(OL, 7, 2, 3, 7); P('#8fa8bf', 2, 4, 5, 3); P('#8fa8bf', 8, 3, 1, 5); P(COL, 3, 4, 1, 1); }
    else if (kind === 'heart') { P(OL, 1, 2, 4, 4); P(OL, 6, 2, 4, 4); P(OL, 1, 4, 9, 3); P(OL, 3, 7, 5, 2); P(OL, 5, 9, 1, 1); P('#d98e9a', 2, 3, 2, 3); P('#d98e9a', 7, 3, 2, 3); P('#d98e9a', 2, 5, 7, 2); P('#d98e9a', 4, 7, 3, 1); }
    else if (kind === 'lock') { P(OL, 3, 1, 5, 5); P('#efe4dc', 4, 2, 3, 4); P(OL, 2, 5, 7, 5); P('#c9a46a', 3, 6, 5, 3); P(OL, 5, 7, 1, 1); }
    else if (kind === 'star') { P('#e8c25a', 5, 1, 1, 9); P('#e8c25a', 1, 5, 9, 1); P('#e8c25a', 3, 3, 5, 5); P('#f6dd8a', 5, 3, 1, 3); }
    const big = mkCanvas(11 * scale, 11 * scale), bg = big.getContext('2d'); bg.imageSmoothingEnabled = false; bg.drawImage(cv, 0, 0, big.width, big.height); return big;
  });
}
function iconURL(kind, scale = 3) { return cached('iconurl:' + kind + scale, () => ({ url: iconCanvas(kind, scale).toDataURL() })).url; }
function flameCanvas(level, frame) {
  // a pixel flame that grows with the streak (level 0..3)
  const cv = mkCanvas(16, 20), g = cv.getContext('2d'), P = (c, x, y, w = 1, hh = 1) => R(g, c, x, y, w, hh);
  const hgt = [8, 11, 14, 17][level], w = [6, 8, 10, 12][level], cx = 8, by = 19, wob = frame % 2;
  const outer = level >= 3 ? '#9b74d6' : '#e8885a', mid = level >= 3 ? '#c9b2e6' : '#f2b25a', core = level >= 3 ? '#f6efe9' : '#fbe39a';
  for (let y = 0; y < hgt; y++) { const k = y / hgt, ww = Math.max(1, Math.round(w * (1 - k * k) * (k < 0.2 ? 0.8 + k : 1))); P(outer, cx - (ww >> 1) + (y > hgt * 0.6 ? wob : 0), by - y, ww, 1); }
  for (let y = 0; y < hgt * 0.65; y++) { const k = y / (hgt * 0.65), ww = Math.max(1, Math.round((w - 3) * (1 - k * k))); P(mid, cx - (ww >> 1), by - y, ww, 1); }
  for (let y = 0; y < hgt * 0.35; y++) { const ww = Math.max(1, Math.round((w - 5) * (1 - y / (hgt * 0.35)))); P(core, cx - (ww >> 1), by - y, ww, 1); }
  return outline(cv, OL);
}
