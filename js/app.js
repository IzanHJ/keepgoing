/* =========================================================
   KeepGoing — app (vanilla JS, sin dependencias)
   Datos: localStorage («keepgoing.v1»). Copias: exportar/importar .json
   ========================================================= */
(() => {
  'use strict';

  const VERSION = '1.2.0';
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
  const fmtNum = v => new Intl.NumberFormat(state.lang, { maximumFractionDigits: 1 }).format(v);

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
    { id: 'minimal', es: 'Minimal', en: 'Minimal', bg: '#ffffff', fg: '#000000', accent: '#000000', style: 'minimal' }
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
    right: '<path d="M9 6l6 6-6 6"/>'
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
      ui: { tab: 'habits', range: 30, chartHabit: 'all', showArchived: false }
    };
  }
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
    for (const k of ['deleted', 'lmt', 'rmt']) out[k] = s[k] && typeof s[k] === 'object' ? s[k] : {};
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
    lastSaved = JSON.stringify(state);
    try { localStorage.setItem(STORE_KEY, lastSaved); } catch (e) { /* modo privado */ }
    scheduleSync();
  }
  // Guarda sin marcar cambios (cuando el estado viene de la nube)
  function saveSilently() {
    lastSaved = JSON.stringify(state);
    try { localStorage.setItem(STORE_KEY, lastSaved); } catch (e) { /* modo privado */ }
  }

  /* ---------- marcas de tiempo para fusionar ---------- */
  const strip = o => { if (!o) return ''; const { mt, ...rest } = o; return JSON.stringify(rest); };
  function stampChanges(prev, cur) {
    const now = Date.now();
    cur.deleted = cur.deleted || {}; cur.lmt = cur.lmt || {}; cur.rmt = cur.rmt || {};
    for (const key of ['habits', 'projects']) {
      const pm = new Map((prev[key] || []).map(x => [x.id, x]));
      cur[key].forEach(x => { if (strip(x) !== strip(pm.get(x.id))) x.mt = now; });
      (prev[key] || []).forEach(x => { if (!cur[key].some(y => y.id === x.id)) cur.deleted[x.id] = now; });
    }
    if ((prev.habits || []).map(h => h.id).join() !== cur.habits.map(h => h.id).join()) cur.orderMt = now;
    for (const [lk, mk] of [['logs', 'lmt'], ['rest', 'rmt']]) {
      const P = prev[lk] || {}, C = cur[lk] || {};
      for (const hid of new Set([...Object.keys(P), ...Object.keys(C)])) {
        const p = P[hid] || {}, c = C[hid] || {};
        for (const k of new Set([...Object.keys(p), ...Object.keys(c)])) {
          if ((p[k] || 0) !== (c[k] || 0)) (cur[mk][hid] || (cur[mk][hid] = {}))[k] = now;
        }
      }
    }
    if (strip(prev.contract) !== strip(cur.contract) && cur.contract) cur.contract.mt = now;
    if (JSON.stringify([prev.theme, prev.lang]) !== JSON.stringify([cur.theme, cur.lang])) cur.smt = now;
  }
  // Fusión de dos estados: gana lo modificado más tarde; las cartas y contratos se suman
  function mergeStates(L, R) {
    const out = JSON.parse(JSON.stringify(L));
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
    out.projects = mergeList(L.projects || [], R.projects || []);
    const hids = new Set(out.habits.map(h => h.id));
    for (const [lk, mk] of [['logs', 'lmt'], ['rest', 'rmt']]) {
      out[lk] = {}; out[mk] = {};
      for (const hid of hids) {
        const vl = (L[lk] || {})[hid] || {}, vr = (R[lk] || {})[hid] || {}, tl = (L[mk] || {})[hid] || {}, tr = (R[mk] || {})[hid] || {};
        const V = {}, M = {};
        for (const k of new Set([...Object.keys(vl), ...Object.keys(vr), ...Object.keys(tl), ...Object.keys(tr)])) {
          const a = tl[k] || 0, b = tr[k] || 0;
          const v = b > a ? (vr[k] || 0) : a > b ? (vl[k] || 0) : Math.max(+vl[k] || 0, +vr[k] || 0);
          if (v) V[k] = v;
          if (a || b) M[k] = Math.max(a, b);
        }
        out[lk][hid] = V; out[mk][hid] = M;
      }
    }
    if (!L.contract || (R.contract && (R.contract.mt || 0) > (L.contract.mt || 0))) out.contract = R.contract || null;
    if ((R.smt || 0) > (L.smt || 0)) { out.theme = R.theme; out.lang = R.lang; out.smt = R.smt; }
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
  const isMulti = h => !!h.multi || (h.freq === 'daily' && h.target > 1);
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
  const isScheduled = (h, k) => h.freq !== 'daily' || isQuit(h) || !Array.isArray(h.days) || h.days.length >= 7 || h.days.includes(wdOf(k));
  const isOffDay = (h, k) => !isScheduled(h, k) || isRest(h, k);
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
    const end = nextPeriod(h, p);
    for (let d = p; d < end; d = addDays(d, 1)) if (isRest(h, d)) return 'off';
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
    v = Math.max(0, Math.floor(v));
    if (v) L[k] = v; else delete L[k];
    save();
    checkMastery(h);
  }
  function tapDay(h, k) {
    if (k > todayKey()) return;
    const c = cnt(h, k);
    setCount(h, k, isMulti(h) ? c + 1 : (c ? 0 : 1));
    vibrate(8);
  }

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
    return `<div class="top-bar"><button class="icon-btn" data-act="settings" aria-label="${esc(t('settings'))}" title="${esc(t('settings'))}">${ico('gear')}</button>${actions ? `<div class="pill-group">${actions}</div>` : ''}</div>`;
  }
  const emptyState = (icon, title, sub, action = '') =>
    `<div class="empty"><div class="empty-art">${ico(icon)}</div><h2>${esc(title)}</h2><p>${esc(sub)}</p>${action}</div>`;

  function afterRender() {
    if (state.ui.tab === 'habits') fitGrids();
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
    let html = topBar(`<button class="icon-btn" data-act="go" data-tab="charts" aria-label="${esc(t('tabCharts'))}">${ico('chart')}</button><button class="icon-btn" data-act="habit-new" aria-label="${esc(t('addHabit'))}">${ico('plus')}</button>`);
    html += `<h1 class="page-title">${esc(t('tabHabits'))}</h1>`;
    html += contractBanner();
    if (!active.length && !arch.length) {
      return html + emptyState('checklist', t('habitsEmptyTitle'), t('habitsEmptySub'), `<button class="btn primary" data-act="habit-new">${ico('plus')} ${esc(t('addHabit'))}</button>`);
    }
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
    if (!(h.freq === 'daily' && h.target === 1)) meta.push(esc(t('timesPer', { n: h.target, period: unitLabel(h) })));
    if (h.freq === 'weekly') meta.push(esc(t('thisWeek', { a: sum, b: h.target })));
    if (h.freq === 'monthly') meta.push(esc(t('thisMonth', { a: sum, b: h.target })));
    if (streak) meta.push(`<span class="flame">${ico('flame')}</span>${streak}`);
    return `<article class="habit clay" data-id="${h.id}" style="${habitVars(c)}">
      <div class="habit-head">
        <button class="habit-ico" data-act="habit-edit" data-id="${h.id}" aria-label="${esc(t('editHabit'))}">${esc(h.icon || '#')}</button>
        <button class="habit-title" data-act="habit-edit" data-id="${h.id}"><h3>${esc(h.name)}</h3>${meta.length ? `<div class="habit-meta">${meta.map(m => `<span>${m}</span>`).join('')}</div>` : ''}</button>
        ${ringHtml(sum, h.target, `data-ring="${h.id}" aria-label="${esc(t('today'))}: ${sum}/${h.target}"`)}
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
        let cls = 'dot', label = c >= 2 ? c : '';
        if (isQuit(h)) {
          if (c > 0) { cls += ' slip'; label = ''; }
          else if (k >= fk && k < today) cls += ' on';
        } else {
          if (c >= goal) cls += ' on'; else if (c > 0) cls += ' part';
          else if (isRest(h, k)) cls += ' rest';
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
        <div class="field"><span>${esc(t('habitFreq'))}</span>
          <div class="seg">${['daily', 'weekly', 'monthly'].map(q => `<button type="button" data-freq="${q}" class="${f.freq === q ? 'on' : ''}">${esc(t(q === 'daily' ? 'freqDaily' : q === 'weekly' ? 'freqWeekly' : 'freqMonthly'))}</button>`).join('')}</div>
        </div>
        ${f.freq === 'daily' ? `<div class="field"><span>${esc(t('habitDays'))}</span>
          <div class="row wrap" style="gap:8px">${wd.map((l, i) => `<button type="button" class="chip daychip ${f.days.includes(i) ? 'on' : ''}" data-wd="${i}">${esc(l)}</button>`).join('')}</div>
          <div class="muted small">${esc(t('habitDaysHint'))}</div>
        </div>` : ''}
        <div class="field"><span>${esc(t('habitTarget'))}</span>
          <div class="stepper"><button type="button" class="icon-btn sm" data-step="-1" aria-label="-1">${ico('minus')}</button><input class="input" id="hf-target" type="number" min="1" inputmode="numeric" value="${f.target}"><button type="button" class="icon-btn sm" data-step="1" aria-label="+1">${ico('plus')}</button></div>
          <div class="muted small">${esc(t('habitTargetHint', { period }))}</div>
        </div>
        <label class="row" style="gap:14px"><span class="switch"><input type="checkbox" id="hf-multi" ${f.multi || forcedMulti ? 'checked' : ''} ${forcedMulti ? 'disabled' : ''}><span></span></span><span class="grow"><b>${esc(t('habitMulti'))}</b><br><span class="muted small">${esc(t('habitMultiHint'))}</span></span></label>
        </div>
        <label class="field"><span>${esc(t('habitDesc'))}</span><textarea class="input" id="hf-note" maxlength="300" placeholder="${esc(t('habitDescPh'))}">${esc(f.note || '')}</textarea></label>
        ${!isNew ? `<div class="row wrap">
          <button type="button" class="chip" data-hm="up">${ico('up')} ${esc(t('moveUp'))}</button>
          <button type="button" class="chip" data-hm="down">${ico('down')} ${esc(t('moveDown'))}</button>
          <button type="button" class="chip" data-hm="archive">${ico('archive')} ${esc(h.archived ? t('unarchive') : t('archive'))}</button>
          <button type="button" class="chip" data-hm="delete" style="color:#e5484d">${ico('trash')} ${esc(t('delete'))}</button>
        </div>` : ''}
      </div>`;
    };
    const readInputs = w => {
      f.name = $('#hf-name', w).value.trim();
      f.icon = $('#hf-icon', w).value.trim() || '#';
      f.target = Math.max(1, parseInt($('#hf-target', w).value, 10) || 1);
      f.note = $('#hf-note', w).value.trim();
      const mu = $('#hf-multi', w); if (!mu.disabled) f.multi = mu.checked;
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
          if (act === 'delete' && await confirmDialog(t('deleteHabitQ', { name: h.name }))) {
            state.habits = state.habits.filter(x => x !== h);
            delete state.logs[h.id]; delete state.mastery[h.id]; delete state.rest[h.id];
            state.projects.forEach(p => { p.habitIds = p.habitIds.filter(id => id !== h.id); });
            save(); close(); render(); toast(t('deleted'));
          }
          return;
        }
        if (q('[data-m="save"]')) {
          readInputs(w);
          if (!f.name) { toast(t('habitNeedName')); $('#hf-name', w).focus(); return; }
          if (f.kind === 'quit') Object.assign(f, { freq: 'daily', target: 1, multi: false });
          const props = { kind: f.kind, name: f.name, icon: f.icon, color: f.color, freq: f.freq, target: f.target, multi: f.multi, note: f.note, days: f.days };
          if (isNew) {
            state.habits.push({ id: uid(), ...props, autoColor: HABIT_COLORS[state.colorSeq++ % HABIT_COLORS.length], createdAt: todayKey(), archived: false });
          } else {
            Object.assign(h, props);
            checkMastery(h, true);
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
    const quit = isQuit(h);
    const restBtn = () => quit ? '' : `<button class="chip ${isRest(h, k) ? 'on' : ''}" data-m="rest" style="margin-top:16px">${ico('calendar')} ${esc(isRest(h, k) ? t('restDayOn') : t('restDay'))}</button><div class="muted small" style="margin-top:6px">${esc(t('restHint'))}</div>`;
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
    let html = topBar(`<button class="icon-btn" data-act="proj-new" aria-label="${esc(t('newProject'))}">${ico('plus')}</button>`);
    html += `<h1 class="page-title">${esc(t('tabProjects'))}</h1>`;
    if (!state.projects.length) return html + emptyState('target', t('projectsEmptyTitle'), t('projectsEmptySub'), `<button class="btn primary" data-act="proj-new">${ico('plus')} ${esc(t('newProject'))}</button>`);
    html += `<div class="proj-grid">${state.projects.map(p => {
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
    return html;
  }

  function openProjectEditor(p = null) {
    const isNew = !p;
    const f = p ? JSON.parse(JSON.stringify(p)) : { name: '', icon: '🎯', color: null, desc: '', habitIds: [], goal: { type: 'numeric', start: 0, target: 0, unit: '', entries: [], items: [], achieved: false }, deadline: null };
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
          <p class="muted small" style="margin-bottom:0">${esc(t('probHelp'))}</p>
        </section>
        <section class="clay card"><h3 class="section-title">${esc(t('projectHabits'))}</h3>
          ${s.hs.length ? s.hs.map(h => { const r = rate(h, 30); return `<div class="factor" style="--h:${hColor(h)}"><span>${esc(h.icon)} ${esc(h.name)}</span><b>${r == null ? '—' : Math.round(r * 100) + '%'}</b><div class="bar ${r ? '' : 'zero'}"><i style="width:${Math.round((r || 0) * 100)}%;background:var(--h)"></i></div></div>`; }).join('') : `<p class="muted small" style="margin:0">${esc(t('probNoHabits'))}</p>`}
        </section>
      </div>`;
      $('#pd', wref).innerHTML = body;
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
      },
      onClick: async (e, close, w) => {
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
        save(); draw(); if (state.ui.tab === 'projects') $('#main').innerHTML = renderView();
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
    html += `<div class="chart-grid">${cards.join('')}</div>`;

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
    html += `<div class="mastery-sum clay"><div class="empty-art" style="width:64px;height:64px;margin:0;border-radius:20px">${ico('crown')}</div><div class="grow"><b>${esc(t('masteryCollected', { a: got, b: hs.length * RANKS.length }))}</b><div class="muted small">${esc(t('masteryHow'))}</div></div></div>`;
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
    return `<div class="stack" style="gap:20px">
      <div class="field"><span>${esc(t('themePresets'))}</span><div class="preset-grid">${PRESETS.map(p => {
        const bg = p.bgMode === 'gradient' ? `linear-gradient(135deg, ${p.bg}, ${p.bg2})` : p.bg;
        return `<button type="button" class="preset ${th.preset === p.id ? 'on' : ''}" data-th-preset="${p.id}"><span class="pv" style="background:${bg}"><i style="background:${p.fg}"></i><i style="background:${p.accent}"></i></span><span class="pn">${esc(presetName(p))}</span></button>`;
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
        w.addEventListener('change', e => { if (e.target.id === 'st-file' && e.target.files[0]) importFile(e.target.files[0], w); });
      },
      onClick: async (e, close, w) => {
        const q = s => e.target.closest(s); let el;
        if ((el = q('[data-s-lang]'))) { state.lang = el.dataset.sLang; save(); render(); draw(); $('.sheet-head h2', w).textContent = t('settings'); return; }
        if (!(el = q('[data-s]'))) return;
        switch (el.dataset.s) {
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
    const a = e.target.closest('[data-act]'); if (!a) return;
    const id = a.dataset.id;
    switch (a.dataset.act) {
      case 'go': state.ui.tab = a.dataset.tab; save(); render(); window.scrollTo(0, 0); break;
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
  const dayCheck = () => { if (todayKey() !== lastDay) { lastDay = todayKey(); render(); state.habits.filter(isQuit).forEach(h => checkMastery(h)); } };
  setInterval(dayCheck, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) dayCheck(); });

  /* ---------- PWA (solo cuando se sirve por http/https) ---------- */
  if (location.protocol.startsWith('http')) {
    const l = document.createElement('link'); l.rel = 'manifest'; l.href = 'manifest.webmanifest'; document.head.appendChild(l);
    if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  // Sincroniza cartas ya ganadas (por ejemplo, tras importar) y arranca
  state.habits.forEach(h => checkMastery(h, !isQuit(h)));
  render();
  if (auth) scheduleSync(400);
  // Solo para pruebas en local
  if (location.hostname === 'localhost') window.__kg = { mergeStates, stampChanges };
})();
