const test = require('node:test');
const assert = require('node:assert');
const B = require('../js/bankcsv.js');

const HEAD = 'Action,Time (UTC),ISIN,Ticker,Name,Notes,ID,No. of shares,Price / share,Currency (Price / share),Exchange rate,Total,Currency (Total),Withholding tax,Currency (Withholding tax),Merchant name,Merchant category';
const CSV = [HEAD,
  'Spending cashback,2026-10-01 12:01:32+00:00,,,,,c1,,,,,0.35,"EUR",,,,',
  'Interest on cash,2026-10-01 12:07:31+00:00,,,,"Interest on cash",i1,,,,,0.12,"EUR",,,,',
  'Interest on cash,2026-10-01 12:07:31+00:00,,,,"Interest on cash",i2,,,,,0.05,"GBP",,,,',
  'Interest on cash,2026-10-02 12:07:31+00:00,,,,"Interest on cash",i3,,,,,0.11,"EUR",,,,',
  'Dividend (Dividend),2026-10-01 11:35:12+00:00,US67066G1040,NVDA,"Nvidia",,,0.1041619600,0.175000,USD,0.88350100,0.02,"EUR",0.01,USD,,',
  'Deposit,2026-10-01 14:15:49+00:00,,,,"Bank Transfer",d1,,,,,50.00,"EUR",,,,',
  'Withdrawal,2026-10-08 14:15:49+00:00,,,,"Sent to Bank, account",w1,,,,,-10.00,"EUR",,,,',
  'Card debit,2026-10-01 18:55:13+00:00,,,,,k1,,,,,-12.78,"EUR",,,"HD TRIANA","RETAIL_STORES"',
  'Card debit,2026-10-06 18:55:13+00:00,,,,,k2,,,,,-225.99,"EUR",,,"HiperDino","RETAIL_STORES"',
  'Card credit,2026-10-08 18:55:13+00:00,,,,,k3,,,,,18.78,"EUR",,,"HiperDino","RETAIL_STORES"',
  'Market buy,2026-10-12 10:00:00+00:00,NL0010273215,ASML,"ASML",,b1,0.001,1000,EUR,1,1.34,"EUR",,,,',
  'Stock split,2026-10-13 10:00:00+00:00,,,,,s1,,,,,0.00,"EUR",,,,'
].join('\r\n') + '\r\n';

test('parseCsv: comillas, comas dentro y CRLF', () => {
  const r = B.parseCsv('﻿a,b\r\n"x, y","say ""hi"""\n');
  assert.deepStrictEqual(r, [['a', 'b'], ['x, y', 'say "hi"']]);
});

test('detect: reconoce Trading 212 y rechaza otros', () => {
  assert.strictEqual(B.detect(HEAD.split(',')), 't212');
  assert.strictEqual(B.read('Fecha,Concepto,Importe\n2026-01-01,Pan,-1').format, null);
});

test('read: depósitos y retiradas se leen (se preguntan) y los céntimos van en positivo con su signo', () => {
  const r = B.read(CSV);
  assert.strictEqual(r.format, 't212');
  assert.strictEqual(r.rows.length, 12);
  const w = r.rows.find(x => x.key === 'w1');
  assert.strictEqual(w.kind, 'withdrawal'); assert.strictEqual(w.sign, -1); assert.strictEqual(w.cents, 1000);
  const k1 = r.rows.find(x => x.key === 'k1');
  assert.strictEqual(k1.cents, 1278); assert.strictEqual(k1.sign, -1); assert.strictEqual(k1.kind, 'card'); assert.strictEqual(k1.merchant, 'HD TRIANA');
  const div = r.rows.find(x => x.kind === 'dividend');
  assert.ok(div.key.startsWith('x|')); assert.strictEqual(div.name, 'Nvidia');
  assert.strictEqual(r.rows.find(x => x.key === 's1').kind, 'other');
});

test('questions: un grupo por tipo y por categoría de comercio; monedas distintas del euro', () => {
  const r = B.read(CSV), q = B.questions(r.rows);
  const ids = q.map(g => g.id).sort();
  assert.deepStrictEqual(ids, ['buy', 'card:RETAIL_STORES', 'cardCredit', 'cashback', 'deposit', 'dividend', 'interest', 'other:Stock split', 'withdrawal']);
  const card = q.find(g => g.id === 'card:RETAIL_STORES');
  assert.strictEqual(card.count, 2); assert.strictEqual(card.cents, 23877); assert.deepStrictEqual(card.sample, ['HD TRIANA', 'HiperDino']);
  assert.deepStrictEqual(B.currencies(r.rows), { GBP: 1 });
});

test('plan: sin respuesta no se importa; ignorar; agrupar por mes; convertir moneda', () => {
  const r = B.read(CSV);
  const answers = {
    'card:RETAIL_STORES': { type: 'expense', categoryId: 'food', group: 'none' },
    cardCredit: { type: 'income', categoryId: 'other', group: 'none' },
    interest: { type: 'income', categoryId: 'extra', group: 'month' },
    cashback: { type: 'skip' },
    dividend: { type: 'income', categoryId: 'extra', group: 'none' }
  };
  const p = B.plan(r.rows, answers, { GBP: 1.2 }, []);
  assert.strictEqual(p.unanswered, 4); // compra, «Stock split», depósito y retirada sin responder
  assert.strictEqual(p.skipped, 1);
  const g = p.create.find(e => e.extGroup && !e.fx), gb = p.create.find(e => e.extGroup && e.fx);
  assert.strictEqual(g.amountCents, 12 + 11); assert.strictEqual(g.count, 2); assert.strictEqual(g.date, '2026-10-02');
  // v1.22: lo que va en libras queda en libras con su cambio (0,05 GBP × 1,2 = 0,06 €)
  assert.deepStrictEqual(gb.fx, { cur: 'GBP', cents: 5, rate: 1.2 }); assert.strictEqual(gb.amountCents, 6);
  assert.strictEqual(p.create.filter(e => e.type === 'expense').length, 2);
  assert.ok(p.create.every(e => e.amountCents > 0));
});

test('plan: sin tasa, la otra moneda se ignora; reimportar no duplica y amplía el grupo', () => {
  const r = B.read(CSV);
  const answers = { interest: { type: 'income', categoryId: 'extra', group: 'month' }, 'card:RETAIL_STORES': { type: 'expense', categoryId: 'food', group: 'none' } };
  const first = B.plan(r.rows.filter(x => x.key !== 'i3'), answers, {}, []);
  const g = first.create.find(e => e.extGroup);
  assert.strictEqual(g.amountCents, 12);
  const existing = first.create.map((e, i) => ({ ...e, id: 'e' + i }));
  const second = B.plan(r.rows, answers, {}, existing);
  assert.strictEqual(second.create.length, 0);
  assert.deepStrictEqual(second.update, [{ id: existing.find(e => e.extGroup).id, addCents: 11, addIds: ['i3'], addFx: 0 }]);
  assert.strictEqual(second.dup, 3);
});

test('plan: un depósito se puede ignorar o apuntar como ingreso', () => {
  const r = B.read(CSV);
  const p1 = B.plan(r.rows, { deposit: { type: 'skip' }, withdrawal: { type: 'skip' } }, {}, []);
  assert.strictEqual(p1.skipped, 2); assert.strictEqual(p1.create.length, 0);
  const p2 = B.plan(r.rows, { deposit: { type: 'income', categoryId: 'salary', group: 'none' } }, {}, []);
  assert.deepStrictEqual(p2.create.map(e => [e.type, e.amountCents, e.categoryId]), [['income', 5000, 'salary']]);
});
