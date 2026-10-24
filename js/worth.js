/* KeepGoing — «Patrimonio actual» de la Libreta (v1.23): lógica pura, sin DOM.
   Parte del punto de partida real de la Libreta (saldos al empezar un día: cuenta digital, efectivo e invertido) y le suma
   los movimientos desde ese día. Un gasto o un ingreso en efectivo mueve el efectivo; el resto, la cuenta digital.
   Una inversión saca el dinero de la cuenta (o del efectivo) y lo pasa a invertido: el patrimonio no cambia.
   Importes en céntimos. Se usa en el navegador (window.KGWorth) y en los tests de Node (require). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KGWorth = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const pad = n => String(n).padStart(2, '0');
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));
  const toDate = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (k, n) => { const d = toDate(k); d.setDate(d.getDate() + n); return keyOf(d); };
  const int = v => Math.max(0, Math.round(+v || 0));

  // Punto de partida: el guardado o, si no hay, saldos a 0 desde el primer movimiento
  function baseOf(saved, entries, today) {
    if (saved && isKey(saved.date)) return { date: saved.date, digital: int(saved.digital), cash: int(saved.cash), invested: int(saved.invested), set: true };
    let first = today;
    for (const e of entries || []) if (isKey(e.date) && e.date < first) first = e.date;
    return { date: first, digital: 0, cash: 0, invested: 0, set: false };
  }

  /* Una fila por día desde el punto de partida hasta hoy (incluidos):
     { key, digital, cash, invested, patrimony, income, expenses, investments, inv: { categoría: invertido } }
     income y expenses son lo acumulado desde el punto de partida; investments = invertido (saldo inicial + inversiones). */
  function series(saved, entries, today) {
    const b = baseOf(saved, entries, today), byDay = new Map();
    for (const e of entries || []) {
      if (!isKey(e.date) || e.date < b.date || e.date > today) continue;
      (byDay.get(e.date) || byDay.set(e.date, []).get(e.date)).push(e);
    }
    const rows = [], inv = {};
    let digital = b.digital, cash = b.cash, invested = b.invested, income = 0, expenses = 0;
    for (let k = b.date, i = 0; k <= today && i < 40000; k = addDays(k, 1), i++) {
      for (const e of byDay.get(k) || []) {
        const c = int(e.amountCents), cashM = e.method === 'cash';
        if (e.type === 'income') { income += c; if (cashM) cash += c; else digital += c; }
        else if (e.type === 'invest') { invested += c; const cat = e.categoryId || 'invest'; inv[cat] = (inv[cat] || 0) + c; if (cashM) cash -= c; else digital -= c; }
        else { expenses += c; if (cashM) cash -= c; else digital -= c; }
      }
      rows.push({ key: k, digital, cash, invested, patrimony: digital + cash + invested, income, expenses, investments: invested, inv: { ...inv } });
    }
    return { base: b, rows };
  }

  // Ritmo de los últimos meses completos (por defecto 3): media mensual de ingresos, gastos e inversiones
  function pace(entries, today, months = 3) {
    const [y, m] = today.split('-').map(Number), from = keyOf(new Date(y, m - 1 - months, 1)), to = keyOf(new Date(y, m - 1, 0));
    let income = 0, expenses = 0, invest = 0;
    for (const e of entries || []) {
      if (!isKey(e.date) || e.date < from || e.date > to) continue;
      const c = int(e.amountCents);
      if (e.type === 'income') income += c; else if (e.type === 'invest') invest += c; else expenses += c;
    }
    return { income: Math.round(income / months), expenses: Math.round(expenses / months), invest: Math.round(invest / months), net: Math.round((income - expenses) / months) };
  }

  // Filas de «Más detalles»: el último día de cada mes (o año) y hoy
  function periods(rows, gran = 'month') {
    const out = [];
    rows.forEach((r, i) => { const n = rows[i + 1], cut = gran === 'year' ? 4 : 7; if (!n || n.key.slice(0, cut) !== r.key.slice(0, cut)) out.push(r); });
    return out;
  }
  return { baseOf, series, pace, periods, addDays };
});
