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
    poly(pts, c) { this.ops.push(col(c) + ' rg ' + pts.map((q, i) => n2(q[0]) + ' ' + n2(q[1]) + (i ? ' l' : ' m')).join(' ') + ' h f'); }
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

  /** Parte un texto en líneas que caben en maxW (por palabras; una palabra demasiado larga se corta). */
  function wrap(s, size, bold, maxW) {
    const out = [];
    for (const para of String(s || '').split('\n')) {
      let line = '';
      for (let w of win(para).split(' ').filter(Boolean)) {
        while (wid(w, size, bold) > maxW && w.length > 1) {
          let cut = w.length; while (cut > 1 && wid(w.slice(0, cut), size, bold) > maxW) cut--;
          if (line) { out.push(line); line = ''; }
          out.push(w.slice(0, cut)); w = w.slice(cut);
        }
        const tryL = line ? line + ' ' + w : w;
        if (wid(tryL, size, bold) <= maxW) line = tryL; else { if (line) out.push(line); line = w; }
      }
      if (line) out.push(line);
    }
    return out;
  }
  // Color mezclado con blanco (para teñir la casilla sin tapar el texto)
  const tint = (hex, a) => rgb(hex).map((v) => 1 - (1 - v) * a);

  /** PDF de un mes (year, month 0-11). Devuelve {bytes, filename}. X (v1.25, opcional): capas y contenido extra, ver rangePdf. */
  function monthPdf(data, year, month, weekStart, now, L, X) {
    const from = T.iso(new Date(year, month, 1)), to = T.iso(new Date(year, month + 1, 0));
    return rangePdf(data, from, to, weekStart, now, L, X);
  }

  /** PDF de un rango de fechas: una hoja por mes (los días fuera del rango quedan en blanco) y después el detalle.
      X = { layers: { shifts, text, days, notes, rates }, detail (las semanas que no caben se hacen más altas),
            colors(k) → ['#hex'…] (tipos de día y eventos, hasta 3), notes: { fecha: texto }, rates: { fecha: 0..10 },
            routines: { id: nombre }, legend: [{ name, color }] } */
  function rangePdf(data, from, to, weekStart, now, L, X) {
    L = Object.assign({}, ES, L || {});
    X = X || {};
    const LY = Object.assign({ shifts: true, text: true, days: true, notes: true, rates: true }, X.layers || {});
    const detailOn = X.detail !== false;
    const MONTHS = L.months, DOW = L.dow;
    const PW = 842, PH = 595, M = 30, GAP = 4, GRAY = [0.45, 0.47, 0.52], DARK = [0.1, 0.11, 0.18];
    const shiftBy = Object.fromEntries(data.shifts.map((s) => [s.id, s]));
    const colors = typeof X.colors === 'function' ? X.colors : () => [];
    const notes = X.notes || {}, rates = X.rates || {}, rtName = X.routines || {}, gaps = X.gaps || {};
    const stamp = (now || new Date());
    const pages = [];
    const f0 = T.parseISO(from), t0 = T.parseISO(to);
    const rep = T.report(data, from, to, weekStart);
    let p;

    // Lo que va dentro de una casilla, como líneas de alto fijo (se mide antes de dibujar)
    const SLOT = 13, BAR = 7, NOTE = 8.5;
    function cellLines(k, cw) {
      const out = [];
      const list = (data.days[k] || []).map((e) => ({ e, s: shiftBy[e.sid] })).filter((x) => x.s);
      if (LY.shifts) {
        const seen = new Set();
        for (const { e, s } of list) {
          if (e.rt && rtName[e.rt]) {
            if (seen.has(e.rt)) continue; seen.add(e.rt);
            const cs = list.filter((x) => x.e.rt === e.rt).map((x) => x.s.color);
            out.push({ kind: 'rt', h: LY.text ? SLOT : BAR + 2, cs, label: rtName[e.rt] });
            continue;
          }
          const t = T.entryTimes(s, e);
          out.push({ kind: 'tag', h: LY.text ? SLOT : BAR + 2, color: s.color, label: s.name + (t.start && t.end ? ' ' + t.start + '-' + t.end : '') });
          if (LY.notes && e.note) for (const ln of wrap(e.note, 6.5, false, cw - 12)) out.push({ kind: 'note', h: NOTE, label: ln, indent: 6 });
        }
      }
      // v1.26: notas en huecos entre turnos, con su hora
      if (LY.notes) for (const g of gaps[k] || []) for (const ln of wrap(g.a + '-' + g.b + ' ' + g.t, 6.5, false, cw - 12)) out.push({ kind: 'note', h: NOTE, label: ln, indent: 6 });
      if (LY.notes && notes[k]) for (const ln of wrap(notes[k], 7, false, cw - 10)) out.push({ kind: 'dnote', h: NOTE + 0.5, label: ln });
      return out;
    }
    const needH = (lines) => 18 + lines.reduce((a, l) => a + l.h, 0) + 5;

    // Fondo de la casilla con 1, 2 (diagonal) o 3 colores (tarta)
    function cellBg(x, y, w, h, cs) {
      if (!cs.length) { p.rect(x, y, w, h, [0.96, 0.965, 0.975]); return; }
      const c = cs.map((hex) => tint(hex, 0.32));
      if (cs.length === 1) { p.rect(x, y, w, h, c[0]); return; }
      if (cs.length === 2) { p.poly([[x, y + h], [x + w, y + h], [x, y]], c[0]); p.poly([[x + w, y + h], [x + w, y], [x, y]], c[1]); return; }
      const cx = x + w / 2, cy = y + h / 2;
      const hit = (a) => { const dx = Math.sin(a), dy = Math.cos(a); const tx = dx ? (w / 2) / Math.abs(dx) : Infinity, ty = dy ? (h / 2) / Math.abs(dy) : Infinity, r = Math.min(tx, ty); return [cx + dx * r, cy + dy * r]; };
      for (let i = 0; i < 3; i++) {
        const pts = [[cx, cy]];
        for (let d = i * 120; d <= (i + 1) * 120; d += 3) pts.push(hit(d * Math.PI / 180));
        p.poly(pts, c[i]);
      }
    }

    for (let m = new Date(f0.getFullYear(), f0.getMonth(), 1); m <= t0; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
      const year = m.getFullYear(), month = m.getMonth(), dim = new Date(year, month + 1, 0).getDate();
      const lead = (m.getDay() - weekStart + 7) % 7, rows = Math.ceil((lead + dim) / 7);
      const title = MONTHS[month] + ' ' + year;
      const cellW = (PW - 2 * M - 6 * GAP) / 7;
      const legend = LY.days && X.legend && X.legend.length ? X.legend : [];
      // Alto de cada semana: igual para todas; con Detalle, la semana que no cabe crece (solo esa semana)
      const weeks = [];
      for (let r = 0; r < rows; r++) {
        const days = [];
        for (let c = 0; c < 7; c++) {
          const dayNum = r * 7 + c - lead + 1, inMonth = dayNum >= 1 && dayNum <= dim, k = inMonth ? T.iso(new Date(year, month, dayNum)) : '';
          const inRange = inMonth && k >= from && k <= to;
          days.push({ dayNum, inMonth, inRange, k, lines: inRange ? cellLines(k, cellW) : [] });
        }
        weeks.push(days);
      }
      const startMonthPage = (cont) => {
        p = new Page(PW, PH); pages.push(p);
        p.text(M, PH - M - 16, title, 22, true, DARK);
        if (!cont) { const sum = fmtH(rep.hours) + ' h  ·  ' + rep.count + ' ' + L.shifts; p.text(PW - M - wid(sum, 11, true), PH - M - 14, sum, 11, true, DARK); }
        const headY = PH - M - 34;
        for (let c = 0; c < 7; c++) { const label = DOW[(weekStart + c) % 7]; p.text(M + c * (cellW + GAP) + (cellW - wid(label, 8, true)) / 2, headY - 2, label, 8, true, GRAY); }
        p.text(M, M - 8, 'KeepGoing · ' + L.generated + ' ' + stamp.toLocaleDateString(L.locale), 7, false, GRAY);
        let lx = M;
        for (const it of legend) { const nm = win(it.name); if (lx + 24 + wid(nm, 8, false) > PW - M) break; p.rect(lx, M + 6, 8, 8, rgb(it.color)); p.text(lx + 11, M + 7, nm, 8, false, DARK); lx += 24 + wid(nm, 8, false); }
        return headY - 6;
      };
      const foot = M + 4 + (legend.length ? 14 : 0);
      let top = startMonthPage(false), placed = 0;
      // Con Detalle, las semanas normales encogen un poco (hasta un mínimo) para que la más alta quepa en la misma hoja
      const avail = top - foot - 14 - (rows - 1) * GAP, need = weeks.map((days) => Math.max(...days.map((d) => needH(d.lines))));
      let baseH = avail / rows;
      if (detailOn) while (baseH > 46 && need.reduce((a, n) => a + Math.max(baseH, n), 0) > avail) baseH -= 1;
      weeks.forEach((days, wi) => {
        const want = detailOn ? Math.max(baseH, need[wi]) : baseH;
        // Si no cabe en lo que queda de hoja, sigue en una hoja nueva; una semana más alta que una hoja entera se corta
        if (top - want < foot && placed) { top = startMonthPage(true); placed = 0; }
        const h = Math.min(want, top - foot); placed++;
        days.forEach((d, c) => {
          const x = M + c * (cellW + GAP), yTop = top, yBot = top - h;
          if (!d.inMonth) { p.rect(x, yBot, cellW, h, [0.985, 0.985, 0.99]); p.frame(x, yBot, cellW, h, [0.82, 0.84, 0.88], 0.5); return; }
          cellBg(x, yBot, cellW, h, d.inRange && LY.days ? colors(d.k).slice(0, 3) : []);
          p.frame(x, yBot, cellW, h, [0.82, 0.84, 0.88], 0.5);
          p.text(x + 5, yTop - 12, String(d.dayNum), 10, true, d.inRange ? DARK : GRAY);
          if (!d.inRange) return;
          if (LY.rates && Number.isInteger(rates[d.k])) {
            const n = rates[d.k], lbl = String(n), bw = wid(lbl, 7.5, true) + 7, hue = n * 12;
            const cc = hsl(hue, 0.72, 0.48);
            p.rect(x + cellW - bw - 4, yTop - 13, bw, 10, cc); p.text(x + cellW - bw - 0.5, yTop - 10.5, lbl, 7.5, true, [1, 1, 1]);
          }
          let y = yTop - 18, shown = 0;
          const room = h - 18 - 4;
          let used = 0;
          for (const ln of d.lines) {
            if (used + ln.h > room) break;
            used += ln.h; shown++;
            if (ln.kind === 'tag') {
              const bh = LY.text ? 11 : BAR;
              p.rect(x + 3, y - bh, cellW - 6, bh, rgb(ln.color));
              if (LY.text) p.text(x + 5, y - bh + 3, fit(ln.label, 7, true, cellW - 10), 7, true, ink(ln.color));
            } else if (ln.kind === 'rt') {
              const bh = LY.text ? 11 : BAR, seg = (cellW - 6) / ln.cs.length;
              ln.cs.forEach((cc, i) => p.rect(x + 3 + i * seg, y - bh, seg + 0.2, bh, rgb(cc)));
              if (LY.text) p.text(x + 5, y - bh + 3, fit(ln.label, 7, true, cellW - 10), 7, true, ink(ln.cs[0]));
            } else {
              p.text(x + 5 + (ln.indent || 0), y - ln.h + 2, ln.label, ln.kind === 'dnote' ? 7 : 6.5, false, ln.kind === 'dnote' ? DARK : GRAY);
            }
            y -= ln.h;
          }
          if (shown < d.lines.length) p.text(x + 5, yBot + 3, '+' + (d.lines.length - shown) + ' ' + L.more, 6.5, true, GRAY);
        });
        top -= h + GAP;
      });
    }

    // ---- Páginas siguientes: detalle (turnos con su nota y notas del día, sin cortar el texto)
    const rowsData = [];
    for (let d = new Date(f0); d <= t0; d = T.addDays(d, 1)) {
      const k = T.iso(d);
      if (LY.shifts) for (const e of data.days[k] || []) { const s = shiftBy[e.sid]; if (s) rowsData.push({ k, d: new Date(d), e, s }); }
      if (LY.notes) for (const g of gaps[k] || []) rowsData.push({ k, d: new Date(d), gap: g });
      if (LY.notes && notes[k]) rowsData.push({ k, d: new Date(d), note: notes[k] });
    }
    if (rowsData.length && X.table !== false) {
      const cols = [M, M + 110, M + 300, M + 410, M + 490, M + 560], right = PW - M;
      const heads = L.heads, title = L.detail + ' · ' + (from.slice(0, 7) === to.slice(0, 7) ? MONTHS[f0.getMonth()] + ' ' + f0.getFullYear() : fmtD(f0) + ' - ' + fmtD(t0));
      const startPage = () => {
        p = new Page(PW, PH); pages.push(p);
        p.text(M, PH - M - 12, title, 14, true, DARK);
        heads.forEach((h, i) => p.text(cols[i], PH - M - 36, h, 9, true, GRAY));
        p.line(M, PH - M - 41, right, PH - M - 41, [0.8, 0.82, 0.86], 0.7);
        return PH - M - 56;
      };
      let y = startPage(), total = 0;
      for (const r of rowsData) {
        const wd = r.d.getDay(), dayLbl = DOW[wd].charAt(0) + DOW[wd].slice(1).toLowerCase() + ' ' + r.d.getDate() + (from.slice(0, 7) === to.slice(0, 7) ? '' : '/' + (r.d.getMonth() + 1));
        const noteTxt = r.note != null ? r.note : r.gap ? r.gap.t : (LY.notes ? r.e.note : '');
        const nl = noteTxt ? wrap(noteTxt, 9, false, right - (r.note != null ? cols[1] : cols[5])) : [];
        const rowH = Math.max(16, nl.length * 11 + 5);
        if (y - rowH < M + 10) y = startPage();
        p.text(cols[0], y, fit(dayLbl, 9, false, cols[1] - cols[0] - 8), 9, false, DARK);
        if (r.note != null) {
          nl.forEach((ln, i) => p.text(cols[1], y - i * 11, ln, 9, false, DARK));
        } else if (r.gap) {
          p.text(cols[1] + 12, y, fit(L.gap || 'Nota', 9, true, cols[2] - cols[1] - 20), 9, true, GRAY);
          p.text(cols[2], y, r.gap.a + ' - ' + r.gap.b, 9, false, DARK);
          nl.forEach((ln, i) => p.text(cols[5], y - i * 11, ln, 9, false, DARK));
        } else {
          const { e, s } = r, hrs = T.entryHours(s, e, data.days[r.k]), t = T.entryTimes(s, e); if (!(s.once && !s.jobId)) total += hrs;
          p.rect(cols[1], y - 1, 7, 7, rgb(s.color));
          p.text(cols[1] + 12, y, fit(s.name, 9, true, cols[2] - cols[1] - 20), 9, true, DARK);
          p.text(cols[2], y, t.start && t.end ? t.start + ' - ' + t.end : '—', 9, false, DARK);
          const bk = T.entryBreak(s, e, data.days[r.k]); p.text(cols[3], y, bk ? bk + ' min' : '—', 9, false, DARK);
          p.text(cols[4], y, hrs ? fmtH(hrs) + ' h' : '—', 9, false, DARK);
          nl.forEach((ln, i) => p.text(cols[5], y - i * 11, ln, 9, false, DARK));
        }
        y -= rowH;
      }
      if (y < M + 26) y = startPage();
      p.line(M, y + 10, right, y + 10, [0.8, 0.82, 0.86], 0.7);
      p.text(cols[3], y - 4, L.total, 9, true, DARK);
      p.text(cols[4], y - 4, fmtH(total) + ' h', 9, true, DARK);
    }
    const same = from.slice(0, 7) === to.slice(0, 7) && from.endsWith('-01') && to === T.iso(new Date(f0.getFullYear(), f0.getMonth() + 1, 0));
    return { bytes: build(pages), filename: 'keepgoing-' + L.file + '-' + (same ? from.slice(0, 7) : from + '_' + to) + '.pdf', pages: pages.length };
  }
  const fmtD = (d) => d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
  function hsl(h, s, l) {
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [f(0), f(8), f(4)];
  }

  const api = { monthPdf, rangePdf, wrap, wid, fit, win };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.KGTurnsPdf = api;
})(typeof window !== 'undefined' ? window : globalThis);
