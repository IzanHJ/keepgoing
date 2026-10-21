const test = require('node:test');
const assert = require('assert');
const T = require('../js/turns.js');
const P = require('../js/turns-pdf.js');

test('Calendario de turnos: PDF sin solapes ni desbordes', () => {

const d = T.defaults();
T.applyRotation(d, { cycle: T.PATTERNS.continental.cycle, map: { A: 's_man', B: 's_tar', C: 's_noc' }, start: '2026-10-01', offset: 0, days: 31, overwrite: true });
d.days['2026-10-05'] = [{ sid: 's_man', note: 'Nota con acentos: ñandú, café (1) \\ y un texto bastante largo que debe recortarse sin salirse de la columna', start: '', end: '' },
  { sid: 's_tar' }, { sid: 's_noc' }, { sid: 's_for' }, { sid: 's_vac' }, { sid: 's_baj' }];
d.shifts[0].emoji = '🌅';
const r = P.monthPdf(d, 2026, 9, 1, new Date('2026-10-21T10:00:00Z'));
const s = Buffer.from(r.bytes).toString('latin1');

assert.ok(s.startsWith('%PDF-1.4'), 'cabecera');
assert.ok(s.trimEnd().endsWith('%%EOF'), 'fin');
assert.ok(r.pages >= 2, 'tiene página de detalle');
// xref: cada offset apunta a "N 0 obj"
const xr = /xref\n0 (\d+)\n([\s\S]*?)trailer/.exec(s);
const entries = xr[2].trim().split('\n').slice(1);
entries.forEach((line, i) => assert.ok(s.slice(parseInt(line.slice(0, 10), 10)).startsWith((i + 1) + ' 0 obj'), 'offset obj ' + (i + 1)));
assert.strictEqual(parseInt(/startxref\n(\d+)/.exec(s)[1], 10), s.indexOf('xref\n0 '));
// Longitudes de los streams correctas
for (const m of s.matchAll(/\/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/g)) assert.strictEqual(parseInt(m[1], 10), m[2].length, 'Length stream');
// Sin emojis (bytes > 0xFF imposible) y con contenido real
assert.ok(s.includes('(Octubre 2026) Tj'));
assert.ok(s.includes('Mañana'.replace('ñ', '\xF1')));
// Medidas: nada de texto mayor que su caja
assert.ok(P.wid(P.fit('Texto larguísimo '.repeat(20), 7, true, 90), 7, true) <= 90);
console.log('OK pdf:', r.pages, 'páginas,', r.bytes.length, 'bytes');

// ---- Geometría: ningún texto se solapa con otro y todo cae dentro de la página (y de su celda cuando está sobre un rectángulo de turno)
const streams = [...s.matchAll(/stream\n([\s\S]*?)\nendstream/g)].map((m) => m[1]);
streams.forEach((st, pi) => {
  const texts = [];
  for (const m of st.matchAll(/BT \/F([12]) ([\d.]+) Tf [\d. ]+ rg ([\d.-]+) ([\d.-]+) Td \(((?:\\.|[^\\)])*)\) Tj ET/g)) {
    const str = m[5].replace(/\\([\\()])/g, '$1'), size = +m[2], bold = m[1] === '2';
    const w = P.wid(str, size, bold), x = +m[3], y = +m[4];
    texts.push({ str, x, y0: y - size * 0.22, y1: y + size * 0.78, x1: x + w });
    assert.ok(x >= 29 && x + w <= 842 - 29 + 0.5 && y > 5 && y < 595, 'dentro de la página: "' + str + '" p' + pi);
  }
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const a = texts[i], b = texts[j];
    const hit = a.x < b.x1 - 0.01 && b.x < a.x1 - 0.01 && a.y0 < b.y1 - 0.01 && b.y0 < a.y1 - 0.01;
    assert.ok(!hit, 'solape de texto en p' + pi + ': "' + a.str + '" y "' + b.str + '"');
  }
  // cada texto sobre un rectángulo de color debe caber en él
  const rects = [...st.matchAll(/([\d. ]+) rg ([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) re f/g)].map((m) => ({ x: +m[2], y: +m[3], w: +m[4], h: +m[5] })).filter((r2) => r2.h === 11);
  for (const t of texts) for (const r2 of rects) if (t.x >= r2.x && t.x <= r2.x + r2.w && t.y0 + 1 >= r2.y - 2 && t.y1 <= r2.y + r2.h + 2) assert.ok(t.x1 <= r2.x + r2.w + 0.01, 'texto sobresale de su etiqueta: "' + t.str + '"');
});
console.log('OK geometría:', streams.length, 'páginas sin solapes ni desbordes');

});
