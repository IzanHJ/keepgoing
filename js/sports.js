/* KeepGoing — Deportes de Entrenamiento (v1.57): lógica pura y dibujo propio, sin DOM.
   El Gimnasio pasa a llamarse Entrenamiento y, además de las sesiones de pesas, registra deportes.
   Cada deporte tiene sus músculos (para el mapa del cuerpo), sus tipos de sesión (entrenamiento libre y/o partido),
   sus eventos importantes (Partido, Carrera, Gol, KO…), los datos de resultado que tienen sentido (marcador, km, puesto…)
   y una figura propia colocada en la postura del deporte, con los músculos que trabaja iluminados.
   La figura es un muñeco articulado de estilo pictograma: cada pose son ángulos de tronco, brazos y piernas
   (0° = hacia abajo, 90° = hacia delante, 180° = hacia arriba) y el dibujo se encuadra solo.
   Se usa en el navegador (window.KGSport) y en los tests de Node (require). */
(function (root) {
  'use strict';

  /* ---------- eventos importantes (opción múltiple) ---------- */
  const EVENTS = {
    match: ['Partido oficial', 'Official match'], tourn: ['Torneo', 'Tournament'], final: ['Final', 'Final'], goal: ['Gol', 'Goal'], assist: ['Asistencia', 'Assist'],
    clean: ['Portería a cero', 'Clean sheet'], mvp: ['Mejor jugador', 'MVP'], triple: ['Triple', 'Three-pointer'], dunk: ['Mate', 'Dunk'], ace: ['Ace', 'Ace'],
    block: ['Bloqueo', 'Block'], race: ['Carrera', 'Race'], comp: ['Competición', 'Competition'], podium: ['Podio', 'Podium'], pb: ['Récord personal', 'Personal best'],
    score: ['Puntuación', 'Score'], fight: ['Combate', 'Fight'], ko: ['KO', 'KO'], belt: ['Cambio de cinturón', 'Belt promotion'], kata: ['Kata', 'Kata'],
    kumite: ['Kumite', 'Kumite'], summit: ['Cumbre', 'Summit'], route: ['Ruta nueva', 'New route'], long: ['Distancia larga', 'Long distance'],
    half: ['Media maratón', 'Half marathon'], marathon: ['Maratón', 'Marathon'], wave: ['Mejor ola', 'Best wave'], first: ['Primera vez', 'First time'],
    td: ['Touchdown', 'Touchdown'], try: ['Ensayo', 'Try'], jump: ['Salto', 'Jump'], solo: ['Salto en solitario', 'Solo jump'], license: ['Licencia', 'License'],
    win: ['Victoria', 'Win']
  };
  /* ---------- datos de resultado ----------
     score: marcador (nosotros / rivales); mine: tus goles o puntos; out: victoria / empate / derrota; pos: puesto;
     km: distancia; elev: desnivel (m); waves: olas; pts: puntuación de jueces; jumps: saltos; alt: altura (m) */
  const METRICS = ['score', 'mine', 'out', 'pos', 'km', 'elev', 'waves', 'pts', 'jumps', 'alt'];
  // Cómo se llama «Partido» según la familia del deporte
  const MATCH_WORD = { ball: ['Partido', 'Match'], racket: ['Partido', 'Match'], combat: ['Combate', 'Fight'], end: ['Competición', 'Competition'], out: ['Competición', 'Competition'], air: ['Competición', 'Competition'] };
  // Cómo se llaman «tus goles» en cada deporte
  const MINE_WORD = { football: ['Mis goles', 'My goals'], handball: ['Mis goles', 'My goals'], hockey: ['Mis goles', 'My goals'], amfootball: ['Mis touchdowns', 'My touchdowns'], rugby: ['Mis ensayos', 'My tries'] };

  /* ---------- poses ----------
     t: inclinación del tronco (0 de pie, 90 tumbado hacia delante); hd: giro de la cabeza; ua/fa: brazo y antebrazo; th/sh: muslo y espinilla.
     Cada par es [lado de atrás, lado de delante]. ik: pies o manos que van a un punto (relativo a la cadera), p. ej. pedales y manillar. */
  const P = (t, ua, fa, th, sh, more) => ({ t, ua, fa, th, sh, ...(more || {}) });
  const SPORTS = [
    { id: 'football', es: 'Fútbol', en: 'Football', fam: 'ball', p: ['quads', 'hamstrings', 'calves', 'cardio'], s: ['glutes', 'adductors', 'abs'], ev: ['match', 'tourn', 'final', 'goal', 'assist', 'clean', 'mvp'], met: ['score', 'mine'], pose: P(-8, [-70, 70], [-40, 40], [-4, 72], [2, 58]), prop: 'ball' },
    { id: 'basketball', es: 'Baloncesto', en: 'Basketball', fam: 'ball', p: ['quads', 'calves', 'shoulders', 'cardio'], s: ['glutes', 'abs', 'triceps', 'forearms'], ev: ['match', 'tourn', 'final', 'triple', 'dunk', 'mvp'], met: ['score', 'mine'], pose: P(-4, [150, 165], [185, 180], [12, 26], [-22, -14]), prop: 'hoopball' },
    { id: 'handball', es: 'Balonmano', en: 'Handball', fam: 'ball', p: ['shoulders', 'quads', 'cardio'], s: ['chest', 'triceps', 'abs', 'obliques', 'calves'], ev: ['match', 'tourn', 'final', 'goal', 'assist', 'mvp'], met: ['score', 'mine'], pose: P(-10, [100, -150], [112, 178], [-32, 36], [-18, 2]), prop: 'handball' },
    { id: 'volleyball', es: 'Voleibol', en: 'Volleyball', fam: 'ball', p: ['shoulders', 'quads', 'calves'], s: ['abs', 'obliques', 'glutes', 'forearms'], ev: ['match', 'tourn', 'final', 'ace', 'block', 'mvp'], met: ['score', 'mine'], pose: P(-12, [-30, 168], [0, 158], [22, 38], [-62, -40]), prop: 'volley' },
    { id: 'padel', es: 'Pádel', en: 'Padel', fam: 'racket', p: ['shoulders', 'forearms', 'quads'], s: ['obliques', 'calves', 'cardio', 'biceps'], ev: ['match', 'tourn', 'final', 'pb'], met: ['score'], pose: P(6, [-40, 78], [-8, 96], [-22, 32], [0, 4]), prop: 'racket' },
    { id: 'athletics', es: 'Atletismo', en: 'Athletics', fam: 'end', p: ['quads', 'hamstrings', 'glutes', 'calves'], s: ['abs', 'cardio'], ev: ['race', 'comp', 'podium', 'pb'], met: ['pos', 'km'], pose: P(34, [104, -52], [96, -12], [-78, 88], [18, 92]), prop: 'hurdle' },
    { id: 'kickboxing', es: 'Kickboxing', en: 'Kickboxing', fam: 'combat', p: ['shoulders', 'abs', 'obliques', 'quads'], s: ['glutes', 'hamstrings', 'calves', 'cardio', 'triceps'], ev: ['fight', 'tourn', 'ko', 'belt', 'podium'], met: ['out', 'pos'], pose: P(-26, [24, 34], [168, 160], [-6, 122], [0, 126]), prop: 'gloves' },
    { id: 'boxing', es: 'Boxeo', en: 'Boxing', fam: 'combat', p: ['shoulders', 'triceps', 'abs', 'obliques'], s: ['chest', 'calves', 'cardio', 'forearms'], ev: ['fight', 'tourn', 'ko', 'podium'], met: ['out', 'pos'], pose: P(10, [22, 88], [164, 90], [-22, 22], [-6, 2]), prop: 'gloves' },
    { id: 'hiking', es: 'Senderismo', en: 'Hiking', fam: 'out', p: ['quads', 'glutes', 'calves'], s: ['hamstrings', 'lowerback', 'cardio'], ev: ['summit', 'route', 'long', 'pb'], met: ['km', 'elev'], pose: P(12, [-22, 42], [0, 82], [-22, 26], [-26, 4]), prop: 'hike' },
    { id: 'swimming', es: 'Natación', en: 'Swimming', fam: 'end', p: ['lats', 'shoulders', 'cardio'], s: ['triceps', 'chest', 'abs', 'quads'], ev: ['race', 'comp', 'podium', 'pb', 'long'], met: ['km', 'pos'], pose: P(90, [12, 92], [-28, 92], [-84, -96], [-90, -84], { hd: 8 }), prop: 'water' },
    { id: 'cycling', es: 'Ciclismo', en: 'Cycling', fam: 'end', p: ['quads', 'glutes', 'calves', 'cardio'], s: ['hamstrings', 'lowerback'], ev: ['race', 'comp', 'podium', 'pb', 'long', 'summit'], met: ['km', 'elev', 'pos'], pose: P(56, [58, 64], [84, 88], [0, 0], [0, 0], { ikF: [[2, 70], [30, 50]], ikH: [[60, -26], [62, -24]] }), prop: 'bike' },
    { id: 'running', es: 'Running', en: 'Running', fam: 'end', p: ['cardio', 'quads', 'calves', 'hamstrings'], s: ['glutes', 'abs'], ev: ['race', 'half', 'marathon', 'podium', 'pb'], met: ['km', 'pos'], pose: P(12, [-46, 42], [44, 132], [-36, 52], [-84, 8]) },
    { id: 'surfing', es: 'Surf', en: 'Surfing', fam: 'out', p: ['shoulders', 'lats', 'abs'], s: ['quads', 'glutes', 'upperback', 'triceps'], ev: ['score', 'wave', 'first', 'podium', 'pb'], met: ['waves', 'pts', 'pos'], pose: P(18, [-104, 110], [-112, 98], [-34, 42], [8, -14]), prop: 'surf' },
    { id: 'karate', es: 'Kárate', en: 'Karate', fam: 'combat', p: ['abs', 'obliques', 'quads', 'shoulders'], s: ['glutes', 'calves', 'triceps', 'hamstrings'], ev: ['kumite', 'kata', 'comp', 'belt', 'podium', 'score'], met: ['out', 'pts', 'pos'], pose: P(0, [-28, 90], [80, 90], [-50, 58], [-48, 4]), prop: 'belt' },
    { id: 'amfootball', es: 'Fútbol americano', en: 'American football', fam: 'ball', p: ['quads', 'glutes', 'shoulders', 'chest'], s: ['traps', 'hamstrings', 'calves', 'cardio'], ev: ['match', 'tourn', 'final', 'td', 'mvp'], met: ['score', 'mine'], pose: P(-6, [96, -140], [104, 176], [-26, 26], [-10, 0]), prop: 'amball' },
    { id: 'rugby', es: 'Rugby', en: 'Rugby', fam: 'ball', p: ['quads', 'glutes', 'shoulders', 'traps'], s: ['chest', 'hamstrings', 'upperback', 'cardio'], ev: ['match', 'tourn', 'final', 'try', 'mvp'], met: ['score', 'mine'], pose: P(22, [26, 34], [104, 112], [-38, 50], [-80, 6]), prop: 'rugbyball' },
    { id: 'skydiving', es: 'Paracaidismo', en: 'Skydiving', fam: 'air', p: ['abs', 'lowerback', 'shoulders'], s: ['traps', 'glutes', 'forearms'], ev: ['jump', 'first', 'solo', 'license', 'pb'], met: ['jumps', 'alt'], pose: P(0, [164, 172], [176, 184], [8, 16], [-6, -12]), prop: 'chute' },
    { id: 'hockey', es: 'Hockey', en: 'Hockey', fam: 'ball', p: ['quads', 'glutes', 'forearms'], s: ['abs', 'obliques', 'lowerback', 'shoulders', 'cardio'], ev: ['match', 'tourn', 'final', 'goal', 'assist', 'mvp'], met: ['score', 'mine'], pose: P(40, [22, 34], [58, 50], [-40, 42], [-22, -8]), prop: 'stick' }
  ];
  const BY = new Map(SPORTS.map(s => [s.id, s]));
  const get = id => BY.get(id) || null;
  const L = (pair, lang) => pair ? (lang === 'en' ? pair[1] : pair[0]) : '';
  const name = (id, lang) => { const s = get(id); return s ? (lang === 'en' ? s.en : s.es) : ''; };
  const eventName = (k, lang) => L(EVENTS[k], lang) || k;
  const matchWord = (id, lang) => { const s = get(id); return L(MATCH_WORD[s ? s.fam : 'end'], lang); };
  const mineWord = (id, lang) => L(MINE_WORD[id] || ['Mis puntos', 'My points'], lang);
  // Orden alfabético en el idioma de la persona
  const sorted = lang => [...SPORTS].sort((a, b) => (lang === 'en' ? a.en : a.es).localeCompare(lang === 'en' ? b.en : b.es, lang));

  /* ---------- músculos de una sesión de deporte ----------
     Igual que las series del gimnasio: principal = 1 «serie» cada 20 minutos (mínimo 1), secundario la mitad. */
  function muscles(id, minutes) {
    const s = get(id); if (!s) return {};
    const n = Math.max(1, Math.round((+minutes || 0) / 20)), out = {};
    s.p.forEach(m => { out[m] = (out[m] || 0) + n; });
    s.s.forEach(m => { out[m] = (out[m] || 0) + n / 2; });
    return out;
  }
  // Para dibujar: principal 1, secundario 0,5
  const levels = id => { const s = get(id); if (!s) return {}; const o = {}; s.s.forEach(m => { o[m] = .5; }); s.p.forEach(m => { o[m] = 1; }); return o; };

  /* ---------- resultado ---------- */
  const int = (v, max) => { const n = Math.floor(+v); return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : null; };
  const dec = (v, max) => { const n = +v; return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n * 100) / 100, max) : null; };
  function cleanRes(r) {
    if (!r || typeof r !== 'object') return null;
    const o = {};
    const put = (k, v) => { if (v !== null && v !== undefined) o[k] = v; };
    put('us', int(r.us, 999)); put('them', int(r.them, 999)); put('mine', int(r.mine, 999)); put('pos', int(r.pos, 9999) || null);
    put('km', dec(r.km, 5000)); put('elev', int(r.elev, 20000) || null); put('waves', int(r.waves, 999) || null); put('pts', dec(r.pts, 1000));
    put('jumps', int(r.jumps, 999) || null); put('alt', int(r.alt, 20000) || null);
    if (['w', 'd', 'l'].includes(r.out)) o.out = r.out;
    return Object.keys(o).length ? o : null;
  }
  // Victoria / empate / derrota: la que se marcó o la que sale del marcador
  function outcome(res) {
    if (!res) return '';
    if (res.out) return res.out;
    if (Number.isFinite(res.us) && Number.isFinite(res.them)) return res.us > res.them ? 'w' : res.us < res.them ? 'l' : 'd';
    return '';
  }
  // Limpia lo propio del deporte de un entrenamiento (sp, st, ev, res)
  function cleanSport(w) {
    const o = {}; if (!w || !get(w.sp)) return o;
    o.sp = w.sp;
    const s = get(w.sp);
    const st = (Array.isArray(w.st) ? w.st : []).filter(x => x === 'free' || x === 'match'); if (st.length) o.st = [...new Set(st)];
    const ev = (Array.isArray(w.ev) ? w.ev : []).filter(k => EVENTS[k] && s.ev.includes(k)); if (ev.length) o.ev = [...new Set(ev)];
    const res = cleanRes(w.res); if (res) o.res = res;
    return o;
  }
  // Resumen corto de una sesión: «Partido · 3–1 · Gol»
  function line(w, lang) {
    const s = get(w && w.sp); if (!s) return '';
    const bits = [];
    if ((w.st || []).includes('match')) bits.push(matchWord(s.id, lang)); else if ((w.st || []).includes('free')) bits.push(lang === 'en' ? 'Free training' : 'Entrenamiento libre');
    const r = w.res || {};
    if (Number.isFinite(r.us) && Number.isFinite(r.them)) bits.push(r.us + '–' + r.them);
    if (r.km) bits.push(String(r.km).replace('.', lang === 'en' ? '.' : ',') + ' km');
    if (r.pos) bits.push(r.pos + 'º');
    (w.ev || []).slice(0, 2).forEach(k => bits.push(eventName(k, lang)));
    return bits.join(' · ');
  }
  // Deportes más usados (para empezar con un toque)
  function recent(workouts, n = 4) {
    const c = new Map();
    (workouts || []).filter(w => w && w.sp && get(w.sp)).forEach(w => { const e = c.get(w.sp) || { id: w.sp, n: 0, last: '' }; e.n++; if ((w.date || '') > e.last) e.last = w.date; c.set(w.sp, e); });
    return [...c.values()].sort((a, b) => a.last < b.last ? 1 : a.last > b.last ? -1 : b.n - a.n).slice(0, n).map(e => e.id);
  }

  /* ---------- la figura ---------- */
  const LEN = { torso: 50, neck: 8, head: 11, ua: 30, fa: 27, th: 40, sh: 40 };
  const WID = { torso: 23, ua: 11, fa: 9.5, th: 15, sh: 11.5 };
  const rad = d => d * Math.PI / 180;
  const limb = (p, a, l) => [p[0] + Math.sin(rad(a)) * l, p[1] + Math.cos(rad(a)) * l];
  const up = (p, a, l) => [p[0] + Math.sin(rad(a)) * l, p[1] - Math.cos(rad(a)) * l];
  // Dos huesos hacia un punto: devuelve el codo / la rodilla (bend 1 = hacia delante)
  function ik(a, target, l1, l2, bend) {
    const dx = target[0] - a[0], dy = target[1] - a[1], d = Math.min(Math.hypot(dx, dy), l1 + l2 - .01);
    const base = Math.atan2(dy, dx), k = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
    const ang = base - bend * k;
    return [a[0] + Math.cos(ang) * l1, a[1] + Math.sin(ang) * l1];
  }
  function joints(pose) {
    const H = [0, 0], S = up(H, pose.t, LEN.torso), M = up(H, pose.t, LEN.torso * .48);
    const neck = up(S, pose.t + (pose.hd || 0), LEN.neck), head = up(S, pose.t + (pose.hd || 0), LEN.neck + LEN.head);
    const J = { H, S, M, neck, head, E: [], W: [], K: [], F: [] };
    for (let i = 0; i < 2; i++) {
      if (pose.ikH) { const T = [H[0] + pose.ikH[i][0], H[1] + pose.ikH[i][1]]; J.E[i] = ik(S, T, LEN.ua, LEN.fa, -1); J.W[i] = T; }
      else { J.E[i] = limb(S, pose.ua[i], LEN.ua); J.W[i] = limb(J.E[i], pose.fa[i], LEN.fa); }
      if (pose.ikF) { const T = [H[0] + pose.ikF[i][0], H[1] + pose.ikF[i][1]]; J.K[i] = ik(H, T, LEN.th, LEN.sh, 1); J.F[i] = T; }
      else { J.K[i] = limb(H, pose.th[i], LEN.th); J.F[i] = limb(J.K[i], pose.sh[i], LEN.sh); }
    }
    return J;
  }
  const n1 = v => Math.round(v * 10) / 10;
  const pt = p => n1(p[0]) + ' ' + n1(p[1]);
  const lv = (mus, list) => Math.max(0, ...list.map(m => +(mus || {})[m] || 0));

  // Accesorios de cada deporte (dibujados con la línea de la figura); devuelven [svg, puntos para el encuadre]
  function propOf(kind, J) {
    const n = 1, f = 0, F = J.F, W = J.W, ground = Math.max(F[0][1], F[1][1]) + 6;
    const ln = (a, b, w = 3, cls = 'sp-prop') => `<path class="${cls}" d="M${pt(a)} L${pt(b)}" stroke-width="${w}"/>`;
    const ball = (c, r = 8, cls = 'sp-ball') => `<circle class="${cls}" cx="${n1(c[0])}" cy="${n1(c[1])}" r="${r}"/>`;
    const oval = (c, rot) => `<ellipse class="sp-ball" cx="${n1(c[0])}" cy="${n1(c[1])}" rx="10" ry="6.5" transform="rotate(${rot} ${n1(c[0])} ${n1(c[1])})"/><path class="sp-prop-thin" d="M${n1(c[0] - 4)} ${n1(c[1])} h8" transform="rotate(${rot} ${n1(c[0])} ${n1(c[1])})"/>`;
    const glove = c => `<circle class="sp-glove" cx="${n1(c[0])}" cy="${n1(c[1])}" r="7.5"/>`;
    switch (kind) {
      case 'ball': { const c = [F[n][0] + 12, F[n][1] - 2]; return [ball(c, 9) + `<path class="sp-prop-thin" d="M${n1(c[0] - 4)} ${n1(c[1] - 3)} l4 -2 l4 3 l-1.5 5 h-5 z"/>`, [c, [c[0] + 10, c[1] + 10]]]; }
      case 'hoopball': { const c = [W[n][0] + 4, W[n][1] - 8]; return [ball(c, 9) + `<path class="sp-prop-thin" d="M${n1(c[0] - 9)} ${n1(c[1])} h18 M${n1(c[0])} ${n1(c[1] - 9)} v18"/>`, [[c[0] - 10, c[1] - 10], [c[0] + 10, c[1] + 10]]]; }
      case 'handball': { const c = [W[n][0] - 2, W[n][1] - 9]; return [ball(c, 7.5), [[c[0] - 9, c[1] - 9]]]; }
      case 'volley': { const c = [W[n][0] + 12, W[n][1] - 14]; return [ball(c, 9) + `<path class="sp-prop-thin" d="M${n1(c[0] - 8)} ${n1(c[1] + 3)} q8 -10 16 -4 M${n1(c[0] - 3)} ${n1(c[1] - 8)} q2 8 9 12"/>`, [[c[0] - 10, c[1] - 10], [c[0] + 10, c[1] + 10]]]; }
      case 'racket': {
        const a = W[n], d = [Math.sin(rad(70)), -Math.cos(rad(70))], hd = [a[0] + d[0] * 16, a[1] + d[1] * 16], c = [a[0] + d[0] * 27, a[1] + d[1] * 27];
        const ballC = [c[0] + 22, c[1] - 10];
        return [ln(a, hd, 4) + `<ellipse class="sp-racket" cx="${n1(c[0])}" cy="${n1(c[1])}" rx="12" ry="9.5" transform="rotate(-20 ${n1(c[0])} ${n1(c[1])})"/>` + ball(ballC, 4.5), [[c[0] + 12, c[1] - 12], [ballC[0] + 5, ballC[1] - 5]]];
      }
      case 'hurdle': { const x0 = J.K[n][0] - 22, y = ground; return [`<path class="sp-prop" d="M${n1(x0)} ${n1(y)} v-34 M${n1(x0 + 30)} ${n1(y)} v-34 M${n1(x0 - 3)} ${n1(y - 34)} h36" stroke-width="4"/><path class="sp-ground" d="M${n1(x0 - 70)} ${n1(y)} h150"/>`, [[x0 - 70, y], [x0 + 80, y]]]; }
      case 'gloves': return [glove(W[f]) + glove(W[n]), [W[n]]];
      case 'hike': {
        const tip = [W[n][0] + 14, ground], top = [W[n][0] - 3, W[n][1] - 10], back = [J.S[0] - 15, J.S[1] + 4];
        return [ln(top, tip, 3) + `<rect class="sp-pack" x="${n1(back[0] - 6)}" y="${n1(back[1] - 2)}" width="13" height="26" rx="5" transform="rotate(${n1(12)} ${n1(back[0])} ${n1(back[1] + 11)})"/><path class="sp-ground" d="M${n1(J.H[0] - 60)} ${n1(ground + 4)} l40 -8 l40 4 l50 -12"/>`, [tip, [back[0] - 8, back[1]], [J.H[0] - 60, ground + 4], [J.H[0] + 70, ground - 16]]];
      }
      case 'water': { const y = J.S[1] - 2, x0 = Math.min(F[0][0], F[1][0]) - 10, x1 = Math.max(W[0][0], W[1][0], J.head[0]) + 14, d = []; for (let x = x0; x < x1; x += 16) d.push(`q4 -5 8 0 q4 5 8 0`); return [`<path class="sp-water" d="M${n1(x0)} ${n1(y)} ${d.join(' ')}"/>`, [[x0, y], [x1, y + 6]]]; }
      case 'bike': {
        const bb = [J.H[0] + 16, J.H[1] + 60], rw = [bb[0] - 40, bb[1] + 4], fw = [bb[0] + 50, bb[1] + 4], seat = [J.H[0], J.H[1] + 6], bar = [J.H[0] + 61, J.H[1] - 25], R = 21;
        const crank = [J.F[0], J.F[1]];
        return [`<g class="sp-bike"><circle cx="${n1(rw[0])}" cy="${n1(rw[1])}" r="${R}"/><circle cx="${n1(fw[0])}" cy="${n1(fw[1])}" r="${R}"/><path d="M${pt(rw)} L${pt(bb)} L${pt(seat)} Z M${pt(bb)} L${n1(bar[0] - 8)} ${n1(bar[1] + 8)} L${pt(seat)} M${n1(bar[0] - 8)} ${n1(bar[1] + 8)} L${pt(fw)} M${n1(bar[0] - 8)} ${n1(bar[1] + 8)} L${pt(bar)} q6 0 6 6 M${n1(seat[0] - 8)} ${n1(seat[1] - 1)} h14"/><circle cx="${n1(bb[0])}" cy="${n1(bb[1])}" r="4"/></g>` + `<path class="sp-prop-thin" d="M${pt(crank[0])} L${pt(crank[1])}"/>`, [[rw[0] - R, rw[1] + R], [fw[0] + R, fw[1] + R], bar]];
      }
      case 'surf': {
        const x0 = Math.min(F[0][0], F[1][0]) - 26, x1 = Math.max(F[0][0], F[1][0]) + 30, y = ground - 1;
        return [`<path class="sp-board" d="M${n1(x0)} ${n1(y)} q${n1((x1 - x0) / 2)} 7 ${n1(x1 - x0)} -5 q-${n1((x1 - x0) / 2)} 14 -${n1(x1 - x0)} 5 z"/><path class="sp-water" d="M${n1(x0 - 40)} ${n1(y + 12)} q30 -6 60 0 t60 0 t60 0 M${n1(x0 - 48)} ${n1(y + 6)} c-6 -40 26 -66 62 -62"/>`, [[x0 - 48, y + 14], [x1 + 30, y + 14], [x0 - 52, y - 58]]];
      }
      case 'belt': { const a = up(J.H, J.t || 0, 6); return [`<path class="sp-belt" d="M${n1(a[0] - 12)} ${n1(a[1])} h24 M${n1(a[0] - 2)} ${n1(a[1])} l-6 12 M${n1(a[0] - 2)} ${n1(a[1])} l2 13"/>`, []]; }
      case 'amball': return [oval([W[n][0] + 2, W[n][1] - 8], -40) + helmet(J), [[W[n][0] - 10, W[n][1] - 18]]];
      case 'rugbyball': { const c = [(W[0][0] + W[1][0]) / 2 + 6, (W[0][1] + W[1][1]) / 2 - 2]; return [oval(c, -20), [[c[0] + 12, c[1]]]]; }
      case 'chute': {
        const top = J.head[1] - 58, cx = J.head[0], w = 54;
        return [`<path class="sp-chute" d="M${n1(cx - w)} ${n1(top + 30)} q${w} -46 ${w * 2} 0 q-9 -5 -18 0 q-9 -5 -18 0 q-9 -5 -18 0 q-9 -5 -18 0 q-9 -5 -18 0 q-9 -5 -18 0 z"/><path class="sp-lines" d="M${n1(cx - w)} ${n1(top + 30)} L${pt(J.W[0])} M${n1(cx - w / 3)} ${n1(top + 30)} L${pt(J.W[0])} M${n1(cx + w / 3)} ${n1(top + 30)} L${pt(J.W[1])} M${n1(cx + w)} ${n1(top + 30)} L${pt(J.W[1])}"/>`, [[cx - w, top - 12], [cx + w, top + 30]]];
      }
      case 'stick': {
        const a = W[f], b = [W[n][0] + 30, ground - 2], blade = [b[0] + 12, b[1]], puck = [b[0] + 24, ground - 2];
        return [ln(a, b, 3.5) + `<path class="sp-prop" d="M${pt(b)} q4 4 12 0" stroke-width="4"/><rect class="sp-ball" x="${n1(puck[0] - 6)}" y="${n1(puck[1] - 3)}" width="12" height="5" rx="2"/><path class="sp-ground" d="M${n1(J.H[0] - 60)} ${n1(ground + 3)} h140"/>`, [blade, [puck[0] + 8, puck[1]], [J.H[0] - 60, ground + 3]]];
      }
    }
    return ['', []];
  }
  const helmet = J => `<path class="sp-mask" d="M${n1(J.head[0] + 6)} ${n1(J.head[1] + 2)} h8 v6 h-8"/>`;

  /* Figura de un deporte. mus = { músculo: 0..1 } (por defecto, los del deporte). opts.sex 'f' añade coleta.
     Los músculos encendidos se pintan con el Color de Acento (clase sp-on y su opacidad); el resto, con el gris de la lámina. */
  function svg(id, mus, opts = {}) {
    const s = get(id); if (!s) return '';
    const m = mus || levels(id), J = joints(s.pose), seg = [];
    const segs = [
      // lado de atrás (más oscuro), tronco y cabeza, lado de delante
      ...[0].flatMap(i => [['th', J.H, J.K[i], WID.th, lv(m, ['quads', 'hamstrings', 'adductors']), 'far'], ['sh', J.K[i], J.F[i], WID.sh, lv(m, ['calves']), 'far'], ['ua', J.S, J.E[i], WID.ua, lv(m, ['biceps', 'triceps', 'shoulders']), 'far'], ['fa', J.E[i], J.W[i], WID.fa, lv(m, ['forearms']), 'far']]),
      ['tl', J.H, J.M, WID.torso, lv(m, ['abs', 'obliques', 'lowerback']), ''],
      ['tu', J.M, J.S, WID.torso + 1, lv(m, ['chest', 'upperback', 'lats', 'traps']), ''],
      ['gl', J.H, J.H, WID.th + 3, lv(m, ['glutes']), ''],
      ['nk', J.S, J.neck, 8, 0, ''],
      ...[1].flatMap(i => [['th', J.H, J.K[i], WID.th, lv(m, ['quads', 'hamstrings', 'adductors']), ''], ['sh', J.K[i], J.F[i], WID.sh, lv(m, ['calves']), ''], ['ua', J.S, J.E[i], WID.ua, lv(m, ['biceps', 'triceps', 'shoulders']), ''], ['sd', J.S, J.S, WID.ua + 4, lv(m, ['shoulders']), ''], ['fa', J.E[i], J.W[i], WID.fa, lv(m, ['forearms']), '']])
    ];
    const [propSvg, propPts] = propOf(s.prop, { ...J, t: s.pose.t });
    // Encuadre automático
    const pts = [J.head, J.H, J.S, ...J.E, ...J.W, ...J.K, ...J.F, ...propPts];
    let x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0])), y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1]));
    const pad = 16; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
    // Cuadrado, centrado
    const side = Math.max(x1 - x0, y1 - y0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, vb = [cx - side / 2, cy - side / 2, side, side].map(n1);
    const segSvg = segs.map(([k, a, b, w, v, far]) => {
      const d = `M${pt(a)} L${pt(b)}`, base = `<path class="sp-seg ${far ? 'sp-far' : ''}" d="${d}" stroke-width="${w}"/>`;
      return base + (v > 0 ? `<path class="sp-seg sp-on ${far ? 'sp-far' : ''}" d="${d}" stroke-width="${n1(w - 2.5)}" style="opacity:${(.35 + .65 * Math.min(1, v)).toFixed(2)}"/>` : '');
    }).join('');
    const hair = opts.sex === 'f' ? `<path class="sp-hair" d="M${n1(J.head[0] - 6)} ${n1(J.head[1] - 7)} q-14 2 -15 18 q8 -4 11 -10"/>` : '';
    const cardio = lv(m, ['cardio']) > 0 ? `<circle class="sp-heart" cx="${n1((J.S[0] + J.M[0]) / 2)}" cy="${n1((J.S[1] + J.M[1]) / 2)}" r="3.4"/>` : '';
    const behind = s.prop === 'chute' || s.prop === 'bike' || s.prop === 'water' || s.prop === 'surf' ? propSvg : '';
    const front = behind ? '' : propSvg;
    const label = opts.label ? `<title>${String(opts.label).replace(/[<&>]/g, '')}</title>` : '';
    return `<svg class="sp-fig" viewBox="${vb.join(' ')}" role="img" data-sport="${id}">${label}${behind}${hair}${segSvg}<circle class="sp-head" cx="${n1(J.head[0])}" cy="${n1(J.head[1])}" r="${LEN.head}"/>${cardio}${front}</svg>`;
  }

  const api = { SPORTS, EVENTS, METRICS, get, name, eventName, matchWord, mineWord, sorted, muscles, levels, cleanRes, cleanSport, outcome, line, recent, joints, svg };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KGSport = api;
})(typeof window !== 'undefined' ? window : this);
