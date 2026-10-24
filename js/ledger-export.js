/* KeepGoing — Libreta de Gastos: exportación a un único documento HTML autocontenido
   (CSS y SVG en línea, sin peticiones externas y sin scripts). Sirve para descargar un .html
   («exportar») y para mostrar en solo lectura, dentro de un <iframe srcdoc>, una libreta compartida.
   Se usa en el navegador (window.KGLedgerExport) y en los tests de Node (require).
   Todo texto del usuario (notas, nombres, iconos, títulos) pasa por esc(); los colores se validan. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KGLedgerExport = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const IN_C = '#2fbf71', OUT_C = '#e5484d';
  const PIE_COLORS = ['#ff6b6b', '#4cc9f0', '#f7c948', '#c77dff', '#3ddc97', '#ff8a5b', '#5b8cff', '#ff5d8f', '#a3e635', '#2ec4b6', '#b8b8c8'];
  const MASK = '•••';

  const I18N = {
    es: {
      income: 'Ingresos', expense: 'Gastos', balance: 'Saldo',
      byCatOut: 'Gastos por categoría', byCatIn: 'Ingresos por categoría',
      evolution: 'Ingresos y gastos', events: 'Eventos', entries: 'Movimientos',
      nEntries: n => n === 1 ? '1 movimiento' : `${n} movimientos`,
      nDays: n => n === 1 ? '1 día' : `${n} días`,
      byDay: 'por día', byMonth: 'por mes', byYear: 'por año',
      empty: 'No hay movimientos en este periodo.', emptyChart: 'Sin datos en este periodo.',
      other: 'Otros', total: 'total', generated: 'Generado el', readOnly: 'Solo lectura',
      spent: 'Gastado', earned: 'Ingresado', avgDay: 'Gasto medio diario',
      method_card: 'Tarjeta', method_cash: 'Efectivo', method_transfer: 'Transferencia', method_other: 'Otro',
      ofExpense: 'del gasto'
    },
    en: {
      income: 'Income', expense: 'Expenses', balance: 'Balance',
      byCatOut: 'Expenses by category', byCatIn: 'Income by category',
      evolution: 'Income and expenses', events: 'Events', entries: 'Entries',
      nEntries: n => n === 1 ? '1 entry' : `${n} entries`,
      nDays: n => n === 1 ? '1 day' : `${n} days`,
      byDay: 'per day', byMonth: 'per month', byYear: 'per year',
      empty: 'No entries in this period.', emptyChart: 'No data in this period.',
      other: 'Other', total: 'total', generated: 'Generated on', readOnly: 'Read-only',
      spent: 'Spent', earned: 'Earned', avgDay: 'Average daily spend',
      method_card: 'Card', method_cash: 'Cash', method_transfer: 'Transfer', method_other: 'Other',
      ofExpense: 'of spending'
    }
  };

  /* ---------- utilidades seguras ---------- */
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
  const esc = v => String(v ?? '').replace(/[&<>"'`]/g, c => ESC[c]);
  const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const safeColor = (c, fb) => (typeof c === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(c) ? c : fb);
  const cents = n => (Number.isFinite(+n) ? Math.round(+n) : 0);
  const pad = n => String(n).padStart(2, '0');
  const utc = k => { const [y, m, d] = k.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const keyUTC = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const diffDays = (a, b) => Math.round((utc(b) - utc(a)) / 86400000);

  /* ---------- cálculos (mismos criterios que js/ledger.js) ---------- */
  function totals(entries) {
    let income = 0, expense = 0;
    for (const e of entries) { if (e.type === 'income') income += e.amountCents; else if (e.type !== 'invest') expense += e.amountCents; }
    return { income, expense, net: income - expense };
  }
  function byCategory(entries, type) {
    const m = new Map();
    for (const e of entries) if (e.type === type) { const c = e.categoryId || 'other'; m.set(c, (m.get(c) || 0) + e.amountCents); }
    return [...m].map(([id, v]) => ({ id, cents: v })).sort((a, b) => b.cents - a.cents || (a.id < b.id ? -1 : 1));
  }
  function series(entries, from, to, unit) {
    const keyFor = d => unit === 'year' ? d.slice(0, 4) : unit === 'month' ? d.slice(0, 7) : d;
    const keys = [];
    if (unit === 'year') for (let y = +from.slice(0, 4); y <= +to.slice(0, 4) && keys.length < 500; y++) keys.push(String(y));
    else if (unit === 'month') { let y = +from.slice(0, 4), m = +from.slice(5, 7); const end = to.slice(0, 7); while (keys.length < 2000) { const k = `${y}-${pad(m)}`; if (k > end) break; keys.push(k); if (++m > 12) { m = 1; y++; } } }
    else { const d = utc(from); for (let i = 0; i < 4000; i++) { const k = keyUTC(d); if (k > to) break; keys.push(k); d.setUTCDate(d.getUTCDate() + 1); } }
    const map = new Map(keys.map(k => [k, { key: k, income: 0, expense: 0 }]));
    for (const e of entries) { const b = map.get(keyFor(e.date)); if (b && e.type !== 'invest') b[e.type === 'income' ? 'income' : 'expense'] += e.amountCents; }
    return keys.map(k => map.get(k));
  }

  /* ---------- formato ---------- */
  function makeFmt(money, lang, privacy) {
    let locale = (money && money.locale) || (lang === 'en' ? 'en-GB' : 'es-ES'), currency = (money && money.currency) || 'EUR';
    try { new Intl.NumberFormat(locale, { style: 'currency', currency }); } catch (_) { locale = lang === 'en' ? 'en-GB' : 'es-ES'; currency = 'EUR'; }
    const nf = new Intl.NumberFormat(locale, { style: 'currency', currency });
    const money2 = c => privacy ? MASK : nf.format(c / 100);
    const compact = c => {
      if (privacy) return MASK;
      const v = c / 100;
      return new Intl.NumberFormat(locale, { style: 'currency', currency, notation: Math.abs(v) >= 10000 ? 'compact' : 'standard', maximumFractionDigits: Math.abs(v) >= 100 || Number.isInteger(v) ? 0 : 2 }).format(v);
    };
    const date = (k, o) => new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...o }).format(utc(k));
    return { locale, money: money2, compact, date };
  }

  /* ---------- gráficas ---------- */
  function donut(segs, total, centerTop, centerLabel, F, D) {
    if (!total) return `<p class="muted empty-chart">${esc(D.emptyChart)}</p>`;
    const R = 42, C = 2 * Math.PI * R; let acc = 0;
    const arcs = segs.map(s => {
      const f = s.value / total, len = Math.max(0, f * C - (segs.length > 1 ? 1.2 : 0));
      const a = `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${s.color}" stroke-width="15" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-acc * C).toFixed(2)}"><title>${esc(s.label)} · ${pct(f)}</title></circle>`;
      acc += f; return a;
    }).join('');
    return `<div class="pie-wrap"><svg class="pie" viewBox="0 0 120 120" role="img" aria-label="${esc(centerLabel)}"><g transform="rotate(-90 60 60)"><circle class="pie-track" cx="60" cy="60" r="${R}" fill="none" stroke-width="15"/>${arcs}</g>
<text x="60" y="58" text-anchor="middle" class="pie-c1">${esc(centerTop)}</text><text x="60" y="72" text-anchor="middle" class="pie-c2">${esc(centerLabel)}</text></svg>
<ul class="pie-legend">${segs.map(s => `<li><i style="background:${s.color}"></i><span class="lg-ico" aria-hidden="true">${esc(s.icon)}</span><span class="grow">${esc(s.name)}</span><b>${pct(s.value / total)}</b><span class="lg-amt">${esc(F.money(s.value))}</span></li>`).join('')}</ul></div>`;
  }
  const pct = f => { const p = f * 100; return (p > 0 && p < 1 ? '<1' : String(Math.round(p))) + '%'; };

  function twoDot(rows, W, H, F, cls) {
    const pl = 54, pr = 16, pt = 16, pb = 30, iw = W - pl - pr, ih = H - pt - pb, n = rows.length;
    const hi = Math.max(1, ...rows.map(r => Math.max(r.income, r.expense)));
    const x = i => pl + (n === 1 ? iw / 2 : i * iw / (n - 1)), y = v => pt + ih - v / hi * ih;
    const rad = n > 60 ? 2 : n > 30 ? 3 : 4.5;
    const area = (k, c) => n > 1 ? `<path d="M${x(0).toFixed(1)},${(pt + ih).toFixed(1)}${rows.map((r, i) => `L${x(i).toFixed(1)},${y(r[k]).toFixed(1)}`).join('')}L${x(n - 1).toFixed(1)},${(pt + ih).toFixed(1)}Z" fill="url(#g-${k}-${cls})" />` : '';
    const line = (k, c) => `${n > 1 ? `<path d="${rows.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(r[k]).toFixed(1)}`).join('')}" fill="none" stroke="${c}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" opacity=".9"/>` : ''}${rows.map((r, i) => n > 14 && !r[k] ? '' : `<circle class="pt" cx="${x(i).toFixed(1)}" cy="${y(r[k]).toFixed(1)}" r="${rad}" fill="${c}"><title>${esc(r.sub)} · ${esc(F.money(r[k]))}</title></circle>`).join('')}`;
    const nl = Math.min(n, W < 500 ? 4 : 7), labelIdx = [...new Set(Array.from({ length: nl }, (_, i) => Math.round(i * (n - 1) / Math.max(1, nl - 1))))];
    const grad = (k, c) => `<linearGradient id="g-${k}-${cls}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".22"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient>`;
    return `<svg class="line ${cls}" viewBox="0 0 ${W} ${H}" role="img"><defs>${grad('income', IN_C)}${grad('expense', OUT_C)}</defs>
${[0, hi / 2, hi].map(v => `<line class="grid-line" x1="${pl}" x2="${W - pr}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="axis-label" x="${pl - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${esc(F.compact(v))}</text>`).join('')}
${area('expense')}${area('income')}${line('expense', OUT_C)}${line('income', IN_C)}
${labelIdx.map(i => `<text class="axis-label" x="${x(i).toFixed(1)}" y="${H - 9}" text-anchor="${i === 0 && n > 1 ? 'start' : i === n - 1 && n > 1 ? 'end' : 'middle'}">${esc(rows[i].label)}</text>`).join('')}
</svg>`;
  }

  /* ---------- estilos ---------- */
  const CSS = `
:root{--bg:#000;--fg:#fff;--surface:#1c1c1e;--surface-2:#2a2a2d;--surface-3:#38383c;--muted:#8e8e93;--line:rgba(255,255,255,.08);--accent:#3ddc97;--in:${IN_C};--out:${OUT_C};
--sh-out:0 14px 30px rgba(0,0,0,.55),0 2px 4px rgba(0,0,0,.3);--sh-in:inset 0 2px 1px rgba(255,255,255,.07),inset 0 -8px 16px rgba(0,0,0,.35);
--r-xl:30px;--r-lg:24px;--r-md:18px;--r-sm:12px;color-scheme:dark;
--font:"Quicksand",ui-rounded,"SF Pro Rounded",system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
*{box-sizing:border-box}
html,body{margin:0}
body{background:var(--bg);background-image:radial-gradient(1200px 500px at 50% -200px,rgba(61,220,151,.10),transparent 70%);color:var(--fg);font-family:var(--font);font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%}
.wrap{max-width:860px;margin:0 auto;padding:22px 16px 40px}
.clay{background:var(--surface);border-radius:var(--r-xl);box-shadow:var(--sh-out),var(--sh-in)}
.muted{color:var(--muted);font-weight:500}
.in{color:var(--in)}.out{color:var(--out)}
.num{font-variant-numeric:tabular-nums}
h1,h2,h3{margin:0;line-height:1.2;letter-spacing:-.01em}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 4px 14px}
.brand{display:inline-flex;align-items:center;gap:8px;font-weight:800;font-size:14px;letter-spacing:.01em}
.brand i{width:10px;height:10px;border-radius:50%;background:var(--accent);box-shadow:0 0 12px rgba(61,220,151,.7)}
.badge{font-size:11.5px;font-weight:700;color:var(--muted);background:var(--surface-2);border-radius:999px;padding:4px 10px}
.hero{padding:22px 20px 18px}
.hero h1{font-size:clamp(24px,6.5vw,34px);font-weight:800;overflow-wrap:anywhere}
.hero .sub{margin:6px 0 0;font-size:14.5px}
.sum{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:18px}
.sum div{background:var(--surface-2);border-radius:var(--r-md);padding:12px 10px;text-align:center;box-shadow:inset 0 1px 0 rgba(255,255,255,.05);min-width:0}
.sum span{display:block;font-size:12px;color:var(--muted);font-weight:600}
.sum b{display:block;font-size:clamp(14px,4.4vw,22px);font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.meta{display:flex;flex-wrap:wrap;gap:6px 16px;justify-content:center;margin:14px 0 0;font-size:12.5px;color:var(--muted);font-weight:600}
.meta b{color:var(--fg);font-weight:700}
.grid{display:grid;gap:16px;margin-top:16px;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))}
.card{padding:18px;min-width:0}
.card h2{font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px;margin:0 0 4px}
.card h2 .grow{flex:1;min-width:0}
.card h2 small{font-size:12px;color:var(--muted);font-weight:600}
.full{margin-top:16px}
.pie-wrap{display:flex;gap:16px 20px;align-items:center;flex-wrap:wrap;margin-top:12px}
.pie{width:168px;height:168px;flex:none;margin:0 auto}
.pie-track{stroke:var(--surface-2)}
.pie-c1{font-size:11.5px;font-weight:800;fill:var(--fg);font-family:var(--font)}
.pie-c2{font-size:7.5px;fill:var(--muted);font-weight:600;font-family:var(--font)}
.pie-legend{list-style:none;padding:0;margin:0;flex:1 1 220px;display:grid;gap:7px;min-width:0}
.pie-legend li{display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600;min-width:0}
.pie-legend li i{width:10px;height:10px;border-radius:4px;flex:none}
.lg-ico{width:20px;text-align:center;flex:none}
.pie-legend .grow{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pie-legend b{font-variant-numeric:tabular-nums;min-width:38px;text-align:right}
.lg-amt{color:var(--muted);font-size:12.5px;font-variant-numeric:tabular-nums;min-width:74px;text-align:right}
.empty-chart{margin:10px 0 0;font-size:13.5px}
svg.line{width:100%;height:auto;display:block;margin-top:10px}
svg.line.sm{display:none}
@media (max-width:560px){svg.line.lg{display:none}svg.line.sm{display:block}}
.grid-line{stroke:var(--line);stroke-width:1}
.axis-label{fill:var(--muted);font-size:11px;font-family:var(--font);font-weight:600}
.pt{stroke:var(--surface);stroke-width:1.5}
.dot-legend{display:flex;gap:18px;justify-content:center;font-size:12.5px;font-weight:600;color:var(--muted);margin-top:8px}
.dot-legend span{display:inline-flex;align-items:center;gap:6px}
.dot-legend i{width:10px;height:10px;border-radius:50%}
.sec{font-size:20px;font-weight:800;margin:28px 6px 12px;display:flex;align-items:baseline;gap:10px}
.sec small{font-size:13px;color:var(--muted);font-weight:600}
.events{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))}
.ev{padding:16px}
.ev-h{display:flex;align-items:center;gap:12px}
.ico{font-size:21px;width:40px;height:40px;display:grid;place-items:center;border-radius:13px;background:var(--surface-3);flex:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}
.ev-h .t{min-width:0;flex:1}
.ev-h b{display:block;font-size:15.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ev-h .t span{display:block;font-size:12.5px;line-height:1.35;margin-top:2px}
.ev-n{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.ev-n div{background:var(--surface-2);border-radius:var(--r-sm);padding:8px 10px}
.ev-n span{display:block;font-size:11.5px;color:var(--muted);font-weight:600}
.ev-n b{font-size:15px;font-variant-numeric:tabular-nums;white-space:nowrap}
.bar{height:6px;border-radius:99px;background:var(--surface-2);margin-top:12px;overflow:hidden}
.bar i{display:block;height:100%;border-radius:99px;background:var(--out)}
.ev-p{font-size:11.5px;margin-top:5px}
.day{padding:14px 14px 10px;margin-bottom:12px}
.day-h{display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding:0 4px 8px}
.day-h h3{font-size:15px;font-weight:700}
.day-h h3::first-letter{text-transform:uppercase}
.day-h span{font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}
.list{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.item{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:var(--r-md);background:var(--surface-2)}
.item .t{flex:1;min-width:0;display:flex;flex-direction:column}
.item .t b{font-weight:700;font-size:15px;overflow-wrap:anywhere}
.item .t span{font-size:12.5px}
.item .ico{width:38px;height:38px;font-size:20px;border-radius:12px}
.amt{font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;font-size:15px}
.empty{padding:28px 20px;text-align:center}
.empty div{font-size:40px;margin-bottom:6px}
footer{margin:28px 0 0;text-align:center;font-size:12.5px;color:var(--muted);font-weight:600}
footer .brand{font-size:13px;color:var(--fg);margin-bottom:4px}
@media (min-width:700px){.wrap{padding:36px 24px 56px}.hero{padding:28px 28px 22px}.card{padding:22px}.sum{gap:12px}.sum div{padding:14px 12px}}
@media (max-width:520px){.sum{grid-template-columns:1fr 1fr}.sum .net{grid-column:1/-1;order:-1;padding:14px 12px}.sum .net b{font-size:28px}.sum b{font-size:19px}.hero{padding:20px 18px 16px}}
@media (max-width:380px){.item{gap:10px;padding:9px 10px}.lg-amt{min-width:0}}
@media print{
:root{--bg:#fff;--fg:#111;--surface:#fff;--surface-2:#f3f4f6;--surface-3:#e9eaee;--muted:#5f6368;--line:rgba(0,0,0,.12);--in:#1a8a4f;--out:#c62a2f;color-scheme:light}
@page{margin:14mm}
body{background:#fff;background-image:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.wrap{max-width:none;padding:0}
.clay{box-shadow:none;border:1px solid #dcdde1}
.sum div,.ev-n div,.item,.ico{box-shadow:none}
.brand i{box-shadow:none}
.card,.ev,.day,.item,.hero{break-inside:avoid}
.sec{break-after:avoid}
svg.line.sm{display:none!important}svg.line.lg{display:block!important}
}`;

  /* ---------- documento ---------- */
  function html(opts) {
    const o = opts || {};
    const lang = o.lang === 'en' ? 'en' : 'es', D = I18N[lang], privacy = !!o.privacy;
    const F = makeFmt(o.money, lang, privacy);

    // Movimientos saneados
    const entries = (Array.isArray(o.entries) ? o.entries : []).filter(e => e && isDate(e.date)).map(e => ({
      id: e.id, date: e.date, type: e.type === 'income' || e.type === 'invest' ? e.type : 'expense',
      amountCents: Math.max(0, cents(e.amountCents)), categoryId: e.categoryId == null ? 'other' : String(e.categoryId),
      note: typeof e.note === 'string' ? e.note : '', method: typeof e.method === 'string' ? e.method : ''
    }));
    let from = isDate(o.from) ? o.from : null, to = isDate(o.to) ? o.to : null;
    if (!from || !to) { const ds = entries.map(e => e.date).sort(); from = from || ds[0] || keyUTC(new Date()); to = to || ds[ds.length - 1] || from; }
    if (from > to) [from, to] = [to, from];

    // Categorías: color propio validado o de la paleta, en orden estable
    const cats = new Map();
    (Array.isArray(o.cats) ? o.cats : []).forEach((c, i) => { if (c && c.id != null) cats.set(String(c.id), { name: String(c.name ?? ''), icon: String(c.icon ?? ''), color: safeColor(c.color, PIE_COLORS[i % PIE_COLORS.length]) }); });
    const catOf = id => cats.get(id) || { name: D.other, icon: '📦', color: '#b8b8c8' };
    const methodName = m => D['method_' + m] || '';

    const tot = totals(entries), days = diffDays(from, to) + 1;
    const segsOf = type => {
      const list = byCategory(entries, type), used = new Set();
      return list.map((c, i) => {
        const cat = catOf(c.id); let color = cat.color;
        if (used.has(color)) color = PIE_COLORS.find(p => !used.has(p)) || PIE_COLORS[i % PIE_COLORS.length];
        used.add(color);
        return { label: `${cat.icon} ${cat.name}`, icon: cat.icon, name: cat.name, value: c.cents, color };
      });
    };

    let body = '';
    // Cabecera
    body += `<div class="top"><span class="brand"><i></i>KeepGoing</span><span class="badge">${esc(D.readOnly)}</span></div>`;
    const netCls = privacy ? '' : tot.net > 0 ? 'in' : tot.net < 0 ? 'out' : '';
    const netTxt = privacy ? MASK : (tot.net > 0 ? '+' : tot.net < 0 ? '−' : '') + F.money(Math.abs(tot.net));
    body += `<header class="hero clay"><h1>${esc(o.title || '')}</h1>${o.subtitle ? `<p class="sub muted">${esc(o.subtitle)}</p>` : ''}
<div class="sum"><div><span>${esc(D.income)}</span><b class="in">${esc(F.money(tot.income))}</b></div><div><span>${esc(D.expense)}</span><b class="out">${esc(F.money(tot.expense))}</b></div><div class="net"><span>${esc(D.balance)}</span><b class="${netCls}">${esc(netTxt)}</b></div></div>
<p class="meta"><span><b>${esc(D.nEntries(entries.length))}</b></span><span><b>${esc(D.nDays(days))}</b></span>${tot.expense ? `<span>${esc(D.avgDay)}: <b>${esc(F.money(Math.round(tot.expense / days)))}</b></span>` : ''}</p></header>`;

    if (!entries.length) {
      body += `<section class="clay card empty full"><div aria-hidden="true">🗒️</div><p class="muted">${esc(D.empty)}</p></section>`;
    } else {
      // Tartas
      const so = segsOf('expense'), si = segsOf('income');
      body += `<div class="grid"><section class="clay card"><h2><span aria-hidden="true">🥧</span><span class="grow">${esc(D.byCatOut)}</span></h2>${donut(so, tot.expense, F.money(tot.expense), D.expense, F, D)}</section>`;
      if (tot.income) body += `<section class="clay card"><h2><span aria-hidden="true">💰</span><span class="grow">${esc(D.byCatIn)}</span></h2>${donut(si, tot.income, F.money(tot.income), D.income, F, D)}</section>`;
      body += `</div>`;
      // Evolución
      const unit = days <= 45 ? 'day' : days <= 3 * 366 ? 'month' : 'year';
      const rows = series(entries, from, to, unit).map(r => ({
        ...r,
        label: unit === 'year' ? r.key : unit === 'month' ? F.date(r.key + '-01', { month: 'short', year: '2-digit' }) : F.date(r.key, { day: 'numeric', month: 'short' }),
        sub: unit === 'year' ? r.key : unit === 'month' ? F.date(r.key + '-01', { month: 'long', year: 'numeric' }) : F.date(r.key, { day: 'numeric', month: 'long', year: 'numeric' })
      }));
      body += `<section class="clay card full"><h2><span aria-hidden="true">📈</span><span class="grow">${esc(D.evolution)}</span><small>${esc(D[unit === 'day' ? 'byDay' : unit === 'month' ? 'byMonth' : 'byYear'])}</small></h2>
${twoDot(rows, 760, 260, F, 'lg')}${twoDot(rows, 360, 220, F, 'sm')}
<div class="dot-legend"><span><i style="background:${IN_C}"></i>${esc(D.income)}</span><span><i style="background:${OUT_C}"></i>${esc(D.expense)}</span></div></section>`;
    }

    // Eventos: movimientos de sus categorías dentro de sus fechas ∩ rango (sin categorías = todas)
    // Solo los que se solapan con el rango exportado
    const events = (Array.isArray(o.events) ? o.events : []).filter(ev => ev && typeof ev === 'object' && !(isDate(ev.to) && ev.to < from) && !(isDate(ev.from) && ev.from > to));
    if (events.length) {
      body += `<h2 class="sec">${esc(D.events)}</h2><div class="events">`;
      for (const ev of events) {
        const ef = isDate(ev.from) && ev.from > from ? ev.from : from, et = isDate(ev.to) && ev.to < to ? ev.to : to;
        const ids = Array.isArray(ev.catIds) ? new Set(ev.catIds.map(String)) : new Set();
        const list = ef <= et ? entries.filter(e => e.date >= ef && e.date <= et && (!ids.size || ids.has(e.categoryId))) : [];
        const t = totals(list), share = tot.expense ? t.expense / tot.expense : 0;
        const dates = isDate(ev.from) && isDate(ev.to) ? `${F.date(ev.from, { day: 'numeric', month: 'short' })} – ${F.date(ev.to, { day: 'numeric', month: 'short', year: 'numeric' })}` : '';
        body += `<section class="clay ev"><div class="ev-h"><span class="ico" aria-hidden="true">${esc(ev.icon || '📅')}</span><div class="t"><b>${esc(ev.name || '')}</b>${dates ? `<span class="muted">${esc(dates)}</span>` : ''}<span class="muted">${esc(D.nEntries(list.length))}</span></div></div>
<div class="ev-n"><div><span>${esc(D.spent)}</span><b class="out">${esc(F.money(t.expense))}</b></div><div><span>${esc(D.earned)}</span><b class="in">${esc(F.money(t.income))}</b></div></div>
${tot.expense ? `<div class="bar"><i style="width:${(share * 100).toFixed(1)}%"></i></div><div class="ev-p muted">${esc(pct(share))} ${esc(D.ofExpense)}</div>` : ''}</section>`;
      }
      body += `</div>`;
    }

    // Lista por días (más reciente primero)
    if (entries.length) {
      const groups = new Map();
      for (const e of [...entries].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))) (groups.get(e.date) || groups.set(e.date, []).get(e.date)).push(e);
      const sameYear = from.slice(0, 4) === to.slice(0, 4);
      body += `<h2 class="sec">${esc(D.entries)}<small>${esc(D.nEntries(entries.length))}</small></h2>`;
      for (const [day, list] of groups) {
        const dt = totals(list);
        const dn = privacy ? MASK : (dt.net > 0 ? '+' : dt.net < 0 ? '−' : '') + F.money(Math.abs(dt.net));
        body += `<section class="clay day"><div class="day-h"><h3>${esc(F.date(day, { weekday: 'long', day: 'numeric', month: 'long', ...(sameYear ? {} : { year: 'numeric' }) }))}</h3><span class="${privacy ? 'muted' : dt.net > 0 ? 'in' : dt.net < 0 ? 'out' : 'muted'}">${esc(dn)}</span></div><ul class="list">`;
        for (const e of list) {
          const c = catOf(e.categoryId), inc = e.type === 'income', inv = e.type === 'invest', m = methodName(e.method);
          body += `<li class="item"><span class="ico" aria-hidden="true">${esc(c.icon)}</span><span class="t"><b>${esc(e.note || c.name)}</b><span class="muted">${esc(c.name)}${m ? ' · ' + esc(m) : ''}</span></span><span class="amt ${inv ? '' : inc ? 'in' : 'out'}">${privacy || inv ? '' : inc ? '+' : '−'}${esc(F.money(e.amountCents))}</span></li>`;
        }
        body += `</ul></section>`;
      }
    }

    // Pie de página
    let gen = '';
    if (o.generatedAt) { const d = new Date(o.generatedAt); if (!isNaN(d)) gen = new Intl.DateTimeFormat(F.locale, { dateStyle: 'long', timeStyle: 'short' }).format(d); }
    body += `<footer><div class="brand"><i></i>KeepGoing</div>${o.footer ? `<div>${esc(o.footer)}</div>` : ''}${gen ? `<div>${esc(D.generated)} ${esc(gen)}</div>` : ''}</footer>`;

    // CSP: sin scripts ni peticiones externas, aunque el documento se abra suelto
    return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'">
<meta name="color-scheme" content="dark">
<meta name="robots" content="noindex">
<title>${esc(o.title || 'KeepGoing')}</title>
<style>${CSS}</style></head>
<body><main class="wrap">${body}</main></body></html>`;
  }

  // Nombre de archivo seguro: keepgoing-<titulo>-<desde>_<hasta>.html
  function filename(title, from, to) {
    let slug = String(title ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
    if (!slug || slug === 'keepgoing') slug = 'libreta';
    slug = slug.replace(/^keepgoing-/, '');
    const range = [from, to].filter(isDate).join('_');
    return `keepgoing-${slug}${range ? '-' + range : ''}.html`;
  }

  return { html, filename, esc };
});
