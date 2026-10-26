/* KeepGoing — Planes: Free, prueba de 14 días y Usuario KeepGoing (lógica pura, sin DOM).
   Se usa en el navegador (window.KGPlan) y en los tests de Node (require).
   El servidor (Supabase: kg_entitlement, kg_redeem_key y los triggers de la migración v1.24) es quien decide;
   esto solo lee lo que dijo el servidor (guardado en el dispositivo) para enseñarlo y para bloquear en la interfaz. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KGPlan = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const TRIAL_DAYS = 14;
  const DAY = 86400000;
  // Sin conexión, lo último que dijo el servidor vale como mucho este tiempo (luego hay que volver a preguntar)
  const CACHE_MAX = 30 * DAY;

  // Límites del plan Free (null = sin límite)
  const LIMITS = { habits: 5, projects: 1, projSaved: 1, groups: 1, chartDays: 90 };

  // Funciones que solo tienen la prueba y Usuario KeepGoing
  const PAID = [
    'calc',        // Calculadora de Patrimonio
    'csv',         // Registrar CSV y Registros
    'compare',     // Comparar con proyecciones
    'projShare',   // compartir proyecciones
    'fx',          // multidivisa y «Otras monedas»
    'budgetCats',  // presupuesto por categorías (el global es gratis)
    'worth',       // Inversiones con TIR y «Patrimonio actual» con gráfico
    'routines',    // rutinas del Calendario (los turnos no tienen máximo)
    'ledgerShare', // libretas compartidas
    'calShare',    // compartir el calendario
    'themes',      // temas, colores y mascotas extra
    'history'      // gráficos con más de 90 días
  ];

  // Funciones que se pueden encender o apagar desde el panel del equipo, con su valor si el servidor no dice nada
  const FLAGS = { calLayers: false };

  /* Lo que dijo el servidor (kg_entitlement) + cuándo, y si hay sesión → plan efectivo.
     ent: { plan, until, trial_ends, role, flags, at } · o.now (ms) · o.signedIn · o.view (solo equipo: ver como otro plan) */
  function resolve(ent, o = {}) {
    const now = o.now == null ? Date.now() : o.now;
    const base = { plan: 'free', full: false, role: null, trialEnds: null, until: null, daysLeft: null, stale: false, source: null, term: null };
    if (!o.signedIn || !ent || typeof ent !== 'object') return base;
    const role = ent.role === 'owner' || ent.role === 'dev' ? ent.role : null;
    const stale = !(ent.at > 0) || now - ent.at > CACHE_MAX;
    const ms = v => { const x = v ? Date.parse(v) : NaN; return Number.isFinite(x) ? x : null; };
    const until = ms(ent.until), trialEnds = ms(ent.trial_ends);
    let plan = 'free';
    if (ent.plan === 'keepgoing' && (until == null || until > now)) plan = 'keepgoing';
    else if ((ent.plan === 'trial' || ent.plan === 'keepgoing') && trialEnds != null && trialEnds > now) plan = 'trial';
    // Una caché muy vieja no da más que Free, salvo el pago indefinido (no caduca)
    if (stale && !(plan === 'keepgoing' && until == null)) plan = 'free';
    const out = { ...base, plan, role, stale, source: ent.source || null, term: ent.term || null, until: until == null ? null : new Date(until).toISOString(), trialEnds: trialEnds == null ? null : new Date(trialEnds).toISOString() };
    if (plan === 'trial') out.daysLeft = Math.max(0, Math.ceil((trialEnds - now) / DAY));
    // Ver la app como otro plan: solo el equipo (para probar)
    if (role && ['free', 'trial', 'keepgoing'].includes(o.view)) { out.plan = o.view; out.viewing = true; if (o.view === 'trial' && out.daysLeft == null) out.daysLeft = TRIAL_DAYS; }
    out.full = out.plan !== 'free';
    return out;
  }

  const allows = (p, feature) => !!(p && p.full) || !PAID.includes(feature);
  // ¿Cabe uno más? count = cuántos hay ya
  function canAdd(p, kind, count) {
    if (p && p.full) return true;
    const lim = LIMITS[kind];
    return lim == null || (+count || 0) < lim;
  }
  // Funciones activables: 'all' y 'staff' (al equipo solo le llega si es del equipo) = encendida; 'off' = apagada
  function flagOn(ent, key, role) {
    const m = ent && ent.flags && ent.flags[key];
    if (m === 'all') return true;
    if (m === 'off') return false;
    if (m === 'staff') return !!role;
    return !!FLAGS[key];
  }

  // Keys XXXX-XXXX-XXXX-XXXX: letras mayúsculas y números sin 0, O, 1 ni I (no se confunden al copiarlas a mano)
  const KEY_ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const keyNorm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  function keyFormat(s) {
    const n = keyNorm(s).slice(0, 16);
    return n.match(/.{1,4}/g)?.join('-') || '';
  }
  const keyValid = s => { const n = keyNorm(s); return n.length === 16 && [...n].every(c => KEY_ALPHA.includes(c)); };

  /* Precios: pago único 29,99 €, mensual 1,49 € y anual 14,99 € en España (29,99 € = 2,105 % del salario mínimo mensual,
     17.094 € al año en 2026). En el resto de países, el mismo porcentaje de su salario mínimo, con un tope: si sale por encima
     de 29,99 €, se cobra 29,99 / 1,49 / 14,99 en su propia moneda (GB, AU, NZ y CA). Se aplica en Paddle; aquí solo se enseña.
     Cada fila: [pago único, mes, año, moneda]. */
  const PRICE_EUR = 29.99;
  const TERMS = ['forever', 'month', 'year'];
  const PRICES = {
    ES: [29.99, 1.49, 14.99, 'EUR'], GB: [29.99, 1.49, 14.99, 'GBP'], AU: [29.99, 1.49, 14.99, 'AUD'], NZ: [29.99, 1.49, 14.99, 'NZD'],
    CA: [29.99, 1.49, 14.99, 'CAD'], US: [26.46, 1.31, 13.23, 'USD'], MX: [201.74, 10.02, 100.84, 'MXN'], CL: [11654, 579, 5825, 'CLP'],
    CO: [36862, 1831, 18425, 'COP'], UY: [534, 27, 267, 'UYU'], CR: [7855, 390, 3926, 'CRC'], PY: [64085, 3184, 32032, 'PYG'],
    GT: [73.08, 3.63, 36.53, 'GTQ'], BO: [69.47, 3.45, 34.72, 'BOB'], PE: [23.79, 1.18, 11.89, 'PEN'], EC: [10.15, 0.50, 5.07, 'USD'],
    AR: [8080, 401, 4039, 'ARS']
  };
  const priceFor = (country, term = 'forever') => {
    const p = PRICES[String(country || '').toUpperCase()] || PRICES.ES, i = Math.max(0, TERMS.indexOf(term));
    return { amount: p[i], cur: p[3] };
  };

  return { TRIAL_DAYS, LIMITS, PAID, FLAGS, CACHE_MAX, resolve, allows, canAdd, flagOn, KEY_ALPHA, keyNorm, keyFormat, keyValid, PRICE_EUR, TERMS, PRICES, priceFor };
});
