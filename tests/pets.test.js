// Ejecutar con: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../js/pets.js');

const MOODS = ['happy', 'excited', 'sad', 'sleepy', 'neutral'];
const ids = s => [...s.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);

test('cada especie y estado de ánimo devuelve un SVG', () => {
  assert.deepEqual(P.KINDS, ['cat', 'dog', 'cockatiel']);
  for (const kind of P.KINDS) for (const fur of [true, false]) for (const mood of MOODS) {
    const s = P.svg({ kind, name: 'x', fur, colors: P.defaults(kind) }, mood, 80);
    assert.equal(typeof s, 'string');
    assert.ok(s.startsWith('<svg'), `${kind}/${mood}`);
    assert.ok(s.trim().endsWith('</svg>'));
    assert.ok(s.includes('width="80"'));
    assert.ok(!/undefined|NaN/.test(s), `${kind}/${mood} sin valores rotos`);
  }
});

test('los ids son únicos entre llamadas y todas las url(#…) apuntan a un id propio', () => {
  for (const kind of P.KINDS) {
    const pet = { kind, fur: true, colors: P.defaults(kind) };
    const a = P.svg(pet, 'happy'), b = P.svg(pet, 'happy');
    const ia = ids(a), ib = ids(b);
    assert.ok(ia.length > 0);
    assert.equal(new Set(ia).size, ia.length);
    for (const id of ia) assert.ok(!ib.includes(id), `${kind}: ${id} repetido`);
    for (const [, ref] of a.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ia.includes(ref));
  }
});

test('paletas y colores por defecto', () => {
  for (const kind of P.KINDS) {
    const pal = P.palettes(kind);
    assert.ok(pal.length >= 1 && pal.length <= 3);
    for (const slot of pal) {
      assert.equal(typeof slot.key, 'string');
      for (const [name, hex] of slot.options) {
        assert.match(name, /^[a-z_]+$/);
        assert.ok(hex === '' || /^#[0-9a-f]{6}$/i.test(hex));
      }
    }
    const d = P.defaults(kind);
    assert.ok(Array.isArray(d) && /^#[0-9a-f]{6}$/i.test(d[0]));
    d.push('#000000'); assert.notDeepEqual(P.defaults(kind), d); // copia, no referencia
  }
});

test('entradas raras no rompen: especie desconocida, sin colores, ánimo inválido, ninfa sin mejillas', () => {
  assert.ok(P.svg({ kind: 'dragon', colors: [] }, 'nope').startsWith('<svg'));
  assert.ok(P.svg(null).startsWith('<svg'));
  const none = P.svg({ kind: 'cockatiel', colors: ['#8e9198', '#f6f4ee', ''] }, 'neutral');
  const orange = P.svg({ kind: 'cockatiel', colors: ['#8e9198', '#f6f4ee', '#f2853a'] }, 'neutral');
  assert.ok(!none.includes('#f2853a') && orange.includes('#f2853a'));
});
