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

test('v1.39 → v1.45.3: las notas modulares pasan a notas normales que se leen como frase', () => {
  const NT = require('../js/note-tpl.js');
  const p = NT.sanitizeTpl({ id: 'nm1', kind: 'mod', name: 'Conocer', fields: [{ id: 'a', label: 'Conocer a' }, { id: 'b', label: 'en el lugar' }, { id: 'c', label: '' }] });
  assert.strictEqual(p.kind, undefined); assert.strictEqual(p.seq, true); assert.strictEqual(p.fields.length, 3); assert.strictEqual(p.icon, 'list');
  assert.deepStrictEqual(p.fields.map(f => f.type), ['text', 'text', 'text']);
  // Ya convertida, sigue igual al volver a pasar por sanitizeTpl
  assert.deepStrictEqual(NT.sanitizeTpl(p), p);
  // Una frase puede mezclar tipos
  const q = NT.sanitizeTpl({ id: 'nm9', seq: true, name: 'Leer', fields: [{ id: 'a', label: 'Leí', type: 'text' }, { id: 'b', label: '', type: 'num', unit: 'págs' }, { id: 'c', label: 'Me gustó', type: 'rate' }] });
  assert.strictEqual(q.fields.length, 2); // un número sin texto no vale
  assert.strictEqual(NT.summary(q, { a: 'Dune', c: 8 }), 'Leí Dune → Me gustó 8/10');
  assert.strictEqual(NT.summary(p, NT.sanitizeVals(p, { a: 'Ana', b: 'Bar Pepe' })), 'Conocer a Ana → en el lugar Bar Pepe');
  assert.strictEqual(NT.summary(p, { b: 'Bar', c: 'feliz' }, 'genial'), 'en el lugar Bar → feliz — genial');
  assert.strictEqual(NT.sanitizeTpl({ id: 'nm2', kind: 'mod', name: 'X', fields: [] }), null);
  assert.strictEqual(NT.sanitizeTpl({ id: 'nm3', kind: 'mod', name: 'X', fields: Array.from({ length: 20 }, (_, i) => ({ id: 's' + i, label: 'p' })) }).fields.length, 12);
});

test('v1.43: historial de una plantilla por meses y series', () => {
  const h = N.history(gaps, read);
  assert.equal(h.n, N.notesOf(gaps, 'tp_read').length);
  assert.ok(h.first <= h.last);
  assert.equal(h.months.reduce((s, m) => s + m.items.length, 0), h.n);
  assert.ok(h.months[0].m >= h.months[h.months.length - 1].m, 'de la más nueva a la más antigua');
  assert.equal(h.months[0].items[0].k, h.last);
  assert.deepEqual(h.series.map(s => s.id), ['pages']);
  assert.equal(h.series[0].pts.length, h.n);
  assert.deepEqual(N.history(gaps, null), { n: 0, first: '', last: '', months: [], series: [], dist: [] });
  assert.deepEqual(h.dist.map(d => d.id), ['book']);
});

test('v1.43: listas propias que crecen y opciones que dependen de otra respuesta', () => {
  const lists = [N.sanitizeList({ id: 'lp', name: 'Personas', items: ['Ana', 'ana ', 'Luis'] })];
  assert.deepEqual(lists[0].items, ['Ana', 'Luis']);
  const met = N.sanitizeTpl({ id: 'nm1', kind: 'mod', name: 'Conocer', fields: [{ id: 'a', label: 'Conocí a', list: 'lp', grow: true }] });
  const talk = N.sanitizeTpl({ id: 'nm2', kind: 'mod', name: 'Charla', fields: [{ id: 'a', label: 'Charla con', list: 'lp' }] });
  assert.deepEqual([met.fields[0].list, met.fields[0].grow, talk.fields[0].grow], ['lp', true, undefined]);
  const g = N.grow(lists, met, { a: 'Alba' }, 5);
  assert.deepEqual(g.lists[0].items, ['Ana', 'Luis', 'Alba']); assert.equal(g.lists[0].mt, 5); assert.deepEqual(g.added, [{ list: 'lp', item: 'Alba' }]);
  assert.deepEqual(lists[0].items, ['Ana', 'Luis'], 'no cambia la lista de entrada');
  assert.equal(N.grow(g.lists, met, { a: 'ALBA' }).added.length, 0);
  assert.equal(N.grow(lists, talk, { a: 'Pepe' }).added.length, 0, 'sin grow no añade');
  // Dependientes
  const gym = N.sanitizeTpl({ id: 'tg', name: 'Gym', fields: [{ id: 'g', label: 'Grupo', type: 'pick', opts: ['Pierna', 'Pecho'] }, { id: 'e', label: 'Ejercicio', type: 'pick', opts: [], dep: 'g', by: { Pierna: ['Sentadilla', 'Prensa'], Pecho: ['Press banca'], Brazo: ['Curl'] } }] });
  assert.deepEqual(Object.keys(gym.fields[1].by), ['Pierna', 'Pecho']);
  assert.deepEqual(N.optsFor(gym.fields[1], { g: 'Pecho' }), ['Press banca']);
  assert.deepEqual(N.sanitizeVals(gym, { g: 'Pierna', e: 'Prensa' }), { g: 'Pierna', e: 'Prensa' });
  assert.deepEqual(N.sanitizeVals(gym, { g: 'Pecho', e: 'Prensa' }), { g: 'Pecho' });
  assert.equal(N.sanitizeTpl({ id: 'tx', name: 'X', fields: [{ id: 'e', label: 'E', type: 'pick', opts: [], dep: 'zz', by: { a: ['b'] } }] }).fields.length, 0);
});

