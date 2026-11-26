'use strict';
/* Dokseo: screens, menus, the shop, stats, settings and everything you click. */
const UI = (() => {
  let screen = 'menu';
  const SCREENS = ['menu', 'creator', 'stats', 'settings', 'shop'];
  const isTouch = matchMedia('(hover: none)').matches;
  const CATEGORY_IDEAS = ['Novels', 'Fantasy', 'Romance', 'Mystery', 'Self-help', 'Study', 'History', 'Science', 'Poetry', 'Comics', 'Korean', 'Classics', 'Favorites', 'To read'];

  /* ---------- screens ---------- */
  function show(name) {
    screen = name;
    for (const s of SCREENS) $('#screen-' + s).classList.toggle('hidden', s !== name);
    const inGame = name === 'game';
    $('#hud').classList.toggle('hidden', !inGame);
    $('#touch').classList.toggle('hidden', !(inGame && isTouch));
    document.body.dataset.screen = name;
    syncWorld();
    if (inGame) refreshHUD();
  }
  function syncWorld() { World.setActive(screen === 'game' && !Reader.isOpen && !modalCount && !$('#popover:not(.hidden)')); }

  /* ---------- modals ---------- */
  let modalCount = 0;
  function modal({ title, body, buttons = [], wide = false, cls = '', onClose = null, dismiss = true }) {
    const back = h('div', { class: 'modal-back' });
    const box = h('div', { class: 'modal pix ' + (wide ? 'wide ' : '') + cls, role: 'dialog', 'aria-modal': 'true' });
    const close = () => { if (!back.isConnected) return; back.remove(); modalCount--; document.removeEventListener('keydown', onEsc, true); syncWorld(); onClose && onClose(); };
    const onEsc = e => { if (e.key === 'Escape' && dismiss && back === $('#modal-root').lastElementChild) { e.stopPropagation(); e.preventDefault(); close(); } };
    if (title) box.append(h('div', { class: 'mh' }, h('h2', { text: title }), dismiss ? h('button', { class: 'x', title: 'Close', onclick: close }, '×') : null));
    if (body) box.append(h('div', { class: 'mb' }, body));
    if (buttons.length) box.append(h('div', { class: 'mf' }, buttons.map(b => h('button', { class: 'btn ' + (b.cls || ''), onclick: async () => { sfx('click'); const r = b.onClick ? await b.onClick() : undefined; if (r !== false) close(); } }, b.text))));
    back.append(box); if (dismiss) back.addEventListener('mousedown', e => { if (e.target === back) close(); });
    $('#modal-root').append(back); modalCount++; document.addEventListener('keydown', onEsc, true); syncWorld();
    const first = box.querySelector('input, textarea, .mf .btn'); if (first && first.tagName !== 'BUTTON') setTimeout(() => first.focus(), 40);
    return { close, box };
  }
  function confirmBox(title, text, yes, onYes, danger) { return modal({ title, body: h('p', { text }), buttons: [{ text: yes, cls: danger ? 'danger' : 'gold', onClick: onYes }, { text: 'Cancel' }] }); }

  /* ---------- toasts & confetti ---------- */
  function toast(text, { icon = null, kind = '' } = {}) {
    const t = h('div', { class: 'toast ' + kind }, icon ? h('img', { src: iconURL(icon, 2), alt: '' }) : null, h('span', { text }));
    $('#toasts').append(t);
    setTimeout(() => t.classList.add('out'), 3200); setTimeout(() => t.remove(), 3700);
    while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove();
  }
  function confetti() {
    if (S.settings.reduceMotion) return;
    const cv = $('#fx'), g = cv.getContext('2d'); cv.width = innerWidth; cv.height = innerHeight; cv.style.display = 'block';
    const cols = ['#e8c25a', '#d98e9a', '#c9b2e6', '#a8d39b', '#9fc3e6', '#fbf8f4'];
    const ps = Array.from({ length: 140 }, () => ({ x: innerWidth / 2 + rnd(-80, 80), y: innerHeight * 0.45, vx: rnd(-7, 7), vy: rnd(-13, -4), s: Math.ceil(rnd(4, 9)), c: pick(cols), r: rnd(0, 6) }));
    let n = 0; const step = () => { g.clearRect(0, 0, cv.width, cv.height); for (const p of ps) { p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; g.fillStyle = p.c; g.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); } if (n++ < 160) requestAnimationFrame(step); else { cv.style.display = 'none'; } }; step();
  }

  /* ---------- HUD ---------- */
  function drawFace(cv) {
    if (!S.profile) return; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, cv.width, cv.height);
    const spr = charSprites(S.profile, S.equip || {}).walk[0][0]; g.drawImage(spr, 0, 0, 22, 20, 0, 0, 22, 20);
  }
  function refreshHUD() {
    if (!S.profile) return;
    $('#hud-name').textContent = S.profile.name; const lp = levelProgress();
    $('#hud-lv').textContent = `Level ${lp.L} · ${lp.cur}/${lp.need} XP`; $('#hud-xp').style.width = Math.round(lp.pct * 100) + '%';
    $('#hud-coins b').textContent = S.coins; drawFace($('#hud-face'));
    const qn = Quests.unclaimed(), badge = $('#hud-quests .badge'); badge.textContent = qn || ''; badge.classList.toggle('hidden', !qn);
    const catBox = $('#hud-cat');
    if (S.pet) {
      catBox.classList.remove('hidden'); const hg = Math.round(S.pet.hunger), mood = Pets.mood();
      catBox.title = `${S.pet.name}: ${mood === 'happy' ? 'happy and full' : mood === 'ok' ? 'doing fine' : 'hungry! Read to earn fish treats'} (${hg}%). Every 10 minutes of reading puts a fish treat in the bowl.`;
      catBox.querySelector('i').style.width = hg + '%'; catBox.classList.toggle('hungry', mood === 'hungry');
      const c = catBox.querySelector('canvas'), g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); g.imageSmoothingEnabled = false; g.drawImage(catSprite(S.pet.fur, mood === 'hungry' ? 'sad' : 'sit', 0, Pets.grown(), S.pet.acc), 0, 0);
      $('#hud-cat .nm').textContent = S.pet.name;
    } else catBox.classList.add('hidden');
    const st = streak(); $('#hud-streak').textContent = st; $('#hud-streak').parentElement.title = `${st}-day streak. Open Dokseo every day to keep it going.`;
  }
  function popover(anchor, build) {
    const p = $('#popover'); if (!p.classList.contains('hidden') && p._a === anchor) { closePopover(); return; }
    p.innerHTML = ''; p._a = anchor; build(p); p.classList.remove('hidden');
    const r = anchor.getBoundingClientRect(); p.style.top = r.bottom + 8 + 'px'; p.style.left = clamp(r.right - p.offsetWidth, 8, innerWidth - p.offsetWidth - 8) + 'px';
    syncWorld();
  }
  function closePopover() { $('#popover').classList.add('hidden'); syncWorld(); }
  function questsPopover(p) {
    Quests.ensure(); p.append(h('h3', { text: "Today's quests" }));
    S.quests.list.forEach((q, i) => {
      const d = Quests.def(q.id);
      p.append(h('div', { class: 'quest' + (q.claimed ? ' claimed' : '') }, h('div', { class: 'qt' }, h('span', { text: d.text }), h('span', { class: 'rw' }, h('img', { src: iconURL('coin', 1), alt: '' }), ' ' + d.reward)),
        h('div', { class: 'bar' }, h('i', { style: { width: Math.round(q.prog / d.goal * 100) + '%' } })),
        q.claimed ? h('div', { class: 'small', text: 'Claimed ✓' }) : q.done ? h('button', { class: 'btn gold sm', onclick: () => { Quests.claim(i); sfx('coin'); closePopover(); popover($('#hud-quests'), questsPopover); } }, 'Claim') : h('div', { class: 'small', text: `${q.prog} / ${d.goal}` })));
    });
    const d = today(), goal = S.settings.dailyGoal;
    p.append(h('h3', { text: 'Daily reading goal' }), h('div', { class: 'bar big' }, h('i', { style: { width: Math.min(100, Math.round(d.sec / 60 / goal * 100)) + '%' } })), h('div', { class: 'small', text: `${Math.floor(d.sec / 60)} of ${goal} minutes today${d.goal ? ' · done! +15 coins' : ''}` }));
    p.append(h('p', { class: 'small dim', text: 'New quests arrive every day.' }));
  }
  function viewPopover(p) {
    const filters = [['all', 'All books'], ['reading', 'Reading'], ['finished', 'Finished'], ['new', 'Not started'], ['want', 'Want to read']];
    const sorts = [['added', 'Date added'], ['title', 'Title A–Z'], ['progress', 'Progress'], ['color', 'Spine color'], ['recent', 'Recently opened']];
    p.append(h('h3', { text: 'Show' }), h('div', { class: 'chips' }, filters.map(([k, l]) => h('button', { class: 'chip' + (S.settings.filter === k ? ' on' : ''), onclick: () => { S.settings.filter = k; Store.save(); closePopover(); popover($('#hud-view'), viewPopover); } }, l))));
    p.append(h('h3', { text: 'Sort each shelf by' }), h('div', { class: 'chips' }, sorts.map(([k, l]) => h('button', { class: 'chip' + (S.settings.sort === k ? ' on' : ''), onclick: () => { S.settings.sort = k; Store.save(); closePopover(); popover($('#hud-view'), viewPopover); } }, l))));
    p.append(h('h3', { text: "Can't choose?" }), h('button', { class: 'btn', onclick: () => { closePopover(); bookWheel(); } }, 'Pick a book for me'));
  }

  /* ---------- menu ---------- */
  function initMenu() {
    $('#m-start').onclick = () => { Sound.init(); sfx('click'); if (!S.profile) openCreator(false); else enterGame(); };
    $('#m-stats').onclick = () => { Sound.init(); sfx('click'); showStats('overview'); };
    $('#m-settings').onclick = () => { Sound.init(); sfx('click'); showSettings(); };
    refreshMenu();
  }
  function refreshMenu() {
    $('#m-start').textContent = S.profile ? `Continue as ${S.profile.name}` : 'Start';
    $('#m-foot').textContent = `Version ${VERSION} · your books stay on this computer`;
    const st = streak();
    $('#m-streak').textContent = S.profile && st ? `🔥 ${st}-day streak` : '';
  }
  function enterGame() {
    show('game'); Sound.init(); if (!Reader.isOpen && S.settings.music > 0) Sound.startMusic();
    const bonus = markVisit();
    if (bonus) { addCoins(bonus, 'Daily visit'); toast(S.tutorialDone ? `Welcome back! ${streak()}-day streak · +${bonus} coins` : `Welcome to Dokseo! +${bonus} coins for your first visit`, { icon: 'coin' }); }
    else if (S.tutorialDone) { const mood = S.pet ? Pets.mood() : null; toast(mood === 'hungry' ? `${S.pet.name} is hungry. Read a little to earn fish treats!` : `Welcome back, ${S.profile.name}!`, { icon: mood === 'hungry' ? 'fish' : 'heart' }); }
    if (!S.tutorialDone) Tutorial.start();
    refreshHUD();
  }

  /* ---------- character creator ---------- */
  function openCreator(editing) {
    const look = S.profile ? { ...S.profile } : defaultLook('girl');
    let dir = 0, flip = false, touchedHair = !!S.profile;
    const root = $('#screen-creator'); root.innerHTML = '';
    const cv = h('canvas', { class: 'cr-preview', width: 22, height: 31 });
    const name = h('input', { type: 'text', maxlength: 14, placeholder: 'Your name', value: look.name || '', id: 'cr-name' });
    const rows = h('div', { class: 'cr-rows' });
    const swRow = (label, list, key) => h('div', { class: 'cr-row' }, h('span', { class: 'lbl', text: label }), h('div', { class: 'swatches' }, list.map(c => h('button', { class: 'sw' + (look[key] === c ? ' on' : ''), style: { background: c }, title: label, onclick: () => { look[key] = c; if (key === 'hair') touchedHair = true; draw(); } }))));
    const optRow = (label, opts, get, set) => h('div', { class: 'cr-row' }, h('span', { class: 'lbl', text: label }), h('div', { class: 'opts' }, opts.map((o, i) => h('button', { class: 'chip' + (get() === i ? ' on' : ''), onclick: () => { set(i); draw(); } }, o))));
    function draw() {
      rows.innerHTML = '';
      rows.append(
        h('div', { class: 'cr-row' }, h('span', { class: 'lbl', text: 'I am a' }), h('div', { class: 'opts' }, ['girl', 'boy'].map(gd => h('button', { class: 'chip' + (look.gender === gd ? ' on' : ''), onclick: () => { look.gender = gd; if (!touchedHair) { look.hairStyle = gd === 'boy' ? 3 : 0; look.outfit = gd === 'boy' ? OUTFITS[3] : OUTFITS[0]; } draw(); } }, gd === 'girl' ? 'Girl' : 'Boy')))),
        h('div', { class: 'cr-row' }, h('span', { class: 'lbl', text: 'Name' }), name),
        optRow('Hair', HAIR_STYLES, () => look.hairStyle, i => { look.hairStyle = i; touchedHair = true; }),
        swRow('Hair color', S.owned.hairpurple ? [...HAIRS, HAIR_PURPLE] : HAIRS, 'hair'),
        swRow('Skin', SKINS, 'skin'),
        swRow('Outfit', OUTFITS, 'outfit'),
        optRow('Eyes', EYE_STYLES, () => look.eyes, i => { look.eyes = i; }),
        h('div', { class: 'cr-row' }, h('span', { class: 'lbl', text: 'Glasses' }), h('div', { class: 'opts' }, h('button', { class: 'chip' + (!look.glasses ? ' on' : ''), onclick: () => { look.glasses = false; draw(); } }, 'No'), h('button', { class: 'chip' + (look.glasses ? ' on' : ''), onclick: () => { look.glasses = true; draw(); } }, 'Yes')))
      );
    }
    const turnBtn = (d) => h('button', { class: 'btn sm', onclick: () => { const order = [[0, false], [2, false], [1, false], [2, true]]; let i = order.findIndex(o => o[0] === dir && o[1] === flip); i = (i + d + 4) % 4; [dir, flip] = order[i]; } }, d < 0 ? '◀' : '▶');
    const save = h('button', { class: 'btn gold big', onclick: () => {
      look.name = name.value.trim(); if (!look.name) { name.classList.add('shake'); name.focus(); setTimeout(() => name.classList.remove('shake'), 500); toast('Please type a name for your character.'); return; }
      const first = !S.profile; S.profile = { ...look }; Store.save(); sfx('level');
      if (first) enterGame(); else { show(editing === 'settings' ? 'settings' : 'game'); toast('Looking good!'); }
    } }, S.profile ? 'Save' : "Let's read!");
    const back = h('button', { class: 'btn', onclick: () => show(S.profile ? (editing === 'settings' ? 'settings' : 'game') : 'menu') }, 'Back');
    root.append(h('div', { class: 'cr pix' }, h('h2', { text: S.profile ? 'Edit your character' : 'Create your character' }),
      h('div', { class: 'cr-body' }, h('div', { class: 'cr-left' }, h('div', { class: 'cr-stage' }, cv), h('div', { class: 'cr-turn' }, turnBtn(-1), h('span', { class: 'small', text: 'Turn' }), turnBtn(1))), rows),
      h('div', { class: 'cr-foot' }, back, save)));
    draw(); show('creator'); setTimeout(() => name.focus(), 50);
    const t0 = performance.now();
    (function loop() {
      if (screen !== 'creator' || !cv.isConnected) return;
      look.name = name.value;
      const g = cv.getContext('2d'); g.clearRect(0, 0, 22, 31);
      const sp = charSprites({ ...look, name: '' }, S.equip || {}), f = Math.floor((performance.now() - t0) / 170) % 4;
      g.save(); if (flip) { g.translate(22, 0); g.scale(-1, 1); } g.drawImage(sp.walk[dir][f], 0, 0); g.restore();
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- adding books ---------- */
  function pickFiles(shelf) { const inp = $('#file-input'); inp.value = ''; inp._shelf = shelf || null; inp.click(); }
  async function addFiles(files, preferShelf) {
    files = [...files].filter(f => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');
    if (!files.length) { toast('Please choose PDF files.'); return; }
    const entries = [];
    const wait = modal({ title: 'Reading your PDF…', body: h('p', { class: 'small', text: files.length > 1 ? `Looking at ${files.length} files.` : `Looking at "${files[0].name}".` }), dismiss: false });
    for (const f of files.slice(0, 20)) {
      try { const buf = await f.arrayBuffer(); const info = await Reader.inspect(buf, f.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim()); entries.push({ buf, info }); }
      catch (e) { console.warn(e); toast(`"${f.name}" could not be read as a PDF.`); }
    }
    wait.close();
    if (!entries.length) return;
    const spaceOf = sh => SHELF_CAP - shelfBooks(sh.id).length;
    const shelves = S.shelves.slice().sort((a, b) => a.slot - b.slot);
    if (!shelves.some(sh => spaceOf(sh) > 0)) { modal({ title: 'All shelves are full', body: h('p', { text: 'Build a new shelf in an empty spot (the dashed outlines), then add your books.' }), buttons: [{ text: 'OK', cls: 'gold' }] }); return; }
    const near = World.focus && World.focus.type === 'shelf' ? World.focus.shelf : null;
    const defShelf = (preferShelf && spaceOf(preferShelf) > 0 ? preferShelf : null) || (near && spaceOf(near) > 0 ? near : null) || shelves.find(sh => spaceOf(sh) > 0);
    const list = h('div', { class: 'addlist' });
    const rows = entries.map(en => {
      const title = h('input', { type: 'text', value: en.info.title, maxlength: 120, 'aria-label': 'Title' });
      const author = h('input', { type: 'text', value: en.info.author, maxlength: 80, placeholder: 'Author (optional)', 'aria-label': 'Author' });
      const sel = h('select', { 'aria-label': 'Shelf' }, shelves.map(sh => h('option', { value: sh.id, disabled: spaceOf(sh) <= 0 ? true : null, selected: sh === defShelf ? true : null }, `${sh.name} (${SHELF_CAP - spaceOf(sh)}/${SHELF_CAP})`)));
      const want = h('input', { type: 'checkbox' });
      const sw = h('span', { class: 'spine', style: { background: en.info.color } });
      list.append(h('div', { class: 'addrow' }, sw, h('div', { class: 'f' }, title, author, h('div', { class: 'r' }, h('label', {}, 'Shelf ', sel), h('label', { class: 'chk' }, want, 'Put on my want-to-read pile')), h('div', { class: 'small', text: `${en.info.pages} pages` }))));
      return { en, title, author, sel, want };
    });
    modal({
      title: entries.length > 1 ? `Add ${entries.length} books` : 'Add a book', wide: true, body: list,
      buttons: [{ text: 'Put on the shelf', cls: 'gold', onClick: async () => {
        const counts = {}; for (const r of rows) counts[r.sel.value] = (counts[r.sel.value] || 0) + 1;
        for (const [id, n] of Object.entries(counts)) { const sh = shelfById(id); if (spaceOf(sh) < n) { toast(`"${sh.name}" only has room for ${spaceOf(sh)} more.`); return false; } }
        const added = [];
        for (const [i, r] of rows.entries()) {
          const id = uid();
          try { await DB.put('pdfs', id, r.en.buf); } catch (e) { toast('Could not save the PDF. Your disk may be full.'); return; }
          const b = { id, title: r.title.value.trim() || r.en.info.title, author: r.author.value.trim(), pages: r.en.info.pages, color: r.en.info.color, h: 12 + (hash(id) % 4), shelf: r.sel.value, added: Date.now() + i, page: 1, maxPage: 1, sec: 0, highlights: [], bookmarks: [], want: r.want.checked };
          S.books.push(b); added.push(b); S.stats.booksAdded++; if (S.stats.booksAdded <= 30) addXP(10); Quests.progress('add');
        }
        Ach.checkBooks(); await Store.saveNow();
        show('game'); World.placeBooks(added);
      } }, { text: 'Cancel' }]
    });
  }

  /* ---------- shelves ---------- */
  function shelfModal(sh, slotIndex) {
    const building = !sh;
    const st = sh ? { ...sh } : { name: '', wood: 'oak', top: 'plant' };
    const cv = h('canvas', { class: 'shelf-prev', width: 64, height: 110 });
    const name = h('input', { type: 'text', maxlength: 20, value: st.name, placeholder: 'Category name' });
    const woods = h('div', { class: 'swatches' }), tops = h('div', { class: 'chips' });
    const render = () => {
      woods.innerHTML = ''; tops.innerHTML = '';
      for (const [k, w] of Object.entries(WOODS)) { const ok = S.level >= w.lv; woods.append(h('button', { class: 'sw wood' + (st.wood === k ? ' on' : '') + (ok ? '' : ' locked'), style: { background: w.m }, title: ok ? w.name : `${w.name}: unlocks at level ${w.lv}`, onclick: () => { if (!ok) { toast(`${w.name} unlocks at level ${w.lv}`); return; } st.wood = k; render(); } })); }
      for (const [k, d] of Object.entries(TOP_DECOS)) { const ok = S.level >= d.lv; tops.append(h('button', { class: 'chip' + (st.top === k ? ' on' : '') + (ok ? '' : ' locked'), title: ok ? '' : `Unlocks at level ${d.lv}`, onclick: () => { if (!ok) { toast(`${d.name} unlocks at level ${d.lv}`); return; } st.top = k; render(); } }, d.name + (ok ? '' : ' · Lv ' + d.lv))); }
      World.previewShelf(cv.getContext('2d'), st, sh ? shelfBooks(sh.id) : []);
    };
    const chips = h('div', { class: 'chips' }, CATEGORY_IDEAS.map(c => h('button', { class: 'chip sm', onclick: () => { name.value = c; } }, c)));
    const body = h('div', { class: 'shelfedit' }, h('div', { class: 'sp' }, cv), h('div', { class: 'f' }, h('h4', { text: 'Category' }), name, chips, h('h4', { text: 'Wood' }), woods, h('h4', { text: 'On top' }), tops));
    const buttons = [{ text: building ? 'Build shelf' : 'Save', cls: 'gold', onClick: () => {
      const nm = name.value.trim() || 'My shelf';
      if (building) { const nsh = { id: uid(), slot: slotIndex, name: nm, wood: st.wood, top: st.top }; S.shelves.push(nsh); S.stats.shelvesBuilt++; Ach.unlock('builder'); sfx('place'); toast(`New shelf: ${nm}`); }
      else Object.assign(sh, { name: nm, wood: st.wood, top: st.top });
      Store.save();
    } }];
    if (!building) buttons.push({ text: 'Remove shelf', cls: 'danger', onClick: () => {
      if (shelfBooks(sh.id).length) { toast('Move or remove the books on this shelf first.'); return false; }
      if (S.shelves.length <= 1) { toast('You need at least one shelf.'); return false; }
      S.shelves = S.shelves.filter(x => x !== sh); Store.save(); toast('Shelf removed.');
    } });
    buttons.push({ text: 'Cancel' });
    modal({ title: building ? 'Build a new shelf' : 'Edit shelf', body, buttons, wide: true });
    render(); for (const ev of ['input']) name.addEventListener(ev, () => {});
  }

  /* ---------- books ---------- */
  function bookMenu({ book: b, x, y }) {
    const m = $('#ctxmenu'); m.innerHTML = '';
    const item = (label, fn, cls) => m.append(h('button', { class: cls || '', onclick: () => { m.classList.add('hidden'); fn(); } }, label));
    item('Read', () => World.openBook(b));
    item('Details', () => bookDetails(b));
    item(b.want ? 'Remove from want-to-read' : 'Add to want-to-read pile', () => { b.want = !b.want; Store.save(); toast(b.want ? 'Added to your want-to-read pile.' : 'Removed from the pile.'); });
    item(b.finished ? 'Mark as not finished' : 'Mark as finished', () => { if (b.finished) { b.finished = false; Store.save(); } else journalModal(b, true); });
    item('Move to another shelf', () => moveBook(b));
    item('Rename', () => renameBook(b));
    item('Remove from library', () => removeBook(b), 'danger');
    m.classList.remove('hidden'); m.style.left = clamp(x, 4, innerWidth - m.offsetWidth - 4) + 'px'; m.style.top = clamp(y, 4, innerHeight - m.offsetHeight - 4) + 'px';
  }
  function bookDetails(b) {
    const sh = shelfById(b.shelf), st = bookStatus(b), hl = (b.highlights || []).filter(x => x.color !== 'quote').length, q = S.quotes.filter(x => x.bookId === b.id).length;
    const row = (k, v) => h('div', { class: 'drow' }, h('span', { text: k }), h('span', { text: v }));
    modal({
      title: b.title, body: h('div', { class: 'details' }, h('div', { class: 'spine big', style: { background: b.color } }), h('div', {},
        b.author ? row('Author', b.author) : null, row('Shelf', sh ? sh.name : '—'), row('Status', b.finished ? 'Finished ★' : st === 'reading' ? 'Reading' : 'Not started'),
        row('Progress', `Page ${b.page || 1} of ${b.pages} (${Math.round(bookPct(b) * 100)}%)`), row('Time read', fmtDur(b.sec)), row('Highlights', String(hl)), row('Quotes', String(q)), row('Bookmarks', String((b.bookmarks || []).length)),
        row('Added', fmtDate(b.added)), b.finishedAt ? row('Finished', fmtDate(b.finishedAt) + (b.rating ? ' · ' + '★'.repeat(b.rating) : '') + (b.mood ? ' ' + b.mood : '')) : null)),
      buttons: [{ text: 'Read', cls: 'gold', onClick: () => World.openBook(b) }, b.finished ? { text: 'Book journal', onClick: () => journalModal(b, false) } : null, { text: 'Close' }].filter(Boolean)
    });
  }
  function moveBook(b) {
    const list = h('div', { class: 'pick' });
    for (const sh of S.shelves.slice().sort((a, b2) => a.slot - b2.slot)) {
      const n = shelfBooks(sh.id).length, full = n >= SHELF_CAP && sh.id !== b.shelf;
      list.append(h('button', { class: 'btn' + (sh.id === b.shelf ? ' on' : ''), disabled: full ? true : null, onclick: () => { b.shelf = sh.id; Store.save(); m.close(); toast(`Moved to ${sh.name}`); } }, `${sh.name} (${n}/${SHELF_CAP})`));
    }
    const m = modal({ title: `Move "${b.title}"`, body: list, buttons: [{ text: 'Cancel' }] });
  }
  function renameBook(b) {
    const t = h('input', { type: 'text', value: b.title, maxlength: 120 }), a = h('input', { type: 'text', value: b.author || '', maxlength: 80, placeholder: 'Author' });
    modal({ title: 'Rename book', body: h('div', { class: 'stack' }, h('label', {}, 'Title', t), h('label', {}, 'Author', a)), buttons: [{ text: 'Save', cls: 'gold', onClick: () => { b.title = t.value.trim() || b.title; b.author = a.value.trim(); Store.save(); } }, { text: 'Cancel' }] });
  }
  function removeBook(b) {
    confirmBox('Remove this book?', `"${b.title}" will be removed from your library, along with its highlights and bookmarks. Your saved quotes stay in the Quote Journal.`, 'Remove', async () => {
      S.books = S.books.filter(x => x !== b); await DB.del('pdfs', b.id); Store.save(); toast('Book removed.');
    }, true);
  }
  function journalModal(b, finishing) {
    let rating = b.rating || 0, mood = b.mood || '';
    const stars = h('div', { class: 'stars' }), moods = h('div', { class: 'moods' });
    const MOODS = [['😍', 'Loved it'], ['😭', 'Made me cry'], ['🤯', 'Mind-blown'], ['😂', 'So funny'], ['🥰', 'Cozy'], ['😴', 'A bit slow'], ['💜', 'Purple heart']];
    const drawS = () => { stars.innerHTML = ''; for (let i = 1; i <= 5; i++) stars.append(h('button', { class: i <= rating ? 'on' : '', onclick: () => { rating = i; drawS(); } }, '★')); };
    const drawM = () => { moods.innerHTML = ''; for (const [m, l] of MOODS) moods.append(h('button', { class: mood === m ? 'on' : '', title: l, onclick: () => { mood = m; drawM(); } }, m)); };
    drawS(); drawM();
    const review = h('textarea', { rows: 4, maxlength: 3000, placeholder: 'What did you think? Only you can see this.', value: b.review || '' });
    modal({ title: finishing ? 'You finished a book!' : 'Book journal', body: h('div', { class: 'finish' }, h('p', {}, h('b', { text: b.title }), b.author ? ' by ' + b.author : ''), h('h4', { text: 'Your rating' }), stars, h('h4', { text: 'How did it make you feel?' }), moods, h('h4', { text: 'Short review' }), review),
      buttons: [{ text: finishing ? 'Finish book' : 'Save', cls: 'gold', onClick: () => { b.rating = rating; b.mood = mood; b.review = review.value.trim(); if (finishing && !b.finished) { b.finished = true; b.finishedAt = Date.now(); addXP(100); addCoins(50, 'Finished a book'); Ach.checkBooks(); confetti(); sfx('level'); } Store.save(); if (screen === 'stats') showStats('journal'); } }, { text: 'Cancel' }] });
  }
  function wantPile() {
    const list = S.books.filter(b => b.want && !b.finished);
    const body = h('div', { class: 'pick' });
    if (!list.length) body.append(h('p', { text: 'Your pile is empty. Right-click a book and choose "Add to want-to-read pile", or tick the box when you add a new book.' }));
    for (const b of list) body.append(h('div', { class: 'wrow' }, h('span', { class: 'spine', style: { background: b.color } }), h('span', { class: 'wt', text: b.title }), h('button', { class: 'btn sm gold', onclick: () => { m.close(); World.openBook(b); } }, 'Read'), h('button', { class: 'btn sm', onclick: () => { b.want = false; Store.save(); m.close(); wantPile(); } }, 'Remove')));
    const m = modal({ title: 'Want to read', body, buttons: list.length > 1 ? [{ text: 'Pick one for me', cls: 'gold', onClick: () => bookWheel(list) }, { text: 'Close' }] : [{ text: 'Close' }] });
  }
  function bookWheel(pool) {
    pool = pool || S.books.filter(b => !b.finished); if (!pool.length) pool = S.books.slice();
    if (!pool.length) { toast('Add some books first!'); return; }
    const box = h('div', { class: 'wheel' }), label = h('div', { class: 'wheel-t', text: '…' });
    box.append(label);
    let n = 0, pickB = pool[0]; const total = 18 + Math.floor(Math.random() * 8);
    const m = modal({ title: 'Book wheel', body: box, buttons: [] });
    const spin = () => { pickB = pool[n % pool.length]; label.textContent = pickB.title; label.style.background = pickB.color; sfx('click'); n++;
      if (n < total) setTimeout(spin, 50 + n * n * 0.6); else { sfx('level'); m.box.querySelector('.mb').append(h('div', { class: 'mf' }, h('button', { class: 'btn gold', onclick: () => { m.close(); World.openBook(pickB); } }, 'Read it now'), h('button', { class: 'btn', onclick: () => m.close() }, 'Maybe later'))); } };
    spin();
  }

  /* ---------- shop ---------- */
  let shopTab = 'all', shopOwned = false, shopHover = null;
  function showShop() { closePopover(); renderShop(); show('shop'); }
  function petAdopt(after) {
    let fur = 'orange'; const name = h('input', { type: 'text', maxlength: 14, placeholder: 'Name your kitten', value: '' });
    const furs = h('div', { class: 'furs' });
    const drawF = () => { furs.innerHTML = ''; for (const [k, f] of Object.entries(FURS)) { const c = h('canvas', { width: 34, height: 28 }); c.getContext('2d').drawImage(catFrame(k, 'sit', 0, false), 0, 0); furs.append(h('button', { class: 'fur' + (fur === k ? ' on' : ''), title: f.name, onclick: () => { fur = k; drawF(); } }, c, h('span', { text: f.name }))); } };
    drawF();
    modal({ title: 'Adopt a kitten', body: h('div', {}, h('p', { class: 'small', text: 'Your kitten eats fish treats. Every 10 minutes of reading puts one in the bowl.' }), furs, name), buttons: [{ text: 'Adopt', cls: 'gold', onClick: () => {
      const nm = name.value.trim(); if (!nm) { toast('Give your kitten a name first.'); return false; }
      S.pet = { name: nm, fur, hunger: 80, bowl: 1, fed: 0, t: Date.now(), acc: {}, readMin: 0 }; Ach.unlock('catparent'); Store.save(); sfx('meow'); after && after();
      toast(`${nm} moved into your library! There's a treat in the bowl.`, { icon: 'heart' });
    } }, { text: 'Cancel' }] });
  }
  function buy(it) {
    if (it.lv && S.level < it.lv) { toast(`Unlocks at level ${it.lv}`); return; }
    if (it.needs === 'cat' && !S.pet) { toast('Adopt a kitten first.'); return; }
    if (S.coins < it.price) { sfx('error'); toast(`You need ${it.price - S.coins} more coins. Reading earns 1 coin per minute!`, { icon: 'coin' }); return; }
    if (it.id === 'cat') { petAdopt(() => { addCoins(-it.price, 'Shop'); S.owned.cat = true; Store.save(); renderShop(); }); return; }
    if (it.kind === 'mystery') { openMystery(); return; }
    addCoins(-it.price, 'Shop'); S.owned[it.id] = true; sfx('buy');
    useItem(it, true); Ach.checkBooks(); Store.save(); renderShop();
    toast(`You got: ${it.name}!`, { icon: 'star' });
  }
  function isUsing(it) {
    if (it.kind === 'wear') return S.equip[it.slot] === it.id;
    if (it.kind === 'decor') return !!S.decor[it.id];
    if (it.kind === 'catacc') return !!(S.pet && S.pet.acc && S.pet.acc[it.slot]);
    if (it.id === 'owl') return S.decor.owl !== 'off';
    return true;
  }
  function useItem(it, on) {
    if (it.kind === 'wear') { if (on) S.equip[it.slot] = it.id; else delete S.equip[it.slot]; }
    else if (it.kind === 'decor') {
      if (on) { const spot = World.freeSpotFor(it); if (!spot) { toast(it.place === 'wall' ? 'No free wall spot. Remove a wall decoration or unlock a new room.' : 'No free floor spot. Remove a decoration or unlock a new room.'); return false; } S.decor[it.id] = spot; }
      else delete S.decor[it.id];
      World.rebuild();
    }
    else if (it.kind === 'catacc' && S.pet) { S.pet.acc ||= {}; S.pet.acc[it.slot] = on; }
    else if (it.id === 'owl') { S.decor.owl = on ? 'on' : 'off'; }
    Store.save(); return true;
  }
  function renderShop() {
    const root = $('#screen-shop'); root.innerHTML = '';
    const look = S.profile || defaultLook();
    const prev = h('canvas', { class: 'shop-prev', width: 22, height: 31 });
    const coins = h('div', { class: 'coins big' }, h('img', { src: iconURL('coin', 3), alt: '' }), h('b', { text: String(S.coins) }));
    const tabs = h('div', { class: 'tabs' }, [['all', 'All'], ...Object.entries(SETS).map(([k, s]) => [k, s.icon + ' ' + s.name])].map(([k, l]) => h('button', { class: 'tab' + (shopTab === k ? ' on' : ''), onclick: () => { shopTab = k; renderShop(); } }, l)));
    const ownedT = h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: shopOwned ? true : null, onchange: e => { shopOwned = e.target.checked; renderShop(); } }), 'Only things I own');
    const grid = h('div', { class: 'shop-grid' });
    for (const it of ITEMS) {
      if (shopTab !== 'all' && it.set !== shopTab) continue;
      const owned = !!S.owned[it.id] || (it.id === 'cat' && !!S.pet);
      if (shopOwned && !owned) continue;
      const lockedLv = it.lv && S.level < it.lv, needCat = it.needs === 'cat' && !S.pet;
      const icon = h('div', { class: 'ic' }); icon.append(itemIcon(it, look, S.equip));
      let act;
      if (it.kind === 'mystery') act = h('button', { class: 'btn gold sm', onclick: () => buy(it) }, h('img', { src: iconURL('coin', 1), alt: '' }), ' ' + it.price);
      else if (!owned) act = lockedLv ? h('button', { class: 'btn sm', disabled: true }, `Level ${it.lv}`) : needCat ? h('button', { class: 'btn sm', disabled: true }, 'Needs a cat') : h('button', { class: 'btn gold sm', onclick: () => buy(it) }, h('img', { src: iconURL('coin', 1), alt: '' }), ' ' + it.price);
      else if (it.id === 'cat') act = h('button', { class: 'btn sm', onclick: () => renamePet() }, `${S.pet.name} · Rename`);
      else if (it.kind === 'theme') act = h('span', { class: 'small', text: 'Owned · pick it in the reader under Style' });
      else if (it.kind === 'hair') act = h('button', { class: 'btn sm', onclick: () => openCreator('game') }, 'Owned · edit character');
      else { const using = isUsing(it), word = it.kind === 'wear' ? (using ? 'Take off' : 'Wear') : it.kind === 'decor' ? (using ? 'Remove' : 'Place') : (using ? 'Hide' : 'Show'); act = h('button', { class: 'btn sm' + (using ? ' on' : ''), onclick: () => { if (useItem(it, !using) !== false) { sfx('click'); renderShop(); } } }, word); }
      const extra = it.id === 'hscarf' && owned && S.equip.neck === 'hscarf' ? h('div', { class: 'variants' }, HOUSE_SCARVES.map(([a, b2, nm], i) => h('button', { class: 'sw' + ((S.equip.neckVar || 0) === i ? ' on' : ''), title: nm, style: { background: `linear-gradient(90deg, ${a} 50%, ${b2} 50%)` }, onclick: () => { S.equip.neckVar = i; Store.save(); renderShop(); } }))) : null;
      const card = h('div', { class: 'card' + (owned ? ' owned' : ''), title: it.desc || '' }, icon, h('div', { class: 'nm', text: it.name }), h('div', { class: 'ty', text: kindLabel(it) }), h('div', { class: 'ds', text: it.desc || '' }), extra, h('div', { class: 'act' }, act));
      if (it.kind === 'wear') { card.addEventListener('mouseenter', () => { shopHover = it; }); card.addEventListener('mouseleave', () => { if (shopHover === it) shopHover = null; }); }
      grid.append(card);
    }
    if (!grid.children.length) grid.append(h('p', { class: 'small', text: shopOwned ? "You don't own anything from this collection yet." : 'Nothing here yet.' }));
    root.append(h('div', { class: 'shop pix' },
      h('div', { class: 'shop-head' }, h('div', {}, h('h2', { text: "Dubu's Shop" }), h('p', { class: 'small', text: 'Earn coins by reading. Themed items go on your character or around your library.' })), coins, h('button', { class: 'btn', onclick: () => show('game') }, '← Back to the library')),
      h('div', { class: 'shop-body' }, h('div', { class: 'shop-side' }, h('div', { class: 'stage' }, prev), h('div', { class: 'small', text: 'Hover clothes to try them on.' }), S.pet ? h('div', { class: 'small', text: `${S.pet.name}: ${Math.round(S.pet.hunger)}% full · ${S.pet.bowl || 0} treats in the bowl` }) : null),
        h('div', { class: 'shop-main' }, h('div', { class: 'shop-tools' }, tabs, ownedT), grid))));
    const t0 = performance.now();
    (function loop() {
      if (!prev.isConnected) return; const g = prev.getContext('2d'); g.clearRect(0, 0, 22, 31);
      const eq = { ...S.equip }; if (shopHover) eq[shopHover.slot] = shopHover.id;
      g.drawImage(charSprites(look, eq).walk[0][Math.floor((performance.now() - t0) / 180) % 4], 0, 0); requestAnimationFrame(loop);
    })();
  }
  function kindLabel(it) { return { wear: { hat: 'Hat', outfit: 'Outfit', neck: 'Scarf', hand: 'Hand item', face: 'Glasses', mark: 'Face detail' }[it.slot], decor: it.place === 'wall' ? 'Wall decoration' : it.place === 'ceil' ? 'Room effect' : 'Floor decoration', theme: 'Reader theme', pet: 'Pet', catacc: 'Cat accessory', hair: 'Hair color', mystery: 'Surprise' }[it.kind] || ''; }
  function renamePet() { const n = h('input', { type: 'text', maxlength: 14, value: S.pet.name }); modal({ title: 'Rename your cat', body: n, buttons: [{ text: 'Save', cls: 'gold', onClick: () => { S.pet.name = n.value.trim() || S.pet.name; Store.save(); renderShop(); } }, { text: 'Cancel' }] }); }
  function openMystery() {
    const pool = ITEMS.filter(it => !S.owned[it.id] && it.price <= 500 && it.kind !== 'mystery' && it.kind !== 'pet' && !(it.needs === 'cat' && !S.pet) && !(it.lv && S.level < it.lv));
    addCoins(-100, 'Mystery box'); sfx('buy');
    const box = h('div', { class: 'mystery' }); const ic = h('div', { class: 'ic shake' }); ic.append(itemIcon(itemById('mystery'), S.profile || defaultLook())); box.append(ic, h('p', { class: 'small', text: 'Opening…' }));
    const m = modal({ title: 'Mystery box', body: box, buttons: [] });
    setTimeout(() => {
      box.innerHTML = '';
      if (!pool.length) { addCoins(120, 'Mystery refund'); box.append(h('p', { text: 'You already own everything in the box. Here are 120 coins instead!' })); }
      else { const it = pick(pool); S.owned[it.id] = true; useItem(it, true); Ach.checkBooks(); Store.save(); const ic2 = h('div', { class: 'ic pop' }); ic2.append(itemIcon(it, S.profile || defaultLook(), S.equip)); box.append(ic2, h('h3', { text: `It's the ${it.name}!` }), h('p', { class: 'small', text: it.desc || '' })); confetti(); sfx('level'); }
      m.box.append(h('div', { class: 'mf' }, h('button', { class: 'btn gold', onclick: () => { m.close(); renderShop(); } }, 'Yay!')));
    }, 1200);
  }

  /* ---------- stats ---------- */
  let statsTab = 'overview';
  function showStats(tab) { closePopover(); statsTab = tab || statsTab; renderStats(); show('stats'); }
  function renderStats() {
    const root = $('#screen-stats'); root.innerHTML = '';
    const tabs = h('div', { class: 'tabs' }, [['overview', 'Overview'], ['ach', 'Achievements'], ['quotes', 'Quote Journal'], ['journal', 'Book Journal']].map(([k, l]) => h('button', { class: 'tab' + (statsTab === k ? ' on' : ''), onclick: () => { statsTab = k; renderStats(); } }, l)));
    const body = h('div', { class: 'stats-body' });
    if (statsTab === 'overview') overview(body); else if (statsTab === 'ach') achievements(body); else if (statsTab === 'quotes') quoteJournal(body); else bookJournal(body);
    root.append(h('div', { class: 'stats pix' }, h('div', { class: 'stats-head' }, h('h2', { text: S.profile ? `${S.profile.name}'s reading stats` : 'Reading stats' }), h('button', { class: 'btn', onclick: () => show(S.profile && document.body.dataset.from !== 'menu' ? 'game' : 'menu') }, S.profile ? '← Back' : '← Menu')), tabs, body));
  }
  function tile(label, value, sub, extra) { return h('div', { class: 'tile' }, extra || null, h('div', { class: 'v', text: value }), h('div', { class: 'l', text: label }), sub ? h('div', { class: 's', text: sub }) : null); }
  function overview(body) {
    const fin = finishedCount(), hrs = (S.totalSec || 0) / 3600, st = streak(), lp = levelProgress();
    const flame = h('canvas', { class: 'flame', width: 16, height: 20 }); const fl = st >= 30 ? 3 : st >= 7 ? 2 : st >= 3 ? 1 : 0;
    let fr = 0; const fg = flame.getContext('2d'); (function anim() { if (!flame.isConnected) return; fg.clearRect(0, 0, 16, 20); if (st > 0) fg.drawImage(flameCanvas(fl, fr++ >> 3), 0, 0); requestAnimationFrame(anim); })();
    body.append(h('div', { class: 'tiles' },
      tile('Books finished', String(fin), `${S.books.length} in your library`),
      tile('Hours read', hrs < 10 ? hrs.toFixed(1) : String(Math.round(hrs)), fmtDur(S.totalSec) + ' total'),
      tile('Day streak', String(st), `Longest: ${Math.max(st, S.stats.longest || 0)} days`, flame),
      tile('Level', String(lp.L), `${lp.cur} / ${lp.need} XP to level ${lp.L + 1}`),
      tile('Coins', String(S.coins), 'Spend them in the shop')));
    body.append(heatmap());
    // this week
    const week = []; for (let i = 6; i >= 0; i--) { const d = addDays(new Date(), -i), k = dayKey(d), rec = S.days[k]; week.push({ d, min: Math.round((rec ? rec.sec : 0) / 60), pages: rec ? rec.pages : 0 }); }
    const maxM = Math.max(S.settings.dailyGoal, ...week.map(w => w.min));
    const bars = h('div', { class: 'wbars' }, week.map(w => h('div', { class: 'wb', title: `${w.d.toLocaleDateString(undefined, { weekday: 'long' })}: ${w.min} min, ${w.pages} pages` }, h('div', { class: 'col' }, h('i', { style: { height: Math.round(w.min / maxM * 100) + '%' } })), h('span', { text: w.d.toLocaleDateString(undefined, { weekday: 'short' }) }), h('b', { text: w.min ? w.min + 'm' : '' }))));
    const goalLine = h('div', { class: 'goal-line', style: { bottom: `calc(${Math.round(S.settings.dailyGoal / maxM * 100)}% * 0.78 + 34px)` }, title: 'Daily goal' });
    const pagesWeek = week.reduce((a, w) => a + w.pages, 0), minsWeek = week.reduce((a, w) => a + w.min, 0);
    const speed = S.totalSec > 600 ? Math.round(S.stats.pagesTurned / (S.totalSec / 3600)) : null;
    const byShelf = {}; for (const b of S.books) byShelf[b.shelf] = (byShelf[b.shelf] || 0) + (b.sec || 0);
    const favId = Object.entries(byShelf).sort((a, b) => b[1] - a[1])[0]; const fav = favId && favId[1] > 0 ? shelfById(favId[0]) : null;
    const year = new Date().getFullYear(), finYear = S.books.filter(b => b.finished && new Date(b.finishedAt).getFullYear() === year).length, goal = S.settings.yearlyGoal;
    body.append(h('div', { class: 'two' },
      h('div', { class: 'card' }, h('h3', { text: 'This week' }), h('div', { class: 'wchart' }, bars, goalLine), h('div', { class: 'small', text: `${minsWeek} minutes · ${pagesWeek} pages this week. The dashed line is your daily goal (${S.settings.dailyGoal} min).` })),
      h('div', { class: 'card facts' }, h('h3', { text: 'Reading facts' }),
        h('div', { class: 'drow' }, h('span', { text: 'Reading speed' }), h('span', { text: speed ? `${speed} pages per hour` : 'Read a bit more to see this' })),
        h('div', { class: 'drow' }, h('span', { text: 'Favorite shelf' }), h('span', { text: fav ? fav.name : '—' })),
        h('div', { class: 'drow' }, h('span', { text: 'Quotes saved' }), h('span', { text: String(S.quotes.length) })),
        h('div', { class: 'drow' }, h('span', { text: 'Highlights made' }), h('span', { text: String(S.stats.highlights || 0) })),
        h('div', { class: 'drow' }, h('span', { text: 'Pages turned' }), h('span', { text: String(S.stats.pagesTurned || 0) })),
        h('h3', { text: `${year} reading goal` }), h('div', { class: 'bar big' }, h('i', { style: { width: Math.min(100, Math.round(finYear / goal * 100)) + '%' } })),
        h('div', { class: 'prow' }, h('span', { text: `${finYear} of ${goal} books` }), h('button', { class: 'btn sm', onclick: () => { const n = h('input', { type: 'number', min: 1, max: 365, value: goal }); modal({ title: 'Yearly goal', body: h('label', {}, 'Books to finish this year ', n), buttons: [{ text: 'Save', cls: 'gold', onClick: () => { S.settings.yearlyGoal = clamp(parseInt(n.value, 10) || 12, 1, 365); Store.save(); renderStats(); } }, { text: 'Cancel' }] }); } }, 'Change goal')))));
  }
  function heatmap() {
    const card = h('div', { class: 'card' }, h('h3', { text: 'Your reading year' }));
    const end = new Date(); end.setHours(0, 0, 0, 0); const start = addDays(end, -364 - end.getDay());
    const grid = h('div', { class: 'hm-grid' }), months = h('div', { class: 'hm-months' });
    const level = m => m <= 0 ? 0 : m < 15 ? 1 : m < 30 ? 2 : m < 60 ? 3 : 4;
    let lastMonth = -1, col = 0, total = 0, days = 0;
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const rec = S.days[dayKey(d)], m = Math.round((rec ? rec.sec : 0) / 60);
      if (d.getDay() === 0) { col++; if (d.getMonth() !== lastMonth) { lastMonth = d.getMonth(); months.append(h('span', { style: { gridColumn: col }, text: d.toLocaleDateString(undefined, { month: 'short' }) })); } }
      total += m; if (m > 0) days++;
      grid.append(h('div', { class: 'hm-c l' + level(m), style: { gridColumn: col, gridRow: d.getDay() + 1 }, dataset: { tip: `${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · ${m ? m + ' min' : 'no reading'}${rec && rec.v && !m ? ' (visited)' : ''}` } }));
    }
    const tipEl = h('div', { class: 'hm-tip hidden' });
    grid.addEventListener('mouseover', e => { const c = e.target.closest('.hm-c'); if (!c) return; tipEl.textContent = c.dataset.tip; tipEl.classList.remove('hidden'); const r = c.getBoundingClientRect(), pr = card.getBoundingClientRect(); tipEl.style.left = (r.left - pr.left + r.width / 2) + 'px'; tipEl.style.top = (r.top - pr.top - 6) + 'px'; });
    grid.addEventListener('mouseleave', () => tipEl.classList.add('hidden'));
    const legend = h('div', { class: 'hm-legend' }, h('span', { text: 'Less' }), [0, 1, 2, 3, 4].map(l => h('i', { class: 'hm-c l' + l, title: ['No reading', '1–14 min', '15–29 min', '30–59 min', '60+ min'][l] })), h('span', { text: 'More' }));
    card.append(h('div', { class: 'hm-wrap' }, h('div', { class: 'hm-days' }, ['', 'Mon', '', 'Wed', '', 'Fri', ''].map(t => h('span', { text: t }))), h('div', { class: 'hm-main' }, months, grid)), h('div', { class: 'hm-foot' }, h('span', { class: 'small', text: `${days} reading days · ${fmtDur(total * 60)} in the last year` }), legend), tipEl);
    return card;
  }
  function achievements(body) {
    const got = ACH.filter(a => S.ach[a.id]).length;
    body.append(h('p', { class: 'small', text: `${got} of ${ACH.length} unlocked. Each one gives coins.` }));
    body.append(h('div', { class: 'ach-grid' }, ACH.map(a => h('div', { class: 'ach' + (S.ach[a.id] ? ' got' : '') }, h('div', { class: 'ai', text: a.icon }), h('div', {}, h('b', { text: a.name }), h('div', { class: 'small', text: a.desc }), h('div', { class: 'small', text: S.ach[a.id] ? `Unlocked ${fmtDate(S.ach[a.id])}` : `+${a.coins} coins` }))))));
  }
  function quoteJournal(body) {
    const search = h('input', { type: 'search', placeholder: 'Search your quotes…' });
    const list = h('div', { class: 'quotes' });
    const draw = () => {
      list.innerHTML = ''; const q = search.value.trim().toLowerCase();
      const items = S.quotes.slice().reverse().filter(x => !q || x.text.toLowerCase().includes(q) || x.title.toLowerCase().includes(q));
      if (!items.length) list.append(h('p', { class: 'small', text: S.quotes.length ? 'No quotes match your search.' : 'No quotes yet. While reading, select some text and choose "Save quote".' }));
      for (const x of items) {
        const b = S.books.find(bb => bb.id === x.bookId);
        list.append(h('div', { class: 'quote card' }, h('blockquote', { text: x.text }), h('div', { class: 'qm' }, h('span', { text: `${x.title}${x.author ? ' · ' + x.author : ''} · p. ${x.page} · ${fmtDate(x.ts)}` }),
          h('div', { class: 'acts' }, b ? h('button', { class: 'btn sm', onclick: () => { b.page = x.page; show('game'); World.openBook(b); } }, 'Open book') : null, h('button', { class: 'btn sm', onclick: () => { try { navigator.clipboard.writeText(`"${x.text}" — ${x.title}`).then(() => toast('Copied')); } catch (e) { /* no clipboard */ } } }, 'Copy'), h('button', { class: 'btn sm danger', onclick: () => { S.quotes = S.quotes.filter(y => y !== x); Store.save(); draw(); } }, 'Delete')))));
      }
    };
    search.addEventListener('input', draw); body.append(search, list); draw();
  }
  function bookJournal(body) {
    const done = S.books.filter(b => b.finished).sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));
    if (!done.length) { body.append(h('p', { class: 'small', text: 'Books you finish show up here with your rating, mood and review.' })); return; }
    body.append(h('div', { class: 'journal' }, done.map(b => h('div', { class: 'jrow card' }, h('span', { class: 'spine big', style: { background: b.color } }), h('div', { class: 'jb' }, h('b', { text: b.title }), h('div', { class: 'small', text: `${b.author ? b.author + ' · ' : ''}finished ${fmtDate(b.finishedAt || b.added)}` }), h('div', { class: 'stars ro', text: '★'.repeat(b.rating || 0) + '☆'.repeat(5 - (b.rating || 0)) }), b.review ? h('p', { class: 'rv', text: b.review }) : null), h('div', { class: 'jm', text: b.mood || '' }), h('button', { class: 'btn sm', onclick: () => journalModal(b, false) }, 'Edit')))));
  }

  /* ---------- settings ---------- */
  function showSettings() {
    closePopover(); const root = $('#screen-settings'); root.innerHTML = ''; const st = S.settings;
    const range = (key, after) => { const r = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: st[key] }); r.oninput = () => { st[key] = +r.value; Sound.applyVolumes(); after && after(); Store.save(); }; return r; };
    const select = (key, opts, after) => { const s = h('select', {}, opts.map(([v, l]) => h('option', { value: v, selected: String(st[key]) === String(v) ? true : null }, l))); s.onchange = () => { st[key] = isNaN(+s.value) ? s.value : +s.value; Store.save(); after && after(); }; return s; };
    const check = (key, after) => { const c = h('input', { type: 'checkbox', checked: st[key] ? true : null }); c.onchange = () => { st[key] = c.checked; Store.save(); after && after(); }; return c; };
    const row = (label, ctl, hint) => h('div', { class: 'srow' }, h('div', {}, h('span', { text: label }), hint ? h('div', { class: 'small', text: hint }) : null), ctl);
    const themeOpts = Object.entries(Reader.THEMES).filter(([k, th]) => (!th.item || S.owned[th.item]) && (!th.lv || S.level >= th.lv)).map(([k, th]) => [k, th.name]);
    root.append(h('div', { class: 'settings pix' }, h('div', { class: 'stats-head' }, h('h2', { text: 'Settings' }), h('button', { class: 'btn', onclick: () => show(S.profile && document.body.dataset.from === 'game' ? 'game' : 'menu') }, '← Back')),
      h('div', { class: 'scols' },
        h('div', { class: 'card' }, h('h3', { text: 'Sound' }), row('Music', range('music', () => { if (st.music > 0 && !Reader.isOpen) Sound.startMusic(); else if (st.music <= 0) Sound.stopMusic(); })), row('Sound effects', range('sfx')), row('Reading sounds', range('ambientVol'), 'Rain, fireplace and café sounds in the reader')),
        h('div', { class: 'card' }, h('h3', { text: 'Reading' }),
          row('Daily goal', select('dailyGoal', [10, 15, 20, 30, 45, 60, 90, 120].map(v => [v, v + ' minutes']))),
          row('Yearly goal', select('yearlyGoal', [3, 6, 10, 12, 15, 20, 25, 30, 40, 52, 75, 100].map(v => [v, v + ' books']))),
          row('Reading style', select('readerTheme', themeOpts)),
          row('Focus timer', select('focusMin', [15, 20, 25, 30, 45, 60].map(v => [v, v + ' min focus']))),
          row('Break', select('breakMin', [3, 5, 10, 15].map(v => [v, v + ' min break']))),
          row('Page-turn animation', check('flip')), row('Mini you in the reader', check('showMini'))),
        h('div', { class: 'card' }, h('h3', { text: 'You' }),
          row('Character', h('button', { class: 'btn sm', onclick: () => { if (S.profile) openCreator('settings'); else openCreator(false); } }, S.profile ? 'Edit character' : 'Create character')),
          row('Tutorial', h('button', { class: 'btn sm', onclick: () => { S.tutorialDone = false; Store.save(); if (S.profile) { enterGame(); } else toast('Create your character first.'); } }, 'Play it again')),
          row('Fullscreen', h('button', { class: 'btn sm', onclick: () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => toast('Fullscreen is not available here.')); } }, 'Toggle (F11)')),
          row('Less motion', check('reduceMotion'), 'Turns off confetti and page-turn animation')),
        h('div', { class: 'card' }, h('h3', { text: 'Your data' }),
          h('p', { class: 'small', text: 'Everything is saved on this computer. A backup file holds your progress, notes and quotes (not the PDF files themselves).' }),
          row('Backup', h('button', { class: 'btn sm', onclick: exportData }, 'Save a backup file')),
          row('Restore', h('button', { class: 'btn sm', onclick: importData }, 'Load a backup file')),
          row('Start over', h('button', { class: 'btn sm danger', onclick: wipe }, 'Delete everything')),
          h('p', { class: 'small dim', text: `Dokseo ${VERSION}. PDF rendering by pdf.js (Apache 2.0). Font: Pixelify Sans (SIL Open Font License).` })))));
    show('settings');
  }
  function exportData() {
    const blob = new Blob([JSON.stringify({ app: 'dokseo', version: VERSION, saved: Date.now(), state: S }, null, 1)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `dokseo-backup-${dayKey()}.json` }); document.body.append(a); a.click(); a.remove();
    toast('Backup saved.');
  }
  function importData() {
    const inp = h('input', { type: 'file', accept: '.json,application/json' });
    inp.onchange = async () => {
      try { const data = JSON.parse(await inp.files[0].text()); if (data.app !== 'dokseo' || !data.state) throw new Error('not a backup');
        confirmBox('Load this backup?', 'Your current progress will be replaced by the backup. Books whose PDF files are not on this computer will show as missing until you add them again.', 'Load backup', async () => { Object.assign(S, migrate(data.state)); await Store.saveNow(); location.reload(); });
      } catch (e) { toast('That file is not a Dokseo backup.'); }
    };
    inp.click();
  }
  function wipe() {
    const inp = h('input', { type: 'text', placeholder: 'Type DELETE' });
    modal({ title: 'Delete everything?', body: h('div', {}, h('p', { text: 'This removes your character, books, notes, quotes, coins and progress from this computer. It cannot be undone.' }), inp), buttons: [{ text: 'Delete everything', cls: 'danger', onClick: async () => { if (inp.value.trim().toUpperCase() !== 'DELETE') { toast('Type DELETE to confirm.'); return false; } await DB.clear('pdfs'); await DB.clear('kv'); location.reload(); } }, { text: 'Cancel' }] });
  }

  /* ---------- pause menu ---------- */
  function pauseMenu() {
    if (modalCount) return;
    const m = modal({ title: 'Menu', cls: 'narrow', body: h('div', { class: 'pick' },
      h('button', { class: 'btn gold', onclick: () => m.close() }, 'Back to reading'),
      h('button', { class: 'btn', onclick: () => { m.close(); showStats('overview'); } }, 'Stats'),
      h('button', { class: 'btn', onclick: () => { m.close(); showShop(); } }, 'Shop'),
      h('button', { class: 'btn', onclick: () => { m.close(); document.body.dataset.from = 'game'; showSettings(); } }, 'Settings'),
      h('button', { class: 'btn', onclick: () => { m.close(); Store.saveNow(); refreshMenu(); show('menu'); } }, 'Main menu')) });
  }

  /* ---------- level ups ---------- */
  const pendingLevels = [];
  function onLevelUp({ to }) {
    pendingLevels.push(to); addCoins(20 * to, `Level ${to}`);
    if (Reader.isOpen) { toast(`Level up! You're now level ${to}.`, { icon: 'star' }); return; }
    flushLevels();
  }
  function flushLevels() {
    if (!pendingLevels.length || Reader.isOpen || World.busy) return;
    const L = pendingLevels.shift(), info = LEVELS[L];
    const run = () => {
      sfx('level'); confetti();
      modal({ title: `Level ${L}!`, cls: 'levelup', body: h('div', {}, h('div', { class: 'lv-badge', text: String(L) }), info ? h('h3', { text: 'Unlocked: ' + info.name }) : h('h3', { text: 'You are a true bookworm!' }), info ? h('p', { text: info.desc }) : null, h('p', { class: 'small', text: `+${20 * L} coins` })),
        buttons: [{ text: 'Yay!', cls: 'gold' }], onClose: () => { const k = World.SECTIONS.findIndex(s => s.lv === L); if (k > 0) World.queueUnlock(k); else World.rebuild(); refreshHUD(); setTimeout(flushLevels, 300); } });
    };
    if (S.owned.owl && S.decor.owl !== 'off' && screen === 'game') World.flyOwl(run); else run();
  }

  /* ---------- events ---------- */
  function wireEvents() {
    Bus.on('coins', ({ n, why }) => { if (screen === 'game') refreshHUD(); const c = $('#hud-coins'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); if (why && n > 0 && !['Shop', 'Achievement', 'Quest', 'Daily visit', 'Tutorial gift'].includes(why)) toast(`+${n} coins · ${why}`, { icon: 'coin' }); if (n > 0) sfx('coin'); });
    Bus.on('xp', () => { if (screen === 'game') refreshHUD(); });
    Bus.on('levelup', onLevelUp);
    Bus.on('ach', a => toast(`Achievement: ${a.name} · +${a.coins} coins`, { icon: 'star', kind: 'gold' }));
    Bus.on('questdone', d => toast(`Quest complete: ${d.text}. Claim it in Quests!`, { icon: 'star' }));
    Bus.on('quests', () => { if (screen === 'game') refreshHUD(); });
    Bus.on('dailygoal', () => toast(`Daily goal reached: ${S.settings.dailyGoal} minutes! +15 coins`, { icon: 'coin', kind: 'gold' }));
    Bus.on('treat', () => { if (S.pet) toast(`${S.pet.name} earned a fish treat from your reading!`, { icon: 'fish' }); });
    Bus.on('fed', () => { if (screen === 'game') refreshHUD(); });
    Bus.on('catgrown', () => modal({ title: 'Your kitten grew up!', body: h('p', { text: `${S.pet.name} is now a big, fluffy cat. All that reading paid off!` }), buttons: [{ text: 'Aww', cls: 'gold' }] }));
    Bus.on('placed', b => { toast(`"${b.title}" is on the ${(shelfById(b.shelf) || {}).name} shelf.`, { icon: 'star' }); Tutorial.event('placed'); });
    Bus.on('roomUnlocked', sec => roomBanner('New room: ' + sec.name));
    Bus.on('enterRoom', sec => roomBanner(sec.name));
    Bus.on('enteredBook', b => { Reader.open(b); Tutorial.event('reader'); });
    Bus.on('readerClosed', () => { World.afterReader(); show('game'); if (S.settings.music > 0) Sound.startMusic(); Tutorial.event('readerClosed'); setTimeout(flushLevels, 700); });
    Bus.on('openShop', () => showShop());
    Bus.on('addBook', sh => pickFiles(sh));
    Bus.on('editShelf', sh => shelfModal(sh));
    Bus.on('buildShelf', i => shelfModal(null, i));
    Bus.on('bookMenu', bookMenu);
    Bus.on('wantPile', wantPile);
    Bus.on('pet', () => { Tutorial.event('pet'); refreshHUD(); });
  }
  function roomBanner(text) { const b = $('#room-banner'); b.textContent = text; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }

  function init() {
    initMenu(); wireEvents();
    $('#hud-add').onclick = () => { sfx('click'); pickFiles(); };
    $('#hud-shop').onclick = () => { sfx('click'); showShop(); };
    $('#hud-stats').onclick = () => { sfx('click'); document.body.dataset.from = 'game'; showStats('overview'); };
    $('#hud-menu').onclick = () => { sfx('click'); pauseMenu(); };
    $('#hud-quests').onclick = e => { sfx('click'); popover(e.currentTarget, questsPopover); };
    $('#hud-view').onclick = e => { sfx('click'); popover(e.currentTarget, viewPopover); };
    $('#m-stats').addEventListener('click', () => { document.body.dataset.from = 'menu'; });
    $('#m-settings').addEventListener('click', () => { document.body.dataset.from = 'menu'; });
    $('#file-input').addEventListener('change', e => { const f = e.target.files; if (f && f.length) addFiles(f, e.target._shelf); });
    document.addEventListener('mousedown', e => { if (!e.target.closest('#popover') && !e.target.closest('#hud-quests') && !e.target.closest('#hud-view')) closePopover(); if (!e.target.closest('#ctxmenu')) $('#ctxmenu').classList.add('hidden'); });
    addEventListener('keydown', e => {
      if (e.key === 'F11') { e.preventDefault(); if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); }
      if (e.key === 'Escape' && screen === 'game' && !Reader.isOpen && !modalCount) { if (!$('#popover').classList.contains('hidden')) closePopover(); else pauseMenu(); }
      else if (e.key === 'Escape' && ['stats', 'settings', 'shop'].includes(screen) && !modalCount) show(S.profile && document.body.dataset.from !== 'menu' ? 'game' : 'menu');
    });
    // drag and drop PDFs anywhere
    addEventListener('dragover', e => { e.preventDefault(); document.body.classList.add('dropping'); });
    addEventListener('dragleave', e => { if (!e.relatedTarget) document.body.classList.remove('dropping'); });
    addEventListener('drop', e => { e.preventDefault(); document.body.classList.remove('dropping'); if (!S.profile) { toast('Create your character first!'); return; } if (e.dataTransfer.files.length) { if (screen !== 'game') show('game'); addFiles(e.dataTransfer.files); } });
    setInterval(() => { if (screen === 'game') refreshHUD(); }, 30000);
  }
  return { init, show, modal, toast, confetti, showStats, showShop, refreshHUD, refreshMenu, openCreator, enterGame, get screen() { return screen; }, get modalCount() { return modalCount; } };
})();

