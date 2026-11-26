'use strict';
/* Dokseo: shop items. Themed items are character accessories, house decorations, reader themes or pets. */
const SETS = {
  bts: { name: 'BTS-inspired', icon: '💜' }, kdrama: { name: 'K-drama', icon: '🎬' }, wizard: { name: 'Wizard school', icon: '⚡' },
  wydad: { name: 'Wydad', icon: '❤️🤍' }, pets: { name: 'Pets', icon: '🐱' }, mystery: { name: 'Mystery box', icon: '🎁' }
};
const ITEMS = [
  // BTS-inspired
  { id: 'lightstick', set: 'bts', kind: 'wear', slot: 'hand', name: 'Purple lightstick', price: 300, desc: 'A glowing lightstick that lights up the room around you.' },
  { id: 'bucket', set: 'bts', kind: 'wear', slot: 'hat', name: 'Lavender bucket hat', price: 250, desc: 'Soft and slouchy. Airport-fashion approved.' },
  { id: 'hoodie', set: 'bts', kind: 'wear', slot: 'outfit', name: 'Oversized purple hoodie', price: 400, desc: 'Big, cozy, perfect for long reading nights.' },
  { id: 'stage', set: 'bts', kind: 'wear', slot: 'outfit', name: 'Stage jacket', price: 600, desc: 'Black with gold buttons, ready for the encore.' },
  { id: 'hairpurple', set: 'bts', kind: 'hair', name: 'Purple hair dye', price: 150, desc: 'Adds purple to the hair colors in the character editor.' },
  { id: 'fairylights', set: 'bts', kind: 'decor', place: 'ceil', name: 'Purple fairy lights', price: 300, desc: 'Twinkly purple lights across every room.' },
  { id: 'posters', set: 'bts', kind: 'decor', place: 'wall', name: '7 idol-style posters', price: 450, desc: 'Seven posters in seven colors, one for each member of your favorite group.' },
  { id: 'stars7', set: 'bts', kind: 'decor', place: 'ceil', name: '7 purple stars', price: 500, desc: 'A glowing seven-star constellation in each room.' },
  { id: 'balloons', set: 'bts', kind: 'decor', place: 'floor', size: 'S', name: 'Purple heart balloons', price: 200, desc: 'Three heart balloons that bob gently.' },
  { id: 'stagecorner', set: 'bts', kind: 'decor', place: 'floor', size: 'L', name: 'Concert stage corner', price: 1500, lv: 3, desc: 'A mini stage with a mic and moving purple spotlights.' },
  { id: 'mirror', set: 'bts', kind: 'decor', place: 'wall', name: 'Dance practice mirror', price: 600, desc: 'Stand in front of it and your character dances.' },
  { id: 'th_purple', set: 'bts', kind: 'theme', theme: 'purple', name: 'Purple Night reader theme', price: 350, desc: 'Dark purple pages with soft lavender text.' },
  // K-drama
  { id: 'konbini', set: 'kdrama', kind: 'decor', place: 'floor', size: 'L', name: 'Convenience store corner', price: 800, desc: 'Green table, umbrella, ramyeon and banana milk.' },
  { id: 'blossom', set: 'kdrama', kind: 'decor', place: 'floor', size: 'S', name: 'Cherry blossom tree', price: 600, desc: 'Pink petals drift down all day.' },
  { id: 'seoulwin', set: 'kdrama', kind: 'decor', place: 'wall', name: 'Seoul night window', price: 500, desc: 'City lights and a tower on the hill.' },
  { id: 'kimchi', set: 'kdrama', kind: 'decor', place: 'floor', size: 'S', name: 'Kimchi jars', price: 250, desc: 'Three glazed onggi jars.' },
  { id: 'foodcart', set: 'kdrama', kind: 'decor', place: 'floor', size: 'L', name: 'Street food cart', price: 1000, lv: 3, desc: 'Tteokbokki and fish cakes, steaming hot.' },
  { id: 'hanbok', set: 'kdrama', kind: 'wear', slot: 'outfit', name: 'Hanbok', price: 700, desc: 'A soft pastel hanbok with a red ribbon.' },
  { id: 'uniform', set: 'kdrama', kind: 'wear', slot: 'outfit', name: 'School uniform', price: 500, desc: 'Navy blazer with a red tie, straight from a high-school drama.' },
  { id: 'coat', set: 'kdrama', kind: 'wear', slot: 'outfit', name: 'Long winter coat', price: 600, desc: 'For dramatic walks in the first snow.' },
  { id: 'catears', set: 'kdrama', kind: 'wear', slot: 'hat', name: 'Cat-ear hairband', price: 200, desc: 'Cute and a little bit dramatic.' },
  { id: 'firstsnow', set: 'kdrama', kind: 'decor', place: 'ceil', name: 'First snow', price: 800, desc: 'Snow falls outside every window.' },
  { id: 'polaroids', set: 'kdrama', kind: 'decor', place: 'wall', name: 'Polaroid wall', price: 400, desc: 'A polaroid appears for every book you finish.' },
  { id: 'th_spring', set: 'kdrama', kind: 'theme', theme: 'spring', name: 'Spring Day reader theme', price: 350, desc: 'Soft pink pages with drifting petals.' },
  // Wizard school
  { id: 'wizhat', set: 'wizard', kind: 'wear', slot: 'hat', name: 'Wizard hat', price: 350, desc: 'Pointy, starry and slightly crooked.' },
  { id: 'robe', set: 'wizard', kind: 'wear', slot: 'outfit', name: 'Wizard robe', price: 500, desc: 'A school robe with a red tie.' },
  { id: 'hscarf', set: 'wizard', kind: 'wear', slot: 'neck', name: 'House scarf', price: 250, variants: 4, desc: 'Choose any of four house colors.' },
  { id: 'wizglasses', set: 'wizard', kind: 'wear', slot: 'face', name: 'Round gold glasses', price: 150, desc: 'Perfectly round.' },
  { id: 'scar', set: 'wizard', kind: 'wear', slot: 'mark', name: 'Lightning mark', price: 100, desc: 'A tiny lightning bolt on the forehead.' },
  { id: 'wand', set: 'wizard', kind: 'wear', slot: 'hand', name: 'Magic wand', price: 300, desc: 'Leaves a trail of sparkles when you walk.' },
  { id: 'candles', set: 'wizard', kind: 'decor', place: 'ceil', name: 'Floating candles', price: 600, desc: 'Candles drift in the air of every room.' },
  { id: 'owl', set: 'wizard', kind: 'pet', name: 'Owl', price: 800, desc: 'Sits on your first shelf and delivers a letter when you level up.' },
  { id: 'portraits', set: 'wizard', kind: 'decor', place: 'wall', name: 'Moving portraits', price: 500, desc: 'They blink and watch you read.' },
  { id: 'potions', set: 'wizard', kind: 'decor', place: 'floor', size: 'S', name: 'Potion shelf', price: 450, desc: 'Bubbling bottles in every color.' },
  { id: 'th_spell', set: 'wizard', kind: 'theme', theme: 'spell', name: 'Spellbook reader theme', price: 350, desc: 'Old parchment pages in candlelight.' },
  // Wydad
  { id: 'wscarf', set: 'wydad', kind: 'wear', slot: 'neck', name: 'Red & white scarf', price: 250, desc: 'For match days, and reading days.' },
  { id: 'jersey', set: 'wydad', kind: 'wear', slot: 'outfit', name: 'Red jersey', price: 400, desc: 'Red with white stripes.' },
  { id: 'tifo', set: 'wydad', kind: 'decor', place: 'wall', name: 'Red & white banner', price: 450, desc: 'A big striped banner from the stands.' },
  { id: 'drum', set: 'wydad', kind: 'decor', place: 'floor', size: 'S', name: 'Ultras drum', price: 350, desc: 'Walk up and press E to play it.' },
  { id: 'football', set: 'wydad', kind: 'decor', place: 'free', name: 'Football', price: 200, desc: 'Walk into it to kick it around the library.' },
  { id: 'stadiumwin', set: 'wydad', kind: 'decor', place: 'wall', name: 'Stadium lights window', price: 500, desc: 'A view of the stands under the floodlights.' },
  { id: 'teacorner', set: 'wydad', kind: 'decor', place: 'floor', size: 'L', name: 'Moroccan tea corner', price: 700, desc: 'Mint tea, a brass lantern and a patterned rug.' },
  // Pets
  { id: 'cat', set: 'pets', kind: 'pet', name: 'Kitten', price: 100, desc: 'Feed it by reading: every 10 minutes earns a fish treat.' },
  { id: 'catbed', set: 'pets', kind: 'decor', place: 'fixed', name: 'Cat bed', price: 250, needs: 'cat', desc: 'A round cushion where your cat naps.' },
  { id: 'catbow', set: 'pets', kind: 'catacc', slot: 'bow', name: 'Bow for your cat', price: 100, needs: 'cat', desc: 'A pink bow.' },
  { id: 'catwizhat', set: 'pets', kind: 'catacc', slot: 'hat', name: 'Tiny wizard hat (cat)', price: 200, needs: 'cat', desc: 'Your cat goes to wizard school.' },
  { id: 'catscarf', set: 'pets', kind: 'catacc', slot: 'scarf', name: 'Red & white cat scarf', price: 150, needs: 'cat', desc: 'Match-day cat.' },
  // Mystery
  { id: 'mystery', set: 'mystery', kind: 'mystery', name: 'Mystery box', price: 100, desc: 'A random item you don\'t own yet, worth up to 500 coins.' }
];
const itemById = id => ITEMS.find(i => i.id === id);

