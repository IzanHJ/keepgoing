const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../js/fx.js');
const R = { USD: 1.08, GBP: 0.84, JPY: 177 };

test('cross: cambios cruzados con base EUR', () => {
  assert.equal(F.cross(R, 'EUR', 'EUR'), 1);
  assert.equal(F.cross(R, 'EUR', 'USD'), 1.08);
  assert.ok(Math.abs(F.cross(R, 'USD', 'EUR') - 1 / 1.08) < 1e-12);
  assert.ok(Math.abs(F.cross(R, 'GBP', 'USD') - 1.08 / 0.84) < 1e-12);
  assert.equal(F.cross(R, 'ARS', 'EUR'), null);
});

test('rateFor: el cambio a mano manda sobre el automático', () => {
  assert.equal(F.rateFor('USD', 'EUR', R, { USD: 0.89 }), 0.89);
  assert.ok(Math.abs(F.rateFor('USD', 'EUR', R, {}) - 1 / 1.08) < 1e-12);
  assert.equal(F.rateFor('ARS', 'EUR', R, { ARS: 0.001 }), 0.001);
  assert.equal(F.rateFor('EUR', 'EUR', R, {}), 1);
});

test('toMain y roundRate', () => {
  assert.equal(F.toMain(1000, 0.89), 890);
  assert.equal(F.roundRate(0.891234), 0.8912);
  assert.equal(F.roundRate(177.3612), 177.4);
  assert.equal(F.roundRate(1.15333), 1.153);
});

test('rebase: cambiar la moneda principal de EUR a USD', () => {
  const es = [{ id: 'a', amountCents: 1000 }, { id: 'b', amountCents: 890, fx: { cur: 'USD', cents: 1000, rate: 0.89 } }, { id: 'c', amountCents: 500, fx: { cur: 'ARS', cents: 50000, rate: 0.01 } }];
  const r = F.rebase(es, 'EUR', 'USD', cur => (cur === 'EUR' ? 1.08 : null));
  assert.deepEqual(r.entries[0], { id: 'a', amountCents: 1080, fx: { cur: 'EUR', cents: 1000, rate: 1.08 } });
  assert.deepEqual(r.entries[1], { id: 'b', amountCents: 1000 });
  assert.equal(r.missing, 1); assert.equal(r.entries[2], es[2]);
});

test('convertItems: piezas de la calculadora en otra moneda', () => {
  const items = [{ kind: 'start', cur: 'USD', digital: 100, cash: 0, salary: 2000, expenses: 1000 }, { kind: 'fund', cur: 'USD', amount: 50 }, { kind: 'applied', type: 'periodic', cur: 'USD', values: { amount: 10, futureChanges: [{ at: 2, amount: 20 }] } }, { kind: 'fund', amount: 7 }];
  const out = F.convertItems(items, 'EUR', () => 0.9, x => (x.type === 'periodic' ? ['amount'] : []));
  assert.equal(out[0].salary, 1800); assert.equal(out[1].amount, 45); assert.equal(out[2].values.amount, 9); assert.equal(out[2].values.futureChanges[0].amount, 18);
  assert.equal(out[3], items[3]); assert.equal(items[0].salary, 2000);
});
