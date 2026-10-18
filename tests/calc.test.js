// Ejecutar con: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/calc.js');

const TODAY = '2026-10-18';
let n = 0;
const newId = () => 'id' + (++n);
const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const model = (start = {}, extra = []) => C.fromItems([{ ...C.defaultStart(TODAY), ...start }, ...extra], TODAY);
const inv = (id, rate, accumulative = true, ord = 1) => ({ id, kind: 'inv', name: id, rate, accumulative, ord });
const ap = (id, type, values, ord = 10) => ({ id, kind: 'applied', type, name: type, values, ord });

test('números escritos a mano', () => {
  assert.equal(C.parseNum('3,5'), 3.5);
  assert.equal(C.parseNum('3.5'), 3.5);
  assert.equal(C.parseNum('-2'), -2);
  assert.equal(C.parseNum('1.234,5'), 1234.5);
  assert.equal(C.parseNum('7 %'), 7);
  assert.ok(Number.isNaN(C.parseNum('')));
  assert.ok(Number.isNaN(C.parseNum('abc')));
});

test('periodos: «Año 3» empieza en el mes 25 y «Más detalles» corta por años más el final', () => {
  assert.equal(C.scheduleMonth(3, 'years'), 25);
  assert.equal(C.scheduleMonth(3, 'months'), 3);
  assert.deepEqual(C.periods(12), [12]);
  assert.deepEqual(C.periods(30), [12, 24, 30]);
  assert.deepEqual(C.periods(5), [5]);
  assert.equal(C.dateAtMonth(new Date(2026, 0, 31), 1).getDate(), 28);
});

test('sin fórmulas: nómina menos gastos cada mes, y recalcular no duplica nada', () => {
  const m = model({ digital: 1000, cash: 200, salary: 1500, expenses: 1000, horizon: 12 });
  const a = C.compute(m), b = C.compute(m);
  assert.equal(a.final, 1000 + 200 + 12 * 500);
  assert.equal(a.totalIncome, 18000);
  assert.equal(a.totalExpenses, 12000);
  assert.equal(a.final, b.final);
  assert.equal(a.monthly.length, 13);
  close(a.pct, 6000 / 1200 * 100);
});

test('movimiento puntual: se aplica una sola vez en su periodo (mes o año)', () => {
  const m = model({ digital: 0, horizon: 3, unit: 'years' }, [
    ap('g', 'movement', { kind: 'expense', amount: 300, at: 2, unit: 'months' }),
    ap('i', 'movement', { kind: 'income', amount: 1000, at: 2, unit: 'years' })
  ]);
  const r = C.compute(m);
  assert.equal(r.final, 700);
  assert.equal(r.totalIncome, 1000);
  assert.equal(r.totalExpenses, 300);
  assert.equal(r.monthly[1].patrimony, 0);
  assert.equal(r.monthly[2].patrimony, -300);
  assert.equal(r.monthly[12].patrimony, -300);
  assert.equal(r.monthly[13].patrimony, 700); // año 2 = mes 13
  assert.equal(r.outputs.g, 300);
  assert.equal(r.outputs.i, 1000);
});

test('cambio de nómina desde un mes', () => {
  const r = C.compute(model({ salary: 1000, horizon: 6 }, [ap('s', 'salaryChange', { newSalary: 2000, at: 4, unit: 'months' })]));
  assert.equal(r.totalIncome, 3 * 1000 + 3 * 2000);
});

test('inversión periódica con cambios futuros y destino acumulativo', () => {
  const m = model({ digital: 10000, horizon: 4 }, [inv('f', 0),
    ap('p', 'periodic', { target: 'f', amount: 100, frequency: 'monthly', timing: 'begin', futureChanges: [{ at: 3, unit: 'months', amount: 250 }] })]);
  const r = C.compute(m);
  assert.equal(r.perInvestment[0].principal, 100 + 100 + 250 + 250);
  assert.equal(r.digital, 10000 - 700);
  assert.equal(r.final, 10000); // al 0 %, mover dinero no crea ni destruye patrimonio
});

