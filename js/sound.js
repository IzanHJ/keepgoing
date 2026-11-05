/* KeepGoing — sonido con Web Audio API: efectos, audio espacial y música relajante generativa.
   Todo se sintetiza en el momento (sin archivos ni derechos de autor). El AudioContext solo arranca tras un gesto del
   usuario (restricciones de autoplay del navegador); lo que suene antes espera a ese primer toque.

   v1.39:
   · Audio espacial: cada efecto sale del punto de la pantalla donde tocaste (PannerNode HRTF; con auriculares se oye a
     izquierda/derecha y arriba/abajo) y todo pasa por una sala con reverberación generada aquí mismo.
   · Música generativa: pads suaves, bajo y notas de campana que nunca se repiten. Cada pestaña tiene su ambiente
     (tonalidad, modo, tempo y brillo) y cambia al siguiente acorde sin cortes. Los pads giran despacio alrededor de ti.
   · Se adapta a lo que haces: cada toque sube la «energía» (más notas, más brillo), la música se aparta un instante para
     dejar oír el efecto y a veces contesta con una nota en su tonalidad; los logros abren un arpegio y los fallos la
     oscurecen un momento. Al valorar el día, la música sigue la nota que eliges. */
(function (root) {
  'use strict';
  const AC = root.AudioContext || root.webkitAudioContext;

  /* ---------- teoría musical (pura, se prueba en tests/sound.test.js) ---------- */
  const midiHz = m => 440 * Math.pow(2, (m - 69) / 12);
  const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10], aeolian: [0, 2, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11], mixo: [0, 2, 4, 5, 7, 9, 10] };
  // root = nota MIDI de la tónica · prog = grados de los acordes · bar = segundos por acorde · bright/density 0..1
  const MOODS = {
    habits: { root: 60, scale: 'major', prog: [0, 5, 3, 4], bar: 9, bright: .55, density: .5 },
    cal: { root: 62, scale: 'dorian', prog: [0, 3, 6, 4], bar: 9, bright: .5, density: .45 },
    journal: { root: 57, scale: 'aeolian', prog: [0, 5, 2, 6], bar: 11, bright: .35, density: .35 },
    gym: { root: 64, scale: 'dorian', prog: [0, 6, 5, 6], bar: 6.5, bright: .7, density: .7, pulse: true },
    ledger: { root: 65, scale: 'lydian', prog: [0, 1, 0, 4], bar: 10, bright: .5, density: .4 },
    chat: { root: 67, scale: 'mixo', prog: [0, 6, 3, 0], bar: 9, bright: .6, density: .45 },
    mastery: { root: 58, scale: 'major', prog: [0, 3, 5, 4], bar: 10, bright: .6, density: .5 },
    // Ambientes que se pueden fijar a mano en Ajustes
    calm: { root: 60, scale: 'lydian', prog: [0, 4, 0, 1], bar: 12, bright: .4, density: .3 },
    focus: { root: 62, scale: 'dorian', prog: [0, 3, 0, 4], bar: 8, bright: .45, density: .25, pulse: true },
    night: { root: 55, scale: 'aeolian', prog: [0, 5, 3, 6], bar: 13, bright: .25, density: .3 },
    dawn: { root: 64, scale: 'major', prog: [0, 3, 4, 5], bar: 9, bright: .7, density: .55 }
  };
  const MOOD_CHOICES = ['auto', 'calm', 'focus', 'night', 'dawn'];
  // Ambiente de la valoración del día: de grave y menor (0) a luminoso y lidio (10)
  function rateMood(v) {
    v = Math.max(0, Math.min(10, +v || 0));
    return { root: 62, scale: v < 4 ? 'aeolian' : v < 7 ? 'dorian' : 'lydian', prog: v < 4 ? [0, 5, 3, 4] : v < 7 ? [0, 3, 0, 4] : [0, 4, 1, 0], bar: 10 - v * .3, bright: .2 + v * .06, density: .2 + v * .05 };
  }
  function moodOf(name, extra) { if (name === 'rate') return rateMood(extra && extra.v); return MOODS[name] || MOODS.habits; }
  // Nota MIDI del grado i de la escala (admite grados negativos o mayores que 7: cambian de octava)
  function scaleNote(mood, i) { const sc = SCALES[mood.scale] || SCALES.major, n = sc.length, o = Math.floor(i / n); return mood.root + o * 12 + sc[((i % n) + n) % n]; }
  // Acorde por terceras sobre el grado deg (tríada + séptima opcional)
  function chordOf(mood, deg, seventh = true) { const g = [0, 2, 4].concat(seventh ? [6] : []); return g.map(x => scaleNote(mood, deg + x)); }
  // Notas de la melodía: pentatónica dentro de la escala (grados 0,1,2,4,5), una octava arriba
  function melodyPool(mood) { return [0, 1, 2, 4, 5, 7, 8, 9].map(i => scaleNote(mood, i) + 12); }
  // Punto de la pantalla (px) → posición 3D delante del oyente (x a izquierda/derecha, y arriba/abajo)
  function screenToSpace(x, y, w, h) {
    const nx = w ? Math.max(-1, Math.min(1, (x / w) * 2 - 1)) : 0, ny = h ? Math.max(-1, Math.min(1, (y / h) * 2 - 1)) : 0;
    return { x: +(nx * 2.4).toFixed(3), y: +(-ny * 1.2).toFixed(3), z: -1.4 };
  }
  const theory = { midiHz, SCALES, MOODS, MOOD_CHOICES, rateMood, moodOf, scaleNote, chordOf, melodyPool, screenToSpace };

  /* ---------- ajustes ---------- */
  const cfg = { sfx: true, music: false, spatial: true, adaptive: true, sfxVol: .7, musicVol: .45, mood: 'auto' };
  let ctx = null, master = null, sfxBus = null, musicBus = null, musicDuck = null, verbIn = null, sfxSend = null, dest = null;
  let lastPos = null, pending = [];

  function noiseBuffer(c, dur, decay) {
    const n = Math.floor(c.sampleRate * dur), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (decay ? Math.pow(1 - i / n, decay) : 1); }
    return b;
  }
  function ensure() {
    if (!AC) return null;
    if (!ctx) {
      try {
        ctx = new AC();
        const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = .01; comp.release.value = .25;
        master = ctx.createGain(); master.gain.value = .9; master.connect(comp); comp.connect(ctx.destination);
        // Sala: reverberación con una respuesta de impulso generada (ruido estéreo que se apaga en 2,8 s)
        const verb = ctx.createConvolver(); verb.buffer = noiseBuffer(ctx, 2.8, 3.2); verbIn = ctx.createGain(); verbIn.gain.value = .5; verbIn.connect(verb); verb.connect(master);
        sfxBus = ctx.createGain(); sfxBus.connect(master);
        sfxSend = ctx.createGain(); sfxSend.gain.value = .22; sfxSend.connect(verbIn);
        musicBus = ctx.createGain(); musicBus.gain.value = 0; musicDuck = ctx.createGain(); musicDuck.connect(musicBus); musicBus.connect(master);
        const mSend = ctx.createGain(); mSend.gain.value = .55; musicBus.connect(mSend); mSend.connect(verbIn);
        applyVolumes();
      } catch (e) { ctx = null; return null; }
    }
    return ctx;
  }
  function applyVolumes() {
    if (!ctx) return;
    const t = ctx.currentTime;
    sfxBus.gain.setTargetAtTime(cfg.sfx ? cfg.sfxVol : 0, t, .05);
    if (M.on) musicBus.gain.setTargetAtTime(cfg.musicVol * .5, t, .6);
  }
  // Desbloqueo con el primer gesto: arranca el audio, suena lo que esperaba y empieza la música si está activada
  function unlock() {
    if (!cfg.sfx && !cfg.music) return;
    const c = ensure(); if (!c) return;
    const go = () => { if (cfg.music) mStart(); const now = Date.now(), q = pending; pending = []; q.forEach(p => { if (now - p.at < 30000) run(p.name, p.arg, p.pos); }); };
    if (c.state === 'running') go(); else c.resume().then(go).catch(() => {});
  }
  if (root.addEventListener) {
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => root.addEventListener(ev, unlock, { capture: true, passive: true }));
    root.addEventListener('pointerdown', e => { lastPos = { x: e.clientX, y: e.clientY, at: Date.now() }; }, { capture: true, passive: true });
  }
  // Con la app en segundo plano el audio se para (ahorra batería) y vuelve al volver
  if (root.document && root.document.addEventListener) root.document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (root.document.hidden) ctx.suspend().catch(() => {});
    else if (cfg.music) ctx.resume().catch(() => {});
  });

  /* ---------- espacio: de dónde sale cada sonido ---------- */
  function place(node, p) {
    if (node.positionX) { const t = ctx.currentTime; node.positionX.setValueAtTime(p.x, t); node.positionY.setValueAtTime(p.y, t); node.positionZ.setValueAtTime(p.z, t); }
    else if (node.setPosition) node.setPosition(p.x, p.y, p.z);
  }
  function panner() {
    const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 1.5; p.rolloffFactor = .4; return p;
  }
  function sfxOut(pos) {
    const g = ctx.createGain(); g.connect(sfxBus); g.connect(sfxSend);
    if (!cfg.spatial) return g;
    const W = root.innerWidth || 0, H = root.innerHeight || 0;
    const at = pos || (lastPos && Date.now() - lastPos.at < 1500 ? lastPos : null);
    const s = at ? screenToSpace(at.x, at.y, W, H) : { x: 0, y: 0, z: -1.4 };
    try { const p = panner(); place(p, s); p.connect(g); return p; } catch (e) { return g; }
  }

  /* ---------- piezas de síntesis ---------- */
  // Una nota con envolvente suave (ataque corto y caída exponencial)
  function tone(freq, at, dur, o = {}) {
    const c = ctx, t0 = c.currentTime + at, g = c.createGain(), osc = c.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + (o.glide || dur));
    if (o.detune) osc.detune.value = o.detune;
    const peak = o.gain ?? 0.2;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + (o.attack ?? 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(o.out || dest);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }
  // Campana: fundamental + parcial agudo
  const bell = (f, at, dur, gain = 0.16) => { tone(f, at, dur, { gain }); tone(f * 2.01, at, dur * 0.6, { gain: gain * 0.35 }); };
  // Campana inarmónica (como un gong pequeño o la campana de un ring)
  const ding = (f, at, dur, gain = .12) => [[1, 1], [2.76, .45], [5.4, .22], [8.9, .1]].forEach(([k, a]) => tone(f * k, at, dur / Math.sqrt(k), { gain: gain * a, attack: .003 }));
  // Ruido filtrado (soplos, barridos, golpes)
  function noise(at, dur, o = {}) {
    const c = ctx, t0 = c.currentTime + at, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = noiseBuffer(c, dur + .05, 0); f.type = o.type || 'bandpass'; f.Q.value = o.q ?? 1;
    f.frequency.setValueAtTime(o.f0 || 1200, t0); if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t0 + dur);
    const pk = o.gain ?? .12;
    g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(pk, t0 + (o.attack ?? dur * .35)); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(o.out || dest); src.start(t0); src.stop(t0 + dur + .05);
  }
  // Golpe grave (bombo suave)
  const thump = (at, gain = .25, f = 120) => tone(f, at, .35, { to: 42, glide: .25, gain, attack: .004 });
  const N = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, D6: 1174.66, E6: 1318.5, G6: 1568, C7: 2093 };
  const PENTA = [N.C5, N.D5, N.E5, N.G5, N.A5, N.C6, N.D6, N.E6, N.G6, N.C7, N.C7 * 1.122];

  const SOUNDS = {
    tap: () => tone(N.A5, 0, 0.05, { type: 'triangle', gain: 0.06 }),
    toggle: () => { tone(N.E5, 0, 0.05, { type: 'triangle', gain: 0.07 }); tone(N.A5, 0.05, 0.06, { type: 'triangle', gain: 0.07 }); },
    complete: () => { bell(N.E5, 0, 0.35); bell(N.B5, 0.08, 0.45); },
    points: () => { [N.C6, N.E6, N.G6].forEach((f, i) => tone(f, i * 0.05, 0.12, { type: 'triangle', gain: 0.07 })); },
    // Día perfecto: escalera de campanas, acorde que se queda y un brillo que sube
    perfect: () => { [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => bell(f, i * 0.09, 0.6, 0.13)); [N.C5, N.E5, N.G5].forEach(f => tone(f, 0.4, 1.2, { gain: 0.05, attack: .2 })); noise(.35, 1.2, { f0: 3000, f1: 9000, q: 2, gain: .025 }); },
    // Semana perfecta: pequeña fanfarria I-IV-V-I con pad que crece
    perfectWeek: () => {
      const ch = [[N.C5, N.E5, N.G5], [N.F4, N.A4, N.C5], [N.G4, N.B4, N.D5], [N.C5, N.E5, N.G5, N.C6]];
      ch.forEach((c, i) => c.forEach((f, j) => bell(f, i * .22 + j * .02, i === 3 ? 1.6 : .5, i === 3 ? .1 : .08)));
      [N.C4, N.G4, N.E5].forEach(f => tone(f, .6, 2.2, { type: 'triangle', gain: .045, attack: .5 }));
      thump(.66, .18); noise(.66, 1.8, { f0: 2500, f1: 10000, q: 1.5, gain: .03 });
    },
    // Mes perfecto: arpegio de dos octavas, coro de osciladores y estela de chispas
    perfectMonth: () => {
      const ar = [N.C4, N.E4, N.G4, N.C5, N.E5, N.G5, N.C6, N.E6, N.G6, N.C7];
      ar.forEach((f, i) => bell(f, i * .07, .9, .07 + i * .004));
      [N.C4, N.G4, N.C5, N.E5, N.G5].forEach((f, i) => { tone(f, .7, 3, { type: 'sawtooth', gain: .012, attack: .8, detune: -7 }); tone(f, .7, 3, { type: 'sawtooth', gain: .012, attack: .8, detune: 7 }); tone(f, .7, 3, { gain: .035, attack: .8 }); });
      thump(.7, .25, 90);
      for (let i = 0; i < 14; i++) tone(PENTA[5 + (i % 6)], 1 + i * .12 + Math.random() * .05, .3, { type: 'triangle', gain: .03 });
    },
    levelup: () => { [N.G4, N.C5, N.E5, N.G5].forEach((f, i) => tone(f, i * 0.1, 0.22, { type: 'triangle', gain: 0.14 })); [N.C5, N.E5, N.G5, N.C6].forEach(f => tone(f, 0.42, 1.0, { type: 'triangle', gain: 0.06 })); },
    unlock: () => { bell(N.E6, 0, 1.2, 0.12); bell(N.B5, 0.15, 1.2, 0.08); },
    money: () => { tone(N.B5, 0, 0.08, { type: 'square', gain: 0.05 }); tone(N.E6, 0.08, 0.35, { type: 'square', gain: 0.05 }); },
    pop: () => tone(620, 0, 0.09, { to: 310, gain: 0.12 }),
    undo: () => tone(N.E5, 0, 0.16, { to: N.C4 * 1.5, type: 'triangle', gain: 0.08 }),
    slip: () => { tone(N.E4, 0, 0.25, { type: 'triangle', gain: 0.08 }); tone(N.C4, 0.12, 0.35, { type: 'triangle', gain: 0.08 }); },
    // Papel que se rasga: ruido filtrado con chasquidos sueltos (generado, sin grabaciones)
    tear: () => {
      const c = ctx, dur = 1.6, t0 = c.currentTime, n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.03 ? 1 : 0.22);
      const src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
      src.buffer = buf; bp.type = 'bandpass'; bp.Q.value = 0.8;
      bp.frequency.setValueAtTime(1500, t0); bp.frequency.linearRampToValueAtTime(3400, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.32, t0 + 0.12);
      g.gain.setValueAtTime(0.28, t0 + dur - 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(bp); bp.connect(g); g.connect(dest); src.start(t0); src.stop(t0 + dur + 0.05);
    },

    /* --- Línea de tiempo --- */
    tlStep: () => { noise(0, .05, { f0: 2400, q: 4, gain: .07, attack: .004 }); tone(N.G5, 0, .07, { type: 'triangle', gain: .045 }); },
    tlZoomIn: () => { noise(0, .38, { f0: 500, f1: 3200, q: 1.2, gain: .09 }); tone(N.C5, .12, .3, { to: N.G5, glide: .2, gain: .05 }); },
    tlZoomOut: () => { noise(0, .42, { f0: 3200, f1: 420, q: 1.2, gain: .09 }); tone(N.G5, .1, .32, { to: N.C5, glide: .22, gain: .05 }); },
    tlPanel: () => { tone(N.D6, 0, .09, { type: 'triangle', gain: .045 }); tone(N.A5, .06, .14, { type: 'triangle', gain: .04 }); },
    tlMark: () => { bell(N.E6, 0, .5, .07); bell(N.E6, .18, .4, .025); },
    tlPick: () => tone(420, 0, .14, { to: 880, glide: .08, gain: .08 }),
    tlReplay: () => { noise(0, .5, { f0: 300, f1: 2600, q: 2, gain: .07 }); [N.C5, N.G5, N.C6].forEach((f, i) => bell(f, .2 + i * .1, .5, .07)); },
    tlFrame: () => { noise(0, .04, { f0: 3600, q: 6, gain: .04, attack: .003 }); },
    tlToggle: () => { tone(N.E5, 0, .06, { type: 'triangle', gain: .06 }); tone(N.B5, .05, .08, { type: 'triangle', gain: .05 }); },

    /* --- Libreta --- */
    income: () => { [N.E5, N.G5, N.C6].forEach((f, i) => tone(f, i * .06, .22, { type: 'square', gain: .035 })); bell(N.E6, .18, .5, .06); noise(.18, .4, { f0: 6000, q: 3, gain: .02 }); },
    expense: () => { tone(N.A5, 0, .12, { type: 'triangle', gain: .07 }); tone(N.E5, .08, .26, { type: 'triangle', gain: .06 }); noise(0, .12, { f0: 900, q: 1, gain: .03 }); },
    invest: () => { tone(N.C5, 0, .6, { to: N.C6, glide: .5, gain: .04, attack: .05 }); [N.G5, N.C6, N.E6].forEach((f, i) => bell(f, .25 + i * .12, .6, .07)); },

    /* --- compartir --- */
    share: () => { noise(0, .32, { f0: 700, f1: 5000, q: 1.4, gain: .08 }); tone(N.E5, .05, .25, { to: N.E6, glide: .2, gain: .04 }); bell(N.B5, .28, .5, .06); },

    /* --- valoración del día --- */
    rateOpen: () => { noise(0, .9, { f0: 300, f1: 1800, q: .8, gain: .05, attack: .5 }); [N.D4, N.A4, N.E5].forEach(f => tone(f, .1, 1.3, { gain: .03, attack: .6 })); },
    rateTick: v => { const i = Math.max(0, Math.min(10, v | 0)); tone(PENTA[i], 0, .1, { type: 'triangle', gain: .05 + i * .002 }); if (i <= 3) tone(PENTA[i] * .944, 0, .1, { type: 'triangle', gain: .02 }); },
    rateSave: v => {
      v = Math.max(0, Math.min(10, v | 0));
      if (v >= 8) { [N.C5, N.E5, N.G5, N.C6, N.E6].forEach((f, i) => bell(f, i * .07, .8, .09)); [N.C4, N.G4].forEach(f => tone(f, .3, 1.4, { type: 'triangle', gain: .05, attack: .2 })); }
      else if (v >= 5) { bell(N.G5, 0, .5, .1); bell(N.C6, .1, .7, .09); tone(N.C5, .1, 1, { gain: .04, attack: .2 }); }
      else { tone(N.A4, 0, .9, { gain: .07, attack: .05 }); tone(N.E5, .15, 1.1, { gain: .04, attack: .2 }); } // consuela, no castiga
    },

    /* --- gimnasio --- */
    gymStart: () => { thump(0, .3); noise(.05, .5, { f0: 200, f1: 2400, q: 1.5, gain: .06 }); tone(N.E4, .3, .25, { type: 'sawtooth', gain: .03 }); tone(N.B4, .42, .4, { type: 'sawtooth', gain: .03 }); bell(N.E5, .42, .5, .07); },
    gymFinish: () => { thump(0, .3, 100); [N.E5, N.G5, N.B5, N.E6].forEach((f, i) => bell(f, .1 + i * .1, .9, .1)); tone(N.E4, .3, 1.5, { type: 'triangle', gain: .05, attack: .3 }); },
    setDone: () => { [[1, .07], [2.4, .04], [3.9, .025], [6.3, .012]].forEach(([k, a]) => tone(330 * k, 0, .28 / Math.sqrt(k), { gain: a, attack: .002 })); noise(0, .05, { f0: 3000, q: 2, gain: .05, attack: .003 }); },
    setStart: () => { ding(N.A5, 0, 1.4, .1); ding(N.A5, .3, 1.2, .07); }
  };
  // Peso de cada sonido en la «energía» de la música (lo que no aparece cuenta 0,03)
  const ENERGY = { perfect: .35, perfectWeek: .5, perfectMonth: .6, levelup: .3, gymFinish: .35, gymStart: .25, setDone: .08, complete: .1, income: .12, invest: .12, share: .1, rateSave: .2, unlock: .15 };
  const BLOOM = { perfect: 1, perfectWeek: 1, perfectMonth: 1, levelup: 1, gymFinish: 1, unlock: .6 };
  const DARK = { slip: 1, undo: .4 };

  function run(name, arg, pos) {
    const c = ensure(); if (!c) return;
    try { dest = sfxOut(pos); SOUNDS[name](arg); } catch (e) { /* audio no disponible */ }
    if (cfg.adaptive) react(name, arg);
  }
  function play(name, arg, pos) {
    if (!cfg.sfx || !SOUNDS[name]) return;
    const c = ensure(); if (!c) return;
    if (c.state !== 'running') { pending.push({ name, arg, pos, at: Date.now() }); if (pending.length > 3) pending.shift(); c.resume().then(() => { const q = pending; pending = []; q.forEach(p => run(p.name, p.arg, p.pos)); }).catch(() => {}); return; }
    run(name, arg, pos);
  }

  /* ---------- música generativa ---------- */
  const M = { on: false, name: 'habits', extra: null, t: 0, step: 0, energy: 0, dark: 0, timer: 0, voices: new Set(), cur: null };
  const curMood = () => moodOf(cfg.mood !== 'auto' ? cfg.mood : M.name, M.extra);
  function mVoice(midi, t0, dur, o = {}) {
    const c = ctx, f = midiHz(midi), g = c.createGain(), lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = .6; lp.frequency.setValueAtTime(o.cut || 1200, t0);
    const pk = o.gain || .04, a = o.attack ?? 2.4, r = o.release ?? 3;
    g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(pk, t0 + a); g.gain.setValueAtTime(pk, t0 + Math.max(a, dur - r)); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    const types = o.types || ['triangle', 'sine'], oscs = types.map((ty, i) => { const x = c.createOscillator(); x.type = ty; x.frequency.value = f; x.detune.value = (i ? 1 : -1) * (o.det ?? 6); x.connect(lp); x.start(t0); x.stop(t0 + dur + .05); return x; });
    lp.connect(g);
    let out = g;
    if (cfg.spatial && o.az != null) {
      try {
        const p = panner(), d = 2.2, a0 = o.az, a1 = o.az + (o.orbit || 0);
        if (p.positionX) { p.positionX.setValueAtTime(Math.sin(a0) * d, t0); p.positionZ.setValueAtTime(-Math.cos(a0) * d, t0); p.positionY.setValueAtTime(o.y || 0, t0); p.positionX.linearRampToValueAtTime(Math.sin(a1) * d, t0 + dur); p.positionZ.linearRampToValueAtTime(-Math.cos(a1) * d, t0 + dur); }
        else p.setPosition(Math.sin(a0) * d, o.y || 0, -Math.cos(a0) * d);
        g.connect(p); out = p;
      } catch (e) { out = g; }
    }
    out.connect(musicDuck);
    const v = { oscs, end: t0 + dur }; M.voices.add(v); oscs[0].onended = () => M.voices.delete(v);
  }
  function mBar(t0) {
    const md = curMood(), e = M.energy, bar = md.bar * (1 - e * .15), deg = md.prog[M.step % md.prog.length];
    const cut = 380 + md.bright * 1500 + e * 1300 - M.dark * 300;
    // Pad: el acorde, cada nota desde un sitio distinto alrededor tuyo, girando despacio
    chordOf(md, deg).forEach((m, i, arr) => mVoice(m - 12, t0, bar + 3, { cut, gain: .03, az: (i / arr.length) * Math.PI * 2 + M.step * .7, orbit: .9 }));
    // Bajo
    mVoice(scaleNote(md, deg) - 24, t0, bar + 1.5, { cut: 300, gain: .045, attack: 1.2, release: 1.5, types: ['sine', 'sine'], det: 2 });
    // Campanas: más cuanto más activo estás
    const pool = melodyPool(md), n = Math.round((md.density + e * .9) * 4 * (.5 + Math.random() * .7));
    for (let i = 0; i < n; i++) mBell(pool[Math.floor(Math.random() * pool.length)], t0 + Math.random() * bar, .022 + e * .01);
    // Pulso suave (gimnasio y foco)
    if (md.pulse) for (let b = 0; b < 4; b++) mVoice(scaleNote(md, deg) - 12, t0 + b * bar / 4, .5, { cut: 500 + e * 800, gain: .03 + e * .02, attack: .01, release: .45, types: ['triangle', 'sine'] });
    M.step++; return bar;
  }
  function mBell(midi, t0, gain = .025, az) {
    const f = midiHz(midi);
    mVoice(midi, t0, 2.6, { cut: 4000, gain, attack: .01, release: 2.5, types: ['sine', 'sine'], det: 1, az: az ?? Math.random() * Math.PI * 2, y: .6 });
    tone(f * 3.01, t0 - ctx.currentTime, 1.2, { gain: gain * .15, out: musicDuck });
  }
  function mTick() {
    if (!ctx || !M.on) return;
    const now = ctx.currentTime;
    M.energy = Math.max(0, M.energy - .006); M.dark = Math.max(0, M.dark - .02);
    if (M.t < now) M.t = now + .05;
    while (M.t < now + 1.2) M.t += mBar(M.t);
  }
  function mStart() {
    if (!ctx || M.on || !cfg.music) return;
    M.on = true; M.t = ctx.currentTime + .1;
    musicBus.gain.cancelScheduledValues(ctx.currentTime); musicBus.gain.setValueAtTime(.0001, ctx.currentTime); musicBus.gain.setTargetAtTime(cfg.musicVol * .5, ctx.currentTime, 1.2);
    mTick(); M.timer = setInterval(mTick, 300);
  }
  function mStop() {
    if (!M.on) return;
    M.on = false; clearInterval(M.timer); M.timer = 0;
    if (!ctx) return;
    const t = ctx.currentTime; musicBus.gain.cancelScheduledValues(t); musicBus.gain.setTargetAtTime(0, t, .5);
    M.voices.forEach(v => v.oscs.forEach(o => { try { o.stop(t + 2.5); } catch (e) { /* ya parado */ } })); M.voices.clear();
  }
  // Reacción de la música a lo que acabas de hacer
  function react(name, arg) {
    if (!M.on || !ctx) return;
    const t = ctx.currentTime, md = curMood();
    M.energy = Math.min(1, M.energy + (ENERGY[name] ?? .03));
    if (DARK[name]) M.dark = Math.min(1, M.dark + DARK[name]);
    // Se aparta un momento para que el efecto se oiga claro
    musicDuck.gain.cancelScheduledValues(t); musicDuck.gain.setValueAtTime(musicDuck.gain.value, t); musicDuck.gain.linearRampToValueAtTime(.5, t + .05); musicDuck.gain.setTargetAtTime(1, t + .25, .35);
    if (BLOOM[name]) { // arpegio en la tonalidad de la música
      const ch = chordOf(md, md.prog[(M.step + 3) % md.prog.length]).concat(chordOf(md, 0).map(m => m + 12));
      ch.forEach((m, i) => mBell(m + 12, t + .6 + i * .11, .03 * BLOOM[name], (i / ch.length) * Math.PI * 2));
    } else if (!DARK[name] && Math.random() < .35) { // a veces contesta con una nota suelta
      const pool = melodyPool(md); mBell(pool[Math.floor(Math.random() * pool.length)], t + .45 + Math.random() * .3, .02);
    }
  }
  function setMood(name, extra) {
    const same = name === M.name && JSON.stringify(extra || null) === JSON.stringify(M.extra);
    if (same) return; M.name = name; M.extra = extra || null;
  }

  /* ---------- API ---------- */
  function configure(o = {}) {
    for (const k of Object.keys(cfg)) if (o[k] !== undefined) cfg[k] = o[k];
    cfg.sfxVol = Math.max(0, Math.min(1, +cfg.sfxVol)); cfg.musicVol = Math.max(0, Math.min(1, +cfg.musicVol));
    if (!MOOD_CHOICES.includes(cfg.mood)) cfg.mood = 'auto';
    applyVolumes();
    if (cfg.music) { if (ctx && ctx.state === 'running') mStart(); } else mStop();
  }
  // Prueba del audio espacial: una campana que da la vuelta alrededor tuyo
  function testSpatial() {
    const c = ensure(); if (!c || !cfg.sfx) return;
    const go = () => { const W = root.innerWidth || 400, H = root.innerHeight || 800; [[.05, .5], [.5, .1], [.95, .5], [.5, .95]].forEach(([x, y], i) => setTimeout(() => run('tlMark', 0, { x: x * W, y: y * H }), i * 450)); };
    if (c.state === 'running') go(); else c.resume().then(go).catch(() => {});
  }
  root.KGSound = {
    play, configure, mood: setMood, testSpatial, theory,
    setEnabled: v => configure({ sfx: !!v }),
    get enabled() { return cfg.sfx; }, get config() { return { ...cfg }; }, get musicOn() { return M.on; },
    names: Object.keys(SOUNDS)
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.KGSound;
})(typeof self !== 'undefined' ? self : this);
