const test = require('node:test');
const assert = require('assert');
const P = require('../js/places.js');

test('Lugares: coordenadas de lo que se pega', () => {
  assert.deepEqual(P.parseCoords('40.4168, -3.7038'), { lat: 40.4168, lon: -3.7038 });
  assert.deepEqual(P.parseCoords('https://www.google.com/maps/place/Puerta+del+Sol/@40.4169,-3.7035,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d40.416775!4d-3.70379'), { lat: 40.416775, lon: -3.70379 });
  assert.deepEqual(P.parseCoords('https://www.google.com/maps/@41.38,2.17,15z'), { lat: 41.38, lon: 2.17 });
  assert.deepEqual(P.parseCoords('https://maps.apple.com/?ll=37.3891,-5.9845&q=Sevilla'), { lat: 37.3891, lon: -5.9845 });
  assert.deepEqual(P.parseCoords('https://www.google.com/maps/search/?api=1&query=39.47%2C-0.37'), { lat: 39.47, lon: -0.37 });
  assert.equal(P.parseCoords('Calle Mayor 1, Madrid'), null);
  assert.equal(P.parseCoords('120, 500'), null);
  assert.equal(P.placeNameOf('https://www.google.com/maps/place/Puerta+del+Sol/@40.4,-3.7,17z'), 'Puerta del Sol');
  assert.ok(P.isShortLink('https://maps.app.goo.gl/abc123'));
});

test('Lugares: enlace a Mapas y lugares de un calendario importado', () => {
  assert.equal(P.mapUrl({ addr: 'Calle Mayor 1, Madrid' }, false), 'https://www.google.com/maps/search/?api=1&query=Calle%20Mayor%201%2C%20Madrid');
  assert.equal(P.mapUrl({ name: 'Oficina', lat: 40.4, lon: -3.7 }, true), 'https://maps.apple.com/?ll=40.4,-3.7&q=Oficina');
  assert.equal(P.mapUrl({}, false), '');
  const d = P.distinct([{ location: 'Oficina, Madrid' }, { location: 'oficina, madrid' }, { location: 'Gimnasio' }, { location: '' }]);
  assert.equal(d.length, 2); assert.equal(d[0].n, 2); assert.equal(P.shortName('Oficina, Madrid'), 'Oficina');
});