test('rendimientos: acumulativo crece; no acumulativo abona a Digital', () => {
  const acc = C.compute(model({ horizon: 12 }, [inv('a', 12), { id: 'fa', kind: 'fund', name: 'A', amount: 1000, target: 'a' }]));
  close(acc.perInvestment[0].value, 1120, 1e-6);
  const non = C.compute(model({ horizon: 12 }, [inv('b', 12, false), { id: 'fb', kind: 'fund', name: 'B', amount: 1000, target: 'b' }]));
  close(non.perInvestment[0].value, 1000);
  close(non.digital, 12 * 1000 * (Math.pow(1.12, 1 / 12) - 1));
});

test('aportación a fin de periodo empieza a rendir el mes siguiente', () => {
  const begin = C.compute(model({ digital: 100, horizon: 1 }, [inv('f', 12), ap('p', 'periodic', { target: 'f', amount: 100, frequency: 'monthly', timing: 'begin' })]));
  const end = C.compute(model({ digital: 100, horizon: 1 }, [inv('f', 12), ap('p', 'periodic', { target: 'f', amount: 100, frequency: 'monthly', timing: 'end' })]));
  assert.ok(begin.perInvestment[0].value > 100);
  assert.equal(end.perInvestment[0].value, 100);
});

test('cashback: respeta el techo de gastos mensuales, no descuenta el gasto otra vez y reparte la inversión', () => {
  const m = model({ salary: 0, expenses: 500, horizon: 2 }, [inv('f', 0),
    ap('c', 'cashback', { spend: 2000, rate: 10, excluded: 100, delay: 0, target: 'f', percent: 50 })]);
  const r = C.compute(m);
  // elegible = min(500, 2000) − 100 = 400 → 40 €/mes
  assert.equal(r.cashGenerated, 80);
  assert.equal(r.cashReceived, 80);
  assert.equal(r.perInvestment[0].principal, 40);
  assert.equal(r.totalExpenses, 1000);
  assert.equal(r.final, -1000 + 80);
  // con demora de 45 días, lo del último mes queda pendiente
  const d = C.compute(model({ expenses: 500, horizon: 2 }, [ap('c', 'cashback', { spend: 500, rate: 10, excluded: 0, delay: 45, target: 'none', percent: 100 })]));
  assert.equal(d.cashReceived, 0);
  assert.equal(d.pending, 100);
});

test('dos cashback con destinos distintos no se mezclan', () => {
  const r = C.compute(model({ expenses: 1000, horizon: 1 }, [inv('a', 0), inv('b', 0, true, 2),
    ap('c1', 'cashback', { spend: 1000, rate: 1, excluded: 0, delay: 0, target: 'a', percent: 100 }, 1),
    ap('c2', 'cashback', { spend: 1000, rate: 2, excluded: 0, delay: 0, target: 'b', percent: 100 }, 2)]));
  assert.equal(r.perInvestment.find(x => x.id === 'a').principal, 10);
  assert.equal(r.perInvestment.find(x => x.id === 'b').principal, 20);
});

test('préstamo: devuelve capital más intereses una sola vez (sin intereses duplicados)', () => {
  const r = C.compute(model({ digital: 1000, horizon: 12 }, [inv('f', 0),
    ap('l', 'loan', { principal: 1000, rate: 12, term: 12, unit: 'months', payment: 'monthly', target: 'f' })]));
  assert.equal(r.receivables, 0);
  close(r.perInvestment[0].principal, 1000 + r.outputs.l, 1e-6);
  close(r.final, 1000 + r.outputs.l, 1e-6);
  // amortización francesa a 12 meses al 12 % TAE ≈ 63 € de intereses
  assert.ok(r.outputs.l > 55 && r.outputs.l < 70, String(r.outputs.l));
  const end = C.compute(model({ digital: 1000, horizon: 12 }, [inv('f', 0), ap('l', 'loan', { principal: 1000, rate: 12, term: 1, unit: 'years', payment: 'end', target: 'f' })]));
  close(end.perInvestment[0].principal, 1120, 1e-6);
  close(end.final, 1120, 1e-6);
  // plazo más largo que la proyección: lo pendiente cuenta como patrimonio
  const long = C.compute(model({ digital: 1000, horizon: 6 }, [inv('f', 0), ap('l', 'loan', { principal: 1000, rate: 0, term: 12, unit: 'months', payment: 'end', target: 'f' })]));
  assert.equal(long.receivables, 1000);
  assert.equal(long.final, 1000);
});

