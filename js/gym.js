/* KeepGoing — Gimnasio (v1.30): lógica pura, sin DOM.
   Catálogo de ejercicios propio (ES / EN), series, volumen, récords, músculos trabajados y resúmenes por periodo
   para la pestaña Gimnasio, el diario semanal y el hábito de entrenamiento vinculado.
   Escrito para KeepGoing a partir de las ideas de openGym (rutinas, series, mapa de músculos); no reutiliza su código.
   Se usa en el navegador (window.KGGym) y en los tests de Node (require). */
(function (root) {
  'use strict';

  /* ---------- músculos ----------
     Claves propias. «front» / «back» dicen en qué lado del cuerpo se dibujan. */
  const MUSCLES = ['chest', 'shoulders', 'biceps', 'triceps', 'forearms', 'abs', 'obliques', 'traps', 'lats', 'upperback', 'lowerback', 'glutes', 'quads', 'hamstrings', 'adductors', 'calves', 'cardio'];
  const MUSCLE_NAME = {
    es: { chest: 'Pecho', shoulders: 'Hombros', biceps: 'Bíceps', triceps: 'Tríceps', forearms: 'Antebrazos', abs: 'Abdomen', obliques: 'Oblicuos', traps: 'Trapecio', lats: 'Dorsales', upperback: 'Espalda alta', lowerback: 'Lumbares', glutes: 'Glúteos', quads: 'Cuádriceps', hamstrings: 'Isquios', adductors: 'Aductores', calves: 'Gemelos', cardio: 'Cardio' },
    en: { chest: 'Chest', shoulders: 'Shoulders', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms', abs: 'Abs', obliques: 'Obliques', traps: 'Traps', lats: 'Lats', upperback: 'Upper back', lowerback: 'Lower back', glutes: 'Glutes', quads: 'Quads', hamstrings: 'Hamstrings', adductors: 'Adductors', calves: 'Calves', cardio: 'Cardio' }
  };
  // Grupos para filtrar el catálogo
  const GROUPS = { chest: ['chest'], back: ['lats', 'upperback', 'lowerback', 'traps'], shoulders: ['shoulders'], arms: ['biceps', 'triceps', 'forearms'], legs: ['quads', 'hamstrings', 'glutes', 'adductors', 'calves'], core: ['abs', 'obliques'], cardio: ['cardio'] };

  const KINDS = ['w', 'bw', 'h', 'c'];
  const EQUIP = ['barbell', 'dumbbell', 'cable', 'machine', 'band', 'body', 'kettlebell', 'none'];

  /* ---------- catálogo ----------
     [id, nombre ES, nombre EN, principales, secundarios, tipo, material]
     tipo: 'w' peso × repeticiones, 'bw' peso corporal (repeticiones, lastre opcional), 'h' aguantar (segundos), 'c' cardio (minutos y km) */
  const RAW = [
    ['bench', 'Press de banca con barra', 'Barbell bench press', ['chest'], ['triceps', 'shoulders'], 'w', 'barbell'],
    ['incbench', 'Press inclinado con barra', 'Incline barbell press', ['chest'], ['shoulders', 'triceps'], 'w', 'barbell'],
    ['dbbench', 'Press de banca con mancuernas', 'Dumbbell bench press', ['chest'], ['triceps', 'shoulders'], 'w', 'dumbbell'],
    ['incdb', 'Press inclinado con mancuernas', 'Incline dumbbell press', ['chest'], ['shoulders', 'triceps'], 'w', 'dumbbell'],
    ['dbfly', 'Aperturas con mancuernas', 'Dumbbell fly', ['chest'], ['shoulders'], 'w', 'dumbbell'],
    ['cablefly', 'Cruce de poleas', 'Cable crossover', ['chest'], ['shoulders'], 'w', 'cable'],
    ['chestpress', 'Press de pecho en máquina', 'Machine chest press', ['chest'], ['triceps'], 'w', 'machine'],
    ['pecdeck', 'Contractor de pecho', 'Pec deck', ['chest'], [], 'w', 'machine'],
    ['pushup', 'Flexiones', 'Push-ups', ['chest'], ['triceps', 'shoulders', 'abs'], 'bw', 'body'],
    ['dips', 'Fondos en paralelas', 'Parallel bar dips', ['chest', 'triceps'], ['shoulders'], 'bw', 'body'],
    ['pullup', 'Dominadas', 'Pull-ups', ['lats'], ['biceps', 'upperback'], 'bw', 'body'],
    ['chinup', 'Dominadas supinas', 'Chin-ups', ['lats', 'biceps'], ['upperback'], 'bw', 'body'],
    ['latpull', 'Jalón al pecho', 'Lat pulldown', ['lats'], ['biceps', 'upperback'], 'w', 'cable'],
    ['bbrow', 'Remo con barra', 'Barbell row', ['upperback', 'lats'], ['biceps', 'lowerback'], 'w', 'barbell'],
    ['dbrow', 'Remo con mancuerna', 'One-arm dumbbell row', ['lats', 'upperback'], ['biceps'], 'w', 'dumbbell'],
    ['cablerow', 'Remo sentado en polea', 'Seated cable row', ['upperback', 'lats'], ['biceps'], 'w', 'cable'],
    ['tbar', 'Remo en T', 'T-bar row', ['upperback', 'lats'], ['biceps', 'lowerback'], 'w', 'barbell'],
    ['pullover', 'Pullover en polea', 'Cable pullover', ['lats'], ['chest'], 'w', 'cable'],
    ['deadlift', 'Peso muerto', 'Deadlift', ['lowerback', 'hamstrings', 'glutes'], ['traps', 'forearms', 'quads'], 'w', 'barbell'],
    ['rdl', 'Peso muerto rumano', 'Romanian deadlift', ['hamstrings', 'glutes'], ['lowerback'], 'w', 'barbell'],
    ['hyper', 'Hiperextensiones', 'Back extensions', ['lowerback'], ['glutes', 'hamstrings'], 'bw', 'machine'],
    ['shrug', 'Encogimientos', 'Shrugs', ['traps'], ['forearms'], 'w', 'dumbbell'],
    ['facepull', 'Face pull', 'Face pull', ['shoulders', 'upperback'], ['traps'], 'w', 'cable'],
    ['ohp', 'Press militar', 'Overhead press', ['shoulders'], ['triceps', 'traps'], 'w', 'barbell'],
    ['dbohp', 'Press de hombro con mancuernas', 'Dumbbell shoulder press', ['shoulders'], ['triceps'], 'w', 'dumbbell'],
    ['latraise', 'Elevaciones laterales', 'Lateral raises', ['shoulders'], ['traps'], 'w', 'dumbbell'],
    ['frontraise', 'Elevaciones frontales', 'Front raises', ['shoulders'], [], 'w', 'dumbbell'],
    ['reardelt', 'Pájaros (deltoides posterior)', 'Rear delt fly', ['shoulders'], ['upperback'], 'w', 'dumbbell'],
    ['arnold', 'Press Arnold', 'Arnold press', ['shoulders'], ['triceps'], 'w', 'dumbbell'],
    ['bbcurl', 'Curl con barra', 'Barbell curl', ['biceps'], ['forearms'], 'w', 'barbell'],
    ['dbcurl', 'Curl con mancuernas', 'Dumbbell curl', ['biceps'], ['forearms'], 'w', 'dumbbell'],
    ['hammer', 'Curl martillo', 'Hammer curl', ['biceps', 'forearms'], [], 'w', 'dumbbell'],
    ['preacher', 'Curl predicador', 'Preacher curl', ['biceps'], [], 'w', 'machine'],
    ['cablecurl', 'Curl en polea', 'Cable curl', ['biceps'], ['forearms'], 'w', 'cable'],
    ['pushdown', 'Extensión de tríceps en polea', 'Triceps pushdown', ['triceps'], [], 'w', 'cable'],
    ['skull', 'Press francés', 'Skull crushers', ['triceps'], [], 'w', 'barbell'],
    ['ohext', 'Extensión de tríceps sobre la cabeza', 'Overhead triceps extension', ['triceps'], [], 'w', 'dumbbell'],
    ['cgbench', 'Press de banca agarre cerrado', 'Close-grip bench press', ['triceps'], ['chest', 'shoulders'], 'w', 'barbell'],
    ['wristcurl', 'Curl de muñeca', 'Wrist curl', ['forearms'], [], 'w', 'dumbbell'],
    ['farmer', 'Paseo del granjero', "Farmer's walk", ['forearms', 'traps'], ['abs', 'glutes'], 'w', 'dumbbell'],
    ['squat', 'Sentadilla con barra', 'Barbell back squat', ['quads', 'glutes'], ['hamstrings', 'lowerback', 'adductors'], 'w', 'barbell'],
    ['frontsquat', 'Sentadilla frontal', 'Front squat', ['quads'], ['glutes', 'abs'], 'w', 'barbell'],
    ['goblet', 'Sentadilla goblet', 'Goblet squat', ['quads', 'glutes'], ['abs', 'adductors'], 'w', 'dumbbell'],
    ['legpress', 'Prensa de piernas', 'Leg press', ['quads', 'glutes'], ['hamstrings', 'adductors'], 'w', 'machine'],
    ['hack', 'Sentadilla hack', 'Hack squat', ['quads'], ['glutes'], 'w', 'machine'],
    ['lunge', 'Zancadas', 'Lunges', ['quads', 'glutes'], ['hamstrings', 'adductors'], 'w', 'dumbbell'],
    ['bulgarian', 'Sentadilla búlgara', 'Bulgarian split squat', ['quads', 'glutes'], ['hamstrings'], 'w', 'dumbbell'],
    ['legext', 'Extensión de cuádriceps', 'Leg extension', ['quads'], [], 'w', 'machine'],
    ['legcurl', 'Curl femoral', 'Leg curl', ['hamstrings'], ['calves'], 'w', 'machine'],
    ['hipthrust', 'Hip thrust', 'Hip thrust', ['glutes'], ['hamstrings'], 'w', 'barbell'],
    ['glutebridge', 'Puente de glúteo', 'Glute bridge', ['glutes'], ['hamstrings'], 'bw', 'body'],
    ['abduct', 'Abductores en máquina', 'Hip abduction machine', ['glutes'], [], 'w', 'machine'],
    ['adduct', 'Aductores en máquina', 'Hip adduction machine', ['adductors'], [], 'w', 'machine'],
    ['calfstand', 'Gemelos de pie', 'Standing calf raise', ['calves'], [], 'w', 'machine'],
    ['calfseat', 'Gemelos sentado', 'Seated calf raise', ['calves'], [], 'w', 'machine'],
    ['stepup', 'Subidas al cajón', 'Step-ups', ['quads', 'glutes'], ['calves'], 'w', 'dumbbell'],
    ['plank', 'Plancha', 'Plank', ['abs'], ['obliques', 'shoulders'], 'h', 'body'],
    ['sideplank', 'Plancha lateral', 'Side plank', ['obliques'], ['abs'], 'h', 'body'],
    ['crunch', 'Crunch abdominal', 'Crunch', ['abs'], [], 'bw', 'body'],
    ['legraise', 'Elevación de piernas colgado', 'Hanging leg raise', ['abs'], ['obliques', 'forearms'], 'bw', 'body'],
    ['cablecrunch', 'Crunch en polea', 'Cable crunch', ['abs'], ['obliques'], 'w', 'cable'],
    ['russian', 'Giros rusos', 'Russian twists', ['obliques'], ['abs'], 'bw', 'body'],
    ['abwheel', 'Rueda abdominal', 'Ab wheel rollout', ['abs'], ['lats', 'shoulders'], 'bw', 'body'],
    ['mountain', 'Escaladores', 'Mountain climbers', ['abs'], ['shoulders', 'cardio'], 'h', 'body'],
    ['burpee', 'Burpees', 'Burpees', ['cardio'], ['chest', 'quads', 'abs'], 'bw', 'body'],
    ['kbswing', 'Swing con kettlebell', 'Kettlebell swing', ['glutes', 'hamstrings'], ['lowerback', 'shoulders', 'cardio'], 'w', 'kettlebell'],
    ['clean', 'Cargada de potencia', 'Power clean', ['glutes', 'hamstrings', 'traps'], ['quads', 'shoulders', 'lowerback'], 'w', 'barbell'],
    ['run', 'Correr', 'Running', ['cardio'], ['quads', 'calves', 'hamstrings'], 'c', 'none'],
    ['tread', 'Cinta de correr', 'Treadmill', ['cardio'], ['quads', 'calves'], 'c', 'machine'],
    ['bike', 'Bicicleta estática', 'Stationary bike', ['cardio'], ['quads'], 'c', 'machine'],
    ['row', 'Remo ergómetro', 'Rowing machine', ['cardio'], ['upperback', 'lats', 'quads'], 'c', 'machine'],
    ['elliptical', 'Elíptica', 'Elliptical', ['cardio'], ['quads', 'glutes'], 'c', 'machine'],
    ['stairs', 'Escaladora', 'Stair climber', ['cardio'], ['glutes', 'quads', 'calves'], 'c', 'machine'],
    ['rope', 'Comba', 'Jump rope', ['cardio'], ['calves', 'shoulders'], 'c', 'none'],
    ['swim', 'Natación', 'Swimming', ['cardio'], ['lats', 'shoulders'], 'c', 'none'],
    ['walk', 'Caminar', 'Walking', ['cardio'], ['calves'], 'c', 'none']
  ];
  const CATALOGUE = RAW.map(([id, es, en, p, s, kind, equip]) => ({ id, name: { es, en }, p, s, kind, equip }));
  const BY_ID = new Map(CATALOGUE.map(e => [e.id, e]));
  /* Catálogo ampliado: los 1.324 ejercicios de ExerciseDB (datos MIT, ver data/NOTICE-ejercicios.md), en data/gym-exdb.json.
     Se carga aparte (pesa ~165 KB) y se añade detrás de los propios. Ids «x0001»… para no chocar con los de arriba. */
  const EXTRA = [];
  function addCatalogue(rows) {
    if (!Array.isArray(rows)) return 0; let n = 0;
    rows.forEach(r => {
      if (!Array.isArray(r) || typeof r[0] !== 'string' || BY_ID.has(r[0])) return;
      const [id, es, en, p, s, kind, equip] = r;
      const e = { id, name: { es: String(es || en), en: String(en || es) }, p: (p || []).filter(m => MUSCLES.includes(m)), s: (s || []).filter(m => MUSCLES.includes(m)), kind: KINDS.includes(kind) ? kind : 'w', equip: equip || 'none', db: true };
      EXTRA.push(e); BY_ID.set(id, e); n++;
    });
    return n;
  }

  /* Rutinas de inicio: se cargan como rutinas normales y se pueden editar */
  const STARTERS = [
    { key: 'push', name: { es: 'Empuje', en: 'Push' }, ex: [['bench', 4, 8], ['incdb', 3, 10], ['ohp', 3, 8], ['latraise', 3, 15], ['pushdown', 3, 12]] },
    { key: 'pull', name: { es: 'Tirón', en: 'Pull' }, ex: [['pullup', 4, 8], ['bbrow', 4, 8], ['facepull', 3, 15], ['dbcurl', 3, 12], ['hammer', 3, 12]] },
    { key: 'legs', name: { es: 'Pierna', en: 'Legs' }, ex: [['squat', 4, 6], ['rdl', 3, 10], ['legpress', 3, 12], ['legcurl', 3, 12], ['calfstand', 4, 15]] },
    { key: 'full', name: { es: 'Cuerpo completo', en: 'Full body' }, ex: [['squat', 3, 8], ['bench', 3, 8], ['bbrow', 3, 8], ['dbohp', 3, 10], ['plank', 3, 45]] },
    { key: 'upper', name: { es: 'Tren superior', en: 'Upper body' }, ex: [['bench', 4, 6], ['bbrow', 4, 6], ['dbohp', 3, 10], ['latpull', 3, 10], ['dbcurl', 2, 12], ['pushdown', 2, 12]] },
    { key: 'lower', name: { es: 'Tren inferior', en: 'Lower body' }, ex: [['squat', 4, 6], ['rdl', 3, 8], ['bulgarian', 3, 10], ['legcurl', 3, 12], ['calfseat', 3, 15], ['cablecrunch', 3, 12]] }
  ];

  const LIMITS = { name: 60, note: 400, exPerWorkout: 40, setsPerEx: 30, routines: 60, custom: 200, workouts: 5000 };
  const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;
  const num = (v, max) => { const n = +v; return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n * 100) / 100, max) : 0; };
  const str = (v, n) => String(v == null ? '' : v).slice(0, n);

  // Ejercicio por id: primero los propios del usuario (custom), luego el catálogo
  function exercise(id, custom) {
    if (Array.isArray(custom)) { const c = custom.find(x => x && x.id === id); if (c) return { id: c.id, name: { es: c.name, en: c.name }, p: c.p || [], s: c.s || [], kind: KINDS.includes(c.kind) ? c.kind : 'w', equip: c.equip || 'none', custom: true }; }
    return BY_ID.get(id) || null;
  }
  const exName = (ex, lang) => !ex ? '?' : (ex.name[lang] || ex.name.es || ex.name.en);
  function search(q, lang, custom, group) {
    const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const toks = norm(q).split(/\s+/).filter(w => w && !['de', 'con', 'en', 'a', 'the', 'with', 'on'].includes(w)), want = group && GROUPS[group];
    const own = new Set(CATALOGUE.map(e => norm(e.name.es)));
    const all = [...(custom || []).map(c => exercise(c.id, custom)).filter(Boolean), ...CATALOGUE, ...EXTRA.filter(e => !own.has(norm(e.name.es)))];
    return all.filter(e => { if (want && !e.p.some(m => want.includes(m))) return false; if (!toks.length) return true; const hay = norm(e.name.es) + ' ' + norm(e.name.en); return toks.every(w => hay.includes(w)); });
  }

  /* ---------- series ----------
     Una serie: { w: kg, r: repeticiones, s: segundos, d: km, done: true, warm: true }.
     Las de calentamiento no cuentan para récords ni volumen. */
  const isWork = st => st && st.done && !st.warm;
  const setVolume = (st, kind) => kind === 'w' || kind === 'bw' ? (+st.w || 0) * (+st.r || 0) : 0;
  // Uno-máximo estimado (Epley); solo con repeticiones razonables
  const e1rm = (w, r) => (w > 0 && r > 0 && r <= 15) ? Math.round(w * (1 + (r === 1 ? 0 : r / 30)) * 10) / 10 : 0;

  // Músculos de un entrenamiento: series hechas por músculo (principal = 1, secundario = 0,5)
  function musclesOf(w, custom) {
    const out = {};
    (w.ex || []).forEach(x => {
      const e = exercise(x.eid, custom); if (!e) return;
      const n = (x.sets || []).filter(isWork).length; if (!n) return;
      e.p.forEach(m => { out[m] = (out[m] || 0) + n; });
      e.s.forEach(m => { out[m] = (out[m] || 0) + n / 2; });
    });
    return out;
  }
  function workoutStats(w, custom) {
    let sets = 0, volume = 0, reps = 0, cardioMin = 0, km = 0;
    (w.ex || []).forEach(x => {
      const e = exercise(x.eid, custom); const kind = e ? e.kind : 'w';
      (x.sets || []).filter(isWork).forEach(st => {
        sets++; volume += setVolume(st, kind); reps += +st.r || 0;
        if (kind === 'c') { cardioMin += (+st.s || 0) / 60; km += +st.d || 0; }
      });
    });
    const minutes = w.end && w.start ? Math.max(0, Math.round((w.end - w.start) / 60000)) : (+w.min || 0);
    return { sets, volume: Math.round(volume), reps, minutes, cardioMin: Math.round(cardioMin), km: Math.round(km * 10) / 10, muscles: musclesOf(w, custom) };
  }
  const isDone = w => w && w.status === 'done' && RE_DATE.test(w.date || '');

  // Resumen de un periodo [from, to] (claves YYYY-MM-DD, ambas incluidas): días entrenados, sesiones, series, volumen y músculos
  function summary(workouts, from, to, custom) {
    const list = (workouts || []).filter(w => isDone(w) && w.date >= from && w.date <= to);
    const days = [...new Set(list.map(w => w.date))].sort();
    const muscles = {}; let sets = 0, volume = 0, minutes = 0, km = 0;
    list.forEach(w => { const s = workoutStats(w, custom); sets += s.sets; volume += s.volume; minutes += s.minutes; km += s.km; for (const m in s.muscles) muscles[m] = (muscles[m] || 0) + s.muscles[m]; });
    const top = Object.entries(muscles).sort((a, b) => b[1] - a[1]).map(([m, n]) => ({ m, n: Math.round(n * 10) / 10 }));
    return { days, sessions: list.length, sets, volume: Math.round(volume), minutes, km: Math.round(km * 10) / 10, muscles: top };
  }
  // Para el diario semanal: lo mismo para los 7 días de la semana (keys = las 7 claves)
  const weekSummary = (workouts, keys, custom) => summary(workouts, keys[0], keys[keys.length - 1], custom);
  const trainedOn = (workouts, k) => (workouts || []).some(w => isDone(w) && w.date === k);

  /* ---------- récords ----------
     Para cada ejercicio: mayor peso, mayor 1RM estimado y más repeticiones (peso corporal) o tiempo (aguantar). */
  function bests(workouts, custom, opts = {}) {
    const out = {};
    (workouts || []).filter(w => isDone(w) && w.id !== opts.except && (!opts.before || w.date < opts.before || (w.date === opts.before && (w.end || 0) < (opts.beforeEnd || 0)))).forEach(w => (w.ex || []).forEach(x => {
      const e = exercise(x.eid, custom); const kind = e ? e.kind : 'w';
      const b = out[x.eid] || (out[x.eid] = { w: 0, e1: 0, r: 0, s: 0, d: 0 });
      (x.sets || []).filter(isWork).forEach(st => {
        if (kind === 'w') { b.w = Math.max(b.w, +st.w || 0); b.e1 = Math.max(b.e1, e1rm(+st.w || 0, +st.r || 0)); }
        if (kind === 'bw') { b.r = Math.max(b.r, +st.r || 0); b.w = Math.max(b.w, +st.w || 0); }
        if (kind === 'h') b.s = Math.max(b.s, +st.s || 0);
        if (kind === 'c') b.d = Math.max(b.d, +st.d || 0);
      });
    }));
    return out;
  }
  // Récords nuevos de un entrenamiento terminado, comparando con todo lo anterior
  function newRecords(workouts, w, custom) {
    const prev = bests(workouts, custom, { except: w.id, before: w.date, beforeEnd: w.end || Infinity }), now = bests([{ ...w, status: 'done' }], custom), out = [];
    for (const eid in now) {
      const p = prev[eid]; if (!p) continue; // la primera vez no es récord: no hay con qué comparar
      const n = now[eid], e = exercise(eid, custom); const kind = e ? e.kind : 'w';
      if (kind === 'w' && (n.e1 > p.e1 || n.w > p.w)) out.push({ eid, type: n.w > p.w ? 'w' : 'e1', v: n.w > p.w ? n.w : n.e1, was: n.w > p.w ? p.w : p.e1 });
      else if (kind === 'bw' && n.r > p.r) out.push({ eid, type: 'r', v: n.r, was: p.r });
      else if (kind === 'h' && n.s > p.s) out.push({ eid, type: 's', v: n.s, was: p.s });
      else if (kind === 'c' && n.d > p.d) out.push({ eid, type: 'd', v: n.d, was: p.d });
    }
    return out;
  }
  // Historial de un ejercicio: [{ date, best, e1, vol }] de la más antigua a la más reciente
  function history(workouts, eid, custom) {
    const e = exercise(eid, custom), kind = e ? e.kind : 'w';
    return (workouts || []).filter(isDone).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.end || 0) - (b.end || 0)).map(w => {
      const sets = (w.ex || []).filter(x => x.eid === eid).flatMap(x => (x.sets || []).filter(isWork)); if (!sets.length) return null;
      const top = kind === 'w' ? Math.max(...sets.map(s => +s.w || 0)) : kind === 'bw' ? Math.max(...sets.map(s => +s.r || 0)) : kind === 'h' ? Math.max(...sets.map(s => +s.s || 0)) : Math.max(...sets.map(s => +s.d || 0));
      return { date: w.date, sets: sets.length, best: top, e1: kind === 'w' ? Math.max(...sets.map(s => e1rm(+s.w || 0, +s.r || 0))) : 0, vol: Math.round(sets.reduce((a, s) => a + setVolume(s, kind), 0)) };
    }).filter(Boolean);
  }
  // Última vez que se hizo un ejercicio: sus series (para proponer el mismo peso)
  function lastSets(workouts, eid, exceptId) {
    const l = (workouts || []).filter(w => isDone(w) && w.id !== exceptId && (w.ex || []).some(x => x.eid === eid)).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : (b.end || 0) - (a.end || 0))[0];
    if (!l) return null;
    return (l.ex.find(x => x.eid === eid).sets || []).filter(isWork).map(s => ({ w: s.w, r: s.r, s: s.s, d: s.d }));
  }

  /* ---------- racha de semanas entrenando ----------
     Semanas seguidas (hasta la actual) con al menos `goal` días entrenados. La semana en curso cuenta si ya llega. */
  function weekStreak(workouts, weekKeysOf, today, goal = 1) {
    const days = new Set((workouts || []).filter(isDone).map(w => w.date));
    let n = 0, ks = weekKeysOf(today), first = true;
    for (let i = 0; i < 520; i++) {
      const c = ks.filter(k => days.has(k)).length;
      if (c >= goal) n++; else if (!first) break;
      first = false;
      const prev = new Date(ks[0] + 'T12:00:00'); prev.setDate(prev.getDate() - 7);
      ks = weekKeysOf(prev.getFullYear() + '-' + String(prev.getMonth() + 1).padStart(2, '0') + '-' + String(prev.getDate()).padStart(2, '0'));
    }
    return n;
  }

  // Hábito que probablemente es «entrenar» (para proponerlo como vínculo)
  const HABIT_RE = /(entren|gym|gimnas|pesas|workout|train|fuerza|muscul|crossfit|deporte|ejercicio|exercise|fitness)/i;
  function suggestHabit(habits) {
    const list = (habits || []).filter(h => h && !h.archived && h.kind !== 'quit' && h.measure !== 'amount');
    return list.find(h => HABIT_RE.test(h.name || '')) || null;
  }

  /* ---------- limpieza (datos que llegan de la nube o de una copia) ---------- */
  function cleanSet(s) {
    if (!s || typeof s !== 'object') return null;
    const o = {}; const w = num(s.w, 2000), r = Math.floor(num(s.r, 1000)), sec = Math.floor(num(s.s, 86400)), d = num(s.d, 1000);
    if (w) o.w = w; if (r) o.r = r; if (sec) o.s = sec; if (d) o.d = d; if (s.done) o.done = true; if (s.warm) o.warm = true;
    return o;
  }
  function cleanWorkout(w) {
    if (!w || typeof w !== 'object' || typeof w.id !== 'string' || !RE_DATE.test(w.date || '')) return null;
    const o = { id: w.id.slice(0, 40), date: w.date, name: str(w.name, LIMITS.name), status: w.status === 'done' ? 'done' : 'live', note: str(w.note, LIMITS.note) };
    if (+w.start > 0) o.start = +w.start; if (+w.end > 0) o.end = +w.end; if (+w.min > 0) o.min = Math.min(+w.min, 1440);
    if (typeof w.rid === 'string') o.rid = w.rid.slice(0, 40);
    if (typeof w.hab === 'string') o.hab = w.hab.slice(0, 40);
    if (+w.prs > 0) o.prs = Math.min(99, Math.floor(+w.prs));
    if (w.mt) o.mt = w.mt;
    o.ex = (Array.isArray(w.ex) ? w.ex : []).slice(0, LIMITS.exPerWorkout).filter(x => x && typeof x.eid === 'string').map(x => ({ eid: x.eid.slice(0, 40), sets: (Array.isArray(x.sets) ? x.sets : []).slice(0, LIMITS.setsPerEx).map(cleanSet).filter(Boolean), ...(x.note ? { note: str(x.note, 200) } : {}), ...(+x.rest > 0 ? { rest: Math.min(+x.rest, 900) } : {}) }));
    return o;
  }
  function cleanRoutine(r) {
    if (!r || typeof r !== 'object' || typeof r.id !== 'string') return null;
    const o = { id: r.id.slice(0, 40), name: str(r.name, LIMITS.name) || '—', ex: (Array.isArray(r.ex) ? r.ex : []).slice(0, LIMITS.exPerWorkout).filter(x => x && typeof x.eid === 'string').map(x => ({ eid: x.eid.slice(0, 40), sets: Math.max(1, Math.min(LIMITS.setsPerEx, Math.floor(+x.sets) || 3)), reps: Math.max(1, Math.min(1000, Math.floor(+x.reps) || 10)), ...(num(x.w, 2000) ? { w: num(x.w, 2000) } : {}), ...(+x.rest > 0 ? { rest: Math.min(+x.rest, 900) } : {}) })) };
    if (Array.isArray(r.days)) o.days = r.days.filter(d => Number.isInteger(d) && d >= 0 && d < 7);
    if (r.mt) o.mt = r.mt;
    return o;
  }
  // Un entrenamiento nuevo a partir de una rutina (propone el peso de la última vez)
  function fromRoutine(r, workouts, custom, id, date, now) {
    return {
      id, date, name: r.name, rid: r.id, status: 'live', start: now, note: '',
      ex: r.ex.map(x => {
        const e = exercise(x.eid, custom), kind = e ? e.kind : 'w', last = lastSets(workouts, x.eid) || [];
        return { eid: x.eid, ...(x.rest ? { rest: x.rest } : {}), sets: Array.from({ length: x.sets }, (_, i) => {
          const l = last[i] || last[last.length - 1] || {};
          if (kind === 'h') return { s: l.s || x.reps };
          if (kind === 'c') return { s: l.s || x.reps * 60, d: l.d };
          return { w: l.w || x.w, r: x.reps };
        }) };
      })
    };
  }
  const starterRoutine = (key, lang, id) => { const s = STARTERS.find(x => x.key === key); return s ? { id, name: s.name[lang] || s.name.es, ex: s.ex.map(([eid, sets, reps]) => ({ eid, sets, reps })) } : null; };

  const api = { addCatalogue, extraCount: () => EXTRA.length, MUSCLES, MUSCLE_NAME, GROUPS, CATALOGUE, STARTERS, KINDS, EQUIP, LIMITS, exercise, exName, search, isWork, setVolume, e1rm, musclesOf, workoutStats, summary, weekSummary, trainedOn, bests, newRecords, history, lastSets, weekStreak, suggestHabit, cleanSet, cleanWorkout, cleanRoutine, fromRoutine, starterRoutine };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KGGym = api;
})(typeof window !== 'undefined' ? window : this);
