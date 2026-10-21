/* KeepGoing — divisas (lógica pura, sin DOM ni red).
   Los cambios automáticos son los oficiales del Banco Central Europeo (base EUR) que publica api.frankfurter.dev.
   Un movimiento en otra moneda guarda su importe original y el cambio usado: fx = { cur, cents, rate } (rate = moneda principal por 1 unidad);
   amountCents queda siempre en la moneda principal, así los totales, gráficas y presupuestos no cambian.
   Se usa en el navegador (window.KGFx) y en los tests de Node (require). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KGFx = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // Monedas con cambio automático (las del BCE). Otras se pueden usar escribiendo el cambio a mano.
  const AUTO = ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'CNY', 'HKD', 'SGD', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'TRY', 'MXN', 'BRL', 'INR', 'KRW', 'ZAR', 'ILS', 'IDR', 'MYR', 'PHP', 'THB', 'ISK'];
  const EXTRA = ['ARS', 'CLP', 'COP', 'PEN', 'UYU', 'AED', 'SAR', 'MAD', 'EGP', 'NGN', 'RUB', 'UAH', 'VND', 'TWD', 'BTC', 'ETH', 'USDT'];
  const ALL = [...AUTO, ...EXTRA];
  const isCode = c => /^[A-Z]{3,4}$/.test(String(c || ''));
  // Cambio de «from» a «to» con los cambios del BCE (rates: unidades por 1 EUR; EUR = 1). null si falta alguna.
  function cross(rates, from, to) {
    if (from === to) return 1;
    const r = Object.assign({ EUR: 1 }, rates || {}), a = Number(r[from]), b = Number(r[to]);
    return a > 0 && b > 0 ? b / a : null;
  }
  // Cambio para un movimiento: el fijado a mano (moneda principal por 1 unidad) o el automático
  function rateFor(cur, main, rates, manual) {
    if (cur === main) return 1;
    const m = Number((manual || {})[cur]);
    if (m > 0) return m;
    return cross(rates, cur, main);
  }
  const toMain = (cents, rate) => Math.round((Number(cents) || 0) * (Number(rate) || 0));
  // Redondeo legible del cambio: 4 cifras significativas (0,8912 · 1,153 · 177,4)
  const roundRate = r => { const n = Number(r); if (!(n > 0)) return 0; const d = Math.max(0, 3 - Math.floor(Math.log10(n))); return Math.round(n * 10 ** d) / 10 ** d; };
  /* Pasa la Libreta a otra moneda principal: cada movimiento sin fx queda en la moneda antigua (con su cambio a la nueva);
     los que ya estaban en la nueva vuelven a ser «normales»; el resto recalcula su importe con el cambio actual.
     rate(from) → moneda nueva por 1 unidad de «from» (o null). Devuelve { entries, missing } sin tocar los originales. */
  function rebase(entries, oldMain, newMain, rate) {
    let missing = 0;
    const out = (entries || []).map(e => {
      const fx = e.fx && isCode(e.fx.cur) ? e.fx : { cur: oldMain, cents: e.amountCents };
      if (fx.cur === newMain) { const { fx: _, ...rest } = e; return { ...rest, amountCents: Math.round(fx.cents) }; }
      const r = rate(fx.cur);
      if (!(r > 0)) { missing++; return e; }
      return { ...e, fx: { cur: fx.cur, cents: Math.round(fx.cents), rate: roundRate(r) }, amountCents: toMain(fx.cents, roundRate(r)) };
    });
    return { entries: out, missing };
  }
  /* Calculadora: convierte a la moneda principal los importes de las piezas que van en otra moneda (campo cur).
     moneyKeys(item) → claves de dinero de esa pieza; rate(cur) → principal por 1 unidad. Devuelve una copia. */
  function convertItems(items, main, rate, moneyKeys) {
    return (items || []).map(x => {
      if (!x || !x.cur || x.cur === main) return x;
      const r = rate(x.cur); if (!(r > 0)) return x;
      const mul = v => Math.round((Number(v) || 0) * r * 100) / 100, y = { ...x };
      if (x.kind === 'start') { for (const k of ['digital', 'cash', 'salary', 'expenses']) y[k] = mul(x[k]); return y; }
      if (x.kind === 'fund') { y.amount = mul(x.amount); return y; }
      if (x.values) {
        const v = { ...x.values };
        for (const k of moneyKeys(x)) if (k in v) v[k] = mul(v[k]);
        if (Array.isArray(v.futureChanges)) v.futureChanges = v.futureChanges.map(c => ({ ...c, amount: mul(c.amount) }));
        if (x.type === 'liquidityCap' && v.split === 'fixed' && Array.isArray(v.allocations)) v.allocations = v.allocations.map(a => ({ ...a, value: mul(a.value) }));
        y.values = v;
      }
      return y;
    });
  }
  return { AUTO, EXTRA, ALL, isCode, cross, rateFor, toMain, roundRate, rebase, convertItems };
});
