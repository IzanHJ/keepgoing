/* KeepGoing — cifrado de la Libreta en el dispositivo (Web Crypto: PBKDF2-SHA256 → AES-GCM 256).
   v2: los datos se cifran con una clave aleatoria («clave de datos»). Esa clave se guarda envuelta con la contraseña
   (cabecera que viaja con la copia en la nube) y, opcionalmente, en cada dispositivo con un PIN o con la huella / Face ID.
   v1 (antiguo): la clave salía directamente de la contraseña; se sigue pudiendo abrir y se migra a v2 al abrirla. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KGVault = api;
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';
  const ITER = 310000, PIN_ITER = 150000, CHECK = 'keepgoing-libreta-ok';
  const cr = () => (root.crypto || globalThis.crypto);
  const available = () => !!(cr() && cr().subtle);
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = buf => { let s = ''; const a = new Uint8Array(buf); for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const rand = n => cr().getRandomValues(new Uint8Array(n));

  async function deriveKey(password, saltB64, iter = ITER) {
    const base = await cr().subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return cr().subtle.deriveKey({ name: 'PBKDF2', salt: unb64(saltB64), iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  // Clave de datos (32 bytes) → clave AES-GCM no exportable
  const importRaw = raw => cr().subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  async function encBytes(key, bytes) { const iv = rand(12); return { iv: b64(iv), ct: b64(await cr().subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes)) }; }
  async function decBytes(key, box) { return new Uint8Array(await cr().subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.ct))); }
  async function encrypt(key, obj) { return encBytes(key, enc.encode(JSON.stringify(obj))); }
  // Devuelve el objeto o lanza si la clave no es la correcta o los datos se han alterado
  async function decrypt(key, box) { return JSON.parse(dec.decode(await decBytes(key, box))); }

  async function wrapHeader(password, raw, vid, check) {
    const salt = b64(rand(16)), pk = await deriveKey(password, salt);
    return { v: 2, vid, kdf: 'PBKDF2-SHA256', iter: ITER, salt, wrap: await encBytes(pk, raw), check };
  }
  // Crea la caja fuerte: clave de datos nueva, envuelta con la contraseña
  async function create(password) {
    const raw = rand(32), key = await importRaw(raw);
    const header = await wrapHeader(password, raw, b64(rand(9)), await encrypt(key, CHECK));
    return { key, raw, header };
  }
  // Abre con la contraseña: { key, raw } (v2), { key, raw: null, legacy: true } (v1) o null si no es correcta
  async function open(password, header) {
    try {
      const pk = await deriveKey(password, header.salt, header.iter || ITER);
      if (header.v >= 2) { const raw = await decBytes(pk, header.wrap), key = await importRaw(raw); return (await verify(key, header)) ? { key, raw } : null; }
      return (await decrypt(pk, header.check)) === CHECK ? { key: pk, raw: null, legacy: true } : null;
    } catch (e) { return null; }
  }
  // ¿Esta clave de datos abre esta caja fuerte?
  async function verify(key, header) { try { return (await decrypt(key, header.check)) === CHECK; } catch (e) { return false; } }
  // Cambiar la contraseña sin volver a cifrar los datos (misma clave de datos, nueva envoltura)
  const rewrap = (password, raw, header) => wrapHeader(password, raw, header.vid, header.check);
  // Identidad de la caja fuerte (cambia solo si se crea de nuevo)
  const vidOf = h => (h ? h.vid || h.salt : null);

  // PIN de 4 cifras: envuelve la clave de datos (solo se guarda en el dispositivo, nunca en la nube)
  const isPin = s => /^\d{4}$/.test(String(s));
  async function pinWrap(pin, raw) { const salt = b64(rand(16)); return { salt, iter: PIN_ITER, box: await encBytes(await deriveKey(pin, salt, PIN_ITER), raw) }; }
  async function pinUnwrap(pin, rec) { try { return await decBytes(await deriveKey(pin, rec.salt, rec.iter || PIN_ITER), rec.box); } catch (e) { return null; } }

  return { available, create, open, verify, rewrap, vidOf, encrypt, decrypt, encBytes, decBytes, importRaw, deriveKey, isPin, pinWrap, pinUnwrap, b64, unb64, ITER, PIN_ITER, CHECK };
});
