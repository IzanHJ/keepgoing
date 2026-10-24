const test = require('node:test');
const assert = require('node:assert/strict');
const W = require('../js/worth.js');

const E = [
  { date: '2026-09-30', type: 'income', amountCents: 99999 },
  { date: '2026-10-01', type: 'income', amountCents: 120000, method: 'transfer' },
  { date: '2026-10-02', type: 'expense', amountCents: 2000, method: 'cash' },
  { date: '2026-10-03', type: 'invest', amountCents: 30000, method: 'transfer', categoryId: 'etf' },
  { date: '2026-10-03', type: 'expense', amountCents: 5000, method: 'card' }
];

test('patrimonio: punto de partida + movimientos; la inversión no cambia el total', () => {
  const { base, rows } = W.series({ date: '2026-10-01', digital: 500000, cash: 10000, invested: 20000 }, E, '2026-10-04');
  assert.equal(base.set, true);
  assert.equal(rows.length, 4);
  const last = rows[3];
  assert.deepEqual([last.digital, last.cash, last.invested], [500000 + 120000 - 30000 - 5000, 10000 - 2000, 50000]);
  assert.equal(last.patrimony, 530000 + 120000 - 7000);
  assert.deepEqual([last.income, last.expenses, last.inv.etf], [120000, 7000, 30000]);
  assert.equal(rows[1].patrimony, rows[2].patrimony + 5000); // el día 3 solo resta el gasto
});

test('sin punto de partida: desde el primer movimiento y a 0', () => {
  const { base, rows } = W.series(null, E, '2026-10-01');
  assert.deepEqual(base, { date: '2026-09-30', digital: 0, cash: 0, invested: 0, set: false });
  assert.equal(rows[1].patrimony, 99999 + 120000);
});

test('ritmo de los últimos 3 meses y filas por mes', () => {
  const p = W.pace(E, '2026-11-15', 3);
  assert.equal(p.income, Math.round((99999 + 120000) / 3));
  assert.equal(p.invest, 10000);
  const { rows } = W.series({ date: '2026-09-29' }, E, '2026-10-02');
  assert.deepEqual(W.periods(rows).map(r => r.key), ['2026-09-30', '2026-10-02']);
});
