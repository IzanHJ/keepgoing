const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/crown3d.js');

test('perfil de la corona: puntas altas y bajas alternas', () => {
  const step = Math.PI * 2 / 8;
  assert.ok(Math.abs(C.crownProfile(0) - (0.42 + 0.62)) < 1e-9);
  assert.ok(Math.abs(C.crownProfile(step) - (0.42 + 0.4)) < 1e-9);
  assert.ok(Math.abs(C.crownProfile(step / 2) - 0.42) < 1e-9); // valle
  assert.ok(Math.abs(C.crownProfile(-step) - C.crownProfile(7 * step)) < 1e-9);
});

test('la nota cambia la corona', () => {
  const lo = C.crownLook(1), hi = C.crownLook(10);
  assert.ok(lo.tilt < 0 && lo.tremble > 0 && hi.tilt === 0 && hi.tremble === 0);
  assert.ok(hi.scale > lo.scale && hi.rough < lo.rough && hi.spin > lo.spin);
  assert.equal(hi.lit, 8); assert.equal(C.crownLook(0).lit, 0); assert.ok(hi.pearls && !C.crownLook(7).pearls);
  assert.equal(C.crownLook(99).q, 1); assert.equal(C.crownLook('x').q, 0);
});

test('la malla del aro es válida', () => {
  const m = C.ringMesh({ segments: 64 });
  assert.equal(m.positions.length, 4 * 2 * 65 * 3);
  assert.ok(m.positions.every(Number.isFinite));
  const nv = m.positions.length / 3;
  assert.ok(m.indices.length === 4 * 64 * 6 && m.indices.every(i => i >= 0 && i < nv));
});

test('el modelo se construye con three.js', async () => {
  const THREE = await import('../js/vendor/three.module.min.js');
  const m = C.ringMesh({ segments: 32 }), g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(m.positions, 3)); g.setIndex(m.indices); g.computeVertexNormals();
  assert.ok(Array.from(g.getAttribute('normal').array).every(Number.isFinite));
  g.computeBoundingBox(); assert.ok(g.boundingBox.max.y > 1 && g.boundingBox.min.y === 0);
});
