/* KeepGoing — «Registrar»: leer el CSV de movimientos de un banco y convertirlo en movimientos de la Libreta (lógica pura, sin DOM).
   Por ahora entiende el formato de Trading 212. No deduce lo que no sabe: agrupa los movimientos por tipo y la app
   pregunta al usuario qué es cada tipo (gasto, ingreso o ignorar), en qué categoría va y si quiere agruparlos.
   v1.22: los depósitos y las retiradas también se preguntan (ignorarlos o ponerles categoría), como cualquier otro tipo.
   Se usa en el navegador (window.KGBankCsv) y en los tests de Node (require). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KGBankCsv = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const MAX_ROWS = 20000;

  // CSV con comillas («"a, b"», comillas dobles escapadas), saltos de línea CRLF o LF y BOM al principio
  function parseCsv(text) {
    const s = String(text || '').replace(/^﻿/, ''), rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (q) {
        if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && s[i + 1] === '\n') i++;
        row.push(cell); cell = '';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
        if (rows.length > MAX_ROWS) break;
      } else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); if (row.length > 1 || row[0] !== '') rows.push(row); }
    return rows;
  }

  // Trading 212: las columnas que hacen falta para reconocerlo
  const T212_NEED = ['Action', 'Time (UTC)', 'Total', 'Currency (Total)'];
  const detect = header => (T212_NEED.every(h => (header || []).includes(h)) ? 't212' : null);

  // Tipo de cada acción de Trading 212. Lo que no está aquí sale como «otro» y también se pregunta.
  function kindOf(action) {
    const a = String(action || '').trim().toLowerCase();
    if (a === 'deposit') return 'deposit';
    if (a === 'withdrawal') return 'withdrawal';
    if (a === 'card debit') return 'card';
    if (a === 'card credit') return 'cardCredit';
    if (a === 'interest on cash') return 'interest';
    if (a === 'spending cashback') return 'cashback';
    if (a.startsWith('dividend')) return 'dividend';
    if (a === 'market buy' || a === 'limit buy' || a === 'stop buy') return 'buy';
    if (a === 'market sell' || a === 'limit sell' || a === 'stop sell') return 'sell';
    return 'other';
  }
  const pad = n => String(n).padStart(2, '0');
  // «2026-10-01 18:55:13+00:00» (UTC) → fecha del día en la zona horaria del dispositivo
  function localDate(time) {
    const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(time || '').trim());
    if (!m) return null;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)));
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  // «-12.78» → 1278 céntimos (siempre en positivo; el signo va aparte)
  function cents(v) {
    const x = Number(String(v || '').trim());
    return Number.isFinite(x) ? Math.round(Math.abs(x) * 100) : null;
  }

  /* Lee el CSV. Devuelve { format, rows, bad } o { format: null } si no es un formato conocido.
     Cada fila: { key, kind, action, date, cents, sign, currency, merchant, mcat, name } */
  function read(text) {
    const all = parseCsv(text), header = all[0] || [], format = detect(header);
    if (!format) return { format: null, rows: [], bad: 0 };
    const col = name => header.indexOf(name), get = (r, name) => { const i = col(name); return i >= 0 ? String(r[i] || '').trim() : ''; };
    const rows = [], seen = new Set();
    let bad = 0;
    for (const r of all.slice(1)) {
      const action = get(r, 'Action'), kind = kindOf(action), time = get(r, 'Time (UTC)');
      const date = localDate(time), c = cents(get(r, 'Total'));
      if (!date || c === null) { bad++; continue; }
      const total = Number(get(r, 'Total'));
      // Los dividendos no traen ID: se crea una clave estable con los datos de la fila
      const key = get(r, 'ID') || ['x', action, time, get(r, 'Total'), get(r, 'Ticker') || get(r, 'ISIN')].join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ key, kind, action: action.slice(0, 60), date, cents: c, sign: total < 0 ? -1 : 1, currency: (get(r, 'Currency (Total)') || 'EUR').toUpperCase().slice(0, 3),
        merchant: get(r, 'Merchant name').slice(0, 80), mcat: get(r, 'Merchant category').slice(0, 40), name: (get(r, 'Name') || get(r, 'Ticker')).slice(0, 80) });
    }
    return { format, rows, bad };
  }

  /* Preguntas para el usuario: un grupo por tipo de movimiento (los pagos con tarjeta, uno por categoría del comercio;
     las acciones desconocidas, una por nombre). Devuelve [{ id, kind, mcat, action, count, cents, sample }] */
  const groupId = r => r.kind === 'card' ? 'card:' + (r.mcat || '-') : r.kind === 'other' ? 'other:' + r.action : r.kind;
  function questions(rows) {
    const m = new Map();
    for (const r of rows) {
      const id = groupId(r);
      const g = m.get(id) || { id, kind: r.kind, mcat: r.kind === 'card' ? r.mcat : '', action: r.action, count: 0, cents: 0, sample: [] };
      g.count++; if (r.currency === 'EUR') g.cents += r.cents;
      if (g.sample.length < 3) { const s = r.merchant || r.name; if (s && !g.sample.includes(s)) g.sample.push(s); }
      m.set(id, g);
    }
    return [...m.values()];
  }
  // Monedas distintas del euro que aparecen: { GBP: nº de movimientos }
  function currencies(rows) {
    const out = {};
    for (const r of rows) if (r.currency !== 'EUR') out[r.currency] = (out[r.currency] || 0) + 1;
    return out;
  }

  /* Plan de importación.
     answers: { [id de grupo]: { type: 'expense' | 'income' | 'skip', categoryId, group: 'none' | 'day' | 'month' } }
     rates:   { GBP: 1.15 } (euros por unidad; sin tasa, esa moneda se ignora)
     existing: movimientos de la Libreta (los importados llevan extIds y, si van agrupados, extGroup)
     Devuelve { create: [...], update: [{ id, addCents, addIds }], dup, skipped, unanswered } */
  function plan(rows, answers, rates, existing) {
    const known = new Set(), groups = new Map();
    for (const e of existing || []) {
      for (const k of e.extIds || []) known.add(k);
      if (e.extGroup) groups.set(e.extGroup, e);
    }
    const create = [], upd = new Map(), bucket = new Map();
    let dup = 0, skipped = 0, unanswered = 0;
    for (const r of rows) {
      if (known.has(r.key)) { dup++; continue; }
      const a = (answers || {})[groupId(r)];
      if (!a || !['expense', 'income', 'skip'].includes(a.type)) { unanswered++; continue; }
      if (a.type === 'skip') { skipped++; continue; }
      let c = r.cents;
      if (r.currency !== 'EUR') {
        const rate = Number((rates || {})[r.currency]);
        if (!(rate > 0)) { skipped++; continue; }
        c = Math.round(c * rate);
      }
      if (!c) { skipped++; continue; }
      const base = { type: a.type, categoryId: a.categoryId || 'other', method: r.kind === 'card' || r.kind === 'cardCredit' ? 'card' : 'transfer' };
      if (a.group === 'day' || a.group === 'month') {
        const period = a.group === 'day' ? r.date : r.date.slice(0, 7), gk = ['t212', groupId(r), a.type, period].join('|');
        const ex = groups.get(gk);
        if (ex) { const u = upd.get(ex.id) || { id: ex.id, addCents: 0, addIds: [] }; u.addCents += c; u.addIds.push(r.key); upd.set(ex.id, u); continue; }
        const b = bucket.get(gk) || { ...base, date: r.date, amountCents: 0, extIds: [], extGroup: gk, kind: r.kind, label: r.kind === 'card' ? r.mcat : r.kind === 'other' ? r.action : '', count: 0 };
        b.amountCents += c; b.extIds.push(r.key); b.count++; if (r.date > b.date) b.date = r.date;
        bucket.set(gk, b);
        continue;
      }
      create.push({ ...base, date: r.date, amountCents: c, extIds: [r.key], kind: r.kind, label: r.merchant || r.name || (r.kind === 'other' ? r.action : ''), count: 1 });
    }
    return { create: [...create, ...bucket.values()].sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0)), update: [...upd.values()], dup, skipped, unanswered };
  }

  return { parseCsv, detect, kindOf, localDate, read, questions, currencies, plan, groupId };
});
