'use strict';
/* Dokseo: every sound is generated live with Web Audio, so the app ships no audio files. */
const Sound = (() => {
  let ac = null, master, sfxG, musG, ambG, noiseBuf, brownBuf, pinkBuf;
  let musicOn = false, musicTimer = 0, step = 0, nextT = 0, amb = null;
  const N = n => 440 * Math.pow(2, (n - 69) / 12);

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    try { ac = new AC(); } catch (e) { return false; }
    master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
    sfxG = ac.createGain(); musG = ac.createGain(); ambG = ac.createGain();
    const verb = ac.createConvolver(); verb.buffer = impulse(2.4);
    const vg = ac.createGain(); vg.gain.value = 0.35; verb.connect(vg); vg.connect(master);
    sfxG.connect(master); musG.connect(master); musG.connect(verb); ambG.connect(master);
    noiseBuf = makeNoise('white'); brownBuf = makeNoise('brown'); pinkBuf = makeNoise('pink');
    applyVolumes();
    return true;
  }
  function impulse(sec) {
    const len = Math.floor(ac.sampleRate * sec), b = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    return b;
  }
  function makeNoise(kind) {
    const len = ac.sampleRate * 3, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
    let last = 0, b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else if (kind === 'pink') {
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
      } else d[i] = w;
    }
    return b;
  }
  function applyVolumes() {
    if (!ac) return; const st = S.settings;
    sfxG.gain.value = st.sfx; musG.gain.value = st.music * 0.5; ambG.gain.value = st.ambientVol;
  }
  function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  function tone(freq, dur, { type = 'square', vol = 0.12, when = 0, slide = 0, attack = 0.005, dest = null } = {}) {
    if (!ac) return; const t = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    env(g, t, attack, vol, dur); o.connect(g); g.connect(dest || sfxG); o.start(t); o.stop(t + attack + dur + 0.05);
  }
  function noise(dur, { freq = 1200, q = 1, type = 'bandpass', vol = 0.2, when = 0, attack = 0.005, buf = null } = {}) {
    if (!ac) return; const t = ac.currentTime + when, s = ac.createBufferSource(); s.buffer = buf || noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain(); env(g, t, attack, vol, dur);
    s.connect(f); f.connect(g); g.connect(sfxG); s.start(t, Math.random() * 2); s.stop(t + attack + dur + 0.05);
  }
  const sfx = {
    click() { tone(880, 0.04, { vol: 0.05 }); },
    step() { noise(0.035, { freq: 650, q: 2, vol: 0.035 }); },
    hop() { tone(380, 0.12, { type: 'triangle', vol: 0.08, slide: 1.8 }); },
    place() { tone(N(72), 0.08, { type: 'triangle', vol: 0.12 }); tone(N(79), 0.14, { type: 'triangle', vol: 0.12, when: 0.08 }); noise(0.06, { freq: 500, vol: 0.08 }); },
    page() { noise(0.26, { freq: 2400, q: 0.7, vol: 0.15, attack: 0.04 }); noise(0.16, { freq: 900, q: 0.8, vol: 0.05, when: 0.06 }); },
    coin() { tone(N(84), 0.06, { vol: 0.06 }); tone(N(91), 0.12, { vol: 0.06, when: 0.06 }); },
    level() { [72, 76, 79, 84, 88].forEach((n, i) => tone(N(n), 0.2, { type: 'triangle', vol: 0.12, when: i * 0.09 })); },
    open() { tone(N(67), 0.5, { type: 'sine', vol: 0.12, slide: 2.5, attack: 0.02 }); [84, 88, 91, 96].forEach((n, i) => tone(N(n), 0.1, { type: 'triangle', vol: 0.05, when: 0.25 + i * 0.06 })); },
    close() { tone(N(79), 0.3, { type: 'sine', vol: 0.1, slide: 0.5 }); },
    purr() { for (let i = 0; i < 6; i++) noise(0.16, { freq: 140, q: 2, vol: 0.14, when: i * 0.21, buf: brownBuf, type: 'lowpass' }); },
    meow() { tone(N(76), 0.3, { type: 'sine', vol: 0.09, slide: 0.7, attack: 0.04 }); tone(N(83), 0.16, { type: 'triangle', vol: 0.03, slide: 0.75, attack: 0.04 }); },
    drum() { tone(110, 0.2, { type: 'sine', vol: 0.32, slide: 0.5 }); noise(0.08, { freq: 300, vol: 0.12 }); },
    error() { tone(220, 0.12, { vol: 0.05 }); tone(180, 0.16, { vol: 0.05, when: 0.1 }); },
    sparkle() { [96, 100, 103].forEach((n, i) => tone(N(n), 0.08, { type: 'triangle', vol: 0.04, when: i * 0.05 })); },
    buy() { [79, 84, 88].forEach((n, i) => tone(N(n), 0.1, { vol: 0.06, when: i * 0.07 })); },
    eat() { [0, 1, 2].forEach(i => noise(0.05, { freq: 1800, q: 3, vol: 0.06, when: i * 0.12 })); },
    pop() { tone(600, 0.06, { type: 'sine', vol: 0.08, slide: 1.6 }); }
  };

  /* gentle lofi music, made of soft electric-piano chords */
  const PROG = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
  const MEL = [72, 74, 76, 79, 81, 84];
  const BEAT = 60 / 70;
  function keyNote(n, t, dur, vol) {
    const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), g2 = ac.createGain(), f = ac.createBiquadFilter();
    o.type = 'sine'; o2.type = 'triangle'; o.frequency.value = N(n); o2.frequency.value = N(n) * 2.003;
    f.type = 'lowpass'; f.frequency.value = 1600; g2.gain.value = 0.14;
    o2.connect(g2); g2.connect(g); o.connect(g); g.connect(f); f.connect(musG);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
  }
  function tick(t) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf; const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = ac.createGain(); g.gain.setValueAtTime(0.012, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    s.connect(f); f.connect(g); g.connect(musG); s.start(t, Math.random()); s.stop(t + 0.05);
  }
  function schedule() {
    while (nextT < ac.currentTime + 0.35) {
      const bar = Math.floor(step / 8) % PROG.length, e = step % 8, ch = PROG[bar], t = nextT;
      if (e === 0) { keyNote(ch[0] - 12, t, BEAT * 3.6, 0.09); ch.slice(1).forEach((n, i) => keyNote(n, t + i * 0.035, BEAT * 3.6, 0.04)); }
      if (e === 5) ch.slice(1).forEach(n => keyNote(n, t, BEAT * 1.6, 0.025));
      if (e % 2 === 1 && Math.random() < 0.33) keyNote(pick(MEL), t, BEAT * 1.3, 0.03);
      if (e % 2 === 0) tick(t);
      nextT += BEAT / 2; step++;
    }
  }
  function startMusic() { if (!ac || musicOn || S.settings.music <= 0) return; musicOn = true; nextT = ac.currentTime + 0.15; musicTimer = setInterval(schedule, 60); }
  function stopMusic() { musicOn = false; clearInterval(musicTimer); }

  /* ambient sounds for reading */
  function loopSrc(buf) { const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, Math.random() * 2); return s; }
  function stopAmbient() {
    if (!amb || !ac) return; const a = amb; amb = null; clearInterval(a.timer);
    a.gain.gain.setTargetAtTime(0.0001, ac.currentTime, 0.25);
    setTimeout(() => a.nodes.forEach(n => { try { if (n.stop) n.stop(); n.disconnect(); } catch (e) { /* already stopped */ } }), 1500);
  }
  function ambient(kind) {
    if (!init()) return; if (amb && amb.kind === kind) return; stopAmbient(); if (!kind || kind === 'off') return;
    const g = ac.createGain(); g.gain.value = 0.0001; g.connect(ambG); g.gain.setTargetAtTime(1, ac.currentTime, 0.6);
    const nodes = [g]; let timer = 0;
    const filt = (type, freq, q = 0.7) => { const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; return f; };
    const gn = v => { const x = ac.createGain(); x.gain.value = v; return x; };
    const chain = (src, ...fs) => { let last = src; nodes.push(src); for (const f of fs) { last.connect(f); last = f; nodes.push(f); } last.connect(g); };
    const oneShot = fn => () => { if (amb && amb.gain === g) fn(g); };
    if (kind === 'rain') {
      chain(loopSrc(pinkBuf), filt('highpass', 400), filt('lowpass', 7000), gn(0.55));
      chain(loopSrc(brownBuf), filt('lowpass', 300), gn(0.25));
      timer = setInterval(oneShot(drop), 80);
    } else if (kind === 'fire') {
      chain(loopSrc(brownBuf), filt('lowpass', 500), gn(0.6));
      timer = setInterval(oneShot(crackle), 70);
    } else if (kind === 'cafe') {
      chain(loopSrc(pinkBuf), filt('bandpass', 480, 0.5), gn(0.5));
      chain(loopSrc(brownBuf), filt('lowpass', 200), gn(0.2));
      timer = setInterval(oneShot(clink), 220);
    } else if (kind === 'focus') {
      chain(loopSrc(brownBuf), filt('lowpass', 260), gn(0.9));
    } else if (kind === 'night') {
      chain(loopSrc(pinkBuf), filt('lowpass', 800), gn(0.12));
      timer = setInterval(oneShot(cricket), 280);
    }
    amb = { kind, gain: g, nodes, timer };
  }
  function drop(dest) {
    if (Math.random() > 0.7) return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(), f = rnd(1800, 4200);
    o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.03);
    g.gain.setValueAtTime(0.02 * Math.random() + 0.001, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.05);
  }
  function crackle(dest) {
    if (Math.random() > 0.35) return;
    const t = ac.currentTime, s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = rnd(1500, 5000); f.Q.value = 2;
    const g = ac.createGain(); g.gain.setValueAtTime(rnd(0.05, 0.25), t); g.gain.exponentialRampToValueAtTime(0.0001, t + rnd(0.01, 0.04));
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 2); s.stop(t + 0.06);
  }
  function clink(dest) {
    if (Math.random() > 0.06) return;
    const t = ac.currentTime;
    [1, 2.7].forEach(m => { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = rnd(1500, 2100) * m; g.gain.setValueAtTime(0.025, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.45); });
  }
  function cricket(dest) {
    if (Math.random() > 0.3) return;
    const t = ac.currentTime;
    for (let i = 0; i < 3; i++) { const o = ac.createOscillator(), g = ac.createGain(), tt = t + i * 0.06; o.type = 'sine'; o.frequency.value = 4400; g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.02, tt + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.04); o.connect(g); g.connect(dest); o.start(tt); o.stop(tt + 0.05); }
  }
  return {
    init, sfx, tone, startMusic, stopMusic, ambient, stopAmbient, applyVolumes,
    get musicOn() { return musicOn; }, get ready() { return !!ac; }, get ambientKind() { return amb ? amb.kind : 'off'; }
  };
})();
function sfx(name) { if (Sound.ready && Sound.sfx[name]) Sound.sfx[name](); }