/* ---------- tutorial, guided by Dubu the shop cat ---------- */
const Tutorial = (() => {
  let step = -1, startPos = null, timer = 0;
  const STEPS = [
    { text: n => `Hi ${n}! I'm Dubu, the shop cat. Walk around with the arrow keys or WASD. You can also click the floor.`, done: () => startPos && Math.hypot(World.player.x - startPos.x, World.player.y - startPos.y) > 40 },
    { text: () => 'This shelf holds your books. Walk up to it and watch the books peek out. Use ↑ and ↓ to pick a row.', done: () => World.focus && World.focus.type === 'shelf' },
    { text: () => 'I put a Welcome book there for you. Press E (or click the book) to jump inside!', wait: 'reader' },
    { text: () => 'This is the reader. Turn pages with ← → or the arrows on the sides. Select some text to highlight it or save it as a quote. Mini you reads along in the corner!', next: true, inReader: true },
    { text: () => 'When you are done, click "← Library" or press Esc to come back.', wait: 'readerClosed', inReader: true },
    { text: () => 'Now add your own book: press N or click "+ Add book" and choose a PDF. You can also drag PDF files into the window.', wait: 'placed', skip: 'Later' },
    { text: () => 'Reading earns coins and XP. Spend coins in my shop on the left. Level up to unlock new rooms. Have fun, and happy reading!', next: 'Finish' }
  ];
  function el() { return $('#tutorial'); }
  function start() { step = 0; startPos = { x: World.player.x, y: World.player.y }; render(); clearInterval(timer); timer = setInterval(check, 300); }
  function render() {
    const s = STEPS[step], box = el(); if (!s) { box.classList.add('hidden'); return; }
    box.innerHTML = ''; box.classList.remove('hidden'); box.classList.toggle('in-reader', !!s.inReader);
    const face = h('canvas', { width: 34, height: 28 }); face.getContext('2d').drawImage(catFrame('cream', 'happy', 0, true, { bow: true }), 0, 0);
    box.append(face, h('div', { class: 'tt' }, h('div', { class: 'nm', text: `Dubu · ${step + 1}/${STEPS.length}` }), h('p', { text: s.text(S.profile ? S.profile.name : 'friend') }),
      h('div', { class: 'ta' }, s.next ? h('button', { class: 'btn gold sm', onclick: advance }, typeof s.next === 'string' ? s.next : 'Next') : null, s.skip ? h('button', { class: 'btn sm', onclick: advance }, s.skip) : null, h('button', { class: 'btn sm ghost', onclick: finish }, 'Skip tutorial'))));
  }
  function advance() { sfx('pop'); step++; if (step >= STEPS.length) finish(); else render(); }
  function check() { const s = STEPS[step]; if (!s) return; if (s.done && s.done()) advance(); }
  function event(name) {
    const s = STEPS[step]; if (!s) return;
    if (name === 'readerClosed' && s.inReader) { step = 5; render(); return; }
    if (s.wait === name) advance();
  }
  function finish() { clearInterval(timer); step = -1; el().classList.add('hidden'); if (!S.tutorialDone) { S.tutorialDone = true; addCoins(50, 'Tutorial gift'); Store.save(); } }
  return { start, event, get active() { return step >= 0; } };
})();
