/* KeepGoing v1.57 — piezas sin pantalla del Chat moderno:
   · leer paquetes de stickers .wastickers (un .zip con .webp/.png, title.txt, author.txt y la bandeja)
   · plantillas de banner del perfil amplio (SVG propio, sin imágenes de fuera) y banner de emoticonos
   · limpiar enlaces y banners
   · búsqueda sin tildes ni mayúsculas, con resaltado
   Funciona en el navegador (window.KGChat) y en Node (require) para las pruebas. */
(function (root) {
  'use strict';

  /* ---------- ZIP (solo lectura): directorio central + inflate con DecompressionStream ---------- */
  const u16 = (b, o) => b[o] | (b[o + 1] << 8);
  const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
  async function inflateRaw(bytes) {
    if (typeof DecompressionStream === 'undefined') throw new Error('nozip');
    const ds = new DecompressionStream('deflate-raw');
    const out = new Response(new Blob([bytes]).stream().pipeThrough(ds));
    return new Uint8Array(await out.arrayBuffer());
  }
  // Devuelve [{ name, bytes }] de un .zip (método 0 = guardado, 8 = deflate). Ignora carpetas y archivos de sistema.
  async function unzip(buf, { maxFiles = 200, maxBytes = 30e6 } = {}) {
    const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let eocd = -1;
    for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (u32(b, i) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('notzip');
    const n = u16(b, eocd + 10), cdOff = u32(b, eocd + 16), out = [];
    let p = cdOff, total = 0;
    const dec = new TextDecoder();
    for (let k = 0; k < n && k < maxFiles; k++) {
      if (u32(b, p) !== 0x02014b50) throw new Error('badzip');
      const method = u16(b, p + 10), csize = u32(b, p + 20), usize = u32(b, p + 24);
      const nl = u16(b, p + 28), xl = u16(b, p + 30), cl = u16(b, p + 32), lho = u32(b, p + 42);
      const name = dec.decode(b.subarray(p + 46, p + 46 + nl));
      p += 46 + nl + xl + cl;
      if (/\/$/.test(name) || /(^|\/)(__MACOSX|\.DS_Store)/.test(name)) continue;
      if (u32(b, lho) !== 0x04034b50) throw new Error('badzip');
      const start = lho + 30 + u16(b, lho + 26) + u16(b, lho + 28), raw = b.subarray(start, start + csize);
      total += usize; if (total > maxBytes) throw new Error('big');
      let bytes;
      if (method === 0) bytes = raw.slice();
      else if (method === 8) bytes = await inflateRaw(raw);
      else continue;
      out.push({ name, bytes });
    }
    return out;
  }
  const sniff = bytes => {
    const s = String.fromCharCode(...bytes.subarray(0, 12));
    if (s.startsWith('RIFF') && s.slice(8, 12) === 'WEBP') return 'image/webp';
    if (bytes[0] === 0x89 && s.slice(1, 4) === 'PNG') return 'image/png';
    if (s.startsWith('GIF8')) return 'image/gif';
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
    return '';
  };
  // Paquete de WhatsApp (.wastickers): { title, author, tray: {bytes,mime}|null, stickers: [{ name, bytes, mime }] }
  async function readWaStickers(buf) {
    const files = await unzip(buf), dec = new TextDecoder();
    const txt = re => { const f = files.find(x => re.test(x.name.split('/').pop())); return f ? dec.decode(f.bytes).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 60) : ''; };
    const imgs = files.map(f => ({ ...f, mime: sniff(f.bytes) })).filter(f => f.mime);
    // La bandeja (icono del paquete) suele ser el único PNG; los stickers son .webp
    const webps = imgs.filter(f => f.mime === 'image/webp');
    let tray = imgs.find(f => /tray/i.test(f.name)) || (webps.length ? imgs.find(f => f.mime === 'image/png') : null) || null;
    const num = s => { const m = /(\d+)\.\w+$/.exec(s); return m ? +m[1] : 1e9; };
    const stickers = imgs.filter(f => f !== tray).sort((a, b) => num(a.name) - num(b.name) || a.name.localeCompare(b.name));
    if (!stickers.length) throw new Error('empty');
    return { title: txt(/^title\.txt$/i), author: txt(/^author\.txt$/i), tray: tray ? { bytes: tray.bytes, mime: tray.mime } : null, stickers };
  }
  const isPack = (name, type) => /\.(wastickers|zip)$/i.test(name || '') || /zip/.test(type || '');

  /* ---------- enlaces ---------- */
  function cleanLinks(list, max = 5) {
    const out = [];
    for (const x of Array.isArray(list) ? list : []) {
      if (!x || typeof x !== 'object') continue;
      let u = String(x.u || '').trim();
      if (!u) continue;
      if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
      if (!/^https?:\/\/[^\s<>"]{3,250}$/i.test(u)) continue;
      let host; try { host = new URL(u).hostname; } catch (e) { continue; }
      if (!host || !host.includes('.')) continue;
      out.push({ u, l: String(x.l || '').trim().slice(0, 40) });
      if (out.length >= max) break;
    }
    return out;
  }
  const linkHost = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };

  /* ---------- banners ---------- */
  const TPLS = ['futbol', 'baloncesto', 'voleibol', 'dinero', 'ensueno', 'paraiso1', 'paraiso2', 'paraiso3', 'paraiso4', 'paraiso5', 'manos'];
  const EMOJI_RE = /\p{Extended_Pictographic}/u;
  function cleanBanner(b, { full = false } = {}) {
    if (!b || typeof b !== 'object') return null;
    if (b.t === 'tpl' && TPLS.includes(b.id)) return { t: 'tpl', id: b.id };
    if (b.t === 'emoji') {
      const e = (Array.isArray(b.e) ? b.e : []).map(x => String(x || '').trim()).filter(x => x && x.length <= 16 && EMOJI_RE.test(x) && !/[A-Za-z0-9<>"'&\s]/.test(x));
      const n = e.length >= 5 ? 5 : e.length ? 1 : 0;
      return n ? { t: 'emoji', e: e.slice(0, n) } : null;
    }
    if (b.t === 'img') return { t: 'img', v: +b.v || 0 };
    if (b.t === 'gif') return full ? { t: 'gif', v: +b.v || 0 } : null;
    return null;
  }
  // Generador pseudoaleatorio estable (los banners salen siempre iguales)
  const rnd = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const W = 600, H = 220;
  const svg = (inner, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs>${inner}</svg>`;
  const lg = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  const cloud = (x, y, s, o = 1) => `<g transform="translate(${x} ${y}) scale(${s})" opacity="${o}" fill="#fff"><ellipse cx="0" cy="10" rx="46" ry="16"/><circle cx="-18" cy="0" r="18"/><circle cx="6" cy="-8" r="24"/><circle cx="28" cy="4" r="16"/></g>`;
  const palm = (x, y, s, c = '#1d4d3a') => `<g transform="translate(${x} ${y}) scale(${s})" fill="${c}"><path d="M0 0 C 4 -40, 10 -80, 22 -112 L 27 -110 C 16 -78, 10 -40, 7 0 Z"/><g transform="translate(24 -112)"><path d="M0 0 C -20 -18, -50 -14, -66 6 C -44 -6, -22 -4, 0 0Z"/><path d="M0 0 C 18 -22, 50 -22, 66 -2 C 44 -12, 22 -8, 0 0Z"/><path d="M0 0 C -8 -28, -30 -40, -50 -38 C -28 -28, -14 -16, 0 0Z"/><path d="M0 0 C 10 -26, 32 -36, 52 -32 C 32 -26, 16 -14, 0 0Z"/><path d="M0 0 C -24 4, -44 22, -48 40 C -32 22, -16 10, 0 0Z"/><path d="M0 0 C 24 2, 44 18, 50 36 C 34 20, 16 8, 0 0Z"/></g></g>`;
  const ball = (x, y, r, fill, lines) => `<g transform="translate(${x} ${y})"><circle r="${r}" fill="${fill}"/>${lines}</g>`;
  const BUILD = {
    futbol: () => {
      let s = '';
      for (let i = 0; i < 12; i++) s += `<rect x="${i * 50}" y="0" width="50" height="${H}" fill="${i % 2 ? '#2f9e44' : '#37b24d'}"/>`;
      s += `<g fill="none" stroke="#fff" stroke-width="4" opacity=".85"><rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="4"/><line x1="300" y1="14" x2="300" y2="${H - 14}"/><circle cx="300" cy="110" r="42"/><rect x="14" y="60" width="70" height="100"/><rect x="${W - 84}" y="60" width="70" height="100"/></g><circle cx="300" cy="110" r="5" fill="#fff"/>`;
      s += ball(470, 150, 26, '#fff', '<path d="M0 -10 L9.5 -3 L6 8 L-6 8 L-9.5 -3Z" fill="#212529"/><g stroke="#212529" stroke-width="2.5"><line x1="0" y1="-10" x2="0" y2="-26"/><line x1="9.5" y1="-3" x2="24" y2="-8"/><line x1="6" y1="8" x2="15" y2="21"/><line x1="-6" y1="8" x2="-15" y2="21"/><line x1="-9.5" y1="-3" x2="-24" y2="-8"/></g>');
      return svg(s + '<rect width="600" height="220" fill="url(#vg)"/>', lg('vg', [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.25)']]));
    },
    baloncesto: () => {
      let s = '<rect width="600" height="220" fill="url(#wd)"/>';
      for (let i = 0; i < 16; i++) s += `<line x1="0" y1="${i * 14}" x2="600" y2="${i * 14}" stroke="#a0522d" stroke-opacity=".25"/>`;
      s += `<g fill="none" stroke="#fff" stroke-width="4" opacity=".9"><line x1="300" y1="0" x2="300" y2="220"/><circle cx="300" cy="110" r="44"/><path d="M0 30 H 120 A 80 80 0 0 1 120 190 H 0"/><path d="M600 30 H 480 A 80 80 0 0 0 480 190 H 600"/></g><circle cx="300" cy="110" r="44" fill="#e8590c" opacity=".5"/>`;
      s += ball(150, 110, 30, '#e8590c', '<g fill="none" stroke="#212529" stroke-width="2.5"><circle r="30"/><line x1="-30" y1="0" x2="30" y2="0"/><line x1="0" y1="-30" x2="0" y2="30"/><path d="M-21 -21 C -8 -8, -8 8, -21 21"/><path d="M21 -21 C 8 -8, 8 8, 21 21"/></g>');
      return svg(s, lg('wd', [[0, '#e3a869'], [1, '#c98545']]));
    },
    voleibol: () => {
      let s = '<rect width="600" height="130" fill="url(#sk)"/><rect y="130" width="600" height="90" fill="url(#sd)"/>';
      s += cloud(90, 40, 1, .9) + cloud(420, 30, .8, .8);
      s += '<circle cx="520" cy="44" r="22" fill="#ffe066"/>';
      s += '<g stroke="#343a40" stroke-width="5"><line x1="120" y1="80" x2="120" y2="190"/><line x1="480" y1="80" x2="480" y2="190"/></g><rect x="120" y="82" width="360" height="44" fill="none" stroke="#fff" stroke-width="3"/>';
      for (let x = 132; x < 480; x += 12) s += `<line x1="${x}" y1="82" x2="${x}" y2="126" stroke="#fff" stroke-opacity=".7"/>`;
      for (let y = 94; y < 126; y += 12) s += `<line x1="120" y1="${y}" x2="480" y2="${y}" stroke="#fff" stroke-opacity=".7"/>`;
      s += ball(300, 52, 22, '#fff', '<g fill="none" stroke="#1c7ed6" stroke-width="3"><path d="M-20 -6 C -6 -4, 6 -14, 8 -21"/><path d="M-12 18 C -8 4, 6 -2, 21 -4"/><path d="M14 16 C 4 10, 2 -4, -8 -19"/></g><circle r="22" fill="none" stroke="#adb5bd" stroke-width="1.5"/>');
      return svg(s, lg('sk', [[0, '#74c0fc'], [1, '#d0ebff']]) + lg('sd', [[0, '#ffe8a3'], [1, '#f2c66d']]));
    },
    dinero: () => {
      const r = rnd(7); let s = '<rect width="600" height="220" fill="url(#mn)"/>';
      for (let i = 0; i < 9; i++) { const x = r() * 560, y = r() * 180, a = r() * 50 - 25; s += `<g transform="translate(${x} ${y}) rotate(${a})" opacity=".9"><rect width="96" height="46" rx="5" fill="#8ce99a" stroke="#2b8a3e" stroke-width="2"/><circle cx="48" cy="23" r="13" fill="none" stroke="#2b8a3e" stroke-width="2"/><text x="48" y="29" font-size="17" font-weight="800" text-anchor="middle" fill="#2b8a3e" font-family="sans-serif">€</text></g>`; }
      for (let i = 0; i < 14; i++) { const x = r() * 600, y = r() * 220, k = 12 + r() * 12; s += `<g transform="translate(${x} ${y})"><circle r="${k}" fill="#fcc419" stroke="#e67700" stroke-width="2.5"/><circle r="${k * .62}" fill="none" stroke="#e67700" stroke-width="1.5"/></g>`; }
      return svg(s, lg('mn', [[0, '#0b3d24'], [1, '#1f7a4a']], 1, 1));
    },
    // «Ensueño»: campiña pintada a la acuarela (cielo de verano, nubes grandes, colinas y un árbol solitario)
    ensueno: () => {
      let s = '<rect width="600" height="220" fill="url(#es)"/>';
      s += cloud(120, 70, 2.2, .95) + cloud(380, 50, 1.7, .9) + cloud(540, 96, 1.2, .85);
      s += '<path d="M0 150 C 120 110, 220 130, 320 140 S 520 112, 600 128 V220 H0Z" fill="#8fc77a"/><path d="M0 172 C 140 150, 260 168, 380 166 S 540 150, 600 160 V220 H0Z" fill="#5fa85a"/><path d="M0 196 C 160 184, 300 200, 600 188 V220 H0Z" fill="#3f8a4b"/>';
      s += '<g transform="translate(430 150)"><rect x="-4" y="-30" width="8" height="34" fill="#5b3a29"/><circle cx="0" cy="-44" r="26" fill="#2f7a3f"/><circle cx="-18" cy="-34" r="18" fill="#3a8c49"/><circle cx="18" cy="-34" r="18" fill="#3a8c49"/></g>';
      const r = rnd(11); for (let i = 0; i < 26; i++) s += `<circle cx="${r() * 600}" cy="${170 + r() * 46}" r="${1.6 + r() * 1.6}" fill="${['#fff', '#ffe066', '#ffa8a8'][i % 3]}"/>`;
      return svg(s, lg('es', [[0, '#6ab7f0'], [.7, '#bfe3fb'], [1, '#e8f6ff']]));
    },
    // Paraíso 1: playa tropical
    paraiso1: () => svg('<rect width="600" height="120" fill="url(#p1s)"/><rect y="110" width="600" height="60" fill="url(#p1w)"/><path d="M0 160 C 160 150, 380 176, 600 156 V220 H0Z" fill="#f6dfa4"/><path d="M0 162 C 160 152, 380 178, 600 158" stroke="#fff" stroke-width="4" fill="none" opacity=".8"/>' + cloud(160, 40, 1, .9) + cloud(380, 56, .7, .8) + '<circle cx="470" cy="50" r="24" fill="#fff3bf"/>' + palm(80, 200, 1.1) + palm(520, 210, .9, '#245e45'),
      lg('p1s', [[0, '#4dabf7'], [1, '#c5f6fa']]) + lg('p1w', [[0, '#22b8cf'], [1, '#3bc9db']])),
    // Paraíso 2: atolón al atardecer
    paraiso2: () => svg('<rect width="600" height="140" fill="url(#p2s)"/><circle cx="300" cy="130" r="54" fill="#ffd43b" opacity=".95"/><rect y="130" width="600" height="90" fill="url(#p2w)"/><g fill="#ffd43b" opacity=".55">' + [0, 1, 2, 3, 4].map(i => `<rect x="${250 + i * 4}" y="${142 + i * 14}" width="${100 - i * 8}" height="3" rx="1.5"/>`).join('') + '</g><path d="M40 136 C 70 124, 120 124, 150 136Z" fill="#3b1d4a"/><path d="M430 136 C 470 120, 540 122, 580 136Z" fill="#3b1d4a"/>' + palm(110, 136, .55, '#2b1236') + palm(500, 136, .5, '#2b1236'),
      lg('p2s', [[0, '#5f3dc4'], [.5, '#f06595'], [1, '#ffa94d']]) + lg('p2w', [[0, '#d6336c'], [1, '#5f3dc4']])),
    // Paraíso 3: cascada en la selva
    paraiso3: () => {
      let s = '<rect width="600" height="220" fill="url(#p3s)"/><path d="M220 0 H380 L360 220 H240Z" fill="#2b5d3a"/><path d="M262 0 H338 L330 170 H270Z" fill="url(#p3f)"/>';
      for (let i = 0; i < 6; i++) s += `<path d="M${268 + i * 12} 0 V170" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>`;
      s += '<ellipse cx="300" cy="182" rx="120" ry="24" fill="#63e6be"/><ellipse cx="300" cy="176" rx="70" ry="10" fill="#fff" opacity=".7"/>';
      const r = rnd(5); for (let i = 0; i < 18; i++) { const x = i < 9 ? r() * 220 : 380 + r() * 220, y = r() * 220, k = 26 + r() * 30; s += `<circle cx="${x}" cy="${y}" r="${k}" fill="${['#2b8a3e', '#37b24d', '#1e6b30'][i % 3]}"/>`; }
      return svg(s, lg('p3s', [[0, '#96f2d7'], [1, '#38d9a9']]) + lg('p3f', [[0, '#e3fafc'], [1, '#99e9f2']]));
    },
    // Paraíso 4: lago de montaña
    paraiso4: () => svg('<rect width="600" height="140" fill="url(#p4s)"/><path d="M0 140 L110 40 L170 92 L260 20 L360 120 L430 60 L520 112 L600 70 V140Z" fill="#5c7cfa"/><path d="M260 20 L292 52 L276 50 L262 62 L246 48 L232 50Z M110 40 L134 62 L112 58 L96 66Z" fill="#fff"/><path d="M0 140 L120 100 L220 128 L340 96 L470 130 L600 108 V140Z" fill="#2f9e44"/><rect y="140" width="600" height="80" fill="url(#p4w)"/><path d="M0 140 L110 220 L170 172 L260 240 L360 150" fill="none" stroke="#4c6ef5" stroke-opacity=".35" stroke-width="22"/>' + cloud(470, 34, .8, .9),
      lg('p4s', [[0, '#a5d8ff'], [1, '#e7f5ff']]) + lg('p4w', [[0, '#4dabf7'], [1, '#1971c2']])),
    // Paraíso 5: aurora boreal sobre el fiordo
    paraiso5: () => {
      const r = rnd(3); let s = '<rect width="600" height="220" fill="url(#p5s)"/>';
      for (let i = 0; i < 60; i++) s += `<circle cx="${r() * 600}" cy="${r() * 120}" r="${.6 + r()}" fill="#fff" opacity="${.4 + r() * .6}"/>`;
      s += '<path d="M-20 90 C 100 20, 200 120, 320 50 S 520 30, 640 80" stroke="url(#p5a)" stroke-width="46" fill="none" opacity=".75"/><path d="M-20 120 C 120 70, 240 130, 360 90 S 540 70, 640 110" stroke="url(#p5a)" stroke-width="24" fill="none" opacity=".45"/>';
      s += '<path d="M0 220 V150 L80 110 L150 160 L240 120 L330 170 L420 116 L520 160 L600 130 V220Z" fill="#0b1d2a"/><rect y="186" width="600" height="34" fill="#102a43" opacity=".9"/>';
      return svg(s, lg('p5s', [[0, '#0b132b'], [1, '#1c2541']]) + lg('p5a', [[0, '#38d9a9'], [.5, '#69db7c'], [1, '#9775fa']], 1, 0));
    }
  };
  // «Manos libres»: manos dibujadas (mano abierta que saluda, paz, pulgar arriba y choque) repartidas por el fondo
  const HAND = {
    open: c => `<g fill="${c}" stroke="rgba(0,0,0,.25)" stroke-width="1.5"><rect x="-18" y="-8" width="36" height="34" rx="12"/>${[-15, -5, 5, 15].map((x, i) => `<rect x="${x - 4.5}" y="${-34 + Math.abs(i - 1.5) * 4}" width="9" height="${30 - Math.abs(i - 1.5) * 4}" rx="4.5"/>`).join('')}<rect x="-30" y="-2" width="9" height="22" rx="4.5" transform="rotate(-38 -26 14)"/></g>`,
    peace: c => `<g fill="${c}" stroke="rgba(0,0,0,.25)" stroke-width="1.5"><rect x="-18" y="-4" width="36" height="30" rx="12"/><rect x="-14" y="-38" width="9" height="36" rx="4.5" transform="rotate(-10 -10 -4)"/><rect x="2" y="-38" width="9" height="36" rx="4.5" transform="rotate(10 6 -4)"/><rect x="-22" y="0" width="30" height="10" rx="5"/><rect x="-26" y="2" width="9" height="18" rx="4.5" transform="rotate(-30 -22 12)"/></g>`,
    thumb: c => `<g fill="${c}" stroke="rgba(0,0,0,.25)" stroke-width="1.5"><rect x="-16" y="-6" width="34" height="34" rx="11"/>${[0, 1, 2, 3].map(i => `<rect x="10" y="${-4 + i * 8}" width="14" height="8" rx="4"/>`).join('')}<rect x="-12" y="-36" width="11" height="34" rx="5.5"/></g>`,
    bump: c => `<g fill="${c}" stroke="rgba(0,0,0,.25)" stroke-width="1.5"><rect x="-20" y="-16" width="40" height="32" rx="12"/>${[0, 1, 2, 3].map(i => `<rect x="12" y="${-15 + i * 8}" width="14" height="8" rx="4"/>`).join('')}<path d="M-34 0 h-14 M-34 -12 l-10 -8 M-34 12 l-10 8" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g>`
  };
  BUILD.manos = () => {
    const r = rnd(23), tones = ['#ffd8b1', '#f1c27d', '#e0ac69', '#c68642', '#8d5524'], kinds = Object.keys(HAND);
    let s = '<rect width="600" height="220" fill="url(#mh)"/>', k = 0;
    for (let y = 40; y < 240; y += 70) for (let x = 30 + (k % 2) * 40; x < 640; x += 92) {
      const a = Math.round(r() * 60 - 30), sc = (.8 + r() * .5).toFixed(2);
      s += `<g transform="translate(${(x + r() * 20).toFixed(1)} ${(y + r() * 14).toFixed(1)}) rotate(${a}) scale(${sc})">${HAND[kinds[k % kinds.length]](tones[(k * 3 + 1) % tones.length])}</g>`; k++;
    }
    return svg(s, lg('mh', [[0, '#ffc9c9'], [.5, '#ffe3e3'], [1, '#d3f9d8']], 1, 1));
  };
  const tplSvg = id => (BUILD[id] || BUILD.ensueno)();
  // Emoticonos repartidos por todo el banner (1 o 5 distintos), con tamaño y giro variados
  function emojiSvg(list) {
    const e = (list || []).filter(Boolean); if (!e.length) return tplSvg('ensueno');
    const r = rnd(e.join('').length * 31 + 17); let s = '<rect width="600" height="220" fill="url(#eg)"/>';
    let k = 0;
    for (let y = 18; y < 240; y += 46) for (let x = (k % 2) * 30; x < 640; x += 62) {
      const em = e[(k++) % e.length], sz = 26 + r() * 16, a = Math.round(r() * 50 - 25);
      s += `<text x="${(x + r() * 14).toFixed(1)}" y="${(y + r() * 10).toFixed(1)}" font-size="${sz.toFixed(1)}" transform="rotate(${a} ${x} ${y})" text-anchor="middle" dominant-baseline="middle">${em.replace(/[<>&"]/g, '')}</text>`;
    }
    return svg(s, lg('eg', [[0, '#f3d9fa'], [1, '#d0ebff']], 1, 1));
  }
  const svgUrl = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);

  /* ---------- búsqueda ---------- */
  const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const matches = (text, q) => { const f = fold(q).trim(); return !!f && fold(text).includes(f); };
  // Trozos [{ t, hit }] alrededor de la primera coincidencia (para pintar el resaltado sin innerHTML del usuario)
  function snippet(text, q, around = 40) {
    const s = String(text || '').replace(/\s+/g, ' '), f = fold(s), k = fold(q).trim(), i = k ? f.indexOf(k) : -1;
    if (i < 0) return [{ t: s.slice(0, around * 2), hit: false }];
    const a = Math.max(0, i - around), b = Math.min(s.length, i + k.length + around);
    return [{ t: (a ? '…' : '') + s.slice(a, i), hit: false }, { t: s.slice(i, i + k.length), hit: true }, { t: s.slice(i + k.length, b) + (b < s.length ? '…' : ''), hit: false }];
  }
  // Texto seguro para buscar en PostgREST (ilike): sin comodines ni caracteres de la sintaxis de filtros
  const ilikeSafe = q => String(q || '').replace(/[%_*,()\\"'.:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);

  const api = { unzip, readWaStickers, isPack, sniff, cleanLinks, linkHost, TPLS, cleanBanner, tplSvg, emojiSvg, svgUrl, fold, matches, snippet, ilikeSafe };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KGChat = api;
})(typeof window !== 'undefined' ? window : globalThis);
