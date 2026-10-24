/* KeepGoing — Libreta de Gastos: lógica pura (importes en céntimos enteros, calendario, repeticiones)
   Se usa en el navegador (window.KGLedger) y en los tests de Node (require). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KGLedger = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const MASK = '•••••';
  const DEFAULT_CATEGORIES = [
    { id: 'food', key: 'catFood', icon: '🍽️', type: 'expense' },
    { id: 'transport', key: 'catTransport', icon: '🚌', type: 'expense' },
    { id: 'home', key: 'catHome', icon: '🏠', type: 'expense' },
    { id: 'leisure', key: 'catLeisure', icon: '🎉', type: 'expense' },
    { id: 'health', key: 'catHealth', icon: '💊', type: 'expense' },
    { id: 'shopping', key: 'catShopping', icon: '🛍️', type: 'expense' },
    { id: 'subs', key: 'catSubs', icon: '📺', type: 'expense' },
    { id: 'other', key: 'catOther', icon: '📦', type: 'both' },
    { id: 'salary', key: 'catSalary', icon: '💼', type: 'income' },
    { id: 'extra', key: 'catExtra', icon: '✨', type: 'income' },
    { id: 'gift', key: 'catGift', icon: '🎁', type: 'income' },
    { id: 'invest', key: 'catInvest', icon: '📈', type: 'invest' }
  ];
  /* v1.23: tipos de movimiento. Una inversión no suma ni resta: mueve dinero a lo invertido (no cuenta en ingresos, gastos ni saldo) */
  const TYPES = ['expense', 'income', 'invest'];
  const METHODS = ['card', 'cash', 'transfer', 'other'];
  const REPEATS = ['weekly', 'monthly', 'yearly'];

  // «12,50», «12.5», «1.234,56», «1,234.56», «12 €» → céntimos enteros (o null)
  function parseCents(str) {
    if (typeof str === 'number') return Number.isFinite(str) && str >= 0 ? Math.round(str * 100) : null;
    let s = String(str ?? '').replace(/[€\s]/g, '');
    if (!/^\d[\d.,]*$/.test(s)) return null;
    const lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
    const dec = Math.max(lc, ld);
    // El último separador es decimal si le siguen 1 o 2 cifras; si no, todo son miles
    if (dec >= 0 && s.length - dec - 1 <= 2 && s.length - dec - 1 > 0) s = s.slice(0, dec).replace(/[.,]/g, '') + '.' + s.slice(dec + 1);
    else s = s.replace(/[.,]/g, '');
    const v = Number(s);
    return Number.isFinite(v) ? Math.round(v * 100) : null;
  }
  const signed = e => (e.type === 'income' ? 1 : e.type === 'invest' ? 0 : -1) * (e.amountCents || 0);
  // Clave de suma de un movimiento: 'income', 'invest' o 'expense' (lo antiguo sin tipo cuenta como gasto)
  const kindKey = e => (e.type === 'income' || e.type === 'invest' ? e.type : 'expense');

  // Totales (céntimos) de una lista de movimientos. invest va aparte y no entra en el saldo
  function totals(entries) {
    const t = { income: 0, expense: 0, invest: 0 };
    for (const e of entries || []) t[kindKey(e)] += e.amountCents || 0;
    return { ...t, net: t.income - t.expense };
  }
  // Agrupa por día: { 'YYYY-MM-DD': { income, expense, invest, net, count } }
  function byDay(entries) {
    const out = {};
    for (const e of entries || []) {
      const d = out[e.date] || (out[e.date] = { income: 0, expense: 0, invest: 0, net: 0, count: 0 });
      d[kindKey(e)] += e.amountCents || 0;
      d.net = d.income - d.expense; d.count++;
    }
    return out;
  }
  const inMonth = (entries, y, m) => { const p = `${y}-${String(m).padStart(2, '0')}-`; return (entries || []).filter(e => String(e.date).startsWith(p)); };

  const pad = n => String(n).padStart(2, '0');
  const keyOf = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  const daysIn = (y, m) => new Date(y, m, 0).getDate();
  // Rejilla del mes empezando en lunes: semanas de 7 celdas (null = hueco fuera del mes)
  function monthGrid(y, m) {
    const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7, n = daysIn(y, m), cells = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= n; d++) cells.push(keyOf(y, m, d));
    while (cells.length % 7) cells.push(null);
    const weeks = []; for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }

  // Fechas en que toca una repetición entre from y to (incluidos). Mensual/anual: si el día no existe, último del mes.
  function occurrences(rec, from, to) {
    const out = [], start = rec.from;
    if (!start || !REPEATS.includes(rec.every)) return out;
    const end = rec.to && rec.to < to ? rec.to : to;
    const [y0, m0, d0] = start.split('-').map(Number);
    for (let i = 0; i < 5000; i++) {
      let k;
      if (rec.every === 'weekly') { const d = new Date(y0, m0 - 1, d0 + 7 * i); k = keyOf(d.getFullYear(), d.getMonth() + 1, d.getDate()); }
      else {
        const months = rec.every === 'monthly' ? i : 12 * i;
        const y = y0 + Math.floor((m0 - 1 + months) / 12), m = (m0 - 1 + months) % 12 + 1;
        k = keyOf(y, m, Math.min(d0, daysIn(y, m)));
      }
      if (k > end) break;
      if (k >= from) out.push(k);
    }
    return out;
  }
  // Id determinista para que dos dispositivos no dupliquen el mismo movimiento repetido
  const recEntryId = (recId, date) => `rec-${recId}-${date}`;

  const mask = (txt, on) => (on ? MASK : txt);

  /* ---------- gráficas y filtros ---------- */
  // Movimientos entre dos fechas (incluidas; vacío = sin límite)
  const inRange = (entries, from, to) => (entries || []).filter(e => (!from || e.date >= from) && (!to || e.date <= to));
  // Primera y última fecha con movimientos (o null)
  function span(entries) {
    let from = null, to = null;
    for (const e of entries || []) { if (!from || e.date < from) from = e.date; if (!to || e.date > to) to = e.date; }
    return from ? { from, to } : null;
  }
  // Suma por categoría de un tipo ('income' | 'expense'), de mayor a menor
  function byCategory(entries, type) {
    const m = {};
    for (const e of entries || []) if (e.type === type) { const c = e.categoryId || 'other'; m[c] = (m[c] || 0) + (e.amountCents || 0); }
    return Object.entries(m).map(([id, cents]) => ({ id, cents })).sort((a, b) => b.cents - a.cents || (a.id < b.id ? -1 : 1));
  }
  // Serie de ingresos y gastos por día, mes o año entre dos fechas (incluye los huecos a 0)
  function series(entries, from, to, unit = 'month') {
    const keyFor = d => unit === 'year' ? d.slice(0, 4) : unit === 'month' ? d.slice(0, 7) : d;
    const keys = [];
    if (unit === 'year') for (let y = +from.slice(0, 4); y <= +to.slice(0, 4) && keys.length < 500; y++) keys.push(String(y));
    else if (unit === 'month') { let y = +from.slice(0, 4), m = +from.slice(5, 7); const end = to.slice(0, 7); while (keys.length < 2000) { const k = `${y}-${pad(m)}`; if (k > end) break; keys.push(k); if (++m > 12) { m = 1; y++; } } }
    else { const [y0, m0, d0] = from.split('-').map(Number); for (let i = 0; i < 4000; i++) { const d = new Date(y0, m0 - 1, d0 + i), k = keyOf(d.getFullYear(), d.getMonth() + 1, d.getDate()); if (k > to) break; keys.push(k); } }
    const map = new Map(keys.map(k => [k, { key: k, income: 0, expense: 0, invest: 0 }]));
    for (const e of inRange(entries, from, to)) { const b = map.get(keyFor(e.date)); if (b) b[kindKey(e)] += e.amountCents || 0; }
    return keys.map(k => map.get(k));
  }

  /* ---------- Presupuestos (v1.19) ----------
     { id, name, catIds: [] (vacío = todos los gastos), versions: [{ from: 'YYYY-MM', amountCents }] }
     Cada versión vale desde su mes hasta que empieza la siguiente, así un mes de hace dos años usa el presupuesto que tenía entonces. */
  const ymOf = date => String(date || '').slice(0, 7);
  const nextYm = ym => { const [y, m] = ym.split('-').map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`; };
  function budgetAt(budget, ym) {
    let out = null, best = '';
    for (const v of (budget && budget.versions) || []) if (v.from <= ym && v.from >= best) { best = v.from; out = Math.max(0, Math.round(v.amountCents || 0)); }
    return out;
  }
  const budgetFirst = budget => ((budget && budget.versions) || []).reduce((a, v) => (!a || v.from < a ? v.from : a), '');
  // Fila por mes desde fromYm hasta toYm: presupuesto, gastado, diferencia (+ sobra, − te pasas) y diferencia acumulada
  function budgetRows(budget, entries, fromYm, toYm) {
    const cats = new Set((budget && budget.catIds) || []), spent = new Map(), rows = [];
    for (const e of entries || []) {
      if (e.type !== 'expense' || (cats.size && !cats.has(e.categoryId || 'other'))) continue;
      const k = ymOf(e.date); if (k >= fromYm && k <= toYm) spent.set(k, (spent.get(k) || 0) + (e.amountCents || 0));
    }
    let acc = 0, guard = 0;
    for (let ym = fromYm; ym <= toYm && guard < 1200; ym = nextYm(ym), guard++) {
      const b = budgetAt(budget, ym); if (b == null) continue;
      const sp = spent.get(ym) || 0, diff = b - sp; acc += diff;
      rows.push({ ym, budget: b, spent: sp, diff, acc });
    }
    return rows;
  }
  return { MASK, DEFAULT_CATEGORIES, TYPES, kindKey, METHODS, REPEATS, parseCents, signed, totals, byDay, inMonth, monthGrid, daysIn, occurrences, recEntryId, mask, inRange, span, byCategory, series, ymOf, nextYm, budgetAt, budgetFirst, budgetRows };
});
