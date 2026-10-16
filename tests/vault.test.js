// Ejecutar con: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const V = require('../js/vault.js');

test('cifrar y descifrar con la contraseña correcta', async () => {
  const { key, header } = await V.create('mi clave larga');
  const box = await V.encrypt(key, { amountCents: 1250, note: 'Menú' });
  assert.ok(!JSON.stringify(box).includes('Menú'));
  const k2 = await V.open('mi clave larga', header);
  assert.ok(k2);
  assert.deepEqual(await V.decrypt(k2, box), { amountCents: 1250, note: 'Menú' });
});

test('una contraseña incorrecta no abre la libreta', async () => {
  const { header } = await V.create('correcta');
  assert.equal(await V.open('incorrecta', header), null);
});

test('cada cifrado usa un vector distinto y detecta alteraciones', async () => {
  const { key } = await V.create('x');
  const a = await V.encrypt(key, { n: 1 }), b = await V.encrypt(key, { n: 1 });
  assert.notEqual(a.iv, b.iv);
  const bad = { iv: a.iv, ct: b.ct };
  await assert.rejects(V.decrypt(key, bad));
});
