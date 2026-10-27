const test = require('node:test');
const assert = require('node:assert');
const D = require('../js/debts.js');

const exp = { id: 'g1', type: 'expense', date: '2026-10-20', amountCents: 6000, owed: { on: true, parts: [
  { id: 'a', who: { name: 'Ana' }, mode: 'fixed', v: 2000 }, { id: 'b', who: { tag: '@juan' }, mode: 'pct', v: 25 }, { id: 'c', who: { c: 'k1' }, mode: 'fixed', v: 1500 }] } };

test('Pendiente de Aportación: Deuda, resuelto y Comisiones', () => {
  const all = [exp,
    { id: 'i1', type: 'income', date: '2026-10-21', amountCents: 1000, pay: { e: 'g1', p: 'a' } },
    { id: 'i2', type: 'income', date: '2026-10-21', amountCents: 1500, pay: { e: 'g1', p: 'b' } },
    { id: 'i3', type: 'income', date: '2026-10-22', amountCents: 1800, pay: { e: 'g1', p: 'c' } }];
  const L = D.list(all), by = Object.fromEntries(L.map(d => [d.pid, d]));
  assert.deepEqual([by.a.left, by.a.status], [1000, 'open']);           // pagó 10 de 20 → Deuda 10
  assert.deepEqual([by.b.expected, by.b.left, by.b.status], [1500, 0, 'done']); // 25 % de 60 = 15, exacto
  assert.deepEqual([by.c.left, by.c.extra, by.c.status], [0, 300, 'done']); // 3 € de Comisiones
  assert.deepEqual(D.totals(L), { favor: 1000, contra: 0, extra: 300 });
});

test('Sin pagos todo es Deuda y la base descuenta los vinculados', () => {
  const all = [{ ...exp, link: 'L1' }, { id: 'r', type: 'income', date: '2026-10-20', amountCents: 2000, link: 'L1' }];
  const b = D.list(all).find(d => d.pid === 'b');
  assert.equal(b.expected, 1000); // 25 % de (60 − 20)
  assert.equal(b.left, 1000);
});

test('Pendiente de devolver: no cuenta hasta resolverse', () => {
  const due = { id: 'd1', type: 'expense', date: '2026-10-20', amountCents: 3000, due: { on: true, who: { name: 'Pepe' }, paid: null } };
  const z = D.zeroDue([due, { id: 'x', type: 'expense', amountCents: 500 }]);
  assert.equal(z[0].amountCents, 0); assert.equal(z[1].amountCents, 500);
  assert.deepEqual(D.totals(D.list([due])), { favor: 0, contra: 3000, extra: 0 });
  const paid = { ...due, due: { ...due.due, paid: '2026-10-25' } };
  assert.equal(D.zeroDue([paid])[0].amountCents, 3000);
  assert.equal(D.list([paid])[0].status, 'done');
});

test('Por persona', () => {
  const P = D.byPerson(D.list([exp]));
  assert.equal(P.length, 3);
  assert.equal(P.find(p => p.key === 't:juan').favor, 1500);
});
