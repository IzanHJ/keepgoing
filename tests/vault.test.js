// Ejecutar con: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const V = require('../js/vault.js');

test('cifrar y descifrar con la contraseña correcta', async () => {
  const { key, header } = await V.create('mi clave larga');
  assert.equal(header.v, 2);
  const box = await V.encrypt(key, { amountCents: 1250, note: 'Menú' });
  assert.ok(!JSON.stringify(box).includes('Menú'));
  const o = await V.open('mi clave larga', header);
  assert.ok(o && o.key && o.raw);
  assert.deepEqual(await V.decrypt(o.key, box), { amountCents: 1250, note: 'Menú' });
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

test('cambiar la contraseña conserva la clave de datos (no hay que volver a cifrar)', async () => {
  const { key, raw, header } = await V.create('vieja-clave');
  const box = await V.encrypt(key, { n: 7 });
  const h2 = await V.rewrap('nueva-clave', raw, header);
  assert.equal(V.vidOf(h2), V.vidOf(header));
  assert.equal(await V.open('vieja-clave', h2), null);
  const o = await V.open('nueva-clave', h2);
  assert.deepEqual(await V.decrypt(o.key, box), { n: 7 });
});

test('las libretas antiguas (v1) se siguen abriendo y se marcan para migrar', async () => {
  const salt = V.b64(new Uint8Array(16).fill(3));
  const k = await V.deriveKey('antigua', salt);
  const header = { v: 1, kdf: 'PBKDF2-SHA256', iter: V.ITER, salt, check: await V.encrypt(k, V.CHECK) };
  const box = await V.encrypt(k, { n: 1 });
  const o = await V.open('antigua', header);
  assert.equal(o.legacy, true);
  assert.deepEqual(await V.decrypt(o.key, box), { n: 1 });
  assert.equal(await V.open('otra', header), null);
  assert.equal(V.vidOf(header), salt);
});

test('PIN de 4 cifras: abre la clave de datos solo con el PIN correcto', async () => {
  const { raw, header } = await V.create('clave-larga');
  assert.equal(V.isPin('0420'), true);
  assert.equal(V.isPin('42'), false);
  assert.equal(V.isPin('12a4'), false);
  const rec = await V.pinWrap('0420', raw);
  assert.equal(await V.pinUnwrap('1111', rec), null);
  const raw2 = await V.pinUnwrap('0420', rec);
  assert.ok(await V.verify(await V.importRaw(raw2), header));
});
