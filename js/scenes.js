/* KeepGoing — Escenarios 3D (v1.40): lógica pura, sin DOM ni 3D. window.KGScenes en el navegador y require en los tests.
   · Un color por escenario: los 16 escenarios de lugar y los 8 de transporte tienen un color propio que se puede cambiar.
   · Escenarios propios: una rejilla de 7 × 7 casillas donde cada casilla lleva una pieza low-poly (casa, árbol, roca…),
     con giro (0-3 cuartos de vuelta) y tamaño (0 pequeño, 1 normal, 2 grande). Se guardan en state.lwStyle.scenes.
   · Plantillas: rejillas ya hechas para empezar (pueblo, ciudad, bosque, costa, campus, plaza).
   Los modelos 3D de cada pieza están en js/lifeworld.js (ASSET). Ampliar = añadir aquí la pieza y allí su modelo.
   v1.42: los escenarios de serie también son rejillas (LAYOUTS), así se pueden editar (state.lwStyle.over[id]) y restaurar.
   · Tres capas por casilla: suelo plano (agua, camino, alfombra…), objeto (casa, árbol, mesa…) y encima (coche, persona, tren, avión).
   · Cada escenario tiene suelo (g) y forma (sh): redondo, cuadrado o habitación (con dos paredes, para los interiores).
   · «Alternativa» (variant): con una semilla, recoloca las mismas piezas (simetría, árboles que cambian de especie, decoración
     movida a otras casillas libres). Las piezas grandes (edificios, montaña, piscina…) se quedan donde estaban. */
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
    // v1.42: naturaleza y calle
    ['mountain', 'mountain'], ['umbrella', 'beach'], ['sand', 'water'], ['parking', 'car'], ['rail', 'train'], ['runway', 'plane'],
    ['plane', 'plane'], ['train', 'train'],
    // v1.42: edificios grandes (los de los escenarios de serie)
    ['bhouse', 'house'], ['office', 'briefcase'], ['gymb', 'dumbbell'], ['restb', 'fork'], ['mallb', 'bag'], ['unib', 'cap'],
    ['libb', 'book'], ['hospb', 'cross'], ['hotelb', 'bed'], ['arena', 'trophy'], ['stationb', 'train'], ['ctower', 'tower'],
    ['market', 'cart'], ['flats', 'building'], ['cafe', 'cup'], ['school', 'school'], ['cinema', 'film'], ['pool', 'pool'], ['pharmacy', 'pill'],
    // v1.42: interior
    ['desk', 'desk'], ['chair', 'chair'], ['sofa', 'sofa'], ['tv', 'tv'], ['bed', 'bed'], ['wardrobe', 'box'], ['shelf', 'book'],
    ['plant', 'plant'], ['rug', 'rug'], ['board', 'board'], ['table', 'ptable'], ['flamp', 'lamp'],
  ];
  // Grupos del creador
  const GROUPS = {
    nature: ['tree', 'pine', 'bush', 'rock', 'hill', 'mountain', 'water', 'sand', 'tent', 'umbrella'],
    street: ['path', 'road', 'parking', 'rail', 'runway', 'bench', 'lamp', 'fence', 'fountain', 'car', 'person', 'train', 'plane'],
    build: ['house', 'block', 'tower', 'bhouse', 'flats', 'office', 'market', 'cafe', 'restb', 'mallb', 'school', 'unib', 'libb', 'hospb', 'pharmacy', 'hotelb', 'gymb', 'cinema', 'pool', 'arena', 'stationb', 'ctower'],
    indoor: ['desk', 'chair', 'table', 'sofa', 'tv', 'bed', 'wardrobe', 'shelf', 'board', 'plant', 'flamp', 'rug'],
  };
  const GROUP_IDS = Object.keys(GROUPS);
  const FLAT = ['water', 'path', 'road', 'sand', 'parking', 'rail', 'runway', 'rug'];
  const TOP = ['car', 'person', 'train', 'plane'];
  // Piezas grandes: «Alternativa» no las mueve
  const BIG = ['bhouse', 'office', 'gymb', 'restb', 'mallb', 'unib', 'libb', 'hospb', 'hotelb', 'arena', 'stationb', 'ctower', 'market', 'flats', 'cafe', 'school', 'cinema', 'pool', 'pharmacy', 'mountain', 'board', 'bed', 'wardrobe', 'sofa', 'tv', 'desk'];
  // Suelos y formas
  const GROUNDS = ['tint', 'grass', 'stone', 'sand', 'asphalt', 'wood', 'tile'];
  const SHAPES = ['sq', 'round', 'room'];
  const ASSET_IDS = ASSETS.map(a => a[0]);
  const HEX = /^#[0-9a-f]{6}$/i;
  const RE_ID = /^x[a-z]{8}$/;
  // Color de serie de cada escenario (lugar) y de cada transporte (tr-…)
  const DEFAULT_COLORS = {
    home: '#ff9f43', office: '#5b8cff', park: '#3fbf6a', beach: '#2fb4e8', gym: '#ff5d73', restaurant: '#ffb020', mall: '#b06cff',
    university: '#7a6cff', library: '#c2853d', hospital: '#ff6b6b', hotel: '#26c6da', stadium: '#4caf50', station: '#8d99ae',
    neighborhood: '#f4a261', road: '#6c7a89', airport: '#4dabf7',
    supermarket: '#2ec4b6', apartments: '#e07a5f', cafe: '#a47148', school: '#ffb703', cinema: '#e63946', pool: '#00b4d8', mountain: '#6a994e', pharmacy: '#38b000',
    office_in: '#5b8cff', living: '#ff9f43', bedroom: '#9d4edd', classroom: '#3a86ff',
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

  const layer = a => (TOP.includes(a) ? 't' : FLAT.includes(a) ? 'f' : 'g');
  const okCell = x => Array.isArray(x) && Number.isInteger(x[0]) && Number.isInteger(x[1]) && x[0] >= 0 && x[0] < GRID && x[1] >= 0 && x[1] < GRID && ASSET_IDS.includes(x[2]);
  // Casillas limpias: una pieza por casilla, salvo un coche o una persona encima de un camino o carretera (se permite apilar esos dos)
  function normCells(cells) {
    const out = [], seen = new Set();
    for (const x of Array.isArray(cells) ? cells : []) {
      if (!okCell(x)) continue;
      const k = `${x[0]},${x[1]},${layer(x[2])}`;
      if (seen.has(k)) continue; seen.add(k);
      out.push([x[0], x[1], x[2], Number.isInteger(x[3]) ? ((x[3] % 4) + 4) % 4 : 0, x[4] === 0 || x[4] === 2 ? x[4] : 1]);
      if (out.length >= GRID * GRID * 3) break;
    }
    return out;
  }
  // Suelo y forma (solo se guardan si no son los de serie: suelo del color del escenario y losa cuadrada)
  const normLook = s => ({ ...(GROUNDS.includes(s.g) && s.g !== 'tint' ? { g: s.g } : {}), ...(SHAPES.includes(s.sh) && s.sh !== 'sq' ? { sh: s.sh } : {}) });
  function normScene(s) {
    if (!s || typeof s !== 'object' || !RE_ID.test(s.id)) return null;
    return { id: s.id, name: typeof s.name === 'string' && s.name.trim() ? s.name.trim().slice(0, NAME_MAX) : 'Escenario', color: HEX.test(s.color) ? s.color.toLowerCase() : CUSTOM_COLOR, cells: normCells(s.cells), ...normLook(s), ...(TEMPLATE_IDS.includes(s.tpl) ? { tpl: s.tpl } : {}) };
  }
  // state.lwStyle = { colors: { escenario o tr-transporte o id propio: '#rrggbb' }, scenes: [escenarios propios] }
  function normStyle(raw) {
    const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const scenes = []; const ids = new Set();
    for (const s of Array.isArray(r.scenes) ? r.scenes : []) { const n = normScene(s); if (n && !ids.has(n.id)) { ids.add(n.id); scenes.push(n); } if (scenes.length >= MAX_SCENES) break; }
    const colors = {};
    for (const [k, v] of Object.entries(r.colors && typeof r.colors === 'object' ? r.colors : {})) if (HEX.test(v) && (k in DEFAULT_COLORS)) colors[k] = v.toLowerCase();
    // v1.42: escenarios de serie editados (o elegidos con «Alternativa»)
    const over = {};
    for (const [k, v] of Object.entries(r.over && typeof r.over === 'object' && !Array.isArray(r.over) ? r.over : {})) if (LAYOUTS[k] && v && typeof v === 'object') over[k] = { cells: normCells(v.cells), ...normLook(v) };
    return { colors, scenes, mono: r.mono !== false, over };
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
  const topAsset = a => TOP.includes(a);
  const at = (cells, x, z) => cells.filter(k => k[0] === x && k[1] === z);
  // Poner una pieza: si ya hay una igual en esa casilla, gira un cuarto de vuelta; si hay otra de la misma capa, la cambia
  function place(cells, x, z, asset, size = 1) {
    const lay = layer(asset), same = cells.find(k => k[0] === x && k[1] === z && layer(k[2]) === lay);
    if (same && same[2] === asset) return cells.map(k => (k === same ? [k[0], k[1], k[2], (k[3] + 1) % 4, k[4]] : k));
    return normCells([...cells.filter(k => k !== same), [x, z, asset, 0, size]]);
  }
  // Borrar: primero lo de encima, luego el objeto y por último el suelo
  const erase = (cells, x, z) => { const xs = at(cells, x, z); if (!xs.length) return cells; const top = xs.find(k => layer(k[2]) === 't') || xs.find(k => layer(k[2]) === 'g') || xs[0]; return cells.filter(k => k !== top); };
  const resize = (cells, x, z) => { const xs = at(cells, x, z); if (!xs.length) return cells; const k0 = xs[xs.length - 1]; return cells.map(k => (k === k0 ? [k[0], k[1], k[2], k[3], (k[4] + 1) % 3] : k)); };

  /* ---- v1.42: escenarios de serie como rejillas ---- */
  const L = (g, sh, cells) => ({ g, sh, cells });
  const row = (z, a, r = 0, xs = [0, 1, 2, 3, 4, 5, 6]) => xs.map(x => c(x, z, a, r));
  const col = (x, a, r = 1, zs = [0, 1, 2, 3, 4, 5, 6]) => zs.map(z => c(x, z, a, r));
  const LAYOUTS = {
    home: L('grass', 'round', [c(3, 2, 'bhouse'), c(1, 1, 'tree'), c(5, 1, 'tree', 0, 0), ...col(3, 'path', 1, [4, 5, 6]), c(1, 5, 'bush'), c(5, 5, 'fence'), c(6, 5, 'fence'), c(4, 5, 'person', 2), c(0, 3, 'pine', 0, 0)]),
    neighborhood: L('grass', 'round', [c(1, 1, 'house', 0, 0), c(5, 1, 'house', 0, 1), c(3, 1, 'tree', 0, 0), ...row(3, 'road'), c(2, 3, 'car'), c(1, 5, 'house', 2, 0), c(5, 5, 'house', 2, 1), c(3, 5, 'tree'), c(4, 2, 'lamp'), c(2, 4, 'lamp', 2), c(0, 0, 'bush'), c(6, 6, 'bush')]),
    office: L('stone', 'round', [c(3, 2, 'office'), c(5, 4, 'block', 0, 0), c(1, 4, 'tree'), c(1, 5, 'tree', 0, 0), c(3, 5, 'bench', 2), c(5, 1, 'lamp'), ...col(3, 'path', 1, [4, 6]), c(3, 4, 'person')]),
    park: L('grass', 'round', [c(3, 3, 'fountain', 0, 2), c(1, 1, 'tree', 0, 2), c(5, 1, 'tree'), c(1, 5, 'pine'), c(5, 5, 'tree', 0, 2), ...col(3, 'path', 1, [0, 1, 2, 4, 5, 6]), ...row(3, 'path', 0, [0, 1, 2, 4, 5, 6]), c(2, 2, 'bench'), c(4, 4, 'bench', 2), c(4, 2, 'person'), c(0, 4, 'bush'), c(6, 2, 'bush'), c(2, 5, 'lamp')]),
    beach: L('sand', 'round', [...row(0, 'water', 0, [1, 2, 3, 4, 5]), ...row(1, 'water'), c(2, 3, 'umbrella'), c(4, 4, 'umbrella', 1), c(2, 4, 'rug'), c(4, 5, 'rug', 1), c(3, 3, 'person'), c(5, 2, 'person', 2), c(6, 3, 'rock'), c(0, 5, 'tent', 0, 0), c(1, 6, 'bush', 0, 0)]),
    gym: L('stone', 'round', [c(3, 2, 'gymb'), ...row(5, 'parking', 0, [3, 4, 5]), c(5, 5, 'car'), c(1, 1, 'tree'), c(3, 5, 'person'), c(1, 4, 'lamp'), c(0, 6, 'bush')]),
    restaurant: L('stone', 'round', [c(3, 2, 'restb'), c(2, 5, 'table'), c(4, 5, 'table'), c(1, 5, 'chair', 1), c(5, 5, 'chair', 3), c(3, 5, 'umbrella'), c(6, 1, 'tree'), c(0, 4, 'lamp'), c(3, 4, 'person')]),
    mall: L('asphalt', 'round', [c(3, 2, 'mallb'), ...row(5, 'parking', 0, [1, 2, 3, 4, 5]), c(2, 5, 'car'), c(4, 5, 'car', 2), c(0, 4, 'lamp'), c(6, 4, 'lamp'), c(3, 4, 'person'), c(0, 1, 'tree', 0, 0)]),
    university: L('grass', 'round', [c(3, 2, 'unib'), ...col(3, 'path', 1, [4, 5, 6]), c(1, 5, 'tree'), c(5, 5, 'tree', 0, 2), c(2, 5, 'bench', 1), c(4, 5, 'person'), c(1, 3, 'lamp'), c(5, 3, 'lamp')]),
    library: L('stone', 'round', [c(3, 2, 'libb'), c(1, 5, 'tree'), c(5, 5, 'tree'), c(3, 5, 'bench', 2), c(2, 4, 'lamp'), c(4, 4, 'lamp'), c(4, 5, 'person')]),
    hospital: L('stone', 'round', [c(3, 2, 'hospb'), ...row(5, 'road'), c(4, 5, 'car'), c(1, 1, 'tree'), c(6, 1, 'tree', 0, 0), c(1, 4, 'lamp'), c(2, 4, 'person')]),
    hotel: L('stone', 'round', [c(2, 2, 'hotelb'), c(5, 4, 'pool', 0, 0), c(5, 6, 'umbrella'), c(0, 5, 'tree'), c(3, 5, 'person'), c(6, 1, 'pine', 0, 0)]),
    stadium: L('stone', 'round', [c(3, 3, 'arena', 0, 2), c(0, 0, 'lamp'), c(6, 0, 'lamp'), c(0, 6, 'lamp'), c(6, 6, 'lamp')]),
    station: L('stone', 'round', [c(3, 2, 'stationb'), ...row(5, 'rail'), c(3, 5, 'train'), c(1, 3, 'bench'), c(5, 3, 'bench'), c(2, 3, 'person')]),
    road: L('grass', 'round', [...row(3, 'road'), c(2, 3, 'car'), c(5, 3, 'car', 2), c(1, 1, 'tree'), c(5, 1, 'tree', 0, 2), c(2, 5, 'tree'), c(6, 5, 'pine', 0, 0), c(3, 2, 'lamp')]),
    airport: L('grass', 'round', [...row(5, 'runway'), c(3, 5, 'plane'), c(1, 1, 'ctower'), c(4, 1, 'block', 1, 2), c(6, 3, 'lamp'), c(0, 3, 'bush')]),
    supermarket: L('asphalt', 'round', [c(3, 2, 'market'), ...row(5, 'parking', 0, [1, 2, 4, 5]), c(1, 5, 'car'), c(4, 5, 'car', 2), c(3, 5, 'person'), c(0, 1, 'tree'), c(6, 1, 'tree', 0, 0), c(0, 4, 'lamp'), c(6, 4, 'lamp')]),
    apartments: L('grass', 'round', [c(2, 2, 'flats'), c(5, 3, 'flats', 1, 0), c(1, 5, 'tree'), c(4, 6, 'tree', 0, 0), c(2, 5, 'bench'), ...col(3, 'path', 1, [4, 5, 6]), c(3, 5, 'person'), c(6, 0, 'bush')]),
    cafe: L('stone', 'round', [c(3, 2, 'cafe'), c(2, 5, 'table'), c(4, 5, 'table'), c(1, 5, 'chair', 1), c(3, 5, 'chair', 3), c(5, 5, 'chair', 3), c(0, 3, 'lamp'), c(6, 1, 'tree'), c(4, 4, 'person')]),
    school: L('grass', 'round', [c(3, 2, 'school'), ...row(6, 'fence', 0, [1, 2, 4, 5]), ...col(3, 'path', 1, [4, 5, 6]), c(0, 4, 'tree'), c(6, 4, 'tree'), c(2, 5, 'person'), c(4, 5, 'person', 1), c(5, 5, 'bench')]),
    cinema: L('asphalt', 'round', [c(3, 2, 'cinema'), c(1, 5, 'parking'), c(5, 5, 'parking'), c(5, 5, 'car'), c(2, 5, 'lamp'), c(4, 5, 'lamp'), c(3, 5, 'person'), c(0, 1, 'tree', 0, 0)]),
    pool: L('tile', 'round', [c(3, 2, 'pool', 0, 2), c(0, 5, 'umbrella'), c(6, 5, 'umbrella'), c(1, 5, 'rug', 1), c(5, 5, 'rug', 1), c(3, 5, 'person'), c(0, 0, 'tree', 0, 0), c(6, 0, 'tree', 0, 0)]),
    mountain: L('grass', 'round', [c(3, 2, 'mountain', 0, 2), c(0, 1, 'pine'), c(1, 4, 'pine'), c(5, 4, 'pine', 0, 2), c(6, 1, 'pine', 0, 0), c(0, 6, 'pine', 0, 0), c(6, 6, 'pine'), c(3, 5, 'tent'), c(1, 2, 'rock'), c(4, 6, 'rock', 0, 0), c(4, 5, 'person')]),
    pharmacy: L('stone', 'round', [c(3, 2, 'pharmacy'), c(1, 5, 'bench'), c(5, 5, 'tree'), c(0, 3, 'lamp'), c(3, 5, 'person'), ...row(6, 'road', 0, [1, 2, 3, 4, 5])]),
    office_in: L('tile', 'room', [c(1, 1, 'desk'), c(3, 1, 'desk'), c(5, 1, 'desk'), c(1, 2, 'chair', 2), c(3, 2, 'chair', 2), c(5, 2, 'chair', 2), c(1, 4, 'desk'), c(3, 4, 'desk'), c(1, 5, 'chair', 2), c(3, 5, 'chair', 2), c(0, 3, 'shelf', 1), c(5, 5, 'table'), c(6, 6, 'plant'), c(6, 0, 'plant'), c(3, 5, 'person', 2)]),
    living: L('wood', 'room', [c(2, 1, 'tv'), c(2, 3, 'rug'), c(2, 3, 'table'), c(2, 5, 'sofa', 2), c(5, 3, 'sofa', 3, 0), c(5, 0, 'shelf'), c(0, 0, 'plant'), c(4, 5, 'flamp'), c(0, 6, 'plant', 0, 0)]),
    bedroom: L('wood', 'room', [c(2, 1, 'bed'), c(2, 3, 'rug'), c(5, 0, 'wardrobe'), c(5, 4, 'desk', 3), c(4, 4, 'chair', 1), c(0, 1, 'flamp'), c(0, 4, 'shelf', 1), c(6, 6, 'plant')]),
    classroom: L('tile', 'room', [c(3, 0, 'board'), c(3, 1, 'desk'), c(1, 3, 'desk'), c(3, 3, 'desk'), c(5, 3, 'desk'), c(1, 5, 'desk'), c(3, 5, 'desk'), c(5, 5, 'desk'), c(1, 4, 'chair', 2), c(3, 4, 'chair', 2), c(5, 4, 'chair', 2), c(1, 6, 'chair', 2), c(3, 6, 'chair', 2), c(5, 6, 'chair', 2), c(0, 2, 'shelf', 1), c(6, 0, 'plant')]),
  };
  const LAYOUT_IDS = Object.keys(LAYOUTS);
  const layout = id => { const x = LAYOUTS[id]; return x ? { cells: normCells(x.cells), g: x.g, sh: x.sh } : null; };
  /* Lo que se pinta de un escenario: el propio, el de serie editado o el de serie. edited = hay versión tuya (se puede restaurar) */
  function sceneOf(style, id) {
    const st = style || {};
    if (isCustom(id)) { const s = (st.scenes || []).find(x => x.id === id); return s ? { cells: s.cells, g: s.g || 'tint', sh: s.sh || 'sq', color: s.color, custom: true } : null; }
    const base = layout(id); if (!base) return null;
    const o = st.over && st.over[id];
    return o ? { cells: o.cells, g: o.g || 'tint', sh: o.sh || 'sq', color: colorOf(st, id), edited: true } : { ...base, color: colorOf(st, id), edited: false };
  }

  /* ---- v1.42: «Alternativa». Misma lista de piezas, otra disposición. Determinista con la semilla (para poder probarlo) ---- */
  const FAMILY = [['tree', 'pine', 'bush'], ['rock', 'hill'], ['plant', 'flamp']];
  const DECOR = ['tree', 'pine', 'bush', 'rock', 'hill', 'bench', 'lamp', 'tent', 'umbrella', 'plant', 'flamp'];
  function rng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function variant(cells, seed, opt = {}) {
    const R = rng(seed), n = GRID - 1, pick = xs => xs[Math.floor(R() * xs.length)];
    let cs = normCells(cells).map(k => k.slice());
    // 1) simetría (en una habitación no: las paredes están detrás y a la izquierda)
    if (!opt.room) {
      const m = Math.floor(R() * 4);
      if (m & 1) cs = cs.map(([x, z, a, r, s]) => [n - x, z, a, r % 2 ? (r + 2) % 4 : r, s]);
      if (m & 2) cs = cs.map(([x, z, a, r, s]) => [x, n - z, a, r % 2 ? r : (r + 2) % 4, s]);
    }
    // 2) la decoración cambia de especie y de tamaño
    cs = cs.map(k => { const f = FAMILY.find(xs => xs.includes(k[2])); if (f && R() < 0.45) k[2] = pick(f); if (DECOR.includes(k[2]) && R() < 0.5) k[4] = Math.floor(R() * 3); return k; });
    // 3) parte de la decoración se va a otra casilla libre (sin nada en ninguna capa ni pegada a una pieza grande)
    const busy = () => { const b = new Set(); for (const [x, z, a] of cs) { b.add(`${x},${z}`); if (BIG.includes(a)) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) b.add(`${x + dx},${z + dz}`); } return b; };
    const free = () => { const b = busy(), out = []; for (let z = 0; z < GRID; z++) for (let x = 0; x < GRID; x++) if (!b.has(`${x},${z}`)) out.push([x, z]); return out; };
    for (const k of cs) if ((DECOR.includes(k[2]) || k[2] === 'person') && R() < 0.4) { const fr = free(); if (fr.length) { const [x, z] = pick(fr); k[0] = x; k[1] = z; k[3] = Math.floor(R() * 4); } }
    // 4) una o dos piezas más de las que ya había
    const deco = cs.filter(k => DECOR.includes(k[2]));
    for (let i = Math.floor(R() * 3); i > 0 && deco.length; i--) { const fr = free(); if (!fr.length) break; const [x, z] = pick(fr), d = pick(deco); cs.push([x, z, d[2], Math.floor(R() * 4), Math.floor(R() * 3)]); }
    return normCells(cs);
  }

  return { GRID, MAX_SCENES, GROUPS, GROUP_IDS, FLAT, TOP, BIG, GROUNDS, SHAPES, LAYOUTS, LAYOUT_IDS, layout, sceneOf, variant, layer,
    NAME_MAX, ASSETS, ASSET_IDS, DEFAULT_COLORS, CUSTOM_COLOR, TEMPLATES, TEMPLATE_IDS, normCells, normScene, normStyle, colorOf, newId, isCustom, template, place, erase, resize, topAsset };
});
