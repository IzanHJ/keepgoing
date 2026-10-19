/* KeepGoing — PDF mínimo (v1.19): texto con Helvetica, líneas, rectángulos y polígonos, sin librerías ni servidores.
   Se usa en el navegador (window.KGPdf) y en los tests de Node (require).
   Coordenadas en puntos (1/72 de pulgada) con el origen arriba a la izquierda, como en pantalla; el PDF se escribe al revés por dentro.
   El texto va con la codificación WinAnsi (español, inglés, € y comillas tipográficas); lo que no cabe en ella se cambia por algo parecido o se quita. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KGPdf = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Anchos de Helvetica y Helvetica-Bold (milésimas de em) para los caracteres 32–126
  const W_REG = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
  const W_BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];
  // Unicode → byte de WinAnsi (0x80–0x9F); de 0xA0 a 0xFF coincide con Latin-1
  const WIN = { 0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f };
  const SUBS = { 0x2212: '-', 0x2248: '~', 0x2264: '<=', 0x2265: '>=', 0x2192: '->', 0x2190: '<-', 0x00a0: ' ', 0x202f: ' ', 0x2009: ' ', 0x2007: ' ', 0x2011: '-', 0x2010: '-', 0x2715: 'x', 0x2713: 'v' };

  // Texto → lista de bytes WinAnsi
  function encode(str) {
    const out = [];
    for (const ch of String(str == null ? '' : str)) {
      const c = ch.codePointAt(0);
      if (c >= 0x20 && c <= 0x7e) out.push(c);
      else if (c >= 0xa1 && c <= 0xff) out.push(c);
      else if (WIN[c]) out.push(WIN[c]);
      else if (SUBS[c] != null) for (const s of SUBS[c]) out.push(s.charCodeAt(0));
      else {
        const base = ch.normalize('NFD')[0], b = base && base.codePointAt(0);
        if (b >= 0x20 && b <= 0x7e && b !== c) out.push(b);
        // emojis, selectores de variante y demás: fuera
      }
    }
    return out;
  }
  const charW = (b, bold) => {
    const tb = bold ? W_BOLD : W_REG;
    if (b >= 32 && b <= 126) return tb[b - 32];
    if (b === 0x80) return 556;
    if (b === 0x85 || b === 0x97) return 1000;
    if (b === 0x96) return 556;
    if (b >= 0x91 && b <= 0x94) return bold ? 278 : 222;
    if (b >= 0xc0) { const base = String.fromCharCode(b).normalize('NFD').charCodeAt(0); if (base >= 32 && base <= 126) return tb[base - 32]; }
    return 556;
  };
  const width = (str, size, bold) => encode(str).reduce((a, b) => a + charW(b, bold), 0) * size / 1000;

  // Parte un texto en líneas que caben en maxW (corta palabras muy largas si hace falta)
  function wrap(str, maxW, size, bold) {
    const lines = [];
    for (const para of String(str == null ? '' : str).split('\n')) {
      let cur = '';
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const next = cur ? cur + ' ' + word : word;
        if (width(next, size, bold) <= maxW) { cur = next; continue; }
        if (cur) lines.push(cur);
        cur = word;
        while (width(cur, size, bold) > maxW && cur.length > 1) {
          let n = cur.length - 1;
          while (n > 1 && width(cur.slice(0, n), size, bold) > maxW) n--;
          lines.push(cur.slice(0, n)); cur = cur.slice(n);
        }
      }
      lines.push(cur);
    }
    return lines;
  }

  const hex = c => {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(c || '').trim()) || /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(String(c || '').trim());
    if (!m) return [0, 0, 0];
    const h = m.length === 4 ? m[1] + m[1] + m[2] + m[2] + m[3] + m[3] : m[1];
    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  };
  // Mezcla un color con blanco (para rellenos suaves sin transparencias)
  const tint = (c, k) => { const [r, g, b] = hex(c); const f = v => Math.round((1 - k + k * v) * 255).toString(16).padStart(2, '0'); return '#' + f(r) + f(g) + f(b); };
  const n = v => (Math.round(v * 100) / 100).toString();
  const rgb = (c, op) => hex(c).map(n).join(' ') + ' ' + op;

  function create(o = {}) {
    const W = o.width || 595.28, H = o.height || 841.89;
    const pages = [];
    let ops = null;
    const doc = {
      W, H, margin: o.margin == null ? 40 : o.margin,
      get pageCount() { return pages.length; },
      addPage() { ops = []; pages.push(ops); doc.y = doc.margin; return doc; },
      // Si no caben h puntos más en la página, pasa a la siguiente
      ensure(h) { if (!ops || doc.y + h > H - doc.margin) doc.addPage(); return doc; },
      width, wrap,
      text(x, y, str, s = {}) {
        const size = s.size || 10, bold = !!s.bold, bytes = encode(str);
        if (!bytes.length) return 0;
        const w = bytes.reduce((a, b) => a + charW(b, bold), 0) * size / 1000;
        const x0 = s.align === 'right' ? x - w : s.align === 'center' ? x - w / 2 : x;
        let lit = '';
        for (const b of bytes) lit += b === 0x28 || b === 0x29 || b === 0x5c ? '\\' + String.fromCharCode(b) : String.fromCharCode(b);
        ops.push(`BT /${bold ? 'F2' : 'F1'} ${n(size)} Tf ${rgb(s.color || '#1f2737', 'rg')} ${n(x0)} ${n(H - y)} Td (${lit}) Tj ET`);
        return w;
      },
      line(x1, y1, x2, y2, s = {}) {
        ops.push(`q ${rgb(s.color || '#d4d8df', 'RG')} ${n(s.lw || 1)} w ${s.dash ? `[${s.dash.join(' ')}] 0 d ` : ''}${n(x1)} ${n(H - y1)} m ${n(x2)} ${n(H - y2)} l S Q`);
      },
      rect(x, y, w, h, s = {}) {
        const r = Math.min(s.r || 0, w / 2, h / 2), k = 0.5523 * r, X = x, Y = H - y - h;
        let path;
        if (!r) path = `${n(X)} ${n(Y)} ${n(w)} ${n(h)} re`;
        else path = [`${n(X + r)} ${n(Y)} m`, `${n(X + w - r)} ${n(Y)} l`, `${n(X + w - r + k)} ${n(Y)} ${n(X + w)} ${n(Y + r - k)} ${n(X + w)} ${n(Y + r)} c`, `${n(X + w)} ${n(Y + h - r)} l`,
          `${n(X + w)} ${n(Y + h - r + k)} ${n(X + w - r + k)} ${n(Y + h)} ${n(X + w - r)} ${n(Y + h)} c`, `${n(X + r)} ${n(Y + h)} l`, `${n(X + r - k)} ${n(Y + h)} ${n(X)} ${n(Y + h - r + k)} ${n(X)} ${n(Y + h - r)} c`,
          `${n(X)} ${n(Y + r)} l`, `${n(X)} ${n(Y + r - k)} ${n(X + r - k)} ${n(Y)} ${n(X + r)} ${n(Y)} c h`].join(' ');
        const paint = s.fill && s.stroke ? 'B' : s.fill ? 'f' : 'S';
        ops.push(`q ${s.fill ? rgb(s.fill, 'rg') + ' ' : ''}${s.stroke ? rgb(s.stroke, 'RG') + ' ' : ''}${n(s.lw || 1)} w ${path} ${paint} Q`);
      },
      // points: [[x, y], ...]
      poly(points, s = {}) {
        if (points.length < 2) return;
        const path = points.map(([x, y], i) => `${n(x)} ${n(H - y)} ${i ? 'l' : 'm'}`).join(' ') + (s.close ? ' h' : '');
        const paint = s.fill && s.stroke ? 'B' : s.fill ? 'f' : 'S';
        ops.push(`q 1 J 1 j ${s.fill ? rgb(s.fill, 'rg') + ' ' : ''}${s.stroke ? rgb(s.stroke, 'RG') + ' ' : ''}${n(s.lw || 1)} w ${path} ${paint} Q`);
      },
      // Recorre las páginas ya hechas (para el pie con «1/3»)
      forEachPage(fn) { const cur = ops; pages.forEach((p, i) => { ops = p; fn(i, pages.length); }); ops = cur; },
      circle(cx, cy, r, s = {}) { doc.rect(cx - r, cy - r, r * 2, r * 2, { ...s, r }); },
      // Devuelve los bytes del PDF (Uint8Array)
      output(meta = {}) {
        if (!pages.length) doc.addPage();
        const objs = [];
        const add = body => { objs.push(body); return objs.length; };
        const catalog = add(''), pagesId = add('');
        const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
        const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
        const kids = [];
        for (const p of pages) {
          const stream = p.join('\n');
          const cid = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
          kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${n(W)} ${n(H)}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${cid} 0 R >>`));
        }
        objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
        objs[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
        const lit = s => '(' + encode(s).map(b => b === 0x28 || b === 0x29 || b === 0x5c ? '\\' + String.fromCharCode(b) : String.fromCharCode(b)).join('') + ')';
        const info = add(`<< /Producer (KeepGoing)${meta.title ? ' /Title ' + lit(meta.title) : ''}${meta.date ? ` /CreationDate (D:${meta.date})` : ''} >>`);
        let out = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
        const offs = [];
        objs.forEach((body, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${body}\nendobj\n`; });
        const xref = out.length;
        out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map(o2 => String(o2).padStart(10, '0') + ' 00000 n \n').join('')}`;
        out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
        const bytes = new Uint8Array(out.length);
        for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
        return bytes;
      }
    };
    return doc;
  }

  return { create, encode, width, wrap, tint, hex };
});
