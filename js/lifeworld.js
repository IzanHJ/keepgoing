/* KeepGoing — Mundo (v1.37): dioramas low-poly, transportes y globo con three.js.
   three.js (MIT) va copiado en js/vendor y solo se descarga al abrir Mundo (la app no permite scripts de fuera).
   Todo se construye con unas pocas geometrías y materiales compartidos: cada tipo de escenario tiene un único modelo base y
   la variante es solo su color (el color del Lugar). Ampliar = añadir una función a BUILD con el id de KGWorld.SCENES.
   Rendimiento: un único lienzo, sin sombras ni físicas, píxeles limitados, el bucle solo corre mientras hay algo que se
   mueve y la vista está en pantalla; con «Animaciones: apagadas» se pinta una sola vez y los cambios son directos. */
(function (root) {
  'use strict';
  function create(THREE, canvas, opts = {}) {
    const low = opts.quality === 'low', motion = opts.motion || 'full';
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !low, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1 : 1.75));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xe6eeff, 0x202838, 1.25));
    const sun = new THREE.DirectionalLight(0xffffff, 1.35); sun.position.set(5, 9, 4); scene.add(sun);

    /* ---- piezas compartidas ---- */
    const G = new Map(), M = new Map();
    const geo = (key, make) => G.get(key) || G.set(key, make()).get(key);
    const box = (w, h, d) => geo(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
    const cyl = (a, b, h, n = 8) => geo(`c${a}|${b}|${h}|${n}`, () => new THREE.CylinderGeometry(a, b, h, n));
    const cone = (r, h, n = 6) => geo(`k${r}|${h}|${n}`, () => new THREE.ConeGeometry(r, h, n));
    const ico = (r, d = 0) => geo(`i${r}|${d}`, () => new THREE.IcosahedronGeometry(r, d));
    const torus = (r, t, a = 6, b = 12) => geo(`t${r}|${t}|${a}|${b}`, () => new THREE.TorusGeometry(r, t, a, b));
    const col = c => { const x = new THREE.Color(); try { x.set(c || '#8e8e93'); } catch (e) { x.set('#8e8e93'); } return x; };
    const hex = c => '#' + col(c).getHexString();
    const shade = (c, k) => { const x = col(c); return '#' + (k < 0 ? x.lerp(new THREE.Color(0, 0, 0), -k) : x.lerp(new THREE.Color(1, 1, 1), k)).getHexString(); };
    const mat = (c, o = {}) => { const k = hex(c) + (o.op ? '|' + o.op : ''); return M.get(k) || M.set(k, new THREE.MeshPhongMaterial({ color: hex(c), flatShading: true, shininess: 6, ...(o.op ? { transparent: true, opacity: o.op } : {}) })).get(k); };
    const mesh = (g, c, x = 0, y = 0, z = 0, o) => { const m = new THREE.Mesh(g, mat(c, o)); m.position.set(x, y, z); return m; };
    const group = (...xs) => { const g = new THREE.Group(); xs.forEach(x => x && g.add(x)); return g; };
    const at = (o, x, y, z, ry = 0, s = 1) => { o.position.set(x, y, z); o.rotation.y = ry; o.scale.setScalar(s); return o; };

    /* ---- piezas de los dioramas ---- */
    const GRASS = '#5fbf6a', SAND = '#e8cf8f', ASPHALT = '#4a4f5c', STONE = '#9aa3b2', WATER = '#3aa7d9', WHITE = '#f2f4f8', GLASS = '#a9d8ff', TRUNK = '#8a5a3b';
    const base = (c) => group(mesh(cyl(3.3, 3.45, 0.42, 8), c, 0, -0.21, 0), mesh(cyl(3.45, 3.2, 0.5, 8), shade(c, -0.35), 0, -0.66, 0));
    const tree = (c = '#3fa45b') => group(mesh(cyl(0.08, 0.11, 0.5, 5), TRUNK, 0, 0.25, 0), mesh(cone(0.42, 0.9, 6), c, 0, 0.9, 0), mesh(cone(0.32, 0.6, 6), shade(c, 0.12), 0, 1.3, 0));
    const windows = (w, h, d, rows, colsN, c) => { const g = new THREE.Group(); for (let r = 0; r < rows; r++) for (let k = 0; k < colsN; k++) g.add(mesh(box(w / colsN * 0.55, h / rows * 0.45, 0.04), c, -w / 2 + (k + 0.5) * w / colsN, (r + 0.5) * h / rows, d / 2 + 0.02)); return g; };
    const house = (c, s = 1) => at(group(mesh(box(1.6, 1.15, 1.4), c, 0, 0.575, 0), at(mesh(cone(1.32, 0.85, 4), shade(c, -0.35), 0, 1.57, 0), 0, 1.57, 0, Math.PI / 4), mesh(box(0.34, 0.6, 0.05), shade(c, -0.55), 0.3, 0.3, 0.71), mesh(box(0.34, 0.3, 0.05), GLASS, -0.4, 0.68, 0.71), mesh(box(0.2, 0.5, 0.2), shade(c, -0.45), -0.45, 1.75, -0.2)), 0, 0, 0, 0, s);
    const person = (c) => group(mesh(cyl(0.13, 0.16, 0.5, 6), c, 0, 0.45, 0), mesh(ico(0.13, 0), '#f1c9a5', 0, 0.85, 0), mesh(cyl(0.05, 0.05, 0.3, 4), shade(c, -0.4), -0.07, 0.15, 0), mesh(cyl(0.05, 0.05, 0.3, 4), shade(c, -0.4), 0.07, 0.15, 0));
    const wheel = (r = 0.18) => { const w = mesh(cyl(r, r, 0.12, 8), '#22252d'); w.rotation.x = Math.PI / 2; return w; };
    const bus = (c) => group(mesh(box(2.6, 0.95, 1), c, 0, 0.7, 0), mesh(box(2.3, 0.32, 1.02), GLASS, 0.05, 0.92, 0), mesh(box(0.06, 0.32, 0.8), GLASS, 1.31, 0.92, 0), at(wheel(0.22), 0.8, 0.22, 0.5), at(wheel(0.22), -0.8, 0.22, 0.5), at(wheel(0.22), 0.8, 0.22, -0.5), at(wheel(0.22), -0.8, 0.22, -0.5));
    const car = (c) => group(mesh(box(1.6, 0.42, 0.85), c, 0, 0.42, 0), mesh(box(0.85, 0.36, 0.78), shade(c, 0.15), -0.1, 0.8, 0), mesh(box(0.86, 0.26, 0.8), GLASS, -0.1, 0.82, 0), at(wheel(), 0.5, 0.2, 0.42), at(wheel(), -0.5, 0.2, 0.42), at(wheel(), 0.5, 0.2, -0.42), at(wheel(), -0.5, 0.2, -0.42));
    const moto = (c) => group(mesh(box(1, 0.3, 0.26), c, 0, 0.5, 0), at(wheel(0.22), 0.45, 0.22, 0), at(wheel(0.22), -0.45, 0.22, 0), at(person(shade(c, -0.3)), -0.1, 0.4, 0, 0, 0.8));
    const bike = (c) => { const t1 = mesh(torus(0.24, 0.035, 4, 12), '#22252d', 0.42, 0.26, 0), t2 = mesh(torus(0.24, 0.035, 4, 12), '#22252d', -0.42, 0.26, 0); return group(t1, t2, mesh(box(0.85, 0.05, 0.05), c, 0, 0.45, 0), mesh(box(0.05, 0.35, 0.05), c, -0.12, 0.42, 0), at(person(c), -0.05, 0.35, 0, 0, 0.8)); };
    const train = (c) => { const g = new THREE.Group(); for (let i = 0; i < 3; i++) g.add(at(group(mesh(box(1.8, 0.9, 0.95), i ? shade(c, 0.1) : c, 0, 0.65, 0), mesh(box(1.6, 0.3, 0.97), GLASS, 0, 0.8, 0)), -i * 1.95, 0, 0)); return g; };
    const plane = (c) => group(at(mesh(cyl(0.16, 0.12, 1.5, 8), c), 0, 0, 0), mesh(box(0.25, 0.04, 1.5), shade(c, -0.15), 0.05, 0, 0), mesh(box(0.15, 0.32, 0.04), shade(c, -0.15), -0.68, 0.16, 0), mesh(box(0.12, 0.03, 0.5), shade(c, -0.15), -0.68, 0.02, 0));
    const fixPlane = p => { p.children[0].rotation.z = Math.PI / 2; return p; };

    /* ---- dioramas: un modelo por tipo; c = color de la variante ---- */
    const BUILD = {
      home: c => group(base(GRASS), house(c), at(tree(), -1.9, 0, -0.9), at(tree(), 1.9, 0, -1.2, 0, 0.8), mesh(box(0.5, 0.04, 1.8), STONE, 0.3, 0.02, 1.6)),
      neighborhood: c => group(base(GRASS), at(house(c, 0.75), -1.1, 0, -0.7), at(house(shade(c, 0.35), 0.7), 1.2, 0, -0.9, 0.4), at(house(shade(c, -0.25), 0.7), 0.9, 0, 1.2, -0.3), at(house(WHITE, 0.65), -1.3, 0, 1.3), mesh(box(5, 0.04, 0.5), ASPHALT, 0, 0.02, 0.25)),
      office: c => group(base(STONE), mesh(box(1.5, 3.2, 1.5), c, 0, 1.6, 0), at(windows(1.5, 3.2, 1.5, 6, 3, GLASS), 0, 0, 0), mesh(box(1.1, 1.6, 1.1), shade(c, 0.3), 1.6, 0.8, 0.6), at(windows(1.1, 1.6, 1.1, 3, 2, GLASS), 1.6, 0, 0.6), at(tree(), -1.8, 0, 1)),
      park: c => group(base(shade(c, -0.1)), at(tree(shade(c, -0.25)), -1.3, 0, -0.8), at(tree(shade(c, 0.1)), 1.2, 0, -1.1, 0, 1.2), at(tree(shade(c, -0.1)), 0.4, 0, 1.4, 0, 0.9), at(tree(shade(c, -0.3)), -1.6, 0, 1.1, 0, 0.75), mesh(box(0.9, 0.08, 0.3), TRUNK, 0.2, 0.3, -0.1), mesh(box(0.06, 0.28, 0.3), '#555', -0.2, 0.14, -0.1), mesh(box(0.06, 0.28, 0.3), '#555', 0.6, 0.14, -0.1), mesh(cyl(1.1, 1.1, 0.03, 10), STONE, 0, 0.02, 0)),
      beach: c => group(base(SAND), mesh(box(6.2, 0.1, 2.6), c || WATER, 0, 0.02, -1.8, { op: 0.9 }), mesh(cyl(0.04, 0.04, 1.4, 5), WHITE, 0.6, 0.7, 0.9), mesh(cone(0.9, 0.4, 8), c, 0.6, 1.4, 0.9), mesh(box(0.6, 0.03, 1.2), shade(c, 0.4), -0.5, 0.03, 1)),
      gym: c => group(base(STONE), mesh(box(2.6, 1.4, 1.8), c, 0, 0.7, 0), mesh(box(2.62, 0.35, 1.82), shade(c, -0.35), 0, 1.25, 0), at(group(mesh(cyl(0.06, 0.06, 1.6, 6), '#c9ced8'), mesh(cyl(0.3, 0.3, 0.18, 8), '#2b2f38', 0, 0.75, 0), mesh(cyl(0.3, 0.3, 0.18, 8), '#2b2f38', 0, -0.75, 0)), 0, 1.75, 0, 0, 1), mesh(box(0.5, 0.75, 0.05), GLASS, 0, 0.38, 0.92)),
      restaurant: c => group(base(STONE), mesh(box(2.2, 1.3, 1.6), WHITE, 0, 0.65, -0.3), at(mesh(box(2.3, 0.08, 0.7), c), 0, 1.25, 0.75), mesh(box(1.6, 0.6, 0.05), GLASS, 0, 0.55, 0.51), mesh(cyl(0.35, 0.35, 0.05, 8), WHITE, 1.4, 0.55, 1.4), mesh(cyl(0.04, 0.04, 0.55, 4), '#555', 1.4, 0.27, 1.4), mesh(cone(0.6, 0.3, 8), c, 1.4, 1.2, 1.4), mesh(cyl(0.02, 0.02, 0.7, 4), '#555', 1.4, 0.85, 1.4)),
      mall: c => group(base(ASPHALT), mesh(box(3.6, 1.3, 2.2), c, 0, 0.65, -0.2), mesh(box(3.62, 0.4, 2.22), GLASS, 0, 0.95, -0.2), mesh(box(1.2, 0.35, 0.05), WHITE, 0, 1.45, 0.91), mesh(box(0.8, 0.02, 0.45), WHITE, -1.2, 0.03, 1.6), mesh(box(0.8, 0.02, 0.45), WHITE, 0, 0.03, 1.6), mesh(box(0.8, 0.02, 0.45), WHITE, 1.2, 0.03, 1.6)),
      university: c => { const g = group(base(GRASS), mesh(box(3, 0.25, 1.8), STONE, 0, 0.12, 0), mesh(box(3, 1.3, 1.2), c, 0, 0.9, -0.3), at(mesh(cyl(1.75, 1.75, 1.6, 3), shade(c, -0.25)), 0, 1.85, 0.2)); g.children[g.children.length - 1].rotation.set(Math.PI / 2, 0, Math.PI / 2); g.children[g.children.length - 1].scale.set(0.35, 1.9, 1); for (let i = 0; i < 5; i++) g.add(mesh(cyl(0.09, 0.09, 1.3, 6), WHITE, -1.2 + i * 0.6, 0.9, 0.45)); g.add(at(tree(), -2, 0, 1.4, 0, 0.8)); return g; },
      library: c => { const g = group(base(STONE), mesh(box(2.4, 1.6, 1.6), shade(c, 0.45), 0, 0.8, -0.2), mesh(box(1, 0.7, 0.05), GLASS, 0, 0.45, 0.61)); const cs = [c, shade(c, -0.3), shade(c, 0.25), '#e94f4f', '#f5b83d']; cs.forEach((x, i) => g.add(at(mesh(box(0.22, 0.75 + (i % 2) * 0.15, 0.55), x), -0.5 + i * 0.25, 2, -0.2))); return g; },
      hospital: c => group(base(STONE), mesh(box(2.6, 2, 1.6), WHITE, 0, 1, 0), at(windows(2.6, 2, 1.6, 3, 4, GLASS), 0, 0, 0), mesh(box(0.7, 0.2, 0.08), c, 0, 2.35, 0.3), mesh(box(0.2, 0.7, 0.08), c, 0, 2.35, 0.3), mesh(box(0.08, 0.4, 2.4), WHITE, 0, 2.15, 0)),
      hotel: c => group(base(STONE), mesh(box(1.8, 3.4, 1.4), c, 0, 1.7, 0), at(windows(1.8, 3.4, 1.4, 7, 3, GLASS), 0, 0, 0), mesh(box(1.9, 0.08, 0.3), WHITE, 0, 1.2, 0.8), mesh(box(1.9, 0.08, 0.3), WHITE, 0, 2.2, 0.8), mesh(cyl(0.9, 0.9, 0.06, 10), WATER, 1.7, 0.04, 1.2)),
      stadium: c => { const g = group(base(STONE), mesh(cyl(2.3, 2.3, 0.05, 12), GRASS, 0, 0.03, 0)); const r = mesh(torus(2.45, 0.42, 4, 14), c, 0, 0.35, 0); r.rotation.x = Math.PI / 2; r.scale.z = 0.9; g.add(r); g.add(mesh(box(1.4, 0.02, 0.05), WHITE, 0, 0.06, 0)); return g; },
      station: c => group(base(STONE), mesh(box(5.6, 0.1, 0.5), '#6d5a4b', 0, 0.05, 0.9), at(train(c), 1.6, 0.05, 0.9, 0, 0.8), mesh(box(4, 0.3, 1), shade(STONE, 0.2), 0, 0.15, -0.3), mesh(box(4, 0.08, 1.4), shade(c, -0.2), 0, 1.6, -0.2), mesh(cyl(0.05, 0.05, 1.4, 4), '#555', -1.6, 0.9, -0.6), mesh(cyl(0.05, 0.05, 1.4, 4), '#555', 1.6, 0.9, -0.6)),
      road: c => group(base(GRASS), mesh(box(6.4, 0.04, 1.6), ASPHALT, 0, 0.02, 0), mesh(box(0.6, 0.05, 0.08), WHITE, -1.6, 0.03, 0), mesh(box(0.6, 0.05, 0.08), WHITE, 0, 0.03, 0), mesh(box(0.6, 0.05, 0.08), WHITE, 1.6, 0.03, 0), at(car(c), 0.4, 0.02, 0.35), at(tree(), -1.5, 0, -1.6), at(tree(), 1.7, 0, 1.6, 0, 0.8)),
      airport: c => group(base(GRASS), mesh(box(6, 0.04, 1.4), ASPHALT, 0, 0.02, 0.6), mesh(box(0.5, 0.05, 0.1), WHITE, -1.5, 0.03, 0.6), mesh(box(0.5, 0.05, 0.1), WHITE, 0, 0.03, 0.6), mesh(box(0.5, 0.05, 0.1), WHITE, 1.5, 0.03, 0.6), at(fixPlane(plane(c)), 0.5, 0.35, 0.6, 0, 1.3), mesh(cyl(0.2, 0.25, 1.8, 6), WHITE, -2, 0.9, -1.2), mesh(cyl(0.38, 0.3, 0.4, 6), GLASS, -2, 1.95, -1.2), mesh(box(2, 0.7, 0.9), shade(c, 0.5), 1, 0.35, -1.4)),
      // lugar sin tipo de escenario: una chincheta grande del color del lugar
      pin: c => { const g = group(base(GRASS), mesh(cyl(0.9, 0.9, 0.03, 12), shade(c, 0.45), 0, 0.02, 0)), k = mesh(cone(0.42, 1.2, 10), c, 0, 0.75, 0); k.rotation.x = Math.PI; g.add(k, mesh(ico(0.5, 1), c, 0, 1.55, 0), mesh(ico(0.2, 1), WHITE, 0, 1.6, 0.38), at(tree(), -1.9, 0, -0.8, 0, 0.8), at(tree(), 1.8, 0, 1, 0, 0.7)); return g; },
      unknown: () => { const g = group(base('#3a3f4b')); for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; g.add(mesh(ico(0.45 + (i % 3) * 0.12, 0), '#8b93a6', Math.cos(a) * 1.2, 0.6 + (i % 2) * 0.3, Math.sin(a) * 1.2, { op: 0.55 })); } return g; },
    };
    const VEH = { bus, car, moto, bike, walk: c => person(c), train, other: c => car(c) };

    /* ---- globo ---- */
    let globe = null;
    function makeGlobe(countries, accent) {
      const g = new THREE.Group();
      g.add(mesh(ico(1.6, low ? 2 : 3), '#173a66'));
      const pts = [];
      const step = low ? 3 : 2;
      for (const c of countries || []) for (const p of c.polys) { const r = p[0]; for (let i = 0; i + step < r.length; i += step) { const a = KGWorld.toXYZ(r[i][1], r[i][0], 1.605), b = KGWorld.toXYZ(r[i + step][1], r[i + step][0], 1.605); pts.push(...a, ...b); } }
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.75 })); g.add(lines);
      g.userData = { lineGeo: lg, lineMat: lines.material, dots: new THREE.Group(), fly: new THREE.Group(), accent };
      g.add(g.userData.dots, g.userData.fly);
      return g;
    }

    /* ---- estado de la vista ---- */
    let cur = null, curKey = '', raf = 0, visible = true, alive = true, mode = 'idle', t0 = 0, anim = null, last = 0;
    const easeOutBack = x => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);
    const easeIn = x => x * x;
    const setCam = (k) => {
      if (k === 'globe') { camera.position.set(0, 0.6, 6.2); camera.lookAt(0, 0, 0); }
      else if (k === 'travel') { camera.position.set(-4.6, 2.6, 4.2); camera.lookAt(0.6, 0.5, 0); }
      else { camera.position.set(6.4, 5.2, 7.2); camera.lookAt(0, 0.8, 0); }
    };
    function resize() {
      const w = canvas.clientWidth || 300, h = canvas.clientHeight || 220;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      // en pantallas estrechas se aleja un poco para que quepa el diorama
      camera.zoom = w / h < 1.1 ? 0.78 : 1; camera.updateProjectionMatrix();
      draw();
    }
    const draw = () => { if (alive) renderer.render(scene, camera); };

    // Construye lo que toca mostrar. spec: { type: 'scene'|'travel'|'globe', scene, color, tr, from, to, dots: [{lat, lon}] }
    function build(spec) {
      if (spec.type === 'globe') {
        if (!globe) globe = makeGlobe(opts.countries, opts.accent || '#3ddc97');
        const d = globe.userData.dots, fy = globe.userData.fly; while (d.children.length) d.remove(d.children[0]);
        while (fy.children.length) { const o = fy.children[0]; fy.remove(o); if (o.isLine) { o.geometry.dispose(); o.material.dispose(); } }
        for (const p of spec.dots || []) { const [x, y, z] = KGWorld.toXYZ(p.lat, p.lon, 1.63); d.add(mesh(ico(0.05, 1), opts.accent || '#3ddc97', x, y, z)); }
        const g = group(globe);
        if (spec.from && spec.to) {
          const ptsA = KGWorld.arc(spec.from, spec.to, low ? 32 : 64, 0.28).map(p => new THREE.Vector3(p[0] * 1.6, p[1] * 1.6, p[2] * 1.6));
          const tg = new THREE.BufferGeometry().setFromPoints(ptsA), trail = new THREE.Line(tg, new THREE.LineBasicMaterial({ color: hex(opts.accent || '#3ddc97') }));
          const pl = fixPlane(plane('#ffffff')); pl.scale.setScalar(0.22); fy.add(trail, pl);
          g.userData = { flight: { pts: ptsA, trail, tg, pl } };
          if (motion === 'off') { // sin animaciones: el viaje ya hecho, el avión en el destino
            tg.setDrawRange(0, ptsA.length); pl.position.copy(ptsA[ptsA.length - 1]); globe.quaternion.copy(faceQ(spec.to));
          } else { tg.setDrawRange(0, 0); globe.quaternion.copy(faceQ(spec.from)); } // el globo empieza mirando al origen
        } else if (spec.dots && spec.dots.length) globe.quaternion.copy(faceQ(spec.dots[0]));
        return g;
      }
      if (spec.type === 'travel') {
        const make = VEH[spec.tr] || VEH.other, g = new THREE.Group();
        g.add(mesh(box(14, 0.3, 9), spec.tr === 'train' ? '#6f8f5a' : GRASS, 0, -0.17, 0));
        g.add(mesh(box(14, 0.04, spec.tr === 'walk' || spec.tr === 'bike' ? 1.2 : 2.2), spec.tr === 'train' ? '#6d5a4b' : spec.tr === 'walk' ? STONE : ASPHALT, 0, 0.02, 0));
        const env = new THREE.Group(); g.add(env);
        for (let i = 0; i < 9; i++) { const tr = at(tree(i % 2 ? '#3fa45b' : '#58b86a'), -7 + i * 1.75, 0, (i % 2 ? 1 : -1) * (2 + (i % 3) * 0.6), 0, 0.8 + (i % 3) * 0.15); env.add(tr); }
        const dashes = new THREE.Group(); g.add(dashes);
        if (spec.tr !== 'walk' && spec.tr !== 'train') for (let i = 0; i < 8; i++) dashes.add(mesh(box(0.7, 0.05, 0.09), WHITE, -7 + i * 2, 0.04, 0));
        const v = make(spec.color || '#ffcc33'); v.position.set(0.4, 0.04, 0); g.add(v);
        g.userData = { travel: { env, dashes, v, speed: spec.tr === 'walk' ? 1.1 : spec.tr === 'bike' ? 2.2 : spec.tr === 'train' ? 5 : 3.6 } };
        return g;
      }
      return (BUILD[spec.scene] || BUILD.unknown)(spec.color || '#8e8e93');
    }
    // Giro del globo para que un punto quede delante (un poco por encima del centro) y con el norte siempre arriba
    const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);
    function faceQ(p) { const [x, , z] = KGWorld.toXYZ(p.lat, p.lon), lat = p.lat * Math.PI / 180; return new THREE.Quaternion().setFromAxisAngle(AX, lat - 0.25).multiply(new THREE.Quaternion().setFromAxisAngle(AY, -Math.atan2(x, z))); }

    /* ---- transición morph/pop: lo de antes se encoge y se aplasta; lo nuevo crece con un pequeño rebote ---- */
    function show(spec) {
      const key = JSON.stringify(spec);
      if (key === curKey) return;
      curKey = key;
      const next = build(spec), camK = spec.type === 'globe' ? 'globe' : spec.type === 'travel' ? 'travel' : 'scene';
      if (motion === 'off' || !cur) { if (cur) scene.remove(cur); cur = next; scene.add(cur); setCam(camK); mode = live(spec) ? 'live' : 'idle'; anim = { spec, t: performance.now() }; kick(); draw(); return; }
      if (motion === 'soft') { canvas.style.opacity = '0'; setTimeout(() => { if (!alive) return; scene.remove(cur); cur = next; scene.add(cur); setCam(camK); anim = { spec, t: performance.now() }; mode = live(spec) ? 'live' : 'idle'; draw(); canvas.style.opacity = '1'; kick(); }, 160); return; }
      const old = cur; anim = { spec, old, next, camK, t: performance.now(), phase: 'out' }; mode = 'morph'; kick();
    }
    const live = spec => spec.type === 'travel' || (spec.type === 'globe' && spec.from && spec.to);
    function tick(now) {
      raf = 0; if (!alive || !visible) return;
      const fpsCap = low ? 30 : 60; if (now - last < 1000 / fpsCap - 2) { raf = requestAnimationFrame(tick); return; }
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      if (mode === 'morph') {
        const a = anim, k = (now - a.t) / 220;
        if (a.phase === 'out') {
          const s = Math.max(0, 1 - easeIn(Math.min(1, k)));
          a.old.scale.set(s * (1 + (1 - s) * 0.15), s * s, s * (1 + (1 - s) * 0.15));
          if (k >= 1) { scene.remove(a.old); cur = a.next; cur.scale.setScalar(0.001); scene.add(cur); setCam(a.camK); a.phase = 'in'; a.t = now; }
        } else {
          const p = Math.min(1, (now - a.t) / 380), s = Math.max(0.001, easeOutBack(p));
          cur.scale.set(s, Math.max(0.001, s * (0.85 + 0.15 * p)), s);
          if (p >= 1) { cur.scale.setScalar(1); mode = live(a.spec) ? 'live' : 'idle'; a.t = now; }
        }
      } else if (mode === 'live' && cur) {
        const tv = cur.userData.travel, fl = cur.userData.flight;
        if (tv) {
          // el vehículo avanza: el entorno y las rayas se desplazan hacia atrás y vuelven a empezar
          for (const o of [...tv.env.children, ...tv.dashes.children]) { o.position.x -= tv.speed * dt; if (o.position.x < -7.5) o.position.x += 15.5; }
          tv.v.position.y = 0.04 + Math.sin(now / 90) * (tv.speed > 3 ? 0.015 : 0.03);
        }
        if (fl) {
          const p = Math.min(1, (now - anim.t) / 3600), i = Math.floor(p * (fl.pts.length - 1)), a = fl.pts[i], b = fl.pts[Math.min(fl.pts.length - 1, i + 1)];
          fl.tg.setDrawRange(0, i + 1); fl.pl.position.copy(a); fl.pl.lookAt(b); fl.pl.rotateY(-Math.PI / 2);
          // el globo gira para seguir el avión (de mirar al origen a mirar al destino)
          const q0 = faceQ(anim.spec.from), q1 = faceQ(anim.spec.to); globe.quaternion.copy(q0).slerp(q1, p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
          if (p >= 1) { mode = 'idle'; if (opts.onArrive) opts.onArrive(anim.spec); }
        }
      }
      // en reposo, giro muy lento del diorama (solo con calidad alta y animaciones completas)
      if (mode === 'idle' && cur && !low && motion === 'full' && !(cur.userData.flight)) cur.rotation.y += dt * 0.12;
      draw();
      if (mode !== 'idle' || (!low && motion === 'full')) raf = requestAnimationFrame(tick);
    }
    const kick = () => { if (!raf && alive && visible && motion !== 'off') { last = 0; raf = requestAnimationFrame(tick); } };
    function setVisible(v) { visible = v; if (v) kick(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    function dispose() {
      alive = false; if (raf) cancelAnimationFrame(raf);
      scene.traverse(o => { if (o.geometry && ![...G.values()].includes(o.geometry)) o.geometry.dispose(); });
      G.forEach(g => g.dispose()); M.forEach(m => m.dispose());
      if (globe) { globe.userData.lineGeo.dispose(); globe.userData.lineMat.dispose(); }
      renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) { /* nada */ }
    }
    resize();
    return { show, resize, setVisible, dispose, draw };
  }
  // ¿Hay WebGL? Si no, Mundo usa su versión fija (iconos y texto)
  function supported() { try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; } }
  // Calidad según el dispositivo: los modestos (pocos núcleos o poca memoria, o ahorro de datos) van en baja
  function quality() { const n = navigator.hardwareConcurrency || 4, m = navigator.deviceMemory || 4, sd = navigator.connection && navigator.connection.saveData; return n <= 4 || m <= 3 || sd ? 'low' : 'high'; }
  root.KGLifeWorld = { create, supported, quality };
})(typeof window !== 'undefined' ? window : this);
