/* KeepGoing — Calculadora de Patrimonio Proyectado (v1.17): lógica pura, sin interfaz.
   Se usa en el navegador (window.KGCalc) y en los tests de Node (require).
   Los datos viven cifrados dentro de la Libreta como elementos sueltos (se fusionan por id entre dispositivos):
     { id: 'calc-start', kind: 'start', digital, cash, salary, expenses, horizon, unit, date }
     { id, kind: 'inv', name, rate, accumulative, ord }           → destino de inversión
     { id, kind: 'fund', name, amount, target, ord }               → fondo / cartera inicial vinculada a un destino
     { id, kind: 'applied', type, name, values, ord }              → fórmula aplicada (forma el resultado)
     { id, kind: 'preset', type, name, values, ord }               → configuración guardada en «Mi Biblioteca»
   Importes en euros (con decimales): es una proyección con hipótesis, no un registro contable. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KGCalc = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const START_ID = 'calc-start';
  const MAX_MONTHS = 960; // 80 años
  // Plantillas de fórmulas. Cada campo: [clave, tipo, valor de ejemplo, opciones]
  // Tipos: money (€), pct (%), int (entero ≥ 0), select, inv (destino obligatorio), invOpt (destino o «Sin inversión destinada»), months (meses del año 1-12)
  const MODULES = [
    { id: 'savings', icon: 'bank', fields: [['rate', 'pct', 3.5], ['type', 'select', null, ['apy', 'tin']], ['compound', 'select', null, ['365', '12', '1']], ['accumulate', 'select', null, ['yes', 'no']]] },
    { id: 'periodic', icon: 'trend', fields: [['target', 'inv'], ['amount', 'money', 50], ['frequency', 'select', null, ['weekly', 'monthly', 'yearly']], ['timing', 'select', null, ['end', 'begin']]] },
    // «Cambio de ingreso o gasto» (antes «Cambio de nómina neta»: se guarda con el mismo id y el importe en newSalary para no perder datos)
    { id: 'salaryChange', icon: 'briefcase', fields: [['what', 'select', null, ['income', 'expense']], ['newSalary', 'money', 0], ['at', 'int', 1], ['unit', 'select', null, ['months', 'years']]] },
    // Pagas extras: un importe fijo en los meses del calendario elegidos (p. ej. abril, julio y diciembre), con cambios futuros del importe
    { id: 'extraPay', icon: 'gift', fields: [['amount', 'money', 1000], ['months', 'months']] },
    // Movimiento puntual (se puede repetir cada N meses o años, hasta el final de la proyección o durante un tiempo).
    // El 6.º elemento de un campo dice cuándo se muestra: { repeat: 'yes' } → solo si «Repetir» es «Sí»
    { id: 'movement', icon: 'swap', fields: [['kind', 'select', null, ['income', 'expense']], ['amount', 'money', 0], ['at', 'int', 1], ['unit', 'select', null, ['months', 'years']],
      ['repeat', 'select', null, ['no', 'yes']], ['every', 'int', 1, null, false, { repeat: 'yes' }], ['everyUnit', 'select', null, ['months', 'years'], false, { repeat: 'yes' }],
      ['until', 'select', null, ['end', 'for'], false, { repeat: 'yes' }], ['forN', 'int', 12, null, false, { repeat: 'yes', until: 'for' }], ['forUnit', 'select', null, ['months', 'years'], false, { repeat: 'yes', until: 'for' }]] },
    { id: 'cashback', icon: 'card', fields: [['spend', 'money', 0, null, true], ['rate', 'pct', 1], ['excluded', 'money', 0, null, true], ['delay', 'int', 0], ['target', 'invOpt'], ['percent', 'pct', 100]] },
    { id: 'roundup', icon: 'coins', fields: [['count', 'int', 30, null, true], ['average', 'money', 12.1], ['percent', 'pct', 100], ['target', 'inv']] },
    { id: 'liquidityCap', icon: 'ceiling', fields: [['limit', 'money', 15000, null, true], ['split', 'select', null, ['pct', 'fixed'], true]] },
    { id: 'loan', icon: 'loan', fields: [['principal', 'money', 1000], ['rate', 'pct', 5], ['term', 'int', 12], ['unit', 'select', null, ['months', 'years']], ['payment', 'select', null, ['monthly', 'yearly', 'end']], ['target', 'inv']] }
  ];
  const moduleOf = id => MODULES.find(m => m.id === id) || null;
  const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
  const pos = v => Math.max(0, num(v));

  // Número escrito a mano: «3,5», «3.5», «-2», «1.234,5» → número (o NaN)
  function parseNum(str) {
    if (typeof str === 'number') return str;
    let s = String(str ?? '').replace(/[€%\s]/g, '');
    if (!/^-?\d[\d.,]*$/.test(s)) return NaN;
    const neg = s[0] === '-'; if (neg) s = s.slice(1);
    const lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
    if (lc >= 0 && ld >= 0) { const dec = Math.max(lc, ld); s = s.slice(0, dec).replace(/[.,]/g, '') + '.' + s.slice(dec + 1); }
    else s = s.replace(',', '.');
    const v = Number(s);
    return Number.isFinite(v) ? (neg ? -v : v) : NaN;
  }

  // Fechas «YYYY-MM-DD» en hora local
  const parseDate = k => { const [y, m, d] = String(k || '').split('-').map(Number); return y && m && d ? new Date(y, m - 1, d) : null; };
  const keyOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  // Mismo día n meses después (el 31 cae el último día de los meses más cortos)
  function dateAtMonth(date, offset) {
    const y = date.getFullYear(), m = date.getMonth() + offset, last = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(date.getDate(), last));
  }
  // «Mes 3» → 3; «Año 3» → primer mes del año 3 (mes 25)
  const scheduleMonth = (at, unit) => { const n = Math.max(1, Math.round(num(at, 1))); return unit === 'years' ? (n - 1) * 12 + 1 : n; };
  // ¿Ocurre este mes un movimiento (puntual o repetido)?
  function occursAt(v, m) {
    const first = scheduleMonth(v.at, v.unit);
    if (m < first) return false;
    if (v.repeat !== 'yes') return m === first;
    const step = Math.max(1, Math.round(num(v.every, 1))) * (v.everyUnit === 'years' ? 12 : 1);
    if (v.until === 'for' && m > first + Math.max(1, Math.round(num(v.forN, 1))) * (v.forUnit === 'years' ? 12 : 1) - 1) return false;
    return (m - first) % step === 0;
  }
  const horizonMonths = s => Math.max(1, Math.min(MAX_MONTHS, Math.round(pos(s.horizon || 12) * (s.unit === 'years' ? 12 : 1))));
  // Cortes de «Más detalles»: cada año entero y el periodo final si no coincide con un año
  function periods(horizon) {
    const out = [];
    for (let m = 12; m <= horizon; m += 12) out.push(m);
    if (!out.length || out[out.length - 1] !== horizon) out.push(horizon);
    return out;
  }

  const defaultStart = today => ({ id: START_ID, kind: 'start', digital: 0, cash: 0, salary: 0, expenses: 0, horizon: 12, unit: 'months', date: today });

  // Limpia las variables de una fórmula (lo que llega de otra versión, de otro dispositivo o de datos antiguos)
  function cleanValues(type, values) {
    const mod = moduleOf(type), v = values && typeof values === 'object' ? values : {}, out = {};
    if (!mod) return out;
    for (const [k, kind, ex, opts, , showIf] of mod.fields) {
      if (kind === 'select') out[k] = opts.includes(String(v[k])) ? String(v[k]) : opts[0];
      else if (kind === 'inv') out[k] = typeof v[k] === 'string' ? v[k] : '';
      else if (kind === 'invOpt') out[k] = typeof v[k] === 'string' && v[k] ? v[k] : 'none';
      else if (kind === 'int') out[k] = v[k] === undefined && showIf ? ex : Math.round(pos(v[k])); // los campos opcionales nuevos toman su valor de ejemplo
      else if (kind === 'months') out[k] = [...new Set((Array.isArray(v[k]) ? v[k] : []).map(x => Math.round(num(x))).filter(x => x >= 1 && x <= 12))].sort((a, b) => a - b);
      else out[k] = pos(v[k]);
    }
    if (type === 'cashback' && v.percent === undefined) out.percent = 100;
    if (type === 'periodic' || type === 'extraPay') out.futureChanges = (Array.isArray(v.futureChanges) ? v.futureChanges : [])
      .map(c => ({ at: Math.max(1, Math.round(num(c && c.at, 1))), unit: c && c.unit === 'years' ? 'years' : 'months', amount: pos(c && c.amount) }));
    // Techo de liquidez: reparto del exceso entre uno o varios destinos (porcentaje del exceso o importe fijo al mes)
    if (type === 'liquidityCap') out.allocations = (Array.isArray(v.allocations) ? v.allocations : []).slice(0, 20)
      .map(x => ({ target: typeof (x && x.target) === 'string' ? x.target : '', value: pos(x && x.value) }));
    return out;
  }

  // Elementos sueltos → modelo ordenado (los elementos de tipos desconocidos se ignoran pero no se borran)
  function fromItems(items, today) {
    const list = Array.isArray(items) ? items : [];
    const byOrd = (a, b) => (a.ord || 0) - (b.ord || 0) || String(a.id).localeCompare(String(b.id));
    const st = list.find(x => x && x.kind === 'start');
    const start = { ...defaultStart(today), ...(st || {}) };
    for (const k of ['digital', 'cash', 'salary', 'expenses']) start[k] = pos(start[k]);
    start.horizon = Math.max(1, Math.round(pos(start.horizon) || 12)); start.unit = start.unit === 'years' ? 'years' : 'months';
    if (!parseDate(start.date)) start.date = today;
    const of = kind => list.filter(x => x && x.kind === kind).sort(byOrd);
    const investments = of('inv').map(x => ({ ...x, name: String(x.name || ''), rate: Math.max(-99, num(x.rate)), accumulative: x.accumulative !== false }));
    const funds = of('fund').map(x => ({ ...x, name: String(x.name || ''), amount: pos(x.amount), target: String(x.target || '') }));
    const formula = x => moduleOf(x.type) ? { ...x, name: String(x.name || ''), values: cleanValues(x.type, x.values) } : null;
    const applied = of('applied').map(formula).filter(Boolean), presets = of('preset').map(formula).filter(Boolean);
    return { start, investments, funds, applied, presets };
  }

  // Elementos que dependen de un destino (no se puede borrar hasta reasignarlos)
  const usesOf = (model, invId) => ({
    funds: model.funds.filter(f => f.target === invId).length,
    formulas: [...model.applied, ...model.presets].filter(a => a.values && (a.values.target === invId || (a.values.allocations || []).some(x => x.target === invId))).length
  });

  /* ---------- proyección ----------
     Mes a mes: nómina e ingresos/gastos puntuales al inicio de cada mes; luego las fórmulas en su orden; después crecen los destinos
     y, al cierre, el techo de liquidez manda a inversión lo que sobre en Digital.
     Patrimonio = Digital + Efectivo + saldo de los destinos + capital pendiente de cobro de los préstamos. */
  function compute(model) {
    const s = model.start, months = horizonMonths(s), startDate = parseDate(s.date) || new Date();
    const invs = model.investments, invIds = new Set(invs.map(i => i.id));
    const applied = model.applied;
    const fundsTotal = model.funds.reduce((a, f) => a + pos(f.amount), 0);
    const initial = pos(s.digital) + pos(s.cash) + fundsTotal;
    let digital = pos(s.digital); const cash = pos(s.cash);
    const lots = {}, principal = {};
    invs.forEach(i => { lots[i.id] = []; principal[i.id] = 0; });
    // Un fondo vinculado a un destino que ya no existe se queda como saldo propio sin rendimiento (no se pierde)
    const orphanFunds = model.funds.filter(f => !invIds.has(f.target)).reduce((a, f) => a + pos(f.amount), 0);
    model.funds.forEach(f => { if (invIds.has(f.target) && pos(f.amount) > 0) { lots[f.target].push({ balance: pos(f.amount), fresh: false }); principal[f.target] += pos(f.amount); } });
    // src marca de dónde viene la aportación (cashback o redondeos) para su métrica en la Proyección
    const srcIn = { cb: 0, ru: 0 };
    const addInvestment = (id, amount, fresh = false, src) => {
      if (!invIds.has(id) || !(amount > 0)) return false;
      lots[id].push({ balance: amount, fresh, src }); principal[id] += amount; if (src) srcIn[src] += amount; return true;
    };
    const balanceOf = id => lots[id].reduce((a, l) => a + l.balance, 0);
    const balances = () => Object.fromEntries(invs.map(i => [i.id, balanceOf(i.id)]));
    let returns = 0, cashGenerated = 0, cashReceived = 0, totalIncome = 0, totalExpenses = 0, cumIncome = 0, cumExpenses = 0, schedIncome = 0, schedExpenses = 0;
    const out = {}, cbQueue = {}, loans = {}, savingsAcc = {}, events = [];
    const bump = (id, v) => { out[id] = (out[id] || 0) + v; };
    const snapshot = (date, patrimony, extra) => ({ date, patrimony, income: cumIncome, expenses: cumExpenses, schedIncome, schedExpenses, digital, ...extra });
    const monthly = [snapshot(startDate, initial, { investments: fundsTotal, funds: balances(), principal: { ...principal } })];
    const salaryChanges = applied.filter(a => a.type === 'salaryChange').sort((a, b) => scheduleMonth(a.values.at, a.values.unit) - scheduleMonth(b.values.at, b.values.unit));
    const receivable = () => Object.values(loans).reduce((a, L) => a + Math.max(0, L.balance), 0);
    for (let m = 1; m <= months; m++) {
      const when = dateAtMonth(startDate, m - 1);
      // Cambios de ingreso o gasto: desde su mes sustituyen a la nómina o a los gastos mensuales (el más reciente manda)
      let salary = pos(s.salary), baseExpenses = pos(s.expenses);
      for (const c of salaryChanges) if (scheduleMonth(c.values.at, c.values.unit) <= m) { if (c.values.what === 'expense') baseExpenses = pos(c.values.newSalary); else salary = pos(c.values.newSalary); }
      for (const c of salaryChanges) if (scheduleMonth(c.values.at, c.values.unit) === m) out[c.id] = pos(c.values.newSalary);
      let movIn = 0, movOut = 0;
      // Pagas extras: entran como ingreso el mes del calendario que toca (con el importe vigente según sus cambios)
      for (const a of applied) if (a.type === 'extraPay' && (a.values.months || []).includes(when.getMonth() + 1)) {
        let v = pos(a.values.amount);
        for (const c of [...(a.values.futureChanges || [])].sort((x, y) => scheduleMonth(x.at, x.unit) - scheduleMonth(y.at, y.unit))) if (scheduleMonth(c.at, c.unit) <= m) v = pos(c.amount);
        movIn += v; bump(a.id, v);
      }
      for (const a of applied) if (a.type === 'movement' && occursAt(a.values, m)) {
        const v = pos(a.values.amount); if (a.values.kind === 'income') movIn += v; else movOut += v; bump(a.id, v);
      }
      const monthIncome = salary + movIn, monthExpenses = baseExpenses + movOut;
      digital += monthIncome - monthExpenses;
      totalIncome += monthIncome; totalExpenses += monthExpenses; cumIncome += monthIncome; cumExpenses += monthExpenses;
      schedIncome += monthIncome; schedExpenses += monthExpenses;
      if (monthIncome) events.push({ date: when, type: 'income', amount: monthIncome });
      if (monthExpenses) events.push({ date: when, type: 'expense', amount: monthExpenses });
      for (const a of applied) {
        const v = a.values;
        if (a.type === 'savings') {
          const annual = pos(v.rate) / 100, n = num(v.compound, 12) || 12;
          const rate = v.type === 'apy' ? Math.pow(1 + annual, 1 / 12) - 1 : Math.pow(1 + annual / n, n / 12) - 1;
          // «Retirados a Digital»: los intereses se quedan en Digital pero no generan nuevos intereses
          const base = Math.max(0, digital - (v.accumulate === 'no' ? (savingsAcc[a.id] || 0) : 0));
          const interest = base * rate;
          digital += interest; returns += interest; savingsAcc[a.id] = (savingsAcc[a.id] || 0) + interest; bump(a.id, interest);
        } else if (a.type === 'periodic') {
          if ((m - 1) % (v.frequency === 'yearly' ? 12 : 1) !== 0) continue;
          let base = pos(v.amount);
          for (const c of [...(v.futureChanges || [])].sort((x, y) => scheduleMonth(x.at, x.unit) - scheduleMonth(y.at, y.unit))) if (scheduleMonth(c.at, c.unit) <= m) base = pos(c.amount);
          const amount = base * (v.frequency === 'weekly' ? 52 / 12 : 1);
          if (addInvestment(v.target, amount, v.timing === 'end')) { digital -= amount; bump(a.id, amount); }
        } else if (a.type === 'cashback') {
          // El gasto que participa nunca supera los gastos mensuales del punto de partida (ya descontados una vez)
          const eligible = Math.max(0, Math.min(baseExpenses, pos(v.spend)) - pos(v.excluded));
          const earned = eligible * pos(v.rate) / 100;
          cashGenerated += earned;
          const due = m + Math.ceil(pos(v.delay) / 30);
          const q = cbQueue[a.id] || (cbQueue[a.id] = {}); q[due] = (q[due] || 0) + earned;
          bump(a.id, earned);
        } else if (a.type === 'roundup') {
          const avg = pos(v.average), frac = +(avg - Math.floor(avg)).toFixed(2), each = frac === 0 ? 0 : +(1 - frac).toFixed(2);
          const amount = each * pos(v.count) * Math.min(100, pos(v.percent)) / 100;
          if (addInvestment(v.target, amount, false, 'ru')) { digital -= amount; bump(a.id, amount); }
        } else if (a.type === 'loan') {
          const n = Math.max(1, Math.round(pos(v.term) || 1) * (v.unit === 'years' ? 12 : 1));
          const period = v.payment === 'yearly' ? 12 : v.payment === 'end' ? n : 1;
          let L = loans[a.id];
          if (!L) { L = loans[a.id] = { balance: pos(v.principal), rate: Math.pow(1 + pos(v.rate) / 100, 1 / 12) - 1, acc: 0, months: 0, interest: 0 }; digital -= L.balance; }
          if (L.balance <= 0) continue;
          const interest = L.balance * L.rate;
          L.balance += interest; L.acc += interest; L.months++; L.interest += interest; returns += interest; bump(a.id, interest);
          if (L.months >= period || m >= n) {
            // Cuota = saldo pendiente (con sus intereses) repartido entre las cuotas que quedan; la última lo liquida todo
            const left = Math.max(1, Math.ceil((n - m + 1) / period));
            const amount = m >= n || v.payment === 'end' ? L.balance : L.balance / left;
            L.balance -= amount; if (L.balance < 1e-9) L.balance = 0;
            if (!addInvestment(v.target, amount)) digital += amount;
            L.acc = 0; L.months = 0;
          }
        }
      }
      // Cashback que se abona este mes: lo que se invierte va a su destino y el resto a Digital
      for (const a of applied) {
        if (a.type !== 'cashback') continue;
        const due = (cbQueue[a.id] || {})[m] || 0; if (!due) continue;
        cashReceived += due; totalIncome += due; cumIncome += due;
        const share = a.values.target && a.values.target !== 'none' ? Math.min(100, pos(a.values.percent)) / 100 : 0;
        const invest = due * share;
        if (invest > 0 && addInvestment(a.values.target, invest, false, 'cb')) digital += due - invest; else digital += due;
      }
      // Crecimiento mensual de cada destino: acumulativo se reinvierte; no acumulativo se abona a Digital
      for (const i of invs) {
        const r = Math.pow(1 + num(i.rate) / 100, 1 / 12) - 1;
        for (const lot of lots[i.id]) {
          if (lot.fresh) { lot.fresh = false; continue; } // aportación a fin de periodo: empieza a rendir el mes siguiente
          const gross = lot.balance * r;
          if (i.accumulative === false) { digital += gross; returns += gross; }
          else { const nb = Math.max(0, lot.balance + gross); returns += nb - lot.balance; lot.balance = nb; }
        }
      }
      // Techo de liquidez: al cierre del mes, lo que supere el techo en Digital se invierte (empieza a rendir el mes siguiente)
      for (const a of applied) {
        if (a.type !== 'liquidityCap') continue;
        const excess = digital - pos(a.values.limit); if (!(excess > 0)) continue;
        let left = excess;
        for (const al of a.values.allocations || []) {
          const want = a.values.split === 'fixed' ? pos(al.value) : excess * Math.min(100, pos(al.value)) / 100;
          const amount = Math.min(left, want);
          if (amount > 1e-9 && addInvestment(al.target, amount)) left -= amount;
        }
        const sent = excess - left; digital -= sent; bump(a.id, sent);
      }
      const invested = invs.reduce((a, i) => a + balanceOf(i.id), 0) + orphanFunds, rec = receivable();
      monthly.push(snapshot(dateAtMonth(startDate, m), digital + cash + invested + rec, { investments: invested + rec, funds: balances(), principal: { ...principal } }));
    }
    const fin = monthly[monthly.length - 1];
    const investments = invs.reduce((a, i) => a + balanceOf(i.id), 0) + orphanFunds, receivables = receivable();
    const final = digital + cash + investments + receivables;
    const fundPrincipal = invs.reduce((a, i) => a + principal[i.id], 0) + orphanFunds;
    const pct = (d, b) => b ? d / b * 100 : null;
    const srcValue = src => invs.reduce((a, i) => a + lots[i.id].filter(l => l.src === src).reduce((x, l) => x + l.balance, 0), 0);
    const perInvestment = invs.map(i => {
      const value = balanceOf(i.id), dep = principal[i.id], gain = value - dep;
      return { id: i.id, name: i.name, rate: i.rate, accumulative: i.accumulative !== false, value, principal: dep, gain, pct: pct(gain, dep), share: investments > 0 ? value / investments * 100 : 0 };
    });
    return {
      months, startDate, endDate: fin.date, initial, final, delta: final - initial, pct: pct(final - initial, initial),
      digital, digitalStart: pos(s.digital), digitalDelta: digital - pos(s.digital), digitalPct: pct(digital - pos(s.digital), pos(s.digital)),
      cash, investments, receivables, investValue: investments + receivables, fundPrincipal,
      fundDelta: investments - fundPrincipal, fundPct: pct(investments - fundPrincipal, fundPrincipal),
      returns, cashGenerated, cashReceived, pending: Math.max(0, cashGenerated - cashReceived), growth: final - initial,
      totalIncome, totalExpenses, net: totalIncome - totalExpenses,
      // Cashback invertido y redondeos: total aportado y lo que vale hoy (al final de la proyección)
      hasCbInvest: applied.some(a => a.type === 'cashback' && a.values.target && a.values.target !== 'none' && pos(a.values.percent) > 0), cbInvested: srcIn.cb, cbValue: srcValue('cb'),
      hasRoundup: applied.some(a => a.type === 'roundup'), ruInvested: srcIn.ru, ruValue: srcValue('ru'),
      perInvestment, outputs: out, monthly, events, formulas: applied.length
    };
  }

  // Trayectoria diaria: el patrimonio avanza entre cierres de mes y salta el día que entran la nómina y los gastos
  function daily(res) {
    const M = res.monthly, start = M[0].date, end = M[M.length - 1].date;
    const days = Math.max(1, Math.round((end - start) / 86400000));
    const ev = [...res.events].sort((a, b) => a.date - b.date), rows = [];
    let mi = 0, ei = 0, ci = 0, ce = 0;
    for (let d = 0; d <= days; d++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + d);
      while (mi < M.length - 2 && date > M[mi + 1].date) mi++;
      while (ei < ev.length && ev[ei].date <= date) { if (ev[ei].type === 'income') ci += ev[ei].amount; else ce += ev[ei].amount; ei++; }
      const a = M[mi], b = M[Math.min(M.length - 1, mi + 1)], span = Math.max(1, b.date - a.date), f = Math.max(0, Math.min(1, (date - a.date) / span));
      const bl = k => (a[k] || 0) * (1 - f) + (b[k] || 0) * f;
      const si = bl('schedIncome'), se = bl('schedExpenses');
      const funds = {}, principal = {};
      for (const id of Object.keys(b.funds)) { funds[id] = (a.funds[id] || 0) * (1 - f) + b.funds[id] * f; principal[id] = (a.principal[id] || 0) * (1 - f) + (b.principal[id] || 0) * f; }
      rows.push({ date, patrimony: bl('patrimony') + (ci - si) - (ce - se), income: bl('income') - si + ci, expenses: bl('expenses') - se + ce, investments: bl('investments'), funds, principal });
    }
    return rows;
  }
  // Como mucho n puntos para dibujar (se conservan el primero y el último)
  function sample(rows, n = 240) {
    if (rows.length <= n) return rows;
    const step = (rows.length - 1) / (n - 1);
    return Array.from({ length: n }, (_, i) => rows[Math.round(i * step)]);
  }

  /* ---------- datos de la calculadora independiente (localStorage «patrimonioProjected» / «patrimonioClay») ----------
     Se importan sin borrar el original: si algo sale mal, la copia antigua sigue en el navegador. */
  function fromLegacy(raw, today, newId) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const arr = k => Array.isArray(src[k]) ? src[k].filter(x => x && typeof x === 'object') : [];
    const st = src.start && typeof src.start === 'object' ? src.start : {};
    const items = [{ ...defaultStart(today), digital: pos(st.digital), cash: pos(st.cash), salary: pos(st.salary), expenses: pos(st.expenses), horizon: Math.max(1, Math.round(pos(st.horizon) || 12)), unit: st.unit === 'years' ? 'years' : 'months', date: parseDate(st.date) ? st.date : today }];
    let ord = 1;
    const ids = new Map();
    for (const i of arr('investments')) { const id = newId(); ids.set(String(i.id), id); items.push({ id, kind: 'inv', name: String(i.name || '').slice(0, 60), rate: Math.max(-99, num(i.rate)), accumulative: i.accumulative !== false, ord: ord++ }); }
    const mapT = t => ids.get(String(t)) || (t === 'none' ? 'none' : '');
    for (const f of arr('funds')) items.push({ id: newId(), kind: 'fund', name: String(f.name || '').slice(0, 60), amount: pos(f.amount), target: mapT(f.target), ord: ord++ });
    for (const kind of ['applied', 'presets']) {
      const list = arr(kind).filter(x => x.type !== 'custom' && x.values && typeof x.values === 'object').map(x => ({ ...x, values: { ...x.values } }));
      // «Invertir cashback» era un módulo aparte: se une al cashback (o se convierte en uno)
      for (let i = list.length - 1; i >= 0; i--) {
        const e = list[i];
        if (e.type !== 'cashInvest') continue;
        const cb = list.find(x => x.type === 'cashback');
        if (cb) { cb.values.target = e.values.target; cb.values.percent = e.values.percent ?? 100; list.splice(i, 1); }
        else { e.type = 'cashback'; e.values = { spend: 0, rate: 0, excluded: 0, delay: 0, target: e.values.target, percent: e.values.percent ?? 100 }; }
      }
      for (const e of list) {
        if (e.type === 'periodic' && !Array.isArray(e.values.futureChanges) && num(e.values.changeMonth) > 0)
          e.values.futureChanges = [{ at: num(e.values.changeMonth), unit: 'months', amount: num(e.values.changeAmount || e.values.amount) }];
        if (!moduleOf(e.type)) continue;
        const values = cleanValues(e.type, e.values);
        if ('target' in values) values.target = mapT(e.values.target) || (e.type === 'cashback' ? 'none' : '');
        items.push({ id: newId(), kind: kind === 'applied' ? 'applied' : 'preset', type: e.type, name: String(e.name || '').slice(0, 60), values, ord: ord++ });
      }
    }
    return items;
  }

  return { START_ID, MAX_MONTHS, MODULES, moduleOf, occursAt, parseNum, parseDate, keyOf, dateAtMonth, scheduleMonth, horizonMonths, periods, defaultStart, cleanValues, fromItems, usesOf, compute, daily, sample, fromLegacy };
});
