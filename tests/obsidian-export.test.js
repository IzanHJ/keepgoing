// Ejecutar con: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const O = require('../js/obsidian-export.js');

const EVIL = 'a|b\n[[x]] #tag <img src=x onerror=alert(1)> ==hi== `c` $m$';
const today = '2026-10-15';
const data = over => ({
  lang: 'es', today, generatedAt: '2026-10-15T10:00:00Z', cur: 'EUR',
  habits: [
    { name: 'Leer', freq: 'daily', created: '2026-09-01', done: 40, pct: 0.8, streak: 5, best: 12, last7: ['done', 'done', 'miss', 'off', 'done', 'part', 'done'] },
    { name: 'Fumar', quit: true, freq: 'daily', created: '2026-10-01', done: 14, pct: 1, streak: 14, best: 14, last7: ['done', 'done', 'done', 'done', 'done', 'done', 'done'] }
  ],
  projects: [{ name: 'Maratón', goal: { type: 'numeric', cur: 21, target: 42, unit: 'km', pct: 0.5 }, deadline: '2026-12-01', prob: 63, retoLog: [{ from: '2026-08-01', to: '2026-08-31', ok: true }] }],
  jobs: [{ name: 'Tienda', rate: 10, paid: true }], places: [{ name: 'Centro', addr: 'Calle Mayor 1' }],
  shifts: [{ name: 'Mañana', start: '08:00', end: '15:00', job: 'Tienda' }], routines: [{ name: 'Semana A', kind: 'week', n: 5 }],
  work: [{ ym: '2026-09', hours: 120.5, count: 20, pay: 1205 }, { ym: '2026-10', hours: 40, count: 7, pay: 400 }],
  dayKinds: { '2026-09-01': ['Laboral'], '2026-09-02': ['Laboral', 'Festivo'], '2026-10-01': 'Libre' },
  dayRate: { '2026-10-01': { r: 8 }, '2026-10-02': { r: 6 } }, energy: { '2026-09-10': 4 },
  reviews: { '2026-10-05': { score: 7, good: 'Bien', adjust: 'Dormir' } },
  contract: { name: 'Izan', signedAt: '2026-10-01', endsAt: '2026-11-01', level: 'Serio', renewals: 1 },
  ...over
});
const E = (id, date, type, amountCents, categoryId, extra = {}) => ({ id, date, type, amountCents, categoryId, note: '', method: 'card', ...extra });
const ledger = over => ({
  lang: 'es', today, generatedAt: '2026-10-15T10:00:00Z', cur: 'EUR', salaryIds: ['salary'], extraIds: ['extra'],
  cats: [{ id: 'salary', name: 'Nómina' }, { id: 'food', name: 'Comida' }, { id: 'extra', name: 'Extra' }, { id: 'invest', name: 'Inversión' }, { id: 'other', name: 'Otros' }],
  entries: [
    E('a', '2026-08-01', 'income', 150000, 'salary'), E('b', '2026-08-05', 'expense', 50000, 'food'), E('c', '2026-08-10', 'invest', 10000, 'invest'),
    E('d', '2026-09-01', 'income', 160000, 'salary'), E('e', '2026-09-05', 'expense', 70000, 'food'), E('f', '2026-09-10', 'invest', 20000, 'invest'),
    E('g', '2026-09-12', 'income', 2500, 'other', { pay: { e: 'x', p: 'y' } }), E('h', '2026-09-20', 'income', 30000, 'extra'),
    E('i', '2026-10-01', 'income', 160000, 'salary'), E('j', '2026-10-03', 'expense', 1234, 'food', { note: EVIL })
  ],
  worth: { set: true, date: '2026-10-15', digital: 100000, cash: 5000, value: 30000, patrimony: 145000, cur: { USD: { digital: 10000, cash: 0 } }, rates: { USD: 0.9 } },
  budget: { from: '2026-08', rows: [{ ym: '2026-09', budget: 60000, spent: 70000, diff: -10000, acc: -10000 }, { ym: '2026-10', budget: 60000, spent: 1234, diff: 58766, acc: 48766 }] },
  debts: [{ side: 'favor', who: 'Ana', date: '2026-10-02', note: 'Cena', expected: 2000, paid: 500, left: 1500 }, { side: 'contra', who: 'Luis', date: '2026-09-02', note: '', expected: 900, paid: 900, left: 0 }],
  projections: [{ name: 'Plan|A', items: [
    { id: 'calc-start', kind: 'start', salary: 1500, expenses: 600, horizon: 5, unit: 'years', date: '2026-01-01' },
    { id: 'p1', kind: 'applied', type: 'periodic', values: { amount: 100, frequency: 'monthly' } },
    { id: 'p2', kind: 'applied', type: 'periodic', values: { amount: 1200, frequency: 'yearly' } },
    { id: 'p3', kind: 'applied', type: 'extraPay', values: { amount: 1200, months: [6, 12] } }
  ] }],
  ...over
});

