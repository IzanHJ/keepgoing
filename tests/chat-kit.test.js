// Ejecutar con: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const zlib = require('node:zlib');
const K = require('../js/chat-kit.js');

// ZIP mínimo (deflate) hecho a mano para no depender de archivos binarios en el repositorio
function makeZip(files) {
  const parts = [], cd = []; let off = 0;
  for (const [name, data, store] of files) {
    const nb = Buffer.from(name), raw = Buffer.from(data), comp = store ? raw : zlib.deflateRawSync(raw), m = store ? 0 : 8;
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(m, 8); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(nb.length, 26);
    parts.push(lh, nb, comp);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(m, 10); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(nb.length, 28); ch.writeUInt32LE(off, 42);
    cd.push(ch, nb); off += 30 + nb.length + comp.length;
  }
  const cdb = Buffer.concat(cd), e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(files.length, 8); e.writeUInt16LE(files.length, 10); e.writeUInt32LE(cdb.length, 12); e.writeUInt32LE(off, 16);
  return new Uint8Array(Buffer.concat([...parts, cdb, e]));
}
const WEBP = n => Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 '), Buffer.alloc(20 + n, n)]);
const PNG = Buffer.concat([Buffer.from([0x89]), Buffer.from('PNG\r\n'), Buffer.alloc(30, 1)]);

test('wastickers: lee título, autor, bandeja y stickers en orden numérico', async () => {
  const z = makeZip([['10.webp', WEBP(10)], ['title.txt', 'Mi pack'], ['2.webp', WEBP(2)], ['author.txt', 'Lexios'], ['0.png', PNG], ['1.webp', WEBP(1), true]]);
  const p = await K.readWaStickers(z);
  assert.equal(p.title, 'Mi pack'); assert.equal(p.author, 'Lexios');
  assert.equal(p.tray.mime, 'image/png');
  assert.deepEqual(p.stickers.map(s => s.name), ['1.webp', '2.webp', '10.webp']);
  assert.ok(p.stickers.every(s => s.mime === 'image/webp'));
});
test('wastickers: un zip sin imágenes o algo que no es zip da error', async () => {
  await assert.rejects(K.readWaStickers(makeZip([['title.txt', 'x']])), /empty/);
  await assert.rejects(K.readWaStickers(new Uint8Array(100)), /notzip/);
});
test('wastickers: el paquete real de ejemplo (si está) se abre', async t => {
  const f = process.env.KG_WASTICKERS; if (!f || !fs.existsSync(f)) { t.skip('sin archivo de ejemplo'); return; }
  const p = await K.readWaStickers(new Uint8Array(fs.readFileSync(f)));
  assert.ok(p.stickers.length >= 1);
});
test('isPack reconoce .wastickers y .zip', () => {
  assert.ok(K.isPack('a.wastickers')); assert.ok(K.isPack('A.ZIP')); assert.ok(K.isPack('x', 'application/zip')); assert.ok(!K.isPack('a.webp', 'image/webp'));
});
test('enlaces: máximo 5, solo http(s), se añade https:// y se recorta la etiqueta', () => {
  const l = K.cleanLinks([{ u: 'instagram.com/yo', l: 'Insta' }, { u: 'javascript:alert(1)' }, { u: 'https://a.es' }, { u: 'b.com' }, { u: 'c.com' }, { u: 'd.com' }, { u: 'e.com' }, { u: 'x' }]);
  assert.equal(l.length, 5); assert.equal(l[0].u, 'https://instagram.com/yo'); assert.ok(l.every(x => /^https?:\/\//.test(x.u)));
  assert.equal(K.linkHost('https://www.youtube.com/@x'), 'youtube.com');
});
test('banners: plantillas válidas, emojis 1 o 5, GIF solo con plan', () => {
  assert.deepEqual(K.cleanBanner({ t: 'tpl', id: 'futbol' }), { t: 'tpl', id: 'futbol' });
  assert.equal(K.cleanBanner({ t: 'tpl', id: 'nope' }), null);
  assert.deepEqual(K.cleanBanner({ t: 'emoji', e: ['🔥', '⚽', '🏀'] }), { t: 'emoji', e: ['🔥'] });
  assert.equal(K.cleanBanner({ t: 'emoji', e: ['🔥', '⚽', '🏀', '💸', '🌴', '😎'] }).e.length, 5);
  assert.equal(K.cleanBanner({ t: 'emoji', e: ['<b>', 'abc'] }), null);
  assert.equal(K.cleanBanner({ t: 'gif', v: 1 }), null);
  assert.deepEqual(K.cleanBanner({ t: 'gif', v: 1 }, { full: true }), { t: 'gif', v: 1 });
  for (const id of K.TPLS) assert.match(K.tplSvg(id), /^<svg[\s\S]+<\/svg>$/);
  assert.ok(!K.emojiSvg(['<script>']).includes('<script>'));
});
test('búsqueda: sin tildes ni mayúsculas, con trozo resaltado; ilike seguro', () => {
  assert.ok(K.matches('Mañana entreno en el GIMNASIO', 'gimnasio'));
  assert.ok(K.matches('Canción', 'cancion'));
  const s = K.snippet('Hola, ¿quedamos mañana para correr?', 'MAÑANA');
  assert.deepEqual(s.filter(x => x.hit).map(x => x.t), ['mañana']);
  assert.equal(K.ilikeSafe('a%b_c*,(d)'), 'a b c d');
});