/* ---------- decoration drawers ----------
   wall:  (g, x = spot center, y = top of the wall area, t)
   floor: (g, x = center, by = floor line, t)                         */
function heartShape(g, cx, y, c) {
  R(g, OL, cx - 5, y - 1, 4, 2); R(g, OL, cx + 1, y - 1, 4, 2); R(g, OL, cx - 6, y, 12, 4); R(g, OL, cx - 5, y + 4, 10, 2); R(g, OL, cx - 3, y + 6, 6, 2); R(g, OL, cx - 1, y + 8, 2, 1);
  R(g, c, cx - 4, y, 3, 1); R(g, c, cx + 1, y, 3, 1); R(g, c, cx - 5, y + 1, 10, 3); R(g, c, cx - 4, y + 4, 8, 1); R(g, c, cx - 2, y + 5, 4, 2); R(g, CREAM, cx - 3, y + 1, 1, 1);
}
const petalsByKey = {};
const DECOR_DRAW = {
  posters(g, x, y) {
    const cols = ['#c9a4c8', '#e6a3b4', '#8fa8bf', '#a8b08a', '#e0b86a', '#eaa0a0', '#9a7fa0'];
    const sp = [[-19, 2], [-6, 0], [7, 2], [-19, 21], [-6, 19], [7, 21], [-6, 38]];
    cols.forEach((c, i) => { const px = x + sp[i][0], py = y + sp[i][1]; R(g, OL, px - 1, py - 1, 12, 16); R(g, c, px, py, 10, 14); R(g, shade(c, -0.3), px + 3, py + 3, 4, 4); R(g, shade(c, -0.3), px + 2, py + 8, 6, 5); R(g, CREAM, px + 8, py + 1, 1, 1); R(g, shade(c, 0.45), px + 1, py + 12, 8, 1); });
  },
  mirror(g, x, y) {
    R(g, OL, x - 16, y + 2, 32, 58); R(g, '#c9a46a', x - 15, y + 3, 30, 56); R(g, '#e8f0f2', x - 12, y + 6, 24, 50);
    R(g, '#f8fbfc', x - 8, y + 10, 2, 12); R(g, '#f8fbfc', x - 5, y + 8, 1, 6); R(g, '#d6e3e8', x - 12, y + 46, 24, 10);
  },
  tifo(g, x, y) {
    const x0 = x - 17, y0 = y + 2, w = 34, hh = 54; R(g, OL, x0 - 1, y0 - 1, w + 2, hh + 2);
    for (let i = 0; i < hh; i += 6) R(g, (i / 6) % 2 ? '#f6efe9' : '#d0575a', x0, y0 + i, w, Math.min(6, hh - i));
    R(g, '#d0575a', x0 + 8, y0 + 19, 18, 16); R(g, '#f6efe9', x0 + 16, y0 + 21, 2, 12); R(g, '#f6efe9', x0 + 11, y0 + 26, 12, 2);
    R(g, '#f6efe9', x0 + 13, y0 + 23, 2, 2); R(g, '#f6efe9', x0 + 19, y0 + 23, 2, 2); R(g, '#f6efe9', x0 + 13, y0 + 29, 2, 2); R(g, '#f6efe9', x0 + 19, y0 + 29, 2, 2);
    R(g, OL, x0 + 4, y0 + hh + 1, 1, 3); R(g, OL, x0 + w - 5, y0 + hh + 1, 1, 3);
  },
  seoulwin(g, x, y, t) {
    const x0 = x - 21, y0 = y + 8; R(g, OL, x0 - 1, y0 - 1, 44, 36); R(g, '#9b7a67', x0, y0, 42, 34); R(g, '#3e4a6e', x0 + 3, y0 + 3, 36, 28);
    for (let i = 0; i < 6; i++) R(g, '#f6efe9', x0 + 5 + i * 6, y0 + 5 + (i * 7) % 9, 1, 1);
    R(g, '#2a3050', x0 + 25, y0 + 9, 2, 20); R(g, '#2a3050', x0 + 23, y0 + 13, 6, 3); R(g, '#f2d36b', x0 + 25, y0 + 8, 2, 1);
    [10, 14, 8, 12, 16, 9, 11].forEach((hh, i) => { R(g, '#2a3050', x0 + 3 + i * 5, y0 + 31 - hh, 5, hh); for (let k = 0; k < hh - 3; k += 3) if ((i * 7 + k) % 4) R(g, Math.sin(t * 0.5 + i + k) > -0.6 ? '#f2d36b' : '#4a5680', x0 + 4 + i * 5, y0 + 33 - hh + k, 1, 1); });
    R(g, OL, x0 - 2, y0 + 34, 46, 3);
  },
  stadiumwin(g, x, y, t) {
    const x0 = x - 21, y0 = y + 8; R(g, OL, x0 - 1, y0 - 1, 44, 36); R(g, '#9b7a67', x0, y0, 42, 34); R(g, '#28304a', x0 + 3, y0 + 3, 36, 28);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 18; i++) R(g, (i + r) % 2 ? '#d0575a' : '#f6efe9', x0 + 4 + i * 2, y0 + 14 + r * 3, 1, 2);
    R(g, '#4f8a5a', x0 + 3, y0 + 24, 36, 7); R(g, '#f6efe9', x0 + 20, y0 + 24, 1, 7);
    for (const lx of [x0 + 7, x0 + 33]) { R(g, '#c9c0c8', lx, y0 + 5, 3, 2); if (typeof glow === 'function') glow(lx + 1, y0 + 6, 12, '255,250,220', 0.3 + Math.sin(t * 2) * 0.05); }
    R(g, OL, x0 - 2, y0 + 34, 46, 3);
  },
  polaroids(g, x, y) {
    const done = S.books.filter(b => b.finished).slice(-9);
    for (let i = 0; i < 9; i++) {
      const c = i % 3, r = Math.floor(i / 3), px = x - 19 + c * 13, py = y + 6 + r * 17 + (c % 2) * 2, b = done[i];
      R(g, OL, px - 1, py - 1, 12, 15); R(g, b ? CREAM : '#efe4dc', px, py, 10, 13); if (b) { R(g, b.color, px + 1, py + 1, 8, 8); R(g, shade(b.color, 0.4), px + 2, py + 2, 3, 2); }
      R(g, '#d98e9a', px + 4, py - 2, 2, 2);
    }
  },
  portraits(g, x, y, t) {
    [[-12, '#7f97a8', '#e8c4a8', '#5a3825'], [12, '#a66f60', '#f0d2b8', '#c9a46a']].forEach(([dx, bgc, sk, hc], i) => {
      const px = x + dx - 8, py = y + 10 + i * 4; R(g, OL, px - 2, py - 2, 20, 24); R(g, '#c9a46a', px - 1, py - 1, 18, 22); R(g, bgc, px + 1, py + 1, 14, 18);
      R(g, sk, px + 4, py + 4, 8, 7); R(g, hc, px + 3, py + 2, 10, 3); R(g, shade(bgc, -0.3), px + 3, py + 11, 10, 8);
      const blink = ((t + i * 1.7) % 4) < 0.15, look = Math.sin(t * 0.7 + i) > 0 ? 1 : 0;
      if (blink) { R(g, COL, px + 5, py + 7, 2, 1); R(g, COL, px + 9, py + 7, 2, 1); } else { R(g, COL, px + 5 + look, py + 7, 1, 1); R(g, COL, px + 9 + look, py + 7, 1, 1); }
    });
  },
  balloons(g, x, by, t) {
    R(g, OL, x - 3, by - 4, 6, 4); R(g, '#c9a4c8', x - 2, by - 3, 4, 3);
    [[-8, -46, '#9b74d6'], [0, -56, '#c9a4c8'], [8, -42, '#e6a3b4']].forEach(([dx, dy, c], i) => {
      const bx = x + dx + Math.round(Math.sin(t * 1.2 + i) * 1.5), bY = by + dy + Math.round(Math.sin(t * 1.6 + i * 2));
      const len = by - 4 - (bY + 9); for (let k = 0; k < len; k += 2) R(g, '#9b7a67', Math.round(lerp(x, bx, k / len)), by - 4 - k, 1, 2);
      heartShape(g, bx, bY, c);
    });
  },
  stagecorner(g, x, by, t) {
    R(g, OL, x - 37, by - 13, 74, 13); R(g, '#4e4656', x - 36, by - 12, 72, 11); R(g, '#6a6070', x - 36, by - 12, 72, 2);
    for (let i = 4; i < 72; i += 10) R(g, '#3e3746', x - 36 + i, by - 9, 1, 8);
    for (const dx of [-32, 23]) { R(g, OL, dx + x - 1, by - 32, 11, 20); R(g, '#3a3340', dx + x, by - 31, 9, 18); R(g, '#5a5260', dx + x + 2, by - 28, 5, 5); R(g, '#5a5260', dx + x + 2, by - 21, 5, 5); }
    R(g, OL, x - 1, by - 36, 2, 24); R(g, OL, x - 5, by - 13, 10, 1); R(g, '#c9c0c8', x - 2, by - 40, 4, 5); R(g, '#8a8090', x - 2, by - 37, 4, 1);
    const sw = Math.sin(t * 1.3) * 10;
    if (typeof glow === 'function') { glow(x - 20 + sw, by - 16, 26, '180,140,255', 0.22); glow(x + 20 - sw, by - 16, 26, '230,163,180', 0.18); }
  },
  konbini(g, x, by, t) {
    x -= 10; R(g, OL, x + 17, by - 58, 2, 44); R(g, OL, x - 8, by - 66, 56, 10); for (let i = 0; i < 54; i += 9) R(g, (i / 9) % 2 ? '#f6efe9' : '#6faa7e', x - 7 + i, by - 65, Math.min(9, 54 - i), 8);
    R(g, OL, x - 1, by - 15, 40, 12); R(g, '#6faa7e', x, by - 14, 38, 8); R(g, '#8ec49b', x + 1, by - 14, 36, 2); R(g, OL, x + 3, by - 3, 3, 3); R(g, OL, x + 32, by - 3, 3, 3);
    R(g, OL, x + 6, by - 22, 14, 9); R(g, '#e8a050', x + 7, by - 21, 12, 7); R(g, '#f2d36b', x + 8, by - 21, 10, 2); R(g, OL, x + 4, by - 20, 2, 1); R(g, OL, x + 20, by - 20, 2, 1);
    for (let i = 0; i < 3; i++) { const k = (t * 0.6 + i / 3) % 1; g.globalAlpha = 0.6 * (1 - k); R(g, CREAM, x + 9 + i * 3 + Math.sin(t * 3 + i) * 1.5, by - 25 - k * 14, 1, 3); g.globalAlpha = 1; }
    R(g, OL, x + 25, by - 22, 7, 9); R(g, '#f2d36b', x + 26, by - 21, 5, 8); R(g, CREAM, x + 26, by - 22, 5, 1);
    for (const [sx, c] of [[x - 16, '#d0575a'], [x + 42, '#7f97a8']]) { R(g, OL, sx - 1, by - 9, 12, 4); R(g, c, sx, by - 8, 10, 2); R(g, c, sx + 1, by - 6, 2, 6); R(g, c, sx + 7, by - 6, 2, 6); }
  },
  foodcart(g, x, by, t) {
    R(g, OL, x - 29, by - 52, 58, 9); for (let i = 0; i < 56; i += 8) R(g, (i / 8) % 2 ? '#f6efe9' : '#e8885a', x - 28 + i, by - 51, Math.min(8, 56 - i), 7);
    R(g, OL, x - 26, by - 44, 2, 22); R(g, OL, x + 24, by - 44, 2, 22);
    R(g, OL, x - 28, by - 24, 56, 18); R(g, '#c98a7a', x - 27, by - 23, 54, 16); R(g, '#b5705f', x - 27, by - 12, 54, 2);
    R(g, OL, x - 22, by - 29, 26, 6); R(g, '#8a8090', x - 21, by - 28, 24, 4); for (let i = 0; i < 6; i++) R(g, '#d0575a', x - 19 + i * 4, by - 29, 3, 2);
    for (let i = 0; i < 3; i++) { R(g, '#9b7a67', x + 9 + i * 5, by - 38, 1, 10); R(g, '#e8c78a', x + 8 + i * 5, by - 36, 3, 5); }
    for (let i = 0; i < 3; i++) { const k = (t * 0.5 + i / 3) % 1; g.globalAlpha = 0.55 * (1 - k); R(g, CREAM, x - 16 + i * 6 + Math.sin(t * 2 + i) * 2, by - 33 - k * 14, 1, 3); g.globalAlpha = 1; }
    for (const wx of [x - 18, x + 14]) { R(g, OL, wx - 1, by - 7, 8, 7); R(g, '#6f584f', wx, by - 6, 6, 5); R(g, '#c3a492', wx + 2, by - 4, 2, 2); }
  },
  blossom(g, x, by, t, dt) {
    R(g, OL, x - 7, by - 12, 15, 12); R(g, '#c98a7a', x - 6, by - 11, 13, 11); R(g, '#8a6a58', x - 1, by - 34, 3, 22);
    for (const [ox, oy, r] of [[-9, -44, 8], [6, -46, 9], [-1, -54, 8], [-11, -36, 5], [10, -38, 6]]) { R(g, OL, x + ox - r - 1, by + oy - r / 2 - 1, r * 2 + 2, r + 2); R(g, '#eab3c0', x + ox - r, by + oy - r / 2, r * 2, r); R(g, '#f6d2da', x + ox - r + 2, by + oy - r / 2, r * 2 - 6, 2); }
    const ps = petalsByKey[x] ||= Array.from({ length: 12 }, () => ({ x: 0, y: 0, l: 0 }));
    for (const p of ps) { if (p.l <= 0) { p.x = x - 16 + Math.random() * 32; p.y = by - 58; p.l = 2 + Math.random() * 2; } p.l -= dt || 0.016; p.y += 16 * (dt || 0.016); p.x += Math.sin(t * 2 + p.l * 3) * 0.3; if (p.y < by) R(g, '#f6d2da', p.x, p.y, 1, 1); }
  },
  kimchi(g, x, by) {
    for (const [dx, w, hh] of [[-14, 12, 14], [0, 14, 18], [13, 10, 11]]) { const px = x + dx - w / 2; R(g, OL, px - 1, by - hh - 1, w + 2, hh + 1); R(g, '#7a5040', px, by - hh, w, hh); R(g, '#9a6a55', px + 1, by - hh + 2, 2, hh - 4); R(g, OL, px + 1, by - hh - 3, w - 2, 3); R(g, '#6a4434', px + 2, by - hh - 2, w - 4, 1); }
  },
  potions(g, x, by, t) {
    R(g, OL, x - 15, by - 36, 30, 36); R(g, '#7e5f4e', x - 14, by - 35, 28, 34); R(g, '#523b30', x - 12, by - 33, 24, 13); R(g, '#523b30', x - 12, by - 17, 24, 13);
    const cols = ['#9b74d6', '#6faa7e', '#d0575a', '#7f97a8', '#e0b86a', '#e6a3b4'];
    cols.forEach((c, i) => { const r = Math.floor(i / 3), px = x - 10 + (i % 3) * 8, py = by - 22 + r * 16; R(g, OL, px - 1, py - 8, 6, 9); R(g, c, px, py - 6, 4, 6); R(g, shade(c, 0.4), px, py - 6, 1, 3); R(g, '#c9a46a', px + 1, py - 9, 2, 2); const k = (t * 0.8 + i * 0.3) % 1; if (k < 0.6) R(g, CREAM, px + 1 + (i % 2), py - 6 - k * 8, 1, 1); });
  },
  drum(g, x, by, t, dt, hit) {
    const b = hit ? 1 : 0;
    R(g, OL, x - 2, by - 6, 4, 6); R(g, OL, x - 11, by - 25 + b, 22, 19); R(g, '#d0575a', x - 10, by - 24 + b, 20, 17);
    for (let i = 0; i < 20; i += 4) R(g, '#f6efe9', x - 10 + i, by - 24 + b, 2, 17);
    R(g, '#f2ece4', x - 10, by - 25 + b, 20, 3); R(g, '#c9a46a', x - 10, by - 10 + b, 20, 1);
    R(g, OL, x + 6, by - 33 + (hit ? 4 : 0), 2, 9); R(g, '#f2ece4', x + 5, by - 34 + (hit ? 4 : 0), 4, 2);
  },
  teacorner(g, x, by, t) {
    R(g, OL, x - 33, by - 12, 66, 12); R(g, '#b5504a', x - 32, by - 11, 64, 10);
    for (let i = 0; i < 64; i += 8) { R(g, '#e0b86a', x - 30 + i, by - 9, 4, 2); R(g, '#2f5a6a', x - 28 + i, by - 6, 2, 2); }
    R(g, '#e0b86a', x - 32, by - 11, 64, 1); R(g, '#e0b86a', x - 32, by - 2, 64, 1);
    R(g, OL, x - 10, by - 17, 22, 7); R(g, '#c9a46a', x - 9, by - 16, 20, 4); R(g, '#a8854e', x - 9, by - 13, 20, 1);
    R(g, OL, x - 6, by - 26, 9, 10); R(g, '#d8d0c8', x - 5, by - 25, 7, 8); R(g, OL, x + 3, by - 24, 3, 2); R(g, '#c9a46a', x - 3, by - 28, 3, 3);
    for (const gx of [x + 6, x + 9]) { R(g, OL, gx - 1, by - 22, 4, 6); R(g, '#a8d0a0', gx, by - 21, 2, 4); }
    R(g, OL, x + 22, by - 40, 2, 30); R(g, OL, x + 17, by - 30, 12, 14); R(g, '#c9a46a', x + 18, by - 29, 10, 12); R(g, '#f6dd8a', x + 20, by - 26, 2, 6); R(g, '#f6dd8a', x + 24, by - 26, 2, 6); R(g, OL, x + 20, by - 32, 6, 2);
    if (typeof glow === 'function') glow(x + 23, by - 23, 26, '255,200,110', 0.25 + Math.sin(t * 3) * 0.03);
    R(g, OL, x - 30, by - 16, 14, 8); R(g, '#e8885a', x - 29, by - 15, 12, 6); R(g, '#f2b25a', x - 29, by - 15, 12, 2);
  },
  catbed(g, x, by) { R(g, OL, x - 13, by - 8, 26, 8); R(g, '#c9a4c8', x - 12, by - 7, 24, 6); R(g, '#e6d3e6', x - 9, by - 6, 18, 3); R(g, OL, x - 13, by - 1, 26, 1); }
};
function drawCeilDecor(g, id, t, x0, x1) {
  if (id === 'fairylights') {
    for (let x = Math.floor(x0); x < x1; x++) {
      const y = 9 + Math.round(Math.sin(Math.PI * ((((x % 64) + 64) % 64) / 64)) * 6); R(g, '#9b7a67', x, y, 1, 1);
      if (((x % 8) + 8) % 8 === 4) { const c = ['#c9b2e6', '#eab3c0', '#b49ad6', '#f6efe9'][((x >> 3) % 4 + 4) % 4]; const on = Math.sin(t * 3 + x) > -0.3; R(g, OL, x - 1, y, 4, 4); R(g, on ? c : shade(c, -0.25), x, y + 1, 2, 2); }
    }
  } else if (id === 'candles') {
    for (let x = Math.floor(x0 / 70) * 70 + 35; x < x1; x += 70) { const i = x / 70, y = 30 + Math.round(Math.sin(t * 1.5 + i) * 2); R(g, OL, x - 1, y - 1, 4, 9); R(g, CREAM, x, y, 2, 7); const fl = Math.sin(t * 12 + i) > 0 ? 1 : 0; R(g, '#f2a33a', x, y - 3 - fl, 2, 2 + fl); R(g, '#fbe39a', x, y - 2, 1, 1); if (typeof glow === 'function') glow(x + 1, y - 2, 14, '255,200,110', 0.3); }
  } else if (id === 'stars7') {
    const pts = [[30, 14], [62, 22], [96, 12], [134, 20], [170, 11], [206, 19], [238, 13]];
    for (let base = Math.floor(x0 / 360) * 360; base < x1; base += 360) {
      g.globalAlpha = 0.35; for (let i = 0; i < 6; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1]; for (let k = 0; k < 1; k += 0.08) R(g, '#c9b2e6', base + 60 + lerp(ax, bx, k), lerp(ay, by, k), 1, 1); } g.globalAlpha = 1;
      pts.forEach(([px, py], i) => { const x = base + 60 + px, tw = (Math.sin(t * 2 + i) + 1) / 2; R(g, '#9b74d6', x - 1, py, 3, 1); R(g, '#9b74d6', x, py - 1, 1, 3); R(g, tw > 0.5 ? '#f1e9ff' : '#c9b2e6', x, py, 1, 1); if (typeof glow === 'function') glow(x, py, 9, '180,140,255', 0.15 + tw * 0.15); });
    }
  }
}

