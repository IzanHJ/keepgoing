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
  // Saldos al final del 30/09: el ingreso de ese día ya va incluido y no se vuelve a sumar
  const { base, rows } = W.series({ date: '2026-09-30', digital: 500000, cash: 10000, invested: 20000 }, E, '2026-10-04');
  assert.equal(base.set, true);
  assert.equal(rows.length, 5);
  assert.equal(rows[0].patrimony, 530000);
  const last = rows[4];
  assert.deepEqual([last.digital, last.cash, last.invested], [500000 + 120000 - 30000 - 5000, 10000 - 2000, 50000]);
  assert.equal(last.patrimony, 530000 + 120000 - 7000);
  assert.deepEqual([last.income, last.expenses, last.inv.etf], [120000, 7000, 30000]);
  assert.equal(rows[2].patrimony, rows[3].patrimony + 5000); // el día 3 solo resta el gasto
});

test('lo apuntado el mismo día del punto de partida ya va incluido', () => {
  const { base, rows } = W.series({ date: '2026-10-03', digital: 100000 }, E, '2026-10-03');
  const last = rows[rows.length - 1];
  assert.equal(last.key, '2026-10-03');
  assert.equal(last.patrimony, 100000);
  // v1.23.5: lo de antes del punto de partida se calcula hacia atrás (desde el día antes del primer movimiento)
  assert.deepEqual(rows.map(r => r.key), ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03']);
  assert.deepEqual(rows.map(r => r.patrimony), [100000 + 5000 + 2000 - 120000 - 99999, 100000 + 5000 + 2000 - 120000, 107000, 105000, 100000]);
  assert.equal(rows[3].digital, 100000 + 30000 + 5000);
  assert.equal(rows[3].invested, -30000);
  assert.equal(rows[0].income, 0);
  assert.equal(last.income, 219999);
  assert.deepEqual([base.at.income, base.at.expenses], [219999, 7000]);
});

test('sin punto de partida: desde el primer movimiento y a 0', () => {
  const { base, rows } = W.series(null, E, '2026-10-01');
  assert.deepEqual(base, { date: '2026-09-30', digital: 0, cash: 0, invested: 0, invBy: {}, curs: {}, other: 0, at: { income: 0, expenses: 0, cur: {} }, set: false });
  assert.equal(rows[1].patrimony, 99999 + 120000);
});

test('ritmo de los últimos 3 meses y filas por mes', () => {
  const p = W.pace(E, '2026-11-15', 3);
  assert.equal(p.income, Math.round((99999 + 120000) / 3));
  assert.equal(p.invest, 10000);
  const { rows } = W.series({ date: '2026-09-29' }, E, '2026-10-02');
  assert.deepEqual(W.periods(rows).map(r => r.key), ['2026-09-30', '2026-10-02']);
});

test('rentabilidad anual estimada con fechas', () => {
  // 2.000 € hace un año que hoy valen 2.400 € → 20 %
  assert.equal(W.annualRate([{ date: '2025-10-24', amount: 2000 }], 2400, '2026-10-24'), 20);
  // dos aportaciones: 1.000 hace un año y 1.000 hace medio año, valen 2.150
  const r = W.annualRate([{ date: '2025-10-24', amount: 1000 }, { date: '2026-04-24', amount: 1000 }], 2150, '2026-10-24');
  assert.ok(r > 9 && r < 11, String(r));
  assert.equal(W.annualRate([{ date: '2026-10-24', amount: 1000 }], 1100, '2026-10-24'), null); // sin tiempo
  assert.equal(W.annualRate([], 1000, '2026-10-24'), null);
  assert.ok(W.annualRate([{ date: '2025-10-24', amount: 2000 }], 1800, '2026-10-24') < 0); // pérdidas
});

test('valor de las inversiones: la ganancia se suma desde su fecha', () => {
  const base = { date: '2026-09-30', digital: 100000, invBy: { etf: 200000 } };
  const { rows } = W.series(base, E, '2026-10-04', [{ cat: 'etf', date: '2026-10-02', value: 240000 }]);
  assert.equal(rows[1].gains, 0); // 01/10: aún sin valor
  assert.equal(rows[2].gains, 40000); // 02/10: vale 2.400 con 2.000 depositados
  assert.equal(rows[4].invVal.etf, 240000 + 30000); // el 03/10 se aportaron 300 más
  assert.equal(rows[4].patrimony - rows[4].digital - rows[4].cash, 270000);
  // punto de partida antiguo sin reparto → va a «invest»
  assert.deepEqual(W.baseOf({ date: '2026-09-30', invested: 5000 }, [], '2026-10-01').invBy, { invest: 5000 });
});

test('una inversión: depositado, valor y rentabilidad', () => {
  const base = { date: '2026-10-24', digital: 0, invBy: { etf: 200000 } };
  const s = W.invStats('etf', base, [], [{ cat: 'etf', date: '2026-10-24', value: 240000 }], '2026-10-24', '2025-10-24');
  assert.deepEqual([s.deposited, s.value, s.gain, s.unrecorded], [200000, 240000, 40000, 200000]);
  assert.equal(s.rate, 20);
  const s2 = W.invStats('etf', base, [], [], '2026-10-24');
  assert.equal(s2.rate, null);
});

test('v1.23.4: vinculados — el saldo usa lo real y los gastos el neto', () => {
  const L = require('../js/ledger.js');
  const es = [
    { id: 'a', date: '2026-10-02', type: 'expense', amountCents: 5000, link: 'g' },
    { id: 'b', date: '2026-10-03', type: 'income', amountCents: 4000, link: 'g' }
  ];
  const { rows } = W.series({ date: '2026-10-01', digital: 100000 }, L.netLinked(es), '2026-10-03');
  assert.equal(rows[1].digital, 95000);
  assert.equal(rows[2].digital, 99000);
  assert.equal(rows[2].expenses, 1000);
  assert.equal(rows[2].income, 0);
});

test('v1.23.4: saldos reales en otras monedas', () => {
  const saved = { date: '2026-10-01', digital: 100000, cash: 0, curs: { USD: { digital: 50000, cash: 2000 }, GBP: { digital: 10000, off: true } } };
  const es = [
    { date: '2026-10-02', type: 'expense', amountCents: 920, fx: { cur: 'USD', cents: 1000, rate: 0.92 } },
    { date: '2026-10-02', type: 'income', amountCents: 1150, method: 'cash', fx: { cur: 'GBP', cents: 1000, rate: 1.15 } },
    { date: '2026-10-03', type: 'expense', amountCents: 500, fx: { cur: 'JPY', cents: 80000, rate: 0.00625 } }
  ];
  const { base, rows } = W.series(saved, es, '2026-10-03', [], { USD: 0.9, GBP: 1.2 });
  assert.equal(base.other, Math.round(52000 * 0.9));
  const r = rows[2];
  assert.deepEqual(r.cur.USD, { digital: 49000, cash: 2000, income: 0, expenses: 1000 });
  assert.deepEqual(r.cur.GBP, { digital: 10000, cash: 1000, income: 1000, expenses: 0 });
  // el JPY no está añadido: sigue restando en la principal; el GBP no se suma al total
  assert.equal(r.digital, 99500);
  assert.equal(r.other, Math.round(51000 * 0.9));
  assert.equal(r.patrimony, 99500 + Math.round(51000 * 0.9));
  // sin cambio conocido, la moneda no suma
  assert.equal(W.series(saved, es, '2026-10-03', [], {}).rows[2].other, 0);
});