test('rutas fijas: solo las cuatro, sin «..» ni barras raras', () => {
  for (const p of Object.values(O.PATHS)) assert.ok(O.safePath(p), p);
  for (const bad of ['../x.md', 'wiki/repos/Keepgoing/../../x.md', '/wiki/repos/Keepgoing/keepgoing-mis-datos.md', 'wiki\\repos\\x.md', 'raw-sources/keepgoing-datos/otro.csv', '', null])
    assert.equal(O.safePath(bad), false, String(bad));
  assert.equal(O.PATHS.data, 'wiki/repos/Keepgoing/keepgoing-mis-datos.md');
  assert.equal(O.PATHS.csv, 'raw-sources/keepgoing-datos/libreta-movimientos.csv');
});

test('escapado de Markdown: no rompe tablas, enlaces, etiquetas ni HTML', () => {
  const s = O.md(EVIL);
  assert.ok(!/\n/.test(s));
  assert.ok(!/(^|[^\\])\|/.test(s), 'barra sin escapar');
  assert.ok(!s.includes('[['), 'enlace interno');
  assert.ok(!/(^|[^\\])#tag/.test(s), 'etiqueta');
  assert.ok(!s.includes('<img'));
  assert.ok(!/(^|[^\\])==/.test(s));
  assert.equal(O.md('x'.repeat(500)).length, 300);
});

test('CSV: BOM, punto y coma, comillas dobles y fórmulas neutralizadas', () => {
  const c = O.csv(ledger({ entries: [E('1', '2026-10-01', 'expense', 1250, 'food', { note: 'dijo "hola"; adiós\nfin' }), E('2', '2026-10-02', 'income', 100, 'salary', { note: '=HYPERLINK("x")', fx: { cur: 'USD', cents: 110, rate: 0.9 } })] }));
  assert.ok(c.startsWith('﻿'));
  const lines = c.slice(1).split('\r\n');
  assert.equal(lines[0], 'id;fecha;tipo;importe_eur;categoria;nota;metodo;moneda');
  assert.equal(lines[1], '1;2026-10-01;Gasto;12.50;Comida;"dijo ""hola""; adiós\nfin";card;EUR');
  assert.match(lines[2], /^2;2026-10-02;Ingreso;1\.00;Nómina;"'=HYPERLINK\(""x""\)";card;USD$/);
  // Otra moneda principal: importe_eur con el cambio a euros; sin cambio, vacío
  assert.match(O.csv(ledger({ cur: 'USD', eurRate: 0.5, entries: [E('1', '2026-10-01', 'expense', 1000, 'food')] })), /;5\.00;/);
  assert.match(O.csv(ledger({ cur: 'USD', entries: [E('1', '2026-10-01', 'expense', 1000, 'food')] })), /Gasto;;Comida/);
});

test('ventana de meses: 12 completos y el mes en curso parcial', () => {
  const w = O.monthWindow('2026-10-15', 12);
  assert.equal(w.full.length, 12); assert.equal(w.full[0], '2025-10'); assert.equal(w.full[11], '2026-09');
  assert.equal(w.current, '2026-10'); assert.equal(w.partial, true); assert.equal(w.day, 15);
  assert.equal(O.monthWindow('2026-10-31').partial, false);
  assert.deepEqual(O.monthWindow('2026-10-15', 12, '2026-08-20').full, ['2026-08', '2026-09']);
});

test('supuestos de una proyección: aportación al mes y pagas extras repartidas', () => {
  const a = O.assumptions(ledger().projections[0].items);
  assert.deepEqual({ s: a.salary, e: a.expenses, c: a.contribution, x: a.extra }, { s: 150000, e: 60000, c: 20000, x: 20000 });
  assert.equal(O.assumptions([{ kind: 'applied', type: 'periodic', values: {} }]), null);
});

test('nota de la Libreta: nómina, devoluciones, gastos e inversión aparte; comparativa sin el mes en curso', () => {
  const n = O.ledgerNote(ledger());
  assert.match(n, /^---\ntags: \[keepgoing, keepgoing\/libreta\]/);
  assert.match(n, /Octubre de 2026 \(hasta el día 15\)/);
  // Septiembre: nómina 1600, otros 300 (extra), devoluciones 25, gastos 700, inversión 200, neto 1600+300-700 = 1200
  const sep = n.split('\n').find(l => l.startsWith('| Septiembre de 2026 |'));
  assert.ok(sep, 'fila de septiembre');
  assert.match(sep, /1600,00\s€.*300,00\s€.*25,00\s€.*700,00\s€.*200,00\s€.*\+1200,00\s€/);
  // Comparativa: medias de agosto y septiembre (2 meses completos), octubre aparte
  assert.match(n, /### Plan\\\|A/);
  assert.match(n, /2 meses completos/);
  const sal = n.split('\n').find(l => l.startsWith('| Nómina | 1500,00'));
  assert.match(sal, /\| 1500,00\s€ \| 1550,00\s€ \| \+50,00\s€ \| 1600,00\s€ \|/);
  const ex = n.split('\n').find(l => l.startsWith('| Gastos | 600,00'));
  assert.match(ex, /600,00\s€ \| 600,00\s€ \| 0,00\s€ \| 12,34\s€/);
  assert.match(n.split('\n').find(l => l.startsWith('| Pagas extras')), /200,00\s€ \| 150,00\s€ \| −50,00\s€/);
  // Patrimonio, presupuesto y solo deudas abiertas
  assert.match(n, /Patrimonio total\*\* \| \*\*1450,00\s€/);
  assert.match(n, /US\$|USD/);
  assert.match(n, /Diferencia acumulada desde/);
  assert.match(n, /\| Ana \| Te debe/); assert.ok(!n.includes('Luis'));
  // La nota peligrosa no aparece sin escapar
  assert.ok(!n.includes('[[x]]')); assert.ok(!n.includes('<img'));
});

test('nota de la Libreta sin datos: una línea en vez de tablas vacías', () => {
  const n = O.ledgerNote(ledger({ entries: [], worth: null, budget: null, debts: [], projections: [] }));
  for (const s of ['No hay movimientos en este periodo.', 'No has puesto un punto de partida', 'No tienes presupuesto global.', 'No hay deudas abiertas.', 'No tienes proyecciones guardadas'])
    assert.ok(n.includes(s), s);
  assert.ok(!/\| --- \|\n\n/.test(n));
  assert.match(O.ledgerNote(ledger({ locked: true })), /La Libreta estaba bloqueada/);
  assert.match(O.ledgerNote(ledger({ entries: [E('i', '2026-10-01', 'income', 100, 'salary')] })), /Aún no hay ningún mes completo/);
});

test('nota de mis datos: hábitos, proyectos, organización, valoración, revisiones y contrato', () => {
  const n = O.dataNote(data());
  assert.match(n, /\| Leer · desde .* \| 40 \| 80 % \| 5 días \| 12 días \| ✓ ✓ ✗ – ✓ ◐ ✓ \|/);
  assert.match(n, /Fumar \(a dejar\)/); assert.match(n, /días sin recaer/);
  assert.match(n, /21 de 42 km \(50 %\)/); assert.match(n, /63 % de probabilidad/); assert.match(n, /superado/);
  assert.match(n, /\| Septiembre de 2026 \| 120,5 \| 20 \| 1205,00\s€ \|/);
  assert.match(n, /\| Mes \| Laboral \| Festivo \| Libre \|/);
  assert.match(n, /\| Octubre de 2026 \(hasta el día 15\) \| 7,0 \| 2 \|/);
  assert.match(n, /\| Izan \|/);
  const e = O.dataNote(data({ habits: [], projects: [], jobs: [], places: [], shifts: [], routines: [], work: [], dayKinds: {}, dayRate: {}, energy: {}, reviews: {}, contract: null, lang: 'en' }));
  for (const s of ['You have no habits.', 'You have no projects.', 'No shifts in this period.', 'You have no signed contract.']) assert.ok(e.includes(s), s);
  const evil = O.dataNote(data({ habits: [{ name: EVIL, freq: 'daily', last7: [] }] }));
  assert.ok(!evil.includes('[[x]]') && !evil.includes('<img'));
});

test('estado sin la Libreta: quita lo cifrado y kx', () => {
  const st = { habits: [1], ledgerEntries: [{ id: 'a', enc: {} }], ledgerVault: { vid: 'v' }, kx: { priv: 'p' }, calJobs: [] };
  const out = O.stripState(st, ['ledgerEntries', 'ledgerVault', 'kx']);
  assert.deepEqual(Object.keys(out).sort(), ['calJobs', 'habits']);
  assert.notEqual(out.habits, st.habits, 'es una copia');
});

test('los cuatro archivos y el tope de tamaño', () => {
  const st = { habits: [], ledgerEntries: [{ id: 'a', enc: { ct: 'SECRETO' } }], kx: { priv: 'CLAVE' } };
  const f = O.files({ data: data(), ledger: ledger(), state: st, drop: ['ledgerEntries', 'kx'] });
  assert.deepEqual(f.map(x => x.path), [O.PATHS.data, O.PATHS.ledger, O.PATHS.csv, O.PATHS.json]);
  const json = f[3].text; assert.ok(!json.includes('SECRETO') && !json.includes('CLAVE'));
  // Libreta bloqueada: el CSV va solo con la cabecera
  const lk = O.files({ data: data(), ledger: ledger({ locked: true }), state: {}, drop: [] });
  assert.equal(lk[2].text.trim().split('\r\n').length, 1);
  assert.throws(() => O.files({ data: data(), ledger: ledger(), state: { big: 'x'.repeat(O.MAX_FILE + 1) }, drop: [] }), /tooBig/);
});

test('zip: se descomprime con lo mismo que se metió', () => {
  const f = O.files({ data: data(), ledger: ledger(), state: { a: 1 }, drop: [] });
  const z = Buffer.from(O.zip(f, new Date(2026, 9, 15, 10, 30)));
  assert.equal(z.readUInt32LE(0), 0x04034b50);
  // Recorre las cabeceras locales y comprueba nombre, CRC y contenido
  let off = 0, n = 0;
  while (z.readUInt32LE(off) === 0x04034b50) {
    const size = z.readUInt32LE(off + 18), nl = z.readUInt16LE(off + 26), name = z.slice(off + 30, off + 30 + nl).toString('utf8');
    const body = z.slice(off + 30 + nl, off + 30 + nl + size);
    assert.equal(name, f[n].path); assert.equal(body.toString('utf8'), f[n].text);
    assert.equal(z.readUInt32LE(off + 14), zlib.crc32 ? zlib.crc32(body) : O.crc32(body));
    off += 30 + nl + size; n++;
  }
  assert.equal(n, 4);
  assert.equal(z.readUInt32LE(z.length - 22), 0x06054b50);
  assert.equal(O.crc32(Buffer.from('123456789')), 0xcbf43926);
});

test('enlace de Obsidian', () => {
  assert.equal(O.openUrl('Mi bóveda'), 'obsidian://open?vault=Mi%20b%C3%B3veda&file=wiki%2Frepos%2FKeepgoing%2Fkeepgoing-mis-datos');
  assert.equal(O.vaultOk(''), false); assert.equal(O.vaultOk('x'.repeat(121)), false); assert.equal(O.vaultOk('Notas'), true);
});
