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
    let first = b.date;
    for (const e of entries || []) {
      if (!isKey(e.date) || e.date > today) continue;
      if (e.date < first) first = e.date;
      (byDay.get(e.date) || byDay.set(e.date, []).get(e.date)).push(e);
    }
    // Estado de un día: saldos (al final del día), invertido por categoría, otras monedas y lo acumulado de ingresos y gastos
    const cs = {};
    for (const c of curs) cs[c] = { digital: b.curs[c].digital, cash: b.curs[c].cash, income: 0, expenses: 0 };
    const st0 = { digital: b.digital, cash: b.cash, invested: b.invested, inv: { ...b.invBy }, cs, income: 0, expenses: 0 };
    const clone = s => ({ ...s, inv: { ...s.inv }, cs: Object.fromEntries(Object.entries(s.cs).map(([k, v]) => [k, { ...v }])) });
    // Aplica (sg = 1) o deshace (sg = −1, para ir hacia atrás desde el punto de partida) los movimientos de un día
    function step(s, k, sg) {
      for (const e of byDay.get(k) || []) {
        const fx = rawFx(e);
        if (fx && s.cs[fx.cur]) {
          const x = s.cs[fx.cur], c = sg * int(fx.cents), rt = e._rt || e.type, w = e.method === 'cash' ? 'cash' : 'digital';
          if (rt === 'income') { x[w] += c; x.income += c; } else { x[w] -= c; if (rt !== 'invest') x.expenses += c; }
          continue;
        }
        // v1.23.4: en los vinculados, los saldos usan el importe real (_rc/_rt) e ingresos/gastos el neto
        const c = sg * int(e.amountCents), cashM = e.method === 'cash', rt = e._rt || e.type, rc = sg * (e._rt ? int(e._rc) : int(e.amountCents));
        if (rt === 'income') { if (cashM) s.cash += rc; else s.digital += rc; }
        else if (rt === 'invest') { s.invested += rc; const cat = e.categoryId || 'invest'; s.inv[cat] = (s.inv[cat] || 0) + rc; if (cashM) s.cash -= rc; else s.digital -= rc; }
        else if (cashM) s.cash -= rc; else s.digital -= rc;
        if (e.type === 'income') s.income += c; else if (e.type !== 'invest') s.expenses += c;
      }
    }
    const days = [];
    // Sin punto de partida, todo empieza a 0 al principio del primer día. Con él, los saldos son los del final de ese día
    // (ya incluyen lo apuntado hasta entonces) y, v1.23.5, los días anteriores se calculan hacia atrás deshaciendo los movimientos (hasta el día antes del primero).
    if (!b.set) step(st0, b.date, 1);
    if (b.set && first < b.date) {
      const back = [], s = clone(st0);
      for (let k = b.date, i = 0; k >= first && i < 40000; i++) { step(s, k, -1); k = addDays(k, -1); back.push({ key: k, s: clone(s) }); }
      days.push(...back.reverse());
    }
    days.push({ key: b.date, s: clone(st0) });
    { const s = clone(st0); for (let k = addDays(b.date, 1), i = 0; k <= today && i < 40000; k = addDays(k, 1), i++) { step(s, k, 1); days.push({ key: k, s: clone(s) }); } }
    // Lo acumulado de ingresos y gastos empieza en 0 el primer día del gráfico; base.at guarda lo que había el día del punto de partida
    const z = days[0].s, zc = Object.fromEntries(curs.map(c => [c, { income: z.cs[c].income, expenses: z.cs[c].expenses }]));
    const rows = [], gain = {};
    const vq = (vals || []).filter(v => v && v.cat && isKey(v.date) && v.date <= today && +v.value >= 0).sort((x, y) => x.date < y.date ? -1 : x.date > y.date ? 1 : 0);
    let vi = 0;
    for (const { key: k, s } of days) {
      while (vi < vq.length && vq[vi].date <= k) { const v = vq[vi++]; gain[v.cat] = Math.round(+v.value) - (s.inv[v.cat] || 0); }
      const g = Object.values(gain).reduce((a, x) => a + x, 0), invVal = {};
      for (const c of new Set([...Object.keys(s.inv), ...Object.keys(gain)])) invVal[c] = (s.inv[c] || 0) + (gain[c] || 0);
      const other = curs.reduce((a, c) => a + conv(c, s.cs[c].digital + s.cs[c].cash), 0), cur = {};
      for (const c of curs) cur[c] = { digital: s.cs[c].digital, cash: s.cs[c].cash, income: s.cs[c].income - zc[c].income, expenses: s.cs[c].expenses - zc[c].expenses };
      rows.push({ key: k, digital: s.digital, cash: s.cash, invested: s.invested, value: s.invested + g, gains: g, patrimony: s.digital + s.cash + s.invested + g + other, other, income: s.income - z.income, expenses: s.expenses - z.expenses, investments: s.invested + g, inv: { ...s.inv }, invVal, cur });
    }
    const br = rows.find(r => r.key === b.date) || rows[0];
    b.other = br.other;
    b.at = { income: br.income, expenses: br.expenses, cur: Object.fromEntries(curs.map(c => [c, { income: br.cur[c].income, expenses: br.cur[c].expenses }])) };
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
