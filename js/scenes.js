/* KeepGoing — Escenarios 3D (v1.40): lógica pura, sin DOM ni 3D. window.KGScenes en el navegador y require en los tests.
   · Un color por escenario: los 16 escenarios de lugar y los 8 de transporte tienen un color propio que se puede cambiar.
   · Escenarios propios: una rejilla de 7 × 7 casillas donde cada casilla lleva una pieza low-poly (casa, árbol, roca…),
     con giro (0-3 cuartos de vuelta) y tamaño (0 pequeño, 1 normal, 2 grande). Se guardan en state.lwStyle.scenes.
   · Plantillas: rejillas ya hechas para empezar (pueblo, ciudad, bosque, costa, campus, plaza).
   Los modelos 3D de cada pieza están en js/lifeworld.js (ASSET). Ampliar = añadir aquí la pieza y allí su modelo. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KGScenes = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const GRID = 7, MAX_SCENES = 30, NAME_MAX = 30;
  // Piezas: id → icono de línea de la app
  const ASSETS = [
    ['house', 'house'], ['block', 'grid'], ['tower', 'tower'], ['tree', 'tree'], ['pine', 'pine'], ['bush', 'bush'],
    ['rock', 'rock'], ['hill', 'hill'], ['water', 'water'], ['path', 'route'], ['road', 'road'], ['bench', 'bench'],
    ['lamp', 'lamp'], ['fence', 'fence'], ['fountain', 'fountain'], ['tent', 'tent'], ['car', 'car'], ['person', 'user'],
  ];
  const ASSET_IDS = ASSETS.map(a => a[0]);
  const HEX = /^#[0-9a-f]{6}$/i;
  const RE_ID = /^x[a-z]{8}$/;
  // Color de serie de cada escenario (lugar) y de cada transporte (tr-…)
  const DEFAULT_COLORS = {
    home: '#ff9f43', office: '#5b8cff', park: '#3fbf6a', beach: '#2fb4e8', gym: '#ff5d73', restaurant: '#ffb020', mall: '#b06cff',
    university: '#7a6cff', library: '#c2853d', hospital: '#ff6b6b', hotel: '#26c6da', stadium: '#4caf50', station: '#8d99ae',
    neighborhood: '#f4a261', road: '#6c7a89', airport: '#4dabf7',
    'tr-walk': '#3ddc97', 'tr-bike': '#22c1c3', 'tr-moto': '#ff7a45', 'tr-car': '#ff4d6d', 'tr-bus': '#ffc233', 'tr-train': '#7c8cff', 'tr-plane': '#4dabf7', 'tr-other': '#9aa3b2',
  };
  const CUSTOM_COLOR = '#5b8cff';

  // Plantillas: [x, z, pieza, giro, tamaño]
  const c = (x, z, a, r = 0, s = 1) => [x, z, a, r, s];
  const TEMPLATES = [
    { id: 'village', cells: [c(1, 1, 'house'), c(3, 1, 'house', 1), c(5, 1, 'house', 2, 0), c(1, 3, 'tree'), c(2, 3, 'path', 1), c(3, 3, 'fountain'), c(4, 3, 'path', 1), c(5, 3, 'tree', 0, 2), c(1, 5, 'house', 3, 0), c(3, 5, 'bench'), c(5, 5, 'house'), c(0, 6, 'bush'), c(6, 0, 'pine'), c(6, 6, 'fence'), c(3, 4, 'person')] },
    { id: 'city', cells: [c(1, 1, 'tower', 0, 2), c(3, 1, 'block'), c(5, 1, 'tower'), c(0, 3, 'road', 1), c(1, 3, 'road', 1), c(2, 3, 'road', 1), c(3, 3, 'road', 1), c(4, 3, 'road', 1), c(5, 3, 'road', 1), c(6, 3, 'road', 1), c(2, 3, 'car', 1), c(1, 5, 'block', 2), c(3, 5, 'tower', 0, 0), c(5, 5, 'block', 1, 2), c(4, 2, 'lamp'), c(2, 4, 'lamp'), c(6, 5, 'tree', 0, 0)] },
    { id: 'forest', cells: [c(0, 0, 'pine', 0, 2), c(2, 0, 'pine'), c(4, 1, 'pine', 0, 2), c(6, 0, 'pine', 0, 0), c(1, 2, 'tree'), c(5, 2, 'rock'), c(3, 3, 'tent'), c(3, 4, 'path'), c(3, 5, 'path'), c(0, 4, 'pine'), c(6, 4, 'pine', 0, 2), c(1, 6, 'bush'), c(5, 6, 'pine'), c(2, 5, 'rock', 1, 0), c(6, 6, 'hill', 0, 2)] },
    { id: 'coast', cells: [c(0, 0, 'water'), c(1, 0, 'water'), c(2, 0, 'water'), c(3, 0, 'water'), c(4, 0, 'water'), c(5, 0, 'water'), c(6, 0, 'water'), c(0, 1, 'water'), c(1, 1, 'water'), c(2, 1, 'water'), c(3, 1, 'water'), c(4, 1, 'water'), c(5, 1, 'water'), c(6, 1, 'water'), c(1, 3, 'tent', 0, 0), c(3, 3, 'person'), c(5, 3, 'rock'), c(0, 5, 'house'), c(2, 5, 'tree', 0, 2), c(4, 5, 'bench'), c(6, 5, 'house', 3), c(5, 6, 'pine', 0, 0)] },
    { id: 'campus', cells: [c(1, 1, 'block', 0, 2), c(3, 1, 'block', 0, 2), c(5, 1, 'block', 0, 2), c(0, 3, 'path', 1), c(1, 3, 'path', 1), c(2, 3, 'path', 1), c(3, 3, 'path', 1), c(4, 3, 'path', 1), c(5, 3, 'path', 1), c(6, 3, 'path', 1), c(3, 5, 'fountain', 0, 2), c(1, 5, 'tree'), c(5, 5, 'tree'), c(2, 4, 'bench'), c(4, 4, 'bench', 2), c(3, 4, 'person', 2)] },
    { id: 'plaza', cells: [c(3, 3, 'fountain', 0, 2), c(1, 1, 'lamp'), c(5, 1, 'lamp'), c(1, 5, 'lamp'), c(5, 5, 'lamp'), c(3, 1, 'bench'), c(3, 5, 'bench', 2), c(1, 3, 'bench', 1), c(5, 3, 'bench', 3), c(0, 0, 'tree'), c(6, 0, 'tree'), c(0, 6, 'tree'), c(6, 6, 'tree'), c(2, 2, 'person', 1), c(4, 4, 'person', 3)] },
  ];
  const TEMPLATE_IDS = TEMPLATES.map(x => x.id);

  const okCell = x => Array.isArray(x) && Number.isInteger(x[0]) && Number.isInteger(x[1]) && x[0] >= 0 && x[0] < GRID && x[1] >= 0 && x[1] < GRID && ASSET_IDS.includes(x[2]);
  // Casillas limpias: una pieza por casilla, salvo un coche o una persona encima de un camino o carretera (se permite apilar esos dos)
  function normCells(cells) {
    const out = [], seen = new Set();
    for (const x of Array.isArray(cells) ? cells : []) {
      if (!okCell(x)) continue;
      const top = x[2] === 'car' || x[2] === 'person', k = `${x[0]},${x[1]},${top ? 't' : 'g'}`;
      if (seen.has(k)) continue; seen.add(k);
      out.push([x[0], x[1], x[2], Number.isInteger(x[3]) ? ((x[3] % 4) + 4) % 4 : 0, x[4] === 0 || x[4] === 2 ? x[4] : 1]);
      if (out.length >= GRID * GRID * 2) break;
    }
    return out;
  }
  function normScene(s) {
    if (!s || typeof s !== 'object' || !RE_ID.test(s.id)) return null;
    return { id: s.id, name: typeof s.name === 'string' && s.name.trim() ? s.name.trim().slice(0, NAME_MAX) : 'Escenario', color: HEX.test(s.color) ? s.color.toLowerCase() : CUSTOM_COLOR, cells: normCells(s.cells), ...(TEMPLATE_IDS.includes(s.tpl) ? { tpl: s.tpl } : {}) };
  }
  // state.lwStyle = { colors: { escenario o tr-transporte o id propio: '#rrggbb' }, scenes: [escenarios propios] }
  function normStyle(raw) {
    const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const scenes = []; const ids = new Set();
    for (const s of Array.isArray(r.scenes) ? r.scenes : []) { const n = normScene(s); if (n && !ids.has(n.id)) { ids.add(n.id); scenes.push(n); } if (scenes.length >= MAX_SCENES) break; }
    const colors = {};
    for (const [k, v] of Object.entries(r.colors && typeof r.colors === 'object' ? r.colors : {})) if (HEX.test(v) && (k in DEFAULT_COLORS)) colors[k] = v.toLowerCase();
    return { colors, scenes, mono: r.mono !== false };
  }
  // Color de un escenario (de lugar o 'tr-…'): el elegido o el de serie
  const colorOf = (style, key) => (style && style.colors && style.colors[key]) || DEFAULT_COLORS[key] || CUSTOM_COLOR;
  // Id nuevo para un escenario propio (rnd: función 0..1, para poder probarlo)
  function newId(rnd = Math.random, taken = []) {
    for (let n = 0; n < 50; n++) { let id = 'x'; for (let i = 0; i < 8; i++) id += String.fromCharCode(97 + Math.floor(rnd() * 26)); if (!taken.includes(id)) return id; }
    return null;
  }
  const isCustom = id => typeof id === 'string' && RE_ID.test(id);
  const template = id => { const t = TEMPLATES.find(x => x.id === id); return t ? normCells(t.cells) : []; };

  /* ---- Edición de la rejilla (devuelven una lista nueva) ---- */
  const topAsset = a => a === 'car' || a === 'person';
  const at = (cells, x, z) => cells.filter(k => k[0] === x && k[1] === z);
  // Poner una pieza: si ya hay una igual en esa casilla, gira un cuarto de vuelta; si hay otra del mismo nivel, la cambia
  function place(cells, x, z, asset, size = 1) {
    const lay = topAsset(asset), same = cells.find(k => k[0] === x && k[1] === z && topAsset(k[2]) === lay);
    if (same && same[2] === asset) return cells.map(k => (k === same ? [k[0], k[1], k[2], (k[3] + 1) % 4, k[4]] : k));
    return normCells([...cells.filter(k => k !== same), [x, z, asset, 0, size]]);
  }
  const erase = (cells, x, z) => { const xs = at(cells, x, z); if (!xs.length) return cells; const top = xs.find(k => topAsset(k[2])) || xs[0]; return cells.filter(k => k !== top); };
  const resize = (cells, x, z) => { const xs = at(cells, x, z); if (!xs.length) return cells; const k0 = xs[xs.length - 1]; return cells.map(k => (k === k0 ? [k[0], k[1], k[2], k[3], (k[4] + 1) % 3] : k)); };

  return { GRID, MAX_SCENES, NAME_MAX, ASSETS, ASSET_IDS, DEFAULT_COLORS, CUSTOM_COLOR, TEMPLATES, TEMPLATE_IDS, normCells, normScene, normStyle, colorOf, newId, isCustom, template, place, erase, resize, topAsset };
});
