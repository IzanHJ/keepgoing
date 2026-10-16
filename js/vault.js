/* KeepGoing — cifrado de la Libreta en el dispositivo (Web Crypto: PBKDF2-SHA256 → AES-GCM 256).
   La clave sale de la contraseña del usuario y solo vive en memoria: sin contraseña no se puede leer. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KGVault = api;
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';
  const ITER = 310000, CHECK = 'keepgoing-libreta-ok';
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
  async function encrypt(key, obj) {
    const iv = rand(12);
    const ct = await cr().subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
    return { iv: b64(iv), ct: b64(ct) };
  }
  // Devuelve el objeto o lanza si la clave no es la correcta o los datos se han alterado
  async function decrypt(key, box) {
    const pt = await cr().subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.ct));
    return JSON.parse(dec.decode(pt));
  }
  // Crea la cabecera de la caja fuerte (sal + prueba cifrada para comprobar la contraseña)
  async function create(password) {
    const salt = b64(rand(16)), key = await deriveKey(password, salt);
    return { key, header: { v: 1, kdf: 'PBKDF2-SHA256', iter: ITER, salt, check: await encrypt(key, CHECK) } };
  }
  // Abre con la contraseña: devuelve la clave o null si no es correcta
  async function open(password, header) {
    try {
      const key = await deriveKey(password, header.salt, header.iter || ITER);
      return (await decrypt(key, header.check)) === CHECK ? key : null;
    } catch (e) { return null; }
  }
  return { available, create, open, encrypt, decrypt, ITER };
});
