/* =========================================================
   KeepGoing — app (vanilla JS, sin dependencias)
   Datos: localStorage («keepgoing.v1»). Copias: exportar/importar .json
   ========================================================= */
(() => {
  'use strict';

  const VERSION = '1.3.0';
  const STORE_KEY = 'keepgoing.v1';

  /* ---------- utilidades ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const vibrate = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* sin vibración */ } };

  /* ---------- fechas (claves locales YYYY-MM-DD) ---------- */
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const todayKey = () => keyOf(new Date());
  const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
  const diffDays = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);
  const weekStart = k => { const d = parseKey(k); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return keyOf(d); };
  const monthKey = k => k.slice(0, 7);
  const addMonths = (k, n) => {
    const d = parseKey(k); const day = d.getDate();
    d.setDate(1); d.setMonth(d.getMonth() + n);
    d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
    return keyOf(d);
  };
  const fmtCache = {};
  const fmtDate = (k, opts = { day: 'numeric', month: 'long', year: 'numeric' }) => {
    const id = state.lang + JSON.stringify(opts);
    if (!fmtCache[id]) fmtCache[id] = new Intl.DateTimeFormat(state.lang, opts);
    return fmtCache[id].format(parseKey(k));
  };
  const fmtShort = k => { const [y, m, d] = k.split('-'); return `${d}/${m}/${y}`; };
  const fmtNum = v => new Intl.NumberFormat(state.lang, { maximumFractionDigits: 2 }).format(v);

  /* ---------- colores ---------- */
  const hexToRgb = h => { h = String(h).replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const rgbToHex = a => '#' + a.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((v, i) => v + (B[i] - v) * t)); };
  const rgba = (h, a) => { const [r, g, b] = hexToRgb(h); return `rgba(${r},${g},${b},${a})`; };
  const lum = h => { const [r, g, b] = hexToRgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
  // Tinta de contraste (el «color opuesto» de una casilla)
  const ink = h => { const L = lum(h); return (L + .05) / .05 > 1.05 / (L + .05) ? '#000000' : '#ffffff'; };

  const HABIT_COLORS = ['#3ddc97', '#5b8cff', '#ff8a5b', '#f7c948', '#c77dff', '#ff5d8f', '#2ec4b6', '#a3e635', '#ff6b6b', '#4cc9f0'];
  const EMOJIS = ['#', '🦷', '💧', '📚', '🏃', '🧘', '😴', '🚶', '✍️', '🎯', '💪', '🥗', '🍎', '🚭', '🧹', '💊', '🧠', '🎸', '🎨', '💻', '🗣️', '🙏', '☀️', '🌙', '🚿', '🏋️', '🚴', '🏊', '⚽', '💰', '📈', '📵', '🧴', '❤️', '😊', '🌱', '🐶', '✅', '⭐', '🔥', '⏰', '📝', '🎧', '🍵', '🥛', '🛏️', '🧗', '🎮'];

  const PRESETS = [
    { id: 'noche', es: 'Noche', en: 'Night', bg: '#000000', fg: '#ffffff', accent: '#3ddc97' },
    { id: 'papel', es: 'Papel', en: 'Paper', bg: '#f1f1f4', fg: '#111111', accent: '#2f6bff' },
    { id: 'grafito', es: 'Grafito', en: 'Graphite', bg: '#1b1e24', fg: '#e9eef5', accent: '#7aa2ff' },
    { id: 'menta', es: 'Menta', en: 'Mint', bg: '#dcf3e7', fg: '#0f3a29', accent: '#109e66' },
    { id: 'lavanda', es: 'Lavanda', en: 'Lavender', bg: '#e8e3fb', fg: '#271c52', accent: '#7c5cff' },
    { id: 'arena', es: 'Arena', en: 'Sand', bg: '#f3e8da', fg: '#3a2817', accent: '#dd7326' },
    { id: 'aurora', es: 'Aurora', en: 'Aurora', bg: '#0b1026', bg2: '#3a1c71', fg: '#ffffff', accent: '#4ff0c2', bgMode: 'gradient' },
    { id: 'atardecer', es: 'Atardecer', en: 'Sunset', bg: '#ff7e5f', bg2: '#5b1f66', fg: '#ffffff', accent: '#ffd36e', bgMode: 'gradient' },
    { id: 'oceano', es: 'Océano', en: 'Ocean', bg: '#0f2027', bg2: '#2c5364', fg: '#ffffff', accent: '#56ccf2', bgMode: 'gradient' },
    { id: 'minimal', es: 'Minimal', en: 'Minimal', bg: '#ffffff', fg: '#000000', accent: '#000000', style: 'minimal' },
    // Temas que se desbloquean al subir de nivel
    { id: 'oro', es: 'Oro', en: 'Gold', bg: '#1a1406', bg2: '#3d2c0a', fg: '#fff4d6', accent: '#f5c451', bgMode: 'gradient', lvl: 3 },
    { id: 'neon', es: 'Neón', en: 'Neon', bg: '#07010f', fg: '#f2f2ff', accent: '#ff2bd6', lvl: 6 },
    { id: 'sakura', es: 'Sakura', en: 'Sakura', bg: '#fde8ef', fg: '#4a1830', accent: '#ff6f9c', lvl: 9 },
    { id: 'bosque', es: 'Bosque', en: 'Forest', bg: '#0b2014', bg2: '#1f4d2c', fg: '#eafff0', accent: '#8be78b', bgMode: 'gradient', lvl: 12 },
    { id: 'galaxia', es: 'Galaxia', en: 'Galaxy', bg: '#050314', bg2: '#241147', fg: '#ffffff', accent: '#a78bfa', bgMode: 'gradient', lvl: 16 },
    { id: 'lava', es: 'Lava', en: 'Lava', bg: '#1a0500', bg2: '#5c1300', fg: '#fff1e6', accent: '#ff7a1a', bgMode: 'gradient', lvl: 20 },
    { id: 'hielo', es: 'Hielo', en: 'Ice', bg: '#e8f6ff', fg: '#0b2a3f', accent: '#2bb3ff', lvl: 25 },
    { id: 'trascendente', es: 'Trascendente', en: 'Transcendent', bg: '#f9d9f0', bg2: '#b39ddb', fg: '#2b0f3a', accent: '#d6249f', bgMode: 'gradient', lvl: 30 }
  ];

  /* ---------- Maestrías: rangos y maquetación de las cartas (px del diseño de Canva 1123×1587) ---------- */
  const RANKS = [['iniciado', 7], ['aprendiz', 14], ['discipulo', 21], ['experto', 30], ['elite', 45], ['maestro', 66], ['ascendente', 100], ['supremo', 150], ['mitico', 250], ['trascendente', 365]];
  const CARD_W = 1123, CARD_H = 1587;
  // [top, left, width, height, fontSize, color]
  const CARD_LAYOUT = {
    iniciado: { name: [177, 157, 789, 218, 98, '#ffffff'], level: [419, 472, 160, 39, 33, '#ffffff'], desc: [1244, 425, 253, 33, 29, '#ffffff'], req: [1334, 375, 354, 33, 29, '#ffffff'], date: [1476, 278, 108, 27, 23, '#ffffff'], serial: [1476, 642, 269, 27, 23, '#ffffff'], back: [1323, 469, 166, 49, 41, '#b8d9c7'] },
    aprendiz: { name: [214, 239, 619, 209, 90, '#414c22'], level: [449, 499, 118, 29, 25, '#57663c'], desc: [1232, 463, 189, 29, 25, '#57663c'], req: [1320, 421, 274, 29, 25, '#57663c'], date: [1467, 245, 101, 29, 25, '#57663c'], serial: [1467, 665, 249, 29, 25, '#57663c'], back: [1341, 459, 194, 58, 49, '#7f8b67'] },
    discipulo: { name: [149, 235, 634, 203, 91, '#f0e3c5'], level: [379, 484, 149, 44, 38, '#f0e3c5'], desc: [1179, 400, 303, 44, 38, '#ffffff'], req: [1295, 340, 423, 44, 38, '#ffffff'], date: [1483, 178, 252, 30, 26, '#ffffff'], serial: [1483, 561, 367, 30, 26, '#ffffff'], back: [1344, 445, 214, 68, 57, '#d3b886'] },
    experto: { name: [161, 193, 717, 195, 86, '#ffffff'], level: [384, 492, 119, 36, 30, '#ffffff'], desc: [1258, 428, 247, 36, 30, '#ffffff'], req: [1348, 374, 355, 36, 30, '#ffffff'], date: [1481, 180, 103, 27, 23, '#ffffff'], serial: [1481, 709, 253, 27, 23, '#ffffff'], back: [1297, 468, 167, 41, 35, '#ffffff'] },
    elite: { name: [159, 196, 767, 221, 100, '#ffffff'], level: [400, 465, 172, 42, 36, '#ffffff'], desc: [1195, 424, 256, 38, 33, '#ffffff'], req: [1318, 374, 355, 38, 33, '#ffffff'], date: [1476, 240, 105, 29, 25, '#ffffff'], serial: [1476, 679, 257, 29, 25, '#ffffff'], back: [1353, 454, 195, 57, 48, '#ffffff'] },
    maestro: { name: [154, 204, 696, 229, 103, '#f4c7ab'], level: [442, 488, 128, 41, 35, '#ffffff'], desc: [1200, 414, 275, 41, 35, '#ffffff'], req: [1314, 360, 383, 41, 35, '#ffffff'], date: [1501, 112, 324, 28, 24, '#ffffff'], serial: [1501, 638, 324, 28, 24, '#ffffff'], back: [1346, 454, 205, 58, 49, '#f0c3a0'] },
    ascendente: { name: [168, 156, 792, 252, 110, '#f0c84e'], level: [430, 487, 141, 41, 35, '#f0c84e'], desc: [1241, 414, 276, 41, 35, '#f0c84e'], req: [1332, 355, 394, 41, 35, '#f0c84e'], date: [1451, 294, 114, 32, 27, '#f0c84e'], serial: [1452, 635, 270, 51, 26, '#f0c84e'], back: [1262, 458, 196, 52, 44, '#f0b047'] },
    supremo: { name: [159, 221, 661, 201, 89, '#e8a985'], level: [379, 476, 152, 49, 42, '#ffffff'], desc: [1204, 429, 246, 37, 32, '#ffffff'], req: [1297, 378, 347, 37, 32, '#ffffff'], date: [1490, 292, 107, 31, 26, '#ffffff'], serial: [1490, 599, 269, 31, 26, '#ffffff'], back: [1304, 434, 235, 45, 38, '#c68276'] },
    mitico: { name: [126, 212, 680, 230, 101, '#ffffff'], level: [393, 474, 155, 44, 38, '#ffffff'], desc: [1253, 441, 221, 36, 30, '#ffffff'], req: [1311, 394, 315, 36, 30, '#ffffff'], date: [1488, 184, 240, 31, 26, '#ffffff'], serial: [1488, 605, 332, 31, 26, '#ffffff'], back: [1334, 464, 175, 58, 49, '#ffffff'] },
    trascendente: { name: [135, 201, 701, 217, 97, '#422060'], level: [379, 490, 123, 38, 33, '#ffffff'], desc: [1279, 436, 232, 35, 30, '#422060'], req: [1367, 383, 337, 35, 30, '#422060'], date: [1502, 184, 89, 24, 21, '#422060'], serial: [1502, 754, 219, 24, 21, '#422060'], back: [1381, 458, 187, 45, 38, '#ffffff'] }
  };

  /* ---------- iconos (SVG en línea) ---------- */
  const ICONS = {
    checklist: '<path d="M11 6h10M11 12h10M11 18h10"/><path d="M3 6l1.6 1.6L7.5 4.8M3 12l1.6 1.6 2.9-2.8M3 18l1.6 1.6 2.9-2.8"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    chart: '<path d="M3 21h18"/><rect x="5" y="11" width="3" height="7" rx="1"/><rect x="10.5" y="5" width="3" height="13" rx="1"/><rect x="16" y="14" width="3" height="4" rx="1"/>',
    crown: '<path d="M5 17.5h14l1.6-10.5-4.6 3.6L12 4.5l-4 6.1L3.4 7 5 17.5z"/><path d="M5 21h14"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
    flame: '<path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8 0 4 3 7 7 7z"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M5 21h14"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.5-.9 1.2-1.7-.4-1 .2-2.3 1.4-2.3H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10z"/><circle cx="7.5" cy="11" r="1.1"/><circle cx="10" cy="7" r="1.1"/><circle cx="15" cy="7.5" r="1.1"/>',
    doc: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 17c1.5-2 3-2 4 0s2.5 1 4-1"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/>',
    up: '<path d="M6 15l6-6 6 6"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>',
    left: '<path d="M15 6l-6 6 6 6"/>',
    right: '<path d="M9 6l6 6-6 6"/>',
    play: '<path d="M7 5l12 7-12 7z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
    gift: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M12 8c-2-4-6-4-6-1.5S10 8 12 8zm0 0c2-4 6-4 6-1.5S14 8 12 8z"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>'
  };
  const ico = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

  /* ---------- estado ---------- */
  const DEFAULT_THEME = { preset: 'noche', bg: '#000000', fg: '#ffffff', accent: '#3ddc97', style: 'clay', bgMode: 'solid', bg2: '#1b1b2f' };
  function defaultState() {
    const lang = (navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
    return {
      v: 1, onboarded: false, obStep: 0, lang,
      theme: { ...DEFAULT_THEME },
      contract: null,
      habits: [], logs: {}, projects: [], rest: {},
      mastery: {}, serial: 0, colorSeq: 0, contractCards: [],
      // Fase 1: rutinas, recompensas, vacaciones, escudos, energía, revisiones, avisos, retos, cartas secretas
      routines: [], rewards: [], redemptions: [], vacations: [],
      shields: {}, ltime: {}, energy: {}, reviews: {}, prompts: {}, secrets: {}, challengeCards: [],
      routineRuns: {}, stats: { timerMin: 0 },
      commitment: 'serio', commitHistory: [{ from: '0000-00-00', level: 'serio' }],
      ui: { tab: 'habits', range: 30, chartHabit: 'all', showArchived: false, habitsView: 'all' }
    };
  }
  // Listas por id y mapas que se fusionan entre dispositivos (ver stampChanges / mergeStates)
  const SYNC_LISTS = ['habits', 'projects', 'routines', 'rewards', 'redemptions', 'vacations'];
  const SYNC_DAYMAPS = [['logs', 'lmt'], ['rest', 'rmt'], ['shields', 'shmt'], ['ltime', 'tmt']]; // hábito → día → valor
  const SYNC_KEYMAPS = [['energy', 'emt'], ['reviews', 'rvmt'], ['prompts', 'pmt']];             // clave → valor
  function normalize(s) {
    const d = defaultState();
    const out = { ...d, ...s };
    out.theme = { ...d.theme, ...(s.theme || {}) };
    out.ui = { ...d.ui, ...(s.ui || {}) };
    out.habits = Array.isArray(s.habits) ? s.habits : [];
    out.logs = s.logs && typeof s.logs === 'object' ? s.logs : {};
    out.projects = Array.isArray(s.projects) ? s.projects : [];
    out.mastery = s.mastery && typeof s.mastery === 'object' ? s.mastery : {};
    out.rest = s.rest && typeof s.rest === 'object' ? s.rest : {};
    out.contractCards = Array.isArray(s.contractCards) ? s.contractCards : [];
    for (const k of ['deleted', 'lmt', 'rmt', 'shmt', 'tmt', 'emt', 'rvmt', 'pmt', 'shields', 'ltime', 'energy', 'reviews', 'prompts', 'secrets', 'routineRuns'])
      out[k] = s[k] && typeof s[k] === 'object' && !Array.isArray(s[k]) ? s[k] : {};
    for (const k of ['routines', 'rewards', 'redemptions', 'vacations', 'challengeCards']) out[k] = Array.isArray(s[k]) ? s[k] : [];
    out.stats = { timerMin: 0, ...(s.stats || {}) };
    if (!Array.isArray(out.commitHistory) || !out.commitHistory.length) out.commitHistory = [{ from: '0000-00-00', level: out.commitment || 'serio' }];
    out.projects.forEach(p => { p.milestones = p.milestones || []; p.photos = p.photos || {}; });
    out.projects.forEach(p => { p.goal = { type: 'simple', start: 0, target: 0, unit: '', entries: [], items: [], achieved: false, ...(p.goal || {}) }; p.habitIds = p.habitIds || []; });
    return out;
  }
  function load() {
    try { const raw = localStorage.getItem(STORE_KEY); if (raw) return normalize(JSON.parse(raw)); } catch (e) { /* almacenamiento no disponible */ }
    return defaultState();
  }
  let state = load();
  let lastSaved = JSON.stringify(state);
  // Guarda en el dispositivo; marca con hora lo que ha cambiado (para fusionar entre dispositivos) y programa la sincronización
  function save() {
    try { stampChanges(JSON.parse(lastSaved), state); } catch (e) { /* primera vez */ }
    lastSaved = JSON.stringify(state); calcVer++;
    try { localStorage.setItem(STORE_KEY, lastSaved); } catch (e) { /* modo privado */ }
    scheduleSync();
  }
  // Guarda sin marcar cambios (cuando el estado viene de la nube)
  function saveSilently() {
    lastSaved = JSON.stringify(state); calcVer++;
    try { localStorage.setItem(STORE_KEY, lastSaved); } catch (e) { /* modo privado */ }
  }

  /* ---------- marcas de tiempo para fusionar ---------- */
  const strip = o => { if (!o) return ''; const { mt, ...rest } = o; return JSON.stringify(rest); };
  const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  const settingsOf = s => [s.theme, s.lang, s.commitment, s.commitHistory];
  function stampChanges(prev, cur) {
    const now = Date.now();
    cur.deleted = cur.deleted || {};
    for (const key of SYNC_LISTS) {
      const pm = new Map((prev[key] || []).map(x => [x.id, x]));
      (cur[key] || []).forEach(x => { if (strip(x) !== strip(pm.get(x.id))) x.mt = now; });
      (prev[key] || []).forEach(x => { if (!(cur[key] || []).some(y => y.id === x.id)) cur.deleted[x.id] = now; });
    }
    if ((prev.habits || []).map(h => h.id).join() !== cur.habits.map(h => h.id).join()) cur.orderMt = now;
    for (const [lk, mk] of SYNC_DAYMAPS) {
      const P = prev[lk] || {}, C = cur[lk] || {}; cur[mk] = cur[mk] || {};
      for (const hid of new Set([...Object.keys(P), ...Object.keys(C)])) {
        const p = P[hid] || {}, c = C[hid] || {};
        for (const k of new Set([...Object.keys(p), ...Object.keys(c)])) {
          if (!same(p[k], c[k])) (cur[mk][hid] || (cur[mk][hid] = {}))[k] = now;
        }
      }
    }
    for (const [lk, mk] of SYNC_KEYMAPS) {
      const P = prev[lk] || {}, C = cur[lk] || {}; cur[mk] = cur[mk] || {};
      for (const k of new Set([...Object.keys(P), ...Object.keys(C)])) if (!same(P[k], C[k])) cur[mk][k] = now;
    }
    if (strip(prev.contract) !== strip(cur.contract) && cur.contract) cur.contract.mt = now;
    if (!same(settingsOf(prev), settingsOf(cur))) cur.smt = now;
  }
  // Fusión de dos estados: gana lo modificado más tarde; las cartas y contratos se suman
  function mergeStates(L, R) {
    // Se parte de R+L para conservar campos que esta versión aún no conoce (compatibilidad entre versiones)
    const out = JSON.parse(JSON.stringify({ ...R, ...L }));
    const del = { ...(L.deleted || {}) };
    for (const [id, ts] of Object.entries(R.deleted || {})) del[id] = Math.max(del[id] || 0, ts);
    out.deleted = del;
    const alive = x => !(del[x.id] && del[x.id] >= (x.mt || 0));
    const mergeList = (a, b) => {
      const m = new Map();
      [...a, ...b].forEach(x => { const c = m.get(x.id); if (!c || (x.mt || 0) > (c.mt || 0)) m.set(x.id, x); });
      return [...m.values()].filter(alive);
    };
    const habits = mergeList(L.habits || [], R.habits || []);
    const base = (R.orderMt || 0) > (L.orderMt || 0) ? R.habits : L.habits;
    const idx = id => { const i = (base || []).findIndex(h => h.id === id); return i < 0 ? 1e9 : i; };
    out.habits = habits.sort((a, b) => idx(a.id) - idx(b.id));
    out.orderMt = Math.max(L.orderMt || 0, R.orderMt || 0);
    for (const key of SYNC_LISTS) if (key !== 'habits') out[key] = mergeList(L[key] || [], R[key] || []);
    // Elige el valor de la marca más reciente; con empate (datos antiguos sin marca) se queda con el mayor
    const pick = (vl, vr, a, b) => b > a ? vr : a > b ? vl : (typeof vl === 'number' || typeof vr === 'number') ? Math.max(+vl || 0, +vr || 0) : (vl ?? vr);
    const hids = new Set(out.habits.map(h => h.id));
    for (const [lk, mk] of SYNC_DAYMAPS) {
      out[lk] = {}; out[mk] = {};
      for (const hid of hids) {
        const vl = (L[lk] || {})[hid] || {}, vr = (R[lk] || {})[hid] || {}, tl = (L[mk] || {})[hid] || {}, tr = (R[mk] || {})[hid] || {};
        const V = {}, M = {};
        for (const k of new Set([...Object.keys(vl), ...Object.keys(vr), ...Object.keys(tl), ...Object.keys(tr)])) {
          const a = tl[k] || 0, b = tr[k] || 0, v = pick(vl[k], vr[k], a, b);
          if (v) V[k] = v;
          if (a || b) M[k] = Math.max(a, b);
        }
        out[lk][hid] = V; out[mk][hid] = M;
      }
    }
    for (const [lk, mk] of SYNC_KEYMAPS) {
      const vl = L[lk] || {}, vr = R[lk] || {}, tl = L[mk] || {}, tr = R[mk] || {};
      out[lk] = {}; out[mk] = {};
      for (const k of new Set([...Object.keys(vl), ...Object.keys(vr), ...Object.keys(tl), ...Object.keys(tr)])) {
        const a = tl[k] || 0, b = tr[k] || 0, v = pick(vl[k], vr[k], a, b);
        if (v !== undefined && v !== null && v !== 0) out[lk][k] = v;
        if (a || b) out[mk][k] = Math.max(a, b);
      }
    }
    if (!L.contract || (R.contract && (R.contract.mt || 0) > (L.contract.mt || 0))) out.contract = R.contract || null;
    if ((R.smt || 0) > (L.smt || 0)) { [out.theme, out.lang, out.commitment, out.commitHistory] = settingsOf(R); out.smt = R.smt; }
    // Uniones: cartas secretas (fecha más antigua), retos superados, rutinas completadas y minutos de temporizador
    out.secrets = { ...(R.secrets || {}), ...(L.secrets || {}) };
    for (const [id, d] of Object.entries(R.secrets || {})) if (out.secrets[id] > d) out.secrets[id] = d;
    const ch = new Map((L.challengeCards || []).map(c => [c.id, c])); (R.challengeCards || []).forEach(c => { if (!ch.has(c.id)) ch.set(c.id, c); });
    out.challengeCards = [...ch.values()];
    out.routineRuns = { ...(L.routineRuns || {}) };
    for (const [id, n] of Object.entries(R.routineRuns || {})) out.routineRuns[id] = Math.max(out.routineRuns[id] || 0, n);
    out.stats = { ...(L.stats || {}), timerMin: Math.max((L.stats || {}).timerMin || 0, (R.stats || {}).timerMin || 0) };
    out.mastery = JSON.parse(JSON.stringify(L.mastery || {}));
    for (const [hid, ranks] of Object.entries(R.mastery || {})) {
      const m = out.mastery[hid] || (out.mastery[hid] = {});
      for (const [r, v] of Object.entries(ranks)) if (!m[r] || v.date < m[r].date) m[r] = v;
    }
    const cc = new Map((L.contractCards || []).map(c => [c.id, c])); (R.contractCards || []).forEach(c => { if (!cc.has(c.id)) cc.set(c.id, c); });
    out.contractCards = [...cc.values()].sort((a, b) => a.end < b.end ? -1 : 1);
    out.serial = Math.max(L.serial || 0, R.serial || 0);
    out.colorSeq = Math.max(L.colorSeq || 0, R.colorSeq || 0);
    out.onboarded = !!(L.onboarded || R.onboarded);
    out.ui = L.ui;
    return out;
  }

  const t = (key, p = {}) => {
    const dict = window.I18N[state.lang] || window.I18N.es;
    const s = dict[key] ?? window.I18N.es[key] ?? key;
    return s.replace(/\{(\w+)\}/g, (_, k) => p[k] ?? '');
  };

  /* ---------- tema ---------- */
  const T = { light: false, surfaceHex: '#1c1c1e' };
  function applyTheme() {
    const th = state.theme;
    const grad = th.bgMode === 'gradient';
    const base = grad ? mix(th.bg, th.bg2, .5) : th.bg;
    const light = lum(base) > .4;
    T.light = light;
    let surface, s2, s3;
    if (grad) {
      T.surfaceHex = mix(base, th.fg, light ? .05 : .12);
      surface = light ? 'rgba(255,255,255,.55)' : rgba(th.fg, .1);
      s2 = light ? rgba(th.fg, .07) : rgba(th.fg, .12);
      s3 = light ? rgba(th.fg, .13) : rgba(th.fg, .2);
    } else if (light) {
      T.surfaceHex = mix(th.bg, '#ffffff', .65);
      surface = T.surfaceHex; s2 = mix(th.bg, th.fg, .06); s3 = mix(th.bg, th.fg, .13);
    } else {
      T.surfaceHex = mix(th.bg, th.fg, .11);
      surface = T.surfaceHex; s2 = mix(th.bg, th.fg, .17); s3 = mix(th.bg, th.fg, .25);
    }
    const r = document.documentElement;
    const css = {
      '--bg': th.bg, '--fg': th.fg, '--accent': th.accent, '--accent-ink': ink(th.accent),
      '--app-bg': grad ? `linear-gradient(160deg, ${th.bg}, ${th.bg2})` : th.bg,
      '--surface': surface, '--surface-2': s2, '--surface-3': s3, '--surface-solid': mix(base, th.fg, light ? .04 : .12),
      '--muted': mix(th.fg, base, .45), '--line': rgba(th.fg, .1),
      '--glass': grad ? 'blur(18px) saturate(1.3)' : 'none',
      '--sh-out': light ? '0 14px 28px rgba(20,20,45,.13), 0 3px 6px rgba(20,20,45,.07)' : '0 14px 30px rgba(0,0,0,.55), 0 2px 4px rgba(0,0,0,.3)',
      '--sh-in': light ? 'inset 0 3px 2px rgba(255,255,255,.85), inset 0 -8px 16px rgba(20,20,45,.08)' : 'inset 0 2px 1px rgba(255,255,255,.07), inset 0 -8px 16px rgba(0,0,0,.35)',
      '--sh-press': light ? 'inset 0 4px 10px rgba(20,20,45,.16)' : 'inset 0 4px 12px rgba(0,0,0,.5)'
    };
    for (const k in css) r.style.setProperty(k, css[k]);
    r.dataset.light = light ? '1' : '0';
    r.dataset.style = th.style;
    r.dataset.gradient = grad ? '1' : '0';
    const meta = $('meta[name="theme-color"]'); if (meta) meta.content = th.bg;
  }

  /* ---------- hábitos: cálculos ---------- */
  const getHabit = id => state.habits.find(h => h.id === id);
  const hColor = h => h.color || h.autoColor || HABIT_COLORS[0];
  const cnt = (h, k) => (state.logs[h.id] || {})[k] || 0;
  const isMulti = h => h.measure !== 'amount' && (!!h.multi || (h.freq === 'daily' && h.target > 1));
  const dayGoal = h => h.freq === 'daily' ? h.target : 1;
  function firstKey(h) {
    let f = h.createdAt; const L = state.logs[h.id] || {};
    for (const k in L) if (L[k] > 0 && k < f) f = k;
    return f;
  }
  const periodStart = (h, k) => h.freq === 'weekly' ? weekStart(k) : h.freq === 'monthly' ? monthKey(k) + '-01' : k;
  const nextPeriod = (h, k) => h.freq === 'weekly' ? addDays(k, 7) : h.freq === 'monthly' ? addMonths(k, 1) : addDays(k, 1);
  const prevPeriod = (h, k) => { k = periodStart(h, k); return h.freq === 'weekly' ? addDays(k, -7) : h.freq === 'monthly' ? addMonths(k, -1) : addDays(k, -1); };
  function periodSum(h, k) {
    if (h.freq === 'daily') return cnt(h, k);
    const L = state.logs[h.id] || {}; let s = 0;
    if (h.freq === 'weekly') { const ws = weekStart(k); for (let i = 0; i < 7; i++) s += L[addDays(ws, i)] || 0; }
    else { const mk = monthKey(k); for (const d in L) if (d.startsWith(mk)) s += L[d]; }
    return s;
  }
  // Hábitos a dejar («quit»): cada día sin registro es un día limpio; un registro es una recaída
  const isQuit = h => h.kind === 'quit';
  const wdOf = k => (parseKey(k).getDay() + 6) % 7; // 0 = lunes
  const isRest = (h, k) => !!(state.rest[h.id] && state.rest[h.id][k]);
  const isShielded = (h, k) => !!(state.shields[h.id] && state.shields[h.id][k]);
  const inVacation = k => state.vacations.some(v => k >= v.from && k <= v.to);
  const isScheduled = (h, k) => h.freq !== 'daily' || isQuit(h) || !Array.isArray(h.days) || h.days.length >= 7 || h.days.includes(wdOf(k));
  // Días que no cuentan como fallo: no programados, de descanso, con escudo o de vacaciones (los hábitos a dejar no se pausan)
  const isOffDay = (h, k) => !isScheduled(h, k) || isRest(h, k) || isShielded(h, k) || (!isQuit(h) && inVacation(k));
  const isAmount = h => h.measure === 'amount';
  const periodDone = (h, k) => isQuit(h) ? cnt(h, k) === 0 : periodSum(h, k) >= h.target;
  function periodsBetween(h, from, to) {
    const out = []; let k = periodStart(h, from); const end = periodStart(h, to);
    while (k <= end && out.length < 20000) { out.push(k); k = nextPeriod(h, k); }
    return out;
  }
  // 'done' cumplido · 'off' no cuenta (día libre o de descanso) · 'miss' fallado
  function periodState(h, p) {
    if (periodDone(h, p)) return 'done';
    if (isQuit(h)) return 'miss';
    if (h.freq === 'daily') return isOffDay(h, p) ? 'off' : 'miss';
    if (isShielded(h, p)) return 'off';
    const end = nextPeriod(h, p);
    for (let d = p; d < end; d = addDays(d, 1)) if (isRest(h, d) || inVacation(d)) return 'off';
    return 'miss';
  }
  function currentStreak(h) {
    const today = todayKey(), fk = periodStart(h, firstKey(h));
    let k = periodStart(h, today), n = 0, guard = 0;
    if (isQuit(h)) { if (cnt(h, today) > 0) return 0; k = addDays(today, -1); }
    else if (periodState(h, k) !== 'done') k = prevPeriod(h, k); // el período actual sigue abierto
    while (k >= fk && guard++ < 40000) {
      const s = periodState(h, k);
      if (s === 'done') n++; else if (s === 'miss') break;
      k = prevPeriod(h, k);
    }
    return n;
  }
  function bestStreak(h) {
    let best = 0, cur = 0; const today = todayKey();
    for (const p of periodsBetween(h, firstKey(h), today)) {
      if (isQuit(h) && p === today && cnt(h, p) === 0) continue;
      const s = periodState(h, p);
      if (s === 'done') { cur++; if (cur > best) best = cur; } else if (s === 'miss') cur = 0;
    }
    return best;
  }
  // Días cumplidos (para las Maestrías). En hábitos a dejar: días limpios hasta ayer
  function successDays(h) {
    if (isQuit(h)) { const end = addDays(todayKey(), -1); let n = 0; for (let k = firstKey(h); k <= end; k = addDays(k, 1)) if (!cnt(h, k)) n++; return n; }
    const L = state.logs[h.id] || {}; const g = dayGoal(h); let n = 0; for (const k in L) if (L[k] >= g) n++; return n;
  }
  function totalEntries(h, from, to) { if (isQuit(h)) return 0; const L = state.logs[h.id] || {}; let s = 0; for (const k in L) if ((!from || k >= from) && (!to || k <= to)) s += L[k]; return s; }
  // Puntuación de un día (0..1) o null si ese día no cuenta — para gráficos
  function dayScore(h, k) {
    if (k < firstKey(h) || k > todayKey()) return null;
    if (isQuit(h)) return k === todayKey() && !cnt(h, k) ? null : (cnt(h, k) ? 0 : 1);
    if (isOffDay(h, k) && !cnt(h, k)) return null;
    return Math.min(1, cnt(h, k) / dayGoal(h));
  }
  // % de períodos cumplidos en los últimos n días (null si aún no hay períodos que evaluar)
  function rate(h, n, end = todayKey()) {
    let from = addDays(end, -(n - 1)); const fk = firstKey(h); if (from < fk) from = fk;
    if (from > end) return null;
    const cur = periodStart(h, end); let done = 0, total = 0;
    for (const p of periodsBetween(h, from, end)) {
      const s = periodState(h, p);
      if (p === cur && (s !== 'done' || (isQuit(h) && p === todayKey()))) continue;
      if (s === 'off') continue;
      total++; if (s === 'done') done++;
    }
    return total ? done / total : null;
  }
  const unitLabel = h => h.freq === 'daily' ? t('periodDay') : h.freq === 'weekly' ? t('periodWeek') : t('periodMonth');

  function setCount(h, k, v) {
    const L = state.logs[h.id] || (state.logs[h.id] = {});
    const before = L[k] || 0;
    v = Math.max(0, isAmount(h) ? Math.round(v * 100) / 100 : Math.floor(v));
    if (v) L[k] = v; else delete L[k];
    // Hora del registro (para «a qué hora sueles hacerlo» y las cartas secretas)
    if (v > before && k === todayKey()) { const d = new Date(); (state.ltime[h.id] || (state.ltime[h.id] = {}))[k] = `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
    save();
    checkMastery(h);
    checkChallenge(h);
    checkSecrets();
  }
  function tapDay(h, k) {
    if (k > todayKey()) return;
    if (isAmount(h)) { openAmount(h, k); return; }
    const c = cnt(h, k);
    setCount(h, k, isMulti(h) ? c + 1 : (c ? 0 : 1));
    vibrate(8);
  }

  /* ---------- escudos de racha: 1 por cada 14 períodos cumplidos seguidos (máx. 3 guardados) ---------- */
  function shieldInfo(h) {
    if (isQuit(h)) return { earned: 0, used: 0, available: 0 };
    let run = 0, earned = 0; const cur = periodStart(h, todayKey());
    for (const p of periodsBetween(h, firstKey(h), todayKey())) {
      const s = periodState(h, p);
      if (p === cur && s !== 'done') continue;
      if (s === 'done') { run++; if (run % 14 === 0) earned++; } else if (s === 'miss') run = 0;
    }
    const used = Object.keys(state.shields[h.id] || {}).length;
    return { earned, used, available: clamp(earned - used, 0, 3) };
  }
  function useShield(h, k) {
    (state.shields[h.id] || (state.shields[h.id] = {}))[periodStart(h, k)] = true;
    save(); vibrate([10, 30, 10]); toast(t('shieldUsed'));
  }

  /* ---------- puntos, nivel y compromiso ---------- */
  // Chill: sin penalización · Serio: bonus medio y pequeña penalización · Locked-In: más puntos, más bonus y más penalización
  const COMMIT = { chill: { mult: 1, bonus: 20, miss: 0 }, serio: { mult: 1, bonus: 50, miss: -5 }, locked: { mult: 1.5, bonus: 100, miss: -15 } };
  const commitOn = k => { let lv = 'serio'; for (const c of state.commitHistory) if (c.from <= k) lv = c.level; return COMMIT[lv] ? lv : 'serio'; };
  let calcVer = 0; const memo = new Map();
  const cached = (key, fn) => { const k = calcVer + '|' + todayKey() + '|' + key; if (!memo.has(k)) { if (memo.size > 6000) memo.clear(); memo.set(k, fn()); } return memo.get(k); };
  // Puntos de un día y si fue «día perfecto» (todos los hábitos diarios hechos y ninguna recaída)
  function dayInfo(k) {
    return cached('day' + k, () => {
      const today = todayKey(), lv = COMMIT[commitOn(k)];
      let base = 0, due = 0, done = 0, slip = false, quitClean = 0;
      for (const h of state.habits) {
        if (k < firstKey(h) || (h.archived && !cnt(h, k))) continue;
        if (isQuit(h)) { if (cnt(h, k)) slip = true; else if (k < today) { quitClean++; base += 5; } continue; }
        if (h.freq !== 'daily') { if (cnt(h, k) > 0) base += 10; continue; }
        if (isOffDay(h, k) && !cnt(h, k)) continue;
        due++;
        const sc = Math.min(1, cnt(h, k) / dayGoal(h));
        if (sc >= 1) { done++; base += 10; } else base += Math.round(10 * sc);
      }
      const perfect = !slip && (due > 0 ? done === due : quitClean > 0);
      let pts = Math.round(base * lv.mult) + (perfect ? lv.bonus : 0);
      if (k < today) pts += (due - done) * lv.miss;
      return { pts, perfect, due, done, slip };
    });
  }
  function firstDay() { return cached('first', () => state.habits.reduce((m, h) => { const f = firstKey(h); return f < m ? f : m; }, todayKey())); }
  function eachDay(fn) { const today = todayKey(); for (let k = firstDay(); k <= today; k = addDays(k, 1)) fn(k); }
  function pointsInfo() {
    return cached('points', () => {
      let xp = 0, net = 0, perfectDays = 0, perfectRun = 0, bestPerfectRun = 0;
      eachDay(k => { const d = dayInfo(k); xp += Math.max(0, d.pts); net += d.pts; if (d.perfect) { perfectDays++; perfectRun++; bestPerfectRun = Math.max(bestPerfectRun, perfectRun); } else if (k < todayKey()) perfectRun = 0; });
      const spent = state.redemptions.reduce((a, r) => a + (r.cost || 0), 0);
      return { xp, balance: net - spent, spent, perfectDays, bestPerfectRun };
    });
  }
  // Nivel L necesita 50·L·(L+1) XP acumulados
  const xpFor = L => 50 * L * (L + 1);
  function levelInfo() {
    const { xp } = pointsInfo(); let L = 0;
    while (xp >= xpFor(L + 1)) L++;
    const from = xpFor(L), to = xpFor(L + 1);
    return { level: L, xp, from, to, pct: (xp - from) / (to - from) * 100, title: levelTitle(L) };
  }
  const LEVEL_TITLES = [[0, 'lvNovato'], [3, 'lvConstante'], [5, 'lvDisciplinado'], [8, 'lvEnfocado'], [12, 'lvImparable'], [16, 'lvInquebrantable'], [20, 'lvLeyenda'], [30, 'lvMito']];
  const levelTitle = L => t(LEVEL_TITLES.filter(([n]) => L >= n).pop()[1]);

  /* ---------- Maestrías ---------- */
  function checkMastery(h, silent = false) {
    const n = successDays(h);
    const m = state.mastery[h.id] || (state.mastery[h.id] = {});
    let fresh = -1;
    RANKS.forEach(([r, th], i) => { if (n >= th && !m[r]) { m[r] = { date: todayKey(), serial: ++state.serial }; fresh = i; } });
    if (fresh >= 0) { save(); if (!silent) setTimeout(() => showUnlock(h, fresh), 380); }
  }
  const unlockedCount = h => { const n = successDays(h); return RANKS.filter(([, th]) => n >= th).length; };

  /* =========================================================
     RENDER
     ========================================================= */
  let minWeeks = 20;

  function render() {
    applyTheme();
    document.documentElement.lang = state.lang;
    hideTip();
    const app = $('#app');
    if (!state.onboarded) { app.innerHTML = renderOnboarding(); mountOnboarding(); return; }
    const cc = awardContract();
    app.innerHTML = `<div class="app">${renderNav()}<main class="main" id="main">${renderView()}</main></div>`;
    afterRender();
    if (cc) setTimeout(() => whenFree(() => openContractCard(cc, true)), 400);
  }

  function renderNav() {
    const tabs = [['habits', 'checklist', t('tabHabits')], ['projects', 'target', t('tabProjects')], ['charts', 'chart', t('tabChartsShort')], ['mastery', 'crown', t('tabMastery')]];
    return `<nav class="nav" aria-label="KeepGoing">${tabs.map(([id, ic, label]) =>
      `<button data-act="go" data-tab="${id}" class="${state.ui.tab === id ? 'on' : ''}" ${state.ui.tab === id ? 'aria-current="page"' : ''} title="${esc(id === 'charts' ? t('tabCharts') : label)}">${ico(ic)}<span>${esc(label)}</span></button>`).join('')}</nav>`;
  }

  function renderView() {
    switch (state.ui.tab) {
      case 'projects': return viewProjects();
      case 'charts': return viewCharts();
      case 'mastery': return viewMastery();
      default: return viewHabits();
    }
  }

  function topBar(actions = '') {
    return `<div class="top-bar"><div class="row" style="gap:10px;min-width:0"><button class="icon-btn" data-act="settings" aria-label="${esc(t('settings'))}" title="${esc(t('settings'))}">${ico('gear')}</button>${state.habits.length ? levelPill() : ''}</div>${actions ? `<div class="pill-group">${actions}</div>` : ''}</div>`;
  }
  const emptyState = (icon, title, sub, action = '') =>
    `<div class="empty"><div class="empty-art">${ico(icon)}</div><h2>${esc(title)}</h2><p>${esc(sub)}</p>${action}</div>`;

  function afterRender() {
    if (state.ui.tab === 'habits') fitGrids();
    if (state.ui.tab === 'projects') loadPhotos($('#main'));
  }

  /* ---------- HÁBITOS ---------- */
  function contractBanner() {
    const c = state.contract;
    if (!c) return `<div class="banner clay"><div class="banner-ico">${ico('doc')}</div><span class="grow">${esc(t('contractNone'))}</span><button class="chip" data-act="contract">${esc(t('contractSignNow'))}</button></div>`;
    const left = diffDays(todayKey(), c.endsAt);
    if (left < 0) return `<div class="banner clay"><div class="banner-ico">${ico('doc')}</div><span class="grow"><b>${esc(t('contractEnded'))}</b></span><button class="chip on" data-act="contract-renew">${esc(t('contractRenew'))}</button></div>`;
    const total = Math.max(1, diffDays(c.signedAt, c.endsAt));
    const pct = clamp((total - left) / total * 100, 0, 100);
    return `<button class="banner clay" data-act="contract" style="width:100%;border:0;text-align:left;color:inherit"><div class="banner-ico">${ico('doc')}</div><span class="grow"><b>${esc(left === 1 ? t('contractActive1') : t('contractActive', { n: left }))}</b><span class="bar" style="display:block;height:6px;margin-top:6px;max-width:260px"><i style="width:${pct}%"></i></span></span>${ico('right')}</button>`;
  }

  function viewHabits() {
    const active = state.habits.filter(h => !h.archived), arch = state.habits.filter(h => h.archived);
    let html = topBar(`<button class="icon-btn" data-act="go" data-tab="charts" aria-label="${esc(t('tabCharts'))}">${ico('chart')}</button><button class="icon-btn" data-act="create" aria-label="${esc(t('addHabit'))}">${ico('plus')}</button>`);
    html += `<h1 class="page-title">${esc(t('tabHabits'))}</h1>`;
    html += contractBanner();
    if (!active.length && !arch.length) {
      return html + emptyState('checklist', t('habitsEmptyTitle'), t('habitsEmptySub'), `<div class="row wrap" style="justify-content:center"><button class="btn primary" data-act="habit-new">${ico('plus')} ${esc(t('addHabit'))}</button><button class="btn" data-act="packs">📦 ${esc(t('fromTemplate'))}</button></div>`);
    }
    const view = state.ui.habitsView === 'today' ? 'today' : 'all';
    html += `<div class="seg view-seg" style="margin-bottom:16px"><button data-act="hview" data-v="today" class="${view === 'today' ? 'on' : ''}">☀️ ${esc(t('viewToday'))}</button><button data-act="hview" data-v="all" class="${view === 'all' ? 'on' : ''}">${ico('checklist')} ${esc(t('viewAll'))}</button></div>`;
    if (view === 'today') return html + viewToday(active);
    if (activeVacation()) html += `<div class="banner clay">🏖️<span class="grow"><b>${esc(t('vacActive', { date: fmtDate(activeVacation().to) }))}</b></span><button class="chip" data-act="vacations">${esc(t('edit'))}</button></div>`;
    html += `<div class="habit-grid" id="habit-grid">${active.map(habitCard).join('')}</div>`;
    if (active.length) html += `<p class="grid-hint">${esc(t('tapHint'))}</p>`;
    if (arch.length) {
      html += `<div class="center" style="margin-top:22px"><button class="chip" data-act="toggle-archived">${ico('archive')} ${esc(state.ui.showArchived ? t('hideArchived') : t('showArchived', { n: arch.length }))}</button></div>`;
      if (state.ui.showArchived) html += `<div class="habit-grid archived-list" style="margin-top:18px">${arch.map(habitCard).join('')}</div>`;
    }
    return html;
  }

  function habitVars(c) {
    const s = T.surfaceHex;
    return `--h:${c};--h-soft:${mix(s, c, T.light ? .18 : .16)};--h-empty:${mix(s, c, T.light ? .16 : .17)};--h-part:${mix(s, c, .5)};--h-ink:${ink(c)}`;
  }

  function ringHtml(sum, target, attrs = '') {
    const C = 2 * Math.PI * 23, frac = Math.min(1, sum / target), full = sum >= target;
    const inner = full ? (sum > 1 ? sum : ico('check')) : (sum ? sum : '');
    return `<button class="ring ${full ? 'full' : ''}" ${attrs}><svg viewBox="0 0 54 54" aria-hidden="true"><circle cx="27" cy="27" r="23" fill="none" stroke="var(--h)" stroke-opacity=".4" stroke-width="3.5"/>${frac > 0 ? `<circle cx="27" cy="27" r="23" fill="none" stroke="var(--h)" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${(C * (1 - frac)).toFixed(2)}"/>` : ''}</svg><span class="ring-in">${inner}</span></button>`;
  }

  function habitCard(h) {
    const today = todayKey(), c = hColor(h);
    const sum = periodSum(h, today);
    const streak = currentStreak(h);
    const meta = [];
    if (isQuit(h)) {
      const slip = cnt(h, today) > 0, best = bestStreak(h);
      meta.push(esc(streak === 1 ? t('quitDay1') : t('quitDays', { n: streak })));
      if (best > streak) meta.push(esc(t('bestStreak')) + ' ' + best);
      if (h.challenge && !h.challenge.done) meta.push(`🏁 ${challengeProgress(h)}/${h.challenge.days}`);
      const ring = `<button class="ring quit ${slip ? 'slipped' : 'full'}" data-ring="${h.id}" aria-label="${esc(t('relapse'))}"><svg viewBox="0 0 54 54" aria-hidden="true"><circle cx="27" cy="27" r="23" fill="none" stroke="var(--h)" stroke-opacity=".4" stroke-width="3.5"/></svg><span class="ring-in">${slip ? ico('x') : streak}</span></button>`;
      return `<article class="habit clay" data-id="${h.id}" style="${habitVars(c)}">
        <div class="habit-head">
          <button class="habit-ico" data-act="habit-edit" data-id="${h.id}" aria-label="${esc(t('editHabit'))}">${esc(h.icon || '#')}</button>
          <button class="habit-title" data-act="habit-edit" data-id="${h.id}"><h3>${esc(h.name)}</h3><div class="habit-meta"><span class="tag-quit">${esc(t('kindQuit'))}</span>${meta.map(m => `<span>${m}</span>`).join('')}</div></button>
          ${ring}
        </div>
        ${dotsHtml(h)}
      </article>`;
    }
    if (isAmount(h)) meta.push(`${fmtNum(sum)} / ${fmtNum(h.target)} ${esc(h.unit || '')}${h.freq !== 'daily' ? ' · ' + esc(unitLabel(h)) : ''}`);
    else {
      if (!(h.freq === 'daily' && h.target === 1)) meta.push(esc(t('timesPer', { n: h.target, period: unitLabel(h) })));
      if (h.freq === 'weekly') meta.push(esc(t('thisWeek', { a: sum, b: h.target })));
      if (h.freq === 'monthly') meta.push(esc(t('thisMonth', { a: sum, b: h.target })));
    }
    if (streak) meta.push(`<span class="flame">${ico('flame')}</span>${streak}`);
    const sh = shieldInfo(h).available; if (sh) meta.push(`🛡️${sh}`);
    if (h.challenge && !h.challenge.done) meta.push(`🏁 ${challengeProgress(h)}/${h.challenge.days}`);
    // En hábitos con cantidad, el anillo muestra el porcentaje del objetivo
    const ring = isAmount(h)
      ? ringHtml(Math.min(sum, h.target), h.target, `data-ring="${h.id}" aria-label="${esc(t('today'))}: ${fmtNum(sum)}/${fmtNum(h.target)}"`).replace(/<span class="ring-in">.*<\/span><\/button>$/, `<span class="ring-in" style="font-size:12px">${sum >= h.target ? ico('check') : Math.round(sum / h.target * 100) + '%'}</span></button>`)
      : ringHtml(sum, h.target, `data-ring="${h.id}" aria-label="${esc(t('today'))}: ${sum}/${h.target}"`);
    return `<article class="habit clay" data-id="${h.id}" style="${habitVars(c)}">
      <div class="habit-head">
        <button class="habit-ico" data-act="habit-edit" data-id="${h.id}" aria-label="${esc(t('editHabit'))}">${esc(h.icon || '#')}</button>
        <button class="habit-title" data-act="habit-edit" data-id="${h.id}"><h3>${esc(h.name)}</h3>${meta.length ? `<div class="habit-meta">${meta.map(m => `<span>${m}</span>`).join('')}</div>` : ''}</button>
        ${+h.duration > 0 ? `<button class="icon-btn sm timer-btn" data-timer="${h.id}" aria-label="${esc(t('timer'))}">${ico('timer')}</button>` : ''}
        ${ring}
      </div>
      ${dotsHtml(h)}
    </article>`;
  }

  function dotsHtml(h) {
    const today = todayKey(), fk = firstKey(h), goal = dayGoal(h);
    const curWeek = weekStart(today);
    const weeks = Math.max(diffDays(weekStart(fk), curWeek) / 7 + 1, minWeeks);
    const first = addDays(curWeek, -(weeks - 1) * 7);
    const L = state.logs[h.id] || {};
    let out = '';
    for (let w = 0; w < weeks; w++) {
      const ws = addDays(first, w * 7);
      for (let d = 0; d < 7; d++) {
        const k = addDays(ws, d);
        if (k > today) { out += '<i class="dot future"></i>'; continue; }
        const c = L[k] || 0;
        let cls = 'dot', label = c >= 2 && !isAmount(h) ? c : '';
        if (isQuit(h)) {
          if (c > 0) { cls += ' slip'; label = ''; }
          else if (k >= fk && k < today) cls += ' on';
        } else {
          if (c >= goal) cls += ' on'; else if (c > 0) cls += ' part';
          else if (isShielded(h, k)) cls += ' shielded';
          else if (isRest(h, k) || inVacation(k)) cls += ' rest';
          else if (!isScheduled(h, k)) cls += ' off';
        }
        if (k < fk) cls += ' pre';
        if (k === today) cls += ' today';
        out += `<button class="${cls}" data-k="${k}" aria-label="${esc(fmtDate(k))}: ${c}">${label}</button>`;
      }
      if (h.freq === 'weekly') out += `<i class="wk${periodDone(h, ws) ? ' on' : ''}"></i>`;
    }
    return `<div class="dots-scroll"><div class="dots${h.freq === 'weekly' ? ' weekly' : ''}" data-id="${h.id}">${out}</div></div>`;
  }

  function fitGrids() {
    const sc = $('.dots-scroll');
    if (sc) {
      const cs = getComputedStyle(document.documentElement);
      const dot = parseFloat(cs.getPropertyValue('--dot')) || 15, gap = parseFloat(cs.getPropertyValue('--dot-gap')) || 4;
      const need = Math.max(4, Math.floor((sc.clientWidth + gap) / (dot + gap)));
      if (need !== minWeeks) {
        minWeeks = need;
        $$('.habit[data-id]').forEach(el => { const h = getHabit(el.dataset.id); if (h) el.outerHTML = habitCard(h); });
      }
    }
    $$('.dots-scroll').forEach(s => { s.scrollLeft = s.scrollWidth; });
  }

  function refreshHabit(id, pop = false) {
    const h = getHabit(id); const el = $(`.habit[data-id="${id}"]`);
    if (!h || !el) return render();
    const sc = el.querySelector('.dots-scroll');
    const atEnd = !sc || sc.scrollLeft + sc.clientWidth >= sc.scrollWidth - 6;
    const sl = sc ? sc.scrollLeft : 0;
    const tmp = document.createElement('div'); tmp.innerHTML = habitCard(h).trim();
    const n = tmp.firstElementChild; el.replaceWith(n);
    const sc2 = n.querySelector('.dots-scroll'); if (sc2) sc2.scrollLeft = atEnd ? sc2.scrollWidth : sl;
    if (pop) n.classList.add('pop');
  }

  /* ---------- editor de hábito ---------- */
  function openHabitEditor(h = null) {
    const isNew = !h;
    const f = h ? { kind: 'build', days: [0, 1, 2, 3, 4, 5, 6], ...h } : { kind: 'build', name: '', icon: '#', color: null, freq: 'daily', target: 1, multi: false, note: '', days: [0, 1, 2, 3, 4, 5, 6] };
    f.days = [...(f.days || [0, 1, 2, 3, 4, 5, 6])];
    f.measure = f.measure || 'count'; f.timeOfDay = f.timeOfDay || 'any'; f.duration = +f.duration || 0; f.step = +f.step || 1; f.unit = f.unit || '';
    f.chDays = h && h.challenge && !h.challenge.done ? h.challenge.days : 0;
    const draw = w => {
      const b = $('#hf', w); const forcedMulti = f.freq === 'daily' && f.target > 1;
      const period = f.freq === 'daily' ? t('periodDay') : f.freq === 'weekly' ? t('periodWeek') : t('periodMonth');
      const autoC = h ? h.autoColor : HABIT_COLORS[state.colorSeq % HABIT_COLORS.length];
      const quit = f.kind === 'quit', wd = t('weekdaysShort').split(',');
      b.innerHTML = `<div class="stack" style="gap:18px">
        <div class="field"><span>${esc(t('habitKind'))}</span>
          <div class="seg">${[['build', 'kindBuild'], ['quit', 'kindQuit']].map(([v, k]) => `<button type="button" data-kind="${v}" class="${f.kind === v ? 'on' : ''}">${esc(t(k))}</button>`).join('')}</div>
          ${quit ? `<div class="muted small">${esc(t('quitHint'))}</div>` : ''}
        </div>
        <label class="field"><span>${esc(t('habitName'))}</span><input class="input" id="hf-name" maxlength="60" value="${esc(f.name)}" placeholder="${esc(t(quit ? 'quitNamePh' : 'habitNamePh'))}" autocomplete="off"></label>
        <div class="field"><span>${esc(t('habitIcon'))}</span>
          <div class="emoji-grid">${EMOJIS.map(e => `<button type="button" data-emoji="${esc(e)}" class="${f.icon === e ? 'on' : ''}">${esc(e)}</button>`).join('')}</div>
          <input class="input" id="hf-icon" maxlength="8" value="${esc(f.icon)}" style="max-width:120px;text-align:center" aria-label="${esc(t('habitIcon'))}">
        </div>
        <div class="field"><span>${esc(t('habitColor'))}</span>
          <div class="swatches">
            <button type="button" class="sw auto ${!f.color ? 'on' : ''}" data-color="" title="${esc(t('colorAuto'))}" aria-label="${esc(t('colorAuto'))}" style="--c:${autoC}"></button>
            ${HABIT_COLORS.map(c => `<button type="button" class="sw ${f.color === c ? 'on' : ''}" data-color="${c}" style="--c:${c}" aria-label="${c}"></button>`).join('')}
            <input type="color" class="swatch-input" id="hf-color" value="${f.color || autoC}" aria-label="${esc(t('themeCustom'))}">
          </div>
        </div>
        <div class="${quit ? 'hidden' : 'stack'}" style="gap:18px">
        <div class="field"><span>${esc(t('habitMeasure'))}</span>
          <div class="seg">${[['count', 'measureCount'], ['amount', 'measureAmount']].map(([v, k]) => `<button type="button" data-measure="${v}" class="${f.measure === v ? 'on' : ''}">${esc(t(k))}</button>`).join('')}</div>
          ${f.measure === 'amount' ? `<div class="muted small">${esc(t('measureAmountHint'))}</div>` : ''}
        </div>
        <div class="field"><span>${esc(t('habitFreq'))}</span>
          <div class="seg">${['daily', 'weekly', 'monthly'].map(q => `<button type="button" data-freq="${q}" class="${f.freq === q ? 'on' : ''}">${esc(t(q === 'daily' ? 'freqDaily' : q === 'weekly' ? 'freqWeekly' : 'freqMonthly'))}</button>`).join('')}</div>
        </div>
        ${f.freq === 'daily' ? `<div class="field"><span>${esc(t('habitDays'))}</span>
          <div class="row wrap" style="gap:8px">${wd.map((l, i) => `<button type="button" class="chip daychip ${f.days.includes(i) ? 'on' : ''}" data-wd="${i}">${esc(l)}</button>`).join('')}</div>
          <div class="muted small">${esc(t('habitDaysHint'))}</div>
        </div>` : ''}
        ${f.measure === 'amount' ? `<div class="row wrap" style="gap:12px;align-items:flex-end">
          <label class="field grow"><span>${esc(t('amountGoal', { period }))}</span><input class="input" id="hf-target" type="number" min="0" step="any" inputmode="decimal" value="${f.target}"></label>
          <label class="field" style="width:120px"><span>${esc(t('goalUnit'))}</span><input class="input" id="hf-unit" maxlength="12" value="${esc(f.unit)}" placeholder="L, min, km…"></label>
          <label class="field" style="width:110px"><span>${esc(t('amountStep'))}</span><input class="input" id="hf-stepv" type="number" min="0" step="any" inputmode="decimal" value="${f.step}"></label>
        </div>` : `<div class="field"><span>${esc(t('habitTarget'))}</span>
          <div class="stepper"><button type="button" class="icon-btn sm" data-step="-1" aria-label="-1">${ico('minus')}</button><input class="input" id="hf-target" type="number" min="1" inputmode="numeric" value="${f.target}"><button type="button" class="icon-btn sm" data-step="1" aria-label="+1">${ico('plus')}</button></div>
          <div class="muted small">${esc(t('habitTargetHint', { period }))}</div>
        </div>
        <label class="row" style="gap:14px"><span class="switch"><input type="checkbox" id="hf-multi" ${f.multi || forcedMulti ? 'checked' : ''} ${forcedMulti ? 'disabled' : ''}><span></span></span><span class="grow"><b>${esc(t('habitMulti'))}</b><br><span class="muted small">${esc(t('habitMultiHint'))}</span></span></label>`}
        <label class="field"><span>⏱ ${esc(t('habitDuration'))}</span><input class="input" id="hf-dur" type="number" min="0" max="600" inputmode="numeric" value="${f.duration || ''}" placeholder="${esc(t('habitDurationPh'))}" style="max-width:200px"></label>
        </div>
        <div class="field"><span>${esc(t('timeOfDay'))}</span><div class="seg" style="flex-wrap:wrap">${TOD.map(x => `<button type="button" data-tod="${x}" class="${f.timeOfDay === x ? 'on' : ''}">${TOD_ICON[x]} ${esc(t('tod_' + x))}</button>`).join('')}</div></div>
        <label class="field"><span>🏁 ${esc(t('habitChallenge'))}</span><input class="input" id="hf-ch" type="number" min="0" max="1000" inputmode="numeric" value="${f.chDays || ''}" placeholder="${esc(t('habitChallengePh'))}" style="max-width:200px">
          ${h && h.challenge && !h.challenge.done ? `<span class="muted small">${esc(t('challengeProgressTxt', { a: challengeProgress(h), b: h.challenge.days, d: fmtShort(h.challenge.start) }))}</span>` : ''}</label>
        <label class="field"><span>${esc(t('habitDesc'))}</span><textarea class="input" id="hf-note" maxlength="300" placeholder="${esc(t('habitDescPh'))}">${esc(f.note || '')}</textarea></label>
        ${!isNew ? `<div class="row wrap">
          <button type="button" class="chip" data-hm="up">${ico('up')} ${esc(t('moveUp'))}</button>
          <button type="button" class="chip" data-hm="down">${ico('down')} ${esc(t('moveDown'))}</button>
          <button type="button" class="chip" data-hm="archive">${ico('archive')} ${esc(h.archived ? t('unarchive') : t('archive'))}</button>
          ${!quit ? `<button type="button" class="chip" data-hm="link">🔗 ${esc(t('shortcutLink'))}</button>` : ''}
          <button type="button" class="chip" data-hm="delete" style="color:#e5484d">${ico('trash')} ${esc(t('delete'))}</button>
        </div>` : ''}
      </div>`;
    };
    const readInputs = w => {
      f.name = $('#hf-name', w).value.trim();
      f.icon = $('#hf-icon', w).value.trim() || '#';
      f.target = f.measure === 'amount' ? Math.max(.01, parseFloat($('#hf-target', w).value) || 1) : Math.max(1, parseInt($('#hf-target', w).value, 10) || 1);
      f.note = $('#hf-note', w).value.trim();
      const mu = $('#hf-multi', w); if (mu && !mu.disabled) f.multi = mu.checked;
      if ($('#hf-unit', w)) { f.unit = $('#hf-unit', w).value.trim(); f.step = Math.max(.01, parseFloat($('#hf-stepv', w).value) || 1); }
      f.duration = Math.max(0, parseInt($('#hf-dur', w).value, 10) || 0);
      f.chDays = Math.max(0, parseInt($('#hf-ch', w).value, 10) || 0);
    };
    openModal({
      title: esc(isNew ? t('newHabit') : t('editHabit')),
      body: '<div id="hf"></div>',
      foot: `<button class="btn" data-m="x">${esc(t('cancel'))}</button><button class="btn primary" data-m="save">${esc(t('save'))}</button>`,
      onMount: w => { draw(w); if (isNew) setTimeout(() => $('#hf-name', w)?.focus(), 250); },
      onInput: (e, w) => {
        if (e.target.id === 'hf-color') { f.color = e.target.value; $$('.sw', w).forEach(s => s.classList.remove('on')); }
        if (e.target.id === 'hf-icon') { $$('[data-emoji]', w).forEach(b => b.classList.toggle('on', b.dataset.emoji === e.target.value.trim())); }
      },
      onClick: async (e, close, w) => {
        const q = s => e.target.closest(s);
        let el;
        if ((el = q('[data-emoji]'))) { readInputs(w); f.icon = el.dataset.emoji; draw(w); return; }
        if ((el = q('[data-color]'))) { readInputs(w); f.color = el.dataset.color || null; draw(w); return; }
        if ((el = q('[data-freq]'))) { readInputs(w); f.freq = el.dataset.freq; draw(w); return; }
        if ((el = q('[data-kind]'))) { readInputs(w); f.kind = el.dataset.kind; draw(w); return; }
        if ((el = q('[data-measure]'))) { readInputs(w); f.measure = el.dataset.measure; if (f.measure === 'amount' && f.target === 1 && !f.unit) f.target = 1; draw(w); return; }
        if ((el = q('[data-tod]'))) { readInputs(w); f.timeOfDay = el.dataset.tod; draw(w); return; }
        if ((el = q('[data-wd]'))) {
          readInputs(w); const i = +el.dataset.wd;
          f.days = f.days.includes(i) ? f.days.filter(x => x !== i) : [...f.days, i].sort();
          if (!f.days.length) f.days = [i];
          draw(w); return;
        }
        if ((el = q('[data-step]'))) { readInputs(w); f.target = Math.max(1, f.target + +el.dataset.step); draw(w); return; }
        if ((el = q('[data-hm]'))) {
          const act = el.dataset.hm, i = state.habits.indexOf(h);
          if (act === 'up' && i > 0) { [state.habits[i - 1], state.habits[i]] = [state.habits[i], state.habits[i - 1]]; save(); render(); }
          if (act === 'down' && i < state.habits.length - 1) { [state.habits[i + 1], state.habits[i]] = [state.habits[i], state.habits[i + 1]]; save(); render(); }
          if (act === 'archive') { h.archived = !h.archived; save(); close(); render(); }
          if (act === 'link') {
            const url = `${APP_URL}?check=${h.id}`;
            openModal({
              title: `🔗 ${esc(t('shortcutLink'))}`,
              body: `<p class="muted" style="margin-top:0">${esc(t('shortcutHelp'))}</p><input class="input" readonly value="${esc(url)}" id="sc-url" onclick="this.select()"><ol class="small muted" style="padding-left:18px;line-height:1.6">${t('shortcutSteps').split('|').map(s => `<li>${esc(s)}</li>`).join('')}</ol>`,
              foot: `<button class="btn primary block" data-m="copy">${esc(t('copy'))}</button>`,
              onClick: async (ev, cl, ww) => { if (ev.target.closest('[data-m="copy"]')) { try { await navigator.clipboard.writeText(url); toast(t('copied')); } catch (err) { $('#sc-url', ww).select(); } } }
            });
          }
          if (act === 'delete' && await confirmDialog(t('deleteHabitQ', { name: h.name }))) {
            state.habits = state.habits.filter(x => x !== h);
            for (const k of ['logs', 'mastery', 'rest', 'shields', 'ltime']) delete state[k][h.id];
            state.routines.forEach(r => { r.habitIds = r.habitIds.filter(id => id !== h.id); });
            state.projects.forEach(p => { p.habitIds = p.habitIds.filter(id => id !== h.id); });
            save(); close(); render(); toast(t('deleted'));
          }
          return;
        }
        if (q('[data-m="save"]')) {
          readInputs(w);
          if (!f.name) { toast(t('habitNeedName')); $('#hf-name', w).focus(); return; }
          if (f.kind === 'quit') Object.assign(f, { freq: 'daily', target: 1, multi: false, measure: 'count', duration: 0 });
          const props = { kind: f.kind, name: f.name, icon: f.icon, color: f.color, freq: f.freq, target: f.target, multi: f.multi, note: f.note, days: f.days, measure: f.measure, unit: f.unit, step: f.step, timeOfDay: f.timeOfDay, duration: f.duration };
          // Reto: se conserva la fecha de inicio si solo cambian los días
          const oldCh = h && h.challenge;
          if (f.chDays > 0) props.challenge = oldCh && !oldCh.done ? { ...oldCh, days: f.chDays } : { tid: 'custom', days: f.chDays, start: todayKey() };
          else props.challenge = oldCh && oldCh.done ? oldCh : undefined;
          if (isNew) {
            state.habits.push({ id: uid(), ...props, autoColor: HABIT_COLORS[state.colorSeq++ % HABIT_COLORS.length], createdAt: todayKey(), archived: false });
          } else {
            Object.assign(h, props);
            if (!props.challenge) delete h.challenge;
            checkMastery(h, true); checkChallenge(h);
          }
          save(); close();
          if (state.ui.tab !== 'habits') state.ui.tab = 'habits';
          render(); toast(t('saved'));
        }
      }
    });
  }

  /* ---------- editor de un día concreto ---------- */
  function openDay(h, k) {
    if (isAmount(h)) { openAmount(h, k); return; }
    const quit = isQuit(h);
    const restBtn = () => {
      if (quit) return '';
      // Escudo: solo para días pasados fallados (o ya protegidos, para poder quitarlo)
      const sh = shieldInfo(h), shielded = isShielded(h, k);
      const canShield = shielded || (k < todayKey() && periodState(h, k) === 'miss' && sh.available > 0);
      return `<div class="row wrap" style="justify-content:center;margin-top:16px"><button class="chip ${isRest(h, k) ? 'on' : ''}" data-m="rest">${ico('calendar')} ${esc(isRest(h, k) ? t('restDayOn') : t('restDay'))}</button>
        ${canShield ? `<button class="chip ${shielded ? 'on' : ''}" data-m="shield">🛡️ ${esc(shielded ? t('shieldRemove') : t('shieldUseN', { n: sh.available }))}</button>` : ''}</div>
        <div class="muted small" style="margin-top:6px">${esc(t('restHint'))}</div>`;
    };
    const body = () => `<div class="center" style="--h:${hColor(h)}">
      <div class="muted small" style="font-weight:800;text-transform:uppercase;letter-spacing:.04em">${esc(t(quit ? 'relapsesDay' : 'dayCount'))}</div>
      <div class="row" style="justify-content:center;gap:22px;margin:16px 0 6px">
        <button class="icon-btn" data-d="-1" aria-label="-1">${ico('minus')}</button>
        <b id="dc" style="font-size:52px;min-width:90px;line-height:1">${cnt(h, k)}</b>
        <button class="icon-btn" data-d="1" aria-label="+1">${ico('plus')}</button>
      </div>
      <div class="muted small">${esc(h.name)}${quit ? '' : ' · ' + esc(t('timesPer', { n: h.target, period: unitLabel(h) }))}</div>
      <div id="rest-box">${restBtn()}</div>
    </div>`;
    const label = k === todayKey() ? t('today') : k === addDays(todayKey(), -1) ? t('yesterday') : fmtDate(k, { weekday: 'long', day: 'numeric', month: 'long' });
    openModal({
      title: `${esc(h.icon || '#')} ${esc(label.charAt(0).toUpperCase() + label.slice(1))}`,
      body: body(),
      foot: `<button class="btn" data-m="clear">${esc(t('clearDay'))}</button><button class="btn primary" data-m="x">${esc(t('done'))}</button>`,
      onClick: (e, close, w) => {
        const d = e.target.closest('[data-d]');
        if (d) { setCount(h, k, cnt(h, k) + +d.dataset.d); $('#dc', w).textContent = cnt(h, k); refreshHabit(h.id); vibrate(8); }
        if (e.target.closest('[data-m="rest"]')) {
          const R = state.rest[h.id] || (state.rest[h.id] = {});
          if (R[k]) delete R[k]; else R[k] = true;
          save(); $('#rest-box', w).innerHTML = restBtn(); refreshHabit(h.id); vibrate(8);
        }
        if (e.target.closest('[data-m="shield"]')) {
          const pk = periodStart(h, k);
          if (isShielded(h, k)) { delete state.shields[h.id][pk]; save(); } else useShield(h, k);
          $('#rest-box', w).innerHTML = restBtn(); refreshHabit(h.id);
        }
        if (e.target.closest('[data-m="clear"]')) { setCount(h, k, 0); if (state.rest[h.id]) delete state.rest[h.id][k]; save(); refreshHabit(h.id); close(); }
      }
    });
  }

  /* ---------- PROYECTOS ---------- */
  function regressionSlope(pts) {
    const n = pts.length; if (n < 2) return null;
    const mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
    let num = 0, den = 0; pts.forEach(([x, y]) => { num += (x - mx) * (y - my); den += (x - mx) ** 2; });
    return den ? num / den : null;
  }

  // Calculadora: combina constancia (A), ritmo de avance (pace) y tiempo transcurrido (T)
  function projectStats(p, simA = null) {
    const today = todayKey(), g = p.goal;
    let G = 0, measurable = true, cur = null;
    if (g.type === 'numeric') {
      cur = g.entries.length ? g.entries[g.entries.length - 1].v : g.start;
      const span = g.target - g.start;
      G = span === 0 ? 1 : clamp((cur - g.start) / span, 0, 1);
    } else if (g.type === 'checklist') {
      const n = g.items.length; G = n ? g.items.filter(i => i.done).length / n : 0; measurable = n > 0;
    } else { G = g.achieved ? 1 : 0; measurable = false; }
    const achieved = g.type === 'simple' ? !!g.achieved : (measurable && G >= 1);
    const hs = p.habitIds.map(getHabit).filter(Boolean);
    const rates = hs.map(h => rate(h, 30)).filter(r => r != null);
    let A = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
    const realA = A;
    if (simA != null) A = simA;
    let T = null, daysLeft = null, pace = null, projection = null, neededPerDay = null;
    if (p.deadline) {
      const total = Math.max(1, diffDays(p.createdAt, p.deadline));
      T = clamp(diffDays(p.createdAt, today) / total, 0, 1);
      daysLeft = diffDays(today, p.deadline);
    }
    if (measurable && p.deadline && !achieved) {
      let slope = null;
      if (g.type === 'numeric' && g.entries.length >= 1) {
        const span = (g.target - g.start) || 1;
        const pts = [[0, 0], ...g.entries.map(e => [diffDays(p.createdAt, e.d), (e.v - g.start) / span])];
        slope = regressionSlope(pts);
      }
      if (slope == null) slope = G / Math.max(1, diffDays(p.createdAt, today));
      const projG = G + slope * Math.max(0, daysLeft);
      pace = clamp(projG, 0, 1.5);
      if (g.type === 'numeric') {
        projection = g.start + projG * (g.target - g.start);
        neededPerDay = daysLeft > 0 ? (g.target - cur) / daysLeft : null;
      }
    }
    let score;
    const wPace = pace == null ? 0 : .15 + .35 * (T ?? 0);
    if (A == null && pace == null) score = .5 * G + .25;
    else if (A == null) score = Math.min(pace, 1.2) / 1.2;
    else if (pace == null) score = .75 * A + .25 * G;
    else score = (1 - wPace) * A + wPace * Math.min(pace, 1.2) / 1.2;
    let P = 100 / (1 + Math.exp(-8 * (score - .5)));
    if (daysLeft != null && daysLeft < 0 && !achieved) P = Math.min(P, 3);
    P = achieved ? 100 : clamp(Math.round(P), 1, 99);
    return { G, A: realA, T, pace, P, daysLeft, projection, neededPerDay, cur, achieved, hs, measurable };
  }

  function deadlineText(p, s) {
    if (!p.deadline) return t('noDeadline');
    if (s.daysLeft < 0) return t('overdue', { n: -s.daysLeft });
    return s.daysLeft === 1 ? t('dayLeft') : t('daysLeft', { n: s.daysLeft });
  }

  function viewProjects() {
    let html = topBar(`<button class="icon-btn" data-act="proj-tpl" aria-label="${esc(t('projectTemplates'))}">📦</button><button class="icon-btn" data-act="proj-new" aria-label="${esc(t('newProject'))}">${ico('plus')}</button>`);
    html += `<h1 class="page-title">${esc(t('tabProjects'))}</h1>`;
    if (!state.projects.length) return html + emptyState('target', t('projectsEmptyTitle'), t('projectsEmptySub'), `<div class="row wrap" style="justify-content:center"><button class="btn primary" data-act="proj-new">${ico('plus')} ${esc(t('newProject'))}</button><button class="btn" data-act="proj-tpl">📦 ${esc(t('projectTemplates'))}</button></div>`);
    const finished = state.projects.filter(p => projectStats(p).achieved), active = state.projects.filter(p => !finished.includes(p));
    html += `<div class="proj-grid">${active.map(p => {
      const s = projectStats(p); const c = p.color || 'var(--accent)';
      return `<button class="proj clay" data-act="proj-open" data-id="${p.id}" style="--h:${c}">
        <div class="proj-top">
          <div class="habit-ico" style="--h-soft:var(--surface-2)">${esc(p.icon || '🎯')}</div>
          <div class="grow"><h3>${esc(p.name)}</h3><div class="muted small" style="font-weight:700">${esc(s.achieved ? t('achieved') : deadlineText(p, s))}</div></div>
          <div class="prob-badge"><b>${s.P}%</b><span>${esc(t('probability').split(' ')[0])}</span></div>
        </div>
        <div class="bar ${s.G ? '' : 'zero'}" style="margin-top:14px"><i style="width:${Math.round(s.G * 100)}%"></i></div>
        <div class="row" style="justify-content:space-between;margin-top:6px"><span class="muted small" style="font-weight:700">${esc(t('progress'))} ${Math.round(s.G * 100)}%</span>${p.goal.type === 'numeric' ? `<span class="small" style="font-weight:800">${fmtNum(s.cur)} / ${fmtNum(p.goal.target)} ${esc(p.goal.unit)}</span>` : ''}</div>
        ${s.hs.length ? `<div class="linked">${s.hs.map(h => `<span>${esc(h.icon)} ${esc(h.name)}</span>`).join('')}</div>` : ''}
      </button>`;
    }).join('')}</div>`;
    if (!active.length) html += `<p class="muted center">${esc(t('noActiveProjects'))}</p>`;
    // Carpeta de proyectos finalizados con su antes y después
    if (finished.length) {
      html += `<h2 class="section-title" style="margin:28px 0 14px;font-size:22px">🏆 ${esc(t('finishedProjects'))}</h2><div class="proj-grid">${finished.map(p => {
        const done = p.goal.type === 'simple' ? '' : '';
        return `<button class="proj clay finished" data-act="proj-open" data-id="${p.id}">
          <div class="proj-top"><div class="habit-ico" style="--h-soft:var(--surface-2)">${esc(p.icon || '🎯')}</div><div class="grow"><h3>${esc(p.name)}</h3><div class="muted small" style="font-weight:700">✅ ${esc(t('achieved'))}${done}</div></div></div>
          ${p.photos.before || p.photos.after ? `<div class="ba-row">${['before', 'after'].map(k => p.photos[k] ? `<div class="ba-thumb"><img data-photo="${esc(p.photos[k].path)}" alt=""><span>${esc(t('photo_' + k))}</span></div>` : `<div class="ba-thumb empty"><span>${esc(t('photo_' + k))}</span></div>`).join('')}</div>` : ''}
        </button>`;
      }).join('')}</div>`;
    }
    return html;
  }

  function openProjectEditor(p = null, preset = null) {
    const isNew = !p;
    const f = p ? JSON.parse(JSON.stringify(p)) : { name: '', icon: '🎯', color: null, desc: '', habitIds: [], goal: { type: 'numeric', start: 0, target: 0, unit: '', entries: [], items: [], achieved: false }, deadline: null, milestones: [], photos: {}, ...(preset || {}) };
    f.milestones = f.milestones || []; f.photos = f.photos || {};
    const draw = w => {
      const g = f.goal; const avail = state.habits.filter(h => !h.archived || f.habitIds.includes(h.id));
      $('#pf', w).innerHTML = `<div class="stack" style="gap:18px">
        <label class="field"><span>${esc(t('projectName'))}</span><input class="input" id="pf-name" maxlength="80" value="${esc(f.name)}" placeholder="${esc(t('projectNamePh'))}"></label>
        <div class="field"><span>${esc(t('habitIcon'))}</span><div class="emoji-grid" style="max-height:110px">${['🎯', '⚖️', '💰', '🏆', '📚', '🧠', '💪', '🏃', '🗣️', '💼', '🏠', '✈️', '🎓', '❤️', '🌱', '🚀'].map(e => `<button type="button" data-emoji="${e}" class="${f.icon === e ? 'on' : ''}">${e}</button>`).join('')}</div></div>
        <label class="field"><span>${esc(t('projectDesc'))}</span><textarea class="input" id="pf-desc" maxlength="400">${esc(f.desc)}</textarea></label>
        <div class="field"><span>${esc(t('goalType'))}</span>
          <div class="seg">${[['numeric', 'goalNumeric'], ['checklist', 'goalChecklist'], ['simple', 'goalSimple']].map(([v, k]) => `<button type="button" data-gtype="${v}" class="${g.type === v ? 'on' : ''}">${esc(t(k))}</button>`).join('')}</div>
          <div class="muted small">${esc(t(g.type === 'numeric' ? 'goalNumericHint' : g.type === 'checklist' ? 'goalChecklistHint' : 'goalSimpleHint'))}</div>
        </div>
        ${g.type === 'numeric' ? `<div class="row wrap" style="gap:12px;align-items:flex-end">
          <label class="field grow"><span>${esc(t('goalStart'))}</span><input class="input" id="pf-start" type="number" step="any" inputmode="decimal" value="${g.start}"></label>
          <label class="field grow"><span>${esc(t('goalTarget'))}</span><input class="input" id="pf-target" type="number" step="any" inputmode="decimal" value="${g.target}"></label>
          <label class="field" style="width:110px"><span>${esc(t('goalUnit'))}</span><input class="input" id="pf-unit" maxlength="10" value="${esc(g.unit)}" placeholder="${esc(t('goalUnitPh'))}"></label>
        </div>` : ''}
        ${g.type === 'checklist' ? `<div class="field"><span>${esc(t('goalItems'))}</span>
          <div>${g.items.map(it => `<div class="check-item"><span class="grow">${esc(it.text)}</span><button type="button" class="icon-btn sm" data-del-item="${it.id}" aria-label="${esc(t('delete'))}">${ico('x')}</button></div>`).join('')}</div>
          <div class="row"><input class="input" id="pf-item" maxlength="80" placeholder="${esc(t('goalItemPh'))}"><button type="button" class="btn" data-add-item>${esc(t('addItem'))}</button></div>
        </div>` : ''}
        <div class="field"><span>${esc(t('deadline'))}</span>
          <div class="seg"><button type="button" data-dl="0" class="${!f.deadline ? 'on' : ''}">${esc(t('deadlineNone'))}</button><button type="button" data-dl="1" class="${f.deadline ? 'on' : ''}">${esc(t('deadlineSet'))}</button></div>
          ${f.deadline ? `<input class="input" id="pf-deadline" type="date" min="${todayKey()}" value="${f.deadline}">` : ''}
        </div>
        <div class="field"><span>🚩 ${esc(t('milestones'))}</span>
          <div class="muted small">${esc(t('milestonesHint'))}</div>
          <div>${[...f.milestones].sort((a, b) => (a.date || '9999') < (b.date || '9999') ? -1 : 1).map(m => `<div class="check-item"><span class="grow">${esc(m.text)} <span class="muted small">${m.date ? '· ' + esc(fmtShort(m.date)) : ''}</span></span><button type="button" class="icon-btn sm" data-del-ms="${m.id}" aria-label="${esc(t('delete'))}">${ico('x')}</button></div>`).join('')}</div>
          <div class="row wrap"><input class="input" id="pf-ms" maxlength="80" placeholder="${esc(t('milestonePh'))}" style="flex:1 1 180px"><input class="input" id="pf-ms-date" type="date" style="width:170px"><button type="button" class="btn" data-add-ms>${esc(t('addItem'))}</button></div>
        </div>
        <div class="field"><span>${esc(t('projectHabits'))}</span>
          <div class="muted small">${esc(t('projectHabitsHint'))}</div>
          <div class="sug-list" style="margin-top:6px">${avail.length ? avail.map(h => `<button type="button" class="chip ${f.habitIds.includes(h.id) ? 'on' : ''}" data-link="${h.id}">${esc(h.icon)} ${esc(h.name)}</button>`).join('') : `<span class="muted small">${esc(t('noHabitsYet'))}</span>`}</div>
        </div>
      </div>`;
    };
    const readInputs = w => {
      f.name = $('#pf-name', w).value.trim(); f.desc = $('#pf-desc', w).value.trim();
      if ($('#pf-start', w)) { f.goal.start = parseFloat($('#pf-start', w).value) || 0; f.goal.target = parseFloat($('#pf-target', w).value) || 0; f.goal.unit = $('#pf-unit', w).value.trim(); }
      if ($('#pf-deadline', w)) f.deadline = $('#pf-deadline', w).value || f.deadline;
    };
    const addItem = w => { const i = $('#pf-item', w); const v = i.value.trim(); if (!v) return; readInputs(w); f.goal.items.push({ id: uid(), text: v, done: false }); draw(w); setTimeout(() => $('#pf-item', w)?.focus(), 0); };
    openModal({
      title: esc(isNew ? t('newProject') : t('editProject')),
      body: '<div id="pf"></div>',
      foot: `<button class="btn" data-m="x">${esc(t('cancel'))}</button><button class="btn primary" data-m="save">${esc(isNew ? t('create') : t('save'))}</button>`,
      onMount: w => { draw(w); w.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'pf-item') { e.preventDefault(); addItem(w); } }); },
      onClick: (e, close, w) => {
        const q = s => e.target.closest(s); let el;
        if ((el = q('[data-emoji]'))) { readInputs(w); f.icon = el.dataset.emoji; draw(w); return; }
        if ((el = q('[data-gtype]'))) { readInputs(w); f.goal.type = el.dataset.gtype; draw(w); return; }
        if ((el = q('[data-dl]'))) { readInputs(w); f.deadline = el.dataset.dl === '1' ? (f.deadline || addMonths(todayKey(), 3)) : null; draw(w); return; }
        if ((el = q('[data-link]'))) { readInputs(w); const id = el.dataset.link; f.habitIds = f.habitIds.includes(id) ? f.habitIds.filter(x => x !== id) : [...f.habitIds, id]; draw(w); return; }
        if (q('[data-add-item]')) { addItem(w); return; }
        if ((el = q('[data-del-item]'))) { readInputs(w); f.goal.items = f.goal.items.filter(i => i.id !== el.dataset.delItem); draw(w); return; }
        if (q('[data-add-ms]')) { const txt = $('#pf-ms', w).value.trim(); if (!txt) return; readInputs(w); f.milestones.push({ id: uid(), text: txt, date: $('#pf-ms-date', w).value || null, done: false }); draw(w); return; }
        if ((el = q('[data-del-ms]'))) { readInputs(w); f.milestones = f.milestones.filter(m => m.id !== el.dataset.delMs); draw(w); return; }
        if (q('[data-m="save"]')) {
          readInputs(w);
          if (!f.name) { toast(t('projectNeedName')); $('#pf-name', w).focus(); return; }
          if (isNew) { f.id = uid(); f.createdAt = todayKey(); state.projects.push(f); }
          else Object.assign(p, f);
          save(); close(); state.ui.tab = 'projects'; render();
          openProject(isNew ? f : p);
        }
      }
    });
  }

  function donut(P, color = 'var(--accent)') {
    const C = 2 * Math.PI * 44;
    return `<svg viewBox="0 0 100 100" width="112" height="112" style="transform:rotate(-90deg);flex:none" aria-hidden="true"><circle cx="50" cy="50" r="44" fill="none" stroke="var(--surface-2)" stroke-width="10"/>${P > 0 ? `<circle cx="50" cy="50" r="44" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${(C * (1 - P / 100)).toFixed(2)}"/>` : ''}</svg>`;
  }

  function openProject(p) {
    let wref = null;
    const draw = () => {
      const s = projectStats(p), g = p.goal;
      const simDefault = Math.round((s.A ?? .5) * 100);
      let goalHtml = '';
      if (g.type === 'numeric') {
        const entries = [...g.entries].reverse();
        goalHtml = `<div class="row" style="justify-content:space-between;text-align:center">
            <div><div class="muted small">${esc(t('start'))}</div><b style="font-size:20px">${fmtNum(g.start)}</b></div>
            <div><div class="muted small">${esc(t('current'))}</div><b style="font-size:30px">${fmtNum(s.cur)}</b> <span class="muted">${esc(g.unit)}</span></div>
            <div><div class="muted small">${esc(t('goal'))}</div><b style="font-size:20px">${fmtNum(g.target)}</b></div>
          </div>
          <div class="bar ${s.G ? '' : 'zero'}" style="margin:14px 0"><i style="width:${Math.round(s.G * 100)}%"></i></div>
          <div class="row"><input class="input" id="pd-val" type="number" step="any" inputmode="decimal" placeholder="${esc(t('logValue'))}"><button class="btn primary" data-pd="log">${esc(t('add'))}</button></div>
          ${g.entries.length ? `<div style="margin-top:16px">${lineChart([{ k: p.createdAt, v: g.start }, ...g.entries.map(e => ({ k: e.d, v: e.v }))].map(e => ({ label: fmtDate(e.k, { day: 'numeric', month: 'short' }), v: e.v, tip: `${fmtNum(e.v)} ${g.unit}`, sub: fmtDate(e.k) })), { min: null, max: null, target: g.target, fmt: v => fmtNum(v), markers: true })}</div>` : ''}
          <h4 style="margin:16px 0 6px">${esc(t('history'))}</h4>
          ${entries.length ? entries.slice(0, 8).map(e => `<div class="entry"><span class="muted">${esc(fmtDate(e.d))}</span><span><b>${fmtNum(e.v)} ${esc(g.unit)}</b> <button class="icon-btn sm" style="width:30px;height:30px;margin-left:8px" data-pd="del-entry" data-d="${e.d}" aria-label="${esc(t('delete'))}">${ico('x')}</button></span></div>`).join('') : `<div class="muted small">${esc(t('noEntries'))}</div>`}`;
      } else if (g.type === 'checklist') {
        goalHtml = `<div class="bar ${s.G ? '' : 'zero'}" style="margin-bottom:10px"><i style="width:${Math.round(s.G * 100)}%"></i></div>
          ${g.items.length ? g.items.map(it => `<label class="check-item ${it.done ? 'done' : ''}"><input type="checkbox" data-pd-item="${it.id}" ${it.done ? 'checked' : ''} style="width:24px;height:24px;accent-color:var(--accent)"><span class="grow">${esc(it.text)}</span></label>`).join('') : `<div class="muted small">${esc(t('goalChecklistHint'))}</div>`}`;
      } else {
        goalHtml = `<button class="btn ${g.achieved ? 'accent' : 'primary'} block" data-pd="achieve">${g.achieved ? ico('check') + ' ' + esc(t('achieved')) : esc(t('markAchieved'))}</button>${g.achieved ? `<div class="center" style="margin-top:10px"><button class="chip" data-pd="achieve">${esc(t('markNotAchieved'))}</button></div>` : ''}`;
      }
      const factor = (label, v, txt) => `<div class="factor"><span>${esc(label)}</span><b>${txt ?? (v == null ? '—' : Math.round(v * 100) + '%')}</b><div class="bar ${v ? '' : 'zero'}"><i style="width:${v == null ? 0 : Math.round(clamp(v, 0, 1) * 100)}%"></i></div></div>`;
      const body = `<div class="stack" style="gap:16px">
        ${p.desc ? `<p class="muted" style="margin:0">${esc(p.desc)}</p>` : ''}
        <div class="row wrap small" style="font-weight:700">${ico('calendar')} <span>${esc(p.deadline ? fmtDate(p.deadline) + ' · ' + deadlineText(p, s) : t('noDeadline'))}</span></div>
        <section class="clay card"><h3 class="section-title">${esc(t('goal'))}${g.type === 'numeric' && g.unit ? ` <span class="muted small">(${esc(g.unit)})</span>` : ''}</h3>${goalHtml}</section>
        <section class="clay card">
          <h3 class="section-title">${esc(t('probCalc'))}</h3>
          <div class="gauge">${donut(s.P)}<div class="grow"><div class="gauge-num">${s.P}%</div><div class="muted small" style="font-weight:700">${esc(t('probability'))}</div></div></div>
          ${factor(t('probConsistency'), s.A)}
          ${s.pace != null ? factor(t('probPace'), Math.min(1, s.pace)) : ''}
          ${s.T != null ? factor(t('probTime'), s.T) : ''}
          ${s.A == null ? `<p class="muted small">${esc(t('probNoHabits'))}</p>` : ''}
          ${s.projection != null ? `<p class="small" style="font-weight:700">${esc(t('probProjection', { v: fmtNum(s.projection) + ' ' + g.unit }))}${s.neededPerDay != null ? ' ' + esc(t('probNeeded', { v: fmtNum(Math.abs(s.neededPerDay)) + ' ' + g.unit })) : ''}</p>` : ''}
          ${!s.achieved ? `<div style="margin-top:14px">
            <label class="small" style="font-weight:800" id="pd-simlabel">${esc(t('probSim', { n: simDefault }))}</label>
            <input type="range" id="pd-sim" min="0" max="100" value="${simDefault}">
            <div class="small" id="pd-simres" style="font-weight:800">→ ${esc(t('probSimResult', { n: projectStats(p, simDefault / 100).P }))}</div>
          </div>` : ''}
          ${whatIfHtml(p, s)}
          <p class="muted small" style="margin-bottom:0">${esc(t('probHelp'))}</p>
        </section>
        ${p.milestones.length || p.deadline ? `<section class="clay card"><h3 class="section-title">🚩 ${esc(t('timeline'))}</h3>${timelineHtml(p)}</section>` : ''}
        <section class="clay card"><h3 class="section-title">📸 ${esc(t('photosTitle'))}</h3>
          <p class="muted small" style="margin-top:0">${esc(t(auth ? 'photosHint' : 'photoNeedLogin'))}</p>
          ${auth ? `<div class="photo-pair">${photoSlot(p, 'before')}${photoSlot(p, 'after')}</div>` : ''}
        </section>
        <section class="clay card"><h3 class="section-title">${esc(t('projectHabits'))}</h3>
          ${s.hs.length ? s.hs.map(h => { const r = rate(h, 30); return `<div class="factor" style="--h:${hColor(h)}"><span>${esc(h.icon)} ${esc(h.name)}</span><b>${r == null ? '—' : Math.round(r * 100) + '%'}</b><div class="bar ${r ? '' : 'zero'}"><i style="width:${Math.round((r || 0) * 100)}%;background:var(--h)"></i></div></div>`; }).join('') : `<p class="muted small" style="margin:0">${esc(t('probNoHabits'))}</p>`}
        </section>
      </div>`;
      $('#pd', wref).innerHTML = body;
      loadPhotos(wref);
    };
    openModal({
      title: `${esc(p.icon || '🎯')} ${esc(p.name)}`,
      cls: 'wide',
      body: '<div id="pd"></div>',
      foot: `<button class="btn" data-pd="delete">${ico('trash')} ${esc(t('delete'))}</button><button class="btn" data-pd="edit">${ico('edit')} ${esc(t('edit'))}</button>`,
      onMount: w => {
        wref = w; draw();
        w.addEventListener('input', e => {
          if (e.target.id !== 'pd-sim') return;
          const v = +e.target.value;
          $('#pd-simlabel', w).textContent = t('probSim', { n: v });
          $('#pd-simres', w).textContent = '→ ' + t('probSimResult', { n: projectStats(p, v / 100).P });
        });
        w.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'pd-val') { e.preventDefault(); $('[data-pd="log"]', w).click(); } });
        w.addEventListener('change', async e => {
          const kind = e.target.dataset && e.target.dataset.photoUp; if (!kind || !e.target.files[0]) return;
          try { toast(t('photoUploading')); await uploadPhoto(p, kind, e.target.files[0]); toast(t('photoSaved')); draw(); if (state.ui.tab === 'projects') render(); }
          catch (err) { toast(t('photoError', { e: err.message })); }
        });
        maybeAfterPhoto(p);
      },
      onClick: async (e, close, w) => {
        const ms = e.target.closest('[data-ms-toggle]');
        if (ms) { const m = p.milestones.find(x => x.id === ms.dataset.msToggle); if (m) { m.done = ms.checked; m.doneAt = m.done ? todayKey() : null; save(); draw(); } return; }
        const el = e.target.closest('[data-pd],[data-pd-item]'); if (!el) return;
        const g = p.goal;
        if (el.dataset.pdItem) { const it = g.items.find(i => i.id === el.dataset.pdItem); if (it) { it.done = el.checked; it.doneAt = it.done ? todayKey() : null; } }
        else switch (el.dataset.pd) {
          case 'log': {
            const v = parseFloat($('#pd-val', w).value); if (isNaN(v)) return;
            const d = todayKey(); g.entries = g.entries.filter(x => x.d !== d); g.entries.push({ d, v }); g.entries.sort((a, b) => a.d < b.d ? -1 : 1);
            vibrate(10); break;
          }
          case 'del-entry': g.entries = g.entries.filter(x => x.d !== el.dataset.d); break;
          case 'achieve': g.achieved = !g.achieved; break;
          case 'edit': close(); openProjectEditor(p); return;
          case 'delete':
            if (await confirmDialog(t('deleteProjectQ', { name: p.name }))) { state.projects = state.projects.filter(x => x !== p); save(); close(); render(); toast(t('deleted')); }
            return;
          default: return;
        }
        save(); draw(); if (state.ui.tab === 'projects') { $('#main').innerHTML = renderView(); loadPhotos($('#main')); }
        maybeAfterPhoto(p);
      }
    });
  }

  /* ---------- GRÁFICOS ---------- */
  // Ancho lógico del SVG ≈ ancho real en pantalla, para que el texto no encoja en el móvil
  const chartW = () => window.innerWidth < 700 ? Math.max(280, Math.round(window.innerWidth - 64)) : 640;

  // Línea con área, retícula discreta y capa de hover (cruceta + tooltip)
  function lineChart(pts, o = {}) {
    if (!pts.length) return '';
    const W = chartW(), H = o.h || (W < 500 ? 200 : 220), pl = 38, pr = 12, pt = 14, pb = 28, iw = W - pl - pr, ih = H - pt - pb;
    const color = o.color || 'var(--accent)';
    const vals = pts.map(p => p.v).filter(v => v != null);
    let lo, hi;
    if (o.min != null && o.max != null) { lo = o.min; hi = o.max; }
    else {
      const all = o.target != null ? [...vals, o.target] : vals;
      lo = Math.min(...all); hi = Math.max(...all);
      if (lo === hi) { lo -= 1; hi += 1; }
      const padv = (hi - lo) * .12; lo -= padv; hi += padv;
    }
    const x = i => pl + (pts.length === 1 ? iw / 2 : i * iw / (pts.length - 1));
    const y = v => pt + ih - (v - lo) / (hi - lo) * ih;
    const fmt = o.fmt || (v => Math.round(v));
    let line = '', area = '', seg = [];
    const flush = () => { if (!seg.length) return; line += 'M' + seg.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join('L'); area += `M${seg[0][0].toFixed(1)},${pt + ih}L` + seg.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join('L') + `L${seg[seg.length - 1][0].toFixed(1)},${pt + ih}Z`; seg = []; };
    pts.forEach((p, i) => { if (p.v == null) flush(); else seg.push([x(i), y(p.v)]); });
    flush();
    const gid = 'g' + uid();
    const ticks = [lo, (lo + hi) / 2, hi];
    const nl = Math.min(pts.length, 5);
    const labelIdx = nl <= 1 ? [0] : [...new Set(Array.from({ length: nl }, (_, i) => Math.round(i * (pts.length - 1) / (nl - 1))))];
    const colW = iw / Math.max(1, pts.length - (pts.length > 1 ? 1 : 0));
    const markers = o.markers || pts.length <= 31;
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || '')}">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".32"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
      ${ticks.map(v => `<line class="grid-line" x1="${pl}" x2="${W - pr}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="axis-label" x="${pl - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${esc(fmt(v))}</text>`).join('')}
      ${o.target != null ? `<line x1="${pl}" x2="${W - pr}" y1="${y(o.target).toFixed(1)}" y2="${y(o.target).toFixed(1)}" stroke="var(--fg)" stroke-opacity=".55" stroke-width="1.5" stroke-dasharray="5 5"/>` : ''}
      <path d="${area}" fill="url(#${gid})"/>
      <path d="${line}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${markers ? pts.map((p, i) => p.v == null ? '' : `<circle cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="4" fill="${color}" stroke="var(--surface)" stroke-width="2"/>`).join('') : ''}
      ${labelIdx.map(i => `<text class="axis-label" x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="${i === 0 && pts.length > 1 ? 'start' : i === pts.length - 1 && pts.length > 1 ? 'end' : 'middle'}">${esc(pts[i].label)}</text>`).join('')}
      <line class="xhair" x1="0" x2="0" y1="${pt}" y2="${pt + ih}" stroke="var(--fg)" stroke-opacity=".35" stroke-width="1" style="display:none"/>
      <circle class="xdot" r="6" fill="${color}" stroke="var(--fg)" stroke-width="2" style="display:none"/>
      ${pts.map((p, i) => p.v == null ? '' : `<rect class="hit" x="${(x(i) - colW / 2).toFixed(1)}" y="${pt}" width="${colW.toFixed(1)}" height="${ih}" data-tip="${esc(p.tip ?? fmt(p.v))}" data-sub="${esc(p.sub ?? p.label)}" data-cx="${x(i).toFixed(1)}" data-cy="${y(p.v).toFixed(1)}"/>`).join('')}
    </svg></div>`;
  }

  // Barras finas con extremos redondeados anclados a la base
  function barChart(pts, o = {}) {
    if (!pts.length) return '';
    const W = chartW(), H = o.h || (W < 500 ? 200 : 220), pl = 38, pr = 12, pt = 14, pb = 28, iw = W - pl - pr, ih = H - pt - pb;
    const color = o.color || 'var(--accent)';
    const hi = Math.max(o.max || 0, ...pts.map(p => p.v), 1);
    const n = pts.length, slot = iw / n, bw = Math.max(2, Math.min(36, slot * .62));
    const y = v => pt + ih - v / hi * ih;
    const fmt = o.fmt || (v => Math.round(v));
    const ticks = [0, hi / 2, hi];
    const nl = n <= 12 ? n : 6, labelIdx = [...new Set(Array.from({ length: nl }, (_, i) => Math.round(i * (n - 1) / Math.max(1, nl - 1))))];
    const bar = (cx, v) => {
      if (v <= 0) return '';
      const x0 = cx - bw / 2, top = y(v), base = pt + ih, r = Math.min(4, bw / 2, base - top);
      return `<path d="M${x0.toFixed(1)},${base}V${(top + r).toFixed(1)}Q${x0.toFixed(1)},${top.toFixed(1)} ${(x0 + r).toFixed(1)},${top.toFixed(1)}H${(x0 + bw - r).toFixed(1)}Q${(x0 + bw).toFixed(1)},${top.toFixed(1)} ${(x0 + bw).toFixed(1)},${(top + r).toFixed(1)}V${base}Z" fill="${color}"/>`;
    };
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || '')}">
      ${ticks.map(v => `<line class="grid-line" x1="${pl}" x2="${W - pr}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="axis-label" x="${pl - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${esc(fmt(v))}</text>`).join('')}
      ${pts.map((p, i) => bar(pl + slot * (i + .5), p.v)).join('')}
      ${labelIdx.map(i => `<text class="axis-label" x="${(pl + slot * (i + .5)).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(pts[i].label)}</text>`).join('')}
      ${pts.map((p, i) => `<rect class="hit" x="${(pl + slot * i).toFixed(1)}" y="${pt}" width="${slot.toFixed(1)}" height="${ih}" data-tip="${esc(p.tip ?? fmt(p.v))}" data-sub="${esc(p.sub ?? p.label)}" data-cx="${(pl + slot * (i + .5)).toFixed(1)}" data-cy="${y(Math.max(0, p.v)).toFixed(1)}"/>`).join('')}
    </svg></div>`;
  }

  function viewCharts() {
    let html = topBar() + `<h1 class="page-title">${esc(t('tabCharts'))}</h1>`;
    const active = state.habits.filter(h => !h.archived);
    const anyLogs = state.habits.some(h => Object.keys(state.logs[h.id] || {}).length);
    if (!state.habits.length || !anyLogs) {
      return html + emptyState('chart', t('tabCharts'), t('chartsEmpty'), state.habits.length ? `<button class="btn primary" data-act="go" data-tab="habits">${ico('checklist')} ${esc(t('tabHabits'))}</button>` : `<button class="btn primary" data-act="habit-new">${ico('plus')} ${esc(t('addHabit'))}</button>`);
    }
    if (state.ui.chartHabit !== 'all' && !getHabit(state.ui.chartHabit)) state.ui.chartHabit = 'all';
    const single = state.ui.chartHabit !== 'all' ? getHabit(state.ui.chartHabit) : null;
    const H = single ? [single] : active;
    const today = todayKey();
    const minFirst = H.reduce((m, h) => { const f = firstKey(h); return f < m ? f : m; }, today);
    const n = state.ui.range === 'all' ? Math.max(7, diffDays(minFirst, today) + 1) : state.ui.range;
    const from = addDays(today, -(n - 1));
    const color = single ? hColor(single) : 'var(--accent)';

    // filtros (una fila, encima de los gráficos)
    html += `<div class="filters">
      <div class="seg" role="group" aria-label="${esc(t('rangeLabel'))}">${[[7, 'range7'], [30, 'range30'], [90, 'range90'], [365, 'range365'], ['all', 'rangeAll']].map(([v, k]) => `<button data-act="range" data-v="${v}" class="${String(state.ui.range) === String(v) ? 'on' : ''}">${esc(t(k))}</button>`).join('')}</div>
      <select class="input" id="chart-habit" aria-label="${esc(t('colHabit'))}"><option value="all">${esc(t('allHabits'))}</option>${state.habits.map(h => `<option value="${h.id}" ${single === h ? 'selected' : ''}>${esc(h.icon)} ${esc(h.name)}</option>`).join('')}</select>
      <button class="btn" data-act="report">📄 ${esc(t('reportTitle'))}</button>
    </div>`;

    // KPIs
    const rates = H.map(h => rate(h, n)).filter(r => r != null);
    const avgRate = rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length * 100) : null;
    const curS = Math.max(0, ...H.map(currentStreak)), bestS = Math.max(0, ...H.map(bestStreak));
    const total = H.reduce((a, h) => a + totalEntries(h, from, today), 0);
    const activeDays = new Set(); H.forEach(h => { if (isQuit(h)) return; const L = state.logs[h.id] || {}; for (const k in L) if (k >= from && k <= today && L[k] > 0) activeDays.add(k); });
    const kpi = (v, label) => `<div class="kpi clay"><b>${v}</b><span>${esc(label)}</span></div>`;
    html += `<div class="kpis">${kpi(avgRate == null ? '—' : avgRate + '%', t('kpiRate'))}${kpi(curS, t('kpiStreak'))}${kpi(bestS, t('kpiBest'))}${kpi(total, t('kpiTotal'))}${kpi(activeDays.size, t('kpiActiveDays'))}${kpi(H.length, t('kpiHabits'))}</div>`;

    const days = []; for (let i = 0; i < n; i++) days.push(addDays(from, i));
    const dShort = k => fmtDate(k, { day: 'numeric', month: 'short' });
    const cards = [];

    // 1) cumplimiento diario (hábitos diarios) o por período (si el hábito elegido es semanal/mensual)
    const D = H.filter(h => h.freq === 'daily');
    if (D.length) {
      const pts = days.map(k => {
        const sc = D.map(h => dayScore(h, k)).filter(v => v != null);
        if (!sc.length) return { label: dShort(k), v: null };
        const v = sc.reduce((a, b) => a + b, 0) / sc.length * 100;
        return { label: dShort(k), v, tip: Math.round(v) + '%', sub: fmtDate(k) };
      });
      cards.push(`<section class="chart-card clay"><h3>${ico('sparkle')}<span class="grow">${esc(t('chartDaily'))}</span></h3>${lineChart(pts, { min: 0, max: 100, color, fmt: v => Math.round(v) + '%', aria: t('chartDaily') })}</section>`);
    } else if (single) {
      const ps = periodsBetween(single, from, today);
      const pts = ps.map(p => { const v = Math.min(1, periodSum(single, p) / single.target) * 100; return { label: single.freq === 'monthly' ? fmtDate(p, { month: 'short' }) : dShort(p), v, tip: `${periodSum(single, p)}/${single.target}`, sub: fmtDate(p) }; });
      cards.push(`<section class="chart-card clay"><h3>${ico('sparkle')}<span class="grow">${esc(t('chartPeriodRate'))}</span></h3>${lineChart(pts, { min: 0, max: 100, color, fmt: v => Math.round(v) + '%' })}</section>`);
    }

    // 2) registros por día / semana / mes
    {
      const mode = n <= 31 ? 'day' : n <= 200 ? 'week' : 'month';
      const buckets = new Map();
      days.forEach(k => { const b = mode === 'day' ? k : mode === 'week' ? weekStart(k) : monthKey(k) + '-01'; buckets.set(b, (buckets.get(b) || 0) + H.reduce((a, h) => a + (isQuit(h) ? 0 : cnt(h, k)), 0)); });
      const pts = [...buckets].map(([k, v]) => ({ label: mode === 'month' ? fmtDate(k, { month: 'short' }) : dShort(k), v, tip: String(v), sub: mode === 'month' ? fmtDate(k, { month: 'long', year: 'numeric' }) : fmtDate(k) }));
      const unit = mode === 'day' ? t('periodDay') : mode === 'week' ? t('periodWeek') : t('periodMonth');
      cards.push(`<section class="chart-card clay"><h3>${ico('chart')}<span class="grow">${esc(t('chartEntries', { unit }))}</span></h3>${barChart(pts, { color })}</section>`);
    }

    // 3) por día de la semana
    if (D.length) {
      const wd = t('weekdaysShort').split(',');
      const opp = Array(7).fill(0), ok = Array(7).fill(0);
      days.forEach(k => { const i = wdOf(k); D.forEach(h => { const s = dayScore(h, k); if (s != null) { opp[i]++; if (s >= 1) ok[i]++; } }); });
      const pts = wd.map((l, i) => { const v = opp[i] ? ok[i] / opp[i] * 100 : 0; return { label: l, v, tip: Math.round(v) + '%', sub: `${ok[i]}/${opp[i]}` }; });
      cards.push(`<section class="chart-card clay"><h3>${ico('calendar')}<span class="grow">${esc(t('chartWeekday'))}</span></h3>${barChart(pts, { color, max: 100, fmt: v => Math.round(v) + '%' })}</section>`);
    }

    // 4) mapa de constancia (último año) — secuencial de un solo tono
    {
      const startW = weekStart(addDays(today, -364)); const weeks = diffDays(startW, weekStart(today)) / 7 + 1;
      const base = T.surfaceHex, hue = single ? hColor(single) : state.theme.accent;
      const lv = [mix(base, hue, .1), mix(base, hue, .32), mix(base, hue, .55), mix(base, hue, .78), hue];
      let cells = '';
      for (let w = 0; w < weeks; w++) for (let d = 0; d < 7; d++) {
        const k = addDays(startW, w * 7 + d);
        if (k > today) { cells += '<i style="visibility:hidden"></i>'; continue; }
        const sc = H.map(h => dayScore(h, k)).filter(x => x != null);
        const v = sc.length ? sc.reduce((a, b) => a + b, 0) / sc.length : 0;
        const li = v <= 0 ? 0 : v < .34 ? 1 : v < .67 ? 2 : v < 1 ? 3 : 4;
        cells += `<i style="background:${lv[li]}" data-tip="${Math.round(v * 100)}%" data-sub="${esc(fmtDate(k))}"></i>`;
      }
      cards.push(`<section class="chart-card clay"><h3>${ico('calendar')}<span class="grow">${esc(t('chartHeatmap'))}</span></h3><div class="chart"><div class="heat-wrap" id="heat-wrap"><div class="heat">${cells}</div></div></div><div class="heat-legend">${esc(t('less'))} ${lv.map(c => `<i style="background:${c}"></i>`).join('')} ${esc(t('more'))}</div></section>`);
    }
    // energía diaria (1–5)
    if (days.some(k => state.energy[k])) {
      const pts = days.map(k => ({ label: dShort(k), v: state.energy[k] || null, tip: state.energy[k] ? `${ENERGY[state.energy[k] - 1]} ${state.energy[k]}/5` : '', sub: fmtDate(k) }));
      cards.push(`<section class="chart-card clay"><h3>⚡<span class="grow">${esc(t('chartEnergy'))}</span></h3>${lineChart(pts, { min: 1, max: 5, color: '#f7c948', fmt: v => fmtNum(v) })}</section>`);
    }
    html += `<div class="chart-grid">${cards.join('')}</div>`;

    // descubrimientos y revisiones semanales
    const ins = insightsList();
    const revs = Object.entries(state.reviews).sort((a, b) => a[0] < b[0] ? 1 : -1).slice(0, 6);
    html += `<div class="chart-grid" style="margin-top:18px">
      <section class="chart-card clay"><h3>💡<span class="grow">${esc(t('insightsTitle'))}</span></h3>
        ${ins.length ? ins.map(i => `<div class="insight"><span>${i.icon}</span><span>${esc(i.text)}</span></div>`).join('') : `<p class="muted small" style="margin:0">${esc(t('insightsEmpty'))}</p>`}</section>
      <section class="chart-card clay"><h3>📝<span class="grow">${esc(t('reviewsTitle'))}</span><button class="chip" data-act="review-now">${ico('plus')} ${esc(t('reviewNow'))}</button></h3>
        ${revs.length ? revs.map(([w, v]) => `<button class="review-row" data-act="review-open" data-v="${w}"><b>${esc(fmtDate(w, { day: 'numeric', month: 'short' }))} – ${esc(fmtDate(addDays(w, 6), { day: 'numeric', month: 'short' }))}</b><span class="muted small">${esc((v.good || v.adjust || '').slice(0, 80))}</span><span class="rv-score">${v.score}/10</span></button>`).join('') : `<p class="muted small" style="margin:0">${esc(t('reviewsEmpty'))}</p>`}</section>
    </div>`;

    // 5) tabla por hábito
    const rows = (single ? [single] : state.habits.filter(h => !h.archived)).map(h => {
      const r7 = rate(h, 7), r30 = rate(h, 30), u = unlockedCount(h);
      return `<tr style="--h:${hColor(h)}"><td><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--h);margin-right:8px"></span>${esc(h.icon)} ${esc(h.name)}</td>
        <td>${isQuit(h) ? esc(t('kindQuit')) : esc(t(h.freq === 'daily' ? 'freqDaily' : h.freq === 'weekly' ? 'freqWeekly' : 'freqMonthly')) + (h.target > 1 ? ' ×' + h.target : '')}</td>
        <td class="num">${r7 == null ? '—' : Math.round(r7 * 100) + '%'}</td><td class="num">${r30 == null ? '—' : Math.round(r30 * 100) + '%'}</td>
        <td class="num">${totalEntries(h)}</td><td class="num">${currentStreak(h)}</td><td class="num">${bestStreak(h)}</td>
        <td>${u ? esc(t('rank_' + RANKS[u - 1][0])) : '—'}</td></tr>`;
    }).join('');
    html += `<section class="chart-card clay" style="margin-top:18px"><h3>${ico('table')}<span class="grow">${esc(t('chartTable'))}</span></h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${esc(t('colHabit'))}</th><th>${esc(t('colFreq'))}</th><th class="num">${esc(t('col7'))}</th><th class="num">${esc(t('col30'))}</th><th class="num">${esc(t('colTotal'))}</th><th class="num">${esc(t('colStreak'))}</th><th class="num">${esc(t('colBest'))}</th><th>${esc(t('colRank'))}</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;

    // 6) proyectos numéricos
    const np = state.projects.filter(p => p.goal.type === 'numeric' && p.goal.entries.length);
    if (np.length) {
      html += `<h2 class="section-title" style="margin:26px 0 14px;font-size:22px">${esc(t('chartProjects'))}</h2><div class="chart-grid">${np.map(p => {
        const g = p.goal; const pts = [{ k: p.createdAt, v: g.start }, ...g.entries.map(e => ({ k: e.d, v: e.v }))].map(e => ({ label: dShort(e.k), v: e.v, tip: `${fmtNum(e.v)} ${g.unit}`, sub: fmtDate(e.k) }));
        return `<section class="chart-card clay"><h3>${esc(p.icon)} <span class="grow">${esc(p.name)}</span><span class="muted small">${esc(t('goal'))}: ${fmtNum(g.target)} ${esc(g.unit)}</span></h3>${lineChart(pts, { target: g.target, fmt: v => fmtNum(v), markers: true })}</section>`;
      }).join('')}</div>`;
    }
    return html;
  }

  /* ---------- tooltip de gráficos ---------- */
  function hideTip() {
    $$('.chart .tip').forEach(tp => { tp.style.display = 'none'; });
    $$('.chart .xhair, .chart .xdot').forEach(el => { el.style.display = 'none'; });
  }
  function showTip(box, el) {
    let tip = box.querySelector(':scope > .tip');
    if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; box.appendChild(tip); }
    tip.innerHTML = `${esc(el.dataset.tip)}${el.dataset.sub ? `<small>${esc(el.dataset.sub)}</small>` : ''}`;
    let x, y;
    if (el.dataset.cx) {
      const svg = el.ownerSVGElement; const vb = svg.viewBox.baseVal;
      const sx = svg.clientWidth / vb.width, sy = svg.clientHeight / vb.height;
      x = +el.dataset.cx * sx; y = +el.dataset.cy * sy;
      const xh = svg.querySelector('.xhair'), xd = svg.querySelector('.xdot');
      $$('.xhair, .xdot', box).forEach(n => { n.style.display = 'none'; });
      if (xh) { xh.setAttribute('x1', el.dataset.cx); xh.setAttribute('x2', el.dataset.cx); xh.style.display = ''; }
      if (xd) { xd.setAttribute('cx', el.dataset.cx); xd.setAttribute('cy', el.dataset.cy); xd.style.display = ''; }
    } else {
      const r = el.getBoundingClientRect(), c = box.getBoundingClientRect();
      x = r.left + r.width / 2 - c.left; y = r.top - c.top;
    }
    tip.style.display = 'block';
    const half = tip.offsetWidth / 2 + 4;
    tip.style.left = clamp(x, half, Math.max(half, box.clientWidth - half)) + 'px';
    tip.style.top = y + 'px';
  }

  /* ---------- MAESTRÍAS ---------- */
  // Caja de texto de una carta en px del diseño (la usan el HTML y la exportación a imagen)
  function textBox(spec, text, kind, o = {}) {
    const [tp, l, w, h, fs] = spec;
    let W = Math.max(w, o.min || 0), HH = h * 1.5, size;
    const str = String(text), len = Math.max(1, str.length);
    const longest = Math.max(1, ...str.split(/\s+/).map(s => s.length));
    if (kind === 'name') {
      // Máximo 2 líneas; ninguna palabra se parte
      W = Math.max(w, 640); HH = Math.max(h, 230);
      const em = .86; // ancho medio de una mayúscula con serifa
      size = Math.min(fs, (2 * W) / (em * len * 1.12), W / (em * longest));
    } else {
      size = Math.min(fs, W / (.74 * len));
    }
    return { cx: l + w / 2, cy: tp + h / 2, W, HH, size };
  }
  function cardFields(h, i, side) {
    const [r, th] = RANKS[i], L = CARD_LAYOUT[r];
    const m = (state.mastery[h.id] || {})[r] || { date: todayKey(), serial: 0 };
    if (side !== 'front') return [{ spec: L.back, text: h.name, o: { min: 460 } }];
    return [
      { spec: L.name, text: h.name, kind: 'name' },
      { spec: L.level, text: t('masteryLevel', { n: i + 1 }), o: { min: 200 } },
      { spec: L.desc, text: t('tag_' + r), o: { min: 620 } },
      { spec: L.req, text: isQuit(h) ? t('quitDays', { n: th }) : t('masteryReq', { n: th }), o: { min: 620 } },
      { spec: L.date, text: fmtShort(m.date), o: { min: 220 } },
      { spec: L.serial, text: t('masterySerial', { n: String(m.serial).padStart(4, '0') }), o: { min: 250 } }
    ];
  }
  function ktxt(f) {
    const b = textBox(f.spec, f.text, f.kind, f.o);
    return `<div class="ktxt${f.kind === 'name' ? ' name' : ''}" style="left:${(b.cx / CARD_W * 100).toFixed(2)}%;top:${(b.cy / CARD_H * 100).toFixed(2)}%;width:${(b.W / CARD_W * 100).toFixed(2)}%;height:${(b.HH / CARD_H * 100).toFixed(2)}%;font-size:${(b.size / CARD_W * 100).toFixed(2)}cqw;color:${f.spec[5]}">${esc(f.text)}</div>`;
  }
  function cardFace(h, i, side, cls = '') {
    const r = RANKS[i][0];
    return `<div class="kcard ${cls}"><div class="kcard-face" style="background-image:url('cards/${r}-${side}.jpg')">${cardFields(h, i, side).map(ktxt).join('')}</div></div>`;
  }
  function cardLocked(i) {
    const [r, th] = RANKS[i];
    return `<div class="kcard locked"><div class="kcard-face" style="background-image:url('cards/${r}-back.jpg')"></div><div class="lock"><div>${ico('lock')}<span>${th}</span></div></div></div>`;
  }

  function viewMastery() {
    let html = topBar(`<button class="icon-btn" data-act="ranks-info" aria-label="${esc(t('masteryRanks'))}">${ico('info')}</button>`);
    html += `<h1 class="page-title">${esc(t('tabMastery'))}</h1>`;
    const hs = state.habits.filter(h => !h.archived || unlockedCount(h));
    if (!hs.length) return html + emptyState('crown', t('tabMastery'), t('masteryEmpty'), `<button class="btn primary" data-act="habit-new">${ico('plus')} ${esc(t('addHabit'))}</button>`);
    const got = hs.reduce((a, h) => a + unlockedCount(h), 0);
    const lv = levelInfo(), pi = pointsInfo();
    html += `<button class="mastery-sum clay level-card" data-act="level"><div class="lvl-big">${lv.level}</div><div class="grow"><b>${esc(lv.title)}</b><div class="muted small">${esc(t('lvXp', { a: fmtNum(lv.xp), b: fmtNum(lv.to) }))} · ${fmtNum(pi.balance)} ⭐</div><div class="bar" style="margin-top:8px;height:8px"><i style="width:${lv.pct}%"></i></div></div><span class="chip">${ico('gift')} ${esc(t('rewardsTitle'))}</span></button>`;
    html += `<div class="mastery-sum clay"><div class="empty-art" style="width:64px;height:64px;margin:0;border-radius:20px">${ico('crown')}</div><div class="grow"><b>${esc(t('masteryCollected', { a: got, b: hs.length * RANKS.length }))}</b><div class="muted small">${esc(t('masteryHow'))}</div></div></div>`;
    // Cartas secretas (ocultas hasta conseguirlas)
    const nSec = SECRETS.filter(([id]) => state.secrets[id]).length;
    html += `<section class="series clay"><div class="series-head"><div class="habit-ico" style="width:46px;height:46px;font-size:22px;--h-soft:var(--surface-2)">🔮</div><div class="grow"><h3>${esc(t('secretCards'))}</h3><div class="muted small">${esc(t('secretCardsHint'))}</div></div><b style="font-size:20px">${nSec}/${SECRETS.length}</b></div>
      <div class="cards-row">${SECRETS.map(([id, icon]) => `<button class="kcard-btn" data-act="secret-open" data-id="${id}">${secretCardHtml(id, icon)}<span class="cap">${state.secrets[id] ? esc(t('sec_' + id)) : '???'}</span></button>`).join('')}</div></section>`;
    if (state.challengeCards.length) {
      html += `<section class="series clay"><div class="series-head"><div class="habit-ico" style="width:46px;height:46px;font-size:22px;--h-soft:var(--surface-2)">🏁</div><div class="grow"><h3>${esc(t('challengeCards'))}</h3></div><b style="font-size:20px">${state.challengeCards.length}</b></div>
        <div class="cards-row">${[...state.challengeCards].reverse().map(c => `<button class="kcard-btn" data-act="chal-open" data-id="${c.id}">${challengeCardHtml(c)}<span class="cap">${esc(c.name)}<small>${esc(fmtShort(c.end))}</small></span></button>`).join('')}</div></section>`;
    }
    if (state.contractCards.length) {
      html += `<section class="series clay"><div class="series-head"><div class="habit-ico" style="width:46px;height:46px;font-size:22px;--h-soft:var(--surface-2)">📜</div><div class="grow"><h3>${esc(t('contractCards'))}</h3></div><b style="font-size:20px">${state.contractCards.length}</b></div>
        <div class="cards-row">${[...state.contractCards].reverse().map(cc => `<button class="kcard-btn" data-act="cc-open" data-id="${cc.id}">${contractCardHtml(cc)}<span class="cap">${esc(t('tier_' + cc.tier))}<small>${esc(fmtShort(cc.end))}</small></span></button>`).join('')}</div></section>`;
    }
    hs.forEach(h => {
      const n = successDays(h), u = unlockedCount(h);
      const next = RANKS[u], prevTh = u ? RANKS[u - 1][1] : 0;
      const pct = next ? (n - prevTh) / (next[1] - prevTh) * 100 : 100;
      html += `<section class="series clay" style="${habitVars(hColor(h))}">
        <div class="series-head"><div class="habit-ico" style="width:46px;height:46px;font-size:22px">${esc(h.icon || '#')}</div>
          <div class="grow"><h3>${esc(h.name)}</h3><div class="muted small" style="font-weight:700">${esc(next ? t('masteryNext', { a: n, b: next[1], rank: t('rank_' + next[0]) }) : t('masteryMax'))}</div>
          <div class="bar ${pct > 0 ? '' : 'zero'}" style="height:8px;margin-top:6px;max-width:320px"><i style="width:${clamp(pct, 0, 100)}%;background:var(--h)"></i></div></div>
          <b style="font-size:20px">${u}/10</b></div>
        <div class="cards-row">${RANKS.map(([r, th], i) => {
          const un = n >= th; const m = (state.mastery[h.id] || {})[r];
          return `<button class="kcard-btn" data-act="card-open" data-id="${h.id}" data-i="${i}" aria-label="${esc(t('rank_' + r))}">${un ? cardFace(h, i, 'front') : cardLocked(i)}<span class="cap">${esc(t('rank_' + r))}<small>${un ? esc(fmtShort(m ? m.date : todayKey())) : esc(t('masteryReq', { n: th }))}</small></span></button>`;
        }).join('')}</div>
      </section>`;
    });
    return html;
  }

  function openCard(h, i, celebrate = false) {
    const [r, th] = RANKS[i];
    const un = successDays(h) >= th;
    const m = (state.mastery[h.id] || {})[r];
    const inner = un
      ? `<div class="flip ${celebrate ? 'unlock-burst' : ''}" id="flip"><div class="flip-inner">${cardFace(h, i, 'front')}${cardFace(h, i, 'back', 'rev')}</div></div>`
      : `<div class="flip" style="cursor:default"><div class="flip-inner">${cardLocked(i)}</div></div>`;
    const cap = `<div class="card-view-cap">${celebrate ? `<div style="font-size:22px;font-weight:900;margin-bottom:4px">${esc(t('masteryUnlocked'))}</div>` : ''}${esc(t('rank_' + r))} · ${esc(h.name)}<small>${un ? esc((m ? fmtDate(m.date) : '') + ' · ' + t('masteryFlip')) : esc(t('masteryNext', { a: successDays(h), b: th, rank: t('rank_' + r) }))}</small></div>`;
    openModal({
      cls: 'card-view',
      body: inner + cap + `<div class="row" style="justify-content:center;margin-top:16px">${un ? `<button class="btn" data-m="share">${ico('upload')} ${esc(t('share'))}</button>` : ''}<button class="btn" data-m="x">${esc(t('close'))}</button></div>`,
      onClick: (e, close, w) => {
        if (e.target.closest('[data-m="share"]')) {
          const side = $('#flip', w).classList.contains('back') ? 'back' : 'front';
          shareCanvas(() => cardCanvas(h, i, side), `keepgoing-${r}-${side}.png`, `${t('rank_' + r)} · ${h.name}`);
          return;
        }
        const f = e.target.closest('#flip'); if (!f || f.dataset.busy) return;
        const inner = f.querySelector('.flip-inner');
        f.dataset.busy = '1'; f.classList.remove('unlock-burst'); vibrate(6);
        inner.classList.add('half');
        setTimeout(() => { f.classList.toggle('back'); inner.classList.remove('half'); setTimeout(() => { delete f.dataset.busy; }, 230); }, 220);
      }
    });
  }
  function showUnlock(h, i) { if (state.ui.tab === 'mastery') render(); whenFree(() => { vibrate([20, 40, 20]); openCard(h, i, true); }); }

  /* ---------- exportar cartas como imagen ---------- */
  const loadImg = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
  function wrapLines(ctx, text, maxW, maxLines) {
    const lines = []; let cur = '';
    for (const w of text.split(/\s+/)) {
      const test = cur ? cur + ' ' + w : w;
      if (!cur || ctx.measureText(test).width <= maxW) cur = test; else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines.slice(0, maxLines);
  }
  async function fontsReady() { try { await Promise.all([document.fonts.load('700 60px Cinzel'), document.fonts.load('500 60px Cinzel')]); } catch (e) { /* sin fuentes web: usa la serif del sistema */ } }
  async function cardCanvas(h, i, side) {
    const r = RANKS[i][0];
    const [img] = await Promise.all([loadImg(`cards/${r}-${side}.jpg`), fontsReady()]);
    const cv = document.createElement('canvas'); cv.width = CARD_W; cv.height = CARD_H;
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0, CARD_W, CARD_H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const f of cardFields(h, i, side)) {
      const b = textBox(f.spec, f.text, f.kind, f.o);
      ctx.fillStyle = f.spec[5];
      ctx.font = `${f.kind === 'name' ? 700 : 500} ${b.size}px Cinzel, "Times New Roman", Georgia, serif`;
      if ('letterSpacing' in ctx) ctx.letterSpacing = (b.size * .03).toFixed(1) + 'px';
      const lines = wrapLines(ctx, String(f.text).toUpperCase(), b.W, f.kind === 'name' ? 2 : 1);
      const lh = b.size * 1.06, y0 = b.cy - (lines.length - 1) * lh / 2;
      lines.forEach((ln, j) => ctx.fillText(ln, b.cx, y0 + j * lh));
    }
    return cv;
  }
  // Comparte (hoja de compartir del móvil: «Guardar imagen») o descarga el PNG
  async function shareCanvas(make, filename, title) {
    let blob;
    try {
      const cv = await make();
      blob = await new Promise((res, rej) => { try { cv.toBlob(b => b ? res(b) : rej(new Error('blob')), 'image/png'); } catch (err) { rej(err); } });
    } catch (err) { toast(t('shareWebOnly')); return; }
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title }); return; } catch (err) { if (err.name === 'AbortError') return; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    toast(t('saveImage'));
  }

  /* ---------- carta «Contrato cumplido» ---------- */
  const TIER_COLORS = { oro: ['#e8c26a', '#3a2a0c'], plata: ['#d6dde6', '#1f2833'], bronce: ['#d99060', '#3a1f12'] };
  // Al terminar el mes de contrato se entrega una carta con el resumen de ese mes (una sola vez)
  function awardContract() {
    const c = state.contract;
    if (!c || diffDays(todayKey(), c.endsAt) >= 0) return null;
    const id = c.signedAt + '_' + c.endsAt;
    if (state.contractCards.some(x => x.id === id)) return null;
    const s = c.signedAt, e = c.endsAt, n = diffDays(s, e) + 1;
    const hs = state.habits.filter(h => firstKey(h) <= e);
    const rates = hs.map(h => rate(h, n, e)).filter(r => r != null);
    const pct = rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length * 100) : null;
    let entries = 0; const act = new Set();
    hs.forEach(h => { if (isQuit(h)) return; const L = state.logs[h.id] || {}; for (const k in L) if (k >= s && k <= e && L[k] > 0) { entries += L[k]; act.add(k); } });
    let cards = 0; Object.values(state.mastery).forEach(m => Object.values(m).forEach(x => { if (x.date >= s && x.date <= e) cards++; }));
    const tier = pct == null ? 'bronce' : pct >= 80 ? 'oro' : pct >= 60 ? 'plata' : 'bronce';
    const cc = { id, start: s, end: e, name: c.name, rate: pct, entries, activeDays: act.size, cards, tier, serial: ++state.serial, date: todayKey() };
    state.contractCards.push(cc); save();
    return cc;
  }
  function contractCardHtml(cc) {
    const [tc, t2] = TIER_COLORS[cc.tier] || TIER_COLORS.bronce;
    return `<div class="ccard" style="--t:${tc};--t2:${t2}"><div class="cc-in">
      <div class="cc-top">KEEPGOING</div>
      <div class="cc-seal">${ico('crown')}</div>
      <div class="cc-title">${esc(t('contractDone'))}</div>
      <div class="cc-name">${esc(cc.name)}</div>
      <div class="cc-dates">${esc(fmtShort(cc.start))} – ${esc(fmtShort(cc.end))}</div>
      <div><div class="cc-big">${cc.rate == null ? '—' : cc.rate + '%'}</div><div class="cc-lbl">${esc(t('kpiRate'))}</div></div>
      <div class="cc-stats"><div><b>${cc.activeDays}</b><span>${esc(t('kpiActiveDays'))}</span></div><div><b>${cc.entries}</b><span>${esc(t('kpiTotal'))}</span></div><div><b>${cc.cards}</b><span>${esc(t('statCards'))}</span></div></div>
      <div class="cc-tier">${esc(t('tier_' + cc.tier))}</div>
      <div class="cc-serial">${esc(t('masterySerial', { n: String(cc.serial).padStart(4, '0') }))}</div>
    </div></div>`;
  }
  async function contractCanvas(cc) {
    await fontsReady();
    const [tc, t2] = TIER_COLORS[cc.tier] || TIER_COLORS.bronce;
    const W = CARD_W, H = CARD_H, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(W / 2, H * .1, 50, W / 2, H * .3, H); g.addColorStop(0, t2); g.addColorStop(.75, '#07070a'); g.addColorStop(1, '#07070a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
    ctx.strokeStyle = tc; ctx.lineWidth = 7; rr(40, 40, W - 80, H - 80, 34); ctx.stroke();
    ctx.lineWidth = 2; rr(62, 62, W - 124, H - 124, 26); ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const txt = (s, y, size, color, weight = 500, spacing = 0) => { ctx.font = `${weight} ${size}px Cinzel, "Times New Roman", Georgia, serif`; ctx.fillStyle = color; if ('letterSpacing' in ctx) ctx.letterSpacing = spacing + 'px'; ctx.fillText(s, W / 2, y); };
    txt('KEEPGOING', 150, 38, tc, 500, 14);
    // sello con corona
    const sg = ctx.createRadialGradient(W / 2 - 40, 300, 10, W / 2, 330, 130); sg.addColorStop(0, '#ffffffcc'); sg.addColorStop(.45, tc); sg.addColorStop(1, '#00000099');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(W / 2, 330, 125, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(W / 2 - 72, 330 - 78); ctx.scale(6, 6); ctx.strokeStyle = '#1a1206'; ctx.lineWidth = 2.1; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.stroke(new Path2D('M5 17.5h14l1.6-10.5-4.6 3.6L12 4.5l-4 6.1L3.4 7 5 17.5z')); ctx.stroke(new Path2D('M5 21h14')); ctx.restore();
    txt(t('contractDone').toUpperCase(), 540, 70, tc, 700, 4);
    txt(String(cc.name).toUpperCase(), 630, 52, '#ffffff', 500, 2);
    txt(`${fmtShort(cc.start)} – ${fmtShort(cc.end)}`, 700, 34, '#ffffffbb', 500, 3);
    txt(cc.rate == null ? '—' : cc.rate + '%', 880, 180, '#ffffff', 700);
    txt(t('kpiRate').toUpperCase(), 990, 32, '#ffffffbb', 500, 6);
    [[cc.activeDays, t('kpiActiveDays')], [cc.entries, t('kpiTotal')], [cc.cards, t('statCards')]].forEach(([v, l], j) => {
      const x = W / 2 + (j - 1) * 300;
      ctx.textAlign = 'center'; ctx.font = '700 66px Cinzel, Georgia, serif'; ctx.fillStyle = '#ffffff'; ctx.fillText(String(v), x, 1130);
      ctx.font = '500 26px Cinzel, Georgia, serif'; ctx.fillStyle = '#ffffffbb'; ctx.fillText(String(l).toUpperCase(), x, 1190);
    });
    ctx.fillStyle = tc; rr(W / 2 - 160, 1290, 320, 76, 38); ctx.fill();
    txt(t('tier_' + cc.tier).toUpperCase(), 1330, 42, '#14100a', 700, 8);
    txt(t('masterySerial', { n: String(cc.serial).padStart(4, '0') }), 1450, 30, '#ffffff99', 500, 4);
    return cv;
  }
  function openContractCard(cc, celebrate = false) {
    const c = state.contract, ended = c && diffDays(todayKey(), c.endsAt) < 0;
    openModal({
      cls: 'card-view',
      body: `<div class="flip ${celebrate ? 'unlock-burst' : ''}" style="cursor:default"><div class="flip-inner">${contractCardHtml(cc)}</div></div>
        <div class="card-view-cap">${celebrate ? `<div style="font-size:22px;font-weight:900;margin-bottom:4px">${esc(t('contractDone'))}!</div><small>${esc(t('contractDoneMsg'))}</small>` : `${esc(t('tier_' + cc.tier))} · ${esc(fmtDate(cc.end))}`}</div>
        <div class="row wrap" style="justify-content:center;margin-top:16px">${celebrate && ended ? `<button class="btn primary" data-m="renew">${ico('refresh')} ${esc(t('contractRenew'))}</button>` : ''}<button class="btn" data-m="share">${ico('upload')} ${esc(t('share'))}</button><button class="btn" data-m="x">${esc(t('close'))}</button></div>`,
      onClick: (e, close) => {
        if (e.target.closest('[data-m="share"]')) shareCanvas(() => contractCanvas(cc), `keepgoing-contrato-${cc.end}.png`, t('contractDone'));
        if (e.target.closest('[data-m="renew"]')) { close(); renewContract(); }
      }
    });
    if (celebrate) vibrate([20, 40, 20]);
  }

  function openRanks() {
    openModal({
      title: esc(t('masteryRanks')),
      body: `<p class="muted" style="margin-top:0">${esc(t('masteryHow'))}</p><table class="tbl rank-table"><tbody>${RANKS.map(([r, th], i) => `<tr><td>${i + 1}. ${esc(t('rank_' + r))}</td><td class="muted">${esc(t('tag_' + r))}</td><td class="num">${th}</td></tr>`).join('')}</tbody></table>`
    });
  }

  /* ---------- CONTRATO ---------- */
  function contractText(name, start, end) {
    return t('contractBody', { name: esc(name || '______'), start: esc(fmtDate(start)), end: esc(fmtDate(end)) });
  }
  function contractDoc(c) {
    return `<div class="contract clay"><h3>${esc(t('contractTitle'))}</h3><p>${contractText(c.name, c.signedAt, c.endsAt)}</p>
      <div class="sig-line"><div><div class="muted small">${esc(t('contractSigned', { date: fmtDate(c.signedAt) }))}</div>${c.renewals ? `<div class="muted small">${esc(t('contractRenewals', { n: c.renewals }))}</div>` : ''}</div>
      <div class="center">${c.sig ? `<img class="sig-img" src="${c.sig}" alt="">` : ''}<div class="sig-name">${esc(c.name)}</div></div></div></div>`;
  }
  // Formulario de firma (onboarding y modal); devuelve getters
  function contractFormHtml(name = '') {
    const s = todayKey(), e = addMonths(s, 1);
    return `<div class="contract clay" id="ct-doc"><h3>${esc(t('contractTitle'))}</h3><p id="ct-text">${contractText(name, s, e)}</p></div>
      <div class="stack" style="margin-top:18px">
        <label class="field"><span>${esc(t('contractName'))}</span><input class="input" id="ct-name" maxlength="80" autocomplete="name" value="${esc(name)}" placeholder="${esc(t('contractNamePh'))}"></label>
        <div class="field"><span>${esc(t('contractSign'))}</span><canvas class="sig-pad" id="ct-sig"></canvas><div><button type="button" class="chip" id="ct-clear">${esc(t('contractClear'))}</button></div></div>
      </div>`;
  }
  function mountContractForm(root) {
    const name = $('#ct-name', root), txt = $('#ct-text', root), cv = $('#ct-sig', root);
    const s = todayKey(), e = addMonths(s, 1);
    name.addEventListener('input', () => { txt.innerHTML = contractText(name.value.trim(), s, e); });
    let dirty = false;
    const ctx = cv.getContext('2d');
    const size = () => { const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1; cv.width = r.width * dpr; cv.height = r.height * dpr; ctx.scale(dpr, dpr); ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = state.theme.fg; };
    requestAnimationFrame(size);
    let drawing = false, last = null;
    const pos = ev => { const r = cv.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; };
    cv.addEventListener('pointerdown', ev => { drawing = true; last = pos(ev); cv.setPointerCapture(ev.pointerId); ev.preventDefault(); });
    cv.addEventListener('pointermove', ev => { if (!drawing) return; const p = pos(ev); ctx.beginPath(); ctx.moveTo(...last); ctx.lineTo(...p); ctx.stroke(); last = p; dirty = true; });
    ['pointerup', 'pointercancel'].forEach(n => cv.addEventListener(n, () => { drawing = false; }));
    $('#ct-clear', root).addEventListener('click', () => { ctx.clearRect(0, 0, cv.width, cv.height); dirty = false; });
    return { name: () => name.value.trim(), sig: () => dirty ? cv.toDataURL('image/png') : null, focus: () => name.focus() };
  }
  function signContract(name, sig) {
    const s = todayKey();
    state.contract = { name, signedAt: s, endsAt: addMonths(s, 1), sig, renewals: 0 };
    save();
  }
  function renewContract() {
    const c = state.contract; if (!c) return;
    const s = todayKey(); c.signedAt = s; c.endsAt = addMonths(s, 1); c.renewals = (c.renewals || 0) + 1;
    save(); render(); toast(t('contractRenewed', { date: fmtDate(c.endsAt) }));
  }
  function openContract() {
    const c = state.contract;
    if (!c) {
      let form;
      openModal({
        title: esc(t('setContract')), body: contractFormHtml(''),
        foot: `<button class="btn primary block" data-m="sign">${ico('doc')} ${esc(t('contractSignBtn'))}</button>`,
        onMount: w => { form = mountContractForm(w); },
        onClick: (e, close) => { if (e.target.closest('[data-m="sign"]')) { if (!form.name()) { toast(t('contractNeedName')); form.focus(); return; } signContract(form.name(), form.sig()); close(); render(); toast(t('saved')); } }
      });
      return;
    }
    const ended = diffDays(todayKey(), c.endsAt) < 0;
    openModal({
      title: esc(t('setContract')), body: contractDoc(c),
      foot: `${ended ? `<button class="btn primary" data-m="renew">${ico('refresh')} ${esc(t('contractRenew'))}</button>` : ''}<button class="btn" data-m="x">${esc(t('close'))}</button>`,
      onClick: (e, close) => { if (e.target.closest('[data-m="renew"]')) { close(); renewContract(); } }
    });
  }

  /* ---------- TEMA: editor ---------- */
  function presetName(p) { return p[state.lang] || p.es; }
  function themeEditorHtml() {
    const th = state.theme;
    const pick = (key, label) => `<label class="row" style="gap:10px"><input type="color" class="swatch-input" data-th-color="${key}" value="${th[key]}"><span class="small" style="font-weight:800">${esc(label)}</span></label>`;
    const myLevel = state.onboarded ? levelInfo().level : 0;
    return `<div class="stack" style="gap:20px">
      <div class="field"><span>${esc(t('themePresets'))}</span><div class="preset-grid">${PRESETS.map(p => {
        const bg = p.bgMode === 'gradient' ? `linear-gradient(135deg, ${p.bg}, ${p.bg2})` : p.bg;
        const locked = p.lvl && p.lvl > myLevel;
        return `<button type="button" class="preset ${th.preset === p.id ? 'on' : ''} ${locked ? 'locked' : ''}" data-th-preset="${p.id}"><span class="pv" style="background:${bg}"><i style="background:${p.fg}"></i><i style="background:${p.accent}"></i>${locked ? `<b class="pv-lock">${ico('lock')} ${esc(t('lvShort', { n: p.lvl }))}</b>` : ''}</span><span class="pn">${esc(presetName(p))}${p.lvl && !locked ? ' ✨' : ''}</span></button>`;
      }).join('')}</div></div>
      <div class="field"><span>${esc(t('themeStyle'))}</span><div class="seg">${['clay', 'minimal'].map(s => `<button type="button" data-th-style="${s}" class="${th.style === s ? 'on' : ''}">${esc(t(s === 'clay' ? 'styleClay' : 'styleMinimal'))}</button>`).join('')}</div></div>
      <div class="field"><span>${esc(t('themeCustom'))}</span><div class="row wrap" style="gap:18px">${pick('bg', t('colorPrimary'))}${pick('fg', t('colorSecondary'))}${pick('accent', t('colorAccent'))}</div></div>
      <div class="field"><span>${esc(t('bgMode'))}</span><div class="seg">${['solid', 'gradient'].map(m => `<button type="button" data-th-bg="${m}" class="${th.bgMode === m ? 'on' : ''}">${esc(t(m === 'solid' ? 'bgSolid' : 'bgGradient'))}</button>`).join('')}</div>
        ${th.bgMode === 'gradient' ? `<div style="margin-top:6px">${pick('bg2', t('gradientTo'))}</div>` : ''}</div>
    </div>`;
  }
  function samplePreview() {
    const c = HABIT_COLORS[0];
    let dots = '';
    for (let i = 0; i < 7 * 12; i++) { const on = ((i * 7 + 3) % 5) > 1 && i > 10; dots += `<i class="dot${on ? ' on' : ''}${i === 7 * 12 - 4 ? ' today' : ''}" style="display:block"></i>`; }
    return `<div class="habit clay" style="${habitVars(c)}"><div class="habit-head"><div class="habit-ico">🦷</div><div class="habit-title"><h3>${esc(t('sugTeeth'))}</h3><div class="habit-meta"><span><span class="flame">${ico('flame')}</span>12</span></div></div>${ringHtml(1, 1, 'tabindex="-1"')}</div><div class="dots" style="margin:0 auto">${dots}</div></div>`;
  }
  // Conecta los controles del editor de tema dentro de root; redraw() vuelve a pintar
  function bindThemeEditor(root, redraw) {
    root.addEventListener('click', e => {
      const q = s => e.target.closest(s); let el;
      if ((el = q('[data-th-preset]'))) {
        const p = PRESETS.find(x => x.id === el.dataset.thPreset);
        if (p.lvl && p.lvl > (state.onboarded ? levelInfo().level : 0)) { toast(t('themeLocked', { n: p.lvl })); return; }
        Object.assign(state.theme, { preset: p.id, bg: p.bg, fg: p.fg, accent: p.accent, style: p.style || 'clay', bgMode: p.bgMode || 'solid', bg2: p.bg2 || state.theme.bg2 });
      } else if ((el = q('[data-th-style]'))) state.theme.style = el.dataset.thStyle;
      else if ((el = q('[data-th-bg]'))) { state.theme.bgMode = el.dataset.thBg; if (state.theme.bgMode === 'gradient' && state.theme.bg2 === state.theme.bg) state.theme.bg2 = mix(state.theme.bg, state.theme.accent, .5); }
      else return;
      save(); applyTheme(); redraw();
    });
    root.addEventListener('input', e => {
      const k = e.target.dataset && e.target.dataset.thColor; if (!k) return;
      state.theme[k] = e.target.value; state.theme.preset = 'custom'; applyTheme();
    });
    root.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.thColor) { save(); redraw(); } });
  }

  /* ---------- ONBOARDING ---------- */
  const OB_STEPS = 4;
  let obPending = [], obForm = null;
  const SUGGESTIONS = [['sugTeeth', '🦷', 'daily', 2], ['sugWater', '💧', 'daily', 1], ['sugRead', '📚', 'daily', 1], ['sugGym', '💪', 'weekly', 3], ['sugMeditate', '🧘', 'daily', 1], ['sugSleep', '😴', 'daily', 1], ['sugWalk', '🚶', 'daily', 1], ['sugStudy', '✍️', 'daily', 1]];

  function renderOnboarding() {
    const s = state.obStep;
    const dots = Array.from({ length: OB_STEPS }, (_, i) => `<i class="${i <= s ? 'on' : ''}"></i>`).join('');
    let body = '', title = '', lead = '', next = t('next');
    if (s === 0) {
      title = t('obLangTitle'); lead = t('obLangSub');
      body = `<div class="lang-list">${[['es', '🇪🇸', 'Español'], ['en', '🇬🇧', 'English']].map(([l, f, n]) => `<button class="lang-opt clay ${state.lang === l ? 'on' : ''}" data-ob-lang="${l}"><span class="flag">${f}</span><span class="grow">${n}</span>${state.lang === l ? ico('check') : ''}</button>`).join('')}</div>
        <div class="center" style="margin-top:26px"><button class="chip" data-ob-login>${ico('refresh')} ${esc(t('obHaveAccount'))}</button></div>`;
    } else if (s === 1) {
      title = t('obColorTitle'); lead = t('obColorSub');
      body = `<div id="ob-theme">${themeEditorHtml()}</div><div class="field" style="margin-top:22px"><span class="muted small" style="font-weight:800;text-transform:uppercase;letter-spacing:.04em">${esc(t('preview'))}</span><div id="ob-preview" style="margin-top:8px">${samplePreview()}</div></div>`;
    } else if (s === 2) {
      title = t('obContractTitle'); lead = t('obContractSub'); next = t('contractSignBtn');
      body = contractFormHtml(state.contract ? state.contract.name : '');
    } else {
      title = t('obAddTitle'); lead = t('obAddSub'); next = t('obStart');
      body = `<div class="field"><span>${esc(t('suggestions'))}</span><div class="sug-list">${SUGGESTIONS.map(([k, e]) => { const on = obPending.some(p => p.key === k); return `<button class="chip ${on ? 'on' : ''}" data-ob-sug="${k}">${e} ${esc(t(k))}${on ? ' ' + ico('check') : ''}</button>`; }).join('')}</div></div>
        <div class="field" style="margin-top:20px"><span>${esc(t('customHabit'))}</span><div class="row"><input class="input" id="ob-custom" maxlength="60" placeholder="${esc(t('habitNamePh'))}"><button class="btn" data-ob-add>${ico('plus')} ${esc(t('add'))}</button></div></div>
        ${obPending.filter(p => !p.key).length ? `<div class="sug-list" style="margin-top:14px">${obPending.filter(p => !p.key).map((p, i) => `<button class="chip on" data-ob-del="${i}"># ${esc(p.name)} ${ico('x')}</button>`).join('')}</div>` : ''}`;
    }
    return `<div class="ob">
      <div class="ob-top"><span class="ob-brand">KeepGoing</span><div class="ob-dots" aria-label="${esc(t('obStep', { n: s + 1, total: OB_STEPS }))}">${dots}</div></div>
      <h1>${esc(title)}</h1><p class="lead">${esc(lead)}</p>
      <div class="ob-body">${body}</div>
      <div class="ob-foot">${s > 0 ? `<button class="btn" data-ob="back">${ico('left')} ${esc(t('back'))}</button>` : ''}<button class="btn primary" data-ob="next">${esc(next)}</button></div>
    </div>`;
  }
  function mountOnboarding() {
    const root = $('.ob');
    if (state.obStep === 1) bindThemeEditor($('#ob-theme'), () => { $('#ob-theme').innerHTML = themeEditorHtml(); $('#ob-preview').innerHTML = samplePreview(); });
    if (state.obStep === 2) obForm = mountContractForm(root);
    if (state.obStep === 3) $('#ob-custom').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('[data-ob-add]').click(); } });
    window.scrollTo(0, 0);
  }
  function onboardingClick(e) {
    const q = s => e.target.closest(s); let el;
    if (q('[data-ob-login]')) { openLogin(); return true; }
    if ((el = q('[data-ob-lang]'))) { state.lang = el.dataset.obLang; save(); render(); return true; }
    if ((el = q('[data-ob-sug]'))) {
      const k = el.dataset.obSug; const i = obPending.findIndex(p => p.key === k);
      if (i >= 0) obPending.splice(i, 1); else { const s = SUGGESTIONS.find(x => x[0] === k); obPending.push({ key: k, name: t(k), icon: s[1], freq: s[2], target: s[3] }); }
      const v = $('#ob-custom')?.value; render(); if (v) $('#ob-custom').value = v; return true;
    }
    if (q('[data-ob-add]')) { const v = $('#ob-custom').value.trim(); if (v) { obPending.push({ name: v, icon: '#', freq: 'daily', target: 1 }); render(); $('#ob-custom').focus(); } return true; }
    if ((el = q('[data-ob-del]'))) { const custom = obPending.filter(p => !p.key); obPending = obPending.filter(p => p !== custom[+el.dataset.obDel]); render(); return true; }
    if ((el = q('[data-ob]'))) {
      if (el.dataset.ob === 'back') { state.obStep = Math.max(0, state.obStep - 1); save(); render(); return true; }
      if (state.obStep === 2) {
        if (!obForm.name()) { toast(t('contractNeedName')); obForm.focus(); return true; }
        const prev = state.contract;
        if (!prev || prev.name !== obForm.name() || obForm.sig()) signContract(obForm.name(), obForm.sig() || (prev && prev.sig) || null);
      }
      if (state.obStep === 3) {
        const v = $('#ob-custom').value.trim(); if (v) obPending.push({ name: v, icon: '#', freq: 'daily', target: 1 });
        obPending.forEach(p => state.habits.push({ id: uid(), name: p.name, icon: p.icon, color: null, autoColor: HABIT_COLORS[state.colorSeq++ % HABIT_COLORS.length], freq: p.freq, target: p.target, multi: false, note: '', createdAt: todayKey(), archived: false }));
        obPending = []; state.onboarded = true; state.ui.tab = 'habits'; save(); render(); return true;
      }
      state.obStep++; save(); render(); return true;
    }
    return false;
  }

  /* =========================================================
     SINCRONIZACIÓN (Supabase: cuenta con email y contraseña)
     Cada cuenta guarda un único documento JSON; las fusiones usan marcas de tiempo.
     ========================================================= */
  const SB_URL = 'https://cciponhdxztcmprlxgbm.supabase.co';
  const SB_KEY = 'sb_publishable_2vd5eyubHFQtKQ9CCyG3XA_5QBWkZF6';
  const AUTH_KEY = 'keepgoing.auth';
  const APP_URL = 'https://izanhj.github.io/keepgoing/';
  let auth = (() => { try { return JSON.parse(localStorage.getItem(AUTH_KEY)) || null; } catch (e) { return null; } })();
  const sync = { busy: false, timer: null, last: null, error: null };
  const saveAuth = a => { auth = a; try { if (a) localStorage.setItem(AUTH_KEY, JSON.stringify(a)); else localStorage.removeItem(AUTH_KEY); } catch (e) { /* nada */ } };

  async function sbFetch(path, opts = {}, withUser = true) {
    const headers = { apikey: SB_KEY, 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (withUser && auth) headers.Authorization = 'Bearer ' + auth.access_token;
    const res = await fetch(SB_URL + path, { ...opts, headers });
    const text = await res.text();
    let body = null; try { body = text ? JSON.parse(text) : null; } catch (e) { body = text; }
    if (!res.ok) { const err = new Error((body && (body.msg || body.error_description || body.message || body.error)) || res.statusText); err.status = res.status; err.body = body; throw err; }
    return body;
  }
  const keepSession = s => saveAuth({ access_token: s.access_token, refresh_token: s.refresh_token, expires_at: Date.now() + (s.expires_in || 3600) * 1000, email: s.user && s.user.email, uid: s.user && s.user.id });
  async function signIn(email, password) {
    keepSession(await sbFetch('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) }, false));
  }
  async function signUp(email, password) {
    const r = await sbFetch(`/auth/v1/signup?redirect_to=${encodeURIComponent(APP_URL)}`, { method: 'POST', body: JSON.stringify({ email, password }) }, false);
    if (r && r.access_token) { keepSession(r); return 'in'; }
    return 'confirm'; // hay que confirmar el email
  }
  async function ensureToken() {
    if (!auth) return false;
    if (Date.now() < auth.expires_at - 60000) return true;
    try { keepSession(await sbFetch('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: auth.refresh_token }) }, false)); return true; }
    catch (e) { if (e.status === 400 || e.status === 401) { saveAuth(null); toast(t('syncExpired')); } throw e; }
  }
  async function signOut() {
    try { if (auth) await sbFetch('/auth/v1/logout', { method: 'POST' }); } catch (e) { /* sin conexión: basta con olvidar la sesión */ }
    saveAuth(null);
  }
  function scheduleSync(delay = 1500) {
    if (!auth) return;
    clearTimeout(sync.timer); sync.timer = setTimeout(syncNow, delay);
  }
  // Descarga, fusiona y sube. Devuelve true si llegó algo nuevo de otro dispositivo
  async function syncNow(force = false) {
    if (!auth || sync.busy || !navigator.onLine) return false;
    // Con una ventana abierta se espera: así no se pisan los cambios que estás editando
    if (!force && $('#modal-root').children.length) { scheduleSync(4000); return false; }
    sync.busy = true; updateSyncBadge();
    try {
      await ensureToken();
      const rows = await sbFetch(`/rest/v1/kg_state?select=data&user_id=eq.${auth.uid}`);
      const before = JSON.stringify(state);
      if (rows && rows[0] && rows[0].data) {
        const merged = normalize(mergeStates(state, rows[0].data));
        merged.ui = state.ui;
        state = merged;
      }
      const changed = JSON.stringify(state) !== before;
      saveSilently();
      await sbFetch('/rest/v1/kg_state?on_conflict=user_id', {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ user_id: auth.uid, data: { ...state, ui: undefined }, updated_at: new Date().toISOString() })
      });
      sync.last = Date.now(); sync.error = null;
      if (changed && !$('#modal-root').children.length) render();
      return changed;
    } catch (e) {
      sync.error = e.message || String(e);
      return false;
    } finally { sync.busy = false; updateSyncBadge(); }
  }
  function updateSyncBadge() {
    const el = $('#sync-status'); if (!el) return;
    el.textContent = syncStatusText();
  }
  function syncStatusText() {
    if (!auth) return t('syncOff');
    if (sync.busy) return t('syncing');
    if (sync.error) return t('syncError', { e: sync.error });
    if (!navigator.onLine) return t('syncOffline');
    return sync.last ? t('syncLast', { time: new Date(sync.last).toLocaleTimeString(state.lang, { hour: '2-digit', minute: '2-digit' }) }) : t('syncReady');
  }
  async function deleteCloud() { if (!auth) return; try { await ensureToken(); await sbFetch(`/rest/v1/kg_state?user_id=eq.${auth.uid}`, { method: 'DELETE' }); } catch (e) { /* se reintentará al borrar de nuevo */ } }

  function accountHtml() {
    if (auth) return `<div class="stack" style="gap:10px">
      <div class="row wrap"><span class="grow"><b>${esc(t('syncAs', { email: auth.email || '' }))}</b><br><span class="muted small" id="sync-status">${esc(syncStatusText())}</span></span></div>
      <div class="row wrap"><button class="btn" data-s="sync-now">${ico('refresh')} ${esc(t('syncNow'))}</button><button class="chip" data-s="sign-out">${esc(t('signOut'))}</button></div></div>`;
    return `<div class="stack" style="gap:10px">
      <p class="muted small" style="margin:0">${esc(t('syncHint'))}</p>
      <input class="input" id="acc-email" type="email" autocomplete="email" placeholder="${esc(t('email'))}" inputmode="email">
      <input class="input" id="acc-pass" type="password" autocomplete="current-password" placeholder="${esc(t('password'))}">
      <div class="row wrap"><button class="btn primary" data-s="sign-in">${esc(t('signIn'))}</button><button class="btn" data-s="sign-up">${esc(t('signUp'))}</button></div></div>`;
  }
  // Acciones de cuenta compartidas por Ajustes y por el inicio de sesión del onboarding
  async function accountAction(act, root, onDone) {
    if (act === 'sync-now') { await syncNow(true); updateSyncBadge(); if (!sync.error) toast(t('syncDone')); else toast(t('syncError', { e: sync.error })); return; }
    if (act === 'sign-out') { if (await confirmDialog(t('signOutQ'))) { await signOut(); onDone && onDone(); toast(t('signedOut')); } return; }
    const email = ($('#acc-email', root).value || '').trim(), pass = $('#acc-pass', root).value || '';
    if (!email || pass.length < 6) { toast(t('accNeedData')); return; }
    try {
      if (act === 'sign-in') await signIn(email, pass);
      else if ((await signUp(email, pass)) === 'confirm') { toast(t('accConfirm')); return; }
      toast(t('syncing'));
      await syncNow(true);
      onDone && onDone(); render(); toast(t('syncDone'));
    } catch (e) { toast(t('accError', { e: e.message })); }
  }
  function openLogin() {
    let wref;
    openModal({
      title: esc(t('setAccount')), body: '<div id="acc"></div>',
      onMount: w => { wref = w; $('#acc', w).innerHTML = accountHtml(); },
      onClick: (e, close) => { const el = e.target.closest('[data-s]'); if (el) accountAction(el.dataset.s, wref, () => close()); }
    });
  }
  window.addEventListener('online', () => scheduleSync(300));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleSync(300); });
  setInterval(() => { if (!document.hidden) syncNow(); }, 60000);

  /* ---------- AJUSTES ---------- */
  function openSettings() {
    let wref;
    const draw = () => {
      const c = state.contract;
      $('#st', wref).innerHTML = `<div class="stack" style="gap:22px">
        <section><h3 class="section-title row">${ico('globe')} ${esc(t('setLanguage'))}</h3><div class="seg">${[['es', 'Español'], ['en', 'English']].map(([l, n]) => `<button data-s-lang="${l}" class="${state.lang === l ? 'on' : ''}">${n}</button>`).join('')}</div></section>
        <section><h3 class="section-title row">${ico('refresh')} ${esc(t('setAccount'))}</h3><div id="st-acc">${accountHtml()}</div></section>
        <section><h3 class="section-title row">${ico('palette')} ${esc(t('setTheme'))}</h3><div id="st-theme">${themeEditorHtml()}</div></section>
        <section><h3 class="section-title row">${ico('doc')} ${esc(t('setContract'))}</h3>
          <div class="row wrap"><span class="grow muted small" style="font-weight:700">${c ? esc(diffDays(todayKey(), c.endsAt) < 0 ? t('contractEnded') : t('contractActive', { n: diffDays(todayKey(), c.endsAt) })) : esc(t('contractNone'))}</span>
          <button class="chip" data-s="contract">${esc(c ? t('contractView') : t('contractSignNow'))}</button>${c ? `<button class="chip" data-s="renew">${ico('refresh')} ${esc(t('contractRenew'))}</button>` : ''}</div></section>
        <section><h3 class="section-title row">⭐ ${esc(t('commitTitle'))}</h3><div id="st-commit">${commitSegHtml()}</div></section>
        <section><h3 class="section-title row">🏖️ ${esc(t('vacTitle'))}</h3>
          <div class="row wrap"><span class="grow muted small" style="font-weight:700">${esc(activeVacation() ? t('vacActive', { date: fmtDate(activeVacation().to) }) : t('vacHintShort'))}</span><button class="chip" data-s="vacations">${esc(t('vacManage'))}</button></div></section>
        <section><h3 class="section-title row">🔔 ${esc(t('promptsTitle'))}</h3><p class="muted small" style="margin-top:0">${esc(t('promptsHint'))}</p>${promptsSettingsHtml()}</section>
        <section><h3 class="section-title row">${ico('download')} ${esc(t('setData'))}</h3>
          <p class="muted small" style="margin-top:0">${esc(t('dataHint'))}</p>
          <div class="row wrap"><button class="btn" data-s="export">${ico('download')} ${esc(t('exportData'))}</button><button class="btn" data-s="import">${ico('upload')} ${esc(t('importData'))}</button></div>
          <input type="file" id="st-file" accept=".json,application/json" class="hidden">
          <div class="row wrap" style="margin-top:14px"><button class="chip" data-s="replay">${ico('refresh')} ${esc(t('replayOnboarding'))}</button><button class="chip" data-s="reset" style="color:#e5484d">${ico('trash')} ${esc(t('resetData'))}</button></div>
        </section>
        <p class="muted small center" style="margin:0">KeepGoing · ${esc(t('version', { v: VERSION }))}</p>
      </div>`;
    };
    openModal({
      title: esc(t('settings')), cls: 'wide', body: '<div id="st"></div>',
      onMount: w => {
        wref = w; draw();
        bindThemeEditor(w, () => { $('#st-theme', w).innerHTML = themeEditorHtml(); render(); });
        w.addEventListener('change', e => {
          if (e.target.id === 'st-file' && e.target.files[0]) importFile(e.target.files[0], w);
          // Avisos: activar/desactivar y nota
          const tg = e.target.dataset && e.target.dataset.promptToggle;
          if (tg) { state.prompts[tg] = { ...(state.prompts[tg] || {}), off: !e.target.checked }; save(); toast(t(e.target.checked ? 'promptOnToast' : 'promptOffToast')); }
          const nt = e.target.dataset && e.target.dataset.promptNote;
          if (nt) { state.prompts[nt] = { ...(state.prompts[nt] || {}), note: e.target.value.trim() }; save(); toast(t('saved')); }
        });
      },
      onClick: async (e, close, w) => {
        const q = s => e.target.closest(s); let el;
        if ((el = q('[data-s-lang]'))) { state.lang = el.dataset.sLang; save(); render(); draw(); $('.sheet-head h2', w).textContent = t('settings'); return; }
        if ((el = q('[data-commit]'))) { setCommitment(el.dataset.commit); $('#st-commit', w).innerHTML = commitSegHtml(); render(); return; }
        if (!(el = q('[data-s]'))) return;
        switch (el.dataset.s) {
          case 'vacations': openVacations(); break;
          case 'sync-now': case 'sign-in': case 'sign-up': case 'sign-out':
            await accountAction(el.dataset.s, w, () => { $('#st-acc', w).innerHTML = accountHtml(); });
            if ($('#st-acc', w)) $('#st-acc', w).innerHTML = accountHtml();
            break;
          case 'contract': openContract(); break;
          case 'renew': renewContract(); draw(); break;
          case 'export': exportData(); break;
          case 'import': $('#st-file', w).click(); break;
          case 'replay': close(); state.onboarded = false; state.obStep = 0; save(); render(); break;
          case 'reset':
            if (await confirmDialog(t('resetQ')) && await confirmDialog(t('resetQ2'))) {
              await deleteCloud(); await signOut();
              try { localStorage.removeItem(STORE_KEY); } catch (err) { /* nada */ }
              state = defaultState(); saveSilently(); close(); render();
            }
            break;
        }
      }
    });
  }
  function exportData() {
    const blob = new Blob([JSON.stringify({ app: 'KeepGoing', exportedAt: new Date().toISOString(), data: state }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `keepgoing-${todayKey()}.json`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast(t('exportedOk'));
  }
  function importFile(file, w) {
    const rd = new FileReader();
    rd.onload = async () => {
      try {
        const parsed = JSON.parse(rd.result); const data = parsed.data || parsed;
        if (!Array.isArray(data.habits) || typeof data.logs !== 'object') throw new Error('bad');
        if (!(await confirmDialog(t('dataImportQ')))) return;
        state = normalize(data); state.onboarded = true;
        state.habits.forEach(h => checkMastery(h, true));
        save(); $$('.backdrop').forEach(b => b.remove()); document.body.style.overflow = ''; render(); toast(t('importedOk'));
      } catch (err) { toast(t('importError')); }
      if (w && $('#st-file', w)) $('#st-file', w).value = '';
    };
    rd.readAsText(file);
  }

  /* =========================================================
     FASE 1 — uso diario, juego, reflexión y proyectos
     ========================================================= */
  const L2 = (es, en) => state.lang === 'en' ? en : es; // textos de plantillas en los dos idiomas
  const dayLabel = k => { const s = k === todayKey() ? t('today') : k === addDays(todayKey(), -1) ? t('yesterday') : fmtDate(k, { weekday: 'long', day: 'numeric', month: 'long' }); return s.charAt(0).toUpperCase() + s.slice(1); };

  /* ---------- avisos con «No recordármelo» (se gestionan en Ajustes → Avisos y mensajes) ---------- */
  const PROMPTS = [{ id: 'shieldOffer', icon: '🛡️' }, { id: 'weeklyReview', icon: '📝' }, { id: 'afterPhoto', icon: '📸' }];
  const promptOn = id => !(state.prompts[id] && state.prompts[id].off);
  const dontRemindHtml = () => `<label class="check small" style="margin-top:16px;justify-content:center"><input type="checkbox" id="pr-off"> ${esc(t('dontRemind'))}</label>`;
  function readDontRemind(w, id) {
    const c = $('#pr-off', w);
    if (c && c.checked) { state.prompts[id] = { ...(state.prompts[id] || {}), off: true }; save(); toast(t('promptOffToast')); }
  }
  function promptsSettingsHtml() {
    return `<div class="stack" style="gap:12px">${PROMPTS.map(p => {
      const s = state.prompts[p.id] || {};
      return `<div class="clay card" style="padding:14px 16px">
        <div class="row"><span style="font-size:22px">${p.icon}</span><span class="grow"><b>${esc(t('pr_' + p.id))}</b><br><span class="muted small">${esc(t('prd_' + p.id))}</span></span>
          <span class="switch" title="${esc(t('promptActive'))}"><input type="checkbox" data-prompt-toggle="${p.id}" ${s.off ? '' : 'checked'}><span></span></span></div>
        <textarea class="input" data-prompt-note="${p.id}" maxlength="300" placeholder="${esc(t('promptNotePh'))}" style="min-height:60px;margin-top:10px">${esc(s.note || '')}</textarea>
      </div>`;
    }).join('')}</div>`;
  }

  /* ---------- cantidades (litros, minutos, páginas…) ---------- */
  function openAmount(h, k) {
    const step = +h.step || 1, unit = h.unit || '';
    const body = () => {
      const v = cnt(h, k), pct = Math.min(100, v / (h.target || 1) * 100);
      return `<div class="center" style="${habitVars(hColor(h))}">
        <div class="amount-big"><b>${fmtNum(v)}</b> <span class="muted">/ ${fmtNum(h.target)} ${esc(unit)}</span></div>
        <div class="bar ${pct ? '' : 'zero'}" style="margin:14px 0"><i style="width:${pct}%;background:var(--h)"></i></div>
        <div class="row wrap" style="justify-content:center;gap:8px">${[step, step * 2, step * 5].map(s => `<button class="chip" data-am="${s}">+${fmtNum(s)} ${esc(unit)}</button>`).join('')}<button class="chip" data-am="${-step}">−${fmtNum(step)}</button></div>
        <div class="row" style="margin-top:14px"><input class="input" id="am-in" type="number" step="any" inputmode="decimal" placeholder="${esc(t('amountCustom'))}"><button class="btn" data-am-add>${esc(t('add'))}</button><button class="btn" data-am-set>${esc(t('amountSet'))}</button></div>
      </div>`;
    };
    openModal({
      title: `${esc(h.icon || '#')} ${esc(dayLabel(k))}`, body: `<div id="am">${body()}</div>`,
      foot: `<button class="btn primary block" data-m="x">${esc(t('done'))}</button>`,
      onClick: (e, close, w) => {
        let nv = null; const b = e.target.closest('[data-am]'); const x = parseFloat(($('#am-in', w) || {}).value);
        if (b) nv = cnt(h, k) + +b.dataset.am;
        if (e.target.closest('[data-am-add]') && !isNaN(x)) nv = cnt(h, k) + x;
        if (e.target.closest('[data-am-set]') && !isNaN(x)) nv = x;
        if (nv != null) { setCount(h, k, Math.max(0, nv)); vibrate(8); $('#am', w).innerHTML = body(); refreshHabit(h.id); }
      }
    });
  }

  /* ---------- temporizador ---------- */
  let timer = null; // { hid, total, left, endsAt, running }
  function beep() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      [0, .25, .5].forEach(t0 => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 880; o.connect(g); g.connect(ac.destination); g.gain.setValueAtTime(.0001, ac.currentTime + t0); g.gain.exponentialRampToValueAtTime(.3, ac.currentTime + t0 + .02); g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + t0 + .2); o.start(ac.currentTime + t0); o.stop(ac.currentTime + t0 + .22); });
    } catch (e) { /* sin audio */ }
  }
  function openTimer(h, onFinish) {
    if (!timer || timer.hid !== h.id) { const total = (+h.duration || 10) * 60; timer = { hid: h.id, total, left: total, endsAt: 0, running: false }; }
    let iv = null;
    const left = () => timer.running ? Math.max(0, (timer.endsAt - Date.now()) / 1000) : timer.left;
    const mmss = s => `${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}`;
    const draw = w => {
      if (!timer) return;
      const l = left(), C = 2 * Math.PI * 90;
      $('#tm', w).innerHTML = `<svg viewBox="0 0 200 200" width="230" height="230" style="transform:rotate(-90deg)"><circle cx="100" cy="100" r="90" fill="none" stroke="var(--surface-2)" stroke-width="12"/><circle cx="100" cy="100" r="90" fill="none" stroke="${hColor(h)}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - l / timer.total)).toFixed(1)}"/></svg><div class="timer-num">${mmss(Math.ceil(l))}</div>`;
      $('[data-tm="play"]', w).innerHTML = timer.running ? `${ico('pause')} ${esc(t('pause'))}` : `${ico('play')} ${esc(t(timer.left < timer.total ? 'resume' : 'timerStart'))}`;
    };
    const finish = close => {
      clearInterval(iv);
      const mins = Math.max(1, Math.round((timer.total - left()) / 60));
      state.stats.timerMin = (state.stats.timerMin || 0) + mins;
      timer = null; beep(); vibrate([200, 100, 200]);
      const k = todayKey();
      if (isAmount(h) && /min/i.test(h.unit || '')) setCount(h, k, cnt(h, k) + mins);
      else if (!isAmount(h) && (isMulti(h) || !periodDone(h, k))) setCount(h, k, cnt(h, k) + 1);
      else save();
      close(); toast(t('timerDone')); refreshHabit(h.id);
      onFinish && onFinish();
    };
    openModal({
      title: `${esc(h.icon || '#')} ${esc(h.name)}`,
      body: `<div class="timer-wrap" id="tm"></div>
        <div class="row" style="justify-content:center;gap:10px;margin-top:16px"><button class="btn primary" data-tm="play"></button><button class="btn" data-tm="plus">+1 min</button><button class="btn" data-tm="reset" aria-label="${esc(t('reset'))}">${ico('refresh')}</button></div>
        <div class="center" style="margin-top:12px"><button class="chip" data-tm="done">${ico('check')} ${esc(t('timerFinishNow'))}</button></div>`,
      onMount: (w, close) => {
        draw(w);
        iv = setInterval(() => { if (!document.body.contains(w)) { clearInterval(iv); return; } if (timer && timer.running && left() <= 0) finish(close); else draw(w); }, 250);
      },
      onClick: (e, close, w) => {
        const b = e.target.closest('[data-tm]'); if (!b || !timer) return;
        const a = b.dataset.tm;
        if (a === 'play') { if (timer.running) { timer.left = left(); timer.running = false; } else { timer.endsAt = Date.now() + timer.left * 1000; timer.running = true; } }
        if (a === 'plus') { timer.total += 60; if (timer.running) timer.endsAt += 60000; else timer.left += 60; }
        if (a === 'reset') { timer.running = false; timer.left = timer.total; }
        if (a === 'done') { finish(close); return; }
        draw(w);
      },
      onClose: () => clearInterval(iv)
    });
  }

  /* ---------- modo vacaciones ---------- */
  const activeVacation = () => state.vacations.find(v => todayKey() >= v.from && todayKey() <= v.to);
  function openVacations() {
    let wref;
    const draw = () => {
      $('#vac', wref).innerHTML = `<p class="muted small" style="margin-top:0">${esc(t('vacHint'))}</p>
        ${state.vacations.length ? [...state.vacations].sort((a, b) => a.from < b.from ? 1 : -1).map(v => `<div class="entry"><span>🏖️ ${esc(fmtShort(v.from))} – ${esc(fmtShort(v.to))}</span><button class="icon-btn sm" style="width:30px;height:30px" data-vac-del="${v.id}" aria-label="${esc(t('delete'))}">${ico('x')}</button></div>`).join('') : `<p class="muted small">${esc(t('vacNone'))}</p>`}
        <div class="row wrap" style="margin-top:14px;align-items:flex-end">
          <label class="field grow"><span>${esc(t('from'))}</span><input class="input" type="date" id="vac-from" value="${todayKey()}"></label>
          <label class="field grow"><span>${esc(t('to'))}</span><input class="input" type="date" id="vac-to" value="${addDays(todayKey(), 6)}"></label>
          <button class="btn primary" data-vac-add>${ico('plus')} ${esc(t('add'))}</button>
        </div>`;
    };
    openModal({
      title: `🏖️ ${esc(t('vacTitle'))}`, body: '<div id="vac"></div>',
      onMount: w => { wref = w; draw(); },
      onClick: (e) => {
        let el;
        if ((el = e.target.closest('[data-vac-del]'))) { state.vacations = state.vacations.filter(v => v.id !== el.dataset.vacDel); save(); draw(); render(); }
        if (e.target.closest('[data-vac-add]')) {
          const from = $('#vac-from', wref).value, to = $('#vac-to', wref).value;
          if (!from || !to || to < from) { toast(t('vacBadDates')); return; }
          state.vacations.push({ id: uid(), from, to }); save(); draw(); render(); toast(t('saved'));
        }
      }
    });
  }

  /* ---------- oferta de escudos al abrir la app ---------- */
  const shieldAsked = new Set();
  function offerShields() {
    if (!promptOn('shieldOffer')) return;
    const y = addDays(todayKey(), -1);
    for (const h of state.habits) {
      if (h.archived || isQuit(h) || h.freq !== 'daily' || y < firstKey(h) || shieldAsked.has(h.id + y)) continue;
      if (periodState(h, y) !== 'miss' || shieldInfo(h).available < 1) continue;
      shieldAsked.add(h.id + y);
      whenFree(() => {
        if (!promptOn('shieldOffer') || periodState(h, y) !== 'miss') return;
        const n = shieldInfo(h).available;
        openModal({
          body: `<div class="center"><div style="font-size:54px">🛡️</div><h2 style="margin:6px 0">${esc(t('shieldTitle'))}</h2><p class="muted">${esc(t('shieldMsg', { name: h.name, n }))}</p>${dontRemindHtml()}</div>`,
          foot: `<button class="btn" data-sh="no">${esc(t('noThanks'))}</button><button class="btn primary" data-sh="yes">${esc(t('shieldUse'))}</button>`,
          onClick: (e, close, w) => { const b = e.target.closest('[data-sh]'); if (!b) return; readDontRemind(w, 'shieldOffer'); if (b.dataset.sh === 'yes') useShield(h, y); close(); render(); }
        });
      });
    }
  }

  /* ---------- nivel, puntos y tienda de recompensas ---------- */
  const COMMIT_LEVELS = ['chill', 'serio', 'locked'];
  function levelPill() {
    const lv = levelInfo(), pi = pointsInfo();
    return `<button class="lvl-pill clay" data-act="level" aria-label="${esc(t('lvTitle'))}"><span class="lvl-num">${lv.level}</span><span class="lvl-txt"><b>${esc(lv.title)}</b><span>${fmtNum(pi.balance)} ⭐</span></span></button>`;
  }
  function setCommitment(lv) {
    const k = todayKey();
    state.commitHistory = state.commitHistory.filter(c => c.from !== k);
    state.commitHistory.push({ from: k, level: lv });
    state.commitHistory.sort((a, b) => a.from < b.from ? -1 : 1);
    state.commitment = lv; save();
  }
  function commitSegHtml() {
    return `<div class="seg">${COMMIT_LEVELS.map(l => `<button type="button" data-commit="${l}" class="${state.commitment === l ? 'on' : ''}">${esc(t('commit_' + l))}</button>`).join('')}</div><p class="muted small" style="margin:8px 0 0">${esc(t('commitd_' + state.commitment))}</p>`;
  }
  function openLevel() {
    let wref;
    const draw = () => {
      const lv = levelInfo(), pi = pointsInfo();
      $('#lvl', wref).innerHTML = `<div class="stack" style="gap:18px">
        <div class="row" style="gap:16px"><div class="lvl-big">${lv.level}</div><div class="grow"><div style="font-size:22px;font-weight:900">${esc(lv.title)}</div>
          <div class="muted small">${esc(t('lvXp', { a: fmtNum(lv.xp), b: fmtNum(lv.to) }))}</div><div class="bar" style="margin-top:8px"><i style="width:${lv.pct}%"></i></div></div></div>
        <div class="kpis" style="margin:0"><div class="kpi clay"><b>${fmtNum(pi.balance)} ⭐</b><span>${esc(t('ptsBalance'))}</span></div><div class="kpi clay"><b>${pi.perfectDays}</b><span>${esc(t('perfectDays'))}</span></div><div class="kpi clay"><b>${pi.bestPerfectRun}</b><span>${esc(t('perfectRun'))}</span></div></div>
        <section><h3 class="section-title">${esc(t('commitTitle'))}</h3>${commitSegHtml()}</section>
        <section><h3 class="section-title row">${ico('gift')} ${esc(t('rewardsTitle'))}</h3>
          ${state.rewards.length ? state.rewards.map(r => `<div class="reward-row clay"><span style="font-size:26px">${esc(r.icon || '🎁')}</span><span class="grow"><b>${esc(r.name)}</b><br><span class="muted small">${fmtNum(r.cost)} ⭐</span></span>
            <button class="btn ${pi.balance >= r.cost ? 'accent' : ''}" data-rw-redeem="${r.id}" ${pi.balance >= r.cost ? '' : 'disabled'}>${esc(t('redeem'))}</button><button class="icon-btn sm" data-rw-del="${r.id}" aria-label="${esc(t('delete'))}">${ico('x')}</button></div>`).join('') : `<p class="muted small">${esc(t('rewardsEmpty'))}</p>`}
          <div class="row wrap" style="margin-top:12px"><input class="input" id="rw-icon" maxlength="4" value="🎁" style="width:70px;text-align:center"><input class="input grow" id="rw-name" maxlength="50" placeholder="${esc(t('rewardNamePh'))}" style="flex:1 1 160px"><input class="input" id="rw-cost" type="number" min="1" inputmode="numeric" placeholder="⭐" style="width:100px"><button class="btn" data-rw-add>${ico('plus')} ${esc(t('add'))}</button></div>
        </section>
        ${state.redemptions.length ? `<section><h3 class="section-title">${esc(t('redeemHistory'))}</h3>${[...state.redemptions].reverse().slice(0, 10).map(r => `<div class="entry"><span>${esc(r.icon || '🎁')} ${esc(r.name)} <span class="muted">· ${esc(fmtShort(r.date))}</span></span><b>−${fmtNum(r.cost)} ⭐</b></div>`).join('')}</section>` : ''}
        <p class="muted small" style="margin:0">${esc(t('ptsHow'))}</p>
      </div>`;
    };
    openModal({
      title: `⭐ ${esc(t('lvTitle'))}`, cls: 'wide', body: '<div id="lvl"></div>',
      onMount: w => { wref = w; draw(); },
      onClick: async (e) => {
        let el;
        if ((el = e.target.closest('[data-commit]'))) { setCommitment(el.dataset.commit); draw(); render(); return; }
        if (e.target.closest('[data-rw-add]')) {
          const name = $('#rw-name', wref).value.trim(), cost = parseInt($('#rw-cost', wref).value, 10), icon = $('#rw-icon', wref).value.trim() || '🎁';
          if (!name || !(cost > 0)) { toast(t('rewardNeedData')); return; }
          state.rewards.push({ id: uid(), name, cost, icon }); save(); draw(); return;
        }
        if ((el = e.target.closest('[data-rw-del]'))) { state.rewards = state.rewards.filter(r => r.id !== el.dataset.rwDel); save(); draw(); return; }
        if ((el = e.target.closest('[data-rw-redeem]'))) {
          const r = state.rewards.find(x => x.id === el.dataset.rwRedeem); if (!r) return;
          if (await confirmDialog(t('redeemQ', { name: r.name, n: fmtNum(r.cost) }))) {
            state.redemptions.push({ id: uid(), rewardId: r.id, name: r.name, icon: r.icon, cost: r.cost, date: todayKey() });
            save(); vibrate([20, 40, 20]); toast(t('redeemed', { name: r.name })); draw(); render();
          }
        }
      }
    });
  }

  /* ---------- energía del día (1–5) ---------- */
  const ENERGY = ['🪫', '😴', '🙂', '😃', '🔥'];
  function energyHtml() {
    const v = state.energy[todayKey()] || 0;
    return `<div class="clay card energy-card"><div class="row"><b class="grow">${esc(t('energyToday'))}</b><span class="muted small">${v ? esc(t('energyLvl', { n: v })) : ''}</span></div>
      <div class="energy-row">${ENERGY.map((e, i) => `<button class="energy-btn ${v === i + 1 ? 'on' : ''}" data-energy="${i + 1}" aria-label="${i + 1}"><span>${e}</span><small>${i + 1}</small></button>`).join('')}</div></div>`;
  }

  /* ---------- vista «Hoy» ---------- */
  const TOD = ['morning', 'afternoon', 'night', 'any'];
  const TOD_ICON = { morning: '☀️', afternoon: '🌤️', night: '🌙', any: '🕐' };
  function todayStatus(h) {
    const k = todayKey();
    if (isQuit(h)) return { due: true, done: !cnt(h, k), quit: true };
    if (h.freq === 'daily') {
      if (isOffDay(h, k) && !cnt(h, k)) return { due: false };
      return { due: true, done: cnt(h, k) >= dayGoal(h) };
    }
    return { due: !periodDone(h, k) || cnt(h, k) > 0, done: periodDone(h, k) };
  }
  function progressText(h) {
    const k = todayKey();
    if (isQuit(h)) return cnt(h, k) ? t('quitSlippedToday') : t('quitDays', { n: currentStreak(h) });
    if (isAmount(h)) return `${fmtNum(periodSum(h, k))} / ${fmtNum(h.target)} ${h.unit || ''}${h.freq !== 'daily' ? ' · ' + unitLabel(h) : ''}`;
    if (h.freq === 'daily') return h.target > 1 ? `${cnt(h, k)} / ${h.target}` : (cnt(h, k) ? t('done') : t('pending'));
    return t(h.freq === 'weekly' ? 'thisWeek' : 'thisMonth', { a: periodSum(h, k), b: h.target });
  }
  function todayRow(h) {
    const st = todayStatus(h), c = hColor(h);
    const action = st.quit
      ? `<button class="chip ${cnt(h, todayKey()) ? 'on' : ''}" data-today="slip" data-id="${h.id}">${esc(t('relapse'))}</button>`
      : `<button class="today-check ${st.done ? 'on' : ''}" data-today="tap" data-id="${h.id}" aria-label="${esc(t('markDone'))}">${isAmount(h) && !st.done ? ico('plus') : ico('check')}</button>`;
    return `<div class="today-row clay ${st.done && !st.quit ? 'done' : ''}" style="${habitVars(c)}">
      <button class="habit-ico sm" data-act="habit-edit" data-id="${h.id}">${esc(h.icon || '#')}</button>
      <div class="grow" style="min-width:0"><b class="ellipsis">${esc(h.name)}</b><div class="muted small">${esc(progressText(h))}</div></div>
      ${+h.duration > 0 && !st.quit ? `<button class="icon-btn sm" data-today="timer" data-id="${h.id}" aria-label="${esc(t('timer'))}">${ico('timer')}</button>` : ''}
      ${action}
    </div>`;
  }
  function viewToday(active) {
    const items = active.filter(h => todayStatus(h).due);
    const pending = items.filter(h => !todayStatus(h).done || isQuit(h));
    const done = items.filter(h => todayStatus(h).done && !isQuit(h));
    const di = dayInfo(todayKey());
    let html = energyHtml();
    if (activeVacation()) html += `<div class="banner clay">🏖️<span class="grow"><b>${esc(t('vacActive', { date: fmtDate(activeVacation().to) }))}</b></span></div>`;
    if (di.perfect && items.length) html += `<div class="perfect-banner clay">🎉 <b class="grow">${esc(t('perfectToday'))}</b><span class="muted small">+${COMMIT[commitOn(todayKey())].bonus} ⭐</span></div>`;
    const routs = state.routines.filter(r => r.habitIds.some(id => { const h = getHabit(id); return h && !h.archived && todayStatus(h).due; }));
    const groups = TOD.map(tod => {
      const rs = routs.filter(r => (r.timeOfDay || 'any') === tod);
      const hs = pending.filter(h => (h.timeOfDay || 'any') === tod && !isQuit(h));
      if (!rs.length && !hs.length) return '';
      return `<section class="today-group"><h3 class="today-h">${TOD_ICON[tod]} ${esc(t('tod_' + tod))}</h3>${rs.map(routineCard).join('')}${hs.map(todayRow).join('')}</section>`;
    }).join('');
    const quits = pending.filter(isQuit);
    html += groups || (!quits.length ? `<div class="empty" style="padding:28px 10px"><div style="font-size:48px">✨</div><h2>${esc(t(items.length ? 'allDoneToday' : 'nothingToday'))}</h2></div>` : '');
    if (quits.length) html += `<section class="today-group"><h3 class="today-h">🚫 ${esc(t('tod_avoid'))}</h3>${quits.map(todayRow).join('')}</section>`;
    if (done.length) html += `<details class="today-group" ${pending.length ? '' : 'open'}><summary class="today-h">✅ ${esc(t('doneToday', { n: done.length }))}</summary>${done.map(todayRow).join('')}</details>`;
    return html;
  }

  /* ---------- rutinas ---------- */
  const routineSteps = r => r.habitIds.map(getHabit).filter(h => h && !h.archived && !isQuit(h));
  function routineCard(r) {
    const steps = routineSteps(r), doneN = steps.filter(h => todayStatus(h).done).length;
    return `<div class="routine-card clay"><span style="font-size:28px">${esc(r.icon || '🔁')}</span>
      <div class="grow" style="min-width:0"><b class="ellipsis">${esc(r.name)}</b><div class="muted small">${esc(steps.map(h => h.icon).join(' '))} · ${doneN}/${steps.length}</div>
        <div class="bar ${doneN ? '' : 'zero'}" style="height:6px;margin-top:6px"><i style="width:${steps.length ? doneN / steps.length * 100 : 0}%"></i></div></div>
      <button class="btn ${doneN === steps.length ? '' : 'primary'}" data-routine-run="${r.id}">${ico('play')} ${esc(t(doneN === steps.length ? 'routineAgain' : doneN ? 'routineContinue' : 'routineStart'))}</button>
      <button class="icon-btn sm" data-routine-edit="${r.id}" aria-label="${esc(t('edit'))}">${ico('edit')}</button></div>`;
  }
  function openRoutineEditor(r = null) {
    const isNew = !r;
    const f = r ? JSON.parse(JSON.stringify(r)) : { name: '', icon: '🌅', timeOfDay: 'morning', habitIds: [] };
    const draw = w => {
      const hs = state.habits.filter(h => !h.archived && !isQuit(h));
      $('#rf', w).innerHTML = `<div class="stack" style="gap:18px">
        <label class="field"><span>${esc(t('routineName'))}</span><input class="input" id="rf-name" maxlength="50" value="${esc(f.name)}" placeholder="${esc(t('routineNamePh'))}"></label>
        <div class="field"><span>${esc(t('habitIcon'))}</span><div class="emoji-grid" style="max-height:110px">${['🌅', '☀️', '🌙', '💪', '🧘', '📚', '🔁', '⚡', '🧠', '🛏️', '🚿', '☕'].map(e => `<button type="button" data-emoji="${e}" class="${f.icon === e ? 'on' : ''}">${e}</button>`).join('')}</div></div>
        <div class="field"><span>${esc(t('timeOfDay'))}</span><div class="seg" style="flex-wrap:wrap">${TOD.map(x => `<button type="button" data-tod="${x}" class="${f.timeOfDay === x ? 'on' : ''}">${TOD_ICON[x]} ${esc(t('tod_' + x))}</button>`).join('')}</div></div>
        <div class="field"><span>${esc(t('routineSteps'))}</span><div class="muted small">${esc(t('routineStepsHint'))}</div>
          <div class="sug-list" style="margin-top:6px">${hs.length ? hs.map(h => { const i = f.habitIds.indexOf(h.id); return `<button type="button" class="chip ${i >= 0 ? 'on' : ''}" data-step-h="${h.id}">${i >= 0 ? `<b>${i + 1}.</b> ` : ''}${esc(h.icon)} ${esc(h.name)}</button>`; }).join('') : `<span class="muted small">${esc(t('noHabitsYet'))}</span>`}</div></div>
        ${!isNew ? `<div><button type="button" class="chip" data-rf-del style="color:#e5484d">${ico('trash')} ${esc(t('delete'))}</button></div>` : ''}
      </div>`;
    };
    const read = w => { f.name = $('#rf-name', w).value.trim(); };
    openModal({
      title: esc(t(isNew ? 'newRoutine' : 'editRoutine')), body: '<div id="rf"></div>',
      foot: `<button class="btn" data-m="x">${esc(t('cancel'))}</button><button class="btn primary" data-m="save">${esc(t('save'))}</button>`,
      onMount: w => draw(w),
      onClick: async (e, close, w) => {
        let el;
        if ((el = e.target.closest('[data-emoji]'))) { read(w); f.icon = el.dataset.emoji; draw(w); return; }
        if ((el = e.target.closest('[data-tod]'))) { read(w); f.timeOfDay = el.dataset.tod; draw(w); return; }
        if ((el = e.target.closest('[data-step-h]'))) { read(w); const id = el.dataset.stepH; f.habitIds = f.habitIds.includes(id) ? f.habitIds.filter(x => x !== id) : [...f.habitIds, id]; draw(w); return; }
        if (e.target.closest('[data-rf-del]')) { if (await confirmDialog(t('deleteRoutineQ', { name: r.name }))) { state.routines = state.routines.filter(x => x.id !== r.id); save(); close(); render(); } return; }
        if (e.target.closest('[data-m="save"]')) {
          read(w);
          if (!f.name || !f.habitIds.length) { toast(t('routineNeedData')); return; }
          if (isNew) state.routines.push({ id: uid(), ...f }); else Object.assign(r, f);
          save(); close(); state.ui.tab = 'habits'; state.ui.habitsView = 'today'; render(); toast(t('saved'));
        }
      }
    });
  }
  function runRoutine(r) {
    const steps = routineSteps(r); if (!steps.length) return;
    let i = steps.findIndex(h => !todayStatus(h).done); if (i < 0) i = 0;
    let wref;
    const markDone = h => { const k = todayKey(); const goal = isAmount(h) ? h.target : dayGoal(h); if (cnt(h, k) < goal) setCount(h, k, h.freq === 'daily' || isAmount(h) ? goal : cnt(h, k) + 1); };
    const draw = () => {
      if (i >= steps.length) {
        state.routineRuns[r.id] = (state.routineRuns[r.id] || 0) + 1; save(); checkSecrets();
        $('#rr', wref).innerHTML = `<div class="center"><div style="font-size:60px">🎉</div><h2>${esc(t('routineDone'))}</h2><p class="muted">${esc(t('routineDoneMsg', { name: r.name }))}</p><button class="btn primary" data-m="x">${esc(t('close'))}</button></div>`;
        render(); return;
      }
      const h = steps[i], st = todayStatus(h);
      $('#rr', wref).innerHTML = `<div class="center" style="${habitVars(hColor(h))}">
        <div class="step-dots">${steps.map((s, j) => `<i class="${todayStatus(s).done ? 'on' : ''} ${j === i ? 'cur' : ''}"></i>`).join('')}</div>
        <div class="habit-ico" style="width:96px;height:96px;font-size:48px;margin:18px auto 10px;border-radius:30px">${esc(h.icon || '#')}</div>
        <h2 style="margin:0">${esc(h.name)}</h2><p class="muted">${esc(progressText(h))}${st.done ? ' · ✅' : ''}</p>
        <div class="row wrap" style="justify-content:center;gap:10px;margin-top:10px">
          ${+h.duration > 0 ? `<button class="btn" data-rr="timer">${ico('timer')} ${h.duration} min</button>` : ''}
          <button class="btn" data-rr="skip">${esc(t('skip'))}</button>
          <button class="btn primary" data-rr="done">${ico('check')} ${esc(t('done'))}</button>
        </div></div>`;
    };
    openModal({
      title: `${esc(r.icon || '🔁')} ${esc(r.name)}`, body: '<div id="rr"></div>',
      onMount: w => { wref = w; draw(); },
      onClick: e => {
        const b = e.target.closest('[data-rr]'); if (!b) return; const h = steps[i];
        if (b.dataset.rr === 'done') { markDone(h); vibrate(10); i++; draw(); }
        if (b.dataset.rr === 'skip') { i++; draw(); }
        if (b.dataset.rr === 'timer') openTimer(h, () => { i++; draw(); });
      }
    });
  }

  /* ---------- plantillas, retos y menú «crear» ---------- */
  const PACKS = {
    salud: [['Beber 2 L de agua', 'Drink 2 L of water', '💧', { measure: 'amount', target: 2, unit: 'L', step: .25 }], ['Dormir 8 horas', 'Sleep 8 hours', '😴', { timeOfDay: 'night' }], ['Comer fruta', 'Eat fruit', '🍎', {}], ['Caminar 10.000 pasos', 'Walk 10,000 steps', '🚶', { measure: 'amount', target: 10000, unit: 'pasos|steps', step: 1000 }], ['Lavarte los dientes', 'Brush your teeth', '🦷', { target: 2 }]],
    estudio: [['Estudiar', 'Study', '✍️', { duration: 45, timeOfDay: 'afternoon' }], ['Leer', 'Read', '📚', { measure: 'amount', target: 20, unit: 'páginas|pages', step: 5, timeOfDay: 'night' }], ['Repasar apuntes', 'Review notes', '🧠', {}], ['Móvil mientras estudio', 'Phone while studying', '📵', { kind: 'quit' }]],
    finanzas: [['Apuntar gastos', 'Log expenses', '💰', { timeOfDay: 'night' }], ['Revisar presupuesto', 'Review budget', '📈', { freq: 'weekly', target: 1 }], ['Compras impulsivas', 'Impulse buying', '🛍️', { kind: 'quit' }], ['Ahorrar', 'Save money', '🐷', { measure: 'amount', target: 5, unit: '€', step: 1 }]],
    deporte: [['Gimnasio', 'Gym', '🏋️', { freq: 'weekly', target: 3 }], ['Estiramientos', 'Stretching', '🧘', { duration: 10, timeOfDay: 'morning' }], ['Correr', 'Running', '🏃', { measure: 'amount', target: 15, unit: 'km', step: 1, freq: 'weekly' }], ['Tomar proteína', 'Take protein', '🥛', {}]],
    mente: [['Meditar', 'Meditate', '🧘', { duration: 10, timeOfDay: 'morning' }], ['Escribir un diario', 'Journal', '📝', { timeOfDay: 'night' }], ['Gratitud: 3 cosas', 'Gratitude: 3 things', '🙏', { timeOfDay: 'night' }], ['Redes antes de dormir', 'Social media before bed', '📵', { kind: 'quit' }]]
  };
  const PACK_ICONS = { salud: '❤️', estudio: '🎓', finanzas: '💶', deporte: '💪', mente: '🧠' };
  // Las unidades con «es|en» se traducen al crear
  const unitL = u => u && u.includes('|') ? L2(...u.split('|')) : u;
  const CHALLENGES = [
    ['sugar66', '66 días sin azúcar', '66 days without sugar', '🍬', 66, { kind: 'quit' }],
    ['read30', '30 días de lectura', '30 days of reading', '📚', 30, { timeOfDay: 'night' }],
    ['meditate21', '21 días meditando', '21 days of meditation', '🧘', 21, { duration: 10, timeOfDay: 'morning' }],
    ['steps30', '30 días con 10.000 pasos', '30 days of 10,000 steps', '🚶', 30, { measure: 'amount', target: 10000, unit: 'pasos|steps', step: 1000 }],
    ['social30', '30 días sin redes sociales', '30 days without social media', '📵', 30, { kind: 'quit' }],
    ['water30', '30 días bebiendo 2 L', '30 days drinking 2 L', '💧', 30, { measure: 'amount', target: 2, unit: 'L', step: .25 }],
    ['workout100', '100 días de ejercicio', '100 days of exercise', '💪', 100, {}],
    ['wake21', '21 días madrugando', '21 days waking up early', '⏰', 21, { timeOfDay: 'morning' }]
  ];
  const PROJECT_TEMPLATES = [
    ['weight', 'Llegar a mi peso objetivo', 'Reach my target weight', '⚖️', { type: 'numeric', start: 80, target: 72, unit: 'kg' }],
    ['savings', 'Ahorrar 1.000 €', 'Save €1,000', '💰', { type: 'numeric', start: 0, target: 1000, unit: '€' }],
    ['books', 'Leer 12 libros', 'Read 12 books', '📚', { type: 'numeric', start: 0, target: 12, unit: 'libros|books' }],
    ['language', 'Aprender un idioma', 'Learn a language', '🗣️', { type: 'checklist', items: ['A1', 'A2', 'B1', 'B2', 'C1'] }],
    ['run10k', 'Correr 10 km', 'Run 10 km', '🏃', { type: 'numeric', start: 0, target: 10, unit: 'km' }]
  ];
  function newHabitFrom(name, icon, extra = {}) {
    const x = { ...extra }; if (x.unit) x.unit = unitL(x.unit);
    return { id: uid(), kind: 'build', name, icon, color: null, autoColor: HABIT_COLORS[state.colorSeq++ % HABIT_COLORS.length], freq: 'daily', target: 1, multi: false, note: '', days: [0, 1, 2, 3, 4, 5, 6], timeOfDay: 'any', createdAt: todayKey(), archived: false, ...x };
  }
  function openCreateMenu() {
    const opt = (act, icon, title, sub) => `<button class="create-opt clay" data-create="${act}"><span style="font-size:30px">${icon}</span><span class="grow"><b>${esc(title)}</b><br><span class="muted small">${esc(sub)}</span></span>${ico('right')}</button>`;
    openModal({
      title: esc(t('createTitle')),
      body: `<div class="stack" style="gap:12px">${opt('habit', '➕', t('newHabit'), t('createHabitSub'))}${opt('pack', '📦', t('fromTemplate'), t('createPackSub'))}${opt('challenge', '🏁', t('newChallenge'), t('createChallengeSub'))}${opt('routine', '🔁', t('newRoutine'), t('createRoutineSub'))}${opt('vacation', '🏖️', t('vacTitle'), t('vacHintShort'))}</div>`,
      onClick: (e, close) => {
        const b = e.target.closest('[data-create]'); if (!b) return; close();
        ({ habit: () => openHabitEditor(), pack: openPacks, challenge: openChallenges, routine: () => openRoutineEditor(), vacation: openVacations })[b.dataset.create]();
      }
    });
  }
  function packSub(x) {
    if (x.kind === 'quit') return t('kindQuit');
    const per = ' / ' + t(x.freq === 'weekly' ? 'periodWeek' : 'periodDay');
    let s = x.measure === 'amount' ? `${fmtNum(x.target)} ${unitL(x.unit)}${per}` : x.freq === 'weekly' ? t('timesPer', { n: x.target, period: t('periodWeek') }) : x.target > 1 ? t('timesPer', { n: x.target, period: t('periodDay') }) : t('freqDaily');
    if (x.duration) s += ` · ⏱ ${x.duration} min`;
    return s;
  }
  function openPacks() {
    let pack = 'salud', wref; const sel = new Set();
    const draw = () => {
      $('#pk', wref).innerHTML = `<div class="seg" style="flex-wrap:wrap">${Object.keys(PACKS).map(p => `<button data-pack="${p}" class="${pack === p ? 'on' : ''}">${PACK_ICONS[p]} ${esc(t('pack_' + p))}</button>`).join('')}</div>
        <div class="stack" style="gap:10px;margin-top:14px">${PACKS[pack].map(([es, en, icon, x], i) => { const id = pack + ':' + i; return `<label class="today-row clay" style="cursor:pointer"><span style="font-size:24px">${icon}</span><span class="grow"><b>${esc(L2(es, en))}</b><br><span class="muted small">${esc(packSub(x))}</span></span><input type="checkbox" data-pk-sel="${id}" ${sel.has(id) ? 'checked' : ''} style="width:24px;height:24px;accent-color:var(--accent)"></label>`; }).join('')}</div>`;
    };
    openModal({
      title: `📦 ${esc(t('fromTemplate'))}`, body: '<div id="pk"></div>',
      foot: `<button class="btn" data-pk-proj>${ico('target')} ${esc(t('projectTemplates'))}</button><button class="btn primary" data-pk-add>${ico('plus')} ${esc(t('addSelected'))}</button>`,
      onMount: w => { wref = w; draw(); },
      onClick: (e, close) => {
        let el;
        if ((el = e.target.closest('[data-pack]'))) { pack = el.dataset.pack; draw(); return; }
        if ((el = e.target.closest('[data-pk-sel]'))) { if (el.checked) sel.add(el.dataset.pkSel); else sel.delete(el.dataset.pkSel); return; }
        if (e.target.closest('[data-pk-proj]')) { close(); openProjectTemplates(); return; }
        if (e.target.closest('[data-pk-add]')) {
          if (!sel.size) { toast(t('selectSomething')); return; }
          for (const id of sel) { const [p, i] = id.split(':'); const [es, en, icon, x] = PACKS[p][+i]; state.habits.push(newHabitFrom(L2(es, en), icon, x)); }
          save(); close(); state.ui.tab = 'habits'; render(); toast(t('addedN', { n: sel.size }));
        }
      }
    });
  }
  function openProjectTemplates() {
    openModal({
      title: `🎯 ${esc(t('projectTemplates'))}`,
      body: `<div class="stack" style="gap:10px">${PROJECT_TEMPLATES.map(([id, es, en, icon, g]) => `<button class="create-opt clay" data-ptpl="${id}"><span style="font-size:28px">${icon}</span><span class="grow"><b>${esc(L2(es, en))}</b><br><span class="muted small">${esc(g.type === 'numeric' ? `${fmtNum(g.start)} → ${fmtNum(g.target)} ${unitL(g.unit)}` : g.items.join(' · '))}</span></span>${ico('right')}</button>`).join('')}</div>`,
      onClick: (e, close) => {
        const b = e.target.closest('[data-ptpl]'); if (!b) return;
        const [, es, en, icon, g] = PROJECT_TEMPLATES.find(x => x[0] === b.dataset.ptpl);
        close();
        openProjectEditor(null, { name: L2(es, en), icon, goal: { type: g.type, start: g.start || 0, target: g.target || 0, unit: unitL(g.unit || ''), entries: [], items: (g.items || []).map(text => ({ id: uid(), text, done: false })), achieved: false } });
      }
    });
  }
  function openChallenges() {
    openModal({
      title: `🏁 ${esc(t('newChallenge'))}`,
      body: `<p class="muted small" style="margin-top:0">${esc(t('challengeHint'))}</p><div class="stack" style="gap:10px">${CHALLENGES.map(([id, es, en, icon, days, x]) => `<button class="create-opt clay" data-chal="${id}"><span style="font-size:28px">${icon}</span><span class="grow"><b>${esc(L2(es, en))}</b><br><span class="muted small">${esc((x.kind === 'quit' ? t('kindQuit') + ' · ' : '') + t('challengeDays', { n: days }))}</span></span>${ico('right')}</button>`).join('')}</div>`,
      onClick: (e, close) => {
        const b = e.target.closest('[data-chal]'); if (!b) return;
        const [id, es, en, icon, days, x] = CHALLENGES.find(c => c[0] === b.dataset.chal);
        state.habits.push(newHabitFrom(L2(es, en), icon, { ...x, challenge: { tid: id, days, start: todayKey() } }));
        save(); close(); state.ui.tab = 'habits'; render(); toast(t('challengeStarted'));
      }
    });
  }
  // Días cumplidos desde que empezó el reto
  function challengeProgress(h) {
    const c = h.challenge; if (!c) return 0;
    const end = isQuit(h) ? addDays(todayKey(), -1) : todayKey(); let n = 0;
    for (let k = c.start; k <= end; k = addDays(k, 1)) if (isQuit(h) ? !cnt(h, k) : cnt(h, k) >= dayGoal(h)) n++;
    return n;
  }
  function checkChallenge(h, silent = false) {
    const c = h.challenge; if (!c || c.done) return;
    if (challengeProgress(h) < c.days) return;
    c.done = todayKey();
    const card = { id: h.id + '_' + c.start, hid: h.id, name: h.name, icon: h.icon, days: c.days, start: c.start, end: todayKey(), serial: ++state.serial };
    state.challengeCards.push(card); save();
    if (!silent) setTimeout(() => whenFree(() => openTrophy(challengeCardHtml(card), t('challengeDone'), t('challengeDoneMsg', { name: h.name }), () => trophyCanvas('challenge', card))), 400);
  }

  /* ---------- cartas secretas ---------- */
  const countTimes = test => { let n = 0; for (const m of Object.values(state.ltime)) for (const tm of Object.values(m)) if (typeof tm === 'string' && test(tm)) n++; return n; };
  function bestEnergy5Run() {
    let run = 0, best = 0, prev = null;
    for (const k of Object.keys(state.energy).sort()) {
      run = state.energy[k] === 5 ? (prev && addDays(prev, 1) === k ? run + 1 : 1) : 0;
      prev = k; best = Math.max(best, run);
    }
    return best;
  }
  function hasComeback(h) {
    if (isQuit(h) || h.freq !== 'daily') return false;
    let misses = 0, armed = false, run = 0;
    for (const p of periodsBetween(h, firstKey(h), todayKey())) {
      const s = periodState(h, p);
      if (s === 'miss') { misses++; run = 0; if (misses >= 3) armed = true; }
      else if (s === 'done') { misses = 0; run++; if (armed && run >= 7) return true; }
    }
    return false;
  }
  const SECRETS = [
    ['perfectWeek', '🌟', () => pointsInfo().bestPerfectRun >= 7],
    ['perfect30', '💎', () => pointsInfo().perfectDays >= 30],
    ['earlyBird', '🌅', () => countTimes(tm => tm < '08:00') >= 15],
    ['nightOwl', '🦉', () => countTimes(tm => tm >= '23:00') >= 15],
    ['comeback', '🔄', () => state.habits.some(hasComeback)],
    ['collector', '🃏', () => state.habits.reduce((a, h) => a + unlockedCount(h), 0) >= 25],
    ['contract3', '📜', () => state.contractCards.length >= 3],
    ['quit30', '🕊️', () => state.habits.some(h => isQuit(h) && bestStreak(h) >= 30)],
    ['routine10', '🔁', () => Object.values(state.routineRuns).reduce((a, b) => a + b, 0) >= 10],
    ['focus100', '⏱️', () => (state.stats.timerMin || 0) >= 100],
    ['energy5', '⚡', () => bestEnergy5Run() >= 7],
    ['centurion', '🏛️', () => state.habits.reduce((a, h) => a + (isQuit(h) ? 0 : isAmount(h) ? Object.keys(state.logs[h.id] || {}).length : totalEntries(h)), 0) >= 1000]
  ];
  function checkSecrets(silent = false) {
    for (const [id, icon, test] of SECRETS) {
      if (state.secrets[id]) continue;
      let ok = false; try { ok = test(); } catch (e) { ok = false; }
      if (!ok) continue;
      state.secrets[id] = todayKey(); save();
      if (!silent) setTimeout(() => whenFree(() => openTrophy(secretCardHtml(id, icon), t('secretUnlocked'), t('secd_' + id), () => trophyCanvas('secret', { id, icon }))), 450);
    }
  }
  function secretCardHtml(id, icon) {
    const on = !!state.secrets[id];
    return `<div class="ccard scard ${on ? '' : 'locked'}" style="--t:#c4b5fd;--t2:#2e1065"><div class="cc-in">
      <div class="cc-top">${esc(t('secretCard'))}</div>
      <div class="cc-seal" style="font-size:12cqw">${on ? icon : '?'}</div>
      <div class="cc-title">${on ? esc(t('sec_' + id)) : '???'}</div>
      <div class="cc-name" style="font-size:3.6cqw;text-transform:none;line-height:1.3">${on ? esc(t('secd_' + id)) : esc(t('secretHidden'))}</div>
      <div class="cc-dates">${on ? esc(fmtShort(state.secrets[id])) : '· · ·'}</div>
    </div></div>`;
  }
  function challengeCardHtml(c) {
    return `<div class="ccard" style="--t:#5eead4;--t2:#053b38"><div class="cc-in">
      <div class="cc-top">KEEPGOING</div><div class="cc-seal" style="font-size:11cqw">${esc(c.icon || '🏁')}</div>
      <div class="cc-title">${esc(t('challengeDone'))}</div><div class="cc-name">${esc(c.name)}</div>
      <div class="cc-dates">${esc(fmtShort(c.start))} – ${esc(fmtShort(c.end))}</div>
      <div><div class="cc-big">${c.days}</div><div class="cc-lbl">${esc(t('daysCompleted'))}</div></div>
      <div class="cc-serial">${esc(t('masterySerial', { n: String(c.serial).padStart(4, '0') }))}</div>
    </div></div>`;
  }
  // Ventana de trofeo genérica (retos, cartas secretas)
  function openTrophy(cardHtml, title, msg, canvasFn) {
    vibrate([20, 40, 20]);
    openModal({
      cls: 'card-view',
      body: `<div class="flip unlock-burst" style="cursor:default"><div class="flip-inner">${cardHtml}</div></div>
        <div class="card-view-cap"><div style="font-size:22px;font-weight:900;margin-bottom:4px">${esc(title)}</div><small>${esc(msg)}</small></div>
        <div class="row" style="justify-content:center;margin-top:16px">${canvasFn ? `<button class="btn" data-m="share">${ico('upload')} ${esc(t('share'))}</button>` : ''}<button class="btn" data-m="x">${esc(t('close'))}</button></div>`,
      onClick: e => { if (canvasFn && e.target.closest('[data-m="share"]')) shareCanvas(canvasFn, 'keepgoing-trofeo.png', title); }
    });
  }
  async function trophyCanvas(kind, d) {
    await fontsReady();
    const W = CARD_W, H = CARD_H, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    const [tc, t2] = kind === 'secret' ? ['#c4b5fd', '#2e1065'] : ['#5eead4', '#053b38'];
    const g = ctx.createRadialGradient(W / 2, H * .1, 50, W / 2, H * .3, H); g.addColorStop(0, t2); g.addColorStop(.75, '#07070a'); g.addColorStop(1, '#07070a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = tc; ctx.lineWidth = 7; ctx.strokeRect(40, 40, W - 80, H - 80); ctx.lineWidth = 2; ctx.strokeRect(62, 62, W - 124, H - 124);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const txt = (s, y, size, color, weight = 500) => { ctx.font = `${weight} ${size}px Cinzel, Georgia, serif`; ctx.fillStyle = color; ctx.fillText(s, W / 2, y); };
    if (kind === 'secret') {
      txt(t('secretCard').toUpperCase(), 160, 40, tc); ctx.font = '220px serif'; ctx.fillText(d.icon, W / 2, 480);
      txt(t('sec_' + d.id).toUpperCase(), 760, 72, tc, 700);
      ctx.font = '500 38px Cinzel, Georgia, serif'; ctx.fillStyle = '#ffffffcc'; wrapLines(ctx, t('secd_' + d.id), W - 240, 4).forEach((ln, j) => ctx.fillText(ln, W / 2, 880 + j * 54));
      txt(fmtShort(state.secrets[d.id] || todayKey()), 1400, 34, '#ffffff99');
    } else {
      txt('KEEPGOING', 160, 38, tc); ctx.font = '200px serif'; ctx.fillText(d.icon || '🏁', W / 2, 420);
      txt(t('challengeDone').toUpperCase(), 640, 70, tc, 700); txt(String(d.name).toUpperCase(), 740, 50, '#fff');
      txt(`${fmtShort(d.start)} – ${fmtShort(d.end)}`, 810, 34, '#ffffffbb'); txt(String(d.days), 1010, 200, '#fff', 700);
      txt(t('daysCompleted').toUpperCase(), 1140, 34, '#ffffffbb'); txt(t('masterySerial', { n: String(d.serial).padStart(4, '0') }), 1430, 30, '#ffffff99');
    }
    return cv;
  }

  /* ---------- descubrimientos (correlaciones) ---------- */
  function insightsList() {
    const out = [], today = todayKey(), from = addDays(today, -89);
    const D = state.habits.filter(h => !h.archived && !isQuit(h) && h.freq === 'daily');
    const days = []; for (let k = from; k < today; k = addDays(k, 1)) days.push(k);
    const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
    for (const h of D) {
      const yes = [], no = [];
      days.forEach(k => { const e = state.energy[k]; const s = dayScore(h, k); if (!e || s == null) return; (s >= 1 ? yes : no).push(e); });
      if (yes.length >= 5 && no.length >= 5) { const a = avg(yes), b = avg(no); if (Math.abs(a - b) >= .4) out.push({ score: Math.abs(a - b) * 2, icon: '⚡', text: t(a > b ? 'insEnergyUp' : 'insEnergyDown', { h: `${h.icon} ${h.name}`, a: fmtNum(Math.round(a * 10) / 10), b: fmtNum(Math.round(b * 10) / 10) }) }); }
    }
    for (const A of D) for (const B of D) {
      if (A === B) continue;
      let ay = 0, ayb = 0, an = 0, anb = 0;
      days.forEach(k => { const sa = dayScore(A, k), sb = dayScore(B, k); if (sa == null || sb == null) return; if (sa >= 1) { ay++; if (sb >= 1) ayb++; } else { an++; if (sb >= 1) anb++; } });
      if (ay >= 7 && an >= 5) { const p1 = ayb / ay, p2 = anb / an; if (p1 - p2 >= .25) out.push({ score: p1 - p2, icon: '🔗', text: t('insPair', { a: `${A.icon} ${A.name}`, b: `${B.icon} ${B.name}`, p1: Math.round(p1 * 100), p2: Math.round(p2 * 100) }) }); }
    }
    if (D.length) {
      const opp = Array(7).fill(0), ok = Array(7).fill(0);
      days.forEach(k => D.forEach(h => { const s = dayScore(h, k); if (s != null) { opp[wdOf(k)]++; if (s >= 1) ok[wdOf(k)]++; } }));
      const names = t('weekdaysLong').split(',');
      const valid = opp.map((o, i) => [o >= 4 ? ok[i] / o : null, i]).filter(x => x[0] != null);
      if (valid.length >= 5) {
        const best = valid.reduce((a, b) => b[0] > a[0] ? b : a), worst = valid.reduce((a, b) => b[0] < a[0] ? b : a);
        if (best[0] - worst[0] >= .15) out.push({ score: best[0] - worst[0], icon: '📅', text: t('insWeekday', { best: names[best[1]], b: Math.round(best[0] * 100), worst: names[worst[1]], w: Math.round(worst[0] * 100) }) });
      }
    }
    const eAvg = (a, b) => { const v = []; for (let k = a; k <= b; k = addDays(k, 1)) if (state.energy[k]) v.push(state.energy[k]); return v.length >= 3 ? avg(v) : null; };
    const e1 = eAvg(addDays(today, -6), today), e0 = eAvg(addDays(today, -13), addDays(today, -7));
    if (e1 != null && e0 != null && Math.abs(e1 - e0) >= .4) out.push({ score: .3, icon: '📈', text: t(e1 > e0 ? 'insEnergyWeekUp' : 'insEnergyWeekDown', { a: fmtNum(Math.round(e1 * 10) / 10), b: fmtNum(Math.round(e0 * 10) / 10) }) });
    return out.sort((a, b) => b.score - a.score).slice(0, 6);
  }

  /* ---------- revisión semanal ---------- */
  let reviewOffered = false;
  function maybeWeeklyReview() {
    if (reviewOffered || !promptOn('weeklyReview') || !state.habits.length) return;
    const k = todayKey(), wd = wdOf(k);
    const week = wd === 6 ? weekStart(k) : wd === 0 ? weekStart(addDays(k, -1)) : null;
    if (!week || state.reviews[week] || state.ui.reviewSkip === week) return;
    reviewOffered = true;
    whenFree(() => openReview(week, true));
  }
  function weekSummary(week) {
    const end = addDays(week, 6), last = end > todayKey() ? todayKey() : end; let perfect = 0, pts = 0;
    for (let k = week; k <= last; k = addDays(k, 1)) { const d = dayInfo(k); if (d.perfect) perfect++; pts += d.pts; }
    const rates = state.habits.filter(h => !h.archived).map(h => rate(h, 7, last)).filter(r => r != null);
    return { perfect, pts, rate: rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length * 100) : null };
  }
  function openReview(week, auto = false) {
    const prev = state.reviews[week] || {}, s = weekSummary(week);
    openModal({
      title: `📝 ${esc(t('reviewTitle'))}`,
      body: `<p class="muted" style="margin-top:0">${esc(t('reviewWeek', { a: fmtDate(week, { day: 'numeric', month: 'short' }), b: fmtDate(addDays(week, 6), { day: 'numeric', month: 'short' }) }))}</p>
        <div class="kpis" style="margin-bottom:14px"><div class="kpi clay"><b>${s.rate == null ? '—' : s.rate + '%'}</b><span>${esc(t('kpiRate'))}</span></div><div class="kpi clay"><b>${s.perfect}</b><span>${esc(t('perfectDays'))}</span></div><div class="kpi clay"><b>${fmtNum(s.pts)} ⭐</b><span>${esc(t('ptsEarned'))}</span></div></div>
        <div class="stack">
          <label class="field"><span>${esc(t('reviewGood'))}</span><textarea class="input" id="rv-good" maxlength="500">${esc(prev.good || '')}</textarea></label>
          <label class="field"><span>${esc(t('reviewAdjust'))}</span><textarea class="input" id="rv-adj" maxlength="500">${esc(prev.adjust || '')}</textarea></label>
          <label class="field"><span>${esc(t('reviewScore'))}: <b id="rv-sv">${prev.score || 7}</b>/10</span><input type="range" id="rv-score" min="1" max="10" value="${prev.score || 7}"></label>
        </div>${auto ? dontRemindHtml() : ''}`,
      foot: `<button class="btn" data-rv="skip">${esc(t(auto ? 'skip' : 'cancel'))}</button><button class="btn primary" data-rv="save">${esc(t('save'))}</button>`,
      onMount: w => w.addEventListener('input', e => { if (e.target.id === 'rv-score') $('#rv-sv', w).textContent = e.target.value; }),
      onClick: (e, close, w) => {
        const b = e.target.closest('[data-rv]'); if (!b) return;
        if (auto) readDontRemind(w, 'weeklyReview');
        if (b.dataset.rv === 'skip') { if (auto) { state.ui.reviewSkip = week; save(); } close(); return; }
        state.reviews[week] = { good: $('#rv-good', w).value.trim(), adjust: $('#rv-adj', w).value.trim(), score: +$('#rv-score', w).value, date: todayKey() };
        save(); close(); toast(t('saved')); if (state.ui.tab === 'charts') render();
      }
    });
  }

  /* ---------- informe mensual en PDF (imprimir → Guardar como PDF) ---------- */
  function openReport() {
    const m0 = monthKey(todayKey()), m1 = monthKey(addMonths(todayKey(), -1));
    openModal({
      title: `📄 ${esc(t('reportTitle'))}`,
      body: `<p class="muted" style="margin-top:0">${esc(t('reportHint'))}</p><label class="field"><span>${esc(t('reportMonth'))}</span><input class="input" type="month" id="rp-m" value="${m0}" max="${m0}"></label>
        <div class="row wrap" style="margin-top:12px"><button class="chip" data-rp="${m0}">${esc(fmtDate(m0 + '-01', { month: 'long', year: 'numeric' }))}</button><button class="chip" data-rp="${m1}">${esc(fmtDate(m1 + '-01', { month: 'long', year: 'numeric' }))}</button></div>`,
      foot: `<button class="btn primary block" data-rp-go>${ico('download')} ${esc(t('reportCreate'))}</button>`,
      onClick: (e, close, w) => {
        const c = e.target.closest('[data-rp]'); if (c) { $('#rp-m', w).value = c.dataset.rp; return; }
        if (e.target.closest('[data-rp-go]')) { const m = $('#rp-m', w).value; if (m) { close(); printReport(m); } }
      }
    });
  }
  function printReport(m) {
    const from = m + '-01', last = addDays(addMonths(from, 1), -1), to = last > todayKey() ? todayKey() : last;
    const n = diffDays(from, to) + 1, days = []; for (let k = from; k <= to; k = addDays(k, 1)) days.push(k);
    const H = state.habits.filter(h => firstKey(h) <= to);
    let perfect = 0, pts = 0, entries = 0; const act = new Set(), en = [];
    days.forEach(k => { const d = dayInfo(k); if (d.perfect) perfect++; pts += d.pts; if (state.energy[k]) en.push(state.energy[k]); });
    H.forEach(h => { if (isQuit(h)) return; const L = state.logs[h.id] || {}; for (const k in L) if (k >= from && k <= to && L[k] > 0) { entries += isAmount(h) ? 1 : L[k]; act.add(k); } });
    const rates = H.map(h => rate(h, n, to)).filter(r => r != null);
    const rateP = rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length * 100) : null;
    const D = H.filter(h => h.freq === 'daily');
    const linePts = days.map(k => { const sc = D.map(h => dayScore(h, k)).filter(v => v != null); return { label: fmtDate(k, { day: 'numeric', month: 'short' }), v: sc.length ? sc.reduce((a, b) => a + b, 0) / sc.length * 100 : null }; });
    const cards = []; for (const h of state.habits) for (const [r, v] of Object.entries(state.mastery[h.id] || {})) if (v.date >= from && v.date <= to) cards.push(`${h.icon} ${h.name} · ${t('rank_' + r)}`);
    const reviews = Object.entries(state.reviews).filter(([w]) => w >= addDays(from, -6) && w <= to).sort();
    const monthName = fmtDate(from, { month: 'long', year: 'numeric' });
    const base = new URL('.', location.href).href;
    const r = document.documentElement;
    const kpi = (v, l) => `<div class="kpi clay"><b>${v}</b><span>${esc(l)}</span></div>`;
    const wdBars = t('weekdaysShort').split(',').map((l, i) => { let o = 0, ok = 0; days.forEach(k => { if (wdOf(k) !== i) return; D.forEach(h => { const s = dayScore(h, k); if (s != null) { o++; if (s >= 1) ok++; } }); }); return { label: l, v: o ? ok / o * 100 : 0 }; });
    const html = `<!doctype html><html lang="${state.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>KeepGoing · ${esc(monthName)}</title>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Nunito:wght@400;600;700;800;900&display=swap"><link rel="stylesheet" href="${base}css/app.css">
      <style>body{padding:28px;-webkit-print-color-adjust:exact;print-color-adjust:exact}.rep{max-width:960px;margin:0 auto}.rep h1{font-size:40px;margin:0;text-transform:capitalize}.rep h2{font-size:20px;margin:26px 0 12px}
      .chart-grid{grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}@page{size:A4;margin:10mm}@media print{.no-print{display:none}body{padding:0}.clay{break-inside:avoid}}</style></head>
      <body><div class="rep">
        <div class="row" style="justify-content:space-between;align-items:flex-end;flex-wrap:wrap"><div><div class="muted" style="font-weight:800;letter-spacing:.15em">KEEPGOING</div><h1>${esc(t('reportOf', { m: monthName }))}</h1>${state.contract ? `<div class="muted">${esc(state.contract.name)}</div>` : ''}</div><div class="no-print"><button class="btn primary" onclick="print()">${esc(t('reportSave'))}</button></div></div>
        <h2>${esc(t('reportSummary'))}</h2>
        <div class="kpis">${kpi(rateP == null ? '—' : rateP + '%', t('kpiRate'))}${kpi(perfect, t('perfectDays'))}${kpi(fmtNum(pts) + ' ⭐', t('ptsEarned'))}${kpi(entries, t('kpiTotal'))}${kpi(act.size, t('kpiActiveDays'))}${kpi(en.length ? fmtNum(en.reduce((a, b) => a + b, 0) / en.length) + '/5' : '—', t('energyAvg'))}</div>
        <div class="chart-grid"><section class="chart-card clay"><h3>${esc(t('chartDaily'))}</h3>${lineChart(linePts, { min: 0, max: 100, fmt: v => Math.round(v) + '%' })}</section>
          <section class="chart-card clay"><h3>${esc(t('chartWeekday'))}</h3>${barChart(wdBars, { max: 100, fmt: v => Math.round(v) + '%' })}</section></div>
        <h2>${esc(t('chartTable'))}</h2>
        <div class="clay card"><table class="tbl"><thead><tr><th>${esc(t('colHabit'))}</th><th class="num">${esc(t('kpiRate'))}</th><th class="num">${esc(t('colStreak'))}</th><th class="num">${esc(t('colBest'))}</th></tr></thead><tbody>${H.map(h => { const rr = rate(h, n, to); return `<tr><td>${esc(h.icon)} ${esc(h.name)}</td><td class="num">${rr == null ? '—' : Math.round(rr * 100) + '%'}</td><td class="num">${currentStreak(h)}</td><td class="num">${bestStreak(h)}</td></tr>`; }).join('')}</tbody></table></div>
        ${cards.length ? `<h2>${esc(t('reportCards'))}</h2><div class="clay card">${cards.map(c => `<div class="entry">${esc(c)}</div>`).join('')}</div>` : ''}
        ${reviews.length ? `<h2>${esc(t('reviewsTitle'))}</h2>${reviews.map(([w, v]) => `<div class="clay card" style="margin-bottom:12px"><b>${esc(fmtDate(w, { day: 'numeric', month: 'long' }))} · ${v.score}/10</b>${v.good ? `<p>👍 ${esc(v.good)}</p>` : ''}${v.adjust ? `<p>🔧 ${esc(v.adjust)}</p>` : ''}</div>`).join('')}` : ''}
        <p class="muted small center" style="margin-top:26px">KeepGoing · ${esc(fmtDate(todayKey()))}</p>
      </div><script>setTimeout(function(){try{print()}catch(e){}},1000)<\/script></body></html>`;
    const win = window.open('', '_blank');
    if (!win) { toast(t('reportBlocked')); return; }
    win.document.open(); win.document.write(html); win.document.close();
    const root = win.document.documentElement;
    root.setAttribute('style', r.getAttribute('style') || '');
    ['light', 'style', 'gradient'].forEach(k => { root.dataset[k] = r.dataset[k]; });
  }

  /* ---------- fotos de progreso (Supabase Storage privado) ---------- */
  const PHOTO_BUCKET = 'kg-photos', photoCache = new Map();
  function compressImage(file, max = 1600, q = .85) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => { const s = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src); c.toBlob(b => b ? res(b) : rej(new Error('img')), 'image/jpeg', q); };
      img.onerror = rej; img.src = URL.createObjectURL(file);
    });
  }
  async function uploadPhoto(p, kind, file) {
    if (!auth) { toast(t('photoNeedLogin')); return false; }
    await ensureToken();
    const blob = await compressImage(file);
    const path = `${auth.uid}/${p.id}/${kind}-${Date.now()}.jpg`;
    const res = await fetch(`${SB_URL}/storage/v1/object/${PHOTO_BUCKET}/${path}`, { method: 'POST', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + auth.access_token, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: blob });
    if (!res.ok) throw new Error((await res.text()).slice(0, 120));
    const old = p.photos[kind] && p.photos[kind].path;
    p.photos[kind] = { path, date: todayKey() }; save();
    if (old) fetch(`${SB_URL}/storage/v1/object/${PHOTO_BUCKET}/${old}`, { method: 'DELETE', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + auth.access_token } }).catch(() => {});
    return true;
  }
  async function photoURL(path) {
    if (photoCache.has(path)) return photoCache.get(path);
    if (!auth) return null;
    try {
      await ensureToken();
      const res = await fetch(`${SB_URL}/storage/v1/object/authenticated/${PHOTO_BUCKET}/${path}`, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + auth.access_token } });
      if (!res.ok) return null;
      const url = URL.createObjectURL(await res.blob()); photoCache.set(path, url); return url;
    } catch (e) { return null; }
  }
  // Rellena las <img data-photo="ruta"> que haya dentro de root
  function loadPhotos(root) { $$('img[data-photo]', root).forEach(async img => { const u = await photoURL(img.dataset.photo); if (u) img.src = u; else { const s = img.closest('.photo-slot, .ba-thumb'); if (s) s.classList.add('missing'); } }); }
  function photoSlot(p, kind) {
    const ph = p.photos[kind];
    return `<div class="photo-slot clay">${ph ? `<img data-photo="${esc(ph.path)}" alt="${esc(t('photo_' + kind))}">` : `<div class="photo-empty">${ico('image')}</div>`}
      <div class="photo-cap"><b>${esc(t('photo_' + kind))}</b>${ph ? `<span class="muted small">${esc(fmtShort(ph.date))}</span>` : ''}</div>
      <label class="chip photo-btn">${ico('upload')} ${esc(t(ph ? 'photoChange' : 'photoUpload'))}<input type="file" accept="image/*" data-photo-up="${kind}" class="hidden"></label></div>`;
  }
  function maybeAfterPhoto(p) {
    const s = projectStats(p);
    if (!s.achieved || !p.photos.before || p.photos.after || p.afterAsked || !promptOn('afterPhoto')) return;
    p.afterAsked = true; save();
    openModal({
      body: `<div class="center"><div style="font-size:54px">📸</div><h2 style="margin:6px 0">${esc(t('afterTitle'))}</h2><p class="muted">${esc(t('afterMsg', { name: p.name }))}</p>
        <label class="btn primary" style="margin-top:8px">${ico('upload')} ${esc(t('photoUpload'))}<input type="file" accept="image/*" id="after-up" class="hidden"></label>${dontRemindHtml()}</div>`,
      foot: `<button class="btn block" data-m="later">${esc(t('later'))}</button>`,
      onMount: (w, close) => w.addEventListener('change', async e => {
        if (e.target.id !== 'after-up' || !e.target.files[0]) return;
        readDontRemind(w, 'afterPhoto');
        try { toast(t('photoUploading')); await uploadPhoto(p, 'after', e.target.files[0]); toast(t('photoSaved')); close(); render(); } catch (err) { toast(t('photoError', { e: err.message })); }
      }),
      onClick: (e, close, w) => { if (e.target.closest('[data-m="later"]')) { readDontRemind(w, 'afterPhoto'); close(); } }
    });
  }

  /* ---------- «qué pasa si» y línea de tiempo de proyectos ---------- */
  function whatIfHtml(p, s) {
    if (s.achieved || !s.hs.length) return '';
    const rates = s.hs.map(h => rate(h, 30));
    const rows = s.hs.map((h, i) => {
      if (rates[i] == null) return '';
      const delta = h.freq === 'daily' ? 1 / 7 : h.freq === 'weekly' ? .25 : 1 / 3;
      const nr = rates.map((r, j) => j === i ? Math.min(1, (r || 0) + delta) : r).filter(r => r != null);
      const P2 = projectStats(p, nr.reduce((a, b) => a + b, 0) / nr.length).P;
      if (P2 <= s.P) return '';
      return `<div class="entry"><span>${esc(h.icon)} ${esc(t(h.freq === 'daily' ? 'wiDaily' : h.freq === 'weekly' ? 'wiWeekly' : 'wiMonthly', { h: h.name }))}</span><b>${s.P}% → ${P2}%</b></div>`;
    }).join('');
    return rows ? `<div style="margin-top:14px"><b class="small">${esc(t('whatIfTitle'))}</b>${rows}</div>` : '';
  }
  function timelineHtml(p) {
    const today = todayKey(), achieved = projectStats(p).achieved;
    const items = [{ date: p.createdAt, label: t('start'), kind: 'start', done: true },
      ...p.milestones.map(m => ({ ...m, label: m.text, kind: 'ms' })),
      ...(p.deadline ? [{ date: p.deadline, label: t('deadline'), kind: 'end', done: achieved }] : [])]
      .sort((a, b) => (a.date || '9999') < (b.date || '9999') ? -1 : 1);
    const todayItem = `<div class="tl-item tl-today"><i></i><div><b>${esc(t('today'))}</b><span class="muted small">${esc(fmtShort(today))}</span></div></div>`;
    let placed = false;
    return `<div class="timeline">${items.map(it => {
      let pre = '';
      if (!placed && (it.date || '9999') > today) { placed = true; pre = todayItem; }
      const late = it.kind === 'ms' && !it.done && it.date && it.date < today;
      return pre + `<div class="tl-item ${it.done ? 'done' : ''} ${late ? 'late' : ''}">${it.kind === 'ms' ? `<input type="checkbox" data-ms-toggle="${it.id}" ${it.done ? 'checked' : ''} aria-label="${esc(it.label)}">` : '<i></i>'}<div><b>${esc(it.label)}</b><span class="muted small">${it.date ? esc(fmtShort(it.date)) : esc(t('noDate'))}${late ? ' · ' + esc(t('late')) : ''}</span></div></div>`;
    }).join('')}${placed ? '' : todayItem}</div>`;
  }

  /* ---------- modales y avisos ---------- */
  // Las celebraciones esperan su turno si ya hay una ventana abierta
  const modalQueue = [];
  const whenFree = fn => { if ($('#modal-root').children.length) modalQueue.push(fn); else fn(); };
  function openModal({ title = '', body = '', foot = '', cls = '', onClick, onInput, onMount, onClose, dismissable = true }) {
    const root = $('#modal-root');
    const wrap = document.createElement('div'); wrap.className = 'backdrop';
    const isCard = cls.includes('card-view');
    wrap.innerHTML = `<div class="sheet ${cls}" role="dialog" aria-modal="true">${isCard ? '' : '<div class="sheet-grab"></div>'}${title ? `<div class="sheet-head"><h2>${title}</h2><button class="icon-btn sm" data-m="x" aria-label="${esc(t('close'))}">${ico('x')}</button></div>` : ''}<div class="sheet-body">${body}</div>${foot ? `<div class="sheet-foot">${foot}</div>` : ''}</div>`;
    if (isCard) { wrap.style.background = 'rgba(0,0,0,.9)'; wrap.style.backdropFilter = wrap.style.webkitBackdropFilter = 'blur(8px)'; }
    root.appendChild(wrap);
    document.body.style.overflow = 'hidden';
    const onKey = e => { if (e.key === 'Escape' && root.lastElementChild === wrap) close(); };
    const close = () => {
      wrap.remove(); document.removeEventListener('keydown', onKey);
      if (!root.children.length) document.body.style.overflow = '';
      onClose && onClose();
      if (!root.children.length && modalQueue.length) setTimeout(modalQueue.shift(), 280);
    };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', e => {
      if (e.target === wrap && dismissable) return close();
      if (e.target.closest('[data-m="x"]')) return close();
      onClick && onClick(e, close, wrap);
    });
    if (onInput) wrap.addEventListener('input', e => onInput(e, wrap));
    onMount && onMount(wrap, close);
    return { close, el: wrap };
  }
  function confirmDialog(msg) {
    return new Promise(res => {
      let answered = false;
      openModal({
        body: `<p style="font-size:17px;font-weight:700;margin:6px 0 0">${esc(msg)}</p>`,
        foot: `<button class="btn" data-c="0">${esc(t('cancel'))}</button><button class="btn danger" data-c="1">${esc(t('confirm'))}</button>`,
        onClick: (e, close) => { const b = e.target.closest('[data-c]'); if (b) { answered = true; close(); res(b.dataset.c === '1'); } },
        onClose: () => { if (!answered) res(false); }
      });
    });
  }
  function toast(msg) {
    const root = $('#toast-root'); const el = document.createElement('div');
    el.className = 'toast'; el.textContent = msg; root.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  /* =========================================================
     EVENTOS
     ========================================================= */
  // Pulsación larga en casillas y anillo → editor del día
  let lpTimer = null, lpFired = false, lpStart = null;
  function longPress(el) {
    if (el.matches('.dot[data-k]')) { const h = getHabit(el.closest('.dots').dataset.id); if (h) openDay(h, el.dataset.k); }
    else if (el.dataset.ring) { const h = getHabit(el.dataset.ring); if (h) openDay(h, todayKey()); }
  }
  document.addEventListener('pointerdown', e => {
    const el = e.target.closest('.dot[data-k], .ring[data-ring]');
    if (!el || e.button !== 0) return;
    lpFired = false; lpStart = [e.clientX, e.clientY];
    clearTimeout(lpTimer);
    lpTimer = setTimeout(() => { lpTimer = null; lpFired = true; vibrate(20); longPress(el); }, 480);
  });
  document.addEventListener('pointermove', e => {
    if (lpTimer && lpStart && Math.hypot(e.clientX - lpStart[0], e.clientY - lpStart[1]) > 8) { clearTimeout(lpTimer); lpTimer = null; }
  });
  ['pointerup', 'pointercancel'].forEach(n => document.addEventListener(n, () => { clearTimeout(lpTimer); lpTimer = null; }));
  document.addEventListener('contextmenu', e => {
    const el = e.target.closest('.dot[data-k], .ring[data-ring]');
    if (!el) return;
    e.preventDefault();
    if (!lpFired) { lpFired = true; longPress(el); }
  });

  document.addEventListener('click', e => {
    if (e.target.closest('#modal-root')) return;
    if (!state.onboarded) { onboardingClick(e); return; }
    // casillas
    const dot = e.target.closest('.dot[data-k]');
    if (dot) {
      if (lpFired) { lpFired = false; return; }
      const h = getHabit(dot.closest('.dots').dataset.id);
      if (h) { tapDay(h, dot.dataset.k); refreshHabit(h.id); }
      return;
    }
    const ring = e.target.closest('.ring[data-ring]');
    if (ring) {
      if (lpFired) { lpFired = false; return; }
      const h = getHabit(ring.dataset.ring);
      if (h && isQuit(h)) {
        // Recaída: se pide confirmación para registrarla; si ya había una hoy, se deshace
        if (cnt(h, todayKey())) { setCount(h, todayKey(), 0); refreshHabit(h.id); }
        else confirmDialog(t('quitConfirm', { name: h.name })).then(ok => { if (ok) { setCount(h, todayKey(), 1); vibrate(30); refreshHabit(h.id); } });
      } else if (h) { const before = periodDone(h, todayKey()); tapDay(h, todayKey()); refreshHabit(h.id, !before && periodDone(h, todayKey())); }
      return;
    }
    // vista Hoy, energía, rutinas y temporizador
    let el;
    if ((el = e.target.closest('[data-today]'))) {
      const h = getHabit(el.dataset.id); if (!h) return;
      const k = todayKey(), act = el.dataset.today;
      if (act === 'timer') openTimer(h);
      else if (act === 'slip') { if (cnt(h, k)) { setCount(h, k, 0); render(); } else confirmDialog(t('quitConfirm', { name: h.name })).then(ok => { if (ok) { setCount(h, k, 1); vibrate(30); render(); } }); }
      else if (isAmount(h)) openAmount(h, k);
      else { const before = dayInfo(k).perfect; tapDay(h, k); render(); if (!before && dayInfo(k).perfect) toast('🎉 ' + t('perfectToday')); }
      return;
    }
    if ((el = e.target.closest('[data-energy]'))) { const v = +el.dataset.energy, k = todayKey(); if (state.energy[k] === v) delete state.energy[k]; else state.energy[k] = v; save(); checkSecrets(); vibrate(8); render(); return; }
    if ((el = e.target.closest('[data-routine-run]'))) { const r = state.routines.find(x => x.id === el.dataset.routineRun); if (r) runRoutine(r); return; }
    if ((el = e.target.closest('[data-routine-edit]'))) { const r = state.routines.find(x => x.id === el.dataset.routineEdit); if (r) openRoutineEditor(r); return; }
    if ((el = e.target.closest('[data-timer]'))) { const h = getHabit(el.dataset.timer); if (h) openTimer(h); return; }
    const a = e.target.closest('[data-act]'); if (!a) return;
    const id = a.dataset.id;
    switch (a.dataset.act) {
      case 'go': state.ui.tab = a.dataset.tab; save(); render(); window.scrollTo(0, 0); break;
      case 'create': openCreateMenu(); break;
      case 'packs': openPacks(); break;
      case 'hview': state.ui.habitsView = a.dataset.v; save(); render(); break;
      case 'vacations': openVacations(); break;
      case 'level': openLevel(); break;
      case 'proj-tpl': openProjectTemplates(); break;
      case 'report': openReport(); break;
      case 'review-now': openReview(weekStart(todayKey())); break;
      case 'review-open': openReview(a.dataset.v); break;
      case 'secret-open': { const s = SECRETS.find(x => x[0] === id); if (s) openTrophy(secretCardHtml(s[0], s[1]), state.secrets[id] ? t('sec_' + id) : '???', state.secrets[id] ? t('secd_' + id) : t('secretHidden'), state.secrets[id] ? () => trophyCanvas('secret', { id, icon: s[1] }) : null); break; }
      case 'chal-open': { const c = state.challengeCards.find(x => x.id === id); if (c) openTrophy(challengeCardHtml(c), t('challengeDone'), c.name, () => trophyCanvas('challenge', c)); break; }
      case 'settings': openSettings(); break;
      case 'habit-new': openHabitEditor(); break;
      case 'habit-edit': openHabitEditor(getHabit(id)); break;
      case 'toggle-archived': state.ui.showArchived = !state.ui.showArchived; save(); render(); break;
      case 'contract': openContract(); break;
      case 'contract-renew': renewContract(); break;
      case 'proj-new': openProjectEditor(); break;
      case 'proj-open': { const p = state.projects.find(x => x.id === id); if (p) openProject(p); break; }
      case 'range': state.ui.range = a.dataset.v === 'all' ? 'all' : +a.dataset.v; save(); render(); break;
      case 'card-open': { const h = getHabit(id); if (h) openCard(h, +a.dataset.i); break; }
      case 'ranks-info': openRanks(); break;
      case 'cc-open': { const cc = state.contractCards.find(x => x.id === id); if (cc) openContractCard(cc); break; }
    }
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'chart-habit') { state.ui.chartHabit = e.target.value; save(); render(); }
  });
  document.addEventListener('pointerover', e => {
    const el = e.target.closest && e.target.closest('[data-tip]');
    const box = el && el.closest('.chart');
    if (box) showTip(box, el); else hideTip();
  });

  // Redimensionar: recalcula cuántas semanas caben en las tarjetas
  let rsz, lastW = window.innerWidth;
  window.addEventListener('resize', () => { clearTimeout(rsz); rsz = setTimeout(() => { if (!state.onboarded || window.innerWidth === lastW) return; lastW = window.innerWidth; if (state.ui.tab === 'habits') fitGrids(); else if (state.ui.tab === 'charts') render(); }, 150); });
  // Cambio de día (app abierta a medianoche o al volver)
  let lastDay = todayKey();
  // Los hábitos a dejar ganan cartas con el paso de los días: se comprueban al cambiar de día
  const dayCheck = () => {
    if (todayKey() === lastDay) return;
    lastDay = todayKey(); render();
    state.habits.filter(isQuit).forEach(h => { checkMastery(h); checkChallenge(h); });
    checkSecrets(); offerShields(); maybeWeeklyReview();
  };
  setInterval(dayCheck, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) dayCheck(); });

  /* ---------- PWA (solo cuando se sirve por http/https) ---------- */
  if (location.protocol.startsWith('http')) {
    const l = document.createElement('link'); l.rel = 'manifest'; l.href = 'manifest.webmanifest'; document.head.appendChild(l);
    if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  // Sincroniza cartas ya ganadas (por ejemplo, tras importar) y arranca
  state.habits.forEach(h => { checkMastery(h, !isQuit(h)); checkChallenge(h, !isQuit(h)); });
  checkSecrets(true);
  render();
  if (auth) scheduleSync(400);
  // Acción desde Atajos de iOS: ?check=<id del hábito> marca el hábito de hoy
  (() => {
    const id = new URLSearchParams(location.search).get('check'); if (!id || !state.onboarded) return;
    history.replaceState(null, '', location.pathname);
    const h = getHabit(id); if (!h) { toast(t('shortcutUnknown')); return; }
    const k = todayKey();
    if (isQuit(h)) { toast(t('shortcutQuit')); return; }
    if (isAmount(h)) setCount(h, k, cnt(h, k) + (+h.step || 1));
    else if (isMulti(h) || !cnt(h, k)) setCount(h, k, cnt(h, k) + 1);
    render(); vibrate(20); toast(t('shortcutDone', { name: h.name }));
  })();
  setTimeout(() => { if (state.onboarded) { offerShields(); maybeWeeklyReview(); } }, 1200);
  // Solo para pruebas en local
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') window.__kg = { mergeStates, stampChanges };
})();
