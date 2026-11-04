const test = require('node:test');
const assert = require('node:assert/strict');
const W = require('../js/world.js');
const C = W.decodeTopo(require('../data/world-110m.json'));

test('el mapa se decodifica con códigos de país', () => {
  assert.ok(C.length > 150);
  assert.ok(C.find(c => c.a2 === 'ES'));
  assert.ok(C.every(c => c.polys.length && c.polys[0][0].length > 2));
});

test('país de unas coordenadas, sin internet', () => {
  assert.equal(W.countryAt(C, 37.389, -5.984).a2, 'ES'); // Sevilla
  assert.equal(W.countryAt(C, 35.68, 139.69).a2, 'JP'); // Tokio
  assert.equal(W.countryAt(C, 40.71, -74.0).a2, 'US'); // Nueva York
  assert.equal(W.countryAt(C, -34.6, -58.38).a2, 'AR'); // Buenos Aires
  assert.equal(W.countryAt(C, 48.85, 2.35).a2, 'FR'); // París
  assert.equal(W.countryAt(C, 30, -40), null); // en medio del Atlántico
  assert.equal(W.countryAt(C, NaN, 3), null);
});

test('geografía de un lugar: lo guardado gana a lo calculado', () => {
  assert.deepEqual(W.geoOf({ lat: 37.389, lon: -5.984 }, C), { cc: 'ES', ccSt: 'calc', city: null, citySt: 'na' });
  assert.deepEqual(W.geoOf({ cc: 'PT', city: 'Lisboa', lat: 37.389, lon: -5.984 }, C), { cc: 'PT', ccSt: 'reg', city: 'Lisboa', citySt: 'reg' });
  assert.deepEqual(W.geoOf({ addr: 'Mi casa' }, C), { cc: null, ccSt: 'na', city: null, citySt: 'na' });
  assert.deepEqual(W.fromOsmAddress({ town: 'Dos Hermanas', country_code: 'es' }), { city: 'Dos Hermanas', cc: 'ES' });
  assert.deepEqual(W.fromOsmAddress(null), {});
});

test('momentos: orden, cambios de lugar y viajes sin inventar', () => {
  const casa = { id: 'a', cc: 'ES' }, ofi = { id: 'b', cc: 'ES' }, hotel = { id: 'c', cc: 'JP' };
  const geo = p => W.geoOf(p, C);
  const ms = W.moments([
    { date: '2026-03-02', min: 600, place: ofi, tr: 'bus' },
    { date: '2026-03-02', min: 420, place: casa },
    { date: '2026-03-02', min: 700, place: null }, // sin lugar: no se supone nada
    { date: '2026-03-03', min: 480, place: hotel, tr: 'plane' },
    { date: '2026-03-01', min: null, place: casa },
  ], geo);
  assert.deepEqual(ms.map(m => m.place && m.place.id), ['a', 'a', 'b', null, 'c']);
  assert.equal(ms[1].move, false);
  assert.equal(ms[2].move, true); assert.equal(ms[2].from.id, 'a'); assert.equal(ms[2].trip, null);
  assert.equal(ms[3].move, false);
  assert.deepEqual([ms[4].trip.from, ms[4].trip.to], ['ES', 'JP']);
  const s = W.summary(ms);
  assert.deepEqual(s.places.map(p => [p.place.id, p.n]), [['a', 2], ['b', 1], ['c', 1]]);
  assert.deepEqual(s.countries.map(c => c.cc), ['ES', 'JP']);
  assert.equal(s.trips.length, 1); assert.equal(s.unknown, 1);
});

test('globo: puntos en la esfera y arco que se levanta en el centro', () => {
  const p = W.toXYZ(0, 0); assert.ok(Math.abs(Math.hypot(...p) - 1) < 1e-9);
  const n = W.toXYZ(90, 0); assert.ok(Math.abs(n[1] - 1) < 1e-9);
  const a = W.arc({ lat: 40, lon: -3 }, { lat: 35, lon: 139 }, 10);
  assert.equal(a.length, 11);
  assert.ok(Math.abs(Math.hypot(...a[0]) - 1) < 1e-9 && Math.abs(Math.hypot(...a[10]) - 1) < 1e-9);
  assert.ok(Math.hypot(...a[5]) > 1.1);
});

test('catálogos', () => {
  assert.ok(W.okScene('home') && !W.okScene('castle'));
  assert.ok(W.okTransport('bus') && !W.okTransport('teleport'));
  assert.equal(new Set(W.SCENE_IDS).size, W.SCENES.length);
});
