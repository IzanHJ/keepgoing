/* KeepGoing — Plantillas de notas de Organización (v1.27): lógica pura, sin DOM. Se usa en el navegador (window.KGNoteTpl) y en
   los tests de Node.
   Una plantilla = { id, name, icon, color, fields: [{ id, label, type, unit, opts }], prog: { key, amt } | null, goals: { clave: meta } }.
     type: 'text' (texto), 'num' (número con unidad), 'bool' (sí/no), 'rate' (valoración 0-10) o 'pick' (elegir de una lista).
     prog: el progreso suma el campo numérico «amt» por cada valor del campo de texto «key» (p. ej. páginas por libro).
     goals: la meta de cada valor de «key» (p. ej. { dune: 600 } páginas), con la clave en minúsculas y sin espacios de más.
   Una nota con plantilla vive en state.calGaps[fecha] como { a, b, t, tp, v, x }:
     a / b: horas 'HH:MM' o '' si es del día entero; tp: id de la plantilla; v: { idCampo: valor }; x: texto libre;
     t: el resumen ya escrito («Leer · Dune · 30 págs»), para que se vea igual en todas partes (Día, Mes, «Ver más» y PDF). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KGNoteTpl = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const TYPES = ['text', 'num', 'bool', 'rate', 'pick'];
  const ICONS = ['doc', 'book', 'dumbbell', 'cap', 'heart', 'calendar', 'clock', 'pin', 'users', 'sparkle', 'target', 'flame', 'smile', 'play', 'tag', 'list'];
  const LIM = { tpls: 30, fields: 8, opts: 12, goals: 300, name: 30, label: 30, unit: 10, opt: 24, text: 80, extra: 300, sum: 500 };
  const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  const keyOf = v => str(v, LIM.text).toLowerCase();
  const isHex = c => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c);
  const idOk = v => typeof v === 'string' && /^[A-Za-z0-9_-]{1,24}$/.test(v);
  const r2 = n => Math.round(n * 100) / 100;

  function sanitizeField(f, i) {
    if (!f || typeof f !== 'object') return null;
    const label = str(f.label, LIM.label); if (!label) return null;
    const type = TYPES.includes(f.type) ? f.type : 'text';
    const out = { id: idOk(f.id) ? f.id : 'f' + i, label, type };
    if (type === 'num') out.unit = str(f.unit, LIM.unit);
    if (type === 'pick') {
      const seen = new Set();
      out.opts = (Array.isArray(f.opts) ? f.opts : []).map(o => str(o, LIM.opt)).filter(o => o && !seen.has(o.toLowerCase()) && seen.add(o.toLowerCase())).slice(0, LIM.opts);
      if (!out.opts.length) return null;
    }
    return out;
  }
  function sanitizeTpl(t) {
    if (!t || typeof t !== 'object' || !idOk(t.id)) return null;
    const name = str(t.name, LIM.name); if (!name) return null;
    const ids = new Set();
    const fields = (Array.isArray(t.fields) ? t.fields : []).map(sanitizeField).filter(f => f && !ids.has(f.id) && ids.add(f.id)).slice(0, LIM.fields);
    const out = { id: t.id, name, icon: ICONS.includes(t.icon) ? t.icon : 'doc', color: isHex(t.color) ? t.color : '#7c8cff', fields, prog: null, goals: {} };
    const p = t.prog && typeof t.prog === 'object' ? t.prog : null;
    const fk = p && fields.find(f => f.id === p.key && f.type === 'text'), fa = p && fields.find(f => f.id === p.amt && f.type === 'num');
    if (fk && fa) out.prog = { key: fk.id, amt: fa.id };
    if (out.prog && t.goals && typeof t.goals === 'object') {
      for (const [k, v] of Object.entries(t.goals).slice(0, LIM.goals)) { const kk = keyOf(k), n = +v; if (kk && Number.isFinite(n) && n > 0) out.goals[kk] = r2(Math.min(n, 1e7)); }
    }
    for (const k of ['mt']) if (Number.isFinite(t[k])) out[k] = t[k];
    return out;
  }
  // Valores de una nota: solo los campos que tiene la plantilla, cada uno con su tipo
  function sanitizeVals(tpl, v) {
    const out = {}; if (!tpl || !v || typeof v !== 'object') return out;
    for (const f of tpl.fields) {
      const x = v[f.id]; if (x === undefined || x === null || x === '') continue;
      if (f.type === 'text') { const s = str(x, LIM.text); if (s) out[f.id] = s; }
      else if (f.type === 'num') { const n = +String(x).replace(',', '.'); if (Number.isFinite(n) && n >= 0) out[f.id] = r2(Math.min(n, 1e6)); }
      else if (f.type === 'bool') { if (x === true || x === 'true' || x === 1) out[f.id] = true; }
      else if (f.type === 'rate') { const n = Math.round(+x); if (Number.isFinite(n) && n >= 0 && n <= 10) out[f.id] = n; }
      else if (f.type === 'pick') { const o = f.opts.find(y => y === str(x, LIM.opt)); if (o) out[f.id] = o; }
    }
    return out;
  }
  const fmtDef = n => String(r2(n));
  // Resumen de una nota: «Leer · Dune · 30 págs — me encantó»
  function summary(tpl, v, extra, fmt) {
    fmt = fmt || fmtDef; const parts = [tpl.name];
    for (const f of tpl.fields) {
      const x = v && v[f.id]; if (x === undefined) continue;
      if (f.type === 'text' || f.type === 'pick') parts.push(x);
      else if (f.type === 'num') parts.push(fmt(x) + (f.unit ? ' ' + f.unit : ''));
      else if (f.type === 'bool') parts.push(f.label);
      else if (f.type === 'rate') parts.push(`${f.label} ${x}/10`);
    }
    const e = str(extra, LIM.extra);
    return (parts.join(' · ') + (e ? ' — ' + e : '')).slice(0, LIM.sum);
  }
  // Todas las notas de una plantilla, de la más antigua a la más nueva: [{ k, g }]
  function notesOf(gaps, tplId, from, to) {
    const out = [];
    for (const [k, l] of Object.entries(gaps || {})) {
      if (!Array.isArray(l) || (from && k < from) || (to && k > to)) continue;
      for (const g of l) if (g && g.tp === tplId) out.push({ k, g });
    }
    return out.sort((x, y) => x.k.localeCompare(y.k) || String(x.g.a || '').localeCompare(String(y.g.a || '')));
  }
  // Lo último que pusiste con esa plantilla (antes de una fecha, si se da), para proponerlo de nuevo
  function lastVals(gaps, tplId, before) {
    const l = notesOf(gaps, tplId, '', before ? before : ''); const g = l.length ? l[l.length - 1].g : null;
    return g && g.v && typeof g.v === 'object' ? { ...g.v } : {};
  }
  // Valores distintos más recientes de un campo de texto (para tocarlos y no escribirlos otra vez)
  function recent(gaps, tplId, fieldId, n) {
    const seen = new Set(), out = [], l = notesOf(gaps, tplId);
    for (let i = l.length - 1; i >= 0 && out.length < (n || 5); i--) { const x = l[i].g.v && l[i].g.v[fieldId]; if (typeof x === 'string' && x && !seen.has(keyOf(x))) { seen.add(keyOf(x)); out.push(x); } }
    return out;
  }
  // Progreso de un valor (p. ej. un libro): lo sumado hasta ahora, la meta y si ya se terminó
  function progress(gaps, tpl, keyVal, opts) {
    if (!tpl || !tpl.prog) return null; const kk = keyOf(keyVal); if (!kk) return null;
    const skip = opts && opts.skip; let done = 0, n = 0;
    for (const { k, g } of notesOf(gaps, tpl.id)) {
      if (skip && skip.k === k && skip.i === g) continue;
      if (g.v && keyOf(g.v[tpl.prog.key]) === kk) { const a = +g.v[tpl.prog.amt]; if (Number.isFinite(a)) done += a; n++; }
    }
    const goal = tpl.goals[kk] || 0;
    return { key: kk, done: r2(done), n, goal, pct: goal ? Math.min(100, Math.round(done / goal * 100)) : null, finished: !!goal && done >= goal };
  }
  // Totales de cada plantilla en un periodo (para Informes)
  function totals(gaps, tpls, from, to) {
    const out = [];
    for (const tpl of tpls || []) {
      const l = notesOf(gaps, tpl.id, from, to); if (!l.length) continue;
      const fields = [];
      for (const f of tpl.fields) {
        const vals = l.map(x => x.g.v && x.g.v[f.id]).filter(x => x !== undefined);
        if (!vals.length) continue;
        if (f.type === 'num') fields.push({ id: f.id, label: f.label, kind: 'sum', value: r2(vals.reduce((s, x) => s + (+x || 0), 0)), unit: f.unit || '' });
        else if (f.type === 'rate') fields.push({ id: f.id, label: f.label, kind: 'avg', value: r2(vals.reduce((s, x) => s + (+x || 0), 0) / vals.length) });
        else if (f.type === 'bool') fields.push({ id: f.id, label: f.label, kind: 'count', value: vals.filter(x => x === true).length });
        else if (f.type === 'pick') { const c = {}; vals.forEach(x => { c[x] = (c[x] || 0) + 1; }); fields.push({ id: f.id, label: f.label, kind: 'pick', value: Object.entries(c).sort((a, b) => b[1] - a[1]) }); }
      }
      let byKey = [];
      if (tpl.prog) {
        const m = new Map();
        for (const { g } of l) { const kv = g.v && g.v[tpl.prog.key]; if (!kv) continue; const kk = keyOf(kv), a = +(g.v[tpl.prog.amt] || 0); const e = m.get(kk) || { label: kv, sum: 0 }; e.sum = r2(e.sum + (Number.isFinite(a) ? a : 0)); m.set(kk, e); }
        byKey = [...m.entries()].map(([kk, e]) => { const p = progress(gaps, tpl, kk); return { key: kk, label: e.label, sum: e.sum, total: p.done, goal: p.goal, pct: p.pct }; }).sort((a, b) => b.sum - a.sum);
      }
      out.push({ id: tpl.id, name: tpl.name, icon: tpl.icon, color: tpl.color, n: l.length, fields, byKey });
    }
    return out;
  }
  // Plantillas de serie (ids fijos: si se crean en dos dispositivos, la sincronización las junta en vez de duplicarlas)
  function seeds(L) {
    return [
      { id: 'tp_read', name: L.read, icon: 'book', color: '#ef9a3c', fields: [{ id: 'book', label: L.book, type: 'text' }, { id: 'pages', label: L.pages, type: 'num', unit: L.pagesU }], prog: { key: 'book', amt: 'pages' }, goals: {} },
      { id: 'tp_gym', name: L.gym, icon: 'dumbbell', color: '#e5534b', fields: [{ id: 'kind', label: L.gymKind, type: 'pick', opts: L.gymOpts }, { id: 'min', label: L.minutes, type: 'num', unit: 'min' }, { id: 'sets', label: L.sets, type: 'num', unit: '' }, { id: 'effort', label: L.effort, type: 'rate' }], prog: null, goals: {} },
      { id: 'tp_study', name: L.study, icon: 'cap', color: '#4f8cff', fields: [{ id: 'subj', label: L.subject, type: 'text' }, { id: 'hours', label: L.hours, type: 'num', unit: 'h' }], prog: { key: 'subj', amt: 'hours' }, goals: {} },
      { id: 'tp_date', name: L.date, icon: 'users', color: '#b06ad9', fields: [{ id: 'who', label: L.who, type: 'text' }, { id: 'where', label: L.where, type: 'text' }, { id: 'done', label: L.done, type: 'bool' }], prog: null, goals: {} }
    ].map(sanitizeTpl);
  }
  return { TYPES, ICONS, LIM, keyOf, sanitizeTpl, sanitizeVals, summary, notesOf, lastVals, recent, progress, totals, seeds };
});
