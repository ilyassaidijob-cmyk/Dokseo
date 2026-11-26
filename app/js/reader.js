'use strict';
/* Dokseo: the book reader. Renders PDFs with pdf.js inside an open-book frame. */
const Reader = (() => {
  if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = window.DOKSEO_WORKER || 'vendor/pdf.worker.min.js';
  const PDF_OPTS = () => window.DOKSEO_WEB ? { isEvalSupported: false } : { isEvalSupported: false, cMapUrl: 'vendor/cmaps/', cMapPacked: true, standardFontDataUrl: 'vendor/standard_fonts/' };
  const THEMES = {
    day: { name: 'Day', filter: '', tint: null },
    sepia: { name: 'Sepia', filter: 'sepia(0.15)', tint: '#f1dfbf' },
    night: { name: 'Night', filter: 'invert(0.9) hue-rotate(180deg) contrast(0.88)', tint: null },
    candle: { name: 'Candle', filter: 'sepia(0.3) brightness(0.9)', tint: '#f0c890', lv: 6 },
    purple: { name: 'Purple Night', filter: 'invert(0.9) hue-rotate(180deg) contrast(0.85)', tint: '#dccfff', tintMode: 'multiply', item: 'th_purple' },
    spring: { name: 'Spring Day', filter: '', tint: '#ffd9e2', item: 'th_spring' },
    spell: { name: 'Spellbook', filter: 'sepia(0.25)', tint: '#e6c88e', item: 'th_spell' }
  };
  const HL_COLORS = { yellow: '#f2d36b', green: '#a8d39b', blue: '#9fc3e6', pink: '#f2a9bd', quote: '#c9b2e6' };
  let el = {}, pdf = null, book = null, cur = 1, total = 1, aspect = 0.7, open = false, rendering = 0, busy = false;
  let sessionSec = 0, lastAct = Date.now(), timer = 0, textCache = new Map(), outline = null, panel = null, pending = null;
  let mini = { state: 'read', t: 0, until: 0, flip: 0 }, focusT = null, speaking = false, searchTerm = '', endShown = false;

  const isSpread = () => S.settings.spread && innerWidth > 760;
  const themeOk = k => { const th = THEMES[k]; if (!th) return false; if (th.item) return !!S.owned[th.item]; if (th.lv) return S.level >= th.lv; return true; };
  function act() { lastAct = Date.now(); if (mini.state === 'sleep') setMini('read'); }

  /* ---------- building the reader UI ---------- */
  function build() {
    const root = $('#reader');
    root.innerHTML = `
      <div class="rd-top">
        <button class="btn" id="rd-back" title="Back to the library (Esc)">← Library</button>
        <div class="rd-title"><b id="rd-title"></b><span id="rd-author"></span></div>
        <div class="rd-clock" id="rd-clock" title="Reading time this session">0:00</div>
        <div class="rd-tools">
          <button class="ibtn" data-panel="search" title="Search in this book (Ctrl+F)">Search</button>
          <button class="ibtn" data-panel="toc" title="Table of contents">Contents</button>
          <button class="ibtn" id="rd-bm" title="Bookmark this page (B)">Bookmark</button>
          <button class="ibtn" data-panel="notes" title="Your highlights, notes, bookmarks and quotes">Notes</button>
          <button class="ibtn" data-panel="display" title="Reading style">Style</button>
          <button class="ibtn" data-panel="sound" title="Ambient sounds">Sounds</button>
          <button class="ibtn" id="rd-focus" title="Focus timer (25 min reading, 5 min break)">Focus</button>
          <button class="ibtn" id="rd-speak" title="Read the page aloud">Read aloud</button>
          <button class="btn gold" id="rd-finish">✓ Finished</button>
        </div>
      </div>
      <div class="rd-stage" id="rd-stage">
        <div class="rd-book" id="rd-book"><div class="rd-page" id="rd-p0"></div><div class="rd-page" id="rd-p1"></div></div>
        <button class="rd-nav prev" id="rd-prev" aria-label="Previous page">‹</button>
        <button class="rd-nav next" id="rd-next" aria-label="Next page">›</button>
        <canvas id="rd-mini" width="60" height="36" title="Mini you, reading along. Drag to another corner."></canvas>
        <div class="rd-focusbox hidden" id="rd-focusbox"></div>
        <div class="rd-endbanner hidden" id="rd-end"><span>You reached the end of the book.</span> <button class="btn gold" id="rd-end-yes">Mark as finished</button> <button class="btn" id="rd-end-no">Not yet</button></div>
        <div class="rd-loading hidden" id="rd-loading">Opening your book…</div>
      </div>
      <div class="rd-bottom">
        <label class="rd-pageinfo">Page <input id="rd-pagein" type="number" min="1" value="1" aria-label="Go to page"> of <span id="rd-pages">1</span></label>
        <input type="range" id="rd-slider" min="1" value="1" aria-label="Book progress">
        <span id="rd-leftinfo"></span>
        <span id="rd-today"></span>
      </div>
      <aside class="rd-panel hidden" id="rd-panel"></aside>
      <div class="rd-pop hidden" id="rd-selpop"></div>
      <div class="rd-pop hidden" id="rd-hlpop"></div>`;
    const ids = ['back', 'title', 'author', 'clock', 'bm', 'focus', 'speak', 'finish', 'stage', 'book', 'p0', 'p1', 'prev', 'next', 'mini', 'focusbox', 'end', 'end-yes', 'end-no', 'loading', 'pagein', 'pages', 'slider', 'leftinfo', 'today', 'panel', 'selpop', 'hlpop'];
    for (const id of ids) el[id.replace('-', '_')] = $('#rd-' + id);
    el.root = root;
    el.back.onclick = close;
    el.prev.onclick = () => turn(-1);
    el.next.onclick = () => turn(1);
    el.bm.onclick = toggleBookmark;
    el.finish.onclick = () => finishFlow();
    el.end_yes.onclick = () => { el.end.classList.add('hidden'); finishFlow(); };
    el.end_no.onclick = () => el.end.classList.add('hidden');
    el.focus.onclick = toggleFocus;
    el.speak.onclick = toggleSpeak;
    for (const b of $$('[data-panel]', root)) b.onclick = () => togglePanel(b.dataset.panel);
    el.pagein.onchange = () => goTo(parseInt(el.pagein.value, 10) || 1);
    el.slider.oninput = () => { el.pagein.value = el.slider.value; };
    el.slider.onchange = () => goTo(parseInt(el.slider.value, 10));
    el.stage.addEventListener('mouseup', onMouseUp);
    el.stage.addEventListener('wheel', e => { act(); if (e.ctrlKey) { e.preventDefault(); setZoom(S.settings.zoom + (e.deltaY < 0 ? 0.1 : -0.1)); } }, { passive: false });
    for (const ev of ['mousemove', 'keydown', 'pointerdown']) root.addEventListener(ev, act);
    addEventListener('keydown', onKey);
    addEventListener('resize', () => { if (open) { clearTimeout(el._rs); el._rs = setTimeout(() => renderSpread(true), 200); } });
    document.addEventListener('mousedown', e => { if (!e.target.closest('.rd-pop')) { el.selpop.classList.add('hidden'); if (!e.target.closest('.hl')) el.hlpop.classList.add('hidden'); } });
    setupMiniDrag();
  }

  /* ---------- opening and closing ---------- */
  async function openBook(b) {
    if (!el.root) build();
    book = b; open = true; busy = false; sessionSec = 0; endShown = false; textCache = new Map(); outline = null; searchTerm = '';
    el.root.classList.remove('hidden'); applyTheme(); placeMini();
    el.title.textContent = b.title; el.author.textContent = b.author ? ' · ' + b.author : '';
    el.loading.classList.remove('hidden'); el.p0.innerHTML = ''; el.p1.innerHTML = '';
    closePanel(); el.end.classList.add('hidden');
    b.lastOpened = Date.now(); Store.save();
    try {
      const buf = await DB.get('pdfs', b.id);
      if (!buf) throw new Error('missing');
      pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)), ...PDF_OPTS() }).promise;
      total = pdf.numPages; if (b.pages !== total) { b.pages = total; Store.save(); }
      const p1 = await pdf.getPage(1); const vp = p1.getViewport({ scale: 1 }); aspect = vp.width / vp.height;
      cur = clamp(b.page || 1, 1, total); if (isSpread()) cur = cur % 2 ? cur : cur - 1;
      el.slider.max = total; el.pages.textContent = total; el.pagein.max = total;
      await renderSpread(true);
    } catch (err) {
      console.error(err);
      el.loading.textContent = 'This book could not be opened. The PDF file may be damaged or missing.';
      return;
    }
    el.loading.classList.add('hidden');
    clearInterval(timer); timer = setInterval(tick, 1000);
    setMini('read'); act();
    Sound.stopMusic(); if (S.settings.ambient && S.settings.ambient !== 'off') Sound.ambient(S.settings.ambient);
    Bus.emit('readerOpened', b);
  }
  function close() {
    if (!open) return;
    open = false; clearInterval(timer); stopSpeak(); stopFocus();
    if (book) { book.page = cur; Store.save(); }
    el.root.classList.add('hidden'); closePanel();
    el.selpop.classList.add('hidden'); el.hlpop.classList.add('hidden');
    Sound.stopAmbient();
    if (pdf) { pdf.destroy(); pdf = null; }
    const b = book; book = null;
    Bus.emit('readerClosed', b);
  }

  /* ---------- rendering pages ---------- */
  function pageSize() {
    const st = el.stage.getBoundingClientRect(), spread = isSpread(), z = S.settings.zoom || 1;
    const availW = st.width - 168, availH = st.height - 84;
    let hgt = Math.min(availH, (spread ? availW / 2 : availW) / aspect);
    hgt = Math.max(200, hgt) * z;
    return { w: Math.floor(hgt * aspect), h: Math.floor(hgt) };
  }
  async function makePage(n, size, token) {
    const wrap = h('div', { class: 'pg' }); wrap.style.width = size.w + 'px'; wrap.style.height = size.h + 'px'; wrap.dataset.page = n;
    if (n < 1 || n > total) { wrap.classList.add('blank'); return wrap; }
    const page = await pdf.getPage(n); if (token !== rendering) return null;
    const base = page.getViewport({ scale: 1 }), sc = size.h / base.height, vp = page.getViewport({ scale: sc });
    wrap.style.width = Math.floor(vp.width) + 'px';
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const canvas = h('canvas', { class: 'pg-canvas' }); canvas.width = Math.floor(vp.width * dpr); canvas.height = Math.floor(vp.height * dpr);
    canvas.style.width = Math.floor(vp.width) + 'px'; canvas.style.height = Math.floor(vp.height) + 'px';
    const tint = h('div', { class: 'pg-tint' }), hl = h('div', { class: 'pg-hl' }), tl = h('div', { class: 'textLayer' }), rib = h('div', { class: 'pg-ribbon' });
    wrap.append(canvas, tint, hl, tl, rib);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: page.getViewport({ scale: sc * dpr }) }).promise;
    if (token !== rendering) return null;
    try {
      const tc = await page.getTextContent();
      textCache.set(n, tc.items.map(i => i.str).join(' ').replace(/\s+/g, ' '));
      tl.style.setProperty('--scale-factor', sc); tl.style.width = Math.floor(vp.width) + 'px'; tl.style.height = Math.floor(vp.height) + 'px';
      const task = pdfjsLib.renderTextLayer({ textContentSource: tc, container: tl, viewport: vp, textDivs: [] });
      await task.promise;
      if (searchTerm) for (const sp of tl.querySelectorAll('span')) if (sp.textContent.toLowerCase().includes(searchTerm)) sp.classList.add('hit');
    } catch (e) { console.warn('text layer', e); }
    decoratePage(wrap);
    return wrap;
  }
  function decoratePage(wrap) {
    const n = +wrap.dataset.page, hl = wrap.querySelector('.pg-hl'); if (!hl) return;
    hl.innerHTML = '';
    for (const x of (book.highlights || []).filter(x => x.page === n)) {
      x.rects.forEach((r, i) => {
        const d = h('div', { class: 'hl' + (x.note && i === x.rects.length - 1 ? ' has-note' : ''), dataset: { id: x.id } });
        Object.assign(d.style, { left: r[0] * 100 + '%', top: r[1] * 100 + '%', width: r[2] * 100 + '%', height: r[3] * 100 + '%', background: HL_COLORS[x.color] || HL_COLORS.yellow });
        hl.appendChild(d);
      });
    }
    wrap.querySelector('.pg-ribbon').classList.toggle('on', (book.bookmarks || []).some(b => b.page === n));
  }
  function redecorate() { for (const w of $$('.pg', el.book)) decoratePage(w); updateBookmarkBtn(); }
  async function renderSpread(force) {
    if (!pdf) return;
    const token = ++rendering, size = pageSize(), spread = isSpread();
    el.book.classList.toggle('single', !spread);
    const pages = spread ? [cur, cur + 1] : [cur];
    const made = await Promise.all(pages.map(n => makePage(n, size, token)));
    if (token !== rendering || made.some(m => m === null)) return;
    el.p0.replaceChildren(made[0]); el.p1.replaceChildren(spread ? made[1] : '');
    el.p1.style.display = spread ? '' : 'none';
    afterTurn();
  }
  function clonePageVisual(wrap) {
    const c = wrap.cloneNode(false); c.style.width = wrap.style.width; c.style.height = wrap.style.height; c.className = wrap.className;
    const src = wrap.querySelector('canvas');
    if (src) { const cc = h('canvas', { class: 'pg-canvas' }); cc.width = src.width; cc.height = src.height; cc.style.width = src.style.width; cc.style.height = src.style.height; cc.getContext('2d').drawImage(src, 0, 0); c.appendChild(cc); c.appendChild(h('div', { class: 'pg-tint' })); }
    return c;
  }
  async function turn(dir) {
    if (!pdf || busy) return;
    const spread = isSpread(), step = spread ? 2 : 1, next = cur + dir * step;
    if (next < 1 || next > total) { if (dir > 0 && !book.finished) showEnd(); return; }
    act(); busy = true;
    const token = ++rendering, size = pageSize();
    const pages = spread ? [next, next + 1] : [next];
    const made = await Promise.all(pages.map(n => makePage(n, size, token)));
    if (token !== rendering || made.some(m => m === null)) { busy = false; return; }
    const animate = S.settings.flip && !S.settings.reduceMotion;
    sfx('page'); mini.flip = 0.5;
    if (animate && spread) {
      const oldL = el.p0.firstChild, oldR = el.p1.firstChild;
      const fl = h('div', { class: 'flipper ' + (dir > 0 ? 'fwd' : 'bwd') });
      const front = h('div', { class: 'face front' }), back = h('div', { class: 'face back' });
      if (dir > 0) { front.appendChild(clonePageVisual(oldR)); back.appendChild(clonePageVisual(made[0])); el.p1.replaceChildren(made[1]); }
      else { front.appendChild(clonePageVisual(oldL)); back.appendChild(clonePageVisual(made[1])); el.p0.replaceChildren(made[0]); }
      front.appendChild(h('div', { class: 'shade' })); back.appendChild(h('div', { class: 'shade' }));
      fl.append(front, back);
      const host = dir > 0 ? el.p1 : el.p0;
      fl.style.left = host.offsetLeft + 'px'; fl.style.top = host.offsetTop + 'px'; fl.style.width = host.offsetWidth + 'px'; fl.style.height = host.offsetHeight + 'px';
      el.book.appendChild(fl);
      cur = next; afterTurn();
      requestAnimationFrame(() => requestAnimationFrame(() => fl.classList.add('go')));
      await new Promise(r => setTimeout(r, 640));
      if (dir > 0) el.p0.replaceChildren(made[0]); else el.p1.replaceChildren(made[1]);
      fl.remove();
    } else if (animate) {
      made[0].classList.add(dir > 0 ? 'slide-in-r' : 'slide-in-l'); el.p0.replaceChildren(made[0]);
      cur = next; afterTurn();
      await new Promise(r => setTimeout(r, 260));
    } else {
      el.p0.replaceChildren(made[0]); if (spread) el.p1.replaceChildren(made[1]);
      cur = next; afterTurn();
    }
    busy = false;
  }
  async function goTo(n) {
    if (!pdf) return; n = clamp(n, 1, total); if (isSpread()) n = n % 2 ? n : n - 1;
    if (n === cur) { afterTurn(); return; }
    cur = n; act(); sfx('page'); await renderSpread(true);
  }
  function afterTurn() {
    const spread = isSpread(), right = spread ? Math.min(total, cur + 1) : cur;
    book.page = cur; Reading.pages(book, right);
    el.pagein.value = cur; el.slider.value = cur;
    const pct = Math.round(right / total * 100), spp = book.sec > 120 && (book.maxPage || 1) > 2 ? book.sec / Math.max(1, (book.maxPage || 1) - 1) : 90;
    const left = Math.max(0, (total - right) * spp);
    el.leftinfo.textContent = `${pct}% · about ${fmtDur(left)} left`;
    updateBookmarkBtn(); updateToday();
    if (right >= total && !book.finished && !endShown) showEnd();
    Store.save();
  }
  function showEnd() { endShown = true; el.end.classList.remove('hidden'); }
  function updateToday() { const d = today(), goal = S.settings.dailyGoal; el.today.textContent = `Today ${Math.floor(d.sec / 60)} / ${goal} min`; el.today.classList.toggle('done', d.sec >= goal * 60); }

  /* ---------- reading timer ---------- */
  function tick() {
    if (!open || !book) return;
    const idle = Date.now() - lastAct, visible = document.visibilityState === 'visible' && document.hasFocus();
    const onBreak = focusT && focusT.phase === 'break';
    if (idle > 180000 && mini.state !== 'sleep' && mini.state !== 'cheer') setMini('sleep');
    if (focusT && focusT.running) { focusT.left--; if (focusT.left <= 0) focusPhaseEnd(); renderFocus(); }
    if (visible && idle < 300000 && !onBreak) {
      Reading.tick(book); sessionSec++;
      if (sessionSec % 1800 === 0) { setMini('stretch', 4); UI.toast(`${sessionSec / 60} minutes of reading! Maybe stretch a little.`); }
    }
    el.clock.textContent = fmtClock(sessionSec); el.clock.classList.toggle('paused', idle >= 300000 || !visible);
    if (sessionSec % 5 === 0) updateToday();
  }

  /* ---------- keyboard ---------- */
  function onKey(e) {
    if (!open) return;
    if (document.querySelector('.modal-back')) return;
    const tag = (e.target.tagName || '').toLowerCase(); const typing = tag === 'input' || tag === 'textarea';
    if (e.key === 'Escape') { e.preventDefault(); if (!el.selpop.classList.contains('hidden') || !el.hlpop.classList.contains('hidden')) { el.selpop.classList.add('hidden'); el.hlpop.classList.add('hidden'); } else if (panel) closePanel(); else close(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); openPanel('search'); return; }
    if (typing) return;
    if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); turn(1); }
    else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); turn(-1); }
    else if (e.key === 'Home') goTo(1);
    else if (e.key === 'End') goTo(total);
    else if (e.key.toLowerCase() === 'b') toggleBookmark();
    else if (e.key === '+' || e.key === '=') setZoom(S.settings.zoom + 0.1);
    else if (e.key === '-') setZoom(S.settings.zoom - 0.1);
  }
  function setZoom(z) { S.settings.zoom = clamp(Math.round(z * 10) / 10, 0.6, 2.5); Store.save(); renderSpread(true); if (panel === 'display') openPanel('display'); }

  /* ---------- selection, highlights, quotes ---------- */
  function pageWrapOf(node) { const e = node.nodeType === 1 ? node : node.parentElement; return e && e.closest('.pg'); }
  function onMouseUp(e) {
    setTimeout(() => {
      const sel = getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) { hlClick(e); return; }
      const range = sel.getRangeAt(0), wrap = pageWrapOf(range.startContainer);
      if (!wrap || !el.book.contains(wrap)) return;
      const text = sel.toString().replace(/\s+/g, ' ').trim(); if (!text) return;
      const pr = wrap.getBoundingClientRect();
      const rects = [...range.getClientRects()].filter(r => r.width > 1 && r.height > 1 && r.right > pr.left && r.left < pr.right && r.bottom > pr.top && r.top < pr.bottom)
        .map(r => [(r.left - pr.left) / pr.width, (r.top - pr.top) / pr.height, r.width / pr.width, r.height / pr.height]);
      if (!rects.length) return;
      pending = { page: +wrap.dataset.page, rects: mergeRects(rects), text };
      const last = range.getBoundingClientRect();
      showSelPop(last);
    }, 10);
  }
  function mergeRects(rs) {
    rs.sort((a, b) => a[1] - b[1] || a[0] - b[0]); const out = [];
    for (const r of rs) {
      const p = out[out.length - 1];
      if (p && Math.abs(p[1] - r[1]) < Math.min(p[3], r[3]) * 0.6 && r[0] <= p[0] + p[2] + 0.02) { const x0 = Math.min(p[0], r[0]), x1 = Math.max(p[0] + p[2], r[0] + r[2]), y0 = Math.min(p[1], r[1]), y1 = Math.max(p[1] + p[3], r[1] + r[3]); p[0] = x0; p[1] = y0; p[2] = x1 - x0; p[3] = y1 - y0; }
      else out.push(r.slice());
    }
    return out.map(r => r.map(v => Math.round(v * 10000) / 10000));
  }
  function popAt(pop, rect) {
    pop.classList.remove('hidden');
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let x = clamp(rect.left + rect.width / 2 - pw / 2, 8, innerWidth - pw - 8), y = rect.top - ph - 10; if (y < 60) y = rect.bottom + 10;
    pop.style.left = x + 'px'; pop.style.top = y + 'px';
  }
  function showSelPop(rect) {
    const p = el.selpop; p.innerHTML = '';
    for (const [k, c] of Object.entries(HL_COLORS)) if (k !== 'quote') p.appendChild(h('button', { class: 'swatch', style: { background: c }, title: 'Highlight ' + k, onclick: () => addHighlight(k) }));
    p.append(
      h('button', { class: 'pbtn', onclick: saveQuote, title: 'Save this to your Quote Journal' }, '❝ Save quote'),
      h('button', { class: 'pbtn', onclick: () => { const x = addHighlight('yellow'); if (x) editNote(x); } }, '✎ Add note'),
      h('button', { class: 'pbtn', onclick: () => { copyText(pending.text); p.classList.add('hidden'); } }, 'Copy'),
      h('button', { class: 'pbtn', onclick: () => { speak(pending.text, false); p.classList.add('hidden'); } }, 'Read aloud')
    );
    popAt(p, rect);
  }
  function copyText(t) { try { navigator.clipboard.writeText(t).then(() => UI.toast('Copied'), () => {}); } catch (e) { /* clipboard not available */ } }
  function addHighlight(color) {
    if (!pending) return null;
    const x = { id: uid(), page: pending.page, rects: pending.rects, color, text: pending.text.slice(0, 2000), note: '', ts: Date.now() };
    (book.highlights ||= []).push(x); S.stats.highlights = (S.stats.highlights || 0) + 1;
    Quests.progress('highlight'); Ach.checkBooks(); Store.save();
    getSelection().removeAllRanges(); el.selpop.classList.add('hidden'); pending = null;
    redecorate(); setMini('highlight', 2.5); sfx('click');
    return x;
  }
  function saveQuote() {
    if (!pending) return;
    S.quotes.push({ id: uid(), bookId: book.id, title: book.title, author: book.author || '', text: pending.text.slice(0, 2000), page: pending.page, ts: Date.now() });
    addHighlight('quote'); Quests.progress('quote'); Ach.checkBooks(); addXP(2);
    setMini('heart', 2.5); UI.toast('Saved to your Quote Journal ❝'); Store.save();
  }
  function hlClick(e) {
    const wrap = e.target.closest && e.target.closest('.pg'); if (!wrap) return;
    const pr = wrap.getBoundingClientRect(), px = (e.clientX - pr.left) / pr.width, py = (e.clientY - pr.top) / pr.height, n = +wrap.dataset.page;
    const x = (book.highlights || []).find(x => x.page === n && x.rects.some(r => px >= r[0] && px <= r[0] + r[2] && py >= r[1] && py <= r[1] + r[3]));
    if (!x) return;
    showHlPop(x, { left: e.clientX - 10, top: e.clientY - 10, width: 20, height: 20, bottom: e.clientY + 10 });
  }
  function showHlPop(x, rect) {
    const p = el.hlpop; p.innerHTML = '';
    const row = h('div', { class: 'row' });
    for (const [k, c] of Object.entries(HL_COLORS)) if (k !== 'quote') row.appendChild(h('button', { class: 'swatch' + (x.color === k ? ' on' : ''), style: { background: c }, title: 'Change color', onclick: () => { x.color = k; Store.save(); redecorate(); showHlPop(x, rect); } }));
    p.append(row);
    if (x.note) p.append(h('div', { class: 'note-view', text: x.note }));
    p.append(h('div', { class: 'row' },
      h('button', { class: 'pbtn', onclick: () => editNote(x) }, x.note ? '✎ Edit note' : '✎ Add note'),
      h('button', { class: 'pbtn', onclick: () => { copyText(x.text); } }, 'Copy'),
      h('button', { class: 'pbtn danger', onclick: () => { book.highlights = book.highlights.filter(y => y !== x); Store.save(); redecorate(); p.classList.add('hidden'); } }, 'Delete')));
    popAt(p, rect);
  }
  function editNote(x) {
    el.selpop.classList.add('hidden'); el.hlpop.classList.add('hidden');
    const ta = h('textarea', { rows: 5, maxlength: 2000, placeholder: 'Write your thoughts…', value: x.note || '' });
    UI.modal({
      title: 'Note', body: h('div', {}, h('blockquote', { class: 'qtext', text: x.text.slice(0, 300) + (x.text.length > 300 ? '…' : '') }), ta),
      buttons: [{ text: 'Save note', cls: 'gold', onClick: () => { x.note = ta.value.trim(); Store.save(); redecorate(); if (panel === 'notes') openPanel('notes'); } }, { text: 'Cancel' }]
    });
    setTimeout(() => ta.focus(), 50);
  }

  /* ---------- bookmarks ---------- */
  function visiblePages() { return isSpread() ? [cur, cur + 1].filter(n => n <= total) : [cur]; }
  function updateBookmarkBtn() { const on = (book.bookmarks || []).some(b => visiblePages().includes(b.page)); el.bm.classList.toggle('on', on); el.bm.textContent = on ? 'Bookmarked' : 'Bookmark'; }
  function toggleBookmark() {
    if (!book) return; book.bookmarks ||= [];
    const vis = visiblePages(), existing = book.bookmarks.filter(b => vis.includes(b.page));
    if (existing.length) book.bookmarks = book.bookmarks.filter(b => !vis.includes(b.page));
    else { book.bookmarks.push({ page: cur, ts: Date.now() }); Quests.progress('bookmark'); sfx('click'); }
    Store.save(); redecorate(); if (panel === 'notes') openPanel('notes');
  }

  /* ---------- side panels ---------- */
  function togglePanel(name) { if (panel === name) closePanel(); else openPanel(name); }
  function closePanel() { panel = null; if (el.panel) el.panel.classList.add('hidden'); $$('[data-panel]', el.root || document).forEach(b => b.classList.remove('on')); }
  function openPanel(name) {
    panel = name; const p = el.panel; p.innerHTML = ''; p.classList.remove('hidden');
    $$('[data-panel]', el.root).forEach(b => b.classList.toggle('on', b.dataset.panel === name));
    const head = (t) => h('div', { class: 'ph' }, h('h3', { text: t }), h('button', { class: 'x', title: 'Close', onclick: closePanel }, '×'));
    if (name === 'search') {
      const inp = h('input', { type: 'search', placeholder: 'Search this book…', value: searchTerm });
      const res = h('div', { class: 'plist' }), info = h('div', { class: 'small' });
      const run = async () => {
        const q = inp.value.trim().toLowerCase(); searchTerm = q; res.innerHTML = ''; if (q.length < 2) { info.textContent = 'Type at least 2 letters.'; return; }
        const myRun = (p._run = (p._run || 0) + 1); let count = 0;
        for (let n = 1; n <= total; n++) {
          if (p._run !== myRun || panel !== 'search') return;
          let txt = textCache.get(n);
          if (txt == null) { try { const pg = await pdf.getPage(n); const tc = await pg.getTextContent(); txt = tc.items.map(i => i.str).join(' ').replace(/\s+/g, ' '); textCache.set(n, txt); } catch (e) { txt = ''; } }
          const low = txt.toLowerCase(); let i = low.indexOf(q);
          while (i >= 0 && count < 200) {
            const s = Math.max(0, i - 40), snippet = txt.slice(s, i + q.length + 60), at = i - s;
            const item = h('button', { class: 'pitem', onclick: () => { goTo(n); } }, h('span', { class: 'pg-tag', text: 'p. ' + n }), h('span', { html: esc(snippet.slice(0, at)) + '<mark>' + esc(snippet.slice(at, at + q.length)) + '</mark>' + esc(snippet.slice(at + q.length)) }));
            res.appendChild(item); count++; i = low.indexOf(q, i + q.length);
          }
          if (n % 10 === 0) info.textContent = `Searching… page ${n} of ${total}`;
        }
        info.textContent = count ? `${count}${count >= 200 ? '+' : ''} result${count === 1 ? '' : 's'}` : 'No results';
        renderSpread(true);
      };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
      p.append(head('Search'), h('div', { class: 'prow' }, inp, h('button', { class: 'btn', onclick: run }, 'Find')), info, res);
      setTimeout(() => inp.focus(), 30);
    } else if (name === 'toc') {
      p.append(head('Contents'));
      const box = h('div', { class: 'plist' }); p.append(box);
      (async () => {
        try { outline = outline || await pdf.getOutline(); } catch (e) { outline = null; }
        if (!outline || !outline.length) { box.append(h('p', { class: 'small', text: 'This PDF has no table of contents. Use the slider below or type a page number.' })); return; }
        const addItems = (items, depth) => { for (const it of items) { box.append(h('button', { class: 'pitem', style: { paddingLeft: 10 + depth * 14 + 'px' }, onclick: () => jumpDest(it.dest) }, it.title)); if (it.items && it.items.length && depth < 3) addItems(it.items, depth + 1); } };
        addItems(outline, 0);
      })();
    } else if (name === 'notes') {
      p.append(head('Notes'));
      const tabs = h('div', { class: 'ptabs' }), box = h('div', { class: 'plist' });
      const show = which => {
        p._tab = which; box.innerHTML = ''; $$('button', tabs).forEach(b => b.classList.toggle('on', b.dataset.t === which));
        if (which === 'hl') {
          const list = (book.highlights || []).filter(x => x.color !== 'quote').sort((a, b) => a.page - b.page);
          if (!list.length) box.append(h('p', { class: 'small', text: 'Select text on a page to highlight it.' }));
          for (const x of list) box.append(h('div', { class: 'pcard' }, h('div', { class: 'chip', style: { background: HL_COLORS[x.color] } }), h('div', { class: 'body' }, h('div', { class: 'qt', text: x.text.slice(0, 220) }), x.note ? h('div', { class: 'nt', text: '✎ ' + x.note }) : null, h('div', { class: 'acts' }, h('button', { onclick: () => goTo(x.page) }, 'p. ' + x.page), h('button', { onclick: () => editNote(x) }, x.note ? 'Edit note' : 'Add note'), h('button', { class: 'danger', onclick: () => { book.highlights = book.highlights.filter(y => y !== x); Store.save(); redecorate(); show('hl'); } }, 'Delete')))));
        } else if (which === 'bm') {
          const list = (book.bookmarks || []).slice().sort((a, b) => a.page - b.page);
          if (!list.length) box.append(h('p', { class: 'small', text: 'Press B or the Bookmark button to mark a page.' }));
          for (const b of list) box.append(h('div', { class: 'pcard' }, h('div', { class: 'body' }, h('div', { class: 'qt', text: `Page ${b.page}` }), h('div', { class: 'small', text: fmtDate(b.ts) }), h('div', { class: 'acts' }, h('button', { onclick: () => goTo(b.page) }, 'Go'), h('button', { class: 'danger', onclick: () => { book.bookmarks = book.bookmarks.filter(y => y !== b); Store.save(); redecorate(); show('bm'); } }, 'Remove')))));
        } else {
          const list = S.quotes.filter(q => q.bookId === book.id);
          if (!list.length) box.append(h('p', { class: 'small', text: 'Select text and choose "Save quote".' }));
          for (const q of list) box.append(h('div', { class: 'pcard' }, h('div', { class: 'body' }, h('div', { class: 'qt', text: '❝ ' + q.text.slice(0, 300) }), h('div', { class: 'acts' }, h('button', { onclick: () => goTo(q.page) }, 'p. ' + q.page), h('button', { onclick: () => copyText(q.text) }, 'Copy'), h('button', { class: 'danger', onclick: () => { S.quotes = S.quotes.filter(y => y !== q); Store.save(); show('q'); } }, 'Delete')))));
          box.append(h('button', { class: 'btn', onclick: () => { close(); setTimeout(() => UI.showStats('quotes'), 400); } }, 'Open the Quote Journal'));
        }
      };
      for (const [t, label] of [['hl', 'Highlights'], ['bm', 'Bookmarks'], ['q', 'Quotes']]) tabs.append(h('button', { dataset: { t }, onclick: () => show(t) }, label));
      p.append(tabs, box); show(p._tab || 'hl');
    } else if (name === 'display') {
      p.append(head('Reading style'));
      const grid = h('div', { class: 'themes' });
      for (const [k, th] of Object.entries(THEMES)) {
        const ok = themeOk(k), it = th.item ? itemById(th.item) : null;
        grid.append(h('button', { class: 'theme th-' + k + (S.settings.readerTheme === k ? ' on' : '') + (ok ? '' : ' locked'), title: ok ? th.name : (it ? `Buy "${it.name}" in the shop` : `Unlocks at level ${th.lv}`), onclick: () => { if (!ok) { UI.toast(it ? `Get "${th.name}" in the shop (${it.price} coins)` : `${th.name} unlocks at level ${th.lv}`); return; } S.settings.readerTheme = k; Store.save(); applyTheme(); openPanel('display'); } },
          h('span', { class: 'sw' }), h('span', { text: th.name }), ok ? null : h('span', { class: 'lk', text: it ? '🪙 ' + it.price : 'Lv ' + th.lv })));
      }
      const bri = h('input', { type: 'range', min: 0.6, max: 1.2, step: 0.02, value: S.settings.brightness });
      bri.oninput = () => { S.settings.brightness = +bri.value; applyTheme(); Store.save(); };
      const zoom = h('div', { class: 'prow' }, h('button', { class: 'btn', onclick: () => setZoom(S.settings.zoom - 0.1) }, '−'), h('span', { class: 'zv', text: Math.round(S.settings.zoom * 100) + '%' }), h('button', { class: 'btn', onclick: () => setZoom(S.settings.zoom + 0.1) }, '+'), h('button', { class: 'btn', onclick: () => setZoom(1) }, 'Fit'));
      const lay = h('div', { class: 'prow' }, h('button', { class: 'btn' + (S.settings.spread ? ' on' : ''), onclick: () => { S.settings.spread = true; Store.save(); if (cur % 2 === 0) cur--; renderSpread(true); openPanel('display'); } }, 'Two pages'), h('button', { class: 'btn' + (!S.settings.spread ? ' on' : ''), onclick: () => { S.settings.spread = false; Store.save(); renderSpread(true); openPanel('display'); } }, 'One page'));
      const chk = (label, key, after) => { const c = h('input', { type: 'checkbox' }); c.checked = !!S.settings[key]; c.onchange = () => { S.settings[key] = c.checked; Store.save(); after && after(); }; return h('label', { class: 'chk' }, c, label); };
      p.append(grid, h('h4', { text: 'Brightness' }), bri, h('h4', { text: 'Zoom' }), zoom, h('h4', { text: 'Layout' }), lay,
        chk('Page-turn animation', 'flip'), chk('Show mini you reading along', 'showMini', placeMini));
    } else if (name === 'sound') {
      p.append(head('Sounds'));
      const opts = [['off', 'Off'], ['rain', 'Rain'], ['fire', 'Fireplace'], ['cafe', 'Café'], ['focus', 'Deep focus'], ['night', 'Night crickets']];
      const list = h('div', { class: 'ptabs wrap' });
      for (const [k, label] of opts) list.append(h('button', { class: S.settings.ambient === k ? 'on' : '', onclick: () => { Sound.init(); S.settings.ambient = k; Store.save(); Sound.ambient(k); openPanel('sound'); } }, label));
      const vol = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: S.settings.ambientVol });
      vol.oninput = () => { S.settings.ambientVol = +vol.value; Sound.applyVolumes(); Store.save(); };
      p.append(list, h('h4', { text: 'Volume' }), vol, h('p', { class: 'small', text: 'Sounds are made live on your computer, so they work offline.' }));
    }
  }
  async function jumpDest(dest) {
    try { let d = dest; if (typeof d === 'string') d = await pdf.getDestination(d); if (!d) return; const idx = await pdf.getPageIndex(d[0]); goTo(idx + 1); } catch (e) { console.warn(e); }
  }

  /* ---------- themes ---------- */
  function applyTheme() {
    let k = S.settings.readerTheme; if (!themeOk(k)) k = 'day';
    const th = THEMES[k];
    el.root.className = el.root.className.replace(/\bth-\S+/g, '').trim() + ' th-' + k;
    el.root.style.setProperty('--pg-filter', `${th.filter} brightness(${S.settings.brightness})`);
    el.root.style.setProperty('--pg-tint', th.tint || 'transparent');
  }

  /* ---------- focus timer ---------- */
  function toggleFocus() {
    if (focusT) { stopFocus(); return; }
    focusT = { phase: 'focus', left: S.settings.focusMin * 60, running: true };
    el.focus.classList.add('on'); renderFocus(); UI.toast(`Focus time: ${S.settings.focusMin} minutes. You've got this.`);
  }
  function stopFocus() { focusT = null; if (el.focus) { el.focus.classList.remove('on'); el.focusbox.classList.add('hidden'); } }
  function focusPhaseEnd() {
    Sound.init(); sfx('level');
    if (focusT.phase === 'focus') { focusT.phase = 'break'; focusT.left = S.settings.breakMin * 60; setMini('stretch', 6); UI.toast('Break time! Stand up and stretch with mini you.'); }
    else { focusT.phase = 'focus'; focusT.left = S.settings.focusMin * 60; setMini('read'); UI.toast('Break over. Back to the story!'); }
  }
  function renderFocus() {
    if (!focusT) return; const b = el.focusbox; b.classList.remove('hidden');
    b.innerHTML = ''; b.append(h('span', { text: (focusT.phase === 'focus' ? 'Focus ' : 'Break ') + fmtClock(focusT.left) }),
      h('button', { class: 'pbtn', onclick: () => { focusT.running = !focusT.running; renderFocus(); } }, focusT.running ? 'Pause' : 'Resume'),
      h('button', { class: 'pbtn', onclick: stopFocus }, 'Stop'));
    b.classList.toggle('brk', focusT.phase === 'break');
  }

  /* ---------- read aloud ---------- */
  function speak(text, continuous) {
    if (!('speechSynthesis' in window)) { UI.toast('Read aloud is not available on this computer.'); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.rate = 0.95;
    u.onend = () => { if (continuous && speaking && open) { if (cur + (isSpread() ? 2 : 1) <= total) turn(1).then(() => setTimeout(speakPage, 400)); else stopSpeak(); } else if (!continuous) setMini('read'); };
    speechSynthesis.speak(u); setMini('talk', 9999);
  }
  async function speakPage() {
    if (!speaking || !pdf) return;
    const parts = [];
    for (const n of visiblePages()) { let t = textCache.get(n); if (t == null) { const pg = await pdf.getPage(n); const tc = await pg.getTextContent(); t = tc.items.map(i => i.str).join(' '); textCache.set(n, t); } parts.push(t); }
    const text = parts.join(' ').trim();
    if (!text) { UI.toast('This page has no readable text (it may be a scanned image).'); stopSpeak(); return; }
    speak(text, true);
  }
  function toggleSpeak() { if (speaking) stopSpeak(); else { speaking = true; el.speak.classList.add('on'); el.speak.textContent = 'Stop reading'; speakPage(); } }
  function stopSpeak() { speaking = false; try { speechSynthesis.cancel(); } catch (e) { /* not supported */ } if (el.speak) { el.speak.classList.remove('on'); el.speak.textContent = 'Read aloud'; } if (mini.state === 'talk') setMini('read'); }

  /* ---------- finishing a book ---------- */
  function finishFlow() {
    if (!book) return;
    const b = book; let rating = b.rating || 0, mood = b.mood || '';
    const stars = h('div', { class: 'stars' }), moods = h('div', { class: 'moods' });
    const drawStars = () => { stars.innerHTML = ''; for (let i = 1; i <= 5; i++) stars.append(h('button', { class: i <= rating ? 'on' : '', title: i + ' stars', onclick: () => { rating = i; drawStars(); } }, '★')); };
    const MOODS = [['😍', 'Loved it'], ['😭', 'Made me cry'], ['🤯', 'Mind-blown'], ['😂', 'So funny'], ['🥰', 'Cozy'], ['😴', 'A bit slow'], ['💜', 'Purple heart']];
    const drawMoods = () => { moods.innerHTML = ''; for (const [m, label] of MOODS) moods.append(h('button', { class: mood === m ? 'on' : '', title: label, onclick: () => { mood = m; drawMoods(); } }, m)); };
    drawStars(); drawMoods();
    const review = h('textarea', { rows: 4, maxlength: 3000, placeholder: 'What did you think? (only you can see this)', value: b.review || '' });
    UI.modal({
      title: b.finished ? 'Your book journal' : 'You finished a book!',
      body: h('div', { class: 'finish' }, h('p', {}, h('b', { text: b.title }), b.author ? ' by ' + b.author : ''), h('h4', { text: 'Your rating' }), stars, h('h4', { text: 'How did it make you feel?' }), moods, h('h4', { text: 'Short review' }), review),
      buttons: [{ text: b.finished ? 'Save' : 'Finish book', cls: 'gold', onClick: () => {
        const first = !b.finished;
        b.rating = rating; b.mood = mood; b.review = review.value.trim();
        if (first) { b.finished = true; b.finishedAt = Date.now(); addXP(100); addCoins(50, 'Finished a book'); Ach.checkBooks(); setMini('cheer', 6); UI.confetti(); sfx('level'); Bus.emit('finished', b); }
        Store.save(); el.end.classList.add('hidden');
      } }, { text: 'Cancel' }]
    });
  }

  /* ---------- mini you, reading along ---------- */
  function setMini(state, secs) { mini.state = state; mini.t = 0; mini.until = secs ? Date.now() + secs * 1000 : 0; }
  function placeMini() { if (!el.mini) return; el.mini.style.display = S.settings.showMini ? '' : 'none'; const c = S.settings.miniCorner || 'br'; el.mini.className = 'mini-' + c; }
  function setupMiniDrag() {
    let drag = null;
    el.mini.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; el.mini.setPointerCapture(e.pointerId); });
    el.mini.addEventListener('pointerup', e => {
      if (!drag) return; const moved = Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 20; drag = null;
      if (!moved) { setMini('heart', 2); sfx('pop'); return; }
      const r = el.stage.getBoundingClientRect(); S.settings.miniCorner = (e.clientY < r.top + r.height / 2 ? 't' : 'b') + (e.clientX < r.left + r.width / 2 ? 'l' : 'r'); Store.save(); placeMini();
    });
  }
  function drawMini(t) {
    if (!open || !el.mini || !S.settings.showMini || !S.profile) return;
    const g = el.mini.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 60, 36);
    if (mini.until && Date.now() > mini.until) setMini('read');
    const sp = charSprites(S.profile, S.equip || {}), st = mini.state;
    if (st === 'stretch' || st === 'cheer') {
      const fr = Math.floor(t * 3) % 2; g.drawImage(sp.hold[0][fr ? 1 : 0], 0, 2 - fr);
      if (st === 'cheer' && Math.random() < 0.3) { R(g, pick(['#e8c25a', '#d98e9a', '#c9b2e6', '#a8d39b']), rnd(0, 26), rnd(0, 12), 1, 1); }
    } else {
      g.drawImage(sp.read, 0, 3);
      if (st === 'sleep') { const sk = S.profile.skin; R(g, sk, 6, 15, 10, 3); R(g, COL, 7, 17, 2, 1); R(g, COL, 12, 17, 2, 1); g.fillStyle = '#9b7a67'; g.font = '7px monospace'; g.fillText('z', 18 + (t % 2) * 2, 8 - (t % 2) * 2); }
      if (st === 'talk' && Math.floor(t * 6) % 2) R(g, '#b06a6a', 10, 20, 2, 2);
      // the little book in hands
      const bc = (book && book.color) || '#b5605a';
      R(g, COL, 4, 20, 14, 8); R(g, bc, 5, 21, 12, 6); R(g, CREAM, 6, 21, 5, 5); R(g, CREAM, 12, 21, 4, 5); R(g, '#d9c6b8', 11, 21, 1, 5);
      if (mini.flip > 0) { mini.flip -= 1 / 60; R(g, '#ece2d8', 11 + Math.round((1 - mini.flip * 2) * 4), 21, 2, 5); }
      R(g, '#c3a492', 7, 23, 3, 1); R(g, '#c3a492', 13, 23, 2, 1);
      if (st === 'highlight') { R(g, COL, 17, 15, 2, 8); R(g, '#f2d36b', 17, 13, 2, 3); }
    }
    if (st === 'heart') { const k = (t % 1.2) / 1.2, y = Math.round(6 - k * 6); g.globalAlpha = 1 - k; R(g, '#d98e9a', 18, y, 2, 2); R(g, '#d98e9a', 21, y, 2, 2); R(g, '#d98e9a', 18, y + 1, 5, 2); R(g, '#d98e9a', 19, y + 3, 3, 1); g.globalAlpha = 1; }
    if (S.pet) {
      const mood = Pets.mood(), sleepy = mini.state === 'sleep' || (mood !== 'hungry' && Math.floor(t / 20) % 3 === 2);
      const spr = catSprite(S.pet.fur, mood === 'hungry' ? 'sad' : sleepy ? 'sleep' : 'sit', Math.floor(t * 1.2) % 2, Pets.grown(), { bow: !!(S.pet.acc || {}).bow, hat: !!(S.pet.acc || {}).hat, scarf: !!(S.pet.acc || {}).scarf });
      g.drawImage(spr, 27, 8);
      if (mood === 'hungry' && Math.floor(t / 3) % 3 === 0) { R(g, OL, 44, 0, 15, 10); R(g, CREAM, 45, 1, 13, 8); g.drawImage(iconCanvas('fish', 1), 46, 0); }
    }
  }
  (function loop() { requestAnimationFrame(loop); if (open) drawMini(performance.now() / 1000); })();

  /* ---------- reading a new PDF's details (used when adding books) ---------- */
  async function inspect(buf, fallbackTitle) {
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)), ...PDF_OPTS() }).promise;
    let title = '', author = '';
    try { const md = await doc.getMetadata(); title = (md.info && md.info.Title || '').trim(); author = (md.info && md.info.Author || '').trim(); } catch (e) { /* no metadata */ }
    if (!title || /^(untitled|microsoft word|document)/i.test(title) || title.length > 120) title = fallbackTitle;
    let color = BOOK_COLORS[hash(title) % BOOK_COLORS.length];
    try {
      const pg = await doc.getPage(1), vp = pg.getViewport({ scale: 1 }), sc = 60 / vp.width, v2 = pg.getViewport({ scale: sc });
      const c = mkCanvas(Math.ceil(v2.width), Math.ceil(v2.height)); await pg.render({ canvasContext: c.getContext('2d'), viewport: v2 }).promise;
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 16) { const R0 = d[i], G0 = d[i + 1], B0 = d[i + 2], mx = Math.max(R0, G0, B0), mn = Math.min(R0, G0, B0); if (mx > 235 && mn > 225) continue; if (mx < 25) continue; if (mx - mn < 18) continue; r += R0; g += G0; b += B0; n++; }
      if (n > 40) { const avg = rgbToHex(r / n, g / n, b / n); color = mix(mix(avg, '#9b7a67', 0.3), '#f6efe9', 0.08); }
    } catch (e) { /* keep palette color */ }
    const pages = doc.numPages; doc.destroy();
    return { title: title.slice(0, 120), author: author.slice(0, 80), pages, color };
  }

  return { open: openBook, close, inspect, get isOpen() { return open; }, get book() { return book; }, THEMES };
})();
