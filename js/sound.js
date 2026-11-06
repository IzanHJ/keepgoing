/* KeepGoing — sonido con Web Audio API: efectos, audio espacial y música relajante generativa.
   Todo se sintetiza en el momento (sin archivos ni derechos de autor). El AudioContext solo arranca tras un gesto del
   usuario (restricciones de autoplay del navegador); lo que suene antes espera a ese primer toque.

   v1.39–1.41: música generativa (pads, bajo y campanas que nunca se repiten; cada pestaña con su ambiente) que se
   adapta a lo que haces (más energía, se aparta al sonar un efecto, arpegio con los logros, se oscurece con un fallo).

   v1.42 — audio espacial de verdad y efectos con el estilo de la música:
   · El punto donde tocas se convierte en una dirección alrededor de tu cabeza (hasta 80° a cada lado, con curva para
     que lo que tocas cerca del centro también se separe) y no en un desplazamiento pequeño delante de ti.
   · Los sonidos que «se mueven» viajan de verdad: compartir se aleja hacia arriba, acercar viene hacia ti, alejar se va,
     avanzar o retroceder en la Línea de tiempo cruza de un lado a otro, y las celebraciones te rodean.
   · La música abre el acorde en arco (izquierda, centro, derecha) en vez de repartirlo en círculo, que lo anulaba y
     sonaba centrado; un pad da la vuelta despacio, las campanas salen de cualquier sitio (también de detrás) y el bajo
     queda delante.
   · Los efectos usan los mismos instrumentos que la música (pulsación, campana, pad, aire y golpe suave), suenan en la
     tonalidad y sobre el acorde del ambiente que esté sonando, y comparten la misma sala de reverberación. */
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
  // Punto de la pantalla (px) → dirección alrededor del oyente: az (grados, − izquierda / + derecha) y el (grados, arriba +).
  // La curva |x|^0,6 separa también lo que tocas cerca del centro, que en el móvil es casi todo.
  function screenToPolar(x, y, w, h) {
    const nx = w ? Math.max(-1, Math.min(1, (x / w) * 2 - 1)) : 0, ny = h ? Math.max(-1, Math.min(1, (y / h) * 2 - 1)) : 0;
    return { az: Math.round(Math.sign(nx) * Math.pow(Math.abs(nx), .6) * 80), el: Math.round(-ny * 30) };
  }
  // Dirección (grados) y distancia → coordenadas del PannerNode (el oyente mira hacia −z, arriba es +y)
  function polarToXyz(p, r) {
    const d = r ?? p.r ?? 1.6, a = (p.az || 0) * Math.PI / 180, e = (p.el || 0) * Math.PI / 180, f = n => +n.toFixed(3) || 0;
    return { x: f(d * Math.sin(a) * Math.cos(e)), y: f(d * Math.sin(e)), z: f(-d * Math.cos(a) * Math.cos(e)) };
  }
  const screenToSpace = (x, y, w, h) => polarToXyz(screenToPolar(x, y, w, h));
  // Acorde del pad repartido en arco delante de ti (de −70° a 70°), que se desplaza un poco en cada compás
  function arcSpread(n, step) { const sway = Math.sin(step * .9) * 18; return Array.from({ length: n }, (_, i) => Math.round((n > 1 ? -70 + 140 * i / (n - 1) : 0) + sway)); }
  const theory = { midiHz, SCALES, MOODS, MOOD_CHOICES, rateMood, moodOf, scaleNote, chordOf, melodyPool, screenToPolar, polarToXyz, screenToSpace, arcSpread };

  /* ---------- ajustes ---------- */
  const cfg = { sfx: true, music: false, spatial: true, adaptive: true, sfxVol: .7, musicVol: .45, mood: 'auto' };
  let ctx = null, master = null, sfxBus = null, sfxIn = null, sfxSend = null, musicBus = null, musicDuck = null, verbIn = null;
  let lastPos = null, pending = [], dest = null, here = { az: 0, el: 0 };

  function noiseBuffer(c, dur, decay) {
    const n = Math.floor(c.sampleRate * dur), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (decay ? Math.pow(1 - i / n, decay) : 1); }
    return b;
  }
  // Sala compartida por música y efectos: respuesta de impulso estéreo (izquierda y derecha distintas para que envuelva),
  // con un pequeño retardo inicial y una cola que se va oscureciendo, como una habitación de verdad.
  function roomIR(c, dur = 2.6) {
    const sr = c.sampleRate, n = Math.floor(sr * dur), pre = Math.floor(sr * .018), b = c.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch); let lp = 0;
      for (let i = pre; i < n; i++) { const k = (i - pre) / (n - pre), a = .6 - .5 * k; lp += a * ((Math.random() * 2 - 1) - lp); d[i] = lp * Math.pow(1 - k, 2.6); }
    }
    return b;
  }
  function ensure() {
    if (!AC) return null;
    if (!ctx) {
      try {
        ctx = new AC();
        const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = .01; comp.release.value = .25;
        master = ctx.createGain(); master.gain.value = .9; master.connect(comp); comp.connect(ctx.destination);
        const verb = ctx.createConvolver(); verb.buffer = roomIR(ctx); verbIn = ctx.createGain(); verbIn.gain.value = .5; verbIn.connect(verb); verb.connect(master);
        // Efectos: cada uno entra ya colocado en el espacio (sfxIn) → volumen de efectos + un poco de la misma sala
        sfxBus = ctx.createGain(); sfxBus.connect(master);
        sfxIn = ctx.createGain(); sfxIn.connect(sfxBus);
        sfxSend = ctx.createGain(); sfxSend.gain.value = .2; sfxIn.connect(sfxSend); sfxSend.connect(verbIn);
        musicBus = ctx.createGain(); musicBus.gain.value = 0; musicDuck = ctx.createGain(); musicDuck.connect(musicBus); musicBus.connect(master);
        const mSend = ctx.createGain(); mSend.gain.value = .38; musicBus.connect(mSend); mSend.connect(verbIn);
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

  /* ---------- espacio: de dónde sale cada sonido y hacia dónde va ---------- */
  function panner() {
    const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 1.6; p.rolloffFactor = 1; p.maxDistance = 60; return p;
  }
  const lerpP = (a, b, k) => ({ az: a.az + (b.az - a.az) * k, el: (a.el || 0) + ((b.el || 0) - (a.el || 0)) * k, r: (a.r ?? 1.6) + ((b.r ?? 1.6) - (a.r ?? 1.6)) * k });
  // Sombra de la cabeza: el HRTF del navegador solo separa unos 6 dB entre oídos, poco para notarlo. Se baja además el
  // oído lejano hasta −9 dB según el ángulo (como hace la cabeza con los agudos) sin tocar el retardo entre oídos.
  const SHADOW = .355;
  const earGains = p => { const s = Math.sin((p.az || 0) * Math.PI / 180) * Math.cos((p.el || 0) * Math.PI / 180); return [1 - (1 - SHADOW) * Math.max(0, s), 1 - (1 - SHADOW) * Math.max(0, -s)]; };
  // Crea el punto: panner HRTF → sombra por oído → out. Si hay p2, se mueve hasta allí entre t0 y t0+dur
  // (por pasos, para girar en arco y no en línea recta). Devuelve el nodo de entrada.
  function placed(p, out, t0, p2, dur) {
    const c = ctx, pn = panner(), sp = c.createChannelSplitter(2), mg = c.createChannelMerger(2), gl = c.createGain(), gr = c.createGain();
    pn.connect(sp); sp.connect(gl, 0); sp.connect(gr, 1); gl.connect(mg, 0, 0); gr.connect(mg, 0, 1); mg.connect(out);
    const now = c.currentTime, set = (q, tt, ramp) => {
      const v = polarToXyz(q), [a, b] = earGains(q);
      if (pn.positionX) [['positionX', 'x'], ['positionY', 'y'], ['positionZ', 'z']].forEach(([k, ax]) => pn[k][ramp ? 'linearRampToValueAtTime' : 'setValueAtTime'](v[ax], tt));
      else if (!ramp) pn.setPosition(v.x, v.y, v.z);
      gl.gain[ramp ? 'linearRampToValueAtTime' : 'setValueAtTime'](a, tt); gr.gain[ramp ? 'linearRampToValueAtTime' : 'setValueAtTime'](b, tt);
    };
    set(p, now);
    if (p2 && pn.positionX) {
      set(p, Math.max(now, t0));
      const steps = Math.max(6, Math.min(32, Math.ceil(Math.abs(p2.az - p.az) / 15) + 6));
      for (let k = 1; k <= steps; k++) set(lerpP(p, p2, k / steps), t0 + dur * k / steps, true);
    }
    return pn;
  }
  // Un punto del espacio para los efectos (opcionalmente moviéndose hasta p2 entre «at» y «at+dur» segundos)
  function spot(p, p2, at = 0, dur = .5) {
    if (!cfg.spatial) return sfxIn;
    try { return placed(p, sfxIn, ctx.currentTime + at, p2, dur); } catch (e) { return sfxIn; }
  }
  // Posición relativa al punto donde tocaste
  const rel = (daz = 0, del = 0, r) => ({ az: here.az + daz, el: Math.max(-40, Math.min(60, here.el + del)), r: r ?? 1.6 });

  /* ---------- instrumentos: los mismos para la música y para los efectos ---------- */
  // Voz base: dos osciladores ligeramente desafinados, filtro paso bajo y envolvente suave
  function voice(midi, t0, dur, o = {}) {
    const c = ctx, f = o.hz || midiHz(midi), g = c.createGain(), lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = o.q ?? .6; lp.frequency.setValueAtTime(o.cut || 1200, t0);
    if (o.cutTo) lp.frequency.exponentialRampToValueAtTime(o.cutTo, t0 + dur);
    const pk = o.gain || .04, a = Math.min(o.attack ?? 2.4, dur * .9), r = o.release ?? 3;
    g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(pk, t0 + a); g.gain.setValueAtTime(pk, t0 + Math.max(a, dur - r)); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    const oscs = (o.types || ['triangle', 'sine']).map((ty, i) => {
      const x = c.createOscillator(); x.type = ty; x.frequency.setValueAtTime(f, t0);
      if (o.to) x.frequency.exponentialRampToValueAtTime(o.to, t0 + (o.glide || dur));
      x.detune.value = (i ? 1 : -1) * (o.det ?? 6); x.connect(lp); x.start(t0); x.stop(t0 + dur + .05); return x;
    });
    lp.connect(g); g.connect(o.out || dest);
    return oscs;
  }
  // Aire: ruido suave filtrado (soplos, barridos), el mismo «aire» que acompaña a la música
  function air(t0, dur, o = {}) {
    const c = ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = noiseBuffer(c, dur + .05, 0); f.type = o.type || 'bandpass'; f.Q.value = o.q ?? .8;
    f.frequency.setValueAtTime(o.f0 || 1200, t0); if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t0 + dur);
    const pk = o.gain ?? .05;
    g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(pk, t0 + (o.attack ?? dur * .4)); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(o.out || dest); src.start(t0); src.stop(t0 + dur + .05);
  }
  const at0 = at => ctx.currentTime + at;
  // Pulsación (como el pulso del Gimnasio y del ambiente Foco): ataque rápido y filtro que se cierra
  const pluck = (m, at, o = {}) => voice(m, at0(at), o.dur || .45, { types: ['triangle', 'sine'], det: 4, cut: o.cut || 2400, cutTo: 600, attack: .006, release: o.dur || .45, gain: o.gain || .07, to: o.to, glide: o.glide, out: o.out });
  // Campana (como las de la música): par de senos casi unísonos + parcial agudo que se apaga antes
  function bell(m, at, dur = 1.2, gain = .06, out) {
    const t0 = at0(at), d = out || dest;
    voice(m, t0, dur, { types: ['sine', 'sine'], det: 1, cut: 4500, attack: .006, release: dur, gain, out: d });
    voice(m, t0, dur * .45, { hz: midiHz(m) * 3.01, types: ['sine'], det: 0, cut: 9000, attack: .004, release: dur * .45, gain: gain * .18, out: d });
  }
  // Pad (como los acordes de la música), con ataque más corto para que acompañe al efecto
  const pad = (m, at, dur, gain = .03, out) => voice(m, at0(at), dur, { cut: 900 + K.bright * 1400, attack: Math.min(.5, dur * .35), release: dur * .6, gain, out });
  // Golpe suave (el bajo de la música cayendo una octava)
  const thump = (m, at, gain = .14, out) => voice(m, at0(at), .45, { types: ['sine', 'sine'], det: 0, to: midiHz(m) / 2, glide: .3, cut: 500, attack: .006, release: .45, gain, out });
  const sweep = (at, dur, f0, f1, gain = .05, out) => air(at0(at), dur, { f0, f1, gain, out });

  /* ---------- tonalidad: los efectos suenan en el ambiente y sobre el acorde que esté sonando ---------- */
  let K = { md: MOODS.habits, deg: 0, bright: .55 };
  function curDeg() { if (!M.on || !ctx) return 0; const now = ctx.currentTime; let d = M.hist.length ? M.hist[0].deg : 0; for (const h of M.hist) if (h.t <= now + .05) d = h.deg; return d; }
  const n = (i, oct = 1) => scaleNote(K.md, K.deg + i) + 12 * oct; // grado i del acorde actual (0, 2, 4, 6 = notas del acorde)
  const tn = (i, oct = 1) => scaleNote(K.md, i) + 12 * oct;        // grado i de la tónica (para cerrar y celebrar)

  const SOUNDS = {
    tap: () => pluck(n(4), 0, { dur: .18, gain: .05, cut: 2200 }),
    toggle: () => { pluck(n(2), 0, { dur: .2, gain: .055 }); pluck(n(4), .06, { dur: .26, gain: .055 }); },
    complete: () => { bell(n(2), 0, 1.1, .07); bell(n(4), .08, 1.4, .07); bell(n(7), .16, 1, .025); },
    success: () => { pluck(n(0), 0, { dur: .3, gain: .06 }); bell(n(4), .07, 1.2, .065); },
    points: () => [0, 2, 4].forEach((d, i) => pluck(n(d, 2), i * .05, { dur: .25, gain: .04, cut: 3200 })),
    // Día perfecto: escalera de campanas que te rodea, el acorde de la tónica que se queda y un brillo que sube por encima
    perfect: () => {
      [0, 2, 4, 7].forEach((d, i) => bell(tn(d), i * .09, 1.3, .065, spot(rel(-60 + i * 40, 10))));
      [0, 2, 4].forEach((d, i) => pad(tn(d, 0), .4, 1.9, .028, spot({ az: -60 + i * 60, el: 0, r: 2 })));
      sweep(.35, 1.4, 2500, 8000, .02, spot({ az: here.az, el: 10 }, { az: here.az, el: 60, r: 2.5 }, .35, 1.4));
    },
    // Semana perfecta: I-IV-V-I, cada acorde desde un lado distinto (izquierda, detrás, derecha y delante), con pad y golpe
    perfectWeek: () => {
      const dirs = [-90, 180, 90, 0];
      [0, 3, 4, 0].forEach((deg, i) => { const o = spot({ az: dirs[i], el: 10, r: 2 }); chordOf(K.md, deg, false).concat(i === 3 ? [tn(7, 0)] : []).forEach((m, j) => bell(m + 12, i * .22 + j * .02, i === 3 ? 1.8 : .7, i === 3 ? .055 : .045, o)); });
      [0, 4, 9].forEach((d, i) => pad(tn(d, 0), .6, 2.4, .03, spot({ az: -70 + i * 70, el: 0, r: 2.2 })));
      thump(tn(0, -1), .66, .14, spot({ az: 0, el: -10 }));
      sweep(.66, 1.8, 2500, 9000, .022, spot({ az: 0, el: 20 }, { az: 0, el: 60, r: 3 }, .66, 1.8));
    },
    // Mes perfecto: arpegio de dos octavas que da una vuelta entera a tu alrededor, coro de pads y chispas desde arriba
    perfectMonth: () => {
      [0, 2, 4, 7, 9, 11, 14, 16, 18, 21].forEach((d, i) => bell(tn(d, 0), i * .07, 1.1, .045 + i * .003, spot({ az: here.az + i * 36, el: 5 + i * 3, r: 1.8 })));
      [0, 4, 7, 9, 11].forEach((d, i) => pad(tn(d, 0), .7, 3, .026, spot({ az: -80 + i * 40, el: 0, r: 2.2 })));
      thump(tn(0, -1), .7, .16, spot({ az: 0, el: -10 }));
      const pool = melodyPool(K.md);
      for (let i = 0; i < 14; i++) bell(pool[i % pool.length] + 12, 1 + i * .12 + Math.random() * .05, .5, .02, spot({ az: Math.random() * 360 - 180, el: 30 + Math.random() * 30, r: 2.5 }));
    },
    // Subir de nivel: pulsaciones que suben y cruzan de izquierda a derecha, y el acorde que se abre
    levelup: () => {
      [-3, 0, 2, 4].forEach((d, i) => pluck(tn(d), i * .1, { dur: .35, gain: .07, out: spot(rel(-45 + i * 30)) }));
      [0, 2, 4, 7].forEach((d, i) => pad(tn(d), .42, 1.3, .025, spot({ az: -60 + i * 40, el: 5, r: 2 })));
    },
    unlock: () => { const o = spot(rel(0, 25)); bell(n(4, 2), 0, 1.6, .06, o); bell(n(0, 2), .15, 1.6, .045, o); },
    money: () => { pluck(n(4), 0, { dur: .15, gain: .05 }); bell(n(0, 2), .08, .7, .05); },
    pop: () => pluck(n(4), 0, { dur: .14, gain: .08, to: midiHz(n(0)), glide: .08 }),
    undo: () => pluck(n(4), 0, { dur: .3, gain: .06, to: midiHz(n(0, 0)), glide: .2, out: spot(rel(), rel(0, -10, 3.5), 0, .3) }),
    // Fallo: dos notas que bajan, más graves y un poco más lejos (consuela, no castiga)
    slip: () => { const o = spot(rel(0, -15, 2.4)); pluck(n(2, 0), 0, { dur: .35, gain: .07, cut: 1200, out: o }); pluck(n(0, 0), .12, { dur: .5, gain: .07, cut: 1000, out: o }); },
    // Papel que se rasga: ruido con chasquidos que cruza de un lado a otro (generado, sin grabaciones)
    tear: () => {
      const c = ctx, dur = 1.6, t0 = c.currentTime, len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.03 ? 1 : 0.22);
      const src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
      src.buffer = buf; bp.type = 'bandpass'; bp.Q.value = 0.8;
      bp.frequency.setValueAtTime(1500, t0); bp.frequency.linearRampToValueAtTime(3400, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.24, t0 + 0.12);
      g.gain.setValueAtTime(0.2, t0 + dur - 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(bp); bp.connect(g); g.connect(spot(rel(-35), rel(35), 0, dur)); src.start(t0); src.stop(t0 + dur + 0.05);
    },

    /* --- Línea de tiempo --- */
    // Paso: cruza en el sentido en que avanzas (−1 hacia la izquierda, +1 hacia la derecha)
    tlStep: dir => { const s = dir < 0 ? -1 : dir > 0 ? 1 : 0, o = s ? spot(rel(-s * 35), rel(s * 35), 0, .2) : dest; sweep(0, .08, 2400, 0, .05, o); pluck(n(s < 0 ? 2 : 4), 0, { dur: .16, gain: .045, out: o }); },
    // Acercar: viene desde lejos hasta ti · Alejar: se va
    tlZoomIn: () => { const o = spot(rel(0, 0, 7), rel(0, 0, 1), 0, .4); sweep(0, .4, 500, 3200, .07, o); pluck(n(0), .1, { dur: .35, gain: .05, to: midiHz(n(4)), glide: .2, out: o }); },
    tlZoomOut: () => { const o = spot(rel(0, 0, 1), rel(0, 0, 7), 0, .45); sweep(0, .45, 3200, 420, .07, o); pluck(n(4), .08, { dur: .38, gain: .05, to: midiHz(n(0)), glide: .22, out: o }); },
    tlPanel: () => { pluck(n(7), 0, { dur: .14, gain: .04 }); pluck(n(4), .06, { dur: .2, gain: .035 }); },
    // Marca: campana y su eco desde el lado contrario
    tlMark: () => { bell(n(2, 2), 0, .8, .06); bell(n(2, 2), .18, .6, .022, spot({ az: -here.az || 50, el: here.el, r: 2.5 })); },
    tlPick: () => pluck(n(0), 0, { dur: .2, gain: .06, to: midiHz(n(7)), glide: .08 }),
    // Replay: un barrido que llega desde detrás y tres campanas que se abren de izquierda a derecha
    tlReplay: () => { sweep(0, .55, 300, 2600, .06, spot({ az: 180, el: 0, r: 2.5 }, rel(), 0, .55)); [0, 4, 7].forEach((d, i) => bell(tn(d), .2 + i * .1, .8, .055, spot({ az: -50 + i * 50, el: 5 }))); },
    tlFrame: () => sweep(0, .04, 3600, 0, .025),
    tlToggle: () => { pluck(n(2), 0, { dur: .14, gain: .05 }); pluck(n(6), .05, { dur: .18, gain: .045 }); },

    /* --- Libreta --- */
    income: () => { [2, 4, 7].forEach((d, i) => pluck(n(d), i * .06, { dur: .3, gain: .045 })); bell(n(2, 2), .18, .9, .05, spot(rel(0, 30))); sweep(.18, .5, 6000, 0, .015, spot(rel(0, 30))); },
    expense: () => { pluck(n(4), 0, { dur: .2, gain: .06 }); pluck(n(2), .08, { dur: .32, gain: .055 }); sweep(0, .14, 900, 0, .025); },
    // Inversión: una nota que sube y campanas cada vez más arriba
    invest: () => { pad(n(0), 0, .7, .03); voice(0, at0(0), .7, { hz: midiHz(n(0)), to: midiHz(n(7)), glide: .5, cut: 1800, attack: .05, release: .6, gain: .025 }); [4, 7, 9].forEach((d, i) => bell(n(d), .25 + i * .12, .9, .05, spot(rel(0, 10 + i * 20)))); },

    /* --- compartir: sale de donde tocas y se aleja hacia arriba --- */
    share: () => { const o = spot(rel(), rel(0, 45, 7), .05, .6); sweep(0, .35, 700, 5000, .06, o); pluck(n(2), .05, { dur: .3, gain: .045, to: midiHz(n(2, 2)), glide: .22, out: o }); bell(n(4, 2), .28, .9, .05, o); },

    /* --- valoración del día --- */
    rateOpen: () => { sweep(0, 1, 300, 1800, .045, spot({ az: 180, el: 10, r: 2.5 }, { az: 0, el: 0, r: 1.6 }, 0, 1)); [0, 4, 9].forEach((d, i) => pad(tn(d, 0), .1, 1.5, .022, spot({ az: -60 + i * 60, el: 0, r: 2 }))); },
    // Cada número suena más agudo y más a la derecha, como el deslizador
    rateTick: v => { const i = Math.max(0, Math.min(10, v | 0)); pluck(tn(i), 0, { dur: .2, gain: .05 + i * .002, out: spot({ az: -60 + i * 12, el: 5 }) }); },
    rateSave: v => {
      v = Math.max(0, Math.min(10, v | 0));
      if (v >= 8) { [0, 2, 4, 7, 9].forEach((d, i) => bell(tn(d), i * .07, 1.2, .06, spot({ az: -70 + i * 35, el: 10 }))); [0, 4].forEach((d, i) => pad(tn(d, 0), .3, 1.6, .03, spot({ az: i ? 50 : -50, el: 0 }))); }
      else if (v >= 5) { bell(tn(4), 0, .9, .065); bell(tn(7), .1, 1.1, .06); pad(tn(0), .1, 1.2, .025); }
      else { pad(tn(0, 0), 0, 1.3, .04); bell(tn(4), .15, 1.3, .035); } // consuela, no castiga
    },

    /* --- gimnasio --- */
    gymStart: () => { thump(n(0, -1), 0, .16); sweep(.05, .5, 200, 2400, .05, spot(rel(0, -20), rel(0, 30), .05, .5)); pluck(n(0, 0), .3, { dur: .3, gain: .05 }); pluck(n(4, 0), .42, { dur: .4, gain: .05 }); bell(n(0), .42, .9, .06); },
    gymFinish: () => { thump(tn(0, -1), 0, .16); [0, 2, 4, 7].forEach((d, i) => bell(tn(d), .1 + i * .1, 1.3, .07, spot({ az: -90 + i * 60, el: 10 }))); pad(tn(0, 0), .3, 1.8, .035); },
    // Serie hecha: golpe corto y campana breve, firme
    setDone: () => { thump(n(0, 0), 0, .08); bell(n(4), 0, .5, .055); },
    // Fin del descanso: dos toques de campana, el segundo desde el otro lado
    setStart: () => { bell(n(4, 2), 0, 1.4, .07); bell(n(4, 2), .3, 1.2, .05, spot({ az: -here.az || 40, el: here.el })); },

    // Prueba del audio espacial: una vuelta entera de campanas (delante, derecha, detrás, izquierda) y un pad que gira
    spatialTest: () => {
      [0, 2, 4, 7, 9, 7, 4, 2].forEach((d, i) => bell(tn(d), i * .42, 1, .07, spot({ az: i * 45, el: 0, r: 1.6 })));
      pad(tn(0, 0), 0, 3.6, .03, spot({ az: 0, el: 0, r: 2 }, { az: 360, el: 0, r: 2 }, 0, 3.4));
    }
  };
  // Peso de cada sonido en la «energía» de la música (lo que no aparece cuenta 0,03)
  const ENERGY = { perfect: .35, perfectWeek: .5, perfectMonth: .6, levelup: .3, gymFinish: .35, gymStart: .25, setDone: .08, complete: .1, success: .1, income: .12, invest: .12, share: .1, rateSave: .2, unlock: .15 };
  const BLOOM = { perfect: 1, perfectWeek: 1, perfectMonth: 1, levelup: 1, gymFinish: 1, unlock: .6 };
  const DARK = { slip: 1, undo: .4 };

  function run(name, arg, pos) {
    const c = ensure(); if (!c) return;
    try {
      const W = root.innerWidth || 0, H = root.innerHeight || 0, at = pos || (lastPos && Date.now() - lastPos.at < 1500 ? lastPos : null);
      here = at ? screenToPolar(at.x, at.y, W, H) : { az: 0, el: 0 };
      const md = curMood(); K = { md, deg: curDeg(), bright: md.bright };
      dest = spot(rel()); SOUNDS[name](arg);
    } catch (e) { /* audio no disponible */ }
    if (cfg.adaptive && name !== 'spatialTest') react(name, arg);
  }
  function play(name, arg, pos) {
    if (!cfg.sfx || !SOUNDS[name]) return;
    const c = ensure(); if (!c) return;
    if (c.state !== 'running') { pending.push({ name, arg, pos, at: Date.now() }); if (pending.length > 3) pending.shift(); c.resume().then(() => { const q = pending; pending = []; q.forEach(p => run(p.name, p.arg, p.pos)); }).catch(() => {}); return; }
    run(name, arg, pos);
  }

  /* ---------- música generativa ---------- */
  const M = { on: false, name: 'habits', extra: null, t: 0, step: 0, energy: 0, dark: 0, timer: 0, voices: new Set(), hist: [] };
  const curMood = () => moodOf(cfg.mood !== 'auto' ? cfg.mood : M.name, M.extra);
  // Una voz de la música, colocada en el espacio (o.pos) y, si se pide, girando o.orbit grados mientras suena
  function mVoice(midi, t0, dur, o = {}) {
    let out = musicDuck;
    if (cfg.spatial && o.pos) {
      try { out = placed(o.pos, musicDuck, t0, o.orbit ? { ...o.pos, az: o.pos.az + o.orbit } : null, dur); } catch (e) { out = musicDuck; }
    }
    const oscs = voice(midi, t0, dur, { ...o, out });
    const v = { oscs, end: t0 + dur }; M.voices.add(v); oscs[0].onended = () => M.voices.delete(v);
    return out;
  }
  function mBar(t0) {
    const md = curMood(), e = M.energy, bar = md.bar * (1 - e * .15), deg = md.prog[M.step % md.prog.length];
    M.hist.push({ t: t0, deg }); if (M.hist.length > 4) M.hist.shift();
    const cut = 380 + md.bright * 1500 + e * 1300 - M.dark * 300;
    // Pad: el acorde abierto en arco delante de ti (izquierda, centro, derecha), que se mece un poco en cada compás
    const ch = chordOf(md, deg), arc = arcSpread(ch.length, M.step);
    ch.forEach((m, i) => mVoice(m - 12, t0, bar + 3, { cut, gain: .03, pos: { az: arc[i], el: 0, r: 2.2 }, orbit: (i % 2 ? 1 : -1) * 12 }));
    // Una voz suave da la vuelta entera a tu alrededor en cada acorde (por detrás también)
    mVoice(ch[0], t0, bar + 3, { cut: cut * .8, gain: .012, pos: { az: (M.step * 137) % 360, el: 15, r: 2.4 }, orbit: 360 });
    // Bajo, delante y un poco abajo
    mVoice(scaleNote(md, deg) - 24, t0, bar + 1.5, { cut: 300, gain: .045, attack: 1.2, release: 1.5, types: ['sine', 'sine'], det: 2, pos: { az: 0, el: -10, r: 1.6 } });
    // Campanas desde cualquier dirección: más cuanto más activo estás
    const pool = melodyPool(md), cnt = Math.round((md.density + e * .9) * 4 * (.5 + Math.random() * .7));
    for (let i = 0; i < cnt; i++) mBell(pool[Math.floor(Math.random() * pool.length)], t0 + Math.random() * bar, .022 + e * .01);
    // Pulso suave (gimnasio y foco), alternando izquierda y derecha
    if (md.pulse) for (let b = 0; b < 4; b++) mVoice(scaleNote(md, deg) - 12, t0 + b * bar / 4, .5, { cut: 500 + e * 800, gain: .03 + e * .02, attack: .01, release: .45, types: ['triangle', 'sine'], pos: { az: b % 2 ? 35 : -35, el: 0, r: 1.8 } });
    M.step++; return bar;
  }
  function mBell(midi, t0, gain = .025, az) {
    const pos = { az: az ?? Math.random() * 360 - 180, el: 10 + Math.random() * 40, r: 2 + Math.random() * 2 };
    const out = mVoice(midi, t0, 2.6, { cut: 4000, gain, attack: .01, release: 2.5, types: ['sine', 'sine'], det: 1, pos });
    voice(midi, t0, 1.2, { hz: midiHz(midi) * 3.01, types: ['sine'], det: 0, cut: 9000, attack: .006, release: 1.2, gain: gain * .15, out });
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
    M.on = true; M.t = ctx.currentTime + .1; M.hist = [];
    musicBus.gain.cancelScheduledValues(ctx.currentTime); musicBus.gain.setValueAtTime(.0001, ctx.currentTime); musicBus.gain.setTargetAtTime(cfg.musicVol * .5, ctx.currentTime, 1.2);
    mTick(); M.timer = setInterval(mTick, 300);
  }
  function mStop() {
    if (!M.on) return;
    M.on = false; clearInterval(M.timer); M.timer = 0; M.hist = [];
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
    if (BLOOM[name]) { // arpegio en la tonalidad de la música, que da la vuelta a tu alrededor
      const ch = chordOf(md, md.prog[(M.step + 3) % md.prog.length]).concat(chordOf(md, 0).map(m => m + 12));
      ch.forEach((m, i) => mBell(m + 12, t + .6 + i * .11, .03 * BLOOM[name], here.az + (i / ch.length) * 360));
    } else if (!DARK[name] && Math.random() < .35) { // a veces contesta con una nota suelta, desde el lado contrario al toque
      const pool = melodyPool(md); mBell(pool[Math.floor(Math.random() * pool.length)], t + .45 + Math.random() * .3, .02, -here.az + (Math.random() * 40 - 20));
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
  // Prueba del audio espacial: una vuelta entera de campanas a tu alrededor y un pad que gira
  function testSpatial() {
    const c = ensure(); if (!c || !cfg.sfx) return;
    const go = () => run('spatialTest', 0, null);
    if (c.state === 'running') go(); else c.resume().then(go).catch(() => {});
  }
  root.KGSound = {
    play, configure, mood: setMood, testSpatial, theory,
    setEnabled: v => configure({ sfx: !!v }),
    get enabled() { return cfg.sfx; }, get config() { return { ...cfg }; }, get musicOn() { return M.on; },
    names: Object.keys(SOUNDS).filter(k => k !== 'spatialTest')
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.KGSound;
})(typeof self !== 'undefined' ? self : this);
