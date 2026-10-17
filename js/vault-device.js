/* KeepGoing — desbloqueo rápido de la Libreta en ESTE dispositivo: PIN de 4 cifras o huella / Face ID (WebAuthn).
   Nada de esto viaja a la nube. Se guarda en IndexedDB, cifrado además con una clave propia del navegador que no se
   puede exportar: copiar esos datos a otro navegador no sirve. Tras 5 PIN fallidos el PIN se borra y hace falta la contraseña. */
(function (root) {
  'use strict';
  const V = root.KGVault, DB = 'keepgoing-device', ST = 'unlock', MAX_FAILS = 5;
  const enc = new TextEncoder(), dec = new TextDecoder();
  const rand = n => crypto.getRandomValues(new Uint8Array(n));
  const supported = () => !!(root.indexedDB && root.crypto && crypto.subtle);

  function db() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(ST);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  async function op(mode, fn) {
    const d = await db();
    return new Promise((res, rej) => { const tx = d.transaction(ST, mode), q = fn(tx.objectStore(ST)); tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error); });
  }
  const get = k => op('readonly', s => s.get(k));
  const put = (k, v) => op('readwrite', s => s.put(v, k));
  const del = k => op('readwrite', s => s.delete(k));

  // Clave del dispositivo (AES-GCM, no exportable). IndexedDB guarda el objeto CryptoKey tal cual.
  async function devKey() {
    let k = await get('devkey');
    if (!k) { k = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); await put('devkey', k); }
    return k;
  }
  const record = async vid => (vid && (await get('v:' + vid))) || {};
  const store = (vid, rec) => put('v:' + vid, rec);
  async function methods(vid) {
    if (!supported() || !vid) return { pin: false, bio: false };
    try { const r = await record(vid); return { pin: !!r.pin, bio: !!r.bio, bioMode: r.bio && r.bio.mode }; } catch (e) { return { pin: false, bio: false }; }
  }

  /* ---------- PIN ---------- */
  async function setPin(vid, pin, raw) {
    if (!V.isPin(pin)) throw new Error('pin');
    const inner = await V.pinWrap(pin, raw), dk = await devKey(), rec = await record(vid);
    rec.pin = { salt: inner.salt, iter: inner.iter, box: await V.encBytes(dk, enc.encode(JSON.stringify(inner.box))), fails: 0 };
    await store(vid, rec);
  }
  // { ok, raw } · { ok: false, left } · { ok: false, gone: true } (sin PIN o borrado por demasiados intentos)
  async function unlockPin(vid, pin) {
    const rec = await record(vid); if (!rec.pin) return { ok: false, gone: true };
    let inner;
    try { inner = JSON.parse(dec.decode(await V.decBytes(await devKey(), rec.pin.box))); } catch (e) { delete rec.pin; await store(vid, rec); return { ok: false, gone: true }; }
    const raw = await V.pinUnwrap(pin, { salt: rec.pin.salt, iter: rec.pin.iter, box: inner });
    if (raw) { rec.pin.fails = 0; await store(vid, rec); return { ok: true, raw }; }
    rec.pin.fails = (rec.pin.fails || 0) + 1;
    if (rec.pin.fails >= MAX_FAILS) { delete rec.pin; await store(vid, rec); return { ok: false, gone: true }; }
    await store(vid, rec); return { ok: false, left: MAX_FAILS - rec.pin.fails };
  }
  async function clearPin(vid) { const rec = await record(vid); delete rec.pin; await store(vid, rec); }

  /* ---------- huella / Face ID (WebAuthn con autenticador del propio dispositivo) ----------
     Si el dispositivo admite la extensión PRF, la propia huella da el secreto que abre la clave («prf»).
     Si no, la huella hace de llave de paso y la clave queda protegida con la clave del dispositivo («gate»). */
  async function bioAvailable() {
    try { return !!(root.PublicKeyCredential && root.isSecureContext && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch (e) { return false; }
  }
  const prfKey = secret => crypto.subtle.importKey('raw', secret, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  const uvFlag = a => { try { return !!(new Uint8Array(a.response.authenticatorData)[32] & 4); } catch (e) { return false; } };
  async function assert(credId, salt) {
    const a = await navigator.credentials.get({ publicKey: { challenge: rand(32), allowCredentials: [{ type: 'public-key', id: V.unb64(credId) }], userVerification: 'required', timeout: 60000, extensions: { prf: { eval: { first: salt } } } } });
    const ext = a.getClientExtensionResults ? a.getClientExtensionResults() : {};
    return { secret: ext.prf && ext.prf.results && ext.prf.results.first, uv: uvFlag(a) };
  }
  async function setBio(vid, raw, label) {
    const prfSalt = rand(32);
    const cred = await navigator.credentials.create({ publicKey: {
      challenge: rand(32), rp: { name: 'KeepGoing' },
      user: { id: rand(16), name: label || 'KeepGoing', displayName: label || 'KeepGoing' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
      timeout: 60000, extensions: { prf: { eval: { first: prfSalt } } }
    } });
    const credId = V.b64(cred.rawId), ext = cred.getClientExtensionResults ? cred.getClientExtensionResults() : {};
    let secret = ext.prf && ext.prf.results && ext.prf.results.first;
    if (!secret && ext.prf && ext.prf.enabled) { try { secret = (await assert(credId, prfSalt)).secret; } catch (e) { secret = null; } }
    const dk = await devKey(); let box, mode;
    if (secret) { box = await V.encBytes(dk, enc.encode(JSON.stringify(await V.encBytes(await prfKey(secret), raw)))); mode = 'prf'; }
    else { box = await V.encBytes(dk, raw); mode = 'gate'; }
    const rec = await record(vid); rec.bio = { credId, mode, prfSalt: V.b64(prfSalt), box }; await store(vid, rec);
    return mode;
  }
  // Devuelve la clave de datos o null (cancelado o no verificado)
  async function unlockBio(vid) {
    const rec = await record(vid); if (!rec.bio) return null;
    const { credId, mode, prfSalt, box } = rec.bio;
    const r = await assert(credId, V.unb64(prfSalt));
    const dk = await devKey();
    if (mode === 'prf') {
      if (!r.secret) return null;
      const inner = JSON.parse(dec.decode(await V.decBytes(dk, box)));
      return V.decBytes(await prfKey(r.secret), inner);
    }
    if (!r.uv) return null;
    return V.decBytes(dk, box);
  }
  async function clearBio(vid) { const rec = await record(vid); delete rec.bio; await store(vid, rec); }
  async function forget(vid) { if (vid && supported()) try { await del('v:' + vid); } catch (e) { /* nada */ } }

  root.KGVaultDevice = { supported, methods, setPin, unlockPin, clearPin, bioAvailable, setBio, unlockBio, clearBio, forget, MAX_FAILS };
})(typeof self !== 'undefined' ? self : this);
