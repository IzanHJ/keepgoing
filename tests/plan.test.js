const test = require('node:test');
const assert = require('node:assert');
const P = require('../js/plan.js');

const NOW = Date.parse('2026-10-26T12:00:00Z'), DAY = 86400000;
const iso = ms => new Date(ms).toISOString();

test('sin cuenta = Free, aunque haya algo guardado', () => {
  assert.strictEqual(P.resolve(null, { signedIn: false }).plan, 'free');
  assert.strictEqual(P.resolve({ plan: 'keepgoing', at: NOW }, { signedIn: false, now: NOW }).plan, 'free');
});

test('prueba de 14 días: días que quedan y fin', () => {
  const ent = { plan: 'trial', trial_ends: iso(NOW + 3.5 * DAY), at: NOW };
  const p = P.resolve(ent, { signedIn: true, now: NOW });
  assert.strictEqual(p.plan, 'trial'); assert.strictEqual(p.full, true); assert.strictEqual(p.daysLeft, 4);
  // Sin conexión, al pasar la fecha se acaba aunque la caché diga «trial»
  assert.strictEqual(P.resolve(ent, { signedIn: true, now: NOW + 4 * DAY }).plan, 'free');
});

test('Usuario KeepGoing indefinido sigue aunque la caché sea vieja; uno con fecha, no', () => {
  assert.strictEqual(P.resolve({ plan: 'keepgoing', until: null, at: NOW }, { signedIn: true, now: NOW + 90 * DAY }).plan, 'keepgoing');
  assert.strictEqual(P.resolve({ plan: 'keepgoing', until: iso(NOW + 365 * DAY), at: NOW }, { signedIn: true, now: NOW + 40 * DAY }).plan, 'free');
  assert.strictEqual(P.resolve({ plan: 'keepgoing', until: iso(NOW - DAY), at: NOW }, { signedIn: true, now: NOW }).plan, 'free');
});

test('ver como otro plan: solo el equipo', () => {
  const ent = { plan: 'keepgoing', at: NOW };
  assert.strictEqual(P.resolve(ent, { signedIn: true, now: NOW, view: 'free' }).plan, 'keepgoing');
  const dev = P.resolve({ ...ent, role: 'dev' }, { signedIn: true, now: NOW, view: 'free' });
  assert.strictEqual(dev.plan, 'free'); assert.strictEqual(dev.full, false); assert.strictEqual(dev.viewing, true);
  assert.strictEqual(P.resolve({ ...ent, role: 'hacker' }, { signedIn: true, now: NOW, view: 'free' }).plan, 'keepgoing');
});

test('límites Free', () => {
  const free = P.resolve(null, {}), full = { full: true };
  assert.strictEqual(P.allows(free, 'calc'), false);
  assert.strictEqual(P.allows(free, 'routines'), false);
  assert.strictEqual(P.allows(free, 'algo-gratis'), true);
  assert.strictEqual(P.allows(full, 'calc'), true);
  assert.strictEqual(P.canAdd(free, 'habits', 4), true);
  assert.strictEqual(P.canAdd(free, 'habits', 5), false);
  assert.strictEqual(P.canAdd(free, 'projects', 1), false);
  assert.strictEqual(P.canAdd(free, 'projSaved', 0), true);
  assert.strictEqual(P.canAdd(full, 'habits', 99), true);
  assert.strictEqual(P.canAdd(free, 'turnos', 999), true);
});

test('funciones activables', () => {
  assert.strictEqual(P.flagOn({ flags: {} }, 'calLayers', null), false);
  assert.strictEqual(P.flagOn({ flags: { calLayers: 'staff' } }, 'calLayers', 'dev'), true);
  assert.strictEqual(P.flagOn({ flags: { calLayers: 'staff' } }, 'calLayers', null), false);
  assert.strictEqual(P.flagOn({ flags: { calLayers: 'all' } }, 'calLayers', null), true);
  assert.strictEqual(P.flagOn({ flags: { x: 'off' } }, 'x', 'owner'), false);
});

test('keys XXXX-XXXX-XXXX-XXXX', () => {
  assert.strictEqual(P.keyFormat('abcd efgh-jkmn pqrs'), 'ABCD-EFGH-JKMN-PQRS');
  assert.strictEqual(P.keyValid('ABCD-EFGH-JKMN-PQRS'), true);
  assert.strictEqual(P.keyValid('ABCD-EFGH-JKMN-PQR'), false);
  assert.strictEqual(P.keyValid('ABCD-EFGH-JKMN-PQR0'), false); // sin 0
  assert.strictEqual(P.keyValid('abcdefghjkmnpqrs'), true);
});

test('precio por país = mismo % del salario mínimo, con tope de 29,99 en su moneda', () => {
  assert.deepStrictEqual(P.priceFor('es'), { amount: 29.99, cur: 'EUR' });
  assert.deepStrictEqual(P.priceFor('FR'), { amount: 29.99, cur: 'EUR' });
  assert.deepStrictEqual(P.priceFor('ES', 'month'), { amount: 1.49, cur: 'EUR' });
  assert.deepStrictEqual(P.priceFor('ES', 'year'), { amount: 14.99, cur: 'EUR' });
  assert.deepStrictEqual(P.priceFor('GB', 'year'), { amount: 14.99, cur: 'GBP' });
  const pct = 29.99 / (17094 / 12);
  assert.ok(Math.abs(P.priceFor('MX').amount - 9582.47 * pct) < 0.01);
  // Las suscripciones guardan la misma proporción que en España
  for (const [c, row] of Object.entries(P.PRICES)) {
    const tol = row[0] >= 500 ? 1 : 0.01;
    assert.ok(Math.abs(row[1] - row[0] * 1.49 / 29.99) <= tol, c + ' mes');
    assert.ok(Math.abs(row[2] - row[0] * 14.99 / 29.99) <= tol, c + ' año');
  }
});

test('ahorro del anual y del pago único (v1.25)', () => {
  assert.deepEqual(P.saving('ES', 'year'), { amount: 2.89, pct: 16, cur: 'EUR' });
  assert.deepEqual(P.saving('ES', 'forever'), { amount: 14.98, pct: 33, cur: 'EUR' });
  assert.equal(P.saving('ES', 'month'), null);
});
