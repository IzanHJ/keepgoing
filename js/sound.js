/* KeepGoing — sonidos sintetizados con Web Audio API (sin archivos ni derechos de autor).
   El AudioContext solo se crea tras un gesto del usuario (restricciones de autoplay del navegador). */
(function (root) {
  'use strict';
  let ctx = null, master = null, enabled = true;
  const AC = root.AudioContext || root.webkitAudioContext;
  function ensure() {
    if (!AC) return null;
    if (!ctx) {
      try { ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination); } catch (e) { ctx = null; return null; }
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  // Desbloqueo con el primer gesto (pulsar o tecla)
  const unlock = () => { if (enabled) ensure(); };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => root.addEventListener && root.addEventListener(ev, unlock, { capture: true, passive: true }));

  // Una nota con envolvente suave (ataque corto y caída exponencial)
  function tone(freq, at, dur, o = {}) {
    const c = ctx, t0 = c.currentTime + at, g = c.createGain(), osc = c.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    const peak = o.gain ?? 0.2;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + (o.attack ?? 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }
  // Campana: fundamental + parcial agudo
  const bell = (f, at, dur, gain = 0.16) => { tone(f, at, dur, { gain }); tone(f * 2.01, at, dur * 0.6, { gain: gain * 0.35 }); };
  const N = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, E6: 1318.5, G6: 1568, G4: 392, C4: 261.63, E4: 329.63 };

  const SOUNDS = {
    tap: () => tone(N.A5, 0, 0.05, { type: 'triangle', gain: 0.06 }),
    toggle: () => { tone(N.E5, 0, 0.05, { type: 'triangle', gain: 0.07 }); tone(N.A5, 0.05, 0.06, { type: 'triangle', gain: 0.07 }); },
    complete: () => { bell(N.E5, 0, 0.35); bell(N.B5, 0.08, 0.45); },
    points: () => { [N.C6, N.E6, N.G6].forEach((f, i) => tone(f, i * 0.05, 0.12, { type: 'triangle', gain: 0.07 })); },
    perfect: () => { [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => bell(f, i * 0.09, 0.5, 0.13)); [N.C5, N.E5, N.G5].forEach(f => tone(f, 0.4, 0.9, { gain: 0.05 })); },
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
      src.connect(bp); bp.connect(g); g.connect(master); src.start(t0); src.stop(t0 + dur + 0.05);
    }
  };
  function play(name) {
    if (!enabled || !SOUNDS[name]) return;
    const c = ensure(); if (!c || c.state !== 'running' && c.state !== 'suspended') return;
    try { SOUNDS[name](); } catch (e) { /* audio no disponible */ }
  }
  root.KGSound = { play, setEnabled: v => { enabled = !!v; }, get enabled() { return enabled; }, names: Object.keys(SOUNDS) };
})(typeof self !== 'undefined' ? self : this);
