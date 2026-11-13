/* KeepGoing — Propuestas de Organización (v1.57): lógica pura, sin DOM.
   Lo que apuntas en otras pestañas (un entrenamiento, un movimiento de la Libreta) sale en Organización como propuesta a la
   misma hora: un entrenamiento de 15:00 a 17:00 propone un turno de 15:00 a 17:00; un movimiento propone una nota.
   Una propuesta se acepta (como turno o nota nuevos, o vinculada a un turno o una nota modular que ya tengas) o se descarta.
   Lo que eliges al vincular se recuerda por «clave» (el deporte o la rutina del entrenamiento, la categoría del movimiento),
   así la próxima propuesta igual ya sale vinculada.
   Datos (en calPrefs, que se sincroniza): sgFrom = primer día con propuestas, sgDone = { id: fecha } aceptadas o descartadas,
   sgLink = { clave: { t: 's' turno | 'o' turno puntual | 'n' nota | 'm' nota modular, id } }.
   Lo creado lleva src = id de la propuesta (en calDays y en calGaps): así no se vuelve a proponer.
   Se usa en el navegador (window.KGSuggest) y en los tests de Node (require). */
(function (root) {
  'use strict';

  const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;
  const RE_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
  const pad = (n) => String(n).padStart(2, '0');
  const isoOf = (ms) => { const d = new Date(ms); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const hmOf = (ms) => { const d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const fromMin = (m) => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  const addDays = (k, n) => { const [y, m, d] = k.split('-').map(Number); const x = new Date(y, m - 1, d + n); return isoOf(x.getTime()); };
  const NOTE_MIN = 30; // un movimiento dura media hora en la vista (solo para verlo; la nota guarda inicio y fin)
  const KEEP_DAYS = 200; // sgDone olvida lo que tiene más de esto (ya no se propone: queda antes de la ventana)
  const WINDOW_DAYS = 60; // solo se proponen registros de los últimos 60 días (y nunca antes de sgFrom)

  const keyNorm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 40);

  /* Entrenamientos terminados → propuestas de turno. w: { id, status, date, start, end (ms), name, rid?, sp? }
     sportName(sp) da el nombre del deporte (Entrenamiento v1.57); sin deporte, el nombre del entrenamiento. */
  function fromGym(list, o) {
    const out = [];
    for (const w of Array.isArray(list) ? list : []) {
      if (!w || w.status !== 'done' || typeof w.id !== 'string' || !RE_DATE.test(w.date || '')) continue;
      let a = '', b = '';
      if (Number.isFinite(w.start) && isoOf(w.start) === w.date) {
        a = hmOf(w.start);
        if (Number.isFinite(w.end) && w.end > w.start) b = isoOf(w.end) === w.date ? hmOf(w.end) : '23:59';
        else b = fromMin(Math.min(1439, toMin(a) + 60));
        if (b <= a) b = fromMin(Math.min(1439, toMin(a) + 15));
        if (b === a) a = b = '';
      }
      const sp = typeof w.sp === 'string' && w.sp ? w.sp : '';
      const title = String((sp && o && o.sportName && o.sportName(sp)) || w.name || (o && o.gymLabel) || '').slice(0, 40);
      const key = 'gym:' + (sp ? 'sp:' + sp : w.rid ? 'r:' + w.rid : 'n:' + keyNorm(w.name));
      out.push({ id: 'gym:' + w.id, src: 'gym', ref: w.id, date: w.date, a, b, kind: 'shift', title, key });
    }
    return out;
  }

  /* Movimientos de la Libreta → propuestas de nota. e: { id, date, createdAt, type, categoryId, recurringId, importId }
     Solo los apuntados a mano: los de una repetición o un CSV se crean de golpe y su hora no dice nada.
     La hora es la de cuando lo apuntaste, si fue ese mismo día; si no, la nota es del día entero. */
  function fromLedger(list) {
    const out = [];
    for (const e of Array.isArray(list) ? list : []) {
      if (!e || typeof e.id !== 'string' || !RE_DATE.test(e.date || '') || e.recurringId || e.importId) continue;
      let a = '', b = '';
      if (Number.isFinite(e.createdAt) && isoOf(e.createdAt) === e.date) { a = hmOf(e.createdAt); b = fromMin(Math.min(1439, toMin(a) + NOTE_MIN)); if (b === a) a = b = ''; }
      out.push({ id: 'led:' + e.id, src: 'led', ref: e.id, date: e.date, a, b, kind: 'note', key: 'led:' + (e.categoryId || 'other') });
    }
    return out;
  }

  // Ids de propuesta que ya tienen algo creado en Organización (turno o nota con src)
  function placed(days, gaps) {
    const s = new Set();
    for (const src of [days, gaps]) {
      if (!src || typeof src !== 'object') continue;
      for (const l of Object.values(src)) if (Array.isArray(l)) for (const x of l) if (x && typeof x.src === 'string') s.add(x.src);
    }
    return s;
  }

  /* Propuestas pendientes entre from y to (fechas ISO, inclusive).
     o: { items, today, sgFrom, done, days, gaps, link, shiftIds, tplIds }
     - items: las propuestas en bruto (fromGym + fromLedger)
     - link: sgLink; si el vínculo apunta a un turno o una nota modular que ya no existe, se ignora
     - un entrenamiento vinculado a un turno que ese día ya está puesto cuenta como hecho (ya lo pusiste tú) */
  function pending(o, from, to) {
    const today = o.today, low = [o.sgFrom || today, addDays(today, -WINDOW_DAYS), from || '0000'].sort().pop();
    const high = [to || '9999', today].sort()[0];
    const done = o.done || {}, have = placed(o.days, o.gaps), sh = new Set(o.shiftIds || []), tp = new Set(o.tplIds || []);
    const out = [];
    for (const p of o.items || []) {
      if (p.date < low || p.date > high || done[p.id] || have.has(p.id)) continue;
      const l = linkOf(o.link, p.key, sh, tp);
      if (l && l.t === 's' && p.kind === 'shift' && ((o.days || {})[p.date] || []).some((e) => e && e.sid === l.id)) continue;
      out.push({ ...p, link: l });
    }
    return out.sort((x, y) => x.date.localeCompare(y.date) || (x.a || '').localeCompare(y.a || ''));
  }

  function linkOf(map, key, sh, tp) {
    const l = map && typeof map === 'object' ? map[key] : null;
    if (!l || typeof l !== 'object') return null;
    if (l.t === 's') return sh.has(l.id) ? { t: 's', id: l.id } : null;
    if (l.t === 'm') return tp.has(l.id) ? { t: 'm', id: l.id } : null;
    if (l.t === 'o' || l.t === 'n') return { t: l.t };
    return null;
  }
  // Destino por defecto: el vínculo recordado o, si no hay, turno puntual (entrenamiento) o nota (movimiento)
  const target = (p) => p.link || { t: p.kind === 'shift' ? 'o' : 'n' };

  // Marca como hecha y olvida lo antiguo
  function markDone(done, p, today) {
    const lim = addDays(today, -KEEP_DAYS), out = {};
    for (const [k, v] of Object.entries(done || {})) if (typeof v === 'string' && v >= lim) out[k] = v;
    out[p.id] = p.date;
    return out;
  }
  // Recuerda el vínculo de una clave (máximo 200 claves)
  function remember(link, key, t) {
    const out = { ...(link && typeof link === 'object' ? link : {}) };
    delete out[key];
    out[key] = t && (t.t === 's' || t.t === 'm') ? { t: t.t, id: t.id } : { t: t && t.t === 'n' ? 'n' : 'o' };
    const ks = Object.keys(out); if (ks.length > 200) ks.slice(0, ks.length - 200).forEach((k) => delete out[k]);
    return out;
  }
  // Primer día con propuestas: una semana antes de la primera vez que se abre (para ver algo enseguida)
  const firstFrom = (today) => addDays(today, -7);

  const api = { fromGym, fromLedger, pending, placed, target, markDone, remember, firstFrom, isoOf, hmOf, WINDOW_DAYS, NOTE_MIN };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KGSuggest = api;
})(typeof window !== 'undefined' ? window : globalThis);
