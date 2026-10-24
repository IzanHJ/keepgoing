// Ejecutar con: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../js/ledger.js');

test('importes escritos a mano → céntimos enteros', () => {
  assert.equal(L.parseCents('12,50'), 1250);
  assert.equal(L.parseCents('12.5'), 1250);
  assert.equal(L.parseCents('12'), 1200);
  assert.equal(L.parseCents('1.234,56'), 123456);
  assert.equal(L.parseCents('1,234.56'), 123456);
  assert.equal(L.parseCents('1.400'), 140000);
  assert.equal(L.parseCents('0,1'), 10);
  assert.equal(L.parseCents('7 €'), 700);
  assert.equal(L.parseCents('-5'), null);
  assert.equal(L.parseCents('abc'), null);
  assert.equal(L.parseCents(''), null);
});

test('totales sin errores de redondeo', () => {
  const es = [{ type: 'expense', amountCents: 10 }, { type: 'expense', amountCents: 20 }, { type: 'income', amountCents: 140000 }];
  assert.deepEqual(L.totals(es), { income: 140000, expense: 30, invest: 0, net: 139970 });
  assert.deepEqual(L.totals([]), { income: 0, expense: 0, invest: 0, net: 0 });
});

test('agrupado por día y filtro por mes', () => {
  const es = [{ date: '2026-10-16', type: 'expense', amountCents: 500 }, { date: '2026-10-16', type: 'income', amountCents: 2000 }, { date: '2026-11-01', type: 'expense', amountCents: 100 }];
  const d = L.byDay(es);
  assert.deepEqual(d['2026-10-16'], { income: 2000, expense: 500, invest: 0, net: 1500, count: 2 });
  assert.equal(L.inMonth(es, 2026, 10).length, 2);
  assert.equal(L.inMonth(es, 2026, 11).length, 1);
});

test('rejilla del mes empieza en lunes', () => {
  const g = L.monthGrid(2026, 10); // 1 de octubre de 2026 es jueves
  assert.equal(g[0][3], '2026-10-01');
  assert.equal(g[0][0], null);
  assert.ok(g.every(w => w.length === 7));
  assert.equal(g.flat().filter(Boolean).length, 31);
  assert.equal(L.monthGrid(2028, 2).flat().filter(Boolean).length, 29); // bisiesto
});

