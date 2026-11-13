const test = require('node:test');
const assert = require('assert');
const S = require('../js/suggest.js');

const at = (k, hm) => { const [y, m, d] = k.split('-').map(Number), [h, mi] = hm.split(':').map(Number); return new Date(y, m - 1, d, h, mi).getTime(); };
const today = '2026-11-13';

test('Entrenamiento de 15:00 a 17:00 propone un turno a esa hora', () => {
  const [p] = S.fromGym([{ id: 'w1', status: 'done', date: today, start: at(today, '15:00'), end: at(today, '17:00'), name: 'Pierna', rid: 'r1' }]);
  assert.equal(p.id, 'gym:w1'); assert.equal(p.kind, 'shift'); assert.equal(p.a, '15:00'); assert.equal(p.b, '17:00'); assert.equal(p.title, 'Pierna'); assert.equal(p.key, 'gym:r:r1');
});

test('Entrenamiento: en curso no se propone; deporte da nombre y clave; pasada la medianoche acaba a las 23:59', () => {
  const l = S.fromGym([
    { id: 'live', status: 'live', date: today, start: at(today, '10:00') },
    { id: 'w2', status: 'done', date: today, start: at(today, '22:30'), end: at('2026-11-14', '00:30'), sp: 'football', name: 'x' },
  ], { sportName: sp => sp === 'football' ? 'Fútbol' : sp });
  assert.equal(l.length, 1); assert.equal(l[0].title, 'Fútbol'); assert.equal(l[0].key, 'gym:sp:football'); assert.equal(l[0].b, '23:59');
});

test('Libreta: solo lo apuntado a mano; hora si se apuntó ese día, si no del día entero', () => {
  const l = S.fromLedger([
    { id: 'e1', date: today, createdAt: at(today, '13:10'), categoryId: 'food' },
    { id: 'e2', date: '2026-11-10', createdAt: at(today, '09:00'), categoryId: 'food' },
    { id: 'e3', date: today, createdAt: at(today, '13:10'), recurringId: 'r' },
    { id: 'e4', date: today, createdAt: at(today, '13:10'), importId: 'i' },
  ]);
  assert.deepEqual(l.map(p => p.id), ['led:e1', 'led:e2']);
  assert.equal(l[0].a, '13:10'); assert.equal(l[0].b, '13:40'); assert.equal(l[1].a, ''); assert.equal(l[0].key, 'led:food');
});

test('Pendientes: fuera lo hecho, lo ya colocado, lo anterior a sgFrom y lo futuro', () => {
  const items = [
    { id: 'gym:a', date: today, a: '10:00', b: '11:00', kind: 'shift', key: 'k' },
    { id: 'gym:b', date: today, a: '12:00', b: '13:00', kind: 'shift', key: 'k' },
    { id: 'led:c', date: today, a: '', b: '', kind: 'note', key: 'n' },
    { id: 'led:d', date: '2026-11-01', a: '', b: '', kind: 'note', key: 'n' },
    { id: 'led:e', date: '2026-11-20', a: '', b: '', kind: 'note', key: 'n' },
  ];
  const r = S.pending({ items, today, sgFrom: '2026-11-06', done: { 'gym:a': today }, days: {}, gaps: { [today]: [{ a: '', b: '', t: 'x', src: 'led:c' }] } }, '2026-11-01', '2026-11-30');
  assert.deepEqual(r.map(p => p.id), ['gym:b']);
});

test('Vínculos: se recuerdan, se ignoran si el turno ya no existe y un turno ya puesto ese día cuenta como hecho', () => {
  const p = { id: 'gym:a', date: today, a: '10:00', b: '11:00', kind: 'shift', key: 'gym:r:r1' };
  const link = S.remember({}, p.key, { t: 's', id: 's_gym' });
  let r = S.pending({ items: [p], today, link, shiftIds: ['s_gym'] }, today, today);
  assert.deepEqual(r[0].link, { t: 's', id: 's_gym' }); assert.deepEqual(S.target(r[0]), { t: 's', id: 's_gym' });
  r = S.pending({ items: [p], today, link, shiftIds: [] }, today, today);
  assert.equal(r[0].link, null); assert.deepEqual(S.target(r[0]), { t: 'o' });
  r = S.pending({ items: [p], today, link, shiftIds: ['s_gym'], days: { [today]: [{ sid: 's_gym' }] } }, today, today);
  assert.equal(r.length, 0);
});

test('markDone olvida lo muy antiguo', () => {
  const d = S.markDone({ old: '2025-01-01', ok: '2026-11-01' }, { id: 'n', date: today }, today);
  assert.deepEqual(d, { ok: '2026-11-01', n: today });
});
