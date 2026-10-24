/* KeepGoing — Calendario de turnos (v1.20, traído de TurnoFlow): lógica pura, sin DOM.
   Turnos, trabajos, rotaciones, informes (horas, paga, extras y tarifas especiales), ICS y validación.
   Se usa en el navegador (window.KGTurns) y en los tests de Node (require). */
(function (root) {
  'use strict';

  const LIMITS = { specials: 6, shifts: 200, jobs: 20, days: 20000, perDay: 10, ext: 5000, text: 100, note: 500 };
  const KINDS = ['work', 'off', 'vacation', 'sick', 'training'];
  const KIND_LABEL = { work: 'Trabajo', off: 'Libre', vacation: 'Vacaciones', sick: 'Baja', training: 'Formación' };
  /* v1.23: los tipos se pueden añadir, editar y borrar. Cada tipo dice si cuenta para la paga (como «Trabajo»);
     un tipo que no la cobra (p. ej. «Ocio» para ir al cine) suma horas pero no dinero. «other» es «Otro», sin paga. */
  const defaultKinds = () => [...KINDS, 'other'].map((id) => ({ id, name: '', paid: id === 'work' }));
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
    const job = { id: 'job1', name: 'Trabajo', color: '#4f6bed', rate: 12, otWeekHours: 40, otMode: 'mult', otPlus: 1.5, specials: [] };
    const sh = (id, name, emoji, color, kind, start, end, brk, alarm) =>
      ({ id, jobId: 'job1', name, emoji, color, kind, start, end, breakMin: brk, diffPct: 0, alarmMin: alarm || 0 });
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
  // Plus: multiplicador (1-10) o cantidad fija de dinero por hora (0-1000)
  const normPlus = (mode, v, fb) => (mode === 'fixed' ? num(v, 0, 1000, 0) : num(v, 1, 10, fb));
  const applyPlus = (base, mode, plus) => (mode === 'fixed' ? base + plus : base * plus);
  const inWindow = (t, from, to) => { const f = toMin(from), e = toMin(to); return f === e ? false : (f < e ? t >= f && t < e : t >= f || t < e); };
  /** Fracción del turno que cae en cada tarifa especial (último índice = horas normales). */
  function specialFractions(job, start, end) {
    const sp = job.specials || [], fr = new Array(sp.length + 1).fill(0);
    if (!sp.length || !start || !end) { fr[sp.length] = 1; return fr; }
    let a = toMin(start), b = toMin(end); if (b <= a) b += 1440;
    for (let m = a; m < b; m++) {
      const t = m % 1440; let idx = sp.length;
      for (let i = 0; i < sp.length; i++) if (inWindow(t, sp[i].from, sp[i].to)) { idx = i; break; }
      fr[idx]++;
    }
    return fr.map((x) => x / (b - a));
  }
  const timeOr = (v) => (typeof v === 'string' && RE_TIME.test(v) ? v : '');

  /** Valida y normaliza datos externos (localStorage o importación). Lanza Error si no son válidos. */
  function sanitize(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Formato no válido');
    const def = defaults();
    const jobs = (Array.isArray(raw.jobs) ? raw.jobs : []).slice(0, LIMITS.jobs).map((j) => ({
      id: id(j.id), name: str(j.name, LIMITS.text, 'Trabajo'), paid: j.paid !== false,
      color: RE_COLOR.test(j.color) ? j.color : '#4f6bed',
      rate: num(j.rate, 0, 100000, 0), otWeekHours: num(j.otWeekHours, 0, 168, 0),
      otMode: j.otMode === 'fixed' ? 'fixed' : 'mult', otPlus: normPlus(j.otMode, j.otPlus !== undefined ? j.otPlus : j.otMult, 1.5),
      specials: (Array.isArray(j.specials) ? j.specials : []).slice(0, LIMITS.specials).filter((sp) => sp && typeof sp === 'object').map((sp) => ({
        rate: num(sp.rate, 0, 100000, 0), from: timeOr(sp.from) || '22:00', to: timeOr(sp.to) || '06:00',
        mode: sp.mode === 'fixed' ? 'fixed' : 'mult', plus: normPlus(sp.mode, sp.plus, 1) })),
    }));
    if (!jobs.length) jobs.push(def.jobs[0]);
    const jobIds = new Set(jobs.map((j) => j.id));
    const shifts = (Array.isArray(raw.shifts) ? raw.shifts : []).slice(0, LIMITS.shifts).map((s) => ({
      id: id(s.id), jobId: jobIds.has(s.jobId) ? s.jobId : jobs[0].id,
      name: str(s.name, LIMITS.text, 'Turno'), emoji: str(s.emoji, 8),
      color: RE_COLOR.test(s.color) ? s.color : '#4f6bed',
      kind: kindOk(s.kind) ? s.kind : 'work',
      start: timeOr(s.start), end: timeOr(s.end),
      breakMin: num(s.breakMin, 0, 720, 0), diffPct: num(s.diffPct, -100, 1000, 0), alarmMin: num(s.alarmMin, 0, 1440, 0),
    }));
    const shiftIds = new Set(shifts.map((s) => s.id));
    const days = {};
    const rd = raw.days && typeof raw.days === 'object' && !Array.isArray(raw.days) ? raw.days : {};
    let n = 0;
    for (const k of Object.keys(rd)) {
      if (!RE_DATE.test(k) || n >= LIMITS.days || !Array.isArray(rd[k])) continue;
      const list = rd[k].slice(0, LIMITS.perDay).filter((e) => e && shiftIds.has(e.sid))
        .map((e) => ({ sid: e.sid, note: str(e.note, LIMITS.note), start: timeOr(e.start), end: timeOr(e.end) }));
      if (list.length) { days[k] = list; n++; }
    }
    const ext = (Array.isArray(raw.ext) ? raw.ext : []).slice(0, LIMITS.ext)
      .filter((e) => e && RE_DATE.test(e.date)).map((e) => ({ date: e.date, title: str(e.title, LIMITS.text) }));
    const st = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
    const settings = {
      weekStart: [0, 1, 6].includes(st.weekStart) ? st.weekStart : 1,
      alarms: st.alarms === true,
    };
    return { v: 1, jobs, shifts, days, ext, settings };
  }

  function entryTimes(shift, e) { return { start: (e && e.start) || shift.start, end: (e && e.end) || shift.end }; }
  function entryHours(shift, e) {
    const { start, end } = entryTimes(shift, e);
    if (!start || !end) return 0;
    let a = toMin(start), b = toMin(end);
    if (b <= a) b += 1440;
    return Math.max(0, (b - a - shift.breakMin) / 60);
  }

  /** Informe de horas/paga entre dos fechas ISO (inclusive). Extras semanales por trabajo.
      v1.23: paidKind(kind) dice si un tipo cuenta para la paga (por defecto solo 'work'); una categoría con paid === false no cobra. */
  function report(data, from, to, weekStart, paidKind) {
    const isPaid = (s, job) => (paidKind ? paidKind(s.kind) : s.kind === 'work') && job.paid !== false;
    const shiftBy = Object.fromEntries(data.shifts.map((s) => [s.id, s]));
    const jobBy = Object.fromEntries(data.jobs.map((j) => [j.id, j]));
    const res = { hours: 0, pay: 0, otHours: 0, count: 0, byShift: {}, byKind: {}, byJob: {} };
    const weekHours = {};
    for (let d = startOfWeek(parseISO(from), weekStart), end = parseISO(to); d <= end; d = addDays(d, 1)) {
      const k = iso(d), inRange = k >= from, wk = iso(startOfWeek(d, weekStart));
      for (const e of data.days[k] || []) {
        const s = shiftBy[e.sid]; if (!s) continue;
        const job = jobBy[s.jobId] || data.jobs[0];
        const h = entryHours(s, e);
        let regular = h, ot = 0;
        const paid = isPaid(s, job);
        if (paid) {
          const key = job.id + '|' + wk, prev = weekHours[key] || 0;
          weekHours[key] = prev + h;
          if (job.otWeekHours > 0) { regular = Math.min(h, Math.max(0, job.otWeekHours - prev)); ot = h - regular; }
        }
        if (!inRange) continue;
        let pay = 0;
        if (paid) {
          const { start, end: en } = entryTimes(s, e), fr = specialFractions(job, start, en), sps = job.specials || [];
          fr.forEach((f, i) => {
            if (!f) return;
            const sp = sps[i];
            let base = sp ? (sp.rate > 0 ? sp.rate : job.rate) : job.rate;
            if (sp) base = applyPlus(base, sp.mode, sp.plus);
            pay += (regular * f * base + ot * f * applyPlus(base, job.otMode, job.otPlus)) * (1 + s.diffPct / 100);
          });
        }
        res.hours += h; res.pay += pay; res.otHours += ot; res.count++;
        const bs = (res.byShift[s.id] = res.byShift[s.id] || { count: 0, hours: 0, pay: 0 });
        bs.count++; bs.hours += h; bs.pay += pay;
        const bk = (res.byKind[s.kind] = res.byKind[s.kind] || { count: 0, hours: 0 });
        bk.count++; bk.hours += h;
        const bj = (res.byJob[job.id] = res.byJob[job.id] || { count: 0, hours: 0, pay: 0, otHours: 0 });
        bj.count++; bj.hours += h; bj.pay += pay; bj.otHours += ot;
      }
    }
    return res;
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
      const add = list.map((e) => ({ sid: e.sid, note: '', start: timeOr(e.start), end: timeOr(e.end) }));
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
    const shiftBy = Object.fromEntries(data.shifts.map((s) => [s.id, s]));
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
        L.push('END:VEVENT');
      });
    }
    L.push('END:VCALENDAR');
    return L.map(fold).join('\r\n') + '\r\n';
  }

  /** Lee eventos (fecha de inicio + título) de un .ics externo. */
  function parseICS(text) {
    const lines = String(text).replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
    const out = []; let cur = null;
    for (const line of lines) {
      if (line === 'BEGIN:VEVENT') cur = {};
      else if (line === 'END:VEVENT') {
        if (cur && cur.date) out.push({ date: cur.date, title: (cur.title || 'Evento').slice(0, LIMITS.text) });
        cur = null;
        if (out.length >= LIMITS.ext) break;
      } else if (cur) {
        const i = line.indexOf(':'); if (i < 0) continue;
        const name = line.slice(0, i).split(';')[0].toUpperCase(), val = line.slice(i + 1);
        if (name === 'DTSTART') { const m = /^(\d{4})(\d{2})(\d{2})/.exec(val); if (m) cur.date = m[1] + '-' + m[2] + '-' + m[3]; }
        else if (name === 'SUMMARY') cur.title = icsUnesc(val);
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
    LIMITS, KINDS, KIND_LABEL, defaultKinds, kindOk, applyRoutine, PATTERNS, pad, iso, parseISO, addDays, toMin, uid, startOfWeek,
    defaults, sanitize, buildSharePayload, sanitizeShare, entryTimes, entryHours, report, parsePattern, patternSlots, applyRotation, toICS, parseICS,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.KGTurns = api;
})(typeof window !== 'undefined' ? window : globalThis);
