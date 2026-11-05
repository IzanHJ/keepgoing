/* KeepGoing — Calendario de turnos (v1.20, traído de TurnoFlow): lógica pura, sin DOM.
   Turnos, categorías, rotaciones, informes de horas, ICS y validación.
   v1.39: sin paga. Ya no hay tarifas, horas extra ni categorías «sin paga»; sanitize quita esos campos de los datos antiguos.
   v1.39: medio de transporte de cada turno (tr, trDep, trArr) y cambiar un turno en otros días iguales (sameEntries, applyEdit).
   Se usa en el navegador (window.KGTurns) y en los tests de Node (require). */
(function (root) {
  'use strict';

  const LIMITS = { specials: 6, shifts: 200, jobs: 20, days: 20000, perDay: 10, ext: 5000, text: 100, note: 500 };
  const KINDS = ['work', 'off', 'vacation', 'sick', 'training'];
  const KIND_LABEL = { work: 'Trabajo', off: 'Libre', vacation: 'Vacaciones', sick: 'Baja', training: 'Formación' };
  /* v1.23: los tipos se pueden añadir, editar y borrar. Cada tipo dice si cuenta para la paga (como «Trabajo»);
     un tipo que no la cobra (p. ej. «Ocio» para ir al cine) suma horas pero no dinero. «other» es «Otro», sin paga. */
  const defaultKinds = () => [...KINDS, 'other'].map((id) => ({ id, name: '' }));
  const kindOk = (k) => typeof k === 'string' && RE_ID.test(k);
  const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;
  const RE_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
  const RE_COLOR = /^#[0-9a-fA-F]{6}$/;
  const RE_ID = /^[A-Za-z0-9_-]{1,24}$/;

  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);
  const startOfWeek = (d, ws) => addDays(d, -((d.getDay() - ws + 7) % 7));

  function defaults() {
    const job = { id: 'job1', name: 'Trabajo', color: '#4f6bed' };
    const sh = (id, name, emoji, color, kind, start, end, brk, alarm) =>
      ({ id, jobId: 'job1', name, emoji, color, kind, start, end, breakMin: brk, alarmMin: alarm || 0 });
    return {
      v: 1,
      jobs: [job],
      shifts: [
        sh('s_man', 'Mañana', '🌅', '#f5a623', 'work', '06:00', '14:00', 30, 0),
        sh('s_tar', 'Tarde', '🌆', '#ef6c00', 'work', '14:00', '22:00', 30, 0),
        sh('s_noc', 'Noche', '🌙', '#5c6bc0', 'work', '22:00', '06:00', 30, 0),
        sh('s_lib', 'Libre', '🏖️', '#43a047', 'off', '', '', 0),
        sh('s_vac', 'Vacaciones', '🌴', '#00acc1', 'vacation', '', '', 0),
        sh('s_baj', 'Baja', '🤒', '#e53935', 'sick', '', '', 0),
        sh('s_for', 'Formación', '📚', '#8e24aa', 'training', '09:00', '14:00', 0),
      ],
      days: {},
      ext: [],
      settings: { weekStart: 1, alarms: false },
    };
  }

  const str = (v, max, fb) => (typeof v === 'string' ? v.slice(0, max) : (fb === undefined ? '' : fb));
  const num = (v, min, max, fb) => { v = Number(v); return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fb; };
  const id = (v) => { if (typeof v !== 'string' || !RE_ID.test(v)) throw new Error('Identificador no válido'); return v; };
  /* v1.39: medio de transporte. TRANSPORTS son los mismos ids que usa el Mundo de la Línea de tiempo (KGWorld.TRANSPORTS).
     En la entrada del día: tr (id o '-' = sin transporte ese día aunque el turno lo tenga), trDep y trArr ('HH:MM', salida y llegada).
     En el turno (plantilla): tr, trDep, trArr con el mismo formato. La entrada del día gana. */
  const TRANSPORTS = ['bus', 'car', 'moto', 'walk', 'bike', 'train', 'plane', 'other'];
  const trOk = (v) => typeof v === 'string' && TRANSPORTS.includes(v);
  const plxOk = (x) => !!x && typeof x === 'object' && typeof x.addr === 'string' && !!x.addr.trim(); // v1.26.1: lugar puntual
  const timeOr = (v) => (typeof v === 'string' && RE_TIME.test(v) ? v : '');
  // Campos de transporte validados (day = entrada del día, que además admite '-')
  const trOf = (x, day) => {
    const o = {}; if (!x) return o;
    if (trOk(x.tr) || (day && x.tr === '-')) o.tr = x.tr;
    if (o.tr && o.tr !== '-') { if (timeOr(x.trDep)) o.trDep = x.trDep; if (timeOr(x.trArr)) o.trArr = x.trArr; }
    else if (day && !o.tr) { if (timeOr(x.trDep)) o.trDep = x.trDep; if (timeOr(x.trArr)) o.trArr = x.trArr; }
    return o;
  };

  /** Valida y normaliza datos externos (localStorage o importación). Lanza Error si no son válidos. */
  function sanitize(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Formato no válido');
    const def = defaults();
    const jobs = (Array.isArray(raw.jobs) ? raw.jobs : []).slice(0, LIMITS.jobs).map((j) => ({
      id: id(j.id), name: str(j.name, LIMITS.text, 'Trabajo'), color: RE_COLOR.test(j.color) ? j.color : '#4f6bed',
    }));
    if (!jobs.length) jobs.push(def.jobs[0]);
    const jobIds = new Set(jobs.map((j) => j.id));
    const shifts = (Array.isArray(raw.shifts) ? raw.shifts : []).slice(0, LIMITS.shifts).map((s) => ({
      id: id(s.id), jobId: jobIds.has(s.jobId) ? s.jobId : jobs[0].id,
      name: str(s.name, LIMITS.text, 'Turno'), emoji: str(s.emoji, 8),
      color: RE_COLOR.test(s.color) ? s.color : '#4f6bed',
      kind: kindOk(s.kind) ? s.kind : 'work',
      start: timeOr(s.start), end: timeOr(s.end),
      breakMin: num(s.breakMin, 0, 720, 0), alarmMin: num(s.alarmMin, 0, 1440, 0),
      ...(typeof s.placeId === 'string' && RE_ID.test(s.placeId) ? { placeId: s.placeId } : {}), ...trOf(s, false),
    }));
    const shiftIds = new Set(shifts.map((s) => s.id));
    const days = {};
    const rd = raw.days && typeof raw.days === 'object' && !Array.isArray(raw.days) ? raw.days : {};
    let n = 0;
    for (const k of Object.keys(rd)) {
      if (!RE_DATE.test(k) || n >= LIMITS.days || !Array.isArray(rd[k])) continue;
      const isOnce = (e) => e && typeof e.sid === 'string' && /^o_[A-Za-z0-9_-]{4,40}$/.test(e.sid) && e.once && typeof e.once === 'object';
      const list = rd[k].slice(0, LIMITS.perDay).filter((e) => e && (shiftIds.has(e.sid) || isOnce(e)))
        .map((e) => ({ sid: e.sid, note: str(e.note, LIMITS.note), start: timeOr(e.start), end: timeOr(e.end), ...(typeof e.rt === 'string' && RE_ID.test(e.rt) ? { rt: e.rt } : {}), ...(Number.isFinite(e.brk) && e.brk >= 0 ? { brk: Math.min(720, Math.round(e.brk)) } : {}), ...(typeof e.pl === 'string' && (e.pl === '-' || RE_ID.test(e.pl)) ? { pl: e.pl } : {}), ...trOf(e, true), ...(jobIds.has(e.job) ? { job: e.job } : {}), ...(plxOk(e.plx) ? { plx: { addr: str(e.plx.addr, 300) } } : {}),
          ...(isOnce(e) ? { once: { name: str(e.once.name, LIMITS.text, 'Turno'), emoji: str(e.once.emoji, 8), color: RE_COLOR.test(e.once.color) ? e.once.color : '#8e8e93', start: timeOr(e.once.start), end: timeOr(e.once.end), jobId: jobIds.has(e.once.jobId) ? e.once.jobId : '', ...(typeof e.once.placeId === 'string' && RE_ID.test(e.once.placeId) ? { placeId: e.once.placeId } : {}), ...(plxOk(e.once.plx) ? { plx: { addr: str(e.once.plx.addr, 300) } } : {}) } } : {}) }));
      if (list.length) { days[k] = list; n++; }
    }
    const ext = (Array.isArray(raw.ext) ? raw.ext : []).slice(0, LIMITS.ext)
      .filter((e) => e && RE_DATE.test(e.date)).map((e) => ({ date: e.date, title: str(e.title, LIMITS.text), ...(timeOr(e.start) ? { start: e.start, end: timeOr(e.end) } : {}), ...(typeof e.location === 'string' && e.location.trim() ? { location: str(e.location, 300) } : {}), ...(typeof e.pl === 'string' && RE_ID.test(e.pl) ? { pl: e.pl } : {}) }));
    const st = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
    const settings = {
      weekStart: [0, 1, 6].includes(st.weekStart) ? st.weekStart : 1,
      alarms: st.alarms === true,
    };
    // v1.26: lugares
    const places = (Array.isArray(raw.places) ? raw.places : []).slice(0, 60).filter((p) => p && RE_ID.test(p.id)).map((p) => ({
      id: p.id, name: str(p.name, 40, 'Lugar'), icon: str(p.icon, 4), color: RE_COLOR.test(p.color) ? p.color : '#5b8cff', addr: str(p.addr, 300),
      ...(Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180 ? { lat: p.lat, lon: p.lon } : {}),
      // v1.37: tipo de escenario, ciudad y país (de la búsqueda en OpenStreetMap) para el Mundo de la Línea de tiempo
      ...(typeof p.scene === 'string' && /^[a-z]{2,16}$/.test(p.scene) ? { scene: p.scene } : {}), ...(typeof p.city === 'string' && p.city.trim() ? { city: str(p.city, 80) } : {}), ...(typeof p.cc === 'string' && /^[A-Z]{2}$/.test(p.cc) ? { cc: p.cc } : {}) }));
    return { v: 1, jobs, shifts, days, ext, settings, places };
  }

  function entryTimes(shift, e) { return { start: (e && e.start) || shift.start, end: (e && e.end) || shift.end }; }
  /* v1.26: descanso de una entrada. e.brk (minutos) lo cambia solo ese día; si no, el del turno, salvo que el mismo turno salga
     varias veces ese día (jornada partida): entonces el hueco entre los trozos ya es el descanso y no se resta. day = lista del día. */
  function entryBreak(shift, e, day) {
    if (e && Number.isFinite(e.brk) && e.brk >= 0) return Math.min(720, e.brk);
    if (day && e && day.filter((x) => x && x.sid === e.sid).length > 1) return 0;
    return shift.breakMin || 0;
  }
  function entryHours(shift, e, day) {
    const { start, end } = entryTimes(shift, e);
    if (!start || !end) return 0;
    let a = toMin(start), b = toMin(end);
    if (b <= a) b += 1440;
    return Math.max(0, (b - a - entryBreak(shift, e, day)) / 60);
  }

  /** Informe de horas entre dos fechas ISO (inclusive). v1.39: ya no hay paga (se quitaron tarifas, extras y «sin paga»).
      Devuelve { hours, count, days, byShift: { id: { count, hours } }, byKind, byJob: { id: { count, hours } } }. */
  function report(data, from, to) {
    const shiftBy = Object.fromEntries(data.shifts.map((s) => [s.id, s]));
    const jobBy = Object.fromEntries((data.jobs || []).map((j) => [j.id, j]));
    const res = { hours: 0, count: 0, days: 0, byShift: {}, byKind: {}, byJob: {} };
    for (let d = parseISO(from), end = parseISO(to); d <= end; d = addDays(d, 1)) {
      const k = iso(d); let any = false;
      for (const e of data.days[k] || []) {
        const s = shiftBy[e.sid]; if (!s) continue;
        if (s.once && !jobBy[s.jobId]) continue; // v1.25: un turno puntual solo cuenta si tiene categoría
        const job = jobBy[e.job] || jobBy[s.jobId] || (data.jobs || [])[0]; // v1.26: e.job = otra categoría solo ese día (fichaje)
        const h = entryHours(s, e, data.days[k]);
        res.hours += h; res.count++; any = true;
        const bs = (res.byShift[s.id] = res.byShift[s.id] || { count: 0, hours: 0 });
        bs.count++; bs.hours += h;
        const bk = (res.byKind[s.kind] = res.byKind[s.kind] || { count: 0, hours: 0 });
        bk.count++; bk.hours += h;
        if (job) { const bj = (res.byJob[job.id] = res.byJob[job.id] || { count: 0, hours: 0 }); bj.count++; bj.hours += h; }
      }
      if (any) res.days++;
    }
    return res;
  }

  /* ---- v1.39: medio de transporte de una entrada (la del día gana sobre la del turno). null si no hay o si el día dice '-'.
     Devuelve { mode, dep, arr } con dep/arr 'HH:MM' o ''. Es lo que lee la Línea de tiempo para el recorrido. */
  function entryTransport(shift, e) {
    if (e && e.tr === '-') return null;
    const mode = (e && trOk(e.tr) && e.tr) || (shift && trOk(shift.tr) && shift.tr) || '';
    if (!mode) return null;
    return { mode, dep: timeOr(e && e.trDep) || timeOr(shift && shift.trDep), arr: timeOr(e && e.trArr) || timeOr(shift && shift.trArr) };
  }

  /* ---- v1.39: cambiar un turno también en otros días. Dos entradas «coinciden» si son el mismo turno (sid) con el mismo
     horario efectivo (hora de inicio y de fin, contando las del turno). Los turnos puntuales (o_…) nunca coinciden con otros.
     sameEntries → [{ k, i }] de las otras entradas que coinciden (sin la propia); scope 'next' = solo las de después de k. */
  const EDIT_KEYS = ['start', 'end', 'brk', 'pl', 'plx', 'tr', 'trDep', 'trArr'];
  function sameEntries(data, k, i, scope) {
    const shiftBy = Object.fromEntries(data.shifts.map((s) => [s.id, s]));
    const me = (data.days[k] || [])[i], s = me && shiftBy[me.sid];
    if (!s || s.once || String(me.sid).startsWith('o_')) return [];
    const tm = entryTimes(s, me), out = [];
    for (const d of Object.keys(data.days).sort()) {
      if (scope === 'next' && d < k) continue;
      (data.days[d] || []).forEach((e, j) => {
        if ((d === k && j === i) || !e || e.sid !== me.sid) return;
        const t2 = entryTimes(s, e);
        if (t2.start === tm.start && t2.end === tm.end) out.push({ k: d, i: j });
      });
    }
    return out;
  }
  /* Aplica a la entrada (k, i) los campos nuevos de next (solo EDIT_KEYS; la nota no se copia, es de ese día) y, según scope
     ('one' | 'next' | 'all'), a las que coinciden con ella ANTES del cambio. Devuelve el nº de entradas cambiadas.
     Un campo que en next no está (o vale '') se quita de la entrada: así vuelve a usar el del turno. */
  function applyEdit(data, k, i, next, scope) {
    const prev = (data.days[k] || [])[i]; if (!prev) return 0;
    const targets = [{ k, i }, ...(scope === 'next' || scope === 'all' ? sameEntries(data, k, i, scope) : [])];
    const changed = EDIT_KEYS.filter((f) => JSON.stringify(prev[f]) !== JSON.stringify(next[f]));
    for (const t of targets) {
      const e = { ...data.days[t.k][t.i] };
      if (t.k === k && t.i === i) { Object.assign(e, next); for (const f of EDIT_KEYS) if (next[f] === undefined || next[f] === '') delete e[f]; }
      else for (const f of changed) { if (next[f] === undefined || next[f] === '') delete e[f]; else e[f] = next[f]; }
      data.days[t.k] = data.days[t.k].map((x, j) => (j === t.i ? e : x));
    }
    return targets.length;
  }

  // ---- Rotaciones (A/B/C = turnos a asignar, '-' = libre). Definiciones habituales, editables en "personalizada".
  const PATTERNS = {
    '4x4': { name: '4 trabajo / 4 libre', cycle: 'AAAA----', slots: { A: 'Turno' } },
    '223': { name: '2-2-3 (Pitman)', cycle: 'AA--AAA--AA---', slots: { A: 'Turno' } },
    panama: { name: 'Panama', cycle: 'AA--AAA--AA---' + 'BB--BBB--BB---', slots: { A: 'Día', B: 'Noche' } },
    dupont: { name: 'DuPont', cycle: 'BBBB' + '---' + 'AAA' + '-' + 'BBB' + '---' + 'AAAA' + '-------', slots: { A: 'Día', B: 'Noche' } },
    continental: { name: 'Continental (2M-2T-2N-2L)', cycle: 'AABBCC--', slots: { A: 'Mañana', B: 'Tarde', C: 'Noche' } },
    '5x2': { name: '5 trabajo / 2 libre', cycle: 'AAAAA--', slots: { A: 'Turno' } },
  };

  function parsePattern(text) {
    const s = String(text || '').toUpperCase().replace(/[\s,]/g, '');
    if (!/^[A-Z-]{1,120}$/.test(s)) throw new Error('Usa letras A-Z y "-" para libre (máx. 120)');
    return s;
  }
  const patternSlots = (cycle) => [...new Set(cycle.replace(/-/g, '').split(''))].sort();

  /** Aplica una rotación sobre data.days. opts: {cycle, map:{A:shiftId}, start:'YYYY-MM-DD', offset, days, overwrite}. Devuelve nº de días escritos. */
  function applyRotation(data, opts) {
    const cycle = parsePattern(opts.cycle), total = Math.min(730, Math.max(1, opts.days | 0));
    const start = parseISO(opts.start), off = ((opts.offset | 0) % cycle.length + cycle.length) % cycle.length;
    let written = 0;
    for (let i = 0; i < total; i++) {
      const ch = cycle[(i + off) % cycle.length], k = iso(addDays(start, i)), has = (data.days[k] || []).length > 0;
      if (ch === '-') { if (opts.overwrite && has) { delete data.days[k]; written++; } continue; }
      const sid = opts.map[ch];
      if (!sid || !data.shifts.some((s) => s.id === sid)) continue;
      if (opts.overwrite || !has) { data.days[k] = [{ sid, note: '', start: '', end: '' }]; written++; }
    }
    return written;
  }

  /* ---- Rutinas (v1.23): grupos de turnos ya hechos.
     { kind: 'day', day: [{ sid, start, end }] } se pone en los días elegidos; { kind: 'week', week: { 0..6: [...] } } (0 = lunes)
     es una semana tipo. applyRoutine escribe en data.days entre from y to (incluidos); weekdays limita los días de una rutina
     de un día (0 = lunes; vacío = todos). Con overwrite se sustituyen los turnos que ya hubiera; si no, se añaden.
     Devuelve el nº de días cambiados. */
  function applyRoutine(data, routine, opts) {
    const from = parseISO(opts.from), to = parseISO(opts.to), wds = Array.isArray(opts.weekdays) ? opts.weekdays : [];
    const ok = (e) => e && data.shifts.some((s) => s.id === e.sid);
    let n = 0;
    for (let d = from, i = 0; d <= to && i < 731; d = addDays(d, 1), i++) {
      const wd = (d.getDay() + 6) % 7, k = iso(d);
      const list = (routine.kind === 'week' ? ((routine.week || {})[wd] || []) : (!wds.length || wds.includes(wd) ? routine.day || [] : [])).filter(ok);
      if (!list.length) continue;
      // v1.24: cada turno recuerda de qué rutina viene (rt) para verla junta en el calendario
      const add = list.map((e) => ({ sid: e.sid, note: '', start: timeOr(e.start), end: timeOr(e.end), ...(typeof routine.id === 'string' && RE_ID.test(routine.id) ? { rt: routine.id } : {}) }));
      const next = (opts.overwrite ? add : [...(data.days[k] || []), ...add]).slice(0, LIMITS.perDay);
      data.days[k] = next; n++;
    }
    return n;
  }

  // ---- ICS (exportar / importar)
  const icsEsc = (t) => String(t || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const icsUnesc = (t) => t.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1');
  function fold(line) {
    const enc = new TextEncoder(); let out = '', cur = '', bytes = 0;
    for (const ch of line) {
      const b = enc.encode(ch).length;
      if (bytes + b > 73) { out += cur + '\r\n '; cur = ''; bytes = 1; }
      cur += ch; bytes += b;
    }
    return out + cur;
  }
  const ymd = (k) => k.replace(/-/g, '');
  const ymdhm = (d, t) => ymd(d) + 'T' + t.replace(':', '') + '00';

  function toICS(data, from, to, now) {
    const shiftBy = Object.fromEntries(data.shifts.map((s) => [s.id, s])), placeBy = Object.fromEntries((data.places || []).map((p) => [p.id, p]));
    const stamp = (now || new Date()).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//KeepGoing//ES', 'CALSCALE:GREGORIAN'];
    for (let d = parseISO(from), end = parseISO(to); d <= end; d = addDays(d, 1)) {
      const k = iso(d);
      (data.days[k] || []).forEach((e, i) => {
        const s = shiftBy[e.sid]; if (!s) return;
        const { start, end: en } = entryTimes(s, e);
        L.push('BEGIN:VEVENT', 'UID:' + k + '-' + s.id + '-' + i + '@keepgoing', 'DTSTAMP:' + stamp);
        if (start && en) {
          const endDay = toMin(en) <= toMin(start) ? iso(addDays(d, 1)) : k;
          L.push('DTSTART:' + ymdhm(k, start), 'DTEND:' + ymdhm(endDay, en));
        } else {
          L.push('DTSTART;VALUE=DATE:' + ymd(k), 'DTEND;VALUE=DATE:' + ymd(iso(addDays(d, 1))));
        }
        L.push('SUMMARY:' + icsEsc((s.emoji ? s.emoji + ' ' : '') + s.name));
        if (e.note) L.push('DESCRIPTION:' + icsEsc(e.note));
        const pl = e.pl === '-' ? null : plxOk(e.plx) ? e.plx : !e.pl && plxOk(s.plx) ? s.plx : placeBy[e.pl || s.placeId];
        if (pl && (pl.addr || pl.name)) L.push('LOCATION:' + icsEsc(pl.addr || pl.name));
        if (pl && Number.isFinite(pl.lat) && Number.isFinite(pl.lon)) L.push('GEO:' + pl.lat + ';' + pl.lon);
        L.push('END:VEVENT');
      });
    }
    L.push('END:VCALENDAR');
    return L.map(fold).join('\r\n') + '\r\n';
  }

  /** Lee eventos (fecha de inicio + título) de un .ics externo. */
  /* v1.26: también la hora (DTSTART/DTEND con hora; en UTC si acaba en Z, que se pasa a la hora local) y el lugar (LOCATION) */
  const icsTime = (val) => {
    const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/.exec(val); if (!m) return null;
    if (m[4] === undefined) return { date: m[1] + '-' + m[2] + '-' + m[3], time: '' };
    const d = m[7] ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])) : new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
    return { date: iso(d), time: pad(d.getHours()) + ':' + pad(d.getMinutes()) };
  };
  function parseICS(text) {
    const lines = String(text).replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
    const out = []; let cur = null;
    for (const line of lines) {
      if (line === 'BEGIN:VEVENT') cur = {};
      else if (line === 'END:VEVENT') {
        if (cur && cur.date) {
          const ev = { date: cur.date, title: (cur.title || 'Evento').slice(0, LIMITS.text) };
          if (cur.start) { ev.start = cur.start; ev.end = cur.end || ''; }
          if (cur.location) ev.location = cur.location.slice(0, 300);
          out.push(ev);
        }
        cur = null;
        if (out.length >= LIMITS.ext) break;
      } else if (cur) {
        const i = line.indexOf(':'); if (i < 0) continue;
        const name = line.slice(0, i).split(';')[0].toUpperCase(), val = line.slice(i + 1);
        if (name === 'DTSTART') { const x = icsTime(val); if (x) { cur.date = x.date; cur.start = x.time; } }
        else if (name === 'DTEND') { const x = icsTime(val); if (x) { cur.endDate = x.date; cur.end = x.time; } }
        else if (name === 'SUMMARY') cur.title = icsUnesc(val);
        else if (name === 'LOCATION') cur.location = icsUnesc(val).trim();
      }
    }
    return out;
  }


  // ---- Compartir: payload mínimo (sin notas, precios ni pagas) y validación de lo recibido del servidor (dato no confiable)
  function buildSharePayload(data, from, to) {
    const shifts = data.shifts.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji, color: s.color, kind: s.kind, start: s.start, end: s.end }));
    const days = {};
    for (let d = parseISO(from), end = parseISO(to); d <= end; d = addDays(d, 1)) {
      const k = iso(d), list = (data.days[k] || []).slice(0, LIMITS.perDay);
      if (list.length) days[k] = list.map((e) => e.sid);
    }
    return { shifts, days };
  }
  function sanitizeShare(raw) {
    if (!raw || typeof raw !== 'object' || !raw.payload || typeof raw.payload !== 'object') throw new Error('Respuesta no válida');
    const p = raw.payload;
    const shifts = (Array.isArray(p.shifts) ? p.shifts : []).slice(0, LIMITS.shifts).filter((s) => s && RE_ID.test(s.id)).map((s) => ({
      id: s.id, name: str(s.name, LIMITS.text, 'Turno'), emoji: str(s.emoji, 8), color: RE_COLOR.test(s.color) ? s.color : '#4f6bed',
      kind: kindOk(s.kind) ? s.kind : 'work', start: timeOr(s.start), end: timeOr(s.end),
    }));
    const days = {}; let n = 0;
    const rd = p.days && typeof p.days === 'object' && !Array.isArray(p.days) ? p.days : {};
    for (const k of Object.keys(rd)) {
      if (!RE_DATE.test(k) || n >= 800 || !Array.isArray(rd[k])) continue;
      const ids = rd[k].filter((x) => typeof x === 'string' && RE_ID.test(x)).slice(0, LIMITS.perDay);
      if (ids.length) { days[k] = ids; n++; }
    }
    return { name: str(raw.name, 40, 'Compañero'), updated: str(raw.updated_at, 40), shifts, days };
  }

  const api = {
    LIMITS, KINDS, KIND_LABEL, TRANSPORTS, defaultKinds, kindOk, applyRoutine, entryTransport, sameEntries, applyEdit, EDIT_KEYS, PATTERNS, pad, iso, parseISO, addDays, toMin, uid, startOfWeek,
    defaults, sanitize, buildSharePayload, sanitizeShare, entryTimes, entryBreak, entryHours, report, parsePattern, patternSlots, applyRotation, toICS, parseICS,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.KGTurns = api;
})(typeof window !== 'undefined' ? window : globalThis);