test('redondeos y cuenta remunerada', () => {
  const r = C.compute(model({ digital: 0, horizon: 1 }, [inv('f', 0), ap('r', 'roundup', { count: 30, average: 12.1, percent: 50, target: 'f' })]));
  close(r.perInvestment[0].principal, 0.9 * 30 * 0.5);
  const s = C.compute(model({ digital: 1000, horizon: 12 }, [ap('s', 'savings', { rate: 12, type: 'apy', compound: '12', accumulate: 'yes' })]));
  close(s.final, 1120, 1e-6);
  const w = C.compute(model({ digital: 1000, horizon: 12 }, [ap('s', 'savings', { rate: 12, type: 'apy', compound: '12', accumulate: 'no' })]));
  close(w.final, 1000 + 12 * 1000 * (Math.pow(1.12, 1 / 12) - 1), 1e-6);
});

test('trayectoria diaria: empieza en el patrimonio inicial y acaba en el final', () => {
  const r = C.compute(model({ digital: 500, salary: 1000, expenses: 400, horizon: 3 }));
  const d = C.daily(r);
  assert.equal(d[0].date.getTime(), r.startDate.getTime());
  close(d[d.length - 1].patrimony, r.final);
  assert.equal(C.sample(d, 10).length, 10);
  assert.equal(C.sample(d, 10)[9], d[d.length - 1]);
});

test('variables limpias: valores desconocidos o negativos no rompen nada', () => {
  const v = C.cleanValues('periodic', { amount: -5, frequency: 'diaria', futureChanges: [{ at: 0, unit: 'x', amount: '7' }] });
  assert.equal(v.amount, 0);
  assert.equal(v.frequency, 'weekly');
  assert.deepEqual(v.futureChanges, [{ at: 1, unit: 'months', amount: 7 }]);
  assert.equal(C.cleanValues('cashback', {}).target, 'none');
  const m = C.fromItems([{ id: 'x', kind: 'applied', type: 'desconocido', values: {} }], TODAY);
  assert.equal(m.applied.length, 0);
  assert.equal(m.start.date, TODAY);
});

test('un destino con fondos o fórmulas vinculadas está protegido', () => {
  const m = model({}, [inv('f', 3), { id: 'x', kind: 'fund', name: 'X', amount: 10, target: 'f' }, ap('p', 'periodic', { target: 'f', amount: 1 })]);
  assert.deepEqual(C.usesOf(m, 'f'), { funds: 1, formulas: 1 });
});

test('datos de la calculadora independiente: se importan con sus vínculos', () => {
  n = 0;
  const legacy = {
    start: { digital: 1200, cash: 50, salary: 1400, expenses: 900, horizon: 2, unit: 'years', date: '2026-01-01' },
    investments: [{ id: 'old1', name: 'Indexado', rate: 7 }],
    funds: [{ name: 'Cartera', amount: 300, target: 'old1' }],
    applied: [{ id: 'a', type: 'periodic', name: 'Inversión periódica', values: { target: 'old1', amount: 50, frequency: 'monthly', timing: 'begin', changeMonth: 6, changeAmount: 80 } },
      { id: 'b', type: 'cashInvest', values: { target: 'old1', percent: 40 } }, { id: 'c', type: 'custom', values: {} }],
    presets: [{ id: 'p', type: 'movement', name: 'Viaje', values: { kind: 'expense', amount: 600, at: 3, unit: 'months' } }]
  };
  const items = C.fromLegacy(legacy, TODAY, newId);
  const m = C.fromItems(items, TODAY);
  assert.equal(m.start.digital, 1200);
  assert.equal(m.start.unit, 'years');
  assert.equal(m.investments.length, 1);
  const invId = m.investments[0].id;
  assert.equal(m.funds[0].target, invId);
  assert.equal(m.applied.length, 2);
  assert.deepEqual(m.applied[0].values.futureChanges, [{ at: 6, unit: 'months', amount: 80 }]);
  assert.equal(m.applied[0].values.target, invId);
  assert.equal(m.applied[1].type, 'cashback');
  assert.equal(m.applied[1].values.target, invId);
  assert.equal(m.applied[1].values.percent, 40);
  assert.equal(m.presets[0].name, 'Viaje');
  assert.ok(Number.isFinite(C.compute(m).final));
});
