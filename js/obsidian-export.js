/* KeepGoing — «Exportar a Obsidian» (v1.27): lógica pura, sin DOM ni red.
   Genera, a partir de datos que ya prepara la app (con la Libreta descifrada en memoria), cuatro archivos para una bóveda
   de Obsidian: dos notas en Markdown, el CSV de movimientos y el estado de la app sin la Libreta. También arma un .zip
   (sin compresión ni dependencias) para los navegadores que no pueden escribir en una carpeta.
   Nada de lo que se genera se guarda en el estado, en localStorage, en la nube ni en la caché: solo viaja al archivo que
   elige el usuario. Todo texto del usuario se escapa para Markdown (tablas, enlaces, etiquetas) y para CSV.
   Se usa en el navegador (window.KGObsidian) y en los tests de Node (require). Las funciones del final (pickVault,
   writeFiles…) solo existen en el navegador y no registran nada en consola. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KGObsidian = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- rutas fijas (nada más se puede escribir) ---------- */
  const DIRS = { raw: 'raw-sources/keepgoing-datos', wiki: 'wiki/repos/Keepgoing' };
  const PATHS = {
    data: DIRS.wiki + '/keepgoing-mis-datos.md',
    ledger: DIRS.wiki + '/keepgoing-mi-libreta.md',
    csv: DIRS.raw + '/libreta-movimientos.csv',
    json: DIRS.raw + '/estado-sin-libreta.json'
  };
  const ALLOWED = new Set(Object.values(PATHS));
  const MAX_FILE = 8 * 1024 * 1024, MAX_TOTAL = 24 * 1024 * 1024; // bytes
  const MAX_TEXT = 300; // caracteres de cada texto del usuario en las notas
  // Una ruta vale solo si es exactamente una de las fijas (sin «..», sin barra inicial ni barras invertidas)
  const safePath = p => typeof p === 'string' && ALLOWED.has(p) && !p.split('/').some(s => !s || s === '.' || s === '..') && !/[\\:\0]/.test(p);

  /* ---------- textos ---------- */
  const L = {
    es: {
      dataTitle: 'KeepGoing · Mis datos', ledgerTitle: 'KeepGoing · Mi Libreta', generated: 'Generado el {d} desde KeepGoing. Exportación manual; no se sincroniza.',
      habits: 'Hábitos', noHabits: 'No tienes hábitos.', habit: 'Hábito', doneDays: 'Días cumplidos', pctSince: '% desde que empezó', streak: 'Racha', best: 'Mejor racha', last7: 'Últimos 7 días',
      quitNote: 'Los hábitos a dejar se miden en días sin recaer.', quitTag: '(a dejar)', archivedTag: '(archivado)', since: 'desde {d}', legend7: '✓ cumplido · ◐ a medias · ✗ fallado · – no cuenta',
      daysUnit: n => n === 1 ? '1 día' : `${n} días`, periodsW: n => n === 1 ? '1 semana' : `${n} semanas`, periodsM: n => n === 1 ? '1 mes' : `${n} meses`,
      projects: 'Proyectos', noProjects: 'No tienes proyectos.', project: 'Proyecto', goal: 'Meta', deadline: 'Fecha límite', status: 'Estado', retos: 'Retos',
      gSimple: 'Conseguirlo', gNumeric: '{cur} de {target} {unit}', gChecklist: '{done} de {n} pasos', achieved: 'Conseguido', probability: '{p} % de probabilidad', statusN: 'Estado {n}/10',
      noDeadline: 'Sin fecha', retoActive: 'en curso hasta {d}', retoOk: 'superado', retoKo: 'no superado', none: '—',
      work: 'Organización', jobs: 'Trabajos', noJobs: 'No tienes trabajos.', job: 'Trabajo', rate: 'Tarifa/h', paid: 'Con paga', yes: 'Sí', no: 'No',
      places: 'Lugares', noPlaces: 'No tienes lugares.', place: 'Lugar', addr: 'Dirección',
      shifts: 'Turnos', noShifts: 'No tienes turnos guardados.', shift: 'Turno', hours: 'Horario',
      routines: 'Rutinas', noRoutines: 'No tienes rutinas.', routine: 'Rutina', kind: 'Tipo', rDay: 'Un día', rWeek: 'Semana tipo', nShifts: 'Turnos',
      hoursByMonth: 'Horas de trabajo por mes', noHours: 'No hay turnos en este periodo.', month: 'Mes', hoursH: 'Horas', count: 'Turnos', pay: 'Paga estimada',
      dayKinds: 'Días por tipo', noDayKinds: 'No has coloreado días en este periodo.',
      rating: 'Valoración del día', noRating: 'No has valorado ningún día en este periodo.', avg: 'Media', nDays: 'Días',
      energy: 'Energía', noEnergy: 'No has apuntado tu energía en este periodo.',
      reviews: 'Revisiones semanales', noReviews: 'No hay revisiones semanales en este periodo.', week: 'Semana', score: 'Nota', good: 'Lo que fue bien', adjust: 'Qué ajustar',
      contract: 'Contrato', noContract: 'No tienes un contrato firmado.', signedAt: 'Firmado', endsAt: 'Termina', level: 'Nivel', renewals: 'Renovaciones', name: 'Nombre',
      partial: '(hasta el día {n})', period: 'Periodo: {a} a {b}. El mes en curso va aparte y no entra en las medias.',
      lockedOut: 'La Libreta estaba bloqueada al exportar: esta nota no lleva sus datos.',
      summary: 'Resumen por mes', noEntries: 'No hay movimientos en este periodo.', salary: 'Nómina', otherIncome: 'Otros ingresos', refunds: 'Devoluciones', expenses: 'Gastos', invest: 'Aportación a inversión', net: 'Neto',
      refundsNote: 'Devoluciones = cobros de deudas (ingresos que pagan un «Pendiente de Aportación»); no cuentan como ingreso. Los movimientos vinculados ya cuentan solo la diferencia.',
      byCat: 'Por mes y categoría', category: 'Categoría', type: 'Tipo', amount: 'Importe', tIncome: 'Ingreso', tExpense: 'Gasto', tInvest: 'Inversión', tRefund: 'Devolución',
      worth: 'Patrimonio (última foto)', noWorth: 'No has puesto un punto de partida en Patrimonio actual.', worthAt: 'A {d}', digital: 'Cuenta digital', cash: 'Efectivo', invested: 'Invertido (valor)', otherCur: 'Otras monedas (cambio estimado de hoy)', total: 'Patrimonio total', notSummed: 'no se suma al total', noRate: 'sin cambio disponible',
      budget: 'Presupuesto global', noBudget: 'No tienes presupuesto global.', bBudget: 'Presupuesto', bSpent: 'Gastado', bDiff: 'Diferencia', bAcc: 'Acumulada', bFrom: 'Diferencia acumulada desde {m}: {v}',
      debts: 'Cuotas de devolución en curso', noDebts: 'No hay deudas abiertas.', who: 'Persona', side: 'Sentido', favor: 'Te debe', contra: 'Debes', expected: 'Acordado', paidD: 'Devuelto', left: 'Falta', date: 'Fecha', note: 'Nota',
      compare: 'Comparativa con las proyecciones de la Calculadora', noProj: 'No tienes proyecciones guardadas en la Calculadora.', noFull: 'Aún no hay ningún mes completo con movimientos: la media real sale cuando acabe el primero.',
      concept: 'Concepto', assumed: 'Supuesto/mes', real: 'Media real/mes', diff: 'Diferencia', current: 'Mes en curso {p}', extraPay: 'Pagas extras', contribution: 'Aportación',
      projMeta: 'Fecha de inicio {d} · horizonte {h} · media real con {n} meses completos ({a} a {b})', curCalc: 'Calculadora actual', extraNote: 'Pagas extras: lo supuesto al año repartido en 12 meses; lo real es la categoría «{c}».', months: n => n === 1 ? '1 mes' : `${n} meses`, years: n => n === 1 ? '1 año' : `${n} años`
    },
    en: {
      dataTitle: 'KeepGoing · My data', ledgerTitle: 'KeepGoing · My Ledger', generated: 'Generated on {d} from KeepGoing. Manual export; it does not sync.',
      habits: 'Habits', noHabits: 'You have no habits.', habit: 'Habit', doneDays: 'Days done', pctSince: '% since it started', streak: 'Streak', best: 'Best streak', last7: 'Last 7 days',
      quitNote: 'Habits to quit are measured in days without slipping.', quitTag: '(to quit)', archivedTag: '(archived)', since: 'since {d}', legend7: '✓ done · ◐ partly · ✗ missed · – does not count',
      daysUnit: n => n === 1 ? '1 day' : `${n} days`, periodsW: n => n === 1 ? '1 week' : `${n} weeks`, periodsM: n => n === 1 ? '1 month' : `${n} months`,
      projects: 'Projects', noProjects: 'You have no projects.', project: 'Project', goal: 'Goal', deadline: 'Deadline', status: 'Status', retos: 'Challenges',
      gSimple: 'Achieve it', gNumeric: '{cur} of {target} {unit}', gChecklist: '{done} of {n} steps', achieved: 'Achieved', probability: '{p} % likely', statusN: 'Status {n}/10',
      noDeadline: 'No date', retoActive: 'running until {d}', retoOk: 'passed', retoKo: 'failed', none: '—',
      work: 'Organisation', jobs: 'Jobs', noJobs: 'You have no jobs.', job: 'Job', rate: 'Rate/h', paid: 'Paid', yes: 'Yes', no: 'No',
      places: 'Places', noPlaces: 'You have no places.', place: 'Place', addr: 'Address',
      shifts: 'Shifts', noShifts: 'You have no saved shifts.', shift: 'Shift', hours: 'Hours',
      routines: 'Routines', noRoutines: 'You have no routines.', routine: 'Routine', kind: 'Type', rDay: 'One day', rWeek: 'Typical week', nShifts: 'Shifts',
      hoursByMonth: 'Work hours by month', noHours: 'No shifts in this period.', month: 'Month', hoursH: 'Hours', count: 'Shifts', pay: 'Estimated pay',
      dayKinds: 'Days by type', noDayKinds: 'You have not coloured any days in this period.',
      rating: 'Day rating', noRating: 'You have not rated any day in this period.', avg: 'Average', nDays: 'Days',
      energy: 'Energy', noEnergy: 'You have not logged your energy in this period.',
      reviews: 'Weekly reviews', noReviews: 'No weekly reviews in this period.', week: 'Week', score: 'Score', good: 'What went well', adjust: 'What to adjust',
      contract: 'Contract', noContract: 'You have no signed contract.', signedAt: 'Signed', endsAt: 'Ends', level: 'Level', renewals: 'Renewals', name: 'Name',
      partial: '(up to day {n})', period: 'Period: {a} to {b}. The current month is shown apart and is not part of the averages.',
      lockedOut: 'The Ledger was locked when exporting: this note has none of its data.',
      summary: 'Summary by month', noEntries: 'No entries in this period.', salary: 'Salary', otherIncome: 'Other income', refunds: 'Refunds', expenses: 'Expenses', invest: 'Invested', net: 'Net',
      refundsNote: 'Refunds = debt repayments (income that pays an “Owed to you” share); they are not counted as income. Linked entries already count only the difference.',
      byCat: 'By month and category', category: 'Category', type: 'Type', amount: 'Amount', tIncome: 'Income', tExpense: 'Expense', tInvest: 'Investment', tRefund: 'Refund',
      worth: 'Net worth (latest snapshot)', noWorth: 'You have not set a starting point in Current net worth.', worthAt: 'On {d}', digital: 'Digital account', cash: 'Cash', invested: 'Invested (value)', otherCur: 'Other currencies (today’s estimated rate)', total: 'Total net worth', notSummed: 'not added to the total', noRate: 'no rate available',
      budget: 'Overall budget', noBudget: 'You have no overall budget.', bBudget: 'Budget', bSpent: 'Spent', bDiff: 'Difference', bAcc: 'Running total', bFrom: 'Running difference since {m}: {v}',
      debts: 'Repayments in progress', noDebts: 'No open debts.', who: 'Person', side: 'Direction', favor: 'Owes you', contra: 'You owe', expected: 'Agreed', paidD: 'Repaid', left: 'Left', date: 'Date', note: 'Note',
      compare: 'Comparison with the Calculator projections', noProj: 'You have no saved projections in the Calculator.', noFull: 'There is no full month with entries yet: the real average appears when the first one ends.',
      concept: 'Item', assumed: 'Assumed/month', real: 'Real average/month', diff: 'Difference', current: 'Current month {p}', extraPay: 'Extra payments', contribution: 'Contribution',
      projMeta: 'Start date {d} · horizon {h} · real average over {n} full months ({a} to {b})', curCalc: 'Current calculator', extraNote: 'Extra payments: the yearly assumption spread over 12 months; the real figure is the “{c}” category.', months: n => n === 1 ? '1 month' : `${n} months`, years: n => n === 1 ? '1 year' : `${n} years`
    }
  };
  const tr = (lang, k, p = {}) => { const s = (L[lang] || L.es)[k]; return typeof s === 'string' ? s.replace(/\{(\w+)\}/g, (m, x) => (x in p ? String(p[x]) : m)) : s; };

  /* ---------- escapado ---------- */
  // Texto de una línea seguro para Markdown y Obsidian: sin saltos de línea, con | [ ] # * _ ` < > y demás escapados
  // (así no rompe tablas, no crea enlaces [[…]], etiquetas #, resaltados ==…== ni HTML), y con un tope de largo.
  function md(v, max = MAX_TEXT) {
    let s = String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/\s*[\r\n\u2028\u2029]+\s*/g, ' ').replace(/\s+/g, ' ').trim();
    if (s.length > max) s = s.slice(0, max - 1) + '…';
    return s.replace(/[\\`*_\[\]<>#|~=$%^&]/g, c => (c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : '\\' + c));
  }
  const cell = v => { const s = md(v); return s || '—'; };
  // Celda de CSV: comillas dobles escapadas y, si empieza por = + - @ (fórmula en Excel), un apóstrofo delante
  function csvField(v) {
    let s = String(v ?? '').replace(/\r\n?/g, '\n');
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  /* ---------- números y fechas ---------- */
  const pad = n => String(n).padStart(2, '0');
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));
  const isYm = k => /^\d{4}-\d{2}$/.test(String(k || ''));
  const daysIn = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
  const addYm = (ym, n) => { const [y, m] = ym.split('-').map(Number), d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
  const locOf = lang => (lang === 'en' ? 'en-GB' : 'es-ES');
  function money(cents, lang, cur) {
    const v = (Math.round(+cents || 0)) / 100;
    try { return new Intl.NumberFormat(locOf(lang), { style: 'currency', currency: cur || 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v); }
    catch (e) { return new Intl.NumberFormat(locOf(lang), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + ' ' + String(cur || '').replace(/[^A-Z0-9]/g, ''); }
  }
  const signedMoney = (c, lang, cur) => (c > 0 ? '+' : c < 0 ? '−' : '') + money(Math.abs(c), lang, cur);
  const num = (v, lang, d = 1) => new Intl.NumberFormat(locOf(lang), { minimumFractionDigits: d, maximumFractionDigits: d }).format(+v || 0);
  const pct = (r, lang) => (r == null ? '—' : num(r * 100, lang, 0) + ' %');
  const dateTxt = (k, lang) => (isKey(k) ? new Intl.DateTimeFormat(locOf(lang), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(k + 'T12:00:00Z')) : '—');
  const ymTxt = (ym, lang) => { const s = new Intl.DateTimeFormat(locOf(lang), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(ym + '-15T12:00:00Z')); return s.charAt(0).toUpperCase() + s.slice(1); };

  /* Ventana de meses: los `n` meses completos anteriores al mes en curso (desde `first` si se indica) y el mes en curso
     aparte. Un mes con menos días que los del mes natural (el de hoy) es parcial: «(hasta el día N)» y no entra en medias. */
  function monthWindow(today, n = 12, first = null) {
    const cur = today.slice(0, 7), day = +today.slice(8, 10), full = [];
    for (let i = n; i >= 1; i--) { const ym = addYm(cur, -i); if (!first || ym >= first.slice(0, 7)) full.push(ym); }
    return { full, current: cur, day, partial: day < daysIn(cur) };
  }
  const monthLabel = (ym, w, lang) => ymTxt(ym, lang) + (ym === w.current && w.partial ? ' ' + tr(lang, 'partial', { n: w.day }) : '');

  /* ---------- tablas ---------- */
  function table(head, rows) {
    if (!rows.length) return '';
    const line = r => '| ' + r.join(' | ') + ' |';
    return [line(head), line(head.map(() => '---')), ...rows.map(line)].join('\n') + '\n';
  }
  const h2 = s => `\n## ${s}\n\n`;
  const h3 = s => `\n### ${s}\n\n`;
  const empty = s => s + '\n';
  // Encabezado YAML: solo valores fijos (nada escrito por el usuario)
  const front = (kind, at) => `---\ntags: [keepgoing, keepgoing/${kind}]\ngenerado: ${String(at).replace(/[^0-9TZ:.\-]/g, '')}\nfuente: KeepGoing\n---\n`;

  /* =========================================================
     1. keepgoing-mis-datos.md
     ========================================================= */
  const MARK = { done: '✓', part: '◐', miss: '✗', off: '–' };
  function dataNote(d) {
    const lang = d.lang === 'en' ? 'en' : 'es', T = (k, p) => tr(lang, k, p), w = monthWindow(d.today, 12);
    let out = front('datos', d.generatedAt) + `\n# ${T('dataTitle')}\n\n${T('generated', { d: dateTxt(d.today, lang) })}\n`;
    out += '\n' + T('period', { a: ymTxt(w.full[0], lang), b: monthLabel(w.current, w, lang) }) + '\n';

    // Hábitos
    out += h2(T('habits'));
    const hs = d.habits || [];
    if (!hs.length) out += empty(T('noHabits'));
    else {
      const unitN = (h, n) => (h.quit || h.freq === 'daily' || !h.freq ? T('daysUnit')(n) : h.freq === 'weekly' ? T('periodsW')(n) : T('periodsM')(n));
      out += table([T('habit'), T('doneDays'), T('pctSince'), T('streak'), T('best'), T('last7')], hs.map(h => [
        cell(h.name) + (h.quit ? ' ' + T('quitTag') : '') + (h.archived ? ' ' + T('archivedTag') : '') + (isKey(h.created) ? ' · ' + md(T('since', { d: dateTxt(h.created, lang) })) : ''),
        String(Math.max(0, Math.round(+h.done || 0))), pct(h.pct, lang), unitN(h, Math.max(0, Math.round(+h.streak || 0))), unitN(h, Math.max(0, Math.round(+h.best || 0))),
        (h.last7 || []).slice(-7).map(s => MARK[s] || MARK.off).join(' ')
      ]));
      out += '\n' + T('legend7') + (hs.some(h => h.quit) ? ' · ' + T('quitNote') : '') + '\n';
    }

    // Proyectos
    out += h2(T('projects'));
    const ps = d.projects || [];
    if (!ps.length) out += empty(T('noProjects'));
    else {
      out += table([T('project'), T('goal'), T('deadline'), T('status'), T('retos')], ps.map(p => {
        const g = p.goal || {};
        const goal = g.type === 'numeric' ? md(T('gNumeric', { cur: num(g.cur, lang, 0), target: num(g.target, lang, 0), unit: String(g.unit || '') })) : g.type === 'checklist' ? T('gChecklist', { done: g.done || 0, n: g.n || 0 }) : T('gSimple');
        const st = p.achieved ? T('achieved') : p.deadline && p.prob != null ? T('probability', { p: p.prob }) : T('statusN', { n: p.score ?? 0 });
        const retos = [...(p.retoLog || []).map(r => `${dateTxt(r.from, lang)}–${dateTxt(r.to, lang)}: ${T(r.ok ? 'retoOk' : 'retoKo')}`), ...(p.deadline ? [T('retoActive', { d: dateTxt(p.deadline, lang) })] : [])];
        return [cell(p.name) + (p.archived ? ' ' + T('archivedTag') : ''), goal + (g.type !== 'simple' && g.pct != null ? ` (${pct(g.pct, lang)})` : ''), p.deadline ? dateTxt(p.deadline, lang) : T('noDeadline'), st, retos.length ? retos.map(x => md(x)).join('; ') : T('none')];
      }));
    }

    // Organización
    out += h2(T('work'));
    out += h3(T('jobs'));
    const jobs = d.jobs || [];
    out += jobs.length ? table([T('job'), T('rate'), T('paid')], jobs.map(j => [cell(j.name), j.paid === false ? '—' : money(Math.round((+j.rate || 0) * 100), lang, d.cur), T(j.paid === false ? 'no' : 'yes')])) : empty(T('noJobs'));
    out += h3(T('places'));
    const pl = d.places || [];
    out += pl.length ? table([T('place'), T('addr')], pl.map(p => [cell(p.name), cell(p.addr)])) : empty(T('noPlaces'));
    out += h3(T('shifts'));
    const sh = d.shifts || [];
    out += sh.length ? table([T('shift'), T('hours'), T('job')], sh.map(s => [cell(s.name), s.start && s.end ? md(`${s.start}–${s.end}`) : '—', cell(s.job)])) : empty(T('noShifts'));
    out += h3(T('routines'));
    const rt = d.routines || [];
    out += rt.length ? table([T('routine'), T('kind'), T('nShifts')], rt.map(r => [cell(r.name), T(r.kind === 'week' ? 'rWeek' : 'rDay'), String(r.n || 0)])) : empty(T('noRoutines'));

    // Horas por mes y días por tipo
    const months = [...w.full, w.current];
    out += h3(T('hoursByMonth'));
    const work = new Map((d.work || []).map(x => [x.ym, x]));
    const wr = months.filter(ym => work.get(ym) && work.get(ym).count).map(ym => { const x = work.get(ym); return [monthLabel(ym, w, lang), num(x.hours, lang, 1), String(x.count), money(Math.round((+x.pay || 0) * 100), lang, d.cur)]; });
    out += wr.length ? table([T('month'), T('hoursH'), T('count'), T('pay')], wr) : empty(T('noHours'));
    out += h3(T('dayKinds'));
    const dk = new Map(); const kindNames = [];
    for (const [k, names] of Object.entries(d.dayKinds || {})) {
      if (!isKey(k) || !months.includes(k.slice(0, 7))) continue;
      for (const n of (Array.isArray(names) ? names : [names]).slice(0, 3)) {
        const name = String(n || ''); if (!name) continue;
        if (!kindNames.includes(name)) kindNames.push(name);
        const m = dk.get(k.slice(0, 7)) || dk.set(k.slice(0, 7), {}).get(k.slice(0, 7)); m[name] = (m[name] || 0) + 1;
      }
    }
    out += kindNames.length ? table([T('month'), ...kindNames.map(cell)], months.filter(ym => dk.has(ym)).map(ym => [monthLabel(ym, w, lang), ...kindNames.map(n => String(dk.get(ym)[n] || 0))])) : empty(T('noDayKinds'));

    // Valoración y energía (media por mes)
    const avgBy = (map, get) => {
      const m = new Map();
      for (const [k, v] of Object.entries(map || {})) { const x = get(v); if (!isKey(k) || x == null || !months.includes(k.slice(0, 7))) continue; const a = m.get(k.slice(0, 7)) || m.set(k.slice(0, 7), { s: 0, n: 0 }).get(k.slice(0, 7)); a.s += x; a.n++; }
      return months.filter(ym => m.has(ym)).map(ym => [monthLabel(ym, w, lang), num(m.get(ym).s / m.get(ym).n, lang, 1), String(m.get(ym).n)]);
    };
    out += h2(T('rating'));
    const rr = avgBy(d.dayRate, v => (v && Number.isInteger(v.r) && v.r >= 0 && v.r <= 10 ? v.r : null));
    out += rr.length ? table([T('month'), T('avg') + ' /10', T('nDays')], rr) : empty(T('noRating'));
    out += h2(T('energy'));
    const er = avgBy(d.energy, v => (Number.isFinite(+v) && +v >= 1 && +v <= 5 ? +v : null));
    out += er.length ? table([T('month'), T('avg') + ' /5', T('nDays')], er) : empty(T('noEnergy'));

    // Revisiones semanales
    out += h2(T('reviews'));
    const from = w.full[0] + '-01';
    const rv = Object.entries(d.reviews || {}).filter(([k, v]) => isKey(k) && k >= from && v && typeof v === 'object').sort((a, b) => (a[0] < b[0] ? 1 : -1));
    out += rv.length ? table([T('week'), T('score'), T('good'), T('adjust')], rv.map(([k, v]) => [dateTxt(k, lang), Number.isFinite(+v.score) ? `${Math.round(+v.score)}/10` : '—', cell(v.good), cell(v.adjust)])) : empty(T('noReviews'));

    // Contrato
    out += h2(T('contract'));
    const c = d.contract;
    out += c ? table([T('name'), T('signedAt'), T('endsAt'), T('level'), T('renewals')], [[cell(c.name), dateTxt(c.signedAt, lang), c.endsAt ? dateTxt(c.endsAt, lang) : '—', cell(c.level), String(c.renewals || 0)]]) : empty(T('noContract'));
    return out;
  }

  /* =========================================================
     2. keepgoing-mi-libreta.md
     ========================================================= */
  // Cada movimiento (ya neto de sus vinculados y sin los «Pendiente de devolver» abiertos) va a una sola cubeta:
  // salary (nómina), income (otros ingresos), refund (cobro de una deuda: e.pay), expense o invest
  const bucketOf = (e, salaryIds) => (e.type === 'invest' ? 'invest' : e.type === 'income' ? (e.pay && e.pay.e ? 'refund' : salaryIds.has(e.categoryId) ? 'salary' : 'income') : 'expense');
  const KEYS = ['salary', 'income', 'refund', 'expense', 'invest'];
  function monthTotals(entries, salaryIds, months) {
    const m = new Map(months.map(ym => [ym, { salary: 0, income: 0, refund: 0, expense: 0, invest: 0, cats: new Map(), n: 0 }]));
    for (const e of entries || []) {
      if (!isKey(e.date)) continue;
      const b = m.get(e.date.slice(0, 7)); if (!b) continue;
      const k = bucketOf(e, salaryIds), c = Math.max(0, Math.round(+e.amountCents || 0));
      b[k] += c; b.n++;
      if (c) { const ck = k + '|' + (e.categoryId || 'other'); b.cats.set(ck, (b.cats.get(ck) || 0) + c); }
    }
    return m;
  }
  /* Supuestos de una proyección (items de la Calculadora, ya en la moneda principal, importes en euros):
     sueldo y gastos del Punto de partida; aportación = suma de las «Aportaciones periódicas» pasada a mes;
     pagas extras = importe × meses del año / 12. Devuelve céntimos. */
  function assumptions(items) {
    const list = Array.isArray(items) ? items : [], start = list.find(x => x && x.kind === 'start') || null;
    if (!start) return null;
    const c = v => Math.round((Number(v) || 0) * 100);
    let contribution = 0, extraYear = 0;
    for (const x of list) {
      if (!x || x.kind !== 'applied' || !x.values) continue;
      if (x.type === 'periodic') { const a = c(x.values.amount); contribution += x.values.frequency === 'weekly' ? Math.round(a * 52 / 12) : x.values.frequency === 'yearly' ? Math.round(a / 12) : a; }
      if (x.type === 'extraPay') extraYear += c(x.values.amount) * (Array.isArray(x.values.months) ? x.values.months.length : 0);
    }
    const h = Math.max(1, Math.round(Number(start.horizon) || 12));
    return { salary: c(start.salary), expenses: c(start.expenses), contribution, extra: Math.round(extraYear / 12), date: isKey(start.date) ? start.date : null, horizon: h, unit: start.unit === 'years' ? 'years' : 'months' };
  }

  function ledgerNote(d) {
    const lang = d.lang === 'en' ? 'en' : 'es', T = (k, p) => tr(lang, k, p), cur = d.cur || 'EUR', M = c => money(c, lang, cur);
    let out = front('libreta', d.generatedAt) + `\n# ${T('ledgerTitle')}\n\n${T('generated', { d: dateTxt(d.today, lang) })}\n`;
    if (d.locked) return out + '\n' + T('lockedOut') + '\n';
    const entries = (d.entries || []).filter(e => e && isKey(e.date) && e.date <= d.today);
    const first = entries.reduce((a, e) => (!a || e.date < a ? e.date : a), null);
    const w = monthWindow(d.today, 12, first), all = [...w.full, w.current];
    const salaryIds = new Set(d.salaryIds || ['salary']);
    const catName = id => { const c = (d.cats || []).find(x => x.id === id); return c ? c.name : id; };
    const mt = monthTotals(entries, salaryIds, all);
    out += '\n' + T('period', { a: ymTxt(w.full[0] || w.current, lang), b: monthLabel(w.current, w, lang) }) + '\n';

    // Resumen por mes
    out += h2(T('summary'));
    const used = all.filter(ym => mt.get(ym).n);
    if (!used.length) out += empty(T('noEntries'));
    else {
      out += table([T('month'), T('salary'), T('otherIncome'), T('refunds'), T('expenses'), T('invest'), T('net')], used.map(ym => {
        const b = mt.get(ym);
        return [monthLabel(ym, w, lang), M(b.salary), M(b.income), M(b.refund), M(b.expense), M(b.invest), signedMoney(b.salary + b.income - b.expense, lang, cur)];
      }));
      out += '\n' + T('refundsNote') + '\n';
      // Por mes y categoría
      out += h2(T('byCat'));
      const tName = { salary: T('tIncome'), income: T('tIncome'), refund: T('tRefund'), expense: T('tExpense'), invest: T('tInvest') };
      for (const ym of [...used].reverse()) {
        const b = mt.get(ym);
        const rows = [...b.cats].map(([k, v]) => { const [bk, id] = k.split('|'); return { bk, id, v }; }).sort((x, y) => KEYS.indexOf(x.bk) - KEYS.indexOf(y.bk) || y.v - x.v);
        out += h3(monthLabel(ym, w, lang));
        out += rows.length ? table([T('category'), T('type'), T('amount')], rows.map(r => [cell(catName(r.id)), tName[r.bk], M(r.v)])) : empty(T('noEntries'));
      }
    }

    // Patrimonio
    out += h2(T('worth'));
    const wo = d.worth;
    if (!wo || !wo.set) out += empty(T('noWorth'));
    else {
      out += T('worthAt', { d: dateTxt(wo.date, lang) }) + '\n\n';
      const rows = [[T('digital'), M(wo.digital)], [T('cash'), M(wo.cash)], [T('invested'), M(wo.value)]];
      for (const [code, x] of Object.entries(wo.cur || {})) {
        if (!/^[A-Z0-9]{2,6}$/.test(code)) continue;
        const own = (x.digital || 0) + (x.cash || 0), r = +((wo.rates || {})[code]) || 0;
        rows.push([`${T('otherCur')} · ${code}`, money(own, lang, code) + (x.off ? ` (${T('notSummed')})` : r > 0 ? ` ≈ ${M(Math.round(own * r))}` : ` (${T('noRate')})`)]);
      }
      rows.push([`**${T('total')}**`, `**${M(wo.patrimony)}**`]);
      out += table([T('concept'), T('amount')], rows);
    }

    // Presupuesto global
    out += h2(T('budget'));
    const bu = d.budget;
    if (!bu || !(bu.rows || []).length) out += empty(T('noBudget'));
    else {
      const rows = bu.rows.filter(r => all.includes(r.ym));
      out += table([T('month'), T('bBudget'), T('bSpent'), T('bDiff'), T('bAcc')], rows.map(r => [monthLabel(r.ym, w, lang), M(r.budget), M(r.spent), signedMoney(r.diff, lang, cur), signedMoney(r.acc, lang, cur)]));
      out += '\n' + T('bFrom', { m: isYm(bu.from) ? ymTxt(bu.from, lang) : '—', v: signedMoney(bu.rows[bu.rows.length - 1].acc, lang, cur) }) + '\n';
    }

    // Deudas abiertas
    out += h2(T('debts'));
    const db = (d.debts || []).filter(x => x && x.left > 0);
    out += db.length ? table([T('who'), T('side'), T('date'), T('note'), T('expected'), T('paidD'), T('left')], db.map(x => [cell(x.who), T(x.side === 'contra' ? 'contra' : 'favor'), dateTxt(x.date, lang), cell(x.note), M(x.expected), M(x.paid), M(x.left)])) : empty(T('noDebts'));

    // Comparativa con las proyecciones
    out += h2(T('compare'));
    const projs = (d.projections || []).map(p => ({ name: p.name, a: assumptions(p.items) })).filter(p => p.a);
    if (!projs.length) out += empty(T('noProj'));
    else {
      const full = w.full.filter(ym => mt.get(ym)), n = full.length;
      const avg = k => (n ? Math.round(full.reduce((s, ym) => s + mt.get(ym)[k], 0) / n) : null);
      const extraIds = new Set(d.extraIds || ['extra']);
      const extraReal = ym => [...mt.get(ym).cats].reduce((s, [k, v]) => (k.startsWith('income|') && extraIds.has(k.slice(7)) ? s + v : s), 0);
      const real = { salary: avg('salary'), expenses: avg('expense'), contribution: avg('invest'), extra: n ? Math.round(full.reduce((s, ym) => s + extraReal(ym), 0) / n) : null };
      const cm = mt.get(w.current), now = { salary: cm.salary, expenses: cm.expense, contribution: cm.invest, extra: extraReal(w.current) };
      if (!n) out += T('noFull') + '\n';
      for (const p of projs) {
        out += h3(cell(p.name));
        out += T('projMeta', { d: p.a.date ? dateTxt(p.a.date, lang) : '—', h: T(p.a.unit)(p.a.horizon), n, a: n ? ymTxt(full[0], lang) : '—', b: n ? ymTxt(full[n - 1], lang) : '—' }) + '\n\n';
        const curHead = T('current', { p: w.partial ? T('partial', { n: w.day }) : '' }).trim();
        out += table([T('concept'), T('assumed'), T('real'), T('diff'), curHead], [['salary', 'salary'], ['expenses', 'expenses'], ['contribution', 'contribution'], ['extra', 'extraPay']].map(([k, label]) => [
          T(label), M(p.a[k]), real[k] == null ? '—' : M(real[k]), real[k] == null ? '—' : signedMoney(real[k] - p.a[k], lang, cur), M(now[k])
        ]));
      }
      out += '\n' + T('extraNote', { c: md(catName([...extraIds][0])) }) + '\n';
    }
    return out;
  }

  /* =========================================================
     3. libreta-movimientos.csv (todos los movimientos tal cual, sin netear: d.rawEntries; si no, d.entries)
     ========================================================= */
  const CSV_HEAD = ['id', 'fecha', 'tipo', 'importe_eur', 'categoria', 'nota', 'metodo', 'moneda'];
  // toEur: céntimos de la moneda principal → céntimos de euro (o null si no hay cambio)
  function csv(d) {
    const lang = d.lang === 'en' ? 'en' : 'es', cur = d.cur || 'EUR';
    const toEur = cur === 'EUR' ? c => c : c => (+d.eurRate > 0 ? Math.round(c * +d.eurRate) : null);
    const tName = { income: tr(lang, 'tIncome'), expense: tr(lang, 'tExpense'), invest: tr(lang, 'tInvest') };
    const catName = id => { const c = (d.cats || []).find(x => x.id === id); return c ? c.name : id || ''; };
    const rows = (d.rawEntries || d.entries || []).filter(e => e && isKey(e.date)).slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).map(e => {
      const eur = toEur(Math.max(0, Math.round(+e.amountCents || 0)));
      return [e.id, e.date, tName[e.type] || tName.expense, eur == null ? '' : (eur / 100).toFixed(2), catName(e.categoryId), e.note || '', e.method || '', (e.fx && e.fx.cur) || cur].map(csvField).join(';');
    });
    return '﻿' + [CSV_HEAD.join(';'), ...rows].join('\r\n') + '\r\n';
  }

  /* =========================================================
     4. estado-sin-libreta.json: copia profunda del estado sin las claves indicadas (lo cifrado de la Libreta y kx)
     ========================================================= */
  function stripState(state, drop) {
    const out = {}, skip = new Set(drop || []);
    for (const k of Object.keys(state || {})) if (!skip.has(k)) out[k] = state[k];
    return JSON.parse(JSON.stringify(out));
  }

  /* ---------- los cuatro archivos, validados ---------- */
  const utf8 = s => (typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(s) : Uint8Array.from(Buffer.from(s, 'utf8')));
  function files(d) {
    const list = [
      { path: PATHS.data, text: dataNote(d.data), type: 'text/markdown' },
      { path: PATHS.ledger, text: ledgerNote(d.ledger), type: 'text/markdown' },
      { path: PATHS.csv, text: csv(d.ledger.locked ? { ...d.ledger, entries: [], rawEntries: [] } : d.ledger), type: 'text/csv' },
      { path: PATHS.json, text: JSON.stringify({ app: 'KeepGoing', exportedAt: d.data.generatedAt, data: stripState(d.state, d.drop) }, null, 1), type: 'application/json' }
    ];
    let total = 0;
    for (const f of list) {
      if (!safePath(f.path)) throw new Error('path');
      f.bytes = utf8(f.text); total += f.bytes.length;
      if (f.bytes.length > MAX_FILE || total > MAX_TOTAL) throw new Error('tooBig');
    }
    return list;
  }

  /* ---------- .zip sin compresión (método «store»), nombres en UTF-8 ---------- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8) { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
  function zip(list, when = new Date()) {
    const dosT = (when.getHours() << 11) | (when.getMinutes() << 5) | (when.getSeconds() >> 1);
    const dosD = ((Math.max(1980, when.getFullYear()) - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate();
    const parts = [], central = []; let off = 0;
    for (const f of list) {
      if (!safePath(f.path)) throw new Error('path');
      const name = utf8(f.path), data = f.bytes || utf8(f.text), crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, dosT, true); lh.setUint16(12, dosD, true); lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
      lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, dosT, true); ch.setUint16(14, dosD, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
      ch.setUint16(28, name.length, true); ch.setUint32(42, off, true);
      central.push(new Uint8Array(ch.buffer), name);
      off += 30 + name.length + data.length;
    }
    const cdSize = central.reduce((a, p) => a + p.length, 0), end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, list.length, true); end.setUint16(10, list.length, true); end.setUint32(12, cdSize, true); end.setUint32(16, off, true);
    const all = [...parts, ...central, new Uint8Array(end.buffer)], out = new Uint8Array(all.reduce((a, p) => a + p.length, 0));
    let i = 0; for (const p of all) { out.set(p, i); i += p.length; }
    return out;
  }

  // Enlace para abrir la nota en Obsidian (el nombre de la bóveda va codificado)
  const vaultOk = v => typeof v === 'string' && v.trim().length > 0 && v.length <= 120 && !/[\u0000-\u001f]/.test(v);
  const openUrl = vault => 'obsidian://open?vault=' + encodeURIComponent(vault.trim()) + '&file=' + encodeURIComponent(PATHS.data.replace(/\.md$/, ''));

  /* =========================================================
     Navegador: carpeta de la bóveda (File System Access API) e IndexedDB.
     Solo se guardan el identificador de la carpeta y el nombre de la bóveda; nunca el contenido.
     ========================================================= */
  const canPick = () => typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
  const DB = 'kg-obsidian', STORE = 'kv';
  function idb(mode, fn) {
    return new Promise((res, rej) => {
      if (typeof indexedDB === 'undefined') { rej(new Error('idb')); return; }
      const rq = indexedDB.open(DB, 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore(STORE);
      rq.onerror = () => rej(new Error('idb'));
      rq.onsuccess = () => {
        const db = rq.result, tx = db.transaction(STORE, mode), st = tx.objectStore(STORE), r = fn(st);
        tx.oncomplete = () => { db.close(); res(r && 'result' in r ? r.result : undefined); };
        tx.onerror = tx.onabort = () => { db.close(); rej(new Error('idb')); };
      };
    });
  }
  const kvGet = k => idb('readonly', st => st.get(k)).catch(() => null);
  const kvSet = (k, v) => idb('readwrite', st => st.put(v, k)).catch(() => null);
  async function hasObsidian(dir) { try { await dir.getDirectoryHandle('.obsidian'); return true; } catch (e) { return false; } }
  // Elige la carpeta raíz de la bóveda (debe contener .obsidian). Devuelve el identificador o lanza 'notVault' / 'abort'
  async function pickVault() {
    let dir;
    try { dir = await window.showDirectoryPicker({ id: 'kg-obsidian', mode: 'readwrite' }); } catch (e) { throw new Error('abort'); }
    if (!(await hasObsidian(dir))) throw new Error('notVault');
    await kvSet('dir', dir);
    return dir;
  }
  const savedDir = () => kvGet('dir');
  const forgetDir = () => kvSet('dir', null);
  const savedVault = () => kvGet('vault');
  const saveVault = v => kvSet('vault', vaultOk(v) ? v.trim() : null);
  // Pide el permiso de escritura (necesita un gesto del usuario si el navegador lo había retirado)
  async function permit(dir) {
    const o = { mode: 'readwrite' };
    try { if ((await dir.queryPermission(o)) === 'granted') return true; return (await dir.requestPermission(o)) === 'granted'; } catch (e) { return false; }
  }
  async function writeFiles(dir, list) {
    if (!(await hasObsidian(dir))) throw new Error('notVault');
    let n = 0;
    for (const f of list) {
      if (!safePath(f.path)) throw new Error('path');
      const segs = f.path.split('/'), name = segs.pop();
      let d = dir; for (const s of segs) d = await d.getDirectoryHandle(s, { create: true });
      const fh = await d.getFileHandle(name, { create: true }), wr = await fh.createWritable();
      try { await wr.write(f.bytes || utf8(f.text)); } finally { await wr.close(); }
      n++;
    }
    return n;
  }

  return { PATHS, DIRS, MAX_FILE, MAX_TOTAL, safePath, md, csvField, money, monthWindow, assumptions, monthTotals, bucketOf, dataNote, ledgerNote, csv, CSV_HEAD, stripState, files, crc32, zip, vaultOk, openUrl,
    canPick, pickVault, savedDir, forgetDir, savedVault, saveVault, permit, writeFiles, hasObsidian };
});
