const test = require('node:test');
const assert = require('node:assert');
const PDF = require('../js/pdf.js');

test('encode: WinAnsi con € y acentos; emojis fuera', () => {
  assert.deepStrictEqual(PDF.encode('€ á'), [0x80, 0x20, 0xe1]);
  assert.deepStrictEqual(PDF.encode('a🙂b'), [0x61, 0x62]);
  assert.deepStrictEqual(PDF.encode('1 000 −5'), [0x31, 0x20, 0x30, 0x30, 0x30, 0x20, 0x2d, 0x35]);
});

test('wrap: ninguna línea pasa del ancho', () => {
  const lines = PDF.wrap('Patrimonio proyectado con inversiones periódicas y pagas extras durante diez años', 120, 10);
  assert.ok(lines.length > 1);
  for (const l of lines) assert.ok(PDF.width(l, 10) <= 120);
});

test('output: PDF válido con xref correcto', () => {
  const d = PDF.create();
  d.addPage(); d.text(40, 60, 'Hola (mundo) €', { size: 14, bold: true }); d.rect(40, 80, 100, 40, { fill: '#eef1f8', stroke: '#586ff0', r: 6 }); d.poly([[40, 200], [100, 150], [160, 180]], { stroke: '#34b68a', lw: 2 });
  d.addPage(); d.text(40, 60, 'Página 2');
  const bytes = d.output({ title: 'Prueba' }), s = Buffer.from(bytes).toString('latin1');
  assert.ok(s.startsWith('%PDF-1.4'));
  assert.ok(s.trimEnd().endsWith('%%EOF'));
  assert.match(s, /\/Count 2/);
  assert.match(s, /\(Hola \\\(mundo\\\) \x80\) Tj/);
  const xref = +/startxref\n(\d+)/.exec(s)[1];
  assert.strictEqual(s.slice(xref, xref + 4), 'xref');
  const offs = [...s.slice(xref).matchAll(/(\d{10}) 00000 n/g)].map(m => +m[1]);
  offs.forEach((o, i) => assert.strictEqual(s.slice(o, o + String(i + 1).length + 6), `${i + 1} 0 obj`));
});
