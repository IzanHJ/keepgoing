/* KeepGoing — Plantillas de notas de Organización (v1.27): lógica pura, sin DOM. Se usa en el navegador (window.KGNoteTpl) y en
   los tests de Node.
   Una plantilla = { id, name, icon, color, fields: [{ id, label, type, unit, opts }], prog: { key, amt } | null, goals: { clave: meta } }.
     type: 'text' (texto), 'num' (número con unidad), 'bool' (sí/no), 'rate' (valoración 0-10) o 'pick' (elegir de una lista).
     prog: el progreso suma el campo numérico «amt» por cada valor del campo de texto «key» (p. ej. páginas por libro).
     goals: la meta de cada valor de «key» (p. ej. { dune: 600 } páginas), con la clave en minúsculas y sin espacios de más.
   Una nota con plantilla vive en state.calGaps[fecha] como { a, b, t, tp, v, x }:
     a / b: horas 'HH:MM' o '' si es del día entero; tp: id de la plantilla; v: { idCampo: valor }; x: texto libre;
     t: el resumen ya escrito («Leer · Dune · 30 págs»), para que se vea igual en todas partes (Día, Mes, «Ver más» y PDF).
   v1.45.3: un solo tipo de nota (decisión de Izan). Las antiguas «modulares» (kind: 'mod') pasan a ser notas normales con
   seq: true («Leer como una frase»): sus pasos son campos de texto (label puede ir vacío) y el resumen va con flechas.
   v1.39 (histórico): Notas modulares = plantilla con kind: 'mod'. Sus fields son las secuencias, en orden: label es el texto fijo que va antes
   del hueco («Conocer a», «en el lugar») y siempre son de texto. La nota se lee «Conocer a Ana → en el lugar Bar Pepe». */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KGNoteTpl = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const TYPES = ['text', 'num', 'bool', 'rate', 'pick'];
  // v1.52: más portadas para las notas (todas son iconos SVG de línea de la app)
  const ICONS = ['doc', 'book', 'dumbbell', 'cap', 'heart', 'calendar', 'clock', 'pin', 'users', 'sparkle', 'target', 'flame', 'smile', 'play', 'tag', 'list',
    'pen', 'checklist', 'star', 'trophy', 'medal', 'flag', 'bolt', 'bulb', 'music', 'headphones', 'mic', 'camera', 'film', 'tv', 'game', 'palette', 'brush',
    'code', 'chat', 'mail', 'bell', 'gift', 'party', 'cup', 'fork', 'cart', 'bag', 'wallet', 'coins', 'briefcase', 'house', 'bed', 'pill', 'leaf', 'plant', 'tree',
    'paw', 'sun', 'moon', 'beach', 'mountain', 'pool', 'walk', 'bike', 'car', 'plane', 'compass', 'globe', 'puzzle', 'key', 'timer', 'chart'];
  const LIM = { lists: 30, items: 300, tpls: 30, fields: 12, steps: 12, opts: 12, goals: 300, name: 30, label: 30, unit: 10, opt: 24, text: 80, multi: 300, extra: 300, sum: 700 };
  const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  const keyOf = v => str(v, LIM.text).toLowerCase();
  /* v1.52: un campo unido a una Lista propia admite varios elementos a la vez (selección múltiple), guardados como
     «Ana, Pepe». items() los separa y joinItems() los vuelve a juntar sin repetir. */
  const items = v => { const seen = new Set(); return String(v == null ? '' : v).split(/\s*[,;]\s*/).map(x => str(x, LIM.text)).filter(x => x && !seen.has(keyOf(x)) && seen.add(keyOf(x))); };
  const joinItems = l => items((l || []).join(', ')).join(', ').slice(0, LIM.multi);
  const toggleItem = (v, x) => { const l = items(v), k = keyOf(x), i = l.findIndex(y => keyOf(y) === k); if (i >= 0) l.splice(i, 1); else if (k) l.push(str(x, LIM.text)); return joinItems(l); };
  const isHex = c => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c);
  const idOk = v => typeof v === 'string' && /^[A-Za-z0-9_-]{1,24}$/.test(v);
  const r2 = n => Math.round(n * 100) / 100;

  const optList = v => { const seen = new Set(); return (Array.isArray(v) ? v : []).map(o => str(o, LIM.opt)).filter(o => o && !seen.has(o.toLowerCase()) && seen.add(o.toLowerCase())).slice(0, LIM.opts); };
  /* v1.43: un campo de texto (o una secuencia de una nota modular) puede ir unido a una Lista propia (list = id). Al rellenar se
     eligen sus elementos con un toque; con grow, lo que escribas nuevo se añade a la lista para la próxima vez. */
  const linkOf = (f, out) => { if (idOk(f.list)) { out.list = f.list; if (f.grow === true) out.grow = true; } return out; };
  // Una Lista propia = { id, name, items: [texto], mt }. Se comparte entre todas las notas (p. ej. «Personas»).
  function sanitizeList(l) {
    if (!l || typeof l !== 'object' || !idOk(l.id)) return null;
    const name = str(l.name, LIM.name); if (!name) return null;
    const seen = new Set(), items = (Array.isArray(l.items) ? l.items : []).map(x => str(x, LIM.text)).filter(x => x && !seen.has(keyOf(x)) && seen.add(keyOf(x))).slice(0, LIM.items);
    const o = { id: l.id, name, items }; if (Number.isFinite(l.mt)) o.mt = l.mt; return o;
  }
  // Opciones de un campo de lista según lo ya respondido (si depende de otro y ese tiene respuesta con opciones propias)
  function optsFor(f, v) {
    if (!f || f.type !== 'pick') return [];
    if (f.dep && f.by) { const pv = v && v[f.dep]; if (pv && f.by[pv]) return f.by[pv]; }
    return f.opts || [];
  }
  /* Añade a las listas lo nuevo de una nota (campos con grow). Devuelve { lists, added: [{ list, item }] } sin tocar las de entrada. */
  function grow(lists, tpl, v, now) {
    const out = (lists || []).map(l => l), added = [];
    if (!tpl || !v) return { lists: out, added };
    for (const f of tpl.fields) {
      if (!f.list || !f.grow) continue;
      const i = out.findIndex(l => l.id === f.list); if (i < 0) continue;
      for (const x of items(v[f.id])) {
        if (out[i].items.some(y => keyOf(y) === keyOf(x)) || out[i].items.length >= LIM.items) continue;
        out[i] = { ...out[i], items: [...out[i].items, x], ...(now ? { mt: now } : {}) }; added.push({ list: f.list, item: x });
      }
    }
    return { lists: out, added };
  }
  function sanitizeField(f, i, seq) {
    if (!f || typeof f !== 'object') return null;
    const type = TYPES.includes(f.type) ? f.type : 'text';
    const label = str(f.label, LIM.label); if (!label && !(seq && type === 'text')) return null; // en una frase, un hueco puede ir sin texto delante
    const out = { id: idOk(f.id) ? f.id : 'f' + i, label, type };
    if (type === 'num') out.unit = str(f.unit, LIM.unit);
    if (type === 'text') linkOf(f, out);
    if (type === 'pick') {
      out.opts = optList(f.opts);
      // v1.43: opciones que dependen de la respuesta de otra lista anterior (dep = id de ese campo; by = { opción: [opciones] })
      if (idOk(f.dep) && f.by && typeof f.by === 'object') {
        const by = {};
        for (const [k, v] of Object.entries(f.by).slice(0, LIM.opts)) { const kk = str(k, LIM.opt), l = optList(v); if (kk && l.length) by[kk] = l; }
        if (Object.keys(by).length) { out.dep = f.dep; out.by = by; }
      }
      if (!out.opts.length && !out.dep) return null;
    }
    return out;
  }
  function sanitizeTpl(t) {
    if (!t || typeof t !== 'object' || !idOk(t.id)) return null;
    const name = str(t.name, LIM.name); if (!name) return null;
    const ids = new Set();
    const seq = t.seq === true || t.kind === 'mod';
    const fields = (Array.isArray(t.fields) ? t.fields : []).map((f, i) => sanitizeField(f && t.kind === 'mod' ? { ...f, type: 'text' } : f, i, seq)).filter(f => f && !ids.has(f.id) && ids.add(f.id)).slice(0, LIM.fields);
    if (t.kind === 'mod' && !fields.length) return null;
    fields.forEach((f, j) => { if (!f.dep) return; const par = fields.slice(0, j).find(x => x.id === f.dep && x.type === 'pick' && !x.dep); if (par) { for (const k of Object.keys(f.by)) if (!par.opts.includes(k)) delete f.by[k]; } if (!par || !Object.keys(f.by).length) { delete f.dep; delete f.by; } });
    for (let j = fields.length - 1; j >= 0; j--) if (fields[j].type === 'pick' && !fields[j].opts.length && !fields[j].dep) fields.splice(j, 1);
    const out = { id: t.id, name, icon: ICONS.includes(t.icon) ? t.icon : seq ? 'list' : 'doc', color: isHex(t.color) ? t.color : '#7c8cff', fields, prog: null, goals: {} };
    if (seq) out.seq = true;
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
      if (f.type === 'text') { const s = f.list ? joinItems(items(x)) : str(x, LIM.text); if (s) out[f.id] = s; }
      else if (f.type === 'num') { const n = +String(x).replace(',', '.'); if (Number.isFinite(n) && n >= 0) out[f.id] = r2(Math.min(n, 1e6)); }
      else if (f.type === 'bool') { if (x === true || x === 'true' || x === 1) out[f.id] = true; }
      else if (f.type === 'rate') { const n = Math.round(+x); if (Number.isFinite(n) && n >= 0 && n <= 10) out[f.id] = n; }
      else if (f.type === 'pick') { const o = optsFor(f, out).find(y => y === str(x, LIM.opt)); if (o) out[f.id] = o; }
    }
    return out;
  }
  const fmtDef = n => String(r2(n));
  // Resumen de una nota: «Leer · Dune · 30 págs — me encantó»
  function summary(tpl, v, extra, fmt) {
    fmt = fmt || fmtDef;
    if (tpl.seq || tpl.kind === 'mod') {
      // Como frase: «Conocí a Ana → en el lugar Bar Pepe → Páginas 30 págs»
      const val = (f, x) => f.type === 'num' ? fmt(x) + (f.unit ? ' ' + f.unit : '') : f.type === 'bool' ? '' : f.type === 'rate' ? x + '/10' : x;
      const seq = tpl.fields.map(f => { const x = v && v[f.id]; if (x === undefined) return ''; const y = val(f, x); return f.label ? f.label + (y === '' ? '' : ' ' + y) : y; }).filter(Boolean);
      const e0 = str(extra, LIM.extra);
      return ((seq.length ? seq.join(' → ') : tpl.name) + (e0 ? ' — ' + e0 : '')).slice(0, LIM.sum);
    }
    const parts = [tpl.name];
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
  /* v1.43: historial de una plantilla o nota modular. Devuelve las notas de la más nueva a la más antigua agrupadas por mes
     ({ m: 'AAAA-MM', items: [{ k, g }] }), cuántas hay, la primera y la última fecha, y para cada campo de número o de
     valoración su serie por fecha (para dibujar la evolución): [{ id, label, unit, kind, pts: [{ k, v }] }]. */
  function history(gaps, tpl, from, to) {
    if (!tpl) return { n: 0, first: '', last: '', months: [], series: [], dist: [] };
    const l = notesOf(gaps, tpl.id, from, to), months = [];
    for (let i = l.length - 1; i >= 0; i--) { const m = l[i].k.slice(0, 7); if (!months.length || months[months.length - 1].m !== m) months.push({ m, items: [] }); months[months.length - 1].items.push(l[i]); }
    const series = tpl.fields.filter(f => f.type === 'num' || f.type === 'rate').map(f => ({ id: f.id, label: f.label, unit: f.unit || '', kind: f.type,
      pts: l.map(x => ({ k: x.k, v: x.g.v && x.g.v[f.id] })).filter(x => Number.isFinite(+x.v) && x.v !== undefined && x.v !== '').map(x => ({ k: x.k, v: +x.v })) })).filter(x => x.pts.length);
    // v1.43: reparto de las respuestas de texto, lista y sí/no (las más repetidas primero)
    const dist = tpl.fields.filter(f => f.type === 'text' || f.type === 'pick' || f.type === 'bool').map(f => {
      const c = new Map();
      for (const { g } of l) { const x = g.v && g.v[f.id]; if (x === undefined || x === '') continue; for (const y of f.list ? items(x) : [x]) { const kk = f.type === 'bool' ? 'si' : keyOf(y); const e = c.get(kk) || { label: f.type === 'bool' ? f.label : String(y), n: 0 }; e.n++; c.set(kk, e); } }
      return { id: f.id, label: f.label, kind: f.type, top: [...c.values()].sort((a, b) => b.n - a.n).slice(0, 6).map(e => [e.label, e.n]), of: l.length };
    }).filter(x => x.top.length);
    return { n: l.length, first: l.length ? l[0].k : '', last: l.length ? l[l.length - 1].k : '', months, series, dist };
  }
  /* v1.43: dónde sale un elemento de una Lista (p. ej. «Alba» en Personas): todas las notas de plantillas con un campo unido a esa
     lista cuya respuesta es ese elemento, de la más nueva a la más antigua: [{ k, g, tpl, field }]. */
  function mentions(gaps, tpls, listId, item) {
    const kk = keyOf(item), out = []; if (!kk) return out;
    for (const tpl of tpls || []) {
      const fs = tpl.fields.filter(f => f.list === listId); if (!fs.length) continue;
      for (const { k, g } of notesOf(gaps, tpl.id)) { const f = fs.find(f2 => g.v && items(g.v[f2.id]).some(y => keyOf(y) === kk)); if (f) out.push({ k, g, tpl, field: f }); }
    }
    return out.sort((a, b) => b.k.localeCompare(a.k) || String(b.g.a || '').localeCompare(String(a.g.a || '')));
  }
  /* v1.43: buscar en las notas. Sin tildes ni mayúsculas; cada palabra tiene que salir. Devuelve [{ k, j, g }] (j = posición en
     gaps[k]) de la más nueva a la más antigua, con un máximo de max. */
  const fold = x => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function search(gaps, q, opts) {
    const words = fold(q).split(/\s+/).filter(Boolean), o = opts || {}, out = [];
    if (!words.length && !o.tp) return out;
    for (const k of Object.keys(gaps || {}).sort().reverse()) {
      if ((o.from && k < o.from) || (o.to && k > o.to)) continue;
      const l = gaps[k]; if (!Array.isArray(l)) continue;
      l.forEach((g, j) => { if (!g || (o.tp && g.tp !== o.tp)) return; const hay = fold([g.t, g.x].join(' ')); if (words.every(w => hay.includes(w))) out.push({ k, j, g }); });
      if (out.length >= (o.max || 200)) break;
    }
    return out.slice(0, o.max || 200);
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
  return { TYPES, ICONS, LIM, keyOf, items, joinItems, toggleItem, sanitizeList, optsFor, grow, mentions, search, fold, sanitizeTpl, sanitizeVals, summary, notesOf, lastVals, recent, progress, totals, history, seeds };
});
