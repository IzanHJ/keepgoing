const test = require('node:test');
const assert = require('assert');
const N = require('../js/note-tpl.js');

const L = { read: 'Leer', book: 'Libro', pages: 'Páginas', pagesU: 'págs', gym: 'Entreno', gymKind: 'Tipo', gymOpts: ['Fuerza', 'Cardio'], minutes: 'Minutos', sets: 'Series', effort: 'Esfuerzo', study: 'Estudio', subject: 'Asignatura', hours: 'Horas', date: 'Cita', who: 'Con quién', where: 'Dónde', done: 'Hecha' };
const [read, gym, study, date] = N.seeds(L);

test('Plantillas: las de serie son válidas y tienen id fijo', () => {
  assert.deepEqual([read, gym, study, date].map(t => t.id), ['tp_read', 'tp_gym', 'tp_study', 'tp_date']);
  assert.deepEqual(read.prog, { key: 'book', amt: 'pages' });
  assert.equal(gym.prog, null);
  assert.equal(study.icon, 'cap');
});

test('Plantillas: se limpian los datos raros', () => {
  assert.equal(N.sanitizeTpl({ id: 'x', name: '  ' }), null);
  assert.equal(N.sanitizeTpl({ id: '../x', name: 'A' }), null);
  const t = N.sanitizeTpl({ id: 'x', name: 'A\nB|C', icon: 'nope', color: 'red', fields: [{ id: 'a', label: 'Uno', type: 'raro' }, { id: 'a', label: 'Dup', type: 'num' }, { id: 'p', label: 'P', type: 'pick', opts: [] }, { label: '' }], prog: { key: 'a', amt: 'a' }, goals: { x: 5 } });
  assert.equal(t.name, 'A B|C');
  assert.equal(t.icon, 'doc'); assert.equal(t.color, '#7c8cff');
  assert.deepEqual(t.fields, [{ id: 'a', label: 'Uno', type: 'text' }]);
  assert.equal(t.prog, null); assert.deepEqual(t.goals, {});
});

test('Plantillas: valores según el tipo de cada campo', () => {
  assert.deepEqual(N.sanitizeVals(gym, { kind: 'Yoga', min: '45,5', sets: -2, effort: 11, otro: 'x' }), { min: 45.5 });
  assert.deepEqual(N.sanitizeVals(gym, { kind: 'Cardio', effort: '7' }), { kind: 'Cardio', effort: 7 });
  assert.deepEqual(N.sanitizeVals(date, { who: 'Ana', done: true }), { who: 'Ana', done: true });
  assert.deepEqual(N.sanitizeVals(date, { done: 'no' }), {});
});

test('Plantillas: resumen', () => {
  assert.equal(N.summary(read, { book: 'Dune', pages: 30 }, ''), 'Leer · Dune · 30 págs');
  assert.equal(N.summary(gym, { kind: 'Fuerza', min: 60, effort: 8 }, 'pierna', n => n + ''), 'Entreno · Fuerza · 60 min · Esfuerzo 8/10 — pierna');
  assert.equal(N.summary(date, { who: 'Ana', done: true }), 'Cita · Ana · Hecha');
});

const gaps = {
  '2026-10-01': [{ a: '', b: '', t: 'x', tp: 'tp_read', v: { book: 'Dune', pages: 100 } }],
  '2026-10-03': [{ a: '21:00', b: '22:00', t: 'x', tp: 'tp_read', v: { book: 'dune ', pages: 50 } }, { a: '10:00', b: '11:00', t: 'nota normal' }],
  '2026-10-05': [{ a: '', b: '', t: 'x', tp: 'tp_read', v: { book: 'Momo', pages: 20 } }],
  '2026-11-02': [{ a: '', b: '', t: 'x', tp: 'tp_gym', v: { kind: 'Cardio', min: 30, effort: 6 } }, { a: '', b: '', t: 'x', tp: 'tp_gym', v: { kind: 'Cardio', min: 20, effort: 9 } }]
};

test('Plantillas: recordar lo último', () => {
  assert.deepEqual(N.lastVals(gaps, 'tp_read'), { book: 'Momo', pages: 20 });
  assert.deepEqual(N.lastVals(gaps, 'tp_read', '2026-10-04'), { book: 'dune ', pages: 50 });
  assert.deepEqual(N.lastVals(gaps, 'tp_study'), {});
  assert.deepEqual(N.recent(gaps, 'tp_read', 'book'), ['Momo', 'dune ']);
});

test('Plantillas: progreso por libro con meta', () => {
  const t = { ...read, goals: { dune: 600 } };
  assert.deepEqual(N.progress(gaps, t, 'DUNE'), { key: 'dune', done: 150, n: 2, goal: 600, pct: 25, finished: false });
  assert.equal(N.progress(gaps, { ...read, goals: { momo: 20 } }, 'Momo').finished, true);
  assert.equal(N.progress(gaps, gym, 'x'), null);
});

test('Plantillas: totales del periodo', () => {
  const tot = N.totals(gaps, [read, gym, study], '2026-10-01', '2026-10-31');
  assert.equal(tot.length, 1);
  assert.equal(tot[0].n, 3);
  assert.deepEqual(tot[0].fields, [{ id: 'pages', label: 'Páginas', kind: 'sum', value: 170, unit: 'págs' }]);
  assert.deepEqual(tot[0].byKey.map(x => [x.key, x.sum]), [['dune', 150], ['momo', 20]]);
  const g = N.totals(gaps, [gym], '2026-11-01', '2026-11-30')[0];
  assert.deepEqual(g.fields.find(f => f.id === 'effort'), { id: 'effort', label: 'Esfuerzo', kind: 'avg', value: 7.5 });
  assert.deepEqual(g.fields.find(f => f.id === 'kind').value, [['Cardio', 2]]);
});
