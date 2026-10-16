// Ejecutar con: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/caprice.js');

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('valor de cada hábito por nivel', () => {
  close(C.pointsPerHabit('chill'), 5);
  close(C.pointsPerHabit('serio'), 2.5);
  close(C.pointsPerHabit('locked'), 10 / 7);
});

test('día perfecto = 10 puntos en todos los niveles', () => {
  close(C.dayPoints(2, 'chill'), 10);
  close(C.dayPoints(4, 'serio'), 10);
  close(C.dayPoints(7, 'locked'), 10);
});

test('días parciales suman proporcionalmente y sin redondear', () => {
  close(C.dayPoints(1, 'chill'), 5);
  close(C.dayPoints(3, 'serio'), 7.5);
  close(C.dayPoints(1, 'locked'), 10 / 7);
  close(C.dayPoints(3, 'locked') + C.dayPoints(4, 'locked'), 10);
  close(C.dayPoints(0.5, 'chill'), 2.5);
});

test('no se pasa de 10 ni baja de 0', () => {
  close(C.dayPoints(9, 'chill'), 10);
  close(C.dayPoints(-2, 'serio'), 0);
  close(C.dayPoints(undefined, 'serio'), 0);
});

test('conversor: valores por defecto con 1.400 €', () => {
  close(C.tenPointsValue(1400, C.DEFAULT_PCT.chill), 14);
  close(C.tenPointsValue(1400, C.DEFAULT_PCT.serio), 7);
  close(C.tenPointsValue(1400, C.DEFAULT_PCT.locked), 1.4);
  close(C.moneyFor(5, 1400, 1), 7);
  close(C.moneyFor(10 / 7, 1400, 0.1), 0.2);
});

test('barra: puntos fijos y fuera de rango', () => {
  close(C.sliderPos(1), 10);
  close(C.sliderPos(0.5), 50);
  close(C.sliderPos(0.1), 90);
  assert.equal(C.sliderPos(2.5), C.BEFORE_FIRST);
  assert.equal(C.sliderPos(0.05), C.AFTER_LAST);
  assert.ok(C.sliderPos(0.75) > 10 && C.sliderPos(0.75) < 50);
  assert.ok(C.sliderPos(0.3) > 50 && C.sliderPos(0.3) < 90);
});

test('barra: la inversa devuelve el porcentaje', () => {
  close(C.pctFromPos(10), 1);
  close(C.pctFromPos(50), 0.5);
  close(C.pctFromPos(90), 0.1);
  close(C.pctFromPos(0), 1);
  close(C.pctFromPos(100), 0.1);
  for (const p of [0.9, 0.62, 0.5, 0.33, 0.15]) close(C.pctFromPos(C.sliderPos(p)), p, 0.006);
});

test('lectura de números escritos a mano', () => {
  assert.equal(C.parseNumber('0,5'), 0.5);
  assert.equal(C.parseNumber('0.5 %'), 0.5);
  assert.equal(C.parseNumber('1.400'), 1400);
  assert.equal(C.parseNumber('1400,50 €'), 1400.5);
  assert.equal(C.parseNumber('abc'), null);
  assert.equal(C.parseNumber(''), null);
});

test('historial: el ajuste vigente depende del día', () => {
  const h = [{ from: '0000-00-00', v: 'a' }, { from: '2026-10-16', v: 'b' }];
  assert.equal(C.onDay(h, '2026-10-15').v, 'a');
  assert.equal(C.onDay(h, '2026-10-16').v, 'b');
  assert.equal(C.onDay(h, '2027-01-01').v, 'b');
});
