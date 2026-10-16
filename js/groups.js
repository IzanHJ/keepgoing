/* KeepGoing — Grupos: roles y permisos, votación de retos en vivo, periodos del ranking y premios de reputación
   (lógica pura, sin DOM). Se usa en el navegador (window.KGGroups) y en los tests de Node (require).
   El servidor (Supabase) aplica las mismas reglas en SQL; estas funciones son su espejo para la interfaz y los tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KGGroups = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // BETA: máximo de miembros por grupo. null = sin límite. El servidor lo lee de su configuración (max_members);
  // nada en la app asume que exista un límite.
  const MAX_MIEMBROS = 50;
  const ROLES = ['lider', 'colider', 'experto', 'veterano', 'novato'];
  // Permisos que el líder puede delegar (el líder los tiene todos siempre; expulsar es solo del líder)
  const PERMS = ['invite', 'launch', 'share', 'moderate'];
  // Permisos con los que empieza cada rol (los roles antiguos se convierten en estos permisos)
  const ROLE_PERMS = {
    lider: PERMS.slice(),
    colider: ['invite', 'launch', 'share', 'moderate'],
    experto: ['launch', 'share'],
    veterano: ['invite', 'share'],
    novato: []
  };
  const FREQS = ['1W', '1M', '1Y', 'MAX'];
  // Premios de reputación por puesto (1.º, 2.º, 3.º) y multiplicador por frecuencia. MAX no da premio periódico.
  const REP_PRIZES = [10, 6, 3];
  const REP_MULT = { '1W': 1, '1M': 3, '1Y': 12, MAX: 0 };
  const NAMETAG_RE = /^[a-z0-9_]{3,20}$/;

  const roleDefaults = role => (ROLE_PERMS[role] || []).slice();
  // ¿Puede este miembro hacer esto? El líder siempre; el resto según sus permisos delegados
  function can(member, perm) {
    if (!member) return false;
    if (member.role === 'lider') return true;
    return Array.isArray(member.perms) && member.perms.includes(perm);
  }
  const cleanPerms = list => PERMS.filter(p => (list || []).includes(p));

  /* Votación con mayoría absoluta.
     Los que no votan cuentan como voto en blanco repartido entre NO y SÍ, alternando y empezando por NO:
     blancos = miembros − SÍ − NO;  NO_total = NO + ⌈blancos/2⌉;  SÍ_total = SÍ + ⌊blancos/2⌋.
     Se aprueba solo si SÍ_total > NO_total (un empate no se aprueba). */
  function voteResult(members, yes, no) {
    const n = Math.max(0, Math.floor(+members || 0));
    let y = Math.max(0, Math.floor(+yes || 0)), x = Math.max(0, Math.floor(+no || 0));
    if (y + x > n) throw new RangeError('more votes than members');
    const blank = n - y - x;
    const noTotal = x + Math.ceil(blank / 2), yesTotal = y + Math.floor(blank / 2);
    return { members: n, yes: y, no: x, blank, yesTotal, noTotal, approved: yesTotal > noTotal };
  }

  // Resultado de un reto en vivo: se gana si el % de cumplimiento llega al objetivo
  const challengeWon = (rate, target) => +rate >= +target;
  // % de cumplimiento en un reto de hábito: días cumplidos / (participantes × días)
  function completionRate(doneDays, participants, days) {
    const total = participants * days;
    return total > 0 ? Math.round(Math.min(1, doneDays / total) * 1000) / 10 : 0;
  }
  const wl = list => (list || []).reduce((a, c) => { if (c.status === 'won') a.w++; else if (c.status === 'lost') a.l++; return a; }, { w: 0, l: 0 });

  /* Periodos del ranking (fechas «AAAA-MM-DD»; semanas de lunes a domingo) */
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const parse = k => { const [y, m, d] = k.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  function period(freq, dayKey) {
    const d = parse(dayKey);
    if (freq === '1W') { const s = new Date(d); s.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); const e = new Date(s); e.setUTCDate(s.getUTCDate() + 6); return { key: 'W' + keyOf(s), start: keyOf(s), end: keyOf(e) }; }
    if (freq === '1M') { const s = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)), e = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)); return { key: 'M' + keyOf(s).slice(0, 7), start: keyOf(s), end: keyOf(e) }; }
    if (freq === '1Y') { const y = d.getUTCFullYear(); return { key: 'Y' + y, start: `${y}-01-01`, end: `${y}-12-31` }; }
    return { key: 'MAX', start: '0000-01-01', end: '9999-12-31' };
  }
  // Puntos de reputación por puesto (empates comparten puesto). Solo puntúan quienes tienen algo en el periodo.
  function prizes(scores, freq) {
    const mult = REP_MULT[freq] || 0, sorted = scores.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
    const out = []; let place = 0, prev = null;
    sorted.forEach((s, i) => { if (s.score !== prev) { place = i + 1; prev = s.score; } if (place <= REP_PRIZES.length && mult) out.push({ user: s.user, place, points: REP_PRIZES[place - 1] * mult }); });
    return out;
  }
  // ¿Participa en el ranking? Por rol marcado o por @nametag añadido a mano
  const inRanking = (member, roles, users) => (roles || []).includes(member.role) || (users || []).includes(member.user_id);

  const isNametag = s => NAMETAG_RE.test(String(s || ''));
  const toNametag = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/^@/, '').replace(/[^a-z0-9_]/g, '').slice(0, 20);

  return { MAX_MIEMBROS, ROLES, PERMS, ROLE_PERMS, FREQS, REP_PRIZES, REP_MULT, roleDefaults, can, cleanPerms, voteResult, challengeWon, completionRate, wl, period, prizes, inRanking, isNametag, toNametag };
});