test('repeticiones mensuales ajustan el día 31 al último del mes', () => {
  const r = { every: 'monthly', from: '2026-01-31' };
  assert.deepEqual(L.occurrences(r, '2026-01-01', '2026-04-30'), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
});

test('repeticiones semanales, anuales y con fin', () => {
  assert.deepEqual(L.occurrences({ every: 'weekly', from: '2026-10-01' }, '2026-10-05', '2026-10-22'), ['2026-10-08', '2026-10-15', '2026-10-22']);
  assert.deepEqual(L.occurrences({ every: 'yearly', from: '2024-02-29' }, '2024-01-01', '2026-12-31'), ['2024-02-29', '2025-02-28', '2026-02-28']);
  assert.deepEqual(L.occurrences({ every: 'monthly', from: '2026-01-10', to: '2026-02-10' }, '2026-01-01', '2026-12-31'), ['2026-01-10', '2026-02-10']);
  assert.deepEqual(L.occurrences({ every: 'nunca', from: '2026-01-10' }, '2026-01-01', '2026-12-31'), []);
});

test('modo privacidad oculta el texto', () => {
  assert.equal(L.mask('12,50 €', true), '•••••');
  assert.equal(L.mask('12,50 €', false), '12,50 €');
  assert.equal(L.recEntryId('rent', '2026-10-01'), 'rec-rent-2026-10-01');
});

test('gráficas: suma por categoría, franja de fechas y series por mes/año/día', () => {
  const E = [
    { date: '2026-01-15', type: 'expense', amountCents: 1000, categoryId: 'food' },
    { date: '2026-01-20', type: 'expense', amountCents: 500, categoryId: 'transport' },
    { date: '2026-03-02', type: 'expense', amountCents: 2500, categoryId: 'food' },
    { date: '2026-03-31', type: 'income', amountCents: 140000, categoryId: 'salary' },
    { date: '2025-12-31', type: 'income', amountCents: 2000, categoryId: 'gift' }
  ];
  assert.deepEqual(L.span(E), { from: '2025-12-31', to: '2026-03-31' });
  assert.equal(L.span([]), null);
  assert.deepEqual(L.byCategory(E, 'expense'), [{ id: 'food', cents: 3500 }, { id: 'transport', cents: 500 }]);
  assert.deepEqual(L.byCategory(E, 'income').map(c => c.id), ['salary', 'gift']);
  assert.equal(L.inRange(E, '2026-01-01', '2026-01-31').length, 2);
  // comida entre enero y marzo
  const food = L.inRange(E, '2026-01-01', '2026-03-31').filter(e => e.categoryId === 'food');
  assert.deepEqual(L.totals(food), { income: 0, expense: 3500, invest: 0, net: -3500 });
  const m = L.series(E, '2025-12-01', '2026-03-31', 'month');
  assert.deepEqual(m.map(r => r.key), ['2025-12', '2026-01', '2026-02', '2026-03']);
  assert.deepEqual(m.map(r => [r.income, r.expense]), [[2000, 0], [0, 1500], [0, 0], [140000, 2500]]);
  assert.deepEqual(L.series(E, '2025-01-01', '2026-12-31', 'year').map(r => [r.key, r.income, r.expense]), [['2025', 2000, 0], ['2026', 140000, 4000]]);
  const d = L.series(E, '2026-01-14', '2026-01-16', 'day');
  assert.deepEqual(d.map(r => [r.key, r.expense]), [['2026-01-14', 0], ['2026-01-15', 1000], ['2026-01-16', 0]]);
});

test('presupuestos: cada mes usa la versión vigente y la diferencia se acumula desde la fecha elegida', () => {
  const b = { id: 'g', catIds: [], versions: [{ from: '2024-01', amountCents: 50000 }, { from: '2026-01', amountCents: 80000 }] };
  const e = (date, c, type = 'expense', categoryId = 'food') => ({ date, amountCents: c, type, categoryId });
  const entries = [e('2025-12-10', 60000), e('2026-01-05', 30000), e('2026-01-20', 20000), e('2026-02-01', 90000), e('2026-02-02', 99999, 'income')];
  const rows = L.budgetRows(b, entries, '2025-12', '2026-03');
  assert.deepEqual(rows.map(r => [r.ym, r.budget, r.spent, r.diff, r.acc]), [
    ['2025-12', 50000, 60000, -10000, -10000],
    ['2026-01', 80000, 50000, 30000, 20000],
    ['2026-02', 80000, 90000, -10000, 10000],
    ['2026-03', 80000, 0, 80000, 90000]
  ]);
  // Solo algunas categorías; antes de la primera versión no hay presupuesto
  const food = L.budgetRows({ catIds: ['home'], versions: [{ from: '2026-01', amountCents: 1000 }] }, [...entries, e('2026-01-09', 400, 'expense', 'home')], '2025-11', '2026-01');
  assert.deepEqual(food.map(r => [r.ym, r.spent, r.acc]), [['2026-01', 400, 600]]);
  assert.equal(L.budgetFirst(b), '2024-01');
});

test('v1.23: una inversión no suma ni resta', () => {
  const es = [{ type: 'income', amountCents: 1000, date: '2026-10-01' }, { type: 'invest', amountCents: 400, date: '2026-10-01' }, { type: 'expense', amountCents: 100, date: '2026-10-02' }];
  assert.deepEqual(L.totals(es), { income: 1000, expense: 100, invest: 400, net: 900 });
  assert.equal(L.signed(es[1]), 0);
  assert.deepEqual(L.byDay(es)['2026-10-01'], { income: 1000, expense: 0, invest: 400, net: 1000, count: 2 });
  assert.deepEqual(L.series(es, '2026-10-01', '2026-10-31', 'month').map(r => [r.income, r.expense, r.invest]), [[1000, 100, 400]]);
});

test('v1.23.4: movimientos vinculados cuentan solo la diferencia', () => {
  const all = [
    { id: 'a', date: '2026-10-01', type: 'expense', amountCents: 5000, categoryId: 'leisure', link: 'g1', createdAt: 1 },
    { id: 'b', date: '2026-10-03', type: 'income', amountCents: 2000, categoryId: 'gift', link: 'g1', createdAt: 2 },
    { id: 'c', date: '2026-10-04', type: 'income', amountCents: 2000, categoryId: 'gift', link: 'g1', createdAt: 3 },
    { id: 'd', date: '2026-10-02', type: 'expense', amountCents: 700, categoryId: 'food' },
    { id: 'e', date: '2026-10-05', type: 'expense', amountCents: 900, link: 'solo' }
  ];
  const n = L.netLinked(all);
  assert.equal(n.length, all.length);
  assert.deepEqual(L.totals(n), { income: 0, expense: 1000 + 700 + 900, invest: 0, net: -2600 });
  assert.deepEqual(L.byCategory(n, 'expense'), [{ id: 'leisure', cents: 1000 }, { id: 'other', cents: 900 }, { id: 'food', cents: 700 }]);
  assert.deepEqual(L.byCategory(n, 'income'), []);
  // un día que solo tiene la devolución no la cuenta, pero sigue contando como movimiento
  const day = L.byDay(L.netLinked(all.filter(e => e.date === '2026-10-03'), all))['2026-10-03'];
  assert.equal(day.income, 0); assert.equal(day.count, 1);
  // los originales no cambian y la copia guarda el importe real
  assert.equal(all[0].amountCents, 5000); assert.equal(n[0]._rc, 5000); assert.equal(n[0]._lk, 'main'); assert.equal(n[1]._lk, 'sub');
  // si la devolución es mayor, queda como ingreso en la categoría del más grande
  const flip = L.netLinked([{ id: 'x', date: '2026-10-01', type: 'expense', amountCents: 3000, link: 'g' }, { id: 'y', date: '2026-10-02', type: 'income', amountCents: 5000, categoryId: 'gift', link: 'g' }]);
  assert.deepEqual([flip[1].type, flip[1].amountCents, flip[0].amountCents], ['income', 2000, 0]);
  const info = L.linkInfo(all, 'g1');
  assert.equal(info.net, -1000); assert.equal(info.main.id, 'a'); assert.equal(info.members.length, 3);
  const plain = all.slice(3, 4); assert.equal(L.netLinked(plain), plain);
});