/* ---------- shop icons ---------- */
function itemIcon(item, look, eq) {
  const key = 'item:' + item.id + (item.kind === 'wear' ? JSON.stringify(look) : '');
  return cached(key, () => {
    const cv = mkCanvas(80, 72), g = cv.getContext('2d');
    if (item.kind === 'wear') { const e = { ...(eq || {}) }; e[item.slot] = item.id === 'wizglasses' ? 'wizglasses' : item.id === 'scar' ? 'scar' : item.id; if (item.slot === 'hat') e.hat = item.id; const spr = charFrame(look, e, 0, 0, 'walk'); g.imageSmoothingEnabled = false; g.drawImage(spr, 18, 2, 44, 62); }
    else if (item.kind === 'decor') {
      const tt = 1.2;
      if (item.place === 'wall') DECOR_DRAW[item.id](g, 40, 4, tt);
      else if (item.place === 'ceil') { if (item.id === 'firstsnow') { R(g, OL, 19, 9, 42, 52); R(g, '#9b7a67', 20, 10, 40, 50); R(g, '#b9c8d8', 23, 13, 34, 44); for (let i = 0; i < 14; i++) R(g, CREAM, 24 + (i * 11) % 32, 15 + (i * 7) % 40, 1, 1); R(g, CREAM, 23, 52, 34, 5); } else { g.save(); g.translate(-10, 10); drawCeilDecor(g, item.id, tt, 10, 90); g.restore(); if (item.id === 'stars7') { g.clearRect(0, 0, 80, 72); g.save(); g.translate(-110, 18); drawCeilDecor(g, 'stars7', tt, 0, 360); g.restore(); } } }
      else if (item.id === 'football') { R(g, OL, 31, 46, 18, 18); R(g, '#f6efe9', 32, 47, 16, 16); R(g, '#d0575a', 36, 52, 6, 6); R(g, OL, 38, 54, 2, 2); R(g, '#d0575a', 32, 60, 16, 2); }
      else if (item.id === 'catbed') { DECOR_DRAW.catbed(g, 40, 62); g.drawImage(catFrame('orange', 'sleep', 0, false), 25, 36); }
      else DECOR_DRAW[item.id](g, 40, 68, tt, 0.016);
    }
    else if (item.kind === 'theme') {
      const th = { purple: ['#2c2440', '#c9b2e6', '#4e3a6e'], spring: ['#fff1f3', '#d98e9a', '#e6a3b4'], spell: ['#ecd9b0', '#6e4a3a', '#7a4a3a'] }[item.theme];
      R(g, OL, 12, 16, 56, 40); R(g, th[2], 13, 17, 54, 38); R(g, th[0], 16, 20, 23, 32); R(g, th[0], 41, 20, 23, 32); R(g, shade(th[0], -0.15), 39, 20, 2, 32);
      for (let i = 0; i < 6; i++) { R(g, th[1], 19, 25 + i * 4, 16 - (i % 3) * 3, 1); R(g, th[1], 44, 25 + i * 4, 17 - (i % 2) * 4, 1); }
      if (item.theme === 'spring') for (let i = 0; i < 5; i++) R(g, '#eab3c0', 18 + i * 11, 18 + (i * 13) % 34, 2, 2);
      if (item.theme === 'spell') { R(g, '#f2a33a', 63, 8, 2, 3); R(g, CREAM, 63, 11, 2, 6); }
    }
    else if (item.id === 'cat') g.drawImage(catFrame('orange', 'sit', 0, false), 23, 40, 34, 28);
    else if (item.id === 'owl') { g.save(); g.translate(28, 56); g.scale(2, 2); drawOwl(g, 0, 0, 1); g.restore(); }
    else if (item.kind === 'catacc') { const acc = { bow: item.slot === 'bow', hat: item.slot === 'hat', scarf: item.slot === 'scarf' }; g.drawImage(catFrame('orange', 'sit', 0, false, acc), 6, 16, 68, 56); }
    else if (item.kind === 'hair') { R(g, OL, 24, 14, 32, 48); R(g, HAIR_PURPLE, 25, 15, 30, 46); R(g, shade(HAIR_PURPLE, 0.3), 29, 18, 4, 30); R(g, shade(HAIR_PURPLE, -0.2), 47, 18, 4, 40); }
    else if (item.kind === 'mystery') { R(g, OL, 20, 26, 40, 34); R(g, '#c9a4c8', 21, 27, 38, 32); R(g, OL, 18, 20, 44, 9); R(g, '#d98e9a', 19, 21, 42, 7); R(g, '#e8c25a', 37, 21, 6, 38); R(g, '#e8c25a', 32, 12, 6, 8); R(g, '#e8c25a', 42, 12, 6, 8); R(g, COL, 38, 36, 4, 2); R(g, COL, 39, 40, 2, 6); }
    return cv;
  });
}
