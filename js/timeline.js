/* KeepGoing — Línea de tiempo (v1.35): lógica pura, sin DOM. Se usa en el navegador (window.KGTimeline) y en los tests de Node.
   Aquí vive lo que no depende de los datos: escalas y periodos (día, semana, mes, año, todo), los trozos de cada periodo
   para las minigráficas, el catálogo de indicadores (qué se suma, qué es un valor al cierre, qué es mejor), las vistas de
   Progreso y la comparación de dos periodos. Los valores los calcula app.js leyendo los datos de cada pestaña. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KGTimeline = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const pad = n => String(n).padStart(2, '0');
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));
  const toDate = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (k, n) => { const d = toDate(k); d.setDate(d.getDate() + n); return keyOf(d); };
  const lastDay = (y, m) => new Date(y, m + 1, 0).getDate(); // m en base 0
  const minK = (a, b) => (a < b ? a : b), maxK = (a, b) => (a > b ? a : b);

  const SCALES = ['day', 'week', 'month', 'year', 'all'];
  const okScale = s => (SCALES.includes(s) ? s : 'week');
  // Primer día de la semana de k. ws = 0 (domingo), 1 (lunes) o 6 (sábado)
  function weekStart(k, ws = 1) { const d = toDate(k), off = (d.getDay() - ws + 7) % 7; d.setDate(d.getDate() - off); return keyOf(d); }

  /* Periodo de una escala alrededor de la fecha at. o = { ws, first, today }.
     «Todo» va del primer registro a hoy. Devuelve { from, to } con ambas fechas incluidas. */
  function range(scale, at, o = {}) {
    const ws = o.ws == null ? 1 : o.ws, today = o.today || at;
    at = isKey(at) ? at : today;
    switch (okScale(scale)) {
      case 'day': return { from: at, to: at };
      case 'week': { const a = weekStart(at, ws); return { from: a, to: addDays(a, 6) }; }
      case 'month': { const [y, m] = at.split('-').map(Number); return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(lastDay(y, m - 1))}` }; }
      case 'year': { const y = at.slice(0, 4); return { from: `${y}-01-01`, to: `${y}-12-31` }; }
      default: { const f = isKey(o.first) ? minK(o.first, today) : today; return { from: f, to: today }; }
    }
  }
  // Fecha equivalente al mover el periodo dir pasos (−1 atrás, +1 adelante). En «Todo» no se mueve.
  function shift(scale, at, dir) {
    if (!isKey(at) || !dir) return at;
    switch (okScale(scale)) {
      case 'day': return addDays(at, dir);
      case 'week': return addDays(at, dir * 7);
      case 'month': { const [y, m, d] = at.split('-').map(Number); const t = new Date(y, m - 1 + dir, 1); return keyOf(new Date(t.getFullYear(), t.getMonth(), Math.min(d, lastDay(t.getFullYear(), t.getMonth())))); }
      case 'year': { const [y, m, d] = at.split('-').map(Number); return keyOf(new Date(y + dir, m - 1, Math.min(d, lastDay(y + dir, m - 1)))); }
      default: return at;
    }
  }
  // Trozos de un periodo para las minigráficas: semana y mes → días; año → meses; todo → años (o meses si dura menos de 2 años)
  function units(scale, from, to) {
    const out = [];
    if (!isKey(from) || !isKey(to) || from > to) return out;
    scale = okScale(scale);
    if (scale === 'day') return out;
    const longAll = scale === 'all' && (+to.slice(0, 4) - +from.slice(0, 4)) >= 2;
    if (scale === 'week' || scale === 'month') { for (let k = from, i = 0; k <= to && i < 400; k = addDays(k, 1), i++) out.push({ from: k, to: k, key: k }); return out; }
    if (longAll) { for (let y = +from.slice(0, 4); y <= +to.slice(0, 4); y++) out.push({ from: maxK(`${y}-01-01`, from), to: minK(`${y}-12-31`, to), key: String(y) }); return out; }
    let [y, m] = from.split('-').map(Number);
    for (let i = 0; i < 400; i++) {
      const a = `${y}-${pad(m)}-01`, b = `${y}-${pad(m)}-${pad(lastDay(y, m - 1))}`;
      if (a > to) break;
      out.push({ from: maxK(a, from), to: minK(b, to), key: `${y}-${pad(m)}` });
      m++; if (m > 12) { m = 1; y++; }
    }
    return out;
  }
  // Etiqueta corta de un periodo para elegir otro periodo con el que comparar
  const sameScaleBefore = (scale, at, n = 1) => shift(scale, at, -n);
  // El mismo periodo del año anterior
  function lastYear(at) { const [y, m, d] = at.split('-').map(Number); return keyOf(new Date(y - 1, m - 1, Math.min(d, lastDay(y - 1, m - 1)))); }

  /* Catálogo de indicadores.
     agg: sum = suma del periodo · close = valor al cierre del periodo · avg = media · ratio = porcentaje de dos sumas
     fmt: money | int | hours | pct | rate | kg · better: up (más es mejor), down (menos es mejor), none
     ledger: necesita la Libreta abierta (va cifrada) · group: para agrupar en la lista */
  const INDICATORS = [
    { id: 'worth', group: 'money', agg: 'close', fmt: 'money', better: 'up', ledger: true },
    { id: 'income', group: 'money', agg: 'sum', fmt: 'money', better: 'up', ledger: true },
    { id: 'expenses', group: 'money', agg: 'sum', fmt: 'money', better: 'down', ledger: true },
    { id: 'balance', group: 'money', agg: 'sum', fmt: 'money', better: 'up', ledger: true },
    { id: 'savings', group: 'money', agg: 'ratio', fmt: 'pct', better: 'up', ledger: true },
    { id: 'habits', group: 'habits', agg: 'sum', fmt: 'int', better: 'up' },
    { id: 'consistency', group: 'habits', agg: 'ratio', fmt: 'pct', better: 'up' },
    { id: 'perfect', group: 'habits', agg: 'sum', fmt: 'int', better: 'up' },
    { id: 'rate', group: 'habits', agg: 'avg', fmt: 'rate', better: 'up' },
    { id: 'challenges', group: 'habits', agg: 'sum', fmt: 'int', better: 'up' },
    { id: 'steps', group: 'habits', agg: 'sum', fmt: 'int', better: 'up' },
    { id: 'workouts', group: 'sport', agg: 'sum', fmt: 'int', better: 'up' },
    { id: 'trainDays', group: 'sport', agg: 'sum', fmt: 'int', better: 'up' },
    { id: 'volume', group: 'sport', agg: 'sum', fmt: 'kg', better: 'up' },
    { id: 'activeH', group: 'sport', agg: 'sum', fmt: 'hours', better: 'up' },
    { id: 'records', group: 'sport', agg: 'sum', fmt: 'int', better: 'up' },
    { id: 'workH', group: 'org', agg: 'sum', fmt: 'hours', better: 'none' },
    { id: 'shifts', group: 'org', agg: 'sum', fmt: 'int', better: 'none' },
    { id: 'restDays', group: 'org', agg: 'sum', fmt: 'int', better: 'none' },
    { id: 'timeDist', group: 'org', agg: 'dist', fmt: 'hours', better: 'none', noCompare: true },
  ];
  const IND = Object.fromEntries(INDICATORS.map(x => [x.id, x]));
  const GROUPS = ['money', 'habits', 'sport', 'org'];

  // Vistas de serie. Las del usuario se guardan con la misma forma: { id, name, ids: [...], main: [...] }
  const DEFAULT_VIEWS = [
    { id: 'general', ids: ['habits', 'perfect', 'rate', 'workouts', 'workH', 'worth', 'balance', 'consistency'], main: ['habits', 'perfect', 'rate'] },
    { id: 'money', ids: ['worth', 'income', 'expenses', 'balance', 'savings'], main: ['worth', 'balance'] },
    { id: 'sport', ids: ['workouts', 'trainDays', 'volume', 'activeH', 'records'], main: ['workouts', 'volume'] },
    { id: 'habits', ids: ['habits', 'consistency', 'perfect', 'rate', 'challenges', 'steps'], main: ['consistency', 'perfect'] },
    { id: 'org', ids: ['workH', 'shifts', 'restDays', 'timeDist'], main: ['workH', 'timeDist'] },
  ];
  const RE_VID = /^[A-Za-z0-9_-]{1,40}$/;
  function normView(v) {
    if (!v || typeof v !== 'object' || !RE_VID.test(v.id)) return null;
    const ids = [...new Set((Array.isArray(v.ids) ? v.ids : []).filter(id => IND[id]))].slice(0, INDICATORS.length);
    const main = [...new Set((Array.isArray(v.main) ? v.main : []).filter(id => ids.includes(id)))].slice(0, 4);
    return { id: v.id, ...(typeof v.name === 'string' && v.name.trim() ? { name: v.name.trim().slice(0, 40) } : {}), ids, main };
  }
  // Las vistas guardadas o, si no hay ninguna, las de serie
  function views(saved) {
    const list = (Array.isArray(saved) ? saved : []).map(normView).filter(Boolean).slice(0, 20);
    return list.length ? list : DEFAULT_VIEWS.map(v => ({ ...v, ids: [...v.ids], main: [...v.main] }));
  }

  // Une los valores de los trozos de un periodo según cómo se agrega el indicador (para las minigráficas)
  function aggregate(agg, vals) {
    const xs = vals.filter(v => v != null && Number.isFinite(v));
    if (!xs.length) return null;
    if (agg === 'close') return xs[xs.length - 1];
    if (agg === 'avg' || agg === 'ratio') return xs.reduce((a, b) => a + b, 0) / xs.length;
    return xs.reduce((a, b) => a + b, 0);
  }

  /* Compara a (periodo base) con b (periodo comparado). better: up | down | none.
     Devuelve { diff, pct, dir, good }: pct es null si a es 0 o falta un valor (un % sobre 0 engaña);
     dir: up | down | same | na; good: true (mejora), false (empeora) o null (no se valora o no hay datos). */
  function compare(a, b, better = 'up', eps = 1e-9) {
    if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b)) return { diff: null, pct: null, dir: 'na', good: null };
    const diff = b - a, dir = Math.abs(diff) <= eps ? 'same' : diff > 0 ? 'up' : 'down';
    const pct = Math.abs(a) > eps ? diff / Math.abs(a) * 100 : null;
    const good = dir === 'same' || better === 'none' ? null : (dir === 'up') === (better === 'up');
    return { diff, pct, dir, good };
  }

  // Posición (0–1) de una fecha entre from y to, y al revés: la fecha de una posición. Para la barra de tiempo.
  const dayNo = k => Math.round(toDate(k).getTime() / 864e5);
  function posOf(k, from, to) { const a = dayNo(from), b = dayNo(to); return b <= a ? 1 : Math.max(0, Math.min(1, (dayNo(k) - a) / (b - a))); }
  function keyAt(p, from, to) { const a = dayNo(from), b = dayNo(to); return addDays(from, Math.round(Math.max(0, Math.min(1, p)) * Math.max(0, b - a))); }

  // Acontecimientos: el siguiente (dir 1) o el anterior (dir −1) fuera del periodo actual. marks = [{ date, … }]
  function nextMark(marks, from, to, dir) {
    const xs = (marks || []).filter(m => isKey(m.date)).map(m => m.date).sort();
    if (dir > 0) return xs.find(d => d > to) || null;
    for (let i = xs.length - 1; i >= 0; i--) if (xs[i] < from) return xs[i];
    return null;
  }

  return { SCALES, okScale, weekStart, range, shift, units, sameScaleBefore, lastYear, INDICATORS, IND, GROUPS, DEFAULT_VIEWS, normView, views, aggregate, compare, posOf, keyAt, nextMark, addDays, isKey };
});