test('v1.43: dónde sale un elemento de una lista y buscar en notas', () => {
  const met = N.sanitizeTpl({ id: 'nm1', kind: 'mod', name: 'Conocer', fields: [{ id: 'a', label: 'Conocí a', list: 'lp', grow: true }] });
  const talk = N.sanitizeTpl({ id: 'nm2', kind: 'mod', name: 'Charla', fields: [{ id: 'a', label: 'Charla con', list: 'lp' }] });
  const g = { '2026-11-01': [{ a: '', b: '', t: 'Conocí a Alba', tp: 'nm1', v: { a: 'Alba' } }], '2026-11-03': [{ a: '10:00', b: '11:00', t: 'Charla con alba — café en el Bar Pepe', tp: 'nm2', v: { a: 'alba' }, x: 'café' }, { a: '', b: '', t: 'Charla con Luis', tp: 'nm2', v: { a: 'Luis' } }] };
  assert.deepEqual(N.mentions(g, [met, talk], 'lp', 'ALBA').map(m => [m.k, m.tpl.id]), [['2026-11-03', 'nm2'], ['2026-11-01', 'nm1']]);
  assert.deepEqual(N.search(g, 'cafe bar').map(r => [r.k, r.j]), [['2026-11-03', 0]]);
  assert.deepEqual(N.search(g, 'charla').map(r => r.j), [0, 1]);
  assert.deepEqual(N.search(g, '', { tp: 'nm1' }).map(r => r.k), ['2026-11-01']);
  assert.deepEqual(N.search(g, ''), []);
});

test('v1.52: Listas con selección múltiple (marcar, guardar, añadir a la lista y menciones)', () => {
  assert.deepEqual(N.items('Ana, Pepe ,ana; Luis'), ['Ana', 'Pepe', 'Luis']);
  assert.equal(N.toggleItem('', 'Ana'), 'Ana');
  assert.equal(N.toggleItem('Ana', 'Pepe'), 'Ana, Pepe');
  assert.equal(N.toggleItem('Ana, Pepe', 'ana'), 'Pepe');
  const tpl = N.sanitizeTpl({ id: 'nm2', name: 'Quedar', seq: true, fields: [{ id: 'who', label: 'Con', type: 'text', list: 'lp', grow: true }] });
  const v = N.sanitizeVals(tpl, { who: 'Ana, Pepe, Ana' });
  assert.deepEqual(v, { who: 'Ana, Pepe' });
  const gr = N.grow([{ id: 'lp', name: 'Personas', items: ['Ana'] }], tpl, v, 1);
  assert.deepEqual(gr.lists[0].items, ['Ana', 'Pepe']);
  assert.deepEqual(gr.added.map(a => a.item), ['Pepe']);
  const gaps = { '2026-11-08': [{ a: '', b: '', t: 'Con Ana, Pepe', tp: 'nm2', v }] };
  assert.equal(N.mentions(gaps, [tpl], 'lp', 'pepe').length, 1);
  assert.deepEqual(N.history(gaps, tpl).dist[0].top, [['Ana', 1], ['Pepe', 1]]);
  assert.ok(N.ICONS.length > 60 && N.ICONS.includes('paw'));
  assert.equal(N.sanitizeTpl({ id: 'c1', name: 'X', color: '#123abc', fields: [{ id: 'a', label: 'A', type: 'text' }] }).color, '#123abc');
});
