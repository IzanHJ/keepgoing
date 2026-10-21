/* KeepGoing — PDF del Calendario de turnos (v1.20, traído de TurnoFlow): sin dependencias (PDF 1.4, Helvetica, A4 apaisado).
   Página 1: calendario del mes. Páginas siguientes: detalle día a día. Todo se mide con las métricas de Helvetica
   para recortar textos y que nada se solape ni se salga de su celda. Los emojis no existen en las fuentes estándar y se omiten. */
(function (root) {
  'use strict';
  const T = typeof module !== 'undefined' && module.exports ? require('./turns.js') : root.KGTurns;

  // Anchos de Helvetica (AFM) para ASCII 32..126, en milésimas de em
  const W = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
    1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
    333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
  const WIN = { '€': 0x80, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97 };

  /** Convierte a Latin-1/WinAnsi; lo que no existe (emojis, etc.) se descarta. */
  function win(s) {
    let o = '';
    for (const ch of String(s)) {
      const c = ch.codePointAt(0);
      if (WIN[ch] !== undefined) o += String.fromCharCode(WIN[ch]);
      else if ((c >= 32 && c <= 126) || (c >= 160 && c <= 255)) o += ch;
      else if (c === 9 || c === 10) o += ' ';
    }
    return o;
  }
  function wid(s, size, bold) {
    let w = 0;
    for (const ch of win(s)) {
      const c = ch.charCodeAt(0);
      if (c >= 32 && c <= 126) w += W[c - 32];
      else if (c >= 160 && c <= 255) { const b = ch.normalize('NFD').charCodeAt(0); w += b >= 32 && b <= 126 ? W[b - 32] : 556; } else w += 556;
    }
    return (w / 1000) * size * (bold ? 1.07 : 1); // el negrita real es algo más ancho: margen de seguridad
  }
  function fit(s, size, bold, maxW) {
    s = win(s);
    if (wid(s, size, bold) <= maxW) return s;
    while (s.length > 1 && wid(s + '..', size, bold) > maxW) s = s.slice(0, -1);
    return s + '..';
  }
  const esc = (s) => win(s).replace(/[\\()]/g, '\\$&');
  const n2 = (v) => (Math.round(v * 100) / 100).toString();
  const rgb = (hex) => { const v = parseInt(hex.slice(1), 16); return [(v >> 16) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]; };
  const col = (c) => c.map(n2).join(' ');
  const ink = (hex) => { const [r, g, b] = rgb(hex); return 0.299 * r + 0.587 * g + 0.114 * b > 0.63 ? [0.1, 0.11, 0.18] : [1, 1, 1]; };

  class Page {
    constructor(w, h) { this.w = w; this.h = h; this.ops = []; }
    rect(x, y, w, h, c) { this.ops.push(col(c) + ' rg ' + n2(x) + ' ' + n2(y) + ' ' + n2(w) + ' ' + n2(h) + ' re f'); }
    frame(x, y, w, h, c, lw) { this.ops.push(col(c) + ' RG ' + n2(lw) + ' w ' + n2(x) + ' ' + n2(y) + ' ' + n2(w) + ' ' + n2(h) + ' re S'); }
    line(x1, y1, x2, y2, c, lw) { this.ops.push(col(c) + ' RG ' + n2(lw) + ' w ' + n2(x1) + ' ' + n2(y1) + ' m ' + n2(x2) + ' ' + n2(y2) + ' l S'); }
    text(x, y, s, size, bold, c) { this.ops.push('BT /F' + (bold ? 2 : 1) + ' ' + n2(size) + ' Tf ' + col(c) + ' rg ' + n2(x) + ' ' + n2(y) + ' Td (' + esc(s) + ') Tj ET'); }
  }

  /** Ensambla el PDF. Todo es Latin-1, así que longitud de cadena = longitud en bytes. */
  function build(pages) {
    const objs = [];
    const add = (s) => { objs.push(s); return objs.length; };
    add('<< /Type /Catalog /Pages 2 0 R >>');
    add('<< /Type /Pages /Kids [' + pages.map((_, i) => (5 + i * 2) + ' 0 R').join(' ') + '] /Count ' + pages.length + ' >>');
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    pages.forEach((p, i) => {
      const body = p.ops.join('\n');
      add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + p.w + ' ' + p.h + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + (6 + i * 2) + ' 0 R >>');
      add('<< /Length ' + body.length + ' >>\nstream\n' + body + '\nendstream');
    });
    let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offs = [];
    objs.forEach((o, i) => { offs.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
    const xref = out.length;
    out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
    out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
    const bytes = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
    return bytes;
  }

  // Textos por defecto (español); la app pasa los de su idioma en L
  const ES = { months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'], dow: ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'],
    shifts: 'turnos', more: 'más', generated: 'generado el', detail: 'Detalle', heads: ['Fecha', 'Turno', 'Horario', 'Descanso', 'Horas', 'Nota'], total: 'Total', locale: 'es', file: 'calendario' };
  const fmtH = (n) => (Math.round(n * 100) / 100).toString().replace('.', ',');

  /** PDF del mes (year, month 0-11). Devuelve {bytes, filename}. */
  function monthPdf(data, year, month, weekStart, now, L) {
    L = Object.assign({}, ES, L || {});
    const MONTHS = L.months, DOW = L.dow;
    const PW = 842, PH = 595, M = 30, GAP = 4, GRAY = [0.45, 0.47, 0.52], DARK = [0.1, 0.11, 0.18];
    const shiftBy = Object.fromEntries(data.shifts.map((s) => [s.id, s]));
    const first = new Date(year, month, 1), dim = new Date(year, month + 1, 0).getDate();
    const lead = (first.getDay() - weekStart + 7) % 7, rows = Math.ceil((lead + dim) / 7);
    const rep = T.report(data, T.iso(first), T.iso(new Date(year, month, dim)), weekStart);
    const stamp = (now || new Date());
    const pages = [];

    // ---- Página 1: calendario
    let p = new Page(PW, PH); pages.push(p);
    const title = MONTHS[month] + ' ' + year;
    p.text(M, PH - M - 16, title, 22, true, DARK);
    const sum = fmtH(rep.hours) + ' h  ·  ' + rep.count + ' ' + L.shifts;
    p.text(PW - M - wid(sum, 11, true), PH - M - 14, sum, 11, true, DARK);
    const cellW = (PW - 2 * M - 6 * GAP) / 7, headY = PH - M - 34, gridTop = headY - 6;
    const foot = M + 4, cellH = (gridTop - foot - 14 - (rows - 1) * GAP) / rows;
    for (let c = 0; c < 7; c++) {
      const label = DOW[(weekStart + c) % 7];
      p.text(M + c * (cellW + GAP) + (cellW - wid(label, 8, true)) / 2, headY - 2, label, 8, true, GRAY);
    }
    for (let r = 0; r < rows; r++) for (let c = 0; c < 7; c++) {
      const idx = r * 7 + c, dayNum = idx - lead + 1, inMonth = dayNum >= 1 && dayNum <= dim;
      const x = M + c * (cellW + GAP), yTop = gridTop - r * (cellH + GAP), yBot = yTop - cellH;
      p.rect(x, yBot, cellW, cellH, inMonth ? [0.96, 0.965, 0.975] : [0.985, 0.985, 0.99]);
      p.frame(x, yBot, cellW, cellH, [0.82, 0.84, 0.88], 0.5);
      if (!inMonth) continue;
      p.text(x + 5, yTop - 12, String(dayNum), 10, true, DARK);
      const list = (data.days[T.iso(new Date(year, month, dayNum))] || []).map((e) => ({ e, s: shiftBy[e.sid] })).filter((x2) => x2.s);
      const slot = 13, maxLines = Math.max(0, Math.floor((cellH - 18) / slot));
      const shown = list.length > maxLines ? Math.max(0, maxLines - 1) : list.length;
      list.slice(0, shown).forEach(({ e, s }, i) => {
        const ty = yTop - 18 - (i + 1) * slot + 3;
        p.rect(x + 3, ty, cellW - 6, 11, rgb(s.color));
        const t = T.entryTimes(s, e), label = s.name + (t.start && t.end ? ' ' + t.start + '-' + t.end : '');
        p.text(x + 5, ty + 3, fit(label, 7, true, cellW - 10), 7, true, ink(s.color));
      });
      if (list.length > shown) p.text(x + 5, yBot + 4, '+' + (list.length - shown) + ' ' + L.more, 7, true, GRAY);
    }
    p.text(M, M - 8, 'KeepGoing · ' + L.generated + ' ' + stamp.toLocaleDateString(L.locale), 7, false, GRAY);

    // ---- Páginas siguientes: detalle
    const rowsData = [];
    for (let d = 1; d <= dim; d++) {
      const k = T.iso(new Date(year, month, d));
      for (const e of data.days[k] || []) { const s = shiftBy[e.sid]; if (s) rowsData.push({ k, d, e, s }); }
    }
    if (rowsData.length) {
      const cols = [M, M + 110, M + 300, M + 410, M + 490, M + 560], right = PW - M;
      const heads = L.heads;
      const startPage = () => {
        p = new Page(PW, PH); pages.push(p);
        p.text(M, PH - M - 12, L.detail + ' · ' + title, 14, true, DARK);
        heads.forEach((h, i) => p.text(cols[i], PH - M - 36, h, 9, true, GRAY));
        p.line(M, PH - M - 41, right, PH - M - 41, [0.8, 0.82, 0.86], 0.7);
        return PH - M - 56;
      };
      let y = startPage(), total = 0;
      for (const { k, d, e, s } of rowsData) {
        if (y < M + 26) y = startPage();
        const hrs = T.entryHours(s, e), t = T.entryTimes(s, e); total += hrs;
        const wd = new Date(year, month, d).getDay();
        p.text(cols[0], y, fit(DOW[wd].charAt(0) + DOW[wd].slice(1).toLowerCase() + ' ' + d, 9, false, cols[1] - cols[0] - 8), 9, false, DARK);
        p.rect(cols[1], y - 1, 7, 7, rgb(s.color));
        p.text(cols[1] + 12, y, fit(s.name, 9, true, cols[2] - cols[1] - 20), 9, true, DARK);
        p.text(cols[2], y, t.start && t.end ? t.start + ' - ' + t.end : '—', 9, false, DARK);
        p.text(cols[3], y, s.breakMin ? s.breakMin + ' min' : '—', 9, false, DARK);
        p.text(cols[4], y, hrs ? fmtH(hrs) + ' h' : '—', 9, false, DARK);
        if (e.note) p.text(cols[5], y, fit(e.note, 9, false, right - cols[5]), 9, false, DARK);
        y -= 16;
      }
      if (y < M + 26) y = startPage();
      p.line(M, y + 10, right, y + 10, [0.8, 0.82, 0.86], 0.7);
      p.text(cols[3], y - 4, L.total, 9, true, DARK);
      p.text(cols[4], y - 4, fmtH(total) + ' h', 9, true, DARK);
    }
    return { bytes: build(pages), filename: 'keepgoing-' + L.file + '-' + year + '-' + String(month + 1).padStart(2, '0') + '.pdf', pages: pages.length };
  }

  const api = { monthPdf, wid, fit, win };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.KGTurnsPdf = api;
})(typeof window !== 'undefined' ? window : globalThis);
