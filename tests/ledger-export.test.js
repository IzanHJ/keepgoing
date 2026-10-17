// Ejecutar con: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const X = require('../js/ledger-export.js');

const EVIL = '<img src=x onerror=alert(1)>';
const base = over => ({
  lang: 'es', title: 'Mi Libreta', subtitle: '01/10/2026 – 17/10/2026', from: '2026-10-01', to: '2026-10-17',
  entries: [
    { id: 'a', date: '2026-10-02', type: 'expense', amountCents: 1250, categoryId: 'food', note: 'Cena', method: 'card' },
    { id: 'b', date: '2026-10-05', type: 'income', amountCents: 150000, categoryId: 'salary', note: '', method: 'transfer' },
    { id: 'c', date: '2026-10-09', type: 'expense', amountCents: 4599, categoryId: 'leisure', note: 'Cine', method: 'cash' }
  ],
  cats: [{ id: 'food', name: 'Comida', icon: '🍽️', color: '#ff6b6b' }, { id: 'salary', name: 'Nómina', icon: '💼' }, { id: 'leisure', name: 'Ocio', icon: '🎉' }],
  events: [{ id: 'v', name: 'Puente', icon: '🏖️', from: '2026-10-08', to: '2026-10-12', catIds: ['leisure'] }],
  money: { locale: 'es-ES', currency: 'EUR' }, generatedAt: '2026-10-17T10:00:00Z', footer: 'Exportado desde KeepGoing', privacy: false,
  ...over
});

test('documento completo y sin scripts', () => {
  const h = X.html(base());
  assert.ok(h.startsWith('<!doctype html>'));
  assert.ok(!/<script/i.test(h));
  assert.ok(!/(src|href)=["']?https?:/i.test(h), 'sin recursos externos');
  assert.ok(!/@import|url\(\s*["']?http/i.test(h));
  assert.match(h, /Content-Security-Policy/);
  assert.match(h, /Mi Libreta/);
  assert.match(h, /1500,00\s€|1\.500,00\s€/);
  assert.match(h, /Puente/);
  assert.match(h, /45,99\s€/); // total del evento (solo Ocio dentro de sus fechas)
});

test('escapa todo texto del usuario', () => {
  const h = X.html(base({
    title: EVIL, subtitle: '"><script>alert(2)</script>', footer: '</style><script>x()</script>',
    entries: [{ id: 'z', date: '2026-10-03', type: 'expense', amountCents: 100, categoryId: 'food', note: EVIL, method: '"><b>' }],
    cats: [{ id: 'food', name: '<svg onload=alert(3)>', icon: '<i>', color: 'red;background:url(http://evil)' }],
    events: [{ id: 'e', name: '<script>alert(4)</script>', icon: '"onx=1', from: '2026-10-01', to: '2026-10-05', catIds: [] }]
  }));
  assert.ok(!h.includes(EVIL));
  assert.ok(h.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!/<script/i.test(h));
  assert.ok(!/<svg onload/i.test(h));
  assert.ok(!h.includes('evil'), 'los colores inválidos se descartan');
  assert.ok(h.includes('&lt;i&gt;') && !/<i><\/span>/.test(h));
  assert.equal((h.match(/<\/style>/g) || []).length, 1);
});

test('modo privacidad oculta todos los importes', () => {
  const h = X.html(base({ privacy: true }));
  assert.ok(h.includes('•••'));
  assert.ok(!/\d,\d\d\s€/.test(h), 'ninguna cifra con moneda');
  assert.ok(!/€/.test(h));
});

test('sin movimientos: documento válido con aviso', () => {
  const h = X.html(base({ entries: [], events: [] }));
  assert.ok(h.startsWith('<!doctype html>'));
  assert.match(h, /No hay movimientos/);
  const h2 = X.html({});
  assert.ok(h2.startsWith('<!doctype html>'));
  const en = X.html(base({ lang: 'en', entries: [] }));
  assert.match(en, /No entries in this period/);
});

test('buckets: días, meses y años', () => {
  const day = X.html(base());
  assert.match(day, /por día/);
  const month = X.html(base({ from: '2026-01-01', to: '2026-10-17' }));
  assert.match(month, /por mes/);
  const year = X.html(base({ from: '2020-01-01', to: '2026-10-17' }));
  assert.match(year, /por año/);
});

test('nombre de archivo seguro', () => {
  assert.equal(X.filename('Libreta de @izanhj', '2026-10-01', '2026-10-17'), 'keepgoing-libreta-de-izanhj-2026-10-01_2026-10-17.html');
  assert.equal(X.filename('Mi Libreta', '2026-10-01', '2026-10-17'), 'keepgoing-mi-libreta-2026-10-01_2026-10-17.html');
  assert.equal(X.filename('../../etc/passwd', 'x', '2026-10-17'), 'keepgoing-etc-passwd-2026-10-17.html');
  assert.equal(X.filename('', '2026-10-01', '2026-10-17'), 'keepgoing-libreta-2026-10-01_2026-10-17.html');
  assert.match(X.filename('Ñoño año €€', '2026-01-01', '2026-02-01'), /^keepgoing-nono-ano-2026-01-01_2026-02-01\.html$/);
});

test('eventos fuera del rango no aparecen', () => {
  const h = X.html(base({ events: [{ id: 'o', name: 'Verano pasado', icon: '☀️', from: '2026-07-01', to: '2026-07-15', catIds: [] }] }));
  assert.ok(!h.includes('Verano pasado'));
});
