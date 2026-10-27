/* =========================================================
   KeepGoing — app (vanilla JS, sin dependencias)
   Datos: localStorage («keepgoing.v1»). Copias: exportar/importar .json
   ========================================================= */
(() => {
  'use strict';

  const VERSION = '1.24.0';
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
  const fmtShort = k => { const [y, m, d] = String(k || '').split('-'); return `${d}/${m}/${y}`; };
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
    brush: '<path d="M14.5 4.5l5 5L10 19H5v-5z"/><path d="M12.5 6.5l5 5"/>',
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
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>',
    left: '<path d="M15 6l-6 6 6 6"/>',
    right: '<path d="M9 6l6 6-6 6"/>',
    play: '<path d="M7 5l12 7-12 7z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
    gift: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M12 8c-2-4-6-4-6-1.5S10 8 12 8zm0 0c2-4 6-4 6-1.5S14 8 12 8z"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
    wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="3.5" y="8" width="17" height="12" rx="2.5"/><path d="M16 14h.01M20.5 11.5h-4a2.5 2.5 0 0 0 0 5h4"/>',
    chat: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h0A2.5 2.5 0 0 1 4 13.5z"/><path d="M8.5 9.5h7M8.5 12.5h4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.4-6.5 8-6.5s7 2 8 6.5"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0"/><circle cx="9" cy="10" r=".6"/><circle cx="15" cy="10" r=".6"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
    send: '<path d="M4 12l16-8-6 16-2.5-6.5z"/><path d="M11.5 13.5L20 4"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    calc: '<rect x="5" y="2.5" width="14" height="19" rx="3"/><path d="M8.5 6.5h7v3h-7zM8.5 13h.01M12 13h.01M15.5 13h.01M8.5 17h.01M12 17h.01M15.5 17h.01"/>',
    trend: '<path d="M4 19V5M4 19h16M7 15l4-4 3 2 5-6"/>',
    // v1.19: iconos de línea para la Libreta y la calculadora (mismo trazo que el resto; nunca emoji en la interfaz)
    fingerprint: '<path d="M6.5 18.5A10 10 0 0 1 5 12a7 7 0 0 1 14 0v1M8.5 20.5A12 12 0 0 1 8 12a4 4 0 0 1 8 0c0 3.5-.5 6-1.5 8.5M12 12c0 3.5-.7 6.5-2 9M19 16.5a19 19 0 0 1-1 3.5"/>',
    backspace: '<path d="M8.5 5H20a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 20 19H8.5L2.5 12z"/><path d="M11.5 9.5l5 5M16.5 9.5l-5 5"/>',
    keypad: '<circle cx="6" cy="5" r="1.3"/><circle cx="12" cy="5" r="1.3"/><circle cx="18" cy="5" r="1.3"/><circle cx="6" cy="11" r="1.3"/><circle cx="12" cy="11" r="1.3"/><circle cx="18" cy="11" r="1.3"/><circle cx="6" cy="17" r="1.3"/><circle cx="12" cy="17" r="1.3"/><circle cx="18" cy="17" r="1.3"/>',
    key: '<circle cx="8" cy="15" r="4.5"/><path d="M11.2 11.8L20 3M16.5 6.5l2.5 2.5M14 9l2 2"/>',
    alert: '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.2v.3"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    puzzle: '<path d="M4 7h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4h-4a2 2 0 1 0-4 0H4v-4a2 2 0 1 0 0-4z"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    pie: '<path d="M12 3v9h9a9 9 0 1 1-9-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
    repeat: '<path d="M4 11V9a3 3 0 0 1 3-3h12M16 3l3 3-3 3M20 13v2a3 3 0 0 1-3 3H5M8 21l-3-3 3-3"/>',
    tag: '<path d="M3 12V4.5A1.5 1.5 0 0 1 4.5 3H12l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.8 3.4-5.5 6.5-5.5s5.7 1.7 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c1.8.7 3 2.4 3.5 5.2"/>',
    bank: '<path d="M3 9.5L12 4l9 5.5M4.5 10v8M9.5 10v8M14.5 10v8M19.5 10v8M3 20.5h18"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7M3 12.5h18"/>',
    swap: '<path d="M7 20V5M3.5 8.5L7 5l3.5 3.5M17 4v15M13.5 15.5L17 19l3.5-3.5"/>',
    card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/>',
    coins: '<ellipse cx="9" cy="7" rx="6" ry="2.8"/><path d="M3 7v5c0 1.5 2.7 2.8 6 2.8s6-1.3 6-2.8V7"/><path d="M9 17.6c0 1.5 2.7 2.8 6 2.8s6-1.3 6-2.8v-5c0-1.4-2.3-2.6-5.2-2.8"/>',
    ceiling: '<path d="M3 4.5h18M12 20V9M8 12.5L12 8.5l4 4"/>',
    loan: '<circle cx="9" cy="12" r="6"/><path d="M9 9v6M7.2 10.5h3M15.5 7.5H21M18.5 4.5l3 3-3 3M15.5 16.5H21"/>',
    budget: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M14.5 9.2c-.6-.8-1.5-1.2-2.5-1.2-1.4 0-2.5.8-2.5 2s1.1 1.6 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1 0-2-.4-2.6-1.2"/>',
    line: '<path d="M3 20h18"/><path d="M4 16l5-6 4 3 7-8"/>',
    eyeOff: '<path d="M3 3l18 18M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    // v1.23
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
    compare: '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/><path d="M14 6l3-2 3 2" stroke-dasharray="2 2"/>',
    split: '<path d="M6 3v6a6 6 0 0 0 6 6h0a6 6 0 0 1 6 6M18 3v6a6 6 0 0 1-3 5.2M6 21v0"/><path d="M3 6l3-3 3 3M15 6l3-3 3 3"/>',
    branch: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="8" r="2"/><path d="M6 7v10M18 10c0 4-6 3-12 7"/>',
    link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1-1"/>'
  };
  const ico = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

  /* ---------- estado ---------- */
  const DEFAULT_THEME = { preset: 'noche', bg: '#000000', fg: '#ffffff', accent: '#3ddc97', style: 'clay', bgMode: 'solid', bg2: '#1b1b2f', font: 'quicksand' };
  // Tipos de letra disponibles (se cargan desde Google Fonts en index.html)
  const FONTS = [['quicksand', 'Quicksand'], ['nunito-sans', 'Nunito Sans'], ['jakarta', 'Plus Jakarta Sans'], ['poppins', 'Poppins']];
  const fontFamily = id => (FONTS.find(f => f[0] === id) || FONTS[0])[1];
  const CAP = window.KGCaprice;
  const defaultCaprice = () => ({ income: CAP.DEFAULT_INCOME, pct: { ...CAP.DEFAULT_PCT }, history: [{ from: '0000-00-00', income: CAP.DEFAULT_INCOME, pct: { ...CAP.DEFAULT_PCT } }] });
  const defaultLedgerCats = () => window.KGLedger.DEFAULT_CATEGORIES.map(c => ({ ...c, name: '', archived: false }));
  // v1.22: tipos de notificación (Ajustes → Notificaciones); el servidor los lee de kg_state para decidir qué envía
  const NOTIF0 = { energy: true, energyAt: '21:00', summary: true, summaryAt: '09:00', challenge: true, share: true, group: true, message: true };
  function defaultState() {
    const lang = (navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
    return {
      v: 1, onboarded: false, obStep: 0, lang,
      theme: { ...DEFAULT_THEME },
      contract: null,
      habits: [], logs: {}, sublogs: {}, projects: [], rest: {},
      mastery: {}, perfectMastery: {}, serial: 0, colorSeq: 0, contractCards: [],
      // Fase 1: rutinas, recompensas, vacaciones, escudos, energía, revisiones, avisos, retos, cartas secretas
      routines: [], rewards: [], redemptions: [], vacations: [],
      shields: {}, ltime: {}, energy: {}, reviews: {}, prompts: {}, secrets: {}, challengeCards: [],
      routineRuns: {}, stats: { timerMin: 0 },
      commitment: 'serio', commitHistory: [{ from: '0000-00-00', level: 'serio' }],
      // Fase 1 (v1.8): puntos de compromiso (desde pointsSince) y conversor a «Dinero Caprichable»
      pointsSince: null, caprice: defaultCaprice(), legacyShop: null,
      // Fase 2 (v1.9): Libreta de Gastos (importes en céntimos) y modo privacidad
      ledgerEntries: [], ledgerCats: defaultLedgerCats(), ledgerRecurring: [], ledgerEvents: [], ledgerPrefs: { privacy: false },
      // v1.17: Calculadora de Patrimonio Proyectado (cifrada con la Libreta, un elemento por pieza)
      ledgerCalc: [],
      // v1.19: presupuestos mensuales (cifrados con la Libreta, un elemento por presupuesto)
      ledgerBudgets: [],
      ledgerProjs: [],
      ledgerWorth: [], ledgerContacts: [], // v1.25: contactos de la Libreta (cifrados)
      calDayK: {}, cdkmt: {}, perfectRules: [], ledDays: {}, ldmt: {},
      calNotes: {}, cnmt: {}, dayRate: {}, drmt: {}, // v1.25: nota de cada día del Calendario y valoración del día ({ r: 0..10 }) // v1.24: requisitos del día perfecto (historial por fecha) y días con movimientos
      // v1.24: tipo de día de cada fecha (Laboral, Libre, Festivo…) → id de calPrefs.dayKinds
      calRoutines: [], // v1.23: rutinas del Calendario (grupos de turnos de un día o semana tipo) // v1.23: punto de partida real de la Libreta (saldos a una fecha) para «Patrimonio actual», cifrado
      ledgerImports: [], // v1.22: registros de lo importado con «Registrar» (cifrados como el resto de la Libreta)
      // v1.20: Calendario de turnos (trabajos, plantillas, días, calendario externo y ajustes)
      calJobs: [], calShifts: [], calDays: {}, cdmt: {}, calExt: { list: [] }, cemt: {}, calPrefs: { weekStart: 1, alarms: false, hide: {} }, notif: { ...NOTIF0 },
      // Fase 3 (v1.10): sonidos activados por defecto
      soundOn: true, ledgerVault: null,
      // v1.14: widgets ocultos desde el modo edición (se recuperan en Ajustes)
      hiddenW: [],
      // v1.15: orden propio de los widgets que no salen de una lista (chats, eventos, mascota, gráficas…)
      wOrder: [],
      ui: { tab: 'habits', range: 30, chartHabit: 'all', showArchived: false, habitsView: 'all' }
    };
  }
  // Listas por id y mapas que se fusionan entre dispositivos (ver stampChanges / mergeStates)
  const ORDER_LISTS = ['projects', 'routines'];
  const SYNC_LISTS = ['habits', 'projects', 'routines', 'rewards', 'redemptions', 'vacations', 'ledgerEntries', 'ledgerCats', 'ledgerRecurring', 'ledgerEvents', 'ledgerCalc', 'ledgerBudgets', 'ledgerProjs', 'ledgerImports', 'ledgerWorth', 'ledgerContacts', 'calJobs', 'calShifts', 'calRoutines'];
  const SYNC_DAYMAPS = [['logs', 'lmt'], ['rest', 'rmt'], ['shields', 'shmt'], ['ltime', 'tmt'], ['sublogs', 'slmt']]; // hábito → día → valor (v1.23: sublogs = objetivos o maneras hechos ese día)
  const SYNC_KEYMAPS = [['energy', 'emt'], ['reviews', 'rvmt'], ['prompts', 'pmt'], ['calDays', 'cdmt'], ['calExt', 'cemt'], ['calDayK', 'cdkmt'], ['ledDays', 'ldmt'], ['calNotes', 'cnmt'], ['dayRate', 'drmt']];             // clave → valor
  function normalize(s) {
    const d = defaultState();
    const out = { ...d, ...s };
    out.theme = { ...d.theme, ...(s.theme || {}) };
    if (out.theme.font === 'nunito') out.theme.font = 'quicksand'; // la letra Nunito ya no existe
    // v1.13: una fecha límite pasa a ser un reto que empezó al crear el proyecto
    if (Array.isArray(out.projects)) out.projects = out.projects.map(p => p && p.deadline && !p.retoFrom ? { ...p, retoFrom: p.createdAt || p.deadline } : p);
    out.ui = { ...d.ui, ...(s.ui || {}) };
    // v1.12: Proyectos y Gráficos viven dentro de la pestaña de Hábitos
    if (out.ui.tab === 'projects') { out.ui.tab = 'habits'; out.ui.habitsView = 'all'; }
    if (out.ui.tab === 'charts') out.ui.tab = 'habits';
    if (['charts', 'shared'].includes(out.ui.habitsView)) out.ui.habitsView = 'all'; // v1.13: Gráficos va en «Ver más» y Grupos en Chat
    if (!['habits', 'cal', 'ledger', 'mastery'].includes(out.ui.tab)) out.ui.tab = 'habits';
    out.habits = Array.isArray(s.habits) ? s.habits : [];
    out.logs = s.logs && typeof s.logs === 'object' ? s.logs : {};
    out.projects = Array.isArray(s.projects) ? s.projects : [];
    out.mastery = s.mastery && typeof s.mastery === 'object' ? s.mastery : {};
    out.perfectMastery = s.perfectMastery && typeof s.perfectMastery === 'object' && !Array.isArray(s.perfectMastery) ? s.perfectMastery : {};
    out.rest = s.rest && typeof s.rest === 'object' ? s.rest : {};
    out.contractCards = Array.isArray(s.contractCards) ? s.contractCards : [];
    for (const k of ['deleted', 'lmt', 'rmt', 'shmt', 'tmt', 'slmt', 'sublogs', 'emt', 'rvmt', 'pmt', 'cdmt', 'cemt', 'cdkmt', 'calDayK', 'ldmt', 'ledDays', 'cnmt', 'calNotes', 'drmt', 'dayRate', 'shields', 'ltime', 'energy', 'reviews', 'prompts', 'secrets', 'routineRuns'])
      out[k] = s[k] && typeof s[k] === 'object' && !Array.isArray(s[k]) ? s[k] : {};
    for (const k of ['routines', 'rewards', 'redemptions', 'vacations', 'challengeCards', 'ledgerEntries', 'ledgerRecurring', 'ledgerEvents', 'ledgerCalc', 'ledgerBudgets', 'ledgerProjs', 'ledgerImports', 'ledgerWorth', 'ledgerContacts', 'calJobs', 'calShifts', 'calRoutines', 'perfectRules']) out[k] = Array.isArray(s[k]) ? s[k] : [];
    out.calDays = s.calDays && typeof s.calDays === 'object' && !Array.isArray(s.calDays) ? s.calDays : {};
    out.calExt = s.calExt && Array.isArray(s.calExt.list) ? s.calExt : { list: [] };
    const cp0 = s.calPrefs && typeof s.calPrefs === 'object' ? s.calPrefs : {};
    out.calPrefs = { weekStart: 1, alarms: false, ...cp0, hide: cp0.hide && typeof cp0.hide === 'object' ? cp0.hide : {} };
    out.notif = { ...NOTIF0, ...(s.notif && typeof s.notif === 'object' ? s.notif : {}) };
    out.ledgerCats = Array.isArray(s.ledgerCats) && s.ledgerCats.length ? s.ledgerCats : defaultLedgerCats();
    out.ledgerPrefs = { privacy: false, ...(s.ledgerPrefs || {}) };
    out.soundOn = s.soundOn !== false;
    out.hiddenW = Array.isArray(s.hiddenW) ? s.hiddenW.filter(k => typeof k === 'string') : [];
    out.wOrder = Array.isArray(s.wOrder) ? s.wOrder.filter(k => typeof k === 'string').slice(0, 400) : [];
    out.stats = { timerMin: 0, ...(s.stats || {}) };
    if (!Array.isArray(out.commitHistory) || !out.commitHistory.length) out.commitHistory = [{ from: '0000-00-00', level: out.commitment || 'serio' }];
    const cp = s.caprice && typeof s.caprice === 'object' ? s.caprice : {}, dc = defaultCaprice();
    out.caprice = { income: +cp.income > 0 ? +cp.income : dc.income, pct: { ...dc.pct, ...(cp.pct || {}) }, history: Array.isArray(cp.history) && cp.history.length ? cp.history : dc.history };
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
  const settingsOf = s => [s.theme, s.lang, s.commitment, s.commitHistory, s.pet, s.profile, s.caprice, s.ledgerPrefs, s.soundOn, s.hiddenW, s.wOrder, s.calPrefs, s.notif, s.perfectRules];
  // La caja fuerte de la Libreta y el par de claves para compartir van aparte, con su propia marca (vmt)
  const vaultOf = s => [s.ledgerVault, s.kx];
  function stampChanges(prev, cur) {
    const now = Date.now();
    cur.deleted = cur.deleted || {};
    for (const key of SYNC_LISTS) {
      const pm = new Map((prev[key] || []).map(x => [x.id, x]));
      (cur[key] || []).forEach(x => { if (strip(x) !== strip(pm.get(x.id))) x.mt = now; });
      (prev[key] || []).forEach(x => { if (!(cur[key] || []).some(y => y.id === x.id)) cur.deleted[x.id] = now; });
    }
    if ((prev.habits || []).map(h => h.id).join() !== cur.habits.map(h => h.id).join()) cur.orderMt = now;
    // El orden de carpetas y rutinas (modo edición) también se sincroniza
    cur.listOrderMt = cur.listOrderMt || {};
    for (const key of ORDER_LISTS) if ((prev[key] || []).map(x => x.id).join() !== (cur[key] || []).map(x => x.id).join()) cur.listOrderMt[key] = now;
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
    if (!same(vaultOf(prev), vaultOf(cur))) cur.vmt = now;
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
    out.listOrderMt = { ...(L.listOrderMt || {}) };
    for (const key of ORDER_LISTS) {
      const tl = (L.listOrderMt || {})[key] || 0, tr = (R.listOrderMt || {})[key] || 0, ref = (tr > tl ? R[key] : L[key]) || [];
      const at = id => { const i = ref.findIndex(x => x.id === id); return i < 0 ? 1e9 : i; };
      out[key].sort((a, b) => at(a.id) - at(b.id));
      if (tl || tr) out.listOrderMt[key] = Math.max(tl, tr);
    }
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
    if ((R.smt || 0) > (L.smt || 0)) { [out.theme, out.lang, out.commitment, out.commitHistory, out.pet, out.profile, out.caprice, out.ledgerPrefs, out.soundOn, out.hiddenW, out.wOrder, out.calPrefs, out.notif, out.perfectRules] = settingsOf(R); out.smt = R.smt; }
    // Caja fuerte: gana la más reciente, pero una vacía (o sin marca) nunca borra a otra salvo que venga de «Borrar la Libreta»
    {
      const lv = L.ledgerVault, rv = R.ledgerVault, wipe = Math.max(L.vaultWipe || 0, R.vaultWipe || 0);
      const takeR = (R.vmt || 0) > (L.vmt || 0) ? (rv || (R.vaultWipe || 0) >= (L.vmt || 0)) : (!lv && rv && (L.vaultWipe || 0) < (R.vmt || 1));
      if (takeR) { out.ledgerVault = rv || null; out.kx = R.kx || null; } else { out.ledgerVault = lv || null; out.kx = L.kx || null; }
      if (!out.kx || (out.ledgerVault && out.kx.vid !== out.ledgerVault.vid)) { const o = takeR ? L.kx : R.kx; if (o && out.ledgerVault && o.vid === out.ledgerVault.vid) out.kx = o; }
      out.vmt = Math.max(L.vmt || 0, R.vmt || 0); if (wipe) out.vaultWipe = wipe;
    }
    // Los puntos de compromiso empiezan en la fecha más antigua en que cualquier dispositivo migró
    const ps = [L.pointsSince, R.pointsSince].filter(Boolean).sort();
    out.pointsSince = ps[0] || null;
    const p2 = [L.pointsV2, R.pointsV2].filter(Boolean).sort();
    out.pointsV2 = p2[0] || null;
    out.legacyShop = L.legacyShop || R.legacyShop || null;
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
    out.perfectMastery = { ...(L.perfectMastery || {}) };
    for (const [r, v] of Object.entries(R.perfectMastery || {})) if (!out.perfectMastery[r] || v.date < out.perfectMastery[r].date) out.perfectMastery[r] = v;
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
    const out = s.replace(/\{(\w+)\}/g, (_, k) => p[k] ?? '');
    return out.includes('(€)') ? out.replace('(€)', `(${curSym(p.$cur)})`) : out;
  };
  // v1.22: símbolo de una moneda («€», «US$», «£»); sin moneda, la principal de la Libreta
  function curSym(c) {
    if (!c) { const m = state.ledgerPrefs && state.ledgerPrefs.cur; c = /^[A-Z]{3,4}$/.test(m || '') ? m : 'EUR'; }
    try { const p = new Intl.NumberFormat(state.lang, { style: 'currency', currency: c }).formatToParts(1).find(x => x.type === 'currency'); return p ? p.value : c; } catch (e) { return c; }
  }

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
      '--sh-press': light ? 'inset 0 4px 10px rgba(20,20,45,.16)' : 'inset 0 4px 12px rgba(0,0,0,.5)',
      '--font-main': `"${fontFamily(th.font)}"`
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
  /* v1.23: Continuidad. Al cambiar la regla de un hábito (veces, días, objetivos o maneras) la anterior se guarda en
     h.past = [{ until, target, days, mode, goals, ways }] (ordenada por until): los días antes de «until» usan esa regla. */
  const RULE_KEYS = ['target', 'days', 'mode', 'goals', 'ways'];
  const ruleAt = (h, k) => { if (k && Array.isArray(h.past)) for (const p of h.past) if (k < p.until) return p; return h; };
  const tgtAt = (h, k) => +ruleAt(h, k).target || 1;
  const dayGoal = (h, k) => h.freq === 'daily' ? (k ? tgtAt(h, k) : h.target) : 1;
  // v1.23: hábitos con varios objetivos (hay que cumplirlos todos) o con varias maneras (vale cualquiera)
  const subModeOf = (h, r) => !isQuit(h) && !isAmount(h) && ((r.mode === 'goals' && (r.goals || []).length) || (r.mode === 'ways' && (r.ways || []).length)) ? r.mode : '';
  const subMode = h => subModeOf(h, h);
  const subModeAt = (h, k) => subModeOf(h, ruleAt(h, k));
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
  const isScheduled = (h, k) => { const d = ruleAt(h, k).days; return h.freq !== 'daily' || isQuit(h) || !Array.isArray(d) || d.length >= 7 || d.includes(wdOf(k)); };
  // Días que no cuentan como fallo: no programados, de descanso, con escudo o de vacaciones (los hábitos a dejar no se pausan)
  const isOffDay = (h, k) => !isScheduled(h, k) || isRest(h, k) || isShielded(h, k) || (!isQuit(h) && inVacation(k));
  const isAmount = h => h.measure === 'amount';
  const periodDone = (h, k) => isQuit(h) ? cnt(h, k) === 0 : periodSum(h, k) >= tgtAt(h, periodStart(h, k));
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
    const L = state.logs[h.id] || {}; let n = 0; for (const k in L) if (L[k] >= dayGoal(h, k)) n++; return n;
  }
  // Registros: veces marcadas (en hábitos con cantidad, cada día registrado cuenta como 1)
  function totalEntries(h, from, to) { if (isQuit(h)) return 0; const L = state.logs[h.id] || {}; let s = 0; for (const k in L) if ((!from || k >= from) && (!to || k <= to)) s += isAmount(h) ? (L[k] > 0 ? 1 : 0) : L[k]; return s; }
  // Puntuación de un día (0..1) o null si ese día no cuenta — para gráficos
  function dayScore(h, k) {
    if (k < firstKey(h) || k > todayKey()) return null;
    if (isQuit(h)) return k === todayKey() && !cnt(h, k) ? null : (cnt(h, k) ? 0 : 1);
    if (isOffDay(h, k) && !cnt(h, k)) return null;
    return Math.min(1, cnt(h, k) / dayGoal(h, k));
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
    const snap = { day: dayInfo(k), lvl: levelInfo().level, done: !isQuit(h) && cnt(h, k) >= dayGoal(h, k) };
    v = Math.max(0, isAmount(h) ? Math.round(v * 100) / 100 : Math.floor(v));
    if (v) L[k] = v; else delete L[k];
    // Hora del registro (para «a qué hora sueles hacerlo» y las cartas secretas)
    if (v > before && k === todayKey()) { const d = new Date(); (state.ltime[h.id] || (state.ltime[h.id] = {}))[k] = `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
    save();
    habitFeedback(h, k, before, v, snap);
    checkPerfectMastery();
    checkChallenge(h);
    checkSecrets();
  }
  /* ---------- respuesta al marcar: sonido, «+puntos» y subida de nivel ---------- */
  const sfx = name => { if (window.KGSound) { KGSound.setEnabled(state.soundOn !== false); KGSound.play(name); } };
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function habitFeedback(h, k, before, v, snap) {
    const day = dayInfo(k), lvl = levelInfo().level, done = !isQuit(h) && cnt(h, k) >= dayGoal(h, k);
    if (v < before) sfx(isQuit(h) ? 'pop' : 'undo');
    else if (isQuit(h)) sfx('slip');
    else if (lvl > snap.lvl) sfx('levelup');
    else if (day.perfect && !snap.day.perfect) sfx('perfect');
    else if (done && !snap.done) sfx('complete');
    else sfx('tap');
    const gain = day.cpts - snap.day.cpts;
    if (gain > 1e-9) setTimeout(() => { pointsPop(gain); if (!(lvl > snap.lvl) && !(day.perfect && !snap.day.perfect) && !(done && !snap.done)) sfx('points'); }, 120);
    if (lvl > snap.lvl) setTimeout(() => { toast(t('levelUpToast', { n: lvl, title: levelTitle(lvl) })); const k = PETS.KINDS.find(x => PET_LEVEL[x] > snap.lvl && PET_LEVEL[x] <= lvl); if (k) setTimeout(() => toast(t('petUnlocked_' + k)), 2600); }, 200);
  }
  // «+2,5 pts» que sube junto a la insignia de nivel
  function pointsPop(n) {
    const pill = $('.lvl-pill'); if (!pill) return;
    pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump');
    const r = pill.getBoundingClientRect(), el = document.createElement('span');
    el.className = 'pts-pop'; el.setAttribute('aria-hidden', 'true'); el.textContent = `+${fmtPts(n)} pts`;
    el.style.left = `${r.left + r.width / 2}px`; el.style.top = `${r.bottom + 4}px`;
    document.body.appendChild(el); setTimeout(() => el.remove(), reducedMotion() ? 900 : 1300);
  }
  function tapDay(h, k) {
    if (k > todayKey()) return;
    if (isAmount(h)) { openAmount(h, k); return; }
    if (subModeAt(h, k)) { openSubDay(h, k); return; }
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
  /* Datos de un día:
     · cpts: puntos de compromiso (0–10). Día perfecto = 10; cada hábito vale 10 / hábitos exigidos por el nivel
       (Chill 2, Serio 4, Locked-In 7). Hábitos parciales (cantidades) suman su parte. Solo desde pointsSince.
     · money: Dinero Caprichable de ese día con el conversor vigente ese día.
     · pts: XP para el nivel. Antes de pointsSince se conserva la fórmula antigua (no se recalcula el historial);
       desde entonces XP = puntos × 10. */
  const capOn = k => CAP.onDay(state.caprice.history, k) || state.caprice;
  const pointsOn = k => !!state.pointsSince && k >= state.pointsSince;
  function dayInfo(k) {
    return cached('day' + k, () => {
      const today = todayKey(), lvKey = commitOn(k), lv = COMMIT[lvKey];
      let base = 0, due = 0, done = 0, slip = false, quitClean = 0, units = 0;
      for (const h of state.habits) {
        if (k < firstKey(h) || (h.archived && !cnt(h, k))) continue;
        if (isQuit(h)) { if (cnt(h, k)) slip = true; else if (k < today) { quitClean++; base += 5; units++; } continue; }
        if (h.freq !== 'daily') { if (cnt(h, k) > 0) { base += 10; units++; } continue; }
        if (isOffDay(h, k) && !cnt(h, k)) continue;
        due++;
        const sc = Math.min(1, cnt(h, k) / dayGoal(h, k));
        units += sc;
        if (sc >= 1) { done++; base += 10; } else base += Math.round(10 * sc);
      }
      const need = CAP.HABITS_PER_LEVEL[lvKey];
      if (pointsV2On(k)) return dayInfoV2(k, lvKey);
      if (pointsOn(k)) {
        const cpts = CAP.dayPoints(units, lvKey), c = capOn(k);
        return { pts: cpts * 10, cpts, money: CAP.moneyFor(cpts, c.income, c.pct[lvKey]), perfect: cpts >= CAP.PERFECT_DAY_POINTS - 1e-9, level: lvKey, units, need, due, done, slip };
      }
      const perfect = !slip && (due > 0 ? done === due : quitClean > 0);
      let pts = Math.round(base * lv.mult) + (perfect ? lv.bonus : 0);
      if (k < today) pts += (due - done) * lv.miss;
      return { pts, cpts: 0, money: 0, perfect, level: lvKey, units, need, due, done, slip };
    });
  }
  /* v1.21: desde pointsV2 los puntos no dependen del nivel. Cada hábito pesa 1 al día (los semanales n/7 y los mensuales
     n/días del mes) y cuenta lo cumplido de su periodo; el día vale ese % × el máximo según la carga (10 a 15).
     Día perfecto = todos los hábitos diarios del día hechos y sin recaídas (los semanales y mensuales no lo rompen). */
  const pointsV2On = k => !!state.pointsV2 && k >= state.pointsV2;
  function dayInfoV2(k, lvKey) {
    const today = todayKey();
    let weight = 0, got = 0, n = 0, due = 0, done = 0, slip = false, quitClean = 0, units = 0;
    for (const h of state.habits) {
      if (k < firstKey(h) || (h.archived && !cnt(h, k))) continue;
      if (isQuit(h)) {
        n++;
        if (cnt(h, k)) { slip = true; weight++; }
        else if (k < today) { quitClean++; weight++; got++; units++; }
        continue;
      }
      if (h.freq !== 'daily') {
        n++;
        if (periodState(h, periodStart(h, k)) === 'off' && !cnt(h, k)) continue;
        const span = h.freq === 'weekly' ? 7 : diffDays(periodStart(h, k), addDays(nextPeriod(h, periodStart(h, k)), -1)) + 1;
        const tg = tgtAt(h, periodStart(h, k)), w = Math.min(1, tg / span);
        weight += w; got += w * Math.min(1, periodSum(h, k) / tg);
        if (cnt(h, k) > 0) units++;
        continue;
      }
      if (isOffDay(h, k) && !cnt(h, k)) continue;
      n++; due++;
      const sc = Math.min(1, cnt(h, k) / dayGoal(h, k));
      weight++; got += sc; units += sc;
      if (sc >= 1) done++;
    }
    const ratio = weight > 0 ? got / weight : 0, cpts = CAP.dayPointsV2(ratio, n), c = capOn(k);
    const pct = c.p != null ? c.p : CAP.DEFAULT_P;
    let perfect = !slip && (due > 0 ? done === due : quitClean > 0 || (weight > 0 && ratio >= 1 - 1e-9));
    const rule = perfectRuleOn(k); if (rule) perfect = perfectByRule(rule, k, perfect);
    return { pts: cpts * 10, cpts, max: CAP.maxDayPoints(n), money: CAP.moneyFor(cpts, c.income, pct), perfect, level: lvKey, units, need: n, due, done, slip, ratio };
  }
  /* v1.24: requisitos mínimos del día perfecto. state.perfectRules = [{ from, mode: 'all'|'pick', habits: [ids], projects: [ids],
     shift, ledger }]; cada regla vale desde su fecha (los días anteriores no cambian). Hay que cumplir todo lo elegido:
     los hábitos (todos o los elegidos y los de los proyectos elegidos), y si se pide, al menos un turno en el Calendario
     y/o un movimiento en la Libreta ese día. Los puntos no cambian: solo cuándo un día es perfecto. */
  const perfectRuleOn = k => { let r = null; for (const x of state.perfectRules || []) if (x && x.from <= k && (!r || x.from >= r.from)) r = x; return r && (r.mode === 'pick' || r.shift || r.ledger) ? r : null; };
  const hasLedgerOn = k => (ledgerOpen() ? LV.entries.some(e => e.date === k) : !!state.ledDays[k]);
  function perfectByRule(r, k, allPerfect) {
    let ok;
    if (r.mode === 'pick') {
      const ids = new Set(r.habits || []);
      for (const pid of r.projects || []) { const p = state.projects.find(x => x.id === pid); if (p) projHabits(p).forEach(h => ids.add(h.id)); }
      const v = projDayPerfect([...ids].map(getHabit).filter(Boolean), k);
      ok = v === null ? (r.shift || r.ledger ? true : false) : v;
    } else ok = allPerfect || ((r.shift || r.ledger) && !state.habits.some(h => !h.archived && k >= firstKey(h) && !isQuit(h) && (h.freq || 'daily') === 'daily' && !isOffDay(h, k)));
    if (ok && r.shift) ok = (state.calDays[k] || []).length > 0;
    if (ok && r.ledger) ok = hasLedgerOn(k);
    return !!ok;
  }
  function openPerfectRules() {
    const cur = perfectRuleOn(todayKey()) || { mode: 'all', habits: [], projects: [], shift: false, ledger: false };
    const f = { mode: cur.mode === 'pick' ? 'pick' : 'all', habits: [...(cur.habits || [])], projects: [...(cur.projects || [])], shift: !!cur.shift, ledger: !!cur.ledger };
    let wref;
    const read = () => { if (!wref) return; f.habits = $$('[data-pr-h]', wref).filter(i => i.checked).map(i => i.dataset.prH); f.projects = $$('[data-pr-p]', wref).filter(i => i.checked).map(i => i.dataset.prP); f.shift = $('#pr-shift', wref).checked; f.ledger = $('#pr-led', wref).checked; };
    const draw = () => {
      const hs = state.habits.filter(h => !h.archived), ps = state.projects.filter(p => !p.archived);
      $('#prr', wref).innerHTML = `<div class="stack" style="gap:14px"><p class="muted small" style="margin:0">${esc(t('prHint'))}</p>
        <div class="seg" role="group" style="display:flex">${[['all', 'prAll'], ['pick', 'prPick']].map(([v, k]) => `<button type="button" data-pr-mode="${v}" class="${f.mode === v ? 'on' : ''}" style="flex:1">${esc(t(k))}</button>`).join('')}</div>
        ${f.mode === 'pick' ? `${ps.length ? `<div class="field"><span>${esc(t('prProjects'))}</span><div class="row wrap" style="gap:8px">${ps.map(p => `<label class="check-chip tgl"><input type="checkbox" data-pr-p="${esc(p.id)}" ${f.projects.includes(p.id) ? 'checked' : ''}><span>${ico('folder', 'xs')} ${esc(p.name)}</span></label>`).join('')}</div></div>` : ''}
          <div class="field"><span>${esc(t('prHabits'))}</span><div class="row wrap" style="gap:8px">${hs.map(h => `<label class="check-chip tgl"><input type="checkbox" data-pr-h="${esc(h.id)}" ${f.habits.includes(h.id) ? 'checked' : ''}><span>${esc(h.name)}</span></label>`).join('')}</div></div>` : ''}
        <label class="row" style="gap:14px"><span class="switch"><input type="checkbox" id="pr-shift" ${f.shift ? 'checked' : ''}><span></span></span><span class="grow"><b>${esc(t('prShift'))}</b><br><span class="muted small">${esc(t('prShiftHint'))}</span></span></label>
        <label class="row" style="gap:14px"><span class="switch"><input type="checkbox" id="pr-led" ${f.ledger ? 'checked' : ''}><span></span></span><span class="grow"><b>${esc(t('prLedger'))}</b><br><span class="muted small">${esc(t('prLedgerHint'))}</span></span></label>
        <p class="muted small" style="margin:0">${esc(t('prFrom'))}</p></div>`;
    };
    openModal({
      title: `${ico('crown')} ${esc(t('prTitle'))}`, cls: 'tf-sheet', body: '<div id="prr"></div>',
      foot: `<button class="btn primary block" data-pr="save">${esc(t('save'))}</button>`,
      onMount: w => { wref = w; draw(); },
      onClick: (e, close) => {
        const m = e.target.closest('[data-pr-mode]'); if (m) { read(); f.mode = m.dataset.prMode; draw(); return; }
        if (!e.target.closest('[data-pr="save"]')) return;
        read();
        if (f.mode === 'pick' && !f.habits.length && !f.projects.length && !f.shift && !f.ledger) { toast(t('prNeedOne')); return; }
        const k = todayKey(), rule = { from: k, mode: f.mode, habits: f.mode === 'pick' ? f.habits : [], projects: f.mode === 'pick' ? f.projects : [], shift: f.shift, ledger: f.ledger };
        state.perfectRules = [...(state.perfectRules || []).filter(x => x && x.from < k), rule];
        markLedgerDays(); save(); close(); render(); toast(t('saved'));
      }
    });
  }
  // Fechas con algún movimiento (sin importes ni nada más), solo si un requisito lo usa: así se sabe aunque la Libreta esté cerrada
  function markLedgerDays() {
    if (!ledgerOpen()) return;
    const need = (state.perfectRules || []).some(r => r && r.ledger), next = {};
    if (need) for (const e of LV.entries) if (e && e.date) next[e.date] = 1;
    if (JSON.stringify(next) !== JSON.stringify(state.ledDays || {})) state.ledDays = next;
  }
  function firstDay() { return cached('first', () => state.habits.reduce((m, h) => { const f = firstKey(h); return f < m ? f : m; }, todayKey())); }
  function eachDay(fn) { const today = todayKey(); for (let k = firstDay(); k <= today; k = addDays(k, 1)) fn(k); }
  function pointsInfo() {
    return cached('points', () => {
      let xp = 0, net = 0, points = 0, money = 0, perfectDays = 0, perfectRun = 0, bestPerfectRun = 0;
      eachDay(k => { const d = dayInfo(k); xp += Math.max(0, d.pts); net += d.pts; points += d.cpts; money += d.money; if (d.perfect) { perfectDays++; perfectRun++; bestPerfectRun = Math.max(bestPerfectRun, perfectRun); } else if (k < todayKey()) perfectRun = 0; });
      // starBalance: saldo ⭐ de la antigua tienda (solo tiene sentido antes de migrar)
      const spent = state.redemptions.reduce((a, r) => a + (r.cost || 0), 0);
      return { xp, points, money, starBalance: net - spent, perfectDays, bestPerfectRun };
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

  /* ---------- Maestrías: por racha de días perfectos (una sola colección, más exigente) ----------
     Las cartas antiguas por hábito (state.mastery) se conservan tal cual y se ven aparte; ya no se ganan nuevas. */
  // Días perfectos seguidos. Los días de vacaciones ni suman ni rompen la racha; hoy solo suma si ya es perfecto.
  function perfectRun() {
    return cached('prun', () => {
      let cur = 0, best = 0; const today = todayKey();
      if (state.habits.length) eachDay(k => { const d = dayInfo(k); if (d.perfect) { cur++; if (cur > best) best = cur; } else if (k < today && !inVacation(k)) cur = 0; });
      return { cur, best };
    });
  }
  const PSUBJ = () => ({ id: '__perfect', name: profileName(), perfect: true });
  const perfectCount = () => RANKS.filter(([r]) => state.perfectMastery[r]).length;
  function checkPerfectMastery(silent = false) {
    if (!state.habits.length) return;
    const { best } = perfectRun(), m = state.perfectMastery; let fresh = -1;
    RANKS.forEach(([r, th], i) => { if (best >= th && !m[r]) { m[r] = { date: todayKey(), serial: ++state.serial }; fresh = i; } });
    if (fresh >= 0) { save(); if (!silent) setTimeout(() => showUnlock(fresh), 380); }
  }
  // Cartas antiguas por hábito: solo las que se ganaron y quedaron guardadas
  const legacyCount = h => RANKS.filter(([r]) => (state.mastery[h.id] || {})[r]).length;
  const legacyTotal = () => state.habits.reduce((a, h) => a + legacyCount(h), 0);
  const cardMeta = (h, r) => h.perfect ? state.perfectMastery[r] : (state.mastery[h.id] || {})[r];

  /* =========================================================
     CALENDARIO DE TURNOS (v1.20, traído de TurnoFlow · repositorio cebo)
     Pestaña entre «Hábitos y Proyectos» y «Libreta». Lógica pura en js/turns.js y PDF en js/turns-pdf.js.
     Datos (se sincronizan como el resto, sin cifrar):
       state.calJobs / state.calShifts  → listas por id (trabajos y plantillas de turno)
       state.calDays                    → fecha → [{ sid, note, start, end }] (marca por fecha en cdmt)
       state.calExt                     → { list: eventos de un .ics externo }
       state.calPrefs                   → { weekStart, alarms, hide: { dueño: true }, seeded }
     Compartir: solo con amigos (@nametag) y solo para verlo. Se publica una copia sin notas, precios ni pagas
     (kg_cal_publish) y se da permiso por amigo (kg_cal_grant / kg_cal_revoke). Al cambiar algo se vuelve a publicar.
     ========================================================= */
  const TF = window.KGTurns, TFPDF = window.KGTurnsPdf;
  const TFS = { quick: null, menu: false, rep: { mode: 'month', ref: new Date(), from: '', to: '' }, rot: { key: '4x4', custom: 'AAB--', map: {}, start: '', offset: 1, days: 90, overwrite: false }, list: null, busy: false, pubTimer: 0, fired: new Set() };
  // v1.24: vistas Día, Semana, Mes y Año (pellizcar cambia de una a otra en este orden)
  const TF_CV = ['day', 'week', 'month', 'year'];
  function tfUi() {
    const u = state.ui.cal && typeof state.ui.cal === 'object' ? state.ui.cal : {};
    const ym = /^\d{4}-\d{2}$/.test(u.ym || '') ? u.ym : todayKey().slice(0, 7);
    state.ui.cal = { view: ['cal', 'rep', 'shifts', 'routines', 'rot', 'more'].includes(u.view) ? u.view : 'cal', cv: TF_CV.includes(u.cv) ? u.cv : 'month', ym,
      d: /^\d{4}-\d{2}-\d{2}$/.test(u.d || '') && u.d.startsWith(ym) ? u.d : (todayKey().startsWith(ym) ? todayKey() : ym + '-01') };
    return state.ui.cal;
  }
  // La primera vez se crean los turnos de ejemplo (Mañana, Tarde, Noche, Libre, Vacaciones, Baja, Formación)
  function tfEnsure() {
    const p = state.calPrefs;
    if (!p.seeded) {
      if (!state.calShifts.length) { const d = TF.defaults(); state.calJobs = d.jobs.map(j => ({ ...j, name: t('tfDefJob') })); state.calShifts = d.shifts.map(s => ({ ...s, name: t('tfDef_' + s.id) })); }
      p.seeded = true; save();
    }
    if (!state.calJobs.length) { state.calJobs.push({ ...TF.defaults().jobs[0], name: t('tfDefJob') }); save(); }
  }
  const tfData = () => ({ jobs: state.calJobs, shifts: [...state.calShifts, ...Object.values(tfOnceMap())], days: state.calDays, ext: (state.calExt && state.calExt.list) || [], settings: { weekStart: tfWs(), alarms: !!state.calPrefs.alarms } });
  const tfWs = () => [0, 1, 6].includes(state.calPrefs.weekStart) ? state.calPrefs.weekStart : 1;
  const tfShift = id => state.calShifts.find(s => s.id === id) || (typeof id === 'string' && id.startsWith('o_') ? tfOnceMap()[id] : undefined);
  /* v1.25: turnos puntuales (médico, quedada, taxi…). Viven dentro de su día: { sid: 'o_…', once: { name, emoji, color, start, end, jobId } }
     y no están en la lista de Turnos. Solo suman horas y paga si tienen una categoría (jobId). */
  let tfOnceGen = 0, tfOnceCache = null;
  function tfOnceMap() {
    if (tfOnceCache && tfOnceCache.ref === state.calDays && tfOnceCache.gen === tfOnceGen) return tfOnceCache.map;
    const map = {};
    for (const list of Object.values(state.calDays)) for (const e of list || []) if (e && e.once && typeof e.sid === 'string' && e.sid.startsWith('o_')) map[e.sid] = tfOnceShift(e);
    tfOnceCache = { ref: state.calDays, gen: tfOnceGen, map };
    return map;
  }
  const tfOnceShift = e => { const o = e.once || {}; return { id: e.sid, name: String(o.name || '').slice(0, 40) || '—', emoji: String(o.emoji || '').slice(0, 8), color: /^#[0-9a-fA-F]{6}$/.test(o.color || '') ? o.color : '#8e8e93', kind: 'work', start: o.start || '', end: o.end || '', jobId: o.jobId || '', breakMin: 0, diffPct: 0, alarmMin: 0, once: true }; };
  const tfFg = hex => { const n = parseInt(String(hex).slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) > 160 ? '#1b1f2e' : '#ffffff'; };
  const tfColor = c => /^#[0-9a-fA-F]{6}$/.test(c || '') ? c : '#4f6bed';
  const tfH = n => new Intl.NumberFormat(state.lang, { maximumFractionDigits: 2 }).format(Math.round(n * 100) / 100);
  const tfMonths = () => Array.from({ length: 12 }, (_, i) => { const s = new Intl.DateTimeFormat(state.lang, { month: 'long' }).format(new Date(2024, i, 1)); return s.charAt(0).toUpperCase() + s.slice(1); });
  const tfLong = k => { const s = fmtDate(k, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); return s.charAt(0).toUpperCase() + s.slice(1); };
  // v1.23: tipos editables (state.calPrefs.kinds = [{ id, name, paid }]). Sin nombre propio, el de siempre
  const tfKinds = () => { const p = state.calPrefs; if (!Array.isArray(p.kinds) || !p.kinds.length) p.kinds = TF.defaultKinds(); return p.kinds; };
  const tfKind = k => { const x = tfKinds().find(y => y.id === k); if (x && x.name) return x.name; const d = t('tfKind_' + k); return d !== 'tfKind_' + k ? d : t('tfKind_other'); };
  const tfPaidKind = k => { const x = tfKinds().find(y => y.id === k); return x ? !!x.paid : k === 'work'; };
  // v1.24: cada tipo puede ir vinculado a una categoría (jobId) y cobrar su misma tarifa, +X €/h o +X %
  const tfKindRate = k => { const x = tfKinds().find(y => y.id === k); return x && x.paid && ['fixed', 'pct'].includes(x.rateMode) ? { mode: x.rateMode, v: +x.rateV || 0 } : null; };
  const tfKindJob = x => x && x.jobId ? state.calJobs.find(j => j.id === x.jobId) || null : null;
  const tfPlus = (mode, v) => mode === 'fixed' ? '+' + tfH(v) + ' €/h' : '×' + tfH(v);
  // Etiqueta de un turno (color del turno; emoji y nombre los pone el usuario)
  const tfTag = (s, cls = '', label) => `<span class="tf-tag ${cls}" style="--c:${tfColor(s.color)};--fg-c:${tfFg(tfColor(s.color))}">${label !== undefined ? esc(label) : `${s.emoji ? esc(s.emoji) + ' ' : `<span class="ini">${esc((String(s.name).trim().charAt(0) || '?').toUpperCase())}</span>`}<span class="tn">${esc(s.name)}</span>`}</span>`;
  const tfGhost = (s, who) => `<span class="tf-tag ghost" style="--c:${tfColor(s.color)}"><span class="who">${esc((String(who).trim().charAt(0) || '?').toUpperCase())}</span>${s.emoji ? esc(s.emoji) + ' ' : ''}<span class="tn">${esc(s.name)}</span></span>`;
  // Guardar un cambio del calendario: se guarda, se redibuja y, si lo compartes con alguien, se vuelve a publicar
  function tfSave(redraw = true) {
    tfOnceGen++; save();
    if (redraw) { const y = window.scrollY; render(); window.scrollTo(0, y); }
    tfSchedulePublish();
  }
  // Calendarios que me comparten (validados con sanitizeShare: vienen del servidor) y con quién comparto el mío
  async function tfRefresh(force = false) {
    if (!auth || TFS.busy || (!force && TFS.list && Date.now() - TFS.list.at < 60000)) return;
    TFS.busy = true;
    try {
      const r = await rpc('kg_cal_list');
      const shared = (r.shared || []).map(x => { try { return { owner: x.owner, peer: x.peer || {}, ...TF.sanitizeShare({ name: personName(x.peer), updated_at: x.updated_at || '', payload: x.payload || {} }) }; } catch (e) { return null; } }).filter(Boolean);
      TFS.list = { mine: r.mine || [], shared, published: r.published || null, at: Date.now() };
    } catch (e) { TFS.list = TFS.list || { mine: [], shared: [], published: null, at: Date.now() }; }
    TFS.busy = false;
  }
  const tfPayload = () => { const d = new Date(); return TF.buildSharePayload(tfData(), TF.iso(TF.addDays(d, -7)), TF.iso(TF.addDays(d, 365))); };
  async function tfPublish() { await rpc('kg_cal_publish', { p_payload: tfPayload() }); if (TFS.list) TFS.list.published = new Date().toISOString(); }
  function tfSchedulePublish() {
    if (!auth || !TFS.list || !TFS.list.mine.length) return;
    clearTimeout(TFS.pubTimer);
    TFS.pubTimer = setTimeout(() => { tfPublish().catch(() => { /* se reintenta en el próximo cambio */ }); }, 4000);
  }
  const tfShown = () => ((TFS.list && TFS.list.shared) || []).filter(f => !(state.calPrefs.hide || {})[f.owner]);

  function viewCal() {
    tfEnsure();
    const u = tfUi();
    if (auth && !TFS.list && !TFS.busy) tfRefresh().then(() => { if (state.ui.tab === 'cal') render(); });
    switch (u.view) {
      case 'rep': return tfReports();
      case 'shifts': return tfShiftsView();
      case 'rot': return tfRotView();
      case 'routines': return tfRoutinesView();
      case 'more': return tfMoreView();
    }
    const y = +u.ym.slice(0, 4), mo = +u.ym.slice(5, 7) - 1, cv = u.cv, year = cv === 'year', ws = tfWs();
    const cur = new Date(), tk = todayKey();
    const isCurrent = cv === 'day' ? u.d === tk : cv === 'week' ? tfWeekKeys(u.d)[0] === tfWeekKeys(tk)[0] : cur.getFullYear() === y && (year || cur.getMonth() === mo);
    const years = []; for (let v = Math.min(cur.getFullYear() - 20, y); v <= Math.max(cur.getFullYear() + 20, y); v++) years.push(v);
    const pick = (kind, opts, val, label) => `<span class="tf-pick"><select data-tf-pick="${kind}" aria-label="${esc(label)}">${opts.map(([v, l]) => `<option value="${v}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>${ico('down')}</span>`;
    const MENU = [['rep', 'chart', 'tfReports'], ['shifts', 'clock', 'tfShifts'], ['routines', 'layers', 'tfRoutines'], ['rot', 'repeat', 'tfRotations'], ['more', 'gear', 'tfMore']];
    const NAV = { day: ['tfPrevDay', 'tfNextDay'], week: ['tfPrevWeek', 'tfNextWeek'], month: ['tfPrevMonth', 'tfNextMonth'], year: ['tfPrevYear', 'tfNextYear'] }[cv];
    let html = topBar();
    html += `<div class="tf-top"><div class="tf-title grow">${year ? '' : pick('m', tfMonths().map((n, i) => [i, n]), mo, t('tfMonth'))}${pick('y', years.map(v => [v, v]), y, t('tfYear'))}</div>
      ${flag('calLayers') ? `<button class="icon-btn" data-tf="layers" aria-label="${esc(t('tfLayers'))}" title="${esc(t('tfLayers'))}">${ico('layers')}</button>` : ''}
      <button class="icon-btn" data-tf="menu" aria-expanded="${TFS.menu}" aria-label="${esc(t('tfMenuAria'))}" title="${esc(t('tfMenuAria'))}">${ico('grid')}</button>
      ${TFS.menu ? `<div class="tf-menu" role="menu">${MENU.map(([id, ic, k]) => `<button role="menuitem" data-tf-go="${id}">${ico(ic)} ${esc(t(k))}</button>`).join('')}</div>` : ''}</div>`;
    html += `<div class="row tf-nav" style="justify-content:space-between;gap:8px"><div class="row" style="gap:8px"><div class="pill-group"><button class="icon-btn" data-tf="prev" aria-label="${esc(t(NAV[0]))}">${ico('left')}</button><button class="icon-btn" data-tf="next" aria-label="${esc(t(NAV[1]))}">${ico('right')}</button></div>${isCurrent ? '' : `<button class="chip" data-tf="today">${esc(t('tfToday'))}</button>`}</div>
      <div class="seg seg-sm tf-cv" role="group" title="${esc(t('tfPinchHint'))}">${[['day', 'tfDay'], ['week', 'tfWeek'], ['month', 'tfMonth'], ['year', 'tfYear']].map(([v, k]) => `<button data-tf-cv="${v}" class="${cv === v ? 'on' : ''}">${esc(t(k))}</button>`).join('')}</div></div>`;
    let range;
    const LY = tfLayers();
    html += `<div class="tf-zoom ${TFS.quick && !year ? 'painting' : ''} ${LY.shifts ? '' : 'ly-noshift'} ${LY.text ? '' : 'ly-notext'}">`;
    if (year) { html += tfYearGrid(y); range = [y + '-01-01', y + '-12-31']; }
    else if (cv === 'month') { html += `<div class="tf-cal"><div class="tf-dow">${tfDow().map(n => `<span>${esc(n)}</span>`).join('')}</div>${tfMonthGrid(y, mo)}</div>`; range = [TF.iso(new Date(y, mo, 1)), TF.iso(new Date(y, mo + 1, 0))]; }
    else if (cv === 'week') { const ks = tfWeekKeys(u.d); html += tfWeekView(ks); range = [ks[0], ks[6]]; }
    else { html += tfDayView(u.d); range = [u.d, u.d]; }
    html += '</div>';
    if (state.calPrefs.summary !== false) html += tfSummary(range);
    html += tfFab(year);
    return html;
  }
  // Resumen de horas, turnos y paga del periodo a la vista (v1.24: se puede quitar en Ajustes)
  function tfSummary(range) {
    const r = TF.report(tfData(), range[0], range[1], tfWs(), tfPaidKind, tfKindRate);
    return `<section class="tf-summary clay ${privacyOn() ? 'priv' : ''}"><div><span class="muted small">${esc(t('tfHours'))}</span><b>${tfH(r.hours)} h</b></div><div><span class="muted small">${esc(t('tfShiftsN'))}</span><b>${r.count}</b></div><div><span class="muted small">${esc(t('tfPayEst'))}</span><b>${money(r.pay)}</b></div></section>`;
  }
  /* ---------- v1.24: vistas Semana y Día ----------
     Los turnos con hora van en una línea de tiempo; los que no tienen hora (Libre, Vacaciones…), arriba en «Todo el día».
     Dos turnos seguidos (uno acaba cuando empieza el otro) se dibujan unidos, cada uno con su color. */
  const tfWeekKeys = k => { const a = TF.startOfWeek(TF.parseISO(k), tfWs()); return Array.from({ length: 7 }, (_, i) => TF.iso(TF.addDays(a, i))); };
  const tfDoy = k => { const d = TF.parseISO(k); return Math.round((d - new Date(d.getFullYear(), 0, 1)) / 864e5) + 1; };
  // Semana n del año: la que contiene el 1 de enero es la 1 (según el día en que empieza tu semana)
  const tfWeekNo = k => { const d = TF.parseISO(k), off = (new Date(d.getFullYear(), 0, 1).getDay() - tfWs() + 7) % 7; return Math.floor((tfDoy(k) - 1 + off) / 7) + 1; };
  const tfMin = v => { const [h, m] = v.split(':').map(Number); return h * 60 + m; };
  function tfDayItems(k) {
    const timed = [], allDay = [];
    for (const e of tfSorted(state.calDays[k] || [])) {
      const s = tfShift(e.sid); if (!s) continue;
      const tm = TF.entryTimes(s, e);
      if (!tm.start || !tm.end) { allDay.push({ s, e }); continue; }
      let a = tfMin(tm.start), b = tfMin(tm.end); if (b <= a) b += 1440;
      timed.push({ s, e, a, b: Math.min(b, 1440), over: b > 1440, start: tm.start, end: tm.end });
    }
    // Lo que viene de la noche anterior (turno que pasa de las 00:00)
    const prev = TF.iso(TF.addDays(TF.parseISO(k), -1));
    for (const e of state.calDays[prev] || []) {
      const s = tfShift(e.sid); if (!s) continue;
      const tm = TF.entryTimes(s, e); if (!tm.start || !tm.end) continue;
      const a = tfMin(tm.start), b = tfMin(tm.end); if (b < a && b > 0) timed.push({ s, e, a: 0, b, cont: true, start: tm.start, end: tm.end });
    }
    timed.sort((x, y) => x.a - y.a || x.b - y.b);
    // Carriles para los que se solapan; unidos cuando uno acaba justo cuando empieza el siguiente
    const lanes = [];
    for (const it of timed) { let l = lanes.findIndex(end => end <= it.a); if (l < 0) { l = lanes.length; lanes.push(0); } lanes[l] = it.b; it.lane = l; }
    for (const it of timed) { it.joinT = timed.some(o => o !== it && o.lane === it.lane && o.b === it.a); it.joinB = timed.some(o => o !== it && o.lane === it.lane && o.a === it.b); }
    return { timed, allDay, lanes: Math.max(1, lanes.length) };
  }
  function tfHourRange(lists) {
    let lo = 8 * 60, hi = 20 * 60;
    for (const L of lists) for (const it of L.timed) { lo = Math.min(lo, it.a); hi = Math.max(hi, it.b); }
    return [Math.floor(lo / 60), Math.min(24, Math.ceil(hi / 60))];
  }
  const tfBlock = (it, k, lanes, H0, ph, big) => {
    const top = (it.a - H0 * 60) * ph / 60, h = Math.max(14, (it.b - it.a) * ph / 60), w = 100 / lanes, c = tfColor(it.s.color);
    const label = `${it.s.emoji ? esc(it.s.emoji) + ' ' : ''}${esc(it.s.name)}`;
    return `<span class="tf-blk ${it.joinT ? 'jt' : ''} ${it.joinB ? 'jb' : ''}" style="top:${top}px;height:${h}px;left:${it.lane * w}%;width:${w}%;--c:${c};--fg-c:${tfFg(c)}"><b>${label}</b>${big || h >= 30 ? `<small>${esc(it.start)}–${esc(it.end)}${big ? ' · ' + tfH(TF.entryHours(it.s, it.e)) + ' h' : ''}</small>` : ''}</span>`;
  };
  function tfTimeline(keys, big) {
    const L = keys.map(tfDayItems), [H0, H1] = tfHourRange(L), ph = big ? 52 : 32, tk = todayKey();
    const hours = Array.from({ length: H1 - H0 }, (_, i) => H0 + i);
    const anyAll = L.some(x => x.allDay.length);
    let html = `<div class="tf-tl ${big ? 'big' : ''}" style="--cols:${keys.length}">`;
    if (anyAll) html += `<div class="tf-tl-all"><span class="tf-tl-h muted small">${esc(t('tfAllDay'))}</span>${keys.map((k, i) => `<button class="tf-tl-allc" data-tf-day="${k}" aria-label="${esc(tfLong(k))}">${L[i].allDay.map(({ s }) => tfTag(s)).join('')}</button>`).join('')}</div>`;
    html += `<div class="tf-tl-body"><div class="tf-tl-hours">${hours.map(h => `<span style="height:${ph}px">${pad(h)}:00</span>`).join('')}</div>`;
    html += keys.map((k, i) => `<button class="tf-tl-col ${k === tk ? 'today' : ''}" data-tf-day="${k}" style="height:${hours.length * ph}px;--ph:${ph}px" aria-label="${esc(tfLong(k) + (L[i].timed.length ? ': ' + L[i].timed.map(it => it.s.name + ' ' + it.start + '–' + it.end).join(', ') : ''))}">${L[i].timed.map(it => tfBlock(it, k, L[i].lanes, H0, ph, big)).join('')}</button>`).join('');
    return html + '</div></div>';
  }
  function tfWeekView(keys) {
    const tk = todayKey(), y = TF.parseISO(keys[6]).getFullYear(), tot = tfWeekNo(y + '-12-31');
    const head = keys.map(k => { const d = TF.parseISO(k), dks = tfDksOf(k), cs = tfLayers().days ? tfDayColors(k) : []; return `<button class="tf-wk-d ${k === tk ? 'today' : ''} ${cs.length ? 'dk' : ''}" ${cs.length ? `style="${tfTintStyle(cs)}" title="${esc(dks.map(tfDkName).join(', '))}"` : ''} data-tf-open="${k}"><span>${esc(new Intl.DateTimeFormat(state.lang, { weekday: 'short' }).format(d).replace('.', ''))}</span><b>${d.getDate()}</b></button>`; }).join('');
    return `<div class="tf-count"><b>${esc(t('tfWeekCount', { n: tfWeekNo(keys[6].slice(0, 4) === keys[0].slice(0, 4) ? keys[0] : (keys.find(k => k.endsWith('-01-01')) || keys[0])), t: tot }))}</b><span class="muted small">${esc(fmtShort(keys[0]))} – ${esc(fmtShort(keys[6]))}</span></div>
      <div class="tf-week clay"><div class="tf-wk-head" style="--cols:7"><span></span>${head}</div>${tfTimeline(keys, false)}</div>`;
  }
  function tfDayView(k) {
    const y = +k.slice(0, 4), tot = tfDoy(y + '-12-31'), it = tfDayItems(k), shown = tfShown(), ext = tfData().ext.filter(e => e.date === k);
    const mates = shown.map(f => ({ f, ids: f.days[k] || [] })).filter(c => c.ids.length);
    const dks = tfDksOf(k), evs = tfEvDays('org')[k] || [], LY = tfLayers(), note = LY.notes ? tfDayNote(k) : '', rv = LY.rates ? dayRateOf(k) : null;
    return `<div class="tf-count"><b>${esc(t('tfDayCount', { n: tfDoy(k), t: tot }))}</b><span class="muted small">${esc(tfLong(k))}</span>${rv != null ? ` <b class="rate-big" style="--rc:${rateColor(rv)}">${rv}<small>/10</small></b>` : ''}</div>
      ${note ? `<div class="tf-all-note" style="margin:0 2px 8px">${ico('doc', 'xs')} <span>${esc(note)}</span></div>` : ''}
      ${dks.length || evs.length ? `<div class="row wrap" style="gap:6px;margin:0 2px 8px">${dks.map(d => tfDkTag(d)).join('')}${evs.map(v => `<span class="tf-tag" style="--c:${tfColor(v.paint.color)};--fg-c:${tfFg(tfColor(v.paint.color))}">${esc(v.name)}</span>`).join('')}</div>` : ''}
      <div class="tf-week tf-day clay">${it.timed.length || it.allDay.length ? tfTimeline([k], true) : `<button class="tf-empty-day" data-tf-day="${k}">${ico('plus')} ${esc(t('tfNoDayShifts'))}</button>`}</div>
      ${mates.length ? `<section class="clay card stack" style="gap:8px;margin-bottom:12px"><h3 class="section-title" style="margin:0">${esc(t('tfMates'))}</h3>${mates.map(({ f, ids }) => `<div class="tf-item"><b>${esc(f.name)}</b><div class="row wrap grow" style="gap:6px">${ids.map(id => { const s = f.shifts.find(x => x.id === id); return s ? tfTag(s) : ''; }).join('')}</div></div>`).join('')}</section>` : ''}
      ${ext.length ? `<section class="clay card stack" style="gap:8px;margin-bottom:12px"><h3 class="section-title" style="margin:0">${esc(t('tfExtEvents'))}</h3>${ext.map(e => `<div class="tf-item">${ico('calendar')} ${esc(e.title)}</div>`).join('')}</section>` : ''}`;
  }
  function tfSetCv(cv) {
    const u = tfUi(); if (!TF_CV.includes(cv) || cv === u.cv) return;
    if (cv === 'month' || cv === 'year') u.ym = u.d.slice(0, 7);
    u.cv = cv; if (cv === 'year') TFS.quick = null;
    save(); render();
    const z = $('.tf-zoom'); if (z) { z.classList.remove('zoom-in', 'zoom-out'); void z.offsetWidth; z.classList.add(TF_CV.indexOf(cv) > TF_CV.indexOf(TFS.lastCv || cv) ? 'zoom-out' : 'zoom-in'); }
    TFS.lastCv = cv;
  }
  /* v1.24: pellizcar en el calendario, como en Google Calendar y Apple: abrir los dedos acerca (Año → Mes → Semana → Día)
     y cerrarlos aleja (Día → Semana → Mes → Año). En el ordenador, Ctrl + rueda (o pellizcar en el trackpad) hace lo mismo. */
  const TF_PINCH = { out: -1, in: 1 };
  let tfPinch = null;
  const tfDist = ts => Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY);
  const tfZoomBy = dir => { const u = tfUi(), i = TF_CV.indexOf(u.cv) + dir; if (i >= 0 && i < TF_CV.length) { sfx('tap'); tfSetCv(TF_CV[i]); } };
  document.addEventListener('touchstart', e => {
    if (state.ui.tab !== 'cal' || e.touches.length !== 2 || !e.target.closest('.tf-zoom')) return;
    tfPinch = { d: tfDist(e.touches), done: false }; mSw = null; tfPaintEnd(false);
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!tfPinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    if (tfPinch.done) return;
    const r = tfDist(e.touches) / (tfPinch.d || 1);
    if (r > 1.3) { tfPinch.done = true; tfZoomBy(TF_PINCH.out); } else if (r < .77) { tfPinch.done = true; tfZoomBy(TF_PINCH.in); }
  }, { passive: false });
  document.addEventListener('touchend', e => { if (tfPinch && e.touches.length < 2) tfPinch = null; }, { passive: true });
  let tfWheelAt = 0;
  document.addEventListener('wheel', e => {
    if (!e.ctrlKey || state.ui.tab !== 'cal' || !e.target.closest || !e.target.closest('.tf-zoom')) return;
    e.preventDefault();
    if (Date.now() - tfWheelAt < 450 || Math.abs(e.deltaY) < 4) return;
    tfWheelAt = Date.now(); tfZoomBy(e.deltaY < 0 ? TF_PINCH.out : TF_PINCH.in);
  }, { passive: false });
  /* v1.24: con «Edición rápida», mantener pulsado y deslizar por los días pinta (o quita) en todos los que toques.
     Lo que hace el primer día manda: si ya tenía ese turno, se va quitando; si no, se va poniendo. */
  let tfPaintS = null;
  function tfPaintCell(k) {
    if (!tfPaintS || tfPaintS.seen.has(k)) return;
    tfPaintS.seen.add(k);
    const q = TFS.quick;
    if (q === 'erase') { delete state.calDays[k]; delete state.calDayK[k]; }
    else if (q.startsWith('dk:')) {
      const id = q.slice(3);
      if (tfPaintS.mode === null) tfPaintS.mode = tfDkIds(k).includes(id) ? 'rm' : 'add';
      tfDkToggle(k, id, tfPaintS.mode);
    }
    else if (q.startsWith('rt:')) {
      const r = state.calRoutines.find(x => x.id === q.slice(3)); if (!r) return;
      const list = state.calDays[k] || [], has = list.some(e => e.rt === r.id);
      if (tfPaintS.mode === null) tfPaintS.mode = has ? 'rm' : 'add';
      if (tfPaintS.mode === 'rm' && has) tfSetDay(k, list.filter(e => e.rt !== r.id));
      else if (tfPaintS.mode === 'add' && !has) tfRunRoutine(r, { from: k, to: k, weekdays: [], overwrite: false });
    }
    else {
      const list = state.calDays[k] ? [...state.calDays[k]] : [], i = list.findIndex(e => e.sid === q);
      if (tfPaintS.mode === null) tfPaintS.mode = i >= 0 ? 'rm' : 'add';
      if (tfPaintS.mode === 'rm' && i >= 0) list.splice(i, 1);
      else if (tfPaintS.mode === 'add' && i < 0 && list.length < TF.LIMITS.perDay) list.push({ sid: q, note: '', start: '', end: '' });
      tfSetDay(k, list);
    }
    sfx('tap'); vibrate(8);
    // Se redibuja solo la casilla (la pantalla entera se redibuja al soltar)
    const tmp = document.createElement('div'); tmp.innerHTML = viewCal();
    $$(`[data-tf-day="${k}"]`).forEach(el => { const n = tmp.querySelector(`.${el.classList[0]}[data-tf-day="${k}"]`); if (n) el.innerHTML = n.innerHTML; el.classList.add('painted'); });
  }
  function tfPaintEnd(commit = true) { const p = tfPaintS; tfPaintS = null; if (p && commit && p.seen.size) tfSave(); }
  document.addEventListener('pointerdown', e => {
    if (state.ui.tab !== 'cal' || !TFS.quick || e.button || tfUi().cv === 'year') return;
    const c = e.target.closest('.tf-zoom [data-tf-day]'); if (!c || e.target.closest('[data-tf-more]')) return;
    tfPaintS = { seen: new Set(), mode: null, id: e.pointerId };
    tfPaintCell(c.dataset.tfDay);
  }, true);
  document.addEventListener('pointermove', e => {
    if (!tfPaintS || e.pointerId !== tfPaintS.id) return;
    const el = document.elementFromPoint(e.clientX, e.clientY), c = el && el.closest('.tf-zoom [data-tf-day]');
    if (c) tfPaintCell(c.dataset.tfDay);
  }, true);
  document.addEventListener('pointerup', e => { if (tfPaintS && e.pointerId === tfPaintS.id) tfPaintEnd(); }, true);
  document.addEventListener('pointercancel', e => { if (tfPaintS && e.pointerId === tfPaintS.id) tfPaintEnd(); }, true);
  function tfDow() {
    const ws = tfWs(), base = new Date(2024, 0, 7); // domingo
    return Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(state.lang, { weekday: 'short' }).format(TF.addDays(base, (ws + i) % 7)));
  }
  function tfMonthGrid(y, mo) {
    const ws = tfWs(), lead = (new Date(y, mo, 1).getDay() - ws + 7) % 7, dim = new Date(y, mo + 1, 0).getDate(), cells = Math.ceil((lead + dim) / 7) * 7;
    const today = todayKey(), extBy = {}, shown = tfShown(), evd = tfEvDays('org'), usedDk = new Set();
    for (const e of tfData().ext) (extBy[e.date] = extBy[e.date] || []).push(e);
    let html = '<div class="tf-grid">';
    const LY = tfLayers();
    for (let i = 0; i < cells; i++) {
      const date = TF.addDays(new Date(y, mo, 1), i - lead), k = TF.iso(date), inMonth = date.getMonth() === mo, items = [];
      const rtSeen = new Set();
      for (const e of tfSorted(state.calDays[k] || [])) {
        // v1.24: los turnos que vienen de una rutina se ven como una sola etiqueta (al abrir el día se ve su composición)
        const r = e.rt && state.calRoutines.find(x => x.id === e.rt && x.kind === 'day');
        if (r) { if (!rtSeen.has(r.id)) { rtSeen.add(r.id); items.push({ r }); } continue; }
        const s = tfShift(e.sid); if (s) items.push({ s, tm: TF.entryTimes(s, e), note: e.note });
      }
      // v1.24: un turno que empieza justo cuando acaba el anterior se dibuja pegado a él
      items.forEach((it, j) => { const p = items[j - 1]; if (p && p.tm && it.tm && p.tm.end && p.tm.end === it.tm.start) { p.jb = true; it.jt = true; } });
      for (const f of shown) for (const id of f.days[k] || []) { const s = f.shifts.find(x => x.id === id); if (s) items.push({ s, who: f.name }); }
      const ext = extBy[k] || [];
      const aria = tfLong(k) + (items.length ? ': ' + items.map(it => it.r ? it.r.name : (it.who ? it.who + ' · ' : '') + it.s.name).join(', ') : '');
      const dks = tfDksOf(k), evs = evd[k] || []; if (inMonth) dks.forEach(d => usedDk.add(d));
      // v1.25: tipos de día y eventos comparten los colores de la casilla (1 entero, 2 en diagonal, 3 como una tarta)
      const cs = LY.days ? tfDayColors(k) : [], note = LY.notes ? tfDayNote(k) : '', rv = LY.rates ? dayRateOf(k) : null;
      html += `<button class="tf-cell ${inMonth ? '' : 'out'} ${k === today ? 'today' : ''} ${cs.length ? 'dk' : ''} ${cs.length > 1 ? 'dk-multi' : ''}" data-tf-day="${k}" ${cs.length ? `style="${tfTintStyle(cs)}"` : ''} aria-label="${esc(dks.map(d => tfDkName(d) + ' · ').join('') + aria + (evs.length ? ' · ' + evs.map(v => v.name).join(', ') : ''))}"><span class="n">${date.getDate()}${ext.length ? `<i title="${esc(ext.map(e => e.title).join('\n'))}">● ${ext.length}</i>` : ''}${rv != null ? `<b class="tf-rate" style="--rc:${rateColor(rv)}">${rv}</b>` : ''}</span><span class="tf-items">${LY.shifts ? items.map((it, j) => it.r ? tfRtTag(it.r) : it.who ? tfGhost(it.s, it.who) : tfTag(it.s, `${it.jt && j ? 'jt' : ''} ${it.jb && j < items.length - 1 ? 'jb' : ''} ${LY.notes && it.note ? 'has-note' : ''}`)).join('') : ''}${note ? `<span class="tf-dnote">${esc(note)}</span>` : ''}</span></button>`;
    }
    html += '</div>';
    if (usedDk.size) html += `<div class="tf-dk-legend">${[...usedDk].map(d => `<span><i style="--c:${tfColor(d.color)}"></i>${esc(tfDkName(d))}</span>`).join('')}</div>`;
    return html;
  }
  /* v1.25: en el Mes, si el contenido de un día no cabe en su casilla (que mide lo mismo que las demás), se corta y sale
     «Ver más»; al tocarlo se ve todo lo del día sin abrir el editor */
  function tfFitCells(root) {
    if (!root) return;
    $$('.tf-grid .tf-cell', root).forEach(c => {
      const box = $('.tf-items', c); if (!box) return;
      c.classList.remove('over'); $('.tf-more', c)?.remove();
      if (box.scrollHeight > box.clientHeight + 2) { c.classList.add('over'); c.insertAdjacentHTML('beforeend', `<span class="tf-more" role="button" tabindex="0" data-tf-more="${esc(c.dataset.tfDay)}">${esc(t('tfSeeMore'))}</span>`); }
    });
  }
  function tfSeeAll(k) {
    const list = tfSorted(state.calDays[k] || []), shown = tfShown(), ext = tfData().ext.filter(e => e.date === k), dks = tfDksOf(k), evs = tfEvDays('org')[k] || [];
    const row = (tag, sub) => `<div class="tf-all-row">${tag}${sub ? `<span class="muted small">${esc(sub)}</span>` : ''}</div>`;
    const times = (s, e) => { const tm = TF.entryTimes(s, e); return tm.start ? `${tm.start}${tm.end ? '–' + tm.end : ''}` : ''; };
    const rts = new Set();
    const rows = [];
    for (const e of list) {
      const r = e.rt && state.calRoutines.find(x => x.id === e.rt && x.kind === 'day');
      if (r) { if (!rts.has(r.id)) { rts.add(r.id); rows.push(row(tfRtTag(r), (r.day || []).map(x => tfShift(x.sid)).filter(Boolean).map(x => x.name).join(' · '))); } continue; }
      const s = tfShift(e.sid); if (s) rows.push(row(tfTag(s), [times(s, e), e.note].filter(Boolean).join(' · ')));
    }
    for (const f of shown) for (const id of f.days[k] || []) { const s = f.shifts.find(x => x.id === id); if (s) rows.push(row(tfGhost(s, f.name), f.name)); }
    for (const e of ext) rows.push(row(`<span class="tf-tag" style="--c:#888">${ico('calendar', 'xs')} <span class="tn">${esc(e.title)}</span></span>`, ''));
    const note = tfDayNote(k), rv = dayRateOf(k);
    if (note) rows.push(`<div class="tf-all-note">${ico('doc', 'xs')} <span>${esc(note)}</span></div>`);
    if (rv != null) rows.push(`<div class="row" style="gap:8px"><span class="muted small">${esc(t('rateTitle'))}</span><b class="rate-big" style="--rc:${rateColor(rv)}">${rv}<small>/10</small></b></div>`);
    openModal({
      title: esc(tfLong(k)),
      body: `${dks.length || evs.length ? `<div class="row wrap" style="gap:6px;margin-bottom:10px">${dks.map(dk => `<span class="chip sm"><i class="dk-dot" style="background:${tfColor(dk.color)}"></i> ${esc(tfDkName(dk))}</span>`).join('')}${evs.map(v => `<span class="chip sm"><i class="dk-dot" style="background:${tfColor(v.paint.color)}"></i> ${esc(v.name)}</span>`).join('')}</div>` : ''}<div class="stack tf-all" style="gap:8px">${rows.join('') || `<p class="muted">${esc(t('tfNoDayShifts'))}</p>`}</div>`,
      foot: `<button class="btn primary block" data-tfa="edit">${ico('edit')} ${esc(t('tfEditDay'))}</button>`,
      onClick: (e, close) => { if (e.target.closest('[data-tfa="edit"]')) { close(); tfOpenDay(k); } }
    });
  }
  // Los 12 meses en miniatura: cada día con el color de su primer turno
  function tfYearGrid(y) {
    const ws = tfWs(), today = todayKey(), ini = tfDow().map(n => n.charAt(0).toUpperCase()), M = tfMonths();
    let html = '<div class="tf-year">';
    for (let mo = 0; mo < 12; mo++) {
      const lead = (new Date(y, mo, 1).getDay() - ws + 7) % 7, dim = new Date(y, mo + 1, 0).getDate();
      let cells = '<span class="mc blank"></span>'.repeat(lead);
      for (let d = 1; d <= dim; d++) {
        const k = TF.iso(new Date(y, mo, d)), list = tfSorted(state.calDays[k] || []), s0 = list.length ? tfShift(list[0].sid) : null, dk = tfDkOf(k), s = s0 || dk;
        cells += `<button class="mc ${s ? 'on' : ''} ${list.length > 1 ? 'multi' : ''} ${k === today ? 'today' : ''}" ${s ? `style="--c:${tfColor(s.color)};--fg-c:${tfFg(tfColor(s.color))}"` : ''} data-tf-day="${k}" aria-label="${esc(tfLong(k) + (list.length ? ': ' + list.map(e => (tfShift(e.sid) || {}).name).join(', ') : ''))}">${d}</button>`;
      }
      html += `<div class="tf-mini clay"><button class="tf-mini-title" data-tf-month="${mo}">${esc(M[mo])}</button><div class="tf-mini-dow">${ini.map(n => `<span>${esc(n)}</span>`).join('')}</div><div class="tf-mini-grid">${cells}</div></div>`;
    }
    return html + '</div>';
  }
  /* v1.24: un solo botón abajo a la derecha (el «pincel»). Abre un panel con Turnos · Rutinas · Días y, debajo, Compartir y
     Compartidos. Al elegir algo, el panel se encoge en una barra fina con lo elegido, «Borrar» y «Listo»: tocas o deslizas por los días.
     TFS.quick: id de turno, 'rt:<id de rutina>' o 'erase'. */
  const tfQLabel = q => { if (String(q).startsWith('dk:')) { const d = tfDayKinds().find(x => x.id === q.slice(3)); return d ? tfDkTag(d, 'big') : ''; } if (q === 'erase') return `<span class="tf-tag erase">${esc(t('tfErase'))}</span>`; if (String(q).startsWith('rt:')) { const r = state.calRoutines.find(x => x.id === q.slice(3)); return r ? tfRtTag(r, 'big') : ''; } const s = tfShift(q); return s ? tfTag(s, 'big') : ''; };
  function tfFab(year) {
    if (TFS.quick && !year && !TFS.sheet) {
      return `<div class="tf-qbar" role="toolbar" aria-label="${esc(t('tfQuick'))}"><button class="tf-qbar-cur" data-tf="sheet" aria-label="${esc(t('tfQChange'))}" title="${esc(t('tfQChange'))}">${tfQLabel(TFS.quick)}${ico('up')}</button>
        <span class="muted small grow tf-qbar-hint">${esc(t('tfPaintHint'))}</span>
        <button class="tf-pal" data-tf-q="erase" aria-pressed="${TFS.quick === 'erase'}" title="${esc(t('tfErase'))}"><span class="tf-tag erase">${ico('x')}</span></button>
        <button class="btn primary sm" data-tf="qdone">${ico('check')} ${esc(t('tfQDone'))}</button></div>`;
    }
    if (!TFS.sheet) return `<button class="tf-fab" data-tf="sheet" aria-label="${esc(t('tfQuick'))}" title="${esc(t('tfQuick'))}">${ico('brush')}</button>`;
    const tab = TFS.qTab || 'shifts', rts = state.calRoutines.filter(r => r.kind === 'day');
    let body;
    if (tab === 'shifts') body = state.calShifts.map(s => `<button class="tf-pal" data-tf-q="${esc(s.id)}" aria-pressed="${TFS.quick === s.id}">${tfTag(s)}</button>`).join('');
    else if (tab === 'routines') body = rts.length ? rts.map(r => `<button class="tf-pal" data-tf-q="rt:${esc(r.id)}" aria-pressed="${TFS.quick === 'rt:' + r.id}">${tfRtTag(r)}</button>`).join('') : `<p class="muted small" style="margin:0">${esc(t('tfQNoRt'))} <button class="link-btn" data-tf-go="routines">${esc(t('tfRoutines'))}</button></p>`;
    else body = `${tfDayKinds().map(d => `<button class="tf-pal" data-tf-q="dk:${esc(d.id)}" aria-pressed="${TFS.quick === 'dk:' + d.id}">${tfDkTag(d)}</button>`).join('')}<button class="chip" data-tf="dk-edit">${ico('edit')} ${esc(t('tfDkManage'))}</button>`;
    return `<div class="tf-sheet-bg" data-tf="sheet-x"></div><div class="tf-qsheet" role="dialog" aria-label="${esc(t('tfQuick'))}">
      <div class="row" style="justify-content:space-between;gap:8px"><b>${esc(t('tfQuick'))}</b><button class="icon-btn sm" data-tf="sheet-x" aria-label="${esc(t('close'))}">${ico('x')}</button></div>
      <div class="seg seg-sm" role="tablist">${[['shifts', 'tfShifts'], ['routines', 'tfRoutines'], ['days', 'tfQDays']].map(([v, k]) => `<button role="tab" aria-selected="${tab === v}" data-tf-qtab="${v}" class="${tab === v ? 'on' : ''}">${esc(t(k))}</button>`).join('')}</div>
      <div class="tf-qlist">${body}</div>
      ${year ? `<p class="muted small" style="margin:0">${esc(t('tfQYear'))}</p>` : ''}
      <div class="tf-qfoot"><button class="btn sm" data-tf="share">${ico('share')} ${esc(t('tfShare'))}</button><button class="btn sm" data-tf="shared">${ico('users')} ${esc(t('tfShared'))}</button></div></div>`;
  }
  /* v1.24: colorear días (complementario a turnos y rutinas). state.calPrefs.dayKinds = [{ id, name, color }] (plantilla
     editable); state.calDayK = { fecha: id }. Un día tiene como mucho un tipo, que tiñe la casilla entera. */
  const TF_DK0 = [['dk_work', '#4f6bed'], ['dk_off', '#43a047'], ['dk_holiday', '#e53935'], ['dk_vac', '#00acc1']];
  const tfDayKinds = () => { const p = state.calPrefs; if (!Array.isArray(p.dayKinds)) p.dayKinds = TF_DK0.map(([id, color]) => ({ id, name: '', color })); return p.dayKinds; };
  const tfDkName = d => d.name || t('tfDk_' + d.id);
  // v1.25: un día puede tener hasta 3 tipos (state.calDayK[k] = id o [id, id, id]); con los colores de los eventos, máximo 3 colores
  const TF_DK_MAX = 3;
  const tfDkIds = k => { const v = state.calDayK[k]; return Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, TF_DK_MAX) : typeof v === 'string' && v ? [v] : []; };
  const tfDksOf = k => tfDkIds(k).map(id => tfDayKinds().find(d => d.id === id)).filter(Boolean);
  const tfDkOf = k => tfDksOf(k)[0] || null;
  const tfDkSet = (k, ids) => { ids = [...new Set(ids)].slice(0, TF_DK_MAX); if (!ids.length) delete state.calDayK[k]; else state.calDayK[k] = ids.length === 1 ? ids[0] : ids; };
  // Pone o quita un tipo de día; si ya hay 3, avisa y no añade. Devuelve true si cambió algo
  function tfDkToggle(k, id, mode) {
    const ids = tfDkIds(k), has = ids.includes(id);
    if (mode ? mode === 'rm' : has) { if (!has) return false; tfDkSet(k, ids.filter(x => x !== id)); return true; }
    if (has) return false;
    if (ids.length + tfEvColorsN(k) >= TF_DK_MAX) { toast(t('tfDkMax')); return false; }
    tfDkSet(k, [...ids, id]); return true;
  }
  const tfEvColorsN = k => (tfEvDays('org')[k] || []).length;
  // Colores del día (tipos y eventos, hasta 3) → estilo de la casilla: 1 color entero, 2 en diagonal y 3 como una tarta
  function tfDayColors(k, where = 'org') {
    const cs = [...tfDksOf(k).map(d => tfColor(d.color)), ...(tfEvDays(where)[k] || []).map(v => tfColor(v.paint.color))];
    return [...new Set(cs)].slice(0, TF_DK_MAX);
  }
  function tfTintStyle(cs, pct = 40) {
    if (!cs.length) return '';
    const m = c => `color-mix(in srgb, ${c} ${pct}%, var(--surface))`;
    if (cs.length === 1) return `--dk:${cs[0]}`;
    const bg = cs.length === 2 ? `linear-gradient(135deg, ${m(cs[0])} 50%, ${m(cs[1])} 50%)` : `conic-gradient(${m(cs[0])} 0 120deg, ${m(cs[1])} 120deg 240deg, ${m(cs[2])} 240deg 360deg)`;
    return `--dk:${cs[0]};background:${bg}`;
  }
  const tfDkTag = (d, cls = '') => `<span class="tf-tag tf-dk ${cls}" style="--c:${tfColor(d.color)};--fg-c:${tfFg(tfColor(d.color))}">${esc(tfDkName(d))}</span>`;
  // Eventos de la Libreta con «Colorear días» (solo con la Libreta abierta, porque van cifrados)
  function tfEvDays(where) {
    const out = {};
    if (typeof LV === 'undefined' || !ledgerOpen()) return out;
    for (const ev of LV.events || []) {
      const pt = ev.paint; if (!pt || !pt.on || !pt[where] || !ev.from || !ev.to) continue;
      const dl = evDays(ev);
      if (dl) { for (const k of dl) (out[k] = out[k] || []).push(ev); continue; }
      for (let k = ev.from, i = 0; k <= ev.to && i < 800; k = addDays(k, 1), i++) (out[k] = out[k] || []).push(ev);
    }
    return out;
  }
  function tfEditDayKinds() {
    let wref;
    const draw = () => {
      $('#tfdk', wref).innerHTML = `<div class="stack" style="gap:10px"><p class="muted small" style="margin:0">${esc(t('tfDkHint'))}</p>${tfDayKinds().map((d, i) => `<div class="tf-item" data-dk-i="${i}"><input class="tf-swatch sm" type="color" data-dk-c value="${tfColor(d.color)}" aria-label="${esc(t('tfColor'))}"><input class="input grow" data-dk-n maxlength="30" value="${esc(tfDkName(d))}" aria-label="${esc(t('tfName'))}"><button class="icon-btn sm danger-text" data-dk-del aria-label="${esc(t('delete'))}" title="${esc(t('delete'))}">${ico('trash')}</button></div>`).join('')}
        <button class="btn block" data-dk-add>${ico('plus')} ${esc(t('tfDkNew'))}</button></div>`;
    };
    openModal({
      title: `${ico('palette')} ${esc(t('tfDkTitle'))}`, body: '<div id="tfdk"></div>', cls: 'tf-sheet',
      onMount: w => {
        wref = w; draw();
        w.addEventListener('change', e => {
          const row = e.target.closest('[data-dk-i]'); if (!row) return;
          const list = [...tfDayKinds()], i = +row.dataset.dkI, d = { ...list[i] };
          if (e.target.matches('[data-dk-c]')) d.color = tfColor(e.target.value);
          if (e.target.matches('[data-dk-n]')) { const n = e.target.value.trim().slice(0, 30); d.name = n && n !== t('tfDk_' + d.id) ? n : ''; }
          list[i] = d; state.calPrefs = { ...state.calPrefs, dayKinds: list }; save();
        });
      },
      onClose: () => render(),
      onClick: async e => {
        if (e.target.closest('[data-dk-add]')) { const list = tfDayKinds(); if (list.length >= 20) return; state.calPrefs = { ...state.calPrefs, dayKinds: [...list, { id: 'dk_' + TF.uid().slice(0, 10), name: t('tfDkNewName'), color: '#f5a524' }] }; save(); draw(); return; }
        const del = e.target.closest('[data-dk-del]'); if (!del) return;
        const list = [...tfDayKinds()], i = +del.closest('[data-dk-i]').dataset.dkI, d = list[i], n = Object.keys(state.calDayK).filter(x => tfDkIds(x).includes(d.id)).length;
        if (n && !(await confirmDialog(t('tfDkDelQ', { name: tfDkName(d), n })))) return;
        list.splice(i, 1); state.calPrefs = { ...state.calPrefs, dayKinds: list };
        for (const k of Object.keys(state.calDayK)) if (tfDkIds(k).includes(d.id)) tfDkSet(k, tfDkIds(k).filter(x => x !== d.id));
        if (TFS.quick === 'dk:' + d.id) TFS.quick = null;
        save(); draw();
      }
    });
  }
  // Una rutina se ve como una sola etiqueta con los colores de sus turnos, unidos, cada uno con el suyo
  function tfRtTag(r, cls = '') {
    const cs = (r.day || []).map(e => tfShift(e.sid)).filter(Boolean).map(s => tfColor(s.color));
    const bg = cs.length > 1 ? `linear-gradient(90deg, ${cs.map((c, i) => `${c} ${i * 100 / cs.length}% ${(i + 1) * 100 / cs.length}%`).join(', ')})` : (cs[0] || '#888');
    return `<span class="tf-tag tf-rt ${cls}" style="--c:${cs[0] || '#888'};background:${bg};--fg-c:${tfFg(cs[0] || '#888888')}">${ico('layers', 'xs')} <span class="tn">${esc(r.name)}</span></span>`;
  }
  // Edición rápida: tocar un día pone (o quita) el turno elegido
  function tfOnDay(k) {
    if (!TFS.quick || tfUi().cv === 'year') return tfOpenDay(k);
    if (TFS.quick === 'erase') { delete state.calDays[k]; delete state.calDayK[k]; }
    else if (TFS.quick.startsWith('rt:') || TFS.quick.startsWith('dk:')) { tfPaintS = { seen: new Set(), mode: null }; tfPaintCell(k); tfPaintS = null; }
    else {
      const list = state.calDays[k] ? [...state.calDays[k]] : [], i = list.findIndex(e => e.sid === TFS.quick);
      if (i >= 0) list.splice(i, 1); else if (list.length < TF.LIMITS.perDay) list.push({ sid: TFS.quick, note: '', start: '', end: '' });
      tfSetDay(k, list);
    }
    sfx('tap'); tfSave();
  }
  // v1.23: los turnos de un día van de más pronto a más tarde (los que no tienen hora, al final, en su orden)
  const tfStartMin = e => { const s = tfShift(e.sid), st = s ? TF.entryTimes(s, e).start : ''; if (!st) return 1e4; const [h, m] = st.split(':').map(Number); return h * 60 + m; };
  const tfSorted = list => list.map((e, i) => [e, i]).sort((a, b) => tfStartMin(a[0]) - tfStartMin(b[0]) || a[1] - b[1]).map(x => x[0]);
  const tfSetDay = (k, list) => { tfOnceGen++; if (list.length) state.calDays[k] = tfSorted(list); else delete state.calDays[k]; };
  /* v1.25: capas de vista del Calendario (por dispositivo, state.ui.calLayers). Por ahora solo para el equipo (función calLayers):
     sin ella se ve todo. Turnos y Rutinas (con «Mostrar texto»), Días (colores), Notas y Valoraciones. */
  const TF_LAYERS = ['shifts', 'text', 'days', 'notes', 'rates'];
  function tfLayers() {
    const all = Object.fromEntries(TF_LAYERS.map(k => [k, true]));
    if (!flag('calLayers')) return all;
    const u = state.ui.calLayers && typeof state.ui.calLayers === 'object' ? state.ui.calLayers : {};
    return Object.fromEntries(TF_LAYERS.map(k => [k, u[k] !== false]));
  }
  function tfOpenLayers() {
    const draw = w => { const L = tfLayers(); $('#tfl', w).innerHTML = `<div class="stack" style="gap:12px">${TF_LAYERS.map(k => `<label class="row ${k === 'text' ? 'tf-ly-sub' : ''}" style="gap:12px"><span class="switch"><input type="checkbox" data-tfl="${k}" ${L[k] ? 'checked' : ''} ${k === 'text' && !L.shifts ? 'disabled' : ''}><span></span></span><span class="grow"><b>${esc(t('tfLy_' + k))}</b></span></label>`).join('')}<p class="muted small" style="margin:0">${esc(t('tfLayersHint'))}</p></div>`; };
    openModal({
      title: `${ico('layers')} ${esc(t('tfLayers'))}`, cls: 'tf-sheet', body: '<div id="tfl"></div>',
      onMount: w => { draw(w); w.addEventListener('change', e => { const k = e.target.dataset.tfl; if (!k) return; state.ui.calLayers = { ...tfLayers(), [k]: e.target.checked }; save(); render(); draw(w); }); }
    });
  }
  /* v1.25: nota del día (state.calNotes[fecha] = texto) */
  const TF_NOTE_MAX = 500;
  const tfDayNote = k => typeof state.calNotes[k] === 'string' ? state.calNotes[k] : '';
  const tfSetDayNote = (k, v) => { v = String(v || '').slice(0, TF_NOTE_MAX); if (v.trim()) state.calNotes[k] = v; else delete state.calNotes[k]; };
  // Turno puntual: nuevo (i = -1) o editar el de la posición i del día
  function tfOnceEditor(k, i, after) {
    const list = state.calDays[k] || [], cur = i >= 0 ? list[i] : null, o = cur && cur.once ? { ...cur.once } : { name: '', emoji: '', color: HABIT_COLORS[1], start: '', end: '', jobId: '' };
    const cols = ['#8e8e93', ...HABIT_COLORS];
    openModal({
      title: esc(t(cur ? 'tfOnceEdit' : 'tfOnceNew')), cls: 'tf-sheet',
      body: `<div class="stack" style="gap:12px"><p class="muted small" style="margin:0">${esc(t('tfOnceHint'))}</p>
        <div class="tf-form">${tfField(t('tfName'), `<input class="input" id="tfo-name" maxlength="40" value="${esc(o.name)}" placeholder="${esc(t('tfOncePh'))}">`)}${tfField(t('tfEmoji'), `<input class="input" id="tfo-emoji" maxlength="8" value="${esc(o.emoji)}">`)}
        ${tfField(t('tfStart'), `<input class="input" type="time" id="tfo-start" value="${esc(o.start)}">`)}${tfField(t('tfEnd'), `<input class="input" type="time" id="tfo-end" value="${esc(o.end)}">`)}
        ${tfField(t('tfOnceJob'), tfSel('id="tfo-job"', [['', t('tfOnceNoJob')], ...state.calJobs.map(j => [j.id, j.name])], o.jobId), true)}</div>
        <div class="field"><span>${esc(t('tfColor'))}</span><div class="swatches">${cols.map(c => `<button type="button" class="sw ${o.color === c ? 'on' : ''}" data-tfo-c="${c}" style="--c:${c}" aria-label="${c}"></button>`).join('')}<input type="color" class="swatch-input" id="tfo-color" value="${tfColor(o.color)}" aria-label="${esc(t('themeCustom'))}"></div></div></div>`,
      foot: `<button class="btn primary block" data-tfo="save">${ico('check')} ${esc(t('save'))}</button>`,
      onClick: (e, close, w) => {
        const c = e.target.closest('[data-tfo-c]');
        if (c) { o.color = c.dataset.tfoC; $$('[data-tfo-c]', w).forEach(x => x.classList.toggle('on', x === c)); $('#tfo-color', w).value = o.color; return; }
        if (!e.target.closest('[data-tfo="save"]')) return;
        const v = id => $('#' + id, w).value, name = v('tfo-name').trim();
        if (!name) { toast(t('tfNeedName')); return; }
        if (!!v('tfo-start') !== !!v('tfo-end')) { toast(t('tfBothTimes')); return; }
        const picked = v('tfo-color'); if (/^#[0-9a-fA-F]{6}$/.test(picked) && picked.toLowerCase() !== tfColor(o.color).toLowerCase()) o.color = picked;
        const once = { name: name.slice(0, 40), emoji: v('tfo-emoji').trim().slice(0, 8), color: tfColor(o.color), start: v('tfo-start'), end: v('tfo-end'), jobId: v('tfo-job') };
        const next = [...(state.calDays[k] || [])];
        if (cur) next[i] = { ...cur, once, start: '', end: '' };
        else { if (next.length >= TF.LIMITS.perDay) { toast(t('tfRtFull')); return; } next.push({ sid: 'o_' + uid(), once, note: '', start: '', end: '' }); }
        tfSetDay(k, next); tfSave(false); sfx('tap'); close(); after && after();
      }
    });
  }
  function tfOpenDay(k) {
    let wref;
    const draw = () => {
      if (state.calDays[k]) state.calDays[k] = tfSorted(state.calDays[k]);
      const list = state.calDays[k] || [], shown = tfShown();
      const comp = shown.map(f => ({ f, ids: f.days[k] || [] })).filter(c => c.ids.length), ext = tfData().ext.filter(e => e.date === k);
      const rts = [...new Set(list.map(e => e.rt).filter(Boolean))].map(id => state.calRoutines.find(r => r.id === id)).filter(Boolean);
      $('#tfd', wref).innerHTML = `<div class="stack" style="gap:12px">${list.length ? '' : `<p class="muted" style="margin:0">${esc(t('tfNoShifts'))}</p>`}
        ${rts.map(r => `<div class="tf-rt-box"><div class="row" style="justify-content:space-between;gap:8px">${tfRtTag(r, 'big')}<button class="btn sm" data-tfd-rtx="${esc(r.id)}">${ico('x')} ${esc(t('tfRtRemove'))}</button></div>
          <div class="tf-rt-comp">${list.filter(e => e.rt === r.id).map(e => { const s = tfShift(e.sid); if (!s) return ''; const tm = TF.entryTimes(s, e); return `<span class="tf-rt-row">${tfTag(s)}<span class="muted small">${tm.start ? esc(tm.start + '–' + tm.end) : esc(t('tfAllDay'))}</span></span>`; }).join('')}</div></div>`).join('')}
        ${list.map((e, i) => { const s = tfShift(e.sid); if (!s) return ''; const tm = TF.entryTimes(s, e); return `<div class="tf-entry" data-i="${i}"><div class="row" style="justify-content:space-between">${tfTag(s, 'big')}${s.once ? `<span class="muted small grow">${esc(t('tfOnce'))}</span><button class="icon-btn sm" data-tfd="once-edit" aria-label="${esc(t('edit'))}">${ico('edit')}</button>` : ''}<button class="icon-btn sm danger-text" data-tfd="del" aria-label="${esc(t('tfRemoveShift'))}">${ico('x')}</button></div>
          <div class="row" style="gap:8px"><input class="input grow" type="time" data-tfd-t="start" value="${esc(e.start || tm.start || '')}" aria-label="${esc(t('tfStart'))}"><input class="input grow" type="time" data-tfd-t="end" value="${esc(e.end || tm.end || '')}" aria-label="${esc(t('tfEnd'))}"><span class="muted small tf-hrs">${tfH(TF.entryHours(s, e))} h</span></div>
          <input class="input" type="text" data-tfd-note maxlength="${TF.LIMITS.note}" value="${esc(e.note || '')}" placeholder="${esc(t('tfNotePh'))}" aria-label="${esc(t('tfNote'))}"></div>`; }).join('')}
        <h3 class="section-title" style="margin:4px 0 0">${esc(t('tfDkTitle'))}</h3><div class="row wrap" style="gap:6px">${tfDayKinds().map(d => `<button class="tf-pal" data-tfd-dk="${esc(d.id)}" aria-pressed="${tfDkIds(k).includes(d.id)}">${tfDkTag(d, 'big')}</button>`).join('')}</div>
        <h3 class="section-title" style="margin:4px 0 0">${esc(t('tfAddShift'))}</h3><div class="row wrap" style="gap:6px">${state.calShifts.map(s => `<button class="tf-pal" data-tfd-add="${esc(s.id)}">${tfTag(s, 'big')}</button>`).join('')}<button class="chip" data-tfd="once-new">${ico('plus')} ${esc(t('tfOnceNew'))}</button></div>
        <h3 class="section-title" style="margin:4px 0 0">${ico('doc', 'xs')} ${esc(t('tfDayNote'))}</h3><textarea class="input" id="tfd-dnote" maxlength="${TF_NOTE_MAX}" rows="2" placeholder="${esc(t('tfDayNotePh'))}">${esc(tfDayNote(k))}</textarea>
        <h3 class="section-title" style="margin:4px 0 0">${ico('sparkle', 'xs')} ${esc(t('rateTitle'))}</h3>${rateRowHtml(k)}
        ${state.calRoutines.some(r => r.kind === 'day') ? `<h3 class="section-title" style="margin:4px 0 0">${esc(t('tfRtQuick'))}</h3><div class="tf-rt-quick">${state.calRoutines.filter(r => r.kind === 'day').map(r => `<button class="chip" data-tfd-rt="${esc(r.id)}">${ico('layers')} ${esc(r.name)}</button>`).join('')}</div>` : ''}
        ${comp.length ? `<h3 class="section-title" style="margin:4px 0 0">${esc(t('tfMates'))}</h3><div class="stack" style="gap:8px">${comp.map(({ f, ids }) => `<div class="tf-item"><b>${esc(f.name)}</b><div class="row wrap grow" style="gap:6px">${ids.map(id => { const s = f.shifts.find(x => x.id === id); return s ? tfTag(s) : ''; }).join('')}</div></div>`).join('')}</div>` : ''}
        ${ext.length ? `<h3 class="section-title" style="margin:4px 0 0">${esc(t('tfExtEvents'))}</h3><div class="stack" style="gap:8px">${ext.map(e => `<div class="tf-item">● ${esc(e.title)}</div>`).join('')}</div>` : ''}</div>`;
    };
    openModal({
      title: esc(tfLong(k)), body: '<div id="tfd"></div>', cls: 'tf-sheet',
      onMount: w => {
        wref = w; draw();
        w.addEventListener('input', e => { if (e.target.id === 'tfd-dnote') { tfSetDayNote(k, e.target.value); save(); } });
        w.addEventListener('change', e => {
          const row = e.target.closest('[data-i]'); if (!row) return;
          const list = [...(state.calDays[k] || [])], i = +row.dataset.i, en = list[i] && { ...list[i] }, s = en && tfShift(en.sid); if (!s) return;
          if (e.target.matches('[data-tfd-t]')) { const which = e.target.dataset.tfdT; en[which] = e.target.value === s[which] ? '' : e.target.value; list[i] = en; tfSetDay(k, list); tfSave(false); if (which === 'start') draw(); else $('.tf-hrs', row).textContent = tfH(TF.entryHours(s, en)) + ' h'; }
          if (e.target.matches('[data-tfd-note]')) { en.note = e.target.value.slice(0, TF.LIMITS.note); list[i] = en; tfSetDay(k, list); save(); }
        });
      },
      onClose: () => render(),
      onClick: e => {
        const dkb = e.target.closest('[data-tfd-dk]');
        if (dkb) { if (tfDkToggle(k, dkb.dataset.tfdDk)) { tfSave(false); sfx('tap'); } draw(); return; }
        const rb = e.target.closest('[data-drate]');
        if (rb) { setDayRate(k, +rb.dataset.drate); sfx('tap'); draw(); return; }
        if (e.target.closest('[data-tfd="once-new"]')) { tfOnceEditor(k, -1, draw); return; }
        const oe = e.target.closest('[data-tfd="once-edit"]');
        if (oe) { tfOnceEditor(k, +oe.closest('[data-i]').dataset.i, draw); return; }
        const rx = e.target.closest('[data-tfd-rtx]');
        if (rx) { tfSetDay(k, (state.calDays[k] || []).filter(x => x.rt !== rx.dataset.tfdRtx)); tfSave(false); draw(); return; }
        const rt = e.target.closest('[data-tfd-rt]');
        if (rt) { const r = state.calRoutines.find(x => x.id === rt.dataset.tfdRt); if (r) { const n = tfRunRoutine(r, { from: k, to: k, weekdays: [], overwrite: false }); tfSave(false); sfx('tap'); draw(); if (!n) toast(t('tfRtFull')); } return; }
        const add = e.target.closest('[data-tfd-add]');
        if (add) { const list = [...(state.calDays[k] || [])]; if (list.length >= TF.LIMITS.perDay) return; list.push({ sid: add.dataset.tfdAdd, note: '', start: '', end: '' }); tfSetDay(k, list); tfSave(false); sfx('tap'); draw(); return; }
        const del = e.target.closest('[data-tfd="del"]');
        if (del) { const list = [...(state.calDays[k] || [])]; list.splice(+del.closest('[data-i]').dataset.i, 1); tfSetDay(k, list); tfSave(false); draw(); }
      }
    });
  }

  /* ---------- Compartir (PDF del mes) y Compartidos (@nametag, solo ver) ---------- */
  const tfPdfLabels = () => ({ months: tfMonths(), dow: Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(state.lang, { weekday: 'short' }).format(new Date(2024, 0, 7 + i)).replace('.', '').toUpperCase()),
    shifts: t('tfPdfShifts'), more: t('tfPdfMore'), generated: t('tfPdfGenerated'), detail: t('tfPdfDetail'), heads: ['tfPdfDate', 'tfPdfShift', 'tfPdfTime', 'tfPdfBreak', 'tfHours', 'tfNote'].map(x => t(x)), total: t('tfPdfTotal'), locale: state.lang, file: t('tfPdfFile') });
  const tfFriendBy = tag => { const n = String(tag || '').trim().replace(/^@/, '').toLowerCase(); return (chatData.friends || []).find(f => f.status === 'accepted' && String(f.nametag || '').toLowerCase() === n); };
  /* v1.25: PDF del Calendario de fecha a fecha, con interruptores de lo que se ve (Turnos, Rutinas, Mostrar texto, Días,
     Notas, Valoraciones) y Detalle (una semana que no cabe se hace más alta, solo esa). La última elección se recuerda. */
  const TF_PDF_KEYS = ['shifts', 'routines', 'text', 'days', 'notes', 'rates', 'detail'];
  const tfPdfOpts = () => { const o = state.ui.calPdf && typeof state.ui.calPdf === 'object' ? state.ui.calPdf : {}; return Object.fromEntries(TF_PDF_KEYS.map(k => [k, o[k] !== false])); };
  function tfPdfMake(from, to, o) {
    const base = tfData(), days = {};
    for (const [k, list] of Object.entries(base.days)) {
      if (k < from || k > to) continue;
      const l = list.filter(e => e.rt ? o.routines : o.shifts);
      if (l.length) days[k] = l;
    }
    const notes = {}, rates = {};
    for (const [k, v] of Object.entries(state.calNotes)) if (k >= from && k <= to && typeof v === 'string' && v.trim()) notes[k] = v;
    for (const k of Object.keys(state.dayRate)) if (k >= from && k <= to) { const r = dayRateOf(k); if (r != null) rates[k] = r; }
    const used = new Map();
    const colors = k => { const ds = tfDksOf(k); ds.forEach(d => used.set(d.id, d)); return tfDayColors(k); };
    for (let k = from, i = 0; k <= to && i < 800; k = addDays(k, 1), i++) colors(k);
    const routines = Object.fromEntries(state.calRoutines.map(r => [r.id, r.name]));
    const X = { layers: { shifts: o.shifts || o.routines, text: o.text, days: o.days, notes: o.notes, rates: o.rates }, detail: o.detail, colors, notes, rates, routines, legend: [...used.values()].map(d => ({ name: tfDkName(d), color: tfColor(d.color) })) };
    return TFPDF.rangePdf({ ...base, days }, from, to, tfWs(), new Date(), tfPdfLabels(), X);
  }
  const tfPdfFormHtml = (from, to, o) => `<div class="stack" style="gap:10px"><div class="row" style="gap:8px"><label class="field grow"><span>${esc(t('tfPdfFrom'))}</span><input class="input" type="date" id="tfp-from" value="${esc(from)}"></label><label class="field grow"><span>${esc(t('tfPdfTo'))}</span><input class="input" type="date" id="tfp-to" value="${esc(to)}"></label></div>
    <div class="stack" style="gap:10px">${TF_PDF_KEYS.map(k => `<label class="row ${k === 'text' ? 'tf-ly-sub' : ''}" style="gap:12px"><span class="switch"><input type="checkbox" data-tfp="${k}" ${o[k] ? 'checked' : ''}><span></span></span><span class="grow"><b>${esc(t('tfPdfL_' + k))}</b>${k === 'detail' ? `<br><span class="muted small">${esc(t('tfPdfDetailHint'))}</span>` : ''}</span></label>`).join('')}</div></div>`;
  const tfPdfRead = w => { const o = {}; $$('[data-tfp]', w).forEach(i => { o[i.dataset.tfp] = i.checked; }); state.ui.calPdf = o; save(); let from = $('#tfp-from', w).value, to = $('#tfp-to', w).value; if (!from || !to) return null; if (to < from) [from, to] = [to, from]; if (diffDays(from, to) > 366) { toast(t('tfPdfTooLong')); return null; } return { from, to, o }; };
  // sendTo: id de un chat (desde el chat se envía ahí); sin él, descargar o enviar a un amigo por @nametag
  function tfOpenShare(sendTo = null, after = null) {
    const u = tfUi(), y = +u.ym.slice(0, 4), mo = +u.ym.slice(5, 7) - 1;
    const from0 = TF.iso(new Date(y, mo, 1)), to0 = TF.iso(new Date(y, mo + 1, 0));
    let wref;
    const draw = () => {
      const friends = (chatData.friends || []).filter(f => f.status === 'accepted');
      $('#tfs', wref).innerHTML = `<div class="stack" style="gap:12px">
        <h3 class="section-title" style="margin:0">${esc(t('tfPdfRange'))}</h3>
        ${tfPdfFormHtml(from0, to0, tfPdfOpts())}
        ${sendTo ? `<button class="btn primary block" data-tfs="here">${ico('send')} ${esc(t('tfPdfSendHere'))}</button>` : `<button class="btn calc-blue block" data-tfs="dl">${ico('download')} ${esc(t('tfPdfDownload'))}</button>
        <p class="muted small" style="margin:0">${esc(t('tfPdfPrint'))}</p>
        <h3 class="section-title" style="margin:6px 0 0">${esc(t('tfPdfSendTitle'))}</h3>
        ${!auth ? `<p class="muted small" style="margin:0">${esc(t('groupNeedLogin'))}</p>` : `<form class="row" id="tfs-f" style="gap:8px" autocomplete="off"><input class="input grow" id="tfs-tag" maxlength="33" placeholder="@nametag" aria-label="@nametag"><button class="btn" data-tfs="send">${ico('send')} ${esc(t('tfSend'))}</button></form>
          ${friends.length ? `<div class="row wrap" style="gap:6px">${friends.map(f => `<button class="chip" data-tfs-pick="${esc(f.nametag || '')}">${avatarHtml(f, 'xs')} @${esc(f.nametag || '')}</button>`).join('')}</div>` : chatData.friends ? `<p class="muted small" style="margin:0">${esc(t('chatNoFriends'))}</p>` : `<p class="muted small" style="margin:0">${esc(t('groupsLoading'))}</p>`}
          <p class="muted small" style="margin:0">${esc(t('tfPdfSendHint'))}</p>`}`}</div>`;
    };
    openModal({
      title: `${ico('share')} ${esc(t(sendTo ? 'chatShareCal' : 'tfShare'))}`, cls: 'tf-sheet', body: '<div id="tfs"></div>',
      onMount: w => { wref = w; draw(); if (auth && !sendTo) refreshChat(true).then(() => { if (wref.isConnected) { const keep = tfPdfRead(w); draw(); if (keep) { $('#tfp-from', w).value = keep.from; $('#tfp-to', w).value = keep.to; } } }); w.addEventListener('submit', e => { e.preventDefault(); $('[data-tfs="send"]', w)?.click(); }); },
      onClick: async (e, close, w) => {
        const p = e.target.closest('[data-tfs-pick]'); if (p) { $('#tfs-tag', w).value = '@' + p.dataset.tfsPick; return; }
        const b = e.target.closest('[data-tfs]'); if (!b) return;
        e.preventDefault();
        const sel = tfPdfRead(w); if (!sel) return;
        let r; try { r = tfPdfMake(sel.from, sel.to, sel.o); } catch (err) { toast(t('tfPdfError')); return; }
        if (b.dataset.tfs === 'dl') { downloadBlob(r.filename, new Blob([r.bytes], { type: 'application/pdf' })); sfx('pop'); toast(t('calcPdfSaved')); return; }
        let gid = sendTo, f = null;
        if (!gid) {
          const tag = $('#tfs-tag', w).value.trim();
          if (!/^@?[A-Za-z0-9_.-]{2,32}$/.test(tag)) { toast(t('tfBadTag')); return; }
          f = tfFriendBy(tag); if (!f) { toast(t('tfNotFriend', { tag: '@' + tag.replace(/^@/, '') })); return; }
        }
        b.disabled = true;
        try {
          if (!gid) gid = f.dm || await rpc('kg_dm_open', { p_user: f.user_id, p_display_name: myName() });
          await rpc('kg_post_media', { p_group: gid, p_kind: 'file', p_mime: 'application/pdf', p_data: bytesB64(r.bytes), p_meta: { name: r.filename } });
          sfx('pop'); toast(f ? t('tfPdfSent', { tag: '@' + (f.nametag || '') }) : t('calcPdfSent')); close(); after && after();
        } catch (err) { b.disabled = false; toast(chatErr(err)); }
      }
    });
  }
  function tfOpenShared() {
    let wref;
    const draw = () => {
      if (!wref || !wref.isConnected) return;
      const L = TFS.list, friends = (chatData.friends || []).filter(f => f.status === 'accepted'), mine = L ? L.mine : [], with_ = new Set(mine.map(x => x.to_user));
      const rest = friends.filter(f => !with_.has(f.user_id)), hide = state.calPrefs.hide || {};
      $('#tfsh', wref).innerHTML = !auth ? `<p class="muted">${esc(t('groupNeedLogin'))}</p>` : !L ? `<p class="muted">${esc(t('groupsLoading'))}</p>` : `<div class="stack" style="gap:14px">
        <section class="stack" style="gap:10px"><h3 class="section-title" style="margin:0">${esc(t('tfMine'))}</h3>
          ${mine.length ? `<div class="stack" style="gap:8px">${mine.map(x => `<div class="tf-item">${avatarHtml(x.peer || {}, 'sm')}<span class="grow">${esc(personName(x.peer))} <span class="muted small">@${esc((x.peer || {}).nametag || '')}</span></span><button class="chip sm danger-text" data-tfsh-stop="${esc(x.to_user)}">${esc(t('projStop'))}</button></div>`).join('')}</div>` : `<p class="muted small" style="margin:0">${esc(t('tfNotSharing'))}</p>`}
          <form class="row" id="tfsh-f" style="gap:8px" autocomplete="off"><input class="input grow" id="tfsh-tag" maxlength="33" placeholder="@nametag" aria-label="@nametag"><button class="btn calc-blue" data-tfsh="add">${ico('plus')} ${esc(t('tfShareWith'))}</button></form>
          ${rest.length ? `<div class="row wrap" style="gap:6px">${rest.map(f => `<button class="chip" data-tfsh-pick="${esc(f.nametag || '')}">${avatarHtml(f, 'xs')} @${esc(f.nametag || '')}</button>`).join('')}</div>` : ''}
          ${mine.length ? `<button class="chip sm" data-tfsh="pub">${ico('refresh')} ${esc(t('tfUpdateNow'))}</button>` : ''}
          <p class="muted small" style="margin:0">${esc(t('tfShareHint'))}</p></section>
        <section class="stack" style="gap:10px"><h3 class="section-title" style="margin:0">${esc(t('tfTheyShare'))}</h3>
          ${L.shared.length ? `<div class="stack" style="gap:8px">${L.shared.map(f => `<div class="tf-item">${avatarHtml(f.peer || {}, 'sm')}<span class="grow"><b>${esc(f.name)}</b><br><span class="muted small">${esc(t(hide[f.owner] ? 'tfHidden' : 'tfVisible'))}${f.updated ? ' · ' + esc(fmtDate(f.updated.slice(0, 10), { day: 'numeric', month: 'short' })) : ''}</span></span><label class="check tgl"><input type="checkbox" data-tfsh-show="${esc(f.owner)}" ${hide[f.owner] ? '' : 'checked'}><span>${esc(t('tfShow'))}</span></label></div>`).join('')}</div>` : `<p class="muted small" style="margin:0">${esc(t('tfNoneShared'))}</p>`}
          <button class="chip sm" data-tfsh="reload">${ico('refresh')} ${esc(t('tfReload'))}</button></section></div>`;
    };
    openModal({
      title: `${ico('users')} ${esc(t('tfShared'))}`, cls: 'tf-sheet', body: '<div id="tfsh"></div>',
      onMount: w => {
        wref = w; draw();
        if (auth) Promise.all([tfRefresh(true), refreshChat(true)]).then(draw);
        w.addEventListener('submit', e => { e.preventDefault(); $('[data-tfsh="add"]', w)?.click(); });
        w.addEventListener('change', e => {
          const c = e.target.closest('[data-tfsh-show]'); if (!c) return;
          state.calPrefs.hide = { ...(state.calPrefs.hide || {}) };
          if (c.checked) delete state.calPrefs.hide[c.dataset.tfshShow]; else state.calPrefs.hide[c.dataset.tfshShow] = true;
          save(); draw();
        });
      },
      onClose: () => render(),
      onClick: async (e, close, w) => {
        let el;
        if ((el = e.target.closest('[data-tfsh-pick]'))) { $('#tfsh-tag', w).value = '@' + el.dataset.tfshPick; return; }
        if ((el = e.target.closest('[data-tfsh-stop]'))) {
          el.disabled = true;
          try { await rpc('kg_cal_revoke', { p_to: el.dataset.tfshStop }); await tfRefresh(true); toast(t('projStopped')); draw(); } catch (err) { el.disabled = false; toast(chatErr(err)); }
          return;
        }
        const b = e.target.closest('[data-tfsh]'); if (!b) return;
        e.preventDefault();
        if (b.dataset.tfsh === 'reload') { b.disabled = true; await tfRefresh(true); draw(); return; }
        if (b.dataset.tfsh === 'pub') { b.disabled = true; try { await tfPublish(); toast(t('tfUpdated')); } catch (err) { toast(chatErr(err)); } b.disabled = false; return; }
        const tag = $('#tfsh-tag', w).value.trim();
        if (!/^@?[A-Za-z0-9_.-]{2,32}$/.test(tag)) { toast(t('tfBadTag')); return; }
        const f = tfFriendBy(tag); if (!f) { toast(t('tfNotFriend', { tag: '@' + tag.replace(/^@/, '') })); return; }
        b.disabled = true;
        try { await tfPublish(); await rpc('kg_cal_grant', { p_to: f.user_id }); await tfRefresh(true); sfx('pop'); toast(t('tfSharedWith', { tag: '@' + (f.nametag || '') })); draw(); }
        catch (err) { b.disabled = false; toast(chatErr(err)); }
      }
    });
  }

  /* ---------- Informes ---------- */
  const tfSub = title => `${topBar()}<div class="tf-top"><button class="icon-btn" data-tf-go="cal" aria-label="${esc(t('tfBack'))}" title="${esc(t('tfBack'))}">${ico('left')}</button><h1 class="page-title grow" style="margin:0">${esc(title)}</h1></div>`;
  function tfRepRange() {
    const r = TFS.rep, ws = tfWs(), ref = new Date(r.ref.getFullYear(), r.ref.getMonth(), r.ref.getDate());
    if (r.mode === 'week') { const a = TF.startOfWeek(ref, ws); return [TF.iso(a), TF.iso(TF.addDays(a, 6))]; }
    if (r.mode === 'month') return [TF.iso(new Date(ref.getFullYear(), ref.getMonth(), 1)), TF.iso(new Date(ref.getFullYear(), ref.getMonth() + 1, 0))];
    if (r.mode === 'year') return [ref.getFullYear() + '-01-01', ref.getFullYear() + '-12-31'];
    const a = r.from || TF.iso(ref), b = r.to || a; return a <= b ? [a, b] : [b, a];
  }
  function tfReports() {
    const r = TFS.rep, [from, to] = tfRepRange(), res = TF.report(tfData(), from, to, tfWs(), tfPaidKind, tfKindRate);
    const shortD = k => fmtDate(k, { day: 'numeric', month: 'short', year: 'numeric' });
    const byShift = Object.entries(res.byShift).map(([id, v]) => { const s = tfShift(id); return s ? `<tr><td>${tfTag(s)}</td><td>${v.count}</td><td>${tfH(v.hours)}</td><td>${money(v.pay)}</td></tr>` : ''; }).join('');
    const byKind = Object.entries(res.byKind).map(([k, v]) => `<tr><td>${esc(tfKind(k))}</td><td>${v.count}</td><td>${tfH(v.hours)}</td></tr>`).join('');
    const empty = `<p class="muted" style="margin:0">${esc(t('tfNoData'))}</p>`;
    return `${tfSub(t('tfReports'))}
      <div class="seg" role="group">${[['week', 'tfWeek'], ['month', 'tfMonth'], ['year', 'tfYear'], ['custom', 'tfCustom']].map(([v, k]) => `<button data-tf-rm="${v}" class="${r.mode === v ? 'on' : ''}">${esc(t(k))}</button>`).join('')}</div>
      <section class="clay card">${r.mode === 'custom' ? `<div class="tf-form"><label class="field"><span>${esc(t('from'))}</span><input class="input" type="date" data-tf-rf="from" value="${from}"></label><label class="field"><span>${esc(t('to'))}</span><input class="input" type="date" data-tf-rf="to" value="${to}"></label></div>`
        : `<div class="row" style="justify-content:space-between"><button class="icon-btn sm" data-tf="rprev" aria-label="${esc(t('tfPrev'))}">${ico('left')}</button><b>${esc(shortD(from))} – ${esc(shortD(to))}</b><button class="icon-btn sm" data-tf="rnext" aria-label="${esc(t('tfNext'))}">${ico('right')}</button></div>`}</section>
      <div class="tf-kpis ${privacyOn() ? 'priv' : ''}">${[['tfHours', tfH(res.hours)], ['tfShiftsN', String(res.count)], ['tfOt', tfH(res.otHours)], ['tfPay', money(res.pay)]].map(([k, v]) => `<div class="kpi clay"><span class="muted small">${esc(t(k))}</span><b>${v}</b></div>`).join('')}</div>
      <section class="clay card"><h3 class="section-title" style="margin-top:0">${esc(t('tfByShift'))}</h3>${byShift ? `<table class="tf-table"><tr><th>${esc(t('tfPdfShift'))}</th><th>${esc(t('tfNum'))}</th><th>${esc(t('tfHours'))}</th><th>${esc(t('tfPay'))}</th></tr>${byShift}</table>` : empty}</section>
      <section class="clay card"><h3 class="section-title" style="margin-top:0">${esc(t('tfByKind'))}</h3>${byKind ? `<table class="tf-table"><tr><th>${esc(t('tfKindCol'))}</th><th>${esc(t('tfNum'))}</th><th>${esc(t('tfHours'))}</th></tr>${byKind}</table>` : empty}</section>
      <p class="muted small">${esc(t('tfRepHint'))}</p>`;
  }

  /* ---------- Turnos y trabajos ---------- */
  function tfShiftsView() {
    const jobs = state.calJobs.map(j => `<div class="tf-item"><span class="tf-dot" style="--c:${tfColor(j.color)}"></span><span class="grow"><b>${esc(j.name)}</b><br><span class="muted small">${esc(j.paid === false ? t('tfCatUnpaid') : t('tfJobLine', { rate: money(j.rate), h: j.otWeekHours, plus: tfPlus(j.otMode, j.otPlus) }))}${j.specials.length ? ' · ' + esc((j.specials.length === 1 ? t('tfSpecials1') : t('tfSpecialsN', { n: j.specials.length }))) : ''}</span></span><button class="btn sm" data-tf-job="${esc(j.id)}">${esc(t('edit'))}</button></div>`).join('');
    const list = state.calShifts.map(s => { const h = TF.entryHours(s, {}); return `<div class="tf-item">${tfTag(s, 'big')}<span class="grow muted small">${esc(s.start ? s.start + '–' + s.end : tfKind(s.kind))}${h ? ' · ' + tfH(h) + ' h' : ''}</span><button class="btn sm" data-tf-shift="${esc(s.id)}">${esc(t('edit'))}</button></div>`; }).join('');
    return `${tfSub(t('tfShifts'))}
      <section class="clay card stack" style="gap:10px"><div class="row" style="justify-content:space-between"><h2 class="section-title" style="margin:0">${esc(t('tfTemplates'))}</h2><button class="icon-btn sm" data-tf-shift="" aria-label="${esc(t('tfNewShift'))}" title="${esc(t('tfNewShift'))}">${ico('plus')}</button></div><div class="stack" style="gap:8px">${list}</div></section>
      <section class="clay card stack ${privacyOn() ? 'priv' : ''}" style="gap:10px"><div class="row" style="justify-content:space-between"><h2 class="section-title" style="margin:0">${esc(t('tfJobs'))}</h2><button class="icon-btn sm" data-tf-job="" aria-label="${esc(t('tfNewJob'))}" title="${esc(t('tfNewJob'))}">${ico('plus')}</button></div><div class="stack" style="gap:8px">${jobs}</div></section>
      <section class="clay card stack" style="gap:10px"><div class="row" style="justify-content:space-between"><h2 class="section-title" style="margin:0">${esc(t('tfKinds'))}</h2><button class="icon-btn sm" data-tf-kind="" aria-label="${esc(t('tfNewKind'))}" title="${esc(t('tfNewKind'))}">${ico('plus')}</button></div><div class="stack" style="gap:8px">${tfKinds().map(k => `<div class="tf-item"><span class="grow"><b>${esc(tfKind(k.id))}</b><br><span class="muted small">${tfKindJob(k) ? `<span class="tf-dot sm" style="--c:${tfColor(tfKindJob(k).color)}"></span> ${esc(tfKindJob(k).name)} · ` : ''}${esc(t(k.paid ? 'tfKindPaid' : 'tfKindUnpaid'))}${k.paid && tfKindRate(k.id) ? ' (' + esc(tfKindRate(k.id).mode === 'fixed' ? (tfKindRate(k.id).v >= 0 ? '+' : '') + tfH(tfKindRate(k.id).v) + ' €/h' : (tfKindRate(k.id).v >= 0 ? '+' : '') + tfH(tfKindRate(k.id).v) + ' %') + ')' : ''} · ${esc((n => t(n === 1 ? 'tfKindUses1' : 'tfKindUses', { n }))(state.calShifts.filter(x => x.kind === k.id).length))}</span></span><button class="btn sm" data-tf-kind="${esc(k.id)}">${esc(t('edit'))}</button></div>`).join('')}</div></section>`;
  }
  /* v1.23: añadir, editar o borrar un tipo. «Cuenta para la paga» = se cobra con la tarifa de su categoría (si la categoría cobra).
     v1.24: el tipo va vinculado a una categoría (se puede abrir para editarla) y, si se cobra, con su misma tarifa,
     una diferencia fija (+X €/h) o porcentual (+X %). Al elegir el tipo en un turno, la categoría se pone sola. */
  function tfEditKind(id) {
    const ks = tfKinds(), k = ks.find(x => x.id === id), isNew = !k;
    const d = k ? { rateMode: 'same', rateV: 0, ...k } : { id: 'k_' + TF.uid().slice(0, 10), name: '', paid: false, jobId: (state.calJobs[0] || {}).id || '', rateMode: 'same', rateV: 0 };
    if (!d.jobId || !state.calJobs.some(j => j.id === d.jobId)) d.jobId = (state.calJobs.find(j => state.calShifts.some(s => s.kind === d.id && s.jobId === j.id)) || state.calJobs[0] || {}).id || '';
    if (!isNew && !d.name) d.name = tfKind(d.id);
    let wref;
    const read = () => { if (!wref) return; d.name = $('#tfk-name', wref).value; d.paid = $('#tfk-paid', wref).checked; d.jobId = $('#tfk-job', wref).value; const v = $('#tfk-rv', wref); if (v) d.rateV = v.value; };
    const draw = () => {
      const job = state.calJobs.find(j => j.id === d.jobId);
      $('#tfk', wref).innerHTML = `<div class="stack" style="gap:14px">${tfField(t('tfName'), `<input class="input" id="tfk-name" maxlength="40" value="${esc(d.name)}" placeholder="${esc(t('tfKindPh'))}">`)}
        <div class="field"><span>${esc(t('tfKindJob'))}</span><div class="row" style="gap:8px">${tfSel('id="tfk-job" style="flex:1"', state.calJobs.map(j => [j.id, j.name]), d.jobId)}<button class="btn sm" data-tfk="job" ${job ? '' : 'disabled'}>${ico('edit')} ${esc(t('tfKindEditJob'))}</button></div><p class="muted small" style="margin:0;text-transform:none;letter-spacing:0">${esc(t('tfKindJobHint'))}</p></div>
        <label class="row" style="gap:14px"><span class="switch"><input type="checkbox" id="tfk-paid" ${d.paid ? 'checked' : ''}><span></span></span><span class="grow"><b>${esc(t('tfKindPaidQ'))}</b><br><span class="muted small">${esc(t('tfKindPaidHint'))}</span></span></label>
        ${d.paid ? `<div class="tf-rect stack" style="gap:10px"><b class="small">${esc(t('tfKindRate'))}</b><div class="seg seg-sm" role="group">${[['same', 'tfKindSame'], ['fixed', 'tfKindFixed'], ['pct', 'tfKindPct']].map(([m, l]) => `<button type="button" data-tfk-m="${m}" class="${d.rateMode === m ? 'on' : ''}">${esc(t(l))}</button>`).join('')}</div>
          ${d.rateMode === 'same' ? `<span class="muted small">${esc(job ? (job.paid === false ? t('tfKindJobUnpaid', { job: job.name }) : t('tfKindSameHint', { job: job.name, rate: money(job.rate) })) : '')}</span>`
            : `${tfField(t(d.rateMode === 'fixed' ? 'tfKindFixedU' : 'tfKindPctU'), `<input class="input" type="number" id="tfk-rv" step="${d.rateMode === 'fixed' ? '0.1' : '1'}" min="${d.rateMode === 'fixed' ? -1000 : -100}" max="${d.rateMode === 'fixed' ? 1000 : 1000}" value="${esc(d.rateV)}">`)}
              ${job ? `<span class="muted small" id="tfk-res">${esc(t('tfKindResult', { job: job.name, rate: money(job.rate), res: money(d.rateMode === 'fixed' ? Math.max(0, job.rate + (+d.rateV || 0)) : Math.max(0, job.rate * (1 + (+d.rateV || 0) / 100))) }))}</span>` : ''}`}</div>` : ''}</div>`;
    };
    openModal({
      title: esc(t(isNew ? 'tfNewKind' : 'tfEditKind')), cls: 'tf-sheet', body: '<div id="tfk"></div>',
      foot: `${isNew || ks.length < 2 ? '' : `<button class="btn danger" data-tfk="del">${ico('trash')} ${esc(t('delete'))}</button>`}<button class="btn primary" data-tfk="save">${esc(t('save'))}</button>`,
      onMount: w => { wref = w; draw(); w.addEventListener('change', e => { if (['tfk-paid', 'tfk-job'].includes(e.target.id)) { read(); draw(); } }); w.addEventListener('input', e => { if (e.target.id !== 'tfk-rv') return; read(); const job = state.calJobs.find(j => j.id === d.jobId), r = $('#tfk-res', w); if (job && r) r.textContent = t('tfKindResult', { job: job.name, rate: money(job.rate), res: money(d.rateMode === 'fixed' ? Math.max(0, job.rate + (+d.rateV || 0)) : Math.max(0, job.rate * (1 + (+d.rateV || 0) / 100))) }); }); },
      onClick: async (e, close) => {
        let el;
        if ((el = e.target.closest('[data-tfk-m]'))) { read(); if (d.rateMode !== el.dataset.tfkM) { d.rateMode = el.dataset.tfkM; d.rateV = 0; } draw(); return; }
        const b = e.target.closest('[data-tfk]'); if (!b) return;
        if (b.dataset.tfk === 'job') { read(); const j = state.calJobs.find(x => x.id === d.jobId); if (j) tfEditJob(j, () => draw()); return; }
        if (b.dataset.tfk === 'del') {
          const rest = ks.filter(x => x.id !== d.id), to = rest.find(x => x.id === 'other') || rest[0], n = state.calShifts.filter(x => x.kind === d.id).length;
          if (!(await confirmDialog(n ? t('tfDelKindQn', { n, to: tfKind(to.id) }) : t('tfDelKindQ')))) return;
          state.calPrefs.kinds = rest; state.calShifts = state.calShifts.map(x => x.kind === d.id ? { ...x, kind: to.id } : x); close(); tfSave(); return;
        }
        read();
        const name = String(d.name).trim().slice(0, 40);
        if (!name) { toast(t('tfNeedName')); return; }
        if (isNew && ks.length >= 30) return;
        const rv = d.rateMode === 'fixed' ? clamp(+d.rateV || 0, -1000, 1000) : d.rateMode === 'pct' ? clamp(+d.rateV || 0, -100, 1000) : 0;
        const out = { id: d.id, name: !isNew && name === t('tfKind_' + d.id) ? '' : name, paid: d.paid, jobId: d.jobId, rateMode: d.paid ? d.rateMode : 'same', rateV: d.paid ? rv : 0 };
        const i = ks.findIndex(x => x.id === d.id); if (i >= 0) ks[i] = out; else ks.push(out);
        // Los turnos de este tipo pasan a su categoría vinculada
        if (out.jobId) state.calShifts = state.calShifts.map(x => x.kind === out.id && x.jobId !== out.jobId ? { ...x, jobId: out.jobId } : x);
        state.calPrefs.kinds = [...ks]; close(); tfSave(); toast(t('saved'));
      }
    });
  }
  /* ---------- Rutinas (v1.23): grupos de turnos de un día o una semana tipo ----------
     state.calRoutines → [{ id, name, kind: 'day'|'week', day: [{ sid, start, end }], week: { 0..6 (0 = lunes): [...] } }]
     Una hora vacía usa la del turno. Las plantillas crean los turnos que falten (los no pagados, con un tipo que no cobra). */
  const TF_RT_TPL = {
    office: { kind: 'day', day: [['office', '09:00', '14:00'], ['office', '15:00', '18:00']] },
    commute: { kind: 'day', day: [['commute', '08:00', '08:45'], ['office', '09:00', '17:00'], ['commute', '17:15', '18:00']] },
    study: { kind: 'day', day: [['gym', '07:30', '08:30'], ['study', '18:00', '20:00']] },
    officeWeek: { kind: 'week', week: { 0: [['office', '09:00', '17:00']], 1: [['office', '09:00', '17:00']], 2: [['office', '09:00', '17:00']], 3: [['office', '09:00', '17:00']], 4: [['office', '09:00', '15:00']], 5: [['off']], 6: [['off']] } },
    student: { kind: 'week', week: { 0: [['classes', '08:30', '14:30'], ['study', '17:00', '19:00']], 1: [['classes', '08:30', '14:30'], ['study', '17:00', '19:00']], 2: [['classes', '08:30', '14:30'], ['study', '17:00', '19:00']], 3: [['classes', '08:30', '14:30'], ['study', '17:00', '19:00']], 4: [['classes', '08:30', '14:30']], 5: [['movies', '18:00', '20:00']], 6: [] } },
  };
  // Turnos que usan las plantillas: [nombre (clave de texto), color, ¿se cobra?, inicio, fin]
  const TF_RT_SHIFTS = { office: ['#4f6bed', true, '09:00', '17:00'], commute: ['#8a94a6', false, '08:00', '08:45'], gym: ['#e5484d', false, '07:30', '08:30'], study: ['#7c5cff', false, '18:00', '20:00'], classes: ['#12a594', false, '08:30', '14:30'], movies: ['#f5a524', false, '18:00', '20:00'] };
  const tfWdNames = (len = 'short') => Array.from({ length: 7 }, (_, i) => { const s = new Intl.DateTimeFormat(state.lang, { weekday: len }).format(new Date(2024, 0, 1 + i)).replace('.', ''); return s.charAt(0).toUpperCase() + s.slice(1); });
  const tfRtCount = r => r.kind === 'week' ? Object.values(r.week || {}).reduce((a, l) => a + (l || []).length, 0) : (r.day || []).length;
  const tfRtLine = r => `${t(r.kind === 'week' ? 'tfRtWeek' : 'tfRtDay')} · ${t(tfRtCount(r) === 1 ? 'tfRtShifts1' : 'tfRtShiftsN', { n: tfRtCount(r) })}`;
  function tfRoutinesView() {
    const list = state.calRoutines.map(r => `<div class="tf-item"><span class="tf-rt-ic">${ico(r.kind === 'week' ? 'calendar' : 'layers')}</span><span class="grow"><b>${esc(r.name)}</b><br><span class="muted small">${esc(tfRtLine(r))}</span></span><button class="btn sm" data-tf-rt="edit" data-id="${esc(r.id)}">${esc(t('edit'))}</button><button class="btn sm primary" data-tf-rt="apply" data-id="${esc(r.id)}">${esc(t('tfRtApply'))}</button></div>`).join('');
    const tpl = Object.keys(TF_RT_TPL).map(k => `<div class="tf-item"><span class="tf-rt-ic">${ico(TF_RT_TPL[k].kind === 'week' ? 'calendar' : 'layers')}</span><span class="grow"><b>${esc(t('tfRtTpl_' + k))}</b><br><span class="muted small">${esc(t(TF_RT_TPL[k].kind === 'week' ? 'tfRtWeek' : 'tfRtDay'))} · ${esc(t('tfRtTplHint_' + k))}</span></span><button class="btn sm" data-tf-rt="tpl" data-id="${k}">${ico('plus')} ${esc(t('tfRtAdd'))}</button></div>`).join('');
    return `${tfSub(t('tfRoutines'))}
      <p class="muted small" style="margin:0">${esc(t('tfRtIntro'))}</p>
      <section class="clay card stack" style="gap:10px"><div class="row" style="justify-content:space-between"><h2 class="section-title" style="margin:0">${esc(t('tfRtMine'))}</h2><button class="icon-btn sm" data-tf-rt="new" aria-label="${esc(t('tfRtNew'))}" title="${esc(t('tfRtNew'))}">${ico('plus')}</button></div>
        ${list ? `<div class="stack" style="gap:8px">${list}</div>` : `<p class="muted small" style="margin:0">${esc(t('tfRtNone'))}</p>`}</section>
      <section class="clay card stack" style="gap:10px"><h2 class="section-title" style="margin:0">${esc(t('tfRtTemplates'))}</h2><div class="stack" style="gap:8px">${tpl}</div></section>`;
  }
  function tfRoutineAct(act, id) {
    const r = state.calRoutines.find(x => x.id === id);
    if (act === 'new') tfEditRoutine(null);
    else if (act === 'edit' && r) tfEditRoutine(r);
    else if (act === 'apply' && r) tfApplyRoutine(r);
    else if (act === 'tpl') tfAddTemplate(id);
  }
  // Busca un turno con ese nombre o lo crea (con un tipo que cobra o no, según la plantilla)
  function tfShiftFor(key) {
    if (key === 'off') { const s = tfShift('s_lib') || state.calShifts.find(x => x.kind === 'off'); if (s) return s.id; }
    const name = t('tfRtS_' + key), low = name.toLowerCase(), have = state.calShifts.find(x => String(x.name).trim().toLowerCase() === low);
    if (have) return have.id;
    if (state.calShifts.length >= TF.LIMITS.shifts) return null;
    const [color, paid, start, end] = TF_RT_SHIFTS[key] || ['#8a94a6', false, '', ''], ks = tfKinds();
    const kind = key === 'off' ? 'off' : paid ? (ks.find(k => k.id === 'work' && k.paid) || ks.find(k => k.paid) || { id: 'work' }).id : (ks.find(k => k.id === 'other') || ks.find(k => !k.paid) || { id: 'other' }).id;
    let job = state.calJobs.find(j => paid ? j.paid !== false : j.paid === false);
    if (!job && !paid && state.calJobs.length < TF.LIMITS.jobs) { job = { id: TF.uid(), name: t('tfRtPersonal'), color: '#8a94a6', paid: false, rate: 0, otWeekHours: 0, otMode: 'mult', otPlus: 1.5, specials: [] }; state.calJobs.push(job); }
    const s = { id: TF.uid(), jobId: (job || state.calJobs[0]).id, name, emoji: '', color, kind, start: start || '', end: end || '', breakMin: 0, diffPct: 0, alarmMin: 0 };
    state.calShifts.push(s); return s.id;
  }
  function tfAddTemplate(key) {
    const T = TF_RT_TPL[key]; if (!T) return;
    if (state.calRoutines.length >= 40) { toast(t('tfRtMax', { n: 40 })); return; }
    const ent = l => (l || []).map(([k, a, b]) => { const sid = tfShiftFor(k), s = sid && tfShift(sid); return s ? { sid, start: a && a !== s.start ? a : '', end: b && b !== s.end ? b : '' } : null; }).filter(Boolean);
    const r = { id: TF.uid(), name: t('tfRtTpl_' + key), kind: T.kind, day: T.kind === 'day' ? ent(T.day) : [], week: {} };
    if (T.kind === 'week') for (let i = 0; i < 7; i++) r.week[i] = ent(T.week[i]);
    if (!gate('routines')) return;
    state.calRoutines.push(r); tfSave(); toast(t('tfRtAdded'));
    tfEditRoutine(r);
  }
  function tfEditRoutine(r0) {
    const isNew = !r0, d = r0 ? JSON.parse(JSON.stringify(r0)) : { id: TF.uid(), name: '', kind: 'day', day: [], week: {} };
    for (let i = 0; i < 7; i++) if (!Array.isArray(d.week[i])) d.week[i] = [];
    let wref, wd = 0;
    const guard = unsavedGuard(() => { if (wref && $('#tfr-name', wref)) d.name = $('#tfr-name', wref).value; return JSON.stringify(d); });
    const cur = () => d.kind === 'week' ? d.week[wd] : d.day;
    const draw = () => {
      const W = tfWdNames(), list = cur();
      $('#tfr', wref).innerHTML = `<div class="stack" style="gap:12px">${tfField(t('tfName'), `<input class="input" id="tfr-name" maxlength="60" value="${esc(d.name)}" placeholder="${esc(t('tfRtNamePh'))}">`, true)}
        <div class="seg" role="group">${[['day', 'tfRtDay'], ['week', 'tfRtWeek']].map(([v, k]) => `<button type="button" data-tfr-kind="${v}" class="${d.kind === v ? 'on' : ''}">${esc(t(k))}</button>`).join('')}</div>
        <p class="muted small" style="margin:0">${esc(t(d.kind === 'week' ? 'tfRtWeekHint' : 'tfRtDayHint'))}</p>
        ${d.kind === 'week' ? `<div class="seg seg-sm tf-rt-wd" role="group">${W.map((n, i) => `<button type="button" data-tfr-wd="${i}" class="${wd === i ? 'on' : ''}">${esc(n)}${d.week[i].length ? ` <span class="badge-n">${d.week[i].length}</span>` : ''}</button>`).join('')}</div>` : ''}
        ${list.length ? '' : `<p class="muted" style="margin:0">${esc(t('tfNoShifts'))}</p>`}
        ${list.map((e, i) => { const s = tfShift(e.sid); if (!s) return ''; return `<div class="tf-entry" data-i="${i}"><div class="row" style="justify-content:space-between">${tfTag(s, 'big')}<button type="button" class="icon-btn sm danger-text" data-tfr="del" aria-label="${esc(t('tfRemoveShift'))}">${ico('x')}</button></div>
          <div class="row" style="gap:8px"><input class="input grow" type="time" data-tfr-t="start" value="${esc(e.start || s.start || '')}" aria-label="${esc(t('tfStart'))}"><input class="input grow" type="time" data-tfr-t="end" value="${esc(e.end || s.end || '')}" aria-label="${esc(t('tfEnd'))}"></div></div>`; }).join('')}
        <h3 class="section-title" style="margin:4px 0 0">${esc(t('tfAddShift'))}</h3><div class="row wrap" style="gap:6px">${state.calShifts.map(s => `<button type="button" class="tf-pal" data-tfr-add="${esc(s.id)}">${tfTag(s, 'big')}</button>`).join('')}</div>
        ${d.kind === 'week' && list.length ? `<div class="row wrap" style="gap:6px"><button type="button" class="chip sm" data-tfr="copy-wk">${ico('copy')} ${esc(t('tfRtCopyWk'))}</button><button type="button" class="chip sm" data-tfr="copy-all">${ico('copy')} ${esc(t('tfRtCopyAll'))}</button></div>` : ''}</div>`;
    };
    const sortCur = () => { const l = cur(); const sorted = tfSorted(l.map(e => ({ ...e }))); l.splice(0, l.length, ...sorted); };
    const doSave = close => {
      const name = $('#tfr-name', wref).value.trim().slice(0, 60);
      if (!name) { toast(t('tfNeedName')); return false; }
      if (!tfRtCount(d)) { toast(t('tfRtNeedShift')); return false; }
      if (isNew && state.calRoutines.length >= 40) { toast(t('tfRtMax', { n: 40 })); return false; }
      if (!gate('routines')) return false;
      const out = { id: d.id, name, kind: d.kind, day: d.kind === 'day' ? d.day : [], week: d.kind === 'week' ? d.week : {} };
      const i = state.calRoutines.findIndex(x => x.id === d.id); if (i >= 0) state.calRoutines[i] = out; else state.calRoutines.push(out);
      close(); tfSave(); toast(t('saved')); return true;
    };
    openModal({
      title: esc(t(isNew ? 'tfRtNew' : 'tfRtEdit')), cls: 'tf-sheet', body: '<div id="tfr"></div>',
      foot: `${isNew ? '' : `<button class="btn danger" data-tfr="remove">${ico('trash')} ${esc(t('delete'))}</button>`}<button class="btn primary" data-tfr="save" data-m="save">${esc(t('save'))}</button>`,
      beforeClose: w => guard.check(w),
      onMount: w => {
        wref = w; draw(); guard.start();
        w.addEventListener('change', e => {
          const row = e.target.closest('[data-i]'); if (!row || !e.target.matches('[data-tfr-t]')) return;
          const en = cur()[+row.dataset.i], s = en && tfShift(en.sid); if (!s) return;
          const which = e.target.dataset.tfrT; en[which] = e.target.value === s[which] ? '' : e.target.value;
          if (which === 'start') { sortCur(); draw(); }
        });
        w.addEventListener('input', e => { if (e.target.id === 'tfr-name') d.name = e.target.value; });
      },
      onClick: async (e, close) => {
        let el;
        if ((el = e.target.closest('[data-tfr-kind]'))) { d.name = $('#tfr-name', wref).value; d.kind = el.dataset.tfrKind; draw(); return; }
        if ((el = e.target.closest('[data-tfr-wd]'))) { d.name = $('#tfr-name', wref).value; wd = +el.dataset.tfrWd; draw(); return; }
        if ((el = e.target.closest('[data-tfr-add]'))) { const l = cur(); if (l.length >= TF.LIMITS.perDay) return; d.name = $('#tfr-name', wref).value; l.push({ sid: el.dataset.tfrAdd, start: '', end: '' }); sortCur(); sfx('tap'); draw(); return; }
        const b = e.target.closest('[data-tfr]'); if (!b) return;
        const a = b.dataset.tfr;
        if (a === 'del') { d.name = $('#tfr-name', wref).value; cur().splice(+b.closest('[data-i]').dataset.i, 1); draw(); return; }
        if (a === 'copy-wk' || a === 'copy-all') { d.name = $('#tfr-name', wref).value; const src = d.week[wd]; for (let i = 0; i < 7; i++) if (i !== wd && (a === 'copy-all' || i < 5)) d.week[i] = src.map(x => ({ ...x })); draw(); toast(t('tfRtCopied')); return; }
        if (a === 'remove') { if (!(await confirmDialog(t('tfRtDelQ', { name: d.name || r0.name })))) return; state.calRoutines = state.calRoutines.filter(x => x.id !== d.id); close(); tfSave(); return; }
        if (a === 'save') doSave(close);
      }
    });
  }
  // Aplicar una rutina entre dos fechas (las de un día, solo los días de la semana elegidos)
  function tfApplyRoutine(r, from0) {
    const today = from0 || todayKey(), st = { from: today, to: from0 || TF.iso(TF.addDays(TF.parseISO(today), r.kind === 'week' ? 27 : 0)), wds: [], overwrite: false };
    let wref;
    const draw = () => {
      const W = tfWdNames();
      $('#tfa', wref).innerHTML = `<div class="stack" style="gap:12px"><p class="muted small" style="margin:0">${esc(tfRtLine(r))}</p>
        <div class="tf-form">${tfField(t('from'), `<input class="input" type="date" data-tfa-f="from" value="${st.from}">`)}${tfField(t('to'), `<input class="input" type="date" data-tfa-f="to" value="${st.to}">`)}</div>
        ${r.kind === 'day' ? `<div class="stack" style="gap:6px"><span class="muted small">${esc(t('tfRtOnDays'))}</span><div class="seg seg-sm" role="group">${W.map((n, i) => `<button type="button" data-tfa-wd="${i}" class="${st.wds.includes(i) ? 'on' : ''}">${esc(n)}</button>`).join('')}</div><span class="muted small">${esc(t(st.wds.length ? 'tfRtSomeDays' : 'tfRtAllDays'))}</span></div>` : ''}
        <label class="row" style="gap:14px"><span class="switch"><input type="checkbox" data-tfa-ow ${st.overwrite ? 'checked' : ''}><span></span></span><span class="grow"><b>${esc(t('tfRtOverwrite'))}</b><br><span class="muted small">${esc(t('tfRtOverwriteHint'))}</span></span></label></div>`;
    };
    openModal({
      title: `${ico('layers')} ${esc(t('tfRtApplyT', { name: r.name }))}`, cls: 'tf-sheet', body: '<div id="tfa"></div>',
      foot: `<button class="btn primary" data-tfa="go">${esc(t('tfRtApply'))}</button>`,
      onMount: w => {
        wref = w; draw();
        w.addEventListener('change', e => { if (e.target.matches('[data-tfa-f]')) st[e.target.dataset.tfaF] = e.target.value; if (e.target.matches('[data-tfa-ow]')) st.overwrite = e.target.checked; });
      },
      onClick: (e, close) => {
        const wdb = e.target.closest('[data-tfa-wd]');
        if (wdb) { const i = +wdb.dataset.tfaWd; st.wds = st.wds.includes(i) ? st.wds.filter(x => x !== i) : [...st.wds, i]; draw(); return; }
        if (!e.target.closest('[data-tfa="go"]')) return;
        if (!st.from || !st.to) { toast(t('woBadDate')); return; }
        const [a, b] = st.from <= st.to ? [st.from, st.to] : [st.to, st.from];
        if ((TF.parseISO(b) - TF.parseISO(a)) / 864e5 > 730) { toast(t('tfRtTooLong')); return; }
        const n = tfRunRoutine(r, { from: a, to: b, weekdays: st.wds, overwrite: st.overwrite });
        close(); tfSave(); sfx('pop'); toast(t('tfRtApplied', { n }));
      }
    });
  }
  function tfRunRoutine(r, opts) {
    const data = { shifts: state.calShifts, days: {} }, before = JSON.stringify(state.calDays);
    for (const [k, v] of Object.entries(state.calDays)) data.days[k] = v.map(e => ({ ...e }));
    const n = TF.applyRoutine(data, r, opts);
    for (const [k, v] of Object.entries(data.days)) if (JSON.stringify(v) !== JSON.stringify(state.calDays[k] || [])) tfSetDay(k, v);
    return before === JSON.stringify(state.calDays) ? 0 : n;
  }
  const tfField = (label, input, full) => `<label class="field ${full ? 'full' : ''}"><span>${esc(label)}</span>${input}</label>`;
  const tfSel = (attr, opts, val) => `<select class="input" ${attr}>${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  function tfEditShift(s) {
    const isNew = !s, d = s ? { ...s } : { id: TF.uid(), jobId: state.calJobs[0].id, name: '', emoji: '', color: '#4f6bed', kind: 'work', start: '09:00', end: '17:00', breakMin: 0, diffPct: 0, alarmMin: 0 };
    openModal({
      title: esc(t(isNew ? 'tfNewShift' : 'tfEditShift')), cls: 'tf-sheet',
      body: `<div class="tf-form">${tfField(t('tfName'), `<input class="input" id="tfe-name" maxlength="100" value="${esc(d.name)}">`)}${tfField(t('tfEmoji'), `<input class="input" id="tfe-emoji" maxlength="8" value="${esc(d.emoji)}">`)}
        ${tfField(t('tfColor'), `<input class="tf-swatch" type="color" id="tfe-color" value="${tfColor(d.color)}" aria-label="${esc(t('tfColor'))}">`)}${tfField(t('tfKindCol'), tfSel('id="tfe-kind"', [...tfKinds().map(k => [k.id, tfKind(k.id)]), ...(tfKinds().some(k => k.id === d.kind) ? [] : [[d.kind, tfKind(d.kind)]])], d.kind))}
        ${tfField(t('tfJob'), tfSel('id="tfe-job"', state.calJobs.map(j => [j.id, j.name]), d.jobId), true)}
        ${tfField(t('tfStart'), `<input class="input" type="time" id="tfe-start" value="${esc(d.start)}">`)}${tfField(t('tfEnd'), `<input class="input" type="time" id="tfe-end" value="${esc(d.end)}">`)}
        ${tfField(t('tfBreak'), `<input class="input" type="number" id="tfe-brk" min="0" max="720" value="${d.breakMin}">`)}${tfField(t('tfDiff'), `<input class="input" type="number" id="tfe-diff" min="-100" max="1000" step="1" value="${d.diffPct}">`)}
        ${tfField(t('tfAlarm'), `<input class="input" type="number" id="tfe-alarm" min="0" max="1440" value="${d.alarmMin}">`, true)}</div>`,
      foot: `${isNew ? '' : `<button class="btn danger" data-tfe="del">${ico('trash')} ${esc(t('delete'))}</button>`}<button class="btn primary" data-tfe="save">${esc(t('save'))}</button>`,
      // v1.24: al elegir el tipo, la categoría vinculada se pone sola
      onMount: w => w.addEventListener('change', e => { if (e.target.id !== 'tfe-kind') return; const j = tfKindJob(tfKinds().find(x => x.id === e.target.value)); if (j) $('#tfe-job', w).value = j.id; }),
      onClick: async (e, close, w) => {
        const b = e.target.closest('[data-tfe]'); if (!b) return;
        if (b.dataset.tfe === 'del') {
          if (!(await confirmDialog(t('tfDelShiftQ', { name: d.name })))) return;
          state.calShifts = state.calShifts.filter(x => x.id !== d.id);
          for (const k of Object.keys(state.calDays)) { const l = state.calDays[k].filter(x => x.sid !== d.id); if (l.length !== state.calDays[k].length) tfSetDay(k, l); }
          close(); tfSave(); return;
        }
        const v = id => $('#' + id, w).value, name = v('tfe-name').trim();
        if (!name) { toast(t('tfNeedName')); return; }
        if (!!v('tfe-start') !== !!v('tfe-end')) { toast(t('tfBothTimes')); return; }
        if (isNew && state.calShifts.length >= TF.LIMITS.shifts) { toast(t('tfMaxShifts', { n: TF.LIMITS.shifts })); return; }
        Object.assign(d, { name: name.slice(0, 100), emoji: v('tfe-emoji').trim().slice(0, 8), color: tfColor(v('tfe-color')), kind: v('tfe-kind'), jobId: v('tfe-job'), start: v('tfe-start'), end: v('tfe-end'),
          breakMin: clamp(+v('tfe-brk') || 0, 0, 720), diffPct: clamp(+v('tfe-diff') || 0, -100, 1000), alarmMin: clamp(+v('tfe-alarm') || 0, 0, 1440) });
        const i = state.calShifts.findIndex(x => x.id === d.id); if (i >= 0) state.calShifts[i] = d; else state.calShifts.push(d);
        close(); tfSave(); toast(t('saved'));
      }
    });
  }
  const tfClampPlus = (mode, v, def) => { v = +v; if (!Number.isFinite(v)) v = def; return mode === 'fixed' ? clamp(v, 0, 1000) : clamp(v, 1, 10); };
  function tfEditJob(j, after) {
    const isNew = !j, d = j ? JSON.parse(JSON.stringify(j)) : { id: TF.uid(), name: '', color: '#4f6bed', rate: 0, otWeekHours: 0, otMode: 'mult', otPlus: 1.5, specials: [] };
    let wref;
    // «Plus»: multiplicador o cantidad fija en €/hora
    const plusHtml = (key, mode, v, label) => `<div class="stack" style="gap:8px">${tfField(label + ' ' + t(mode === 'fixed' ? 'tfPlusFixedU' : 'tfPlusMultU'), `<input class="input" type="number" data-tfj-v="${key}" min="${mode === 'fixed' ? 0 : 1}" max="${mode === 'fixed' ? 1000 : 10}" step="${mode === 'fixed' ? '0.1' : '0.05'}" value="${esc(v)}">`)}
      <div class="seg seg-sm" role="group">${[['mult', 'tfPlusMult'], ['fixed', 'tfPlusFixed']].map(([m, k]) => `<button type="button" data-tfj-m="${key}" data-v="${m}" class="${mode === m ? 'on' : ''}">${esc(t(k))}</button>`).join('')}</div></div>`;
    const read = () => {
      if (!wref) return;
      d.name = $('#tfj-name', wref).value; d.color = $('#tfj-color', wref).value; d.paid = $('#tfj-paid', wref).checked;
      if ($('#tfj-rate', wref)) { d.rate = $('#tfj-rate', wref).value; d.otWeekHours = $('#tfj-ot', wref).value; }
      $$('[data-tfj-v]', wref).forEach(x => { const k = x.dataset.tfjV; if (k === 'ot') d.otPlus = x.value; else d.specials[+k].plus = x.value; });
      $$('[data-tfj-sp]', wref).forEach(x => { const [i, f] = x.dataset.tfjSp.split(':'); d.specials[+i][f] = x.value; });
    };
    const draw = () => {
      const linked = tfKinds().filter(k => k.jobId === d.id);
      $('#tfj', wref).innerHTML = `<div class="stack" style="gap:12px">${linked.length ? `<p class="muted small" style="margin:0">${esc(t('tfJobKinds', { list: linked.map(k => tfKind(k.id)).join(', ') }))}</p>` : ''}<div class="tf-form">${tfField(t('tfName'), `<input class="input" id="tfj-name" maxlength="100" value="${esc(d.name)}">`)}${tfField(t('tfColor'), `<input class="tf-swatch" type="color" id="tfj-color" value="${tfColor(d.color)}" aria-label="${esc(t('tfColor'))}">`)}
          </div><label class="row" style="gap:14px"><span class="switch"><input type="checkbox" id="tfj-paid" ${d.paid !== false ? 'checked' : ''}><span></span></span><span class="grow"><b>${esc(t('tfCatPaidQ'))}</b><br><span class="muted small">${esc(t('tfCatPaidHint'))}</span></span></label>
        ${d.paid === false ? '' : `<div class="tf-form">${tfField(t('tfRate'), `<input class="input" type="number" id="tfj-rate" min="0" step="0.01" value="${esc(d.rate)}">`)}${tfField(t('tfOtAfter'), `<input class="input" type="number" id="tfj-ot" min="0" max="168" value="${esc(d.otWeekHours)}">`)}</div>
        ${plusHtml('ot', d.otMode, d.otPlus, t('tfOtPlus'))}
        <div class="row" style="justify-content:space-between"><h3 class="section-title" style="margin:0">${esc(t('tfSpecials'))}</h3><button class="icon-btn sm" data-tfj="add-sp" aria-label="${esc(t('tfAddSpecial'))}" title="${esc(t('tfAddSpecial'))}">${ico('plus')}</button></div>
        ${d.specials.map((sp, i) => `<div class="tf-special"><button class="icon-btn sm danger-text tf-del" data-tfj-del="${i}" aria-label="${esc(t('tfDelSpecial'))}">${ico('x')}</button>
          <div class="tf-rect stack" style="gap:10px">${tfField(t('tfSpRate'), `<input class="input" type="number" data-tfj-sp="${i}:rate" min="0" step="0.01" value="${esc(sp.rate)}">`)}${plusHtml(String(i), sp.mode, sp.plus, t('tfSpPlus'))}</div>
          <div class="tf-rect"><div class="tf-form">${tfField(t('tfSpFrom'), `<input class="input" type="time" data-tfj-sp="${i}:from" value="${esc(sp.from)}">`)}${tfField(t('tfSpTo'), `<input class="input" type="time" data-tfj-sp="${i}:to" value="${esc(sp.to)}">`)}</div></div></div>`).join('')}
        ${d.specials.length ? `<p class="muted small" style="margin:0">${esc(t('tfSpHint'))}</p>` : ''}`}</div>`;
    };
    openModal({
      title: esc(t(isNew ? 'tfNewJob' : 'tfEditJob')), cls: 'tf-sheet', body: '<div id="tfj"></div>',
      foot: `${isNew || state.calJobs.length < 2 ? '' : `<button class="btn danger" data-tfj="del">${ico('trash')} ${esc(t('delete'))}</button>`}<button class="btn primary" data-tfj="save">${esc(t('save'))}</button>`,
      onMount: w => { wref = w; draw(); w.addEventListener('change', e => { if (e.target.id === 'tfj-paid') { read(); draw(); } }); },
      onClick: async (e, close) => {
        let el;
        if ((el = e.target.closest('[data-tfj-m]'))) { read(); const k = el.dataset.tfjM, m = el.dataset.v, o = k === 'ot' ? null : d.specials[+k]; if (k === 'ot') { if (d.otMode !== m) { d.otMode = m; d.otPlus = m === 'mult' ? 1.5 : 0; } } else if (o.mode !== m) { o.mode = m; o.plus = m === 'mult' ? 1 : 0; } draw(); return; }
        if ((el = e.target.closest('[data-tfj-del]'))) { read(); d.specials.splice(+el.dataset.tfjDel, 1); draw(); return; }
        const b = e.target.closest('[data-tfj]'); if (!b) return;
        if (b.dataset.tfj === 'add-sp') { read(); if (d.specials.length >= TF.LIMITS.specials) { toast(t('tfMaxSpecials', { n: TF.LIMITS.specials })); return; } d.specials.push({ rate: 0, from: '22:00', to: '06:00', mode: 'mult', plus: 1 }); draw(); return; }
        if (b.dataset.tfj === 'del') {
          if (!(await confirmDialog(t('tfDelJobQ')))) return;
          state.calJobs = state.calJobs.filter(x => x.id !== d.id); state.calShifts = state.calShifts.map(s => s.jobId === d.id ? { ...s, jobId: state.calJobs[0].id } : s); close(); tfSave(); return;
        }
        read();
        if (!String(d.name).trim()) { toast(t('tfNeedName')); return; }
        if (isNew && state.calJobs.length >= TF.LIMITS.jobs) { toast(t('tfMaxJobs', { n: TF.LIMITS.jobs })); return; }
        const out = { id: d.id, name: String(d.name).trim().slice(0, 100), color: tfColor(d.color), paid: d.paid !== false, rate: Math.max(0, +d.rate || 0), otWeekHours: clamp(+d.otWeekHours || 0, 0, 168), otMode: d.otMode, otPlus: tfClampPlus(d.otMode, d.otPlus, 1.5),
          specials: d.specials.map(sp => ({ rate: Math.max(0, +sp.rate || 0), from: sp.from || '22:00', to: sp.to || '06:00', mode: sp.mode === 'fixed' ? 'fixed' : 'mult', plus: tfClampPlus(sp.mode, sp.plus, 1) })) };
        const i = state.calJobs.findIndex(x => x.id === d.id); if (i >= 0) state.calJobs[i] = out; else state.calJobs.push(out);
        close(); tfSave(); toast(t('saved')); if (after) after();
      }
    });
  }

  /* ---------- Rotaciones ---------- */
  const tfPatName = k => t('tfPat_' + k);
  function tfRotView() {
    const R = TFS.rot, custom = R.key === 'custom';
    if (!R.start) R.start = todayKey();
    let cycle = '', err = '';
    try { cycle = TF.parsePattern(custom ? R.custom : TF.PATTERNS[R.key].cycle); } catch (e) { err = t('tfPatErr'); }
    const slots = cycle ? TF.patternSlots(cycle) : [];
    // Cada letra empieza con el turno que encaja con su nombre (Mañana, Tarde, Noche) o con el siguiente turno de trabajo
    const works = state.calShifts.filter(s => s.kind === 'work'), BY = { 'Mañana': 's_man', 'Día': 's_man', 'Tarde': 's_tar', 'Noche': 's_noc' };
    slots.forEach((sl, i) => { if (!R.map[sl] || !tfShift(R.map[sl])) { const want = custom ? '' : BY[TF.PATTERNS[R.key].slots[sl]]; R.map[sl] = (tfShift(want) || works[i % (works.length || 1)] || state.calShifts[0] || {}).id; } });
    let prev = '';
    if (cycle) for (let i = 0; i < Math.min(cycle.length, 28); i++) {
      const ch = cycle[(i + (R.offset - 1 + cycle.length * 1000)) % cycle.length], s = ch === '-' ? null : tfShift(R.map[ch]);
      prev += s ? tfTag(s, '', String(i + 1)) : `<span class="tf-tag off">${i + 1}</span>`;
    }
    const slotName = sl => custom ? '' : ` (${t('tfSlot_' + (TF.PATTERNS[R.key].slots[sl] || ''))})`;
    return `${tfSub(t('tfRotations'))}
      <section class="clay card stack" style="gap:12px"><p class="muted" style="margin:0">${esc(t('tfRotIntro'))}</p>
        <div class="tf-form">${tfField(t('tfPattern'), tfSel('data-tf-r="key"', [...Object.keys(TF.PATTERNS).map(k => [k, tfPatName(k)]), ['custom', t('tfPatCustom')]], R.key), true)}
          ${custom ? tfField(t('tfPatCustomL'), `<input class="input" data-tf-r="custom" maxlength="120" value="${esc(R.custom)}">`, true) : ''}
          ${slots.map(sl => tfField(t('tfLetter', { l: sl }) + slotName(sl), tfSel(`data-tf-rmap="${sl}"`, state.calShifts.map(s => [s.id, ((s.emoji || '') + ' ' + s.name).trim()]), R.map[sl]))).join('')}
          ${tfField(t('tfRotStart'), `<input class="input" type="date" data-tf-r="start" value="${esc(R.start)}">`)}
          ${tfField(t('tfRotOffset'), `<input class="input" type="number" data-tf-r="offset" min="1" max="120" value="${R.offset}">`)}
          ${tfField(t('tfRotDays'), tfSel('data-tf-r="days"', [[30, t('tfDur1m')], [90, t('tfDur3m')], [180, t('tfDur6m')], [365, t('tfDur1y')], [730, t('tfDur2y')]], R.days), true)}</div>
        <label class="check tgl tgl-block"><input type="checkbox" data-tf-r="overwrite" ${R.overwrite ? 'checked' : ''}><span>${esc(t('tfOverwrite'))}</span></label>
        ${err ? `<p class="muted" style="margin:0">${esc(err)}</p>` : ''}
        <h3 class="section-title" style="margin:0">${esc(t('tfPreview', { n: Math.min(cycle.length, 28) }))}</h3><div class="row wrap" style="gap:6px">${prev}</div>
        <button class="btn calc-blue block" data-tf="rot-apply">${ico('check')} ${esc(t('tfApplyRot'))}</button></section>`;
  }
  async function tfApplyRot() {
    const R = TFS.rot;
    let cycle; try { cycle = TF.parsePattern(R.key === 'custom' ? R.custom : TF.PATTERNS[R.key].cycle); } catch (e) { toast(t('tfPatErr')); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(R.start)) { toast(t('tfBadStart')); return; }
    if (R.overwrite && !(await confirmDialog(t('tfOverwriteQ')))) return;
    const data = tfData(), days = { ...data.days }; data.days = days;
    const n = TF.applyRotation(data, { cycle, map: R.map, start: R.start, offset: R.offset - 1, days: R.days, overwrite: R.overwrite });
    state.calDays = days; tfSave(false); sfx('pop'); toast(t('tfRotDone', { n }));
  }

  /* ---------- Más: ajustes, calendario externo (.ics) y copias ---------- */
  function tfMoreView() {
    const p = state.calPrefs, ext = tfData().ext;
    return `${tfSub(t('tfMore'))}
      <section class="clay card stack" style="gap:12px"><h2 class="section-title" style="margin:0">${esc(t('settings'))}</h2>
        ${tfField(t('tfWeekStart'), `<div class="seg" role="group">${[[1, 'tfMon'], [0, 'tfSun'], [6, 'tfSat']].map(([v, k]) => `<button data-tf-ws="${v}" class="${tfWs() === v ? 'on' : ''}">${esc(t(k))}</button>`).join('')}</div>`)}
        <label class="check tgl tgl-block"><input type="checkbox" data-tf-alarms ${p.alarms ? 'checked' : ''}><span>${esc(t('tfAlarms'))}</span></label></section>
      <section class="clay card stack" style="gap:12px"><h2 class="section-title" style="margin:0">${esc(t('tfViewSet'))}</h2>
        <label class="row" style="gap:14px"><span class="switch"><input type="checkbox" data-tf-summary ${p.summary !== false ? 'checked' : ''}><span></span></span><span class="grow"><b>${esc(t('tfSummaryQ'))}</b><br><span class="muted small">${esc(t('tfSummaryHint'))}</span></span></label>
        <div class="tf-preview ${p.summary !== false ? '' : 'off'}" aria-hidden="true"><span class="muted small">${esc(t('tfPreview'))}</span>${tfSummary([todayKey().slice(0, 8) + '01', todayKey()])}</div></section>
      <section class="clay card stack" style="gap:12px"><h2 class="section-title" style="margin:0">${esc(t('tfCalendar'))}</h2>
        <div class="row wrap" style="gap:8px"><button class="btn sm" data-tf="ics-out">${ico('download')} ${esc(t('tfIcsOut'))}</button><label class="btn sm">${ico('upload')} ${esc(t('tfIcsIn'))}<input type="file" accept=".ics,text/calendar" class="sr-only" data-tf-file="ics"></label>${ext.length ? `<button class="btn sm" data-tf="ics-clear">${ico('x')} ${esc(t('tfIcsClear', { n: ext.length }))}</button>` : ''}</div>
        <p class="muted small" style="margin:0">${esc(t('tfIcsHint'))}</p></section>
      <section class="clay card stack" style="gap:12px"><h2 class="section-title" style="margin:0">${esc(t('tfBackup'))}</h2>
        <div class="row wrap" style="gap:8px"><button class="btn sm" data-tf="json-out">${ico('download')} ${esc(t('tfJsonOut'))}</button><label class="btn sm">${ico('upload')} ${esc(t('tfJsonIn'))}<input type="file" accept=".json,application/json" class="sr-only" data-tf-file="json"></label></div>
        <p class="muted small" style="margin:0">${esc(t('tfBackupHint'))}</p></section>
      <section class="clay card"><button class="btn danger block" data-tf="wipe">${ico('trash')} ${esc(t('tfWipe'))}</button></section>`;
  }
  async function tfReadFile(input, cb) {
    const f = input.files && input.files[0]; input.value = '';
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast(t('tfFileBig')); return; }
    cb(await f.text());
  }

  // Clics del Calendario (data-tf*)
  function tfClick(e) {
    if (e.target.closest('[data-tf="layers"]')) { tfOpenLayers(); return true; }
    const more = e.target.closest('[data-tf-more]');
    if (more) { e.preventDefault(); tfSeeAll(more.dataset.tfMore); return true; }
    const el = e.target.closest('[data-tf],[data-tf-qtab],[data-tf-go],[data-tf-cv],[data-tf-day],[data-tf-open],[data-tf-month],[data-tf-q],[data-tf-rm],[data-tf-ws],[data-tf-shift],[data-tf-job],[data-tf-kind],[data-tf-rt]');
    if (!el) { if (TFS.menu && !e.target.closest('.tf-menu')) { TFS.menu = false; render(); } return false; }
    const u = tfUi(), y = +u.ym.slice(0, 4), mo = +u.ym.slice(5, 7) - 1, ym = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    if (el.dataset.tfGo) { u.view = el.dataset.tfGo; TFS.quick = null; TFS.menu = false; TFS.sheet = false; save(); render(); window.scrollTo(0, 0); return true; }
    if (el.dataset.tfCv) { tfSetCv(el.dataset.tfCv); return true; }
    if (el.dataset.tfDay) { if (TFS.quick && e.detail !== 0 && u.cv !== 'year') return true; /* con el dedo o el ratón pinta tfPaint */ tfOnDay(el.dataset.tfDay); return true; }
    if (el.dataset.tfOpen) { u.d = el.dataset.tfOpen; u.ym = u.d.slice(0, 7); u.cv = 'day'; TFS.quick = null; save(); render(); return true; }
    if (el.dataset.tfMonth) { u.ym = `${y}-${pad(+el.dataset.tfMonth + 1)}`; u.d = u.ym + '-01'; u.cv = 'month'; save(); render(); return true; }
    if (el.dataset.tfQ) { TFS.quick = el.dataset.tfQ; TFS.sheet = false; if (u.cv === 'year') { u.cv = 'month'; save(); } const sy = window.scrollY; render(); window.scrollTo(0, sy); return true; }
    if (el.dataset.tfQtab) { TFS.qTab = el.dataset.tfQtab; render(); return true; }
    if (el.dataset.tfRm) { const r = TFS.rep; if (el.dataset.tfRm === 'custom') { const [a, b] = tfRepRange(); r.from = a; r.to = b; } r.mode = el.dataset.tfRm; render(); return true; }
    if (el.dataset.tfWs) { state.calPrefs = { ...state.calPrefs, weekStart: +el.dataset.tfWs }; save(); render(); return true; }
    if (el.dataset.tfShift !== undefined) { tfEditShift(tfShift(el.dataset.tfShift) || null); return true; }
    if (el.dataset.tfJob !== undefined) { tfEditJob(state.calJobs.find(j => j.id === el.dataset.tfJob) || null); return true; }
    if (el.dataset.tfKind !== undefined) { tfEditKind(el.dataset.tfKind || null); return true; }
    if (el.dataset.tfRt !== undefined) { tfRoutineAct(el.dataset.tfRt, el.dataset.id); return true; }
    switch (el.dataset.tf) {
      case 'menu': TFS.menu = !TFS.menu; render(); break;
      case 'prev': case 'next': {
        const n = el.dataset.tf === 'next' ? 1 : -1;
        if (u.cv === 'day' || u.cv === 'week') { u.d = TF.iso(TF.addDays(TF.parseISO(u.d), n * (u.cv === 'week' ? 7 : 1))); u.ym = u.d.slice(0, 7); }
        else { u.ym = ym(u.cv === 'year' ? new Date(y + n, mo, 1) : new Date(y, mo + n, 1)); u.d = todayKey().startsWith(u.ym) ? todayKey() : u.ym + '-01'; }
        save(); render(); break;
      }
      case 'today': u.ym = todayKey().slice(0, 7); u.d = todayKey(); save(); render(); break;
      case 'sheet': TFS.sheet = true; TFS.menu = false; render(); break;
      case 'sheet-x': TFS.sheet = false; render(); break;
      case 'dk-edit': tfEditDayKinds(); break;
      case 'qdone': TFS.quick = null; TFS.sheet = false; render(); break;
      case 'shared': TFS.sheet = false; render(); tfOpenShared(); break;
      case 'share': TFS.sheet = false; render(); tfOpenShare(); break;
      case 'rprev': case 'rnext': { const r = TFS.rep, n = el.dataset.tf === 'rnext' ? 1 : -1, d = r.ref; r.ref = r.mode === 'week' ? TF.addDays(d, 7 * n) : r.mode === 'month' ? new Date(d.getFullYear(), d.getMonth() + n, 1) : new Date(d.getFullYear() + n, 0, 1); render(); break; }
      case 'rot-apply': tfApplyRot(); break;
      case 'ics-out': { const yy = new Date().getFullYear(); downloadBlob('keepgoing-turnos.ics', new Blob([TF.toICS(tfData(), yy + '-01-01', (yy + 2) + '-12-31')], { type: 'text/calendar' })); toast(t('tfIcsSaved')); break; }
      case 'ics-clear': state.calExt = { list: [] }; save(); render(); break;
      case 'json-out': downloadBlob('keepgoing-calendario.json', new Blob([JSON.stringify(tfData(), null, 1)], { type: 'application/json' })); break;
      case 'wipe':
        confirmDialog(t('tfWipeQ')).then(ok => { if (!ok) return; const d = TF.defaults(); state.calJobs = d.jobs.map(j => ({ ...j, name: t('tfDefJob') })); state.calShifts = d.shifts.map(s => ({ ...s, name: t('tfDef_' + s.id) })); state.calDays = {}; state.calExt = { list: [] }; tfSave(); toast(t('tfWiped')); });
        break;
    }
    return true;
  }
  document.addEventListener('change', async e => {
    if (state.ui.tab !== 'cal') return;
    const el = e.target, u = tfUi(), R = TFS.rot;
    if (el.matches('[data-tf-pick]')) { const y = el.dataset.tfPick === 'y' ? +el.value : +u.ym.slice(0, 4), m = el.dataset.tfPick === 'm' ? +el.value + 1 : +u.ym.slice(5, 7); u.ym = `${y}-${pad(m)}`; u.d = `${u.ym}-${pad(Math.min(+u.d.slice(8, 10), new Date(y, m, 0).getDate()))}`; save(); render(); }
    else if (el.matches('[data-tf-rf]')) { TFS.rep[el.dataset.tfRf] = el.value; render(); }
    else if (el.matches('[data-tf-r]')) {
      const k = el.dataset.tfR;
      if (k === 'key') { R.key = el.value; R.map = {}; }
      else if (k === 'overwrite') R.overwrite = el.checked;
      else if (k === 'offset') R.offset = Math.max(1, +el.value || 1);
      else if (k === 'days') R.days = +el.value;
      else R[k] = el.value;
      if (k !== 'overwrite') render();
    }
    else if (el.matches('[data-tf-rmap]')) { R.map[el.dataset.tfRmap] = el.value; render(); }
    else if (el.matches('[data-tf-summary]')) { state.calPrefs = { ...state.calPrefs, summary: el.checked }; save(); render(); }
    else if (el.matches('[data-tf-alarms]')) {
      state.calPrefs = { ...state.calPrefs, alarms: el.checked }; save();
      if (el.checked && 'Notification' in window && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch (err) { /* sin permiso */ } }
      toast(t(el.checked ? 'tfAlarmsOn' : 'tfAlarmsOff'));
    }
    else if (el.matches('[data-tf-file="ics"]')) tfReadFile(el, txt => { const ev = TF.parseICS(txt).slice(0, TF.LIMITS.ext); state.calExt = { list: ev }; save(); render(); toast(t('tfIcsImported', { n: ev.length })); });
    else if (el.matches('[data-tf-file="json"]')) tfReadFile(el, async txt => {
      let n; try { n = TF.sanitize(JSON.parse(txt)); } catch (err) { toast(t('tfBadFile')); return; }
      if (!(await confirmDialog(t('tfImportQ')))) return;
      state.calJobs = n.jobs; state.calShifts = n.shifts; state.calDays = n.days; state.calExt = { list: n.ext }; state.calPrefs = { ...state.calPrefs, weekStart: n.settings.weekStart }; tfSave(); toast(t('tfImported'));
    });
  });
  // Alarmas: avisan con la app abierta (y con notificación si se ha dado permiso)
  setInterval(() => {
    if (!state.calPrefs || !state.calPrefs.alarms) return;
    const now = Date.now();
    for (const base of [new Date(), new Date(now + 86400000)]) {
      const k = TF.iso(base);
      (state.calDays[k] || []).forEach((e, i) => {
        const s = tfShift(e.sid); if (!s || !s.alarmMin) return;
        const { start } = TF.entryTimes(s, e); if (!start) return;
        const [hh, mm] = start.split(':').map(Number), at = TF.parseISO(k).getTime() + (hh * 60 + mm - s.alarmMin) * 60000, id = k + i + s.id;
        if (now >= at && now < at + 60000 && !TFS.fired.has(id)) {
          TFS.fired.add(id); const msg = t('tfAlarmMsg', { s: ((s.emoji || '') + ' ' + s.name).trim(), at: start }); toast(msg); vibrate([30, 60, 30]);
          try { if ('Notification' in window && Notification.permission === 'granted') new Notification('KeepGoing', { body: msg }); } catch (err) { /* sin notificaciones */ }
        }
      });
    }
  }, 20000);

  /* =========================================================
     RENDER
     ========================================================= */
  let lastView = null, lastTabIdx = -1;
  // Pestañas: Hábitos y Proyectos (con Gráficos dentro), Libreta y Maestrías
  const TABS = [['habits', 'checklist', 'tabHabitsProjects'], ['cal', 'calendar', 'tabCalendar'], ['ledger', 'wallet', 'tabLedger'], ['chat', 'chat', 'tabChat'], ['mastery', 'crown', 'tabMastery']];
  const HVIEWS = [['today', '☀️', 'viewToday'], ['all', '📋', 'viewAll'], ['challenges', '🏁', 'viewChallenges']];
  const habitsView = () => HVIEWS.some(v => v[0] === state.ui.habitsView) ? state.ui.habitsView : 'all';
  const openFolder = () => { const p = state.ui.folder && state.projects.find(x => x.id === state.ui.folder); return p && habitsView() === 'all' ? p : null; };
  // Posición de la vista (pestaña y subvista) para saber hacia qué lado se desliza al cambiar
  function viewPos() {
    const ti = Math.max(0, TABS.findIndex(x => x[0] === state.ui.tab));
    if (state.ui.tab === 'ledger' && state.ui.ledgerView === 'calc') return { key: 'ledger:calc', n: ti * 100 + 5 };
    if (state.ui.tab !== 'habits') return { key: state.ui.tab, n: ti * 100 };
    const vi = HVIEWS.findIndex(v => v[0] === habitsView()), f = openFolder();
    return { key: 'habits:' + habitsView() + (f ? ':' + f.id : ''), n: vi * 10 + (f ? 5 : 0) };
  }
  function render() {
    if (publicMode) return;
    migrateShop();
    if (LV.key && !vaultSame()) ledgerLock(); // la Libreta se ha vuelto a crear en otro dispositivo
    else if (ledgerOpen() && LV.sig !== ledgerSig() && !LV.busy) { LV.busy = true; ledgerLoad().then(() => { LV.busy = false; runRecurring(); render(); }).catch(() => { LV.busy = false; }); }
    applyTheme();
    document.documentElement.lang = state.lang;
    hideTip();
    const app = $('#app');
    if (!state.onboarded) { app.innerHTML = renderOnboarding(); mountOnboarding(); return; }
    const cc = awardContract();
    // Contrato indefinido: al acabar cada periodo se entrega la carta y se renueva solo
    if (cc && contractForever()) { const c = state.contract, s = todayKey(); c.signedAt = s; c.endsAt = contractEnd(s, false); c.renewals = (c.renewals || 0) + 1; c.level = state.commitment; delete c.trial; save(); }
    const ti = TABS.findIndex(x => x[0] === state.ui.tab), pos = viewPos();
    // Animación de entrada solo si cambia la vista: se desliza hacia la derecha o la izquierda según el orden
    const anim = lastView === null ? 'anim-in' : lastView.key === pos.key ? 'no-anim' : (pos.n > lastView.n ? 'anim-fwd' : 'anim-back');
    const prevTab = lastTabIdx; lastView = pos; lastTabIdx = ti;
    app.innerHTML = `<div class="app">${renderNav()}${devViewPill()}<main class="main ${anim}" id="main" data-tab="${esc(state.ui.tab)}">${renderView()}</main></div>`;
    placeNavInd(prevTab);
    afterRender();
    if (ledgerOpen() && pendingShare) { const id = pendingShare; pendingShare = null; setTimeout(() => showLedgerShare(id), 150); }
    else if (ledgerOpen() && auth && !KX.pushed && KX.vid !== LV.vid) ensureKx().catch(() => {});
    if (cc) setTimeout(() => whenFree(() => openContractCard(cc, true)), 400);
  }

  // v1.25: mientras el equipo ve la app como otro plan, una píldora fija arriba lo recuerda y deja volver al plan real
  function devViewPill() {
    const p = PL(); if (!p.viewing) return '';
    return `<button class="dev-pill" data-act="dev-view-real">${ico('eye')}<span>${esc(t('stViewBanner', { plan: planHint() }))}</span><b>${esc(t('stViewBack'))}</b></button>`;
  }
  function renderNav() {
    return `<nav class="nav" aria-label="KeepGoing"><span class="nav-ind" aria-hidden="true"></span>${TABS.map(([id, ic, key]) =>
      `<button data-act="go" data-tab="${id}" class="${state.ui.tab === id ? 'on' : ''}" ${state.ui.tab === id ? 'aria-current="page"' : ''} title="${esc(t(key))}">${ico(ic)}<span>${esc(t(key))}</span></button>`).join('')}</nav>`;
  }
  // Indicador que se desliza de la pestaña anterior a la nueva
  function placeNavInd(prevIdx) {
    const nav = $('.nav'); if (!nav) return;
    const ind = $('.nav-ind', nav), btns = $$('button', nav), cur = btns.findIndex(b => b.classList.contains('on'));
    if (!ind || cur < 0) return;
    const put = b => { ind.style.width = b.offsetWidth + 'px'; ind.style.height = b.offsetHeight + 'px'; ind.style.transform = `translate(${b.offsetLeft}px, ${b.offsetTop}px)`; };
    if (prevIdx >= 0 && prevIdx !== cur && btns[prevIdx] && !reducedMotion()) { ind.style.transition = 'none'; put(btns[prevIdx]); void ind.offsetWidth; ind.style.transition = ''; }
    put(btns[cur]);
    if (prevIdx >= 0 && prevIdx !== cur) btns[cur].classList.add('nav-bounce');
  }

  function renderView() {
    switch (state.ui.tab) {
      case 'ledger': return viewLedger();
      case 'mastery': return viewMastery();
      case 'chat': return viewChat();
      case 'cal': return viewCal();
      default: return viewHabits();
    }
  }

  // @nametag junto al nivel: abre tu perfil (insignias, logros, cartas…)
  const myTag = () => profileOf().tag || repState.nametag || '';
  const tagPill = () => `<button class="tag-pill clay ${myTag() ? '' : 'tag-empty'}" data-act="profile" aria-label="${esc(t('profileTitle'))}" title="${esc(t('profileTitle'))}">${myTag() ? `<b>@</b>${esc(myTag())}` : `<b>@</b>${esc(t('tagPillEmpty'))}`}</button>`;
  function topBar(actions = '') {
    return `<div class="top-bar"><div class="row top-left" style="gap:8px;min-width:0"><button class="icon-btn" data-act="settings" aria-label="${esc(t('settings'))}" title="${esc(t('settings'))}">${ico('gear')}</button>${state.habits.length ? levelPill() : ''}${tagPill()}</div>${actions ? `<div class="pill-group">${actions}</div>` : ''}</div>`;
  }
  const emptyState = (icon, title, sub, action = '') =>
    `<div class="empty"><div class="empty-art">${ico(icon)}</div><h2>${esc(title)}</h2><p>${esc(sub)}</p>${action}</div>`;

  function afterRender() {
    initCals($('#main'));
    tfFitCells($('#main'));
    if (state.ui.tab === 'habits') loadPhotos($('#main'));
    applyWOrder($('#main'));
    decorateJiggle();
  }
  // Widgets que se han quitado con el «−» del modo edición (se recuperan en Ajustes)
  const hidW = k => (state.hiddenW || []).includes(k);

  /* ---------- HÁBITOS Y PROYECTOS ---------- */
  function contractBanner() {
    if (hidW('contract')) return '';
    const c = state.contract;
    if (!c) return `<div class="banner clay" data-w="contract"><div class="banner-ico">${ico('doc')}</div><span class="grow">${esc(t('contractNone'))}</span><button class="chip" data-act="contract">${esc(t('contractSignNow'))}</button></div>`;
    const left = diffDays(todayKey(), c.endsAt);
    if (left < 0) return `<div class="banner clay" data-w="contract"><div class="banner-ico">${ico('doc')}</div><span class="grow"><b>${esc(t('contractEnded'))}</b></span><button class="chip on" data-act="contract-renew">${esc(t('contractRenew'))}</button></div>`;
    const total = Math.max(1, diffDays(c.signedAt, c.endsAt));
    const pct = clamp((total - left) / total * 100, 0, 100);
    return `<button class="banner clay" data-w="contract" data-act="contract" style="width:100%;border:0;text-align:left;color:inherit"><div class="banner-ico">${ico('doc')}</div><span class="grow"><b>${esc(left === 1 ? t('contractActive1') : t('contractActive', { n: left }))}</b><span class="bar" style="display:block;height:6px;margin-top:6px;max-width:260px"><i style="width:${pct}%"></i></span></span>${ico('right')}</button>`;
  }

  // Un hábito está «dentro» de una carpeta si pertenece a algún proyecto sin terminar
  const activeProjects = () => state.projects.filter(p => !projectStats(p).achieved);
  const folderedIds = () => new Set(activeProjects().flatMap(p => p.habitIds));

  function viewHabits() {
    const active = state.habits.filter(h => !h.archived), arch = state.habits.filter(h => h.archived);
    let html = topBar(`<button class="icon-btn" data-act="create" aria-label="${esc(t('createTitle'))}">${ico('plus')}</button>`);
    const folder = openFolder();
    if (!folder && state.ui.folder) state.ui.folder = null;
    html += `<h1 class="page-title">${esc(t('tabHabitsProjects'))}</h1>`;
    if (!active.length && !arch.length && !state.projects.length) {
      return html + contractBanner() + emptyState('checklist', t('habitsEmptyTitle'), t('habitsEmptySub'), `<div class="row wrap" style="justify-content:center"><button class="btn primary" data-act="habit-new">${ico('plus')} ${esc(t('addHabit'))}</button><button class="btn" data-act="packs">📦 ${esc(t('fromTemplate'))}</button><button class="btn" data-act="proj-new">${ico('target')} ${esc(t('newProject'))}</button></div>`);
    }
    const view = habitsView();
    html += `<div class="seg view-seg" role="tablist">${HVIEWS.map(([v, e, k]) => `<button data-act="hview" data-v="${v}" role="tab" aria-selected="${view === v}" class="${view === v ? 'on' : ''}"><span class="vi">${e}</span> ${esc(t(k))}</button>`).join('')}</div>`;
    if (view === 'today') return html + contractBanner() + viewToday(active);
    const grid = list => `<div class="habit-grid" id="habit-grid">${list.map(habitCard).join('')}</div>${list.length > 1 ? `<p class="grid-hint">${esc(t('dragHint'))}</p>` : ''}`;
    if (view === 'challenges') {
      const on = active.filter(h => h.challenge && !h.challenge.done), done = active.filter(h => h.challenge && h.challenge.done);
      const pr = activeProjects().filter(p => p.deadline);
      if (pr.length) html += `<h2 class="section-title" style="margin:0 0 14px">🎯 ${esc(t('retoProjects'))}</h2><div class="habit-grid" style="margin-bottom:24px">${pr.map(folderCard).join('')}</div>`;
      if (pr.length && on.length) html += `<h2 class="section-title" style="margin:0 0 14px">📋 ${esc(t('retoHabits'))}</h2>`;
      html += on.length ? grid(on) : pr.length ? '' : emptyState('target', t('challengesEmpty'), t('challengesEmptySub'), '');
      if (done.length) html += `<h2 class="section-title" style="margin-top:24px">🏆 ${esc(t('challengesDone'))}</h2><div class="habit-grid">${done.map(habitCard).join('')}</div>`;
      return html;
    }
    if (folder) return html + folderViewHtml(folder);
    html += contractBanner();
    if (activeVacation()) html += `<div class="banner clay">🏖️<span class="grow"><b>${esc(t('vacActive', { date: fmtDate(activeVacation().to) }))}</b></span><button class="chip" data-act="vacations">${esc(t('edit'))}</button></div>`;
    const inF = folderedIds(), folders = activeProjects(), loose = active.filter(h => !inF.has(h.id));
    html += `<div class="habit-grid" id="habit-grid">${folders.map(folderCard).join('')}${loose.map(habitCard).join('')}</div>`;
    if (loose.length || folders.length) html += `<p class="grid-hint">${esc(t('tapHint'))}<br>${esc(t('folderHint'))}</p>`;
    const finished = state.projects.filter(p => !folders.includes(p));
    if (finished.length) html += `<h2 class="section-title" style="margin:28px 0 14px;font-size:22px">🏆 ${esc(t('finishedProjects'))}</h2><div class="proj-grid">${finished.map(finishedCard).join('')}</div>`;
    if (arch.length) {
      html += `<div class="center" style="margin-top:22px"><button class="chip" data-act="toggle-archived">${ico('archive')} ${esc(state.ui.showArchived ? t('hideArchived') : t('showArchived', { n: arch.length }))}</button></div>`;
      if (state.ui.showArchived) html += `<div class="habit-grid archived-list" style="margin-top:18px">${arch.map(habitCard).join('')}</div>`;
    }
    return html;
  }

  /* v1.22: cuadrícula sin huecos (tipo mosaico). Cada tarjeta ocupa tantas filas de 1 px como su altura, así una tarjeta
     corta (por ejemplo, con el calendario oculto) no deja hueco y la de abajo sube. Con una sola columna no hace nada. */
  let masonryRaf = 0;
  const masonryRO = typeof ResizeObserver === 'function' ? new ResizeObserver(() => scheduleMasonry()) : null;
  function scheduleMasonry() { if (!masonryRaf) masonryRaf = requestAnimationFrame(() => { masonryRaf = 0; $$('.habit-grid').forEach(layoutMasonry); }); }
  function layoutMasonry(grid) {
    const cs = getComputedStyle(grid), cols = cs.gridTemplateColumns.split(' ').filter(Boolean).length, kids = [...grid.children];
    if (cols < 2) { if (grid.classList.contains('masonry')) { grid.classList.remove('masonry'); kids.forEach(k => { k.style.gridRowEnd = ''; }); } return; }
    grid.classList.add('masonry');
    const gap = parseFloat(cs.columnGap) || 12;
    for (const k of kids) {
      if (masonryRO && !k._mo) { masonryRO.observe(k); k._mo = true; }
      const span = `span ${Math.max(1, Math.ceil(k.offsetHeight + gap))}`;
      if (k.style.gridRowEnd !== span) k.style.gridRowEnd = span;
    }
  }
  if (typeof MutationObserver === 'function') new MutationObserver(scheduleMasonry).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('resize', scheduleMasonry);

  // Carpeta (proyecto) en la cuadrícula: mismo tamaño que un hábito; muestra sus hábitos y el progreso de hoy
  // Hábitos que se cuentan más de una vez: a partir de 2 el número sustituye al icono
  const multiN = h => !isQuit(h) && !isAmount(h) && (+h.target > 1 || h.multi) ? (h.freq === 'daily' ? cnt(h, todayKey()) : periodSum(h, todayKey())) : 0;
  const icoOrN = (h, fb) => { const n = multiN(h); return n >= 2 ? `<b class="cnt-n">${n}</b>` : fb; };
  function folderCard(p) {
    const s = projectStats(p), hs = p.habitIds.map(getHabit).filter(h => h && !h.archived);
    const due = hs.filter(h => todayStatus(h).due), done = due.filter(h => todayStatus(h).done && !isQuit(h)).length;
    // Las casillas de los hábitos se marcan desde la carpeta, sin abrirla
    const minis = hs.map(h => { const st = todayStatus(h), q = isQuit(h), slip = q && cnt(h, todayKey()); return `<button class="fmini ${!q && st.done ? 'on' : ''} ${slip ? 'slip' : ''} ${st.due || q ? '' : 'off'}" data-today="${q ? 'slip' : 'tap'}" data-id="${h.id}" style="${habitVars(hColor(h))}" title="${esc(h.name)}" aria-label="${esc(h.name)} · ${esc(t(q ? 'relapse' : 'markDone'))}" aria-pressed="${!q && st.done}">${icoOrN(h, esc(h.icon || '#'))}${!q && st.done ? `<i class="fmini-ok">${ico('check')}</i>` : ''}</button>`; }).join('');
    return `<article class="folder clay" data-pid="${p.id}" style="--h:${p.color || 'var(--accent)'}">
      <button class="folder-main" data-act="folder-open" data-id="${p.id}" aria-label="${esc(t('folderOpen', { name: p.name }))}">
        <span class="folder-tab" aria-hidden="true"></span>
        <span class="folder-head"><span class="folder-ico">${esc(p.icon || '📁')}</span>${statusBadge(p, s)}</span>
        <h3>${esc(p.name)}${p.groupId ? ' 👥' : ''}</h3>
        <span class="muted small folder-sub">${esc(s.achieved ? t('achieved') : deadlineText(p, s))}${hs.length ? ' · ' + esc(t('folderCount', { n: hs.length })) : ''}${due.length ? ' · ' + esc(t('folderToday', { a: done, b: due.length })) : ''}</span>
      </button>
      <div class="folder-minis">${minis || `<span class="muted small">${esc(t('folderEmpty'))}</span>`}</div>
      ${hs.length && !p.hideCal ? calHtml({ id: 'p:' + p.id, proj: p }) : ''}
      <button class="more-btn" data-act="more" data-kind="project" data-id="${p.id}">${esc(t('seeMore'))} ${ico('down')}</button>
    </article>`;
  }
  function finishedCard(p) {
    return `<button class="proj clay finished" data-act="proj-open" data-id="${p.id}">
      <div class="proj-top"><div class="habit-ico" style="--h-soft:var(--surface-2)">${esc(p.icon || '🎯')}</div><div class="grow"><h3>${esc(p.name)}</h3><div class="muted small" style="font-weight:var(--fw-label)">✅ ${esc(t('achieved'))}</div></div></div>
      ${p.photos.before || p.photos.after ? `<div class="ba-row">${['before', 'after'].map(k => p.photos[k] ? `<div class="ba-thumb"><img data-photo="${esc(p.photos[k].path)}" alt=""><span>${esc(t('photo_' + k))}</span></div>` : `<div class="ba-thumb empty"><span>${esc(t('photo_' + k))}</span></div>`).join('')}</div>` : ''}
    </button>`;
  }
  // Dentro de una carpeta: resumen del proyecto y sus hábitos (un hábito puede estar en varias carpetas)
  function folderViewHtml(p) {
    const hs = p.habitIds.map(getHabit).filter(h => h && !h.archived);
    let html = `<div class="folder-bar"><button class="chip" data-act="folder-close">${ico('left')} ${esc(t('viewAll'))}</button><span class="muted small grow">${esc(t('folderInside'))}</span><button class="chip" data-act="proj-edit" data-id="${p.id}">${ico('edit')} ${esc(t('edit'))}</button></div>`;
    html += `<div class="folder-summary">${projCard(p)}${hs.length && !p.hideCal ? `<div class="clay card folder-cal">${calHtml({ id: 'p:' + p.id, proj: p })}<button class="more-btn" data-act="more" data-kind="project" data-id="${p.id}">${esc(t('seeMore'))} ${ico('down')}</button></div>` : ''}</div>`;
    html += hs.length ? `<div class="habit-grid" id="habit-grid" data-folder="${p.id}">${hs.map(habitCard).join('')}</div><p class="grid-hint">${esc(t('folderOutHint'))}</p>`
      : `<p class="muted center">${esc(t('folderEmptyHint'))}</p>`;
    html += `<div class="row wrap" style="margin-top:14px;justify-content:center"><button class="btn primary" data-act="habit-new">${ico('plus')} ${esc(t('folderNewHabit'))}</button><button class="btn" data-act="proj-edit" data-id="${p.id}">${ico('link')} ${esc(t('folderAddHabits'))}</button>${hs.length ? `<button class="btn" data-act="proj-extract" data-id="${p.id}">${ico('upload')} ${esc(t('projExtract'))}</button>` : ''}</div>`;
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
    const inFolders = state.projects.filter(p => p.habitIds.includes(h.id)).length;
    if (isQuit(h)) {
      const slip = cnt(h, today) > 0, best = bestStreak(h);
      meta.push(`<span class="tag-quit">${esc(t('kindQuit'))}</span>`);
      meta.push(esc(streak === 1 ? t('quitDay1') : t('quitDays', { n: streak })));
      if (best > streak) meta.push(esc(t('bestStreak')) + ' ' + best);
      if (h.challenge && !h.challenge.done) meta.push(`🏁 ${challengeProgress(h)}/${h.challenge.days}`);
      if (h.groupId) meta.push(`<span class="grp-chip" data-group="${h.groupId}">👥</span>`);
      const ring = `<button class="ring quit ${slip ? 'slipped' : 'full'}" data-ring="${h.id}" aria-label="${esc(t('relapse'))}"><svg viewBox="0 0 54 54" aria-hidden="true"><circle cx="27" cy="27" r="23" fill="none" stroke="var(--h)" stroke-opacity=".4" stroke-width="3.5"/></svg><span class="ring-in">${slip ? ico('x') : streak}</span></button>`;
      return cardShell(h, c, meta, ring);
    }
    if (isAmount(h)) meta.push(`${fmtNum(sum)} / ${fmtNum(h.target)} ${esc(h.unit || '')}${h.freq !== 'daily' ? ' · ' + esc(unitLabel(h)) : ''}`);
    else if (subMode(h)) { meta.push(`${ico(h.mode === 'goals' ? 'list' : 'branch', 'xs')} ${esc(subMeta(h))}`); if (h.freq !== 'daily') meta.push(esc(t(h.freq === 'weekly' ? 'thisWeek' : 'thisMonth', { a: sum, b: h.target }))); }
    else {
      if (!(h.freq === 'daily' && h.target === 1)) meta.push(esc(t('timesPer', { n: h.target, period: unitLabel(h) })));
      if (h.freq === 'weekly') meta.push(esc(t('thisWeek', { a: sum, b: h.target })));
      if (h.freq === 'monthly') meta.push(esc(t('thisMonth', { a: sum, b: h.target })));
    }
    if (streak) meta.push(`<span class="flame">${ico('flame')}</span>${streak}`);
    const sh = shieldInfo(h).available; if (sh) meta.push(`🛡️${sh}`);
    if (h.challenge && !h.challenge.done) meta.push(`🏁 ${challengeProgress(h)}/${h.challenge.days}`);
    if (h.reminder && h.reminder.on) meta.push(`🔔${esc(h.reminder.time)}`);
    if (h.groupId) meta.push(`<span class="grp-chip" data-group="${h.groupId}">👥</span>`);
    if (inFolders > 1) meta.push(`📁${inFolders}`);
    // En hábitos con cantidad, el anillo muestra el porcentaje del objetivo
    const ring = isAmount(h)
      ? ringHtml(Math.min(sum, h.target), h.target, `data-ring="${h.id}" aria-label="${esc(t('today'))}: ${fmtNum(sum)}/${fmtNum(h.target)}"`).replace(/<span class="ring-in">.*<\/span><\/button>$/, `<span class="ring-in" style="font-size:12px">${sum >= h.target ? ico('check') : Math.round(sum / h.target * 100) + '%'}</span></button>`)
      : ringHtml(sum, h.target, `data-ring="${h.id}" aria-label="${esc(t('today'))}: ${sum}/${h.target}"`);
    return cardShell(h, c, meta, ring);
  }
  function cardShell(h, c, meta, ring) {
    return `<article class="habit clay" data-id="${h.id}" style="${habitVars(c)}">
      <div class="habit-head">
        <button class="habit-ico" data-act="habit-edit" data-id="${h.id}" aria-label="${esc(t('editHabit'))}">${esc(h.icon || '#')}</button>
        <button class="habit-title" data-act="habit-edit" data-id="${h.id}"><h3>${esc(h.name)}</h3>${meta.length ? `<div class="habit-meta">${meta.map(m => `<span>${m}</span>`).join('')}</div>` : ''}</button>
        ${+h.duration > 0 && !isQuit(h) ? `<button class="icon-btn sm timer-btn" data-timer="${h.id}" aria-label="${esc(t('timer'))}">${ico('timer')}</button>` : ''}
        ${ring}
      </div>
      ${h.hideCal ? '' : calHtml(h)}
      <button class="more-btn" data-act="more" data-kind="habit" data-id="${h.id}">${esc(t('seeMore'))} ${ico('down')}</button>
    </article>`;
  }

  /* ---------- calendario de 1 mes por hábito: se desliza para ver los meses anteriores y posteriores ---------- */
  const calOff = {}; // hábito → meses de desplazamiento respecto al mes actual (0 = este mes)
  const ymAdd = (ym, n) => { const [y, m] = ym.split('-').map(Number), d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
  const ymDiff = (a, b) => { const [ya, ma] = a.split('-').map(Number), [yb, mb] = b.split('-').map(Number); return (yb - ya) * 12 + (mb - ma); };
  // Se puede ir desde el primer mes con datos (al menos 1 mes atrás) hasta 1 mes en el futuro
  const calBounds = h => ({ min: -Math.max(1, ymDiff((h.proj ? projFirst(h.proj) : firstKey(h)).slice(0, 7), todayKey().slice(0, 7))), max: 1 });
  // Los proyectos también tienen calendario: cada día marca qué parte de sus hábitos se cumplió
  const projHabits = p => p.habitIds.map(getHabit).filter(h => h && !h.archived);
  const projFirst = p => projHabits(p).reduce((m, h) => { const f = firstKey(h); return f < m ? f : m; }, p.createdAt || todayKey());
  const calSubj = id => { if (!String(id).startsWith('p:')) return getHabit(id); const p = state.projects.find(x => x.id === id.slice(2)); return p ? { id, proj: p } : null; };
  // Día perfecto del proyecto: todos sus hábitos diarios que tocaban hechos y ninguna recaída (null si ese día no tocaba ninguno)
  function projDayPerfect(hs, k) {
    let any = false;
    for (const h of hs) {
      if (!isQuit(h) && (h.freq || 'daily') !== 'daily') continue;
      const v = dayScore(h, k); if (v == null) continue;
      any = true; if (v < 1) return false;
    }
    return any ? true : null;
  }
  // Semana perfecta: cada día con algo que hacer fue perfecto y los hábitos semanales se cumplieron. Entonces se rellena la semana entera.
  function projWeekPerfect(hs, ws, fk) {
    const today = todayKey(), end = addDays(ws, 6) < today ? addDays(ws, 6) : today;
    let any = false;
    for (let d = ws < fk ? fk : ws; d <= end; d = addDays(d, 1)) { const v = projDayPerfect(hs, d); if (v === false) return false; if (v) any = true; }
    for (const h of hs) {
      if (isQuit(h) || h.freq !== 'weekly' || firstKey(h) > end) continue;
      const st = periodState(h, periodStart(h, ws)); if (st === 'miss') return false; if (st === 'done') any = true;
    }
    return any;
  }
  function projMonthCal(p, ym) {
    const [y, m] = ym.split('-').map(Number), today = todayKey(), hs = projHabits(p), fk = projFirst(p);
    let out = '';
    for (const w of LED.monthGrid(y, m)) {
      const k0 = w.find(Boolean), ws = k0 ? weekStart(k0) : null, wPerfect = ws && ws <= today && addDays(ws, 6) >= fk ? projWeekPerfect(hs, ws, fk) : false;
      for (const k of w) {
      if (!k) { out += '<i class="dot blank"></i>'; continue; }
      const n = +k.slice(8);
      if (k > today) { out += `<span class="dot future">${n}</span>`; continue; }
      const sc = hs.map(h => dayScore(h, k)).filter(v => v != null), v = sc.length ? sc.reduce((a, b) => a + b, 0) / sc.length : null;
      const full = k >= fk && (wPerfect || projDayPerfect(hs, k) === true);
      const cls = 'dot' + (full ? ' on' : v == null ? ' off' : v > 0 ? ' part' : '') + (k < fk ? ' pre' : '') + (k === today ? ' today' : '');
      out += `<span class="${cls}" title="${esc(fmtDate(k))}${v == null ? '' : ': ' + Math.round(v * 100) + '%'}">${n}</span>`;
      }
    }
    return `<div class="mcal" data-ym="${ym}"><div class="mcal-grid">${out}</div></div>`;
  }
  function monthCal(h, ym) {
    if (h.proj) return projMonthCal(h.proj, ym);
    const [y, m] = ym.split('-').map(Number), today = todayKey(), fk = firstKey(h), L = state.logs[h.id] || {};
    let out = '';
    for (const w of LED.monthGrid(y, m)) {
      for (const k of w) {
        if (!k) { out += '<i class="dot blank"></i>'; continue; }
        const n = +k.slice(8);
        if (k > today) { out += `<span class="dot future">${n}</span>`; continue; }
        const c = L[k] || 0;
        let cls = 'dot';
        if (isQuit(h)) {
          if (c > 0) cls += ' slip';
          else if (k >= fk && k < today) cls += ' on';
        } else {
          if (c >= dayGoal(h, k)) cls += ' on'; else if (c > 0) cls += ' part';
          else if (isShielded(h, k)) cls += ' shielded';
          else if (isRest(h, k) || inVacation(k)) cls += ' rest';
          else if (!isScheduled(h, k)) cls += ' off';
        }
        if (k < fk) cls += ' pre';
        if (k === today) cls += ' today';
        out += `<button class="${cls}" data-k="${k}" aria-label="${esc(fmtDate(k))}: ${c}">${c >= 2 && !isAmount(h) && !isQuit(h) ? `<b>${c}</b>` : n}</button>`;
      }
      if (h.freq === 'weekly') { const ws = weekStart(w.find(Boolean)); out += `<i class="wk${ws > today ? ' future' : periodDone(h, ws) ? ' on' : ''}"></i>`; }
    }
    return `<div class="mcal" data-ym="${ym}"><div class="mcal-grid${h.freq === 'weekly' ? ' weekly' : ''}">${out}</div></div>`;
  }
  function calHtml(h) {
    const cur = todayKey().slice(0, 7), b = calBounds(h), off = clamp(calOff[h.id] || 0, b.min, b.max), ym = ymAdd(cur, off);
    const slides = []; if (off > b.min) slides.push(ymAdd(ym, -1)); slides.push(ym); if (off < b.max) slides.push(ymAdd(ym, 1));
    const lbl = fmtDate(ym + '-01', ym.slice(0, 4) === cur.slice(0, 4) ? { month: 'long' } : { month: 'short', year: 'numeric' });
    const wd = t('weekdaysShort').split(',').map(s => s.charAt(0));
    return `<div class="cal-box" data-hid="${h.id}">
      <div class="cal-top"><button class="cal-nav" data-cal="-1" ${off <= b.min ? 'disabled' : ''} aria-label="${esc(t('ledgerPrev'))}">${ico('left')}</button><span class="cal-label">${esc(lbl.charAt(0).toUpperCase() + lbl.slice(1))}</span><button class="cal-nav" data-cal="1" ${off >= b.max ? 'disabled' : ''} aria-label="${esc(t('ledgerNext'))}">${ico('right')}</button></div>
      <div class="mcal-wd${h.freq === 'weekly' ? ' weekly' : ''}" aria-hidden="true">${wd.map(d => `<span>${esc(d)}</span>`).join('')}${h.freq === 'weekly' ? '<span></span>' : ''}</div>
      <div class="cal-swipe" data-hid="${h.id}" data-start="${slides.indexOf(ym)}">${slides.map(s => monthCal(h, s)).join('')}</div>
    </div>`;
  }
  // Coloca cada calendario en su mes (sin animación)
  function initCals(root) { $$('.cal-swipe', root).forEach(sw => { sw.scrollLeft = (+sw.dataset.start || 0) * sw.clientWidth; sw._ready = true; }); }
  function moveCal(hid, d) {
    const h = calSubj(hid); if (!h) return;
    const b = calBounds(h); calOff[hid] = clamp((calOff[hid] || 0) + d, b.min, b.max);
    $$(`.cal-box[data-hid="${hid}"]`).forEach(box => { const tmp = document.createElement('div'); tmp.innerHTML = calHtml(h).trim(); const n = tmp.firstElementChild; box.replaceWith(n); initCals(n.parentElement); });
  }
  /* v1.22: cambiar de mes deslizando con el dedo o arrastrando con el ratón (Calendario, Libreta y calendarios de los hábitos) */
  const SWIPE_ZONES = [['.tf-grid, .tf-year, .tf-week', '[data-tf="prev"]', '[data-tf="next"]', '.tf-grid, .tf-year, .tf-week'], ['.ledger-cal .cal', '[data-act="ledger-month"][data-d="-1"]', '[data-act="ledger-month"][data-d="1"]', '.ledger-cal .cal'], ['.ledger-day', '[data-act="ledger-dayshift"][data-d="-1"]', '[data-act="ledger-dayshift"][data-d="1"]', '.ledger-day']];
  let mSw = null, mSwBlock = false;
  document.addEventListener('pointerdown', e => {
    if (e.button || e.target.closest('input, select, textarea')) return;
    const cs = e.pointerType === 'mouse' && e.target.closest('.cal-swipe');
    if (cs) { mSw = { kind: 'cs', el: cs, x: e.clientX, y: e.clientY, sl: cs.scrollLeft, moved: false }; return; }
    if (TFS.quick && e.target.closest('.tf-zoom')) return; // v1.24: con la edición rápida, deslizar pinta
    if (e.target.closest('.swipe')) return; // las filas que se deslizan (borrar un movimiento) mandan sobre la zona
    const z = SWIPE_ZONES.find(([sel]) => e.target.closest(sel));
    if (z) mSw = { kind: 'zone', z, x: e.clientX, y: e.clientY, t: Date.now(), moved: false };
  }, true);
  document.addEventListener('pointermove', e => {
    if (!mSw) return;
    const dx = e.clientX - mSw.x, dy = e.clientY - mSw.y;
    if (!mSw.moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { mSw.moved = true; if (mSw.kind === 'cs') { mSw.el.style.scrollSnapType = 'none'; mSw.el.classList.add('dragging'); } }
    if (mSw.moved && mSw.kind === 'cs') mSw.el.scrollLeft = mSw.sl - dx;
  }, true);
  document.addEventListener('pointerup', e => {
    const g = mSw; mSw = null; if (!g || !g.moved) return;
    mSwBlock = true; setTimeout(() => { mSwBlock = false; }, 80);
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (g.kind === 'cs') {
      const el = g.el, w = el.clientWidth, start = Math.round(g.sl / w), to = Math.abs(dx) > w * .18 ? start + (dx < 0 ? 1 : -1) : start;
      el.classList.remove('dragging'); el.scrollTo({ left: clamp(to, 0, el.children.length - 1) * w, behavior: 'smooth' });
      setTimeout(() => { el.style.scrollSnapType = ''; }, 400);
      return;
    }
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    const [, prev, next, after] = g.z, btn = $(dx < 0 ? next : prev); if (!btn) return;
    mSwBlock = false; btn.click(); mSwBlock = true;
    const box = $(after); if (box) { box.classList.remove('slide-l', 'slide-r'); void box.offsetWidth; box.classList.add(dx < 0 ? 'slide-l' : 'slide-r'); }
  }, true);
  document.addEventListener('pointercancel', () => { if (mSw && mSw.kind === 'cs') { mSw.el.classList.remove('dragging'); mSw.el.style.scrollSnapType = ''; } mSw = null; }, true);
  window.addEventListener('click', e => { if (mSwBlock) { e.preventDefault(); e.stopPropagation(); mSwBlock = false; } }, true);
  /* v1.22: con el ratón, la rueda sube o baja el número del campo que estás editando */
  document.addEventListener('wheel', e => {
    const el = e.target.closest && e.target.closest('input[type="number"], input[inputmode="decimal"], input[inputmode="numeric"]');
    if (!el || el !== document.activeElement || el.disabled || el.readOnly) return;
    const raw = String(el.value || '').trim(), comma = raw.includes(',') || (!raw.includes('.') && state.lang === 'es' && el.type !== 'number');
    const v = Number(raw.replace(/\./g, comma ? '' : '.').replace(',', '.')) || 0;
    const step = Number(el.step) > 0 ? Number(el.step) : Number(el.dataset.step) > 0 ? Number(el.dataset.step) : (!Number.isInteger(v) && Math.abs(v) < 10 ? .1 : 1);
    let nv = Math.round((v + (e.deltaY < 0 ? step : -step)) * 1000) / 1000;
    if (el.min !== '' && nv < Number(el.min)) nv = Number(el.min);
    if (el.max !== '' && nv > Number(el.max)) nv = Number(el.max);
    if (!(el.type === 'number' || el.min !== '') && nv < 0 && v >= 0) nv = 0;
    e.preventDefault();
    el.value = el.type === 'number' ? String(nv) : (comma ? String(nv).replace('.', ',') : String(nv));
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  }, { passive: false });
  // Al terminar de deslizar, el mes que queda a la vista pasa a ser el actual de ese calendario
  const calTimers = new WeakMap();
  document.addEventListener('scroll', e => {
    const sw = e.target; if (!sw.classList || !sw.classList.contains('cal-swipe') || !sw._ready) return;
    clearTimeout(calTimers.get(sw));
    calTimers.set(sw, setTimeout(() => {
      if (!sw.isConnected || !sw.clientWidth) return;
      const idx = Math.round(sw.scrollLeft / sw.clientWidth), start = +sw.dataset.start || 0;
      if (idx !== start && Math.abs(sw.scrollLeft - idx * sw.clientWidth) < 4) moveCal(sw.dataset.hid, idx - start);
    }, 90));
  }, true);

  function refreshHabit(id, pop = false) {
    const h = getHabit(id); const els = $$(`.habit[data-id="${id}"]`);
    if (!h || !els.length) return render();
    els.forEach(el => {
      const tmp = document.createElement('div'); tmp.innerHTML = habitCard(h).trim();
      const n = tmp.firstElementChild; el.replaceWith(n); initCals(n);
      if (pop) n.classList.add('pop');
    });
    $$('.folder[data-pid]').forEach(f => { const p = state.projects.find(x => x.id === f.dataset.pid); if (p && p.habitIds.includes(id)) { const tmp = document.createElement('div'); tmp.innerHTML = folderCard(p).trim(); f.replaceWith(tmp.firstElementChild); } });
  }

  /* ---------- editor de hábito ---------- */
  function openHabitEditor(h = null) {
    if (!h && !gateAdd('habits', activeHabitCount())) return;
    const isNew = !h;
    const f = h ? { kind: 'build', days: [0, 1, 2, 3, 4, 5, 6], ...h } : { kind: 'build', name: '', icon: '#', color: null, freq: 'daily', target: 1, multi: false, note: '', days: [0, 1, 2, 3, 4, 5, 6] };
    f.days = [...(f.days || [0, 1, 2, 3, 4, 5, 6])];
    f.measure = f.measure || 'count'; f.timeOfDay = f.timeOfDay || 'any'; f.duration = +f.duration || 0; f.step = +f.step || 1; f.unit = f.unit || '';
    f.chDays = h && h.challenge && !h.challenge.done ? h.challenge.days : 0;
    f.remOn = !!(h && h.reminder && h.reminder.on); f.remTime = (h && h.reminder && h.reminder.time) || ''; f.share = false;
    // v1.23: cómo se cumple (simple, varios objetivos o varias maneras) y Continuidad al cambiar la regla
    f.mode = ['goals', 'ways'].includes(f.mode) ? f.mode : 'simple'; f.goals = (f.goals || []).map(g => ({ ...g })); f.ways = (f.ways || []).map(w => ({ ...w })); f.cont = true;
    // v1.25: proyectos del hábito (moverlo o sacarlo). Uno nuevo creado dentro de un proyecto abierto va a ese proyecto
    const projList = () => state.projects.filter(p => !p.archived || (h && p.habitIds.includes(h.id)));
    const fo = isNew && openFolder();
    f.projs = h ? state.projects.filter(p => p.habitIds.includes(h.id)).map(p => p.id) : fo ? [fo.id] : [];
    if (f.mode === 'goals' && !f.goals.length) f.goals = [{ id: uid(), name: '', target: 1 }];
    if (f.mode === 'ways' && !f.ways.length) f.ways = [{ id: uid(), name: '' }];
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
        ${f.measure !== 'amount' ? `<div class="field"><span>${esc(t('subModeLbl'))}</span>
          <div class="seg">${[['simple', 'subSimple'], ['goals', 'subGoals'], ['ways', 'subWays']].map(([v, k]) => `<button type="button" data-hmode="${v}" class="${f.mode === v ? 'on' : ''}" aria-pressed="${f.mode === v}">${esc(t(k))}</button>`).join('')}</div>
          <div class="muted small">${esc(t('subHint_' + f.mode))}</div>
          ${f.mode === 'goals' ? `<div class="stack sub-edit" style="gap:8px">${f.goals.map(g => `<div class="sub-req-item" data-gid="${esc(g.id)}"><div class="row" style="gap:8px"><input class="input grow" data-g-name maxlength="40" value="${esc(g.name)}" placeholder="${esc(t('subGoalPh'))}" aria-label="${esc(t('subGoalName'))}"><button type="button" class="icon-btn sm" data-g-del="${esc(g.id)}" aria-label="${esc(t('delete'))}">${ico('x')}</button></div>${reqEdit(g, true)}</div>`).join('')}<button type="button" class="chip" data-g-add style="align-self:flex-start">${ico('plus')} ${esc(t('subAddGoal'))}</button></div>` : ''}
          ${f.mode === 'ways' ? `<div class="stack sub-edit" style="gap:8px">${f.ways.map(g => `<div class="sub-req-item" data-wid="${esc(g.id)}"><div class="row" style="gap:8px"><input class="input grow" data-w-name maxlength="40" value="${esc(g.name)}" placeholder="${esc(t('subWayPh'))}" aria-label="${esc(t('subWayName'))}"><button type="button" class="icon-btn sm" data-w-del="${esc(g.id)}" aria-label="${esc(t('delete'))}">${ico('x')}</button></div>${reqEdit(g, false)}</div>`).join('')}<button type="button" class="chip" data-w-add style="align-self:flex-start">${ico('plus')} ${esc(t('subAddWay'))}</button></div>` : ''}
        </div>` : ''}
        <div class="field ${f.mode === 'goals' && f.measure !== 'amount' ? 'hidden' : ''}"><span>${esc(t('habitFreq'))}</span>
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
        </div>` : f.mode === 'goals' ? '' : `<div class="field"><span>${esc(t(f.mode === 'ways' ? 'subWaysTarget' : 'habitTarget'))}</span>
          <div class="stepper"><button type="button" class="icon-btn sm" data-step="-1" aria-label="-1">${ico('minus')}</button><input class="input" id="hf-target" type="number" min="1" inputmode="numeric" value="${f.target}"><button type="button" class="icon-btn sm" data-step="1" aria-label="+1">${ico('plus')}</button></div>
          <div class="muted small">${esc(t('habitTargetHint', { period }))}</div>
        </div>
        ${f.mode !== 'simple' ? '' : `<label class="row" style="gap:14px"><span class="switch"><input type="checkbox" id="hf-multi" ${f.multi || forcedMulti ? 'checked' : ''} ${forcedMulti ? 'disabled' : ''}><span></span></span><span class="grow"><b>${esc(t('habitMulti'))}</b><br><span class="muted small">${esc(t('habitMultiHint'))}</span></span></label>`}`}
        <label class="field"><span>⏱ ${esc(t('habitDuration'))}</span><input class="input" id="hf-dur" type="number" min="0" max="600" inputmode="numeric" value="${f.duration || ''}" placeholder="${esc(t('habitDurationPh'))}" style="max-width:200px"></label>
        </div>
        <div class="field"><span>${esc(t('timeOfDay'))}</span><div class="seg" style="flex-wrap:wrap">${TOD.map(x => `<button type="button" data-tod="${x}" class="${f.timeOfDay === x ? 'on' : ''}">${TOD_ICON[x]} ${esc(t('tod_' + x))}</button>`).join('')}</div></div>
        <label class="field"><span>🏁 ${esc(t('habitChallenge'))}</span><input class="input" id="hf-ch" type="number" min="0" max="1000" inputmode="numeric" value="${f.chDays || ''}" placeholder="${esc(t('habitChallengePh'))}" style="max-width:200px">
          ${h && h.challenge && !h.challenge.done ? `<span class="muted small">${esc(t('challengeProgressTxt', { a: challengeProgress(h), b: h.challenge.days, d: fmtShort(h.challenge.start) }))}</span>` : ''}</label>
        ${!quit ? `<div class="field"><span>🔔 ${esc(t('remindTitle'))}</span>
          <label class="row" style="gap:14px"><span class="switch"><input type="checkbox" id="hf-rem" ${f.remOn ? 'checked' : ''}><span></span></span><span class="grow muted small">${esc(t('remindHint'))}</span></label>
          <input class="input ${f.remOn ? '' : 'hidden'}" id="hf-rem-time" type="time" value="${esc(f.remTime)}" style="max-width:160px"></div>` : ''}
        ${h && h.groupId ? `<button type="button" class="chip" data-hm="group">👥 ${esc(t('groupOpen'))}</button>`
          : `<label class="row" style="gap:14px"><span class="switch"><input type="checkbox" id="hf-share" ${f.share ? 'checked' : ''}><span></span></span><span class="grow"><b>👥 ${esc(t('shareWithFriends'))}</b><br><span class="muted small">${esc(t(auth ? 'shareWithFriendsHint' : 'groupNeedLogin'))}</span></span></label>`}
        ${projList().length ? `<div class="field"><span>${ico('folder', 'xs')} ${esc(t('hProjects'))}</span><div class="row wrap" style="gap:6px">${projList().map(p => `<button type="button" class="calc-toggle ${f.projs.includes(p.id) ? 'on' : ''}" data-hproj="${esc(p.id)}" aria-pressed="${f.projs.includes(p.id)}">${esc(p.icon || '')} ${esc(p.name)}</button>`).join('')}</div><div class="muted small">${esc(t('hProjectsHint'))}</div></div>` : ''}
        <label class="row" style="gap:14px"><span class="switch"><input type="checkbox" id="hf-hidecal" ${f.hideCal ? 'checked' : ''}><span></span></span><span class="grow"><b>${esc(t('hideCal'))}</b><br><span class="muted small">${esc(t('hideCalHint'))}</span></span></label>
        ${!isNew && !quit ? `<label class="row" style="gap:14px"><span class="switch"><input type="checkbox" id="hf-cont" ${f.cont ? 'checked' : ''}><span></span></span><span class="grow"><b>${ico('branch', 'xs')} ${esc(t('contTitle'))}</b><br><span class="muted small">${esc(t('contHint'))}</span></span></label>` : ''}
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
      if ($('#hf-target', w)) f.target = f.measure === 'amount' ? Math.max(.01, parseFloat($('#hf-target', w).value) || 1) : Math.max(1, parseInt($('#hf-target', w).value, 10) || 1);
      f.note = $('#hf-note', w).value.trim();
      const mu = $('#hf-multi', w); if (mu && !mu.disabled) f.multi = mu.checked;
      if ($('#hf-unit', w)) { f.unit = $('#hf-unit', w).value.trim(); f.step = Math.max(.01, parseFloat($('#hf-stepv', w).value) || 1); }
      f.duration = Math.max(0, parseInt($('#hf-dur', w).value, 10) || 0);
      f.chDays = Math.max(0, parseInt($('#hf-ch', w).value, 10) || 0);
      if ($('#hf-rem', w)) { f.remOn = $('#hf-rem', w).checked; f.remTime = $('#hf-rem-time', w).value; }
      if ($('#hf-share', w)) f.share = $('#hf-share', w).checked;
      f.hideCal = $('#hf-hidecal', w).checked;
      const readReq = (g, r) => { const n = sel => { const i = $(sel, r); return i ? Number(String(i.value).replace(',', '.')) || 0 : 0; }; g.target = clamp(Math.round(n('[data-r-tg]')) || 1, 1, 99); g.min = clamp(Math.round(n('[data-r-min]')) || 0, 0, g.target); g.amt = Math.max(0, Math.min(1e6, n('[data-r-amt]'))); g.unit = (($('[data-r-unit]', r) || {}).value || '').trim().slice(0, 12); };
      $$('[data-gid]', w).forEach(r => { const g = f.goals.find(x => x.id === r.dataset.gid); if (g) { g.name = $('[data-g-name]', r).value.trim(); readReq(g, r); } });
      $$('[data-wid]', w).forEach(r => { const g = f.ways.find(x => x.id === r.dataset.wid); if (g) { g.name = $('[data-w-name]', r).value.trim(); readReq(g, r); } });
      if ($('#hf-cont', w)) f.cont = $('#hf-cont', w).checked;
    };
    let hw = null;
    const guard = unsavedGuard(() => { if (hw && $('#hf-name', hw)) readInputs(hw); return JSON.stringify(f); });
    openModal({
      title: esc(isNew ? t('newHabit') : t('editHabit')),
      body: '<div id="hf"></div>',
      foot: `<button class="btn" data-m="x">${esc(t('cancel'))}</button><button class="btn primary" data-m="save">${esc(t('save'))}</button>`,
      beforeClose: w => guard.check(w),
      onMount: w => { draw(w); hw = w; guard.start(); if (isNew) setTimeout(() => $('#hf-name', w)?.focus(), 250); },
      onInput: (e, w) => {
        if (e.target.id === 'hf-color') { f.color = e.target.value; $$('.sw', w).forEach(s => s.classList.remove('on')); }
        if (e.target.id === 'hf-icon') { $$('[data-emoji]', w).forEach(b => b.classList.toggle('on', b.dataset.emoji === e.target.value.trim())); }
        if (e.target.id === 'hf-rem') $('#hf-rem-time', w).classList.toggle('hidden', !e.target.checked);
      },
      onClick: async (e, close, w) => {
        const q = s => e.target.closest(s);
        let el;
        if ((el = q('[data-hproj]'))) { readInputs(w); const id = el.dataset.hproj; f.projs = f.projs.includes(id) ? f.projs.filter(x => x !== id) : [...f.projs, id]; draw(w); return; }
        if ((el = q('[data-emoji]'))) { readInputs(w); f.icon = el.dataset.emoji; draw(w); return; }
        if ((el = q('[data-color]'))) { readInputs(w); f.color = el.dataset.color || null; draw(w); return; }
        if ((el = q('[data-freq]'))) { readInputs(w); f.freq = el.dataset.freq; draw(w); return; }
        if ((el = q('[data-kind]'))) { readInputs(w); f.kind = el.dataset.kind; draw(w); return; }
        if ((el = q('[data-measure]'))) { readInputs(w); f.measure = el.dataset.measure; if (f.measure === 'amount' && f.target === 1 && !f.unit) f.target = 1; draw(w); return; }
        if ((el = q('[data-tod]'))) { readInputs(w); f.timeOfDay = el.dataset.tod; draw(w); return; }
        if ((el = q('[data-hmode]'))) { readInputs(w); f.mode = el.dataset.hmode; if (f.mode === 'goals' && !f.goals.length) f.goals.push({ id: uid(), name: '', target: 1 }); if (f.mode === 'ways' && !f.ways.length) f.ways.push({ id: uid(), name: '' }); draw(w); return; }
        if (q('[data-g-add]')) { readInputs(w); if (f.goals.length < 10) f.goals.push({ id: uid(), name: '', target: 1 }); draw(w); setTimeout(() => { const l = [...$$('[data-g-name]', w)].pop(); if (l) l.focus(); }, 0); return; }
        if (q('[data-w-add]')) { readInputs(w); if (f.ways.length < 20) f.ways.push({ id: uid(), name: '' }); draw(w); setTimeout(() => { const l = [...$$('[data-w-name]', w)].pop(); if (l) l.focus(); }, 0); return; }
        if ((el = q('[data-g-del]'))) { readInputs(w); f.goals = f.goals.filter(x => x.id !== el.dataset.gDel); draw(w); return; }
        if ((el = q('[data-w-del]'))) { readInputs(w); f.ways = f.ways.filter(x => x.id !== el.dataset.wDel); draw(w); return; }
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
          if (act === 'archive') { if (h.archived && !gateAdd('habits', activeHabitCount())) return; h.archived = !h.archived; delete h.planArch; save(); close(); render(); }
          if (act === 'group') { close(); openGroup(h.groupId); return; }
          if (act === 'link') {
            const url = `${APP_URL}?check=${h.id}`;
            openModal({
              title: `🔗 ${esc(t('shortcutLink'))}`,
              body: `<p class="muted" style="margin-top:0">${esc(t('shortcutHelp'))}</p><input class="input" readonly value="${esc(url)}" id="sc-url"><ol class="small muted" style="padding-left:18px;line-height:1.6">${t('shortcutSteps').split('|').map(s => `<li>${esc(s)}</li>`).join('')}</ol>`,
              foot: `<button class="btn primary block" data-m="copy">${esc(t('copy'))}</button>`,
              onClick: async (ev, cl, ww) => { if (ev.target.closest('[data-m="copy"]')) { try { await navigator.clipboard.writeText(url); toast(t('copied')); } catch (err) { $('#sc-url', ww).select(); } } }
            });
          }
          if (act === 'delete' && await confirmDialog(t('deleteHabitQ', { name: h.name }))) {
            close(); deleteHabit(h);
          }
          return;
        }
        if (q('[data-m="save"]')) {
          readInputs(w);
          if (!f.name) { toast(t('habitNeedName')); $('#hf-name', w).focus(); return; }
          if (f.kind === 'quit') Object.assign(f, { freq: 'daily', target: 1, multi: false, measure: 'count', duration: 0 });
          if (f.remOn && !f.remTime) { toast(t('remindNeedTime')); return; }
          // v1.23: objetivos y maneras (sin nombre no cuentan). Con objetivos el hábito es diario y su meta = nº de objetivos
          let mode = f.kind === 'quit' || f.measure === 'amount' ? 'simple' : f.mode;
          const reqX = g => ({ ...(+g.min > 0 ? { min: +g.min } : {}), ...(+g.amt > 0 ? { amt: +g.amt, unit: g.unit || '' } : {}) });
          const goals = f.goals.filter(g => g.name).map(g => ({ id: g.id, name: g.name.slice(0, 40), target: clamp(+g.target || 1, 1, 99), ...reqX(g) })), ways = f.ways.filter(g => g.name).map(g => ({ id: g.id, name: g.name.slice(0, 40), ...(+g.target > 1 ? { target: +g.target } : {}), ...reqX(g) }));
          if (mode === 'goals' && !goals.length) { toast(t('subNeedGoal')); return; }
          if (mode === 'ways' && ways.length < 2) { toast(t('subNeedWays')); return; }
          if (mode === 'goals') Object.assign(f, { freq: 'daily', target: goals.length, multi: false });
          const props = { kind: f.kind, name: f.name, icon: f.icon, color: f.color, freq: f.freq, target: f.target, multi: f.multi, note: f.note, days: f.days, measure: f.measure, unit: f.unit, step: f.step, timeOfDay: f.timeOfDay, duration: f.duration, hideCal: f.hideCal || undefined, reminder: { on: !!f.remOn && f.kind !== 'quit', time: f.remTime || '' },
            mode: mode === 'simple' ? undefined : mode, goals: mode === 'goals' ? goals : undefined, ways: mode === 'ways' ? ways : undefined };
          // Reto: se conserva la fecha de inicio si solo cambian los días
          const oldCh = h && h.challenge;
          if (f.chDays > 0) props.challenge = oldCh && !oldCh.done ? { ...oldCh, days: f.chDays } : { tid: 'custom', days: f.chDays, start: todayKey() };
          else props.challenge = oldCh && oldCh.done ? oldCh : undefined;
          let target = h;
          if (isNew && !gateAdd('habits', activeHabitCount())) return;
          if (isNew) {
            target = { id: uid(), ...props, autoColor: HABIT_COLORS[state.colorSeq++ % HABIT_COLORS.length], createdAt: todayKey(), archived: false };
            state.habits.push(target);
          } else {
            // Continuidad: si cambia la regla, los días pasados se quedan con la anterior (hasta hoy, sin incluirlo)
            const ruleOf = x => JSON.stringify(RULE_KEYS.map(k => x[k] ?? null)), today = todayKey(), changed = ruleOf(h) !== ruleOf(props);
            if (changed && f.cont) {
              const past = (h.past || []).filter(p => p.until < today), last = (h.past || []).find(p => p.until === today);
              past.push(last || { until: today, ...Object.fromEntries(RULE_KEYS.filter(k => h[k] != null).map(k => [k, JSON.parse(JSON.stringify(h[k]))])) });
              h.past = past;
            } else if (changed) delete h.past;
            Object.assign(h, props);
            for (const k of ['mode', 'goals', 'ways']) if (props[k] === undefined) delete h[k];
            if (changed) recountSubs(h, f.cont ? today : '');
            if (!props.challenge) delete h.challenge;
            if (!props.hideCal) delete h.hideCal;
            checkPerfectMastery(true); checkChallenge(h);
          }
          setHabitProjects(target, f.projs);
          save(); close();
          if (state.ui.tab !== 'habits') state.ui.tab = 'habits';
          render(); toast(t('saved'));
          // Recordatorio: si aún no hay notificaciones en este dispositivo, se piden ahora (el toque de Guardar lo permite)
          if (props.reminder.on && (await pushStatus()) !== 'on') enablePush();
          if (f.share && !target.groupId) shareAsGroup('habit', target);
        }
      }
    });
  }

  // v1.25: deja el hábito exactamente en estos proyectos (lo saca de los demás)
  function setHabitProjects(h, ids) {
    for (const p of state.projects) {
      const has = p.habitIds.includes(h.id), want = ids.includes(p.id);
      if (want && !has) p.habitIds.push(h.id);
      else if (!want && has) p.habitIds = p.habitIds.filter(x => x !== h.id);
    }
  }

  /* ---------- v1.23: objetivos o maneras de un día ----------
     Objetivos: cada uno con sus veces (sublogs = { id: veces }); el registro del día = nº de objetivos cumplidos y el hábito
     se cumple con todos. Maneras: se marca cuál hiciste (sublogs = { id: 1 }); el registro = nº de maneras hechas. */
  const subOf = (h, k) => ((state.sublogs || {})[h.id] || {})[k] || {};
  /* v1.25: cada requisito (objetivo o manera) puede tener un mínimo de veces (cuenta al llegar a él), un objetivo de veces (lo ideal)
     y una cantidad con unidad que hay que alcanzar en CADA vez (amt + unit); la suma de lo apuntado va en S[id + '~a'].
     Sin mínimo: en objetivos es su objetivo de veces y en maneras, 1. */
  const reqTg = (g, goals) => clamp(+g.target || 1, 1, 99);
  const reqMin = (g, goals) => clamp(+g.min || (goals ? reqTg(g, goals) : 1), 1, 99);
  const reqRich = (g, goals) => +g.amt > 0 || reqMin(g, goals) > 1 || reqTg(g, goals) > 1;
  // Editor: segunda línea de cada requisito (mínimo, objetivo de veces, cantidad por vez y unidad)
  const reqEdit = (g, goals) => `<div class="row wrap sub-req" style="gap:6px;margin-top:6px">${[['tg', goals ? 'subReqTarget' : 'subReqTargetW', +g.target || 1, 1], ['min', 'subReqMin', +g.min || '', 0]].map(([k, l, v, mn]) => `<label class="mini-f"><span>${esc(t(l))}</span><input class="input" data-r-${k} type="number" min="${mn}" max="99" inputmode="numeric" value="${v}" placeholder="${k === 'min' ? (goals ? +g.target || 1 : 1) : ''}"></label>`).join('')}<label class="mini-f"><span>${esc(t('subReqAmt'))}</span><input class="input" data-r-amt inputmode="decimal" value="${+g.amt > 0 ? esc(String(g.amt).replace('.', ',')) : ''}" placeholder="—"></label><label class="mini-f grow"><span>${esc(t('subReqUnit'))}</span><input class="input" data-r-unit maxlength="12" value="${esc(g.unit || '')}" placeholder="${esc(t('subReqUnitPh'))}"></label></div>`;
  const subCount = (h, k, S = subOf(h, k), r = ruleAt(h, k)) => r.mode === 'goals' ? (r.goals || []).filter(g => (+S[g.id] || 0) >= reqMin(g, true)).length : (r.ways || []).filter(w => (+S[w.id] || 0) >= reqMin(w, false)).length;
  function setSub(h, k, S) {
    const all = state.sublogs || (state.sublogs = {}), H = all[h.id] || (all[h.id] = {});
    const clean = {}; for (const [id, v] of Object.entries(S)) if (+v > 0) clean[id] = +v;
    if (Object.keys(clean).length) H[k] = clean; else delete H[k];
    setCount(h, k, subCount(h, k, clean));
  }
  // Sin Continuidad: se recalcula el registro de cada día con los objetivos o maneras de ahora
  function recountSubs(h, from = '') { for (const k of Object.keys(((state.sublogs || {})[h.id]) || {})) { if (k < from || !subModeAt(h, k)) continue; const v = subCount(h, k); const L = state.logs[h.id] || (state.logs[h.id] = {}); if (v) L[k] = v; else delete L[k]; } }
  function subMeta(h, k = todayKey()) {
    const r = ruleAt(h, k), S = subOf(h, k);
    if (r.mode === 'goals') return t('subGoalsN', { a: subCount(h, k), b: (r.goals || []).length });
    const done = (r.ways || []).filter(w => (+S[w.id] || 0) >= reqMin(w, false)).map(w => w.name);
    return done.length ? done.join(', ') : t('subWaysPick');
  }
  function openSubDay(h, k) {
    if (k > todayKey()) return;
    const r = ruleAt(h, k), goals = r.mode === 'goals';
    let wref, ask = '';
    const num = v => String(Math.round(v * 100) / 100).replace('.', ',');
    const draw = () => {
      const S = subOf(h, k), list = goals ? r.goals : r.ways;
      $('#sd', wref).innerHTML = `<p class="muted small" style="margin-top:0">${esc(t(goals ? 'subGoalsHint' : 'subWaysHint', { n: r.target || 1 }))}</p><div class="stack" style="gap:10px">${list.map(g => {
        const v = +S[g.id] || 0;
        if (goals || reqRich(g, goals)) {
          const tg = reqTg(g, goals), mn = reqMin(g, goals), ok = v >= mn, amt = +g.amt || 0, tot = +S[g.id + '~a'] || 0;
          const info = [`${v}/${tg}`, mn < tg ? t('subReqMinN', { n: mn }) : '', amt ? t('subReqEach', { a: num(amt), u: g.unit || '' }) : '', amt && tot ? t('subReqTotal', { a: num(tot), u: g.unit || '' }) : ''].filter(Boolean).join(' · ');
          return `<div class="sub-row clay ${ok ? 'done' : ''}" style="flex-wrap:wrap"><span class="sub-ck" aria-hidden="true">${ok ? ico('check') : ''}</span><span class="grow"><b>${esc(g.name)}</b><br><span class="muted small">${esc(info)}</span></span><div class="stepper"><button type="button" class="icon-btn sm" data-sd="-1" data-id="${esc(g.id)}" aria-label="−1">${ico('minus')}</button><button type="button" class="icon-btn sm" data-sd="1" data-id="${esc(g.id)}" aria-label="+1">${ico('plus')}</button></div>
            ${ask === g.id ? `<div class="row" style="gap:8px;width:100%;margin-top:8px"><input class="input grow" data-sd-amt inputmode="decimal" placeholder="${esc(t('subReqAsk', { u: g.unit || '' }))}"><button type="button" class="btn sm primary" data-sd-ok="${esc(g.id)}">${esc(t('add'))}</button></div>` : ''}</div>`;
        }
        return `<button type="button" class="sub-row clay ${v ? 'done' : ''}" data-sw="${esc(g.id)}" aria-pressed="${!!v}"><span class="sub-ck" aria-hidden="true">${v ? ico('check') : ''}</span><span class="grow"><b>${esc(g.name)}</b></span></button>`;
      }).join('')}</div>
      <p class="center" style="margin:14px 0 0"><b class="${periodDone(h, k) ? 'amt-in' : 'muted'}">${esc(periodDone(h, k) ? t('subDone') : t('subNotYet'))}</b></p>`;
    };
    openModal({
      title: `${esc(h.icon || '')} ${esc(h.name)}`, body: `<p class="muted small" style="margin:0 0 10px">${esc(fmtDate(k, { weekday: 'long', day: 'numeric', month: 'long' }))}</p><div id="sd"></div>`,
      foot: `<button class="btn primary block" data-m="x">${esc(t('done'))}</button>`,
      onMount: w => { wref = w; draw(); },
      onClose: () => { refreshHabit(h.id); render(); },
      onClick: e => {
        let el; const S = { ...subOf(h, k) };
        if ((el = e.target.closest('[data-sd]'))) {
          const g = (goals ? r.goals : r.ways).find(x => x.id === el.dataset.id); if (!g) return;
          const v = +S[g.id] || 0, d = +el.dataset.sd;
          // Con cantidad por vez, sumar una vez pide cuánto fue; quitar una vez resta la media apuntada
          if (d > 0 && +g.amt > 0) { ask = ask === g.id ? '' : g.id; draw(); const i = $('[data-sd-amt]', wref); if (i) i.focus(); return; }
          if (d < 0 && v && S[g.id + '~a']) S[g.id + '~a'] = Math.max(0, S[g.id + '~a'] - S[g.id + '~a'] / v);
          S[g.id] = clamp(v + d, 0, 99); setSub(h, k, S); vibrate(8); draw(); return;
        }
        if ((el = e.target.closest('[data-sd-ok]'))) {
          const g = (goals ? r.goals : r.ways).find(x => x.id === el.dataset.sdOk); if (!g) return;
          const a = Number(String(($('[data-sd-amt]', wref) || {}).value || '').replace(',', '.')) || 0;
          if (!(a > 0)) { toast(t('subReqNeedAmt')); return; }
          if (a < +g.amt) { toast(t('subReqShort', { a: num(+g.amt), u: g.unit || '' })); return; }
          S[g.id] = clamp((+S[g.id] || 0) + 1, 0, 99); S[g.id + '~a'] = Math.round(((+S[g.id + '~a'] || 0) + a) * 100) / 100; ask = '';
          setSub(h, k, S); vibrate(8); sfx('tap'); draw(); return;
        }
        if ((el = e.target.closest('[data-sw]'))) { const id = el.dataset.sw; if (S[id]) delete S[id]; else S[id] = 1; setSub(h, k, S); vibrate(8); draw(); }
      }
    });
  }

  /* ---------- editor de un día concreto ---------- */
  function openDay(h, k) {
    if (isAmount(h)) { openAmount(h, k); return; }
    if (subModeAt(h, k)) { openSubDay(h, k); return; }
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
      <div class="muted small" style="font-weight:var(--fw-label);text-transform:uppercase;letter-spacing:.04em">${esc(t(quit ? 'relapsesDay' : 'dayCount'))}</div>
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

  // Con reto activo se ve la probabilidad de conseguirlo; sin reto, un estado de 0/10 (nulo) a 10/10 (excelente)
  function projStatus(p, s = projectStats(p)) {
    const rs = projHabits(p).map(h => rate(h, 14)).filter(r => r != null);
    const A = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null;
    return clamp(Math.round((A == null ? s.G : .7 * A + .3 * s.G) * 10), 0, 10);
  }
  function statusBadge(p, s = projectStats(p)) {
    if (p.deadline && !s.achieved) return `<span class="prob-badge" title="${esc(t('probability'))}"><b>${s.P}%</b><span>${esc(t('probability').split(' ')[0])}</span></span>`;
    const n = s.achieved ? 10 : projStatus(p, s);
    return `<span class="prob-badge status s${n}" title="${esc(t('statusHint'))}"><b>${n}/10</b><span>${esc(t('statusLabel'))}</span></span>`;
  }
  // Al acabar el plazo de un reto: pregunta que no se puede omitir (¿lo has conseguido?) y después si se repite
  let retoAsking = false;
  function checkRetos() {
    if (retoAsking || !state.onboarded) return;
    const today = todayKey(), p = state.projects.find(x => x.deadline && x.deadline < today && !projectStats(x).achieved);
    if (!p) return;
    retoAsking = true;
    const from = p.retoFrom || p.createdAt || today, to = p.deadline, days = Math.max(1, diffDays(from, to));
    whenFree(() => openModal({
      title: `🏁 ${esc(t('retoEndTitle'))}`, dismissable: false,
      body: `<div class="center"><div style="font-size:52px">${esc(p.icon || '🎯')}</div><h2 style="margin:6px 0">${esc(p.name)}</h2>
        <p class="muted" style="margin:0 0 14px">${esc(t('retoEndSub', { from: fmtDate(from), to: fmtDate(to) }))}</p><p style="margin:0"><b>${esc(t('retoEndQ'))}</b></p></div>`,
      foot: `<button class="btn" data-r="0">❌ ${esc(t('retoNo'))}</button><button class="btn primary" data-r="1">🏆 ${esc(t('retoYes'))}</button>`,
      onClick: (e, close) => {
        const b = e.target.closest('[data-r]'); if (!b) return;
        const ok = b.dataset.r === '1';
        p.retoLog = [...(p.retoLog || []), { from, to, ok, at: today }]; p.deadline = null; p.retoFrom = null; save(); close();
        sfx(ok ? 'levelup' : 'undo'); vibrate(ok ? [20, 40, 20] : 15);
        setTimeout(() => openModal({
          title: `🔁 ${esc(t('retoRepeatQ'))}`,
          body: `<p class="muted" style="margin-top:0">${esc(t(ok ? 'retoWellDone' : 'retoNextTime'))} ${esc(t('retoRepeatSub', { n: days }))}</p>`,
          foot: `<button class="btn" data-x="0">${esc(t('retoRepeatNo'))}</button><button class="btn primary" data-x="1">${esc(t('retoRepeatYes', { n: days }))}</button>`,
          onClick: (e2, close2) => { const x = e2.target.closest('[data-x]'); if (!x) return; if (x.dataset.x === '1') { p.retoFrom = today; p.deadline = addDays(today, days); save(); toast(t('retoRepeated', { date: fmtDate(p.deadline) })); } close2(); },
          onClose: () => { retoAsking = false; render(); setTimeout(checkRetos, 500); }
        }), 320);
      }
    }));
  }
  function deadlineText(p, s) {
    if (!p.deadline) return t('noReto');
    if (s.daysLeft < 0) return t('overdue', { n: -s.daysLeft });
    return s.daysLeft === 1 ? t('dayLeft') : t('daysLeft', { n: s.daysLeft });
  }

  function projCard(p) {
      const s = projectStats(p); const c = p.color || 'var(--accent)';
      return `<button class="proj clay" data-act="proj-open" data-id="${p.id}" style="--h:${c}">
        <div class="proj-top">
          <div class="habit-ico" style="--h-soft:var(--surface-2)">${esc(p.icon || '🎯')}</div>
          <div class="grow"><h3>${esc(p.name)}${p.groupId ? ' <span class="grp-chip" data-group="' + p.groupId + '">👥</span>' : ''}</h3><div class="muted small" style="font-weight:var(--fw-label)">${esc(s.achieved ? t('achieved') : deadlineText(p, s))}</div></div>
          ${statusBadge(p, s)}
        </div>
        <div class="bar ${s.G ? '' : 'zero'}" style="margin-top:14px"><i style="width:${Math.round(s.G * 100)}%"></i></div>
        <div class="row" style="justify-content:space-between;margin-top:6px"><span class="muted small" style="font-weight:var(--fw-label)">${esc(t('progress'))} ${Math.round(s.G * 100)}%</span>${p.goal.type === 'numeric' ? `<span class="small" style="font-weight:var(--fw-num)">${fmtNum(s.cur)} / ${fmtNum(p.goal.target)} ${esc(p.goal.unit)}</span>` : ''}</div>
        ${s.hs.length ? `<div class="linked">${s.hs.map(h => `<span>${esc(h.icon)} ${esc(h.name)}</span>`).join('')}</div>` : ''}
      </button>`;
  }

  function openProjectEditor(p = null, preset = null) {
    if (!p && !gateAdd('projects', state.projects.length)) return;
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
        <div class="field reto-field ${f.deadline ? 'on' : ''}">
          <label class="row" style="gap:14px"><span class="switch"><input type="checkbox" data-dl ${f.deadline ? 'checked' : ''}><span></span></span><span class="grow"><b>🏁 ${esc(t('retoMake'))}</b><br><span class="muted small">${esc(t('retoMakeHint'))}</span></span></label>
          ${f.deadline ? `<div class="row wrap" style="gap:8px;margin-top:10px">${[[7, 'retoWeek'], [30, 'retoMonth'], [90, 'reto3Months']].map(([d, k]) => `<button type="button" class="chip ${f.deadline === addDays(f.retoFrom || todayKey(), d) ? 'on' : ''}" data-reto-days="${d}">${esc(t(k))}</button>`).join('')}</div>
            <label class="field" style="margin-top:10px"><span>${esc(t('retoEnds'))}</span><input class="input" id="pf-deadline" type="date" min="${addDays(todayKey(), 1)}" value="${f.deadline}"></label>` : ''}
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
        <label class="row" style="gap:14px"><span class="switch"><input type="checkbox" id="pf-hidecal" ${f.hideCal ? 'checked' : ''}><span></span></span><span class="grow"><b>${esc(t('hideCal'))}</b><br><span class="muted small">${esc(t('hideCalHintP'))}</span></span></label>
        ${f.groupId ? '' : `<label class="row" style="gap:14px"><span class="switch"><input type="checkbox" id="pf-share" ${f.share ? 'checked' : ''}><span></span></span><span class="grow"><b>👥 ${esc(t('shareWithFriends'))}</b><br><span class="muted small">${esc(t(auth ? 'shareProjectHint' : 'groupNeedLogin'))}</span></span></label>`}
      </div>`;
    };
    const readInputs = w => {
      f.name = $('#pf-name', w).value.trim(); f.desc = $('#pf-desc', w).value.trim();
      if ($('#pf-share', w)) f.share = $('#pf-share', w).checked;
      if ($('#pf-hidecal', w)) { f.hideCal = $('#pf-hidecal', w).checked; if (!f.hideCal) delete f.hideCal; }
      if ($('#pf-start', w)) { f.goal.start = parseFloat($('#pf-start', w).value) || 0; f.goal.target = parseFloat($('#pf-target', w).value) || 0; f.goal.unit = $('#pf-unit', w).value.trim(); }
      if ($('#pf-deadline', w)) { f.deadline = $('#pf-deadline', w).value || f.deadline; if (f.deadline && !f.retoFrom) f.retoFrom = todayKey(); }
    };
    let pw = null;
    const guard = unsavedGuard(() => { if (pw && $('#pf-name', pw)) readInputs(pw); const { share, ...rest } = f; return JSON.stringify([rest, !!share]); });
    const addItem = w => { const i = $('#pf-item', w); const v = i.value.trim(); if (!v) return; readInputs(w); f.goal.items.push({ id: uid(), text: v, done: false }); draw(w); setTimeout(() => $('#pf-item', w)?.focus(), 0); };
    openModal({
      title: esc(isNew ? t('newProject') : t('editProject')),
      body: '<div id="pf"></div>',
      foot: `<button class="btn" data-m="x">${esc(t('cancel'))}</button><button class="btn primary" data-m="save">${esc(isNew ? t('create') : t('save'))}</button>`,
      beforeClose: w => guard.check(w),
      onMount: w => { draw(w); pw = w; guard.start(); w.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'pf-item') { e.preventDefault(); addItem(w); } }); },
      onClick: (e, close, w) => {
        const q = s => e.target.closest(s); let el;
        if ((el = q('[data-hproj]'))) { readInputs(w); const id = el.dataset.hproj; f.projs = f.projs.includes(id) ? f.projs.filter(x => x !== id) : [...f.projs, id]; draw(w); return; }
        if ((el = q('[data-emoji]'))) { readInputs(w); f.icon = el.dataset.emoji; draw(w); return; }
        if ((el = q('[data-gtype]'))) { readInputs(w); f.goal.type = el.dataset.gtype; draw(w); return; }
        if ((el = q('[data-dl]'))) { readInputs(w); if (el.checked) { f.retoFrom = todayKey(); f.deadline = addDays(todayKey(), 30); } else { f.deadline = null; f.retoFrom = null; } draw(w); return; }
        if ((el = q('[data-reto-days]'))) { readInputs(w); f.retoFrom = f.retoFrom || todayKey(); f.deadline = addDays(f.retoFrom, +el.dataset.retoDays); draw(w); return; }
        if ((el = q('[data-link]'))) { readInputs(w); const id = el.dataset.link; f.habitIds = f.habitIds.includes(id) ? f.habitIds.filter(x => x !== id) : [...f.habitIds, id]; draw(w); return; }
        if (q('[data-add-item]')) { addItem(w); return; }
        if ((el = q('[data-del-item]'))) { readInputs(w); f.goal.items = f.goal.items.filter(i => i.id !== el.dataset.delItem); draw(w); return; }
        if (q('[data-add-ms]')) { const txt = $('#pf-ms', w).value.trim(); if (!txt) return; readInputs(w); f.milestones.push({ id: uid(), text: txt, date: $('#pf-ms-date', w).value || null, done: false }); draw(w); return; }
        if ((el = q('[data-del-ms]'))) { readInputs(w); f.milestones = f.milestones.filter(m => m.id !== el.dataset.delMs); draw(w); return; }
        if (q('[data-m="save"]')) {
          readInputs(w);
          if (!f.name) { toast(t('projectNeedName')); $('#pf-name', w).focus(); return; }
          const share = f.share; delete f.share;
          if (isNew && !gateAdd('projects', state.projects.length)) return;
          if (isNew) { f.id = uid(); f.createdAt = todayKey(); state.projects.push(f); }
          else { Object.assign(p, f); if (!f.hideCal) delete p.hideCal; }
          save(); close(); state.ui.tab = 'habits'; render();
          const obj = isNew ? f : p;
          if (share && !obj.groupId) shareAsGroup('project', obj); else if (isNew) openProject(obj);
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
        <div class="row wrap small" style="font-weight:var(--fw-label)">🏁 <span>${esc(p.deadline ? t('retoUntil', { date: fmtDate(p.deadline) }) + ' · ' + deadlineText(p, s) : t('noReto'))}</span>${(p.retoLog || []).length ? `<span class="muted">· ${esc(t('retoRecord', { ok: p.retoLog.filter(r => r.ok).length, n: p.retoLog.length }))}</span>` : ''}</div>
        <section class="clay card"><h3 class="section-title">${esc(t('goal'))}${g.type === 'numeric' && g.unit ? ` <span class="muted small">(${esc(g.unit)})</span>` : ''}</h3>${goalHtml}</section>
        ${!p.deadline && !s.achieved ? `<section class="clay card"><h3 class="section-title">📊 ${esc(t('statusLabel'))}</h3>
          <div class="gauge">${donut(projStatus(p, s) * 10)}<div class="grow"><div class="gauge-num">${projStatus(p, s)}/10</div><div class="muted small" style="font-weight:var(--fw-label)">${esc(t('statusHint'))}</div></div></div>
          <button class="btn block" data-pd="reto" style="margin-top:12px">🏁 ${esc(t('retoMake'))}</button></section>` : ''}
        <section class="clay card" ${!p.deadline && !s.achieved ? 'hidden' : ''}>
          <h3 class="section-title">${esc(t('probCalc'))}</h3>
          <div class="gauge">${donut(s.P)}<div class="grow"><div class="gauge-num">${s.P}%</div><div class="muted small" style="font-weight:var(--fw-label)">${esc(t('probability'))}</div></div></div>
          ${factor(t('probConsistency'), s.A)}
          ${s.pace != null ? factor(t('probPace'), Math.min(1, s.pace)) : ''}
          ${s.T != null ? factor(t('probTime'), s.T) : ''}
          ${s.A == null ? `<p class="muted small">${esc(t('probNoHabits'))}</p>` : ''}
          ${s.projection != null ? `<p class="small" style="font-weight:var(--fw-label)">${esc(t('probProjection', { v: fmtNum(s.projection) + ' ' + g.unit }))}${s.neededPerDay != null ? ' ' + esc(t('probNeeded', { v: fmtNum(Math.abs(s.neededPerDay)) + ' ' + g.unit })) : ''}</p>` : ''}
          ${!s.achieved ? `<div style="margin-top:14px">
            <label class="small" style="font-weight:var(--fw-label)" id="pd-simlabel">${esc(t('probSim', { n: simDefault }))}</label>
            <input type="range" id="pd-sim" min="0" max="100" value="${simDefault}">
            <div class="small" id="pd-simres" style="font-weight:var(--fw-label)">→ ${esc(t('probSimResult', { n: projectStats(p, simDefault / 100).P }))}</div>
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
      foot: `<button class="btn" data-pd="delete">${ico('trash')} ${esc(t('delete'))}</button>${p.groupId ? `<button class="btn" data-pd="group">👥 ${esc(t('groupOpen'))}</button>` : ''}<button class="btn" data-pd="edit">${ico('edit')} ${esc(t('edit'))}</button>`,
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
          try { toast(t('photoUploading')); await uploadPhoto(p, kind, e.target.files[0]); toast(t('avatarSaved')); draw(); if (state.ui.tab === 'habits') render(); }
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
          case 'group': openGroup(p.groupId); return;
          case 'reto': close(); openProjectEditor(p); return;
          case 'delete':
            if (await confirmDialog(t('deleteProjectQ', { name: p.name }))) { state.projects = state.projects.filter(x => x !== p); save(); close(); render(); toast(t('deleted')); }
            return;
          default: return;
        }
        save(); draw(); if (state.ui.tab === 'habits') render();
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

  // Gráficos de un hábito o de los hábitos de un proyecto («Ver más» bajo su calendario; antes, vista Gráficos)
  function chartsFor(H, range, o = {}) {
    let html = '';
    if (!KGPlan.allows(PL(), 'history') && (range === 'all' || range > KGPlan.LIMITS.chartDays)) range = KGPlan.LIMITS.chartDays;
    const single = H.length === 1 ? H[0] : null;
    const today = todayKey();
    const minFirst = H.reduce((m, h) => { const f = firstKey(h); return f < m ? f : m; }, today);
    const n = range === 'all' ? Math.max(7, diffDays(minFirst, today) + 1) : range;
    const from = addDays(today, -(n - 1));
    const color = single ? hColor(single) : o.color || 'var(--accent)';
    html += `<div class="filters"><div class="seg" role="group" aria-label="${esc(t('rangeLabel'))}">${[[7, 'range7'], [30, 'range30'], [90, 'range90'], [365, 'range365'], ['all', 'rangeAll']].map(([v, k]) => `<button data-more-range="${v}" class="${String(range) === String(v) ? 'on' : ''}">${esc(t(k))}</button>`).join('')}</div></div>`;
    if (!H.length) return html + `<p class="muted center">${esc(t('probNoHabits'))}</p>`;

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

    // v1.16: «Ver más» se queda con una sola gráfica (cumplimiento); la energía diaria vive solo en «Hoy»
    html += `<div class="chart-grid single">${cards.join('')}</div>`;

    // 5) tabla por hábito
    const rows = (single ? [] : H).map(h => {
      const r7 = rate(h, 7), r30 = rate(h, 30);
      return `<tr style="--h:${hColor(h)}"><td><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--h);margin-right:8px"></span>${esc(h.icon)} ${esc(h.name)}</td>
        <td>${isQuit(h) ? esc(t('kindQuit')) : esc(t(h.freq === 'daily' ? 'freqDaily' : h.freq === 'weekly' ? 'freqWeekly' : 'freqMonthly')) + (h.target > 1 ? ' ×' + h.target : '')}</td>
        <td class="num">${r7 == null ? '—' : Math.round(r7 * 100) + '%'}</td><td class="num">${r30 == null ? '—' : Math.round(r30 * 100) + '%'}</td>
        <td class="num">${totalEntries(h)}</td><td class="num">${currentStreak(h)}</td><td class="num">${bestStreak(h)}</td></tr>`;
    }).join('');
    if (rows) html += `<section class="chart-card clay" style="margin-top:18px"><h3>${ico('table')}<span class="grow">${esc(t('chartTable'))}</span></h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${esc(t('colHabit'))}</th><th>${esc(t('colFreq'))}</th><th class="num">${esc(t('col7'))}</th><th class="num">${esc(t('col30'))}</th><th class="num">${esc(t('colTotal'))}</th><th class="num">${esc(t('colStreak'))}</th><th class="num">${esc(t('colBest'))}</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;

    // 6) progreso del proyecto (meta numérica)
    const np = o.project && o.project.goal.type === 'numeric' && o.project.goal.entries.length ? [o.project] : [];
    if (np.length) {
      html += `<div class="chart-grid" style="margin-top:18px">${np.map(p => {
        const g = p.goal; const pts = [{ k: p.createdAt, v: g.start }, ...g.entries.map(e => ({ k: e.d, v: e.v }))].map(e => ({ label: dShort(e.k), v: e.v, tip: `${fmtNum(e.v)} ${g.unit}`, sub: fmtDate(e.k) }));
        return `<section class="chart-card clay"><h3>${esc(p.icon)} <span class="grow">${esc(p.name)}</span><span class="muted small">${esc(t('goal'))}: ${fmtNum(g.target)} ${esc(g.unit)}</span></h3>${lineChart(pts, { target: g.target, fmt: v => fmtNum(v), markers: true })}</section>`;
      }).join('')}</div>`;
    }
    return html;
  }

  // Descubrimientos y revisiones semanales (antes en Gráficos; ahora al final de la vista Hoy)
  function insightsHtml() {
    const ins = insightsList();
    const revs = Object.entries(state.reviews).sort((a, b) => a[0] < b[0] ? 1 : -1).slice(0, 6);
    if (hidW('insights') && hidW('reviews')) return '';
    return `<div class="chart-grid" style="margin-top:18px">
      ${hidW('insights') ? '' : `<section class="chart-card clay" data-w="insights"><h3>💡<span class="grow">${esc(t('insightsTitle'))}</span></h3>
        ${ins.length ? ins.map(i => `<div class="insight"><span>${i.icon}</span><span>${esc(i.text)}</span></div>`).join('') : `<p class="muted small" style="margin:0">${esc(t('insightsEmpty'))}</p>`}</section>`}
      ${hidW('reviews') ? '' : `<section class="chart-card clay" data-w="reviews"><h3>📝<span class="grow">${esc(t('reviewsTitle'))}</span><button class="chip" data-act="review-now">${ico('plus')} ${esc(t('reviewNow'))}</button></h3>
        ${revs.length ? revs.map(([w, v]) => `<button class="review-row" data-act="review-open" data-v="${w}"><b>${esc(fmtDate(w, { day: 'numeric', month: 'short' }))} – ${esc(fmtDate(addDays(w, 6), { day: 'numeric', month: 'short' }))}</b><span class="muted small">${esc((v.good || v.adjust || '').slice(0, 80))}</span><span class="rv-score">${v.score}/10</span></button>`).join('') : `<p class="muted small" style="margin:0">${esc(t('reviewsEmpty'))}</p>`}</section>`}
    </div>`;

  }
  // «Ver más»: ventana con los gráficos de un hábito o de un proyecto (con su propio rango de fechas)
  function openMore(kind, id) {
    const h = kind === 'habit' ? getHabit(id) : null, p = kind === 'project' ? state.projects.find(x => x.id === id) : null;
    if (!h && !p) return;
    let range = 30;
    const H = h ? [h] : p.habitIds.map(getHabit).filter(x => x && !x.archived);
    const draw = w => { $('#more', w).innerHTML = chartsFor(H, range, { project: p, color: p && (p.color || 'var(--accent)') }); };
    openModal({
      title: `${esc((h || p).icon || '')} ${esc((h || p).name)}`, cls: 'wide more-modal',
      body: '<div id="more"></div>',
      onMount: draw,
      onClick: (e, close, w) => { const b = e.target.closest('[data-more-range]'); if (!b) return; range = b.dataset.moreRange === 'all' ? 'all' : +b.dataset.moreRange; draw(w); }
    });
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
  function cardFields(h, i, side, meta = null) {
    const [r, th] = RANKS[i], L = CARD_LAYOUT[r];
    const m = meta || cardMeta(h, r) || { date: todayKey(), serial: 0 };
    if (side !== 'front') return [{ spec: L.back, text: h.name, o: { min: 460 } }];
    return [
      { spec: L.name, text: h.name, kind: 'name' },
      { spec: L.level, text: t('masteryLevel', { n: i + 1 }), o: { min: 200 } },
      { spec: L.desc, text: t('tag_' + r), o: { min: 620 } },
      { spec: L.req, text: h.perfect ? t('perfectReq', { n: th }) : isQuit(h) ? t('quitDays', { n: th }) : t('masteryReq', { n: th }), o: { min: 620 } },
      { spec: L.date, text: fmtShort(m.date), o: { min: 220 } },
      { spec: L.serial, text: t('masterySerial', { n: String(m.serial).padStart(4, '0') }), o: { min: 250 } }
    ];
  }
  function ktxt(f) {
    const b = textBox(f.spec, f.text, f.kind, f.o);
    return `<div class="ktxt${f.kind === 'name' ? ' name' : ''}" style="left:${(b.cx / CARD_W * 100).toFixed(2)}%;top:${(b.cy / CARD_H * 100).toFixed(2)}%;width:${(b.W / CARD_W * 100).toFixed(2)}%;height:${(b.HH / CARD_H * 100).toFixed(2)}%;font-size:${(b.size / CARD_W * 100).toFixed(2)}cqw;color:${f.spec[5]}">${esc(f.text)}</div>`;
  }
  function cardFace(h, i, side, cls = '', meta = null) {
    const r = RANKS[i][0];
    return `<div class="kcard ${cls}"><div class="kcard-face" style="background-image:url('cards/${r}-${side}.jpg')">${cardFields(h, i, side, meta).map(ktxt).join('')}</div></div>`;
  }
  function cardLocked(i) {
    const [r, th] = RANKS[i];
    return `<div class="kcard locked"><div class="kcard-face" style="background-image:url('cards/${r}-back.jpg')"></div><div class="lock"><div>${ico('lock')}<span>${th}</span></div></div></div>`;
  }

  function viewMastery() {
    let html = topBar(`<button class="icon-btn" data-act="ranks-info" aria-label="${esc(t('masteryRanks'))}">${ico('info')}</button>`);
    html += `<h1 class="page-title">${esc(t('tabMastery'))}</h1>`;
    html += profileCardHtml();
    if (!state.habits.length) return html + emptyState('crown', t('tabMastery'), t('masteryEmptyPerfect'), `<button class="btn primary" data-act="habit-new">${ico('plus')} ${esc(t('addHabit'))}</button>`);
    const lv = levelInfo(), pi = pointsInfo(), pr = perfectRun(), got = perfectCount();
    html += `<button class="mastery-sum clay level-card" data-act="level"><div class="lvl-big">${lv.level}</div><div class="grow"><b>${esc(lv.title)}</b><div class="muted small">${esc(t('lvXp', { a: fmtNum(lv.xp), b: fmtNum(lv.to) }))} · ${esc(t('ptsN', { n: fmtPts(pi.points) }))}</div><div class="bar" style="margin-top:8px;height:8px"><i style="width:${lv.pct}%"></i></div></div></button>`;
    // Racha actual y próxima carta
    const ni = RANKS.findIndex(([r]) => !state.perfectMastery[r]), next = ni >= 0 ? RANKS[ni] : null;
    const pct = next ? clamp(pr.cur / next[1] * 100, 0, 100) : 100;
    html += `<section class="streak-card clay"><div class="streak-flame" aria-hidden="true">🔥</div><div class="grow">
      <span class="muted small">${esc(t('perfectStreakNow'))}</span><b class="streak-n">${esc(t(pr.cur === 1 ? 'perfectStreakDay1' : 'perfectStreakDays', { n: pr.cur }))}</b>
      <span class="muted small">${esc(t('perfectStreakBest', { n: pr.best }))}</span>
      ${next ? `<div class="bar ${pct ? '' : 'zero'}" style="height:10px;margin-top:10px"><i style="width:${pct}%"></i></div><span class="small streak-next">${esc(t('perfectNext', { n: Math.max(0, next[1] - pr.cur), rank: t('rank_' + next[0]) }))}</span>` : `<span class="small">${esc(t('masteryMax'))}</span>`}
      <button class="chip" data-act="perfect-rules" style="margin-top:10px;align-self:flex-start">${ico('gear')} ${esc(t('prTitle'))}${perfectRuleOn(todayKey()) ? ` · ${esc(t('prCustom'))}` : ''}</button>
      </div></section>`;
    html += `<section class="series clay"><div class="series-head"><div class="habit-ico" style="width:46px;height:46px;font-size:22px;--h-soft:var(--surface-2)">👑</div><div class="grow"><h3>${esc(t('perfectSeries'))}</h3><div class="muted small">${esc(t('perfectHow2'))}</div></div><b style="font-size:20px">${got}/${RANKS.length}</b></div>
      <div class="cards-row">${RANKS.map(([r, th], i) => { const m = state.perfectMastery[r]; return `<button class="kcard-btn" data-act="pcard-open" data-i="${i}" aria-label="${esc(t('rank_' + r))}">${m ? cardFace(PSUBJ(), i, 'front') : cardLocked(i)}<span class="cap">${esc(t('rank_' + r))}<small>${m ? esc(fmtShort(m.date)) : esc(t('perfectReq', { n: th }))}</small></span></button>`; }).join('')}</div></section>`;
    if (state.challengeCards.length) {
      html += `<section class="series clay"><div class="series-head"><div class="habit-ico" style="width:46px;height:46px;font-size:22px;--h-soft:var(--surface-2)">🏁</div><div class="grow"><h3>${esc(t('challengeCards'))}</h3></div><b style="font-size:20px">${state.challengeCards.length}</b></div>
        <div class="cards-row">${[...state.challengeCards].reverse().map(c => `<button class="kcard-btn" data-act="chal-open" data-id="${c.id}">${challengeCardHtml(c)}<span class="cap">${esc(c.name)}<small>${esc(fmtShort(c.end))}</small></span></button>`).join('')}</div></section>`;
    }
    if (state.contractCards.length) {
      html += `<section class="series clay"><div class="series-head"><div class="habit-ico" style="width:46px;height:46px;font-size:22px;--h-soft:var(--surface-2)">📜</div><div class="grow"><h3>${esc(t('contractCards'))}</h3></div><b style="font-size:20px">${state.contractCards.length}</b></div>
        <div class="cards-row">${[...state.contractCards].reverse().map(cc => `<button class="kcard-btn" data-act="cc-open" data-id="${cc.id}">${contractCardHtml(cc)}<span class="cap">${esc(t('tier_' + cc.tier))}<small>${esc(fmtShort(cc.end))}</small></span></button>`).join('')}</div></section>`;
    }
    // Cartas antiguas (por hábito): se guardan, no se borran
    const old = state.habits.filter(legacyCount);
    if (old.length) html += `<details class="legacy-cards clay"><summary><span class="grow"><b>${esc(t('legacyCardsTitle'))}</b><span class="muted small">${esc(t('legacyCardsSub', { n: legacyTotal() }))}</span></span>${ico('down')}</summary>${old.map(legacySeries).join('')}</details>`;
    return html;
  }
  function legacySeries(h) {
    return `<div class="legacy-row" style="${habitVars(hColor(h))}"><h4>${esc(h.icon || '#')} ${esc(h.name)} <span class="muted small">${legacyCount(h)}/${RANKS.length}</span></h4>
      <div class="cards-row">${RANKS.map(([r], i) => { const m = (state.mastery[h.id] || {})[r]; return m ? `<button class="kcard-btn" data-act="card-open" data-id="${h.id}" data-i="${i}" aria-label="${esc(t('rank_' + r))}">${cardFace(h, i, 'front')}<span class="cap">${esc(t('rank_' + r))}<small>${esc(fmtShort(m.date))}</small></span></button>` : ''; }).join('')}</div></div>`;
  }

  function openCard(h, i, celebrate = false) {
    const [r, th] = RANKS[i];
    const m = cardMeta(h, r), un = !!m;
    const inner = un
      ? `<div class="flip ${celebrate ? 'unlock-burst' : ''}" id="flip"><div class="flip-inner">${cardFace(h, i, 'front')}${cardFace(h, i, 'back', 'rev')}</div></div>`
      : `<div class="flip" style="cursor:default"><div class="flip-inner">${cardLocked(i)}</div></div>`;
    const lockedTxt = h.perfect ? t('perfectNext', { n: Math.max(0, th - perfectRun().cur), rank: t('rank_' + r) }) : t('masteryReq', { n: th });
    const cap = `<div class="card-view-cap">${celebrate ? `<div style="font-size:22px;font-weight:var(--fw-title);margin-bottom:4px">${esc(t('masteryUnlocked'))}</div>` : ''}${esc(t('rank_' + r))} · ${esc(h.perfect ? t('perfectSeries') : h.name)}<small>${un ? esc(fmtDate(m.date) + ' · ' + t('masteryFlip')) : esc(lockedTxt)}</small></div>`;
    openModal({
      cls: 'card-view',
      body: inner + cap + `<div class="row" style="justify-content:center;margin-top:16px">${un ? `<button class="btn" data-m="share">${ico('upload')} ${esc(t('share'))}</button>` : ''}<button class="btn" data-m="x">${esc(t('close'))}</button></div>`,
      onClick: (e, close, w) => {
        if (e.target.closest('[data-m="share"]')) {
          const side = $('#flip', w).classList.contains('back') ? 'back' : 'front';
          shareCanvas(() => cardCanvas(h, i, side), `keepgoing-${r}-${side}.png`, `${t('rank_' + r)} · ${h.perfect ? t('perfectSeries') : h.name}`);
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
  function showUnlock(i) { if (state.ui.tab === 'mastery') render(); whenFree(() => { vibrate([20, 40, 20]); openPack(i); }); }

  /* ---------- sobre de Maestría: se toca, el papel se rasga despacio y aparece la carta ---------- */
  const PACK_COLORS = { iniciado: ['#1f7a52', '#b8f5d6'], aprendiz: ['#55602f', '#dfe7b5'], discipulo: ['#7a5a2e', '#f3dfb4'], experto: ['#1d4e9e', '#bcd4ff'], elite: ['#5b2a9a', '#e0c9ff'], maestro: ['#8f4a23', '#ffd3b0'], ascendente: ['#8a6a12', '#ffe9a3'], supremo: ['#8c3a4f', '#ffc9d6'], mitico: ['#20232c', '#c9cfdc'], trascendente: ['#a8327f', '#ffd6f0'] };
  function openPack(i) {
    const r = RANKS[i][0], [c1, c2] = PACK_COLORS[r] || ['#222', '#ccc'];
    // Línea del rasgado en zigzag: la misma para la tira de arriba y para el cuerpo, así encajan
    const pts = []; for (let x = 0; x <= 100; x += 5) pts.push([x, x % 10 ? 21 : 17.5]);
    const zig = pts.map(([x, y]) => `${x}% ${y}%`).join(',');
    const topClip = `polygon(0 0,100% 0,${pts.slice().reverse().map(([x, y]) => `${x}% ${y}%`).join(',')})`;
    const bodyClip = `polygon(${zig},100% 100%,0 100%)`;
    const face = `<div class="pack-face"><span class="pack-crown">${crownSvg()}</span><b>KEEPGOING</b><span>${esc(t('packLabel'))}</span><i class="pack-shine"></i></div>`;
    openModal({
      cls: 'card-view pack-view', dismissable: false,
      body: `<div class="pack-stage"><button class="pack" data-pack-open style="--p1:${c1};--p2:${c2}" aria-label="${esc(t('packOpen'))}">
          <div class="pack-card">${cardFace(PSUBJ(), i, 'front')}</div>
          <div class="pack-body" style="clip-path:${bodyClip}">${face}</div>
          <div class="pack-top" style="clip-path:${topClip}">${face}</div>
          <svg class="pack-tear" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts.map(([x, y]) => `${x},${y}`).join(' ')}"/></svg>
        </button><p class="pack-hint">${esc(t('packTap'))}</p></div>`,
      onClick: (e, close, w) => {
        const b = e.target.closest('[data-pack-open]'); if (!b || b.dataset.busy) return; b.dataset.busy = '1';
        const done = () => { close(); sfx('unlock'); openCard(PSUBJ(), i, true); };
        if (reducedMotion()) { done(); return; }
        $('.pack-hint', w).classList.add('gone');
        sfx('tear'); vibrate([8, 60, 8, 60, 8, 60, 8]);
        b.classList.add('tearing');                        // el papel se rasga despacio de izquierda a derecha
        setTimeout(() => { b.classList.add('torn'); sfx('pop'); }, 1700); // la tira sale volando
        setTimeout(() => b.classList.add('reveal'), 2300);  // la carta sube y el sobre cae
        setTimeout(done, 3400);
      }
    });
  }
  // Corona del logotipo (SVG propio en línea)
  const CROWN = '<g fill="currentColor"><path d="M239.0 384.0 L250.0 114.0 L233.0 122.0 L243.1 82.9 L256.0 40.0 L268.9 82.9 L279.0 122.0 L262.0 114.0 L273.0 384.0 Z"/><path d="M155.0 371.2 L176.3 165.6 L158.9 172.7 L171.0 134.2 L186.0 92.0 L196.7 135.5 L204.9 175.0 L188.3 166.2 L189.0 372.8 Z"/><path d="M323.0 372.8 L323.7 166.2 L307.1 175.0 L315.3 135.5 L326.0 92.0 L341.0 134.2 L353.1 172.7 L335.7 165.6 L357.0 371.2 Z"/><path d="M87.2 348.6 L79.3 224.1 L63.7 234.5 L67.8 194.4 L74.0 150.0 L93.2 190.5 L109.1 227.6 L91.1 222.2 L120.8 343.4 Z"/><path d="M391.2 343.4 L420.9 222.2 L402.9 227.6 L418.8 190.5 L438.0 150.0 L444.2 194.4 L448.3 234.5 L432.7 224.1 L424.8 348.6 Z"/></g><g fill="none" stroke="currentColor" stroke-width="22" stroke-linecap="round"><path d="M250 150 C 250 330, 192 330, 190 196"/><path d="M176 210 C 172 340, 110 330, 100 250"/><g transform="translate(512 0) scale(-1 1)"><path d="M250 150 C 250 330, 192 330, 190 196"/><path d="M176 210 C 172 340, 110 330, 100 250"/></g></g><g fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"><path d="M250 150 C 250 330, 192 330, 190 196"/><path d="M176 210 C 172 340, 110 330, 100 250"/><g transform="translate(512 0) scale(-1 1)"><path d="M250 150 C 250 330, 192 330, 190 196"/><path d="M176 210 C 172 340, 110 330, 100 250"/></g></g><g fill="currentColor"><path d="M62 318 Q256 430 450 318 L456 374 Q256 490 56 374 Z"/><path d="M92 392 Q256 494 420 392 L408 432 Q340 486 282 470 L256 498 L230 470 Q172 486 104 432 Z"/></g><path d="M66 341 Q256 455 446 341" fill="none" stroke="#fff" stroke-width="7"/><path d="M60 362 Q256 477 452 362" fill="none" stroke="#fff" stroke-width="3"/><circle cx="256" cy="402" r="11" fill="#fff"/><circle cx="172" cy="388" r="8" fill="#fff"/><circle cx="340" cy="388" r="8" fill="#fff"/><circle cx="104" cy="358" r="6" fill="#fff"/><circle cx="408" cy="358" r="6" fill="#fff"/>';
  const crownSvg = () => `<svg viewBox="0 0 512 512" aria-hidden="true">${CROWN}</svg>`;

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
  /* v1.23: todo «Compartir» de una imagen (maestrías, trofeos, contrato, carnet…) se puede enviar a un chat de la app
     o sacar fuera (hoja de compartir del móvil o descarga). */
  function shareCanvas(make, filename, title) {
    openModal({
      title: `${ico('share')} ${esc(t('share'))}`,
      body: `<div class="stack" style="gap:10px"><button class="create-opt clay" data-sc="chat"><span class="opt-ico">${ico('send')}</span><span class="grow"><b>${esc(t('shareToChat'))}</b><br><span class="muted small">${esc(t('shareToChatSub'))}</span></span>${ico('right')}</button>
        <button class="create-opt clay" data-sc="out"><span class="opt-ico">${ico('upload')}</span><span class="grow"><b>${esc(t('shareOut'))}</b><br><span class="muted small">${esc(t('shareOutSub'))}</span></span>${ico('right')}</button></div>`,
      onClick: (e, close) => { const b = e.target.closest('[data-sc]'); if (!b) return; close(); if (b.dataset.sc === 'chat') shareCanvasToChat(make, title); else shareCanvasOut(make, filename, title); }
    });
  }
  // Elegir un chat (grupo o amigo) y hacer algo con él
  async function pickChat(title, onPick) {
    if (!auth) { toast(t('groupNeedLogin')); return; }
    await refreshMyGroups(true);
    const list = myGroups.list || [];
    openModal({
      title: `${ico('send')} ${esc(title)}`,
      body: list.length ? `<div class="stack" style="gap:8px">${list.map(g => `<button class="btn block" style="justify-content:flex-start" data-pick-g="${esc(g.id)}">${g.chat === 'dm' ? avatarHtml(g.peer || {}, 'sm') : esc(g.icon || '👥')} ${esc(chatName(g))}</button>`).join('')}</div>` : `<p class="muted">${esc(t('shareNoChats'))}</p>`,
      onClick: async (e, close) => {
        const g = e.target.closest('[data-pick-g]'); if (!g) return;
        g.disabled = true;
        try { await onPick(g.dataset.pickG); sfx('pop'); toast(t('shareSent')); close(); } catch (err) { g.disabled = false; toast(chatErr(err)); }
      }
    });
  }
  // La imagen va como tarjeta en el chat (JPEG pequeño dentro del mensaje; se abre en grande y se puede guardar)
  async function shareCanvasToChat(make, title) {
    let img;
    try {
      const cv = await make(), max = 900, k = Math.min(1, max / Math.max(cv.width, cv.height));
      const c2 = document.createElement('canvas'); c2.width = Math.round(cv.width * k); c2.height = Math.round(cv.height * k);
      const cx = c2.getContext('2d'); cx.fillStyle = '#000'; cx.fillRect(0, 0, c2.width, c2.height); cx.drawImage(cv, 0, 0, c2.width, c2.height);
      for (let q = .82; q > .3; q -= .12) { img = c2.toDataURL('image/jpeg', q); if (img.length < 180000) break; }
    } catch (err) { toast(t('shareWebOnly')); return; }
    pickChat(t('shareToChat'), gid => rpc('kg_post', { p_group: gid, p_kind: 'share', p_body: '', p_payload: { type: 'card', title: String(title || '').slice(0, 120), img } }));
  }
  async function shareCanvasOut(make, filename, title) {
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
    let cards = 0; [...Object.values(state.mastery), state.perfectMastery].forEach(m => Object.values(m).forEach(x => { if (x.date >= s && x.date <= e) cards++; }));
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
        <div class="card-view-cap">${celebrate ? `<div style="font-size:22px;font-weight:var(--fw-title);margin-bottom:4px">${esc(t('contractDone'))}!</div><small>${esc(t('contractDoneMsg'))}</small>` : `${esc(t('tier_' + cc.tier))} · ${esc(fmtDate(cc.end))}`}</div>
        <div class="row wrap" style="justify-content:center;margin-top:16px">${celebrate && ended ? `<button class="btn primary" data-m="renew">${ico('refresh')} ${esc(t('contractRenew'))}</button>` : ''}${c && c.witness ? `<button class="btn" data-m="witness">📧 ${esc(t('witnessSendResult'))}</button>` : ''}<button class="btn" data-m="share">${ico('upload')} ${esc(t('share'))}</button><button class="btn" data-m="x">${esc(t('close'))}</button></div>`,
      onClick: (e, close) => {
        if (e.target.closest('[data-m="witness"]')) witnessMail(state.contract, 'result', cc);
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
  // Texto del contrato según el nivel de compromiso (Chill / Serio / Locked-In) y mismo/misma
  function contractParts(o) {
    const lvl = ['chill', 'serio', 'locked'].includes(o.level) ? o.level : (state.commitment || 'serio');
    const sameYear = o.signedAt.slice(0, 4) === o.endsAt.slice(0, 4);
    const f = o.g === 'f';
    const p = { name: esc(o.name || '______'), start: esc(fmtDate(o.signedAt, sameYear ? { day: 'numeric', month: 'long' } : undefined)), end: esc(fmtDate(o.endsAt)), mismo: f ? 'misma' : 'mismo', perfecto: f ? 'perfecta' : 'perfecto' };
    return { lvl, sub: t('ct_sub_' + lvl), paras: t('ct_body_' + lvl, p).split('\n\n'), quote: t('ct_quote_' + lvl, p) };
  }
  const contractText = o => contractParts(o).paras.join('\n\n');
  // Solo se pintan firmas que sean PNG en base64 (pueden venir de otra persona por el enlace del testigo)
  const safeSig = s => typeof s === 'string' && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(s) ? s : null;
  function contractInner(o) {
    const x = contractParts(o), w = o.witness, wCur = w && (!w.period || w.period === o.signedAt);
    const wSig = wCur && safeSig(w.sig), oSig = safeSig(o.sig);
    return `<h3>${esc(t('contractTitle'))}</h3><div class="ct-sub">${esc(x.sub)}</div>
      ${x.paras.map(p => `<p>${p}</p>`).join('')}
      <p class="ct-signed"><b>${esc(t('contractSigned', { date: fmtDate(o.signedAt) }))}.</b>${o.renewals ? `<br><span class="muted small">${esc(t('contractRenewals', { n: o.renewals }))}</span>` : ''}</p>
      <div class="sig-line"><span class="muted small">${esc(t('ct_sign'))}:</span><div class="center">${oSig ? `<img class="sig-img" src="${oSig}" alt="">` : ''}<div class="sig-name">${esc(o.name || '')}</div></div></div>
      ${wSig ? `<div class="sig-line"><span class="muted small">${esc(t('ct_witnessReal'))}:</span><div class="center"><img class="sig-img" src="${wSig}" alt=""><div class="sig-name">${esc(w.signedName || '')}</div><div class="muted small">${esc(t('contractSigned', { date: fmtDate(w.signedAt || o.signedAt) }))}</div></div></div>` : ''}
      <p class="ct-witness">${esc(t('ct_witness'))}${w && !wSig && (w.name || w.email) ? `<br>👀 ${esc(t(w.token && wCur ? 'witnessPending' : 'witnessIs', { w: w.name || w.email }))}` : ''}</p>
      <p class="ct-quote">${esc(x.quote)}</p>
      <div class="center"><span class="role-chip">${esc(t('ct_level', { l: t('commit_' + x.lvl) }))}</span></div>`;
  }
  const contractDoc = c => `<div class="contract clay">${contractInner(c)}</div>`;
  // Formulario de firma (onboarding y modal); devuelve getters
  function contractFormHtml(name = '', withLevel = false) {
    const s = todayKey(), e = addMonths(s, 1), g = (state.contract && state.contract.g) || 'm';
    return `<div class="contract clay" id="ct-doc">${contractInner({ name, signedAt: s, endsAt: e, level: state.commitment, g })}</div>
      <div class="stack" style="margin-top:18px">
        ${withLevel ? `<div class="field"><span>${esc(t('commitTitle'))}</span><div id="ct-level">${commitSegHtml()}</div></div>` : ''}
        <label class="field"><span>${esc(t('contractName'))}</span><input class="input" id="ct-name" maxlength="80" autocomplete="name" value="${esc(name)}" placeholder="${esc(t('contractNamePh'))}"></label>
        ${state.lang === 'es' ? `<div class="field"><span>${esc(t('ct_gender'))}</span><div class="seg" id="ct-g">${['m', 'f'].map(x => `<button type="button" data-g="${x}" class="${g === x ? 'on' : ''}">${esc(t('ct_g_' + x))}</button>`).join('')}</div></div>` : ''}
        <div class="field"><span>${esc(t('contractSign'))}</span><canvas class="sig-pad" id="ct-sig"></canvas><div><button type="button" class="chip" id="ct-clear">${esc(t('contractClear'))}</button></div></div>
        ${witnessFormHtml(state.contract && state.contract.witness)}
      </div>`;
  }
  function mountContractForm(root) {
    const name = $('#ct-name', root), doc = $('#ct-doc', root), cv = $('#ct-sig', root);
    const s = todayKey(), e = addMonths(s, 1);
    let g = (state.contract && state.contract.g) || 'm';
    const redraw = () => { doc.innerHTML = contractInner({ name: name.value.trim(), signedAt: s, endsAt: e, level: state.commitment, g }); };
    name.addEventListener('input', redraw);
    const gs = $('#ct-g', root);
    if (gs) gs.addEventListener('click', ev => { const b = ev.target.closest('[data-g]'); if (!b) return; g = b.dataset.g; gs.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); redraw(); });
    const lv = $('#ct-level', root);
    if (lv) lv.addEventListener('click', ev => { const b = ev.target.closest('[data-commit]'); if (!b) return; ev.stopPropagation(); setCommitment(b.dataset.commit); lv.innerHTML = commitSegHtml(); redraw(); });
    const pad = sigPad(cv, $('#ct-clear', root));
    const wit = $('#ct-wit', root); if (wit) wit.addEventListener('change', () => $('#ct-wit-box', root).classList.toggle('hidden', !wit.checked));
    return { name: () => name.value.trim(), sig: pad.get, focus: () => name.focus(), witness: () => readWitness(root), g: () => g };
  }
  // Panel para firmar con el dedo o el ratón; get() devuelve un PNG o null si está vacío
  function sigPad(cv, clearBtn) {
    let dirty = false, drawing = false, last = null;
    const ctx = cv.getContext('2d');
    const size = () => { const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1; cv.width = r.width * dpr; cv.height = r.height * dpr; ctx.scale(dpr, dpr); ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = state.theme.fg; };
    requestAnimationFrame(size);
    const pos = ev => { const r = cv.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; };
    cv.addEventListener('pointerdown', ev => { drawing = true; last = pos(ev); cv.setPointerCapture(ev.pointerId); ev.preventDefault(); });
    cv.addEventListener('pointermove', ev => { if (!drawing) return; const p = pos(ev); ctx.beginPath(); ctx.moveTo(...last); ctx.lineTo(...p); ctx.stroke(); last = p; dirty = true; });
    ['pointerup', 'pointercancel'].forEach(n => cv.addEventListener(n, () => { drawing = false; }));
    if (clearBtn) clearBtn.addEventListener('click', () => { ctx.clearRect(0, 0, cv.width, cv.height); dirty = false; });
    return { get: () => dirty ? cv.toDataURL('image/png') : null };
  }
  /* v1.24: el primer contrato dura 14 días (la prueba). Los siguientes, lo que diga tu plan: un año con la tarifa anual,
     un mes en el resto. Con Usuario KeepGoing para siempre (pago único, especiales, sorteos) el contrato es indefinido:
     se renueva solo cada mes y sigue dando su carta. */
  const contractEnd = (s, first) => first ? addDays(s, KGPlan.TRIAL_DAYS) : PL().term === 'year' ? addMonths(s, 12) : addMonths(s, 1);
  const contractForever = () => { const p = PL(); return p.plan === 'keepgoing' && !p.until; };
  function signContract(name, sig, witness = null, g = 'm') {
    const s = todayKey(), first = !state.contractCards.length;
    state.contract = { name, signedAt: s, endsAt: contractEnd(s, first), sig, ...(first ? { trial: true } : {}), renewals: 0, level: state.commitment, g, ...(witness ? { witness } : {}) };
    save();
    if (witness) setTimeout(() => witnessMail(state.contract, 'sign'), 300);
  }
  function renewContract() {
    const c = state.contract; if (!c) return;
    const s = todayKey(); c.signedAt = s; c.endsAt = contractEnd(s, false); c.renewals = (c.renewals || 0) + 1; c.level = state.commitment; delete c.trial;
    save(); render(); toast(t('contractRenewed', { date: fmtDate(c.endsAt) }));
  }
  function openContract() {
    const c = state.contract;
    if (!c) {
      let form;
      openModal({
        title: esc(t('setContract')), body: contractFormHtml('', true),
        foot: `<button class="btn primary block" data-m="sign">${ico('doc')} ${esc(t('contractSignBtn'))}</button>`,
        onMount: w => { form = mountContractForm(w); },
        onClick: (e, close) => { if (e.target.closest('[data-m="sign"]')) { if (!form.name()) { toast(t('contractNeedName')); form.focus(); return; } const w = form.witness(); if (w === 'bad') { toast(t('witnessBadEmail')); return; } signContract(form.name(), form.sig(), w, form.g()); close(); render(); toast(t('saved')); } }
      });
      return;
    }
    const ended = diffDays(todayKey(), c.endsAt) < 0;
    openModal({
      title: esc(t('setContract')), body: contractDoc(c),
      foot: `${ended ? `<button class="btn primary" data-m="renew">${ico('refresh')} ${esc(t('contractRenew'))}</button>` : ''}<button class="btn" data-m="witness">👀 ${esc(t(c.witness ? 'witnessEdit' : 'witnessAdd'))}</button><button class="btn" data-m="x">${esc(t('close'))}</button>`,
      onClick: (e, close) => {
        if (e.target.closest('[data-m="renew"]')) { close(); renewContract(); }
        if (e.target.closest('[data-m="witness"]')) {
          close();
          openModal({
            title: `👀 ${esc(t('witnessTitle'))}`, body: witnessFormHtml(c.witness || { name: '', email: '' }),
            foot: `<button class="btn primary block" data-m="wsave">📧 ${esc(t('witnessSaveSend'))}</button>`,
            onMount: w => { const cb = $('#ct-wit', w); cb.addEventListener('change', () => $('#ct-wit-box', w).classList.toggle('hidden', !cb.checked)); },
            onClick: (ev, cl, w) => {
              if (!ev.target.closest('[data-m="wsave"]')) return;
              const wit = readWitness(w);
              if (wit === 'bad') { toast(t('witnessBadEmail')); return; }
              if (wit) c.witness = c.witness && c.witness.email === wit.email ? { ...c.witness, ...wit } : wit; else delete c.witness;
              save(); cl(); if (wit) witnessMail(c, 'sign'); else toast(t('saved'));
            }
          });
        }
      }
    });
  }

  /* ---------- TEMA: editor ---------- */
  function presetName(p) { return p[state.lang] || p.es; }
  function themeEditorHtml() {
    const th = state.theme;
    const pick = (key, label) => `<label class="row" style="gap:10px"><input type="color" class="swatch-input" data-th-color="${key}" value="${th[key]}"><span class="small" style="font-weight:var(--fw-label)">${esc(label)}</span></label>`;
    const myLevel = state.onboarded ? levelInfo().level : 0;
    return `<div class="stack" style="gap:20px">
      <div class="field"><span>${esc(t('fontTitle'))}</span><div class="font-list">${FONTS.map(([id, name]) => `<button type="button" class="font-opt ${(th.font || 'quicksand') === id ? 'on' : ''}" data-th-font="${id}" style="font-family:'${name}', sans-serif"><b>${esc(name)}</b><span>${esc(t('fontSample'))}</span>${id === 'quicksand' ? `<i>${esc(t('fontDefault'))}</i>` : ''}</button>`).join('')}</div></div>
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
        if (p.lvl && !gate('themes')) return;
        Object.assign(state.theme, { preset: p.id, bg: p.bg, fg: p.fg, accent: p.accent, style: p.style || 'clay', bgMode: p.bgMode || 'solid', bg2: p.bg2 || state.theme.bg2 });
      } else if ((el = q('[data-th-font]'))) state.theme.font = el.dataset.thFont;
      else if ((el = q('[data-th-style]'))) state.theme.style = el.dataset.thStyle;
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

  /* ---------- v1.22: Ayuda en la aplicación (Ajustes) y novedades de cada versión ---------- */
  const HELP = [['habits', 'checklist'], ['cal', 'calendar'], ['ledger', 'wallet'], ['chat', 'chat'], ['mastery', 'crown']];
  function helpHtml() {
    const list = k => `<ul class="help-list">${t(k).split('|').filter(Boolean).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
    return `<p class="muted small help-txt" style="margin-top:0">${esc(t('helpIntro'))}</p><div class="help-box">${HELP.map(([k, i]) => `<details class="help-item clay">
      <summary><span class="tool-ico">${ico(i)}</span><b class="grow">${esc(t('help_' + k + '_t'))}</b><span class="acc-chev">${ico('right')}</span></summary>
      <div class="help-body help-txt"><p>${esc(t('help_' + k + '_what'))}</p>
        <h4>${esc(t('helpStart'))}</h4><ol class="help-list">${t('help_' + k + '_start').split('|').map(x => `<li>${esc(x)}</li>`).join('')}</ol>
        <h4>${esc(t('helpFeat'))}</h4>${list('help_' + k + '_feat')}
        <h4>${esc(t('helpLinks'))}</h4>${list('help_' + k + '_links')}</div></details>`).join('')}</div>`;
  }
  // Novedades: para quien ya usaba la app, una vez por versión y dispositivo. Cada línea es «título|detalle».
  // v1.23.3: las mejoras pequeñas (1.23.2, 1.23.3…) se juntan con su versión grande; cada parte es [versión, nº de líneas].
  // En Ajustes → Novedades se ve la versión actual entera y el historial de las anteriores.
  const SEEN_KEY = 'keepgoing.seenVersion';
  const NEWS = [['1.24', [['1.24.0', 8]]], ['1.23', [['1.23.0', 10], ['1.23.2', 3], ['1.23.3', 3], ['1.23.4', 2], ['1.23.5', 1]]], ['1.22', [['1.22.0', 8]]], ['1.21', [['1.21.0', 5]]], ['1.20', [['1.20.0', 3]]], ['1.19', [['1.19.0', 4]]],
    ['1.18', [['1.18.0', 3]]], ['1.17', [['1.17.0', 1]]], ['1.16', [['1.16.0', 3]]], ['1.15', [['1.15.0', 3]]], ['1.14', [['1.14.0', 3]]], ['1.13', [['1.13.0', 3]]], ['1.12', [['1.12.0', 3]]], ['1.11', [['1.11.0', 3]]]];
  const seenVersion = v => { try { if (v) localStorage.setItem(SEEN_KEY, v); return localStorage.getItem(SEEN_KEY); } catch (e) { return VERSION; } };
  const vNum = v => String(v || '').split('.').reduce((a, x) => a * 1000 + (+x || 0), 0);
  const newsItems = parts => parts.flatMap(([v, n]) => Array.from({ length: n }, (_, i) => t(`wn_${v.replace(/\./g, '_')}_${i + 1}`).split('|')));
  // Lo nuevo desde la última versión vista: si ya usabas esta versión grande, solo sus mejoras posteriores
  function freshNews() {
    const [major, parts] = NEWS[0], seen = seenVersion() || '';
    return seen.split('.').slice(0, 2).join('.') === major ? parts.filter(([v]) => vNum(v) > vNum(seen)) : parts;
  }
  const newsList = (items, more) => `<ul class="wn-list">${items.map(([ti, de]) => `<li><span class="wn-dot">${ico('sparkle')}</span><span class="grow"><b>${esc(ti)}</b>${more && de ? `<span class="muted small">${esc(de)}</span>` : ''}</span></li>`).join('')}</ul>`;
  function openWhatsNew() {
    const items = newsItems(freshNews()); if (!items.length) return;
    let more = false, wref;
    const draw = () => {
      $('#wn', wref).innerHTML = newsList(items, more);
      $('[data-wn="more"]', wref).innerHTML = `${ico(more ? 'up' : 'down')} ${esc(t(more ? 'whatsNewLess' : 'whatsNewSee'))}`;
    };
    seenVersion(VERSION);
    openModal({
      title: `${ico('sparkle')} ${esc(t('whatsNewTitle', { v: NEWS[0][0] }))}`, cls: 'wn-modal', body: '<div id="wn"></div>',
      foot: `<button class="btn" data-wn="more"></button><button class="btn primary" data-wn="ok">${esc(t('whatsNewClose'))}</button>`,
      onMount: w => { wref = w; draw(); },
      onClick: (e, close) => { const b = e.target.closest('[data-wn]'); if (!b) return; if (b.dataset.wn === 'ok') close(); else { more = !more; draw(); } }
    });
  }
  // Ajustes → Novedades: la versión actual con sus mejoras y, debajo, el historial de versiones anteriores
  function openNewsLog() {
    let more = false, wref;
    const draw = () => {
      const [major, parts] = NEWS[0], later = parts.slice(1);
      $('#wn', wref).innerHTML = `<h3 class="section-title" style="margin:0 0 6px">${esc(t('newsCurrent', { v: major }))}</h3>${newsList(newsItems(parts.slice(0, 1)), more)}
        ${later.length ? `<h4 class="news-sub">${esc(t('newsUpdates', { v: later.map(p => p[0]).join(', ') }))}</h4>${newsList(newsItems(later), more)}` : ''}
        <h3 class="section-title" style="margin:16px 0 6px">${esc(t('newsOlder'))}</h3>
        <div class="stack" style="gap:8px">${NEWS.slice(1).map(([v, ps]) => `<details class="news-old clay"><summary><b class="grow">${esc(t('newsCurrent', { v }))}</b><span class="acc-chev">${ico('right')}</span></summary>${newsList(newsItems(ps), true)}</details>`).join('')}</div>`;
      $('[data-wn="more"]', wref).innerHTML = `${ico(more ? 'up' : 'down')} ${esc(t(more ? 'whatsNewLess' : 'whatsNewSee'))}`;
    };
    openModal({
      title: `${ico('sparkle')} ${esc(t('newsTitle'))}`, cls: 'wn-modal', body: '<div id="wn"></div>',
      foot: `<button class="btn" data-wn="more"></button><button class="btn primary" data-wn="ok">${esc(t('whatsNewClose'))}</button>`,
      onMount: w => { wref = w; draw(); },
      onClick: (e, close) => { const b = e.target.closest('[data-wn]'); if (!b) return; if (b.dataset.wn === 'ok') close(); else { more = !more; draw(); } }
    });
  }
  function maybeWhatsNew() {
    if (!state.onboarded || seenVersion() === VERSION) return;
    if (!freshNews().length) { seenVersion(VERSION); return; }
    whenFree(openWhatsNew);
  }

  /* ---------- ONBOARDING ---------- */
  // Pasos: idioma, color, hábitos y proyectos, Calendario, Libreta, @nametag (opcional, con cuenta) y contrato
  // v1.21: pasos con nombre; ya no se elige el nivel de compromiso: sale solo según los hábitos que crees (sin mínimo)
  const OB = ['lang', 'color', 'habits', 'cal', 'ledger', 'tag', 'contract'], OB_STEPS = OB.length;
  const obAt = () => OB[clamp(state.obStep | 0, 0, OB_STEPS - 1)], obGo = name => { state.obStep = OB.indexOf(name); };
  // obPending: hábitos elegidos ({ key, es, en, icon, x } de las plantillas o { name } escritos a mano); obProj: proyectos elegidos
  let obPending = [], obProj = [], obPack = 'salud', obKeepScroll = false, obForm = null;
  // Proyectos de ejemplo con sus hábitos: [id, tamaño, es, en, icono, meta, hábitos]
  const OB_PROJECTS = [
    ['tidy', 'small', 'Ordenar la casa', 'Tidy up the house', '🏠', { type: 'checklist', items: ['Armario|Wardrobe', 'Escritorio|Desk', 'Cocina|Kitchen', 'Trastero|Storage room'] }, [['Ordenar 10 minutos', 'Tidy up for 10 minutes', '🧹', { duration: 10 }]]],
    ['book1', 'small', 'Leer un libro', 'Read a book', '📖', { type: 'numeric', start: 0, target: 300, unit: 'páginas|pages' }, [['Leer', 'Read', '📚', { measure: 'amount', target: 20, unit: 'páginas|pages', step: 5, timeOfDay: 'night' }]]],
    ['run5k', 'small', 'Correr 5 km seguidos', 'Run 5 km non-stop', '🏃', { type: 'numeric', start: 0, target: 5, unit: 'km' }, [['Salir a correr', 'Go for a run', '🏃', { freq: 'weekly', target: 3 }]]],
    ['detox', 'small', 'Un mes sin redes sociales', 'A month without social media', '🌱', { type: 'simple' }, [['Redes sociales', 'Social media', '📵', { kind: 'quit' }]]],
    ['savings', 'large', 'Ahorrar 1.000 €', 'Save €1,000', '💰', { type: 'numeric', start: 0, target: 1000, unit: '€' }, [['Apuntar gastos', 'Log expenses', '💰', { timeOfDay: 'night' }], ['Ahorrar', 'Save money', '🐷', { measure: 'amount', target: 5, unit: '€', step: 1 }], ['Compras impulsivas', 'Impulse buying', '🛍️', { kind: 'quit' }]]],
    ['language', 'large', 'Aprender un idioma', 'Learn a language', '🗣️', { type: 'checklist', items: ['A1', 'A2', 'B1', 'B2', 'C1'] }, [['Practicar el idioma', 'Practise the language', '🗣️', { duration: 15 }], ['Ver una serie en ese idioma', 'Watch a show in that language', '🎬', { freq: 'weekly', target: 2 }]]],
    ['weight', 'large', 'Llegar a mi peso objetivo', 'Reach my target weight', '⚖️', { type: 'numeric', start: 80, target: 72, unit: 'kg' }, [['Gimnasio', 'Gym', '🏋️', { freq: 'weekly', target: 3 }], ['Beber 2 L de agua', 'Drink 2 L of water', '💧', { measure: 'amount', target: 2, unit: 'L', step: .25 }], ['Comer fruta', 'Eat fruit', '🍎', {}]]],
    ['books12', 'large', 'Leer 12 libros en un año', 'Read 12 books in a year', '📚', { type: 'numeric', start: 0, target: 12, unit: 'libros|books' }, [['Leer', 'Read', '📚', { measure: 'amount', target: 20, unit: 'páginas|pages', step: 5, timeOfDay: 'night' }]]]
  ];
  // Hábitos distintos que se crearán (los elegidos y los de los proyectos, sin repetir el mismo nombre)
  function obHabitList() {
    const m = new Map();
    const add = (es, en, icon, x) => { const name = en == null ? es : L2(es, en), k = name.toLowerCase(); if (!m.has(k)) m.set(k, { name, icon, x: x || {} }); };
    obPending.forEach(p => (p.key ? add(p.es, p.en, p.icon, p.x) : add(p.name, null, '#', {})));
    OB_PROJECTS.filter(pr => obProj.includes(pr[0])).forEach(pr => pr[6].forEach(([es, en, icon, x]) => add(es, en, icon, x)));
    return m;
  }
  function obCreateAll() {
    const ids = new Map();
    for (const [k, h] of obHabitList()) { const nh = newHabitFrom(h.name, h.icon, h.x); state.habits.push(nh); ids.set(k, nh.id); }
    for (const [id, , es, en, icon, g, hs] of OB_PROJECTS.filter(pr => obProj.includes(pr[0]))) {
      state.projects.push({ id: uid(), name: L2(es, en), icon, color: null, desc: '', habitIds: hs.map(([hes, hen]) => ids.get(L2(hes, hen).toLowerCase())).filter(Boolean),
        goal: { type: g.type, start: g.start || 0, target: g.target || 0, unit: unitL(g.unit || ''), entries: [], items: (g.items || []).map(x => ({ id: uid(), text: unitL(x), done: false })), achieved: false },
        deadline: null, milestones: [], photos: {}, createdAt: todayKey(), tpl: id });
    }
    obPending = []; obProj = [];
  }

  // Pasos que explican el Calendario y la Libreta: una pequeña muestra y las funciones principales con iconos de línea
  const OB_TOUR = {
    cal: [['calendar', 'obCal1'], ['edit', 'obCal2'], ['clock', 'obCal3'], ['repeat', 'obCal4'], ['users', 'obCal5']],
    ledger: [['lock', 'obLed1'], ['tag', 'obLed2'], ['upload', 'obLed3'], ['budget', 'obLed4'], ['calc', 'obLed5'], ['share', 'obLed6']]
  };
  function obTourHtml(at) {
    let demo;
    if (at === 'cal') {
      const S = [['#f5a623', 'obDemoM'], ['#ef6c00', 'obDemoT'], ['#5c6bc0', 'obDemoN'], ['#43a047', 'obDemoL']], plan = [0, 0, 1, 1, 2, 2, 3];
      demo = `<div class="ob-demo clay"><div class="ob-demo-week">${plan.map((p, i) => `<span class="ob-demo-day"><b>${i + 1}</b><i style="--c:${S[p][0]}">${esc(t(S[p][1]))}</i></span>`).join('')}</div><div class="ob-demo-sum"><span>${esc(t('tfHours'))} <b>48 h</b></span><span>${esc(t('tfShiftsN'))} <b>6</b></span></div></div>`;
    } else {
      const bars = [[64, 'var(--accent)'], [38, '#e5484d'], [22, '#e5484d'], [12, '#e5484d']];
      demo = `<div class="ob-demo clay"><div class="ob-demo-led">${bars.map(([w, c]) => `<i style="width:${w}%;background:${c}"></i>`).join('')}</div><div class="ob-demo-sum"><span>${esc(t('ledgerIncome'))} <b style="color:var(--accent)">+1.850 €</b></span><span>${esc(t('ledgerExpense'))} <b style="color:#e5484d">−1.120 €</b></span></div></div>`;
    }
    return `${demo}<div class="ob-tour">${OB_TOUR[at].map(([i, k]) => `<div class="ob-feat"><span class="tool-ico">${ico(i)}</span><span class="grow"><b>${esc(t(k + 'T'))}</b><span class="muted small">${esc(t(k))}</span></span></div>`).join('')}</div>
      <p class="muted small center" style="margin-top:14px">${esc(t(at === 'cal' ? 'obCalWhere' : 'obLedWhere'))}</p>`;
  }
  function renderOnboarding() {
    const s = clamp(state.obStep | 0, 0, OB_STEPS - 1), at = OB[s];
    const dots = Array.from({ length: OB_STEPS }, (_, i) => `<i class="${i <= s ? 'on' : ''}"></i>`).join('');
    let body = '', title = '', lead = '', next = t('next');
    if (at === 'lang') {
      title = t('obLangTitle'); lead = t('obLangSub');
      body = `<div class="lang-list">${[['es', '🇪🇸', 'Español'], ['en', '🇬🇧', 'English']].map(([l, f, n]) => `<button class="lang-opt clay ${state.lang === l ? 'on' : ''}" data-ob-lang="${l}"><span class="flag">${f}</span><span class="grow">${n}</span>${state.lang === l ? ico('check') : ''}</button>`).join('')}</div>
        <div class="center" style="margin-top:26px"><button class="chip" data-ob-login>${ico('refresh')} ${esc(t('obHaveAccount'))}</button></div>`;
    } else if (at === 'color') {
      title = t('obColorTitle'); lead = t('obColorSub');
      body = `<div id="ob-theme">${themeEditorHtml()}</div><div class="field" style="margin-top:22px"><span class="muted small" style="font-weight:var(--fw-label);text-transform:uppercase;letter-spacing:.04em">${esc(t('preview'))}</span><div id="ob-preview" style="margin-top:8px">${samplePreview()}</div></div>`;
    } else if (at === 'cal' || at === 'ledger') {
      title = t(at === 'cal' ? 'obCalTitle' : 'obLedTitle'); lead = t(at === 'cal' ? 'obCalSub' : 'obLedSub');
      body = obTourHtml(at);
    } else if (at === 'contract') {
      title = t('obContractTitle'); lead = t('obContractSub'); next = t('contractSignBtn');
      body = contractFormHtml(state.contract ? state.contract.name : '');
    } else if (at === 'tag') {
      title = t('obTagTitle'); lead = t('obTagSub'); next = auth && myTag() ? t('next') : t('obTagSkip');
      body = auth ? `<label class="field"><span>${esc(t('nametagTitle'))}</span><div class="row" style="gap:8px"><span class="at-prefix">@</span><input class="input grow" id="ob-tag" maxlength="20" autocomplete="off" autocapitalize="none" spellcheck="false" value="${esc(myTag())}" placeholder="${esc(t('nametagPh'))}"></div></label><p class="muted small">${esc(t('nametagHint'))}</p>`
        : `<div class="clay card center"><div style="font-size:40px">🏷️</div><p class="muted" style="margin:6px 0 14px">${esc(t('obTagNeedAccount'))}</p><button class="btn primary" data-ob-login>${ico('user')} ${esc(t('obTagCreate'))}</button></div>`;
    } else {
      const n = obHabitList().size, lv = CAP.levelForCount(n), custom = obPending.filter(p => !p.key);
      title = t('obHabTitle'); lead = t('obHabSub');
      const hChip = (key, es, en, icon, x) => { const on = obPending.some(p => p.key === key); return `<button class="chip ob-hchip ${on ? 'on' : ''}" data-ob-hab="${key}"><span>${icon} ${esc(L2(es, en))}${on ? ' ' + ico('check') : ''}</span><small>${esc(packSub(x))}</small></button>`; };
      const pRow = ([id, , es, en, icon, , hs]) => { const on = obProj.includes(id); return `<button class="create-opt clay ob-proj ${on ? 'on' : ''}" data-ob-proj="${id}"><span style="font-size:26px">${icon}</span><span class="grow"><b>${esc(L2(es, en))}</b><br><span class="muted small">${esc(t('obProjIncludes', { list: hs.map(([a, b, , x]) => `${L2(a, b)} (${packSub(x)})`).join(', ') }))}</span></span>${on ? ico('check') : ico('plus')}</button>`; };
      body = `<h3 class="section-title">${esc(t('obHabSection'))}</h3>
        <div class="chip-scroll">${Object.keys(PACKS).map(k => `<button class="chip ${obPack === k ? 'on' : ''}" data-ob-pack="${k}">${esc(t('pack_' + k))}</button>`).join('')}</div>
        <div class="sug-list" style="margin-top:10px">${PACKS[obPack].map(([es, en, icon, x], i) => hChip(obPack + ':' + i, es, en, icon, x)).join('')}</div>
        <div class="field" style="margin-top:16px"><span>${esc(t('customHabit'))}</span><div class="row"><input class="input" id="ob-custom" maxlength="60" placeholder="${esc(t('habitNamePh'))}"><button class="btn" data-ob-add>${ico('plus')} ${esc(t('add'))}</button></div></div>
        ${custom.length ? `<div class="sug-list" style="margin-top:12px">${custom.map((p, i) => `<button class="chip on" data-ob-del="${i}"># ${esc(p.name)} ${ico('x')}</button>`).join('')}</div>` : ''}
        <h3 class="section-title" style="margin-top:24px">${esc(t('obProjSection'))}</h3>
        <p class="muted small" style="margin-top:0">${esc(t('obProjHint'))}</p>
        <div class="muted small ob-sub">${esc(t('obProjSmall'))}</div><div class="stack" style="gap:8px">${OB_PROJECTS.filter(p => p[1] === 'small').map(pRow).join('')}</div>
        <div class="muted small ob-sub">${esc(t('obProjLarge'))}</div><div class="stack" style="gap:8px">${OB_PROJECTS.filter(p => p[1] === 'large').map(pRow).join('')}</div>
        <div class="ob-feat clay ob-later"><span class="tool-ico">${ico('users')}</span><span class="muted small grow">${esc(t('obLaterNote'))}</span></div>
        <div class="ob-level clay"><span class="tool-ico">${ico('target')}</span><span class="grow"><b>${esc(t('obLevelIs', { n, level: t('commit_' + lv) }))}</b><span class="muted small">${esc(t('obLevelScale'))}</span></span></div>`;
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
    if (obAt() === 'color') bindThemeEditor($('#ob-theme'), () => { $('#ob-theme').innerHTML = themeEditorHtml(); $('#ob-preview').innerHTML = samplePreview(); });
    if (obAt() === 'contract') obForm = mountContractForm(root);
    if (obAt() === 'tag' && auth && !repState.loaded) loadRep().then(() => { const i = $('#ob-tag'); if (i && !i.value && myTag()) i.value = myTag(); }).catch(() => {});
    if (obAt() === 'tag' && $('#ob-tag')) $('#ob-tag').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('[data-ob="next"]').click(); } });
    if (obAt() === 'habits') $('#ob-custom').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('[data-ob-add]').click(); } });
    if (obKeepScroll) obKeepScroll = false; else window.scrollTo(0, 0);
  }
  function onboardingClick(e) {
    const q = s => e.target.closest(s); let el;
    if (q('[data-ob-login]')) { openLogin(); return true; }
    if ((el = q('[data-ob-lang]'))) { state.lang = el.dataset.obLang; save(); render(); return true; }
    const keep = () => { const v = $('#ob-custom')?.value; obKeepScroll = true; render(); if (v) $('#ob-custom').value = v; };
    if ((el = q('[data-ob-pack]'))) { obPack = el.dataset.obPack; keep(); return true; }
    if ((el = q('[data-ob-hab]'))) {
      const k = el.dataset.obHab, i = obPending.findIndex(p => p.key === k);
      if (i >= 0) obPending.splice(i, 1); else { const [pk, n] = k.split(':'), [es, en, icon, x] = PACKS[pk][+n]; obPending.push({ key: k, es, en, icon, x }); }
      keep(); return true;
    }
    if ((el = q('[data-ob-proj]'))) { const id = el.dataset.obProj; obProj = obProj.includes(id) ? obProj.filter(x => x !== id) : [...obProj, id]; keep(); return true; }
    if (q('[data-ob-add]')) { const v = $('#ob-custom').value.trim(); if (v) { obPending.push({ name: v }); obKeepScroll = true; render(); $('#ob-custom').focus({ preventScroll: true }); } return true; }
    if ((el = q('[data-ob-del]'))) { const custom = obPending.filter(p => !p.key); obPending = obPending.filter(p => p !== custom[+el.dataset.obDel]); keep(); return true; }
    if ((el = q('[data-ob]'))) {
      if (el.dataset.ob === 'back') { state.obStep = Math.max(0, state.obStep - 1); save(); render(); return true; }
      // Hábitos: sin mínimo; el nivel de compromiso sale solo según cuántos hábitos crees (2-3 Chill, 4-6 Serio, 7+ Locked-In)
      if (obAt() === 'habits') {
        const v = $('#ob-custom').value.trim(); if (v) obPending.push({ name: v });
        setCommitment(CAP.levelForCount(obHabitList().size));
      }
      // @nametag: opcional y solo con cuenta
      if (obAt() === 'tag') {
        const i = $('#ob-tag'), v = i ? i.value.trim().replace(/^@/, '') : '';
        if (auth && v && v.toLowerCase() !== myTag().toLowerCase()) {
          el.disabled = true;
          saveNametag(v).then(ok => { if (ok) { obGo('contract'); save(); render(); } else el.disabled = false; });
          return true;
        }
      }
      if (obAt() === 'contract') {
        if (!obForm.name()) { toast(t('contractNeedName')); obForm.focus(); return true; }
        const prev = state.contract;
        const w = obForm.witness(); if (w === 'bad') { toast(t('witnessBadEmail')); return true; }
        if (!prev || prev.name !== obForm.name() || obForm.sig() || prev.g !== obForm.g() || prev.level !== state.commitment || (w && (!prev.witness || prev.witness.email !== w.email))) signContract(obForm.name(), obForm.sig() || (prev && prev.sig) || null, w, obForm.g());
        obCreateAll(); seenVersion(VERSION); state.onboarded = true; state.ui.tab = 'habits'; save(); render(); setTimeout(processJoin, 600); setTimeout(() => planOverLimit(true), 900); return true;
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
    saveAuth(null); savePlanCache(null); state.ui.devView = '';
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
      // Perfil público y progreso de retos compartidos (no bloquean la sincronización)
      publishProfile().catch(() => {});
      checkWitness().catch(() => {});
      pushGroupProgress();
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
      await refreshPlan(true);
      onDone && onDone(); render(); toast(t('syncDone'));
      setTimeout(processJoin, 600);
    } catch (e) { toast(t('accError', { e: e.message })); }
  }

  /* =========================================================
     PLANES (v1.24): Free, prueba de 14 días y Usuario KeepGoing. Quien decide es el servidor (kg_entitlement);
     aquí se guarda lo último que dijo para funcionar sin conexión, y se bloquea en la interfaz lo que no entra en Free.
     ========================================================= */
  const PLAN_KEY = 'keepgoing.plan';
  let planCache = (() => { try { return JSON.parse(localStorage.getItem(PLAN_KEY)) || null; } catch (e) { return null; } })();
  const savePlanCache = c => { planCache = c; try { if (c) localStorage.setItem(PLAN_KEY, JSON.stringify(c)); else localStorage.removeItem(PLAN_KEY); } catch (e) { /* nada */ } };
  // Plan efectivo ahora mismo. Ver como otro plan (state.ui.devView) solo funciona si el servidor dice que eres del equipo
  const PL = () => KGPlan.resolve(planCache && auth && planCache.uid === auth.uid ? planCache.ent : null, { signedIn: !!auth, view: state.ui && state.ui.devView });
  const isStaff = () => !!PL().role;
  const flag = key => KGPlan.flagOn(planCache && planCache.ent, key, PL().role);
  async function refreshPlan(startTrial = false) {
    if (!auth) { if (planCache) savePlanCache(null); return PL(); }
    const before = PL().plan;
    try {
      let ent = await rpc('kg_entitlement');
      // Una cuenta nueva empieza sus 14 días de prueba (una sola vez por cuenta: lo controla el servidor)
      if (startTrial && ent && ent.plan === 'free' && !ent.trial_started) { ent = await rpc('kg_trial_start'); if (ent && ent.plan === 'trial') toast(t('plTrialStarted')); }
      savePlanCache({ uid: auth.uid, ent: { ...ent, at: Date.now() } });
    } catch (e) {
      // Servidor sin planes todavía (función inexistente): nadie pierde nada
      if (e && e.status === 404) savePlanCache({ uid: auth.uid, ent: { plan: 'keepgoing', at: Date.now(), legacy: true } });
      return PL();
    }
    const now = PL();
    if (before === 'trial' && now.plan === 'free') whenFree(() => openTrialEnded());
    if (now.full) restorePlanArchived();
    planOverLimit();
    return now;
  }
  // Aviso de «esto es de Usuario KeepGoing». feature = una de KGPlan.PAID o un límite (habits, projects…)
  function gate(feature) {
    if (KGPlan.allows(PL(), feature)) return true;
    openUpsell({ feature }); return false;
  }
  function gateAdd(kind, count) {
    if (KGPlan.canAdd(PL(), kind, count)) return true;
    openUpsell({ limit: kind }); return false;
  }
  const activeHabitCount = () => state.habits.filter(h => !h.archived).length;
  const fmtPrice = (term = 'forever') => { const p = KGPlan.priceFor('ES', term); try { return new Intl.NumberFormat(state.lang, { style: 'currency', currency: p.cur }).format(p.amount); } catch (e) { return p.amount + ' ' + p.cur; } };
  const PL_PRICE_KEY = { forever: 'plPrice', month: 'plPriceMonth', year: 'plPriceYear' }, PL_TERM_KEY = { forever: 'plTermForever', month: 'plTermMonth', year: 'plTermYear' };
  // v1.25: ahorro del anual (frente a 12 meses) y del pago único (frente a KGPlan.FOREVER_VS_YEARS años del anual), en dinero y en %
  const planSaveHtml = term => {
    const s = KGPlan.saving('ES', term); if (!s) return '';
    let a; try { a = new Intl.NumberFormat(state.lang, { style: 'currency', currency: s.cur }).format(s.amount); } catch (e) { a = s.amount + ' ' + s.cur; }
    return `<div class="pl-save">${esc(t(term === 'year' ? 'plSaveYear' : 'plSaveForever', { a, n: s.pct, y: KGPlan.FOREVER_VS_YEARS }))}</div>`;
  };
  const planList = s => `<ul class="pl-list">${String(s).split('|').map(x => `<li>${ico('check')}<span>${esc(x)}</span></li>`).join('')}</ul>`;
  function openUpsell(o = {}) {
    let term = 'year';
    const priceBox = () => `<div class="pl-price" id="pl-price">${esc(t(PL_PRICE_KEY[term], { p: fmtPrice(term) }))}${planSaveHtml(term)}</div>`;
    const why = o.feature ? t('plUpsellWhy', { f: t('plf_' + o.feature) }) : o.limit ? t('plUpsellLimit', { n: KGPlan.LIMITS[o.limit], what: t('plw_' + o.limit) }) : '';
    openModal({
      title: esc(t('plUpsellTitle')), cls: 'pl-sheet',
      body: `${why ? `<p class="pl-why">${ico('lock')} ${esc(why)}</p>` : ''}<p class="muted" style="margin-top:0">${esc(t('plUpsellLead'))}</p>
        <div class="seg" role="tablist" style="margin:4px 0 10px">${['month', 'year', 'forever'].map(k => `<button type="button" data-pl-term="${k}" class="${k === term ? 'on' : ''}" aria-pressed="${k === term}">${esc(t(PL_TERM_KEY[k]))}</button>`).join('')}</div>
        ${priceBox()}<p class="muted small" style="margin:6px 0 0">${esc(t('plPriceLocal'))}</p>
        <div class="acc-label">${esc(t('plKgTitle'))}</div>${planList(t('plFeatList'))}
        <div class="acc-label" style="margin-top:14px">${esc(t('plFreeTitle'))}</div>${planList(t('plFreeList'))}
        ${!auth ? `<p class="pl-why" style="margin:16px 0 0">${ico('sparkle')} ${esc(t('plNeedAccount'))}</p>` : ''}`,
      foot: `<button class="btn primary block" data-pl="buy">${ico('sparkle')} ${esc(t('plBuy'))}</button>
        ${!auth ? `<button class="btn block" data-pl="account">${esc(t('plCreateAccount'))}</button>` : ''}
        <button class="btn block" data-pl="key">${ico('lock')} ${esc(t('plRedeem'))}</button>${o.end ? `<button class="chip block" data-pl="free">${esc(t('plKeepFree'))}</button>` : ''}`,
      onClick: (e, close) => {
        const tb = e.target.closest('[data-pl-term]');
        if (tb) { term = tb.dataset.plTerm; tb.parentNode.querySelectorAll('[data-pl-term]').forEach(x => { x.classList.toggle('on', x === tb); x.setAttribute('aria-pressed', x === tb); }); const pb = document.getElementById('pl-price'); if (pb) pb.outerHTML = priceBox(); return; }
        const b = e.target.closest('[data-pl]'); if (!b) return;
        if (b.dataset.pl === 'buy') { startCheckout(term); return; }
        if (b.dataset.pl === 'account') { close(); openLogin(); return; }
        if (b.dataset.pl === 'key') { close(); openRedeem(); return; }
        if (b.dataset.pl === 'free') { close(); planOverLimit(true); }
      },
      onClose: () => { if (o.end) planOverLimit(true); }
    });
  }
  // Pago desde la app: abre la tienda (Paddle) con tu cuenta, así el pago se aplica solo. Al volver se pregunta el plan.
  let planAskAt = 0;
  function startCheckout(term = 'forever') {
    const u = new URL('web/', location.href); u.searchParams.set('lang', state.lang); u.searchParams.set('term', term); if (auth) u.searchParams.set('uid', auth.uid);
    // v1.25: la tienda se abre dentro de la app (antes, en la app instalada del iPhone sustituía a la app y no había forma de volver)
    u.searchParams.set('embed', '1');
    const onMsg = e => {
      if (e.origin !== location.origin || !e.data || typeof e.data !== 'object') return;
      if (e.data.kg === 'shop-close' && shop) shop.close();
      if (e.data.kg === 'shop-paid') refreshPlan().then(p => { if (p.full) render(); });
    };
    window.addEventListener('message', onMsg);
    const shop = openModal({
      title: `<span class="row" style="gap:8px">${ico('sparkle')} ${esc(t('shopTitle'))}</span>`, cls: 'shop-full',
      body: `<iframe class="shop-frame" src="${esc(u.href)}" title="${esc(t('shopTitle'))}"></iframe>`,
      onMount: w => { const head = $('.sheet-head', w); if (head) head.insertAdjacentHTML('afterbegin', `<button class="icon-btn sm" data-m="x" aria-label="${esc(t('shopBack'))}">${ico('left')}</button>`); },
      onClose: () => { window.removeEventListener('message', onMsg); refreshPlan().then(p => { if (p.full) render(); }); }
    });
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && auth && Date.now() - planAskAt > 15000) { planAskAt = Date.now(); refreshPlan().then(p => { if (p.full) render(); }); } });
  function openTrialEnded() {
    if (state.planEndSeen === (planCache && planCache.ent && planCache.ent.trial_ends)) return;
    state.planEndSeen = planCache && planCache.ent && planCache.ent.trial_ends; save();
    openModal({
      title: esc(t('plEndTitle')),
      body: `<p class="muted" style="margin-top:0">${esc(t('plEndLead'))}</p>`,
      foot: `<button class="btn primary block" data-pl="more">${ico('sparkle')} ${esc(t('plBuy'))}</button><button class="btn block" data-pl="free">${esc(t('plKeepFree'))}</button>`,
      onClick: (e, close) => { const b = e.target.closest('[data-pl]'); if (!b) return; close(); if (b.dataset.pl === 'more') openUpsell({ end: true }); else planOverLimit(true); }
    });
  }
  // Con Free y más de 5 hábitos activos: elegir cuáles siguen. Los demás se archivan marcados (planArch) y vuelven al pagar.
  let planPickAsked = false;
  function planOverLimit(force = false) {
    const p = PL(); if (p.full || p.viewing) return;
    const act = state.habits.filter(h => !h.archived), lim = KGPlan.LIMITS.habits;
    if (act.length <= lim || (planPickAsked && !force)) return;
    planPickAsked = true;
    const sel = new Set(act.slice(0, lim).map(h => h.id));
    const draw = w => {
      $('#pl-pick', w).innerHTML = act.map(h => `<button type="button" class="calc-toggle ${sel.has(h.id) ? 'on' : ''}" data-plh="${esc(h.id)}" aria-pressed="${sel.has(h.id)}">${esc(h.icon || '')} ${esc(h.name)}</button>`).join('');
      $('#pl-n', w).textContent = t('plPickN', { n: sel.size });
    };
    whenFree(() => openModal({
      title: esc(t('plPickTitle')), dismissable: false,
      body: `<p class="muted" style="margin-top:0">${esc(t('plPickLead'))}</p><div class="row wrap" id="pl-pick" style="gap:6px"></div><p class="muted small" id="pl-n"></p>`,
      foot: `<button class="btn primary block" data-pl="ok">${ico('check')} ${esc(t('plPickOk'))}</button>`,
      onMount: w => draw(w),
      onClick: (e, close, w) => {
        const b = e.target.closest('[data-plh]');
        if (b) { const id = b.dataset.plh; if (sel.has(id)) sel.delete(id); else if (sel.size < lim) sel.add(id); else toast(t('plPickNeed')); draw(w); return; }
        if (!e.target.closest('[data-pl="ok"]')) return;
        act.forEach(h => { if (!sel.has(h.id)) { h.archived = true; h.planArch = true; } });
        save(); close(); render();
      }
    }));
  }
  function restorePlanArchived() {
    const back = state.habits.filter(h => h.planArch);
    if (!back.length) return;
    back.forEach(h => { h.archived = false; delete h.planArch; });
    save(); render(); toast(t('plRestored'));
  }
  function openRedeem() {
    if (!auth) { toast(t('plKeyNeedAccount')); openLogin(); return; }
    openModal({
      title: esc(t('plKeyTitle')),
      body: `<p class="muted" style="margin-top:0">${esc(t('plKeyLead'))}</p>
        <div class="row" style="gap:8px"><input class="input grow pl-key" id="pl-key" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="19" placeholder="${esc(t('plKeyPh'))}"><button class="btn" data-pl="paste">${esc(t('plKeyPaste'))}</button></div>`,
      foot: `<button class="btn primary block" data-pl="go">${ico('check')} ${esc(t('plKeyGo'))}</button>`,
      onInput: (e, w) => { if (e.target.id === 'pl-key') { const v = KGPlan.keyFormat(e.target.value); if (v !== e.target.value) e.target.value = v; } },
      onClick: async (e, close, w) => {
        const b = e.target.closest('[data-pl]'); if (!b) return;
        const inp = $('#pl-key', w);
        if (b.dataset.pl === 'paste') { try { inp.value = KGPlan.keyFormat(await navigator.clipboard.readText()); } catch (err) { inp.focus(); } return; }
        if (!KGPlan.keyValid(inp.value)) { toast(t('plKeyBadFormat')); return; }
        b.disabled = true;
        try {
          const r = await rpc('kg_redeem_key', { p_code: inp.value });
          if (r && r.error) { toast(r.error === 'locked' ? t('plKeyLocked') : r.error === 'used' ? t('plKeyUsed') : r.error === 'mine' ? t('plKeyMine') : t('plKeyBad', { n: Math.max(0, r.left == null ? 0 : r.left) })); return; }
          savePlanCache({ uid: auth.uid, ent: { ...r, at: Date.now() } });
          restorePlanArchived(); close(); sfx('unlock'); toast(t('plKeyOk')); render();
        } catch (err) { toast(t('plErr', { e: err.message })); } finally { b.disabled = false; }
      }
    });
  }
  // Ajustes → Tu plan
  function planHtml() {
    const p = PL(), until = p.until ? fmtDate(p.until.slice(0, 10)) : '';
    const sub = p.plan === 'trial' ? (p.daysLeft === 1 ? t('plTrialSub1') : t('plTrialSub', { n: p.daysLeft })) : p.plan === 'keepgoing' ? (p.source === 'special' ? t('plSpecialSub') : p.source === 'paddle' && until && p.term !== 'forever' ? t(p.term === 'year' ? 'plSubYear' : 'plSubMonth', { date: until }) : until ? t('plKgSubUntil', { date: until }) : t('plKgSub')) : t('plFreeSub');
    return `<div class="stack" style="gap:10px"><div class="row"><span class="pl-chip ${p.plan}">${esc(t(p.plan === 'keepgoing' ? 'plKeepgoing' : p.plan === 'trial' ? 'plTrial' : 'plFree'))}</span><span class="muted small grow">${esc(sub)}</span></div>
      <div class="row wrap">${p.plan !== 'keepgoing' ? `<button class="btn primary" data-s="plan-up">${ico('sparkle')} ${esc(t('plBuy'))}</button>` : ''}${p.source === 'paddle' && p.term !== 'forever' ? `<a class="chip" href="https://paddle.net" target="_blank" rel="noopener">${ico('gear')} ${esc(t('plSubManage'))}</a>` : ''}<button class="chip" data-s="plan-key">${ico('lock')} ${esc(t('plRedeem'))}</button>${isStaff() ? `<button class="chip" data-s="staff">${ico('gear')} ${esc(t('stTitle'))}</button>` : ''}</div></div>`;
  }
  const planHint = () => { const p = PL(); return t(p.plan === 'keepgoing' ? 'plKeepgoing' : p.plan === 'trial' ? 'plTrial' : 'plFree'); };
  // Insignia «KeepGoing» junto al @nametag (la tuya, y la de quien la tenga en tus chats)
  const planBadge = () => PL().plan === 'keepgoing' ? ` <span class="pl-badge">${esc(t('plBadge'))}</span>` : '';

  /* Panel del equipo: solo aparece si el servidor dice que eres dueño o desarrollador (kg_entitlement.role).
     Todo lo que hace pasa por funciones del servidor que vuelven a comprobarlo; no se anuncia en Novedades ni en Ayuda. */
  function openStaff() {
    if (!isStaff()) return;
    let wref, data = null, err = '', fresh = null;
    const owner = () => (data && data.role || PL().role) === 'owner';
    const chip = pl => `<span class="pl-chip ${pl}">${esc(t(pl === 'keepgoing' ? 'plKeepgoing' : pl === 'trial' ? 'plTrial' : 'plFree'))}</span>`;
    const load = async () => { try { data = await rpc('kg_staff_overview'); err = ''; } catch (e) { err = e.message; } if (wref && wref.isConnected) draw(); };
    const draw = () => {
      const v = state.ui.devView || '', U = (data && data.users) || [], K = (data && data.keys) || [], F = (data && data.flags) || [];
      const n = pl => U.filter(u => u.plan === pl).length;
      const seg = (attr, opts, cur) => `<div class="seg seg-sm">${opts.map(([val, k]) => `<button data-${attr}="${val}" class="${cur === val ? 'on' : ''}">${esc(t(k))}</button>`).join('')}</div>`;
      $('#stf', wref).innerHTML = `<div class="stack" style="gap:18px">
        <section><div class="acc-label">${esc(t('stViewAs'))}</div>${seg('stv', [['', 'stViewReal'], ['free', 'plFree'], ['trial', 'plTrial'], ['keepgoing', 'plKeepgoing']], v)}<p class="muted small">${esc(t('stViewHint'))}</p></section>
        ${err ? `<p class="muted small">${esc(t('stLoadErr', { e: err }))}</p>` : !data ? `<p class="muted small">${esc(t('loading'))}</p>` : `
        <p class="muted small" style="margin:0">${esc(t('stStats', { u: U.length, k: n('keepgoing'), t: n('trial'), f: n('free') }))}</p>
        <section><div class="acc-label">${esc(t('stGrant'))}</div><div class="stack" style="gap:8px">
          <input class="input" id="stg-tag" placeholder="${esc(t('stGrantTag'))}" autocomplete="off" autocapitalize="off">
          <div class="row wrap" style="gap:8px"><input class="input grow" id="stg-days" inputmode="numeric" placeholder="${esc(t('stGrantDays'))}"><input class="input grow" id="stg-note" placeholder="${esc(t('stGrantNote'))}"></div>
          <label class="row" style="gap:12px"><span class="switch"><input type="checkbox" id="stg-sp" checked><span></span></span><span class="small">${esc(t('stGrantSpecial'))}</span></label>
          <button class="btn" data-st="grant">${ico('sparkle')} ${esc(t('stGrant'))}</button></div></section>
        <section><div class="acc-label">${esc(t('stUsers'))}</div><div class="stack" style="gap:6px">${U.map(u => `<div class="st-row clay"><div class="grow"><b>${u.nametag ? '@' + esc(u.nametag) : '—'}</b> ${chip(u.plan)}${u.staff ? ` <span class="pl-chip staff">${esc(t(u.staff === 'owner' ? 'stOwner' : 'stDev'))}</span>` : ''}<div class="muted small">${esc(u.name || '')}${u.source ? ' · ' + esc(u.source) : ''}${u.until ? ' · ' + esc(fmtDate(String(u.until).slice(0, 10))) : ''}</div></div>
          <div class="row wrap" style="gap:6px">${u.plan === 'keepgoing' && !u.staff ? `<button class="chip sm" data-st="revoke" data-id="${esc(u.user_id)}" data-tag="${esc(u.nametag || '')}">${esc(t('stRevoke'))}</button>` : ''}${u.plan !== 'keepgoing' ? `<button class="chip sm" data-st="trial" data-id="${esc(u.user_id)}">${esc(t('stTrialReset'))}</button>` : ''}${owner() && u.nametag && u.staff !== 'owner' ? `<button class="chip sm" data-st="dev" data-tag="${esc(u.nametag)}" data-on="${u.staff ? '' : '1'}">${esc(t(u.staff ? 'stDevRemove' : 'stDevAdd'))}</button>` : ''}</div></div>`).join('')}</div></section>
        <section><div class="acc-label">${esc(t('stKeys'))}</div><div class="row wrap" style="gap:8px"><input class="input" id="stk-n" inputmode="numeric" value="1" style="width:70px" aria-label="${esc(t('stKeysN'))}">
          <select class="input" id="stk-term" aria-label="${esc(t('stKeysTerm'))}"><option value="forever">${esc(t('stTermForever'))}</option><option value="year">${esc(t('stTermYear'))}</option><option value="month">${esc(t('stTermMonth'))}</option></select>
          <input class="input grow" id="stk-note" placeholder="${esc(t('stGrantNote'))}"><button class="btn" data-st="keys">${ico('plus')} ${esc(t('stKeysNew'))}</button></div>
          ${fresh ? `<div class="st-fresh clay"><p class="small" style="margin-top:0"><b>${esc(t('stKeysDone'))}</b></p><pre class="pl-key">${esc(fresh.join('\n'))}</pre><button class="chip" data-st="copy">${esc(t('stKeysCopy'))}</button></div>` : ''}
          <div class="stack" style="gap:6px;margin-top:8px">${K.slice(0, 50).map(k => `<div class="st-row clay"><div class="grow"><b>…${esc(k.hint)}</b> <span class="muted small">${esc(t(k.term === 'year' ? 'stTermYear' : k.term === 'month' ? 'stTermMonth' : 'stTermForever'))}${k.note ? ' · ' + esc(k.note) : ''}</span><div class="muted small">${esc(k.revoked ? t('stKeyRevoked') : k.redeemed_at ? t('stKeyUsedBy', { tag: k.redeemed_tag || '—' }) : t('stKeyFree'))}</div></div>${!k.revoked && !k.redeemed_at ? `<button class="chip sm" data-st="kvoid" data-id="${esc(k.id)}">${esc(t('stKeyRevoke'))}</button>` : ''}</div>`).join('')}</div></section>
        <section><div class="acc-label">${esc(t('stFlags'))}</div><p class="muted small" style="margin-top:0">${esc(t('stFlagsHint'))}</p><div class="stack" style="gap:6px">${[...new Set([...Object.keys(KGPlan.FLAGS), ...F.map(f => f.key)])].map(k => { const f = F.find(x => x.key === k), m = f ? f.mode : ''; return `<div class="st-row clay"><div class="grow"><b>${esc(k)}</b>${f && f.note ? `<div class="muted small">${esc(f.note)}</div>` : ''}</div>${owner() ? `<div class="seg seg-sm">${[['off', 'stFlagModeOff'], ['staff', 'stFlagModeStaff'], ['all', 'stFlagModeAll']].map(([val, l]) => `<button data-stf="${esc(k)}" data-m2="${val}" class="${m === val ? 'on' : ''}">${esc(t(l))}</button>`).join('')}</div>` : `<span class="muted small">${esc(m || '—')}</span>`}</div>`; }).join('')}</div>
          ${owner() ? `<div class="row" style="gap:8px;margin-top:8px"><input class="input grow" id="stf-key" placeholder="${esc(t('stFlagKey'))}" autocapitalize="off"><button class="btn" data-st="flag">${ico('plus')} ${esc(t('stFlagAdd'))}</button></div>` : ''}</section>
        <section><div class="acc-label">${esc(t('stPreview'))}</div><p class="muted small" style="margin:0">KeepGoing ${esc(VERSION)} · ${esc(t('stPreviewHint'))}</p></section>`}
      </div>`;
    };
    const act = async (fn, args) => { try { await rpc(fn, args); toast(t('stSaved')); await load(); await refreshPlan(); } catch (e) { toast(e.message === 'owner only' ? t('stOwnerOnly') : t('plErr', { e: e.message })); } };
    openModal({
      title: `${ico('gear')} ${esc(t('stTitle'))}`, cls: 'wide', body: '<div id="stf"></div>',
      onMount: w => { wref = w; draw(); load(); },
      onClick: async (e, close, w) => {
        let el;
        if ((el = e.target.closest('[data-stv]'))) { state.ui.devView = el.dataset.stv; save(); planPickAsked = false; render(); draw(); return; }
        if ((el = e.target.closest('[data-stf]'))) { await act('kg_staff_flag', { p_key: el.dataset.stf, p_mode: el.dataset.m2, p_note: null }); return; }
        if (!(el = e.target.closest('[data-st]'))) return;
        const v = id => ($('#' + id, w) || {}).value || '';
        switch (el.dataset.st) {
          case 'grant': { const tag = v('stg-tag').trim(); if (!tag) return; const d = parseInt(v('stg-days'), 10); await act('kg_staff_grant', { p_tag: tag, p_source: $('#stg-sp', w).checked ? 'special' : 'grant', p_days: d > 0 ? d : null, p_note: v('stg-note') }); break; }
          case 'revoke': if (await confirmDialog(t('stRevokeQ', { tag: el.dataset.tag || '—' }))) await act('kg_staff_revoke', { p_user: el.dataset.id }); break;
          case 'trial': await act('kg_staff_trial_reset', { p_user: el.dataset.id }); break;
          case 'dev': await act('kg_staff_set_dev', { p_tag: el.dataset.tag, p_on: !!el.dataset.on }); break;
          case 'kvoid': await act('kg_staff_key_revoke', { p_id: el.dataset.id }); break;
          case 'flag': { const k = v('stf-key').trim(); if (!/^[a-zA-Z0-9_]{2,40}$/.test(k)) return; await act('kg_staff_flag', { p_key: k, p_mode: 'staff', p_note: null }); break; }
          case 'keys': {
            const nn = Math.min(50, Math.max(1, parseInt(v('stk-n'), 10) || 1));
            try { fresh = await rpc('kg_staff_keys_create', { p_n: nn, p_term: v('stk-term') || 'forever', p_note: v('stk-note') }); await load(); } catch (err2) { toast(t('plErr', { e: err2.message })); }
            break;
          }
          case 'copy': try { await navigator.clipboard.writeText((fresh || []).join('\n')); toast(t('copied')); } catch (err2) { /* nada */ } break;
        }
      }
    });
  }
  // Tarjeta en lugar de una función de pago (con Free)
  const planLockedCard = f => `<button class="pl-locked clay" data-pl-up="${esc(f)}">${ico('lock')}<span class="grow"><b>${esc(t('plf_' + f))}</b><small>${esc(t('plUpsellShort'))}</small></span>${ico('right')}</button>`;
  // Puertas: botones que abren funciones de pago. Se comprueban antes que cualquier otro manejador (fase de captura)
  const PLAN_GATES = [
    ['[data-act="calc-open"]', 'calc'], ['[data-act="ledger-import"], [data-act="ledger-imports"]', 'csv'],
    ['[data-act="ledger-share"]', 'ledgerShare'], ['[data-wo="cmp"]', 'compare'], ['[data-wo]', 'worth'],
    ['[data-tf-go="routines"], [data-tf-tab="routines"], [data-tf-qtab="routines"], [data-tf-q^="rt:"]', 'routines'], ['[data-tf="share"]', 'calShare'], ['[data-th-color], [data-th-bg="gradient"]', 'themes'],
    ['[data-more-range="365"], [data-more-range="all"], [data-act="led-range"][data-v="12"], [data-act="led-range"][data-v="all"]', 'history']
  ];
  document.addEventListener('click', e => {
    if (!e.target.closest) return;
    const up = e.target.closest('[data-pl-up]');
    if (up) { e.preventDefault(); e.stopImmediatePropagation(); openUpsell(up.dataset.plUp ? { feature: up.dataset.plUp } : {}); return; }
    // «Este año» solo entra en Free mientras el 1 de enero esté dentro de los últimos 90 días
    const yr = e.target.closest('[data-act="led-range"][data-v="y"]');
    if (yr && diffDays(todayKey().slice(0, 4) + '-01-01', todayKey()) >= KGPlan.LIMITS.chartDays && !KGPlan.allows(PL(), 'history')) { e.preventDefault(); e.stopImmediatePropagation(); openUpsell({ feature: 'history' }); return; }
    for (const [sel, f] of PLAN_GATES) {
      if (e.target.closest(sel) && !KGPlan.allows(PL(), f)) { e.preventDefault(); e.stopImmediatePropagation(); openUpsell({ feature: f }); return; }
    }
  }, true);
  function openLogin() {
    let wref;
    openModal({
      title: esc(t('setAccount')), body: '<div id="acc"></div>',
      onMount: w => { wref = w; $('#acc', w).innerHTML = accountHtml(); },
      onClose: () => { if (!state.onboarded) render(); }, // en el registro, el paso del @nametag se actualiza al entrar
      onClick: (e, close) => { const el = e.target.closest('[data-s]'); if (el) accountAction(el.dataset.s, wref, () => close()); }
    });
  }
  window.addEventListener('online', () => scheduleSync(300));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleSync(300); });
  setInterval(() => { if (!document.hidden) syncNow(); }, 60000);

  /* ---------- AJUSTES ---------- */
  const openAcc = new Set(); // apartados de Ajustes abiertos (se recuerdan mientras dure la sesión)
  function openSettings() {
    let wref;
    const draw = () => {
      const c = state.contract;
      // Lista desplegable por apartado; la pista de la derecha resume el valor actual
      const acc = (id, icon, title, hint, body) => `<details class="acc" data-acc="${id}" ${openAcc.has(id) ? 'open' : ''}><summary><span class="acc-ico">${icon}</span><span class="acc-txt"><b>${esc(title)}</b>${hint ? `<small>${esc(hint)}</small>` : ''}</span><span class="acc-chev">${ico('right')}</span></summary><div class="acc-body">${body}</div></details>`;
      const group = (label, items) => `<div class="acc-group"><div class="acc-label">${esc(label)}</div><div class="acc-list clay">${items.join('')}</div></div>`;
      const cLeft = c ? diffDays(todayKey(), c.endsAt) : 0;
      const nOff = PROMPTS.filter(p => !promptOn(p.id)).length, nRem = state.habits.filter(h => !h.archived && h.reminder && h.reminder.on).length;
      const preset = PRESETS.find(p => p.id === state.theme.preset);
      $('#st', wref).innerHTML = `<div class="stack" style="gap:20px">
        ${group(t('setGroupHelp'), [
          acc('help', ico('info'), t('helpTitle'), t('helpSub'), helpHtml()),
          acc('news', ico('sparkle'), t('whatsNew'), t('version', { v: VERSION }), `<button class="btn block" data-s="news">${ico('sparkle')} ${esc(t('whatsNewAll'))}</button>`)
        ])}
        ${group(t('setGroupGeneral'), [
          acc('plan', ico('sparkle'), t('plTitle'), planHint(), planHtml()),
          acc('account', ico('refresh'), t('setAccount'), auth ? auth.email : t('setNoAccount'), `<div id="st-acc">${accountHtml()}</div>`),
          acc('lang', ico('globe'), t('setLanguage'), state.lang === 'es' ? 'Español' : 'English', `<div class="seg">${[['es', 'Español'], ['en', 'English']].map(([l, n]) => `<button data-s-lang="${l}" class="${state.lang === l ? 'on' : ''}">${n}</button>`).join('')}</div>`),
          acc('sound', '🔊', t('soundTitle'), state.soundOn !== false ? t('soundOn') : t('soundOff'), `<label class="row" style="gap:14px"><span class="switch"><input type="checkbox" data-s-sound ${state.soundOn !== false ? 'checked' : ''}><span></span></span><span class="grow"><b>${esc(t('soundLabel'))}</b><br><span class="muted small">${esc(t('soundHint'))}</span></span></label><div class="row wrap" style="margin-top:12px"><button class="chip" data-s-sound-test>▶ ${esc(t('soundTest'))}</button></div>`),
          acc('look', ico('palette'), t('setLook'), `${fontFamily(state.theme.font)} · ${preset ? presetName(preset) : t('themeCustom')}`, `<div id="st-theme">${themeEditorHtml()}</div>`)
        ])}
        ${group(t('setGroupCommit'), [
          acc('contract', ico('doc'), t('setContract'), c ? (cLeft < 0 ? t('contractEnded') : t('contractActive', { n: cLeft })) : t('contractNone'), `<div class="row wrap"><button class="chip" data-s="contract">${esc(c ? t('contractView') : t('contractSignNow'))}</button>${c ? `<button class="chip" data-s="renew">${ico('refresh')} ${esc(t('contractRenew'))}</button>` : ''}</div>`),
          acc('commit', '⭐', t('commitTitle'), t('commit_' + state.commitment), `<div id="st-commit">${commitSegHtml()}</div>`),
          acc('caprice', '💶', t('capConverter'), `${t('capShort', { m: fmtMoney(CAP.tenPointsValue(state.caprice.income, capP())) })}`, capHtml()),
          acc('vac', '🏖️', t('vacTitle'), activeVacation() ? t('vacActive', { date: fmtDate(activeVacation().to) }) : '', `<div class="row wrap"><span class="grow muted small">${esc(t('vacHintShort'))}</span><button class="chip" data-s="vacations">${esc(t('vacManage'))}</button></div>`)
        ])}
        ${group(t('setGroupNotices'), [
          acc('push', ico('bell'), t('pushTitle'), nRem ? t('setRemN', { n: nRem }) : '', `<div id="st-push"><p class="muted small">${esc(t('loading'))}</p></div>`),
          acc('prompts', '💬', t('promptsTitle'), nOff ? t('setOffN', { n: nOff }) : t('setAllOn'), `<p class="muted small" style="margin-top:0">${esc(t('promptsHint'))}</p>${promptsSettingsHtml()}`)
        ])}
        ${group(t('setGroupPrivacy'), [
          acc('amounts', ico('eyeOff'), t('privacyMode'), privacyOn() ? t('privacyModeOn') : t('privacyModeOff'), `<label class="row" style="gap:14px"><span class="switch"><input type="checkbox" data-s-privacy ${privacyOn() ? 'checked' : ''}><span></span></span><span class="grow"><b>${esc(t('privacyModeLabel'))}</b><br><span class="muted small">${esc(t('privacyModeHint'))}</span></span></label>${flipSupported() ? `<label class="row" style="gap:14px;margin-top:14px"><span class="switch"><input type="checkbox" data-s-motion ${flipOn() ? 'checked' : ''}><span></span></span><span class="grow"><b>📱 ${esc(t('motionLabel'))}</b><br><span class="muted small">${esc(t('motionHint'))}</span></span></label>` : ''}`),
          acc('vault', ico('lock'), t('vaultTitle'), !state.ledgerVault ? t('vaultNone') : ledgerOpen() ? t('vaultIsOpen') : t('vaultIsLocked'), state.ledgerVault ? `<p class="muted small" style="margin-top:0">${esc(t('vaultSettingsHint'))}</p><div class="row wrap">${ledgerOpen() ? `<button class="chip" data-s="vault-lock">${ico('lock')} ${esc(t('vaultLock'))}</button><button class="chip" data-s="vault-change">${esc(t('vaultChange'))}</button><button class="chip" data-s="vault-sec">🔐 ${esc(t('vaultSecurity'))}</button>` : ''}<button class="chip" data-s="vault-wipe" style="color:#e5484d">${ico('trash')} ${esc(t('vaultForgot'))}</button></div>` : `<p class="muted small" style="margin:0">${esc(t('vaultNoneHint'))}</p>`),
          acc('priv', '🔒', t('privacyTitle'), profileOf().enabled ? t('setPublicOn') : t('setPublicOff'), `<div id="st-priv">${privacyHtml()}</div>`),
          acc('hiddenw', '🧩', t('hwTitle'), (state.hiddenW || []).length ? t('hwN', { n: state.hiddenW.length }) : '', `<p class="muted small" style="margin-top:0">${esc(t('hwHint'))}</p><div id="st-hw">${hiddenWHtml()}</div>`),
          acc('data', ico('download'), t('setData'), '', `<p class="muted small" style="margin-top:0">${esc(t('dataHint'))}</p>
            <div class="row wrap"><button class="btn" data-s="export">${ico('download')} ${esc(t('exportData'))}</button><button class="btn" data-s="import">${ico('upload')} ${esc(t('importData'))}</button><button class="btn" data-s="report">📄 ${esc(t('reportTitle'))}</button></div>
            <input type="file" id="st-file" accept=".json,application/json" class="hidden">
            <div class="row wrap" style="margin-top:14px"><button class="chip" data-s="replay">${ico('refresh')} ${esc(t('replayOnboarding'))}</button><button class="chip" data-s="reset" style="color:#e5484d">${ico('trash')} ${esc(t('resetData'))}</button></div>`)
        ])}
        <p class="muted small center" style="margin:0">KeepGoing · ${esc(t('version', { v: VERSION }))}</p>
      </div>`;
      updateCap(wref);
    };
    openModal({
      title: esc(t('settings')), cls: 'wide', body: '<div id="st"></div>',
      onMount: w => {
        wref = w; draw();
        w.addEventListener('toggle', e => { const d = e.target.closest && e.target.closest('details[data-acc]'); if (!d) return; if (d.open) openAcc.add(d.dataset.acc); else openAcc.delete(d.dataset.acc); }, true);
        bindThemeEditor(w, () => { $('#st-theme', w).innerHTML = themeEditorHtml(); render(); });
        bindCap(w, () => render());
        w.addEventListener('change', e => {
          if (e.target.id === 'st-file' && e.target.files[0]) importFile(e.target.files[0], w);
          // Avisos: activar/desactivar y nota
          const tg = e.target.dataset && e.target.dataset.promptToggle;
          if (tg) { state.prompts[tg] = { ...(state.prompts[tg] || {}), off: !e.target.checked }; save(); toast(t(e.target.checked ? 'promptOnToast' : 'promptOffToast')); }
          const nt = e.target.dataset && e.target.dataset.promptNote;
          if (nt) { state.prompts[nt] = { ...(state.prompts[nt] || {}), note: e.target.value.trim() }; save(); toast(t('saved')); }
          if (e.target.dataset && e.target.dataset.ntf) { state.notif = { ...NOTIF0, ...state.notif, [e.target.dataset.ntf]: e.target.checked }; const at = e.target.closest('.ntf-row').querySelector('[data-ntf-at]'); if (at) at.disabled = !e.target.checked; save(); toast(t(e.target.checked ? 'ntfOn' : 'ntfOff')); }
          if (e.target.dataset && e.target.dataset.ntfAt && /^\d{2}:\d{2}$/.test(e.target.value)) { state.notif = { ...NOTIF0, ...state.notif, [e.target.dataset.ntfAt]: e.target.value }; save(); toast(t('saved')); }
          if (e.target.id === 'pet-name') { petSetName(e.target.value); toast(t('saved')); }
          if (e.target.closest && e.target.closest('#st-priv')) privacyChange(e, w);
          if (e.target.matches && e.target.matches('[data-s-sound]')) { state.soundOn = e.target.checked; save(); if (state.soundOn) sfx('toggle'); toast(t(state.soundOn ? 'soundOnToast' : 'soundOffToast')); }
          if (e.target.matches && e.target.matches('[data-s-motion]')) setFlip(e.target.checked);
          if (e.target.matches && e.target.matches('[data-s-privacy]')) { setPrivacy(e.target.checked); render(); toast(t(e.target.checked ? 'privacyOnToast' : 'privacyOffToast')); }
        });
        const refreshPush = async () => { const el = $('#st-push', w); if (el) el.innerHTML = notifSettingsHtml(await pushStatus()); };
        w._refreshPush = refreshPush; refreshPush();
      },
      onClick: async (e, close, w) => {
        const q = s => e.target.closest(s); let el;
        if ((el = q('[data-s-lang]'))) { state.lang = el.dataset.sLang; save(); render(); draw(); $('.sheet-head h2', w).textContent = t('settings'); return; }
        if ((el = q('[data-commit]'))) { setCommitment(el.dataset.commit); $('#st-commit', w).innerHTML = commitSegHtml(); render(); sfx('toggle'); return; }
        if (q('[data-s-sound-test]')) { const seq = ['complete', 'points', 'perfect', 'levelup']; seq.forEach((n, i) => setTimeout(() => sfx(n), i * 900)); return; }
        if (petSettingsClick(e, w)) return;
        if (!(el = q('[data-s]'))) return;
        switch (el.dataset.s) {
          case 'vacations': openVacations(); break;
          case 'vault-lock': lockByHand(); render(); draw(); toast(t('vaultLocked')); break;
          case 'vault-change': openVaultPassword(); break;
          case 'vault-sec': openVaultSecurity(); break;
          case 'vault-wipe': await confirmVaultWipe(); draw(); break;
          case 'push-on': await enablePush(); w._refreshPush(); break;
          case 'push-off': await disablePush(); w._refreshPush(); break;
          case 'push-test': await testPush(); break;
          case 'pf-copy': try { await navigator.clipboard.writeText(profileUrl(profileOf().slug)); toast(t('copied')); } catch (err) { /* nada */ } break;
          case 'sync-now': case 'sign-in': case 'sign-up': case 'sign-out':
            await accountAction(el.dataset.s, w, () => { $('#st-acc', w).innerHTML = accountHtml(); });
            if ($('#st-acc', w)) $('#st-acc', w).innerHTML = accountHtml();
            break;
          case 'contract': openContract(); break;
          case 'renew': renewContract(); draw(); break;
          case 'plan-up': openUpsell(); break;
          case 'plan-key': close(); openRedeem(); break;
          case 'staff': close(); openStaff(); break;
          case 'export': exportData(); break;
          case 'report': close(); openReport(); break;
          case 'import': $('#st-file', w).click(); break;
          case 'hw-restore': state.hiddenW = (state.hiddenW || []).filter(k => k !== el.dataset.v); save(); render(); draw(); toast(t('hwRestored')); break;
          case 'news': close(); openNewsLog(); break;
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
        checkPerfectMastery(true);
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

  /* ---------- nivel, puntos de compromiso y Dinero Caprichable ---------- */
  const COMMIT_LEVELS = CAP.LEVELS;
  // v1.21: un único porcentaje para el Dinero Caprichable (0,5 % por defecto)
  const capP = () => (state.caprice.p != null ? state.caprice.p : CAP.DEFAULT_P);
  /* ---------- v1.22: divisas. Moneda principal de la Libreta (Ajustes de la Libreta → Divisas) y cambios del BCE ---------- */
  const FX = window.KGFx, FX_KEY = 'keepgoing.fx';
  const ledgerMain = () => (state.ledgerPrefs && FX.isCode(state.ledgerPrefs.cur) && state.ledgerPrefs.cur) || 'EUR';
  const fxManual = () => (state.ledgerPrefs && state.ledgerPrefs.fxManual) || {};
  // Caché de este dispositivo: { latest: { date, rates, at }, days: { 'AAAA-MM-DD': rates } } (rates = unidades por 1 EUR)
  let fxCache = (() => { try { return JSON.parse(localStorage.getItem(FX_KEY)) || {}; } catch (e) { return {}; } })();
  const fxSaveCache = () => { try { localStorage.setItem(FX_KEY, JSON.stringify(fxCache)); } catch (e) { /* sin espacio */ } };
  let fxBusy = null;
  const fxFetch = day => fetch(`https://api.frankfurter.dev/v1/${day}`).then(r => { if (!r.ok) throw new Error('fx ' + r.status); return r.json(); });
  function fxLatest(force = false) {
    const l = fxCache.latest;
    if (!force && l && Date.now() - l.at < 6 * 36e5) return Promise.resolve(l);
    if (!fxBusy) fxBusy = fxFetch('latest').then(j => { fxCache.latest = { date: j.date, rates: j.rates || {}, at: Date.now() }; fxSaveCache(); return fxCache.latest; })
      .catch(() => fxCache.latest || null).finally(() => { fxBusy = null; });
    return fxBusy;
  }
  async function fxDay(day) {
    if (!day || day >= todayKey()) { const l = await fxLatest(); return l && l.rates; }
    const days = fxCache.days || (fxCache.days = {});
    if (days[day]) return days[day];
    try {
      const j = await fxFetch(day); days[day] = j.rates || {};
      const ks = Object.keys(days).sort(); while (ks.length > 120) delete days[ks.shift()];
      fxSaveCache(); return days[day];
    } catch (e) { const l = await fxLatest(); return l && l.rates; }
  }
  // Cambio a la moneda principal: ahora (síncrono, con lo que haya en caché) o en un día concreto
  const fxRateNow = cur => FX.rateFor(cur, ledgerMain(), (fxCache.latest || {}).rates, fxManual());
  async function fxRateOn(cur, day) { const m = Number(fxManual()[cur]); if (m > 0) return m; return FX.cross(await fxDay(day), cur, ledgerMain()); }
  // Importe en cualquier moneda (las que Intl no conoce, como BTC o USDT, van con su código)
  function fmtCur(v, cur, opts = {}) {
    try { return new Intl.NumberFormat(state.lang, { style: 'currency', currency: cur, minimumFractionDigits: opts.min ?? 2, maximumFractionDigits: opts.max ?? 2 }).format(v); }
    catch (e) { return `${new Intl.NumberFormat(state.lang, { minimumFractionDigits: opts.min ?? 2, maximumFractionDigits: opts.max ?? 8 }).format(v)} ${cur}`; }
  }
  // «1 $ = 0,8912 €»
  const fxRateTxt = (cur, rate) => `${fmtCur(1, cur, { min: 0, max: 0 })} = ${fmtCur(FX.roundRate(rate), ledgerMain(), { min: 2, max: 6 })}`;
  const fmtMoney = v => fmtCur(v, ledgerMain());
  const fmtPct = v => new Intl.NumberFormat(state.lang, { maximumFractionDigits: 4 }).format(v) + ' %';
  const fmtPctIn = v => new Intl.NumberFormat(state.lang, { maximumFractionDigits: 4, useGrouping: false }).format(v);
  const fmtPts = v => new Intl.NumberFormat(state.lang, { maximumFractionDigits: 2 }).format(v);
  function levelPill() {
    const lv = levelInfo(), pi = pointsInfo();
    return `<button class="lvl-pill clay" data-act="level" aria-label="${esc(t('lvTitle'))}"><span class="lvl-num">${lv.level}</span><span class="lvl-txt"><b>${esc(lv.title)}</b><span>${esc(t('ptsN', { n: fmtPts(pi.points) }))}</span></span></button>`;
  }
  // El cambio de nivel solo afecta a los días futuros (desde mañana); en la configuración inicial o sin hábitos, desde hoy
  function setCommitment(lv) {
    const today = todayKey(), started = state.onboarded && state.habits.length > 0;
    const k = started ? addDays(today, 1) : today;
    state.commitHistory = state.commitHistory.filter(c => c.from < k);
    if (!(started && commitOn(today) === lv)) state.commitHistory.push({ from: k, level: lv });
    state.commitHistory.sort((a, b) => a.from < b.from ? -1 : 1);
    state.commitment = lv;
    if (state.contract) state.contract.level = lv; // el contrato sigue al nivel elegido
    save();
  }
  function commitSegHtml() {
    const now = commitOn(todayKey()), pending = now !== state.commitment;
    return `<div class="seg">${COMMIT_LEVELS.map(l => `<button type="button" data-commit="${l}" class="${state.commitment === l ? 'on' : ''}" aria-pressed="${state.commitment === l}">${esc(t('commit_' + l))}</button>`).join('')}</div>
      <p class="muted small" style="margin:8px 0 0">${esc(t('commitd_' + state.commitment))}</p>
      ${pending ? `<p class="small commit-pending" role="status">${esc(t('commitPending', { a: t('commit_' + now), b: t('commit_' + state.commitment) }))}</p>` : ''}`;
  }

  /* Migración de la antigua tienda de recompensas (una sola vez). Los puntos de compromiso y el Dinero Caprichable
     cuentan desde hoy. Las recompensas, canjes y ⭐ antiguos no encajan en el nuevo sistema: NO se borran,
     se guardan tal cual (state.rewards / state.redemptions) y se avisa al usuario. */
  function migrateShop() {
    // v1.21: desde hoy los puntos son iguales para todos los niveles y el Dinero Caprichable usa un único porcentaje
    if (!state.pointsV2) { state.pointsV2 = todayKey(); setCaprice({ p: state.caprice.p != null ? state.caprice.p : CAP.DEFAULT_P }); }
    if (state.pointsSince) return;
    const bal = state.habits.length ? pointsInfo().starBalance : 0;
    const hasLegacy = state.rewards.length || state.redemptions.length || bal;
    state.pointsSince = todayKey();
    if (hasLegacy) state.legacyShop = { date: todayKey(), starBalance: bal, rewards: state.rewards.length, redemptions: state.redemptions.length, seen: false };
    save();
  }
  // Total de Dinero Caprichable: dinero VISUAL (no se suma ni se descuenta del saldo real)
  function capTotalHtml() {
    const pi = pointsInfo(), d = dayInfo(todayKey());
    return `<div class="cap-total" role="group" aria-label="${esc(t('capTitle'))}">
      <div class="cap-total-head"><span>${ico('wallet')} ${esc(t('capTitle'))}</span><span class="cap-badge">${esc(t('capBadge'))}</span></div>
      <div class="cap-total-amount">${esc(money(pi.money))}</div>
      <div class="small">${esc(t('capToday', { p: fmtPts(d.cpts), m: money(d.money) }))}</div>
      <p class="muted small" style="margin:6px 0 0">${esc(t('capNotReal'))}</p>
    </div>`;
  }

  /* v1.24: widget de la Libreta con dos partes independientes: Dinero Caprichable (puntos) y la Diferencia acumulada del
     Presupuesto global desde su fecha «Desde» (la misma que se ve en Presupuesto). Con el interruptor se suman en un total. */
  function capBudgetAcc() {
    const b = (LV.budgets || []).find(x => x.id === BUD_GLOBAL); if (!b) return null;
    const nowYm = todayKey().slice(0, 7), u = budUi(), first = LED.budgetFirst(b) || nowYm;
    const from = /^\d{4}-\d{2}$/.test(u.from[b.id] || '') ? u.from[b.id] : first;
    const rows = from <= nowYm ? LED.budgetRows(b, NET(LV.entries), from, nowYm) : [];
    return { acc: rows.length ? rows[rows.length - 1].acc : 0, from };
  }
  function capWidgetHtml() {
    const pi = pointsInfo(), d = dayInfo(todayKey()), ba = capBudgetAcc(), on = !!state.ledgerPrefs.capSum && ba, priv = privacyOn();
    const accE = ba ? ba.acc / 100 : 0, sign = v => (v > 0 ? '+' : v < 0 ? '−' : '') + money(Math.abs(v));
    return `<section class="cap-wrap" aria-label="${esc(t('capTitle'))}">
      <button class="cap-link" data-act="caprice" aria-label="${esc(t('capOpen'))}"><div class="cap-total"><div class="cap-total-head"><span>${ico('wallet')} ${esc(t('capTitle'))}</span><span class="cap-badge">${esc(t('capBadge'))}</span></div>
        <div class="cap-total-amount">${esc(money(pi.money))}</div><div class="small">${esc(t('capToday', { p: fmtPts(d.cpts), m: money(d.money) }))}</div></div></button>
      ${ba ? `<button class="cap-link cap-acc" data-act="ledger-budget"><div class="cap-total"><div class="cap-total-head"><span>${ico('budget')} ${esc(t('capAccTitle'))}</span></div>
        <div class="cap-total-amount ${accE < 0 ? 'amt-out' : 'amt-in'} ${priv ? 'priv' : ''}">${esc(sign(accE))}</div><div class="small muted">${esc(t('budAccLabel', { m: budYmLabel(ba.from) }))}</div></div></button>
        <label class="row cap-sum" style="gap:14px"><span class="switch"><input type="checkbox" data-led-opt="capsum" ${on ? 'checked' : ''}><span></span></span><span class="grow"><b>${esc(t('capSumQ'))}</b><br><span class="muted small">${esc(t('capSumHint'))}</span></span></label>
        ${on ? `<div class="cap-total cap-sum-total"><div class="cap-total-head"><span>${ico('coins')} ${esc(t('capSumTitle'))}</span></div><div class="cap-total-amount ${priv ? 'priv' : ''}">${esc(money(pi.money + accE))}</div></div>` : ''}`
        : `<p class="muted small center" style="margin:0">${esc(t('capAccNone'))}</p>`}
      <p class="muted small center" style="margin:0">${esc(t('capNotReal'))}</p></section>`;
  }
  /* Conversor: 10 puntos = ingreso neto total × (porcentaje / 100). Cada nivel tiene su porcentaje (modificable).
     Los cambios se guardan desde hoy en un historial: no recalculan el Dinero Caprichable de días pasados. */
  function setCaprice(patch) {
    const c = state.caprice, k = todayKey();
    if (patch.income != null) c.income = patch.income;
    if (patch.pct) c.pct = { ...c.pct, ...patch.pct };
    if (patch.p != null) c.p = patch.p;
    c.history = c.history.filter(h => h.from !== k);
    c.history.push({ from: k, income: c.income, pct: { ...c.pct }, ...(c.p != null ? { p: c.p } : {}) });
    c.history.sort((a, b) => a.from < b.from ? -1 : 1);
    save();
  }
  function capHtml() {
    const c = state.caprice;
    return `<div class="cap-conv" data-cap>
      <p class="muted small" style="margin-top:0">${esc(t('capFormula'))}</p>
      <div class="cap-slider">
        <div class="cap-track" role="slider" tabindex="0" aria-valuemin="0.1" aria-valuemax="1" aria-label="${esc(t('capSliderLabel'))}">
          <span class="cap-line" aria-hidden="true"></span>
          ${CAP.DOTS.map((d, i) => `<button type="button" class="cap-dot" data-cap-dot="${i}" style="left:${d.pos}%" tabindex="-1" aria-label="${esc(fmtPct(d.pct))}"><span>${i + 1}</span></button>`).join('')}
          <span class="cap-thumb" aria-hidden="true"></span>
        </div>
        <div class="cap-labels" aria-hidden="true">${CAP.DOTS.map(d => `<span style="left:${d.pos}%">${esc(fmtPct(d.pct))}</span>`).join('')}</div>
      </div>
      <label class="field cap-pct"><span data-cap-pct-label></span><span class="cap-input"><input class="input" data-cap-pct inputmode="decimal" autocomplete="off"><b>%</b></span></label>
      <p class="small cap-hint" data-cap-hint role="status"></p>
      <div class="cap-preview">
        <h4>${esc(t('capPreview'))}</h4>
        <label class="field"><span>${esc(t('capIncome'))}</span><span class="cap-input"><input class="input" data-cap-income inputmode="decimal" autocomplete="off" value="${esc(fmtPctIn(c.income))}"><b>${esc(curSym())}</b></span></label>
        ${monthIncome() > 0 ? `<button type="button" class="chip" data-cap-use-income style="margin-top:8px">💼 ${esc(t('capUseIncome', { m: cents(monthIncome()) }))}</button>` : ''}
        <p class="small" style="margin:10px 0 6px">${esc(t('capEquals'))}</p>
        <ul class="cap-prev-list"><li data-cap-prev class="on"><span><small data-cap-prev-pct></small></span><b data-cap-prev-val></b></li></ul>
      </div>
    </div>`;
  }
  // Actualiza el conversor sin volver a pintarlo (para que el marcador se desplace con animación)
  function updateCap(root) {
    const box = $('[data-cap]', root); if (!box) return;
    const c = state.caprice, pct = capP();
    const inc = box._income != null ? box._income : c.income;
    $('.cap-thumb', box).style.left = CAP.sliderPos(pct) + '%';
    const tr = $('.cap-track', box);
    tr.setAttribute('aria-valuenow', pct); tr.setAttribute('aria-valuetext', fmtPct(pct));
    $('[data-cap-pct-label]', box).textContent = t('capPctOne');
    const pi = $('[data-cap-pct]', box); if (document.activeElement !== pi) pi.value = fmtPctIn(pct);
    $('[data-cap-hint]', box).textContent = pct > 1 ? t('capAbove') : pct < 0.1 ? t('capBelow') : '';
    $$('[data-cap-prev]', box).forEach(li => {
      $('[data-cap-prev-pct]', li).textContent = fmtPct(pct);
      $('[data-cap-prev-val]', li).textContent = fmtMoney(CAP.tenPointsValue(inc, pct));
    });
  }
  function bindCap(root, onSaved = () => {}) {
    const box = () => $('[data-cap]', root);
    const setPct = (v, animate = true) => {
      const b = box(); if (!b) return;
      b.classList.toggle('no-anim', !animate);
      setCaprice({ p: v }); updateCap(root); onSaved();
    };
    root.addEventListener('click', e => {
      const b = box(); if (!b) return; let el;
      if ((el = e.target.closest('[data-cap-dot]'))) { setPct(CAP.DOTS[+el.dataset.capDot].pct); return; }
      if (e.target.closest('[data-cap-use-income]')) { const v = monthIncome() / 100; b._income = v; setCaprice({ income: v }); $('[data-cap-income]', b).value = fmtPctIn(v); updateCap(root); onSaved(); toast(t('saved')); return; }
    });
    // Arrastrar o pulsar en la barra
    root.addEventListener('pointerdown', e => {
      const tr = e.target.closest('.cap-track'); if (!tr || e.target.closest('[data-cap-dot]')) return;
      const r = tr.getBoundingClientRect(), at = x => CAP.pctFromPos((x - r.left) / r.width * 100);
      tr.classList.add('dragging'); tr.setPointerCapture && tr.setPointerCapture(e.pointerId);
      setPct(at(e.clientX), false);
      const move = ev => setPct(at(ev.clientX), false);
      const up = () => { tr.classList.remove('dragging'); tr.removeEventListener('pointermove', move); tr.removeEventListener('pointerup', up); tr.removeEventListener('pointercancel', up); };
      tr.addEventListener('pointermove', move); tr.addEventListener('pointerup', up); tr.addEventListener('pointercancel', up);
    });
    // Teclado: ← más porcentaje (hacia Chill), → menos (hacia Locked-In)
    root.addEventListener('keydown', e => {
      const tr = e.target.closest('.cap-track'); if (!tr) return;
      const cur = CAP.sliderPos(capP());
      const pos = { ArrowLeft: cur - 2.5, ArrowDown: cur + 2.5, ArrowRight: cur + 2.5, ArrowUp: cur - 2.5, Home: 10, End: 90 }[e.key];
      if (pos == null) return;
      e.preventDefault(); setPct(CAP.pctFromPos(pos));
    });
    // Ingreso: la vista previa cambia al instante; se guarda si es válido
    root.addEventListener('input', e => {
      const b = box(); if (!b) return;
      if (e.target.matches('[data-cap-income]')) {
        const v = CAP.parseNumber(e.target.value);
        b._income = v != null && v >= 0 ? v : 0; updateCap(root);
        if (v != null && v > 0) { setCaprice({ income: v }); onSaved(); }
      }
    });
    // Porcentaje escrito a mano: se acepta tal cual (aunque esté fuera de 0,1–1 %) y el marcador se desplaza despacio
    root.addEventListener('change', e => {
      const b = box(); if (!b || !e.target.matches('[data-cap-pct]')) return;
      const v = CAP.parseNumber(e.target.value);
      if (v == null || !(v > 0)) { toast(t('capPctInvalid')); e.target.value = fmtPctIn(capP()); return; }
      setPct(v); e.target.value = fmtPctIn(v);
    });
    root.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-cap-pct], [data-cap-income]')) e.target.blur(); });
    updateCap(root);
  }

  function openLevel() {
    let wref;
    const draw = () => {
      const lv = levelInfo(), pi = pointsInfo(), d = dayInfo(todayKey());
      $('#lvl', wref).innerHTML = `<div class="stack" style="gap:18px">
        <div class="row" style="gap:16px"><div class="lvl-big">${lv.level}</div><div class="grow"><div style="font-size:22px;font-weight:var(--fw-title)">${esc(lv.title)}</div>
          <div class="muted small">${esc(t('lvXp', { a: fmtNum(lv.xp), b: fmtNum(lv.to) }))}</div><div class="bar" style="margin-top:8px"><i style="width:${lv.pct}%"></i></div></div></div>
        <div class="kpis" style="margin:0"><div class="kpi clay"><b>${fmtPts(d.cpts)}<small>/${d.max || 10}</small></b><span>${esc(t('ptsToday'))}</span></div><div class="kpi clay"><b>${fmtPts(pi.points)}</b><span>${esc(t('ptsTotal'))}</span></div><div class="kpi clay"><b>${pi.perfectDays}</b><span>${esc(t('perfectDays'))}</span></div><div class="kpi clay"><b>${pi.bestPerfectRun}</b><span>${esc(t('perfectRun'))}</span></div></div>
        <section><h3 class="section-title">${esc(t('commitTitle'))}</h3>${commitSegHtml()}</section>
        <p class="muted small" style="margin:0">${esc(t('ptsHow', { since: fmtDate(state.pointsSince || todayKey()), since2: fmtDate(state.pointsV2 || todayKey()) }))}</p>
      </div>`;
    };
    openModal({
      title: `⭐ ${esc(t('lvTitle'))}`, cls: 'wide', body: '<div id="lvl"></div>',
      onMount: w => { wref = w; draw(); },
      onClick: (e) => {
        const el = e.target.closest('[data-commit]');
        if (el) { setCommitment(el.dataset.commit); draw(); render(); }
      }
    });
  }

  /* =========================================================
     LIBRETA DE GASTOS (Fase 2)
     Importes en céntimos enteros. Solo viajan a la copia privada de la cuenta, nunca a grupos ni perfiles.
     ========================================================= */
  const LED = window.KGLedger;
  // v1.23.4: lista con los vinculados ya netos (para sumar, nunca para guardar ni para pintar filas)
  // v1.25: un gasto «Pendiente de devolver» no cuenta (ni en gastos ni en el patrimonio) hasta que se marca como devuelto
  const NET = list => DEBT.zeroDue(LED.netLinked(list, LV.entries));
  const DEBT = window.KGDebts;
  const privacyOn = () => !!(state.ledgerPrefs && state.ledgerPrefs.privacy);
  // Importe visible respetando el modo privacidad («•••••»)
  const money = v => LED.mask(fmtMoney(v), privacyOn());
  const cents = c => money((c || 0) / 100);
  const catOf = id => LV.cats.find(c => c.id === id) || LV.cats.find(c => c.id === 'other') || { id: 'other', icon: '📦', key: 'catOther', type: 'both' };
  const catName = c => c.name || t(c.key || 'catOther');
  const ledgerMonth = () => { const m = state.ui.ledgerMonth; return /^\d{4}-\d{2}$/.test(m || '') ? m : todayKey().slice(0, 7); };
  function setPrivacy(on) { state.ledgerPrefs = { ...(state.ledgerPrefs || {}), privacy: !!on }; save(); }
  /* ---------- cifrado de la Libreta (contraseña al abrir) ----------
     En el estado (y en la nube) cada movimiento, categoría y repetición se guarda como { id, enc: { iv, ct } }.
     Descifrados solo viven en memoria (LV) mientras la Libreta está abierta. Sin la contraseña no se pueden leer. */
  const VAULT = window.KGVault, DEV = window.KGVaultDevice;
  const LKINDS = [['entries', 'ledgerEntries'], ['cats', 'ledgerCats'], ['recurring', 'ledgerRecurring'], ['events', 'ledgerEvents'], ['calc', 'ledgerCalc'], ['budgets', 'ledgerBudgets'], ['projs', 'ledgerProjs'], ['imports', 'ledgerImports'], ['worth', 'ledgerWorth'], ['contacts', 'ledgerContacts']];
  const LV = { key: null, raw: null, vid: null, entries: [], cats: [], recurring: [], events: [], calc: [], budgets: [], projs: [], imports: [], worth: [], contacts: [], plain: new Map(), known: new Set(), bad: 0, sig: '', busy: false };
  const vaultSame = () => !!state.ledgerVault && LV.vid === VAULT.vidOf(state.ledgerVault);
  const ledgerOpen = () => !!LV.key && vaultSame();
  const ledgerSig = () => LKINDS.map(([, sk]) => state[sk].map(x => x.id + ':' + (x.enc ? x.enc.iv : 'p')).join(',')).join('|');
  // Descifra el estado en memoria (al abrir y cuando la sincronización trae cambios)
  async function ledgerLoad() {
    let bad = 0, legacy = false;
    for (const [k, sk] of LKINDS) {
      const out = [];
      for (const x of state[sk]) {
        if (!x.enc) { const { mt, ...p } = x; out.push(p); legacy = true; continue; }
        try { const p = { ...(await VAULT.decrypt(LV.key, x.enc)), id: x.id }; out.push(p); LV.plain.set(x.id, JSON.stringify(p)); LV.known.add(x.id); }
        catch (e) { bad++; }
      }
      LV[k] = out;
    }
    if (!LV.cats.length) LV.cats = defaultLedgerCats();
    let addInv = false;
    if (!LV.cats.some(c => c.type === 'invest')) { LV.cats.push(defaultLedgerCats().find(c => c.id === 'invest')); addInv = true; }
    LV.bad = bad; LV.sig = ledgerSig();
    if (legacy || addInv || !state.ledgerCats.length) await ledgerCommit();
  }
  // Cifra lo que haya cambiado en memoria y lo guarda (los que no se pudieron descifrar se conservan intactos)
  async function ledgerCommit() {
    if (!ledgerOpen()) return;
    markLedgerDays();
    for (const [k, sk] of LKINDS) {
      const ids = new Set(LV[k].map(x => x.id));
      const next = state[sk].filter(x => ids.has(x.id) || (x.enc && !LV.known.has(x.id)));
      for (const p of LV[k]) {
        const js = JSON.stringify(p);
        if (LV.plain.get(p.id) === js && next.some(x => x.id === p.id && x.enc)) continue;
        const { id, ...rest } = p, enc = await VAULT.encrypt(LV.key, rest);
        const i = next.findIndex(x => x.id === id);
        if (i >= 0) next[i] = { id, enc }; else next.push({ id, enc });
        LV.plain.set(id, js); LV.known.add(id);
      }
      state[sk] = next;
    }
    save(); LV.sig = ledgerSig();
  }
  const ledgerSave = () => { ledgerCommit().catch(() => toast(t('vaultError'))); };
  function ledgerLock() { Object.assign(LV, { key: null, raw: null, vid: null, entries: [], cats: [], recurring: [], events: [], calc: [], budgets: [], projs: [], imports: [], worth: [], contacts: [], plain: new Map(), known: new Set(), bad: 0, sig: '' }); pinBuf = ''; }
  async function useKey(key, raw) { LV.key = key; LV.raw = raw; sessTried = ''; LV.vid = VAULT.vidOf(state.ledgerVault); await ledgerLoad(); runRecurring(); }
  // Abrir con la contraseña. Las libretas antiguas (v1) se pasan a v2 en ese momento (se vuelve a cifrar todo).
  async function ledgerUnlock(pw) {
    const o = await VAULT.open(pw, state.ledgerVault);
    if (!o) return false;
    if (o.legacy) {
      LV.key = o.key; LV.vid = VAULT.vidOf(state.ledgerVault); await ledgerLoad();
      const { key, raw, header } = await VAULT.create(pw);
      state.ledgerVault = header; Object.assign(LV, { key, raw, vid: header.vid, plain: new Map() });
      await ledgerCommit(); runRecurring();
    } else await useKey(o.key, o.raw);
    return true;
  }
  // Abrir con la clave de datos que devuelve el PIN o la huella
  async function ledgerUnlockRaw(raw) {
    const key = await VAULT.importRaw(raw);
    if (!(await VAULT.verify(key, state.ledgerVault))) return false;
    await useKey(key, raw); return true;
  }
  async function ledgerSetup(pw) {
    const { key, raw, header } = await VAULT.create(pw);
    state.ledgerVault = header; Object.assign(LV, { key, raw, vid: header.vid, plain: new Map(), known: new Set() });
    await ledgerLoad(); await ledgerCommit();
  }
  // Cambiar la contraseña: misma clave de datos con otra envoltura (el PIN y la huella siguen valiendo)
  async function ledgerChangePassword(pw) { state.ledgerVault = await VAULT.rewrap(pw, LV.raw, state.ledgerVault); LV.vid = VAULT.vidOf(state.ledgerVault); save(); }
  function ledgerWipe() { if (state.ledgerVault) DEV.forget(VAULT.vidOf(state.ledgerVault)); state.ledgerVault = null; state.vaultWipe = Date.now(); ledgerLock(); for (const [, sk] of LKINDS) state[sk] = []; save(); }
  // Se bloquea solo tras 10 minutos en segundo plano
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => { if (document.hidden) hiddenAt = Date.now(); else if (LV.key && Date.now() - hiddenAt > 10 * 60000 && hiddenAt) { ledgerLock(); render(); } });

  /* ---------- desbloqueo rápido en este dispositivo: PIN de 4 cifras o huella / Face ID ---------- */
  const DEVM = { vid: null, pin: false, bio: false, bioOk: false, loading: false };
  let pinBuf = '', pwMode = false;
  // Comprueba (una vez por libreta) qué métodos hay en este dispositivo y vuelve a pintar
  function loadDevMethods(force = false) {
    const vid = VAULT.vidOf(state.ledgerVault);
    if (!vid || (!force && (DEVM.vid === vid || DEVM.loading))) return;
    DEVM.loading = true;
    Promise.all([DEV.methods(vid), DEV.bioAvailable()]).then(async ([m, ok]) => {
      Object.assign(DEVM, { vid, pin: m.pin, bio: m.bio, bioOk: ok, loading: false });
      if (await sessionUnlock()) return;
      if (state.ui.tab === 'ledger' && !ledgerOpen()) render();
    }).catch(() => { DEVM.loading = false; });
  }
  const pinDots = () => `<div class="pin-dots" aria-hidden="true">${[0, 1, 2, 3].map(i => `<i class="${i < pinBuf.length ? 'on' : ''}"></i>`).join('')}</div>`;
  function pinPadHtml() {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', DEVM.bio ? 'bio' : '', '0', 'back'];
    return `<div class="pin-pad" role="group" aria-label="${esc(t('pinEnter'))}">${keys.map(k => k === '' ? '<span></span>'
      : k === 'bio' ? `<button type="button" class="pin-key alt" data-act="vault-bio" aria-label="${esc(t('bioUse'))}">${ico('fingerprint')}</button>`
      : k === 'back' ? `<button type="button" class="pin-key alt" data-pin="back" aria-label="${esc(t('pinBack'))}">${ico('backspace')}</button>`
      : `<button type="button" class="pin-key" data-pin="${k}">${k}</button>`).join('')}</div>`;
  }
  // Pantalla de la Libreta cerrada: crear contraseña, PIN, huella o contraseña
  function ledgerLockedHtml() {
    if (!VAULT.available()) return `<section class="vault clay"><div class="vault-ico">${ico('lock')}</div><h2>${esc(t('vaultNoCrypto'))}</h2><p class="muted">${esc(t('vaultNoCryptoHint'))}</p></section>`;
    if (!state.ledgerVault) return `<section class="vault clay"><div class="vault-ico">${ico('shield')}</div><h2>${esc(t('vaultSetupTitle'))}</h2><p class="muted">${esc(t('vaultSetupSub2'))}</p>
      <form class="stack vault-form" data-vault="setup" autocomplete="off" style="gap:12px">
        <input class="input" type="password" id="vault-pw" minlength="6" autocomplete="new-password" placeholder="${esc(t('vaultPw'))}" aria-label="${esc(t('vaultPw'))}">
        <input class="input" type="password" id="vault-pw2" autocomplete="new-password" placeholder="${esc(t('vaultPw2'))}" aria-label="${esc(t('vaultPw2'))}">
        <label class="ack-check"><input type="checkbox" id="vault-ack"><span class="ack-box" aria-hidden="true">${ico('check')}</span><span class="small">${esc(t('vaultAck'))}</span></label>
        <button class="btn primary" type="submit">${ico('lock')} ${esc(t('vaultCreate'))}</button></form></section>`;
    loadDevMethods();
    const pinMode = DEVM.vid === VAULT.vidOf(state.ledgerVault) && DEVM.pin && !pwMode;
    const bioBtn = DEVM.bio && DEVM.vid === VAULT.vidOf(state.ledgerVault) ? `<button class="btn primary bio-btn" data-act="vault-bio">${ico('fingerprint')} ${esc(t('bioUse'))}</button>` : '';
    if (pinMode) return `<section class="vault clay"><div class="vault-ico">${ico('lock')}</div><h2>${esc(t('vaultLockedTitle'))}</h2><p class="muted">${esc(t('pinEnter'))}</p>
      <div id="pin-box">${pinDots()}</div>${pinPadHtml()}
      <button class="chip vault-forgot" data-act="vault-usepw">${esc(t('pinUsePw'))}</button></section>`;
    return `<section class="vault clay"><div class="vault-ico">${ico('lock')}</div><h2>${esc(t('vaultLockedTitle'))}</h2><p class="muted">${esc(t(bioBtn ? 'vaultLockedSubBio' : 'vaultLockedSub'))}</p>
      ${bioBtn ? `<div class="center" style="margin-top:14px">${bioBtn}</div>` : ''}
      <form class="stack vault-form" data-vault="open" autocomplete="off" style="gap:12px">
        <input class="input" type="password" id="vault-pw" autocomplete="current-password" placeholder="${esc(t('vaultPw'))}" aria-label="${esc(t('vaultPw'))}">
        <button class="btn ${bioBtn ? '' : 'primary'}" type="submit">${esc(t('vaultOpen'))}</button></form>
      <div class="row wrap" style="justify-content:center;margin-top:14px;gap:8px">${DEVM.pin && pwMode ? `<button class="chip" data-act="vault-usepin">${esc(t('pinUsePin'))}</button>` : ''}<button class="chip" data-act="vault-wipe">${esc(t('vaultForgot'))}</button></div></section>`;
  }
  // Tras abrir con la contraseña en un dispositivo sin PIN ni huella, se ofrece activarlos (una vez)
  function offerQuickUnlock() {
    const vid = LV.vid, k = 'keepgoing.qoffer.' + vid;
    try { if (localStorage.getItem(k)) return; localStorage.setItem(k, '1'); } catch (e) { return; }
    Promise.all([DEV.methods(vid), DEV.bioAvailable()]).then(([m, ok]) => {
      if (m.pin || m.bio || !DEV.supported()) return;
      whenFree(() => openModal({
        title: `${ico('shield')} ${esc(t('quickTitle'))}`,
        body: `<p class="muted" style="margin-top:0">${esc(t('quickSub'))}</p><div class="stack" style="gap:10px">
          <button class="create-opt clay" data-q="pin"><span class="opt-ico">${ico('keypad')}</span><span class="grow"><b>${esc(t('pinTitle'))}</b><br><span class="muted small">${esc(t('pinSub'))}</span></span>${ico('right')}</button>
          ${ok ? `<button class="create-opt clay" data-q="bio"><span class="opt-ico">${ico('fingerprint')}</span><span class="grow"><b>${esc(t('bioMethod'))}</b><br><span class="muted small">${esc(t('bioSub'))}</span></span>${ico('right')}</button>` : ''}
          <button class="create-opt clay" data-q="pw"><span class="opt-ico">${ico('key')}</span><span class="grow"><b>${esc(t('quickPwOnly'))}</b><br><span class="muted small">${esc(t('quickPwOnlySub'))}</span></span>${ico('right')}</button></div>
          <p class="muted small" style="margin-bottom:0">${esc(t('quickNote'))}</p>`,
        onClick: (e, close) => { const b = e.target.closest('[data-q]'); if (!b) return; close(); if (b.dataset.q === 'pin') openPinSetup(); else if (b.dataset.q === 'bio') enableBio(); }
      }));
    });
  }
  function openPinSetup(done = () => {}) {
    if (!ledgerOpen() || !LV.raw) { toast(t('vaultOpenFirst')); return; }
    openModal({
      title: `${ico('keypad')} ${esc(t('pinTitle'))}`,
      body: `<form class="stack" id="pin-form" style="gap:12px" autocomplete="off"><p class="muted small" style="margin:0">${esc(t('pinSetupHint'))}</p>
        <input class="input pin-input" id="pin-1" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="${esc(t('pinNew'))}">
        <input class="input pin-input" id="pin-2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="${esc(t('pinRepeat'))}"></form>`,
      foot: `<button class="btn primary" data-pin-save>${esc(t('save'))}</button>`,
      onMount: w => setTimeout(() => $('#pin-1', w)?.focus(), 200),
      onClick: async (e, close, w) => {
        if (!e.target.closest('[data-pin-save]')) return;
        const a = $('#pin-1', w).value, b = $('#pin-2', w).value;
        if (!VAULT.isPin(a)) { toast(t('pinBad')); return; }
        if (a !== b) { toast(t('pinMismatch')); return; }
        try { await DEV.setPin(LV.vid, a, LV.raw); DEVM.vid = null; loadDevMethods(true); close(); sfx('unlock'); toast(t('pinSaved')); done(); } catch (err) { toast(t('vaultError')); }
      }
    });
  }
  async function enableBio(done = () => {}) {
    if (!ledgerOpen() || !LV.raw) { toast(t('vaultOpenFirst')); return; }
    try { await DEV.setBio(LV.vid, LV.raw, profileName()); DEV.setSession(LV.vid, LV.raw).catch(() => {}); DEVM.vid = null; loadDevMethods(true); sfx('unlock'); toast(t('bioSaved')); done(); }
    catch (err) { toast(err && err.name === 'NotAllowedError' ? t('bioCancelled') : t('bioError')); }
  }
  // Huella o Face ID ya dados una vez en este dispositivo: la Libreta se abre sin volver a pedirlos
  let sessTried = '';
  // Bloquear a mano olvida el «permiso una sola vez»: la próxima vez se pide la huella o el PIN
  function lockByHand() { const vid = LV.vid || VAULT.vidOf(state.ledgerVault); DEV.clearSession(vid); sessTried = vid || ''; ledgerLock(); }
  async function sessionUnlock() {
    const vid = VAULT.vidOf(state.ledgerVault);
    if (!vid || ledgerOpen() || LV.busy || sessTried === vid) return false;
    sessTried = vid; LV.busy = true;
    try {
      const raw = await DEV.getSession(vid);
      if (raw && await ledgerUnlockRaw(raw)) { LV.busy = false; render(); return true; }
    } catch (e) { /* se pide como siempre */ }
    LV.busy = false; return false;
  }
  async function unlockWithBio() {
    if (LV.busy) return;
    LV.busy = true;
    try {
      const raw = await DEV.unlockBio(VAULT.vidOf(state.ledgerVault));
      if (raw && await ledgerUnlockRaw(raw)) { DEV.setSession(LV.vid, raw).catch(() => {}); sfx('toggle'); LV.busy = false; render(); return; }
      toast(t('bioFailed'));
    } catch (err) { toast(err && err.name === 'NotAllowedError' ? t('bioCancelled') : t('bioFailed')); }
    LV.busy = false;
  }
  async function pinKey(k) {
    if (LV.busy || ledgerOpen()) return;
    if (k === 'back') pinBuf = pinBuf.slice(0, -1); else if (pinBuf.length < 4) pinBuf += k;
    const box = $('#pin-box'); if (box) box.innerHTML = pinDots();
    vibrate(6);
    if (pinBuf.length < 4) return;
    LV.busy = true;
    const pin = pinBuf; let r;
    try { r = await DEV.unlockPin(VAULT.vidOf(state.ledgerVault), pin); } catch (e) { r = { ok: false }; }
    pinBuf = '';
    if (r.ok && await ledgerUnlockRaw(r.raw)) { sfx('toggle'); LV.busy = false; render(); return; }
    LV.busy = false; sfx('slip'); vibrate([30, 40, 30]);
    if (r.gone) { DEVM.vid = null; pwMode = true; toast(t('pinGone')); render(); return; }
    toast(t('pinWrong', { n: r.left }));
    const b2 = $('#pin-box'); if (b2) { b2.innerHTML = pinDots(); b2.classList.remove('shake'); void b2.offsetWidth; b2.classList.add('shake'); }
  }
  // También se puede escribir el PIN con el teclado
  document.addEventListener('keydown', e => {
    if (state.ui.tab !== 'ledger' || ledgerOpen() || !$('#pin-box') || $('#modal-root').children.length) return;
    if (/^\d$/.test(e.key)) { e.preventDefault(); pinKey(e.key); } else if (e.key === 'Backspace') { e.preventDefault(); pinKey('back'); }
  });
  document.addEventListener('change', e => {
    if (!e.target.matches || !e.target.matches('[data-pct-toggle]')) return;
    state.ledgerPrefs = { ...(state.ledgerPrefs || {}), showPct: e.target.checked }; save();
    const bd = e.target.closest('.backdrop'); if (bd && bd._redraw) bd._redraw();
    render();
  });
  document.addEventListener('submit', async e => {
    if (e.target.id === 'friend-form') { e.preventDefault(); const i = $('#friend-tag'); if (i.value.trim() && await sendFriendRequest(i.value)) i.value = ''; return; }
    const f = e.target.closest('[data-vault]'); if (!f) return;
    e.preventDefault(); if (LV.busy) return;
    const pw = $('#vault-pw', f).value, btn = $('button[type="submit"]', f);
    if (f.dataset.vault === 'setup') {
      if (pw.length < 6) { toast(t('vaultShort')); return; }
      if (pw !== $('#vault-pw2', f).value) { toast(t('vaultMismatch')); return; }
      if (!$('#vault-ack', f).checked) { toast(t('vaultNeedAck')); return; }
    }
    LV.busy = true; btn.disabled = true; btn.textContent = t('vaultWorking');
    try {
      if (f.dataset.vault === 'setup') { await ledgerSetup(pw); sfx('unlock'); toast(t('vaultCreated')); }
      else if (!(await ledgerUnlock(pw))) { sfx('slip'); toast(t('vaultWrong')); LV.busy = false; btn.disabled = false; btn.textContent = t('vaultOpen'); $('#vault-pw', f).select(); return; }
      else sfx('toggle');
    } catch (err) { toast(t('vaultError')); }
    LV.busy = false; pwMode = false; render();
    if (ledgerOpen()) offerQuickUnlock();
  });
  async function openVaultPassword() {
    if (!ledgerOpen()) { toast(t('vaultOpenFirst')); return; }
    openModal({
      title: `${ico('key')} ${esc(t('vaultChange'))}`,
      body: `<form class="stack" id="vault-change" style="gap:12px"><input class="input" type="password" id="vc-1" autocomplete="new-password" placeholder="${esc(t('vaultNewPw'))}"><input class="input" type="password" id="vc-2" autocomplete="new-password" placeholder="${esc(t('vaultPw2'))}"><p class="muted small" style="margin:0">${esc(t('vaultChangeHint2'))}</p></form>`,
      foot: `<button class="btn primary" data-vc>${esc(t('save'))}</button>`,
      onClick: async (e, close, w) => {
        if (!e.target.closest('[data-vc]')) return;
        const a = $('#vc-1', w).value, b = $('#vc-2', w).value;
        if (a.length < 6) { toast(t('vaultShort')); return; }
        if (a !== b) { toast(t('vaultMismatch')); return; }
        try { await ledgerChangePassword(a); toast(t('vaultChanged')); close(); render(); } catch (err) { toast(t('vaultError')); }
      }
    });
  }
  // Seguridad de la Libreta: contraseña, PIN y huella / Face ID de este dispositivo
  function openVaultSecurity() {
    if (!ledgerOpen()) { toast(t('vaultOpenFirst')); return; }
    let wref;
    const draw = async () => {
      const [m, ok] = await Promise.all([DEV.methods(LV.vid), DEV.bioAvailable()]);
      const row = (icon, title, sub, btns) => `<div class="sec-row clay"><span class="sec-ico">${icon}</span><span class="grow"><b>${esc(title)}</b><span class="muted small">${esc(sub)}</span></span><span class="row wrap" style="gap:6px;justify-content:flex-end">${btns}</span></div>`;
      $('#vsec', wref).innerHTML = `<div class="stack" style="gap:10px">
        ${row(ico('key'), t('vaultPwTitle'), t('vaultPwSub'), `<button class="chip" data-vs="pw">${esc(t('vaultChange'))}</button>`)}
        ${row(ico('keypad'), t('pinTitle'), m.pin ? t('secOn') : t('secOff'), m.pin ? `<button class="chip" data-vs="pin">${esc(t('pinChange'))}</button><button class="chip" data-vs="pin-off">${esc(t('secRemove'))}</button>` : `<button class="chip on" data-vs="pin">${esc(t('secEnable'))}</button>`)}
        ${row(ico('fingerprint'), t('bioMethod'), !ok ? t('bioUnavailable') : m.bio ? t('secOn') : t('secOff'), !ok ? '' : m.bio ? `<button class="chip" data-vs="bio-off">${esc(t('secRemove'))}</button>` : `<button class="chip on" data-vs="bio">${esc(t('secEnable'))}</button>`)}
        ${m.bio ? `<label class="row sec-once" style="gap:14px"><span class="switch"><input type="checkbox" data-vs-once ${m.once ? 'checked' : ''}><span></span></span><span class="grow"><b>${esc(t('bioOnceLabel'))}</b><br><span class="muted small">${esc(t('bioOnceHint'))}</span></span></label>` : ''}
        <p class="muted small" style="margin:4px 0 0">${esc(t('quickNote'))}</p></div>`;
    };
    openModal({
      title: `${ico('shield')} ${esc(t('vaultSecurity'))}`, body: '<div id="vsec"></div>',
      onMount: w => {
        wref = w; draw();
        w.addEventListener('change', async e => {
          if (!e.target.matches('[data-vs-once]')) return;
          await DEV.setOnce(LV.vid, e.target.checked);
          if (e.target.checked && LV.raw) await DEV.setSession(LV.vid, LV.raw);
          toast(t(e.target.checked ? 'bioOnceOn' : 'bioOnceOff'));
        });
      },
      onClick: async (e, close) => {
        const b = e.target.closest('[data-vs]'); if (!b) return;
        const a = b.dataset.vs;
        if (a === 'pw') { openVaultPassword(); return; }
        if (a === 'pin') { openPinSetup(draw); return; }
        if (a === 'bio') { await enableBio(); draw(); return; }
        if (a === 'pin-off') { await DEV.clearPin(LV.vid); DEVM.vid = null; toast(t('secRemoved')); draw(); return; }
        if (a === 'bio-off') { await DEV.clearBio(LV.vid); DEVM.vid = null; toast(t('secRemoved')); draw(); }
      }
    });
  }
  async function confirmVaultWipe() {
    if (await confirmDialog(t('vaultWipeQ')) && await confirmDialog(t('vaultWipeQ2'))) { ledgerWipe(); render(); toast(t('vaultWiped')); }
  }

  /* ---------- modo privacidad: casilla en la Libreta y móvil boca abajo ---------- */
  const flipSupported = () => 'DeviceOrientationEvent' in window && matchMedia('(pointer: coarse)').matches;
  const flipOn = () => { try { return localStorage.getItem('keepgoing.flip') === '1'; } catch (e) { return false; } };
  // Alternar la privacidad con movimiento: cada vez que pones el móvil boca abajo, los importes se ocultan o se vuelven a ver
  let flipSince = 0, flipArmed = true;
  function onOrient(e) {
    if (e.beta == null) return;
    // Boca abajo: la pantalla mira al suelo (beta cerca de ±180°, sin inclinación lateral)
    const down = Math.abs(e.beta) > 145 && Math.abs(e.gamma || 0) < 35;
    if (!down) { flipSince = 0; if (Math.abs(e.beta) < 110) flipArmed = true; return; }
    if (!flipArmed) return;
    if (!flipSince) { flipSince = Date.now(); return; }
    if (Date.now() - flipSince > 450) {
      flipArmed = false; flipSince = 0;
      const on = !privacyOn(); setPrivacy(on); vibrate(on ? 40 : [15, 40, 15]);
      if (state.ui.tab === 'ledger') render(); toast(t(on ? 'privacyFlipToast' : 'privacyFlipOffToast'));
    }
  }
  function flipListen() { window.removeEventListener('deviceorientation', onOrient); if (flipOn() && flipSupported()) window.addEventListener('deviceorientation', onOrient); }
  async function setFlip(on) {
    if (on && typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try { if ((await DeviceOrientationEvent.requestPermission()) !== 'granted') { toast(t('flipDenied')); render(); return; } } catch (e) { toast(t('flipDenied')); render(); return; }
    }
    try { localStorage.setItem('keepgoing.flip', on ? '1' : '0'); } catch (e) { /* nada */ }
    flipListen(); render(); toast(t(on ? 'flipOnToast' : 'flipOffToast'));
  }
  flipListen();

  // Genera los movimientos de las repeticiones que falten hasta hoy (ids deterministas: no se duplican entre dispositivos;
  // si borras uno generado no vuelve a aparecer porque su id queda en «deleted»)
  function runRecurring() {
    if (!ledgerOpen()) return;
    const today = todayKey(), have = new Set(LV.entries.map(e => e.id)), del = state.deleted || {};
    let added = 0;
    for (const r of LV.recurring) {
      if (r.archived) continue;
      for (const d of LED.occurrences(r, r.from, today)) {
        const id = LED.recEntryId(r.id, d);
        if (have.has(id) || del[id]) continue;
        LV.entries.push({ id, date: d, type: r.type, amountCents: r.amountCents, categoryId: r.categoryId, note: r.note || '', method: r.method || '', recurringId: r.id, createdAt: Date.now(), ...(r.fx ? { fx: { ...r.fx } } : {}) });
        have.add(id); added++;
      }
    }
    if (added) ledgerSave();
  }
  const monthIncome = (ym = todayKey().slice(0, 7)) => LED.totals(NET(LED.inMonth(LV.entries, +ym.slice(0, 4), +ym.slice(5, 7)))).income;

  function viewLedger() {
    if (ledgerOpen() && state.ui.ledgerView === 'calc') return viewCalc();
    const priv = privacyOn(), ym = ledgerMonth(), y = +ym.slice(0, 4), m = +ym.slice(5, 7);
    const sel = state.ui.ledgerDay && state.ui.ledgerDay.startsWith(ym) ? state.ui.ledgerDay : (todayKey().startsWith(ym) ? todayKey() : null);
    const monthEntries = LED.inMonth(LV.entries, y, m), tot = LED.totals(NET(monthEntries)), days = LED.byDay(NET(monthEntries));
    let html = topBar(ledgerOpen() ? calcTopActions(false) : '');
    html += `<h1 class="page-title">${esc(t('tabLedger'))}</h1>`;
    if (!ledgerOpen()) return html + ledgerLockedHtml();
    if (LV.bad) html += `<div class="banner clay">${ico('alert')}<span class="grow small">${esc(t('vaultBad', { n: LV.bad }))}</span></div>`;
    html += KGPlan.allows(PL(), 'worth') ? worthHtml() : planLockedCard('worth');
    const years = new Set([y, +todayKey().slice(0, 4)]); LV.entries.forEach(e => years.add(+String(e.date).slice(0, 4)));
    const yMin = Math.min(...years) - 1, yMax = Math.max(...years) + 1;
    const monthNames = Array.from({ length: 12 }, (_, i) => fmtDate(`2026-${pad(i + 1)}-01`, { month: 'long' }));
    const wd = Array.from({ length: 7 }, (_, i) => fmtDate(addDays('2026-10-12', i), { weekday: 'short' }));
    const evd = tfEvDays('led'), orgDays = state.ledgerPrefs.orgDays !== false;
    html += `<section class="ledger-cal clay" aria-label="${esc(t('ledgerCalendar'))}">
      <div class="cal-head"><button class="icon-btn sm" data-act="ledger-month" data-d="-1" aria-label="${esc(t('ledgerPrev'))}">${ico('left')}</button>
        <select class="input sel" data-ledger-m aria-label="${esc(t('ledgerMonthSel'))}">${monthNames.map((n, i) => `<option value="${i + 1}" ${i + 1 === m ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
        <select class="input sel" data-ledger-y aria-label="${esc(t('ledgerYearSel'))}">${Array.from({ length: yMax - yMin + 1 }, (_, i) => yMin + i).map(v => `<option ${v === y ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <button class="icon-btn sm" data-act="ledger-month" data-d="1" aria-label="${esc(t('ledgerNext'))}">${ico('right')}</button></div>
      <div class="month-sum"><div><span>${esc(t('ledgerIncome'))}</span><b class="amt-in">${cents(tot.income)}</b></div><div><span>${esc(t('ledgerExpense'))}</span><b class="amt-out">${cents(tot.expense)}</b></div><div><span>${esc(t('ledgerBalance'))}</span><b>${cents(tot.net)}</b></div></div>
      ${tot.invest ? `<p class="muted small center led-inv-line">${ico('trend', 'xs')} ${esc(t('ledgerInvested'))}: <b class="amt-inv">${cents(tot.invest)}</b></p>` : ''}
      ${ledgerFxLine(monthEntries)}
      <div class="cal" role="grid"><div class="cal-row cal-wd" role="row">${wd.map(d => `<span role="columnheader">${esc(d)}</span>`).join('')}</div>
      ${LED.monthGrid(y, m).map(w => `<div class="cal-row" role="row">${w.map(k => {
        if (!k) return '<span class="cal-cell empty" role="gridcell"></span>';
        const d = days[k], lbl = `${fmtDate(k, { weekday: 'long', day: 'numeric', month: 'long' })}${d ? ` · ${t('ledgerIncome')} ${cents(d.income)} · ${t('ledgerExpense')} ${cents(d.expense)}` : ''}`;
        // v1.25: los colores de los días de Organización (si están encendidos) y de los eventos, hasta 3 como en Organización
        const evs = evd[k] || [], dks = orgDays ? tfDksOf(k) : [], cs = [...new Set([...dks.map(x => tfColor(x.color)), ...evs.map(v => tfColor(v.paint.color))])].slice(0, TF_DK_MAX);
        const names = [...dks.map(tfDkName), ...evs.map(v => v.name)];
        return `<button class="cal-cell ${k === sel ? 'on' : ''} ${k === todayKey() ? 'today' : ''} ${cs.length ? 'evp' : ''}" ${cs.length ? `style="--evc:${cs[0]};${cs.length > 1 && k !== sel ? tfTintStyle(cs, 32).replace(/^--dk:[^;]*;/, '') : ''}"` : ''} role="gridcell" data-ledger-day="${k}" aria-label="${esc(lbl + (names.length ? ' · ' + names.join(', ') : ''))}" aria-pressed="${k === sel}"><span class="cal-n">${+k.slice(8)}</span>${d ? `<span class="cal-dots">${d.income ? '<i class="in"></i>' : ''}${d.expense ? '<i class="out"></i>' : ''}${d.invest ? '<i class="inv"></i>' : ''}</span><span class="cal-net ${d.net < 0 ? 'amt-out' : 'amt-in'}">${priv ? '•••' : esc(compactMoney(d.net / 100))}</span>` : ''}</button>`;
      }).join('')}</div>`).join('')}</div>
      <label class="row led-orgdays" style="gap:12px;margin-top:10px"><span class="switch sm"><input type="checkbox" data-led-opt="orgdays" ${orgDays ? 'checked' : ''}><span></span></span><span class="grow small">${esc(t('ledOrgDays'))}</span></label>
    </section>`;
    html += sel ? ledgerDayHtml(sel) : `<p class="muted center">${esc(t('ledgerPickDay'))}</p>`;
    // Herramientas de la Libreta: icono de línea con su nombre debajo (mismo estilo que la calculadora)
    const nRec = LV.recurring.filter(r => !r.archived).length;
    html += `<nav class="ledger-tools" aria-label="${esc(t('ledToolsAria'))}">${[['ledger-import', 'upload', 'rgTitle', 0], ['ledger-imports', 'doc', 'rgsTitle', LV.imports.length], ['ledger-cats', 'tag', 'ledgerCats', 0], ['ledger-budget', 'budget', 'budTitle', 0], ['ledger-contacts', 'users', 'ctTitle', DEBT.list(LV.entries).filter(d => d.status === 'open').length], ['ledger-recs', 'repeat', 'ledgerRecs', nRec], ['ledger-events', 'folder', 'evTitle', LV.events.length], ['ledger-share', 'share', 'lsTool', 0], ['ledger-fx', 'globe', 'fxTool', 0], ['vault-sec', 'shield', 'vaultSecurity', 0]]
      .map(([act, i, l, n]) => `<button class="tool-btn" data-act="${act}"><span class="tool-ico">${ico(i)}${n ? `<b class="chip-n">${n}</b>` : ''}</span><span class="tool-lbl">${esc(t(l))}</span></button>`).join('')}</nav>`;
    html += eventsStripHtml();
    html += ledgerChartsHtml();
    // v1.24: el Dinero Caprichable va al final de la Libreta, con la Diferencia acumulada del Presupuesto global
    if (!capHidden()) html += capWidgetHtml();
    // v1.23: opciones de la pestaña al final, debajo de «Gráficos»: privacidad y mostrar el Dinero Caprichable
    html += `<div class="led-opts clay" role="group" aria-label="${esc(t('ledOptions'))}">
      <label class="check tgl"><input type="checkbox" data-led-opt="privacy" ${priv ? 'checked' : ''}> ${ico(priv ? 'eyeOff' : 'eye')} ${esc(t('privacyModeLabel'))}</label>
      <label class="check tgl"><input type="checkbox" data-led-opt="cap" ${capHidden() ? '' : 'checked'}> ${ico('wallet')} ${esc(t('capShowWidget'))}</label>
    </div>`;
    return html;
  }
  /* =========================================================
     PATRIMONIO ACTUAL (v1.23): encima del calendario de la Libreta.
     Sale del punto de partida real de la Libreta (LV.worth, cifrado; no depende de la calculadora) más los movimientos
     desde ese día (js/worth.js). Gráfico «Patrimonio hasta la fecha» con los mismos botones que la calculadora y
     «Comparar» con proyecciones guardadas: en el mismo gráfico o en dos gráficos separados.
     ========================================================= */
  const WORTH = window.KGWorth;
  const WO_CMP = ['#f59e0b', '#ec4899', '#22d3ee', '#a3e635'];
  let worthMemo = { key: '' };
  const worthBase = () => LV.worth.find(x => x.id === 'worth') || null;
  /* v1.23.3: cada inversión (= categoría de tipo Inversión) guarda en LV.worth { id: 'inv:<cat>', kind: 'inv', cat, vals: [{ date, value }],
     since (desde cuándo hay dinero sin movimientos apuntados), rate (rentabilidad a mano o null) }. Valores en céntimos. */
  const worthInv = cat => LV.worth.find(x => x.id === 'inv:' + cat) || null;
  const worthVals = () => LV.worth.filter(x => x.kind === 'inv').flatMap(x => (x.vals || []).map(v => ({ cat: x.cat, date: v.date, value: v.value })));
  const investCats = () => { const b = worthBase(), used = new Set([...LV.entries.filter(e => e.type === 'invest').map(e => e.categoryId || 'invest'), ...Object.keys(WORTH.baseOf(b, [], todayKey()).invBy || {})]); return LV.cats.filter(c => c.type === 'invest' && (!c.archived || used.has(c.id))); };
  function worthInvList() {
    const d = worthData(), b = worthBase(), cats = new Map(investCats().map(c => [c.id, c]));
    for (const k of Object.keys(d.now.inv)) if (!cats.has(k)) cats.set(k, catOf(k));
    return [...cats.values()].map(c => { const x = worthInv(c.id) || {}, st = WORTH.invStats(c.id, b, LV.entries, worthVals(), todayKey(), x.since); return { c, x, st, rate: x.rate != null ? x.rate : st.rate }; })
      .filter(r => r.st.deposited || r.st.last || cats.size === 1);
  }
  // v1.23.4: monedas con saldo real propio (Punto de partida → Otras monedas), sin la principal
  const worthCurs = () => Object.keys((worthBase() || {}).curs || {}).filter(c => c !== ledgerMain());
  function worthData() {
    const wc = worthCurs();
    if (wc.length && !fxCache.latest) fxLatest().then(l => { if (l && state.ui.tab === 'ledger') render(); });
    const rates = Object.fromEntries(wc.map(c => [c, fxRateNow(c)]));
    const key = JSON.stringify(rates) + ledgerMain() + LV.entries.filter(e => e.fx).map(e => e.fx.cur + e.fx.cents).join() + JSON.stringify(LV.worth) + '|' + LV.entries.length + '|' + LV.entries.reduce((a, e) => a + (e.amountCents || 0) * (e.type === 'income' ? 3 : e.type === 'invest' ? 7 : 1) + (e.method === 'cash' ? 1 : 0), 0) + '|' + LV.entries.filter(e => e.link).map(e => e.id + e.link).join() + '|' + todayKey() + '|' + LED.span(LV.entries)?.from;
    if (worthMemo.key !== key) {
      const b0 = worthBase(), sv = b0 && b0.curs ? { ...b0, curs: Object.fromEntries(wc.map(c => [c, b0.curs[c]])) } : b0;
      const d = WORTH.series(sv, NET(LV.entries), todayKey(), worthVals(), rates);
      worthMemo = { key, ...d, rates, now: d.rows[d.rows.length - 1], pace: WORTH.pace(NET(LV.entries), todayKey()) };
    }
    return worthMemo;
  }
  function worthUi() {
    const u = state.ui.worth && typeof state.ui.worth === 'object' ? state.ui.worth : {};
    state.ui.worth = { mode: u.mode === 'investments' ? 'investments' : 'patrimony', hideGraph: !!u.hideGraph, ser: { income: true, expenses: true, investments: true, ...(u.ser || {}) }, gran: u.gran === 'year' ? 'year' : 'month', cmp: Array.isArray(u.cmp) ? u.cmp.filter(id => LV.projs.some(p => p.id === id)) : [], split: !!u.split, cmpOn: !!u.cmpOn };
    return state.ui.worth;
  }
  const woRow = r => ({ date: CALC.parseDate(r.key), patrimony: r.patrimony / 100, income: r.income / 100, expenses: r.expenses / 100, investments: r.investments / 100, funds: Object.fromEntries(Object.entries(r.invVal || r.inv).map(([k, v]) => [k, v / 100])) });
  // Una proyección guardada calculada como en la calculadora (desde su fecha de inicio)
  const projMemo = new Map();
  function projCalc(p) {
    const key = p.id + '|' + (p.at || 0) + '|' + ledgerMain() + '|' + todayKey();
    if (!projMemo.has(key)) { const model = CALC.fromItems(calcConv(p.items || []), todayKey()), res = CALC.compute(model); projMemo.set(key, { model, res, rows: CALC.daily(res) }); }
    return projMemo.get(key);
  }
  const woSeriesReal = u => [{ key: 'patrimony', label: t('woSerReal'), color: CALC_SER.patrimony }, ...['income', 'expenses', 'investments'].filter(k => u.ser[k]).map(k => ({ key: k, label: t({ income: 'calcSerIncome', expenses: 'calcSerExpenses', investments: 'calcSerInv' }[k]), color: CALC_SER[k] }))];
  function worthChartHtml(d, u) {
    const inv = u.mode === 'investments', rows = d.rows.map(woRow);
    if (inv) {
      const cats = Object.keys(d.now.inv);
      return calcChart('wo-main', rows, [{ key: 'investments', label: t('woInvested'), color: CALC_SER.investments }, ...cats.map((c, i) => ({ fund: c, label: catName(catOf(c)), color: CALC_COLORS[(i + 1) % CALC_COLORS.length] }))], { aria: t('woGraphInv'), noPat: true });
    }
    const sel = u.cmpOn ? LV.projs.filter(p => u.cmp.includes(p.id)) : [];
    if (!sel.length) return calcChart('wo-main', rows, woSeriesReal(u), { aria: t('woGraph') });
    if (u.split) {
      // Dos gráficos: a la izquierda lo real, a la derecha cada proyección, cada uno con sus líneas y su «Más detalles»
      const left = `<div class="wo-split-col"><h3 class="wo-split-h">${esc(t('woGraph'))}</h3>${calcChart('wo-main', rows, woSeriesReal(u), { aria: t('woGraph') })}${worthDetails(d, u, 'wo-real')}</div>`;
      const right = sel.map(p => { const pc = projCalc(p); return `<div class="wo-split-col"><h3 class="wo-split-h">${esc(t('woProjOf', { name: p.name }))}</h3>${calcChart('wo-p-' + p.id, pc.rows, calcSeries(pc.model, { mode: 'patrimony', ser: u.ser, off: [] }), { aria: p.name })}<details class="calc-box inner" data-cd="wo-pd:${esc(p.id)}" ${calcIsOpen('wo-pd:' + p.id) ? 'open' : ''}><summary><strong>${esc(t('calcMoreDetails'))}</strong><span class="calc-arrow" aria-hidden="true">›</span></summary>${calcTable(pc.res, 'patrimony', [], u.gran)}</details></div>`; }).join('');
      return `<div class="wo-split">${left}${right}</div>`;
    }
    // Mismo gráfico: lo real hasta hoy y cada proyección desde su inicio hasta su final (discontinua)
    const pcs = sel.map(p => ({ p, pc: projCalc(p) })), keyOf = CALC.keyOf;
    let from = d.rows[0].key, to = todayKey();
    for (const { pc } of pcs) { const a = keyOf(pc.rows[0].date), b = keyOf(pc.rows[pc.rows.length - 1].date); if (a < from) from = a; if (b > to) to = b; }
    const real = new Map(d.rows.map(r => [r.key, r])), pm = pcs.map(({ pc }) => new Map(pc.rows.map(r => [keyOf(r.date), r])));
    const out = [];
    for (let k = from, i = 0; k <= to && i < 40000; k = addDays(k, 1), i++) {
      const r = real.get(k), row = { date: CALC.parseDate(k), patrimony: r ? r.patrimony / 100 : null, income: r ? r.income / 100 : null, expenses: r ? r.expenses / 100 : null, investments: r ? r.investments / 100 : null };
      pm.forEach((m, j) => { const x = m.get(k); row['cmp' + j] = x ? x.patrimony : null; });
      out.push(row);
    }
    const ser = [...woSeriesReal(u), ...pcs.map(({ p }, j) => ({ key: 'cmp' + j, label: t('woProjOf', { name: p.name }), color: WO_CMP[j % WO_CMP.length], dash: true }))];
    return calcChart('wo-main', out, ser, { aria: t('woCompare'), noPat: true });
  }
  function worthDetails(d, u, cd = 'wo-det') {
    const per = WORTH.periods(d.rows, u.gran), b = d.base;
    const head = ['calcDate', 'calcPatrimony', 'calcDiff', 'calcIncAcc', 'calcExpAcc', 'woInvested'].map(k => t(k));
    const body = per.map((r, i) => { const prev = i ? per[i - 1].patrimony : d.rows[0].patrimony, df = (r.patrimony - prev) / 100; return `<tr><th scope="row">${esc(fmtDate(r.key, { day: 'numeric', month: 'short', year: 'numeric' }))}</th><td>${money(r.patrimony / 100)}</td><td class="${cls(df)}">${esc(csign(df))}</td><td>${money(r.income / 100)}</td><td>${money(r.expenses / 100)}</td><td>${money(r.investments / 100)}</td></tr>`; }).reverse().join('');
    return `<details class="calc-box inner" data-cd="${cd}" ${calcIsOpen(cd) ? 'open' : ''}><summary><strong>${esc(t('calcMoreDetails'))}</strong><button type="button" class="chip sm calc-view-btn calc-gran" data-wo="gran">${ico('calendar')} ${esc(t(u.gran === 'month' ? 'calcGranMonth' : 'calcGranYear'))}</button><span class="calc-arrow" aria-hidden="true">›</span></summary><div class="calc-table-wrap"><table class="calc-table"><thead><tr>${head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div></details>`;
  }
  function worthHtml() {
    const d = worthData(), u = worthUi(), n = d.now, b = d.base, start = (b.digital + b.cash + b.invested + (b.other || 0)) / 100, delta = n.patrimony / 100 - start, pc = d.pace;
    const inv = u.mode === 'investments';
    let html = `<section class="calc-card clay wo-card" aria-labelledby="wo-total-l">
      <div class="calc-hero"><div class="calc-eyebrow" id="wo-total-l">${esc(t('woEyebrow'))}</div><strong class="calc-total">${money(n.patrimony / 100)}</strong>
        <div class="calc-trend ${delta < 0 ? 'amt-out' : 'amt-in'}"><span>${esc(t('woSince', { d: fmtShort(b.date), v: csign(delta) }))}</span></div>
        ${b.set ? '' : `<p class="muted small">${esc(t('woNoBase'))}</p>`}
        <button class="chip sm" data-wo="start">${ico('compass')} ${esc(t(b.set ? 'woEditBase' : 'woSetBase'))}</button></div>
      <details class="calc-box" data-cd="wo-proj" ${calcIsOpen('wo-proj') ? 'open' : ''}><summary><span class="calc-sum-t"><span class="calc-eyebrow">${esc(t('woProjEyebrow'))}</span><strong>${esc(t('calcProjection'))}</strong></span><span class="calc-arrow" aria-hidden="true">›</span></summary>
        <div class="calc-headline"><div class="calc-hl"><span>${esc(t('cmDigital'))}</span><strong>${money(n.digital / 100)}</strong></div><div class="calc-hl"><span>${esc(t('cmInvestments'))}</span><strong>${money(n.value / 100)}</strong>${n.gains ? `<div class="calc-hl-st ${n.gains < 0 ? 'amt-out' : 'amt-in'}">${esc(t('woDepGain', { d: money(n.invested / 100), g: csign(n.gains / 100) }))}</div>` : ''}</div></div>
        <div class="calc-metrics"><div class="calc-metric"><span>${esc(t('cmCash'))}</span><strong>${money(n.cash / 100)}</strong></div><div class="calc-metric"><span>${esc(t('calcIncomeT'))}</span><strong class="amt-in">${money((n.income - b.at.income) / 100)}</strong></div><div class="calc-metric"><span>${esc(t('calcExpensesT'))}</span><strong class="amt-out">${money((n.expenses - b.at.expenses) / 100)}</strong></div><div class="calc-metric"><span>${esc(t('woStart'))}</span><strong>${money(start)}</strong></div></div>
        <p class="calc-fine">${esc(t('woPace', { net: csign(pc.net / 100), inv: money(pc.invest / 100), y: money(n.patrimony / 100 + pc.net * 12 / 100) }))}</p>
        ${worthCursHtml(d)}
      </details>`;
    { const L = worthInvList();
      html += `<details class="calc-box" data-cd="wo-inv" ${calcIsOpen('wo-inv') ? 'open' : ''}><summary><span class="calc-sum-t"><span class="calc-eyebrow">${esc(t('woInvEyebrow'))}</span><strong>${esc(t('woInvTitle'))}</strong></span>${L.length ? `<span class="calc-pill">${L.length}</span>` : ''}<span class="calc-arrow" aria-hidden="true">›</span></summary>
        ${L.length ? `<div class="stack" style="gap:8px">${L.map(({ c, st, rate, x }) => `<div class="wo-inv clay"><div class="row" style="justify-content:space-between;gap:8px"><b>${esc(c.icon || '')} ${esc(catName(c))}</b><strong>${money(st.value / 100)}</strong></div>
          <div class="muted small">${esc(t('woInvLine', { d: money(st.deposited / 100), g: csign(st.gain / 100) }))}${st.last ? ' · ' + esc(t('woInvAt', { d: fmtShort(st.last.date) })) : ''}</div>
          <div class="muted small">${esc(rate != null ? t(x.rate != null ? 'woInvRateManual' : 'woInvRate', { r: cpct(rate) }) : t('woInvNoRate'))}</div>
          <button class="chip sm calc-blue" data-wo="val" data-id="${esc(c.id)}">${ico('edit')} ${esc(t('woNewVal'))}</button></div>`).join('')}</div>` : `<p class="muted small" style="margin:0">${esc(t('woInvNone'))}</p>`}
        <p class="calc-fine">${esc(t('woInvHint'))}</p></details>`; }
    html += `<div class="calc-sec"><div><div class="calc-eyebrow">${esc(t('woTrajEyebrow'))}</div><h2>${esc(t(inv ? 'woGraphInv' : 'woGraph'))}</h2></div><div class="row wrap calc-sec-acts"><button class="chip sm" data-wo="mode">${esc(t(inv ? 'calcModePat' : 'calcModeInv'))}</button><button class="chip sm" data-wo="graph" aria-expanded="${!u.hideGraph}">${esc(t(u.hideGraph ? 'calcShowGraph' : 'calcHideGraph'))}</button>${inv ? '' : `<button class="chip sm ${u.cmpOn ? 'on' : ''}" data-wo="cmp" aria-pressed="${u.cmpOn}">${ico('compare')} ${esc(t('woCompare'))}</button>`}</div></div>`;
    if (!u.hideGraph) {
      if (!inv) html += `<div class="row wrap calc-toggles" role="group" aria-label="${esc(t('calcSeriesAria'))}">${['income', 'expenses', 'investments'].map(k => `<button type="button" class="calc-toggle ${u.ser[k] ? 'on' : ''}" data-wo="ser" data-v="${k}" aria-pressed="${u.ser[k]}">${esc(t({ income: 'calcSerIncome', expenses: 'calcSerExpenses', investments: 'calcSerInv' }[k]))}</button>`).join('')}</div>`;
      if (!inv && u.cmpOn) html += LV.projs.length ? `<div class="wo-cmp"><span class="rg-l">${esc(t('woCmpPick'))}</span><div class="row wrap" style="gap:6px">${LV.projs.map((p, i) => `<button type="button" class="calc-toggle ${u.cmp.includes(p.id) ? 'on' : ''}" data-wo="cmp-p" data-id="${esc(p.id)}" aria-pressed="${u.cmp.includes(p.id)}">${esc(p.name)}</button>`).join('')}</div>
          ${u.cmp.length ? `<div class="seg seg-sm" role="group" style="margin-top:8px">${[[false, 'woOneChart'], [true, 'woTwoCharts']].map(([v, k]) => `<button type="button" data-wo="split" data-v="${v ? 1 : 0}" class="${u.split === v ? 'on' : ''}">${esc(t(k))}</button>`).join('')}</div>` : ''}</div>` : `<p class="muted small">${esc(t('woNoProjs'))}</p>`;
      html += worthChartHtml(d, u);
      if (b.set && d.rows[0].key < b.date) html += `<p class="calc-fine">${esc(t('woBackHint', { d: fmtShort(b.date) }))}</p>`;
      if (!(u.cmpOn && u.split && u.cmp.length) || inv) html += worthDetails(d, u);
    }
    return html + '</section>';
  }
  /* v1.23.4: «Otras monedas» dentro de Proyección: un desplegable por moneda, como la Proyección pero en su moneda */
  function worthCursHtml(d) {
    const n = d.now, b = d.base, cs = Object.keys(n.cur || {});
    if (!cs.length) return '';
    const m = (v, c) => privacyOn() ? '•••••' : fmtCur(v / 100, c);
    const one = c => {
      const x = n.cur[c], b0 = b.curs[c], tot = x.digital + x.cash, r = d.rates[c], off = b0.off;
      return `<details class="calc-box inner" data-cd="wo-cur:${esc(c)}" ${calcIsOpen('wo-cur:' + c) ? 'open' : ''}><summary><span class="calc-sum-t"><span class="calc-eyebrow">${esc(c)}${off ? ' · ' + esc(t('woCurOffTag')) : ''}</span><strong>${m(tot, c)}</strong></span><span class="calc-arrow" aria-hidden="true">›</span></summary>
        <div class="calc-headline"><div class="calc-hl"><span>${esc(t('cmDigital'))}</span><strong>${m(x.digital, c)}</strong></div><div class="calc-hl"><span>${esc(t('cmCash'))}</span><strong>${m(x.cash, c)}</strong></div></div>
        <div class="calc-metrics"><div class="calc-metric"><span>${esc(t('calcIncomeT'))}</span><strong class="amt-in">${m(x.income - b.at.cur[c].income, c)}</strong></div><div class="calc-metric"><span>${esc(t('calcExpensesT'))}</span><strong class="amt-out">${m(x.expenses - b.at.cur[c].expenses, c)}</strong></div><div class="calc-metric"><span>${esc(t('woStart'))}</span><strong>${m(b0.digital + b0.cash, c)}</strong></div><div class="calc-metric"><span>${esc(t('woCurInMain', { m: ledgerMain() }))}</span><strong>${r > 0 ? money(Math.round(tot * r) / 100) : '—'}</strong></div></div>
        <label class="row" style="gap:14px;margin-top:10px"><span class="switch"><input type="checkbox" data-wo-cur-on="${esc(c)}" ${off ? '' : 'checked'}><span></span></span><span class="grow"><b>${esc(t('woCurSum'))}</b><br><span class="muted small">${esc(r > 0 ? t('woCurRate', { r: fxRateTxt(c, r) }) : t('woCurNoRate'))}</span></span></label>
      </details>`;
    };
    return `<details class="calc-box inner" data-cd="wo-curs" ${calcIsOpen('wo-curs') ? 'open' : ''}><summary><span class="calc-sum-t"><span class="calc-eyebrow">${esc(t('woCursEyebrow'))}</span><strong>${esc(t('woCursTitle'))}</strong></span><span class="calc-pill">${cs.length}</span><span class="calc-arrow" aria-hidden="true">›</span></summary>
      <div class="stack" style="gap:8px">${cs.map(one).join('')}</div><p class="calc-fine">${esc(t('woCursHint', { m: ledgerMain() }))}</p></details>`;
  }
  function worthClick(e) {
    if (e.target.matches && e.target.matches('input[data-wo-cur-on]')) {
      const c = e.target.dataset.woCurOn, b = worthBase();
      if (b && b.curs && b.curs[c]) { b.curs[c] = { ...b.curs[c], off: !e.target.checked }; ledgerSave(); setTimeout(render, 180); }
      return true;
    }
    if (e.target.closest && e.target.closest('label') && e.target.closest('label').querySelector('[data-wo-cur-on]')) return true;
    const el = e.target.closest('[data-wo]'); if (!el) return false;
    if (el.closest('summary')) e.preventDefault();
    const u = worthUi(), k = el.dataset.wo;
    switch (k) {
      case 'start': openWorthStart(); return true;
      case 'val': openWorthValue(el.dataset.id); return true;
      case 'mode': u.mode = u.mode === 'investments' ? 'patrimony' : 'investments'; break;
      case 'graph': u.hideGraph = !u.hideGraph; break;
      case 'ser': u.ser[el.dataset.v] = !u.ser[el.dataset.v]; break;
      case 'gran': u.gran = u.gran === 'month' ? 'year' : 'month'; break;
      case 'cmp': u.cmpOn = !u.cmpOn; if (u.cmpOn && !u.cmp.length && LV.projs.length) u.cmp = [LV.projs[0].id]; break;
      case 'cmp-p': u.cmp = u.cmp.includes(el.dataset.id) ? u.cmp.filter(x => x !== el.dataset.id) : [...u.cmp, el.dataset.id].slice(-4); break;
      case 'split': u.split = el.dataset.v === '1'; break;
      default: return false;
    }
    save(); render(); return true;
  }
  // Punto de partida de la Libreta: lo que tenías de verdad al final de un día (ya incluye lo apuntado hasta ese día)
  function openWorthStart() {
    const b = worthBase() || { id: 'worth', date: todayKey(), digital: 0, cash: 0, invested: 0 }, by = WORTH.baseOf(b, [], todayKey()).invBy, cats = investCats();
    for (const k of Object.keys(by)) if (!cats.some(c => c.id === k)) cats.push(catOf(k));
    const val = c => c ? esc(fmtPctIn(c / 100)) : '';
    // v1.23.4: otras monedas con su propio saldo real (por defecto ninguna)
    const main = ledgerMain(), cs = Object.entries(b.curs || {}).filter(([c]) => c !== main).map(([c, v]) => ({ c, d: v.digital ? fmtPctIn(v.digital / 100) : '', k: v.cash ? fmtPctIn(v.cash / 100) : '', on: !v.off }));
    const keepCurs = w => { for (const x of cs) { const d = $(`[data-woc-d="${x.c}"]`, w), k = $(`[data-woc-k="${x.c}"]`, w), o = $(`[data-woc-on="${x.c}"]`, w); if (d) x.d = d.value; if (k) x.k = k.value; if (o) x.on = o.checked; } };
    const cursHtml = () => `${cs.map(x => `<div class="wo-cur clay"><div class="row" style="justify-content:space-between;gap:8px"><b>${esc(x.c)}</b><button type="button" class="icon-btn sm danger-text" data-woc-del="${esc(x.c)}" aria-label="${esc(t('delete'))}" title="${esc(t('delete'))}">${ico('trash')}</button></div>
        <div class="calc-grid"><label class="field"><span>${esc(t('cmDigital'))} (${esc(x.c)})</span><input class="input" inputmode="decimal" autocomplete="off" data-woc-d="${esc(x.c)}" value="${esc(x.d)}" placeholder="0,00"></label><label class="field"><span>${esc(t('cmCash'))} (${esc(x.c)})</span><input class="input" inputmode="decimal" autocomplete="off" data-woc-k="${esc(x.c)}" value="${esc(x.k)}" placeholder="0,00"></label></div>
        <label class="row" style="gap:14px;margin-top:8px"><span class="switch"><input type="checkbox" data-woc-on="${esc(x.c)}" ${x.on ? 'checked' : ''}><span></span></span><span class="grow small"><b>${esc(t('woCurSum'))}</b></span></label></div>`).join('')}
      <div class="row" style="gap:8px"><select class="input grow" id="woc-new" aria-label="${esc(t('fxCurrency'))}">${FX.ALL.filter(c => c !== main && !cs.some(x => x.c === c)).map(c => `<option value="${c}">${c}</option>`).join('')}</select><button type="button" class="btn" data-woc-add>${ico('plus')} ${esc(t('woCurAdd'))}</button></div>`;
    openModal({
      title: calcHead(t('woEyebrow'), t('woBaseTitle')), cls: 'calc-sheet',
      body: `<p class="muted small" style="margin-top:0">${esc(t('woBaseHint', { m: ledgerMain() }))}</p><div class="calc-grid">
        <label class="field"><span>${esc(t('csDate'))}</span><input class="input" type="date" id="wo-date" value="${esc(b.date)}" max="${todayKey()}"></label>
        ${[['digital', 'cmDigital'], ['cash', 'cmCash']].map(([k, l]) => `<label class="field"><span>${esc(t(l))}</span><input class="input" inputmode="decimal" autocomplete="off" id="wo-${k}" value="${val(b[k])}" placeholder="0,00"></label>`).join('')}</div>
        <h3 class="section-title" style="margin:14px 0 4px">${esc(t('woBaseInv'))}</h3><p class="muted small" style="margin:0 0 8px">${esc(t('woBaseInvHint'))}</p>
        <div class="calc-grid">${cats.map(c => `<label class="field"><span>${esc(c.icon || '')} ${esc(catName(c))}</span><input class="input" inputmode="decimal" autocomplete="off" data-wo-inv="${esc(c.id)}" value="${val(by[c.id])}" placeholder="0,00"></label>`).join('')}</div>
        <h3 class="section-title" style="margin:14px 0 4px">${esc(t('woCursTitle'))}</h3><p class="muted small" style="margin:0 0 8px">${esc(t('woCurBaseHint', { m: main }))}</p>
        <div class="stack" id="wo-curs" style="gap:10px">${cursHtml()}</div>
        <p class="calc-fine">${esc(t('woBaseFine'))}</p>`,
      foot: `<button class="btn" data-m="x">${esc(t('cancel'))}</button><button class="btn primary" data-wb="save">${esc(t('save'))}</button>`,
      onClick: (e, close, w) => {
        let el;
        if (e.target.closest('[data-woc-add]')) { keepCurs(w); const c = $('#woc-new', w).value; if (c) cs.push({ c, d: '', k: '', on: true }); $('#wo-curs', w).innerHTML = cursHtml(); const i = $(`[data-woc-d="${c}"]`, w); if (i) i.focus(); return; }
        if ((el = e.target.closest('[data-woc-del]'))) { keepCurs(w); const i = cs.findIndex(x => x.c === el.dataset.wocDel); if (i >= 0) cs.splice(i, 1); $('#wo-curs', w).innerHTML = cursHtml(); return; }
        if (!e.target.closest('[data-wb]')) return;
        const date = $('#wo-date', w).value, nb = { id: 'worth', date, invBy: {} };
        if (!CALC.parseDate(date) || date > todayKey()) { toast(t('woBadDate')); return; }
        const read = el => { const s = el.value.trim(), c = s ? LED.parseCents(s) : 0; if (c == null) { toast(t('calcNonNeg')); el.focus(); } return c; };
        for (const k of ['digital', 'cash']) { const c = read($('#wo-' + k, w)); if (c == null) return; nb[k] = c; }
        for (const el of $$('[data-wo-inv]', w)) { const c = read(el); if (c == null) return; if (c) nb.invBy[el.dataset.woInv] = c; }
        nb.invested = Object.values(nb.invBy).reduce((a, v) => a + v, 0);
        keepCurs(w);
        if (cs.length) {
          nb.curs = {};
          for (const x of cs) {
            const d = x.d.trim() ? LED.parseCents(x.d) : 0, k = x.k.trim() ? LED.parseCents(x.k) : 0;
            if (d == null || k == null) { toast(t('calcNonNeg')); return; }
            nb.curs[x.c] = { digital: d, cash: k, ...(x.on ? {} : { off: true }) };
          }
        }
        LV.worth = [nb, ...LV.worth.filter(x => x.id !== 'worth')]; ledgerSave(); close(); render(); toast(t('saved'));
      }
    });
  }
  // «Introducir Nuevo Valor Actual» de una inversión: fecha (hoy por defecto) e importe. Con eso se estima su rentabilidad
  function openWorthValue(cat, after) {
    const x0 = worthInv(cat), st = WORTH.invStats(cat, worthBase(), LV.entries, worthVals(), todayKey(), x0 && x0.since), c = catOf(cat);
    const needSince = st.unrecorded > 0;
    openModal({
      title: calcHead(catName(c), t('woNewVal')), cls: 'calc-sheet',
      body: `<p class="muted small" style="margin-top:0">${esc(t('woValHint', { d: money(st.deposited / 100) }))}</p><div class="calc-grid">
        <label class="field"><span>${esc(t('woValDate'))}</span><input class="input" type="date" id="wv-date" value="${todayKey()}" max="${todayKey()}"></label>
        <label class="field"><span>${esc(t('woValAmt', { m: ledgerMain() }))}</span><input class="input" inputmode="decimal" autocomplete="off" id="wv-amt" placeholder="0,00"></label>
        ${needSince ? `<label class="field full"><span>${esc(t('woValSince', { d: money(st.unrecorded / 100) }))}</span><input class="input" type="date" id="wv-since" value="${esc((x0 && x0.since) || st.first)}" max="${todayKey()}"></label>` : ''}
        <label class="field full"><span>${esc(t('woValRate'))}</span><input class="input" inputmode="decimal" autocomplete="off" id="wv-rate" value="${x0 && x0.rate != null ? esc(fmtPctIn(x0.rate)) : ''}" placeholder="${esc(t('woValRateAuto'))}"></label></div>
        ${x0 && (x0.vals || []).length ? `<h3 class="section-title" style="margin:12px 0 6px">${esc(t('woValHistory'))}</h3><div class="stack" style="gap:6px">${[...x0.vals].sort((a, b) => a.date < b.date ? 1 : -1).map(v => `<div class="row" style="gap:8px"><span class="grow">${esc(fmtShort(v.date))}</span><b>${money(v.value / 100)}</b><button class="icon-btn sm danger-text" data-wv-del="${esc(v.date)}" aria-label="${esc(t('delete'))}">${ico('trash')}</button></div>`).join('')}</div>` : ''}`,
      foot: `<button class="btn" data-m="x">${esc(t('cancel'))}</button><button class="btn primary" data-wv="save">${esc(t('save'))}</button>`,
      onClick: (e, close, w) => {
        const x = worthInv(cat) || { id: 'inv:' + cat, kind: 'inv', cat, vals: [], since: null, rate: null };
        const put = () => { LV.worth = [...LV.worth.filter(y => y.id !== x.id), x]; ledgerSave(); render(); };
        const del = e.target.closest('[data-wv-del]');
        if (del) { x.vals = (x.vals || []).filter(v => v.date !== del.dataset.wvDel); put(); close(); openWorthValue(cat, after); return; }
        if (!e.target.closest('[data-wv="save"]')) return;
        const date = $('#wv-date', w).value, amt = $('#wv-amt', w).value.trim(), rs = $('#wv-rate', w).value.trim();
        if (!CALC.parseDate(date) || date > todayKey()) { toast(t('woBadDate')); return; }
        const cents = amt ? LED.parseCents(amt) : null;
        if (amt && cents == null) { toast(t('calcNonNeg')); return; }
        const rate = rs ? CALC.parseNum(rs) : null;
        if (rs && !Number.isFinite(rate)) { toast(t('woBadRate')); return; }
        if (cents != null) x.vals = [...(x.vals || []).filter(v => v.date !== date), { date, value: cents }].slice(-60);
        if ($('#wv-since', w)) x.since = $('#wv-since', w).value || null;
        x.rate = rate;
        put(); close(); toast(t('saved')); after && after();
      }
    });
  }

  // Calculadora → Punto de partida → «Aplicar datos de la Libreta actual»: copia las cifras de hoy (la Libreta no cambia)
  async function calcApplyWorth(done) {
    const d = worthData(), n = d.now, pc = d.pace;
    if (!(await confirmDialog(t('woApplyQ', { d: money(n.digital / 100), c: money(n.cash / 100), i: money(n.value / 100) })))) return;
    const s = calcStartItem();
    Object.assign(s, { digital: Math.max(0, n.digital) / 100, cash: Math.max(0, n.cash) / 100, date: todayKey() }); delete s.cur;
    if (pc.income) s.salary = pc.income / 100;
    if (pc.expenses) s.expenses = pc.expenses / 100;
    if (n.value > 0) {
      const { model } = calcData();
      if (model.investments.length) {
        let f = LV.calc.find(x => x.id === 'led-fund');
        if (!f) { f = { id: 'led-fund', kind: 'fund', name: t('woFundName'), amount: 0, target: model.investments[0].id, ord: calcOrd() }; LV.calc.push(f); }
        f.amount = n.value / 100; delete f.cur;
      } else toast(t('woNeedDest'));
    }
    calcCommit(t('woApplied')); done && done();
  }

  /* =========================================================
     CALCULADORA DE PATRIMONIO PROYECTADO (v1.17)
     Vive dentro de la Libreta (botón de la calculadora junto al candado y el «+») y sus datos van cifrados con ella:
     cada pieza (punto de partida, destino, fondo, fórmula aplicada o guardada) es un elemento de LV.calc, que se cifra
     y se fusiona por id entre dispositivos como los movimientos. La proyección se calcula en js/calc.js.
     ========================================================= */
  const CALC = window.KGCalc;
  const CALC_COLORS = ['#34b68a', '#4585ed', '#e6a23c', '#a66bea', '#ef8b74', '#34a7b6'];
  const CALC_SER = { patrimony: '#586ff0', income: '#4585ed', expenses: '#ef8b74', investments: '#34b68a' };
  const CALC_METRICS = [['digital', 'cmDigital'], ['cash', 'cmCash'], ['investments', 'cmInvestments'], ['returns', 'cmReturns'], ['cashback', 'cmCashback'], ['growth', 'cmGrowth'], ['cbInvest', 'cmCbInvest'], ['roundup', 'cmRoundup']];
  // Métricas que solo existen si hay una fórmula que las genera (cashback invertido, redondeos)
  const calcMetricOn = (res, k) => k === 'cbInvest' ? res.hasCbInvest : k === 'roundup' ? res.hasRoundup : true;
  const LEGACY_KEYS = ['patrimonioProjected', 'patrimonioClay'];
  // Desplegables abiertos (solo en esta sesión; se conservan entre redibujados)
  const calcOpenD = new Map([['proj', true], ['funds', true], ['lib', true], ['tpl', true]]);
  const calcIsOpen = k => !!calcOpenD.get(k);
  const calcOn = () => state.ui.tab === 'ledger' && state.ui.ledgerView === 'calc';
  // Preferencias de la vista (en este dispositivo): modo del gráfico, series, métricas de «Ver» y fondos ocultos
  function calcUi() {
    const u = state.ui.calc && typeof state.ui.calc === 'object' ? state.ui.calc : {};
    state.ui.calc = { mode: u.mode === 'investments' ? 'investments' : 'patrimony', ser: { income: true, expenses: true, investments: true, ...(u.ser || {}) },
      metrics: Array.isArray(u.metrics) ? u.metrics.filter(k => CALC_METRICS.some(m => m[0] === k)) : ['digital', 'investments'], hideGraph: !!u.hideGraph, off: Array.isArray(u.off) ? u.off : [], gran: u.gran === 'month' ? 'month' : 'year', seen: Array.isArray(u.seen) ? u.seen : [], proj: typeof u.proj === 'string' ? u.proj : null };
    return state.ui.calc;
  }
  // v1.22: las piezas en otra moneda (campo cur) se pasan a la moneda principal con el cambio de hoy antes de calcular
  const calcMoneyKeys = x => { const m = CALC.moduleOf(x.type); return m ? m.fields.filter(f => f[1] === 'money').map(f => f[0]) : []; };
  const calcConv = items => FX.convertItems(items, ledgerMain(), c => fxRateNow(c), calcMoneyKeys);
  let calcMemo = { key: '' };
  function calcData() {
    const key = JSON.stringify(LV.calc) + todayKey() + ledgerMain() + JSON.stringify(fxManual()) + ((fxCache.latest || {}).date || '');
    if (calcMemo.key !== key) {
      if (LV.calc.some(x => x && x.cur && x.cur !== ledgerMain()) && !fxCache.latest) fxLatest().then(l => { if (l) render(); });
      const model = CALC.fromItems(calcConv(LV.calc), todayKey()), res = CALC.compute(model);
      calcMemo = { key, model, res, rows: CALC.daily(res) };
    }
    return calcMemo;
  }
  const calcItem = id => LV.calc.find(x => x.id === id);
  // Moneda de una pieza (sin campo cur = la principal) y su selector
  const calcCurOf = id => { const x = calcItem(id); return x && FX.isCode(x.cur) ? x.cur : ledgerMain(); };
  const calcCurTag = id => { const c = calcCurOf(id); return c !== ledgerMain() ? ` · ${c}` : ''; };
  const calcCurSel = (cur, attr) => { const main = ledgerMain(); cur = cur || main; return `<select class="input" ${attr} aria-label="${esc(t('fxCurrency'))}">${[main, ...FX.ALL.filter(c => c !== main)].map(c => `<option value="${c}" ${c === cur ? 'selected' : ''}>${c}</option>`).join('')}</select>`; };
  const calcSetCur = (it, cur) => { if (!it) return; if (!cur || cur === ledgerMain()) delete it.cur; else it.cur = cur; };
  const calcOrd = () => Math.max(0, ...LV.calc.map(x => +x.ord || 0)) + 1;
  function calcStartItem() { let s = calcItem(CALC.START_ID); if (!s) { s = { ...calcData().model.start }; LV.calc.push(s); } return s; }
  function calcPut(item) { const i = LV.calc.findIndex(x => x.id === item.id); if (i >= 0) LV.calc[i] = item; else LV.calc.push(item); }
  function calcCommit(msg) { ledgerSave(); render(); if (msg) toast(msg); }
  // Formatos (los importes respetan el modo privacidad)
  const cpct = v => v == null || !Number.isFinite(v) ? '—' : new Intl.NumberFormat(state.lang, { maximumFractionDigits: 2 }).format(v) + ' %';
  const csign = v => privacyOn() ? money(v) : (v > 0 ? '+' : '') + fmtMoney(v);
  const cspct = v => v == null || !Number.isFinite(v) ? '—' : (v > 0 ? '+' : '') + cpct(v);
  const cmonths = n => n % 12 === 0 ? t(n === 12 ? 'calcYear1' : 'calcYearsN', { n: n / 12 }) : t(n === 1 ? 'calcMonth1' : 'calcMonthsN', { n });
  const cdate = d => fmtDate(CALC.keyOf(d), { day: 'numeric', month: 'short', year: 'numeric' });
  const calcHead = (eyebrow, title) => `<span class="calc-eyebrow">${esc(eyebrow)}</span>${esc(title)}`;
  const calcHelp = txt => `<details class="calc-help"><summary aria-label="${esc(t('calcHelp'))}" title="${esc(t('calcHelp'))}">?</summary><p>${esc(txt)}</p></details>`;
  const optLabel = (mod, k, o) => { const a = `co_${mod}_${k}_${o}`, s = t(a); return s !== a ? s : t(`co_${k}_${o}`); };
  const invName = (model, id) => id === 'none' ? t('calcNoDestOpt') : (model.investments.find(i => i.id === id) || {}).name || '—';
  const calcTopActions = on => `<button class="icon-btn ${on ? 'on' : ''}" data-act="${on ? 'calc-close' : 'calc-open'}" aria-pressed="${on}" aria-label="${esc(t(on ? 'calcBack' : 'calcOpen'))}" title="${esc(t(on ? 'calcBack' : 'calcOpen'))}">${ico('calc')}</button><button class="icon-btn" data-act="vault-lock" aria-label="${esc(t('vaultLock'))}" title="${esc(t('vaultLock'))}">${ico('lock')}</button><button class="icon-btn" data-act="ledger-add" aria-label="${esc(t('ledgerAdd'))}">${ico('plus')}</button>`;

  /* ---------- gráfico de área (en pantalla con tooltip, ratón, dedo y teclado; en el PDF sin controles) ---------- */
  const calcCharts = new Map();
  const calcVal = (pt, s) => s.fund ? ((pt.funds || {})[s.fund] || 0) : pt[s.key];
  function calcChart(id, rows, series, o = {}) {
    if (!series.length) return `<p class="muted small calc-empty">${esc(t('calcPickSeries'))}</p>`;
    const pts = CALC.sample(rows, o.print ? 160 : 240), n = pts.length;
    const W = o.print ? 640 : chartW(), H = o.print ? 250 : (W < 500 ? 220 : 260), pl = 58, pr = 14, pt = 16, pb = 30, iw = W - pl - pr, ih = H - pt - pb;
    // v1.23: un valor null no se dibuja (p. ej. lo real después de hoy al comparar con una proyección); s.dash = línea discontinua sin relleno
    const all = pts.flatMap(p => series.map(s => calcVal(p, s))).filter(v => v != null && Number.isFinite(v));
    const lo = Math.min(0, ...all), hi = Math.max(1, ...all), span = hi - lo || 1;
    const x = i => pl + (n === 1 ? iw / 2 : i * iw / (n - 1)), y = v => pt + ih - (v - lo) / span * ih, base = y(Math.max(lo, 0));
    const lbl = v => privacyOn() ? '•••' : compactMoney(v);
    const grid = [0, 1, 2, 3, 4].map(k => lo + span * k / 4).map(v => `<line class="grid-line" x1="${pl}" x2="${W - pr}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="axis-label" x="${pl - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${esc(lbl(v))}</text>`).join('');
    const shapes = series.map(s => {
      const runs = []; let cur = null;
      pts.forEach((p, i) => { const v = calcVal(p, s); if (v == null || !Number.isFinite(v)) { cur = null; return; } if (!cur) runs.push(cur = []); cur.push([x(i), y(v)]); });
      return runs.map(r => {
        const line = r.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ');
        return `${s.dash ? '' : `<polygon points="${r[0][0].toFixed(1)},${base.toFixed(1)} ${line} ${r[r.length - 1][0].toFixed(1)},${base.toFixed(1)}" fill="${s.color}" fill-opacity="${o.print ? '.16' : '.2'}"/>`}<polyline points="${line}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linejoin="round"${s.dash ? ' stroke-dasharray="6 5"' : ''}/>`;
      }).join('');
    }).join('');
    const d0 = pts[0].date, d1 = pts[n - 1].date, mid = pts[Math.floor((n - 1) / 2)].date;
    const xl = `<text class="axis-label" x="${pl}" y="${H - 8}">${esc(cdate(d0))}</text>${W >= 420 ? `<text class="axis-label" x="${x(Math.floor((n - 1) / 2)).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(cdate(mid))}</text>` : ''}<text class="axis-label" x="${W - pr}" y="${H - 8}" text-anchor="end">${esc(cdate(d1))}</text>`;
    const legend = `<div class="dot-legend calc-legend">${series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.label)}</span>`).join('')}</div>`;
    if (o.print) return `<div class="calc-print-chart">${legend}<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || '')}">${grid}${shapes}${xl}</svg></div>`;
    calcCharts.set(id, { pts, series, W, pl, iw, x, y, single: !!o.single, noPat: !!o.noPat, idx: -1 });
    return `<div class="chart calc-chart" data-cc="${esc(id)}" tabindex="0" role="img" aria-label="${esc((o.aria || '') + '. ' + t('calcChartKeys'))}">${legend}<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${grid}${shapes}${xl}
      <line class="xhair" x1="0" x2="0" y1="${pt}" y2="${pt + ih}" stroke="var(--fg)" stroke-opacity=".45" stroke-dasharray="4 4" style="display:none"/>
      ${series.map((s, i) => `<circle class="cdot" data-i="${i}" r="4.5" fill="${s.color}" stroke="var(--surface)" stroke-width="2" style="display:none"/>`).join('')}
      <rect class="hit" x="${pl}" y="${pt}" width="${iw}" height="${ih}"/></svg></div>`;
  }
  function calcTipShow(box, idx) {
    const c = calcCharts.get(box.dataset.cc), svg = box.querySelector('svg'); if (!c || !svg) return;
    idx = clamp(idx, 0, c.pts.length - 1); c.idx = idx;
    const p = c.pts[idx], cx = c.x(idx), sx = svg.clientWidth / c.W, priv = privacyOn();
    const xh = svg.querySelector('.xhair'); xh.setAttribute('x1', cx); xh.setAttribute('x2', cx); xh.style.display = '';
    let top = Infinity;
    c.series.forEach((s, i) => { const d = svg.querySelector(`.cdot[data-i="${i}"]`), v = calcVal(p, s); if (v == null || !Number.isFinite(v)) { if (d) d.style.display = 'none'; return; } const cy = c.y(v); top = Math.min(top, cy); if (d) { d.setAttribute('cx', cx); d.setAttribute('cy', cy); d.style.display = ''; } });
    let tip = box.querySelector(':scope > .tip');
    if (!tip) { tip = document.createElement('div'); tip.className = 'tip calc-tip'; box.appendChild(tip); }
    const v = n => priv ? '•••••' : fmtMoney(n);
    tip.innerHTML = `<b>${esc(fmtDate(CALC.keyOf(p.date), { day: 'numeric', month: 'long', year: 'numeric' }))}</b>${c.single || c.noPat || p.patrimony == null ? '' : `<span>${esc(t('calcSerPat'))}: ${esc(v(p.patrimony))}</span>`}${c.series.filter(s => !(s.key === 'patrimony') && calcVal(p, s) != null).map(s => `<span><i style="background:${s.color}"></i>${esc(s.label)}: ${esc(v(calcVal(p, s)))}</span>`).join('')}`;
    tip.style.display = 'block';
    const half = tip.offsetWidth / 2 + 4, legendH = svg.offsetTop;
    tip.style.left = clamp(cx * sx, half, Math.max(half, box.clientWidth - half)) + 'px';
    tip.style.top = Math.max(tip.offsetHeight + 12, legendH + top * (svg.clientHeight / svg.viewBox.baseVal.height)) + 'px';
  }
  function calcTipHide(box) {
    (box ? [box] : $$('.calc-chart')).forEach(b => { $$('.xhair, .cdot', b).forEach(n => { n.style.display = 'none'; }); const tp = b.querySelector(':scope > .tip'); if (tp) tp.style.display = 'none'; });
  }
  function calcTipAt(box, clientX) {
    const c = calcCharts.get(box.dataset.cc), svg = box.querySelector('svg'); if (!c || !svg) return;
    const r = svg.getBoundingClientRect(), sx = (clientX - r.left) / r.width * c.W;
    calcTipShow(box, Math.round(clamp((sx - c.pl) / c.iw, 0, 1) * (c.pts.length - 1)));
  }
  document.addEventListener('pointermove', e => { const box = e.target.closest && e.target.closest('.calc-chart'); if (box && e.target.closest('svg')) calcTipAt(box, e.clientX); else if (!box) calcTipHide(); });
  document.addEventListener('pointerdown', e => { const box = e.target.closest && e.target.closest('.calc-chart'); if (box && e.target.closest('svg')) calcTipAt(box, e.clientX); else calcTipHide(); });
  document.addEventListener('keydown', e => {
    const box = e.target.closest && e.target.closest('.calc-chart');
    if (box) {
      const c = calcCharts.get(box.dataset.cc); if (!c) return;
      const step = e.shiftKey ? Math.max(1, Math.round(c.pts.length / 12)) : 1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); calcTipShow(box, (c.idx < 0 ? 0 : c.idx) + (e.key === 'ArrowRight' ? step : -step)); }
      else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); calcTipShow(box, e.key === 'Home' ? 0 : c.pts.length - 1); }
      else if (e.key === 'Escape') calcTipHide(box);
      return;
    }
    // Filas de fondos (role="button"): Intro o espacio las activan
    const row = e.target.closest && e.target.closest('.calc-fund-row[role="button"]');
    if (row && e.target === row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); row.click(); }
  });
  document.addEventListener('focusout', e => { const box = e.target.closest && e.target.closest('.calc-chart'); if (box) calcTipHide(box); });
  // Los desplegables recuerdan si estaban abiertos al redibujar
  document.addEventListener('toggle', e => {
    const d = e.target; if (!d || !d.matches) return;
    if (d.matches('details[data-cd]')) calcOpenD.set(d.dataset.cd, d.open);
    if (d.matches('details[data-led-charts]') && state.ui.ledChartsShut !== !d.open) { state.ui.ledChartsShut = !d.open; save(); }
  }, true);

  // Series del gráfico principal según el modo
  function calcSeries(model, u) {
    if (u.mode === 'investments') return model.investments.filter(i => !u.off.includes(i.id)).map(i => ({ fund: i.id, label: i.name, color: CALC_COLORS[model.investments.indexOf(i) % CALC_COLORS.length] }));
    return [{ key: 'patrimony', label: t('calcSerPat'), color: CALC_SER.patrimony }, ...['income', 'expenses', 'investments'].filter(k => u.ser[k]).map(k => ({ key: k, label: t({ income: 'calcSerIncome', expenses: 'calcSerExpenses', investments: 'calcSerInv' }[k]), color: CALC_SER[k] }))];
  }
  const calcPeriodLabel = (m, horizon) => m % 12 === 0 ? t('calcYearN', { n: m / 12 }) : m < 12 ? cmonths(m) : t('calcEndPeriod', { n: cmonths(m) });
  const cls = v => v < 0 ? 'amt-out' : 'amt-in';
  // «Más detalles»: una fila por año (o por mes) y «Diferencia» respecto a la fila anterior (la primera, respecto al punto de partida).
  // calcTableData da las celdas (las usa también el PDF); calcTable las pinta en pantalla.
  function calcTableData(res, kind, ids, gran = 'year') {
    const per = gran === 'month' ? Array.from({ length: res.months }, (_, i) => i + 1) : CALC.periods(res.months), M = res.monthly;
    const label = m => gran === 'month' ? t('calcMonthN', { n: m }) : calcPeriodLabel(m, res.months);
    const prev = i => i ? M[per[i - 1]] : M[0];
    const c = (v, tone) => ({ v, tone });
    if (kind === 'patrimony') return {
      head: ['calcPeriod', 'calcDate', 'calcPatrimony', 'calcDiff', 'calcIncAcc', 'calcExpAcc', 'calcInvCol', 'calcVariation', 'calcRentab'].map(k => t(k)),
      rows: per.map((m, i) => {
        const p = M[m], d = p.patrimony - res.initial, r = res.initial ? d / res.initial * 100 : null, df = p.patrimony - prev(i).patrimony;
        return [c(label(m)), c(cdate(p.date)), c(money(p.patrimony)), c(csign(df), df), c(money(p.income)), c(money(p.expenses)), c(money(p.investments)), c(csign(d), d), c(cspct(r), d)];
      })
    };
    if (!ids.length) return null;
    const balOf = p => ids.reduce((a, id) => a + (p.funds[id] || 0), 0);
    return {
      head: ['calcPeriod', 'calcDate', 'calcDeposited', 'calcReturnCol', 'calcRentab', ids.length === 1 ? 'calcProjected' : 'calcProjectedAll', 'calcDiff'].map(k => t(k)),
      rows: per.map((m, i) => {
        const p = M[m], dep = ids.reduce((a, id) => a + (p.principal[id] || 0), 0), bal = balOf(p), g = bal - dep, df = bal - balOf(prev(i));
        return [c(label(m)), c(cdate(p.date)), c(money(dep)), c(csign(g), g), c(cspct(dep ? g / dep * 100 : null), g), c(money(bal)), c(csign(df), df)];
      })
    };
  }
  function calcTable(res, kind, ids, gran = 'year') {
    const d = calcTableData(res, kind, ids, gran);
    if (!d) return `<p class="muted small calc-empty">${esc(t('calcNoInv'))}</p>`;
    return `<div class="calc-table-wrap"><table class="calc-table"><thead><tr>${d.head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${d.rows.map(r => `<tr>${r.map((x, i) => i ? `<td${x.tone != null ? ` class="${cls(x.tone)}"` : ''}>${esc(x.v)}</td>` : `<th scope="row">${esc(x.v)}</th>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  // Fórmulas del mismo tipo juntas: si hay más de una, van en su propia lista desplegable («Inversión periódica · 3»)
  function calcGrouped(list, key, item) {
    const order = [], by = {};
    for (const x of list) { if (!by[x.type]) { by[x.type] = []; order.push(x.type); } by[x.type].push(x); }
    return order.map(type => {
      const xs = by[type]; if (xs.length === 1) return item(xs[0]);
      const k = `${key}:${type}`;
      return `<details class="calc-group" data-cd="${k}" ${calcIsOpen(k) ? 'open' : ''}><summary><span class="calc-f-ico" aria-hidden="true">${ico(CALC.moduleOf(type).icon)}</span><span class="calc-sum-t"><strong>${esc(t('m_' + type))}</strong></span><span class="calc-pill">${xs.length}</span><span class="calc-arrow" aria-hidden="true">›</span></summary><div class="calc-group-list">${xs.map(item).join('')}</div></details>`;
    }).join('');
  }
  // Botón «Año» / «Mes» junto a «Más detalles» (cambia la vista de la tabla con cada toque)
  const calcGranBtn = () => { const g = calcUi().gran; return `<button type="button" class="chip sm calc-view-btn calc-gran" data-calc="gran" aria-label="${esc(t('calcGranAria'))}">${ico('calendar')} ${esc(t(g === 'month' ? 'calcGranMonth' : 'calcGranYear'))}</button>`; };
  // Valor de cada métrica de la Proyección
  function calcMetricVal(res, k) {
    return { digital: money(res.digital), cash: money(res.cash), investments: money(res.investValue), returns: money(res.returns), cashback: `${money(res.cashReceived)} / ${money(res.pending)}`, growth: csign(res.growth),
      cbInvest: t('cmInvNow', { a: money(res.cbInvested), b: money(res.cbValue) }), roundup: t('cmInvNow', { a: money(res.ruInvested), b: money(res.ruValue) }) }[k];
  }
  // Expresión, resultado y variables de una fórmula aplicada
  function calcFormulaText(a, model, res) {
    const v = a.values, out = (res.outputs || {})[a.id] || 0;
    const when = (n, unit) => t(unit === 'years' ? 'cqWhenYear' : 'cqWhenMonth', { n });
    const p = {
      savings: {}, roundup: {},
      periodic: { freq: optLabel('periodic', 'frequency', v.frequency), dest: invName(model, v.target), changes: (v.futureChanges || []).map(c => t('cqChange', { v: money(c.amount), when: when(c.at, c.unit) })).join('; ') || t('cqNoChanges') },
      salaryChange: { what: optLabel('salaryChange', 'what', v.what).toLowerCase(), when: when(v.at, v.unit), v: money(v.newSalary) },
      liquidityCap: { limit: money(v.limit), alloc: calcAllocText(v, model) },
      extraPay: { v: money(v.amount), months: (v.months || []).map(x => calcMonthName(x - 1)).join(', '), changes: (v.futureChanges || []).map(c => t('cqChange', { v: money(c.amount), when: when(c.at, c.unit) })).join('; ') || t('cqNoChanges') },
      movement: { kind: optLabel('movement', 'kind', v.kind).toLowerCase(), v: money(v.amount), when: when(v.at, v.unit),
        rep: v.repeat !== 'yes' ? '' : t('cqRepeat', { every: v.everyUnit === 'years' ? t(v.every === 1 ? 'calcYear1' : 'calcYearsN', { n: v.every }) : t(v.every === 1 ? 'calcMonth1' : 'calcMonthsN', { n: v.every }),
          until: v.until === 'for' ? t('cqRepeatFor', { n: v.forUnit === 'years' ? t(v.forN === 1 ? 'calcYear1' : 'calcYearsN', { n: v.forN }) : t(v.forN === 1 ? 'calcMonth1' : 'calcMonthsN', { n: v.forN }) }) : t('cqRepeatEnd') }) },
      cashback: { rate: cpct(v.rate), delay: v.delay, dest: v.target === 'none' ? t('cqDigital') : invName(model, v.target), pct: cpct(v.target === 'none' ? 0 : v.percent) },
      loan: { p: money(v.principal), rate: cpct(v.rate), term: v.unit === 'years' ? t(v.term === 1 ? 'calcYear1' : 'calcYearsN', { n: v.term }) : t(v.term === 1 ? 'calcMonth1' : 'calcMonthsN', { n: v.term }), dest: invName(model, v.target) }
    }[a.type] || {};
    return [t('cq_' + a.type, p), t((a.type === 'salaryChange' && v.what === 'expense' ? 'cr_expenseChange' : 'cr_' + a.type), { v: money(a.type === 'salaryChange' ? v.newSalary : out) })];
  }
  // «Indexado 60 %, Oro 40 %» o «Indexado 300 € al mes»
  const calcAllocText = (v, model) => (v.allocations || []).map(x => `${invName(model, x.target)} ${v.split === 'fixed' ? t('cqPerMonth', { v: money(x.value) }) : cpct(x.value)}`).join(', ') || t('cqNoAlloc');
  function calcVarsText(type, v, model) {
    const mod = CALC.moduleOf(type); if (!mod) return '';
    const parts = mod.fields.filter(f => !f[5] || Object.entries(f[5]).every(([dk, dv]) => v[dk] === dv)).map(([k, kind]) => {
      const val = kind === 'money' ? money(v[k]) : kind === 'pct' ? cpct(v[k]) : kind === 'int' ? String(v[k]) : kind === 'select' ? optLabel(type, k, v[k]) : kind === 'months' ? (v[k] || []).map(x => calcMonthName(x - 1)).join(', ') : invName(model, v[k]);
      return `${t(`cf_${type}_${k}`)}: ${val}`;
    });
    for (const c of v.futureChanges || []) parts.push(t('cqChange', { v: money(c.amount), when: t(c.unit === 'years' ? 'cqWhenYear' : 'cqWhenMonth', { n: c.at }) }));
    if (type === 'liquidityCap') parts.push(`${t('calcAllocTitle')}: ${calcAllocText(v, model)}`);
    return parts.join(' · ');
  }
  const calcLegacyRaw = () => { for (const k of LEGACY_KEYS) { try { const r = JSON.parse(localStorage.getItem(k) || 'null'); if (r && typeof r === 'object') return r; } catch (e) { /* nada */ } } return null; };

  /* v1.23.4: «Otras monedas» en la Proyección de la calculadora: lo que hay puesto en cada moneda que no es la principal
     (se calcula pasado a la principal con el cambio de hoy) */
  function calcCursHtml() {
    const main = ledgerMain(), by = new Map();
    for (const x of LV.calc) if (x && x.cur && x.cur !== main) (by.get(x.cur) || by.set(x.cur, []).get(x.cur)).push(x);
    if (!by.size) return '';
    const m = (v, c) => privacyOn() ? '•••••' : fmtCur(v, c);
    const one = ([c, xs]) => {
      const st = xs.filter(x => x.kind === 'start'), sum = k => st.reduce((a, x) => a + (Number(x[k]) || 0), 0);
      const dg = sum('digital'), ca = sum('cash'), sal = sum('salary'), ex = sum('expenses'), inv = xs.filter(x => x.kind === 'fund').reduce((a, x) => a + (Number(x.amount) || 0), 0);
      const r = fxRateNow(c), mods = xs.filter(x => x.kind !== 'start' && x.kind !== 'fund').length;
      return `<details class="calc-box inner" data-cd="calc-cur:${esc(c)}" ${calcIsOpen('calc-cur:' + c) ? 'open' : ''}><summary><span class="calc-sum-t"><span class="calc-eyebrow">${esc(c)}</span><strong>${m(dg + ca + inv, c)}</strong></span><span class="calc-arrow" aria-hidden="true">›</span></summary>
        <div class="calc-headline"><div class="calc-hl"><span>${esc(t('cmDigital'))}</span><strong>${m(dg, c)}</strong></div><div class="calc-hl"><span>${esc(t('cmInvestments'))}</span><strong>${m(inv, c)}</strong></div></div>
        <div class="calc-metrics"><div class="calc-metric"><span>${esc(t('cmCash'))}</span><strong>${m(ca, c)}</strong></div>${sal ? `<div class="calc-metric"><span>${esc(t('calcIncomeT'))}</span><strong class="amt-in">${m(sal, c)}</strong></div>` : ''}${ex ? `<div class="calc-metric"><span>${esc(t('calcExpensesT'))}</span><strong class="amt-out">${m(ex, c)}</strong></div>` : ''}<div class="calc-metric"><span>${esc(t('woCurInMain', { m: main }))}</span><strong>${r > 0 ? money(Math.round((dg + ca + inv) * r * 100) / 100) : '—'}</strong></div></div>
        <p class="calc-fine">${esc(r > 0 ? t('woCurRate', { r: fxRateTxt(c, r) }) : t('woCurNoRate'))}${mods ? ' · ' + esc(t('calcCurMods', { n: mods })) : ''}</p></details>`;
    };
    return `<details class="calc-box inner" data-cd="calc-curs" ${calcIsOpen('calc-curs') ? 'open' : ''}><summary><span class="calc-sum-t"><span class="calc-eyebrow">${esc(t('woCursEyebrow'))}</span><strong>${esc(t('woCursTitle'))}</strong></span><span class="calc-pill">${by.size}</span><span class="calc-arrow" aria-hidden="true">›</span></summary>
      <div class="stack" style="gap:8px">${[...by].map(one).join('')}</div><p class="calc-fine">${esc(t('calcCursHint', { m: main }))}</p></details>`;
  }
  function viewCalc() {
    const { model, res, rows } = calcData(), u = calcUi();
    let html = topBar(calcTopActions(true));
    html += `<div class="calc-head"><button class="icon-btn sm" data-act="calc-close" aria-label="${esc(t('calcBack'))}" title="${esc(t('calcBack'))}">${ico('left')}</button><div class="grow"><h1 class="calc-title">${esc(t('calcTitle'))}</h1><p class="muted small">${esc(t('calcSub'))}</p></div></div>`;
    if (!LV.calc.length && !state.ui.calcLegacyDone && calcLegacyRaw()) html += `<div class="banner clay">${ico('calc')}<span class="grow small">${esc(t('calcLegacyFound'))}</span><button class="chip sm" data-calc="legacy">${esc(t('calcLegacyImport'))}</button></div>`;
    html += `<section class="calc-hub clay" aria-label="${esc(t('calcTitle'))}">${[['start', 'calcStart', 'compass'], ['modules', 'calcModules', 'puzzle'], ['time', 'calcTime', 'timer'], ['projections', 'calcProjections', 'folder'], ['reset', 'calcReset', 'refresh'], ['pdf', 'calcShare', 'share']].map(([k, l, i]) => `<button class="chip" data-calc="${k}">${ico(i)} ${esc(t(l))}</button>`).join('')}<button class="chip calc-pace" data-calc="pace">${ico('trend')} ${esc(t('paceBtn'))}</button></section>`;
    // Patrimonio proyectado y Proyección
    // La primera vez que aparece el cashback invertido o los redondeos, su métrica se muestra sola (luego se quita o pone desde «Ver»)
    for (const k of ['cbInvest', 'roundup']) if (calcMetricOn(res, k) && !u.seen.includes(k)) { u.seen.push(k); if (!u.metrics.includes(k)) u.metrics.push(k); save(); }
    const metric = k => u.metrics.includes(k) && calcMetricOn(res, k);
    html += `<section class="calc-card clay" aria-labelledby="calc-total-l">
      <div class="calc-hero"><div class="calc-eyebrow" id="calc-total-l">${esc(t('calcHeroEyebrow'))}</div><strong class="calc-total">${money(res.final)}</strong>
        <div class="calc-trend ${res.delta < 0 ? 'amt-out' : 'amt-in'}"><span>${esc(t('calcReturn', { v: csign(res.delta) }))}</span><span>${esc(t('calcProfit', { v: cspct(res.pct) }))}</span></div>
        <p class="muted small">${esc(t('calcHorizonLine', { n: cmonths(res.months), date: cdate(res.endDate), v: money(res.initial) }))}</p></div>
      <details class="calc-box" data-cd="proj" ${calcIsOpen('proj') ? 'open' : ''}><summary><span class="calc-sum-t"><span class="calc-eyebrow">${esc(t('calcProjEyebrow'))}</span><strong>${esc(t('calcProjection'))}</strong></span><span class="calc-pill">${esc(t(res.formulas === 1 ? 'calcFormula1' : 'calcFormulasN', { n: res.formulas }))}</span><button type="button" class="chip sm calc-view-btn" data-calc="view" aria-label="${esc(t('calcViewAria'))}">${ico('eye')} ${esc(t('calcView'))}</button><span class="calc-arrow" aria-hidden="true">›</span></summary>
        ${metric('digital') || metric('investments') ? `<div class="calc-headline">${metric('digital') ? `<div class="calc-hl"><span>${esc(t('cmDigital'))}</span><strong>${money(res.digital)}</strong><div class="calc-hl-st ${res.digitalDelta < 0 ? 'amt-out' : 'amt-in'}"><span>${esc(t('calcReturn', { v: csign(res.digitalDelta) }))}</span><span>${esc(t('calcProfit', { v: cspct(res.digitalPct) }))}</span></div></div>` : ''}${metric('investments') ? `<div class="calc-hl"><span>${esc(t('cmInvestments'))}</span><strong>${money(res.investValue)}</strong><div class="calc-hl-st ${res.fundDelta < 0 ? 'amt-out' : 'amt-in'}"><span>${esc(t('calcReturn', { v: csign(res.fundDelta) }))}</span><span>${esc(t('calcProfit', { v: cspct(res.fundPct) }))}</span></div></div>` : ''}</div>` : ''}
        ${['cash', 'returns', 'cashback', 'growth', 'cbInvest', 'roundup'].some(metric) ? `<div class="calc-metrics">${['cash', 'returns', 'cashback', 'growth', 'cbInvest', 'roundup'].filter(metric).map(k => `<div class="calc-metric"><span>${esc(t(k === 'cashback' ? 'calcCashbackLong' : CALC_METRICS.find(m => m[0] === k)[1]))}</span><strong>${calcMetricVal(res, k)}</strong></div>`).join('')}</div>` : ''}
        ${res.perInvestment.length ? `<div class="calc-breakdown">${res.perInvestment.map(i => `<button type="button" class="calc-inv" data-calc="fund-chart" data-id="${esc(i.id)}"><strong>${esc(i.name)}</strong><small>${esc(t('calcInvValue', { v: money(i.value), p: cpct(i.share) }))}</small><small>${esc(t('calcInvRate', { p: cpct(i.rate), acc: t(i.accumulative ? 'calcAccumulative' : 'calcNonAccumulative') }))}</small><small class="${cls(i.gain)}">${esc(t('calcInvVar', { v: csign(i.gain) }))}</small></button>`).join('')}</div>` : ''}
        <p class="calc-fine">${esc(t('calcHypothesis'))}</p>
        ${calcCursHtml()}
        <details class="calc-box inner" data-cd="savings" ${calcIsOpen('savings') ? 'open' : ''}><summary><span class="calc-sum-t"><span class="calc-eyebrow">${esc(t('calcSavingsEyebrow'))}</span><strong>${esc(t('calcSavings'))}</strong></span><span class="calc-arrow" aria-hidden="true">›</span></summary>
          <div class="calc-metrics"><div class="calc-metric"><span>${esc(t('calcIncomeT'))}</span><strong class="amt-in">${money(res.totalIncome)}</strong></div><div class="calc-metric"><span>${esc(t('calcExpensesT'))}</span><strong class="amt-out">${money(res.totalExpenses)}</strong></div><div class="calc-metric wide"><span>${esc(t('calcNetT'))}</span><strong>${money(res.net)}</strong></div></div>
          <p class="calc-fine">${esc(t('calcInPeriod', { n: cmonths(res.months) }))}</p></details>
      </details>`;
    // Gráfico
    const inv = u.mode === 'investments';
    html += `<div class="calc-sec"><div><div class="calc-eyebrow">${esc(t('calcTrajEyebrow'))}</div><h2>${esc(t(inv ? 'calcGraphInv' : 'calcGraphPat'))}</h2></div><div class="row wrap calc-sec-acts"><button class="chip sm" data-calc="mode">${esc(t(inv ? 'calcModePat' : 'calcModeInv'))}</button><button class="chip sm" data-calc="graph" aria-expanded="${!u.hideGraph}">${esc(t(u.hideGraph ? 'calcShowGraph' : 'calcHideGraph'))}</button></div></div>`;
    if (!u.hideGraph) {
      if (!inv) html += `<div class="row wrap calc-toggles" role="group" aria-label="${esc(t('calcSeriesAria'))}">${['income', 'expenses', 'investments'].map(k => `<button type="button" class="calc-toggle ${u.ser[k] ? 'on' : ''}" data-calc="ser" data-v="${k}" aria-pressed="${u.ser[k]}">${esc(t({ income: 'calcSerIncome', expenses: 'calcSerExpenses', investments: 'calcSerInv' }[k]))}</button>`).join('')}</div>`;
      else html += `<details class="calc-box inner" data-cd="funds" ${calcIsOpen('funds') ? 'open' : ''}><summary><strong>${esc(t('calcFundsDetail'))}</strong><span class="calc-pill">${esc(t(model.investments.length === 1 ? 'calcFund1' : 'calcFundsN', { n: model.investments.length }))}</span><span class="calc-arrow" aria-hidden="true">›</span></summary>
        ${res.perInvestment.length ? `<p class="muted small calc-hint-line">${esc(t('calcFundsHint'))}</p><div class="calc-fund-rows">${res.perInvestment.map(i => { const on = !u.off.includes(i.id); return `<div class="calc-fund-row ${on ? 'on' : ''}" role="button" tabindex="0" aria-pressed="${on}" data-calc="fund-toggle" data-id="${esc(i.id)}"><strong>${esc(i.name)}</strong><div><span>${esc(t('calcDeposited'))}</span><b>${money(i.principal)}</b></div><div><span>${esc(t('calcEstReturn'))}</span><b class="${cls(i.gain)}">${csign(i.gain)}</b></div><div><span>${esc(t('calcRentab'))}</span><b class="${cls(i.gain)}">${cspct(i.pct)}</b></div><div><span>${esc(t('calcProjected'))}</span><b>${money(i.value)}</b></div><button type="button" class="calc-graph-ico" data-calc="fund-chart" data-id="${esc(i.id)}" aria-label="${esc(t('calcFundChart', { name: i.name }))}" title="${esc(t('calcFundChart', { name: i.name }))}">${ico('trend')}</button></div>`; }).join('')}</div>` : `<p class="muted small calc-empty">${esc(t('calcNoInv'))}</p>`}</details>`;
      html += calcChart('main', rows, calcSeries(model, u), { aria: t(inv ? 'calcGraphInv' : 'calcGraphPat') });
      html += `<details class="calc-box inner" data-cd="details" ${calcIsOpen('details') ? 'open' : ''}><summary><strong>${esc(t('calcMoreDetails'))}</strong>${calcGranBtn()}<span class="calc-arrow" aria-hidden="true">›</span></summary>${calcTable(res, inv ? 'investments' : 'patrimony', model.investments.filter(i => !u.off.includes(i.id)).map(i => i.id), u.gran)}</details>`;
    }
    html += `</section>`;
    // Mi Biblioteca: fórmulas que forman el resultado
    html += `<details class="calc-card clay calc-lib" data-cd="lib" ${calcIsOpen('lib') ? 'open' : ''}><summary><span class="calc-sum-t"><span class="calc-eyebrow">${esc(t('calcLibEyebrow'))}</span><strong>${esc(t('calcLibrary'))}</strong></span><span class="calc-pill">${model.applied.length}</span><span class="calc-arrow" aria-hidden="true">›</span></summary>
      ${model.applied.length ? calcGrouped(model.applied, 'ga', a => { const [eq, r] = calcFormulaText(a, model, res); return `<details class="calc-formula" data-cd="f:${esc(a.id)}" ${calcIsOpen('f:' + a.id) ? 'open' : ''}><summary><span class="calc-f-ico" aria-hidden="true">${ico(CALC.moduleOf(a.type).icon)}</span><span class="calc-sum-t"><strong>${esc(a.name || t('m_' + a.type))}</strong><small>${esc(t('m_' + a.type) + calcCurTag(a.id))}</small></span><span class="calc-arrow" aria-hidden="true">›</span></summary>
        <div class="calc-eq">${esc(eq)}</div><div class="calc-res">${esc(r)}</div><p class="calc-fine">${esc(calcVarsText(a.type, a.values, model))}</p>
        <div class="row wrap calc-f-acts"><button class="chip sm" data-calc="edit-applied" data-id="${esc(a.id)}">${ico('edit')} ${esc(t('calcEditFormula'))}</button><button class="chip sm calc-danger" data-calc="remove-applied" data-id="${esc(a.id)}">${ico('trash')} ${esc(t('calcRemoveFormula'))}</button></div></details>`; }) : `<p class="muted small calc-empty">${esc(t('calcNoApplied'))}</p>`}
    </details>`;
    return html;
  }

  function calcClick(e) {
    const el = e.target.closest('[data-calc]'); if (!el) return false;
    const k = el.dataset.calc, id = el.dataset.id, u = calcUi();
    if (el.closest('summary')) e.preventDefault(); // «Ver» dentro del encabezado no pliega la Proyección
    switch (k) {
      case 'start': openCalcStart(); break;
      case 'modules': openCalcModules(); break;
      case 'time': openCalcTime(); break;
      case 'reset': openCalcReset(); break;
      case 'pdf': openCalcPdf(); break;
      case 'projections': openProjections(); break;
      case 'pace': paceProjection(); break;
      case 'view': openCalcView(); break;
      case 'mode': u.mode = u.mode === 'investments' ? 'patrimony' : 'investments'; save(); render(); break;
      case 'graph': u.hideGraph = !u.hideGraph; save(); render(); break;
      case 'gran': u.gran = u.gran === 'month' ? 'year' : 'month'; save(); render(); if (calcFundDraw) calcFundDraw(); break;
      case 'ser': u.ser[el.dataset.v] = !u.ser[el.dataset.v]; save(); render(); break;
      case 'fund-toggle': u.off = u.off.includes(id) ? u.off.filter(x => x !== id) : [...u.off, id]; save(); render(); $(`.calc-fund-row[data-id="${CSS.escape(id)}"]`)?.focus(); break;
      case 'fund-chart': openCalcFund(id); break;
      case 'edit-applied': { const a = calcItem(id); if (a) openCalcFormula(a, 'applied'); break; }
      case 'remove-applied': {
        const a = calcItem(id); if (!a) break;
        confirmDialog(t('calcRemoveQ', { name: a.name || t('m_' + a.type) })).then(ok => { if (!ok) return; LV.calc = LV.calc.filter(x => x.id !== id); calcCommit(t('calcRemoved')); });
        break;
      }
      case 'legacy': calcImportLegacy(); break;
      default: return false;
    }
    return true;
  }
  async function calcImportLegacy() {
    const raw = calcLegacyRaw(); if (!raw) return;
    if (LV.calc.length && !(await confirmDialog(t('calcLegacyQ')))) return;
    LV.calc = CALC.fromLegacy(raw, todayKey(), uid);
    state.ui.calcLegacyDone = true; calcCommit(t('calcLegacyDone'));
  }

  // Campo de importe o número: vacío → null; texto no válido → NaN
  const calcReadNum = (str, kind) => {
    const s = String(str ?? '').trim(); if (!s) return null;
    if (kind === 'money') { if (/^-/.test(s)) return -1; const c = LED.parseCents(s); return c == null ? NaN : c / 100; }
    return CALC.parseNum(s);
  };
  const calcInVal = v => v == null || v === '' ? '' : esc(fmtPctIn(v));

  /* ---------- Punto de partida: saldos, fondos iniciales y destinos de inversión ---------- */
  function openCalcStart() {
    let wref;
    const draw = () => {
      const { model } = calcData(), s = calcItem(CALC.START_ID) || model.start, invs = model.investments, funds = model.funds.map(f => calcItem(f.id) || f);
      const optsInv = sel => invs.map(i => `<option value="${esc(i.id)}" ${i.id === sel ? 'selected' : ''}>${esc(i.name)} · ${esc(cpct(i.rate))}</option>`).join('');
      $('#cs', wref).innerHTML = `<div class="calc-grid">
          ${[['digital', 'csDigital'], ['cash', 'csCash'], ['salary', 'csSalary'], ['expenses', 'csExpenses']].map(([k, l]) => `<label class="field"><span>${esc(t(l, { $cur: s.cur }))}</span><input class="input" inputmode="decimal" autocomplete="off" data-cs="${k}" value="${calcInVal(s[k])}" placeholder="0,00"></label>`).join('')}
          <label class="field"><span>${esc(t('csDate'))}</span><input class="input" type="date" data-cs="date" value="${esc(s.date)}"></label>
          <label class="field"><span>${esc(t('fxCurrency'))}</span>${calcCurSel(s.cur, 'data-cs="cur"')}</label></div>
        <p class="calc-fine">${esc(t('calcStartHint'))}</p>
        <button class="btn sm calc-blue" data-cs-act="apply-worth">${ico('wallet')} ${esc(t('woApply'))}</button>
        <div class="calc-part"><div class="calc-sec"><div><div class="calc-eyebrow">${esc(t('calcFundsEyebrow'))}</div><h3>${esc(t('calcFundsTitle'))}</h3></div><button class="btn sm calc-blue" data-cs-act="add-fund">${ico('plus')} ${esc(t('calcAddFund'))}</button></div>
          ${funds.length ? funds.map(f => `<div class="calc-fund-edit" data-fund="${esc(f.id)}"><label class="field"><span>${esc(t('calcFundName'))}</span><input class="input" maxlength="60" data-cf="name" value="${esc(f.name)}"></label><label class="field"><span>${esc(t('calcFundAmount', { $cur: f.cur }))}</span><span class="cap-input"><input class="input" inputmode="decimal" data-cf="amount" value="${calcInVal(f.amount)}" placeholder="0,00">${calcCurSel(f.cur, 'data-cf="cur"').replace('class="input"', 'class="input cur-sel"')}</span></label><label class="field calc-fund-target"><span>${esc(t('calcFundTarget'))}</span><select class="input" data-cf="target">${invs.some(i => i.id === f.target) ? '' : `<option value="" selected disabled>${esc(t('calcSelectDest'))}</option>`}${optsInv(f.target)}</select></label><button class="icon-btn sm calc-del" data-cs-act="del-fund" data-id="${esc(f.id)}" aria-label="${esc(t('calcFundDel'))}" title="${esc(t('calcFundDel'))}">${ico('trash')}</button></div>`).join('') : `<p class="muted small calc-empty">${esc(t('calcNoFunds'))}</p>`}</div>
        <div class="calc-part"><div class="calc-sec"><div><div class="calc-eyebrow">${esc(t('calcDestEyebrow'))}</div><h3>${esc(t('calcDestTitle'))}</h3></div><button class="btn sm" data-cs-act="add-dest">${ico('plus')} ${esc(t('calcAddDest'))}</button></div>
          ${invs.length ? invs.map(i => `<details class="calc-dest" data-dest="${esc(i.id)}" data-cd="dest:${esc(i.id)}" ${calcIsOpen('dest:' + i.id) ? 'open' : ''}><summary><span class="calc-sum-t"><strong>${esc(i.name)}</strong><small>${esc(cpct(i.rate))} · ${esc(t(i.accumulative ? 'calcAccumulative' : 'calcNonAccumulative'))}</small></span><span class="chip sm">${ico('edit')} ${esc(t('calcEdit'))}</span></summary>
            <div class="calc-grid three"><label class="field"><span>${esc(t('calcName'))}</span><input class="input" maxlength="60" data-ci="name" value="${esc(i.name)}"></label><label class="field"><span>${esc(t('calcRate'))}</span><input class="input" inputmode="decimal" data-ci="rate" value="${calcInVal(i.rate)}"></label>
              <div class="field"><span>${esc(t('calcCapitalization'))}</span><select class="input" data-ci="accumulative" aria-label="${esc(t('calcCapitalization'))}"><option value="1" ${i.accumulative ? 'selected' : ''}>${esc(t('calcAccumulative'))}</option><option value="0" ${i.accumulative ? '' : 'selected'}>${esc(t('calcNonAccumulative'))}</option></select>${calcHelp(t('calcCapHelp'))}</div></div>
            <div class="row calc-dest-acts"><button class="icon-btn sm calc-del" data-cs-act="del-dest" data-id="${esc(i.id)}" aria-label="${esc(t('calcDestDel'))}" title="${esc(t('calcDestDel'))}">${ico('trash')}</button><button class="icon-btn sm calc-save" data-cs-act="save-dest" data-id="${esc(i.id)}" aria-label="${esc(t('calcDestSave'))}" title="${esc(t('calcDestSave'))}">${ico('check')}</button></div></details>`).join('') : `<p class="muted small calc-empty">${esc(t('calcNoDest'))}</p>`}
          <p class="calc-fine">${esc(t('calcDestHint'))}</p></div>`;
    };
    openModal({
      title: calcHead(t('calcStartEyebrow'), t('calcStart')), cls: 'wide calc-sheet', body: '<div id="cs"></div>',
      onMount: w => {
        wref = w; draw();
        w.addEventListener('change', e => {
          const el = e.target;
          if (el.dataset.cs === 'cur' || el.dataset.cf === 'cur') setTimeout(draw, 0);
          if (el.dataset.cs) {
            const s = calcStartItem(), k = el.dataset.cs;
            if (k === 'date') { if (!CALC.parseDate(el.value)) { el.value = s.date; return; } s.date = el.value; }
            else if (k === 'cur') calcSetCur(s, el.value);
            else { const v = calcReadNum(el.value, 'money'); if (v != null && !(v >= 0)) { toast(t('calcNonNeg')); el.value = calcInVal(s[k]); return; } s[k] = v || 0; }
            calcCommit(); return;
          }
          if (el.dataset.cf) {
            const f = calcItem(el.closest('[data-fund]').dataset.fund); if (!f) return;
            if (el.dataset.cf === 'cur') calcSetCur(f, el.value);
            else if (el.dataset.cf === 'amount') { const v = calcReadNum(el.value, 'money'); if (v != null && !(v >= 0)) { toast(t('calcNonNeg')); el.value = calcInVal(f.amount); return; } f.amount = v || 0; }
            else f[el.dataset.cf] = el.dataset.cf === 'name' ? el.value.trim().slice(0, 60) : el.value;
            calcCommit();
          }
        });
      },
      onClick: async (e) => {
        const b = e.target.closest('[data-cs-act]'); if (!b) return;
        const { model } = calcData(), act = b.dataset.csAct, id = b.dataset.id;
        if (act === 'apply-worth') { calcApplyWorth(draw); return; }
        if (act === 'add-fund') {
          if (!model.investments.length) { toast(t('calcNeedDestFirst')); return; }
          LV.calc.push({ id: uid(), kind: 'fund', name: t('calcNewFund'), amount: 0, target: model.investments[0].id, ord: calcOrd() }); calcCommit(); draw();
        } else if (act === 'del-fund') { LV.calc = LV.calc.filter(x => x.id !== id); calcCommit(); draw(); }
        else if (act === 'add-dest') openCalcNewDest(() => draw());
        else if (act === 'save-dest' || act === 'del-dest') {
          const it = calcItem(id), box = b.closest('[data-dest]'); if (!it) return;
          if (act === 'del-dest') {
            const used = CALC.usesOf(model, id);
            if (used.funds || used.formulas) { toast(t('calcDestInUse', { name: it.name, f: used.funds, m: used.formulas })); return; }
            if (!(await confirmDialog(t('calcDestDelQ', { name: it.name })))) return;
            LV.calc = LV.calc.filter(x => x.id !== id); calcUi().off = calcUi().off.filter(x => x !== id); calcCommit(t('calcDestDeleted')); draw(); return;
          }
          const name = $('[data-ci="name"]', box).value.trim().slice(0, 60), rate = CALC.parseNum($('[data-ci="rate"]', box).value);
          if (!name) { toast(t('calcNeedName')); return; }
          if (!Number.isFinite(rate) || rate < -99) { toast(t('calcRateMin')); return; }
          Object.assign(it, { name, rate, accumulative: $('[data-ci="accumulative"]', box).value === '1' }); calcOpenD.set('dest:' + id, false);
          calcCommit(t('calcDestSaved')); draw();
        }
      }
    });
  }
  // Nueva inversión de destino: nombre, rentabilidad esperada y capitalización
  function openCalcNewDest(done) {
    openModal({
      title: calcHead(t('calcNewDestEyebrow'), t('calcNewDest')), cls: 'calc-sheet',
      body: `<div class="stack"><label class="field"><span>${esc(t('calcName'))}</span><input class="input" id="cd-name" maxlength="60" placeholder="${esc(t('calcNamePh'))}"></label>
        <label class="field"><span>${esc(t('calcRate'))}</span><input class="input" id="cd-rate" inputmode="decimal" value="0"></label>
        <div class="field"><span>${esc(t('calcCapitalization'))}</span><select class="input" id="cd-acc" aria-label="${esc(t('calcCapitalization'))}"><option value="1">${esc(t('calcAccumulative'))}</option><option value="0">${esc(t('calcNonAccumulative'))}</option></select>${calcHelp(t('calcCapHelp'))}</div>
        <p class="calc-fine">${esc(t('calcRateHyp'))}</p></div>`,
      foot: `<button class="btn calc-blue" data-cd-save>${esc(t('calcCreateDest'))}</button>`,
      onMount: w => { setTimeout(() => $('#cd-name', w)?.focus(), 60); w.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); $('[data-cd-save]', w).click(); } }); },
      onClick: (e, close, w) => {
        if (!e.target.closest('[data-cd-save]')) return;
        const name = $('#cd-name', w).value.trim().slice(0, 60), rate = CALC.parseNum($('#cd-rate', w).value);
        if (!name) { toast(t('calcNeedName')); $('#cd-name', w).focus(); return; }
        if (!Number.isFinite(rate) || rate < -99) { toast(t('calcRateMin')); return; }
        LV.calc.push({ id: uid(), kind: 'inv', name, rate, accumulative: $('#cd-acc', w).value === '1', ord: calcOrd() });
        close(); calcCommit(); done && done();
      }
    });
  }
  function openCalcTime() {
    const s = calcData().model.start;
    openModal({
      title: calcHead(t('calcHorizonEyebrow'), t('calcTime')), cls: 'calc-sheet',
      body: `<div class="calc-grid"><label class="field"><span>${esc(t('ctDuration'))}</span><input class="input" id="ct-n" inputmode="numeric" value="${esc(s.horizon)}"></label><label class="field"><span>${esc(t('ctUnit'))}</span><select class="input" id="ct-u"><option value="months" ${s.unit === 'months' ? 'selected' : ''}>${esc(t('ctMonths'))}</option><option value="years" ${s.unit === 'years' ? 'selected' : ''}>${esc(t('ctYears'))}</option></select></label></div><p class="calc-fine">${esc(t('calcTimeHint'))}</p>`,
      onMount: w => w.addEventListener('change', () => {
        const st = calcStartItem(), n = Math.round(CALC.parseNum($('#ct-n', w).value)), unit = $('#ct-u', w).value;
        if (!(n >= 1)) { toast(t('calcPeriodMin')); $('#ct-n', w).value = st.horizon; return; }
        st.unit = unit; st.horizon = Math.min(n, unit === 'years' ? CALC.MAX_MONTHS / 12 : CALC.MAX_MONTHS); $('#ct-n', w).value = st.horizon; calcCommit();
      })
    });
  }
  function openCalcReset() {
    openModal({
      title: calcHead(t('calcResetEyebrow'), t('calcResetQ')), cls: 'calc-sheet', body: `<p style="margin:0">${esc(t('calcResetText'))}</p>`,
      foot: `<button class="btn" data-m="x">${esc(t('cancel'))}</button><button class="btn danger" data-cr>${esc(t('calcResetYes'))}</button>`,
      onClick: (e, close) => { if (!e.target.closest('[data-cr]')) return; LV.calc = []; calcUi().off = []; calcOpenD.clear(); ['proj', 'funds', 'lib', 'tpl'].forEach(k => calcOpenD.set(k, true)); close(); calcCommit(t('calcResetDone')); sfx('undo'); }
    });
  }
  // «Ver»: elegir varias métricas de la Proyección
  function openCalcView() {
    let wref, last = '';
    const draw = () => {
      const { res } = calcData(), u = calcUi();
      $('#cv', wref).innerHTML = `<p class="muted small" style="margin:0 0 12px">${esc(t('calcViewHint'))}</p><div class="calc-view-list">${CALC_METRICS.filter(([k]) => calcMetricOn(res, k)).map(([k, l]) => { const on = u.metrics.includes(k); return `<button type="button" class="calc-view-opt ${on ? 'on' : ''}" data-cv-m="${k}" aria-pressed="${on}">${esc(t(l))}<strong>${calcMetricVal(res, k)}</strong></button>`; }).join('')}</div>${last ? `<div class="calc-view-res" role="status">${esc(last)}</div>` : ''}`;
    };
    openModal({
      title: calcHead(t('calcViewEyebrow'), t('calcViewTitle')), cls: 'calc-sheet', body: '<div id="cv"></div>',
      onMount: w => { wref = w; draw(); },
      onClick: e => {
        const b = e.target.closest('[data-cv-m]'); if (!b) return;
        const u = calcUi(), k = b.dataset.cvM, on = !u.metrics.includes(k), name = t(CALC_METRICS.find(m => m[0] === k)[1]);
        u.metrics = on ? [...u.metrics, k] : u.metrics.filter(x => x !== k); calcOpenD.set('proj', true);
        last = t(on ? 'calcViewOn' : 'calcViewOff', { name, v: calcMetricVal(calcData().res, k) });
        save(); render(); draw(); $(`[data-cv-m="${k}"]`, wref)?.focus();
      }
    });
  }
  // Gráfico de un solo destino, con sus detalles y edición rápida
  let calcFundDraw = null; // redibuja la ventana de un fondo abierta (p. ej. al pasar de «Año» a «Mes»)
  function openCalcFund(id) {
    let wref;
    const draw = () => {
      const { model, res, rows } = calcData(), i = model.investments.find(x => x.id === id); if (!i) return;
      const color = CALC_COLORS[model.investments.indexOf(i) % CALC_COLORS.length];
      $('.sheet-head h2', wref).innerHTML = calcHead(t('calcFundEyebrow'), i.name);
      $('#cfund-chart', wref).innerHTML = `${calcChart('fund', rows, [{ fund: i.id, label: i.name, color }], { single: true, aria: i.name })}<details class="calc-box inner" data-cd="fund-details" ${calcIsOpen('fund-details') ? 'open' : ''}><summary><strong>${esc(t('calcMoreDetails'))}</strong>${calcGranBtn()}<span class="calc-arrow" aria-hidden="true">›</span></summary>${calcTable(res, 'investments', [i.id], calcUi().gran)}</details>`;
    };
    const i0 = calcData().model.investments.find(x => x.id === id); if (!i0) return;
    openModal({
      title: calcHead(t('calcFundEyebrow'), i0.name), cls: 'wide calc-sheet',
      body: `<details class="calc-box inner" data-cd="fund-edit"><summary><strong>${esc(t('calcEditInv'))}</strong><span class="calc-arrow" aria-hidden="true">›</span></summary><div class="calc-grid three"><label class="field"><span>${esc(t('calcName'))}</span><input class="input" maxlength="60" data-fi="name" value="${esc(i0.name)}"></label><label class="field"><span>${esc(t('calcRate'))}</span><input class="input" inputmode="decimal" data-fi="rate" value="${calcInVal(i0.rate)}"></label><label class="field"><span>${esc(t('calcCapitalization'))}</span><select class="input" data-fi="accumulative"><option value="1" ${i0.accumulative ? 'selected' : ''}>${esc(t('calcAccumulative'))}</option><option value="0" ${i0.accumulative ? '' : 'selected'}>${esc(t('calcNonAccumulative'))}</option></select></label></div></details><div id="cfund-chart"></div>`,
      onClose: () => { calcFundDraw = null; },
      onMount: w => {
        wref = w; draw(); calcFundDraw = draw;
        w.addEventListener('change', e => {
          const el = e.target, k = el.dataset.fi, it = calcItem(id); if (!k || !it) return;
          if (k === 'name') { const v = el.value.trim().slice(0, 60); if (!v) { toast(t('calcNeedName')); el.value = it.name; return; } it.name = v; }
          else if (k === 'rate') { const v = CALC.parseNum(el.value); if (!Number.isFinite(v) || v < -99) { toast(t('calcRateMin')); el.value = calcInVal(it.rate); return; } it.rate = v; }
          else it.accumulative = el.value === '1';
          calcCommit(); draw();
        });
      }
    });
  }

  /* ---------- Fórmulas Modulares: plantillas, Mi Biblioteca y edición ---------- */
  function calcFieldsHtml(type, v, model) {
    const mod = CALC.moduleOf(type), invs = model.investments;
    const cur = k => { const f = mod.fields.find(x => x[0] === k); return v && v[k] !== undefined ? v[k] : f && f[3] ? f[3][0] : undefined; };
    return `<div class="calc-grid">${mod.fields.map(([k, kind, ex, opts, help, showIf]) => {
      const label = t(`cf_${type}_${k}`), has = v && v[k] !== undefined && v[k] !== '';
      let input;
      if (kind === 'inv' || kind === 'invOpt') input = `<select class="input" data-fv="${k}" data-kind="${kind}" aria-label="${esc(label)}">${kind === 'invOpt' ? `<option value="none" ${!has || v[k] === 'none' ? 'selected' : ''}>${esc(t('calcNoDestOpt'))}</option>` : `<option value="" ${has && invs.some(i => i.id === v[k]) ? '' : 'selected'} disabled>${esc(t(invs.length ? 'calcSelectDest' : 'calcNeedDestFirst'))}</option>`}${invs.map(i => `<option value="${esc(i.id)}" ${has && v[k] === i.id ? 'selected' : ''}>${esc(i.name)} · ${esc(cpct(i.rate))}</option>`).join('')}</select>`;
      else if (kind === 'months') input = `<div class="row wrap calc-months" role="group" aria-label="${esc(label)}" data-fv="${k}" data-kind="months">${Array.from({ length: 12 }, (_, i) => `<label class="check-chip tgl sm"><input type="checkbox" data-fm="${i + 1}" ${has && v[k].includes(i + 1) ? 'checked' : ''}><span>${esc(calcMonthName(i))}</span></label>`).join('')}</div>`;
      else if (kind === 'select') input = `<select class="input" data-fv="${k}" data-kind="select" aria-label="${esc(label)}">${opts.map((o, j) => `<option value="${o}" ${(has ? v[k] === o : j === 0) ? 'selected' : ''}>${esc(optLabel(type, k, o))}</option>`).join('')}</select>`;
      else input = `<input class="input" data-fv="${k}" data-kind="${kind}" inputmode="${kind === 'int' ? 'numeric' : 'decimal'}" autocomplete="off" aria-label="${esc(label)}" placeholder="${esc(fmtPctIn(ex || 0))}" value="${has ? calcInVal(v[k]) : ''}">`;
      const hidden = showIf && Object.entries(showIf).some(([dk, dv]) => cur(dk) !== dv);
      return `<div class="field ${hidden ? 'hidden' : ''}" ${showIf ? `data-show-if="${esc(JSON.stringify(showIf))}"` : ''}><span>${esc(label)}</span>${input}${help ? calcHelp(t(`cfh_${type}_${k}`)) : ''}</div>`;
    }).join('')}</div>${['periodic', 'extraPay'].includes(type) ? `<div class="calc-changes"><p class="calc-fine">${esc(t(type === 'extraPay' ? 'calcPayChangesHint' : 'calcChangesHint'))}</p><div class="calc-change-rows">${(v && v.futureChanges || []).map(c => calcChangeRow(c, type)).join('')}</div></div>` : ''}${type === 'liquidityCap' ? `<div class="calc-changes"><p class="calc-fine">${esc(t('calcAllocHint'))}</p><div class="calc-change-rows calc-alloc-rows">${(v && v.allocations && v.allocations.length ? v.allocations : [{}]).map(x => calcAllocRow(model, x, v && v.split)).join('')}</div></div>` : ''}`;
  }
  // Fila de reparto del techo de liquidez: destino + porcentaje del exceso o importe fijo al mes
  const calcAllocLabel = split => t(split === 'fixed' ? 'calcAllocFixed' : 'calcAllocPct');
  const calcAllocRow = (model, x = {}, split) => `<div class="calc-change-row calc-alloc-row" data-al><label class="field"><span>${esc(t('calcAllocDest'))}</span><select class="input" data-al-target><option value="" ${model.investments.some(i => i.id === x.target) ? '' : 'selected'} disabled>${esc(t(model.investments.length ? 'calcSelectDest' : 'calcNeedDestFirst'))}</option>${model.investments.map(i => `<option value="${esc(i.id)}" ${x.target === i.id ? 'selected' : ''}>${esc(i.name)} · ${esc(cpct(i.rate))}</option>`).join('')}</select></label><label class="field"><span data-al-lbl>${esc(calcAllocLabel(split))}</span><input class="input" inputmode="decimal" data-al-value value="${x.value != null ? calcInVal(x.value) : ''}" placeholder="${split === 'fixed' ? '300' : '100'}"></label><button type="button" class="icon-btn sm calc-del" data-f-act="del-change" aria-label="${esc(t('calcAllocDel'))}" title="${esc(t('calcAllocDel'))}">${ico('x')}</button></div>`;
  // El «+» verde: un cambio futuro (inversión periódica) o un destino más (techo de liquidez)
  function calcAddRow(scope, type) {
    const rows = $('.calc-change-rows', scope); if (!rows) return;
    if (type === 'liquidityCap') { const sp = $('[data-fv="split"]', scope); rows.insertAdjacentHTML('beforeend', calcAllocRow(calcData().model, {}, sp && sp.value)); $('[data-al]:last-child [data-al-target]', scope).focus(); }
    else { rows.insertAdjacentHTML('beforeend', calcChangeRow({}, type)); $('[data-fc]:last-child [data-fc-at]', scope).focus(); }
  }
  // Al cambiar «porcentaje / importe fijo» se actualiza la etiqueta de cada fila
  // Al cambiar un desplegable: etiquetas del reparto del techo y campos que dependen de otro («Repetir», «Hasta»)
  const calcSplitSync = e => {
    const el = e.target; if (!el.matches || !el.matches('select[data-fv]')) return;
    const box = el.closest('.calc-mod, #cfe-form'); if (!box) return;
    if (el.dataset.fv === 'split') $$('[data-al-lbl]', box).forEach(x => { x.textContent = calcAllocLabel(el.value); });
    $$('[data-show-if]', box).forEach(f => { const c = JSON.parse(f.dataset.showIf); f.classList.toggle('hidden', Object.entries(c).some(([k, v]) => { const s = box.querySelector(`[data-fv="${k}"]`); return !s || s.value !== v; })); });
  };
  const calcPlusBtn = type => ['periodic', 'extraPay', 'liquidityCap'].includes(type) ? `<button type="button" class="calc-plus" data-f-act="add-change" data-mod="${type}" aria-label="${esc(t(type === 'liquidityCap' ? 'calcAddAlloc' : 'calcAddChange'))}" title="${esc(t(type === 'liquidityCap' ? 'calcAddAlloc' : 'calcAddChange'))}">${ico('plus')}</button>` : '';
  const calcMonthName = i => fmtDate(`2026-${String(i + 1).padStart(2, '0')}-01`, { month: 'short' });
  const calcChangeRow = (c = {}, type) => `<div class="calc-change-row" data-fc><label class="field"><span>${esc(t('calcChangeFrom'))}</span><input class="input" inputmode="numeric" data-fc-at value="${c.at ? esc(c.at) : ''}" placeholder="3"></label><label class="field"><span>${esc(t('calcChangeUnit'))}</span><select class="input" data-fc-unit><option value="months" ${c.unit !== 'years' ? 'selected' : ''}>${esc(t('cuMonth'))}</option><option value="years" ${c.unit === 'years' ? 'selected' : ''}>${esc(t('cuYear'))}</option></select></label><label class="field"><span>${esc(t(type === 'extraPay' ? 'calcPayChangeAmount' : 'calcChangeAmount'))}</span><input class="input" inputmode="decimal" data-fc-amount value="${c.amount != null ? calcInVal(c.amount) : ''}"></label><button type="button" class="icon-btn sm calc-del" data-f-act="del-change" aria-label="${esc(t('calcChangeDel'))}" title="${esc(t('calcChangeDel'))}">${ico('x')}</button></div>`;
  // Lee y valida las variables de un formulario → { values } o { err }
  function calcReadForm(box, type, model) {
    const mod = CALC.moduleOf(type), values = {};
    for (const [k, kind, ex] of mod.fields) {
      const el = box.querySelector(`[data-fv="${k}"]`); if (!el) return { err: t('calcFillAll') };
      if (el.closest('.field.hidden')) { if (kind === 'select') values[k] = el.value; else if (ex != null) values[k] = ex; continue; } // campo que no aplica (p. ej. «Repetir: No»)
      if (kind === 'inv') { if (!model.investments.length) return { err: t('calcNeedDestFirst') }; if (!model.investments.some(i => i.id === el.value)) return { err: t('calcNeedDest') }; values[k] = el.value; continue; }
      if (kind === 'invOpt') { values[k] = model.investments.some(i => i.id === el.value) ? el.value : 'none'; continue; }
      if (kind === 'select') { if (!el.value) return { err: t('calcFillAll') }; values[k] = el.value; continue; }
      if (kind === 'months') { values[k] = [...el.querySelectorAll('[data-fm]:checked')].map(x => +x.dataset.fm); if (!values[k].length) return { err: t('calcPayNeedMonth') }; continue; }
      const n = calcReadNum(el.value, kind);
      if (n == null || Number.isNaN(n)) return { err: t('calcFillAll'), el };
      if (n < 0) return { err: t('calcNonNeg'), el };
      values[k] = kind === 'int' ? Math.round(n) : n;
    }
    if (['salaryChange', 'movement'].includes(type) && values.at < 1) return { err: t('calcPeriodMin') };
    if (type === 'movement' && values.repeat === 'yes' && (values.every < 1 || (values.until === 'for' && values.forN < 1))) return { err: t('calcPeriodMin') };
    if (type === 'loan' && values.term < 1) return { err: t('calcPeriodMin') };
    if (type === 'periodic' || type === 'extraPay') {
      values.futureChanges = [];
      for (const r of box.querySelectorAll('[data-fc]')) {
        const at = CALC.parseNum(r.querySelector('[data-fc-at]').value), amount = calcReadNum(r.querySelector('[data-fc-amount]').value, 'money');
        if (!(at >= 1) || amount == null || !(amount >= 0)) return { err: t('calcChangesFill') };
        values.futureChanges.push({ at: Math.round(at), unit: r.querySelector('[data-fc-unit]').value, amount });
      }
    }
    if (type === 'liquidityCap') {
      values.allocations = [];
      for (const r of box.querySelectorAll('[data-al]')) {
        const target = r.querySelector('[data-al-target]').value, el = r.querySelector('[data-al-value]'), value = calcReadNum(el.value, values.split === 'fixed' ? 'money' : 'pct');
        if (!model.investments.some(i => i.id === target)) return { err: t(model.investments.length ? 'calcNeedDest' : 'calcNeedDestFirst') };
        if (value == null || Number.isNaN(value) || !(value > 0)) return { err: t('calcAllocFill'), el };
        values.allocations.push({ target, value });
      }
      if (!values.allocations.length) return { err: t('calcAllocNone') };
      if (values.split === 'pct' && values.allocations.reduce((a, x) => a + x.value, 0) > 100.0001) return { err: t('calcAllocOver') };
    }
    return { values: CALC.cleanValues(type, values) };
  }
  // Nombre para Mi Biblioteca sin repetir («Movimiento puntual 2»)
  function calcPresetName(type) {
    const base = t('m_' + type), names = new Set(calcData().model.presets.map(p => p.name));
    if (!names.has(base)) return base;
    let n = 2; while (names.has(`${base} ${n}`)) n++;
    return `${base} ${n}`;
  }
  function openCalcModules() {
    let wref;
    const drawLib = () => {
      const { model } = calcData();
      $('#cm-lib', wref).innerHTML = model.presets.length ? calcGrouped(model.presets, 'gp', p => `<details class="calc-formula" data-preset="${esc(p.id)}"><summary><span class="calc-f-ico" aria-hidden="true">${ico(CALC.moduleOf(p.type).icon)}</span><span class="calc-sum-t"><strong>${esc(p.name)}</strong><small>${esc(t('m_' + p.type) + calcCurTag(p.id))}</small></span><span class="calc-arrow" aria-hidden="true">›</span></summary>
        <p class="calc-fine">${esc(calcVarsText(p.type, p.values, model))}</p><div class="row wrap calc-f-acts"><button class="chip sm calc-blue" data-f-act="use" data-id="${esc(p.id)}">${ico('check')} ${esc(t('calcUse'))}</button><button class="chip sm" data-f-act="edit" data-id="${esc(p.id)}">${ico('edit')} ${esc(t('calcEdit'))}</button><button class="chip sm calc-danger" data-f-act="del" data-id="${esc(p.id)}">${ico('trash')} ${esc(t('calcDelete'))}</button></div></details>`) : `<p class="muted small calc-empty">${esc(t('calcNoPresets'))}</p>`;
    };
    const drawTpl = () => {
      const { model } = calcData();
      $('#cm-tpl', wref).innerHTML = CALC.MODULES.map(m => `<details class="calc-mod" data-mod="${m.id}" name="calc-mod"><summary><span class="calc-f-ico" aria-hidden="true">${ico(m.icon)}</span><span class="calc-sum-t"><strong>${esc(t('m_' + m.id))}</strong><small>${esc(t('md_' + m.id))}</small></span><span class="calc-arrow" aria-hidden="true">›</span></summary>
        <div class="calc-mod-form">${calcFieldsHtml(m.id, null, model)}<div class="calc-form-acts">${calcPlusBtn(m.id)}<button class="btn sm calc-blue" data-f-act="apply" data-mod="${m.id}">${esc(t('calcApply'))}</button></div></div></details>`).join('');
    };
    openModal({
      title: calcHead(t('calcModEyebrow'), t('calcModules')), cls: 'wide calc-sheet',
      body: `<div class="calc-part first"><div class="calc-eyebrow">${esc(t('calcLibReuse'))}</div><h3>${esc(t('calcLibrary'))}</h3><div id="cm-lib"></div></div>
        <details class="calc-box inner calc-tpl" data-cd="tpl" ${calcIsOpen('tpl') ? 'open' : ''}><summary><strong>${esc(t('calcTemplates'))}</strong><span class="calc-arrow" aria-hidden="true">›</span></summary><div id="cm-tpl"></div></details>`,
      onMount: w => {
        wref = w; drawLib(); drawTpl();
        // Solo una plantilla abierta a la vez (también en navegadores sin <details name>)
        w.addEventListener('toggle', e => { const d = e.target; if (d.matches && d.matches('.calc-mod') && d.open) $$('.calc-mod', w).forEach(o => { if (o !== d) o.open = false; }); }, true);
      },
      onInput: calcSplitSync,
      onClick: async (e, close) => {
        const b = e.target.closest('[data-f-act]'); if (!b) return;
        const act = b.dataset.fAct, { model } = calcData();
        if (act === 'add-change') { calcAddRow(b.closest('.calc-mod'), b.dataset.mod); return; }
        if (act === 'del-change') { b.closest('[data-fc], [data-al]').remove(); return; }
        if (act === 'apply') {
          const type = b.dataset.mod, box = b.closest('.calc-mod'), r = calcReadForm(box, type, model);
          if (r.err) { toast(r.err); if (r.el) r.el.focus(); return; }
          const name = calcPresetName(type), ord = calcOrd();
          LV.calc.push({ id: uid(), kind: 'applied', type, name, values: r.values, ord }, { id: uid(), kind: 'preset', type, name, values: JSON.parse(JSON.stringify(r.values)), ord: ord + 1 });
          close(); calcOpenD.set('lib', true); calcCommit(t('calcApplied')); sfx('money'); return;
        }
        const p0 = model.presets.find(x => x.id === b.dataset.id); if (!p0) return;
        const p = calcItem(p0.id) || p0;
        if (act === 'use') {
          if (CALC.moduleOf(p.type).fields.some(([k, kind]) => kind === 'inv' && !model.investments.some(i => i.id === p.values[k])) || (p.values.allocations || []).some(x => !model.investments.some(i => i.id === x.target))) { toast(t('calcNeedDest')); openCalcFormula(p, 'preset', drawLib); return; }
          LV.calc.push({ id: uid(), kind: 'applied', type: p.type, name: p.name, values: JSON.parse(JSON.stringify(p.values)), ...(p.cur ? { cur: p.cur } : {}), ord: calcOrd() });
          close(); calcOpenD.set('lib', true); calcCommit(t('calcAppliedCopy')); sfx('money');
        } else if (act === 'edit') openCalcFormula(p, 'preset', drawLib);
        else if (act === 'del') { if (!(await confirmDialog(t('calcPresetDelQ', { name: p.name })))) return; LV.calc = LV.calc.filter(x => x.id !== p.id); calcCommit(t('calcDeleted')); drawLib(); }
      }
    });
  }
  // Editar una fórmula aplicada o una configuración de Mi Biblioteca (en su propia ventana, sin pasar por las plantillas)
  function openCalcFormula(item, kind, done) {
    let wref;
    openModal({
      title: calcHead(t(kind === 'preset' ? 'calcEditPresetEyebrow' : 'calcLibrary'), t(kind === 'preset' ? 'calcEditPreset' : 'calcEditFormula')), cls: 'wide calc-sheet',
      body: `<div class="stack"><p class="muted small" style="margin:0">${ico(CALC.moduleOf(item.type).icon)} ${esc(t('m_' + item.type))}</p><label class="field"><span>${esc(t('calcName'))}</span><input class="input" id="cfe-name" maxlength="60" value="${esc(item.name)}"></label>${calcMoneyKeys(item).length || (item.values && item.values.futureChanges) ? `<label class="field"><span>${esc(t('fxCurrency'))}</span>${calcCurSel(item.cur, 'id="cfe-cur"')}<small class="muted">${esc(t('calcCurHint'))}</small></label>` : ''}<div id="cfe-form">${calcFieldsHtml(item.type, item.values, calcData().model)}</div></div>`,
      foot: `${calcPlusBtn(item.type)}<button class="btn calc-blue" data-f-act="save">${esc(t('calcSave'))}</button>`,
      onMount: w => {
        wref = w; let sym = curSym(item.cur);
        w.addEventListener('change', e => {
          if (e.target.id !== 'cfe-cur') return;
          const ns = curSym(e.target.value);
          $$('#cfe-form .field > span', w).forEach(sp => { sp.textContent = sp.textContent.replace(`(${sym})`, `(${ns})`); });
          sym = ns;
        });
        if (item.cur) $$('#cfe-form .field > span', w).forEach(sp => { sp.textContent = sp.textContent.replace(`(${curSym()})`, `(${sym})`); });
      },
      onInput: calcSplitSync,
      onClick: (e, close) => {
        const b = e.target.closest('[data-f-act]'); if (!b) return;
        if (b.dataset.fAct === 'add-change') { calcAddRow($('#cfe-form', wref), item.type); return; }
        if (b.dataset.fAct === 'del-change') { b.closest('[data-fc], [data-al]').remove(); return; }
        if (b.dataset.fAct !== 'save') return;
        const name = $('#cfe-name', wref).value.trim().slice(0, 60), r = calcReadForm($('#cfe-form', wref), item.type, calcData().model);
        if (!name) { toast(t('calcNeedName')); return; }
        if (r.err) { toast(r.err); if (r.el) r.el.focus(); return; }
        const it = calcItem(item.id); if (!it) { close(); return; }
        Object.assign(it, { name, values: r.values }); const cs = $('#cfe-cur', wref); if (cs) calcSetCur(it, cs.value);
        close(); calcCommit(t(kind === 'preset' ? 'calcPresetSaved' : 'calcUpdated')); done && done();
      }
    });
  }

  /* ---------- Compartir: un PDF de verdad (js/pdf.js, sin servidores) con los widgets elegidos; se descarga o se envía a un chat ---------- */
  const CALC_PDF = [['savings', true], ['graph', true], ['details', false], ['funds', false], ['formulas', true]];
  const calcDataOf = items => { const model = CALC.fromItems(calcConv(items), todayKey()), res = CALC.compute(model); return { model, res, rows: CALC.daily(res) }; };
  function accentHex() {
    try {
      const c = document.createElement('canvas').getContext('2d'); c.fillStyle = '#586ff0';
      c.fillStyle = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#586ff0';
      return /^#[0-9a-f]{6}$/i.test(c.fillStyle) ? c.fillStyle : '#586ff0';
    } catch (e) { return '#586ff0'; }
  }
  // o: { title, u (preferencias del gráfico) }
  function calcPdfBytes(sel, data = calcData(), o = {}) {
    const P = window.KGPdf, { model, res, rows } = data, u = o.u || calcUi(), ACC = accentHex();
    const d = P.create(), M = d.margin, CW = d.W - M * 2, INK = '#1f2737', SUB = '#5b6577', LINE = '#d4d8df', POS = '#14865f', NEG = '#c13d4b';
    const fit = (str, size, maxW, bold) => { let z = size; while (z > 5 && P.width(str, z, bold) > maxW) z -= .25; return z; };
    d.addPage();
    const para = (str, size = 8.5, color = SUB, bold = false) => { for (const l of P.wrap(str, CW, size, bold)) { d.ensure(size + 4); d.y += size; d.text(M, d.y, l, { size, color, bold }); d.y += 3; } };
    const h2 = s => { d.ensure(70); d.y += 20; d.text(M, d.y, s, { size: 13, bold: true, color: INK }); d.y += 10; };
    const h3 = s => { d.ensure(50); d.y += 12; d.text(M, d.y, s, { size: 10.5, bold: true, color: INK }); d.y += 6; };
    const metrics = list => {
      const w = (CW - 12) / 3;
      for (let i = 0; i < list.length; i += 3) {
        d.ensure(42);
        list.slice(i, i + 3).forEach(([lab, val], c) => {
          const x = M + c * (w + 6);
          d.rect(x, d.y, w, 36, { stroke: LINE, r: 5, lw: .8 });
          d.text(x + 8, d.y + 13, lab, { size: fit(lab, 8, w - 16), color: SUB });
          d.text(x + 8, d.y + 28, val, { size: fit(val, 11.5, w - 16, true), bold: true, color: INK });
        });
        d.y += 42;
      }
    };
    const chart = series => {
      if (!series.length) return;
      const H = 200, pl = 58, pr = 8, pt = 8, pb = 22;
      d.ensure(H + 30);
      let lx = M; d.y += 2;
      for (const s of series) { const lw = P.width(s.label, 8) + 20; if (lx + lw > M + CW) { lx = M; d.y += 12; } d.circle(lx + 4, d.y + 4, 3.2, { fill: s.color }); d.text(lx + 11, d.y + 7, s.label, { size: 8, color: SUB }); lx += lw; }
      d.y += 14;
      const pts = CALC.sample(rows, 160), n = pts.length, top = d.y, iw = CW - pl - pr, ih = H - pt - pb;
      // v1.23: un valor null no se dibuja (p. ej. lo real después de hoy al comparar con una proyección); s.dash = línea discontinua sin relleno
    const all = pts.flatMap(p => series.map(s => calcVal(p, s))).filter(v => v != null && Number.isFinite(v));
      const lo = Math.min(0, ...all), hi = Math.max(1, ...all), span = hi - lo || 1;
      const x = i => M + pl + (n === 1 ? iw / 2 : i * iw / (n - 1)), y = v => top + pt + ih - (v - lo) / span * ih, base = y(Math.max(lo, 0));
      for (const k of [0, 1, 2, 3, 4]) { const v = lo + span * k / 4; d.line(M + pl, y(v), M + CW - pr, y(v), { color: LINE, lw: .6 }); d.text(M + pl - 6, y(v) + 3, privacyOn() ? '•••' : compactMoney(v), { size: 7, color: SUB, align: 'right' }); }
      const lines = series.map(s => pts.map((p, i) => [x(i), y(calcVal(p, s))]));
      series.forEach((s, i) => d.poly([[x(0), base], ...lines[i], [x(n - 1), base]], { fill: P.tint(s.color, .16), close: true }));
      series.forEach((s, i) => d.poly(lines[i], { stroke: s.color, lw: 1.6 }));
      const by = top + H - 6;
      d.text(M + pl, by, cdate(pts[0].date), { size: 7, color: SUB });
      d.text(x(Math.floor((n - 1) / 2)), by, cdate(pts[Math.floor((n - 1) / 2)].date), { size: 7, color: SUB, align: 'center' });
      d.text(M + CW - pr, by, cdate(pts[n - 1].date), { size: 7, color: SUB, align: 'right' });
      d.y = top + H + 4;
    };
    const table = td => {
      if (!td) { para(t('calcNoInv')); return; }
      const cols = td.head.length, size = cols > 7 ? 6.6 : 7.6, w0 = CW * (cols > 7 ? .1 : .13), wd = CW * (cols > 7 ? .12 : .14), rest = (CW - w0 - wd) / (cols - 2);
      const widths = [w0, wd, ...Array(cols - 2).fill(rest)], lh = size + 7;
      const row = (cells, head) => {
        let x = M;
        cells.forEach((c, i) => {
          const txt = head ? c : c.v, color = head ? SUB : c.tone == null ? INK : c.tone < 0 ? NEG : POS, bold = head || i === 0, z = fit(txt, size, widths[i] - 4, bold);
          d.text(i < 2 ? x + 2 : x + widths[i] - 2, d.y + size + 1, txt, { size: z, color, bold, align: i < 2 ? 'left' : 'right' });
          x += widths[i];
        });
        d.y += lh; d.line(M, d.y - 2, M + CW, d.y - 2, { color: LINE, lw: head ? .9 : .4 });
      };
      d.ensure(lh * 3); row(td.head, true);
      for (const r of td.rows) { if (d.y + lh > d.H - M) { d.addPage(); row(td.head, true); } row(r); }
    };
    const title = o.title || t('calcTitle');
    d.text(M, d.y + 20, title, { size: fit(title, 20, CW, true), bold: true, color: INK }); d.y += 34;
    para(t('calcPdfGenerated', { date: fmtDate(todayKey(), { day: 'numeric', month: 'long', year: 'numeric' }), n: `${cdate(res.startDate)} – ${cdate(res.endDate)} (${cmonths(res.months)})` }), 9, SUB);
    d.y += 4; d.line(M, d.y, M + CW, d.y, { color: ACC, lw: 2 }); d.y += 4;
    if (sel.has('savings')) {
      h2(t('calcSavings'));
      metrics([[t('calcIncomeT'), money(res.totalIncome)], [t('calcExpensesT'), money(res.totalExpenses)], [t('calcNetT'), money(res.net)]]);
      para(t('calcInPeriod', { n: cmonths(res.months) }));
    }
    if (sel.has('graph')) {
      const inv = u.mode === 'investments';
      h2(t('calcHeroEyebrow'));
      d.ensure(44); d.text(M, d.y + 22, money(res.final), { size: 24, bold: true, color: INK }); d.y += 30;
      d.text(M, d.y + 9, `${t('calcReturn', { v: csign(res.delta) })} · ${t('calcProfit', { v: cspct(res.pct) })}`, { size: 9.5, bold: true, color: res.delta < 0 ? NEG : POS }); d.y += 16;
      metrics(u.metrics.filter(k => calcMetricOn(res, k)).map(k => [t(k === 'cashback' ? 'calcCashbackLong' : CALC_METRICS.find(m => m[0] === k)[1]), calcMetricVal(res, k)]));
      h3(t(inv ? 'calcGraphInv' : 'calcGraphPat'));
      chart(calcSeries(model, u));
      para(t('calcHypothesis'));
    }
    if (sel.has('details')) {
      h2(t('calcMoreDetails'));
      h3(t('calcGraphPat')); table(calcTableData(res, 'patrimony', [], u.gran));
      if (model.investments.length) { h3(t('calcGraphInv')); table(calcTableData(res, 'investments', model.investments.map(i => i.id), u.gran)); }
    }
    if (sel.has('funds')) {
      h2(t('pw_funds'));
      if (!model.investments.length) para(t('calcPdfNoFunds'));
      model.investments.forEach((i, k) => { h3(`${i.name} · ${cpct(i.rate)}`); chart([{ fund: i.id, label: i.name, color: CALC_COLORS[k % CALC_COLORS.length] }]); });
    }
    if (sel.has('formulas')) {
      h2(t('pw_formulas'));
      if (!model.applied.length) para(t('calcNoApplied'));
      for (const a of model.applied) {
        const [eq, r] = calcFormulaText(a, model, res), inner = CW - 20;
        const eqL = P.wrap(eq, inner - 12, 8.5), rL = P.wrap(r, inner, 9.5, true), vL = P.wrap(calcVarsText(a.type, a.values, model), inner, 8);
        const h = 22 + eqL.length * 11.5 + 12 + rL.length * 12.5 + vL.length * 10.5 + 8;
        d.ensure(h + 8);
        const y0 = d.y; d.rect(M, y0, CW, h, { stroke: LINE, r: 6, lw: .8 });
        d.text(M + 10, y0 + 16, `${a.name} · ${t('m_' + a.type)}`, { size: fit(`${a.name} · ${t('m_' + a.type)}`, 10.5, inner, true), bold: true, color: INK });
        let yy = y0 + 24;
        d.rect(M + 10, yy, inner, eqL.length * 11.5 + 8, { fill: '#eef1f8', r: 4 });
        eqL.forEach(l => { yy += 11.5; d.text(M + 16, yy + 1, l, { size: 8.5, bold: true, color: ACC }); });
        yy += 14;
        rL.forEach(l => { yy += 12.5; d.text(M + 10, yy, l, { size: 9.5, bold: true, color: INK }); });
        vL.forEach(l => { yy += 10.5; d.text(M + 10, yy, l, { size: 8, color: SUB }); });
        d.y = y0 + h + 8;
      }
    }
    d.forEachPage((i, nP) => d.text(d.W - M, d.H - 20, `KeepGoing · ${i + 1}/${nP}`, { size: 7.5, color: SUB, align: 'right' }));
    return d.output({ title });
  }
  const pdfName = title => `KeepGoing-${String(title || 'calculadora').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'calculadora'}-${todayKey()}.pdf`;
  function bytesB64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
  const fmtKb = b => b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
  function downloadBlob(name, blob) {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  // Elegir un chat y enviarle el PDF (va sin cifrar: lo ve quien esté en ese chat)
  async function sendPdfToChat(bytes, name) {
    if (!auth) { toast(t('groupNeedLogin')); return; }
    const data = bytesB64(bytes);
    if (data.length > 3000000) { toast(t('calcPdfTooBig')); return; }
    await refreshMyGroups(true);
    const list = myGroups.list || [];
    openModal({
      title: `${ico('send')} ${esc(t('calcPdfToChat'))}`,
      body: `<p class="muted small" style="margin-top:0">${esc(t('calcPdfChatNote'))}</p>${list.length ? `<div class="stack" style="gap:8px">${list.map(g => `<button class="btn block" style="justify-content:flex-start" data-pdfg="${esc(g.id)}">${g.chat === 'dm' ? avatarHtml(g.peer || {}, 'sm') : esc(g.icon || '👥')} ${esc(chatName(g))}</button>`).join('')}</div>` : `<p class="muted">${esc(t('evNoChats'))}</p>`}`,
      onClick: async (e, close) => {
        const g = e.target.closest('[data-pdfg]'); if (!g) return;
        g.disabled = true;
        try { await rpc('kg_post_media', { p_group: g.dataset.pdfg, p_kind: 'file', p_mime: 'application/pdf', p_data: data, p_meta: { name } }); sfx('pop'); toast(t('calcPdfSent')); close(); }
        catch (err) { g.disabled = false; toast(chatErr(err)); }
      }
    });
  }
  // data/o: para compartir otra proyección (por defecto, la calculadora actual)
  function openCalcPdf(data, o = {}) {
    openModal({
      title: calcHead(t('calcPdfEyebrow'), t('calcPdfTitle')), cls: 'calc-sheet',
      body: `<div class="stack" style="gap:12px">${CALC_PDF.map(([k, on]) => `<label class="check tgl tgl-block"><input type="checkbox" data-pw="${k}" ${on ? 'checked' : ''}> <span>${esc(t('pw_' + k))}${k === 'funds' ? `<small class="muted" style="display:block;font-weight:var(--fw-secondary)">${esc(t('pw_fundsHint'))}</small>` : ''}</span></label>`).join('')}
        ${privacyOn() ? `<p class="banner clay" style="margin:0">${ico('eyeOff')}<span class="grow small">${esc(t('calcPdfPriv'))}</span></p>` : ''}<p class="calc-fine">${esc(t('calcPdfHint'))}</p></div>`,
      foot: `<button class="btn" data-pdf="dl">${ico('download')} ${esc(t('calcPdfDownload'))}</button><button class="btn calc-blue" data-pdf="chat">${ico('send')} ${esc(t('calcPdfToChat'))}</button>`,
      onClick: async (e, close, w) => {
        const b = e.target.closest('[data-pdf]'); if (!b) return;
        const sel = new Set($$('[data-pw]:checked', w).map(x => x.dataset.pw));
        if (!sel.size) { toast(t('calcPdfNone')); return; }
        let bytes;
        try { bytes = calcPdfBytes(sel, data || calcData(), o); } catch (err) { toast(t('calcPdfError')); return; }
        const name = pdfName(o.title);
        if (b.dataset.pdf === 'dl') { downloadBlob(name, new Blob([bytes], { type: 'application/pdf' })); sfx('pop'); toast(t('calcPdfSaved')); close(); return; }
        close(); await sendPdfToChat(bytes, name);
      }
    });
  }

  /* ---------- Proyecciones (v1.19): fotos con nombre de la calculadora, guardadas cifradas en la Libreta ----------
     { id, name, items: [piezas de LV.calc sin Mi Biblioteca], at }. «Aplicar» reemplaza la calculadora (Mi Biblioteca se queda).
     Compartir: solo con amigos y solo para verla. Va cifrada de extremo a extremo (ECDH) en kg_proj_shares; cuando guardas cambios
     en una proyección compartida, se vuelve a cifrar para cada amigo y ven siempre la última versión. */
  const PROJ = { list: null, busy: false };
  const projSnap = () => JSON.parse(JSON.stringify(LV.calc.filter(x => x.kind !== 'preset')));
  /* «Proyección según Ritmo Actual» (v1.23.3: asistente de 3 pasos). Se guarda como proyección nueva y la calculadora no cambia.
     1) Punto de partida real de hoy y ritmo de los últimos 3 meses (editable). 2) Cada inversión de la Libreta: a qué destino de la
     calculadora va, su valor de hoy, su rentabilidad estimada (o a mano) y su aportación mensual. 3) Nombre y guardar.
     Del resto de la calculadora se conservan el interés de la cuenta, el techo de liquidez y el horizonte. */
  function invPaceOf(cat) {
    const [y, m] = todayKey().split('-').map(Number), from = CALC.keyOf(new Date(y, m - 4, 1)), to = CALC.keyOf(new Date(y, m - 1, 0));
    return Math.round(LV.entries.filter(e => e.type === 'invest' && (e.categoryId || 'invest') === cat && e.date >= from && e.date <= to).reduce((a, e) => a + (e.amountCents || 0), 0) / 3);
  }
  function paceProjection() {
    if (!LV.entries.length && !worthBase()) { toast(t('paceNoData')); return; }
    const d0 = worthData(), items = projSnap(), start0 = items.find(x => x.kind === 'start') || calcData().model.start, dests = items.filter(x => x.kind === 'inv');
    const W = { step: 1, name: t('paceProjName', { d: fmtDate(todayKey(), { day: 'numeric', month: 'short', year: 'numeric' }) }).slice(0, 60),
      digital: d0.now.digital / 100, cash: d0.now.cash / 100, salary: d0.pace.income / 100, expenses: d0.pace.expenses / 100, rows: null };
    const mkRows = () => worthInvList().map(({ c, st, rate }) => {
      const old = (W.rows || []).find(r => r.cat === c.id), dest = dests.find(x => String(x.name).trim().toLowerCase() === catName(c).trim().toLowerCase());
      return old ? { ...old, dep: st.deposited / 100, value: st.value / 100, rate: old.rateTouched ? old.rate : rate != null ? rate : old.rate }
        : { cat: c.id, name: catName(c), dep: st.deposited / 100, value: st.value / 100, rate: rate != null ? rate : dest ? dest.rate : null, dest: dest ? dest.id : 'new', monthly: invPaceOf(c.id) / 100, rateTouched: false };
    });
    W.rows = mkRows();
    const totalDep = () => Math.round(worthData().now.invested) / 100;
    const num = v => { const x = CALC.parseNum(v); return Number.isFinite(x) ? x : null; };
    let wref;
    const inp = (attr, v, ph = '0,00') => `<input class="input" inputmode="decimal" autocomplete="off" ${attr} value="${v == null || v === '' ? '' : esc(fmtPctIn(v))}" placeholder="${esc(ph)}">`;
    const draw = () => {
      const steps = [1, 2, 3].map(n => `<span class="pace-step ${W.step === n ? 'on' : W.step > n ? 'done' : ''}">${n}. ${esc(t('paceStep' + n))}</span>`).join('');
      let body = '';
      if (W.step === 1) body = `<p class="muted small" style="margin:0">${esc(t('paceS1Hint'))}</p><div class="calc-grid">
          ${[['digital', 'cmDigital'], ['cash', 'cmCash'], ['salary', 'csSalary'], ['expenses', 'csExpenses']].map(([k, l]) => `<label class="field"><span>${esc(t(l, { $cur: ledgerMain() }))}</span>${inp(`data-pw="${k}"`, W[k])}</label>`).join('')}</div>
          <p class="calc-fine">${esc(t('paceS1Fine', { h: cmonths(CALC.horizonMonths(start0)) }))}</p>`;
      else if (W.step === 2) {
        const sum = W.rows.reduce((a, r) => a + (+r.dep || 0), 0), tot = totalDep(), diff = Math.round((tot - sum) * 100) / 100;
        body = `<p class="muted small" style="margin:0">${esc(t('paceS2Hint'))}</p>
          ${W.rows.length ? W.rows.map((r, i) => `<div class="pace-inv clay" data-pi="${i}"><div class="row" style="justify-content:space-between;gap:8px"><b>${esc(r.name)}</b><button type="button" class="chip sm calc-blue" data-pw-val="${esc(r.cat)}">${ico('edit')} ${esc(t('woNewVal'))}</button></div>
            <div class="calc-grid">
              <label class="field"><span>${esc(t('paceDest'))}</span><select class="input" data-pr="dest"><option value="new" ${r.dest === 'new' ? 'selected' : ''}>${esc(t('paceDestNew', { name: r.name }))}</option>${dests.map(x => `<option value="${esc(x.id)}" ${r.dest === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
              <label class="field"><span>${esc(t('paceDep'))}</span>${inp('data-pr="dep"', r.dep)}</label>
              <label class="field"><span>${esc(t('paceValue'))}</span>${inp('data-pr="value"', r.value)}</label>
              <label class="field"><span>${esc(t('paceRate'))}</span>${inp('data-pr="rate"', r.rate, t('paceRatePh'))}</label>
              <label class="field"><span>${esc(t('paceMonthly'))}</span>${inp('data-pr="monthly"', r.monthly)}</label></div>
            <p class="calc-fine" style="margin:0">${esc(r.rate == null ? t('paceRateNone') : r.rateTouched ? t('paceRateManual') : t('paceRateAuto', { r: cpct(r.rate) }))}</p></div>`).join('') : `<p class="muted small">${esc(t('woInvNone'))}</p>`}
          <div class="pace-sum ${diff ? 'amt-out' : 'amt-in'}">${esc(diff ? t('paceDiff', { t: money(tot), s: money(sum), d: money(Math.abs(diff)) }) : t('paceOk', { t: money(tot) }))}</div>`;
      } else {
        const R = W.rows, inv = R.reduce((a, r) => a + (+r.value || 0), 0), mon = R.reduce((a, r) => a + (+r.monthly || 0), 0);
        body = `<label class="field"><span>${esc(t('calcName'))}</span><input class="input" maxlength="60" data-pw="name" value="${esc(W.name)}"></label>
          <div class="calc-metrics"><div class="calc-metric"><span>${esc(t('cmDigital'))}</span><strong>${money(W.digital)}</strong></div><div class="calc-metric"><span>${esc(t('cmCash'))}</span><strong>${money(W.cash)}</strong></div>
            <div class="calc-metric"><span>${esc(t('cmInvestments'))}</span><strong>${money(inv)}</strong></div><div class="calc-metric"><span>${esc(t('paceNetMonth'))}</span><strong>${esc(csign(W.salary - W.expenses))}</strong></div>
            <div class="calc-metric"><span>${esc(t('paceMonthly'))}</span><strong>${money(mon)}</strong></div></div>
          <p class="calc-fine">${esc(t('paceS3Hint'))}</p>`;
      }
      $('#pw', wref).innerHTML = `<div class="pace-steps">${steps}</div><div class="stack" style="gap:12px;margin-top:12px">${body}</div>`;
      $('[data-pw-go="back"]', wref).style.visibility = W.step > 1 ? 'visible' : 'hidden';
      $('[data-pw-go="next"]', wref).textContent = t(W.step === 3 ? 'paceSave' : 'paceNext');
    };
    const read = () => {
      $$('[data-pw]', wref).forEach(el => { const k = el.dataset.pw; if (k === 'name') W.name = el.value.trim().slice(0, 60); else { const v = num(el.value); W[k] = v == null ? 0 : v; } });
      $$('[data-pi]', wref).forEach(box => { const r = W.rows[+box.dataset.pi]; $$('[data-pr]', box).forEach(el => { const k = el.dataset.pr; if (k === 'dest') r.dest = el.value; else { const v = el.value.trim() === '' ? null : num(el.value); if (k === 'rate') { if (v !== r.rate) r.rateTouched = true; r.rate = v; } else r[k] = v == null ? 0 : v; } }); });
    };
    const finish = close => {
      const KEEP = ['savings', 'liquidityCap'], out = items.filter(x => x.kind === 'applied' && KEEP.includes(x.type));
      const st = { ...start0, id: CALC.START_ID, kind: 'start', digital: Math.max(0, W.digital), cash: Math.max(0, W.cash), salary: Math.max(0, W.salary), expenses: Math.max(0, W.expenses), date: todayKey() }; delete st.cur;
      out.push(st);
      let ord = 1;
      const used = new Map();
      for (const r of W.rows) {
        let dest;
        if (r.dest !== 'new' && dests.some(x => x.id === r.dest)) { dest = used.get(r.dest) || { ...dests.find(x => x.id === r.dest), ord: ord++ }; if (!used.has(r.dest)) { used.set(r.dest, dest); out.push(dest); } }
        else { dest = { id: uid(), kind: 'inv', name: r.name.slice(0, 60), rate: 0, accumulative: true, ord: ord++ }; out.push(dest); }
        if (r.rate != null) dest.rate = r.rate;
        if (r.value > 0) out.push({ id: uid(), kind: 'fund', name: r.name.slice(0, 60), amount: r.value, target: dest.id, ord: ord++ });
        if (r.monthly > 0) out.push({ id: uid(), kind: 'applied', type: 'periodic', name: t('paceInvestOf', { name: r.name }).slice(0, 60), values: { target: dest.id, amount: r.monthly, frequency: 'monthly', timing: 'end' }, ord: ord++ });
      }
      for (const x of dests) if (!used.has(x.id) && !out.includes(x)) out.push({ ...x, ord: ord++ });
      const name = W.name || t('paceProjName', { d: todayKey() });
      if (!gateAdd('projSaved', LV.projs.length)) return;
      LV.projs.push({ id: uid(), name, items: out, at: Date.now() }); save(); ledgerSave(); sfx('pop');
      close(); toast(t('paceSaved', { name })); openProjections();
    };
    openModal({
      title: calcHead(t('paceEyebrow'), t('paceBtn')), cls: 'wide calc-sheet', body: '<div id="pw"></div>',
      foot: `<button class="btn" data-pw-go="back">${esc(t('paceBack'))}</button><button class="btn primary" data-pw-go="next"></button>`,
      onMount: w => { wref = w; draw(); },
      onClick: (e, close) => {
        const v = e.target.closest('[data-pw-val]');
        if (v) { read(); openWorthValue(v.dataset.pwVal, () => { W.rows = mkRows(); if (wref.isConnected) draw(); }); return; }
        const g = e.target.closest('[data-pw-go]'); if (!g) return;
        read();
        if (g.dataset.pwGo === 'back') { W.step = Math.max(1, W.step - 1); draw(); return; }
        if (W.step === 2) {
          const sum = W.rows.reduce((a, r) => a + (+r.dep || 0), 0);
          if (Math.abs(sum - totalDep()) > 0.009) { toast(t('paceNeedSum')); return; }
          if (W.rows.some(r => r.value > 0 && r.rate == null)) { toast(t('paceNeedRate')); return; }
        }
        if (W.step < 3) { W.step++; draw(); return; }
        finish(close);
      }
    });
  }
  const projKey = items => JSON.stringify([...items].sort((a, b) => String(a.id).localeCompare(String(b.id))));
  const projDirty = p => projKey(p.items || []) !== projKey(projSnap());
  async function projRefresh() {
    if (!auth || PROJ.busy) return;
    PROJ.busy = true;
    try { PROJ.list = await rpc('kg_proj_list'); } catch (e) { PROJ.list = PROJ.list || []; }
    PROJ.busy = false;
  }
  const projSharesOf = id => (PROJ.list || []).filter(x => x.mine && x.local_id === id);
  // Cifra la proyección para un amigo (y para ti, así puedes comprobar lo que ve) y la sube
  async function projSendTo(p, f) {
    if (!f || !VAULT.isPub(f.pubkey)) throw new Error('nokey');
    const me = await ensureKx();
    const box = await VAULT.sealFor({ v: 1, name: p.name, items: p.items, at: p.at, by: profileName() }, [{ id: f.user_id, pub: f.pubkey }, { id: auth.uid, pub: me.pub }]);
    await rpc('kg_proj_share', { p_to: f.user_id, p_local_id: p.id, p_title: p.name.slice(0, 80), p_box: box });
  }
  // Tras cambiar una proyección: los amigos con los que está compartida reciben la versión nueva
  async function projPush(p) {
    const shares = projSharesOf(p.id); if (!shares.length) return;
    await refreshChat(true);
    let fails = 0;
    for (const sh of shares) { try { await projSendTo(p, (chatData.friends || []).find(f => f.user_id === sh.to_user && f.status === 'accepted')); } catch (e) { fails++; } }
    if (fails) toast(t('projPushFail', { n: fails }));
  }
  function projNameDialog(title, value, done) {
    openModal({
      title: calcHead(t('calcProjections'), title),
      body: `<form id="pj-f" class="stack" autocomplete="off"><label class="field"><span>${esc(t('calcName'))}</span><input class="input" id="pj-name" maxlength="60" value="${esc(value)}" placeholder="${esc(t('projNamePh'))}"></label></form>`,
      foot: `<button class="btn calc-blue" data-pj-ok>${ico('check')} ${esc(t('calcSave'))}</button>`,
      onMount: w => { setTimeout(() => $('#pj-name', w)?.focus(), 200); w.addEventListener('submit', e => { e.preventDefault(); $('[data-pj-ok]', w).click(); }); },
      onClick: (e, close, w) => {
        if (!e.target.closest('[data-pj-ok]')) return;
        const name = $('#pj-name', w).value.trim().slice(0, 60);
        if (!name) { toast(t('calcNeedName')); return; }
        close(); done(name);
      }
    });
  }
  function openProjections() {
    let wref;
    const u = calcUi();
    const draw = () => {
      if (!wref || !wref.isConnected) return;
      const mine = [...LV.projs].sort((a, b) => (b.at || 0) - (a.at || 0)), got = (PROJ.list || []).filter(x => !x.mine);
      const row = p => {
        const sh = projSharesOf(p.id), on = u.proj === p.id, dirty = on && projDirty(p);
        return `<div class="proj-row clay ${on ? 'on' : ''}" data-pj="${esc(p.id)}"><div class="grow proj-info"><b>${esc(p.name)}</b><span class="muted small">${esc(fmtDate(new Date(p.at || Date.now()).toISOString().slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' }))}${on ? ` · ${esc(t('projInUse'))}` : ''}${sh.length ? ` · ${esc(t('projSharedN', { n: sh.length }))}` : ''}</span>
            ${dirty ? `<button class="chip sm proj-update" data-pa="update">${ico('refresh')} ${esc(t('projSaveChanges'))}</button>` : ''}</div>
          <div class="proj-acts"><button class="icon-btn sm proj-del" data-pa="del" aria-label="${esc(t('projDelete'))}" title="${esc(t('projDelete'))}">${ico('trash')}</button><button class="icon-btn sm proj-apply" data-pa="apply" aria-label="${esc(t('projApply'))}" title="${esc(t('projApply'))}">${ico('check')}</button><button class="icon-btn sm" data-pa="share" aria-label="${esc(t('projShare'))}" title="${esc(t('projShare'))}">${ico('share')}</button></div></div>`;
      };
      $('#pj-body', wref).innerHTML = `<div class="stack" style="gap:12px">
        <button class="btn calc-blue block" data-pa="new">${ico('plus')} ${esc(t('projSaveCurrent'))}</button>
        ${mine.length ? `<div class="stack" style="gap:8px">${mine.map(row).join('')}</div>` : `<p class="muted small center" style="margin:4px 0">${esc(t('projEmpty'))}</p>`}
        <details class="calc-group proj-got" data-cd="pj-got" ${calcIsOpen('pj-got') ? 'open' : ''}><summary><span class="calc-f-ico" aria-hidden="true">${ico('users')}</span><span class="calc-sum-t"><strong>${esc(t('projReceived'))}</strong></span>${got.length ? `<span class="calc-pill">${got.length}</span>` : ''}<span class="calc-arrow" aria-hidden="true">›</span></summary>
          <div class="stack" style="gap:8px;margin-top:8px">${!auth ? `<p class="muted small" style="margin:0">${esc(t('groupNeedLogin'))}</p>` : PROJ.list == null ? `<p class="muted small" style="margin:0">${esc(t('groupsLoading'))}</p>` : got.length ? got.map(x => `<button class="proj-row clay proj-got-row" data-pv="${esc(x.id)}"><span class="grow proj-info"><b>${esc(x.title || t('calcProjections'))}</b><span class="muted small">${esc(t('projFrom', { who: personName(x.peer) }))} · ${esc(fmtDate(String(x.updated_at).slice(0, 10), { day: 'numeric', month: 'short' }))}</span></span>${ico('eye')}</button>`).join('') : `<p class="muted small" style="margin:0">${esc(t('projNoneReceived'))}</p>`}</div></details>
        <p class="calc-fine" style="margin:0">${esc(t('projHint'))}</p></div>`;
    };
    openModal({
      title: calcHead(t('projEyebrow'), t('calcProjections')), cls: 'calc-sheet', body: '<div id="pj-body"></div>',
      onMount: w => {
        wref = w; draw();
        if (auth) { ensureKx().catch(() => {}); projRefresh().then(draw); }
      },
      onClick: async (e, close) => {
        const pv = e.target.closest('[data-pv]');
        if (pv) { const x = (PROJ.list || []).find(r => r.id === pv.dataset.pv); if (x) openProjView(x); return; }
        const b = e.target.closest('[data-pa]'); if (!b) return;
        const a = b.dataset.pa, p = LV.projs.find(x => x.id === (b.closest('[data-pj]') || {}).dataset?.pj);
        if (a === 'new') {
          if (!gateAdd('projSaved', LV.projs.length)) return;
          projNameDialog(t('projSaveCurrent'), '', name => {
            const np = { id: uid(), name, items: projSnap(), at: Date.now() };
            LV.projs.push(np); u.proj = np.id; save(); ledgerSave(); sfx('pop'); toast(t('projSaved', { name })); draw();
          });
          return;
        }
        if (!p) return;
        if (a === 'apply') {
          if (!(await confirmDialog(t('projApplyQ', { name: p.name })))) return;
          LV.calc = [...LV.calc.filter(x => x.kind === 'preset'), ...JSON.parse(JSON.stringify(p.items || []))];
          u.off = []; u.proj = p.id; close(); calcCommit(t('projApplied', { name: p.name })); sfx('pop');
        } else if (a === 'update') {
          p.items = projSnap(); p.at = Date.now(); ledgerSave(); toast(t('projUpdated', { name: p.name })); draw();
          projPush(p).catch(() => {});
        } else if (a === 'del') {
          if (!(await confirmDialog(t('projDelQ', { name: p.name })))) return;
          for (const sh of projSharesOf(p.id)) { try { await rpc('kg_proj_unshare', { p_id: sh.id }); } catch (err) { /* sigue */ } }
          LV.projs = LV.projs.filter(x => x.id !== p.id); if (u.proj === p.id) u.proj = null;
          save(); ledgerSave(); if (PROJ.list) PROJ.list = PROJ.list.filter(x => !(x.mine && x.local_id === p.id)); toast(t('deleted')); draw();
        } else if (a === 'share') openProjShare(p, draw);
      }
    });
  }
  // Compartir una proyección: con quién está compartida («Dejar de compartir») y a qué amigos se puede enviar
  function openProjShare(p, after) {
    let wref;
    const draw = () => {
      if (!wref || !wref.isConnected) return;
      const sh = projSharesOf(p.id), shared = new Set(sh.map(x => x.to_user));
      const friends = (chatData.friends || []).filter(f => f.status === 'accepted' && !shared.has(f.user_id));
      $('#pjs-body', wref).innerHTML = `<div class="stack" style="gap:14px">
        <p class="muted small" style="margin:0">${esc(t('projShareHint'))}</p>
        <section><h3 class="section-title" style="margin-top:0">${esc(t('projSharedWith'))}</h3>${sh.length ? `<div class="stack" style="gap:8px">${sh.map(x => `<div class="row proj-peer">${avatarHtml(x.peer || {}, 'sm')}<span class="grow">${esc(personName(x.peer))}</span><button class="chip sm danger-text" data-pjs-stop="${esc(x.id)}">${esc(t('projStop'))}</button></div>`).join('')}</div>` : `<p class="muted small" style="margin:0">${esc(t('projNotShared'))}</p>`}</section>
        <section><h3 class="section-title" style="margin-top:0">${esc(t('projShareWith'))}</h3>${!auth ? `<p class="muted small" style="margin:0">${esc(t('groupNeedLogin'))}</p>` : !chatData.friends ? `<p class="muted small" style="margin:0">${esc(t('groupsLoading'))}</p>` : friends.length ? `<div class="stack" style="gap:8px">${friends.map(f => `<button class="btn block" style="justify-content:flex-start" data-pjs-to="${esc(f.user_id)}">${avatarHtml(f, 'sm')} <span class="grow" style="text-align:left">${esc(personName(f))} <span class="muted small">@${esc(f.nametag || '')}</span></span>${ico('send')}</button>`).join('')}</div>` : `<p class="muted small" style="margin:0">${esc(t('projNoFriends'))}</p>`}</section>
        <button class="btn block" data-pjs-pdf>${ico('doc')} ${esc(t('projSharePdf'))}</button></div>`;
    };
    openModal({
      title: calcHead(t('projShare'), p.name), cls: 'calc-sheet', body: '<div id="pjs-body"></div>',
      onMount: w => { wref = w; draw(); if (auth) Promise.all([refreshChat(true), projRefresh()]).then(draw); },
      onClose: () => after && after(),
      onClick: async (e, close) => {
        let el;
        if (e.target.closest('[data-pjs-pdf]')) { close(); openCalcPdf(calcDataOf(p.items || []), { title: p.name }); return; }
        if ((el = e.target.closest('[data-pjs-stop]'))) {
          el.disabled = true;
          try { await rpc('kg_proj_unshare', { p_id: el.dataset.pjsStop }); PROJ.list = (PROJ.list || []).filter(x => x.id !== el.dataset.pjsStop); toast(t('projStopped')); draw(); }
          catch (err) { el.disabled = false; toast(chatErr(err)); }
          return;
        }
        if ((el = e.target.closest('[data-pjs-to]'))) {
          const f = (chatData.friends || []).find(x => x.user_id === el.dataset.pjsTo); if (!f) return;
          el.disabled = true;
          try { await projSendTo(p, f); await projRefresh(); sfx('pop'); toast(t('projSent', { who: personName(f) })); draw(); }
          catch (err) { el.disabled = false; toast(err.message === 'nokey' ? t('projNoKey', { who: personName(f) }) : chatErr(err)); }
        }
      }
    });
  }
  // Ver una proyección que te han compartido (solo lectura): se descifra con tu clave y se calcula aquí mismo
  async function openProjView(x) {
    let d = null, err = '';
    try {
      const me = await ensureKx();
      const rows = await sbFetch(`/rest/v1/kg_proj_shares?id=eq.${encodeURIComponent(x.id)}&select=box,active`);
      if (!rows[0] || !rows[0].active) throw new Error('gone');
      d = await VAULT.openSealed(rows[0].box, auth.uid, me.priv);
    } catch (e) { err = /gone/.test(e.message) ? t('projGone') : /not for me|OperationError/.test(String(e && (e.message || e.name))) ? t('projCantOpen') : t('groupError', { e: e.message }); }
    let body = `<p class="muted center">${esc(err)}</p>`;
    if (d) {
      const items = Array.isArray(d.items) ? d.items.filter(i => i && typeof i === 'object' && i.kind !== 'preset') : [];
      const { model, res, rows } = calcDataOf(items);
      const series = calcSeries(model, { mode: 'patrimony', ser: { income: true, expenses: true, investments: true }, off: [] });
      body = `<div class="stack proj-view" style="gap:14px">
        <p class="muted small" style="margin:0">${esc(t('projFrom', { who: personName(x.peer) }))} · ${esc(t('projReadOnly'))}</p>
        <div class="calc-hero" style="padding:0"><div class="calc-eyebrow">${esc(t('calcHeroEyebrow'))}</div><strong class="calc-total">${money(res.final)}</strong><p class="small ${res.delta < 0 ? 'amt-out' : 'amt-in'}" style="font-weight:var(--fw-ui)">${esc(t('calcReturn', { v: csign(res.delta) }))} · ${esc(t('calcProfit', { v: cspct(res.pct) }))}</p>
          <p class="calc-fine" style="margin:4px 0 0">${esc(`${cdate(res.startDate)} – ${cdate(res.endDate)} (${cmonths(res.months)})`)}</p></div>
        <div class="kpis" style="margin:0"><div class="kpi clay"><b>${money(res.totalIncome)}</b><span>${esc(t('calcIncomeT'))}</span></div><div class="kpi clay"><b>${money(res.totalExpenses)}</b><span>${esc(t('calcExpensesT'))}</span></div><div class="kpi clay"><b>${money(res.net)}</b><span>${esc(t('calcNetT'))}</span></div></div>
        ${calcChart('proj-view', rows, series, { aria: t('calcGraphPat') })}
        <details class="calc-group"><summary><span class="calc-f-ico" aria-hidden="true">${ico('table')}</span><span class="calc-sum-t"><strong>${esc(t('calcMoreDetails'))}</strong></span><span class="calc-arrow" aria-hidden="true">›</span></summary>${calcTable(res, 'patrimony', [])}</details>
        <section><h3 class="section-title" style="margin-top:0">${esc(t('pw_formulas'))}</h3>${model.applied.length ? `<div class="stack" style="gap:8px">${model.applied.map(a => { const [eq, r] = calcFormulaText(a, model, res); return `<div class="clay card proj-f"><b>${ico(CALC.moduleOf(a.type).icon)} ${esc(a.name)}</b><div class="calc-eq">${esc(eq)}</div><p class="small" style="margin:6px 0 0"><b>${esc(r)}</b></p></div>`; }).join('')}</div>` : `<p class="muted small" style="margin:0">${esc(t('calcNoApplied'))}</p>`}</section></div>`;
    }
    openModal({ title: calcHead(t('projReceivedOne'), (d && d.name) || x.title || t('calcProjections')), cls: 'wide calc-sheet', body });
  }

  /* ---------- Libreta: gráficas (tarta por categorías y evolución de ingresos y gastos) ---------- */
  const PIE_COLORS = ['#ff6b6b', '#4cc9f0', '#f7c948', '#c77dff', '#3ddc97', '#ff8a5b', '#5b8cff', '#ff5d8f', '#a3e635', '#2ec4b6', '#b8b8c8'];
  const IN_C = '#2fbf71', OUT_C = '#e5484d', INV_C = '#d8d8de';
  const capHidden = () => !!(state.ledgerPrefs && state.ledgerPrefs.capHidden);
  // Tarta (anillo) con leyenda; en modo privacidad se ocultan los importes
  // «Mostrar porcentajes» (casilla bajo cada tarta): etiquetas sobre el anillo y en la leyenda
  const showPct = () => !(state.ledgerPrefs && state.ledgerPrefs.showPct === false);
  function donutChart(segs, centerLabel, centerValue = null, extra = '') {
    const total = segs.reduce((a, s) => a + s.value, 0);
    if (!total) return `<p class="muted small" style="margin:8px 0 0">${esc(t('ledChartEmpty'))}</p>`;
    const R = 42, C = 2 * Math.PI * R, pct = showPct(); let acc = 0; const labels = [];
    const arcs = segs.map(s => {
      const f = s.value / total, len = Math.max(0, f * C - (segs.length > 1 ? 1.2 : 0));
      const a = `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${s.color}" stroke-width="16" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-acc * C).toFixed(2)}"><title>${esc(s.label)} · ${Math.round(f * 100)}%</title></circle>`;
      if (pct && f >= .06) { const ang = (acc + f / 2) * 2 * Math.PI - Math.PI / 2; labels.push(`<text x="${(60 + R * Math.cos(ang)).toFixed(1)}" y="${(60 + R * Math.sin(ang) + 2.6).toFixed(1)}" text-anchor="middle" class="pie-pct">${Math.round(f * 100)}%</text>`); }
      acc += f; return a;
    }).join('');
    return `<div class="pie-wrap"><svg class="pie" viewBox="0 0 120 120" role="img" aria-label="${esc(centerLabel)}"><g transform="rotate(-90 60 60)"><circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="16"/>${arcs}</g>${labels.join('')}
      <text x="60" y="57" text-anchor="middle" class="pie-c1">${esc(centerValue == null ? cents(total) : centerValue)}</text><text x="60" y="72" text-anchor="middle" class="pie-c2">${esc(centerLabel)}</text></svg>
      <ul class="pie-legend">${segs.map(s => `<li><i style="background:${s.color}"></i><span class="grow">${esc(s.label)}</span>${pct ? `<b>${Math.round(s.value / total * 100)}%</b>` : ''}<span class="pie-amt ${pct ? 'muted small' : ''}">${esc(cents(s.value))}</span></li>`).join('')}</ul>
      <div class="row wrap pie-tools"><label class="check tgl pct-toggle"><input type="checkbox" data-pct-toggle ${pct ? 'checked' : ''}><span>${esc(t('showPct'))}</span></label>${extra}</div></div>`;
  }
  // «Modo Gráfica» ↔ «Modo Torta»: el botón dice a qué modo pasas al tocarlo
  const pieLine = () => !!(state.ledgerPrefs && state.ledgerPrefs.pieView === 'line');
  const pieModeBtn = () => `<button type="button" class="chip tgl-btn" data-act="led-pie-view" aria-label="${esc(t(pieLine() ? 'ledPieModeAria' : 'ledLineModeAria'))}">${ico(pieLine() ? 'pie' : 'line')} ${esc(t(pieLine() ? 'ledPieMode' : 'ledLineMode'))}</button>`;
  // Gráfica de la tarta en el tiempo: una línea por categoría (o ingresos y gastos), con el mismo gráfico que la calculadora
  function pieLineChart(list, pm, pp, ym, segs) {
    const today = todayKey(), span = LED.span(list);
    const from = pp === 'month' ? ym + '-01' : pp === 'year' ? ym.slice(0, 4) + '-01-01' : span ? span.from : today;
    const endM = pp === 'month' ? `${ym}-${String(LED.daysIn(+ym.slice(0, 4), +ym.slice(5, 7))).padStart(2, '0')}` : pp === 'year' ? ym.slice(0, 4) + '-12-31' : today;
    const to = endM < today || pp !== 'all' ? endM : today, unit = pp === 'month' ? 'day' : 'month';
    if (!list.length || !segs.length) return `<p class="muted small" style="margin:8px 0 0">${esc(t('ledChartEmpty'))}</p><div class="row wrap pie-tools">${pieModeBtn()}</div>`;
    const base = LED.series([], from, to, unit), idx = new Map(base.map((b, i) => [b.key, i]));
    const keyFor = d => unit === 'month' ? d.slice(0, 7) : d;
    const ids = pm === 'io' ? ['income', 'expense', 'invest'] : LED.byCategory(list, pm).map(c => c.id);
    const rows = base.map(b => ({ date: CALC.parseDate(unit === 'month' ? b.key + '-01' : b.key), ...Object.fromEntries(ids.map(id => ['c:' + id, 0])) }));
    for (const e of list) {
      const i = idx.get(keyFor(e.date)); if (i == null) continue;
      const k = pm === 'io' ? 'c:' + LED.kindKey(e) : e.type === pm ? 'c:' + (e.categoryId || 'other') : null;
      if (k && k in rows[i]) rows[i][k] += (e.amountCents || 0) / 100;
    }
    const series = pm === 'io' ? [{ key: 'c:income', label: t('ledgerIncome'), color: IN_C }, { key: 'c:expense', label: t('ledgerExpense'), color: OUT_C }, ...(list.some(e => e.type === 'invest') ? [{ key: 'c:invest', label: t('ledgerInvest'), color: INV_C }] : [])]
      : ids.map((id, i) => ({ key: 'c:' + id, label: segs[i] ? segs[i].label : id, color: segs[i] ? segs[i].color : PIE_COLORS[i % PIE_COLORS.length] }));
    return `${calcChart('led-pie', rows, series, { aria: t('ledPieTitle'), noPat: true })}<div class="row wrap pie-tools">${pieModeBtn()}</div>`;
  }
  // Dos series de puntos: verde = ingresos, rojo = gastos
  function twoDotChart(rows, o = {}) {
    if (!rows.length) return `<p class="muted small" style="margin:8px 0 0">${esc(t('ledChartEmpty'))}</p>`;
    const W = chartW(), H = o.h || (W < 500 ? 210 : 230), pl = 50, pr = 14, pt = 14, pb = 28, iw = W - pl - pr, ih = H - pt - pb, n = rows.length;
    const hi = Math.max(1, ...rows.map(r => Math.max(r.income, r.expense)));
    const x = i => pl + (n === 1 ? iw / 2 : i * iw / (n - 1)), y = v => pt + ih - v / hi * ih;
    const fmt = v => privacyOn() ? '•••' : compactMoney(v / 100);
    const line = (k, c) => `<path d="${rows.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(r[k]).toFixed(1)}`).join('')}" fill="none" stroke="${c}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" opacity=".85"/>${rows.map((r, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(r[k]).toFixed(1)}" r="${n > 40 ? 2.5 : 4.5}" fill="${c}" stroke="var(--surface)" stroke-width="1.5"/>`).join('')}`;
    const nl = Math.min(n, W < 500 ? 4 : 6), labelIdx = [...new Set(Array.from({ length: nl }, (_, i) => Math.round(i * (n - 1) / Math.max(1, nl - 1))))];
    const colW = iw / Math.max(1, n - (n > 1 ? 1 : 0));
    return `<div class="chart ${privacyOn() ? 'priv' : ''}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || '')}">
      ${[0, hi / 2, hi].map(v => `<line class="grid-line" x1="${pl}" x2="${W - pr}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="axis-label" x="${pl - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${esc(fmt(v))}</text>`).join('')}
      ${line('expense', OUT_C)}${line('income', IN_C)}
      ${labelIdx.map(i => `<text class="axis-label" x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="${i === 0 && n > 1 ? 'start' : i === n - 1 && n > 1 ? 'end' : 'middle'}">${esc(rows[i].label)}</text>`).join('')}
      <line class="xhair" x1="0" x2="0" y1="${pt}" y2="${pt + ih}" stroke="var(--fg)" stroke-opacity=".35" stroke-width="1" style="display:none"/>
      ${rows.map((r, i) => `<rect class="hit" x="${(x(i) - colW / 2).toFixed(1)}" y="${pt}" width="${colW.toFixed(1)}" height="${ih}" data-tip="${esc(`▲ ${privacyOn() ? '•••' : fmtMoney(r.income / 100)} · ▼ ${privacyOn() ? '•••' : fmtMoney(r.expense / 100)}`)}" data-sub="${esc(r.sub || r.label)}" data-cx="${x(i).toFixed(1)}" data-cy="${y(Math.max(r.income, r.expense)).toFixed(1)}"/>`).join('')}
    </svg><div class="dot-legend"><span><i style="background:${IN_C}"></i>${esc(t('ledgerIncome'))}</span><span><i style="background:${OUT_C}"></i>${esc(t('ledgerExpense'))}</span></div></div>`;
  }
  const bucketLabel = (k, unit) => unit === 'year' ? k : unit === 'month' ? fmtDate(k + '-01', { month: 'short', year: '2-digit' }) : fmtDate(k, { day: 'numeric', month: 'short' });
  const bucketSub = (k, unit) => unit === 'year' ? k : unit === 'month' ? fmtDate(k + '-01', { month: 'long', year: 'numeric' }) : fmtDate(k);
  function ledgerChartsHtml() {
    const ui = state.ui, ym = ledgerMonth(), today = todayKey();
    const span = LED.span(LV.entries);
    // 1) Tarta: periodo y desglose
    const pp = ['month', 'year', 'all'].includes(ui.ledPie) ? ui.ledPie : 'month', pm = ['io', 'expense', 'income'].includes(ui.ledPieMode) ? ui.ledPieMode : 'io';
    const pList = NET(pp === 'month' ? LED.inMonth(LV.entries, +ym.slice(0, 4), +ym.slice(5, 7)) : pp === 'year' ? LED.inRange(LV.entries, ym.slice(0, 4) + '-01-01', ym.slice(0, 4) + '-12-31') : LV.entries);
    const tot = LED.totals(pList);
    const segs = pm === 'io' ? [{ label: t('ledgerIncome'), value: tot.income, color: IN_C }, { label: t('ledgerExpense'), value: tot.expense, color: OUT_C }, { label: t('ledgerInvest'), value: tot.invest, color: INV_C }].filter(s => s.value)
      : LED.byCategory(pList, pm).map((c, i) => { const cat = catOf(c.id); return { label: `${cat.icon} ${catName(cat)}`, value: c.cents, color: PIE_COLORS[i % PIE_COLORS.length] }; });
    const pName = pp === 'month' ? fmtDate(ym + '-01', { month: 'long', year: 'numeric' }) : pp === 'year' ? ym.slice(0, 4) : t('ledAll');
    // v1.23: «Gráficos» se pliega y despliega (se recuerda)
    let html = `<details class="led-charts" data-led-charts ${state.ui.ledChartsShut ? '' : 'open'}><summary class="section-title led-h">${ico('chart')} <span class="grow">${esc(t('ledCharts'))}</span><span class="calc-arrow" aria-hidden="true">›</span></summary><div class="chart-grid">`;
    if (!hidW('ledPie')) html += `<section class="chart-card clay" data-w="ledPie"><h3>${ico('pie')}<span class="grow">${esc(t('ledPieTitle'))}</span><span class="muted small">${esc(pName)}</span></h3>
      <div class="seg seg-sm" role="group">${[['month', 'ledThisMonth'], ['year', 'ledThisYear'], ['all', 'ledAll']].map(([v, k]) => `<button data-act="led-pie" data-v="${v}" class="${pp === v ? 'on' : ''}">${esc(t(k))}</button>`).join('')}</div>
      <div class="seg seg-sm" role="group" style="margin-top:8px">${[['io', 'ledIo'], ['expense', 'ledByCatOut'], ['income', 'ledByCatIn']].map(([v, k]) => `<button data-act="led-pie-mode" data-v="${v}" class="${pm === v ? 'on' : ''}">${esc(t(k))}</button>`).join('')}</div>
      <div class="${privacyOn() ? 'priv' : ''}">${pieLine() ? pieLineChart(pList, pm, pp, ym, segs) : pm === 'io' ? donutChart(segs, t('ledBalance'), cents(tot.net), pieModeBtn()) : donutChart(segs, t(pm === 'expense' ? 'ledgerExpense' : 'ledgerIncome'), null, pieModeBtn())}</div></section>`;
    // 2) Evolución a lo largo de los meses o años registrados
    const lu = ui.ledLine === 'year' ? 'year' : 'month';
    const from = span ? span.from : today, rows = LED.series(NET(LV.entries), from < today ? from : today, today, lu).map(r => ({ ...r, label: bucketLabel(r.key, lu), sub: bucketSub(r.key, lu) }));
    if (!hidW('ledLine')) html += `<section class="chart-card clay" data-w="ledLine"><h3>${ico('trend')}<span class="grow">${esc(t('ledLineTitle'))}</span><span class="seg seg-sm">${[['month', 'ledMonths'], ['year', 'ledYears']].map(([v, k]) => `<button data-act="led-line" data-v="${v}" class="${lu === v ? 'on' : ''}">${esc(t(k))}</button>`).join('')}</span></h3>
      ${span ? twoDotChart(rows, { aria: t('ledLineTitle') }) : `<p class="muted small" style="margin:8px 0 0">${esc(t('ledChartEmpty'))}</p>`}</section>`;
    html += '</div>';
    // 3) Filtro: total de una categoría en una franja de fechas, con su gráfica de dos puntos
    const lf = { cat: 'all', from: today.slice(0, 4) + '-01-01', to: today, ...(ui.ledFilter || {}) };
    if (!KGPlan.allows(PL(), 'history') && lf.from < addDays(today, -(KGPlan.LIMITS.chartDays - 1))) lf.from = addDays(today, -(KGPlan.LIMITS.chartDays - 1));
    const fev = String(lf.cat).startsWith('ev:') ? LV.events.find(x => 'ev:' + x.id === lf.cat) : null;
    const fl = LED.inRange(NET(fev ? eventEntries(fev) : LV.entries), lf.from, lf.to).filter(e => fev || lf.cat === 'all' || e.categoryId === lf.cat), ft = LED.totals(fl);
    const days = lf.from && lf.to ? diffDays(lf.from, lf.to) + 1 : 0, fu = days <= 62 ? 'day' : days <= 3 * 366 ? 'month' : 'year';
    const frows = lf.from && lf.to && lf.from <= lf.to ? LED.series(fl, lf.from, lf.to, fu).map(r => ({ ...r, label: bucketLabel(r.key, fu), sub: bucketSub(r.key, fu) })) : [];
    if (!hidW('ledFilter')) html += `<section class="chart-card clay led-filter" data-w="ledFilter"><h3>${ico('search')}<span class="grow">${esc(t('ledFilterTitle'))}</span></h3>
      <div class="filter-row">
        <label class="field"><span>${esc(t('ledgerCategory'))}</span><select class="input" data-led-f="cat"><option value="all">${esc(t('ledAllCats'))}</option>${LV.cats.map(c => `<option value="${esc(c.id)}" ${lf.cat === c.id ? 'selected' : ''}>${esc(c.icon)} ${esc(catName(c))}${c.archived ? ' · ' + esc(t('archive')) : ''}</option>`).join('')}${LV.events.length ? `<optgroup label="${esc(t('evTitle'))}">${LV.events.map(ev => `<option value="ev:${esc(ev.id)}" ${lf.cat === 'ev:' + ev.id ? 'selected' : ''}>${esc(ev.icon)} ${esc(ev.name)}</option>`).join('')}</optgroup>` : ''}</select></label>
        <label class="field"><span>${esc(t('ledFrom'))}</span><input class="input" type="date" data-led-f="from" value="${esc(lf.from)}"></label>
        <label class="field"><span>${esc(t('ledTo'))}</span><input class="input" type="date" data-led-f="to" value="${esc(lf.to)}"></label>
      </div>
      <div class="row wrap" style="gap:6px;margin:4px 0 10px">${[['m', 'ledThisMonth'], ['y', 'ledThisYear'], ['12', 'led12m'], ['all', 'ledAll']].map(([v, k]) => `<button class="chip" data-act="led-range" data-v="${v}">${esc(t(k))}</button>`).join('')}</div>
      <div class="month-sum"><div><span>${esc(t('ledgerIncome'))}</span><b class="amt-in">${cents(ft.income)}</b></div><div><span>${esc(t('ledgerExpense'))}</span><b class="amt-out">${cents(ft.expense)}</b></div><div><span>${esc(t('ledBalance'))}</span><b>${cents(ft.net)}</b></div></div>
      <p class="muted small" style="margin:8px 0 4px">${esc(t('ledFilterCount', { n: fl.length }))}</p>
      ${twoDotChart(frows, { aria: t('ledFilterTitle') })}</section>`;
    return html + '</details>';
  }
  // Dinero Caprichable: solo en la Libreta. Ventana con el total, el conversor y la opción de ocultarlo.
  function openCaprice() {
    openModal({
      title: `${ico('wallet')} ${esc(t('capTitle'))}`, cls: 'wide',
      body: `<div class="stack" style="gap:18px"><div id="cap-total">${capTotalHtml()}</div><section><h3 class="section-title">${esc(t('capConverter'))}</h3>${capHtml()}</section>
        <label class="check tgl"><input type="checkbox" data-cap-hide ${capHidden() ? 'checked' : ''}> ${esc(t('capHideWidget'))}</label></div>`,
      onMount: w => {
        bindCap(w, () => { const el = $('#cap-total', w); if (el) el.innerHTML = capTotalHtml(); render(); });
        w.addEventListener('change', e => { if (e.target.matches('[data-cap-hide]')) { state.ledgerPrefs = { ...state.ledgerPrefs, capHidden: e.target.checked }; save(); render(); } });
      }
    });
  }
  // Importe corto para las celdas del calendario (sin decimales si es redondo)
  const compactMoney = v => new Intl.NumberFormat(state.lang, { style: 'currency', currency: FX.AUTO.includes(ledgerMain()) ? ledgerMain() : 'EUR', notation: Math.abs(v) >= 10000 ? 'compact' : 'standard', maximumFractionDigits: Math.abs(v) >= 100 || Number.isInteger(v) ? 0 : 2 }).format(v);
  function ledgerDayHtml(k) {
    const list = LV.entries.filter(e => e.date === k).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)), tot = LED.totals(NET(list));
    // v1.25: flechas y deslizar a los lados para pasar de día sin volver al calendario
    return `<section class="ledger-day clay" aria-live="polite"><div class="row"><button class="icon-btn sm" data-act="ledger-dayshift" data-d="-1" aria-label="${esc(t('tfPrevDay'))}">${ico('left')}</button><h3 class="grow" style="margin:0">${esc(fmtDate(k, { weekday: 'long', day: 'numeric', month: 'long' }))}</h3><button class="icon-btn sm" data-act="ledger-dayshift" data-d="1" aria-label="${esc(t('tfNextDay'))}">${ico('right')}</button><button class="btn sm" data-act="ledger-add" data-d="${k}">${ico('plus')} ${esc(t('add'))}</button></div>${ledgerDayKinds(k)}
      ${list.length ? `<ul class="ledger-list">${list.map(e => `<li>${entryRow(e)}</li>`).join('')}</ul>
        <div class="entry"><span class="muted">${esc(t('ledgerDayNet'))}</span><b>${cents(tot.net)}</b></div>` : `<p class="muted small" style="margin:10px 0 0">${esc(t('ledgerDayEmpty'))}</p>`}
    </section>`;
  }
  // v1.25: el tipo de día de Organización y los eventos del día, debajo del título del resumen
  function ledgerDayKinds(k) {
    const dks = state.ledgerPrefs.orgDays !== false ? tfDksOf(k) : [], evs = tfEvDays('led')[k] || [];
    return dks.length || evs.length ? `<div class="row wrap" style="gap:6px;margin-top:8px">${dks.map(d => tfDkTag(d)).join('')}${evs.map(v => `<span class="tf-tag" style="--c:${tfColor(v.paint.color)};--fg-c:${tfFg(tfColor(v.paint.color))}">${esc(v.name)}</span>`).join('')}</div>` : '';
  }

  /* v1.22: en el calendario de la Libreta, el cambio estimado de hoy de las monedas que aparecen en el mes */
  function ledgerFxLine(list) {
    const curs = [...new Set(list.filter(e => e.fx && e.fx.cur && e.fx.cur !== ledgerMain()).map(e => e.fx.cur))];
    if (!curs.length) return '';
    if (!fxCache.latest) fxLatest().then(l => { if (l && state.ui.tab === 'ledger') render(); });
    return `<p class="fx-month muted small">${ico('swap')} ${esc(t('fxMonth'))} ${curs.map(c => { const r = fxRateNow(c); return `<span>${esc(r ? fxRateTxt(c, r) : c + ' · ' + t('fxNoRate'))}</span>`; }).join('')}</p>`;
  }
  // Añadir o editar un movimiento
  /* Movimiento en una lista: al deslizarlo hacia la izquierda (dedo o ratón) aparecen Editar y Borrar */
  // v1.23.4: ¿está vinculado a algún otro movimiento que todavía exista?
  const linkedNow = e => !!(e.link && e.type !== 'invest' && LV.entries.some(x => x !== e && x.link === e.link && x.type !== 'invest'));
  function entryRow(e, withDate = false) {
    const c = catOf(e.categoryId), priv = privacyOn(), inc = e.type === 'income', inv = e.type === 'invest';
    const ac = inv ? 'amt-inv' : inc ? 'amt-in' : 'amt-out', sg = inv ? '' : inc ? '+' : '−';
    return `<div class="swipe" data-swipe="${esc(e.id)}"><div class="swipe-acts"><button class="sw-act edit" data-sw-edit="${esc(e.id)}" aria-label="${esc(t('edit'))}" title="${esc(t('edit'))}">${ico('edit')}</button><button class="sw-act del" data-sw-del="${esc(e.id)}" aria-label="${esc(t('delete'))}" title="${esc(t('delete'))}">${ico('trash')}</button></div>
      <button class="ledger-item swipe-front" data-ledger-edit="${esc(e.id)}"><span class="led-ico" aria-hidden="true">${esc(c.icon)}</span><span class="grow"><b>${esc(e.note || catName(c))}</b><span class="muted small">${withDate ? esc(fmtShort(e.date)) + ' · ' : ''}${esc(catName(c))}${e.method ? ' · ' + esc(t('method_' + e.method)) : ''}${e.recurringId ? ` · ${ico('repeat', 'xs')}` : ''}${linkedNow(e) ? ` · <span class="led-link" title="${esc(t('lkLinked'))}">${ico('link', 'xs')}</span>` : ''}${debtBadge(e)}</span></span>${e.fx && e.fx.cur ? `<span class="fx-amt"><b class="${ac}">${priv ? '•••' : sg + fmtCur(e.fx.cents / 100, e.fx.cur)}</b><span class="muted small">(${esc(fxRateTxt(e.fx.cur, e.fx.rate))} → ${priv ? '•••' : cents(e.amountCents)})</span></span>` : `<b class="${ac}">${priv ? '•••' : sg + cents(e.amountCents)}</b>`}</button></div>`;
  }
  const SW_W = 124;
  let swg = null, swOpen = null, swBlock = false;
  function closeSwipe() { if (swOpen) { const f = swOpen.querySelector('.swipe-front'); if (f) f.style.transform = ''; swOpen.classList.remove('open'); } swOpen = null; }
  document.addEventListener('pointerdown', e => {
    const front = !document.body.classList.contains('jiggle') && e.target.closest('.swipe-front');
    if (swOpen && !(front && front.parentElement === swOpen) && !e.target.closest('.swipe-acts')) closeSwipe();
    if (!front || e.button !== 0) return;
    const row = front.parentElement;
    const W = +row.dataset.swW || SW_W;
    swg = { row, front, W, x: e.clientX, y: e.clientY, base: row === swOpen ? -W : 0, dx: 0, on: false };
  });
  document.addEventListener('pointermove', e => {
    if (!swg) return;
    const dx = e.clientX - swg.x, dy = e.clientY - swg.y;
    if (!swg.on) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.3) { swg.on = true; swg.front.style.transition = 'none'; swg.row.classList.add('dragging'); }
      else if (Math.abs(dy) > 10) { swg = null; return; } else return;
    }
    swg.dx = dx;
    swg.front.style.transform = `translateX(${Math.min(0, Math.max(-swg.W - 36, swg.base + dx))}px)`;
  });
  ['pointerup', 'pointercancel'].forEach(n => document.addEventListener(n, () => {
    if (!swg) return;
    const g = swg; swg = null;
    if (!g.on) return;
    g.front.style.transition = ''; g.row.classList.remove('dragging');
    if (g.base + g.dx < -g.W / 2) { if (swOpen && swOpen !== g.row) closeSwipe(); g.front.style.transform = `translateX(${-g.W}px)`; g.row.classList.add('open'); swOpen = g.row; vibrate(8); }
    else { g.front.style.transform = ''; g.row.classList.remove('open'); if (swOpen === g.row) swOpen = null; }
    swBlock = true; setTimeout(() => { swBlock = false; }, 60);
  }));
  window.addEventListener('click', e => { if (swBlock && e.target.closest && e.target.closest('.swipe')) { e.preventDefault(); e.stopPropagation(); swBlock = false; } }, true);
  // Clic en una fila deslizable (en la Libreta o dentro de una ventana). closeFn cierra la ventana antes de abrir el editor
  function swipeClick(e, closeFn, redraw) {
    let el;
    const find = id => LV.entries.find(x => x.id === id);
    if ((el = e.target.closest('[data-sw-del]'))) {
      const id = el.dataset.swDel;
      confirmDialog(t('ledgerDelQ')).then(ok => { closeSwipe(); if (!ok) return; LV.entries = LV.entries.filter(x => x.id !== id); ledgerSave(); render(); sfx('undo'); redraw && redraw(); });
      return true;
    }
    if ((el = e.target.closest('[data-sw-edit], [data-ledger-edit]'))) {
      const row = el.closest('.swipe');
      if (el.matches('[data-ledger-edit]') && row && row === swOpen) { closeSwipe(); return true; }
      const en = find(el.dataset.swEdit || el.dataset.ledgerEdit); closeSwipe();
      if (en) { closeFn && closeFn(); openEntry(en); }
      return true;
    }
    return false;
  }
  // v1.23: tipos de movimiento (Gasto, Ingreso, Inversión). «Ambos» vale para gasto e ingreso; la inversión tiene sus categorías
  const LTYPE_K = { expense: 'ledgerExpenseOne', income: 'ledgerIncomeOne', invest: 'ledgerInvestOne' };
  const catFits = (c, type) => c.type === type || (c.type === 'both' && type !== 'invest');
  /* v1.25: personas de las deudas. Siempre se guardan como contacto ({ c: id }); se elige uno, un amigo por @nametag
     (se crea su contacto) o se escribe un nombre nuevo (también se crea). LV.contacts = [{ id, name, tag }] */
  const contactById = id => LV.contacts.find(c => c.id === id);
  const whoLabel = who => { if (!who) return '—'; const c = who.c && contactById(who.c); if (c) return c.name || (c.tag ? '@' + c.tag : '—'); return who.name || (who.tag ? '@' + who.tag : '—'); };
  const whoKeyOk = who => !!(who && (who.c && contactById(who.c) || (who.tag && String(who.tag).trim()) || (who.name && String(who.name).trim())));
  function whoFromSel(v, name) {
    if (!v) return {};
    if (v.startsWith('c:')) return { c: v.slice(2) };
    if (v.startsWith('t:')) return { tag: v.slice(2) };
    if (v === 'new') return { name: String(name || '').trim().slice(0, 40), _new: true };
    return {};
  }
  function contactFor(who) {
    if (who.c && contactById(who.c)) return { c: who.c };
    const tag = who.tag ? String(who.tag).replace(/^@/, '').toLowerCase() : '', name = String(who.name || '').trim().slice(0, 40);
    let c = tag ? LV.contacts.find(x => x.tag === tag) : LV.contacts.find(x => !x.tag && x.name.toLowerCase() === name.toLowerCase());
    if (!c) { const f = tag && (chatData.friends || []).find(x => String(x.nametag || '').toLowerCase() === tag); c = { id: uid(), name: tag ? (f ? personName(f) : '') : name, tag, createdAt: Date.now() }; LV.contacts.push(c); }
    return { c: c.id };
  }
  function whoSelHtml(who, selAttr, nameAttr) {
    const friends = (chatData.friends || []).filter(f => f.status === 'accepted' && f.nametag && !LV.contacts.some(c => c.tag === String(f.nametag).toLowerCase()));
    const cur = who && who.c ? 'c:' + who.c : who && who.tag ? 't:' + who.tag : who && who._new ? 'new' : '';
    return `<select class="input grow" ${selAttr}><option value="">${esc(t('dbWhoPick'))}</option>${LV.contacts.map(c => `<option value="c:${esc(c.id)}" ${cur === 'c:' + c.id ? 'selected' : ''}>${esc(c.name || '')}${c.tag ? ' @' + esc(c.tag) : ''}</option>`).join('')}${friends.map(f => `<option value="t:${esc(String(f.nametag).toLowerCase())}" ${cur === 't:' + String(f.nametag).toLowerCase() ? 'selected' : ''}>@${esc(f.nametag)} · ${esc(personName(f))}</option>`).join('')}<option value="new" ${cur === 'new' ? 'selected' : ''}>${esc(t('dbWhoNew'))}</option></select>${cur === 'new' ? `<input class="input grow" ${nameAttr} maxlength="40" value="${esc(who.name || '')}" placeholder="${esc(t('dbWhoName'))}">` : ''}`;
  }
  // Etiqueta pequeña en la fila del movimiento
  function debtBadge(e) {
    if (e.type === 'expense' && e.due && e.due.on) return ` · <span class="led-debt ${e.due.paid ? 'done' : ''}">${ico('users', 'xs')} ${esc(t(e.due.paid ? 'dbBadgeDuePaid' : 'dbBadgeDue', { who: whoLabel(e.due.who) }))}</span>`;
    if (DEBT.owedOn(e)) { const L = DEBT.list(LV.entries).filter(d => d.eid === e.id), left = L.reduce((a, d) => a + d.left, 0), extra = L.reduce((a, d) => a + d.extra, 0), pv = privacyOn(); return ` · <span class="led-debt ${left ? '' : 'done'}">${ico('users', 'xs')} ${esc(left ? t('dbBadgeOwed', { a: pv ? '•••' : cents(left) }) : extra ? t('dbDoneExtra', { a: pv ? '•••' : cents(extra) }) : t('dbDone'))}</span>`; }
    if (e.type === 'income' && e.pay) { const d = DEBT.list(LV.entries).find(x => x.eid === e.pay.e && x.pid === e.pay.p); return d ? ` · <span class="led-debt done">${ico('users', 'xs')} ${esc(whoLabel(d.who))}</span>` : ''; }
    return '';
  }
  function openEntry(entry, date) {
    const isNew = !entry;
    const f = entry ? { ...entry } : { type: 'expense', amountCents: 0, categoryId: 'food', note: '', method: 'card', date: date || todayKey(), every: '', to: '' };
    // v1.22: moneda del movimiento (por defecto la principal) y su cambio estimado, que se puede corregir a mano
    const main = ledgerMain();
    f.cur = f.fx && f.fx.cur ? f.fx.cur : main; f.rate = f.fx ? f.fx.rate : 0; f.rateSet = !!f.fx;
    // v1.23.4: «Vincular otro movimiento» (cualquier categoría): ids de los otros movimientos de su grupo
    const linkOf = en => (en && en.link && en.type !== 'invest' ? LV.entries.filter(x => x.id !== (entry && entry.id) && x.link === en.link && x.type !== 'invest').map(x => x.id) : []);
    f.links = linkOf(entry); const links0 = [...f.links];
    // v1.25: Pendiente de Aportación (gasto), Pendiente de devolver (gasto) y pago de una aportación (ingreso)
    f.owed = f.owed && f.owed.on ? { on: true, parts: f.owed.parts.map(x => ({ ...x, who: { ...(x.who || {}) } })) } : { on: false, parts: [] };
    f.due = f.due && f.due.on ? { ...f.due, who: { ...(f.due.who || {}) } } : { on: false, who: {}, paid: null };
    f.pay = f.pay && f.pay.e ? { ...f.pay } : null;
    let pick = null, wref;
    const linkSigned = (type, c) => (type === 'income' ? 1 : -1) * c;
    const linkBox = () => {
      const box = $('#le-link', wref); if (!box) return;
      if (f.type === 'invest' || (isNew && ($('#le-every', wref) || {}).value)) { box.innerHTML = ''; return; }
      const priv = privacyOn(), mine = LED.parseCents(($('#le-amt', wref) || {}).value || '') || 0;
      const myC = f.cur !== main && f.rate ? FX.toMain(mine, FX.roundRate(f.rate)) : mine;
      const mem = f.links.map(id => LV.entries.find(x => x.id === id)).filter(Boolean);
      const net = mem.reduce((a, x) => a + LED.signed(x), linkSigned(f.type, myC));
      const big = [{ type: f.type, amountCents: myC, categoryId: f.categoryId }, ...mem].reduce((a, x) => (x.amountCents || 0) > (a.amountCents || 0) ? x : a);
      const row = (x, act) => { const c = catOf(x.categoryId), inc = x.type === 'income'; return `<div class="lk-row"><span class="led-ico" aria-hidden="true">${esc(c.icon)}</span><span class="grow" style="min-width:0"><b class="ellipsis">${esc(x.note || catName(c))}</b><span class="muted small">${esc(fmtShort(x.date))} · ${esc(catName(c))}</span></span><b class="${inc ? 'amt-in' : 'amt-out'}">${priv ? '•••' : (inc ? '+' : '−') + cents(x.amountCents)}</b>${act}</div>`; };
      let html = `<div class="field"><span>${esc(t('lkTitle'))}</span>`;
      if (mem.length) html += `<div class="lk-list">${mem.map(x => row(x, `<button type="button" class="icon-btn sm" data-lk-del="${esc(x.id)}" aria-label="${esc(t('lkUnlink'))}" title="${esc(t('lkUnlink'))}">${ico('x')}</button>`)).join('')}</div>
        <p class="small lk-net" style="margin:6px 0 0">${ico('link', 'xs')} ${esc(t(net > 0 ? 'lkNetIn' : net < 0 ? 'lkNetOut' : 'lkNetZero', { a: priv ? '•••' : cents(Math.abs(net)), c: catName(catOf(big.categoryId)) }))}</p>`;
      if (pick == null) html += `<button type="button" class="btn sm" data-lk="open" style="align-self:flex-start;margin-top:${mem.length ? 8 : 0}px">${ico('link')} ${esc(t('lkAdd'))}</button>${mem.length ? '' : `<p class="muted small" style="margin:6px 0 0">${esc(t('lkHint'))}</p>`}`;
      else {
        const q = pick.trim().toLowerCase(), skip = new Set([...(entry ? [entry.id] : []), ...f.links]);
        const near = d => Math.abs(diffDays(d, f.date || todayKey()));
        const cand = LV.entries.filter(x => !skip.has(x.id) && x.type !== 'invest' && (!q || (x.note || '').toLowerCase().includes(q) || catName(catOf(x.categoryId)).toLowerCase().includes(q) || fmtPctIn((x.amountCents || 0) / 100).includes(q)))
          .sort((a, b) => near(a.date) - near(b.date) || (a.date < b.date ? 1 : -1)).slice(0, 40);
        html += `<div class="lk-pick clay"><div class="row" style="gap:8px"><input class="input grow" id="lk-q" value="${esc(pick)}" placeholder="${esc(t('lkSearch'))}" autocomplete="off"><button type="button" class="icon-btn sm" data-lk="close" aria-label="${esc(t('close'))}">${ico('x')}</button></div>
          <div class="lk-list" style="margin-top:8px">${cand.length ? cand.map(x => `<button type="button" class="lk-opt" data-lk-add="${esc(x.id)}">${row(x, '')}</button>`).join('') : `<p class="muted small" style="margin:4px 0">${esc(t('lkNone'))}</p>`}</div></div>`;
      }
      box.innerHTML = html + '</div>';
    };
    const debtRead = () => {
      const box = $('#le-debt', wref); if (!box) return;
      for (const r of $$('[data-dp]', box)) {
        const pt = f.owed.parts.find(x => x.id === r.dataset.dp); if (!pt) continue;
        const sel = $('[data-dp-who]', r).value, nm = $('[data-dp-name]', r);
        pt.who = whoFromSel(sel, nm ? nm.value : '');
        const v = $('[data-dp-v]', r).value; pt.v = pt.mode === 'pct' ? Math.max(0, Math.min(100, Number(String(v).replace(',', '.')) || 0)) : (LED.parseCents(v) || 0);
      }
      const dw = $('#le-due-who', box); if (dw) f.due.who = whoFromSel(dw.value, ($('#le-due-name', box) || {}).value || '');
    };
    // Base de las aportaciones: el gasto (en la moneda principal) neto de sus vinculados
    const debtBase = () => {
      const amt = LED.parseCents(($('#le-amt', wref) || {}).value || '') || 0;
      const myC = f.cur !== main && f.rate ? FX.toMain(amt, FX.roundRate(f.rate)) : amt;
      const net = f.links.map(id => LV.entries.find(x => x.id === id)).filter(Boolean).reduce((a, x) => a + LED.signed(x), -myC);
      return net < 0 ? -net : 0;
    };
    // Al escribir: solo cambia el «Te tiene que dar» de cada persona (sin volver a pintar, para no perder el foco)
    const debtExp = () => {
      const box = $('#le-debt', wref); if (!box || !f.owed.on) return;
      debtRead(); const base = debtBase(), priv = privacyOn();
      for (const r of $$('[data-dp]', box)) { const pt = f.owed.parts.find(x => x.id === r.dataset.dp), el = $('.db-exp', r); if (pt && el) el.textContent = t('dbExpected', { a: priv ? '•••' : cents(DEBT.expectedOf(pt, base)) }); }
      const bl = $('.db-base', box); if (bl) bl.textContent = t('dbBase', { a: priv ? '•••' : cents(base) });
    };
    const debtBox = () => {
      const box = $('#le-debt', wref); if (!box) return;
      const priv = privacyOn(), all = DEBT.list(LV.entries);
      if (f.type === 'income') {
        const opts = DEBT.openParts(LV.entries, entry);
        if (!opts.length && !f.pay) { box.innerHTML = ''; return; }
        const cur = f.pay && all.find(d => d.eid === f.pay.e && d.pid === f.pay.p);
        box.innerHTML = `<div class="field"><span>${ico('users', 'xs')} ${esc(t('dbPayTitle'))}</span><select class="input" id="le-pay"><option value="">${esc(t('dbPayNone'))}</option>${opts.map(d => { const x = LV.entries.find(y => y.id === d.eid) || {}; return `<option value="${esc(d.eid + '|' + d.pid)}" ${f.pay && f.pay.e === d.eid && f.pay.p === d.pid ? 'selected' : ''}>${esc(whoLabel(d.who))} · ${esc(x.note || catName(catOf(x.categoryId)))} · ${priv ? '•••' : cents(d.left || d.expected)}</option>`; }).join('')}</select>
          ${cur ? `<p class="muted small" style="margin:6px 0 0">${esc(t('dbPayInfo', { e: priv ? '•••' : cents(cur.expected), p: priv ? '•••' : cents(cur.paid) }))}</p>` : `<p class="muted small" style="margin:6px 0 0">${esc(t('dbPayHint'))}</p>`}</div>`;
        return;
      }
      if (f.type !== 'expense') { box.innerHTML = ''; return; }
      const base = debtBase();
      const sw = (id, on, title, hint) => `<label class="row" style="gap:12px"><span class="switch"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><span></span></span><span class="grow"><b>${esc(title)}</b><br><span class="muted small">${esc(hint)}</span></span></label>`;
      let html = `<div class="stack" style="gap:10px">${sw('le-owed', f.owed.on, t('dbOwedTitle'), t('dbOwedHint'))}`;
      if (f.owed.on) {
        html += `<div class="stack db-parts" style="gap:8px">${f.owed.parts.map(pt => {
          const st = entry && all.find(d => d.eid === entry.id && d.pid === pt.id), exp = DEBT.expectedOf(pt, base);
          return `<div class="db-part clay" data-dp="${esc(pt.id)}"><div class="row" style="gap:8px">${whoSelHtml(pt.who, 'data-dp-who', 'data-dp-name')}<button type="button" class="icon-btn sm" data-dp-del="${esc(pt.id)}" aria-label="${esc(t('delete'))}">${ico('x')}</button></div>
            <div class="row" style="gap:8px;margin-top:8px"><div class="seg seg-sm">${[['fixed', 'dbFixed'], ['pct', 'dbPct']].map(([v, k]) => `<button type="button" data-dp-mode="${v}" class="${pt.mode === v ? 'on' : ''}" aria-pressed="${pt.mode === v}">${esc(t(k))}</button>`).join('')}</div><input class="input grow" data-dp-v inputmode="decimal" autocomplete="off" value="${pt.mode === 'pct' ? (pt.v ? esc(fmtPctIn(pt.v)) : '') : pt.v ? esc(fmtPctIn(pt.v / 100)) : ''}" placeholder="${pt.mode === 'pct' ? '%' : '0,00'}"></div>
            <p class="muted small" style="margin:6px 0 0"><span class="db-exp">${esc(t('dbExpected', { a: priv ? '•••' : cents(exp) }))}</span>${st ? ' · ' + esc(st.status === 'done' ? (st.extra ? t('dbDoneExtra', { a: priv ? '•••' : cents(st.extra) }) : t('dbDone')) : t('dbLeft', { a: priv ? '•••' : cents(st.left) })) : ''}</p></div>`;
        }).join('')}<button type="button" class="chip" data-dp-add style="align-self:flex-start">${ico('plus')} ${esc(t('dbAddPart'))}</button>
          <p class="muted small db-base" style="margin:0">${esc(t('dbBase', { a: priv ? '•••' : cents(base) }))}</p></div>`;
      }
      html += sw('le-due', f.due.on, t('dbDueTitle'), t('dbDueHint'));
      if (f.due.on) html += `<div class="db-part clay"><div class="row" style="gap:8px">${whoSelHtml(f.due.who, 'id="le-due-who"', 'id="le-due-name"')}</div>
        ${!isNew ? `<label class="row" style="gap:12px;margin-top:10px"><span class="switch"><input type="checkbox" id="le-due-paid" ${f.due.paid ? 'checked' : ''}><span></span></span><span class="grow"><b>${esc(t('dbDuePaid'))}</b>${f.due.paid ? `<br><span class="muted small">${esc(fmtDate(f.due.paid))}</span>` : ''}</span></label>` : ''}</div>`;
      box.innerHTML = html + '</div>';
    };
    const curOpts = () => [main, ...(KGPlan.allows(PL(), 'fx') ? FX.ALL.filter(c => c !== main) : f.cur && f.cur !== main ? [f.cur] : [])].map(c => `<option value="${c}" ${f.cur === c ? 'selected' : ''}>${c}</option>`).join('');
    const fxPrev = () => {
      const p = $('#le-fx-p', wref); if (!p) return;
      const amt = LED.parseCents(($('#le-amt', wref) || {}).value || '') || 0, r = Number(f.rate) || 0;
      p.innerHTML = r ? `${esc(fxRateTxt(f.cur, r))}${amt ? ` → ${esc(fmtCur(amt / 100, f.cur))} ≈ <b>${esc(fmtMoney(FX.toMain(amt, FX.roundRate(r)) / 100))}</b>` : ''} · ${esc(t('fxEstimate'))}` : esc(t('fxNoRateHint'));
    };
    const fxLine = () => {
      const box = $('#le-fx', wref); if (!box) return;
      if (f.cur === main) { box.innerHTML = ''; return; }
      const r = Number(f.rate) || 0;
      box.innerHTML = `<div class="seg seg-sm" role="group" aria-label="${esc(t('fxStoreAria'))}">${[['keep', 'fxKeepCur'], ['conv', 'fxConvMain']].map(([v, k]) => `<button type="button" data-le-store="${v}" class="${(f.conv ? 'conv' : 'keep') === v ? 'on' : ''}" aria-pressed="${(f.conv ? 'conv' : 'keep') === v}">${esc(t(k, { c: f.cur, m: main }))}</button>`).join('')}</div>
        <label class="field" style="margin-top:10px"><span>${esc(t('fxRateLbl', { c: f.cur, m: main }))}</span><input class="input" id="le-rate" inputmode="decimal" autocomplete="off" value="${r ? esc(fmtPctIn(FX.roundRate(r))) : ''}" placeholder="${esc(t('fxNoRate'))}"></label>
        <p class="muted small" id="le-fx-p" style="margin:6px 0 0"></p>`;
      fxPrev();
    };
    const fxFetchRate = async () => {
      if (f.cur === main || f.rateSet) { fxLine(); return; }
      const cur = f.cur, r = await fxRateOn(cur, f.date);
      if (cur !== f.cur || f.rateSet) return;
      f.rate = r || 0; fxLine();
    };
    const catsHtml = () => LV.cats.filter(c => !c.archived && catFits(c, f.type)).map(c => `<button type="button" class="chip ${f.categoryId === c.id ? 'on' : ''}" data-le-cat="${c.id}" aria-pressed="${f.categoryId === c.id}">${esc(c.icon)} ${esc(catName(c))}</button>`).join('');
    const draw = () => {
      $('#le', wref).innerHTML = `<div class="stack" style="gap:16px">
        <div class="seg" role="group" aria-label="${esc(t('ledgerType'))}">${LED.TYPES.map(v => `<button type="button" data-le-type="${v}" class="${f.type === v ? 'on' : ''}" aria-pressed="${f.type === v}">${esc(t(LTYPE_K[v]))}</button>`).join('')}</div>
        <label class="field"><span>${esc(t('ledgerAmount'))}</span><span class="cap-input"><input class="input amt-input" id="le-amt" inputmode="decimal" autocomplete="off" placeholder="0,00" value="${f.fx ? esc(fmtPctIn(f.fx.cents / 100)) : f.amountCents ? esc(fmtPctIn(f.amountCents / 100)) : ''}"><select class="input cur-sel" id="le-cur" aria-label="${esc(t('fxCurrency'))}">${curOpts()}</select></span></label>
        <div id="le-fx"></div>
        <div class="field"><span>${esc(t('ledgerCategory'))}</span><div class="sug-list">${catsHtml()}</div></div>
        <label class="field"><span>${esc(t('ledgerDate'))}</span><input class="input" type="date" id="le-date" value="${esc(f.date)}"></label>
        <label class="field"><span>${esc(t('ledgerNote'))}</span><input class="input" id="le-note" maxlength="140" value="${esc(f.note || '')}" placeholder="${esc(t('ledgerNotePh'))}"></label>
        <div class="field"><span>${esc(t('ledgerMethod'))}</span><div class="seg">${LED.METHODS.map(v => `<button type="button" data-le-method="${v}" class="${f.method === v ? 'on' : ''}" aria-pressed="${f.method === v}">${esc(t('method_' + v))}</button>`).join('')}</div></div>
        <div id="le-link"></div>
        <div id="le-debt"></div>
        ${isNew ? `<label class="field"><span>${esc(t('ledgerRepeat'))}</span><select class="input" id="le-every"><option value="">${esc(t('repeat_none'))}</option>${LED.REPEATS.map(v => `<option value="${v}" ${f.every === v ? 'selected' : ''}>${esc(t('repeat_' + v))}</option>`).join('')}</select></label>
          <label class="field ${f.every ? '' : 'hidden'}" id="le-to-wrap"><span>${esc(t('ledgerRepeatTo'))}</span><input class="input" type="date" id="le-to" value="${esc(f.to || '')}"></label>` : entry.recurringId ? `<p class="muted small row" style="margin:0;gap:6px">${ico('repeat', 'xs')} ${esc(t('ledgerFromRec'))}</p>` : ''}
      </div>`;
    };
    const read = () => { f.note = $('#le-note', wref).value.trim(); f.date = $('#le-date', wref).value || f.date; if (isNew) { f.every = $('#le-every', wref).value; f.to = $('#le-to', wref).value; } };
    openModal({
      title: esc(t(isNew ? 'ledgerNew' : 'ledgerEdit')), body: '<div id="le"></div>',
      foot: `${isNew ? '' : `<button class="btn danger" data-le="del">${ico('trash')} ${esc(t('delete'))}</button>`}<button class="btn primary" data-le="save">${esc(t('save'))}</button>`,
      onMount: w => { wref = w; draw(); linkBox(); debtBox(); fxFetchRate(); setTimeout(() => { const a = $('#le-amt', w); if (a && isNew) a.focus(); }, 60);
        w.addEventListener('change', e => {
          if (e.target.id === 'le-every') { $('#le-to-wrap', w).classList.toggle('hidden', !e.target.value); linkBox(); }
          if (e.target.id === 'le-cur') { f.cur = e.target.value; f.rateSet = false; f.rate = 0; fxLine(); fxFetchRate(); }
          if (e.target.id === 'le-date') { f.date = e.target.value || f.date; fxFetchRate(); }
          if (e.target.id === 'le-owed') { debtRead(); f.owed.on = e.target.checked; if (f.owed.on) { f.due.on = false; if (!f.owed.parts.length) f.owed.parts.push({ id: uid(), who: {}, mode: 'fixed', v: 0 }); } debtBox(); }
          if (e.target.id === 'le-due') { debtRead(); f.due.on = e.target.checked; if (f.due.on) f.owed.on = false; debtBox(); }
          if (e.target.id === 'le-due-paid') { f.due.paid = e.target.checked ? todayKey() : null; debtRead(); debtBox(); }
          if (e.target.id === 'le-pay') { const [pe, pp] = e.target.value.split('|'); f.pay = pe ? { e: pe, p: pp } : null; debtBox(); }
          if (e.target.matches('[data-dp-who], #le-due-who')) { debtRead(); debtBox(); }
        });
        w.addEventListener('input', e => {
          if (e.target.id === 'le-amt') { fxPrev(); if (f.links.length) linkBox(); debtExp(); }
          if (e.target.matches('[data-dp-v]')) debtExp();
          if (e.target.id === 'lk-q') { pick = e.target.value; const pos = e.target.selectionStart; linkBox(); const q = $('#lk-q', w); if (q) { q.focus(); q.setSelectionRange(pos, pos); } }
          if (e.target.id === 'le-rate') { const v = Number(String(e.target.value).replace(/\s/g, '').replace(',', '.')); if (v > 0) { f.rate = v; f.rateSet = true; } fxPrev(); }
        });
        w.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input') && e.target.id !== 'lk-q') { e.preventDefault(); $('[data-le="save"]', w).click(); } }); },
      onClick: async (e, close) => {
        let el;
        const keepAmt = () => { const a = $('#le-amt', wref); f._amt = a ? a.value : ''; };
        const restore = () => { if (f._amt != null) $('#le-amt', wref).value = f._amt; fxLine(); linkBox(); debtBox(); };
        if ((el = e.target.closest('[data-lk]'))) { pick = el.dataset.lk === 'open' ? '' : null; linkBox(); if (pick != null) { const q = $('#lk-q', wref); if (q) q.focus(); } return; }
        if ((el = e.target.closest('[data-lk-del]'))) { f.links = f.links.filter(id => id !== el.dataset.lkDel); linkBox(); debtBox(); return; }
        if (e.target.closest('[data-dp-add]')) { debtRead(); if (f.owed.parts.length < 20) f.owed.parts.push({ id: uid(), who: {}, mode: 'fixed', v: 0 }); debtBox(); return; }
        if ((el = e.target.closest('[data-dp-del]'))) { debtRead(); f.owed.parts = f.owed.parts.filter(x => x.id !== el.dataset.dpDel); if (!f.owed.parts.length) f.owed.on = false; debtBox(); return; }
        if ((el = e.target.closest('[data-dp-mode]'))) { debtRead(); const pt = f.owed.parts.find(x => x.id === el.closest('[data-dp]').dataset.dp); if (pt && pt.mode !== el.dataset.dpMode) { pt.mode = el.dataset.dpMode; pt.v = 0; } debtBox(); return; }
        if ((el = e.target.closest('[data-lk-add]'))) {
          // Si ya estaba vinculado con otros, entra todo su grupo
          const x = LV.entries.find(y => y.id === el.dataset.lkAdd); if (!x) return;
          const add = [x.id, ...(x.link ? LV.entries.filter(y => y.link === x.link && y.id !== x.id && y.type !== 'invest' && (!entry || y.id !== entry.id)).map(y => y.id) : [])];
          f.links = [...new Set([...f.links, ...add])]; pick = null; linkBox(); debtBox(); return;
        }
        if ((el = e.target.closest('[data-le-type]'))) { read(); keepAmt(); debtRead(); f.type = el.dataset.leType; const c = catOf(f.categoryId); if (!catFits(c, f.type)) f.categoryId = (LV.cats.find(x => !x.archived && catFits(x, f.type)) || { id: 'other' }).id; draw(); restore(); return; }
        if ((el = e.target.closest('[data-le-cat]'))) { read(); keepAmt(); f.categoryId = el.dataset.leCat; draw(); restore(); return; }
        if ((el = e.target.closest('[data-le-store]'))) { const r = $('#le-rate', wref); if (r) { const v = Number(String(r.value).replace(/\s/g, '').replace(',', '.')); if (v > 0) { f.rate = v; f.rateSet = true; } } f.conv = el.dataset.leStore === 'conv'; fxLine(); return; }
        if ((el = e.target.closest('[data-le-method]'))) { read(); keepAmt(); f.method = el.dataset.leMethod; draw(); restore(); return; }
        if ((el = e.target.closest('[data-le]'))) {
          if (el.dataset.le === 'del') {
            if (!(await confirmDialog(t('ledgerDelQ')))) return;
            LV.entries = LV.entries.filter(x => x.id !== entry.id); ledgerSave(); close(); render(); sfx('undo'); return;
          }
          read();
          const amt = LED.parseCents($('#le-amt', wref).value);
          if (!amt) { toast(t('ledgerNeedAmount')); $('#le-amt', wref).focus(); return; }
          const data = { type: f.type, amountCents: amt, categoryId: f.categoryId, note: f.note, method: f.method, date: f.date };
          // v1.25: deudas (las personas nuevas se guardan como contactos)
          debtRead();
          if (f.type === 'expense' && f.owed.on) {
            const parts = f.owed.parts.filter(x => x.v > 0);
            if (parts.some(x => !whoKeyOk(x.who))) { toast(t('dbNeedWho')); return; }
            if (parts.length) data.owed = { on: true, parts: parts.map(x => ({ id: x.id, who: contactFor(x.who), mode: x.mode, v: x.v })) };
          }
          if (f.type === 'expense' && f.due.on) {
            if (!whoKeyOk(f.due.who)) { toast(t('dbNeedWho')); return; }
            data.due = { on: true, who: contactFor(f.due.who), paid: f.due.paid || null };
          }
          if (f.type === 'income' && f.pay) data.pay = { e: f.pay.e, p: f.pay.p };
          if (f.cur !== main) {
            const rt = FX.roundRate($('#le-rate', wref) ? Number(String($('#le-rate', wref).value).replace(/\s/g, '').replace(',', '.')) : f.rate);
            if (!(rt > 0)) { toast(t('fxNeedRate')); const ri = $('#le-rate', wref); if (ri) ri.focus(); return; }
            // v1.23: «Convertir» guarda solo el importe en la moneda principal; «En su moneda», también la original (fx)
            data.amountCents = FX.toMain(amt, rt); if (!f.conv) data.fx = { cur: f.cur, cents: amt, rate: rt };
            if (!data.amountCents) { toast(t('ledgerNeedAmount')); return; }
          }
          if (isNew && f.every) {
            LV.recurring.push({ id: uid(), ...data, every: f.every, from: f.date, to: f.to && f.to >= f.date ? f.to : '', archived: false });
            runRecurring();
            if (f.date > todayKey()) toast(t('ledgerRecFuture'));
          } else if (isNew) { const ne = { id: uid(), ...data, recurringId: '', createdAt: Date.now() }; LV.entries.push(ne); saveLinks(ne, f.type === 'invest' ? [] : f.links, []); }
          else { const tg = LV.entries.find(x => x.id === entry.id) || {}; Object.assign(tg, data); if (!data.fx) delete tg.fx; for (const k of ['owed', 'due', 'pay']) if (!data[k]) delete tg[k]; saveLinks(tg, f.type === 'invest' ? [] : f.links, links0); }
          state.ui.ledgerDay = f.date; state.ui.ledgerMonth = f.date.slice(0, 7);
          ledgerSave(); close(); render(); vibrate(10); sfx(f.type === 'expense' ? 'pop' : 'money');
        }
      }
    });
  }

  /* v1.23.4: guarda los vínculos de un movimiento: ids = los otros de su grupo, before = los que tenía al abrir el editor.
     Todos comparten e.link; los que se quitan lo pierden y un grupo de uno solo deja de estar vinculado. */
  function saveLinks(en, ids, before) {
    const others = ids.map(id => LV.entries.find(x => x.id === id)).filter(x => x && x !== en);
    for (const id of before) if (!ids.includes(id)) { const x = LV.entries.find(y => y.id === id); if (x) delete x.link; }
    if (!others.length) { const old = en.link; delete en.link; if (old) { const rest = LV.entries.filter(x => x.link === old); if (rest.length < 2) rest.forEach(x => delete x.link); } return; }
    const g = en.link || (others.find(x => x.link) || {}).link || uid();
    for (const x of [en, ...others]) {
      if (x.link && x.link !== g) LV.entries.forEach(y => { if (y.link === x.link && y !== x) y.link = g; });
      x.link = g;
    }
    const rest = LV.entries.filter(x => x.link === g);
    if (rest.length < 2) rest.forEach(x => delete x.link);
  }

  /* v1.25: borrar una categoría. Sin movimientos se borra sin más; con movimientos (o repeticiones), antes hay que elegir a qué
     categoría del mismo tipo se mueven. También se quita de presupuestos y eventos. */
  function deleteLedgerCat(cid, after) {
    const c = LV.cats.find(x => x.id === cid); if (!c) return;
    const used = LV.entries.filter(e => e.categoryId === cid).length + LV.recurring.filter(r => r.categoryId === cid).length;
    const others = LV.cats.filter(x => x.id !== cid && !x.archived && (x.type === c.type || x.type === 'both' || c.type === 'both'));
    const finish = to => {
      if (to) { for (const e of LV.entries) if (e.categoryId === cid) e.categoryId = to; for (const r of LV.recurring) if (r.categoryId === cid) r.categoryId = to; }
      for (const b of LV.budgets) if (Array.isArray(b.catIds)) b.catIds = b.catIds.filter(x => x !== cid);
      for (const ev of LV.events) if (Array.isArray(ev.catIds)) ev.catIds = ev.catIds.filter(x => x !== cid);
      LV.cats = LV.cats.filter(x => x.id !== cid); ledgerSave(); render(); toast(t('rgCatDeleted')); if (after) after();
    };
    openModal({
      title: `${ico('trash')} ${esc(t('rgCatDelQ', { c: catName(c) }))}`,
      body: used ? `<p style="margin-top:0">${esc(t('rgCatUsed', { n: used }))}</p>${others.length ? `<select class="input" id="lcd-to">${others.map(x => `<option value="${esc(x.id)}">${esc((x.icon ? x.icon + ' ' : '') + catName(x))}</option>`).join('')}</select>` : `<p class="muted">${esc(t('rgCatNoOther'))}</p>`}` : `<p class="muted" style="margin-top:0">${esc(t('rgCatUnused'))}</p>`,
      foot: `<button class="btn" data-m="x">${esc(t('cancel'))}</button>${!used || others.length ? `<button class="btn danger" data-lcd>${esc(t(used ? 'rgCatMoveDel' : 'delete'))}</button>` : ''}`,
      onClick: (e, close) => { if (!e.target.closest('[data-lcd]')) return; const to = used ? $('#lcd-to').value : ''; close(); finish(to); }
    });
  }
  // Categorías: crear, renombrar (icono y nombre) y archivar. Archivar nunca borra movimientos.
  function openLedgerCats() {
    let wref, newType = 'expense';
    const draw = () => {
      $('#lc', wref).innerHTML = `<div class="stack" style="gap:10px">${LV.cats.map(c => `<div class="row cat-row ${c.archived ? 'archived' : ''}"><input class="input" data-lc-icon="${c.id}" value="${esc(c.icon)}" maxlength="4" aria-label="${esc(t('ledgerCatIcon'))}" style="width:62px;text-align:center"><input class="input grow" data-lc-name="${c.id}" value="${esc(catName(c))}" maxlength="30" aria-label="${esc(t('ledgerCatName'))}"><span class="muted small cat-type">${esc(t('ctype_' + c.type))}</span><button class="icon-btn sm" data-lc-arch="${c.id}" aria-label="${esc(t(c.archived ? 'restore' : 'archive'))}" title="${esc(t(c.archived ? 'restore' : 'archive'))}">${ico(c.archived ? 'refresh' : 'archive')}</button></div>`).join('')}
        <h4 style="margin:14px 0 0">${esc(t('ledgerCatNew'))}</h4>
        <div class="seg">${['income', 'expense', 'both', 'invest'].map(v => `<button type="button" data-lc-type="${v}" class="${newType === v ? 'on' : ''}">${esc(t('ctype_' + v))}</button>`).join('')}</div>
        <div class="row"><input class="input" id="lc-icon" value="🏷️" maxlength="4" style="width:62px;text-align:center" aria-label="${esc(t('ledgerCatIcon'))}"><input class="input grow" id="lc-name" maxlength="30" placeholder="${esc(t('ledgerCatName'))}"><button class="btn" data-lc-add>${ico('plus')} ${esc(t('add'))}</button></div></div>`;
    };
    openModal({
      title: `${ico('tag')} ${esc(t('ledgerCats'))}`, body: '<div id="lc"></div>',
      onMount: w => { wref = w; draw();
        w.addEventListener('change', e => {
          const c = e.target.dataset && LV.cats.find(x => x.id === (e.target.dataset.lcName || e.target.dataset.lcIcon)); if (!c) return;
          if (e.target.dataset.lcName) { const v = e.target.value.trim(); if (v) c.name = v === t(c.key || '') ? '' : v; }
          else c.icon = e.target.value.trim() || c.icon;
          ledgerSave(); render();
        }); },
      onClick: e => {
        let el;
        if ((el = e.target.closest('[data-lc-type]'))) { newType = el.dataset.lcType; const n = $('#lc-name', wref).value; draw(); $('#lc-name', wref).value = n; return; }
        if ((el = e.target.closest('[data-lc-arch]'))) { const c = LV.cats.find(x => x.id === el.dataset.lcArch); if (c) { c.archived = !c.archived; ledgerSave(); draw(); render(); } return; }
        if (e.target.closest('[data-lc-add]')) { const name = $('#lc-name', wref).value.trim(); if (!name) { toast(t('ledgerCatNeedName')); return; } LV.cats.push({ id: uid(), name, icon: $('#lc-icon', wref).value.trim() || '🏷️', type: newType, archived: false }); ledgerSave(); draw(); render(); }
      }
    });
  }

  /* ---------- Compartir y exportar una franja de la Libreta ----------
     Exportar: un .html autocontenido con el mismo aspecto que la app. Compartir: solo con amigos, cifrado de extremo a extremo
     (ECDH): el servidor guarda una caja que solo pueden abrir quien la envía y quien la recibe. Nunca se comparte con grupos. */
  const EXP = window.KGLedgerExport;
  const KX = { vid: null, priv: null, pub: null, pushed: false };
  async function ensureKx() {
    if (!ledgerOpen()) throw new Error('locked');
    if (KX.vid === LV.vid && KX.priv && state.kx && state.kx.vid === LV.vid) return KX;
    let kx = state.kx, priv = null;
    if (kx && kx.vid === LV.vid) { try { priv = await VAULT.decrypt(LV.key, kx.priv); } catch (e) { priv = null; } }
    if (!priv) { const g = await VAULT.kxGenerate(); priv = g.priv; kx = state.kx = { vid: LV.vid, pub: g.pub, priv: await VAULT.encrypt(LV.key, g.priv) }; save(); KX.pushed = false; }
    Object.assign(KX, { vid: LV.vid, priv, pub: kx.pub });
    if (auth && !KX.pushed) {
      try { await ensureToken(); await sbFetch(`/rest/v1/kg_users?user_id=eq.${auth.uid}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ pubkey: kx.pub, updated_at: new Date().toISOString() }) }); KX.pushed = true; }
      catch (e) { /* se reintenta en la próxima apertura */ }
    }
    return KX;
  }
  function ledgerSlice(from, to, catIds = []) {
    const entries = NET(LED.inRange(LV.entries, from, to)).filter(e => e._lk !== 'sub' && (!catIds.length || catIds.includes(e.categoryId))).map(e => ({ id: e.id, date: e.date, type: e.type, amountCents: e.amountCents, categoryId: e.categoryId, note: e.note || '', method: e.method || '' }));
    const used = new Set(entries.map(e => e.categoryId));
    return {
      entries,
      cats: LV.cats.filter(c => used.has(c.id)).map(c => ({ id: c.id, name: c.name, icon: c.icon, color: c.color })),
      events: LV.events.filter(ev => ev.from <= to && ev.to >= from).map(ev => ({ name: ev.name, icon: ev.icon, from: ev.from, to: ev.to, catIds: ev.catIds || [] }))
    };
  }
  const exportHtml = (d, title, from, to, subtitle = '') => EXP.html({
    lang: state.lang, title, subtitle, from, to, entries: d.entries, cats: d.cats, events: d.events,
    money: { locale: state.lang, currency: FX.AUTO.includes(ledgerMain()) ? ledgerMain() : 'EUR' }, generatedAt: new Date().toISOString(), footer: 'KeepGoing'
  });
  function downloadFile(name, text, type = 'text/html') {
    const url = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' })), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  /* ---------- v1.21: «Registrar» — importar el CSV de movimientos del banco (por ahora, Trading 212) ----------
     No se deduce nada: por cada tipo de movimiento se pregunta qué es (gasto, ingreso o ignorar), su categoría y, salvo en
     los pagos con tarjeta, si se agrupan. Los depósitos y las retiradas se ignoran. Lo importado lleva extIds para no duplicarse. */
  const BCSV = window.KGBankCsv;
  const rgKindName = g => g.kind === 'card' ? t('rgKind_card', { c: rgMcat(g.mcat) }) : g.kind === 'other' ? t('rgKind_other', { a: g.action }) : t('rgKind_' + g.kind);
  const rgMcat = m => { const s = String(m || '').replace(/_/g, ' ').toLowerCase().trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : t('rgNoMcat'); };
  const rgCanGroup = g => g.kind !== 'card' && g.kind !== 'cardCredit';
  const RG_TYPES = [['expense', 'ledgerExpenseOne'], ['income', 'ledgerIncomeOne'], ['invest', 'ledgerInvestOne'], ['skip', 'rgSkip']], RG_MAX_ROWS = 300;
  function rgNote(e) {
    const n = e.count > 1 ? ` (${e.count})` : '';
    if (e.kind === 'card' || e.kind === 'cardCredit') return e.extGroup ? rgMcat(e.label) + n : e.label;
    if (e.kind === 'other') return (e.label || '') + n;
    return t('rgNote_' + e.kind) + (e.extGroup ? n : e.label ? ' · ' + e.label : '');
  }
  function openRegistrar() {
    const S = { step: 'intro', data: null, q: [], cur: {}, ans: {}, rates: {}, curMode: {}, file: '', open: new Set() };
    let wref;
    const cats = type => LV.cats.filter(c => !c.archived && catFits(c, type));
    // v1.23: cada grupo se puede desglosar y decidir movimiento a movimiento (respuesta propia en S.ans['row:' + clave])
    const rowsOf = g => BCSV.rowsOf(S.rows, g.id);
    const rowOk = r => { const a = S.ans['row:' + r.key]; return !!(a && a.type && (a.type === 'skip' || a.categoryId)); };
    const missing = () => {
      let n = 0;
      for (const g of S.q) {
        const rs = rowsOf(g); n += rs.filter(r => S.ans['row:' + r.key] && !rowOk(r)).length;
        if (rs.every(r => S.ans['row:' + r.key])) continue;
        const a = S.ans[g.id] || {}; if (!a.type || (a.type !== 'skip' && (!a.categoryId || (rgCanGroup(g) && !a.group)))) n++;
      }
      for (const c of Object.keys(S.cur)) if (!S.curMode[c] || (S.curMode[c] !== 'skip' && !(S.rates[c] > 0))) n++;
      return n;
    };
    const draw = () => {
      const box = $('#rg', wref); if (!box) return;
      if (S.step === 'intro') {
        box.innerHTML = `<div class="stack" style="gap:14px"><p style="margin:0">${esc(t('rgIntro'))}</p>
          <ol class="rg-steps">${['rgStep1', 'rgStep2', 'rgStep3'].map(k => `<li>${esc(t(k))}</li>`).join('')}</ol>
          <p class="muted small" style="margin:0">${esc(t('rgOnlyT212'))}</p>
          <label class="btn calc-blue block">${ico('upload')} ${esc(t('rgChoose'))}<input type="file" accept=".csv,text/csv" class="sr-only" data-rg-file></label>
          <p class="muted small" style="margin:0">${esc(t('rgPrivacy'))}</p></div>`;
        $('.sheet-foot', wref) && ($('.sheet-foot', wref).innerHTML = '');
        return;
      }
      const d = S.data, miss = missing();
      // v1.25: crear una categoría ahí mismo o borrar la elegida (si tiene movimientos, se mueven antes a otra)
      const catSel = (id, a) => `<div class="field"><span>${esc(t('ledgerCategory'))}</span><div class="row" style="gap:8px"><select class="input grow" data-rg-cat="${esc(id)}"><option value="">${esc(t('rgPickCat'))}</option>${cats(a.type).map(c => `<option value="${esc(c.id)}" ${a.categoryId === c.id ? 'selected' : ''}>${esc((c.icon ? c.icon + ' ' : '') + catName(c))}</option>`).join('')}<option value="__new" ${S.newCat === id ? 'selected' : ''}>+ ${esc(t('rgCatNew'))}</option></select>${a.categoryId && a.categoryId !== 'other' ? `<button type="button" class="icon-btn sm" data-rg-catdel="${esc(a.categoryId)}" aria-label="${esc(t('rgCatDel'))}" title="${esc(t('rgCatDel'))}">${ico('trash')}</button>` : ''}</div>
        ${S.newCat === id ? `<div class="row" style="gap:8px;margin-top:8px"><input class="input" data-rg-nc-icon value="🏷️" maxlength="4" style="width:58px;text-align:center" aria-label="${esc(t('ledgerCatIcon'))}"><input class="input grow" data-rg-nc-name maxlength="30" placeholder="${esc(t('ledgerCatName'))}"><button type="button" class="btn sm" data-rg-nc="${esc(id)}">${esc(t('create'))}</button></div>` : ''}</div>`;
      const seg = (gid, key, opts, val) => `<div class="seg seg-sm" role="group">${opts.map(([v, k]) => `<button type="button" data-rg-set="${esc(gid)}" data-k="${key}" data-v="${v}" class="${val === v ? 'on' : ''}">${esc(t(k))}</button>`).join('')}</div>`;
      box.innerHTML = `<div class="stack" style="gap:14px">
        <p class="muted small" style="margin:0">${esc(t('rgRead', { n: d.rows.length }))}${S.dupN ? ' · ' + esc(t('rgDupN', { n: S.dupN })) : ''}</p>
        <p style="margin:0">${esc(t('rgAsk'))}</p>
        ${S.q.map(g => { const a = S.ans[g.id] || {}, rs = rowsOf(g), nOwn = rs.filter(r => S.ans['row:' + r.key]).length, open = S.open.has(g.id); return `<section class="rg-q clay">
          <div class="row" style="justify-content:space-between;gap:8px;align-items:flex-start"><b class="grow">${esc(rgKindName(g))}</b><span class="muted small" style="white-space:nowrap">${g.count} · ${money(g.cents / 100)}</span></div>
          ${g.sample.length ? `<p class="muted small" style="margin:0">${esc(t('rgSample', { s: g.sample.join(', ') }))}</p>` : ''}
          <p class="muted small" style="margin:0">${esc(t('rgHint_' + g.kind))}</p>
          ${rs.length > nOwn ? `<span class="rg-l">${esc(t(nOwn ? 'rgWhatRest' : 'rgWhat', { n: rs.length - nOwn }))}</span>${seg(g.id, 'type', RG_TYPES, a.type)}
          ${a.type && a.type !== 'skip' ? `${catSel(g.id, a)}
            ${rgCanGroup(g) ? `<span class="rg-l">${esc(t('rgGroupQ'))}</span>${seg(g.id, 'group', [['none', 'rgGroupNo'], ['day', 'rgGroupDay'], ['month', 'rgGroupMonth']], a.group)}` : ''}` : ''}` : `<p class="muted small" style="margin:0">${esc(t('rgAllOwn'))}</p>`}
          ${rs.length > 1 || nOwn ? `<button type="button" class="chip sm rg-split ${open ? 'on' : ''}" data-rg-split="${esc(g.id)}" aria-expanded="${open}">${ico('list')} ${esc(t(open ? 'rgSplitHide' : 'rgSplit', { n: rs.length }))}${nOwn ? ` · ${esc(t('rgOwnN', { n: nOwn }))}` : ''}</button>` : ''}
          ${open ? `<ul class="rg-rows">${rs.slice(0, RG_MAX_ROWS).map(r => { const ra = S.ans['row:' + r.key]; return `<li class="rg-row ${ra ? 'own' : ''}"><div class="row" style="gap:8px;align-items:baseline"><span class="grow small"><b>${esc(r.merchant || r.name || (r.kind === 'other' ? r.action : t('rgNote_' + r.kind)))}</b> <span class="muted">${esc(fmtShort(r.date))}</span></span><b class="small ${r.sign < 0 ? 'amt-out' : 'amt-in'}">${privacyOn() ? '•••' : (r.sign < 0 ? '−' : '+') + esc(fmtCur(r.cents / 100, r.currency))}</b></div>
            ${seg('row:' + r.key, 'type', [['', 'rgAsGroup'], ...RG_TYPES], ra ? ra.type : '')}${ra && ra.type && ra.type !== 'skip' ? catSel('row:' + r.key, ra) : ''}</li>`; }).join('')}</ul>${rs.length > RG_MAX_ROWS ? `<p class="muted small" style="margin:0">${esc(t('rgMoreRows', { n: rs.length - RG_MAX_ROWS }))}</p>` : ''}` : ''}
        </section>`; }).join('')}
        ${Object.entries(S.cur).map(([c, n]) => `<section class="rg-q clay"><b>${esc(t('rgCur', { n, c }))}</b><p class="muted small" style="margin:0">${esc(t('rgCurHint'))}</p>
          ${seg('cur:' + c, 'cur', [['skip', 'rgSkip'], ['rate', 'rgKeepCur'], ['conv', 'rgConvMain']], S.curMode[c])}
          ${S.curMode[c] === 'rate' || S.curMode[c] === 'conv' ? `<label class="field"><span>${esc(t('fxRateLbl', { c, m: ledgerMain() }))}</span><input class="input" inputmode="decimal" data-rg-rate="${esc(c)}" value="${S.rates[c] ? esc(String(S.rates[c]).replace('.', state.lang === 'es' ? ',' : '.')) : ''}" placeholder="${esc(t('fxNoRate'))}"></label>${S.rates[c] ? `<p class="muted small" style="margin:0">${esc(fxRateTxt(c, S.rates[c]))} · ${esc(t('fxEstimate'))}</p>` : ''}` : ''}</section>`).join('')}
        ${S.q.length ? '' : `<p class="muted">${esc(t('rgNothing'))}</p>`}</div>`;
      const foot = $('.sheet-foot', wref);
      if (foot) foot.innerHTML = S.q.length ? `<p class="muted small" style="margin:0;flex-basis:100%">${miss ? esc(t('rgMissing', { n: miss })) : ''}</p><button class="btn" data-rg="back">${ico('left')} ${esc(t('back'))}</button><button class="btn primary" data-rg="go" ${miss ? 'disabled' : ''}>${ico('check')} ${esc(t('rgImport'))}</button>` : `<button class="btn" data-rg="back">${ico('left')} ${esc(t('back'))}</button>`;
    };
    const load = async input => {
      const f = input.files && input.files[0]; input.value = '';
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) { toast(t('tfFileBig')); return; }
      const d = BCSV.read(await f.text());
      if (!d.format) { toast(t('rgUnknown')); return; }
      const known = new Set(); for (const e of LV.entries) for (const k of e.extIds || []) known.add(k);
      const fresh = d.rows.filter(r => !known.has(r.key));
      S.dupN = d.rows.length - fresh.length;
      S.data = d; S.rows = fresh; S.file = String(f.name || '').slice(0, 120); S.q = BCSV.questions(fresh, ledgerMain()); S.cur = BCSV.currencies(fresh, ledgerMain()); S.ans = {}; S.open = new Set();
      // v1.22: cambio estimado de cada moneda detectada (BCE de hoy o el fijado a mano); se puede corregir
      fxLatest().then(() => { for (const c of Object.keys(S.cur)) if (!S.rates[c]) { const r = fxRateNow(c); if (r > 0) S.rates[c] = FX.roundRate(r); } draw(); });
      // Lo único que se sabe seguro: un pago con tarjeta es un gasto (la categoría la elige el usuario)
      for (const g of S.q) if (g.kind === 'card') S.ans[g.id] = { type: 'expense' };
      S.step = 'ask'; draw(); const sh = $('.sheet', wref); if (sh) sh.scrollTop = 0;
    };
    openModal({
      title: `${ico('upload')} ${esc(t('rgTitle'))}`, cls: 'rg-modal', body: '<div id="rg"></div>', foot: ' ',
      onMount: w => {
        wref = w; draw();
        w.addEventListener('change', e => {
          if (e.target.matches('[data-rg-file]')) { load(e.target); return; }
          if (e.target.matches('[data-rg-cat]')) {
            const id = e.target.dataset.rgCat, a = S.ans[id] || (S.ans[id] = {});
            if (e.target.value === '__new') { S.newCat = id; draw(); const n = $('[data-rg-nc-name]', wref); if (n) n.focus(); return; }
            S.newCat = ''; a.categoryId = e.target.value; draw();
          }
          if (e.target.matches('[data-rg-rate]')) { const v = Number(String(e.target.value).replace(/\s/g, '').replace(',', '.')); S.rates[e.target.dataset.rgRate] = v > 0 && v < 1e7 ? v : 0; draw(); }
        });
      },
      onClick: (e, close) => {
        let el;
        if ((el = e.target.closest('[data-rg-nc]'))) {
          const id = el.dataset.rgNc, a = S.ans[id] || (S.ans[id] = {}), box = el.parentElement, name = $('[data-rg-nc-name]', box).value.trim();
          if (!name) { toast(t('ledgerCatNeedName')); return; }
          const c = { id: uid(), name, icon: $('[data-rg-nc-icon]', box).value.trim() || '🏷️', type: a.type === 'income' ? 'income' : a.type === 'invest' ? 'invest' : 'expense', archived: false };
          LV.cats.push(c); a.categoryId = c.id; S.newCat = ''; ledgerSave(); draw(); return;
        }
        if ((el = e.target.closest('[data-rg-catdel]'))) { const cid = el.dataset.rgCatdel; deleteLedgerCat(cid, () => { for (const a of Object.values(S.ans)) if (a && a.categoryId === cid) a.categoryId = ''; draw(); }); return; }
        if ((el = e.target.closest('[data-rg-set]'))) {
          const id = el.dataset.rgSet, k = el.dataset.k, v = el.dataset.v;
          if (k === 'cur') S.curMode[id.slice(4)] = v;
          else if (id.startsWith('row:') && k === 'type' && !v) delete S.ans[id]; // «Como el grupo»
          else { const a = S.ans[id] || (S.ans[id] = {}); if (k === 'type' && a.type !== v) { a.type = v; a.categoryId = ''; } else a[k] = v; }
          draw(); return;
        }
        if ((el = e.target.closest('[data-rg-split]'))) { const id = el.dataset.rgSplit; if (S.open.has(id)) S.open.delete(id); else S.open.add(id); draw(); return; }
        if (!(el = e.target.closest('[data-rg]'))) return;
        if (el.dataset.rg === 'back') { S.step = 'intro'; draw(); return; }
        if (missing()) return;
        const rates = {}, conv = {}; for (const c of Object.keys(S.cur)) if (S.curMode[c] !== 'skip') { rates[c] = S.rates[c]; if (S.curMode[c] === 'conv') conv[c] = true; }
        const p = BCSV.plan(S.rows, S.ans, rates, LV.entries, ledgerMain(), conv), importId = uid();
        for (const x of p.create) LV.entries.push({ id: uid(), type: x.type, amountCents: x.amountCents, categoryId: x.categoryId, note: rgNote(x).slice(0, 200), method: x.method, date: x.date, recurringId: '', createdAt: Date.now(), extIds: x.extIds, importId, ...(x.extGroup ? { extGroup: x.extGroup } : {}), ...(x.fx ? { fx: { ...x.fx, rate: FX.roundRate(x.fx.rate) } } : {}) });
        // v1.22: cada importación queda como un registro (fecha, hora y archivo) para poder revisarla, editarla o borrarla entera
        if (p.create.length || p.update.length) LV.imports.push({ id: importId, at: Date.now(), file: S.file, format: S.data.format, n: p.create.length, updates: p.update.map(u => ({ id: u.id, addCents: u.addCents, addIds: u.addIds, addFx: u.addFx || 0 })) });
        for (const u of p.update) { const en = LV.entries.find(x => x.id === u.id); if (en) { en.amountCents += u.addCents; if (en.fx && u.addFx) en.fx.cents += u.addFx; en.extIds = [...(en.extIds || []), ...u.addIds]; const m = /\((\d+)\)$/.exec(en.note || ''); if (m) en.note = en.note.replace(/\(\d+\)$/, `(${+m[1] + u.addIds.length})`); } }
        ledgerSave(); close(); render(); sfx('money');
        toast(t('rgDone', { n: p.create.length, u: p.update.length }));
      }
    });
  }

  /* ---------- v1.22: «Registros» — lo importado con «Registrar», con su fecha y hora. Se puede revisar, editar o borrar entero ---------- */
  const rgsWhen = r => new Date(r.at).toLocaleString(state.lang === 'en' ? 'en-GB' : 'es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  // Borra lo que añadió una importación: sus movimientos y lo que sumó a movimientos agrupados de importaciones anteriores
  function undoImport(rec) {
    LV.entries = LV.entries.filter(e => e.importId !== rec.id);
    for (const u of rec.updates || []) {
      const en = LV.entries.find(x => x.id === u.id); if (!en) continue;
      const ids = new Set(u.addIds || []);
      en.extIds = (en.extIds || []).filter(k => !ids.has(k));
      en.amountCents -= u.addCents || 0; if (en.fx && u.addFx) en.fx.cents -= u.addFx;
      const m = /\((\d+)\)$/.exec(en.note || ''); if (m) en.note = en.note.replace(/\(\d+\)$/, `(${Math.max(1, +m[1] - ids.size)})`);
      if (en.amountCents <= 0 || !en.extIds.length) LV.entries = LV.entries.filter(x => x !== en);
    }
    LV.imports = LV.imports.filter(x => x.id !== rec.id);
  }
  function openRegistros() {
    let wref, sel = null;
    const draw = () => {
      const box = $('#rgs', wref); if (!box) return;
      const list = [...LV.imports].sort((a, b) => b.at - a.at), rec = sel && LV.imports.find(x => x.id === sel);
      if (!rec) {
        sel = null;
        box.innerHTML = list.length ? `<p class="muted small" style="margin-top:0">${esc(t('rgsIntro'))}</p><div class="stack" style="gap:10px">${list.map(r => { const n = LV.entries.filter(e => e.importId === r.id).length; return `<button class="create-opt clay" data-rgs-open="${esc(r.id)}"><span class="tool-ico">${ico('doc')}</span><span class="grow"><b>${esc(rgsWhen(r))}</b><br><span class="muted small">${esc(r.file || 'CSV')} · ${esc(t('rgsEntries', { n }))}${(r.updates || []).length ? ' · ' + esc(t('rgsUpdated', { n: r.updates.length })) : ''}</span></span>${ico('right')}</button>`; }).join('')}</div>`
          : `<div class="center" style="padding:20px 0"><span class="tool-ico" style="margin:0 auto 10px">${ico('doc')}</span><p class="muted">${esc(t('rgsEmpty'))}</p><button class="btn primary" data-rgs="new">${ico('upload')} ${esc(t('rgTitle'))}</button></div>`;
        return;
      }
      const es = LV.entries.filter(e => e.importId === rec.id).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)), tot = LED.totals(NET(es));
      box.innerHTML = `<div class="stack" style="gap:12px"><button class="chip" data-rgs="list" style="align-self:flex-start">${ico('left')} ${esc(t('rgsTitle'))}</button>
        <div><b>${esc(rgsWhen(rec))}</b><div class="muted small">${esc(rec.file || 'CSV')}</div></div>
        <div class="kpis ls-kpis" style="margin:0"><div class="kpi clay"><b>${es.length}</b><span>${esc(t('evEntries'))}</span></div><div class="kpi clay"><b class="amt-in">${privacyOn() ? '•••' : cents(tot.income)}</b><span>${esc(t('ledgerIncome'))}</span></div><div class="kpi clay"><b class="amt-out">${privacyOn() ? '•••' : cents(tot.expense)}</b><span>${esc(t('ledgerExpense'))}</span></div></div>
        ${(rec.updates || []).length ? `<p class="muted small" style="margin:0">${esc(t('rgsUpdatedHint', { n: rec.updates.length }))}</p>` : ''}
        ${es.length ? `<p class="muted small" style="margin:0">${esc(t('rgsEditHint'))}</p><ul class="ledger-list">${es.map(e => `<li>${entryRow(e, true)}</li>`).join('')}</ul>` : `<p class="muted small">${esc(t('rgsNoEntries'))}</p>`}
        <button class="btn danger-text block" data-rgs="del">${ico('trash')} ${esc(t('rgsDelAll'))}</button></div>`;
    };
    openModal({
      title: `${ico('doc')} ${esc(t('rgsTitle'))}`, cls: 'wide', body: '<div id="rgs"></div>',
      onMount: w => { wref = w; draw(); },
      onClick: async (e, close) => {
        if (swipeClick(e, close, draw)) return;
        let el;
        if ((el = e.target.closest('[data-rgs-open]'))) { sel = el.dataset.rgsOpen; draw(); const sh = $('.sheet', wref); if (sh) sh.scrollTop = 0; return; }
        if (!(el = e.target.closest('[data-rgs]'))) return;
        const a = el.dataset.rgs;
        if (a === 'list') { sel = null; draw(); return; }
        if (a === 'new') { close(); openRegistrar(); return; }
        if (a === 'del') {
          const rec = LV.imports.find(x => x.id === sel); if (!rec) return;
          if (!(await confirmDialog(t('rgsDelQ', { when: rgsWhen(rec) })))) return;
          undoImport(rec); ledgerSave(); sel = null; draw(); render(); sfx('undo'); toast(t('rgsDeleted'));
        }
      }
    });
  }

  /* ---------- v1.22: Divisas — moneda principal de la Libreta, cambios del BCE y cambios fijados a mano ---------- */
  function openFxSettings() {
    let wref, busy = false, pick = '';
    const used = () => [...new Set([...LV.entries.filter(e => e.fx && e.fx.cur).map(e => e.fx.cur), ...LV.calc.filter(x => x && x.cur).map(x => x.cur), ...Object.keys(fxManual())])].filter(c => c !== ledgerMain()).sort();
    const draw = () => {
      const main = ledgerMain(), l = fxCache.latest, man = fxManual(), list = [...new Set([...used(), ...(pick ? [pick] : [])])].filter(c => c !== main);
      $('#fxs', wref).innerHTML = `<div class="stack" style="gap:14px">
        <label class="field"><span>${esc(t('fxMain'))}</span><select class="input" id="fx-main">${FX.AUTO.map(c => `<option value="${c}" ${c === main ? 'selected' : ''}>${c} · ${esc(fmtCur(1, c, { min: 0, max: 0 }))}</option>`).join('')}</select></label>
        <p class="muted small" style="margin:0">${esc(t('fxMainHint'))}</p>
        <div class="row" style="justify-content:space-between;gap:8px"><span class="muted small">${esc(l ? t('fxSource', { d: fmtDate(l.date) }) : t('fxNoData'))}</span><button class="chip" data-fx="refresh" ${busy ? 'disabled' : ''}>${ico('refresh')} ${esc(t('fxRefresh'))}</button></div>
        ${list.length ? `<div class="stack" style="gap:8px">${list.map(c => { const auto = FX.cross((l || {}).rates, c, main), m = Number(man[c]) || 0; return `<div class="fx-row clay"><div class="grow"><b>${c}</b><span class="muted small">${auto ? esc(t('fxAuto', { r: fxRateTxt(c, auto) })) : esc(t('fxNoAuto'))}</span></div>
          <label class="field fx-man"><span>${esc(t('fxManual'))}</span><input class="input" inputmode="decimal" data-fx-man="${c}" value="${m ? esc(fmtPctIn(m)) : ''}" placeholder="${auto ? esc(fmtPctIn(FX.roundRate(auto))) : '—'}"></label></div>`; }).join('')}</div>` : `<p class="muted small" style="margin:0">${esc(t('fxNoneUsed'))}</p>`}
        <label class="field"><span>${esc(t('fxAdd'))}</span><select class="input" id="fx-add"><option value="">—</option>${FX.ALL.filter(c => c !== main && !list.includes(c)).map(c => `<option value="${c}">${c}</option>`).join('')}</select></label>
        <p class="muted small" style="margin:0">${esc(t('fxManualHint'))}</p></div>`;
    };
    const refresh = async force => { busy = true; draw(); await fxLatest(force); busy = false; if (wref.isConnected) draw(); };
    openModal({
      title: `${ico('globe')} ${esc(t('fxTool'))}`, cls: 'wide', body: '<div id="fxs"></div>',
      onMount: w => {
        wref = w; draw(); refresh(false);
        w.addEventListener('change', async e => {
          const el = e.target;
          if (el.id === 'fx-add') { if (el.value && !gate('fx')) { el.value = ''; return; } pick = el.value; draw(); return; }
          if (el.dataset.fxMan) {
            const v = Number(String(el.value).replace(/\s/g, '').replace(',', '.')), man = { ...fxManual() };
            if (v > 0) man[el.dataset.fxMan] = v; else delete man[el.dataset.fxMan];
            state.ledgerPrefs = { ...(state.ledgerPrefs || {}), fxManual: man }; save(); draw(); render(); return;
          }
          if (el.id === 'fx-main') {
            const from = ledgerMain(), to = el.value; if (to === from) return;
            const l = await fxLatest(); const r = FX.cross((l || {}).rates, from, to);
            if (!r) { toast(t('fxNeedOnline')); el.value = from; return; }
            if (!(await confirmDialog(t('fxMainQ', { a: from, b: to, r: `${fmtCur(1, from, { min: 0, max: 0 })} = ${fmtCur(FX.roundRate(r), to, { min: 2, max: 6 })}` })))) { el.value = from; return; }
            changeMainCurrency(from, to, (l || {}).rates); draw(); render(); toast(t('fxMainDone', { c: to }));
          }
        });
      },
      onClick: e => { if (e.target.closest('[data-fx="refresh"]')) refresh(true); }
    });
  }
  // Cambiar la moneda principal: los movimientos, los repetidos y los presupuestos pasan a la nueva con el cambio de hoy;
  // la calculadora marca sus piezas con la moneda antigua (se siguen convirtiendo solas). Los cambios a mano se borran (eran respecto a la antigua).
  function changeMainCurrency(from, to, rates) {
    const rate = cur => FX.cross(rates, cur, to), r0 = rate(from);
    LV.entries = FX.rebase(LV.entries, from, to, rate).entries;
    LV.recurring = FX.rebase(LV.recurring, from, to, rate).entries;
    LV.budgets = LV.budgets.map(b => { const y = JSON.parse(JSON.stringify(b)), walk = o => { for (const k in o) { if (/cents$/i.test(k) && typeof o[k] === 'number') o[k] = Math.round(o[k] * r0); else if (o[k] && typeof o[k] === 'object') walk(o[k]); } }; walk(y); return y; });
    LV.calc = LV.calc.map(x => (x && !x.cur && (x.kind === 'start' || x.kind === 'fund' || x.kind === 'applied' || x.kind === 'preset') ? { ...x, cur: from } : x));
    state.ledgerPrefs = { ...(state.ledgerPrefs || {}), cur: to, fxManual: {} };
    save(); ledgerSave();
  }

  function openLedgerShare(pre = null) {
    if (!ledgerOpen()) { toast(t('vaultOpenFirst')); return; }
    const td = todayKey(), sp = LED.span(LV.entries);
    const S = pre && pre.ev ? { from: pre.ev.from, to: pre.ev.to, title: pre.ev.name, quick: 'ev:' + pre.ev.id } : { from: td.slice(0, 8) + '01', to: td, title: '', quick: 'm' };
    // Si la franja es un evento, solo entran sus categorías
    const slice = () => { const ev = S.quick.startsWith('ev:') && LV.events.find(x => x.id === S.quick.slice(3)); return ledgerSlice(S.from, S.to, ev ? ev.catIds || [] : []); };
    const quick = v => {
      const pm = addMonths(td.slice(0, 8) + '01', -1);
      return v === 'm' ? [td.slice(0, 8) + '01', td] : v === 'pm' ? [pm, addDays(td.slice(0, 8) + '01', -1)] : v === 'y' ? [td.slice(0, 4) + '-01-01', td] : v === '12' ? [addMonths(td, -12), td] : [sp ? sp.from : td, td];
    };
    const evs = [...LV.events].sort((a, b) => a.from < b.from ? 1 : -1);
    let wref;
    const autoTitle = () => S.title || `${fmtShort(S.from)} – ${fmtShort(S.to)}`;
    const draw = () => {
      const d = slice(), tot = LED.totals(d.entries), friends = (chatData.friends || []).filter(f => f.status === 'accepted');
      $('#lsh', wref).innerHTML = `<div class="stack" style="gap:14px">
        <div class="field"><span>${esc(t('lsRange'))}</span><div class="row wrap" style="gap:6px">${[['m', 'ledThisMonth'], ['pm', 'lsLastMonth'], ['y', 'ledThisYear'], ['12', 'led12m'], ['all', 'ledAll']].map(([v, k]) => `<button class="chip ${S.quick === v ? 'on' : ''}" data-lq="${v}">${esc(t(k))}</button>`).join('')}</div>
          ${evs.length ? `<div class="row wrap" style="gap:6px;margin-top:8px">${evs.map(ev => `<button class="chip ${S.quick === 'ev:' + ev.id ? 'on' : ''}" data-lq="ev:${esc(ev.id)}">${esc(ev.icon || '🗂️')} ${esc(ev.name)}</button>`).join('')}</div>` : ''}
          <div class="row" style="gap:8px;margin-top:8px"><input class="input grow" type="date" id="ls-from" value="${S.from}" aria-label="${esc(t('from'))}"><input class="input grow" type="date" id="ls-to" value="${S.to}" aria-label="${esc(t('to'))}"></div></div>
        <label class="field"><span>${esc(t('lsName'))}</span><input class="input" id="ls-title" maxlength="80" value="${esc(S.title)}" placeholder="${esc(autoTitle())}"></label>
        <div class="kpis ls-kpis" style="margin:0"><div class="kpi clay"><b>${d.entries.length}</b><span>${esc(t('evEntries'))}</span></div><div class="kpi clay"><b class="amt-in">${privacyOn() ? '•••' : cents(tot.income)}</b><span>${esc(t('ledgerIncome'))}</span></div><div class="kpi clay"><b class="amt-out">${privacyOn() ? '•••' : cents(tot.expense)}</b><span>${esc(t('ledgerExpense'))}</span></div></div>
        <button class="btn primary" data-ls="export">${ico('download')} ${esc(t('lsExport'))}</button>
        <section class="clay card"><h3 class="section-title" style="margin-top:0">${ico('lock')} ${esc(t('lsSendTitle'))}</h3><p class="muted small" style="margin-top:0">${esc(t('lsSendHint'))}</p>
          ${!auth ? `<p class="muted small">${esc(t('groupNeedLogin'))}</p>` : !chatData.friends ? `<p class="muted small">${esc(t('groupsLoading'))}</p>` : friends.length ? `<div class="stack" style="gap:8px">${friends.map(f => `<button class="btn block" style="justify-content:flex-start" data-ls-to="${f.user_id}">${avatarHtml(f, 'sm')} ${esc(personName(f))} <span class="muted small">@${esc(f.nametag || '')}</span></button>`).join('')}</div>` : `<p class="muted small" style="margin:0">${esc(t('chatNoFriends'))}</p>`}
        </section></div>`;
    };
    openModal({
      title: `${ico('share')} ${esc(t('lsTool'))}`, cls: 'wide', body: '<div id="lsh"></div>',
      onMount: w => {
        wref = w; draw();
        if (auth) refreshChat(true).then(() => { if (wref.isConnected) draw(); });
        ensureKx().catch(() => {});
        w.addEventListener('change', e => {
          if (e.target.id === 'ls-from' || e.target.id === 'ls-to') { const a = $('#ls-from', w).value, b = $('#ls-to', w).value; if (a && b) { [S.from, S.to] = a <= b ? [a, b] : [b, a]; S.quick = ''; draw(); } }
          if (e.target.id === 'ls-title') S.title = e.target.value.trim();
        });
      },
      onClick: async (e, close, w) => {
        let el;
        if ((el = e.target.closest('[data-lq]'))) {
          const v = el.dataset.lq;
          if (v.startsWith('ev:')) { const ev = LV.events.find(x => x.id === v.slice(3)); if (!ev) return; S.from = ev.from; S.to = ev.to; if (!S.title) S.title = ev.name; }
          else [S.from, S.to] = quick(v);
          S.quick = v; draw(); return;
        }
        const ti = $('#ls-title', w); if (ti) S.title = ti.value.trim();
        if (e.target.closest('[data-ls="export"]')) {
          const d = slice(), title = autoTitle();
          downloadFile(EXP.filename(S.title || 'libreta', S.from, S.to), exportHtml(d, title, S.from, S.to, profileName()));
          sfx('pop'); toast(t('lsExported')); return;
        }
        if ((el = e.target.closest('[data-ls-to]'))) {
          const f = (chatData.friends || []).find(x => x.user_id === el.dataset.lsTo); if (!f) return;
          // La contraseña la eliges tú: tu amigo solo podrá abrir la libreta si la acierta
          askSharePassword(f, async pw => {
            const sealed = await VAULT.pwSeal({ v: 2, title: autoTitle(), from: S.from, to: S.to, by: profileName(), ...slice() }, pw);
            await rpc('kg_ledger_share_pw', { p_to: f.user_id, p_title: autoTitle().slice(0, 80), p_from: S.from, p_to_date: S.to, p_head: sealed.head, p_iv: sealed.body.iv, p_ct: sealed.body.ct, p_proof: sealed.proof });
            sfx('unlock'); toast(t('lsSent', { tag: '@' + (f.nametag || '') })); chatData.at = 0; close();
          });
        }
      }
    });
  }
  function askSharePassword(f, send) {
    openModal({
      title: `${ico('key')} ${esc(t('lsPwTitle'))}`,
      body: `<form class="stack" id="lsp-f" style="gap:12px" autocomplete="off"><p class="muted small" style="margin:0">${esc(t('lsPwSub', { tag: '@' + (f.nametag || '') }))}</p>
        <input class="input" id="lsp-1" type="password" minlength="4" maxlength="64" autocomplete="new-password" placeholder="${esc(t('lsPwNew'))}" aria-label="${esc(t('lsPwNew'))}">
        <input class="input" id="lsp-2" type="password" maxlength="64" autocomplete="new-password" placeholder="${esc(t('vaultPw2'))}" aria-label="${esc(t('vaultPw2'))}">
        <p class="muted small" style="margin:0">${esc(t('lsPwHint'))}</p></form>`,
      foot: `<button class="btn primary block" data-lsp>${ico('lock')} ${esc(t('lsPwSend'))}</button>`,
      onMount: w => { setTimeout(() => $('#lsp-1', w)?.focus(), 200); w.addEventListener('submit', e => { e.preventDefault(); $('[data-lsp]', w).click(); }); },
      onClick: async (e, close, w) => {
        const b = e.target.closest('[data-lsp]'); if (!b) return;
        const a = $('#lsp-1', w).value, c = $('#lsp-2', w).value;
        if (a.length < 4) { toast(t('lsPwShort')); return; }
        if (a !== c) { toast(t('vaultMismatch')); return; }
        b.disabled = true; b.textContent = t('lsPwSending');
        try { await send(a); close(); } catch (err) { b.disabled = false; b.innerHTML = `${ico('lock')} ${esc(t('lsPwSend'))}`; toast(chatErr(err)); }
      }
    });
  }
  // Abrir una libreta compartida con contraseña: hay que acertar la que eligió quien la compartió (5 intentos, luego 15 min)
  function openPwShare(id) {
    const s = (chatData.shares || []).find(x => x.id === id); if (!s) return;
    const tag = s.peer.nametag || s.peer.display_name || '';
    openModal({
      title: `${ico('wallet')} ${esc(s.mine ? t('lsSentTitle', { tag }) : t('lsTitle', { tag }))}`,
      body: `<form class="stack" id="lso-f" style="gap:12px" autocomplete="off"><div class="center vault-ico">${ico('lock')}</div>
        <p class="muted center" style="margin:0">${esc(t(s.mine ? 'lsPwAskMine' : 'lsPwAsk', { tag: '@' + tag }))}</p>
        <input class="input" id="lso-pw" type="password" maxlength="64" autocomplete="off" placeholder="${esc(t('lsPwEnter'))}" aria-label="${esc(t('lsPwEnter'))}"></form>`,
      foot: `<button class="btn primary block" data-lso>${esc(t('vaultOpen'))}</button>`,
      onMount: w => { setTimeout(() => $('#lso-pw', w)?.focus(), 200); w.addEventListener('submit', e => { e.preventDefault(); $('[data-lso]', w).click(); }); },
      onClick: async (e, close, w) => {
        const b = e.target.closest('[data-lso]'); if (!b) return;
        const pw = $('#lso-pw', w).value; if (!pw) { $('#lso-pw', w).focus(); return; }
        b.disabled = true; b.textContent = t('loading');
        let d = null;
        try {
          const rows = await sbFetch(`/rest/v1/kg_ledger_shares?id=eq.${encodeURIComponent(id)}&select=box`);
          const head = rows[0] && rows[0].box; if (!head) throw new Error('gone');
          const r = await rpc('kg_ledger_open', { p_id: id, p_proof: await VAULT.pwProof(pw, head.psalt, head.iter) });
          if (r && r.error === 'locked') toast(t('lsPwLocked', { n: r.minutes }));
          else if (r && r.error) { toast(t('lsPwWrong', { n: r.left })); vibrate([20, 40, 20]); }
          else d = await VAULT.pwOpen(head, r, pw);
        } catch (err) { toast(/gone/.test(err.message) ? t('lsGone') : t('groupError', { e: err.message })); }
        b.disabled = false; b.textContent = t('vaultOpen');
        if (!d) { $('#lso-pw', w).select(); return; }
        close(); sfx('unlock'); showShareDoc(s, d, false);
      }
    });
  }
  // Compartir un evento: con importes solo a un amigo (cifrado); a un chat o grupo solo nombre, fechas y categorías
  function shareEvent(ev) {
    openModal({
      title: `${ico('share')} ${esc(ev.icon || '🗂️')} ${esc(ev.name)}`,
      body: `<div class="stack" style="gap:10px">
        <button class="create-opt clay" data-es="friend"><span class="opt-ico">${ico('lock')}</span><span class="grow"><b>${esc(t('evShareFriend'))}</b><br><span class="muted small">${esc(t('evShareFriendSub'))}</span></span>${ico('right')}</button>
        <button class="create-opt clay" data-es="chat"><span class="opt-ico">${ico('users')}</span><span class="grow"><b>${esc(t('evShareChat'))}</b><br><span class="muted small">${esc(t('evShareChatSub'))}</span></span>${ico('right')}</button></div>`,
      onClick: async (e, close) => {
        const b = e.target.closest('[data-es]'); if (!b) return;
        if (b.dataset.es === 'friend') { close(); openLedgerShare({ ev }); return; }
        if (!auth) { toast(t('groupNeedLogin')); return; }
        close();
        await refreshMyGroups(true);
        const list = myGroups.list || [];
        openModal({
          title: esc(t('evShareChat')),
          body: list.length ? `<div class="stack" style="gap:8px">${list.map(g => `<button class="btn block" style="justify-content:flex-start" data-esg="${esc(g.id)}">${g.chat === 'dm' ? avatarHtml(g.peer || {}, 'sm') : esc(g.icon || '👥')} ${esc(chatName(g))}</button>`).join('')}</div>` : `<p class="muted">${esc(t('evNoChats'))}</p>`,
          onClick: async (e2, close2) => {
            const g = e2.target.closest('[data-esg]'); if (!g) return;
            g.disabled = true;
            const cats = (ev.catIds || []).map(id => catOf(id)).filter(Boolean).map(c => ({ name: catName(c), icon: c.icon }));
            try { await rpc('kg_post', { p_group: g.dataset.esg, p_kind: 'share', p_body: '', p_payload: { type: 'event', event: { name: ev.name, icon: ev.icon || '🗂️', from: ev.from, to: ev.to, ...(evDays(ev) ? { days: evDays(ev) } : {}), cats } } }); sfx('pop'); toast(t('evShared')); close2(); }
            catch (err) { g.disabled = false; toast(chatErr(err)); }
          }
        });
      }
    });
  }
  // «Libreta de @nametag» en Chat: cada vez que se entra se pide desbloquear tu Libreta (PIN, huella o contraseña)
  let pendingShare = null;
  function openLedgerShareView(id) {
    if (!VAULT.available() || !state.ledgerVault) { toast(t('lsNeedVault')); state.ui.tab = 'ledger'; save(); render(); return; }
    ledgerLock(); pendingShare = id;
    state.ui.tab = 'ledger'; save(); render(); window.scrollTo(0, 0);
    toast(t('lsUnlockToView'));
  }
  async function showLedgerShare(id) {
    const s = (chatData.shares || []).find(x => x.id === id);
    let d = null, err = '';
    try {
      const me = await ensureKx();
      const rows = await sbFetch(`/rest/v1/kg_ledger_shares?id=eq.${encodeURIComponent(id)}&select=box`);
      if (!rows[0]) throw new Error('gone');
      d = await VAULT.openSealed(rows[0].box, auth.uid, me.priv);
    } catch (e) { err = /not for me|OperationError/.test(String(e && (e.message || e.name))) ? t('lsCantOpen') : /gone/.test(e.message) ? t('lsGone') : t('groupError', { e: e.message }); }
    showShareDoc(s || { id }, d, true, err);
  }
  // Visor de una libreta compartida (las antiguas se abren con tu Libreta; las nuevas, con la contraseña de quien la compartió)
  function showShareDoc(s, d, relock, err = '') {
    const id = s.id;
    const html = d ? exportHtml(d, d.title || s.title || t('lsTool'), d.from, d.to, d.by || '') : '';
    const tag = s.peer ? (s.peer.nametag || s.peer.display_name) : '';
    openModal({
      title: `${ico('wallet')} ${esc(s.mine ? t('lsSentTitle', { tag }) : t('lsTitle', { tag }))}`, cls: 'wide ls-view',
      body: err ? `<p class="muted center">${esc(err)}</p>` : `<iframe class="ls-frame" sandbox title="${esc(t('lsTool'))}"></iframe>`,
      foot: `${html ? `<button class="btn" data-lv="save">${ico('download')} ${esc(t('lsSave'))}</button>` : ''}<button class="chip danger-text" data-lv="hide">${esc(t('lsHide'))}</button>`,
      onMount: w => { const f = $('.ls-frame', w); if (f) f.srcdoc = html; },
      onClose: () => { if (relock) { ledgerLock(); state.ui.tab = 'chat'; save(); } render(); },
      onClick: async (e, close) => {
        const b = e.target.closest('[data-lv]'); if (!b) return;
        if (b.dataset.lv === 'save') { downloadFile(EXP.filename(s.title || 'libreta', s.range_from, s.range_to), html); return; }
        if (b.dataset.lv === 'hide' && await confirmDialog(t('lsHideQ'))) { try { await rpc('kg_ledger_hide', { p_id: id }); chatData.at = 0; close(); } catch (err2) { toast(chatErr(err2)); } }
      }
    });
  }

  // Evento recibido en un chat → se añade a tu Libreta con tus categorías del mismo nombre
  function addSharedEvent(v) {
    if (!ledgerOpen()) { toast(t('evAddNeedOpen')); return; }
    const names = new Set((v.cats || []).map(c => String(c.name || '').toLowerCase()));
    const catIds = LV.cats.filter(c => names.has(catName(c).toLowerCase())).map(c => c.id);
    const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
    if (!isDate(v.from) || !isDate(v.to)) return;
    LV.events.push({ id: uid(), name: String(v.name || t('evTitle')).slice(0, 40), icon: String(v.icon || '🗂️').slice(0, 8), from: v.from, to: v.to, catIds, createdAt: Date.now() });
    ledgerSave(); sfx('unlock'); toast(t('evAdded', { name: v.name || '' })); render();
  }
  /* ---------- Eventos: una franja de fechas con sus categorías (p. ej. «Vacaciones»), para entender por qué un mes se gasta más ---------- */
  const evDays = ev => (ev && Array.isArray(ev.days) && ev.days.length ? ev.days : null);
  const evRangeDays = (a, b) => { const out = []; if (!a || !b) return out; if (b < a) [a, b] = [b, a]; for (let k = a, i = 0; k <= b && i < 400; k = addDays(k, 1), i++) out.push(k); return out; };
  /* v1.25: elegir los días de un evento en el calendario de Organización. Solo se ven los días de color (tipos de día y
     eventos); se tocan para elegirlos o, con «Pintar», se colorean ahí mismo (eso se queda en Organización aunque borres el evento). */
  function openEvDayPicker(days0, done) {
    const sel = new Set(days0 || []), td = todayKey();
    let ym = (days0 && days0.length ? days0[days0.length - 1] : td).slice(0, 7), paint = '', wref;
    const ws = tfWs(), wd = Array.from({ length: 7 }, (_, i) => fmtDate(addDays('2026-10-11', (ws + i) % 7), { weekday: 'narrow' }));
    const grid = () => {
      const first = ym + '-01', off = (parseKey(first).getDay() - ws + 7) % 7, n = new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate(), cells = [];
      for (let i = 0; i < off; i++) cells.push('<span class="evp-cell empty"></span>');
      for (let d = 1; d <= n; d++) {
        const k = ym + '-' + String(d).padStart(2, '0'), cs = tfDayColors(k);
        cells.push(`<button type="button" class="evp-cell ${cs.length ? 'dk' : ''} ${sel.has(k) ? 'on' : ''} ${k === td ? 'today' : ''}" data-evp-k="${k}" style="${tfTintStyle(cs, 55)}" aria-pressed="${sel.has(k)}"><span>${d}</span>${sel.has(k) ? ico('check', 'xs') : ''}</button>`);
      }
      return cells.join('');
    };
    const draw = () => {
      const kinds = tfDayKinds(), mDays = Object.keys(state.calDayK).filter(k => k.startsWith(ym));
      $('#evp', wref).innerHTML = `<p class="muted small" style="margin-top:0">${esc(t(paint ? 'evpPaintHint' : 'evpHint'))}</p>
        <div class="seg seg-sm" role="group" style="display:flex;margin-bottom:10px">${[['', 'evpSelect'], ['p', 'evpPaint']].map(([v, k]) => `<button type="button" data-evp-mode="${v}" class="${(paint ? 'p' : '') === v ? 'on' : ''}" style="flex:1">${ico(v ? 'brush' : 'check', 'xs')} ${esc(t(k))}</button>`).join('')}</div>
        <div class="row wrap" style="gap:6px;margin-bottom:10px">${kinds.map(d => `<button type="button" class="chip sm ${paint === d.id ? 'on' : ''}" data-evp-kind="${esc(d.id)}"><i class="dk-dot" style="background:${tfColor(d.color)}"></i> ${esc(paint ? tfDkName(d) : t('evpAllOf', { k: tfDkName(d) }))}</button>`).join('')}</div>
        <div class="cal-head"><button type="button" class="icon-btn sm" data-evp-m="-1" aria-label="${esc(t('ledgerPrev'))}">${ico('left')}</button><b class="grow center">${esc(fmtDate(ym + '-01', { month: 'long', year: 'numeric' }))}</b><button type="button" class="icon-btn sm" data-evp-m="1" aria-label="${esc(t('ledgerNext'))}">${ico('right')}</button></div>
        <div class="evp-grid">${wd.map(x => `<span class="evp-wd">${esc(x)}</span>`).join('')}${grid()}</div>
        <p class="muted small center" style="margin:10px 0 0">${esc(t('evDaysPicked', { n: sel.size }))}${mDays.length ? '' : ' · ' + esc(t('evpNoColor'))}</p>`;
    };
    openModal({
      title: `${ico('calendar')} ${esc(t('evDaysPick'))}`, body: '<div id="evp"></div>',
      foot: `<button type="button" class="btn" data-evp-clear>${esc(t('evpClear'))}</button><button type="button" class="btn primary" data-evp-ok>${esc(t('done'))}</button>`,
      onMount: w => { wref = w; draw(); },
      onClick: (e, close) => {
        let el;
        if ((el = e.target.closest('[data-evp-m]'))) { const d = parseKey(ym + '-01'); d.setMonth(d.getMonth() + +el.dataset.evpM); ym = keyOf(d).slice(0, 7); draw(); return; }
        if ((el = e.target.closest('[data-evp-mode]'))) { paint = el.dataset.evpMode ? (tfDayKinds()[0] || {}).id || '' : ''; draw(); return; }
        if ((el = e.target.closest('[data-evp-kind]'))) {
          const id = el.dataset.evpKind;
          if (paint) paint = id;
          else { const ks = Object.keys(state.calDayK).filter(k => k.startsWith(ym) && tfDkIds(k).includes(id)); if (!ks.length) toast(t('evpNoneOf')); ks.forEach(k => sel.add(k)); }
          draw(); return;
        }
        if ((el = e.target.closest('[data-evp-k]'))) {
          const k = el.dataset.evpK;
          if (paint) { if (tfDkToggle(k, paint)) { tfSave(false); sel.add(k); } else if (!tfDkIds(k).includes(paint)) return; }
          else if (sel.has(k)) sel.delete(k); else sel.add(k);
          sfx('tap'); draw(); return;
        }
        if (e.target.closest('[data-evp-clear]')) { sel.clear(); draw(); return; }
        if (e.target.closest('[data-evp-ok]')) { close(); done([...sel].sort()); }
      },
      onClose: () => render()
    });
  }
  const eventEntries = ev => { const dl = evDays(ev), set = dl && new Set(dl); return LED.inRange(LV.entries, ev.from, ev.to).filter(e => (!set || set.has(e.date)) && (!(ev.catIds || []).length || ev.catIds.includes(e.categoryId))); };
  const evNDays = ev => { const dl = evDays(ev); return dl ? dl.length : Math.max(1, diffDays(ev.from, ev.to) + 1); };
  const eventState = ev => { const k = todayKey(); return k < ev.from ? 'soon' : k > ev.to ? 'done' : 'now'; };
  function eventCard(ev) {
    const tot = LED.totals(NET(eventEntries(ev))), st = eventState(ev), priv = privacyOn();
    return `<button class="ev-card clay" data-ev-open="${esc(ev.id)}"><span class="ev-ico">${esc(ev.icon || '🗂️')}</span><span class="grow" style="min-width:0"><b class="ellipsis">${esc(ev.name)}</b><span class="muted small">${esc(fmtShort(ev.from))} – ${esc(fmtShort(ev.to))}${evDays(ev) ? ' · ' + esc(t('evDays', { n: evDays(ev).length })) : ''} · <span class="ev-st ${st}">${esc(t('evSt_' + st))}</span></span></span>
      <span class="ev-amt"><b class="amt-out">${priv ? '•••' : cents(tot.expense)}</b>${tot.income ? `<small class="amt-in">+${priv ? '•••' : cents(tot.income)}</small>` : ''}</span></button>`;
  }
  // Tira de eventos en la Libreta: los que están en curso y la «base de datos» de los ya terminados
  function eventsStripHtml() {
    if (!LV.events.length) return '';
    const evs = [...LV.events].sort((a, b) => a.from < b.from ? 1 : -1), now = evs.filter(e => eventState(e) !== 'done'), done = evs.filter(e => eventState(e) === 'done');
    return `<section class="ev-strip"><h2 class="section-title">${ico('folder')} ${esc(t('evTitle'))}</h2>${now.length ? `<div class="ev-list">${now.map(eventCard).join('')}</div>` : ''}
      ${done.length ? `<details class="ev-done" ${now.length ? '' : 'open'}><summary class="muted small">${esc(t('evFinished', { n: done.length }))}</summary><div class="ev-list">${done.map(eventCard).join('')}</div></details>` : ''}</section>`;
  }
  function openLedgerEvents() {
    let wref;
    const draw = () => {
      $('#evl', wref).innerHTML = `<p class="muted small" style="margin-top:0">${esc(t('evHint'))}</p>${LV.events.length ? `<div class="ev-list">${[...LV.events].sort((a, b) => a.from < b.from ? 1 : -1).map(eventCard).join('')}</div>` : `<p class="muted center">${esc(t('evEmpty'))}</p>`}`;
    };
    openModal({
      title: `${ico('folder')} ${esc(t('evTitle'))}`, body: '<div id="evl"></div>',
      foot: `<button class="btn primary block" data-ev-new>${ico('plus')} ${esc(t('evNew'))}</button>`,
      onMount: w => { wref = w; draw(); },
      onClick: (e, close) => {
        let el;
        if (e.target.closest('[data-ev-new]')) { close(); openEventEditor(); return; }
        if ((el = e.target.closest('[data-ev-open]'))) { close(); openEvent(el.dataset.evOpen); }
      }
    });
  }
  /* ---------- Contactos y Deudas (v1.25): personas de las deudas, lo que te debe o le debes a cada una ---------- */
  function openContacts(view = 'list') {
    let wref, adding = false;
    const priv = () => privacyOn(), money = c => (priv() ? '•••' : cents(c));
    const draw = () => {
      const box = $('#ct', wref); if (!box) return;
      const debts = DEBT.list(LV.entries), per = new Map(DEBT.byPerson(debts).map(r => [r.key, r])), tot = DEBT.totals(debts);
      const sumHtml = `<div class="bud-nums ct-sum"><div><span>${esc(t('ctOwesYou'))}</span><b class="amt-in">${money(tot.favor)}</b></div><div><span>${esc(t('ctYouOwe'))}</span><b class="amt-out">${money(tot.contra)}</b></div><div><span>${esc(t('ctFees'))}</span><b>${money(tot.extra)}</b></div></div>`;
      const debtRow = d => { const x = LV.entries.find(y => y.id === d.eid) || {}, c = catOf(x.categoryId);
        const st = d.status === 'done' ? (d.extra ? t('dbDoneExtra', { a: money(d.extra) }) : t('dbDone')) : t(d.side === 'favor' ? 'ctRowFavor' : 'ctRowContra', { a: money(d.left) });
        return `<button type="button" class="lk-opt" data-ct-entry="${esc(d.eid)}"><div class="lk-row"><span class="led-ico" aria-hidden="true">${esc(c.icon || '')}</span><span class="grow" style="min-width:0"><b class="ellipsis">${esc(whoLabel(d.who))} · ${esc(x.note || catName(c))}</b><span class="muted small">${esc(fmtShort(d.date))} · ${esc(st)}</span></span><b class="${d.status === 'done' ? '' : d.side === 'favor' ? 'amt-in' : 'amt-out'}">${money(d.status === 'done' ? d.expected : d.left)}</b></div></button>`; };
      if (view === 'debts') {
        const tab = state.ui.ctTab || 'favor', L = debts.filter(d => tab === 'done' ? d.status === 'done' : d.status === 'open' && d.side === tab);
        box.innerHTML = `<div class="row" style="gap:8px;margin-bottom:10px"><button class="icon-btn sm" data-ct-back aria-label="${esc(t('back'))}">${ico('left')}</button><h3 class="grow" style="margin:0">${esc(t('ctDebts'))}</h3></div>${sumHtml}
          <div class="seg" role="tablist" style="margin:12px 0">${[['favor', 'ctTabFavor'], ['contra', 'ctTabContra'], ['done', 'ctTabDone']].map(([v, k]) => `<button type="button" role="tab" data-ct-tab="${v}" class="${tab === v ? 'on' : ''}" aria-selected="${tab === v}">${esc(t(k))}</button>`).join('')}</div>
          ${L.length ? `<div class="lk-list">${L.map(debtRow).join('')}</div>` : `<p class="muted center">${esc(t('ctNoDebts'))}</p>`}`;
        return;
      }
      if (view !== 'list') {
        const c = contactById(view); if (!c) { view = 'list'; draw(); return; }
        const r = per.get('c:' + c.id), L = debts.filter(d => d.key === 'c:' + c.id);
        box.innerHTML = `<div class="row" style="gap:8px;margin-bottom:10px"><button class="icon-btn sm" data-ct-back aria-label="${esc(t('back'))}">${ico('left')}</button><h3 class="grow ellipsis" style="margin:0">${esc(c.name || '@' + c.tag)}</h3></div>
          <label class="field"><span>${esc(t('dbWhoName'))}</span><input class="input" id="ct-name" maxlength="40" value="${esc(c.name || '')}"></label>
          ${c.tag ? `<p class="muted small">${ico('user', 'xs')} @${esc(c.tag)} · ${esc(t('ctTagHint'))}</p>` : ''}
          <div class="bud-nums ct-sum"><div><span>${esc(t('ctOwesYou'))}</span><b class="amt-in">${money(r ? r.favor : 0)}</b></div><div><span>${esc(t('ctYouOwe'))}</span><b class="amt-out">${money(r ? r.contra : 0)}</b></div><div><span>${esc(t('ctFees'))}</span><b>${money(r ? r.extra : 0)}</b></div></div>
          <h4 style="margin:14px 0 8px">${esc(t('ctDebts'))}</h4>${L.length ? `<div class="lk-list">${L.map(debtRow).join('')}</div>` : `<p class="muted small">${esc(t('ctNoDebts'))}</p>`}
          <button class="btn danger sm" data-ct-del="${esc(c.id)}" style="margin-top:14px">${ico('trash')} ${esc(t('ctDelete'))}</button>`;
        return;
      }
      const list = [...LV.contacts].sort((a, b) => String(a.name || a.tag).localeCompare(String(b.name || b.tag)));
      const friends = (chatData.friends || []).filter(f => f.status === 'accepted' && f.nametag && !LV.contacts.some(c => c.tag === String(f.nametag).toLowerCase()));
      box.innerHTML = `<p class="muted small" style="margin-top:0">${esc(t('ctHint'))}</p>${sumHtml}
        <button class="btn block" data-ct-debts style="margin:12px 0">${ico('users')} ${esc(t('ctDebts'))}</button>
        ${list.length ? `<div class="lk-list">${list.map(c => { const r = per.get('c:' + c.id), net = r ? r.favor - r.contra : 0;
          return `<button type="button" class="lk-opt" data-ct-open="${esc(c.id)}"><div class="lk-row"><span class="led-ico" aria-hidden="true">${ico('user')}</span><span class="grow" style="min-width:0"><b class="ellipsis">${esc(c.name || '@' + c.tag)}</b><span class="muted small">${c.tag ? '@' + esc(c.tag) + ' · ' : ''}${esc(net > 0 ? t('ctRowFavor', { a: money(net) }) : net < 0 ? t('ctRowContra', { a: money(-net) }) : t('ctEven'))}</span></span><b class="${net > 0 ? 'amt-in' : net < 0 ? 'amt-out' : ''}">${net ? money(Math.abs(net)) : ''}</b></div></button>`; }).join('')}</div>` : `<p class="muted center">${esc(t('ctEmpty'))}</p>`}
        ${adding ? `<div class="db-part clay stack" style="gap:8px;margin-top:12px"><input class="input" id="ct-new" maxlength="40" placeholder="${esc(t('dbWhoName'))}">${friends.length ? `<select class="input" id="ct-friend"><option value="">${esc(t('ctFromFriend'))}</option>${friends.map(f => `<option value="${esc(String(f.nametag).toLowerCase())}">@${esc(f.nametag)} · ${esc(personName(f))}</option>`).join('')}</select>` : ''}<button class="btn primary" data-ct-save>${esc(t('save'))}</button></div>` : ''}`;
    };
    openModal({
      title: `${ico('users')} ${esc(t('ctTitle'))}`, body: '<div id="ct"></div>',
      foot: `<button class="btn primary block" data-ct-add>${ico('plus')} ${esc(t('ctAdd'))}</button>`,
      onMount: w => { wref = w; draw(); },
      onInput: e => { if (e.target.id === 'ct-name') { const c = contactById(view); if (c) { c.name = e.target.value.trim().slice(0, 40); ledgerSave(); } } },
      onClick: (e, close) => {
        let el;
        if (e.target.closest('[data-ct-add]')) { view = 'list'; adding = true; draw(); setTimeout(() => { const i = $('#ct-new', wref); if (i) i.focus(); }, 30); return; }
        if (e.target.closest('[data-ct-save]')) {
          const tag = ($('#ct-friend', wref) || {}).value || '', name = $('#ct-new', wref).value.trim();
          if (!tag && !name) { toast(t('dbNeedWho')); return; }
          contactFor(tag ? { tag } : { name }); if (tag && name) { const c = LV.contacts.find(x => x.tag === tag); if (c) c.name = name; }
          adding = false; ledgerSave(); draw(); render(); return;
        }
        if (e.target.closest('[data-ct-debts]')) { view = 'debts'; draw(); return; }
        if (e.target.closest('[data-ct-back]')) { view = 'list'; draw(); render(); return; }
        if ((el = e.target.closest('[data-ct-tab]'))) { state.ui.ctTab = el.dataset.ctTab; save(); draw(); return; }
        if ((el = e.target.closest('[data-ct-open]'))) { view = el.dataset.ctOpen; adding = false; draw(); return; }
        if ((el = e.target.closest('[data-ct-entry]'))) { const x = LV.entries.find(y => y.id === el.dataset.ctEntry); if (x) { close(); openEntry(x); } return; }
        if ((el = e.target.closest('[data-ct-del]'))) {
          const id = el.dataset.ctDel;
          if (DEBT.list(LV.entries).some(d => d.key === 'c:' + id)) { toast(t('ctHasDebts')); return; }
          LV.contacts = LV.contacts.filter(c => c.id !== id); ledgerSave(); view = 'list'; draw(); render();
        }
      }
    });
  }
  /* ---------- Presupuesto (v1.19): mensual global y, en opciones avanzadas, por categorías ----------
     La diferencia de cada mes (lo que sobra o lo que te pasas) se va sumando desde la fecha que elijas, cada mes con su presupuesto de entonces. */
  const BUD_GLOBAL = 'budget-global';
  const budUi = () => { const u = state.ui.bud && typeof state.ui.bud === 'object' ? state.ui.bud : {}; state.ui.bud = { sel: u.sel || BUD_GLOBAL, from: u.from && typeof u.from === 'object' ? u.from : {} }; return state.ui.bud; };
  const budName = b => b.id === BUD_GLOBAL ? t('budGlobal') : (b.name || t('budByCats'));
  const budYmLabel = ym => fmtDate(ym + '-01', { month: 'long', year: 'numeric' });
  const budCls = v => v < 0 ? 'amt-out' : 'amt-in';
  const budSign = c => (c > 0 ? '+' : c < 0 ? '−' : '') + cents(Math.abs(c));
  function openBudgets() {
    let wref;
    const draw = () => {
      const u = budUi(), list = [...LV.budgets].sort((a, b) => (a.id === BUD_GLOBAL ? -1 : b.id === BUD_GLOBAL ? 1 : String(a.name).localeCompare(String(b.name))));
      const box = $('#bud', wref);
      if (!list.length) { box.innerHTML = `<div class="bud-empty"><span class="opt-ico">${ico('budget')}</span><p class="muted small">${esc(t('budEmpty'))}</p><button class="btn primary" data-bud="new-global">${ico('plus')} ${esc(t('budCreate'))}</button></div>`; return; }
      const b = list.find(x => x.id === u.sel) || list[0], nowYm = todayKey().slice(0, 7), first = LED.budgetFirst(b) || nowYm;
      const from = /^\d{4}-\d{2}$/.test(u.from[b.id] || '') ? u.from[b.id] : first;
      const rows = from <= nowYm ? LED.budgetRows(b, NET(LV.entries), from, nowYm) : [], cur = rows.find(r => r.ym === nowYm), acc = rows.length ? rows[rows.length - 1].acc : 0;
      const pct = cur && cur.budget ? Math.min(100, cur.spent / cur.budget * 100) : 0;
      const catsTxt = b.catIds && b.catIds.length ? b.catIds.map(id => { const c = LV.cats.find(x => x.id === id); return c ? `${c.icon || ''} ${catName(c)}` : ''; }).filter(Boolean).join(', ') : t('budAllExpenses');
      box.innerHTML = `${list.length > 1 ? `<div class="seg bud-seg" role="tablist">${list.map(x => `<button type="button" role="tab" aria-selected="${x.id === b.id}" data-bud-sel="${esc(x.id)}" class="${x.id === b.id ? 'on' : ''}">${esc(budName(x))}</button>`).join('')}</div>` : ''}
        <section class="bud-card clay"><div class="row" style="gap:10px"><div class="grow"><div class="calc-eyebrow">${esc(t('budThisMonth'))} · ${esc(budYmLabel(nowYm))}</div><strong class="bud-name">${esc(budName(b))}</strong><div class="muted small">${esc(catsTxt)}</div></div><button class="icon-btn sm" data-bud="edit" aria-label="${esc(t('budEdit'))}" title="${esc(t('budEdit'))}">${ico('edit')}</button></div>
          ${cur ? `<div class="bud-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><span style="width:${pct}%" class="${cur.diff < 0 ? 'over' : ''}"></span></div>
          <div class="bud-nums"><div><span>${esc(t('budBudget'))}</span><b>${cents(cur.budget)}</b></div><div><span>${esc(t('budSpent'))}</span><b>${cents(cur.spent)}</b></div><div><span>${esc(t(cur.diff < 0 ? 'budOver' : 'budLeft'))}</span><b class="${budCls(cur.diff)}">${cents(Math.abs(cur.diff))}</b></div></div>` : `<p class="muted small">${esc(t('budNoneThisMonth'))}</p>`}</section>
        <section class="bud-card clay"><label class="field"><span>${esc(t('budFrom'))}</span><input class="input" type="month" data-bud-from value="${esc(from)}" max="${nowYm}"></label>
          <div class="bud-acc"><span>${esc(t('budAccLabel', { m: budYmLabel(from) }))}</span><b class="${budCls(acc)}">${budSign(acc)}</b><small class="muted">${esc(t(acc < 0 ? 'budAccOver' : 'budAccSaved'))}</small></div>
          ${rows.length ? `<div class="calc-table-wrap"><table class="calc-table"><thead><tr>${['budMonth', 'budBudget', 'budSpent', 'calcDiff', 'budAcc'].map(k => `<th scope="col">${esc(t(k))}</th>`).join('')}</tr></thead><tbody>${[...rows].reverse().map(r => `<tr><th scope="row">${esc(budYmLabel(r.ym))}</th><td>${cents(r.budget)}</td><td>${cents(r.spent)}</td><td class="${budCls(r.diff)}">${budSign(r.diff)}</td><td class="${budCls(r.acc)}">${budSign(r.acc)}</td></tr>`).join('')}</tbody></table></div>` : `<p class="muted small">${esc(t('budNoRows'))}</p>`}</section>`;
    };
    openModal({
      title: `${ico('budget')} ${esc(t('budTitle'))}`, cls: 'wide', body: '<div id="bud" class="stack"></div>',
      foot: `<button class="btn" data-bud="new-cats">${ico('tag')} ${esc(t('budNewCats'))}</button>`,
      onMount: w => { wref = w; draw(); },
      onInput: e => { const el = e.target; if (!el.matches('[data-bud-from]') || !/^\d{4}-\d{2}$/.test(el.value)) return; const u = budUi(); u.from[u.sel] = el.value; save(); draw(); $('[data-bud-from]', wref)?.focus(); },
      onClick: e => {
        let el;
        if ((el = e.target.closest('[data-bud-sel]'))) { budUi().sel = el.dataset.budSel; save(); draw(); return; }
        if (!(el = e.target.closest('[data-bud]'))) return;
        const a = el.dataset.bud, u = budUi();
        if (a === 'new-global') openBudgetEditor(null, true, draw);
        else if (a === 'new-cats') openBudgetEditor(null, false, draw);
        else if (a === 'edit') { const b = LV.budgets.find(x => x.id === u.sel) || LV.budgets[0]; if (b) openBudgetEditor(b, b.id === BUD_GLOBAL, draw); }
      }
    });
  }
  // Crear o editar un presupuesto: importes por fecha (el «+» verde añade un nuevo importe desde un mes) y, si es por categorías, cuáles
  function openBudgetEditor(b, global, done) {
    const nowYm = todayKey().slice(0, 7), isNew = !b;
    const f = b ? JSON.parse(JSON.stringify(b)) : { id: global ? BUD_GLOBAL : uid(), name: '', catIds: [], versions: [{ from: nowYm, amountCents: 0 }] };
    if (isNew && global && LV.budgets.some(x => x.id === BUD_GLOBAL)) { const g = LV.budgets.find(x => x.id === BUD_GLOBAL); return openBudgetEditor(g, true, done); }
    const vRow = v => `<div class="calc-change-row bud-ver" data-bv><label class="field"><span>${esc(t('budVerFrom'))}</span><input class="input" type="month" data-bv-from value="${esc(v.from || nowYm)}"></label><label class="field"><span>${esc(t('budVerAmount'))}</span><input class="input" inputmode="decimal" data-bv-amount value="${v.amountCents ? esc(fmtPctIn(v.amountCents / 100)) : ''}" placeholder="800"></label><button type="button" class="icon-btn sm calc-del" data-bv-del aria-label="${esc(t('budVerDel'))}" title="${esc(t('budVerDel'))}">${ico('x')}</button></div>`;
    openModal({
      title: `${ico('budget')} ${esc(t(isNew ? (global ? 'budCreate' : 'budNewCats') : 'budEdit'))}`, cls: 'calc-sheet',
      body: `<div class="stack" style="gap:16px">${global ? `<p class="muted small" style="margin:0">${esc(t('budGlobalHint'))}</p>` : `<label class="field"><span>${esc(t('budNameLbl'))}</span><input class="input" id="bud-name" maxlength="40" value="${esc(f.name)}" placeholder="${esc(t('budNamePh'))}"></label>
        <div class="field"><span>${esc(t('budCatsLbl'))}</span><div class="row wrap" style="gap:8px">${LV.cats.filter(c => (c.type === 'expense' || c.type === 'both') && (!c.archived || f.catIds.includes(c.id))).map(c => `<label class="check-chip tgl"><input type="checkbox" data-bud-cat="${esc(c.id)}" ${f.catIds.includes(c.id) ? 'checked' : ''}><span>${esc(c.icon || '')} ${esc(catName(c))}</span></label>`).join('')}</div></div>`}
        <div class="calc-changes"><p class="calc-fine">${esc(t('budVersHint'))}</p><div class="calc-change-rows" id="bud-vers">${f.versions.map(vRow).join('')}</div></div></div>`,
      foot: `<button type="button" class="calc-plus" data-bv-add aria-label="${esc(t('budVerAdd'))}" title="${esc(t('budVerAdd'))}">${ico('plus')}</button>${isNew ? '' : `<button class="btn calc-danger" data-bud-del>${ico('trash')} ${esc(t('calcDelete'))}</button>`}<button class="btn calc-blue" data-bud-save>${esc(t('calcSave'))}</button>`,
      onClick: async (e, close, w) => {
        if (e.target.closest('[data-bv-add]')) { $('#bud-vers', w).insertAdjacentHTML('beforeend', vRow({ from: nowYm })); $('[data-bv]:last-child [data-bv-amount]', w).focus(); return; }
        if (e.target.closest('[data-bv-del]')) { if ($$('[data-bv]', w).length > 1) e.target.closest('[data-bv]').remove(); else toast(t('budVerOne')); return; }
        if (e.target.closest('[data-bud-del]')) { if (!(await confirmDialog(t('budDelQ', { name: budName(f) })))) return; LV.budgets = LV.budgets.filter(x => x.id !== f.id); ledgerSave(); close(); done && done(); toast(t('deleted')); return; }
        if (!e.target.closest('[data-bud-save]')) return;
        const versions = [];
        for (const r of $$('[data-bv]', w)) {
          const from = $('[data-bv-from]', r).value, c = LED.parseCents($('[data-bv-amount]', r).value);
          if (!/^\d{4}-\d{2}$/.test(from) || c == null) { toast(t('budVerFill')); return; }
          if (versions.some(v => v.from === from)) { toast(t('budVerDup')); return; }
          versions.push({ from, amountCents: c });
        }
        if (!global) {
          f.name = $('#bud-name', w).value.trim().slice(0, 40); f.catIds = $$('[data-bud-cat]', w).filter(x => x.checked).map(x => x.dataset.budCat);
          if (!f.name) { toast(t('calcNeedName')); return; }
          if (!f.catIds.length) { toast(t('budNeedCat')); return; }
        }
        f.versions = versions.sort((a, b) => a.from < b.from ? -1 : 1);
        if (f.id !== BUD_GLOBAL && !gate('budgetCats')) return;
        const i = LV.budgets.findIndex(x => x.id === f.id); if (i >= 0) LV.budgets[i] = f; else LV.budgets.push(f);
        budUi().sel = f.id; ledgerSave(); close(); done && done(); toast(t('budSaved')); sfx('money');
      }
    });
  }
  function openEventEditor(ev = null) {
    const isNew = !ev, k = todayKey();
    const f = ev ? JSON.parse(JSON.stringify(ev)) : { name: '', icon: '🏖️', from: addDays(k, -7), to: k, catIds: [] };
    // v1.25: días sueltos elegidos en el calendario de Organización (f.days); sin ellos, el evento es de Desde a Hasta
    if (!evDays(f)) delete f.days;
    // v1.24: «Colorear días»: el rango del evento se tiñe en el calendario de Organización, en el de la Libreta o en los dos
    f.paint = { on: false, color: '#7c5cff', org: true, led: true, ...(f.paint || {}) };
    const icons = ['🏖️', '✈️', '🎄', '🎂', '💍', '🏠', '🚗', '🎓', '🩺', '🎉', '🛠️', '🗂️'];
    const draw = w => {
      $('#eve', w).innerHTML = `<div class="stack" style="gap:16px">
        <label class="field"><span>${esc(t('evName'))}</span><input class="input" id="ev-name" maxlength="40" value="${esc(f.name)}" placeholder="${esc(t('evNamePh'))}"></label>
        <div class="field"><span>${esc(t('habitIcon'))}</span><div class="emoji-grid" style="max-height:110px">${icons.map(i => `<button type="button" data-ev-icon="${i}" class="${f.icon === i ? 'on' : ''}">${i}</button>`).join('')}</div></div>
        <div class="field"><div class="row" style="gap:12px"><label class="field grow"><span>${esc(t('ledFrom'))}</span><input class="input" id="ev-from" type="date" value="${f.from}" ${f.days ? 'disabled' : ''}></label><label class="field grow"><span>${esc(t('ledTo'))}</span><input class="input" id="ev-to" type="date" value="${f.to}" ${f.days ? 'disabled' : ''}></label></div>
          <div class="row wrap" style="gap:8px;margin-top:8px"><button type="button" class="btn sm" data-ev-days>${ico('calendar')} ${esc(t(f.days ? 'evDaysEdit' : 'evDaysPick'))}</button>${f.days ? `<span class="muted small grow">${esc(t('evDaysPicked', { n: f.days.length }))}</span><button type="button" class="chip" data-ev-days-clear>${esc(t('evDaysRange'))}</button>` : `<span class="muted small grow">${esc(t('evDaysPickHint'))}</span>`}</div></div>
        <div class="field"><span>${esc(t('evCats'))}</span><div class="muted small">${esc(t('evCatsHint'))}</div>
          <div class="row wrap" style="gap:8px;margin-top:6px">${LV.cats.filter(c => !c.archived || f.catIds.includes(c.id)).map(c => `<label class="check-chip tgl"><input type="checkbox" data-ev-cat="${esc(c.id)}" ${f.catIds.includes(c.id) ? 'checked' : ''}><span>${esc(c.icon)} ${esc(catName(c))}</span></label>`).join('')}</div></div>
        <div class="stack" style="gap:10px"><label class="row" style="gap:14px"><span class="switch"><input type="checkbox" id="ev-paint" ${f.paint.on ? 'checked' : ''}><span></span></span><span class="grow"><b>${esc(t('evPaint'))}</b><br><span class="muted small">${esc(t('evPaintHint'))}</span></span></label>
          ${f.paint.on ? `<div class="tf-rect stack" style="gap:10px"><div class="row" style="gap:12px"><input class="tf-swatch sm" type="color" id="ev-pcolor" value="${tfColor(f.paint.color)}" aria-label="${esc(t('tfColor'))}"><span class="grow small">${esc(t('evPaintWhere'))}</span></div>
            <div class="row wrap" style="gap:8px"><label class="check-chip tgl"><input type="checkbox" id="ev-porg" ${f.paint.org ? 'checked' : ''}><span>${ico('calendar')} ${esc(t('tabCalendar'))}</span></label><label class="check-chip tgl"><input type="checkbox" id="ev-pled" ${f.paint.led ? 'checked' : ''}><span>${ico('wallet')} ${esc(t('tabLedger'))}</span></label></div></div>` : ''}</div></div>`;
    };
    const read = w => {
      f.name = $('#ev-name', w).value.trim(); if (!f.days) { f.from = $('#ev-from', w).value || f.from; f.to = $('#ev-to', w).value || f.to; } f.catIds = [...w.querySelectorAll('[data-ev-cat]')].filter(i => i.checked).map(i => i.dataset.evCat);
      f.paint.on = $('#ev-paint', w).checked;
      if ($('#ev-pcolor', w)) { f.paint.color = tfColor($('#ev-pcolor', w).value); f.paint.org = $('#ev-porg', w).checked; f.paint.led = $('#ev-pled', w).checked; }
    };
    openModal({
      title: esc(t(isNew ? 'evNew' : 'evEdit')), body: '<div id="eve"></div>',
      foot: `${isNew ? '' : `<button class="btn" data-ev="del">${ico('trash')}</button>`}<button class="btn primary" data-ev="save">${esc(t(isNew ? 'create' : 'save'))}</button>`,
      onMount: w => { draw(w); w.addEventListener('change', e => { if (e.target.id === 'ev-paint') { read(w); draw(w); } }); },
      onClick: async (e, close, w) => {
        let el;
        if ((el = e.target.closest('[data-ev-icon]'))) { read(w); f.icon = el.dataset.evIcon; draw(w); return; }
        if (e.target.closest('[data-ev-days-clear]')) { read(w); delete f.days; draw(w); return; }
        if (e.target.closest('[data-ev-days]')) { read(w); openEvDayPicker(f.days || (isNew ? [] : evRangeDays(f.from, f.to)), list => { if (list.length) { f.days = list; f.from = list[0]; f.to = list[list.length - 1]; } else delete f.days; draw(w); }); return; }
        if (!(el = e.target.closest('[data-ev]'))) return;
        if (el.dataset.ev === 'del') { if (await confirmDialog(t('evDeleteQ', { name: ev.name }))) { LV.events = LV.events.filter(x => x.id !== ev.id); ledgerSave(); close(); render(); } return; }
        read(w);
        if (!f.name) { toast(t('evNeedName')); $('#ev-name', w).focus(); return; }
        if (f.to < f.from) [f.from, f.to] = [f.to, f.from];
        if (isNew) LV.events.push({ id: uid(), ...f, createdAt: Date.now() }); else { const cur = LV.events.find(x => x.id === ev.id); if (!f.days) delete cur.days; Object.assign(cur, f); }
        ledgerSave(); close(); render(); sfx('complete'); toast(t('saved'));
      }
    });
  }
  // Ficha de un evento: lo gastado e ingresado, por categorías y todos sus movimientos
  function openEvent(id) {
    const ev = LV.events.find(x => x.id === id); if (!ev) return;
    let mode = 'io', wref;
    const days = evNDays(ev);
    const draw = () => {
      const list = eventEntries(ev).sort((a, b) => a.date < b.date ? 1 : -1), nl = NET(list), tot = LED.totals(nl), priv = privacyOn();
      const segs = mode === 'io' ? [{ label: t('ledgerIncome'), value: tot.income, color: IN_C }, { label: t('ledgerExpense'), value: tot.expense, color: OUT_C }].filter(s => s.value)
        : LED.byCategory(nl, mode).map((r, i) => { const c = catOf(r.id); return { label: `${c.icon} ${catName(c)}`, value: r.cents, color: PIE_COLORS[i % PIE_COLORS.length] }; });
      $('#evd', wref).innerHTML = `<p class="muted" style="margin-top:0">${esc(fmtDate(ev.from))} – ${esc(fmtDate(ev.to))} · ${esc(t(evDays(ev) ? 'evDaysPicked' : 'evDays', { n: days }))} · <span class="ev-st ${eventState(ev)}">${esc(t('evSt_' + eventState(ev)))}</span></p>
        <div class="month-sum"><div><span>${esc(t('ledgerExpense'))}</span><b class="amt-out">${priv ? '•••' : cents(tot.expense)}</b></div><div><span>${esc(t('ledgerIncome'))}</span><b class="amt-in">${priv ? '•••' : cents(tot.income)}</b></div><div><span>${esc(t('evPerDay'))}</span><b>${priv ? '•••' : cents(Math.round(tot.expense / days))}</b></div></div>
        ${list.length ? `<div class="seg seg-sm" role="group" style="margin-top:14px;display:flex">${[['io', 'ledIo'], ['expense', 'ledByCatOut'], ['income', 'ledByCatIn']].map(([v, k]) => `<button data-evm="${v}" class="${mode === v ? 'on' : ''}" style="flex:1">${esc(t(k))}</button>`).join('')}</div>
          <div class="${priv ? 'priv' : ''}">${mode === 'io' ? donutChart(segs, t('ledBalance'), cents(tot.net)) : donutChart(segs, t(mode === 'expense' ? 'ledgerExpense' : 'ledgerIncome'))}</div>` : ''}
        <h3 class="section-title" style="margin-top:18px">${esc(t('evEntries', { n: list.length }))}</h3>
        ${list.length ? `<div class="stack" style="gap:6px">${list.map(x => entryRow(x, true)).join('')}</div><p class="muted small center">${esc(t('swipeHint'))}</p>` : `<p class="muted">${esc(t('evNoEntries'))}</p>`}`;
    };
    openModal({
      title: `${esc(ev.icon)} ${esc(ev.name)}`, cls: 'wide', body: '<div id="evd"></div>',
      foot: `<button class="btn" data-evx="share">${ico('share')} ${esc(t('share'))}</button><button class="btn" data-evx="edit">${ico('edit')} ${esc(t('edit'))}</button>`,
      onMount: w => { wref = w; w._redraw = draw; draw(); },
      onClick: (e, close) => {
        let el;
        if ((el = e.target.closest('[data-evm]'))) { mode = el.dataset.evm; draw(); return; }
        if (swipeClick(e, () => { close(); }, draw)) return;
        if (e.target.closest('[data-evx="edit"]')) { close(); openEventEditor(ev); }
        if (e.target.closest('[data-evx="share"]')) shareEvent(ev);
      }
    });
  }

  // Repeticiones: ver y detener (los movimientos ya creados se conservan)
  function openLedgerRecs() {
    let wref;
    const draw = () => {
      const recs = LV.recurring.filter(r => !r.archived);
      $('#lr', wref).innerHTML = recs.length ? `<div class="stack" style="gap:8px">${recs.map(r => { const c = catOf(r.categoryId); return `<div class="row ledger-item static"><span class="led-ico" aria-hidden="true">${esc(c.icon)}</span><span class="grow"><b>${esc(r.note || catName(c))}</b><span class="muted small">${esc(t('repeat_' + r.every))} · ${esc(t('ledgerSince', { d: fmtShort(r.from) }))}${r.to ? ' · ' + esc(t('ledgerUntil', { d: fmtShort(r.to) })) : ''}</span></span><b class="${r.type === 'income' ? 'amt-in' : 'amt-out'}">${cents(r.amountCents)}</b><button class="icon-btn sm" data-lr-stop="${r.id}" aria-label="${esc(t('ledgerRecStop'))}" title="${esc(t('ledgerRecStop'))}">${ico('x')}</button></div>`; }).join('')}</div><p class="muted small">${esc(t('ledgerRecHint'))}</p>` : `<p class="muted">${esc(t('ledgerRecEmpty'))}</p>`;
    };
    openModal({
      title: `${ico('repeat')} ${esc(t('ledgerRecs'))}`, body: '<div id="lr"></div>', onMount: w => { wref = w; draw(); },
      onClick: async e => {
        const el = e.target.closest('[data-lr-stop]'); if (!el) return;
        const r = LV.recurring.find(x => x.id === el.dataset.lrStop); if (!r) return;
        if (!(await confirmDialog(t('ledgerRecStopQ')))) return;
        r.archived = true;
        LV.entries = LV.entries.filter(x => !(x.recurringId === r.id && x.date > todayKey()));
        ledgerSave(); draw(); render();
      }
    });
  }

  /* ---------- energía del día (1–5) ---------- */
  const ENERGY = ['🪫', '😴', '🙂', '😃', '🔥'];
  function energyHtml() {
    const v = state.energy[todayKey()] || 0;
    return `<div class="clay card energy-card" data-w="energy"><div class="row"><b class="grow">${esc(t('energyToday'))}</b><span class="muted small">${v ? esc(t('energyLvl', { n: v })) : ''}</span></div>
      <div class="energy-row">${ENERGY.map((e, i) => `<button class="energy-btn ${v === i + 1 ? 'on' : ''}" data-energy="${i + 1}" aria-label="${i + 1}"><span>${e}</span><small>${i + 1}</small></button>`).join('')}</div></div>`;
  }

  /* ---------- v1.25: valoración del día del 0 al 10 (state.dayRate[fecha] = { r }) ---------- */
  const dayRateOf = k => { const v = state.dayRate[k]; return v && Number.isInteger(v.r) && v.r >= 0 && v.r <= 10 ? v.r : null; };
  function setDayRate(k, n) { if (dayRateOf(k) === n) delete state.dayRate[k]; else state.dayRate[k] = { r: n }; save(); }
  // Color de la nota: de rojo (0) a verde (10) pasando por ámbar
  const rateColor = n => `hsl(${Math.round(n * 12)}, 72%, 52%)`;
  const rateRowHtml = k => { const v = dayRateOf(k); return `<div class="rate-row day-rate" role="group" aria-label="${esc(t('rateTitle'))}">${Array.from({ length: 11 }, (_, n) => `<button type="button" class="rate-b ${v === n ? 'on' : ''}" data-drate="${n}" aria-pressed="${v === n}" style="--rc:${rateColor(n)}">${n}</button>`).join('')}</div>`; };
  function openRateDay(k) {
    openModal({ title: esc(t('rateDayTitle', { d: fmtDate(k, { weekday: 'long', day: 'numeric', month: 'long' }) })), body: `<div id="rd">${rateRowHtml(k)}</div>`,
      onClick: (e, close) => { const b = e.target.closest('[data-drate]'); if (b) { setDayRate(k, +b.dataset.drate); sfx('tap'); close(); render(); } } });
  }
  function dayRateHtml() {
    const k = todayKey(), y = addDays(k, -1), v = dayRateOf(k), vy = dayRateOf(y);
    return `<div class="clay card rate-card" data-w="dayrate"><div class="row"><b class="grow">${esc(t('rateToday'))}</b>${v != null ? `<span class="rate-big" style="--rc:${rateColor(v)}">${v}<small>/10</small></span>` : ''}</div>${rateRowHtml(k)}
      ${vy == null ? `<button class="link-btn small" data-act="rate-yday">${esc(t('rateYesterday'))}</button>` : ''}</div>`;
  }

  /* ---------- vista «Hoy» ---------- */
  const TOD = ['morning', 'afternoon', 'night', 'any'];
  const TOD_ICON = { morning: '☀️', afternoon: '🌤️', night: '🌙', any: '🕐' };
  function todayStatus(h) {
    const k = todayKey();
    if (isQuit(h)) return { due: true, done: !cnt(h, k), quit: true };
    if (h.freq === 'daily') {
      if (isOffDay(h, k) && !cnt(h, k)) return { due: false };
      return { due: true, done: cnt(h, k) >= dayGoal(h, k) };
    }
    return { due: !periodDone(h, k) || cnt(h, k) > 0, done: periodDone(h, k) };
  }
  function progressText(h) {
    const k = todayKey();
    if (isQuit(h)) return cnt(h, k) ? t('quitSlippedToday') : t('quitDays', { n: currentStreak(h) });
    if (isAmount(h)) return `${fmtNum(periodSum(h, k))} / ${fmtNum(h.target)} ${h.unit || ''}${h.freq !== 'daily' ? ' · ' + unitLabel(h) : ''}`;
    if (subMode(h) && h.freq === 'daily') return subMeta(h, k);
    if (h.freq === 'daily') return h.target > 1 ? `${cnt(h, k)} / ${h.target}` : (cnt(h, k) ? t('done') : t('pending'));
    return t(h.freq === 'weekly' ? 'thisWeek' : 'thisMonth', { a: periodSum(h, k), b: h.target });
  }
  function todayRow(h) {
    const st = todayStatus(h), c = hColor(h);
    const action = st.quit
      ? `<button class="chip ${cnt(h, todayKey()) ? 'on' : ''}" data-today="slip" data-id="${h.id}">${esc(t('relapse'))}</button>`
      : `<button class="today-check ${st.done ? 'on' : ''}" data-today="tap" data-id="${h.id}" aria-label="${esc(t('markDone'))}">${icoOrN(h, isAmount(h) && !st.done ? ico('plus') : ico('check'))}</button>`;
    return `<div class="today-row clay ${st.done && !st.quit ? 'done' : ''}" data-trow="${h.id}" style="${habitVars(c)}">
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
    let html = (hidW('dayrate') ? '' : dayRateHtml()) + (hidW('pet') ? '' : petCardHtml()) + (hidW('energy') ? '' : energyHtml());
    if (activeVacation()) html += `<div class="banner clay">🏖️<span class="grow"><b>${esc(t('vacActive', { date: fmtDate(activeVacation().to) }))}</b></span></div>`;
    if (di.perfect && items.length) html += `<div class="perfect-banner clay">🎉 <b class="grow">${esc(t('perfectToday'))}</b><span class="muted small">+${fmtPts(di.cpts)} pts</span></div>`;
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
    html += insightsHtml();
    return html;
  }

  /* ---------- rutinas ---------- */
  const routineSteps = r => r.habitIds.map(getHabit).filter(h => h && !h.archived && !isQuit(h));
  function routineCard(r) {
    const steps = routineSteps(r), doneN = steps.filter(h => todayStatus(h).done).length;
    return `<div class="routine-card clay" data-rid="${r.id}"><span style="font-size:28px">${esc(r.icon || '🔁')}</span>
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
    const markDone = h => { if (subModeAt(h, todayKey())) { openSubDay(h, todayKey()); return; } const k = todayKey(); const goal = isAmount(h) ? h.target : dayGoal(h); if (cnt(h, k) < goal) setCount(h, k, h.freq === 'daily' || isAmount(h) ? goal : cnt(h, k) + 1); };
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
    mente: [['Meditar', 'Meditate', '🧘', { duration: 10, timeOfDay: 'morning' }], ['Escribir un diario', 'Journal', '📝', { timeOfDay: 'night' }], ['Gratitud: 3 cosas', 'Gratitude: 3 things', '🙏', { timeOfDay: 'night' }], ['Redes antes de dormir', 'Social media before bed', '📵', { kind: 'quit' }], ['Desconectar una hora', 'Unplug for an hour', '🌙', { timeOfDay: 'night' }]],
    hogar: [['Hacer la cama', 'Make the bed', '🛏️', { timeOfDay: 'morning' }], ['Ordenar 10 minutos', 'Tidy up for 10 minutes', '🧹', { duration: 10 }], ['Cocinar en casa', 'Cook at home', '🍳', { freq: 'weekly', target: 4 }], ['Regar las plantas', 'Water the plants', '🪴', { freq: 'weekly', target: 2 }], ['Limpieza a fondo', 'Deep clean', '🧽', { freq: 'monthly', target: 1 }]],
    social: [['Llamar a la familia', 'Call your family', '📞', { freq: 'weekly', target: 1 }], ['Quedar con amigos', 'Meet up with friends', '🍻', { freq: 'weekly', target: 1 }], ['Un detalle con alguien', 'Do something kind for someone', '💌', { freq: 'weekly', target: 2 }], ['Tabaco', 'Smoking', '🚭', { kind: 'quit' }]]
  };
  const PACK_ICONS = { salud: '❤️', estudio: '🎓', finanzas: '💶', deporte: '💪', mente: '🧠', hogar: '🏠', social: '🤝' };
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
      body: `<div class="stack" style="gap:12px">${opt('habit', '➕', t('newHabit'), t('createHabitSub'))}${opt('pack', '📦', t('fromTemplate'), t('createPackSub'))}${opt('challenge', '🏁', t('newChallenge'), t('createChallengeSub'))}${opt('project', '🎯', t('newProject'), t('createProjectSub'))}${opt('routine', '🔁', t('newRoutine'), t('createRoutineSub'))}${opt('vacation', '🏖️', t('vacTitle'), t('vacHintShort'))}</div>`,
      onClick: (e, close) => {
        const b = e.target.closest('[data-create]'); if (!b) return;
        if (['pack', 'challenge'].includes(b.dataset.create) && !gateAdd('habits', activeHabitCount())) { close(); return; }
        close();
        ({ habit: () => openHabitEditor(), project: () => openProjectEditor(), pack: openPacks, challenge: openChallenges, routine: () => openRoutineEditor(), vacation: openVacations })[b.dataset.create]();
      }
    });
  }
  function packSub(x) {
    if (x.kind === 'quit') return t('kindQuit');
    const pk = x.freq === 'weekly' ? 'periodWeek' : x.freq === 'monthly' ? 'periodMonth' : 'periodDay', per = ' / ' + t(pk);
    let s = x.measure === 'amount' ? `${fmtNum(x.target)} ${unitL(x.unit)}${per}` : (x.freq || 'daily') !== 'daily' || x.target > 1 ? t('timesPer', { n: x.target, period: t(pk) }) : t('freqDaily');
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
          if (!gateAdd('habits', activeHabitCount() + sel.size - 1)) return;
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
        if (!gateAdd('habits', activeHabitCount())) return;
        state.habits.push(newHabitFrom(L2(es, en), icon, { ...x, challenge: { tid: id, days, start: todayKey() } }));
        save(); close(); state.ui.tab = 'habits'; render(); toast(t('challengeStarted'));
      }
    });
  }
  // Días cumplidos desde que empezó el reto
  function challengeProgress(h) {
    const c = h.challenge; if (!c) return 0;
    const end = isQuit(h) ? addDays(todayKey(), -1) : todayKey(); let n = 0;
    for (let k = c.start; k <= end; k = addDays(k, 1)) if (isQuit(h) ? !cnt(h, k) : cnt(h, k) >= dayGoal(h, k)) n++;
    return n;
  }
  function checkChallenge(h, silent = false) {
    const c = h.challenge; if (!c || c.done) return;
    if (challengeProgress(h) < c.days) return;
    c.done = todayKey();
    const card = { id: h.id + '_' + c.start, hid: h.id, name: h.name, icon: h.icon, days: c.days, start: c.start, end: todayKey(), serial: ++state.serial };
    state.challengeCards.push(card); save();
    if (!silent) setTimeout(() => whenFree(() => sfx('levelup') || openTrophy(challengeCardHtml(card), t('challengeDone'), t('challengeDoneMsg', { name: h.name }), () => trophyCanvas('challenge', card))), 400);
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
  // v1.15: cartas secretas retiradas a petición de Izan. Lo ya ganado sigue guardado en state.secrets (no se borra), pero no se muestra.
  const SECRETS = [];
  const SECRETS_RETIRED = [
    ['perfectWeek', '🌟', () => pointsInfo().bestPerfectRun >= 7],
    ['perfect30', '💎', () => pointsInfo().perfectDays >= 30],
    ['earlyBird', '🌅', () => countTimes(tm => tm < '08:00') >= 15],
    ['nightOwl', '🦉', () => countTimes(tm => tm >= '23:00') >= 15],
    ['comeback', '🔄', () => state.habits.some(hasComeback)],
    ['collector', '🃏', () => perfectCount() >= 5 || legacyTotal() >= 25],
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
      if (!silent) setTimeout(() => whenFree(() => sfx('unlock') || openTrophy(secretCardHtml(id, icon), t('secretUnlocked'), t('secd_' + id), () => trophyCanvas('secret', { id, icon }))), 450);
    }
  }
  function secretCardHtml(id, icon, date = null) {
    const when = date || state.secrets[id], on = !!when;
    return `<div class="ccard scard ${on ? '' : 'locked'}" style="--t:#c4b5fd;--t2:#2e1065"><div class="cc-in">
      <div class="cc-top">${esc(t('secretCard'))}</div>
      <div class="cc-seal" style="font-size:12cqw">${on ? icon : '?'}</div>
      <div class="cc-title">${on ? esc(t('sec_' + id)) : '???'}</div>
      <div class="cc-name" style="font-size:3.6cqw;text-transform:none;line-height:1.3">${on ? esc(t('secd_' + id)) : esc(t('secretHidden'))}</div>
      <div class="cc-dates">${on ? esc(fmtShort(when)) : '· · ·'}</div>
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
        <div class="card-view-cap"><div style="font-size:22px;font-weight:var(--fw-title);margin-bottom:4px">${esc(title)}</div><small>${esc(msg)}</small></div>
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
    for (let k = week; k <= last; k = addDays(k, 1)) { const d = dayInfo(k); if (d.perfect) perfect++; pts += d.cpts; }
    const rates = state.habits.filter(h => !h.archived).map(h => rate(h, 7, last)).filter(r => r != null);
    return { perfect, pts, rate: rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length * 100) : null };
  }
  function openReview(week, auto = false) {
    const prev = state.reviews[week] || {}, s = weekSummary(week);
    openModal({
      title: `📝 ${esc(t('reviewTitle'))}`,
      body: `<p class="muted" style="margin-top:0">${esc(t('reviewWeek', { a: fmtDate(week, { day: 'numeric', month: 'short' }), b: fmtDate(addDays(week, 6), { day: 'numeric', month: 'short' }) }))}</p>
        <div class="kpis" style="margin-bottom:14px"><div class="kpi clay"><b>${s.rate == null ? '—' : s.rate + '%'}</b><span>${esc(t('kpiRate'))}</span></div><div class="kpi clay"><b>${s.perfect}</b><span>${esc(t('perfectDays'))}</span></div><div class="kpi clay"><b>${fmtPts(s.pts)}</b><span>${esc(t('ptsEarned'))}</span></div></div>
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
        save(); close(); toast(t('saved')); if (state.ui.tab === 'habits' && habitsView() === 'today') render();
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
    days.forEach(k => { const d = dayInfo(k); if (d.perfect) perfect++; pts += d.cpts; if (state.energy[k]) en.push(state.energy[k]); });
    H.forEach(h => { if (isQuit(h)) return; const L = state.logs[h.id] || {}; for (const k in L) if (k >= from && k <= to && L[k] > 0) { entries += isAmount(h) ? 1 : L[k]; act.add(k); } });
    const rates = H.map(h => rate(h, n, to)).filter(r => r != null);
    const rateP = rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length * 100) : null;
    const D = H.filter(h => h.freq === 'daily');
    const linePts = days.map(k => { const sc = D.map(h => dayScore(h, k)).filter(v => v != null); return { label: fmtDate(k, { day: 'numeric', month: 'short' }), v: sc.length ? sc.reduce((a, b) => a + b, 0) / sc.length * 100 : null }; });
    const cards = []; for (const [r, v] of Object.entries(state.perfectMastery)) if (v.date >= from && v.date <= to) cards.push(`👑 ${t('perfectSeries')} · ${t('rank_' + r)}`);
    for (const h of state.habits) for (const [r, v] of Object.entries(state.mastery[h.id] || {})) if (v.date >= from && v.date <= to) cards.push(`${h.icon} ${h.name} · ${t('rank_' + r)}`);
    const reviews = Object.entries(state.reviews).filter(([w]) => w >= addDays(from, -6) && w <= to).sort();
    const monthName = fmtDate(from, { month: 'long', year: 'numeric' });
    const base = new URL('.', location.href).href;
    const r = document.documentElement;
    const kpi = (v, l) => `<div class="kpi clay"><b>${v}</b><span>${esc(l)}</span></div>`;
    const wdBars = t('weekdaysShort').split(',').map((l, i) => { let o = 0, ok = 0; days.forEach(k => { if (wdOf(k) !== i) return; D.forEach(h => { const s = dayScore(h, k); if (s != null) { o++; if (s >= 1) ok++; } }); }); return { label: l, v: o ? ok / o * 100 : 0 }; });
    const html = `<!doctype html><html lang="${state.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>KeepGoing · ${esc(monthName)}</title>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Quicksand:wght@400;500;600;700&family=Nunito+Sans:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&display=swap"><link rel="stylesheet" href="${base}css/app.css">
      <style>body{padding:28px;-webkit-print-color-adjust:exact;print-color-adjust:exact}.rep{max-width:960px;margin:0 auto}.rep h1{font-size:40px;margin:0;text-transform:capitalize}.rep h2{font-size:20px;margin:26px 0 12px}
      .chart-grid{grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}@page{size:A4;margin:10mm}@media print{.no-print{display:none}body{padding:0}.clay{break-inside:avoid}}</style></head>
      <body><div class="rep">
        <div class="row" style="justify-content:space-between;align-items:flex-end;flex-wrap:wrap"><div><div class="muted" style="font-weight:var(--fw-label);letter-spacing:.15em">KEEPGOING</div><h1>${esc(t('reportOf', { m: monthName }))}</h1>${state.contract ? `<div class="muted">${esc(state.contract.name)}</div>` : ''}</div><div class="no-print"><button class="btn primary" id="rep-print">${esc(t('reportSave'))}</button></div></div>
        <h2>${esc(t('reportSummary'))}</h2>
        <div class="kpis">${kpi(rateP == null ? '—' : rateP + '%', t('kpiRate'))}${kpi(perfect, t('perfectDays'))}${kpi(fmtPts(pts), t('ptsEarned'))}${kpi(entries, t('kpiTotal'))}${kpi(act.size, t('kpiActiveDays'))}${kpi(en.length ? fmtNum(en.reduce((a, b) => a + b, 0) / en.length) + '/5' : '—', t('energyAvg'))}</div>
        <div class="chart-grid"><section class="chart-card clay"><h3>${esc(t('chartDaily'))}</h3>${lineChart(linePts, { min: 0, max: 100, fmt: v => Math.round(v) + '%' })}</section>
          <section class="chart-card clay"><h3>${esc(t('chartWeekday'))}</h3>${barChart(wdBars, { max: 100, fmt: v => Math.round(v) + '%' })}</section></div>
        <h2>${esc(t('chartTable'))}</h2>
        <div class="clay card"><table class="tbl"><thead><tr><th>${esc(t('colHabit'))}</th><th class="num">${esc(t('kpiRate'))}</th><th class="num">${esc(t('colStreak'))}</th><th class="num">${esc(t('colBest'))}</th></tr></thead><tbody>${H.map(h => { const rr = rate(h, n, to); return `<tr><td>${esc(h.icon)} ${esc(h.name)}</td><td class="num">${rr == null ? '—' : Math.round(rr * 100) + '%'}</td><td class="num">${currentStreak(h)}</td><td class="num">${bestStreak(h)}</td></tr>`; }).join('')}</tbody></table></div>
        ${cards.length ? `<h2>${esc(t('reportCards'))}</h2><div class="clay card">${cards.map(c => `<div class="entry">${esc(c)}</div>`).join('')}</div>` : ''}
        ${reviews.length ? `<h2>${esc(t('reviewsTitle'))}</h2>${reviews.map(([w, v]) => `<div class="clay card" style="margin-bottom:12px"><b>${esc(fmtDate(w, { day: 'numeric', month: 'long' }))} · ${v.score}/10</b>${v.good ? `<p>👍 ${esc(v.good)}</p>` : ''}${v.adjust ? `<p>🔧 ${esc(v.adjust)}</p>` : ''}</div>`).join('')}` : ''}
        <p class="muted small center" style="margin-top:26px">KeepGoing · ${esc(fmtDate(todayKey()))}</p>
      </div></body></html>`;
    const win = window.open('', '_blank');
    if (!win) { toast(t('reportBlocked')); return; }
    win.document.open(); win.document.write(html); win.document.close();
    // La CSP bloquea scripts y manejadores en línea: la impresión se enlaza desde aquí
    const pb = win.document.getElementById('rep-print'); if (pb) pb.addEventListener('click', () => win.print());
    setTimeout(() => { try { win.print(); } catch (e) { /* nada */ } }, 1000);
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
        try { toast(t('photoUploading')); await uploadPhoto(p, 'after', e.target.files[0]); toast(t('avatarSaved')); close(); render(); } catch (err) { toast(t('photoError', { e: err.message })); }
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

  /* =========================================================
     FASE 2 — testigo, mascota, perfil público, recordatorios y retos con amigos
     ========================================================= */
  const VAPID_PUBLIC = 'BLmyC7BbfuxW4GX0i2kFInHfYEeJ0AkodsU3xAnpudE76_bPuOESuaTZfN9XUrnKgI9UVPrOXC_aeK473pLxMDM';
  let publicMode = false; // vista de perfil público: no se pinta la app
  const stripHtml = s => String(s).replace(/<[^>]+>/g, '');
  const firstName = () => ((state.contract && state.contract.name) || (auth && auth.email) || '').split(/[\s@]/)[0];

  /* ---------- testigo del contrato (el email sale desde tu correo) ---------- */
  // Testigo: crea (una vez por periodo de contrato) un enlace para que firme y abre el correo
  async function witnessInvite(c) {
    const w = c && c.witness; if (!w || !w.email) return;
    let link = null;
    if (auth) {
      try {
        if (!w.token || w.period !== c.signedAt) {
          await ensureToken();
          const snap = { name: c.name, signedAt: c.signedAt, endsAt: c.endsAt, level: c.level || state.commitment, g: c.g || 'm', sig: safeSig(c.sig), lang: state.lang };
          const rows = await sbFetch('/rest/v1/kg_witness', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ contract: snap }) });
          w.token = rows[0].id; w.period = c.signedAt; delete w.sig; delete w.signedName; delete w.signedAt; save();
        }
        link = `${APP_URL}?w=${w.token}`;
      } catch (e) { toast(t('syncError', { e: e.message })); }
    }
    const subject = t('witnessSubject', { name: c.name });
    const body = link ? t('witnessLinkBody', { w: w.name || '', name: c.name, start: fmtDate(c.signedAt), end: fmtDate(c.endsAt), link })
      : t('witnessBody', { w: w.name || '', name: c.name, start: fmtDate(c.signedAt), end: fmtDate(c.endsAt), text: stripHtml(contractText(c)), url: APP_URL });
    const href = `mailto:${encodeURIComponent(w.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    // El correo se abre con un toque (en iPhone no se puede abrir solo tras esperar a la nube)
    openModal({
      title: `📧 ${esc(t('witnessTitle'))}`,
      body: `<p style="margin-top:0">${esc(t(link ? 'witnessLinkReady' : auth ? 'witnessNoLink' : 'witnessLinkNeedLogin', { w: w.name || w.email }))}</p>${link ? `<input class="input" readonly value="${esc(link)}">` : ''}`,
      foot: `<a class="btn primary" href="${esc(href)}" data-m="mail">📧 ${esc(t('witnessOpenMail'))}</a>${link ? `<button class="btn" data-m="copy">${esc(t('copy'))}</button>` : ''}`,
      onClick: async (e, close) => {
        if (e.target.closest('[data-m="copy"]')) { try { await navigator.clipboard.writeText(link); toast(t('copied')); } catch (err) { /* nada */ } }
        if (e.target.closest('[data-m="mail"]')) setTimeout(close, 400);
      }
    });
  }
  // ¿Ha firmado ya el testigo? (se comprueba al sincronizar)
  async function checkWitness() {
    const c = state.contract, w = c && c.witness;
    if (!auth || !w || !w.token || w.sig || w.period !== c.signedAt) return;
    await ensureToken();
    const rows = await sbFetch(`/rest/v1/kg_witness?id=eq.${encodeURIComponent(w.token)}&select=witness_name,witness_sig,signed_at`);
    const r = rows && rows[0];
    if (r && r.signed_at && safeSig(r.witness_sig)) {
      w.sig = r.witness_sig; w.signedName = r.witness_name; w.signedAt = r.signed_at.slice(0, 10);
      save(); render(); toast(t('witnessSignedToast', { name: r.witness_name }));
    }
  }
  // Página del testigo (?w=enlace): lee el contrato y lo firma sin necesidad de cuenta
  async function renderWitnessPage(token) {
    applyTheme();
    const app = $('#app');
    app.innerHTML = `<div class="main"><div class="empty"><div class="empty-art">${ico('doc')}</div><h2>${esc(t('loading'))}</h2></div></div>`;
    const load = async () => { try { return await sbFetch('/rest/v1/rpc/kg_witness_get', { method: 'POST', body: JSON.stringify({ p_token: token }) }, false); } catch (e) { return null; } };
    let d = /^[0-9a-f-]{36}$/i.test(token) ? await load() : null;
    const c = d && d.contract, isKey = k => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
    if (!c || !isKey(c.signedAt) || !isKey(c.endsAt)) { app.innerHTML = `<div class="main">${emptyState('doc', t('witNotFound'), t('witNotFoundSub'), `<a class="btn primary" href="${APP_URL}">${esc(t('profileCreateOwn'))}</a>`)}</div>`; return; }
    if (c.lang && window.I18N[c.lang]) state.lang = c.lang;
    const draw = () => {
      const signed = !!d.signed_at;
      const doc = { name: String(c.name || ''), signedAt: c.signedAt, endsAt: c.endsAt, level: c.level, g: c.g, sig: c.sig, witness: signed ? { sig: d.witness_sig, signedName: d.witness_name, signedAt: String(d.signed_at).slice(0, 10), period: c.signedAt } : null };
      app.innerHTML = `<div class="main wit-page">
        <div class="center" style="margin:10px 0 18px"><div class="muted small" style="letter-spacing:.15em;font-weight:var(--fw-label)">KEEPGOING</div><h1 class="page-title" style="margin:6px 0 8px">${esc(t('witPageTitle'))}</h1><p class="muted" style="margin:0">${esc(t(signed ? 'witPageSignedSub' : 'witPageSub', { name: doc.name }))}</p></div>
        <div class="contract clay">${contractInner(doc)}</div>
        ${signed ? `<div class="center clay card" style="margin-top:18px"><div style="font-size:44px">✅</div><h2 style="margin:6px 0">${esc(t('witPageDone'))}</h2><p class="muted" style="margin:0">${esc(t('witPageDoneSub', { name: doc.name }))}</p></div>`
          : `<div class="clay card stack" style="margin-top:18px">
            <label class="field"><span>${esc(t('witPageName'))}</span><input class="input" id="wp-name" maxlength="80" autocomplete="name" placeholder="${esc(t('contractNamePh'))}"></label>
            <div class="field"><span>${esc(t('witPageSign'))}</span><canvas class="sig-pad" id="wp-sig"></canvas><div><button type="button" class="chip" id="wp-clear">${esc(t('contractClear'))}</button></div></div>
            <button class="btn primary block" id="wp-go">✍️ ${esc(t('witPageBtn'))}</button></div>`}
        <div class="center" style="margin:28px 0"><a class="btn" href="${APP_URL}">${esc(t('profileCreateOwn'))}</a></div></div>`;
      if (signed) return;
      const pad = sigPad($('#wp-sig'), $('#wp-clear'));
      $('#wp-go').addEventListener('click', async ev => {
        const name = $('#wp-name').value.trim(), sig = pad.get();
        if (name.length < 2) { toast(t('witNeedName')); $('#wp-name').focus(); return; }
        if (!sig) { toast(t('witNeedSig')); return; }
        ev.target.disabled = true;
        try { await sbFetch('/rest/v1/rpc/kg_witness_sign', { method: 'POST', body: JSON.stringify({ p_token: token, p_name: name, p_sig: sig }) }, false); vibrate([20, 40, 20]); }
        catch (e) { toast(t(/already_signed/.test(e.message) ? 'witAlready' : 'witError')); }
        d = (await load()) || d; draw(); window.scrollTo(0, 0);
      });
    };
    draw();
  }
  function witnessMail(c, kind, cc) {
    if (kind !== 'result') return witnessInvite(c);
    const w = c && c.witness; if (!w || !w.email) return;
    const subject = t(kind === 'result' ? 'witnessResultSubject' : 'witnessSubject', { name: c.name });
    const body = kind === 'result'
      ? t('witnessResultBody', { w: w.name || '', name: c.name, tier: t('tier_' + cc.tier), rate: cc.rate == null ? '—' : cc.rate + '%', start: fmtDate(cc.start), end: fmtDate(cc.end), url: APP_URL })
      : t('witnessBody', { w: w.name || '', name: c.name, start: fmtDate(c.signedAt), end: fmtDate(c.endsAt), text: stripHtml(contractText(c)), url: APP_URL });
    location.href = `mailto:${encodeURIComponent(w.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
  const witnessFormHtml = (w = null) => `<label class="check" style="margin-top:4px"><input type="checkbox" id="ct-wit" ${w ? 'checked' : ''}> 👀 ${esc(t('witnessCheck'))}</label>
    <div id="ct-wit-box" class="stack ${w ? '' : 'hidden'}" style="gap:10px">
      <input class="input" id="ct-wit-name" maxlength="60" placeholder="${esc(t('witnessName'))}" value="${esc(w ? w.name : '')}">
      <input class="input" id="ct-wit-email" type="email" inputmode="email" maxlength="120" placeholder="${esc(t('witnessEmail'))}" value="${esc(w ? w.email : '')}">
      <p class="muted small" style="margin:0">${esc(t('witnessHint'))}</p></div>`;
  function readWitness(root) {
    const c = $('#ct-wit', root); if (!c || !c.checked) return null;
    const email = $('#ct-wit-email', root).value.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? { name: $('#ct-wit-name', root).value.trim(), email } : 'bad';
  }

  /* ---------- mascota de plastilina: gato, perro o ninfa (dibujos en js/pets.js) ---------- */
  const PETS = window.KGPets;
  const safeImg = s => typeof s === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s) ? s : '';
  const PET_EMOJI = { cat: '🐈', dog: '🐕', cockatiel: '🐦' };
  /* v1.23.1: cada mascota tiene su nombre (pet.names[kind], con uno por defecto) y su aspecto (pet.looks[kind]).
     El perro se desbloquea en el nivel 5 y la ninfa en el 8; quien ya la tenía antes la conserva (pet.keep). */
  const PET_LEVEL = { cat: 0, dog: 5, cockatiel: 8 };
  function petOf() {
    // Sin tocar state.pet (solo se guarda cuando el usuario cambia algo): las mascotas de antes de la v1.23.1 se leen igual
    const s = state.pet && typeof state.pet === 'object' ? state.pet : {};
    const names = s.names && typeof s.names === 'object' ? { ...s.names } : s.name ? { [PETS.KINDS.includes(s.kind) ? s.kind : 'cat']: s.name } : {};
    const keep = Array.isArray(s.keep) ? [...s.keep] : PETS.KINDS.includes(s.kind) && s.kind !== 'cat' ? [s.kind] : [];
    const p = { kind: 'cat', fur: true, ...s, names, looks: { ...(s.looks || {}) }, keep };
    if (!PETS.KINDS.includes(p.kind) || !petUnlocked(p.kind, p)) { p.kind = 'cat'; Object.assign(p, { fur: true, colors: null }, p.looks.cat || {}); }
    if (!Array.isArray(p.colors) || !p.colors.length) p.colors = PETS.defaults(p.kind);
    p.name = p.names[p.kind] || '';
    return p;
  }
  const petUnlocked = (k, p = state.pet || {}) => k === 'cat' || levelInfo().level >= (PET_LEVEL[k] || 0) || (Array.isArray(p.keep) ? p.keep.includes(k) : p.kind === k);
  const petName = (p = petOf()) => p.name || t('petName_' + p.kind);
  function petSetName(v) { const p = petOf(); p.names[p.kind] = String(v || '').trim().slice(0, 20); p.name = p.names[p.kind]; state.pet = p; save(); }
  const catSvg = (pet, mood = 'neutral', size = 120) => PETS.svg(pet, mood, size);
  function petMood() {
    const today = todayKey(), hour = new Date().getHours(), di = dayInfo(today);
    const active = state.habits.filter(h => !h.archived);
    if (!active.length) return 'neutral';
    if (di.perfect && di.due > 0) return 'excited';
    if (hour >= 23 || hour < 6) return 'sleepy';
    const y = addDays(today, -1);
    const missedY = active.some(h => !isQuit(h) && h.freq === 'daily' && y >= firstKey(h) && periodState(h, y) === 'miss');
    if (missedY && di.done === 0) return 'sad';
    return di.due && di.done / di.due >= .5 ? 'happy' : 'neutral';
  }
  function petMessages() {
    const out = [], today = todayKey(), y = addDays(today, -1), hour = new Date().getHours(), name = firstName();
    const active = state.habits.filter(h => !h.archived), di = dayInfo(today);
    out.push(t(hour < 13 ? 'petMorning' : hour < 20 ? 'petAfternoon' : 'petNight', { name: name ? ', ' + name : '' }));
    if (di.perfect && di.due) out.unshift(t('petPerfect'));
    const pending = active.filter(h => !isQuit(h) && todayStatus(h).due && !todayStatus(h).done);
    if (pending.length) out.push(t('petPending', { n: pending.length, h: pending[0].name }));
    const missed = active.filter(h => !isQuit(h) && h.freq === 'daily' && y >= firstKey(h) && periodState(h, y) === 'miss' && !todayStatus(h).done);
    if (missed.length) out.unshift(t('petNeverTwice', { h: missed[0].name }));
    const best = active.filter(h => !isQuit(h)).map(h => [h, currentStreak(h)]).sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] >= 3) out.push(t('petStreak', { h: best[0].name, n: best[1] }));
    let near = null;
    { const ni = RANKS.findIndex(([r]) => !state.perfectMastery[r]), pr = perfectRun(); if (ni >= 0 && pr.cur > 0 && RANKS[ni][1] - pr.cur <= 7) near = { k: RANKS[ni][1] - pr.cur, r: RANKS[ni][0] }; }
    if (near) out.push(t('petNextPerfect', { k: near.k, rank: t('rank_' + near.r) }));
    const q = active.filter(isQuit).map(h => [h, currentStreak(h)]).sort((a, b) => b[1] - a[1])[0];
    if (q && q[1] >= 1) out.push(t('petQuit', { n: q[1], h: q[0].name }));
    if (!state.energy[today]) out.push(t('petEnergy'));
    const c = state.contract; if (c) { const left = diffDays(today, c.endsAt); if (left >= 0 && left <= 3) out.push(t('petContract', { n: left })); }
    const pi = pointsInfo();
    out.push(t('petPoints', { n: fmtPts(pi.points) }));
    return out;
  }
  let petIdx = 0;
  function petCardHtml() {
    const pet = petOf(), msgs = petMessages(), msg = msgs[petIdx % msgs.length];
    return `<div class="pet-card clay" data-w="pet"><button class="pet-btn" data-act="pet" aria-label="${esc(petName(pet))}">${catSvg(pet, petMood(), 96)}</button>
      <div class="bubble grow"><b>${esc(petName(pet))}</b><span id="pet-msg">${esc(msg)}</span></div>
      <button class="icon-btn sm pet-edit" data-act="pet-edit" aria-label="${esc(t('petCustomize'))}" title="${esc(t('petCustomize'))}">${ico('edit')}</button></div>`;
  }
  // Personalizar la mascota (solo desde su tarjeta en la vista Hoy)
  function openPetEditor() {
    openModal({
      title: `${PET_EMOJI[petOf().kind]} ${esc(t('petTitle'))}`, cls: 'wide',
      body: `<div id="st-pet">${petSettingsHtml()}</div>`,
      onMount: w => w.addEventListener('change', e => { if (e.target.id === 'pet-name') { petSetName(e.target.value); render(); toast(t('saved')); } }),
      onClick: (e, close, w) => { if (petSettingsClick(e, w)) render(); }
    });
  }
  function petSettingsHtml() {
    const pet = petOf();
    return `<div class="pet-settings"><div class="pet-preview">${catSvg(pet, 'happy', 120)}</div><div class="stack grow" style="gap:12px;min-width:200px">
      <label class="field"><span>${esc(t('petName'))}</span><input class="input" id="pet-name" maxlength="20" value="${esc(pet.name)}" placeholder="${esc(t('petName_' + pet.kind))}"></label>
      <div class="field"><span>${esc(t('petKind'))}</span><div class="seg">${PETS.KINDS.map(k => petUnlocked(k) ? `<button data-pet-kind="${k}" class="${pet.kind === k ? 'on' : ''}">${PET_EMOJI[k]} ${esc(t('petKind_' + k))}</button>` : `<button data-pet-kind="${k}" class="locked" aria-disabled="true" title="${esc(t('petLockedAt', { n: PET_LEVEL[k] }))}">${ico('lock', 'xs')} ${esc(t('petKind_' + k))} <span class="muted small">${esc(t('petLevelN', { n: PET_LEVEL[k] }))}</span></button>`).join('')}</div>
        <span class="muted small">${esc(t('petNamesHint'))}</span></div>
      ${pet.kind === 'cockatiel' ? '' : `<div class="field"><span>${esc(t(pet.kind === 'dog' ? 'petEars' : 'petFur'))}</span><div class="seg"><button data-pet-fur="1" class="${pet.fur ? 'on' : ''}">${esc(t(pet.kind === 'dog' ? 'petLongEars' : 'petWithFur'))}</button><button data-pet-fur="0" class="${pet.fur ? '' : 'on'}">${esc(t(pet.kind === 'dog' ? 'petShortHair' : 'petHairless'))}</button></div></div>`}
      <div class="field"><span>${esc(t('petColors'))}</span>
        ${PETS.palettes(pet.kind).map((slot, i) => `<div class="swatches" style="margin-top:8px"><span class="small muted" style="width:78px">${esc(t('petSlot_' + slot.key))}</span>${i ? `<button class="sw auto ${pet.colors[i] ? '' : 'on'}" data-pet-c="${i}:" title="${esc(t('petAuto'))}" aria-label="${esc(t('petAuto'))}">∅</button>` : ''}${slot.options.filter(([, hex]) => hex).map(([k, hex]) => `<button class="sw ${pet.colors[i] === hex ? 'on' : ''}" data-pet-c="${i}:${hex}" style="--c:${hex}" title="${esc(t('pc_' + k))}" aria-label="${esc(t('pc_' + k))}"></button>`).join('')}</div>`).join('')}</div>
    </div></div>`;
  }
  function petSettingsClick(e, root) {
    let el; const pet = petOf();
    if ((el = e.target.closest('[data-pet-kind]'))) {
      const k = el.dataset.petKind;
      if (!petUnlocked(k)) { toast(t('petLockedAt', { n: PET_LEVEL[k] })); return true; }
      if (k !== 'cat' && k !== pet.kind && !gate('themes')) return true;
      if (pet.kind !== k) { pet.looks[pet.kind] = { fur: pet.fur, colors: pet.colors }; Object.assign(pet, { kind: k, fur: true, colors: PETS.defaults(k) }, pet.looks[k] || {}); pet.name = pet.names[k] || ''; }
    }
    else if ((el = e.target.closest('[data-pet-fur]'))) pet.fur = el.dataset.petFur === '1';
    else if ((el = e.target.closest('[data-pet-c]'))) { const [i, hex] = el.dataset.petC.split(':'); while (pet.colors.length <= +i) pet.colors.push(''); pet.colors[+i] = hex || (pet.kind === 'cockatiel' && +i === 2 ? 'none' : ''); while (pet.colors.length > 1 && !pet.colors[pet.colors.length - 1]) pet.colors.pop(); }
    else return false;
    pet.looks[pet.kind] = { fur: pet.fur, colors: pet.colors };
    state.pet = pet; save(); $('#st-pet', root).innerHTML = petSettingsHtml(); return true;
  }

  /* ---------- PERFIL (arriba de Maestrías): mascota, bio, vitrina, estadísticas, mapa anual, logros y carnet ---------- */
  const profileName = () => (state.contract && state.contract.name) || firstName() || t('profileYou');
  const memberSince = () => [firstDay(), ...state.habits.map(h => h.createdAt), state.contract && state.contract.signedAt].filter(k => k && k > '2000').sort()[0] || todayKey();
  function lifeStats() {
    const hs = state.habits, days = new Set();
    hs.forEach(h => { if (isQuit(h)) return; const L = state.logs[h.id] || {}; for (const k in L) if (L[k] > 0) days.add(k); });
    return {
      activeDays: days.size, best: Math.max(0, ...hs.map(bestStreak)), entries: hs.reduce((a, h) => a + totalEntries(h), 0),
      perfect: pointsInfo().perfectDays, cards: perfectCount() + legacyTotal(), secrets: SECRETS.filter(([id]) => state.secrets[id]).length,
      mastered: perfectRun().best, contracts: state.contractCards.length, challenges: state.challengeCards.length,
      projects: state.projects.filter(p => projectStats(p).achieved).length, xp: levelInfo().xp, since: memberSince()
    };
  }
  // Vitrina: claves 'm:<hábito>:<rango>' (carta de maestría) o 's:<id>' (carta secreta)
  function showcaseItem(key) {
    const [k, a, b] = String(key || '').split(':');
    if (k === 'p') { const i = +a; if (!RANKS[i] || !state.perfectMastery[RANKS[i][0]]) return null; return { html: cardFace(PSUBJ(), i, 'front'), label: `${t('rank_' + RANKS[i][0])} · ${t('perfectSeries')}`, h: PSUBJ(), i }; }
    if (k === 'm') { const h = getHabit(a), i = +b; if (!h || !RANKS[i] || !(state.mastery[h.id] || {})[RANKS[i][0]]) return null; return { html: cardFace(h, i, 'front'), label: `${t('rank_' + RANKS[i][0])} · ${h.name}`, h, i }; }
    if (k === 's') { const s = SECRETS.find(x => x[0] === a); if (!s || !state.secrets[a]) return null; return { html: secretCardHtml(s[0], s[1]), label: t('sec_' + a), s }; }
    return null;
  }
  const showcaseKeys = () => (profileOf().showcase || []).slice(0, 3);
  function openShowcasePicker(slot, done) {
    const opts = [];
    for (let i = RANKS.length - 1; i >= 0; i--) if (state.perfectMastery[RANKS[i][0]]) opts.push('p:' + i);
    state.habits.forEach(h => { for (let i = RANKS.length - 1; i >= 0; i--) if ((state.mastery[h.id] || {})[RANKS[i][0]]) opts.push('m:' + h.id + ':' + i); });
    SECRETS.forEach(([id]) => { if (state.secrets[id]) opts.push('s:' + id); });
    openModal({
      title: `🏆 ${esc(t('showcaseTitle'))}`, cls: 'wide',
      body: opts.length ? `<p class="muted small" style="margin-top:0">${esc(t('showcasePick'))}</p><div class="pick-grid">${opts.map(k => { const it = showcaseItem(k); return `<button class="kcard-btn" data-pick="${k}">${it.html}<span class="cap">${esc(it.label)}</span></button>`; }).join('')}</div>` : `<p class="muted">${esc(t('showcaseNone'))}</p>`,
      foot: showcaseKeys()[slot] ? `<button class="btn" data-pick="">${ico('trash')} ${esc(t('showcaseRemove'))}</button>` : '',
      onClick: (e, close) => {
        const b = e.target.closest('[data-pick]'); if (!b) return;
        const pr = profileOf(), sc = [0, 1, 2].map(i => (pr.showcase || [])[i] || null);
        sc[slot] = b.dataset.pick || null;
        state.profile = { ...pr, showcase: sc }; save(); close(); done();
      }
    });
  }
  function yearHeatHtml() {
    const today = todayKey(), H = state.habits.filter(h => !h.archived);
    const startW = weekStart(addDays(today, -364)), weeks = diffDays(startW, weekStart(today)) / 7 + 1;
    const base = T.surfaceHex, hue = state.theme.accent, lv = [mix(base, hue, .1), mix(base, hue, .32), mix(base, hue, .55), mix(base, hue, .78), hue];
    let cells = '';
    for (let w = 0; w < weeks; w++) for (let d = 0; d < 7; d++) {
      const k = addDays(startW, w * 7 + d);
      if (k > today) { cells += '<i style="visibility:hidden"></i>'; continue; }
      const sc = H.map(h => dayScore(h, k)).filter(x => x != null), v = sc.length ? sc.reduce((a, b) => a + b, 0) / sc.length : 0;
      cells += `<i style="background:${lv[v <= 0 ? 0 : v < .34 ? 1 : v < .67 ? 2 : v < 1 ? 3 : 4]}" title="${esc(fmtDate(k))} · ${Math.round(v * 100)}%"></i>`;
    }
    return `<div class="heat-wrap prof-heat"><div class="heat">${cells}</div></div><div class="heat-legend">${esc(t('less'))} ${lv.map(c => `<i style="background:${c}"></i>`).join('')} ${esc(t('more'))}</div>`;
  }
  function achievements() {
    const ev = [];
    state.habits.forEach(h => {
      if (h.createdAt) ev.push({ d: h.createdAt, icon: h.icon || '#', txt: t('achStart', { name: h.name }) });
      RANKS.forEach(([r]) => { const m = (state.mastery[h.id] || {})[r]; if (m && m.date) ev.push({ d: m.date, icon: '👑', txt: t('achCard', { rank: t('rank_' + r), name: h.name }) }); });
    });
    RANKS.forEach(([r, th]) => { const m = state.perfectMastery[r]; if (m && m.date) ev.push({ d: m.date, icon: '👑', txt: t('achPerfect', { rank: t('rank_' + r), n: th }) }); });
    SECRETS.forEach(([id, icon]) => { if (state.secrets[id]) ev.push({ d: state.secrets[id], icon, txt: t('achSecret', { name: t('sec_' + id) }) }); });
    state.challengeCards.forEach(c => ev.push({ d: c.end, icon: '🏁', txt: t('achChallenge', { name: c.name, n: c.days }) }));
    state.contractCards.forEach(cc => ev.push({ d: cc.end, icon: '📜', txt: t('achContract', { tier: t('tier_' + cc.tier) }) }));
    let xp = 0, L = 0;
    eachDay(k => { xp += Math.max(0, dayInfo(k).pts); while (xp >= xpFor(L + 1)) { L++; ev.push({ d: k, icon: '⬆️', txt: t('achLevel', { n: L, title: levelTitle(L) }) }); } });
    return ev.filter(e => e.d).sort((a, b) => a.d < b.d ? 1 : a.d > b.d ? -1 : 0);
  }
  // Foto de perfil: se reduce a 160×160 (JPEG) en el dispositivo; sin foto se ve la inicial
  const myAvatar = () => safeImg(profileOf().avatar);
  const meAvatar = (size, extra = '') => { const img = myAvatar(); return `<span class="me-avatar ${img ? 'photo' : ''} ${extra}" style="--s:${size}px">${img ? `<img src="${img}" alt="">` : esc(profileName().charAt(0).toUpperCase())}</span>`; };
  function resizePhoto(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const S = 160, cv = document.createElement('canvas'); cv.width = cv.height = S;
        const ctx = cv.getContext('2d'), m = Math.min(img.naturalWidth, img.naturalHeight);
        ctx.drawImage(img, (img.naturalWidth - m) / 2, (img.naturalHeight - m) / 2, m, m, 0, 0, S, S);
        URL.revokeObjectURL(url);
        let q = .85, out = cv.toDataURL('image/jpeg', q);
        while (out.length > 38000 && q > .3) { q -= .1; out = cv.toDataURL('image/jpeg', q); }
        res(out);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img')); };
      img.src = url;
    });
  }
  async function pushAvatar() {
    if (!auth) return;
    try { await ensureToken(); await sbFetch(`/rest/v1/kg_users?user_id=eq.${auth.uid}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ avatar: myAvatar() || null, ...(state.kx ? { pubkey: state.kx.pub } : {}), updated_at: new Date().toISOString() }) }); }
    catch (e) { /* se reintenta al guardar el @nametag */ }
  }
  async function setAvatar(file) {
    if (!file || !/^image\//.test(file.type)) return;
    try { state.profile = { ...profileOf(), avatar: await resizePhoto(file) }; save(); render(); toast(t('avatarSaved')); sfx('toggle'); pushAvatar(); }
    catch (e) { toast(t('avatarError')); }
  }
  function profileCardHtml() {
    const lv = levelInfo(), bio = profileOf().bio;
    return `<button class="prof-card clay" data-act="profile"><span class="prof-pet">${meAvatar(74)}</span><span class="grow"><b class="prof-card-name">${esc(profileName())}${planBadge()}</b><span class="muted small">${esc(t('lvShortTitle', { n: lv.level, title: lv.title }))}</span>${bio ? `<span class="prof-bio">${esc(bio)}</span>` : `<span class="muted small">${esc(t('profileTapHint'))}</span>`}</span>${ico('right')}</button>`;
  }
  // Insignias: lo que has ganado de un vistazo (maestrías de racha, cartas secretas, contratos, retos y reputación)
  function badgesHtml() {
    const b = [];
    RANKS.forEach(([r]) => { if (state.perfectMastery[r]) b.push(['👑', t('rank_' + r)]); });
    SECRETS.forEach(([id, icon]) => { if (state.secrets[id]) b.push([icon, t('sec_' + id)]); });
    const tiers = {}; state.contractCards.forEach(c => { tiers[c.tier] = (tiers[c.tier] || 0) + 1; });
    Object.entries(tiers).forEach(([tier, n]) => b.push(['📜', `${t('tier_' + tier)}${n > 1 ? ' ×' + n : ''}`]));
    if (state.challengeCards.length) b.push(['🏁', t('badgeChallenges', { n: state.challengeCards.length })]);
    if (repState.golds) b.push(['🥇', t('badgeGolds', { n: repState.golds })]);
    const best = perfectRun().best; if (best >= 3) b.push(['🔥', t('badgeBestRun', { n: best })]);
    return b.length ? `<div class="badge-grid">${b.map(([i, l]) => `<span class="badge"><span class="badge-ico">${esc(i)}</span><span>${esc(l)}</span></span>`).join('')}</div>` : `<p class="muted small" style="margin:0">${esc(t('badgesNone'))}</p>`;
  }
  let achAll = false;
  function profileHtml() {
    const pr = profileOf(), lv = levelInfo(), st = lifeStats(), sc = showcaseKeys(), ach = achievements();
    const kpi = (v, l) => `<div class="kpi clay"><b>${v}</b><span>${esc(l)}</span></div>`;
    const sec = (icon, title, body) => `<section class="prof-sec"><h3 class="section-title">${icon} ${esc(title)}</h3>${body}</section>`;
    return `<div class="stack" style="gap:22px">
      <section class="clay card prof-tag-box" id="pf-tag-box">${nametagHtml()}</section>
      <div class="prof-head"><div class="photo-wrap"><label class="avatar-pick" title="${esc(t('avatarChange'))}">${meAvatar(124)}<span class="photo-cam" aria-hidden="true">${ico('camera')}</span><input type="file" id="pf-photo" accept="image/*" class="sr-only" aria-label="${esc(t('avatarChange'))}"></label>${myAvatar() ? `<button class="link-btn small" data-pf="photo-rm">${esc(t('avatarRemove'))}</button>` : ''}</div>
        <div class="grow"><h2 class="prof-name">${esc(profileName())}</h2>${myTag() ? `<div class="prof-tag">@${esc(myTag())}</div>` : ''}<div class="prof-lvl">${esc(t('lvShortTitle', { n: lv.level, title: lv.title }))}</div><div class="muted small">${esc(t('memberSince', { d: fmtDate(st.since) }))}</div></div></div>
      <label class="field"><span>${esc(t('bioTitle'))}</span><textarea class="input" id="pf-bio" maxlength="140" rows="2" placeholder="${esc(t('ct_quote_' + (state.commitment || 'serio'), { perfecto: 'perfecto' }))}">${esc(pr.bio || '')}</textarea></label>
      <div class="row wrap"><button class="btn primary" data-pf="carnet">${ico('upload')} ${esc(t('carnetShare'))}</button>${pr.enabled && pr.slug ? `<a class="btn" href="${esc(profileUrl(pr.slug))}" target="_blank" rel="noopener">${ico('globe')} ${esc(t('profileOpen'))}</a>` : `<button class="btn" data-pf="public">${ico('globe')} ${esc(t('profilePublicSetup'))}</button>`}</div>
      ${sec('🎖️', t('badgesTitle'), badgesHtml())}
      ${sec('🏆', t('showcaseTitle'), `<div class="show-row">${[0, 1, 2].map(i => { const it = showcaseItem(sc[i]); return `<button class="kcard-btn show-slot" data-pf="slot" data-i="${i}">${it ? it.html : `<div class="slot-empty">${ico('plus')}</div>`}<span class="cap">${it ? esc(it.label) : esc(t('showcaseAdd'))}</span></button>`; }).join('')}</div>`)}
      ${sec('📊', t('lifeStats'), `<div class="kpis prof-kpis">${kpi(fmtNum(st.activeDays), t('kpiActiveDays'))}${kpi(st.best, t('kpiBest'))}${kpi(fmtNum(st.entries), t('kpiTotal'))}${kpi(st.perfect, t('perfectDays'))}${kpi(st.cards, t('statCards'))}${kpi(st.mastered, t('perfectRun'))}${kpi(st.contracts, t('contractCards'))}${kpi(st.challenges, t('challengeCards'))}${kpi(st.projects, t('statProjects'))}${kpi(fmtNum(st.xp), 'XP')}</div>`)}
      ${sec('🗓️', t('yearHeat'), yearHeatHtml())}
      ${sec('✨', t('achTitle'), ach.length ? `<div class="ach-list">${(achAll ? ach : ach.slice(0, 12)).map(e => `<div class="ach"><span class="ach-ico">${esc(e.icon)}</span><span class="grow">${esc(e.txt)}</span><span class="muted small">${esc(fmtShort(e.d))}</span></div>`).join('')}</div>${ach.length > 12 ? `<div class="center" style="margin-top:10px"><button class="chip" data-pf="ach-more">${esc(t(achAll ? 'achLess' : 'achMore', { n: ach.length }))}</button></div>` : ''}` : `<p class="muted small">${esc(t('achNone'))}</p>`)}
      ${sec('🏅', t('repTotal'), `<div id="pf-rep">${repHtml()}</div>`)}
    </div>`;
  }
  function openProfile() {
    achAll = false;
    openModal({
      title: esc(t('profileTitle')), cls: 'wide', body: '<div id="pf"></div>',
      onMount: w => {
        const draw = () => { $('#pf', w).innerHTML = profileHtml(); };
        w._draw = draw; draw();
        if (auth) loadRep().then(() => { const el = $('#pf-rep', w); if (el) el.innerHTML = repHtml(); const tb = $('#pf-tag-box', w); if (tb && !$('#pf-tag', w)?.matches(':focus')) tb.innerHTML = nametagHtml(); });
        w.addEventListener('change', e => {
          if (e.target.id === 'pf-bio') { state.profile = { ...profileOf(), bio: e.target.value.trim().slice(0, 140) }; save(); render(); toast(t('saved')); }
          if (e.target.id === 'pf-photo') setAvatar(e.target.files[0]).then(() => w._draw());
        });
      },
      onClick: (e, close, w) => {
        const b = e.target.closest('[data-pf]'); if (!b) return;
        switch (b.dataset.pf) {
          case 'photo-rm': { const p = profileOf(); delete p.avatar; state.profile = p; save(); render(); w._draw(); pushAvatar(); break; }
          case 'slot': openShowcasePicker(+b.dataset.i, () => { w._draw(); render(); }); break;
          case 'ach-more': achAll = !achAll; w._draw(); break;
          case 'carnet': shareCanvas(profileCanvas, 'keepgoing-carnet.png', t('carnetTitle')); break;
          case 'public': close(); openAcc.add('priv'); openSettings(); break;
          case 'tag': saveNametag($('#pf-tag', w).value); break;
          case 'login': close(); openLogin(); break;
        }
      }
    });
  }
  // Carnet compartible (imagen 1080×1600)
  async function profileCanvas() {
    const fam = fontFamily(state.theme.font), th = state.theme;
    try { await Promise.all([document.fonts.load(`700 40px "${fam}"`), document.fonts.load(`500 40px "${fam}"`)]); } catch (e) { /* sigue con la del sistema */ }
    const W = 1080, H = 1600, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d'), lv = levelInfo(), st = lifeStats(), pr = profileOf();
    const bgA = th.bgMode === 'gradient' ? th.bg : th.bg, bgB = th.bgMode === 'gradient' ? th.bg2 : mix(th.bg, th.accent, .22);
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, bgA); g.addColorStop(1, bgB); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
    ctx.fillStyle = rgba(th.fg, .08); rr(50, 50, W - 100, H - 100, 70); ctx.fill();
    const fg = th.fg, mut = mix(th.fg, th.bg, .4);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const txt = (s, y, size, color, weight = 700) => { ctx.font = `${weight} ${size}px "${fam}", sans-serif`; ctx.fillStyle = color; ctx.fillText(s, W / 2, y); };
    txt('KEEPGOING', 130, 30, mut, 700);
    ctx.save(); ctx.beginPath(); ctx.arc(W / 2, 325, 160, 0, Math.PI * 2); ctx.closePath(); ctx.fillStyle = rgba(th.accent, .9); ctx.fill(); ctx.clip();
    let drawn = false;
    if (myAvatar()) { try { const img = new Image(); img.src = myAvatar(); await img.decode(); ctx.drawImage(img, W / 2 - 160, 165, 320, 320); drawn = true; } catch (e) { /* sin foto */ } }
    ctx.restore();
    if (!drawn) txt(profileName().charAt(0).toUpperCase(), 330, 160, '#fff', 700);
    let ns = 64; ctx.font = `700 ${ns}px "${fam}", sans-serif`; while (ns > 34 && ctx.measureText(profileName()).width > W - 180) { ns -= 2; ctx.font = `700 ${ns}px "${fam}", sans-serif`; }
    txt(profileName(), 560, ns, fg, 700);
    txt(t('lvShortTitle', { n: lv.level, title: lv.title }), 630, 36, th.accent, 700);
    if (pr.bio) { ctx.font = `500 32px "${fam}", sans-serif`; ctx.fillStyle = mut; wrapLines(ctx, pr.bio, W - 240, 2).forEach((ln, j) => ctx.fillText(ln, W / 2, 695 + j * 42)); }
    [[fmtNum(st.activeDays), t('kpiActiveDays')], [st.best, t('kpiBest')], [st.cards + st.secrets, t('statCards')], [st.contracts, t('contractCards')]].forEach(([v, l], j) => {
      const x = 110 + j * 220; ctx.fillStyle = rgba(th.fg, .1); rr(x, 790, 200, 170, 36); ctx.fill();
      ctx.font = `700 58px "${fam}", sans-serif`; ctx.fillStyle = fg; ctx.fillText(String(v), x + 100, 855);
      ctx.font = `600 22px "${fam}", sans-serif`; ctx.fillStyle = mut; wrapLines(ctx, String(l), 180, 2).forEach((ln, i) => ctx.fillText(ln, x + 100, 912 + i * 26));
    });
    const items = showcaseKeys().map(showcaseItem).filter(Boolean);
    const cw = 250, ch = Math.round(cw * CARD_H / CARD_W), gap = 40, x0 = (W - (items.length * cw + (items.length - 1) * gap)) / 2;
    for (let j = 0; j < items.length; j++) {
      try { const it = items[j], c = it.h ? await cardCanvas(it.h, it.i, 'front') : await trophyCanvas('secret', { id: it.s[0], icon: it.s[1] }); ctx.save(); rr(x0 + j * (cw + gap), 1010, cw, ch, 22); ctx.clip(); ctx.drawImage(c, x0 + j * (cw + gap), 1010, cw, ch); ctx.restore(); } catch (e) { /* carta sin imagen */ }
    }
    txt(`${t('memberSince', { d: fmtDate(st.since) })} · ${fmtShort(todayKey())}`, H - 95, 26, mut, 600);
    return cv;
  }

  /* ---------- perfil público (enlace de solo lectura) ---------- */
  const profileOf = () => ({ enabled: false, slug: '', show: { level: true, cards: true, habits: true, contracts: true }, ...(state.profile || {}) });
  const slugify = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
  const profileUrl = slug => `${APP_URL}?u=${encodeURIComponent(slug)}`;
  function profileSnapshot() {
    const pr = profileOf(), s = pr.show, out = { name: firstName(), lang: state.lang, at: todayKey(), bio: pr.bio || '', ...(myAvatar() ? { avatar: myAvatar() } : {}) };
    if (s.level) { const lv = levelInfo(); out.level = { n: lv.level, title: lv.title, xp: lv.xp }; }
    if (s.cards) {
      const pm = RANKS.filter(([r]) => state.perfectMastery[r]).map(([r]) => [r, state.perfectMastery[r].date, state.perfectMastery[r].serial || 0]);
      out.cards = [...(pm.length ? [{ name: t('perfectSeries'), icon: '🔥', ranks: pm }] : []), ...state.habits.filter(legacyCount).map(h => ({ name: h.name, icon: h.icon, ranks: RANKS.filter(([r]) => (state.mastery[h.id] || {})[r]).map(([r]) => { const m = state.mastery[h.id][r]; return [r, m.date || todayKey(), m.serial || 0]; }) }))];
      out.secrets = SECRETS.filter(([id]) => state.secrets[id]).map(([id, icon]) => [id, icon, state.secrets[id]]);
      out.challenges = state.challengeCards;
      out.showcase = showcaseKeys().map(k => {
        const it = showcaseItem(k); if (!it) return null;
        if (it.h) { const m = cardMeta(it.h, RANKS[it.i][0]) || {}; return { k: 'm', name: it.h.name, i: it.i, date: m.date || todayKey(), serial: m.serial || 0 }; }
        return { k: 's', id: it.s[0], icon: it.s[1], date: state.secrets[it.s[0]] };
      }).filter(Boolean);
    }
    if (s.habits) out.habits = state.habits.filter(h => !h.archived).map(h => ({ name: h.name, icon: h.icon, color: hColor(h), quit: isQuit(h), streak: currentStreak(h), best: bestStreak(h) }));
    if (s.contracts) out.contracts = state.contractCards;
    return out;
  }
  let lastProfile = '';
  async function publishProfile(force = false) {
    const pr = profileOf(); if (!auth || !pr.slug) return;
    const data = pr.enabled ? profileSnapshot() : {};
    const sig = JSON.stringify([pr.enabled, pr.slug, data]);
    if (!force && sig === lastProfile) return;
    await ensureToken();
    try {
      await sbFetch('/rest/v1/kg_profiles?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: auth.uid, slug: pr.slug, enabled: pr.enabled, data, updated_at: new Date().toISOString() }) });
      lastProfile = sig;
    } catch (e) { if (e.status === 409) toast(t('slugTaken')); else throw e; }
  }
  function privacyHtml() {
    const pr = profileOf();
    if (!auth) return `<p class="muted small" style="margin:0">${esc(t('profileNeedLogin'))}</p>`;
    return `<div class="stack" style="gap:12px">
      <label class="row" style="gap:14px"><span class="switch"><input type="checkbox" id="pf-on" ${pr.enabled ? 'checked' : ''}><span></span></span><span class="grow"><b>${esc(t('profileEnable'))}</b><br><span class="muted small">${esc(t('profileHint'))}</span></span></label>
      <label class="field"><span>${esc(t('profileSlug'))}</span><input class="input" id="pf-slug" maxlength="30" value="${esc(pr.slug)}" placeholder="${esc(slugify(firstName()) || 'mi-perfil')}"></label>
      <div class="field"><span>${esc(t('profileShow'))}</span>${['level', 'cards', 'habits', 'contracts'].map(k => `<label class="check"><input type="checkbox" data-pf-show="${k}" ${pr.show[k] ? 'checked' : ''}> ${esc(t('profileShow_' + k))}</label>`).join('')}</div>
      ${pr.enabled && pr.slug ? `<div class="row wrap"><input class="input grow" readonly value="${esc(profileUrl(pr.slug))}" style="flex:1 1 220px"><button class="btn" data-s="pf-copy">${esc(t('copy'))}</button><a class="btn" href="${esc(profileUrl(pr.slug))}" target="_blank" rel="noopener">${esc(t('profileOpen'))}</a></div>` : ''}
    </div>`;
  }
  async function privacyChange(e, root) {
    const pr = profileOf(); let changed = false;
    if (e.target.id === 'pf-on') { pr.enabled = e.target.checked; if (pr.enabled && !pr.slug) pr.slug = (slugify(firstName()) || 'keepgoing') + '-' + Math.floor(100 + Math.random() * 900); changed = true; }
    if (e.target.id === 'pf-slug') { const v = slugify(e.target.value); if (v.length < 3) { toast(t('slugBad')); return; } pr.slug = v; changed = true; }
    if (e.target.dataset && e.target.dataset.pfShow) { pr.show = { ...pr.show, [e.target.dataset.pfShow]: e.target.checked }; changed = true; }
    if (!changed) return;
    state.profile = pr; save();
    try { await publishProfile(true); toast(t(pr.enabled ? 'profilePublished' : 'profileHidden')); } catch (err) { toast(t('syncError', { e: err.message })); }
    $('#st-priv', root).innerHTML = privacyHtml();
  }
  // Vista pública: ?u=slug (sin iniciar sesión)
  async function renderPublicProfile(slug) {
    applyTheme();
    const app = $('#app');
    app.innerHTML = `<div class="main"><div class="empty"><div class="empty-art">${ico('crown')}</div><h2>${esc(t('loading'))}</h2></div></div>`;
    let row = null;
    try { const rows = await sbFetch(`/rest/v1/kg_profiles?slug=eq.${encodeURIComponent(slug)}&enabled=eq.true&select=data,updated_at`, {}, false); row = rows && rows[0]; } catch (e) { row = null; }
    if (!row) { app.innerHTML = `<div class="main">${emptyState('crown', t('profileNotFound'), t('profileNotFoundSub'), `<a class="btn primary" href="${APP_URL}">${esc(t('profileCreateOwn'))}</a>`)}</div>`; return; }
    const d = row.data;
    let html = `<div class="main"><div class="public-head clay"><div class="lvl-big">${d.level ? d.level.n : '★'}</div><div class="grow"><div class="muted small" style="font-weight:var(--fw-label);letter-spacing:.15em">KEEPGOING</div><h1 style="margin:2px 0;font-size:30px">${esc(d.name || 'KeepGoing')}</h1>${d.level ? `<div class="muted">${esc(d.level.title)} · ${fmtNum(d.level.xp)} XP</div>` : ''}${d.bio ? `<div class="prof-bio" style="margin-top:6px">${esc(d.bio)}</div>` : ''}</div>${safeImg(d.avatar) ? `<span class="me-avatar photo" style="--s:84px"><img src="${safeImg(d.avatar)}" alt=""></span>` : ''}</div>`;
    if (d.showcase && d.showcase.length) html += `<h2 class="section-title" style="margin:24px 0 12px">🏆 ${esc(t('showcaseTitle'))}</h2><div class="show-row">${d.showcase.map(x => x.k === 'm'
      ? `<div class="kcard-btn">${cardFace({ id: '_', name: x.name }, x.i, 'front', '', { date: x.date, serial: x.serial })}<span class="cap">${esc(t('rank_' + RANKS[x.i][0]))} · ${esc(x.name)}</span></div>`
      : `<div class="kcard-btn">${secretCardHtml(x.id, x.icon, x.date)}<span class="cap">${esc(t('sec_' + x.id))}</span></div>`).join('')}</div>`;
    if (d.habits && d.habits.length) html += `<h2 class="section-title" style="margin:24px 0 12px">🔥 ${esc(t('publicHabits'))}</h2><div class="stack" style="gap:10px">${d.habits.map(h => `<div class="today-row clay" style="${habitVars(h.color || '#3ddc97')}"><div class="habit-ico sm">${esc(h.icon || '#')}</div><div class="grow"><b>${esc(h.name)}</b><div class="muted small">${esc(h.quit ? t('quitDays', { n: h.streak }) : t('streak', { n: h.streak }))} · ${esc(t('bestStreak'))} ${h.best}</div></div></div>`).join('')}</div>`;
    if (d.cards && d.cards.length) html += `<h2 class="section-title" style="margin:24px 0 12px">👑 ${esc(t('tabMastery'))}</h2>${d.cards.map(c => `<section class="series clay"><div class="series-head"><div class="habit-ico" style="width:46px;height:46px;font-size:22px;--h-soft:var(--surface-2)">${esc(c.icon || '#')}</div><div class="grow"><h3>${esc(c.name)}</h3></div><b>${c.ranks.length}/10</b></div><div class="cards-row">${c.ranks.map(([r, date, serial]) => { const i = RANKS.findIndex(x => x[0] === r); return `<div class="kcard-btn">${cardFace({ id: '_', name: c.name }, i, 'front', '', { date, serial })}<span class="cap">${esc(t('rank_' + r))}</span></div>`; }).join('')}</div></section>`).join('')}`;
    if (d.challenges && d.challenges.length) html += `<section class="series clay"><div class="series-head"><div class="grow"><h3>🏁 ${esc(t('challengeCards'))}</h3></div></div><div class="cards-row">${d.challenges.map(c => `<div class="kcard-btn">${challengeCardHtml(c)}</div>`).join('')}</div></section>`;
    if (d.contracts && d.contracts.length) html += `<section class="series clay"><div class="series-head"><div class="grow"><h3>📜 ${esc(t('contractCards'))}</h3></div></div><div class="cards-row">${d.contracts.map(cc => `<div class="kcard-btn">${contractCardHtml(cc)}<span class="cap">${esc(t('tier_' + cc.tier))}</span></div>`).join('')}</div></section>`;
    html += `<div class="center" style="margin:30px 0"><p class="muted small">${esc(t('publicUpdated', { d: fmtDate(d.at || todayKey()) }))}</p><a class="btn primary" href="${APP_URL}">${esc(t('profileCreateOwn'))}</a></div></div>`;
    app.innerHTML = html;
  }

  /* ---------- recordatorios (notificaciones push) ---------- */
  const b64ToU8 = s => { const p = '='.repeat((4 - s.length % 4) % 4); const b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); };
  const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && location.protocol === 'https:';
  async function enablePush() {
    if (!auth) { toast(t('pushNeedLogin')); return false; }
    if (!pushSupported()) { toast(t(/iPhone|iPad/i.test(navigator.userAgent) ? 'pushIosHint' : 'pushUnsupported')); return false; }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { toast(t('pushDenied')); return false; }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(VAPID_PUBLIC) });
      const j = sub.toJSON();
      await ensureToken();
      await sbFetch('/rest/v1/kg_push?on_conflict=endpoint', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: auth.uid, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid', lang: state.lang, updated_at: new Date().toISOString() }) });
      toast(t('pushOn')); return true;
    } catch (e) { toast(t('pushError', { e: e.message })); return false; }
  }
  async function disablePush() {
    try {
      const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
      if (sub) { if (auth) { await ensureToken(); await sbFetch(`/rest/v1/kg_push?endpoint=eq.${encodeURIComponent(sub.endpoint)}`, { method: 'DELETE' }); } await sub.unsubscribe(); }
      toast(t('pushOff'));
    } catch (e) { toast(t('pushError', { e: e.message })); }
  }
  async function testPush() {
    if (!auth) { toast(t('pushNeedLogin')); return; }
    try {
      await ensureToken();
      const res = await fetch(`${SB_URL}/functions/v1/kg-reminders`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: 'Bearer ' + auth.access_token }, body: JSON.stringify({ test: true }) });
      const j = await res.json();
      toast(j.sent ? t('pushTestSent', { n: j.sent }) : t('pushTestNone'));
    } catch (e) { toast(t('pushError', { e: e.message })); }
  }
  async function pushStatus() {
    if (!pushSupported()) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    try { const reg = await navigator.serviceWorker.getRegistration(); const sub = reg && await reg.pushManager.getSubscription(); return sub ? 'on' : 'off'; } catch (e) { return 'off'; }
  }
  function notifSettingsHtml(status) {
    const n = state.notif || NOTIF0, withRem = state.habits.filter(h => !h.archived && h.reminder && h.reminder.on);
    return `<p class="muted small" style="margin-top:0">${esc(t('pushHint'))}</p>
      <div class="row wrap"><span class="grow small" style="font-weight:var(--fw-label)">${esc(t('pushStatus_' + status))}</span>
        ${status === 'on' ? `<button class="btn" data-s="push-test">${ico('bell')} ${esc(t('pushTest'))}</button><button class="chip" data-s="push-off">${esc(t('pushDisable'))}</button>` : status === 'off' ? `<button class="btn primary" data-s="push-on">${ico('bell')} ${esc(t('pushEnable'))}</button>` : ''}</div>
      <div class="ntf-list">${[['energy', 'energyAt'], ['summary', 'summaryAt'], ['challenge'], ['share'], ['group'], ['message']].map(([k, at]) => `<div class="ntf-row"><label class="row" style="gap:14px"><span class="switch"><input type="checkbox" data-ntf="${k}" ${n[k] ? 'checked' : ''}><span></span></span><span class="grow"><b>${esc(t('ntf_' + k))}</b><br><span class="muted small">${esc(t('ntf_' + k + '_h'))}</span></span></label>${at ? `<input class="input ntf-at" type="time" data-ntf-at="${at}" value="${esc(n[at])}" aria-label="${esc(t('ntfAt'))}" ${n[k] ? '' : 'disabled'}>` : ''}</div>`).join('')}</div>
      <h4 class="ntf-sub">${esc(t('ntfHabits'))}</h4>
      ${withRem.length ? `<div>${withRem.map(h => `<div class="entry"><span>${esc(h.icon)} ${esc(h.name)}</span><b>${ico('bell', 'xs')} ${esc(h.reminder.time)}</b></div>`).join('')}</div>` : `<p class="muted small">${esc(t('pushNoReminders'))}</p>`}`;
  }

  /* ---------- GRUPOS (Fases 4-6): perfil, chat, roles con permisos, retos en vivo, votaciones, ranking y reputación ----------
     Todo lo compartido vive en Supabase y lo validan funciones del servidor (rol y permisos). Nada de la Libreta viaja aquí. */
  const GG = window.KGGroups;
  const ROLES = GG.ROLES;
  const ROLE_ICON = { lider: '👑', colider: '⭐', experto: '🎓', veterano: '🛡️', novato: '🌱' };
  const rpc = async (fn, args = {}) => { await ensureToken(); return sbFetch(`/rest/v1/rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) }); };
  const habitSpec = h => ({ name: h.name, icon: h.icon, kind: h.kind || 'build', freq: h.freq, target: h.target, multi: h.multi, measure: h.measure, unit: h.unit, step: h.step, days: h.days, duration: h.duration, timeOfDay: h.timeOfDay, note: (h.note || '').slice(0, 300), ...(subMode(h) ? { mode: h.mode, goals: h.mode === 'goals' ? h.goals.map(g => ({ name: g.name, target: g.target, min: g.min, amt: g.amt, unit: g.unit })) : undefined, ways: h.mode === 'ways' ? h.ways.map(g => ({ name: g.name, target: g.target, min: g.min, amt: g.amt, unit: g.unit })) : undefined } : {}) });
  // El proyecto viaja con sus hábitos vinculados (sin registros: cada persona lleva los suyos)
  const projectSpec = p => ({ name: p.name, icon: p.icon, desc: p.desc, deadline: p.deadline, goal: { type: p.goal.type, start: p.goal.start, target: p.goal.target, unit: p.goal.unit, items: (p.goal.items || []).map(i => i.text) }, milestones: (p.milestones || []).map(m => ({ text: m.text, date: m.date })),
    habits: p.habitIds.map(getHabit).filter(h => h && !h.archived).slice(0, 30).map(habitSpec) });
  /* Lo que llega de otra persona (chat o grupo) se limpia antes de usarlo: textos con longitud máxima,
     números finitos y fechas AAAA-MM-DD. Así un mensaje mal formado no rompe el chat ni se cuela en tus datos. */
  const sStr = (v, n = 80) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '').slice(0, n);
  const sNum = (v, d = 0, lo = 0, hi = 1e9) => { const x = +v; return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
  const sDate = v => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const sArr = (v, n) => (Array.isArray(v) ? v.slice(0, n) : []);
  const pickOf = (v, list, d) => (list.includes(v) ? v : d);
  // v1.25: mínimo y cantidad por vez de un requisito que llega por el chat
  const reqSpec = g => ({ ...(+g.min > 0 ? { min: sNum(g.min, 1, 1, 99) } : {}), ...(+g.amt > 0 ? { amt: sNum(g.amt, 0, 0, 1e6), unit: sStr(g.unit, 12) } : {}) });
  function cleanSpec(kind, s) {
    s = s && typeof s === 'object' ? s : {};
    if (kind === 'event') return { name: sStr(s.name), icon: sStr(s.icon, 8), from: sDate(s.from), to: sDate(s.to), catIds: sArr(s.catIds, 40).map(x => sStr(x, 40)), days: sArr(s.days, 400).map(x => sDate(x)).filter(Boolean),
      cats: sArr(s.cats, 40).filter(c => c && typeof c === 'object').map(c => ({ id: sStr(c.id, 40), name: sStr(c.name, 40), icon: sStr(c.icon, 8), color: sStr(c.color, 20) })) };
    if (kind === 'project') {
      const g = s.goal && typeof s.goal === 'object' ? s.goal : {};
      return { name: sStr(s.name), icon: sStr(s.icon, 8), desc: sStr(s.desc, 500), deadline: sDate(s.deadline),
        goal: { type: pickOf(g.type, ['simple', 'numeric', 'checklist'], 'simple'), start: sNum(g.start, 0, -1e9), target: sNum(g.target, 0, -1e9), unit: sStr(g.unit, 20), items: sArr(g.items, 50).map(x => sStr(x, 120)).filter(Boolean) },
        milestones: sArr(s.milestones, 30).filter(m => m && typeof m === 'object').map(m => ({ text: sStr(m.text, 120), date: sDate(m.date) })).filter(m => m.text),
        habits: sArr(s.habits, 30).map(h => cleanSpec('habit', h)).filter(h => h.name) };
    }
    return { name: sStr(s.name), icon: sStr(s.icon, 8), kind: pickOf(s.kind, ['build', 'quit'], 'build'), freq: pickOf(s.freq, ['daily', 'weekly', 'monthly'], 'daily'),
      target: sNum(s.target, 1, 1, 1000), multi: !!s.multi, measure: pickOf(s.measure, ['count', 'amount'], 'count'), unit: sStr(s.unit, 20), step: sNum(s.step, 1, 0, 1e6),
      days: [...new Set(sArr(s.days, 7).map(d => +d).filter(d => Number.isInteger(d) && d >= 0 && d <= 6))], duration: sNum(s.duration, 0, 0, 1440),
      timeOfDay: pickOf(s.timeOfDay, TOD, 'any'), note: sStr(s.note, 300), mode: pickOf(s.mode, ['simple', 'goals', 'ways'], 'simple'),
      goals: sArr(s.goals, 12).filter(g => g && typeof g === 'object').map(g => ({ name: sStr(g.name, 40), target: sNum(g.target, 1, 1, 99), ...reqSpec(g) })).filter(g => g.name),
      ways: sArr(s.ways, 12).filter(g => g && typeof g === 'object').map(g => ({ name: sStr(g.name, 40), ...(+g.target > 1 ? { target: sNum(g.target, 1, 1, 99) } : {}), ...reqSpec(g) })).filter(g => g.name) };
  }
  // Hábitos de la ficha que aún no están en el proyecto local (por nombre)
  const missingSpecHabits = (p, s) => { s = cleanSpec('project', s); const have = new Set(p.habitIds.map(getHabit).filter(Boolean).map(h => h.name.trim().toLowerCase())); return ((s && s.habits) || []).filter(x => x && x.name && !have.has(String(x.name).trim().toLowerCase())); };
  // Crea (o reutiliza, si ya tienes uno con el mismo nombre) los hábitos vinculados y los mete en el proyecto
  function addSpecHabits(p, s) {
    const miss = missingSpecHabits(p, s);
    for (const x of miss) {
      const same = state.habits.find(h => !h.archived && h.name.trim().toLowerCase() === String(x.name).trim().toLowerCase());
      const h = same || objFromSpec('habit', x, x.name, x.icon || '#');
      if (!same && !KGPlan.canAdd(PL(), 'habits', activeHabitCount())) { openUpsell({ limit: 'habits' }); break; }
      if (!same) state.habits.push(h);
      if (!p.habitIds.includes(h.id)) p.habitIds.push(h.id);
    }
    return miss.length;
  }
  // Crea un hábito o proyecto local a partir de lo que llega de un grupo o del chat
  function objFromSpec(kind, s = {}, fbName = '', fbIcon = '🎯') {
    s = cleanSpec(kind === 'habit' ? 'habit' : 'project', s); fbName = sStr(fbName); fbIcon = sStr(fbIcon, 8) || '🎯';
    if (kind === 'habit') return newHabitFrom(s.name || fbName, s.icon || fbIcon, { kind: s.kind || 'build', freq: s.freq || 'daily', target: s.target || 1, multi: !!s.multi, measure: s.measure || 'count', unit: s.unit || '', step: s.step || 1, days: s.days.length ? s.days : [0, 1, 2, 3, 4, 5, 6], duration: s.duration || 0, timeOfDay: s.timeOfDay || 'any', note: String(s.note || '').slice(0, 300),
      ...(s.mode === 'goals' && s.goals.length ? { mode: 'goals', freq: 'daily', target: s.goals.length, multi: false, goals: s.goals.map(g => ({ id: uid(), ...g })) } : s.mode === 'ways' && s.ways.length > 1 ? { mode: 'ways', ways: s.ways.map(g => ({ id: uid(), ...g })) } : {}) });
    const g = s.goal || {};
    return { id: uid(), name: s.name || fbName, icon: s.icon || fbIcon, color: null, desc: s.desc || '', habitIds: [], goal: { type: g.type || 'simple', start: g.start || 0, target: g.target || 0, unit: g.unit || '', entries: [], items: (g.items || []).map(text => ({ id: uid(), text: String(text), done: false })), achieved: false }, deadline: s.deadline || null, milestones: (s.milestones || []).map(m => ({ id: uid(), text: m.text, date: m.date, done: false })), photos: {}, createdAt: todayKey() };
  }
  function addFromSpec(kind, spec, fbName, fbIcon) {
    const obj = objFromSpec(kind, spec, fbName, fbIcon);
    (kind === 'habit' ? state.habits : state.projects).push(obj);
    if (kind === 'project') addSpecHabits(obj, spec);
    save(); return obj;
  }
  // «Ver» lo que alguien comparte en el chat antes de añadirlo (sin importes en los eventos)
  // Detalle de un hábito compartido: de qué trata, cuándo y cuánto
  function pvHabitHtml(h, card = true) {
    const wd = t('weekdaysShort').split(',');
    const days = !isQuit(h) && (h.freq || 'daily') === 'daily' && Array.isArray(h.days) && h.days.length && h.days.length < 7 ? h.days.map(i => wd[i]).filter(Boolean).join(' · ') : '';
    const meta = [isQuit(h) ? t('kindQuit') : packSub(h), days, h.timeOfDay && h.timeOfDay !== 'any' ? t('tod_' + h.timeOfDay) : '', !isQuit(h) && h.multi ? t('pvMulti') : ''].filter(Boolean);
    const inner = `<div class="pv-h-head"><span class="pv-ico">${esc(h.icon || '#')}</span><span class="grow" style="min-width:0"><b>${esc(h.name || '')}</b><span class="muted small">${esc(meta.join(' · '))}</span></span></div>${h.note ? `<p class="pv-note">${esc(h.note)}</p>` : ''}`;
    return card ? `<div class="pv-habit clay">${inner}</div>` : inner;
  }
  function pvSpecHtml(type, s = {}) {
    s = cleanSpec(type, s);
    const li = arr => `<ul class="pv-list">${arr.join('')}</ul>`;
    if (type === 'event') {
      const n = s.from && s.to ? diffDays(s.from, s.to) + 1 : 0;
      return `<div class="pv-facts"><div class="entry"><span>📅 ${esc(t('pvDates'))}</span><b>${s.from ? esc(fmtShort(s.from)) : ''} – ${s.to ? esc(fmtShort(s.to)) : ''}</b></div>${n > 0 ? `<div class="entry"><span>⏳ ${esc(t('pvLength'))}</span><b>${esc(t('pvDays', { n }))}</b></div>` : ''}</div>
        ${(s.cats || []).length ? `<h3 class="section-title">🏷️ ${esc(t('ledgerCats'))}</h3><div class="row wrap" style="gap:6px">${s.cats.map(c => `<span class="chip sm">${esc(c.icon || '')} ${esc(c.name || '')}</span>`).join('')}</div>` : `<p class="muted small">${esc(t('pvAllCats'))}</p>`}
        <p class="muted small">${esc(t('pvNoAmounts'))}</p>`;
    }
    if (type === 'project') {
      const g = s.goal || {};
      return `${s.desc ? `<p class="pv-desc">${esc(s.desc)}</p>` : ''}
        <div class="pv-facts"><div class="entry"><span>🎯 ${esc(t('pvGoal'))}</span><b>${esc(t(g.type === 'numeric' ? 'goalNumeric' : g.type === 'checklist' ? 'goalChecklist' : 'goalSimple'))}${g.type === 'numeric' ? ` · ${fmtNum(+g.start || 0)} → ${fmtNum(+g.target || 0)} ${esc(g.unit || '')}` : ''}</b></div>
        ${s.deadline ? `<div class="entry"><span>📅 ${esc(t('pvDeadline'))}</span><b>${esc(fmtShort(s.deadline))}</b></div>` : ''}</div>
        ${g.type === 'checklist' && (g.items || []).length ? `<h3 class="section-title">☑️ ${esc(t('goalItems'))}</h3>${li(g.items.map(x => `<li>☐ ${esc(x)}</li>`))}` : ''}
        ${(s.milestones || []).length ? `<h3 class="section-title">🏁 ${esc(t('milestones'))}</h3>${li(s.milestones.map(m => `<li>${esc(m.text || '')}${m.date ? ` <span class="muted small">· ${esc(fmtShort(m.date))}</span>` : ''}</li>`))}` : ''}
        <h3 class="section-title">📋 ${esc(t('pvHabits'))} · ${(s.habits || []).length}</h3>${(s.habits || []).length ? `<div class="stack" style="gap:8px">${s.habits.map(h => pvHabitHtml(h)).join('')}</div>` : `<p class="muted small">${esc(t('pvNoHabits'))}</p>`}`;
    }
    return `${pvHabitHtml(s, false)}<div class="pv-facts">
      <div class="entry"><span>${esc(t('habitFreq'))}</span><b>${esc(isQuit(s) ? t('kindQuit') : packSub(s))}</b></div>
      ${s.measure === 'amount' && s.unit ? `<div class="entry"><span>📏 ${esc(t('pvUnit'))}</span><b>${esc(s.unit)}${s.step ? ` · +${fmtNum(+s.step)}` : ''}</b></div>` : ''}
      ${+s.duration > 0 ? `<div class="entry"><span>⏱ ${esc(t('timer'))}</span><b>${+s.duration} min</b></div>` : ''}</div>`;
  }
  // «Ver» lo que alguien comparte en el chat antes de añadirlo (sin importes en los eventos)
  function openSpecPreview(type, s = {}, onAdd, extra = '') {
    s = cleanSpec(type, s);
    openModal({
      title: `${esc(s.icon || (type === 'event' ? '🗂️' : '📌'))} ${esc(s.name || '')}`, cls: 'pv-modal',
      body: `<p class="muted small" style="margin-top:0">${esc(type === 'event' ? t('evTitle') : t(type === 'project' ? 'gProject' : 'gHabit'))}</p>${extra}${pvSpecHtml(type, s)}`,
      foot: onAdd ? `<button class="btn primary block" data-pv="add">${ico('plus')} ${esc(t(type === 'event' ? 'evAddMine' : 'chatAdd'))}</button>` : '',
      onClick: (e, close) => { if (e.target.closest('[data-pv]')) { close(); onAdd(); } }
    });
  }
  // «Ver» una invitación a un grupo: qué se hace en él y cuánta gente hay, antes de unirse
  async function openInvitePreview(code, member) {
    let g = null; try { g = await rpc('kg_peek_invite', { p_code: code }); } catch (e) { g = null; }
    if (!g) { toast(t('joinInvalid')); return; }
    const extra = `<div class="pv-group clay"><span class="pv-ico">${esc(g.icon || '🎯')}</span><span class="grow"><b>${esc(g.name)}</b><span class="muted small">${esc(t('pvMembers', { n: g.members }))}${g.max_members ? ` / ${g.max_members}` : ''}</span></span></div>`;
    openModal({
      title: `👥 ${esc(g.name)}`, cls: 'pv-modal',
      body: `<p class="muted small" style="margin-top:0">${esc(t(g.kind === 'project' ? 'gProject' : 'gHabit'))}</p>${extra}${pvSpecHtml(g.kind === 'project' ? 'project' : 'habit', g.spec || {})}`,
      foot: member ? `<p class="muted small center" style="margin:0">${esc(t('chatAlready'))}</p>` : `<button class="btn primary block" data-pv="join">${esc(t('chatJoin'))}</button>`,
      onClick: (e, close) => { if (e.target.closest('[data-pv]')) { close(); try { localStorage.setItem(JOIN_KEY, code); } catch (err) { /* nada */ } processJoin(); } }
    });
  }
  async function shareAsGroup(kind, obj) {
    if (!auth) { toast(t('groupNeedLogin')); return; }
    try {
      const r = await rpc('kg_create_group', { p_name: obj.name, p_icon: obj.icon || '🎯', p_kind: kind, p_spec: kind === 'habit' ? habitSpec(obj) : projectSpec(obj), p_display_name: firstName() || 'Yo', p_local_id: obj.id });
      obj.groupId = r.group_id; save(); myGroups.at = 0;
      openGroup(obj.groupId, r.code);
    } catch (e) { toast(t('groupError', { e: e.message })); }
  }
  const findByGroup = gid => state.habits.find(h => h.groupId === gid) || state.projects.find(p => p.groupId === gid);
  // Sube el progreso de los últimos 7 días de cada hábito o proyecto en grupo
  async function pushGroupProgress() {
    if (!auth) return;
    const rows = [], today = todayKey();
    for (const h of state.habits) if (h.groupId) for (let i = 0; i < 7; i++) {
      const k = addDays(today, -i); if (k < firstKey(h)) continue;
      const v = cnt(h, k); rows.push({ group_id: h.groupId, user_id: auth.uid, day: k, value: v, done: isQuit(h) ? !v && k < today : periodState(h, periodStart(h, k)) === 'done', updated_at: new Date().toISOString() });
    }
    for (const p of state.projects) if (p.groupId) { const s = projectStats(p); rows.push({ group_id: p.groupId, user_id: auth.uid, day: today, value: Math.round(s.G * 100), done: s.achieved, updated_at: new Date().toISOString() }); }
    if (!rows.length) return;
    try { await sbFetch('/rest/v1/kg_progress?on_conflict=group_id,user_id,day', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows) }); } catch (e) { /* se reintenta en la próxima sincronización */ }
  }

  /* ---- pestaña Grupos: todas las personas con sus hábitos o proyectos compartidos ---- */
  const myGroups = { list: null, at: 0, busy: false, error: false };
  async function refreshMyGroups(force = false) {
    if (!auth || myGroups.busy || (!force && Date.now() - myGroups.at < 30000)) return;
    myGroups.busy = true;
    try { await pushGroupProgress(); myGroups.list = await rpc('kg_my_groups'); myGroups.error = false; }
    catch (e) { myGroups.error = true; }
    myGroups.at = Date.now(); myGroups.busy = false;
    if (state.ui.tab === 'chat' && !$('#modal-root').children.length) render();
  }
  // Foto de perfil (si la hay) o la inicial del nombre
  const avatarHtml = (m, extra = '') => { const img = safeImg(m.avatar || (auth && m.user_id === auth.uid && state.profile && state.profile.avatar)); return `<span class="avatar ${extra} ${img ? 'photo' : ''}" title="${esc(m.display_name || '')}">${img ? `<img src="${img}" alt="">` : esc((m.display_name || m.nametag || '?').charAt(0).toUpperCase())}</span>`; };
  const liveBadge = st => st === 'live' ? `<span class="live-chip">🔴 ${esc(t('gLiveNow'))}</span>` : st === 'voting' ? `<span class="vote-chip">🗳️ ${esc(t('gVotingNow'))}</span>` : '';
  /* ---------- pestaña Chat: amigos por @nametag, conversaciones (privadas y grupos) y libretas compartidas ---------- */
  const chatData = { friends: null, shares: null, at: 0, busy: false, error: false };
  const READ_KEY = 'keepgoing.chatRead';
  const readMap = () => { try { return JSON.parse(localStorage.getItem(READ_KEY)) || {}; } catch (e) { return {}; } };
  function markRead(gid, id) {
    if (!id) return;
    const m = readMap(); if ((m[gid] || 0) >= id) return;
    m[gid] = id; try { localStorage.setItem(READ_KEY, JSON.stringify(m)); } catch (e) { /* nada */ }
  }
  const unread = g => !!(auth && g.last && g.last.user_id !== auth.uid && g.last.id > (readMap()[g.id] || 0));
  async function refreshChat(force = false) {
    if (!auth || chatData.busy || (!force && Date.now() - chatData.at < 30000)) return;
    chatData.busy = true;
    try { [chatData.friends, chatData.shares, chatData.notes] = await Promise.all([rpc('kg_friends'), rpc('kg_ledger_list'), rpc('kg_my_notes').catch(() => chatData.notes || [])]); chatData.error = false; }
    catch (e) { chatData.error = true; }
    chatData.at = Date.now(); chatData.busy = false;
    if (state.ui.tab === 'chat' && !$('#modal-root').children.length) render();
  }
  const myName = () => (firstName() || myTag() || 'Yo').slice(0, 40);
  const personName = p => (p && (p.display_name || (p.nametag ? '@' + p.nametag : ''))) || '—';
  const chatName = g => g.chat === 'dm' ? personName(g.peer) : g.name;
  // v1.23: una imagen compartida solo se muestra si es de verdad un JPEG o PNG en base64
  const CARD_IMG = /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/;
  // Foto del grupo (si la hay) o su icono
  const groupAv = (g, size = 'lg') => { const img = safeImg(g && g.avatar); return img ? `<span class="avatar ${size} photo g-av"><img src="${img}" alt=""></span>` : `<span class="avatar ${size} g-av">${esc((g && g.icon) || '👥')}</span>`; };
  const chatAvatar = g => g.chat === 'dm' ? avatarHtml(g.peer || {}, 'lg') : groupAv(g, 'lg');
  function chatPreview(g) {
    const l = g.last; if (!l) return t('chatNoMsgs');
    if (l.kind === 'system') return t('chatPrevSys');
    const txt = l.kind === 'text' ? l.body : l.kind === 'invite' ? '🔗 ' + t('chatPrevInvite') : l.kind === 'photo' ? '📷 ' + t('chatPrevPhoto') : l.kind === 'audio' ? '🎤 ' + t('chatPrevAudio') : l.kind === 'sticker' ? '🙂 Sticker' : l.kind === 'file' ? t('chatPrevFile') : l.kind === 'share' && (l.payload || {}).type === 'card' ? t('chatPrevCard') : '📌 ' + t('chatPrevShare');
    if (l.user_id === auth.uid) return t('chatYou') + ': ' + txt;
    if (g.chat === 'dm') return txt;
    const m = (g.members || []).find(x => x.user_id === l.user_id);
    return (m ? m.display_name + ': ' : '') + txt;
  }
  const kindTag = g => g.chat === 'group' ? '' : g.chat === 'dm' ? '' : `<span class="chat-kind">${g.kind === 'habit' ? '📋' : '🎯'} ${esc(t(g.kind === 'habit' ? 'gHabit' : 'gProject'))}</span>`;
  const shareRange = s => s.range_from && s.range_to ? `${fmtShort(s.range_from)} – ${fmtShort(s.range_to)}` : '';
  function shareRow(s) {
    const tag = s.peer.nametag || s.peer.display_name || '?';
    return `<div class="swipe chat-sw" data-sw-w="76" data-cw="l:${esc(s.id)}">${chatSwActs()}<button class="chat-row swipe-front" data-ls-open="${esc(s.id)}"><span class="avatar lg wallet">${ico('wallet')}</span>
      <span class="chat-mid"><b class="ellipsis">${esc(s.mine ? t('lsSentTitle', { tag }) : t('lsTitle', { tag }))}</b><span class="muted small ellipsis">🔒 ${esc([s.title, shareRange(s)].filter(Boolean).join(' · '))}</span></span>
      <span class="chat-end"><span class="small muted">${esc(fmtTime(s.created_at))}</span></span></button></div>`;
  }
  // Deslizar una fila del Chat a la izquierda → papelera (salir del grupo, borrar el chat u ocultar la libreta)
  const chatSwActs = () => `<div class="swipe-acts"><button class="sw-act del" data-sw-chat aria-label="${esc(t('delete'))}" title="${esc(t('delete'))}">${ico('trash')}</button></div>`;
  function convRow(g) {
    const u = unread(g), live = g.live === 'live';
    // Con un reto en vivo, toda la fila va en rojo con la banda «RETO EN VIVO»
    return `<div class="swipe chat-sw" data-sw-w="76" data-cw="c:${esc(g.id)}">${chatSwActs()}<button class="chat-row swipe-front ${u ? 'unread' : ''} ${live ? 'live-row' : ''}" data-chat-open="${esc(g.id)}">${live ? `<span class="live-band" aria-hidden="true">${esc(t('liveBand'))}</span>` : ''}${chatAvatar(g)}
      <span class="chat-mid"><b class="ellipsis">${esc(chatName(g))}${g.chat === 'group' ? ` <span class="muted small">· ${g.members.length}</span>` : ''}</b><span class="muted small ellipsis">${kindTag(g)}${esc(chatPreview(g))}</span></span>
      <span class="chat-end"><span class="small muted">${g.last ? esc(fmtTime(g.last.created_at)) : ''}</span>${g.reqs ? `<span class="count-dot" title="${esc(t('reqPending', { n: g.reqs }))}">${g.reqs}</span>` : ''}${u ? '<span class="unread-dot" aria-label="•"></span>' : live ? '' : liveBadge(g.live)}</span></button></div>`;
  }
  function friendsHtml(fr) {
    const inc = fr.filter(f => f.status === 'incoming'), acc = fr.filter(f => f.status === 'accepted'), out = fr.filter(f => f.status === 'outgoing');
    const row = (f, actions) => `<div class="chat-row static">${avatarHtml(f, 'lg')}<span class="chat-mid"><b class="ellipsis">${esc(personName(f))}</b><span class="muted small ellipsis">@${esc(f.nametag || '')}</span></span><span class="chat-end row" style="gap:6px">${actions}</span></div>`;
    let html = `<form class="clay card friend-add" id="friend-form"><label class="field" style="margin:0"><span>${esc(t('friendAdd'))}</span><div class="row" style="gap:8px"><span class="at-prefix">@</span><input class="input grow" id="friend-tag" maxlength="20" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(t('nametagPh'))}"><button class="btn primary" type="submit">${esc(t('friendSend'))}</button></div></label></form>`;
    if (inc.length) html += `<h2 class="section-title">📨 ${esc(t('friendRequests'))}</h2><div class="chat-rows clay">${inc.map(f => row(f, `<button class="btn primary sm" data-fr-yes="${f.user_id}">${esc(t('friendAccept'))}</button><button class="chip sm" data-fr-no="${f.user_id}">${esc(t('friendDecline'))}</button>`)).join('')}</div>`;
    html += `<h2 class="section-title">👋 ${esc(t('friendsTitle'))} · ${acc.length}</h2>`;
    html += acc.length ? `<div class="chat-rows clay">${acc.map(f => row(f, `<button class="icon-btn sm" data-fr-dm="${f.user_id}" aria-label="${esc(t('friendMessage'))}" title="${esc(t('friendMessage'))}">${ico('chat')}</button><button class="icon-btn sm" data-fr-rm="${f.user_id}" aria-label="${esc(t('friendRemove'))}" title="${esc(t('friendRemove'))}">${ico('x')}</button>`)).join('')}</div>` : `<p class="muted">${esc(t('friendsEmpty'))}</p>`;
    if (out.length) html += `<h2 class="section-title">⏳ ${esc(t('friendPending'))}</h2><div class="chat-rows clay">${out.map(f => row(f, `<button class="chip sm" data-fr-rm="${f.user_id}">${esc(t('cancel'))}</button>`)).join('')}</div>`;
    return html;
  }
  function viewChat() {
    const v = state.ui.chatView === 'friends' ? 'friends' : 'chats';
    let html = topBar(auth ? `<button class="icon-btn" data-act="chat-friends" aria-label="${esc(t('friendAdd'))}" title="${esc(t('friendAdd'))}">${ico('user')}</button><button class="icon-btn" data-act="chat-new" aria-label="${esc(t('chatNewGroup'))}" title="${esc(t('chatNewGroup'))}">${ico('plus')}</button>` : '');
    html += `<h1 class="page-title">${esc(t('tabChat'))}</h1>`;
    if (!auth) return html + emptyState('chat', t('chatLoginTitle'), t('chatLoginSub'), `<button class="btn primary" data-act="chat-login">${esc(t('signIn'))}</button>`);
    refreshMyGroups(); refreshChat();
    const fr = chatData.friends || [], inc = fr.filter(f => f.status === 'incoming').length;
    html += `<div class="seg view-seg" role="tablist">${[['chats', '💬', 'chatChats'], ['friends', '👋', 'chatFriends']].map(([k, e, l]) => `<button data-act="cview" data-v="${k}" role="tab" aria-selected="${v === k}" class="${v === k ? 'on' : ''}"><span class="vi">${e}</span> ${esc(t(l))}${k === 'friends' && inc ? ` <span class="count-dot">${inc}</span>` : ''}</button>`).join('')}</div>`;
    if (!myTag()) html += `<div class="banner clay">🏷️<span class="grow">${esc(t('chatNeedTag'))}</span><button class="chip" data-act="profile">${esc(t('chatSetTag'))}</button></div>`;
    if (v === 'friends') return html + (chatData.friends ? friendsHtml(fr) : `<p class="muted center">${esc(t(chatData.error ? 'groupsOffline' : 'groupsLoading'))}</p>`);
    if (inc) html += `<button class="banner clay" data-act="cview" data-v="friends" style="width:100%;border:0;text-align:left;color:inherit">📨<span class="grow"><b>${esc(t('friendRequestsN', { n: inc }))}</b></span>${ico('right')}</button>`;
    if (!myGroups.list) return html + `<p class="muted center">${esc(t(myGroups.error ? 'groupsOffline' : 'groupsLoading'))}</p>`;
    const shares = chatData.shares || [], convs = myGroups.list;
    if (!shares.length && !convs.length) return html + emptyState('chat', t('chatEmptyTitle'), t('chatEmptySub'), `<div class="row wrap" style="justify-content:center"><button class="btn primary" data-act="cview" data-v="friends">${ico('user')} ${esc(t('friendAdd'))}</button><button class="btn" data-act="chat-new">${ico('plus')} ${esc(t('chatNewGroup'))}</button></div>`);
    html += notesHtml();
    if (shares.length) html += `<h2 class="section-title">👛 ${esc(t('lsShared'))}</h2><div class="chat-rows clay">${shares.map(shareRow).join('')}</div>`;
    if (convs.length) html += `<h2 class="section-title">💬 ${esc(t('chatChats'))}</h2><div class="chat-rows clay">${convs.map(convRow).join('')}</div>`;
    return html;
  }
  /* ---- «Notas para ti»: lo que te han puntuado tus compañeros en los rankings ya publicados ---- */
  const NOTES_KEY = 'keepgoing.notes';
  const noteId = n => `${n.group_id}|${n.period}|${n.from_user}`;
  const notesPrefs = () => { try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '{}'); } catch (e) { return {}; } };
  const notesSave = p => { try { localStorage.setItem(NOTES_KEY, JSON.stringify(p)); } catch (e) { /* nada */ } };
  const visibleNotes = () => { const hid = new Set(notesPrefs().hidden || []); return (chatData.notes || []).filter(n => !hid.has(noteId(n))); };
  function noteCard(n, seen) {
    const fresh = seen && n.created_at > seen;
    return `<div class="note-card ${fresh ? 'fresh' : ''}">${avatarHtml({ display_name: n.from_name, nametag: n.from_tag, avatar: n.from_avatar }, 'sm')}
      <div class="grow" style="min-width:0"><div class="row" style="gap:8px;justify-content:space-between"><b class="ellipsis">${esc(n.from_name)}</b><b class="note-pts">${n.points}/10</b></div>
        <span class="muted small ellipsis">${esc(n.group_icon || '👥')} ${esc(n.group_name || '')} · ${esc(fmtShort(String(n.created_at).slice(0, 10)))}</span>
        ${n.note ? `<p class="note-text">«${esc(n.note)}»</p>` : ''}</div>
      <button class="icon-btn sm" data-note-hide="${esc(noteId(n))}" aria-label="${esc(t('notesHide'))}" title="${esc(t('notesHide'))}">${ico('x')}</button></div>`;
  }
  function notesHtml() {
    const list = visibleNotes(); if (!list.length) return '';
    const p = notesPrefs(), seen = p.seen || '', fresh = list.filter(n => !seen || n.created_at > seen).length;
    return `<h2 class="section-title">📝 ${esc(t('notesTitle'))}${fresh ? ` <span class="count-dot">${fresh}</span>` : ''}</h2><div class="chat-rows clay notes-box">${list.slice(0, 3).map(n => noteCard(n, seen || '0')).join('')}
      ${list.length > 3 || fresh ? `<div class="row" style="justify-content:center;gap:8px;padding:6px 0 2px">${list.length > 3 ? `<button class="chip sm" data-act="notes-all">${esc(t('notesAll', { n: list.length }))}</button>` : ''}${fresh ? `<button class="chip sm" data-act="notes-seen">✓ ${esc(t('notesSeen'))}</button>` : ''}</div>` : ''}</div>`;
  }
  function openNotes() {
    const seen = notesPrefs().seen || '0';
    openModal({
      title: `📝 ${esc(t('notesTitle'))}`, body: '<div id="notes-all"></div>',
      onMount: w => { const draw = () => { const l = visibleNotes(); $('#notes-all', w).innerHTML = l.length ? `<div class="stack" style="gap:8px">${l.map(n => noteCard(n, seen)).join('')}</div>` : `<p class="muted center">${esc(t('notesNone'))}</p>`; }; w._draw = draw; draw(); },
      onClick: (e, close, w) => { const b = e.target.closest('[data-note-hide]'); if (b) { hideNote(b.dataset.noteHide); w._draw(); } },
      onClose: () => { markNotesSeen(); render(); }
    });
  }
  function hideNote(id) { const p = notesPrefs(); p.hidden = [...new Set([...(p.hidden || []), id])].slice(-300); notesSave(p); }
  function markNotesSeen() { const l = chatData.notes || []; if (!l.length) return; const p = notesPrefs(); p.seen = l.reduce((a, n) => n.created_at > a ? n.created_at : a, p.seen || ''); notesSave(p); }
  async function chatAction(fn, okMsg) {
    try { const r = await fn(); if (okMsg) toast(okMsg); sfx('toggle'); chatData.at = 0; myGroups.at = 0; await Promise.all([refreshChat(true), refreshMyGroups(true)]); return r; }
    catch (e) { toast(chatErr(e)); return null; }
  }
  const chatErr = e => {
    const m = String(e && e.message || e);
    for (const [re, k] of [[/^plan$/, 'plUpsellShort'], [/no such user/, 'friendNoUser'], [/self/, 'friendSelf'], [/slow down/, 'chatSlow'], [/not a friend/, 'friendNotFriend'], [/group full/, 'chatFull'], [/not allowed/, 'chatNoPerm']]) if (re.test(m)) return t(k);
    return t('groupError', { e: m });
  };
  async function sendFriendRequest(raw) {
    const tag = GG.toNametag(raw);
    if (!GG.isNametag(tag)) { toast(t('nametagBad')); return false; }
    const r = await chatAction(() => rpc('kg_friend_request', { p_tag: tag }));
    if (r) toast(t(r.status === 'accepted' ? 'friendNowFriends' : 'friendSent', { tag: '@' + tag }));
    return !!r;
  }
  async function openDm(userId) {
    const gid = await chatAction(() => rpc('kg_dm_open', { p_user: userId, p_display_name: myName() }));
    if (gid) openGroup(gid, null, 'chat');
  }
  function openNewChat() {
    const friends = (chatData.friends || []).filter(f => f.status === 'accepted');
    const ICONS_G = ['💬', '👥', '🔥', '🏋️', '📚', '🎮', '✈️', '🍕', '💼', '🎵'];
    let icon = ICONS_G[0];
    openModal({
      title: `${ico('plus')} ${esc(t('chatNewGroup'))}`,
      body: `<div class="stack" style="gap:14px">
        <label class="field"><span>${esc(t('chatGroupName'))}</span><input class="input" id="cg-name" maxlength="80" placeholder="${esc(t('chatGroupNamePh'))}"></label>
        <div class="field"><span>${esc(t('habitIcon'))}</span><div class="row wrap" style="gap:6px">${ICONS_G.map((e, i) => `<button type="button" class="chip ${i ? '' : 'on'}" data-cg-ico="${e}">${e}</button>`).join('')}</div></div>
        <div class="field"><span>${esc(t('chatPickFriends'))}</span>${friends.length ? `<div class="row wrap" style="gap:8px">${friends.map(f => `<label class="check-chip"><input type="checkbox" data-cg-user="${f.user_id}"><span>${esc(personName(f))}</span></label>`).join('')}</div>` : `<p class="muted small" style="margin:0">${esc(t('chatNoFriends'))}</p>`}</div>
        <p class="muted small" style="margin:0">${esc(t('chatGroupHint'))}</p></div>`,
      foot: `<button class="btn primary block" data-cg="go">${esc(t('chatCreate'))}</button>`,
      onClick: async (e, close, w) => {
        const ib = e.target.closest('[data-cg-ico]');
        if (ib) { icon = ib.dataset.cgIco; $$('[data-cg-ico]', w).forEach(b => b.classList.toggle('on', b === ib)); return; }
        const b = e.target.closest('[data-cg]'); if (!b) return;
        const name = $('#cg-name', w).value.trim();
        if (!name) { toast(t('chatGroupName')); $('#cg-name', w).focus(); return; }
        const members = $$('[data-cg-user]', w).filter(i => i.checked).map(i => i.dataset.cgUser);
        b.disabled = true;
        const r = await chatAction(() => rpc('kg_chat_create', { p_name: name, p_icon: icon, p_display_name: myName(), p_members: members }));
        if (!r) { b.disabled = false; return; }
        close(); openGroup(r.group_id, r.code, 'chat');
      }
    });
  }
  // «+» del Chat: crear un grupo o pedir unirse a uno con su ID
  function openChatPlus() {
    openModal({
      title: `${ico('plus')} ${esc(t('tabChat'))}`,
      body: `<div class="stack" style="gap:10px">
        <button class="create-opt clay" data-cp="new"><span style="font-size:28px">👥</span><span class="grow"><b>${esc(t('chatNewGroup'))}</b><br><span class="muted small">${esc(t('chatGroupHint'))}</span></span>${ico('right')}</button>
        <button class="create-opt clay" data-cp="join"><span style="font-size:28px">🆔</span><span class="grow"><b>${esc(t('reqJoinTitle'))}</b><br><span class="muted small">${esc(t('reqJoinSub'))}</span></span>${ico('right')}</button></div>`,
      onClick: (e, close) => {
        const b = e.target.closest('[data-cp]'); if (!b) return;
        close();
        if (b.dataset.cp === 'new') openNewChat(); else openJoinById();
      }
    });
  }
  function openJoinById() {
    openModal({
      title: `🆔 ${esc(t('reqJoinTitle'))}`,
      body: `<form id="jid-f" class="stack" style="gap:12px"><label class="field"><span>${esc(t('gId'))}</span><input class="input mono" id="jid" maxlength="16" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABC123"></label>
        <p class="muted small" style="margin:0">${esc(t('reqJoinHint'))}</p></form>`,
      foot: `<button class="btn primary block" data-jid="go">${esc(t('reqSend'))}</button>`,
      onMount: w => { $('#jid', w).focus(); w.addEventListener('submit', e => { e.preventDefault(); $('[data-jid]', w).click(); }); },
      onClick: async (e, close, w) => {
        const b = e.target.closest('[data-jid]'); if (!b) return;
        const code = $('#jid', w).value.trim().toUpperCase(); if (!code) { $('#jid', w).focus(); return; }
        b.disabled = true;
        try { const r = await rpc('kg_request_join', { p_code: code, p_display_name: myName() }); sfx('pop'); toast(t('reqSent', { name: `${r.icon || ''} ${r.name}` })); close(); }
        catch (err) { b.disabled = false; const m = String(err.message); toast(/no such group/.test(m) ? t('reqNoGroup') : /already member/.test(m) ? t('reqAlready') : chatErr(err)); }
      }
    });
  }
  function chatClick(e) {
    let el;
    if ((el = e.target.closest('[data-note-hide]'))) { hideNote(el.dataset.noteHide); render(); return true; }
    if (e.target.closest('[data-act="notes-all"]')) { openNotes(); return true; }
    if (e.target.closest('[data-act="notes-seen"]')) { markNotesSeen(); render(); return true; }
    if ((el = e.target.closest('[data-sw-chat]'))) { const row = el.closest('.chat-sw'); closeSwipe(); jigRemove(row && row.querySelector('.chat-row')); return true; }
    if ((el = e.target.closest('[data-chat-open]'))) { openGroup(el.dataset.chatOpen, null, 'chat'); return true; }
    if ((el = e.target.closest('[data-ls-open]'))) { const s = (chatData.shares || []).find(x => x.id === el.dataset.lsOpen); if (s && s.pw) openPwShare(s.id); else openLedgerShareView(el.dataset.lsOpen); return true; }
    if ((el = e.target.closest('[data-fr-dm]'))) { openDm(el.dataset.frDm); return true; }
    if ((el = e.target.closest('[data-fr-yes]'))) { el.disabled = true; chatAction(() => rpc('kg_friend_respond', { p_user: el.dataset.frYes, p_accept: true }), t('friendAccepted')); return true; }
    if ((el = e.target.closest('[data-fr-no]'))) { el.disabled = true; chatAction(() => rpc('kg_friend_respond', { p_user: el.dataset.frNo, p_accept: false })); return true; }
    if ((el = e.target.closest('[data-fr-rm]'))) {
      const f = (chatData.friends || []).find(x => x.user_id === el.dataset.frRm);
      const u = el.dataset.frRm;
      (f && f.status === 'accepted' ? confirmDialog(t('friendRemoveQ', { name: personName(f) })) : Promise.resolve(true)).then(ok => { if (ok) chatAction(() => rpc('kg_friend_remove', { p_user: u })); });
      return true;
    }
    return false;
  }

  /* ---- pantalla de un grupo ---- */
  const fmtWhen = iso => { try { return new Date(iso).toLocaleString(state.lang, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso; } };
  const fmtTime = iso => { try { const d = new Date(iso); return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString(state.lang, { hour: '2-digit', minute: '2-digit' }) : d.toLocaleString(state.lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  function sysText(m) {
    const p = { ...(m.payload || {}) };
    if (p.ends) p.ends = fmtWhen(p.ends);
    if (p.rate != null) p.rate = fmtNum(+p.rate);
    return t('sys_' + m.body, p);
  }
  const AUDIO = new Map(); // audios ya descargados (id → URL del blob) mientras dura la sesión
  const fmtDur = s => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;
  // Biblioteca de stickers de este dispositivo (imágenes .webp/.png, p. ej. los guardados o copiados de WhatsApp)
  const STK_KEY = 'keepgoing.stickers', STK_RE = /^data:image\/(webp|png|gif|jpeg);base64,[A-Za-z0-9+/=]+$/;
  const stickersGet = () => { try { const a = JSON.parse(localStorage.getItem(STK_KEY) || '[]'); return Array.isArray(a) ? a.filter(s => STK_RE.test(s)) : []; } catch (e) { return []; } };
  const stickersSet = a => { try { localStorage.setItem(STK_KEY, JSON.stringify(a.slice(0, 80))); return true; } catch (e) { toast(t('stkFull')); return false; } };
  function stickerFromFile(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        for (const S of [160, 128, 96]) {
          const cv = document.createElement('canvas'); cv.width = cv.height = S;
          const k = Math.min(S / img.naturalWidth, S / img.naturalHeight), w = img.naturalWidth * k, h = img.naturalHeight * k;
          cv.getContext('2d').drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
          for (const [mime, q] of [['image/webp', .85], ['image/webp', .6], ['image/png']]) {
            const d = cv.toDataURL(mime, q);
            if (d.startsWith(`data:${mime};`) && d.length <= 15000) { res(d); return; }
          }
        }
        rej(new Error('big'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img')); };
      img.src = url;
    });
  }
  async function importStickers(files) {
    const list = stickersGet(); let n = 0;
    for (const file of files) {
      if (!/^image\//.test(file.type || 'image/')) continue;
      try { const s = await stickerFromFile(file); if (!list.includes(s)) { list.unshift(s); n++; } } catch (e) { /* se salta */ }
    }
    if (n && stickersSet(list)) toast(t('stkImported', { n }));
    else if (!n) toast(t('stkNone'));
    return n;
  }
  async function openGroup(gid, freshCode = null, tab = 'profile') {
    if (!auth) { toast(t('groupNeedLogin')); return; }
    const G = { tab, info: null, code: freshCode, msgs: [], sig: '', gone: false, timers: [], seen: new Set(), seenFor: '', rates: {}, rec: null };
    let wref = null;
    const me = () => G.info && G.info.members.find(m => m.user_id === auth.uid);
    const can = p => GG.can(me(), p);
    const isLeader = () => !!me() && me().role === 'lider';
    const isDm = () => !!G.info && G.info.group.chat === 'dm';
    const isChat = () => !!G.info && !!G.info.group.chat;
    const peer = () => G.info && G.info.members.find(m => m.user_id !== auth.uid);
    const memberName = id => { const m = G.info && G.info.members.find(x => x.user_id === id); return m ? m.display_name : '—'; };
    const isMod = () => !!me() && ['lider', 'colider'].includes(me().role);
    // El líder mantiene al día la ficha del grupo (p. ej., los hábitos vinculados del proyecto)
    const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).filter(k => v[k] != null).sort().map(k => [k, canon(v[k])])) : v;
    const syncSpec = () => {
      if (!G.info || isChat() || !isLeader()) return;
      const o = findByGroup(gid); if (!o) return;
      const s = G.info.group.kind === 'habit' ? habitSpec(o) : projectSpec(o);
      if (JSON.stringify(canon(s)) === JSON.stringify(canon(G.info.group.spec || {}))) return;
      G.info.group.spec = s; rpc('kg_set_spec', { p_group: gid, p_spec: s }).catch(() => {});
    };
    const loadInfo = async () => {
      try { G.info = await rpc('kg_group_info', { p_group: gid }); }
      catch (e) { if (/not a member/.test(e.message)) { G.gone = true; return; } throw e; }
      syncSpec();
      if (!G.code && can('invite')) {
        const inv = await sbFetch(`/rest/v1/kg_invites?group_id=eq.${gid}&expires_at=gt.${new Date().toISOString()}&select=code&order=created_at.desc&limit=1`);
        G.code = inv[0] && inv[0].code;
      }
    };
    const loadMsgs = async () => {
      const rows = await sbFetch(`/rest/v1/kg_messages?group_id=eq.${gid}&select=id,user_id,kind,body,payload,deleted,created_at&order=id.desc&limit=120`);
      const sig = rows.map(r => r.id + (r.deleted ? 'd' : '')).join(',');
      if (sig === G.sig) return false;
      const fresh = G.msgs.length && rows.length && rows[0].id > G.msgs[G.msgs.length - 1].id && rows[0].user_id !== auth.uid;
      G.msgs = rows.reverse(); G.sig = sig;
      const photos = G.msgs.filter(m => m.kind === 'photo' && m.user_id !== auth.uid && !m.deleted).map(m => m.payload && m.payload.media).join(',');
      if (photos && photos !== G.seenFor) { try { (await rpc('kg_media_seen', { p_group: gid })).forEach(id => G.seen.add(id)); G.seenFor = photos; } catch (e) { /* sin conexión */ } }
      if (G.msgs.length) markRead(gid, G.msgs[G.msgs.length - 1].id);
      if (fresh) sfx('pop');
      return true;
    };
    const body = () => wref && $('#grp', wref);
    const groupPic = g => isMod() && !isDm()
      ? `<label class="g-pic edit" title="${esc(t('gPicChange'))}">${groupAv(g, 'xl')}<span class="photo-cam" aria-hidden="true">${ico('camera')}</span><input type="file" accept="image/*" class="sr-only" data-g-pic aria-label="${esc(t('gPicChange'))}"></label>`
      : `<span class="g-pic">${groupAv(g, 'xl')}</span>`;
    const picRm = g => isMod() && g.avatar ? `<button class="link-btn small" data-g="pic-rm">${esc(t('gPicRemove'))}</button>` : '';
    // Hábito o proyecto del grupo en tu dispositivo (al entrar por solicitud o al convertirse el grupo)
    const localBanner = () => {
      const g = G.info.group, o = findByGroup(gid);
      if (!o) return `<section class="clay card banner-cta"><span style="font-size:26px">${esc(g.icon || '🎯')}</span><span class="grow"><b>${esc(t(g.kind === 'habit' ? 'gLinkHabit' : 'gLinkProject', { name: (g.spec && g.spec.name) || g.name }))}</b><br><span class="muted small">${esc(t('gLinkSub'))}</span></span><button class="btn primary" data-g="link-local">${ico('plus')} ${esc(t('chatAdd'))}</button></section>`;
      const miss = g.kind === 'project' ? missingSpecHabits(o, g.spec) : [];
      return miss.length ? `<section class="clay card banner-cta"><span style="font-size:26px">📋</span><span class="grow"><b>${esc(t('gLinkHabits', { n: miss.length }))}</b><br><span class="muted small">${esc(miss.map(x => `${x.icon || ''} ${x.name}`).join(' · '))}</span></span><button class="btn primary" data-g="link-habits">${ico('plus')} ${esc(t('chatAdd'))}</button></section>` : '';
    };

    /* --- perfil del grupo --- */
    const chatProfileTab = () => {
      const { group: g, members, max_members: max } = G.info, link = G.code ? `${APP_URL}?join=${G.code}` : '';
      return `<div class="stack" style="gap:16px">
        <section class="clay card g-profile"><div class="g-head">${groupPic(g)}<div class="grow" style="min-width:0"><h2 class="ellipsis" style="margin:0">${esc(g.name)}</h2><div class="muted">${esc(t('chatGroupKind'))} · ${members.length}${max ? `/${max}` : ''} ${esc(t('gMembersN')).toLowerCase()}</div>${g.code ? `<div class="row" style="gap:8px;margin-top:6px"><span class="muted small">${esc(t('gId'))}</span><b class="mono">${esc(g.code)}</b><button class="chip sm" data-g="copy-id">${esc(t('gCopyId'))}</button></div>` : ''}${picRm(g)}</div></div>
          <div class="g-people" style="margin-top:12px">${members.map(m => `<span class="g-person">${avatarHtml(m, 'sm')}<span class="small ellipsis">${esc(m.user_id === auth.uid ? t('gYou') : m.display_name)}</span></span>`).join('')}</div></section>
        ${can('invite') ? `<section class="clay card"><h3 class="section-title">🔗 ${esc(t('gInvite'))}</h3><button class="btn primary" data-g="add-friends">${ico('user')} ${esc(t('chatAddFriends'))}</button>${link ? `<div class="row wrap" style="margin-top:12px"><input class="input grow" readonly value="${esc(link)}" style="flex:1 1 220px"><button class="btn" data-g="share">${esc(t('share'))}</button><button class="chip" data-g="newcode">${esc(t('gNewLink'))}</button></div><p class="muted small" style="margin-bottom:0">${esc(t('gInviteHint'))}</p>` : ''}</section>` : ''}
        ${isLeader() ? `<section class="clay card banner-cta"><span style="font-size:26px">🏆</span><span class="grow"><b>${esc(t('gUpgrade'))}</b><br><span class="muted small">${esc(t('gUpgradeSub'))}</span></span><button class="btn primary" data-g="upgrade">${esc(t('gUpgradeBtn'))}</button></section>` : ''}
        <div class="center"><button class="chip danger-text" data-g="leave">${esc(t('chatLeave'))}</button></div>
      </div>`;
    };
    const profileTab = () => {
      if (isChat()) return chatProfileTab();
      const { group: g, members, max_members: max, launched, wins, losses, active } = G.info;
      const stat = (label, val, extra = '') => `<div class="g-stat"><span class="muted small">${esc(label)}</span><b>${val}</b>${extra}</div>`;
      const link = G.code ? `${APP_URL}?join=${G.code}` : '';
      let live;
      if (active && active.status === 'live') {
        const d = Math.min(active.days, Math.max(1, Math.round((Date.parse(G.info.today) - Date.parse(active.starts_on)) / 864e5) + 1));
        live = `<button class="g-live on" data-gt="live"><span class="g-live-dot"></span><span class="grow"><b>${esc(t('gLiveNow'))}</b><span>${esc(active.title)}</span><span class="small">${esc(t('gLiveDay', { d, n: active.days, t: active.target }))}</span></span>${ico('right')}</button>`;
      } else if (active && active.status === 'voting') {
        live = `<button class="g-live voting" data-gt="live"><span>🗳️</span><span class="grow"><b>${esc(t('gVotingNow'))}</b><span>${esc(active.title)}</span><span class="small">${esc(t('liveVoteEnds', { when: fmtWhen(active.vote_ends_at) }))}</span></span>${ico('right')}</button>`;
      } else live = `<div class="g-live off"><span>⚪</span><span class="grow"><b>${esc(t('gNoLive'))}</b></span></div>`;
      return `<div class="stack" style="gap:16px">
        ${localBanner()}
        <section class="clay card g-profile">
          <div class="g-head">${groupPic(g)}<div class="grow" style="min-width:0"><h2 class="ellipsis" style="margin:0">${esc(g.name)}</h2><div class="muted">${esc(t(g.kind === 'habit' ? 'gHabit' : 'gProject'))}: <b>${esc((g.spec && g.spec.name) || g.name)}</b></div>${picRm(g)}</div></div>
          <div class="g-stats">
            ${stat(t('gId'), `<span class="mono">${esc(g.code || '—')}</span>`, g.code ? `<button class="chip sm" data-g="copy-id">${esc(t('gCopyId'))}</button>` : '')}
            ${stat(t('gMembersN'), `${members.length}${max ? `<small>/${max}</small>` : ''}`, max ? `<span class="beta-chip">${esc(t('gBeta', { n: max }))}</span>` : '')}
            ${stat(t('gLaunched'), launched)}
            ${stat(t('gWL'), `<span class="wl"><span class="w">${wins}</span>-<span class="l">${losses}</span></span>`)}
            ${stat(t('gRanking'), g.ranking_on ? `${esc(t('gRankOn'))} · ${esc(t('freq_' + g.ranking_freq))}` : esc(t('gRankOff')))}
          </div>
          ${live}
        </section>
        ${g.spec && Object.keys(g.spec).length ? `<section class="clay card g-spec"><h3 class="section-title">${ico('eye')} ${esc(t(g.kind === 'habit' ? 'gSpecHabit' : 'gSpecProject'))}</h3>${pvSpecHtml(g.kind === 'habit' ? 'habit' : 'project', g.spec)}</section>` : ''}
        ${can('invite') && link ? `<section class="clay card"><h3 class="section-title">🔗 ${esc(t('gInvite'))}</h3><div class="row wrap"><input class="input grow" readonly value="${esc(link)}" style="flex:1 1 220px"><button class="btn primary" data-g="share">${esc(t('share'))}</button><button class="btn" data-g="invite-chat">${ico('send')} ${esc(t('shareToChat'))}</button><button class="chip" data-g="newcode">${esc(t('gNewLink'))}</button></div><p class="muted small" style="margin-bottom:0">${esc(t('gInviteHint'))}</p></section>` : ''}
        <div class="center"><button class="chip danger-text" data-g="leave">${esc(t('groupLeave'))}</button></div>
      </div>`;
    };

    /* --- chat --- */
    const myGroupCodes = () => new Set(((myGroups.list) || []).map(g => g.code));
    // Puntuaciones entre compañeros: se publican en el chat cuando cierra el periodo del ranking
    const ratesHtml = p => {
      const rows = G.rates[p.period];
      if (!rows) return `<div class="rate-pub"><span class="muted small">${esc(t('loading'))}</span></div>`;
      if (!rows.length) return '';
      return `<div class="rate-pub clay"><b>⭐ ${esc(t('ratePubTitle'))}</b>${rows.map(r => `<div class="rate-row"><span class="grow">${esc(memberName(r.from_user))} → <b>${esc(memberName(r.to_user))}</b></span><b class="rate-pts">${r.points}/10</b>${r.note ? `<p class="small rate-note">«${esc(r.note)}»</p>` : ''}</div>`).join('')}</div>`;
    };
    const loadRates = () => {
      for (const m of G.msgs) {
        const p = m.payload || {};
        if (m.kind !== 'system' || m.body !== 'rank_awarded' || !(+p.rates > 0) || G.rates[p.period] !== undefined) continue;
        G.rates[p.period] = null;
        sbFetch(`/rest/v1/kg_rank_rates?group_id=eq.${gid}&period=eq.${encodeURIComponent(p.period)}&select=from_user,to_user,points,note&order=to_user`)
          .then(rows => { G.rates[p.period] = rows; draw(true); }).catch(() => { delete G.rates[p.period]; });
      }
    };
    const stickerSrc = p => /^image\/(webp|png|gif|jpeg)$/.test(p.mime || '') && /^[A-Za-z0-9+/=]+$/.test(p.data || '') ? `data:${p.mime};base64,${p.data}` : '';
    // Un mensaje mal formado se salta en lugar de dejar el chat en blanco
    const msgHtml = m => { try { return msgHtml1(m); } catch (e) { return ''; } };
    const msgHtml1 = m => {
      if (m.kind === 'system') return `<div class="msg sys">${esc(sysText(m))}${m.body === 'rank_awarded' && +(m.payload || {}).rates > 0 ? ratesHtml(m.payload) : ''}</div>`;
      const mine = m.user_id === auth.uid, canDel = !m.deleted && (mine || (!isDm() && can('moderate')));
      let inner;
      if (m.deleted) inner = `<i class="muted">${esc(t('chatDeleted'))}</i>`;
      else if (m.kind === 'invite') {
        const p = m.payload || {}, member = myGroupCodes().has(p.group_code);
        inner = `<div class="msg-card"><span class="g-icon">${esc(p.icon || '🎯')}</span><span class="grow"><b>${esc(t('chatInviteCard', { name: p.name || '' }))}</b><span class="muted small">${esc(t(p.kind === 'project' ? 'gProject' : 'gHabit'))}: ${esc(p.spec_name || p.name || '')}</span></span><span class="msg-acts"><button class="btn sm" data-gc-peek="${esc(p.code)}" data-gc-mem="${member ? 1 : 0}">${esc(t('chatView'))}</button>${member ? `<span class="muted small" style="align-self:center">${esc(t('chatAlready'))}</span>` : `<button class="btn primary sm" data-gc-join="${esc(p.code)}">${esc(t('chatJoin'))}</button>`}</span></div>`;
      } else if (m.kind === 'share' && (m.payload || {}).type === 'card') {
        // v1.23: imagen compartida (maestría, trofeo, contrato, carnet…)
        const p = m.payload || {}, ok = CARD_IMG.test(String(p.img || ''));
        inner = ok ? `<button class="msg-img" data-gc-img="${m.id}" aria-label="${esc(p.title || t('chatPrevCard'))}"><img src="${p.img}" alt="" draggable="false"></button>${p.title ? `<span class="msg-img-t small">${esc(p.title)}</span>` : ''}` : `<span class="msg-text muted">${esc(p.title || t('chatPrevCard'))}</span>`;
      } else if (m.kind === 'share' && (m.payload || {}).type === 'event') {
        const v = cleanSpec('event', (m.payload || {}).event);
        inner = `<div class="msg-card"><span class="g-icon">${esc(v.icon || '🗂️')}</span><span class="grow"><b>${esc(v.name || '')}</b><span class="muted small">${esc(t('evTitle'))} · ${v.from ? esc(fmtShort(v.from)) : ''} – ${v.to ? esc(fmtShort(v.to)) : ''}${(v.cats || []).length ? ' · ' + (v.cats || []).map(c => esc(`${c.icon || ''} ${c.name || ''}`)).join(', ') : ''}</span></span><span class="msg-acts"><button class="btn sm" data-gc-view="${m.id}">${esc(t('chatView'))}</button><button class="btn sm primary" data-gc-add="${m.id}">${ico('plus')} ${esc(t('evAddMine'))}</button></span></div>`;
      } else if (m.kind === 'share') {
        const p = m.payload || {}, s = cleanSpec(p.type === 'project' ? 'project' : 'habit', p.spec);
        inner = `<div class="msg-card"><span class="g-icon">${esc(s.icon || '📌')}</span><span class="grow"><b>${esc(s.name || '')}</b><span class="muted small">${esc(t('chatShareCard', { kind: t(p.type === 'project' ? 'gProject' : 'gHabit') }))}</span></span><span class="msg-acts"><button class="btn sm" data-gc-view="${m.id}">${esc(t('chatView'))}</button><button class="btn sm primary" data-gc-add="${m.id}">${ico('plus')} ${esc(t('chatAdd'))}</button></span></div>`;
      } else if (m.kind === 'photo') {
        // Foto de una sola vez: cada persona la abre una vez; quien la envía no puede volver a verla
        const p = m.payload || {};
        inner = mine ? `<span class="media-chip">📷 ${esc(t('photoOnceSent'))}</span>` : G.seen.has(p.media) ? `<span class="media-chip muted">📷 ${esc(t('photoOpened'))}</span>` : `<button class="media-chip once" data-gc-photo="${esc(p.media)}">📷 ${esc(t('photoOnceOpen'))}</button>`;
      } else if (m.kind === 'audio') {
        const p = m.payload || {}, url = AUDIO.get(p.media);
        inner = url ? `<audio class="audio-msg" controls src="${url}"></audio>` : `<button class="media-chip" data-gc-audio="${esc(p.media)}">${ico('play')} 🎤 ${esc(fmtDur(+p.dur || 0))}</button>`;
      } else if (m.kind === 'file') {
        // PDF de la calculadora: se abre (o descarga) las veces que se quiera
        const p = m.payload || {}, name = String(p.name || 'KeepGoing.pdf');
        inner = `<button class="media-chip file-chip" data-gc-file="${esc(p.media)}" data-name="${esc(name)}">${ico('doc')}<span class="file-name">${esc(name)}</span>${p.size ? `<span class="muted small">${esc(fmtKb(+p.size))}</span>` : ''}${ico('download', 'xs')}</button>`;
      } else if (m.kind === 'sticker') {
        const src = stickerSrc(m.payload || {});
        inner = src ? `<img class="sticker" src="${src}" alt="Sticker" draggable="false">` : '🙂';
      } else inner = `<span class="msg-text">${esc(m.body)}</span>`;
      const bare = m.kind === 'sticker' && !m.deleted;
      return `<div class="msg ${mine ? 'mine' : ''}">${mine || isDm() ? '' : `<span class="msg-who small">${esc(memberName(m.user_id))}</span>`}<div class="msg-bubble ${bare ? 'bare' : ''}">${inner}</div><span class="msg-meta small muted">${esc(fmtTime(m.created_at))}${bare && !mine ? ` · <button class="link-btn" data-gc-stk="${m.id}">${esc(t('stkSave'))}</button>` : ''}${canDel ? ` · <button class="link-btn" data-gc-del="${m.id}">${esc(t('chatDelete'))}</button>` : ''}</span></div>`;
    };
    const chatTab = () => `<div class="chat">${isChat() ? '' : localBanner()}
        <div class="chat-list" id="chat-list" role="log" aria-live="polite">${G.msgs.length ? G.msgs.map(msgHtml).join('') : `<p class="muted center">${esc(t('chatEmpty'))}</p>`}</div>
        <form class="chat-compose ${G.rec ? 'recording' : ''}" id="chat-form">${can('share') ? `<button type="button" class="icon-btn" data-g="chat-more" aria-label="${esc(t('chatMore'))}">${ico('plus')}</button>` : ''}<button type="button" class="icon-btn" data-g="stk" aria-label="Stickers" title="Stickers">${ico('smile')}</button><input class="input grow" id="chat-in" maxlength="1000" autocomplete="off" placeholder="${esc(t('chatPh'))}" aria-label="${esc(t('chatPh'))}">
          <span class="rec-info grow" aria-live="polite"><span class="rec-dot"></span><span id="rec-t">0:00</span> <span class="muted small">${esc(t('recHint'))}</span></span>
          <label class="icon-btn photo-btn-chat" title="${esc(t('photoOnceSend'))}">${ico('camera')}<input type="file" accept="image/*" class="sr-only" data-g-photo aria-label="${esc(t('photoOnceSend'))}"></label><button type="button" class="icon-btn rec-cancel" data-g="rec-cancel" aria-label="${esc(t('cancel'))}">${ico('x')}</button><button type="button" class="icon-btn mic-btn" data-g="mic" aria-label="${esc(t('recStart'))}" title="${esc(t('recStart'))}">${ico('mic')}</button><button class="btn primary send-btn" type="submit" aria-label="${esc(t('chatSend'))}">${ico('send')}</button></form>
      </div>`;
    const scrollChat = () => { const l = wref && $('#chat-list', wref); if (l) l.scrollTop = l.scrollHeight; };

    /* --- retos en vivo y votaciones --- */
    const liveTab = () => {
      const { active: a, challenges, group: g } = G.info;
      let cur;
      if (a && a.status === 'voting') {
        const voters = a.voters || [], y = a.votes_yes || 0, n = a.votes_no || 0, blank = Math.max(0, voters.length - y - n);
        const r = GG.voteResult(voters.length, y, n), amVoter = voters.includes(auth.uid);
        cur = `<section class="clay card live-card voting"><h3 class="section-title">🗳️ ${esc(t('liveVoting', { title: a.title }))}</h3>
          <p class="muted" style="margin-top:0">${esc(t('liveVoteSub2', { n: a.days, t: a.target }))}</p>
          <p class="small"><b>${esc(t('liveVoteEnds', { when: fmtWhen(a.vote_ends_at) }))}</b></p>
          <div class="vote-bar" aria-hidden="true"><i class="y" style="flex:${r.yesTotal}"></i><i class="n" style="flex:${r.noTotal || (r.yesTotal ? 0 : 1)}"></i></div>
          <p class="small" style="margin:8px 0">${esc(t('liveTally', { yes: y, no: n, blank }))} · ${esc(t('liveIfNow', { r: t(r.approved ? 'liveWouldPass' : 'liveWouldFail') }))}</p>
          ${amVoter ? `<div class="row vote-btns"><button class="btn ${a.my_vote === true ? 'primary' : ''}" data-gv="1" aria-pressed="${a.my_vote === true}">👍 ${esc(t('liveYes'))}</button><button class="btn ${a.my_vote === false ? 'danger' : ''}" data-gv="0" aria-pressed="${a.my_vote === false}">👎 ${esc(t('liveNo'))}</button></div>` : `<p class="muted small">${esc(t('liveNotVoter'))}</p>`}
          <p class="muted small" style="margin-bottom:0">${esc(t('liveVoteRule'))}</p>
          ${isLeader() || a.created_by === auth.uid ? `<div class="center" style="margin-top:10px"><button class="chip" data-g="cancel">${esc(t('liveCancel'))}</button></div>` : ''}</section>`;
      } else if (a && a.status === 'live') {
        const elapsed = Math.min(a.days, Math.max(1, Math.round((Date.parse(G.info.today) - Date.parse(a.starts_on)) / 864e5) + 1));
        const parts = (a.participants || []).length, total = parts * elapsed, done = a.progress || 0, pct = total ? Math.round(done / total * 1000) / 10 : 0;
        cur = `<section class="clay card live-card on"><div class="row"><span class="g-live-dot"></span><b>${esc(t('gLiveNow'))}</b></div><h2 style="margin:8px 0 4px">${esc(a.title)}</h2>
          <p class="muted" style="margin:0">${esc(t('gLiveDay', { d: elapsed, n: a.days, t: a.target }))} · ${esc(t('gLiveEnds', { date: fmtDate(a.ends_on) }))}</p>
          ${g.kind === 'habit' ? `<div class="bar" style="margin:12px 0 6px"><i style="width:${Math.min(100, pct)}%"></i><b class="bar-goal" style="left:${a.target}%"></b></div><p class="small" style="margin:0">${esc(t('liveProgress', { done, total, pct: fmtNum(pct) }))}</p>` : `<p class="small">${esc(t('liveProjectProgress'))}</p>`}
          <p class="muted small" style="margin-bottom:0">${esc(t('liveResultSoon'))}</p>
          ${isLeader() || a.created_by === auth.uid ? `<div class="center" style="margin-top:10px"><button class="chip" data-g="cancel">${esc(t('liveCancel'))}</button></div>` : ''}</section>`;
      } else {
        cur = `<section class="clay card center"><div style="font-size:40px">🏁</div><p style="margin:6px 0 14px">${esc(t('liveNone'))}</p>${can('launch') ? `<button class="btn primary" data-g="launch">🔴 ${esc(t('liveLaunch'))}</button>` : `<p class="muted small" style="margin:0">${esc(t('liveNoPerm'))}</p>`}</section>`;
      }
      const past = challenges.filter(c => !['voting', 'live'].includes(c.status));
      const stLabel = { won: ['🏆', 'liveWon', 'w'], lost: ['💥', 'liveLost', 'l'], rejected: ['❌', 'liveRejected', ''], cancelled: ['⏹️', 'liveCancelled', ''] };
      const hist = past.length ? `<section><h3 class="section-title">${esc(t('liveHistory'))} · ${esc(t('gWL'))} <span class="wl"><span class="w">${G.info.wins}</span>-<span class="l">${G.info.losses}</span></span></h3><div class="clay card" style="padding:6px 16px">${past.map(c => { const s = stLabel[c.status] || ['', c.status, '']; return `<div class="entry"><span>${s[0]} ${esc(c.title)}</span><span class="${s[2] ? 'wl-' + s[2] : 'muted'} small"><b>${esc(t(s[1]))}</b>${c.rate != null ? ' · ' + esc(t('liveRate', { rate: fmtNum(+c.rate), target: c.target })) : ''}</span></div>`; }).join('')}</div></section>` : '';
      return `<div class="stack" style="gap:16px">${cur}${hist}</div>`;
    };
    function openLaunch() {
      openModal({
        title: `🔴 ${esc(t('liveLaunch'))}`,
        body: `<form class="stack" id="launch-f" style="gap:14px">
          <label class="field"><span>${esc(t('liveTitle'))}</span><input class="input" id="lc-title" maxlength="80" placeholder="${esc(t('liveTitlePh'))}"></label>
          <div class="row" style="gap:12px"><label class="field grow"><span>${esc(t('liveDays'))}</span><input class="input" id="lc-days" type="number" min="1" max="90" value="7" inputmode="numeric"></label>
          <label class="field grow"><span>${esc(t('liveTarget'))}</span><input class="input" id="lc-target" type="number" min="1" max="100" value="80" inputmode="numeric"></label></div>
          <p class="muted small" style="margin:-6px 0 0">${esc(t('liveTargetHint'))}</p>
          <fieldset class="field" style="border:0;padding:0;margin:0"><legend style="padding:0;margin-bottom:8px"><span>${esc(t('liveHow'))}</span></legend>
            <label class="radio-card"><input type="radio" name="lc-mode" value="direct" checked><span><b>${esc(t('liveDirect'))}</b><br><span class="muted small">${esc(t('liveDirectSub'))}</span></span></label>
            <label class="radio-card"><input type="radio" name="lc-mode" value="vote"><span><b>${esc(t('liveVote'))}</b><br><span class="muted small">${esc(t('liveVoteSub'))}</span></span></label></fieldset>
          <div id="lc-vote" hidden><label class="field"><span>${esc(t('liveVoteTime'))}</span><select class="input" id="lc-time">
            <option value="15">15 ${esc(t('liveMinutes'))}</option><option value="60">${esc(t('liveHours', { n: 1 }))}</option><option value="360">${esc(t('liveHours', { n: 6 }))}</option>
            <option value="1440" selected>${esc(t('liveDaysOpt', { n: 1 }))}</option><option value="4320">${esc(t('liveDaysOpt', { n: 3 }))}</option><option value="10080">${esc(t('liveDaysOpt', { n: 7 }))}</option><option value="custom">${esc(t('liveCustom'))}</option></select></label>
            <label class="field" id="lc-custom-w" hidden><span>${esc(t('liveMinutes'))} (5-10080)</span><input class="input" id="lc-custom" type="number" min="5" max="10080" value="120" inputmode="numeric"></label></div>
        </form>`,
        foot: `<button class="btn primary block" data-lc="go">🔴 ${esc(t('liveGo'))}</button>`,
        onMount: w => w.addEventListener('change', () => {
          $('#lc-vote', w).hidden = $('input[name="lc-mode"]:checked', w).value !== 'vote';
          $('#lc-custom-w', w).hidden = $('#lc-time', w).value !== 'custom';
        }),
        onClick: async (e, close, w) => {
          const b = e.target.closest('[data-lc]'); if (!b) return;
          const title = $('#lc-title', w).value.trim(), days = Math.round(+$('#lc-days', w).value), target = Math.round(+$('#lc-target', w).value);
          const mode = $('input[name="lc-mode"]:checked', w).value, tv = $('#lc-time', w).value, mins = tv === 'custom' ? Math.round(+$('#lc-custom', w).value) : +tv;
          if (!title) { toast(t('liveTitle')); $('#lc-title', w).focus(); return; }
          if (!(days >= 1 && days <= 90) || !(target >= 1 && target <= 100) || (mode === 'vote' && !(mins >= 5 && mins <= 10080))) { toast(t('groupError', { e: '1-90 · 1-100 · 5-10080' })); return; }
          b.disabled = true;
          try { await rpc('kg_launch_challenge', { p_group: gid, p_title: title, p_days: days, p_target: target, p_mode: mode, p_vote_minutes: mins || 1440 }); sfx(mode === 'direct' ? 'unlock' : 'toggle'); toast(t(mode === 'direct' ? 'liveLaunched' : 'liveVoteOpened')); close(); await refresh(true); }
          catch (err) { b.disabled = false; toast(t('groupError', { e: err.message })); }
        }
      });
    }

    /* --- ranking y reputación --- */
    const rankTab = () => {
      const { group: g, board, members } = G.info;
      const leader = isLeader();
      let html = '';
      if (g.ranking_on) {
        const mult = GG.REP_MULT[g.ranking_freq] || 0;
        html += `<section class="clay card"><div class="row wrap" style="justify-content:space-between"><h3 class="section-title" style="margin:0">🏅 ${esc(t('freqLong_' + g.ranking_freq))} · ${esc(t('freq_' + g.ranking_freq))}</h3></div>
          <p class="muted small">${esc(g.ranking_freq === 'MAX' ? t('rankMax', { from: fmtDate(G.info.board_from) }) : t('rankPeriod', { from: fmtShort(G.info.board_from), to: fmtShort(G.info.board_to) }))}</p>
          ${board && board.some(b => +b.score > 0) ? `<ol class="rank-list">${board.map((b, i) => { const m = members.find(x => x.user_id === b.user_id) || { display_name: '—' }; const place = board.findIndex(x => +x.score === +b.score) + 1; return `<li class="${b.user_id === auth.uid ? 'me' : ''}"><span class="rank-pos">${+b.score > 0 ? (['🥇', '🥈', '🥉'][place - 1] || place) : '—'}</span>${avatarHtml(m, 'sm')}<span class="grow ellipsis"><b>${esc(m.display_name)}</b>${m.nametag ? ` <span class="muted small">@${esc(m.nametag)}</span>` : ''}<br><span class="muted small">${esc(t('repShort', { n: m.rep || 0 }))}</span></span><b>${esc(t(g.kind === 'habit' ? 'rankScoreHabit' : 'rankScoreProject', { n: fmtNum(+b.score) }))}</b></li>`; }).join('')}</ol>${g.ranking_freq !== 'MAX' ? `<p class="muted small">${esc(t('rankLiveHint'))}</p>` : ''}` : `<p class="muted">${esc(t('rankEmpty'))}</p>`}
          <p class="small" style="margin-bottom:0">${esc(mult ? t('rankPrizes', { a: GG.REP_PRIZES[0] * mult, b: GG.REP_PRIZES[1] * mult, c: GG.REP_PRIZES[2] * mult }) : t('rankPrizesNone'))}</p></section>`;
      } else html += `<section class="clay card center"><div style="font-size:40px">🏅</div><h3 style="margin:6px 0">${esc(t('rankOffTitle'))}</h3><p class="muted small" style="margin:0">${esc(t('rankOffSub'))}</p></section>`;
      if (leader) {
        const tags = members.filter(m => (g.rank_users || []).includes(m.user_id) && m.nametag).map(m => '@' + m.nametag).join(', ');
        html += `<section class="clay card stack" style="gap:12px" id="rank-set">
          <label class="row" style="gap:14px"><span class="switch"><input type="checkbox" id="rk-on" ${g.ranking_on ? 'checked' : ''}><span></span></span><b class="grow">${esc(t('rankEnable'))}</b></label>
          <div class="field"><span>${esc(t('rankFreq'))}</span><div class="seg" role="radiogroup">${GG.FREQS.map(f => `<button type="button" role="radio" aria-checked="${g.ranking_freq === f}" class="${g.ranking_freq === f ? 'on' : ''}" data-rk-freq="${f}" title="${esc(t('freqLong_' + f))}">${esc(t('freq_' + f))}</button>`).join('')}</div></div>
          <div class="field"><span>${esc(t('rankWho'))} · ${esc(t('rankWhoRoles'))}</span><div class="row wrap" style="gap:8px">${ROLES.map(r => `<label class="check-chip"><input type="checkbox" data-rk-role="${r}" ${(g.rank_roles || []).includes(r) ? 'checked' : ''}><span>${ROLE_ICON[r]} ${esc(t('role_' + r))}</span></label>`).join('')}</div></div>
          <label class="field"><span>${esc(t('rankWhoTags'))}</span><input class="input" id="rk-tags" value="${esc(tags)}" placeholder="${esc(t('rankTagsPh'))}" autocomplete="off"></label>
          <button class="btn primary" data-g="rank-save">${esc(t('rankSave'))}</button></section>`;
      }
      if (g.ranking_on && g.ranking_freq !== 'MAX') {
        const others = members.filter(m => m.user_id !== auth.uid), done = new Set(G.info.my_rates || []);
        html += `<section class="clay card"><h3 class="section-title" style="margin-top:0">⭐ ${esc(t('rateTitle'))}</h3><p class="muted small" style="margin-top:0">${esc(t('rateHint'))}</p>
          ${others.length ? others.map(m => `<div class="member-row">${avatarHtml(m, 'sm')}<b class="grow ellipsis">${esc(m.display_name)}</b>${done.has(m.user_id) ? `<span class="ok-chip">✓ ${esc(t('rateDone'))}</span>` : `<button class="btn sm primary" data-rate="${m.user_id}">${esc(t('rateBtn'))}</button>`}</div>`).join('') : `<p class="muted small" style="margin:0">${esc(t('rateNobody'))}</p>`}</section>`;
      }
      html += `<p class="muted small center">${esc(t('rankRepNote'))}</p>`;
      return `<div class="stack" style="gap:16px">${html}</div>`;
    };

    /* --- miembros, roles y permisos --- */
    const membersTab = () => {
      const { members, group: g } = G.info, leader = isLeader(), reqs = G.info.requests || [];
      const reqHtml = isMod() && reqs.length ? `<section class="clay card" style="margin-bottom:14px"><h3 class="section-title" style="margin-top:0">🆔 ${esc(t('reqTitle', { n: reqs.length }))}</h3>${reqs.map(r => `<div class="member-row">${avatarHtml(r, 'sm')}<div class="grow" style="min-width:0"><b class="ellipsis">${esc(r.display_name)}</b>${r.nametag ? ` <span class="muted small">@${esc(r.nametag)}</span>` : ''}</div><button class="btn primary sm" data-jr-yes="${r.user_id}">${esc(t('friendAccept'))}</button><button class="chip sm" data-jr-no="${r.user_id}">${esc(t('friendDecline'))}</button></div>`).join('')}</section>` : '';
      return `${reqHtml}<section class="clay card">${members.map(m => {
        const self = m.user_id === auth.uid;
        const roleCtl = leader && !self ? `<select class="role-select" data-role-user="${m.user_id}" aria-label="${esc(t('gRole'))}">${ROLES.map(r => `<option value="${r}" ${m.role === r ? 'selected' : ''}>${ROLE_ICON[r]} ${esc(t('role_' + r))}</option>`).join('')}</select>` : `<span class="role-chip">${ROLE_ICON[m.role] || ''} ${esc(t('role_' + m.role))}</span>`;
        const perms = m.role === 'lider' ? '' : leader && !self
          ? `<div class="perm-row" role="group" aria-label="${esc(t('gPerms'))}">${GG.PERMS.map(p => `<label class="check-chip sm"><input type="checkbox" data-perm-user="${m.user_id}" data-perm="${p}" ${(m.perms || []).includes(p) ? 'checked' : ''}><span>${esc(t('perm_' + p))}</span></label>`).join('')}</div>`
          : (m.perms || []).filter(p => GG.PERMS.includes(p)).length ? `<div class="perm-row">${m.perms.filter(p => GG.PERMS.includes(p)).map(p => `<span class="perm-chip">${esc(t('perm_' + p))}</span>`).join('')}</div>` : '';
        const status = g.kind === 'habit' ? (m.done_today ? `<span class="ok-chip">✅ ${esc(t('gDoneToday'))}</span>` : `<span class="warn-chip">⏳ ${esc(t('gNotToday'))}</span>`) : '';
        return `<div class="member-row">${avatarHtml(m)}
          <div class="grow" style="min-width:0"><b class="ellipsis">${esc(m.display_name)}${self ? ' · ' + esc(t('gYou')) : ''}</b>${m.nametag ? ` <span class="muted small">@${esc(m.nametag)}</span>` : ''}
            <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:4px">${roleCtl}${status}<span class="rep-chip" title="${esc(t('repInGroup'))}">🏅 ${esc(t('repShort', { n: m.rep || 0 }))}</span></div>${perms}</div>
          ${leader && !self ? `<button class="icon-btn sm" data-g-kick="${m.user_id}" aria-label="${esc(t('gKick'))}">${ico('x')}</button>` : ''}
        </div>`;
      }).join('')}</section>${isChat() && can('invite') ? `<div class="center" style="margin-top:12px"><button class="btn primary" data-g="add-friends">${ico('user')} ${esc(t('chatAddFriends'))}</button></div>` : ''}${isLeader() ? `<p class="muted small center">${esc(t('gPermsLeader'))}</p>` : ''}`;
    };

    const ALL_TABS = [['profile', '🪪', 'gTabProfile'], ['chat', '💬', 'gTabChat'], ['live', '🔴', 'gTabLive'], ['rank', '🏅', 'gTabRank'], ['members', '👥', 'gTabMembers']];
    // Conversación privada: solo el chat. Grupo de chat: chat, miembros (roles y permisos) y perfil
    const tabsFor = () => isDm() ? ALL_TABS.filter(x => x[0] === 'chat') : isChat() ? [ALL_TABS[1], ALL_TABS[4], ALL_TABS[0]] : ALL_TABS;
    const setTitle = () => {
      const h = wref && $('.sheet-head h2', wref); if (!h || !G.info) return;
      const g = G.info.group, p = peer();
      h.innerHTML = isDm() ? `<span class="row" style="gap:10px;min-width:0">${avatarHtml(p || {}, 'sm')}<span class="ellipsis">${esc(p ? p.display_name : '—')}${p && p.nametag ? ` <span class="muted small">@${esc(p.nametag)}</span>` : ''}</span></span>` : `<span class="row" style="gap:10px;min-width:0">${groupAv(g, 'sm')}<span class="ellipsis">${esc(g.name)}</span></span>`;
    };
    const draw = (keepChat = false) => {
      const el = body(); if (!el) return;
      if (G.gone || !G.info) { el.innerHTML = `<p class="muted">${esc(t('groupGone'))}</p>`; return; }
      const TABS = tabsFor();
      if (!TABS.some(x => x[0] === G.tab)) G.tab = TABS[0][0];
      setTitle();
      if (keepChat && G.tab === 'chat' && $('#chat-list', el)) {
        const l = $('#chat-list', el), atEnd = l.scrollHeight - l.scrollTop - l.clientHeight < 60;
        l.innerHTML = G.msgs.length ? G.msgs.map(msgHtml).join('') : `<p class="muted center">${esc(t('chatEmpty'))}</p>`;
        loadRates(); if (atEnd) scrollChat(); return;
      }
      const draft = $('#chat-in', el) ? $('#chat-in', el).value : '';
      el.innerHTML = `${TABS.length < 2 ? '' : `<div class="seg g-tabs" role="tablist">${TABS.map(([k, e, l]) => `<button role="tab" aria-selected="${G.tab === k}" class="${G.tab === k ? 'on' : ''}" data-gt="${k}"><span aria-hidden="true">${e}</span> <span class="g-tab-l">${esc(t(l))}</span></button>`).join('')}</div>`}
        <div class="g-pane" role="tabpanel">${G.tab === 'chat' ? chatTab() : G.tab === 'live' ? liveTab() : G.tab === 'rank' ? rankTab() : G.tab === 'members' ? membersTab() : profileTab()}</div>`;
      if (G.tab === 'chat') { const i = $('#chat-in', el); if (draft) { i.value = draft; i.form.classList.add('has-text'); } loadRates(); scrollChat(); }
    };
    const refresh = async (info = true) => { if (info) await loadInfo(); if (G.tab === 'chat') await loadMsgs(); draw(); };
    const poll = () => {
      G.timers.push(setInterval(async () => { if (G.tab !== 'chat' || document.hidden) return; try { if (await loadMsgs()) draw(true); } catch (e) { /* sin conexión */ } }, 4000));
      G.timers.push(setInterval(async () => { if (document.hidden) return; try { const before = JSON.stringify(G.info && G.info.active); await loadInfo(); if (G.tab !== 'chat' && JSON.stringify(G.info.active) !== before) draw(); } catch (e) { /* sin conexión */ } }, 20000));
    };
    async function chatShare() {
      const opts = [['invite', '🔗', 'chatShareInvite'], ['habit', '📋', 'chatShareHabit'], ['project', '🎯', 'chatShareProject'], ['calendar', '📅', 'chatShareCal']].filter(o => !(isDm() && o[0] === 'invite'));
      openModal({
        title: esc(t('chatMore')),
        body: `<div class="stack" style="gap:10px">${opts.map(([k, e, l]) => `<button class="btn block" data-cs="${k}">${e} ${esc(t(l))}</button>`).join('')}</div>`,
        onClick: async (e, close) => {
          const b = e.target.closest('[data-cs]'); if (!b) return; close();
          const k = b.dataset.cs;
          if (k === 'calendar') { if (!gate('calShare')) return; tfOpenShare(gid, async () => { await loadMsgs(); draw(); }); return; }
          if (k === 'invite') {
            await refreshMyGroups(true);
            const list = (myGroups.list || []).filter(g => g.id !== gid && GG.can({ role: g.my_role, perms: (g.members.find(m => m.user_id === auth.uid) || {}).perms }, 'invite'));
            pick(t('chatPickGroup'), list.map(g => ({ id: g.id, label: `${g.icon} ${g.name}` })), async id => { await rpc('kg_post_invite', { p_group: gid, p_target: id }); });
          } else {
            const items = k === 'habit' ? state.habits.filter(h => !h.archived) : state.projects;
            pick(t(k === 'habit' ? 'chatPickHabit' : 'chatPickProject'), items.map(o => ({ id: o.id, label: `${o.icon || ''} ${o.name}` })), async id => {
              const o = items.find(x => x.id === id);
              await rpc('kg_post', { p_group: gid, p_kind: 'share', p_body: '', p_payload: { type: k, spec: k === 'habit' ? habitSpec(o) : projectSpec(o) } });
            });
          }
        }
      });
      function pick(title, items, fn) {
        openModal({
          title: esc(title),
          body: items.length ? `<div class="stack" style="gap:8px">${items.map(i => `<button class="btn block" style="justify-content:flex-start" data-pk="${esc(i.id)}">${esc(i.label)}</button>`).join('')}</div>` : `<p class="muted">${esc(t(title === t('chatPickGroup') ? 'chatNoGroups' : 'chatNoItems'))}</p>`,
          onClick: async (e, close) => {
            const b = e.target.closest('[data-pk]'); if (!b) return;
            b.disabled = true;
            try { await fn(b.dataset.pk); sfx('pop'); close(); await loadMsgs(); draw(); }
            catch (err) { b.disabled = false; toast(/not allowed/.test(err.message) ? t('chatNoPerm') : t('groupError', { e: err.message })); }
          }
        });
      }
    }
    async function addFriendsToChat() {
      if (!chatData.friends) await refreshChat(true);
      const inside = new Set(G.info.members.map(m => m.user_id));
      const list = (chatData.friends || []).filter(f => f.status === 'accepted' && !inside.has(f.user_id));
      openModal({
        title: esc(t('chatAddFriends')),
        body: list.length ? `<div class="stack" style="gap:8px">${list.map(f => `<button class="btn block" style="justify-content:flex-start" data-af="${f.user_id}">${avatarHtml(f, 'sm')} ${esc(personName(f))} <span class="muted small">@${esc(f.nametag || '')}</span></button>`).join('')}</div>` : `<p class="muted">${esc(t('chatNoFriendsToAdd'))}</p>`,
        onClick: async (e, close) => {
          const b = e.target.closest('[data-af]'); if (!b) return;
          b.disabled = true;
          try { await rpc('kg_chat_add', { p_group: gid, p_user: b.dataset.af }); sfx('pop'); b.remove(); await refresh(); }
          catch (err) { b.disabled = false; toast(chatErr(err)); }
        }
      });
    }
    async function saveRanking() {
      const w = body(), g = G.info.group;
      const on = $('#rk-on', w).checked, freq = ($('[data-rk-freq].on', w) || {}).dataset ? $('[data-rk-freq].on', w).dataset.rkFreq : g.ranking_freq;
      const roles = [...w.querySelectorAll('[data-rk-role]')].filter(i => i.checked).map(i => i.dataset.rkRole);
      const users = [];
      for (const raw of $('#rk-tags', w).value.split(/[\s,]+/).filter(Boolean)) {
        const tag = GG.toNametag(raw), m = G.info.members.find(x => x.nametag === tag);
        if (!m) { toast(t('rankUnknownTag', { tag: '@' + tag })); return; }
        users.push(m.user_id);
      }
      await rpc('kg_set_ranking', { p_group: gid, p_on: on, p_freq: freq, p_roles: roles, p_users: users });
      toast(t('rankSaved')); sfx('toggle'); await refresh();
    }

    /* --- fotos de una vez, audios, stickers, puntuaciones y mejora a grupo con ranking --- */
    const b64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(blob); });
    const afterPost = async () => { sfx('pop'); await loadMsgs(); draw(true); scrollChat(); };
    async function sendPhoto(file) {
      let q = .8, max = 1280, data = await b64(await compressImage(file, max, q));
      while (data.length > 2200000 && q > .35) { q -= .15; max = Math.round(max * .8); data = await b64(await compressImage(file, max, q)); }
      await rpc('kg_post_media', { p_group: gid, p_kind: 'photo', p_mime: 'image/jpeg', p_data: data, p_meta: {} });
      await afterPost();
    }
    async function openPhoto(id) {
      let r;
      try { r = await rpc('kg_media_get', { p_id: id }); }
      catch (err) { if (/viewed|sender/.test(err.message)) { G.seen.add(id); draw(true); toast(t('photoAlready')); return; } throw err; }
      G.seen.add(id); draw(true);
      if (!/^image\/(jpeg|png|webp|gif)$/.test(r.mime || '') || !/^[A-Za-z0-9+/=]+$/.test(r.data || '')) return;
      openModal({ title: `📷 ${esc(t('photoOnceOpen'))}`, cls: 'photo-view', body: `<img class="once-img" src="data:${r.mime};base64,${r.data}" alt=""><p class="muted small center" style="margin-bottom:0">${esc(t('photoOnceNote'))}</p>` });
    }
    async function loadAudio(id) {
      const r = await rpc('kg_media_get', { p_id: id });
      if (!/^audio\//.test(r.mime || '')) return;
      const bin = atob(r.data || ''), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([u8], { type: r.mime.split(';')[0] }));
      AUDIO.set(id, url); draw(true);
      const a = body() && [...body().querySelectorAll('audio')].find(x => x.getAttribute('src') === url);
      if (a) a.play().catch(() => {});
    }
    async function openFile(id, name) {
      const r = await rpc('kg_media_get', { p_id: id });
      if (r.mime !== 'application/pdf' || !/^[A-Za-z0-9+/=]+$/.test(r.data || '')) { toast(t('chatFileGone')); return; }
      const bin = atob(r.data), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      downloadBlob(/\.pdf$/i.test(name || '') ? name : 'KeepGoing.pdf', new Blob([u8], { type: 'application/pdf' }));
    }
    // Notas de voz: se graban al tocar el micro (el navegador pide permiso) y se envían al tocarlo otra vez
    const REC_MAX = 120;
    const recUi = () => { const f = body() && $('#chat-form', body()); if (f) f.classList.toggle('recording', !!G.rec); };
    async function startRec() {
      if (G.rec) return;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) { toast(t('recUnsupported')); return; }
      let stream;
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { toast(t('recDenied')); return; }
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(m => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : {});
      const R = G.rec = { rec, chunks: [], t0: Date.now(), cancel: false };
      rec.ondataavailable = e => { if (e.data && e.data.size) R.chunks.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(tr => tr.stop()); clearInterval(R.tick);
        G.rec = null; recUi();
        const dur = Math.min(REC_MAX, Math.round((Date.now() - R.t0) / 1000));
        if (R.cancel || dur < 1 || !R.chunks.length) return;
        try {
          const blob = new Blob(R.chunks, { type: rec.mimeType || mime || 'audio/webm' });
          await rpc('kg_post_media', { p_group: gid, p_kind: 'audio', p_mime: blob.type || 'audio/webm', p_data: await b64(blob), p_meta: { dur } });
          await afterPost();
        } catch (err) { toast(t('groupError', { e: err.message })); }
      };
      rec.start(1000); recUi(); vibrate(15);
      R.tick = setInterval(() => {
        const s = (Date.now() - R.t0) / 1000, el = body() && $('#rec-t', body());
        if (el) el.textContent = fmtDur(s);
        if (s >= REC_MAX && rec.state === 'recording') rec.stop();
      }, 250);
    }
    const stopRec = (cancel = false) => { if (!G.rec) return; G.rec.cancel = cancel; if (G.rec.rec.state !== 'inactive') G.rec.rec.stop(); };
    function openStickers() {
      let edit = false;
      const grid = w => {
        const list = stickersGet();
        $('#stk-grid', w).innerHTML = list.length ? list.map((s, i) => `<span class="stk-cell"><button type="button" class="stk-btn" data-stk="${i}" aria-label="Sticker ${i + 1}"><img src="${s}" alt=""></button>${edit ? `<button type="button" class="stk-del" data-stk-del="${i}" aria-label="${esc(t('delete'))}">${ico('x')}</button>` : ''}</span>`).join('') : `<p class="muted small" style="grid-column:1/-1;margin:0">${esc(t('stkEmpty'))}</p>`;
        $('[data-stk-edit]', w).textContent = t(edit ? 'done' : 'edit');
      };
      openModal({
        title: `${ico('smile')} Stickers`,
        body: `<div class="stk-grid" id="stk-grid"></div>
          <div class="row wrap" style="gap:8px;margin-top:12px"><label class="btn primary">${ico('plus')} ${esc(t('stkImport'))}<input type="file" accept="image/webp,image/png,image/gif,image/jpeg" multiple class="sr-only" id="stk-file"></label><button type="button" class="chip" data-stk-edit></button></div>
          <input class="input" id="stk-paste" style="margin-top:10px" placeholder="${esc(t('stkPaste'))}" aria-label="${esc(t('stkPaste'))}" autocomplete="off">
          <details class="muted small" style="margin-top:10px"><summary>${esc(t('stkWaTitle'))}</summary><p style="margin:8px 0 0">${esc(t('stkWaHint'))}</p></details>`,
        onMount: w => {
          grid(w);
          w.addEventListener('change', async e => { if (e.target.id === 'stk-file' && e.target.files.length) { await importStickers([...e.target.files]); e.target.value = ''; grid(w); } });
          $('#stk-paste', w).addEventListener('paste', async e => {
            const files = [...((e.clipboardData && e.clipboardData.files) || [])].filter(x => /^image\//.test(x.type));
            e.preventDefault(); e.target.value = '';
            if (!files.length) { toast(t('stkNone')); return; }
            await importStickers(files); grid(w);
          });
        },
        onClick: async (e, close, w) => {
          if (e.target.closest('[data-stk-edit]')) { edit = !edit; grid(w); return; }
          const d = e.target.closest('[data-stk-del]');
          if (d) { const list = stickersGet(); list.splice(+d.dataset.stkDel, 1); stickersSet(list); grid(w); return; }
          const b = e.target.closest('[data-stk]'); if (!b || edit) return;
          const m = /^data:([^;]+);base64,(.+)$/.exec(stickersGet()[+b.dataset.stk] || ''); if (!m) return;
          b.disabled = true;
          try { await rpc('kg_post_media', { p_group: gid, p_kind: 'sticker', p_mime: m[1], p_data: m[2], p_meta: {} }); close(); await afterPost(); }
          catch (err) { b.disabled = false; toast(t('groupError', { e: err.message })); }
        }
      });
    }
    function openRate(to) {
      const m = G.info.members.find(x => x.user_id === to); if (!m) return;
      let pts = null;
      openModal({
        title: `⭐ ${esc(m.display_name)}`,
        body: `<div class="stack" style="gap:14px"><div class="field" style="margin:0"><span>${esc(t('ratePoints'))}</span><div class="rate-grid" role="radiogroup" aria-label="${esc(t('ratePoints'))}">${Array.from({ length: 11 }, (_, i) => `<button type="button" class="chip" role="radio" aria-checked="false" data-pts="${i}">${i}</button>`).join('')}</div></div>
          <label class="field" style="margin:0"><span>${esc(t('rateNote'))}</span><textarea class="input" id="rt-note" maxlength="200" rows="3" placeholder="${esc(t('rateNotePh'))}"></textarea></label>
          <p class="muted small" style="margin:0">${esc(t('rateHint'))}</p></div>`,
        foot: `<button class="btn primary block" data-rt="go">${esc(t('rateSend'))}</button>`,
        onClick: async (e, close, w) => {
          const c = e.target.closest('[data-pts]');
          if (c) { pts = +c.dataset.pts; w.querySelectorAll('[data-pts]').forEach(x => { x.classList.toggle('on', x === c); x.setAttribute('aria-checked', x === c); }); return; }
          const b = e.target.closest('[data-rt]'); if (!b) return;
          if (pts == null) { toast(t('ratePick')); return; }
          b.disabled = true;
          try { await rpc('kg_rank_rate', { p_group: gid, p_to: to, p_points: pts, p_note: $('#rt-note', w).value.trim() }); sfx('toggle'); toast(t('rateSaved')); close(); await refresh(); }
          catch (err) { b.disabled = false; toast(/already rated/.test(err.message) ? t('rateAlready') : t('groupError', { e: err.message })); }
        }
      });
    }
    function openUpgrade() {
      const items = [...state.projects.filter(p => !p.groupId && !p.archived).map(o => ['project', o]), ...state.habits.filter(h => !h.groupId && !h.archived).map(o => ['habit', o])];
      openModal({
        title: `🏆 ${esc(t('gUpgrade'))}`,
        body: `<p class="muted small" style="margin-top:0">${esc(t('gUpgradePick'))}</p>${items.length ? `<div class="stack" style="gap:8px">${items.map(([k, o]) => `<button class="btn block" style="justify-content:flex-start" data-up="${esc(o.id)}" data-up-kind="${k}">${esc(o.icon || '🎯')} ${esc(o.name)} <span class="muted small">· ${esc(t(k === 'project' ? 'gProject' : 'gHabit'))}</span></button>`).join('')}</div>` : `<p class="muted">${esc(t('gUpgradeNone'))}</p>`}`,
        onClick: async (e, close) => {
          const b = e.target.closest('[data-up]'); if (!b) return;
          const k = b.dataset.upKind, o = (k === 'project' ? state.projects : state.habits).find(x => x.id === b.dataset.up); if (!o) return;
          if (!(await confirmDialog(t('gUpgradeQ', { name: o.name })))) return;
          b.disabled = true;
          try {
            await rpc('kg_chat_upgrade', { p_group: gid, p_kind: k, p_spec: k === 'project' ? projectSpec(o) : habitSpec(o), p_local_id: o.id });
            o.groupId = gid; save(); sfx('unlock'); close(); G.tab = 'profile'; myGroups.at = 0;
            await pushGroupProgress(); await refresh(); toast(t('gUpgraded'));
          } catch (err) { b.disabled = false; toast(t('groupError', { e: err.message })); }
        }
      });
    }

    openModal({
      title: `👥 ${esc(t('groupTitle'))}`, cls: `wide g-modal${tab === 'chat' ? ' chat-full' : ''}`, body: `<div id="grp"><p class="muted">${esc(t('loading'))}</p></div>`,
      onMount: async w => {
        wref = w;
        // v1.25: en pantalla completa (móvil), flecha «Volver» a la izquierda y deslizar desde el borde izquierdo para salir
        const head = $('.sheet-head', w);
        if (head) head.insertAdjacentHTML('afterbegin', `<button class="icon-btn sm g-back" data-m="x" aria-label="${esc(t('back'))}">${ico('left')}</button>`);
        let sx = null, sy = 0;
        w.addEventListener('touchstart', e => { const p = e.touches[0]; sx = p.clientX < 28 ? p.clientX : null; sy = p.clientY; }, { passive: true });
        w.addEventListener('touchend', e => { if (sx == null) return; const p = e.changedTouches[0]; if (p.clientX - sx > 80 && Math.abs(p.clientY - sy) < 60) $('[data-m="x"]', w)?.click(); sx = null; }, { passive: true });
        try { await pushGroupProgress(); await refresh(); } catch (e) { G.gone = true; draw(); }
        poll();
        w.addEventListener('change', async e => {
          const el = e.target;
          try {
            if (el.dataset.roleUser) {
              const m = G.info.members.find(x => x.user_id === el.dataset.roleUser);
              if (el.value === 'lider' && !(await confirmDialog(t('gMakeLeaderQ', { name: m ? m.display_name : '' })))) { draw(); return; }
              await rpc('kg_set_role', { p_group: gid, p_user: el.dataset.roleUser, p_role: el.value }); toast(t('saved')); await refresh();
            } else if (el.matches('[data-g-pic]') && el.files[0]) {
              const img = await resizePhoto(el.files[0]); el.value = '';
              await rpc('kg_set_group_avatar', { p_group: gid, p_avatar: img }); toast(t('saved')); myGroups.at = 0; await refresh();
            } else if (el.matches('[data-g-photo]') && el.files[0]) {
              const file = el.files[0]; el.value = '';
              toast(t('photoSending')); await sendPhoto(file);
            } else if (el.dataset.permUser) {
              const u = el.dataset.permUser, perms = [...body().querySelectorAll(`[data-perm-user="${u}"]`)].filter(i => i.checked).map(i => i.dataset.perm);
              await rpc('kg_set_perms', { p_group: gid, p_user: u, p_perms: perms }); toast(t('gPermsSaved')); await loadInfo();
            }
          } catch (err) { toast(t('groupError', { e: err.message })); await refresh(); }
        });
        // Como en WhatsApp: con texto aparece «Enviar»; sin texto, la cámara y el micro
        w.addEventListener('input', e => { if (e.target.id === 'chat-in') e.target.form.classList.toggle('has-text', !!e.target.value.trim()); });
        w.addEventListener('submit', async e => {
          if (e.target.id !== 'chat-form') return; e.preventDefault();
          if (G.rec) { stopRec(); return; }
          const i = $('#chat-in', w), text = i.value.trim(); if (!text) return;
          i.value = ''; e.target.classList.remove('has-text');
          try { await rpc('kg_post', { p_group: gid, p_kind: 'text', p_body: text, p_payload: {} }); sfx('tap'); await loadMsgs(); draw(true); scrollChat(); }
          catch (err) { i.value = text; e.target.classList.add('has-text'); toast(t('groupError', { e: err.message })); }
          i.focus();
        });
      },
      onClose: () => { stopRec(true); G.timers.forEach(clearInterval); myGroups.at = 0; if (state.ui.tab === 'chat') { render(); refreshMyGroups(true); } },
      onClick: async (e, close) => {
        const tabB = e.target.closest('[data-gt]');
        if (tabB) { G.tab = tabB.dataset.gt; draw(); if (G.tab === 'chat') { try { await loadMsgs(); } catch (err) { /* nada */ } draw(); $('#chat-in', body()) && $('#chat-in', body()).focus(); } return; }
        const fr = e.target.closest('[data-rk-freq]');
        if (fr) { body().querySelectorAll('[data-rk-freq]').forEach(b => { b.classList.toggle('on', b === fr); b.setAttribute('aria-checked', b === fr); }); return; }
        const b = e.target.closest('[data-g],[data-g-kick],[data-gv],[data-gc-join],[data-gc-peek],[data-gc-add],[data-gc-view],[data-gc-del],[data-gc-photo],[data-gc-audio],[data-gc-file],[data-gc-img],[data-gc-stk],[data-rate],[data-jr-yes],[data-jr-no]'); if (!b || !G.info) return;
        try {
          if (b.dataset.gKick) { if (await confirmDialog(t('groupKickQ'))) { await rpc('kg_leave_group', { p_group: gid, p_user: b.dataset.gKick }); await refresh(); } return; }
          if (b.dataset.gv) { b.disabled = true; await rpc('kg_vote', { p_challenge: G.info.active.id, p_vote: b.dataset.gv === '1' }); sfx('toggle'); vibrate(15); await refresh(); return; }
          if (b.dataset.gcImg) {
            const m = G.msgs.find(x => String(x.id) === b.dataset.gcImg), p = (m && m.payload) || {}; if (!CARD_IMG.test(String(p.img || ''))) return;
            openModal({ title: esc(p.title || t('chatPrevCard')), cls: 'wide', body: `<img class="card-big" src="${p.img}" alt="">`, foot: `<button class="btn primary block" data-ci="dl">${ico('download')} ${esc(t('saveImageBtn'))}</button>`,
              onClick: ev => { if (ev.target.closest('[data-ci]')) { const a = document.createElement('a'); a.href = p.img; a.download = 'keepgoing.jpg'; document.body.appendChild(a); a.click(); a.remove(); } } });
            return;
          }
          if (b.dataset.gcPeek) { openInvitePreview(b.dataset.gcPeek, b.dataset.gcMem === "1"); return; }
          if (b.dataset.gcJoin) { try { localStorage.setItem(JOIN_KEY, b.dataset.gcJoin); } catch (err) { /* nada */ } close(); processJoin(); return; }
          if (b.dataset.gcView) {
            const m = G.msgs.find(x => String(x.id) === b.dataset.gcView), p = m && m.payload; if (!p) return;
            const add = () => { const x = body() && body().querySelector(`[data-gc-add="${m.id}"]`); if (x) x.click(); };
            if (p.type === 'event') openSpecPreview('event', p.event || {}, add); else if (p.spec) openSpecPreview(p.type === 'project' ? 'project' : 'habit', p.spec, add);
            return;
          }
          if (b.dataset.gcAdd) {
            const m = G.msgs.find(x => String(x.id) === b.dataset.gcAdd), p = m && m.payload;
            if (p && p.type === 'event') { addSharedEvent(p.event || {}); return; }
            if (!p || !p.spec) return;
            const kd = p.type === 'project' ? 'project' : 'habit';
            if (kd === 'habit' ? !gateAdd('habits', activeHabitCount()) : !gateAdd('projects', state.projects.length)) return;
            const o = addFromSpec(kd, p.spec, p.spec.name || '', p.spec.icon);
            sfx('unlock'); toast(t('chatAdded', { name: o.name })); render(); return;
          }
          if (b.dataset.gcPhoto) { b.disabled = true; await openPhoto(b.dataset.gcPhoto); return; }
          if (b.dataset.gcAudio) { b.disabled = true; await loadAudio(b.dataset.gcAudio); return; }
          if (b.dataset.gcFile) { b.disabled = true; try { await openFile(b.dataset.gcFile, b.dataset.name); } finally { b.disabled = false; } return; }
          if (b.dataset.gcStk) {
            const m = G.msgs.find(x => String(x.id) === b.dataset.gcStk), s = m && stickerSrc(m.payload || {});
            if (s) { const list = stickersGet(); if (!list.includes(s)) { list.unshift(s); if (stickersSet(list)) toast(t('stkSaved')); } else toast(t('stkSaved')); }
            return;
          }
          if (b.dataset.rate) { openRate(b.dataset.rate); return; }
          if (b.dataset.jrYes || b.dataset.jrNo) {
            b.disabled = true;
            await rpc('kg_join_respond', { p_group: gid, p_user: b.dataset.jrYes || b.dataset.jrNo, p_accept: !!b.dataset.jrYes });
            sfx(b.dataset.jrYes ? 'pop' : 'tap'); myGroups.at = 0; await refresh(); return;
          }
          if (b.dataset.gcDel) { if (await confirmDialog(t('chatDeleteQ'))) { await rpc('kg_delete_message', { p_id: +b.dataset.gcDel }); await loadMsgs(); draw(true); } return; }
          const a = b.dataset.g, link = `${APP_URL}?join=${G.code}`;
          if (a === 'share') { const text = t('gShareText', { name: G.info.group.name }); if (navigator.share) navigator.share({ title: 'KeepGoing', text, url: link }).catch(() => {}); else { await navigator.clipboard.writeText(`${text} ${link}`); toast(t('copied')); } }
          if (a === 'invite-chat') pickChat(t('shareToChat'), id => rpc('kg_post_invite', { p_group: id, p_target: gid }));
          if (a === 'copy-id') { try { await navigator.clipboard.writeText(G.info.group.code); toast(t('copied')); } catch (err) { /* nada */ } }
          if (a === 'newcode') { G.code = await rpc('kg_new_invite', { p_group: gid }); draw(); }
          if (a === 'chat-more') chatShare();
          if (a === 'stk') openStickers();
          if (a === 'mic') { if (G.rec) stopRec(); else await startRec(); }
          if (a === 'rec-cancel') stopRec(true);
          if (a === 'upgrade') openUpgrade();
          if (a === 'pic-rm' && await confirmDialog(t('gPicRemoveQ'))) { await rpc('kg_set_group_avatar', { p_group: gid, p_avatar: null }); myGroups.at = 0; await refresh(); }
          if (a === 'link-local' || a === 'link-habits') {
            const g = G.info.group, kind = g.kind === 'habit' ? 'habit' : 'project';
            let o = findByGroup(gid);
            if (!o && (kind === 'habit' ? !gateAdd('habits', activeHabitCount()) : !gateAdd('projects', state.projects.length))) return;
            if (!o) { o = objFromSpec(kind, g.spec || {}, g.name, g.icon); o.groupId = gid; (kind === 'habit' ? state.habits : state.projects).push(o); }
            const n = kind === 'project' ? addSpecHabits(o, g.spec) : 0;
            save(); sfx('unlock'); toast(a === 'link-habits' ? t('gHabitsAdded', { n }) : t('chatAdded', { name: o.name })); render();
            await pushGroupProgress(); await refresh();
          }
          if (a === 'add-friends') addFriendsToChat();
          if (a === 'launch') openLaunch();
          if (a === 'cancel' && await confirmDialog(t('liveCancelQ'))) { await rpc('kg_cancel_challenge', { p_challenge: G.info.active.id }); await refresh(); }
          if (a === 'rank-save') await saveRanking();
          if (a === 'leave' && await confirmDialog(t('groupLeaveQ'))) {
            await rpc('kg_leave_group', { p_group: gid, p_user: null });
            const o = findByGroup(gid); if (o) { delete o.groupId; save(); }
            close(); render(); toast(t('groupLeft'));
          }
        } catch (err) { toast(t('groupError', { e: err.message })); try { await refresh(); } catch (e2) { /* nada */ } }
      }
    });
  }

  /* ---- @nametag y reputación total (perfil individual) ---- */
  const repState = { total: null, nametag: null, loaded: false };
  async function loadRep() {
    if (!auth) return;
    try {
      const [r, u] = await Promise.all([rpc('kg_my_rep'), sbFetch(`/rest/v1/kg_users?user_id=eq.${auth.uid}&select=nametag`)]);
      repState.total = r.total; repState.awards = r.awards; repState.golds = r.golds; repState.nametag = (u[0] && u[0].nametag) || null; repState.loaded = true;
      cacheTag(repState.nametag);
    } catch (e) { /* sin conexión */ }
  }
  function repHtml() {
    if (!auth) return `<p class="muted small" style="margin:0">${esc(t('nametagNeedLogin'))}</p>`;
    return `<div class="stack" style="gap:12px">
      <div class="kpis" style="margin:0"><div class="kpi clay"><b>🏅 ${repState.total == null ? '…' : fmtNum(repState.total)}</b><span>${esc(t('repTotal'))}</span></div><div class="kpi clay"><b>🥇 ${repState.golds == null ? '…' : repState.golds}</b><span>1.º</span></div></div>
      <p class="muted small" style="margin:0">${esc(t('repTotalSub'))}</p></div>`;
  }
  // Crear o cambiar el @nametag (arriba del todo en el perfil y en el registro)
  function nametagHtml(cur = repState.nametag || myTag() || '') {
    if (!auth) return `<div class="field" style="margin:0"><span>${esc(t('nametagTitle'))}</span><p class="muted small" style="margin:4px 0 10px">${esc(t('nametagNeedLogin'))}</p><button class="btn primary" data-pf="login">${esc(t('signIn'))}</button></div>`;
    return `<label class="field" style="margin:0"><span>${esc(t('nametagTitle'))}</span><div class="row" style="gap:8px"><span class="at-prefix">@</span><input class="input grow" id="pf-tag" maxlength="20" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(t('nametagPh'))}" value="${esc(cur)}"><button class="btn" data-pf="tag">${esc(t('save'))}</button></div></label>
      <p class="muted small" style="margin:8px 0 0">${esc(t('nametagHint'))}</p>`;
  }
  // El @nametag se guarda también en el perfil local para mostrarlo junto al nivel sin esperar a la red
  function cacheTag(tag) { if ((profileOf().tag || null) !== (tag || null)) { state.profile = { ...profileOf(), tag: tag || '' }; save(); } }
  async function saveNametag(raw) {
    const tag = GG.toNametag(raw);
    if (!GG.isNametag(tag)) { toast(t('nametagBad')); return false; }
    try {
      await ensureToken();
      await sbFetch('/rest/v1/kg_users?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: auth.uid, nametag: tag, display_name: (firstName() || tag).slice(0, 40), avatar: myAvatar() || null, ...(state.kx ? { pubkey: state.kx.pub } : {}), updated_at: new Date().toISOString() }) });
      repState.nametag = tag; cacheTag(tag); render(); toast(t('nametagSaved')); sfx('toggle'); return true;
    } catch (e) { toast(e.status === 409 || /duplicate|unique/i.test(e.message) ? t('nametagTaken') : t('groupError', { e: e.message })); return false; }
  }
  // Unirse con ?join=CÓDIGO (se guarda hasta que haya sesión)
  const JOIN_KEY = 'keepgoing.join';
  async function processJoin() {
    let code = null; try { code = localStorage.getItem(JOIN_KEY); } catch (e) { /* nada */ }
    if (!code || !state.onboarded) return;
    if (!auth) { whenFree(() => openModal({ body: `<div class="center"><div style="font-size:48px">👥</div><h2>${esc(t('joinTitle'))}</h2><p class="muted">${esc(t('joinNeedLogin'))}</p></div>`, foot: `<button class="btn primary block" data-m="login">${esc(t('signIn'))}</button>`, onClick: (e, close) => { if (e.target.closest('[data-m="login"]')) { close(); openLogin(); } } })); return; }
    let info = null; try { info = await rpc('kg_peek_invite', { p_code: code }); } catch (e) { info = null; }
    if (!info) { try { localStorage.removeItem(JOIN_KEY); } catch (e) { /* nada */ } toast(t('joinInvalid')); return; }
    if (info.max_members && info.members >= info.max_members) { try { localStorage.removeItem(JOIN_KEY); } catch (e) { /* nada */ } toast(t('joinFull', { n: info.max_members })); return; }
    const ok = await confirmDialog(t('joinQ', { name: `${info.icon} ${info.name}`, n: info.members }));
    try { localStorage.removeItem(JOIN_KEY); } catch (e) { /* nada */ }
    if (!ok) return;
    const obj = objFromSpec(info.kind, info.spec || {}, info.name, info.icon);
    try { await rpc('kg_join_group', { p_code: code, p_display_name: firstName() || 'Amigo', p_local_id: obj.id }); }
    catch (e) { toast(/group full/.test(e.message) ? t('joinFull', { n: info.max_members || GG.MAX_MIEMBROS }) : t('groupError', { e: e.message })); return; }
    obj.groupId = info.group_id; (info.kind === 'habit' ? state.habits : state.projects).push(obj);
    if (info.kind === 'project') addSpecHabits(obj, info.spec);
    save(); myGroups.at = 0; render(); toast(t('joined', { name: info.name }));
    openGroup(info.group_id);
  }

  /* ---------- modales y avisos ---------- */
  // Las celebraciones esperan su turno si ya hay una ventana abierta
  const modalQueue = [];
  const whenFree = fn => { if ($('#modal-root').children.length) modalQueue.push(fn); else fn(); };
  function openModal({ title = '', body = '', foot = '', cls = '', onClick, onInput, onMount, onClose, beforeClose, dismissable = true }) {
    const root = $('#modal-root');
    const wrap = document.createElement('div'); wrap.className = 'backdrop';
    const isCard = cls.includes('card-view');
    wrap.innerHTML = `<div class="sheet ${cls}" role="dialog" aria-modal="true">${isCard ? '' : '<div class="sheet-grab"></div>'}${title ? `<div class="sheet-head"><h2>${title}</h2>${dismissable ? `<button class="icon-btn sm" data-m="x" aria-label="${esc(t('close'))}">${ico('x')}</button>` : ''}</div>` : ''}<div class="sheet-body">${body}</div>${foot ? `<div class="sheet-foot">${foot}</div>` : ''}</div>`;
    if (isCard) { wrap.style.background = 'rgba(0,0,0,.9)'; wrap.style.backdropFilter = wrap.style.webkitBackdropFilter = 'blur(8px)'; }
    root.appendChild(wrap);
    document.body.style.overflow = 'hidden';
    const onKey = e => { if (e.key === 'Escape' && dismissable && root.lastElementChild === wrap) tryClose(); };
    // v1.23: beforeClose (si lo hay) decide si se puede cerrar con la X, Cancelar, el fondo o Escape (p. ej. cambios sin guardar)
    let asking = false;
    const tryClose = async () => { if (asking) return; if (beforeClose) { asking = true; let ok = false; try { ok = await beforeClose(wrap); } finally { asking = false; } if (!ok) return; } close(); };
    const close = () => {
      wrap.remove(); document.removeEventListener('keydown', onKey);
      if (!root.children.length) document.body.style.overflow = '';
      onClose && onClose();
      if (!root.children.length && modalQueue.length) setTimeout(modalQueue.shift(), 280);
    };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', e => {
      if (e.target === wrap && dismissable) return tryClose();
      if (e.target.closest('[data-m="x"]')) return tryClose();
      onClick && onClick(e, close, wrap);
    });
    if (onInput) wrap.addEventListener('input', e => onInput(e, wrap));
    onMount && onMount(wrap, close);
    return { close, el: wrap };
  }
  /* v1.23: aviso al cerrar un editor con cambios sin guardar. snap() devuelve el estado del formulario; si no ha cambiado
     se cierra sin preguntar. «Guardar cambios y salir» pulsa el botón Guardar del editor (que valida y cierra). */
  function unsavedGuard(snap) {
    let first = null;
    return {
      start: () => { first = snap(); },
      check: async w => {
        if (first == null || snap() === first) return true;
        const r = await new Promise(res => {
          let done = false;
          openModal({
            body: `<div class="center"><span class="tool-ico" style="margin:4px auto 12px">${ico('alert')}</span><p style="font-size:17px;font-weight:var(--fw-subtitle);margin:0">${esc(t('unsavedTitle'))}</p><p class="muted small" style="margin:6px 0 0">${esc(t('unsavedSub'))}</p></div>`,
            foot: `<button class="btn danger-text" data-u="close">${ico('x')} ${esc(t('unsavedClose'))}</button><button class="btn primary" data-u="save">${ico('check')} ${esc(t('unsavedSave'))}</button>`,
            onClick: (e, close) => { const b = e.target.closest('[data-u]'); if (b) { done = true; close(); res(b.dataset.u); } },
            onClose: () => { if (!done) res(null); }
          });
        });
        if (r === 'close') return true;
        if (r === 'save') { const b = $('[data-m="save"]', w); if (b) b.click(); }
        return false;
      }
    };
  }
  function confirmDialog(msg) {
    return new Promise(res => {
      let answered = false;
      openModal({
        body: `<p style="font-size:17px;font-weight:var(--fw-subtitle);margin:6px 0 0">${esc(msg)}</p>`,
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
    if (el.matches('.dot[data-k]')) { const h = getHabit(el.closest('[data-hid]').dataset.hid); if (h) openDay(h, el.dataset.k); }
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
  // Pulsación larga en un hábito (fuera de casillas y anillo) → arrastrar para reordenar,
  // soltarlo encima de otro hábito para crear una carpeta (proyecto) o encima de una carpeta para meterlo
  let rd = null, rdTimer = null, rdBlockClick = false;
  document.addEventListener('pointerdown', e => {
    if (e.button !== 0 || rd) return;
    const card = e.target.closest('#habit-grid > .habit');
    if (!card || e.target.closest('.dot, .ring, .timer-btn, .grp-chip, .cal-nav, .more-btn, .w-del')) return;
    const sx = e.clientX, sy = e.clientY;
    clearTimeout(rdTimer);
    rdTimer = setTimeout(() => {
      rdTimer = null;
      const r = card.getBoundingClientRect(), grid = card.parentElement;
      rd = { card, grid, folder: grid.dataset.folder || null, ox: sx - r.left, oy: sy - r.top, x: sx, y: sy, moved: false, raf: 0, into: null, hover: null };
      card.classList.add('dragging'); document.body.classList.add('reordering'); vibrate(25); enterJiggle();
      // Dentro de una carpeta aparece una zona para sacar el hábito
      if (rd.folder) { const z = document.createElement('div'); z.className = 'drop-out'; z.innerHTML = `${ico('up')} ${esc(t('folderTakeOut'))}`; document.body.appendChild(z); rd.zone = z; }
      const loop = () => { // autodesplazamiento cerca de los bordes
        if (!rd) return;
        const edge = 90, v = rd.y < edge ? -(edge - rd.y) / 6 : rd.y > innerHeight - edge ? (rd.y - innerHeight + edge) / 6 : 0;
        if (v) scrollBy(0, v);
        rdMove();
        rd.raf = requestAnimationFrame(loop);
      };
      rd.raf = requestAnimationFrame(loop);
    }, jiggle ? 140 : 450);
    const cancel = ev => { if (rdTimer && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) { clearTimeout(rdTimer); rdTimer = null; } };
    document.addEventListener('pointermove', cancel);
    document.addEventListener('pointerup', () => { clearTimeout(rdTimer); rdTimer = null; document.removeEventListener('pointermove', cancel); }, { once: true });
  });
  const setInto = el => {
    if (!rd || rd.into === el) return;
    if (rd.into && rd.into.classList) rd.into.classList.remove('drop-into', 'hot');
    rd.into = el;
    if (el && el.classList) { el.classList.add(el.classList.contains('drop-out') ? 'hot' : 'drop-into'); vibrate(12); }
  };
  function rdMove() {
    const { card, grid } = rd;
    card.style.transform = '';
    const under = document.elementFromPoint(rd.x, rd.y);
    const zone = under && under.closest('.drop-out');
    const target = !zone && under && under.closest('#habit-grid > .habit, #habit-grid > .folder');
    if (zone) setInto(zone);
    else if (target && target !== card && target.parentElement === grid) {
      const r = target.getBoundingClientRect(), cx = (rd.x - r.left) / r.width, cy = (rd.y - r.top) / r.height;
      const center = cx > .2 && cx < .8 && cy > .18 && cy < .82;
      if (target.classList.contains('folder')) setInto(target);
      else {
        // Hay que quedarse un momento encima: en el centro crea la carpeta; en el borde reordena
        // (así, al ir hacia el centro de otro hábito, no se reordena por el camino)
        const zone = center && !rd.folder ? 'c' : 'e';
        if (!rd.hover || rd.hover.el !== target || rd.hover.zone !== zone) { rd.hover = { el: target, zone, at: Date.now() }; if (zone === 'e') setInto(null); }
        else if (zone === 'c' && Date.now() - rd.hover.at > 320) setInto(target);
        else if (zone === 'e' && Date.now() - rd.hover.at > 180) {
          rd.hover = null; setInto(null);
          const kids = [...grid.children], from = kids.indexOf(card), to = kids.indexOf(target);
          grid.insertBefore(card, to > from ? target.nextSibling : target); rd.moved = true;
        }
      }
    } else { rd.hover = null; setInto(null); }
    const r = card.getBoundingClientRect();
    card.style.transform = `translate(${rd.x - rd.ox - r.left}px, ${rd.y - rd.oy - r.top}px) scale(${rd.into ? .9 : 1.03})`;
  }
  document.addEventListener('pointermove', e => { if (!rd) return; e.preventDefault(); rd.x = e.clientX; rd.y = e.clientY; });
  // En móvil hay que frenar el desplazamiento de la página mientras se arrastra
  document.addEventListener('touchmove', e => { if (rd) e.preventDefault(); }, { passive: false });
  ['pointerup', 'pointercancel'].forEach(n => document.addEventListener(n, ev => {
    if (!rd) return;
    const { card, grid, moved, into, folder, zone } = rd; cancelAnimationFrame(rd.raf); rd = null;
    card.classList.remove('dragging'); card.style.transform = ''; document.body.classList.remove('reordering');
    if (zone) zone.remove();
    if (into && into.classList) into.classList.remove('drop-into', 'hot');
    // El clic que llega al soltar no debe marcar nada ni sacar del modo edición
    rdBlockClick = jigBlockClick = true; setTimeout(() => { rdBlockClick = jigBlockClick = false; }, 350);
    const hid = card.dataset.id;
    if (ev.type === 'pointerup' && into) {
      if (into.classList.contains('drop-out')) { const p = state.projects.find(x => x.id === folder); if (p) { p.habitIds = p.habitIds.filter(x => x !== hid); save(); render(); toast(t('folderTookOut')); } return; }
      if (into.classList.contains('folder')) { const p = state.projects.find(x => x.id === into.dataset.pid); if (p) { if (!p.habitIds.includes(hid)) p.habitIds.push(hid); save(); render(); sfx('complete'); toast(t('folderAdded', { name: p.name })); } return; }
      createFolder(into.dataset.id, hid); return;
    }
    if (!moved) return;
    // Los hábitos visibles ocupan sus mismos huecos en la lista completa, con el orden nuevo
    const ids = [...grid.children].filter(el => el.classList.contains('habit')).map(el => el.dataset.id), set = new Set(ids);
    const slots = state.habits.map((h, i) => set.has(h.id) ? i : -1).filter(i => i >= 0);
    const byId = Object.fromEntries(state.habits.map(h => [h.id, h]));
    const next = state.habits.slice(); slots.forEach((slot, j) => { next[slot] = byId[ids[j]]; });
    state.habits = next;
    // Dentro de una carpeta también se guarda su propio orden
    if (folder) { const p = state.projects.find(x => x.id === folder); if (p) p.habitIds = [...ids, ...p.habitIds.filter(x => !set.has(x))]; }
    save(); render(); toast(t('reordered'));
  }));
  function deleteHabit(h) {
    state.habits = state.habits.filter(x => x !== h);
    for (const k of ['logs', 'mastery', 'rest', 'shields', 'ltime', 'sublogs']) if (state[k]) delete state[k][h.id];
    state.routines.forEach(r => { r.habitIds = r.habitIds.filter(id => id !== h.id); });
    state.projects.forEach(p => { p.habitIds = p.habitIds.filter(id => id !== h.id); });
    save(); render(); toast(t('deleted'));
  }
  // Soltar un hábito encima de otro: nueva carpeta (proyecto) con los dos; luego se le pone nombre
  function createFolder(aId, bId) {
    const a = getHabit(aId), b = getHabit(bId); if (!a || !b) return;
    if (!gateAdd('projects', state.projects.length)) return;
    const p = { id: uid(), name: t('folderNewName'), icon: '📁', color: null, desc: '', habitIds: [aId, bId], goal: { type: 'simple', start: 0, target: 0, unit: '', entries: [], items: [], achieved: false }, deadline: null, milestones: [], photos: {}, createdAt: todayKey() };
    state.projects.push(p); save(); render(); sfx('complete'); vibrate([10, 30, 10]); toast(t('folderCreated'));
    setTimeout(() => openProjectEditor(p), 260);
  }
  window.addEventListener('click', e => { if (rdBlockClick) { e.preventDefault(); e.stopPropagation(); rdBlockClick = false; } }, true);
  document.addEventListener('contextmenu', e => {
    if (rd || e.target.closest('#habit-grid > .habit, #habit-grid > .folder') || (e.target.closest(JIG_SEL) && e.target.closest('#main'))) { if (!e.target.closest('.dot[data-k], .ring[data-ring]')) { e.preventDefault(); return; } }
    const el = e.target.closest('.dot[data-k], .ring[data-ring]');
    if (!el) return;
    e.preventDefault();
    if (!lpFired) { lpFired = true; longPress(el); }
  });

  /* ---------- Modo edición: pulsación larga en un widget → todos tiemblan y muestran un «−» rojo para quitarlos ----------
     Hábitos, carpetas, retos, rutinas, chats, grupos, libretas compartidas y eventos se borran (o se dejan) con confirmación;
     el resto de tarjetas (mascota, energía, contrato, gráficas…) solo se ocultan y se recuperan en Ajustes. */
  const JIG_SEL = '.habit-grid > .habit, .habit-grid > .folder, .proj.finished, .today-row[data-trow], .routine-card[data-rid], .chat-sw, .ev-card[data-ev-open], [data-w]';
  const HW = { dayrate: '⭐', pet: '🐾', energy: '⚡', contract: '📜', insights: '💡', reviews: '📝', ledPie: '🥧', ledLine: '📈', ledFilter: '🔎' };
  let jiggle = false, jgTimer = null, jigBlockClick = false;
  function enterJiggle() {
    if (jiggle) return;
    jiggle = true; document.body.classList.add('jiggle'); vibrate(25); decorateJiggle();
  }
  function exitJiggle() {
    if (!jiggle) return;
    jiggle = false; document.body.classList.remove('jiggle');
    $$('.w-del, .w-move').forEach(x => x.remove()); $$('.jig').forEach(x => x.classList.remove('jig'));
    const d = $('.jiggle-done'); if (d) d.remove();
  }
  function decorateJiggle() {
    if (!jiggle) return;
    const main = $('#main'); if (!main) return;
    $$(JIG_SEL, main).forEach((el, i) => {
      if (el.querySelector(':scope > .w-del')) return;
      el.classList.add('jig'); el.style.setProperty('--jd', `${-(i % 4) * .09}s`);
      el.insertAdjacentHTML('beforeend', `<span class="w-del" role="button" tabindex="0" data-w-del aria-label="${esc(t('jigRemove'))}" title="${esc(t('jigRemove'))}">−</span>`);
      // v1.25: los hábitos llevan también «Mover a un proyecto» (si hay proyectos)
      if (el.matches('.habit-grid > .habit') && state.projects.some(p => !p.archived)) el.insertAdjacentHTML('beforeend', `<span class="w-move" role="button" tabindex="0" data-w-move aria-label="${esc(t('hMove'))}" title="${esc(t('hMove'))}">${ico('folder')}</span>`);
    });
    if (!$('.jiggle-done')) document.body.insertAdjacentHTML('beforeend', `<button class="btn primary jiggle-done" data-jig-done>${ico('check')} ${esc(t('jigDone'))}</button>`);
  }
  document.addEventListener('pointerdown', e => {
    if (e.button !== 0 || jiggle || !state.onboarded) return;
    const el = e.target.closest(JIG_SEL);
    // Los hábitos de la cuadrícula ya tienen su pulsación larga (la de arrastrar), que también activa este modo
    if (!el || !el.closest('#main') || el.matches('#habit-grid > .habit')) return;
    if (e.target.closest('input, select, textarea, .dot, .ring, .cal-nav, .seg, .more-btn')) return;
    const sx = e.clientX, sy = e.clientY;
    clearTimeout(jgTimer);
    jgTimer = setTimeout(() => { jgTimer = null; jigBlockClick = true; enterJiggle(); }, 500);
    const mv = ev => { if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) stop(); };
    const stop = () => { clearTimeout(jgTimer); jgTimer = null; document.removeEventListener('pointermove', mv); };
    document.addEventListener('pointermove', mv);
    ['pointerup', 'pointercancel'].forEach(n => document.addEventListener(n, () => { stop(); setTimeout(() => { jigBlockClick = false; }, 400); }, { once: true }));
  });
  window.addEventListener('click', e => {
    if (jigBlockClick) { jigBlockClick = false; e.preventDefault(); e.stopPropagation(); return; }
    if (!jiggle || e.target.closest('#modal-root')) return;
    const del = e.target.closest('[data-w-del]'), mvb = e.target.closest('[data-w-move]');
    if (del || mvb || e.target.closest('[data-jig-done]') || e.target.closest('.jig')) { e.preventDefault(); e.stopPropagation(); }
    if (del) { jigRemove(del.parentElement); return; }
    if (mvb) { const h = getHabit(mvb.parentElement.dataset.id); if (h) openHabitMove(h); return; }
    if (!e.target.closest('.jig')) exitJiggle(); // fuera de los widgets (o en «Listo») se sale del modo
  }, true);
  document.addEventListener('keydown', e => {
    if (!jiggle) return;
    if (e.key === 'Escape' && !$('#modal-root').children.length) exitJiggle();
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-w-del]')) { e.preventDefault(); jigRemove(e.target.parentElement); }
  });
  /* Reordenar en modo edición: mantén pulsado un widget que tiembla y arrástralo entre los de su mismo tipo.
     Hábitos, carpetas y rutinas cambian su orden en la lista; el resto guarda su orden en state.wOrder. */
  const reslot = (arr, ids) => {
    const byId = Object.fromEntries(arr.map(x => [x.id, x])); ids = ids.filter(id => byId[id]);
    const set = new Set(ids), slots = arr.map((x, i) => set.has(x.id) ? i : -1).filter(i => i >= 0), next = arr.slice();
    slots.forEach((s, j) => { next[s] = byId[ids[j]]; }); return next;
  };
  const ordKey = el => el.dataset.cw ? el.dataset.cw : el.dataset.chatOpen ? 'c:' + el.dataset.chatOpen : el.dataset.lsOpen ? 'l:' + el.dataset.lsOpen : el.dataset.evOpen ? 'e:' + el.dataset.evOpen : el.dataset.w ? 'w:' + el.dataset.w : '';
  const DOM_ORD = '.chat-sw, .ev-card[data-ev-open], [data-w]';
  const ORD = [
    { sel: '.habit-grid > .folder', id: el => el.dataset.pid, save: ids => { state.projects = reslot(state.projects, ids); } },
    { sel: '.proj.finished', id: el => el.dataset.id, save: ids => { state.projects = reslot(state.projects, ids); } },
    { sel: '.habit-grid > .habit', id: el => el.dataset.id, save: ids => { state.habits = reslot(state.habits, ids); } },
    { sel: '.today-row[data-trow]', id: el => el.dataset.trow, save: ids => { state.habits = reslot(state.habits, ids); } },
    { sel: '.routine-card[data-rid]', id: el => el.dataset.rid, save: ids => { state.routines = reslot(state.routines, ids); } },
    { sel: DOM_ORD, id: ordKey, save: keys => { const set = new Set(keys); state.wOrder = [...keys, ...(state.wOrder || []).filter(k => !set.has(k))].slice(0, 400); } }
  ];
  // Coloca los widgets según state.wOrder, cada uno dentro de su mismo contenedor (los nuevos van primero)
  function applyWOrder(root) {
    const ord = state.wOrder || []; if (!ord.length || !root) return;
    const idx = new Map(ord.map((k, i) => [k, i])), groups = new Map();
    $$(DOM_ORD, root).forEach(el => { if (!ordKey(el)) return; const p = el.parentElement; if (!groups.has(p)) groups.set(p, []); groups.get(p).push(el); });
    for (const els of groups.values()) {
      if (els.length < 2) continue;
      const pos = el => idx.has(ordKey(el)) ? idx.get(ordKey(el)) : -1;
      const sorted = els.map((el, i) => [el, pos(el), i]).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map(x => x[0]);
      if (sorted.every((el, i) => el === els[i])) continue;
      const marks = els.map(el => { const c = document.createComment(''); el.before(c); return c; });
      marks.forEach((c, i) => c.replaceWith(sorted[i]));
    }
  }
  let od = null, odTimer = null;
  document.addEventListener('pointerdown', e => {
    if (!jiggle || e.button !== 0 || od || rd) return;
    const el = e.target.closest('.jig');
    if (!el || !el.closest('#main') || el.matches('#habit-grid > .habit') || e.target.closest('.w-del, input, select, textarea')) return;
    const kind = ORD.find(k => el.matches(k.sel)); if (!kind) return;
    const sx = e.clientX, sy = e.clientY;
    clearTimeout(odTimer);
    odTimer = setTimeout(() => {
      odTimer = null;
      const r = el.getBoundingClientRect();
      od = { el, kind, parent: el.parentElement, ox: sx - r.left, oy: sy - r.top, x: sx, y: sy, moved: false, raf: 0, hover: null };
      el.classList.add('dragging'); document.body.classList.add('reordering'); vibrate(20);
      const loop = () => {
        if (!od) return;
        const edge = 90, v = od.y < edge ? -(edge - od.y) / 6 : od.y > innerHeight - edge ? (od.y - innerHeight + edge) / 6 : 0;
        if (v) scrollBy(0, v);
        odMove(); od.raf = requestAnimationFrame(loop);
      };
      od.raf = requestAnimationFrame(loop);
    }, 140);
    const cancel = ev => { if (odTimer && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) { clearTimeout(odTimer); odTimer = null; } };
    document.addEventListener('pointermove', cancel);
    document.addEventListener('pointerup', () => { clearTimeout(odTimer); odTimer = null; document.removeEventListener('pointermove', cancel); }, { once: true });
  });
  function odMove() {
    const { el, parent, kind } = od;
    el.style.transform = '';
    const under = document.elementFromPoint(od.x, od.y), target = under && under.closest('.jig');
    if (target && target !== el && target.parentElement === parent && target.matches(kind.sel)) {
      if (!od.hover || od.hover.el !== target) od.hover = { el: target, at: Date.now() };
      else if (Date.now() - od.hover.at > 120) {
        od.hover = null;
        const kids = [...parent.children], from = kids.indexOf(el), to = kids.indexOf(target);
        parent.insertBefore(el, to > from ? target.nextSibling : target); od.moved = true;
      }
    } else od.hover = null;
    const r = el.getBoundingClientRect();
    el.style.transform = `translate(${od.x - od.ox - r.left}px, ${od.y - od.oy - r.top}px) scale(1.03)`;
  }
  document.addEventListener('pointermove', e => { if (!od) return; e.preventDefault(); od.x = e.clientX; od.y = e.clientY; });
  document.addEventListener('touchmove', e => { if (od) e.preventDefault(); }, { passive: false });
  ['pointerup', 'pointercancel'].forEach(n => document.addEventListener(n, () => {
    if (!od) return;
    const { el, parent, kind, moved } = od; cancelAnimationFrame(od.raf); od = null;
    el.classList.remove('dragging'); el.style.transform = ''; document.body.classList.remove('reordering');
    jigBlockClick = true; setTimeout(() => { jigBlockClick = false; }, 350);
    if (!moved) return;
    kind.save([...parent.children].filter(x => x.matches(kind.sel)).map(kind.id));
    save(); render(); toast(t('reordered'));
  }));
  /* v1.25: mover un hábito a otro proyecto o sacarlo del suyo. Dentro de un proyecto abierto, «mover» lo saca de ese y lo
     pone en el elegido; fuera, lo añade al elegido. «Sacar» lo quita del proyecto abierto (o de todos, si no hay ninguno abierto). */
  function openHabitMove(h) {
    const fo = openFolder(), inP = state.projects.filter(p => p.habitIds.includes(h.id));
    const list = state.projects.filter(p => !p.archived && !(fo && p.id === fo.id));
    openModal({
      title: `${ico('folder')} ${esc(t('hMoveTitle', { name: h.name }))}`,
      body: `<div class="stack" style="gap:8px">${list.map(p => `<button class="btn block ${p.habitIds.includes(h.id) ? 'on' : ''}" data-hmv="${esc(p.id)}" style="justify-content:flex-start">${esc(p.icon || '')} ${esc(p.name)}${p.habitIds.includes(h.id) ? ` <span class="muted small">· ${esc(t('hMoveHere'))}</span>` : ''}</button>`).join('') || `<p class="muted">${esc(t('hMoveNone'))}</p>`}
        ${fo || inP.length ? `<button class="btn block danger-text" data-hmv="">${ico('x')} ${esc(t(fo ? 'hMoveOut' : 'hMoveOutAll'))}</button>` : ''}</div>`,
      onClick: (e, close) => {
        const b = e.target.closest('[data-hmv]'); if (!b) return;
        const to = b.dataset.hmv;
        let ids = inP.map(p => p.id);
        if (fo) ids = ids.filter(x => x !== fo.id);
        if (to) { if (!ids.includes(to)) ids.push(to); } else if (!fo) ids = [];
        setHabitProjects(h, ids); save(); close(); exitJiggle(); render(); sfx('tap'); toast(t('saved'));
      }
    });
  }
  async function jigRemove(el) {
    if (el && el.matches('.chat-sw')) el = el.querySelector('.chat-row');
    if (!el) return;
    const retos = state.ui.tab === 'habits' && habitsView() === 'challenges';
    try {
      if (el.matches('.habit, .today-row')) {
        const h = getHabit(el.dataset.id || el.dataset.trow); if (!h) return;
        // En «Retos» el «−» quita el reto; el hábito se queda
        if (retos && h.challenge) { if (await confirmDialog(t('jigRetoQ', { name: h.name }))) { delete h.challenge; save(); render(); toast(t('jigRetoGone')); } return; }
        if (await confirmDialog(t('deleteHabitQ', { name: h.name }))) deleteHabit(h);
        return;
      }
      if (el.matches('.folder, .proj')) {
        const p = state.projects.find(x => x.id === (el.dataset.pid || el.dataset.id)); if (!p) return;
        if (retos && p.deadline) { if (await confirmDialog(t('jigRetoQ', { name: p.name }))) { p.deadline = null; p.retoFrom = null; save(); render(); toast(t('jigRetoGone')); } return; }
        if (await confirmDialog(t('deleteProjectQ', { name: p.name }))) { state.projects = state.projects.filter(x => x !== p); if (state.ui.folder === p.id) state.ui.folder = null; save(); render(); toast(t('deleted')); }
        return;
      }
      if (el.matches('.routine-card')) {
        const r = state.routines.find(x => x.id === el.dataset.rid); if (!r) return;
        if (await confirmDialog(t('deleteRoutineQ', { name: r.name }))) { state.routines = state.routines.filter(x => x !== r); save(); render(); toast(t('deleted')); }
        return;
      }
      if (el.matches('[data-chat-open]')) {
        const gid = el.dataset.chatOpen, g = (myGroups.list || []).find(x => x.id === gid); if (!g) return;
        if (!await confirmDialog(t(g.chat === 'dm' ? 'jigDmQ' : 'jigChatQ', { name: chatName(g) }))) return;
        await rpc('kg_leave_group', { p_group: gid, p_user: null });
        const o = findByGroup(gid); if (o) { delete o.groupId; save(); }
        myGroups.list = myGroups.list.filter(x => x.id !== gid); myGroups.at = 0; render(); toast(t('groupLeft'));
        return;
      }
      if (el.matches('[data-ls-open]')) {
        const id = el.dataset.lsOpen;
        if (!await confirmDialog(t('lsHideQ'))) return;
        await rpc('kg_ledger_hide', { p_id: id });
        chatData.shares = (chatData.shares || []).filter(x => x.id !== id); chatData.at = 0; render(); toast(t('deleted'));
        return;
      }
      if (el.matches('.ev-card')) {
        const ev = LV.events.find(x => x.id === el.dataset.evOpen); if (!ev) return;
        if (await confirmDialog(t('evDeleteQ', { name: ev.name }))) { LV.events = LV.events.filter(x => x !== ev); ledgerSave(); render(); toast(t('deleted')); }
        return;
      }
      const k = el.dataset.w;
      if (k && HW[k]) { state.hiddenW = [...new Set([...(state.hiddenW || []), k])]; save(); render(); toast(t('jigHidden')); }
    } catch (err) { toast(chatErr(err)); }
  }
  // Ajustes → «Widgets ocultos»
  const hwName = k => t('hw_' + k);
  const hiddenWHtml = () => (state.hiddenW || []).filter(k => HW[k]).length
    ? `<div class="stack" style="gap:8px">${state.hiddenW.filter(k => HW[k]).map(k => `<div class="row" style="gap:10px"><span style="font-size:20px">${HW[k]}</span><b class="grow">${esc(hwName(k))}</b><button class="chip" data-s="hw-restore" data-v="${k}">${ico('refresh')} ${esc(t('hwRestore'))}</button></div>`).join('')}</div>`
    : `<p class="muted small" style="margin:0">${esc(t('hwNone'))}</p>`;

  // Campos de solo lectura (enlaces para copiar): seleccionar todo al tocar (antes onclick en línea, incompatible con la CSP)
  document.addEventListener('click', e => { const el = e.target; if (el && el.tagName === 'INPUT' && el.readOnly) el.select(); });
  document.addEventListener('click', e => {
    // Un clic dentro de una ventana (aunque esa ventana ya se haya cerrado al pulsar) no llega a la vista de detrás
    if (!e.target.isConnected || e.target.closest('#modal-root')) return;
    if (!state.onboarded) { onboardingClick(e); return; }
    // casillas
    const dot = e.target.closest('.dot[data-k]');
    if (dot) {
      if (lpFired) { lpFired = false; return; }
      const h = getHabit(dot.closest('[data-hid]').dataset.hid);
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
    if ((el = e.target.closest('[data-drate]')) && !el.closest('#modal-root')) { setDayRate(todayKey(), +el.dataset.drate); vibrate(8); render(); return; }
    if ((el = e.target.closest('[data-energy]'))) { const v = +el.dataset.energy, k = todayKey(); if (state.energy[k] === v) delete state.energy[k]; else state.energy[k] = v; save(); checkSecrets(); vibrate(8); render(); return; }
    if ((el = e.target.closest('[data-routine-run]'))) { const r = state.routines.find(x => x.id === el.dataset.routineRun); if (r) runRoutine(r); return; }
    if ((el = e.target.closest('[data-routine-edit]'))) { const r = state.routines.find(x => x.id === el.dataset.routineEdit); if (r) openRoutineEditor(r); return; }
    if ((el = e.target.closest('[data-cal]'))) { const box = el.closest('[data-hid]'); if (box) { moveCal(box.dataset.hid, +el.dataset.cal); vibrate(6); } return; }
    if ((el = e.target.closest('[data-timer]'))) { const h = getHabit(el.dataset.timer); if (h) openTimer(h); return; }
    if ((el = e.target.closest('[data-group]'))) { e.preventDefault(); openGroup(el.dataset.group); return; }
    if ((el = e.target.closest('[data-group-open]'))) { openGroup(el.dataset.groupOpen); return; }
    if (state.ui.tab === 'chat' && chatClick(e)) return;
    if (state.ui.tab === 'ledger' && (calcClick(e) || worthClick(e))) return;
    if (state.ui.tab === 'cal' && tfClick(e)) return;
    if ((el = e.target.closest('[data-ledger-day]'))) { state.ui.ledgerDay = el.dataset.ledgerDay; save(); render(); const f = $(`[data-ledger-day="${el.dataset.ledgerDay}"]`); if (f) f.focus(); const p = $('.ledger-day'); if (p && p.getBoundingClientRect().top > innerHeight) p.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); return; }
    if ((el = e.target.closest('[data-pin]'))) { pinKey(el.dataset.pin); return; }
    if (swipeClick(e)) return;
    if ((el = e.target.closest('[data-ev-open]'))) { openEvent(el.dataset.evOpen); return; }
    const a = e.target.closest('[data-act]'); if (!a) return;
    const id = a.dataset.id;
    switch (a.dataset.act) {
      case 'dev-view-real': state.ui.devView = ''; save(); planPickAsked = false; render(); refreshPlan().then(() => render()); toast(t('stSaved')); break;
      case 'go': pendingShare = null; if (state.ui.tab === a.dataset.tab && state.ui.folder) state.ui.folder = null; if (state.ui.tab !== a.dataset.tab) state.ui.ledgerView = ''; state.ui.tab = a.dataset.tab; save(); render(); window.scrollTo(0, 0); break;
      case 'calc-open': state.ui.ledgerView = 'calc'; save(); render(); window.scrollTo(0, 0); break;
      case 'calc-close': state.ui.ledgerView = ''; save(); render(); window.scrollTo(0, 0); break;
      case 'create': openCreateMenu(); break;
      case 'packs': openPacks(); break;
      case 'hview': state.ui.habitsView = a.dataset.v; state.ui.folder = null; save(); render(); break;
      case 'folder-open': state.ui.folder = id; save(); render(); window.scrollTo(0, 0); break;
      case 'folder-close': state.ui.folder = null; save(); render(); break;
      case 'proj-edit': { const p = state.projects.find(x => x.id === id); if (p) openProjectEditor(p); break; }
      // v1.25: «Extraer»: todos los hábitos salen de la carpeta del proyecto (no se borran ni cambia nada más)
      case 'proj-extract': { const p = state.projects.find(x => x.id === id); if (!p || !p.habitIds.length) break; confirmDialog(t('projExtractQ', { n: p.habitIds.length, name: p.name })).then(ok => { if (!ok) return; p.habitIds = []; save(); render(); sfx('tap'); toast(t('projExtracted')); }); break; }
      case 'vacations': openVacations(); break;
      case 'level': openLevel(); break;
      case 'perfect-rules': openPerfectRules(); break;
      case 'privacy': setPrivacy(!privacyOn()); render(); sfx('toggle'); toast(t(privacyOn() ? 'privacyOnToast' : 'privacyOffToast')); break;
      case 'caprice': openCaprice(); break;
      case 'vault-sec': openVaultSecurity(); break;
      case 'vault-bio': unlockWithBio(); break;
      case 'vault-usepw': pwMode = true; pinBuf = ''; render(); setTimeout(() => $('#vault-pw')?.focus(), 50); break;
      case 'vault-usepin': pwMode = false; render(); break;
      case 'led-pie': state.ui.ledPie = a.dataset.v; save(); render(); break;
      case 'led-pie-mode': state.ui.ledPieMode = a.dataset.v; save(); render(); break;
      case 'led-pie-view': state.ledgerPrefs = { ...(state.ledgerPrefs || {}), pieView: pieLine() ? 'pie' : 'line' }; save(); render(); break;
      case 'led-line': state.ui.ledLine = a.dataset.v; save(); render(); break;
      case 'led-range': {
        const td = todayKey(), sp = LED.span(LV.entries), v = a.dataset.v;
        const from = v === 'm' ? td.slice(0, 8) + '01' : v === 'y' ? td.slice(0, 4) + '-01-01' : v === '12' ? addMonths(td, -12) : (sp ? sp.from : td);
        state.ui.ledFilter = { ...(state.ui.ledFilter || {}), from, to: td }; save(); render(); break;
      }
      case 'vault-lock': lockByHand(); render(); sfx('toggle'); toast(t('vaultLocked')); break;
      case 'vault-wipe': confirmVaultWipe(); break;
      case 'ledger-add': if (!ledgerOpen()) { state.ui.tab = 'ledger'; render(); break; } openEntry(null, a.dataset.d || state.ui.ledgerDay || todayKey()); break;
      case 'rate-yday': openRateDay(addDays(todayKey(), -1)); break;
      case 'ledger-dayshift': { const k = addDays(state.ui.ledgerDay && state.ui.ledgerDay.startsWith(ledgerMonth()) ? state.ui.ledgerDay : todayKey(), +a.dataset.d); state.ui.ledgerDay = k; state.ui.ledgerMonth = k.slice(0, 7); save(); render(); break; }
      case 'ledger-month': { const [yy, mm] = ledgerMonth().split('-').map(Number), d = new Date(yy, mm - 1 + +a.dataset.d, 1); state.ui.ledgerMonth = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; save(); render(); break; }
      case 'ledger-cats': openLedgerCats(); break;
      case 'ledger-recs': openLedgerRecs(); break;
      case 'ledger-events': openLedgerEvents(); break;
      case 'ledger-budget': openBudgets(); break;
      case 'ledger-contacts': openContacts(); break;
      case 'ledger-import': if (ledgerOpen()) openRegistrar(); break;
      case 'ledger-imports': if (ledgerOpen()) openRegistros(); break;
      case 'ledger-fx': if (ledgerOpen()) openFxSettings(); break;
      case 'ledger-share': openLedgerShare(); break;
      case 'profile': openProfile(); break;
      case 'cview': state.ui.chatView = a.dataset.v; save(); render(); break;
      case 'chat-friends': state.ui.chatView = 'friends'; save(); render(); setTimeout(() => $('#friend-tag')?.focus(), 60); break;
      case 'chat-new': if (!chatData.friends) refreshChat(true); openChatPlus(); break;
      case 'chat-login': openLogin(); break;
      case 'm-rank': state.ui.mRank = a.dataset.v; save(); render(); break;
      case 'm-habit': state.ui.mHabit = a.dataset.v; save(); render(); break;
      case 'proj-tpl': openProjectTemplates(); break;
      case 'report': openReport(); break;
      case 'more': openMore(a.dataset.kind, a.dataset.id); break;
      case 'review-now': openReview(weekStart(todayKey())); break;
      case 'review-open': openReview(a.dataset.v); break;
      case 'secret-open': { const s = SECRETS.find(x => x[0] === id); if (s) openTrophy(secretCardHtml(s[0], s[1]), state.secrets[id] ? t('sec_' + id) : '???', state.secrets[id] ? t('secd_' + id) : t('secretHidden'), state.secrets[id] ? () => trophyCanvas('secret', { id, icon: s[1] }) : null); break; }
      case 'pet-edit': openPetEditor(); break;
      case 'pet': {
        petIdx++; const msgs = petMessages(), m = $('#pet-msg'); if (m) m.textContent = msgs[petIdx % msgs.length];
        a.classList.remove('bounce'); void a.offsetWidth; a.classList.add('bounce'); vibrate([8, 30, 8, 30, 8]);
        break;
      }
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
      case 'pcard-open': openCard(PSUBJ(), +a.dataset.i); break;
      case 'ranks-info': openRanks(); break;
      case 'cc-open': { const cc = state.contractCards.find(x => x.id === id); if (cc) openContractCard(cc); break; }
    }
  });
  // Rebote al tocar botones (funciona con ratón, dedo y teclado; nada depende solo de hover)
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.btn, .chip, .icon-btn, .lvl-pill, .nav button, .seg button, .cal-cell:not(.empty), .ledger-item');
    if (!b || !b.isConnected) return;
    b.classList.remove('tap-pop'); void b.offsetWidth; b.classList.add('tap-pop');
    b.addEventListener('animationend', () => b.classList.remove('tap-pop'), { once: true });
  }, true);
  document.addEventListener('change', e => {
    if (e.target.id === 'chart-habit') { state.ui.chartHabit = e.target.value; save(); render(); }
    if (e.target.matches('[data-led-f="from"]') && e.target.value && diffDays(e.target.value, todayKey()) >= KGPlan.LIMITS.chartDays && !KGPlan.allows(PL(), 'history')) { e.target.value = addDays(todayKey(), -(KGPlan.LIMITS.chartDays - 1)); openUpsell({ feature: 'history' }); }
    if (e.target.matches('[data-led-f]')) { state.ui.ledFilter = { cat: 'all', from: todayKey().slice(0, 4) + '-01-01', to: todayKey(), ...(state.ui.ledFilter || {}), [e.target.dataset.ledF]: e.target.value }; save(); render(); }
    if (e.target.matches('[data-led-opt]')) {
      const o = e.target.dataset.ledOpt, on = e.target.checked;
      if (o === 'privacy') { setPrivacy(on); render(); sfx('toggle'); toast(t(on ? 'privacyOnToast' : 'privacyOffToast')); }
      if (o === 'flip') setFlip(on);
      if (o === 'cap') { state.ledgerPrefs = { ...state.ledgerPrefs, capHidden: !on }; save(); render(); }
      if (o === 'capsum') { state.ledgerPrefs = { ...state.ledgerPrefs, capSum: on }; save(); render(); }
      if (o === 'orgdays') { state.ledgerPrefs = { ...state.ledgerPrefs, orgDays: on }; save(); render(); }
    }
    if (e.target.matches('[data-ledger-m], [data-ledger-y]')) {
      const y = $('[data-ledger-y]').value, m = $('[data-ledger-m]').value;
      state.ui.ledgerMonth = `${y}-${pad(+m)}`; save(); render();
    }
  });
  document.addEventListener('pointerover', e => {
    const el = e.target.closest && e.target.closest('[data-tip]');
    const box = el && el.closest('.chart');
    if (box) showTip(box, el); else hideTip();
  });

  // Redimensionar: recalcula cuántas semanas caben en las tarjetas
  let rsz, lastW = window.innerWidth;
  window.addEventListener('resize', () => { clearTimeout(rsz); rsz = setTimeout(() => { if (!state.onboarded || window.innerWidth === lastW) return; lastW = window.innerWidth; { initCals($('#main')); placeNavInd(-1); } }, 150); });
  // Cambio de día (app abierta a medianoche o al volver)
  let lastDay = todayKey();
  // Los hábitos a dejar ganan cartas con el paso de los días: se comprueban al cambiar de día
  const dayCheck = () => {
    if (todayKey() === lastDay) return;
    lastDay = todayKey(); render();
    checkPerfectMastery(); state.habits.filter(isQuit).forEach(h => checkChallenge(h));
    checkSecrets(); offerShields(); maybeWeeklyReview(); checkRetos();
  };
  setInterval(dayCheck, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) dayCheck(); });

  /* ---------- PWA (solo cuando se sirve por http/https) ---------- */
  if (location.protocol.startsWith('http')) {
    const l = document.createElement('link'); l.rel = 'manifest'; l.href = 'manifest.webmanifest'; document.head.appendChild(l);
    if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  // Perfil público (?u=slug): página de solo lectura, sin cargar la app
  const params = new URLSearchParams(location.search);
  if (params.get('u')) { publicMode = true; renderPublicProfile(params.get('u')); return; }
  // Enlace del testigo (?w=…): firmar el contrato de otra persona
  if (params.get('w')) { publicMode = true; renderWitnessPage(params.get('w')); return; }
  // Invitación a un reto (?join=CÓDIGO): se guarda hasta tener sesión
  if (params.get('join')) { try { localStorage.setItem(JOIN_KEY, params.get('join').toUpperCase()); } catch (e) { /* nada */ } history.replaceState(null, '', location.pathname); }

  // Sincroniza cartas ya ganadas (por ejemplo, tras importar) y arranca
  checkPerfectMastery(true); state.habits.forEach(h => checkChallenge(h, !isQuit(h)));
  checkSecrets(true);
  render();
  if (auth) scheduleSync(400);
  // Plan: lo último guardado vale para arrancar; luego se pregunta al servidor
  if (auth) setTimeout(() => refreshPlan().then(() => { if (state.onboarded && !$('#modal-root').children.length) render(); }), 800);
  else setTimeout(() => planOverLimit(), 1500);
  if (auth && !profileOf().tag) loadRep().then(() => { if (profileOf().tag) render(); });
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
  setTimeout(() => { if (state.onboarded) { maybeWhatsNew(); offerShields(); maybeWeeklyReview(); processJoin(); checkRetos(); } }, 1200);
  // Solo para pruebas en local
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') window.__kg = { mergeStates, stampChanges };
})();
