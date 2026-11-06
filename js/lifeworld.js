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
    const shadeRaw = (c, k) => { const x = col(c); return '#' + (k < 0 ? x.lerp(new THREE.Color(0, 0, 0), -k) : x.lerp(new THREE.Color(1, 1, 1), k)).getHexString(); };
    const shade = (c, k) => { const x = col(c); return '#' + (k < 0 ? x.lerp(new THREE.Color(0, 0, 0), -k) : x.lerp(new THREE.Color(1, 1, 1), k)).getHexString(); };
    /* v1.40: monocromo. Mientras se construye un escenario con un color, cada color pedido pasa a ser un tono de ese color según
       lo claro u oscuro que era (relativo al color elegido): el diorama entero queda en una sola gama, con su volumen. */
    let monoC = null, monoL = 0.5;
    const lumOf = c => { const h = hex(c), r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
    const monoOf = c => { const h = hex(c); if (!monoC || h === monoC) return h; const k = Math.max(-0.82, Math.min(0.85, (lumOf(h) - monoL) * 1.6)); return shadeRaw(monoC, k); };
    const withMono = (c, fn) => { const prev = [monoC, monoL]; monoC = c ? hex(c) : null; monoL = c ? lumOf(c) : 0.5; try { return fn(); } finally { [monoC, monoL] = prev; } };
    const mat = (c0, o = {}) => { const c = monoOf(c0), k = hex(c) + (o.op ? '|' + o.op : ''); return M.get(k) || M.set(k, new THREE.MeshPhongMaterial({ color: hex(c), flatShading: true, shininess: 6, ...(o.op ? { transparent: true, opacity: o.op } : {}) })).get(k); };
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
    const VEH = { bus, car, moto, bike, walk: c => person(c), train, other: c => car(c), plane: c => { const p = fixPlane(plane(c)); p.position.y = 1.6; p.scale.setScalar(1.3); return group(p); } };

    /* ---- v1.40: piezas low-poly para los escenarios propios (una casilla mide CELL; ids de KGScenes.ASSETS) ---- */
    const CELL = 0.86;
    const ASSET = {
      house: c => house(c, 0.48),
      block: c => group(mesh(box(0.72, 1, 0.72), c, 0, 0.5, 0), at(windows(0.72, 1, 0.72, 3, 2, GLASS), 0, 0, 0), mesh(box(0.76, 0.08, 0.76), shade(c, -0.3), 0, 1.04, 0)),
      tower: c => group(mesh(box(0.6, 2.1, 0.6), c, 0, 1.05, 0), at(windows(0.6, 2.1, 0.6, 7, 2, GLASS), 0, 0, 0), mesh(box(0.4, 0.25, 0.4), shade(c, -0.3), 0, 2.22, 0), mesh(cyl(0.02, 0.02, 0.4, 4), shade(c, -0.5), 0, 2.55, 0)),
      tree: c => at(tree(c), 0, 0, 0, 0, 0.62),
      pine: c => group(mesh(cyl(0.05, 0.07, 0.3, 5), TRUNK, 0, 0.15, 0), mesh(cone(0.36, 0.6, 7), c, 0, 0.55, 0), mesh(cone(0.28, 0.5, 7), shade(c, 0.1), 0, 0.88, 0), mesh(cone(0.18, 0.4, 7), shade(c, 0.2), 0, 1.15, 0)),
      bush: c => group(mesh(ico(0.26, 0), c, 0, 0.2, 0), mesh(ico(0.18, 0), shade(c, 0.15), 0.2, 0.15, 0.08), mesh(ico(0.16, 0), shade(c, -0.12), -0.18, 0.13, -0.06)),
      rock: c => { const a = mesh(ico(0.3, 0), shade(c, -0.15), 0, 0.16, 0), b = mesh(ico(0.17, 0), shade(c, 0.1), 0.22, 0.09, 0.12); a.scale.y = 0.65; a.rotation.y = 0.6; return group(a, b); },
      hill: c => group(mesh(cone(0.46, 0.7, 7), c, 0, 0.35, 0), mesh(cone(0.18, 0.24, 7), shade(c, 0.55), 0, 0.6, 0)),
      water: c => mesh(box(CELL, 0.06, CELL), shade(c, 0.25), 0, 0.03, 0, { op: 0.85 }),
      path: c => group(mesh(box(CELL, 0.03, 0.38), shade(c, 0.45), 0, 0.015, 0), mesh(box(0.12, 0.035, 0.12), shade(c, 0.25), -0.2, 0.018, 0.08), mesh(box(0.1, 0.035, 0.1), shade(c, 0.25), 0.22, 0.018, -0.06)),
      road: c => group(mesh(box(CELL, 0.03, CELL), shade(c, -0.55), 0, 0.015, 0), mesh(box(0.3, 0.035, 0.05), WHITE, 0, 0.018, 0)),
      bench: c => group(mesh(box(0.6, 0.06, 0.22), c, 0, 0.24, 0), mesh(box(0.6, 0.2, 0.05), c, 0, 0.36, -0.1), mesh(box(0.05, 0.22, 0.2), shade(c, -0.4), -0.25, 0.11, 0), mesh(box(0.05, 0.22, 0.2), shade(c, -0.4), 0.25, 0.11, 0)),
      lamp: c => group(mesh(cyl(0.03, 0.04, 1, 5), shade(c, -0.45), 0, 0.5, 0), mesh(box(0.22, 0.05, 0.08), shade(c, -0.45), 0.08, 1, 0), mesh(ico(0.08, 0), shade(c, 0.6), 0.17, 0.95, 0)),
      fence: c => { const g = group(mesh(box(CELL, 0.05, 0.04), c, 0, 0.3, 0), mesh(box(CELL, 0.05, 0.04), c, 0, 0.16, 0)); for (let i = 0; i < 4; i++) g.add(mesh(box(0.06, 0.4, 0.06), shade(c, -0.2), -0.36 + i * 0.24, 0.2, 0)); return g; },
      fountain: c => group(mesh(cyl(0.4, 0.42, 0.18, 10), shade(c, 0.3), 0, 0.09, 0), mesh(cyl(0.33, 0.33, 0.05, 10), shade(c, -0.1), 0, 0.17, 0, { op: 0.9 }), mesh(cyl(0.06, 0.08, 0.45, 6), shade(c, 0.3), 0, 0.35, 0), mesh(ico(0.1, 0), shade(c, 0.55), 0, 0.62, 0)),
      tent: c => { const k = mesh(cone(0.42, 0.55, 4), c, 0, 0.27, 0); k.rotation.y = Math.PI / 4; return group(k, mesh(box(0.14, 0.3, 0.02), shade(c, -0.5), 0, 0.15, 0.3)); },
      car: c => at(car(c), 0, 0, 0, 0, 0.42),
      person: c => at(person(c), 0, 0, 0, 0, 0.7),
    };
    /* ---- v1.42: piezas nuevas (naturaleza, calle, edificios grandes e interior) ---- */
    const WOOD = '#b07d4f', DARK = '#2b2f38', WALL = '#ece6dc';
    const legs4 = (w, d, h, c) => group(...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => mesh(box(0.05, h, 0.05), c, a * (w / 2 - 0.05), h / 2, b * (d / 2 - 0.05))));
    const tile = (c, y = 0.03) => mesh(box(CELL, y, CELL), c, 0, y / 2, 0);
    const scaleTo = (o, s) => { o.scale.setScalar(s); return o; };
    Object.assign(ASSET, {
      mountain: c => group(mesh(cone(1.3, 2.2, 7), shade(c, -0.1), 0, 1.1, 0), mesh(cone(0.46, 0.62, 7), WHITE, 0, 1.92, 0), mesh(cone(0.85, 1.4, 6), shade(c, 0.08), 0.95, 0.7, 0.55), mesh(cone(0.3, 0.36, 6), WHITE, 0.95, 1.25, 0.55)),
      umbrella: c => group(mesh(cyl(0.025, 0.025, 1, 5), WHITE, 0, 0.5, 0), mesh(cone(0.55, 0.25, 8), c, 0, 1.05, 0)),
      sand: c => tile(c),
      parking: c => group(tile(c), mesh(box(0.05, 0.035, CELL * 0.8), WHITE, -CELL / 2 + 0.06, 0.018, 0)),
      rail: c => { const g = group(tile(c, 0.025)); for (let i = 0; i < 4; i++) g.add(mesh(box(0.08, 0.04, 0.6), '#6d5a4b', -0.32 + i * 0.21, 0.03, 0)); g.add(mesh(box(CELL, 0.05, 0.04), '#c9ced8', 0, 0.06, 0.18), mesh(box(CELL, 0.05, 0.04), '#c9ced8', 0, 0.06, -0.18)); return g; },
      runway: c => group(tile(c), mesh(box(0.34, 0.035, 0.07), WHITE, 0, 0.018, 0)),
      plane: c => { const p = fixPlane(plane(c)); p.position.y = 0.28; return scaleTo(group(p), 0.8); },
      train: c => scaleTo(train(c), 0.42),
      bhouse: c => house(c, 0.95),
      office: c => group(mesh(box(1.3, 2.8, 1.3), c, 0, 1.4, 0), at(windows(1.3, 2.8, 1.3, 6, 3, GLASS), 0, 0, 0), mesh(box(0.9, 1.3, 0.9), shade(c, 0.3), 1.05, 0.65, 0.45), at(windows(0.9, 1.3, 0.9, 3, 2, GLASS), 1.05, 0, 0.45)),
      gymb: c => group(mesh(box(2.2, 1.2, 1.5), c, 0, 0.6, 0), mesh(box(2.22, 0.3, 1.52), shade(c, -0.35), 0, 1.07, 0), at(group(mesh(cyl(0.05, 0.05, 1.3, 6), '#c9ced8'), mesh(cyl(0.25, 0.25, 0.15, 8), DARK, 0, 0.6, 0), mesh(cyl(0.25, 0.25, 0.15, 8), DARK, 0, -0.6, 0)), 0, 1.5, 0), mesh(box(0.45, 0.65, 0.05), GLASS, 0, 0.33, 0.77)),
      restb: c => group(mesh(box(1.9, 1.15, 1.3), WHITE, 0, 0.58, 0), mesh(box(2, 0.07, 0.55), c, 0, 1.05, 0.9), mesh(box(1.4, 0.5, 0.05), GLASS, 0, 0.5, 0.66), mesh(box(0.8, 0.22, 0.06), c, 0, 1.35, 0.66)),
      mallb: c => group(mesh(box(2.8, 1.1, 1.8), c, 0, 0.55, 0), mesh(box(2.82, 0.34, 1.82), GLASS, 0, 0.8, 0), mesh(box(1, 0.3, 0.05), WHITE, 0, 1.25, 0.91)),
      unib: c => { const g = group(mesh(box(2.4, 0.2, 1.5), STONE, 0, 0.1, 0), mesh(box(2.4, 1.1, 1), c, 0, 0.75, -0.25)), r = mesh(cyl(1.4, 1.4, 1.3, 3), shade(c, -0.25), 0, 1.55, 0.1); r.rotation.set(Math.PI / 2, 0, Math.PI / 2); r.scale.set(0.3, 1.9, 1); g.add(r); for (let i = 0; i < 5; i++) g.add(mesh(cyl(0.07, 0.07, 1.1, 6), WHITE, -0.96 + i * 0.48, 0.75, 0.38)); return g; },
      libb: c => { const g = group(mesh(box(2, 1.4, 1.4), shade(c, 0.45), 0, 0.7, 0), mesh(box(0.9, 0.6, 0.05), GLASS, 0, 0.4, 0.71)); [c, shade(c, -0.3), shade(c, 0.25), '#e94f4f', '#f5b83d'].forEach((x, i) => g.add(mesh(box(0.2, 0.62 + (i % 2) * 0.13, 0.5), x, -0.44 + i * 0.22, 1.75, 0))); return g; },
      hospb: c => group(mesh(box(2.2, 1.8, 1.4), WHITE, 0, 0.9, 0), at(windows(2.2, 1.8, 1.4, 3, 4, GLASS), 0, 0, 0), mesh(box(0.6, 0.18, 0.08), c, 0, 2.1, 0.3), mesh(box(0.18, 0.6, 0.08), c, 0, 2.1, 0.3)),
      hotelb: c => group(mesh(box(1.5, 3, 1.2), c, 0, 1.5, 0), at(windows(1.5, 3, 1.2, 7, 3, GLASS), 0, 0, 0), mesh(box(1.6, 0.07, 0.26), WHITE, 0, 1.05, 0.7), mesh(box(1.6, 0.07, 0.26), WHITE, 0, 1.95, 0.7)),
      arena: c => { const g = group(mesh(cyl(1.9, 1.9, 0.05, 12), GRASS, 0, 0.03, 0)), r = mesh(torus(2, 0.36, 4, 14), c, 0, 0.3, 0); r.rotation.x = Math.PI / 2; r.scale.z = 0.9; g.add(r, mesh(box(1.2, 0.02, 0.05), WHITE, 0, 0.06, 0)); return g; },
      stationb: c => group(mesh(box(3.4, 0.28, 1), shade(STONE, 0.2), 0, 0.14, 0), mesh(box(3.4, 0.08, 1.3), shade(c, -0.2), 0, 1.45, 0), mesh(cyl(0.05, 0.05, 1.2, 4), '#555', -1.4, 0.85, -0.35), mesh(cyl(0.05, 0.05, 1.2, 4), '#555', 1.4, 0.85, -0.35), mesh(box(1, 0.8, 0.6), c, 0, 0.68, -0.15)),
      ctower: c => group(mesh(cyl(0.18, 0.24, 1.7, 6), WHITE, 0, 0.85, 0), mesh(cyl(0.36, 0.28, 0.38, 6), GLASS, 0, 1.88, 0), mesh(cyl(0.38, 0.38, 0.06, 6), c, 0, 2.1, 0)),
      market: c => group(mesh(box(2.6, 1.05, 1.7), WHITE, 0, 0.53, 0), mesh(box(2.62, 0.22, 1.72), c, 0, 1.12, 0), mesh(box(1.8, 0.55, 0.05), GLASS, 0, 0.36, 0.86), mesh(box(1, 0.26, 0.06), c, 0, 1.4, 0.7), at(group(mesh(box(0.32, 0.18, 0.22), '#c9ced8', 0, 0.22, 0), at(wheel(0.05), 0.1, 0.05, 0.08), at(wheel(0.05), -0.1, 0.05, 0.08)), 1.05, 0, 1.05)),
      flats: c => { const g = group(mesh(box(1.4, 2.6, 1.2), c, 0, 1.3, 0), at(windows(1.4, 2.6, 1.2, 5, 3, GLASS), 0, 0, 0), mesh(box(1.46, 0.1, 1.26), shade(c, -0.35), 0, 2.65, 0)); for (let i = 1; i < 5; i++) g.add(mesh(box(1.2, 0.05, 0.22), WHITE, 0, i * 0.52, 0.7)); return g; },
      cafe: c => { const g = group(mesh(box(1.6, 1.05, 1.2), WALL, 0, 0.53, 0), mesh(box(1.1, 0.5, 0.05), GLASS, 0, 0.42, 0.61)); for (let i = 0; i < 5; i++) g.add(mesh(box(0.34, 0.06, 0.5), i % 2 ? WHITE : c, -0.68 + i * 0.34, 0.98, 0.8)); g.add(mesh(cyl(0.16, 0.13, 0.26, 8), c, 0.4, 1.2, 0), mesh(torus(0.08, 0.025, 4, 8), c, 0.58, 1.2, 0)); return g; },
      school: c => group(mesh(box(2.6, 1.1, 1.2), c, 0, 0.55, 0), at(windows(2.6, 1.1, 1.2, 2, 6, GLASS), 0, 0, 0), mesh(box(0.7, 1.7, 0.8), shade(c, -0.2), 0, 0.85, 0.15), mesh(cyl(0.2, 0.2, 0.04, 12), WHITE, 0, 1.4, 0.56), mesh(cyl(0.02, 0.02, 0.9, 4), '#555', 1.1, 1.55, 0.3), mesh(box(0.3, 0.18, 0.02), '#e94f4f', 1.26, 1.9, 0.3)),
      cinema: c => group(mesh(box(2.2, 1.5, 1.5), DARK, 0, 0.75, 0), mesh(box(2.3, 0.3, 0.3), c, 0, 1.05, 0.85), mesh(box(1.2, 0.5, 0.05), GLASS, 0, 0.42, 0.76), mesh(box(0.3, 1.1, 0.08), c, 0.9, 1.6, 0.6)),
      pool: c => group(mesh(box(2.4, 0.1, 1.6), WHITE, 0, 0.05, 0), mesh(box(2.1, 0.06, 1.3), shade(c, 0.2), 0, 0.09, 0, { op: 0.88 }), mesh(box(0.04, 0.4, 0.04), '#c9ced8', 0.95, 0.25, -0.62), mesh(box(0.04, 0.4, 0.04), '#c9ced8', 0.75, 0.25, -0.62)),
      pharmacy: c => group(mesh(box(1.7, 1.2, 1.3), WHITE, 0, 0.6, 0), mesh(box(1.1, 0.55, 0.05), GLASS, 0, 0.4, 0.66), mesh(box(0.42, 0.13, 0.08), c, 0, 1.0, 0.72), mesh(box(0.13, 0.42, 0.08), c, 0, 1.0, 0.72), mesh(box(1.72, 0.1, 1.32), c, 0, 1.25, 0)),
      desk: c => group(mesh(box(0.8, 0.05, 0.45), c, 0, 0.42, 0), legs4(0.8, 0.45, 0.4, shade(c, -0.4)), mesh(box(0.32, 0.2, 0.03), DARK, 0, 0.6, -0.12), mesh(box(0.04, 0.12, 0.04), DARK, 0, 0.48, -0.12), mesh(box(0.25, 0.015, 0.1), DARK, 0, 0.45, 0.08)),
      chair: c => group(mesh(box(0.34, 0.05, 0.34), c, 0, 0.25, 0), mesh(box(0.34, 0.32, 0.04), c, 0, 0.43, -0.15), legs4(0.34, 0.34, 0.23, shade(c, -0.4))),
      sofa: c => group(mesh(box(1.3, 0.24, 0.5), c, 0, 0.17, 0), mesh(box(1.3, 0.36, 0.12), shade(c, -0.15), 0, 0.42, -0.2), mesh(box(0.12, 0.3, 0.5), shade(c, -0.15), -0.6, 0.3, 0), mesh(box(0.12, 0.3, 0.5), shade(c, -0.15), 0.6, 0.3, 0)),
      tv: c => group(mesh(box(1, 0.3, 0.3), c, 0, 0.15, 0), mesh(box(0.9, 0.5, 0.04), DARK, 0, 0.6, -0.04), mesh(box(0.84, 0.44, 0.01), '#3a5a8c', 0, 0.6, -0.015)),
      bed: c => group(mesh(box(0.95, 0.22, 1.5), WOOD, 0, 0.11, 0), mesh(box(0.9, 0.12, 1.42), WHITE, 0, 0.28, 0.02), mesh(box(0.92, 0.08, 0.95), c, 0, 0.36, 0.25), mesh(box(0.6, 0.1, 0.25), WHITE, 0, 0.38, -0.5), mesh(box(0.95, 0.55, 0.06), WOOD, 0, 0.28, -0.74)),
      wardrobe: c => group(mesh(box(0.9, 1.5, 0.45), c, 0, 0.75, 0), mesh(box(0.02, 1.4, 0.02), shade(c, -0.4), 0, 0.75, 0.23), mesh(box(0.03, 0.14, 0.03), DARK, -0.06, 0.8, 0.24), mesh(box(0.03, 0.14, 0.03), DARK, 0.06, 0.8, 0.24)),
      shelf: c => { const g = group(mesh(box(0.8, 1.1, 0.25), c, 0, 0.55, 0)); const bs = ['#e94f4f', '#f5b83d', '#5b8cff', '#3fbf6a', '#b06cff']; for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) g.add(mesh(box(0.12, 0.24, 0.18), bs[(r + i) % 5], -0.26 + i * 0.17, 0.18 + r * 0.34, 0.04)); return g; },
      plant: c => group(mesh(cyl(0.14, 0.11, 0.24, 7), '#c2853d', 0, 0.12, 0), mesh(ico(0.22, 0), c, 0, 0.4, 0), mesh(ico(0.15, 0), shade(c, 0.15), 0.08, 0.56, 0.04)),
      rug: c => mesh(box(CELL * 0.92, 0.02, CELL * 0.92), c, 0, 0.01, 0),
      board: c => group(mesh(box(1.5, 0.85, 0.05), WHITE, 0, 0.95, 0), mesh(box(1.58, 0.06, 0.08), c, 0, 0.52, 0.02), mesh(box(0.05, 0.6, 0.05), '#555', -0.6, 0.3, 0), mesh(box(0.05, 0.6, 0.05), '#555', 0.6, 0.3, 0)),
      table: c => group(mesh(cyl(0.34, 0.34, 0.05, 10), c, 0, 0.4, 0), mesh(cyl(0.04, 0.04, 0.38, 5), shade(c, -0.4), 0, 0.2, 0), mesh(cyl(0.18, 0.18, 0.03, 8), shade(c, -0.4), 0, 0.015, 0)),
      flamp: c => group(mesh(cyl(0.12, 0.12, 0.03, 8), DARK, 0, 0.015, 0), mesh(cyl(0.02, 0.02, 1.1, 4), DARK, 0, 0.55, 0), mesh(cone(0.18, 0.22, 8), c, 0, 1.15, 0)),
    });
    // Color natural de cada pieza (con «Monocromo» todo pasa a tonos del color del escenario). Lo que no está aquí lleva el color del escenario
    const NAT = { tree: '#3fa45b', pine: '#2f8f55', bush: '#58b86a', rock: '#9aa3b2', hill: '#6fbf73', water: WATER, path: '#d9c9a3', road: '#7d8494', bench: TRUNK, lamp: '#8a93a6',
      fence: '#c2a27a', fountain: '#b8c4d6', tent: '#ff9f43', car: '#ff4d6d', person: '#5b8cff', mountain: '#8d99ae', umbrella: '#ff6b6b', sand: SAND, parking: ASPHALT, rail: '#8b7d6b', runway: ASPHALT,
      plane: WHITE, desk: WOOD, chair: '#3a3f4b', tv: WOOD, wardrobe: WOOD, shelf: '#a0703f', plant: '#3fa45b', board: '#3a3f4b', table: WOOD, flamp: '#f5b83d' };
    const GROUND = { grass: GRASS, stone: STONE, sand: SAND, asphalt: ASPHALT, wood: '#c2915a', tile: '#d8dde6' };
    const SIZE = [0.72, 1, 1.38];
    /* Escenario por rejilla: la losa (cuadrada, redonda u habitación con dos paredes) y las piezas en su casilla, con su giro y tamaño.
       v1.40 pintaba cada pieza con el color del escenario; desde v1.42 cada pieza tiene su color natural y los edificios el del escenario
       (con «Monocromo», que viene activado, todo queda en tonos de ese color igual que antes). */
    function custom(cells, c, gr = 'tint', sh = 'sq') {
      const n = (opts.grid || 7), w = n * CELL + 0.5, top = GROUND[gr] || shade(c, 0.12), g = new THREE.Group();
      if (sh === 'round') g.add(mesh(cyl(4.15, 4.25, 0.42, 12), top, 0, -0.21, 0), mesh(cyl(4.25, 3.95, 0.5, 12), shade(top, -0.35), 0, -0.66, 0));
      else g.add(mesh(box(w, 0.42, w), top, 0, -0.21, 0), mesh(box(w - 0.15, 0.5, w - 0.15), shade(top, -0.35), 0, -0.66, 0));
      if (sh === 'room') { // paredes al fondo y a la izquierda (las que quedan lejos de la cámara), cada una con su ventana
        const H = 1.7, wl = shade(WALL, 0), t = 0.12;
        g.add(mesh(box(w, H, t), wl, 0, H / 2, -w / 2 + t / 2), mesh(box(t, H, w), wl, -w / 2 + t / 2, H / 2, 0));
        g.add(mesh(box(1.4, 0.7, 0.02), GLASS, 1.2, 1.0, -w / 2 + t + 0.01), mesh(box(0.02, 0.7, 1.4), GLASS, -w / 2 + t + 0.01, 1.0, 1.2));
        g.add(mesh(box(w, 0.08, 0.03), shade(wl, -0.3), 0, 0.04, -w / 2 + t + 0.015), mesh(box(0.03, 0.08, w), shade(wl, -0.3), -w / 2 + t + 0.015, 0.04, 0));
      }
      for (const [x, z, a, r, s] of cells || []) {
        const make = ASSET[a]; if (!make) continue;
        const flat = KGScenes.FLAT.includes(a);
        const o = make(NAT[a] || c); o.position.set((x - (n - 1) / 2) * CELL, flat ? 0.002 : 0, (z - (n - 1) / 2) * CELL); o.rotation.y = r * Math.PI / 2;
        if (!flat) o.scale.multiplyScalar(SIZE[s] ?? 1); // multiplica: algunas piezas ya traen su propia escala (coche, persona, árbol…)
        g.add(o);
      }
      return g;
    }

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
      if (spec.type === 'travel') return withMono(spec.mono ? spec.color : null, () => buildTravel(spec));
      return withMono(spec.mono ? spec.color : null, () => spec.cells ? custom(spec.cells, spec.color || '#5b8cff', spec.g, spec.sh) : (BUILD[spec.scene] || BUILD.unknown)(spec.color || '#8e8e93'));
    }
    function buildTravel(spec) {
      {
        const make = VEH[spec.tr] || VEH.other, g = new THREE.Group();
        g.add(mesh(box(14, 0.3, 9), spec.tr === 'train' ? '#6f8f5a' : GRASS, 0, -0.17, 0));
        g.add(mesh(box(14, 0.04, spec.tr === 'walk' || spec.tr === 'bike' ? 1.2 : 2.2), spec.tr === 'train' ? '#6d5a4b' : spec.tr === 'walk' ? STONE : ASPHALT, 0, 0.02, 0));
        const env = new THREE.Group(); g.add(env);
        for (let i = 0; i < 9; i++) { const tr = at(tree(i % 2 ? '#3fa45b' : '#58b86a'), -7 + i * 1.75, 0, (i % 2 ? 1 : -1) * (2 + (i % 3) * 0.6), 0, 0.8 + (i % 3) * 0.15); env.add(tr); }
        const dashes = new THREE.Group(); g.add(dashes);
        if (spec.tr !== 'walk' && spec.tr !== 'train') for (let i = 0; i < 8; i++) dashes.add(mesh(box(0.7, 0.05, 0.09), WHITE, -7 + i * 2, 0.04, 0));
        const v = make(spec.color || '#ffcc33'); v.position.set(0.4, 0.04, 0); g.add(v);
        g.userData = { travel: { env, dashes, v, speed: spec.tr === 'walk' ? 1.1 : spec.tr === 'bike' ? 2.2 : spec.tr === 'train' ? 5 : spec.tr === 'plane' ? 7 : 3.6 } };
        return g;
      }
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
      if (motion === 'off' || !cur || spec.instant) { if (cur) scene.remove(cur); cur = next; scene.add(cur); setCam(camK); mode = live(spec) ? 'live' : 'idle'; anim = { spec, t: performance.now() }; kick(); draw(); return; }
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
