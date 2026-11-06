const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../js/timeline.js');

test('periodos de cada escala', () => {
  assert.deepEqual(T.range('day', '2026-11-04'), { from: '2026-11-04', to: '2026-11-04' });
  assert.deepEqual(T.range('week', '2026-11-04', { ws: 1 }), { from: '2026-11-02', to: '2026-11-08' });
  assert.deepEqual(T.range('week', '2026-11-04', { ws: 0 }), { from: '2026-11-01', to: '2026-11-07' });
  assert.deepEqual(T.range('month', '2026-02-10'), { from: '2026-02-01', to: '2026-02-28' });
  assert.deepEqual(T.range('month', '2024-02-10'), { from: '2024-02-01', to: '2024-02-29' });
  assert.deepEqual(T.range('year', '2026-06-01'), { from: '2026-01-01', to: '2026-12-31' });
  assert.deepEqual(T.range('all', '2026-06-01', { first: '2025-03-02', today: '2026-11-04' }), { from: '2025-03-02', to: '2026-11-04' });
  assert.deepEqual(T.range('all', '2026-06-01', { today: '2026-11-04' }), { from: '2026-11-04', to: '2026-11-04' });
});

test('mover el periodo respeta el final de mes y los bisiestos', () => {
  assert.equal(T.shift('month', '2026-01-31', 1), '2026-02-28');
  assert.equal(T.shift('month', '2026-03-31', -1), '2026-02-28');
  assert.equal(T.shift('month', '2026-12-15', 1), '2027-01-15');
  assert.equal(T.shift('year', '2024-02-29', 1), '2025-02-28');
  assert.equal(T.shift('week', '2026-11-04', -1), '2026-10-28');
  assert.equal(T.shift('all', '2026-11-04', 1), '2026-11-04');
  assert.equal(T.lastYear('2024-02-29'), '2023-02-28');
});

test('trozos para las minigráficas', () => {
  assert.equal(T.units('week', '2026-11-02', '2026-11-08').length, 7);
  assert.equal(T.units('month', '2026-02-01', '2026-02-28').length, 28);
  const y = T.units('year', '2026-01-01', '2026-12-31');
  assert.equal(y.length, 12); assert.deepEqual(y[1], { from: '2026-02-01', to: '2026-02-28', key: '2026-02' });
  const shortAll = T.units('all', '2025-10-15', '2026-03-04');
  assert.equal(shortAll.length, 6); assert.equal(shortAll[0].from, '2025-10-15'); assert.equal(shortAll[5].to, '2026-03-04');
  const longAll = T.units('all', '2023-05-01', '2026-11-04');
  assert.deepEqual(longAll.map(u => u.key), ['2023', '2024', '2025', '2026']);
  assert.equal(longAll[0].from, '2023-05-01');
  assert.deepEqual(T.units('day', '2026-11-04', '2026-11-04'), []);
});

test('agregar: suma, cierre y media', () => {
  assert.equal(T.aggregate('sum', [1, null, 2]), 3);
  assert.equal(T.aggregate('close', [5, 7, null]), 7);
  assert.equal(T.aggregate('avg', [4, 8]), 6);
  assert.equal(T.aggregate('sum', [null, null]), null);
});

test('comparar: sin porcentaje engañoso sobre 0 y gastos al revés', () => {
  assert.deepEqual(T.compare(10, 15, 'up'), { diff: 5, pct: 50, dir: 'up', good: true });
  const z = T.compare(0, 3, 'up'); assert.equal(z.pct, null); assert.equal(z.good, true);
  assert.equal(T.compare(100, 80, 'down').good, true);
  assert.equal(T.compare(100, 120, 'down').good, false);
  assert.equal(T.compare(5, 5, 'up').dir, 'same');
  assert.equal(T.compare(5, 5, 'up').good, null);
  assert.deepEqual(T.compare(null, 4), { diff: null, pct: null, dir: 'na', good: null });
  assert.equal(T.compare(3, 9, 'none').good, null);
  assert.equal(T.compare(-200, -100, 'up').pct, 50); // un balance negativo que mejora sube
});

test('vistas: limpia lo que no existe y vuelve a las de serie si no hay', () => {
  assert.equal(T.views([]).length, T.DEFAULT_VIEWS.length);
  const v = T.views([{ id: 'mia', name: '  Mía ', ids: ['worth', 'nada', 'worth', 'habits'], main: ['habits', 'rate'] }]);
  assert.deepEqual(v, [{ id: 'mia', name: 'Mía', ids: ['worth', 'habits'], main: ['habits'] }]);
  assert.equal(T.normView({ id: 'mal id!' }), null);
  // las de serie no se modifican al tocar la copia
  T.views()[0].ids.push('x'); assert.ok(!T.DEFAULT_VIEWS[0].ids.includes('x'));
});

test('barra de tiempo: posición y fecha; acontecimientos siguiente y anterior', () => {
  assert.equal(T.posOf('2026-01-01', '2026-01-01', '2026-01-11'), 0);
  assert.equal(T.posOf('2026-01-06', '2026-01-01', '2026-01-11'), .5);
  assert.equal(T.keyAt(.5, '2026-01-01', '2026-01-11'), '2026-01-06');
  assert.equal(T.keyAt(2, '2026-01-01', '2026-01-11'), '2026-01-11');
  const m = [{ date: '2026-03-01' }, { date: '2026-01-05' }, { date: '2026-05-09' }];
  assert.equal(T.nextMark(m, '2026-03-01', '2026-03-31', 1), '2026-05-09');
  assert.equal(T.nextMark(m, '2026-03-01', '2026-03-31', -1), '2026-01-05');
  assert.equal(T.nextMark(m, '2026-05-01', '2026-05-31', 1), null);
});

test('cada indicador del catálogo está completo', () => {
  for (const x of T.INDICATORS) {
    assert.ok(T.GROUPS.includes(x.group), x.id);
    assert.ok(['sum', 'close', 'avg', 'ratio', 'dist'].includes(x.agg), x.id);
    assert.ok(['up', 'down', 'none'].includes(x.better), x.id);
  }
  for (const v of T.DEFAULT_VIEWS) for (const id of v.ids) assert.ok(T.IND[id], v.id + ':' + id);
});
