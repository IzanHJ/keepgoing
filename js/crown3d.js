/* KeepGoing — corona 3D de la valoración del día (v1.39), con three.js (MIT, copiado en js/vendor; solo se descarga al
   abrir la valoración). Modelo propio hecho en código: aro de oro con ocho puntas que se abren hacia fuera, dos molduras,
   ocho joyas, perlas en las puntas, terciopelo dentro y un orbe arriba (v1.45.2: sin cruz).
   Cambia con la nota igual que la corona plana de antes: con 0-3 es de bronce apagado, pequeña, ladeada y temblorosa;
   desde el 5 se endereza y se dora; las joyas se encienden según la nota y con 8 o más brillan las perlas.
   Gira sola despacio (más rápido cuanto mejor el día) y se puede girar con el dedo. Con «Animaciones: apagadas» no gira
   sola ni tiembla. Si no hay WebGL, la app sigue usando la corona plana. */
(function (root) {
  'use strict';
  const GEMS = ['#ff2d55', '#2f7bff', '#14d98b', '#b44dff', '#ffb020'];
  const TAU = Math.PI * 2;

  /* ---------- forma (pura, se prueba en tests/crown3d.test.js) ---------- */
  // Altura del borde de arriba en el ángulo th: banda + puntas que se alternan altas y bajas
  function crownProfile(th, o = {}) {
    const n = o.n || 8, band = o.band ?? .42, tall = o.tall ?? .62, short = o.short ?? .4;
    const x = ((th / TAU) * n % n + n) % n, i = Math.round(x) % n, d = Math.abs(x - Math.round(x)); // d: 0 en la punta, 0,5 en el valle
    const tri = 1 - d * 2;
    return band + (i % 2 ? short : tall) * Math.pow(Math.max(0, tri), 1.5);
  }
  // Lo que cambia con la nota (0..10, admite decimales)
  function crownLook(v) {
    v = Math.max(0, Math.min(10, +v || 0));
    const q = v / 10, mix = (a, b) => a + (b - a) * q;
    return {
      q, scale: .74 + q * .36, rough: mix(.62, .16), env: mix(.35, 1.35),
      tilt: v < 4 ? -.22 * (1 - v / 4) : 0, tremble: v < 4 ? .025 * (1 - v / 4) : 0,
      lit: Math.round(q * 8), pearls: v >= 8, spin: .12 + q * .55, glow: Math.max(0, (v - 4) / 6)
    };
  }
  // Malla del aro: pared de fuera, pared de dentro, canto de arriba y canto de abajo (cada una con sus propios vértices)
  function ringMesh(o = {}) {
    const S = o.segments || 192, R = o.R || 1, th = o.thick || .055, fl = o.flare ?? .16;
    const pos = [], idx = [];
    const rAt = (r, y) => r * (1 + fl * y);
    const strip = (fnA, fnB, flip) => { // dos filas de S+1 vértices
      const b = pos.length / 3;
      for (let j = 0; j <= S; j++) { const a = j / S * TAU; pos.push(...fnA(a)); }
      for (let j = 0; j <= S; j++) { const a = j / S * TAU; pos.push(...fnB(a)); }
      for (let j = 0; j < S; j++) { const p = b + j, q = b + S + 1 + j; if (flip) idx.push(p, p + 1, q, q, p + 1, q + 1); else idx.push(p, q, p + 1, q, q + 1, p + 1); }
    };
    const P = (r, y, a) => [Math.sin(a) * rAt(r, y), y, Math.cos(a) * rAt(r, y)];
    const top = a => crownProfile(a, o);
    strip(a => P(R, 0, a), a => P(R, top(a), a), true); // fuera
    strip(a => P(R - th, 0, a), a => P(R - th, top(a), a), false); // dentro
    strip(a => P(R, top(a), a), a => P(R - th, top(a), a), true); // canto de arriba
    strip(a => P(R, 0, a), a => P(R - th, 0, a), false); // canto de abajo
    return { positions: new Float32Array(pos), indices: idx };
  }

  /* ---------- escena ---------- */
  function create(THREE, canvas, opts = {}) {
    const motion = opts.motion || 'full';
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, .1, 50);
    camera.position.set(0, 1.25, 5.2); camera.lookAt(0, .55, 0);

    // Reflejos del metal: una «habitación» de paneles de luz convertida en mapa de entorno (sin imágenes externas)
    const pm = new THREE.PMREMGenerator(renderer), env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({ color: 0x2a2028, side: THREE.BackSide })));
    [[0, 5, 0, 8, .2, 8, 0xffffff], [-5, 1, 2, .2, 4, 6, 0xffe2b0], [5, 2, -1, .2, 3, 5, 0xbfd8ff], [0, 1, -5, 6, 2, .2, 0xffc070], [0, 2.5, 5, 7, 2.5, .2, 0xfff0d6], [0, -1.5, 5, 9, 3, .2, 0xffd890], [2, -4, 3, 3, .2, 3, 0x553344]]
      .forEach(([x, y, z, w, h, d, c]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); env.add(m); });
    const envTex = pm.fromScene(env, .03).texture; scene.environment = envTex;
    env.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });

    scene.add(new THREE.HemisphereLight(0xfff4e0, 0x2a1830, .8));
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 5, 4); scene.add(key);
    const rim = new THREE.PointLight(0xffd060, 6, 12, 1.6); rim.position.set(-2.5, 1.8, -2); scene.add(rim);

    const gold = new THREE.MeshStandardMaterial({ color: 0xffcc4d, metalness: 1, roughness: .2, side: THREE.DoubleSide });
    const velvet = new THREE.MeshStandardMaterial({ color: 0x9c0f3c, roughness: .95, metalness: 0, side: THREE.DoubleSide });
    const pearlM = new THREE.MeshStandardMaterial({ color: 0xfff8ee, roughness: .25, metalness: .1, emissive: 0xffffff, emissiveIntensity: 0 });

    const crown = new THREE.Group(), body = new THREE.Group(); crown.add(body); scene.add(crown);
    const R = 1, band = .42, prof = { n: 8, band, tall: .62, short: .4, R, thick: .055, flare: .16, segments: 192 };
    const rm = ringMesh(prof), g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(rm.positions, 3)); g.setIndex(rm.indices); g.computeVertexNormals();
    body.add(new THREE.Mesh(g, gold));
    // Molduras abajo y a la altura de la banda
    const trim = (y, r, t) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 12, 120), gold); m.rotation.x = Math.PI / 2; m.position.y = y; body.add(m); };
    trim(.02, R * 1.005, .05); trim(band, R * (1 + prof.flare * band) - .01, .04);
    // Terciopelo dentro y orbe (v1.45.2: sin cruz, a petición de Izan)
    const cap = new THREE.Mesh(new THREE.SphereGeometry(R * .92, 40, 16, 0, TAU, 0, Math.PI / 2), velvet); cap.scale.y = .72; cap.position.y = band * .55; body.add(cap);
    const capTop = band * .55 + R * .92 * .72;
    const orb = new THREE.Mesh(new THREE.SphereGeometry(.11, 24, 16), gold); orb.position.y = capTop + .08; body.add(orb);
    // Joyas (una por punta, en la banda) y perlas (en cada punta)
    const gems = [], pearls = [], gemG = new THREE.OctahedronGeometry(.1, 0), pearlG = new THREE.SphereGeometry(.058, 16, 12);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU, c = new THREE.Color(GEMS[i % 5]);
      const m = new THREE.MeshStandardMaterial({ color: c, roughness: .12, metalness: .2, emissive: c, emissiveIntensity: 0 });
      const gm = new THREE.Mesh(gemG, m), y = band * .5, r = R * (1 + prof.flare * y) + .03;
      gm.position.set(Math.sin(a) * r, y, Math.cos(a) * r); gm.scale.set(1, 1.3, .55); gm.lookAt(Math.sin(a) * 5, y, Math.cos(a) * 5);
      gm.userData = { c, i }; body.add(gm); gems.push(gm);
      const h = crownProfile(a, prof), pr = R * (1 + prof.flare * h) - .02, p = new THREE.Mesh(pearlG, pearlM);
      p.position.set(Math.sin(a) * pr, h + .04, Math.cos(a) * pr); body.add(p); pearls.push(p);
    }
    const dull = new THREE.Color(0x6e5a44), bright = new THREE.Color(0xffcc4d), velDull = new THREE.Color(0x34323c), velRich = new THREE.Color(0x9c0f3c), off = new THREE.Color(0x1d1a22);

    let v = 5, rotY = .4, vel = 0, drag = null, w = 1, h = 1;
    function resize(W, H) { w = Math.max(1, W | 0); h = Math.max(1, H | 0); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    function set(nv) { v = Math.max(0, Math.min(10, +nv || 0)); }
    function frame(tm, dt) {
      const L = crownLook(v), mv = motion === 'full';
      gold.color.copy(dull).lerp(bright, L.q); gold.roughness = L.rough; gold.envMapIntensity = L.env;
      velvet.color.copy(velDull).lerp(velRich, L.q);
      gems.forEach((gm, i) => { const on = i < L.lit, m = gm.material; m.color.copy(on ? gm.userData.c : off); m.emissive.copy(gm.userData.c); m.emissiveIntensity = on ? .55 + (mv ? Math.sin(tm * 3 + i) * .25 : 0) + L.glow * .4 : 0; });
      pearlM.emissiveIntensity = L.pearls ? .35 + (mv ? Math.sin(tm * 2.5) * .15 : 0) : 0;
      rim.color.setHSL(.12, .9, .5 + L.q * .15); rim.intensity = 2 + L.glow * 10;
      if (!drag) { if (mv) rotY += (L.spin + vel) * dt; vel *= Math.pow(.05, dt); }
      crown.rotation.y = rotY;
      const sc = L.scale + (mv ? Math.sin(tm * 2) * .012 : 0); crown.scale.setScalar(sc);
      crown.rotation.z = L.tilt + (mv ? Math.sin(tm * 9) * L.tremble : 0);
      crown.position.y = mv ? Math.sin(tm * 1.3) * .04 : 0;
      renderer.render(scene, camera);
    }
    // Girar con el dedo (la inercia sigue un momento al soltar)
    const down = e => { drag = { x: e.clientX, t: performance.now() }; vel = 0; try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* nada */ } };
    const move = e => { if (!drag) return; const dx = e.clientX - drag.x, now = performance.now(); rotY += dx * .012; vel = dx * .012 / Math.max(.008, (now - drag.t) / 1000) * .25; drag = { x: e.clientX, t: now }; };
    const up = () => { drag = null; };
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    function dispose() {
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up);
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      [gold, velvet, pearlM, ...gems.map(x => x.material)].forEach(m => m.dispose());
      envTex.dispose(); pm.dispose(); renderer.dispose();
    }
    return { resize, set, frame, dispose };
  }

  const api = { create, crownProfile, crownLook, ringMesh, GEMS };
  root.KGCrown3D = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
