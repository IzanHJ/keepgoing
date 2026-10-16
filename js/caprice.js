/* KeepGoing — niveles de compromiso y conversor de puntos a «Dinero Caprichable» (lógica pura, sin DOM)
   Se usa en el navegador (window.KGCaprice) y en los tests de Node (require). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KGCaprice = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const LEVELS = ['chill', 'serio', 'locked'];
  // Hábitos exigidos por nivel: un día perfecto vale 10 puntos y cada hábito vale 10 / nº de hábitos
  const HABITS_PER_LEVEL = { chill: 2, serio: 4, locked: 7 };
  const PERFECT_DAY_POINTS = 10;
  // % del ingreso neto que valen 10 puntos (modificables por el usuario)
  const DEFAULT_PCT = { chill: 1, serio: 0.5, locked: 0.1 };
  const DEFAULT_INCOME = 1400;

  const level = lv => (LEVELS.includes(lv) ? lv : 'serio');
  const pointsPerHabit = lv => PERFECT_DAY_POINTS / HABITS_PER_LEVEL[level(lv)];
  // Puntos de un día: hábitos cumplidos (puede ser fraccional) topados al nº exigido. Sin redondear.
  function dayPoints(units, lv) {
    const n = HABITS_PER_LEVEL[level(lv)];
    const u = Math.min(Math.max(Number(units) || 0, 0), n);
    return u * PERFECT_DAY_POINTS / n;
  }
  // 10 puntos = ingreso neto total × (porcentaje / 100)
  const tenPointsValue = (income, pct) => (Number(income) || 0) * (Number(pct) || 0) / 100;
  const moneyFor = (points, income, pct) => (Number(points) || 0) / PERFECT_DAY_POINTS * tenPointsValue(income, pct);

  /* ---------- barra de ajuste con 3 puntos (posiciones en % del ancho) ----------
     Punto 1 = Chill (1 %), punto 2 = Serio (0,5 %), punto 3 = Locked-In (0,1 %).
     Por encima de 1 % el marcador queda justo ANTES del punto 1; por debajo de 0,1 %, justo DESPUÉS del punto 3. */
  const DOTS = [{ lv: 'chill', pct: 1, pos: 10 }, { lv: 'serio', pct: 0.5, pos: 50 }, { lv: 'locked', pct: 0.1, pos: 90 }];
  const BEFORE_FIRST = 4, AFTER_LAST = 96;
  function sliderPos(pct) {
    pct = Number(pct);
    if (!(pct > 0)) return AFTER_LAST;
    if (pct > 1) return BEFORE_FIRST;
    if (pct < 0.1) return AFTER_LAST;
    if (pct >= 0.5) return 10 + (1 - pct) / 0.5 * 40;
    return 50 + (0.5 - pct) / 0.4 * 40;
  }
  // Inversa (arrastrar o pulsar en la barra): limitada a [0,1 %, 1 %] y redondeada a 0,01 %
  function pctFromPos(pos) {
    const p = Math.min(Math.max(Number(pos) || 0, 10), 90);
    const v = p <= 50 ? 1 - (p - 10) / 40 * 0.5 : 0.5 - (p - 50) / 40 * 0.4;
    return Math.round(v * 100) / 100;
  }
  // Acepta «0,5», «0.5», «0,5 %». Devuelve null si no es un número positivo.
  function parseNumber(str) {
    if (typeof str === 'number') return Number.isFinite(str) ? str : null;
    const s = String(str ?? '').replace(/[%€\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
    if (!/^\d*\.?\d+$/.test(s)) return null;
    const v = parseFloat(s);
    return Number.isFinite(v) ? v : null;
  }
  // Ajuste vigente un día dado dentro de un historial [{ from: 'YYYY-MM-DD', ... }] ordenado
  function onDay(history, k) {
    let cur = null;
    for (const h of history || []) if (h.from <= k) cur = h;
    return cur;
  }
  return { LEVELS, HABITS_PER_LEVEL, PERFECT_DAY_POINTS, DEFAULT_PCT, DEFAULT_INCOME, DOTS, BEFORE_FIRST, AFTER_LAST,
    pointsPerHabit, dayPoints, tenPointsValue, moneyFor, sliderPos, pctFromPos, parseNumber, onDay };
});
