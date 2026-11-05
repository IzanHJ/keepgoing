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
