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
  assert.deepEqual(L.totals(es), { income: 140000, expense: 30, net: 139970 });
  assert.deepEqual(L.totals([]), { income: 0, expense: 0, net: 0 });
});

test('agrupado por día y filtro por mes', () => {
  const es = [{ date: '2026-10-16', type: 'expense', amountCents: 500 }, { date: '2026-10-16', type: 'income', amountCents: 2000 }, { date: '2026-11-01', type: 'expense', amountCents: 100 }];
  const d = L.byDay(es);
  assert.deepEqual(d['2026-10-16'], { income: 2000, expense: 500, net: 1500, count: 2 });
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
