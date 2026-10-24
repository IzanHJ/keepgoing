/* KeepGoing — «Patrimonio actual» de la Libreta (v1.23): lógica pura, sin DOM.
   Parte del punto de partida real de la Libreta (saldos al final de un día: cuenta digital, efectivo e invertido, que ya
   incluyen lo apuntado hasta ese día) y le suma los movimientos posteriores. Sin punto de partida, cuenta desde 0 con todo. Un gasto o un ingreso en efectivo mueve el efectivo; el resto, la cuenta digital.
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
  // invBy: lo invertido del punto de partida repartido por categoría de Inversión (antes de la v1.23.3 iba todo junto: va a «invest»)
  function baseOf(saved, entries, today) {
    if (saved && isKey(saved.date)) {
      let invBy = {};
      if (saved.invBy && typeof saved.invBy === 'object') for (const [k, v] of Object.entries(saved.invBy)) { if (int(v)) invBy[k] = int(v); }
      else if (int(saved.invested)) invBy = { invest: int(saved.invested) };
      const invested = Object.values(invBy).reduce((a, v) => a + v, 0);
      return { date: saved.date, digital: int(saved.digital), cash: int(saved.cash), invested, invBy, curs: cursOf(saved), set: true };
    }
    let first = today;
    for (const e of entries || []) if (isKey(e.date) && e.date < first) first = e.date;
    return { date: first, digital: 0, cash: 0, invested: 0, invBy: {}, curs: {}, set: false };
  }
  /* v1.23.4: saldos reales en otras monedas: saved.curs = { USD: { digital, cash, off } } en céntimos de esa moneda.
     off = no se suma al total. Los movimientos que se dejaron «en su moneda» (fx) de una de estas monedas mueven su
     saldo y no el de la moneda principal; si la moneda no está añadida, siguen contando en la principal como antes. */
  function cursOf(saved) {
    const out = {};
    for (const [k, v] of Object.entries((saved && saved.curs) || {})) if (/^[A-Z0-9]{2,6}$/.test(k) && v && typeof v === 'object') out[k] = { digital: int(v.digital), cash: int(v.cash), off: !!v.off };
    return out;
  }

  /* Una fila por día desde el punto de partida hasta hoy (incluidos):
     { key, digital, cash, invested, patrimony, income, expenses, investments, inv: { categoría: invertido } }
     income y expenses son lo acumulado desde el punto de partida; investments = invertido (saldo inicial + inversiones). */
  /* vals: valores de las inversiones [{ cat, date, value }] (céntimos). Desde la fecha de cada valor, la ganancia de esa
     inversión (valor − depositado ese día) se suma al patrimonio: value = depositado + ganancia. */
  /* rates (v1.23.4): { USD: moneda principal por 1 USD } para sumar las otras monedas al total con el cambio de hoy.
     Cada fila lleva cur: { USD: { digital, cash, income, expenses } } y other (lo que suman, en la principal). */
  function series(saved, entries, today, vals, rates) {
    const b = baseOf(saved, entries, today), byDay = new Map(), curs = Object.keys(b.curs);
    const rawFx = e => (e._rt ? e._rfx : e.fx);
    const conv = (c, v) => { const r = +((rates || {})[c]) || 0; return b.curs[c].off || !(r > 0) ? 0 : Math.round(v * r); };
    const cs = {};
    for (const c of curs) cs[c] = { digital: b.curs[c].digital, cash: b.curs[c].cash, income: 0, expenses: 0 };
    b.other = curs.reduce((a, c) => a + conv(c, cs[c].digital + cs[c].cash), 0);
    for (const e of entries || []) {
      // v1.23.1: los saldos reales son los del final de ese día, así que lo apuntado hasta ese día ya va incluido
      if (!isKey(e.date) || (b.set ? e.date <= b.date : e.date < b.date) || e.date > today) continue;
      (byDay.get(e.date) || byDay.set(e.date, []).get(e.date)).push(e);
    }
    const rows = [], inv = { ...b.invBy }, gain = {};
    const vq = (vals || []).filter(v => v && v.cat && isKey(v.date) && v.date <= today && +v.value >= 0).sort((x, y) => x.date < y.date ? -1 : x.date > y.date ? 1 : 0);
    let vi = 0;
    let digital = b.digital, cash = b.cash, invested = b.invested, income = 0, expenses = 0;
    for (let k = b.date, i = 0; k <= today && i < 40000; k = addDays(k, 1), i++) {
      for (const e of byDay.get(k) || []) {
        const fx = rawFx(e);
        if (fx && cs[fx.cur]) {
          const x = cs[fx.cur], c = int(fx.cents), rt = e._rt || e.type, w = e.method === 'cash' ? 'cash' : 'digital';
          if (rt === 'income') { x[w] += c; x.income += c; } else { x[w] -= c; if (rt !== 'invest') x.expenses += c; }
          continue;
        }
        // v1.23.4: en los vinculados, los saldos usan el importe real (_rc/_rt) e ingresos/gastos el neto
        const c = int(e.amountCents), cashM = e.method === 'cash', rt = e._rt || e.type, rc = e._rt ? int(e._rc) : c;
        if (rt === 'income') { if (cashM) cash += rc; else digital += rc; }
        else if (rt === 'invest') { invested += rc; const cat = e.categoryId || 'invest'; inv[cat] = (inv[cat] || 0) + rc; if (cashM) cash -= rc; else digital -= rc; }
        else if (cashM) cash -= rc; else digital -= rc;
        if (e.type === 'income') income += c; else if (e.type !== 'invest') expenses += c;
      }
      while (vi < vq.length && vq[vi].date <= k) { const v = vq[vi++]; gain[v.cat] = Math.round(+v.value) - (inv[v.cat] || 0); }
      const g = Object.values(gain).reduce((a, x) => a + x, 0), invVal = {};
      for (const c of new Set([...Object.keys(inv), ...Object.keys(gain)])) invVal[c] = (inv[c] || 0) + (gain[c] || 0);
      const other = curs.reduce((a, c) => a + conv(c, cs[c].digital + cs[c].cash), 0), cur = {};
      for (const c of curs) cur[c] = { ...cs[c] };
      rows.push({ key: k, digital, cash, invested, value: invested + g, gains: g, patrimony: digital + cash + invested + g + other, other, income, expenses, investments: invested + g, inv: { ...inv }, invVal, cur });
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
  /* Rentabilidad anual estimada (TIR con fechas): aportaciones [{ date, amount }] (retiradas en negativo) que el
     día valueDate valen value. Devuelve el % anual o null si no se puede calcular (sin dinero o sin tiempo). */
  function annualRate(flows, value, valueDate) {
    const T = toDate(valueDate), fl = (flows || []).filter(f => isKey(f.date) && f.date <= valueDate && +f.amount).map(f => ({ y: Math.max(0, (T - toDate(f.date)) / 864e5) / 365, a: +f.amount }));
    const put = fl.reduce((s, f) => s + f.a, 0);
    if (!(value > 0) || !(put > 0) || !fl.some(f => f.y > 0)) return null;
    const grown = r => fl.reduce((s, f) => s + f.a * Math.pow(1 + r, f.y), 0) - value;
    let lo = -0.99, hi = 10;
    if (grown(lo) > 0 || grown(hi) < 0) return null;
    for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (grown(mid) > 0) hi = mid; else lo = mid; }
    return Math.round(((lo + hi) / 2) * 10000) / 100;
  }
  /* Una inversión (categoría): depositado neto hoy, último valor y rentabilidad anual estimada.
     Lo del punto de partida que no tiene movimientos apuntados se cuenta desde «since» (o desde el primer movimiento). */
  function invStats(cat, saved, entries, vals, today, since) {
    const b = baseOf(saved, entries, today), mine = (entries || []).filter(e => e.type === 'invest' && (e.categoryId || 'invest') === cat && isKey(e.date));
    const before = mine.filter(e => e.date <= b.date).reduce((a, e) => a + int(e.amountCents), 0), after = mine.filter(e => e.date > b.date && e.date <= today);
    const deposited = (b.invBy[cat] || 0) + after.reduce((a, e) => a + int(e.amountCents), 0);
    const vs = (vals || []).filter(v => v && v.cat === cat && isKey(v.date) && v.date <= today).sort((x, y) => x.date < y.date ? -1 : 1), last = vs[vs.length - 1] || null;
    const extra = (b.invBy[cat] || 0) - before, first = mine.length ? mine.reduce((m, e) => e.date < m ? e.date : m, mine[0].date) : b.date;
    const flows = mine.map(e => ({ date: e.date, amount: int(e.amountCents) }));
    if (extra > 0) flows.push({ date: isKey(since) ? since : first, amount: extra });
    if (extra < 0) flows.push({ date: b.date, amount: extra });
    let value = deposited, rate = null;
    if (last) {
      const dep = after.filter(e => e.date > last.date).reduce((a, e) => a + int(e.amountCents), 0);
      value = int(last.value) + dep;
      rate = annualRate(flows.filter(f => f.date <= last.date), int(last.value), last.date);
    }
    return { cat, deposited, value, gain: value - deposited, last, rate, unrecorded: Math.max(0, extra), first };
  }
  return { baseOf, series, pace, periods, addDays, annualRate, invStats };
});
