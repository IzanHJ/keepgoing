const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../js/scenes.js');

test('plantillas válidas y dentro de la rejilla', () => {
  for (const t of S.TEMPLATES) { const c = S.template(t.id); assert.ok(c.length >= 10, t.id); assert.ok(c.every(k => k[0] >= 0 && k[0] < S.GRID && k[1] >= 0 && k[1] < S.GRID)); }
  assert.deepEqual(S.template('nada'), []);
});

test('estilo: limpia colores, escenarios y casillas', () => {
  const st = S.normStyle({ colors: { home: '#FF0000', office: 'rojo', nada: '#00ff00', 'tr-bus': '#123456' }, scenes: [
    { id: 'xabcdefgh', name: '  Mi barrio  ', color: '#00AA00', cells: [[0, 0, 'house', 5, 2], [0, 0, 'tree'], [0, 0, 'car'], [9, 0, 'tree'], [1, 1, 'ovni']], tpl: 'city' },
    { id: 'xabcdefgh', name: 'repetido' }, { id: 'malo' }] });
  assert.deepEqual(st.colors, { home: '#ff0000', 'tr-bus': '#123456' });
  assert.equal(st.scenes.length, 1);
  assert.deepEqual(st.scenes[0], { id: 'xabcdefgh', name: 'Mi barrio', color: '#00aa00', cells: [[0, 0, 'house', 1, 2], [0, 0, 'car', 0, 1]], tpl: 'city' });
  assert.equal(st.mono, true);
  assert.equal(S.normStyle(null).scenes.length, 0);
  assert.equal(S.colorOf(st, 'home'), '#ff0000');
  assert.equal(S.colorOf(st, 'office'), S.DEFAULT_COLORS.office);
});

test('editar la rejilla: poner, girar, cambiar, tamaño y borrar', () => {
  let c = S.place([], 2, 3, 'house');
  assert.deepEqual(c, [[2, 3, 'house', 0, 1]]);
  c = S.place(c, 2, 3, 'house'); assert.equal(c[0][3], 1); // misma pieza: gira
  c = S.place(c, 2, 3, 'car'); assert.equal(c.length, 2); // coche encima
  c = S.place(c, 2, 3, 'tree'); assert.deepEqual(c.map(k => k[2]).sort(), ['car', 'tree']); // cambia la casa por el árbol
  c = S.resize(c, 2, 3); assert.equal(c.find(k => k[2] === 'tree' || k[2] === 'car')[4] !== undefined, true);
  c = S.erase(c, 2, 3); assert.deepEqual(c.map(k => k[2]), ['tree']); // borra primero lo de encima
  c = S.erase(c, 2, 3); assert.deepEqual(c, []);
  assert.equal(S.erase([], 0, 0).length, 0);
});

test('ids de escenarios propios', () => {
  let i = 0; const rnd = () => (i++ % 26) / 26;
  const id = S.newId(rnd); assert.match(id, /^x[a-z]{8}$/);
  assert.ok(S.isCustom(id)); assert.ok(!S.isCustom('home'));
});

test('v1.42: cada escenario de serie tiene su rejilla, su color y piezas conocidas', () => {
  const W = require('../js/world.js');
  for (const id of W.SCENE_IDS) {
    const l = S.layout(id); assert.ok(l, id); assert.ok(l.cells.length >= 4, id);
    assert.ok(S.GROUNDS.includes(l.g) && S.SHAPES.includes(l.sh), id);
    assert.ok(S.DEFAULT_COLORS[id], id);
    assert.equal(l.cells.length, S.LAYOUTS[id].cells.length, id + ': ninguna casilla se pierde al limpiar');
  }
  assert.equal(W.SCENE_IDS.length, 28);
  for (const [a] of S.ASSETS) assert.ok(S.GROUP_IDS.some(g => S.GROUPS[g].includes(a)), a + ' está en algún grupo del creador');
});

test('v1.42: tres capas por casilla (suelo, objeto y encima)', () => {
  const c = S.normCells([[1, 1, 'rug'], [1, 1, 'table'], [1, 1, 'person'], [1, 1, 'chair']]);
  assert.deepEqual(c.map(k => k[2]), ['rug', 'table', 'person']);
  let d = S.place([], 2, 2, 'road'); d = S.place(d, 2, 2, 'car'); d = S.place(d, 2, 2, 'lamp');
  assert.equal(d.length, 3);
  d = S.erase(d, 2, 2); assert.deepEqual(d.map(k => k[2]).sort(), ['lamp', 'road']);
  d = S.erase(d, 2, 2); assert.deepEqual(d.map(k => k[2]), ['road']);
});

test('v1.42: editar un escenario de serie y restaurarlo', () => {
  const st = S.normStyle({ over: { park: { cells: [[3, 3, 'fountain']], g: 'stone', sh: 'room' }, nada: { cells: [] }, xabcdefgh: { cells: [] } } });
  assert.deepEqual(Object.keys(st.over), ['park']);
  const p = S.sceneOf(st, 'park'); assert.equal(p.edited, true); assert.equal(p.g, 'stone'); assert.equal(p.sh, 'room'); assert.equal(p.cells.length, 1);
  delete st.over.park; const q = S.sceneOf(st, 'park'); assert.equal(q.edited, false); assert.ok(q.cells.length > 5);
  assert.equal(S.sceneOf(st, 'nada'), null);
  const own = S.normStyle({ scenes: [{ id: 'xabcdefgh', name: 'Mío', cells: [[0, 0, 'tree']], g: 'wood', sh: 'sq' }] });
  assert.deepEqual(S.sceneOf(own, 'xabcdefgh'), { cells: [[0, 0, 'tree', 0, 1]], g: 'wood', sh: 'sq', color: S.CUSTOM_COLOR, custom: true });
});

test('v1.42: «Alternativa» es determinista, no pierde edificios y no se sale de la rejilla', () => {
  for (const id of S.LAYOUT_IDS) {
    const l = S.layout(id), v1 = S.variant(l.cells, 42, { room: l.sh === 'room' }), v2 = S.variant(l.cells, 42, { room: l.sh === 'room' });
    assert.deepEqual(v1, v2, id);
    const big = cs => cs.filter(k => S.BIG.includes(k[2])).map(k => k[2]).sort();
    assert.deepEqual(big(v1), big(l.cells), id + ': mismas piezas grandes');
    assert.ok(v1.every(k => k[0] >= 0 && k[0] < S.GRID && k[1] >= 0 && k[1] < S.GRID), id);
    if (l.sh === 'room') assert.deepEqual(v1.filter(k => S.BIG.includes(k[2])).map(k => k.slice(0, 2)), l.cells.filter(k => S.BIG.includes(k[2])).map(k => k.slice(0, 2)), id + ': en una habitación los muebles grandes no se mueven');
  }
  const l = S.layout('park'); assert.notDeepEqual(S.variant(l.cells, 1), S.variant(l.cells, 2));
});
