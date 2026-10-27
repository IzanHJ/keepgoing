/* Tienda de KeepGoing: compra con Paddle (overlay). Desde la app llega ?uid=<cuenta> (y ?term=) y el pago se aplica a esa cuenta;
   desde la web, el pago único da una key que se pide a la Edge Function kg-paddle (puede tardar unos segundos en llegar el aviso de Paddle).
   Las suscripciones (mensual y anual) solo se contratan con cuenta, desde la app: así cada renovación sabe a quién aplicarse. */
(function () {
  const C = window.KG_SHOP || {}, P = C.prices || {}, $ = id => document.getElementById(id);
  const q = new URLSearchParams(location.search), uid = /^[0-9a-f-]{36}$/i.test(q.get('uid') || '') ? q.get('uid') : null;
  const FALLBACK = { month: '1,49 €', year: '14,99 €', forever: '29,99 €' }, shown = {};
  // Importes para calcular el ahorro (los de España hasta que Paddle diga los del país de quien mira)
  let amt = { month: 1.49, year: 14.99, forever: 29.99 }, cur = 'EUR';
  // El pago único se compara con este número de años del plan anual
  const FOREVER_VS_YEARS = 3;
  // Dentro de la app (?embed=1) los enlaces a la app cierran la tienda en vez de navegar; desde la app sin embed, se ve «Volver»
  const embed = q.get('embed') === '1' && window.parent !== window;
  const toApp = e => { if (!embed) return; e.preventDefault(); window.parent.postMessage({ kg: 'shop-close' }, location.origin); };
  document.querySelectorAll('[data-app]').forEach(a => a.addEventListener('click', toApp));
  document.querySelectorAll('.back-app').forEach(a => { a.hidden = !(uid || embed); });
  if (embed) document.documentElement.classList.add('embed');
  let term = ['month', 'year', 'forever'].includes(q.get('term')) ? q.get('term') : 'year';
  const ready = () => !!(C.token && P[term]) && (term === 'forever' || !!uid);
  const consent = $('consent'), buy = $('buy');

  function paint() {
    document.querySelectorAll('[data-term]').forEach(b => { const on = b.dataset.term === term; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    document.querySelectorAll('[data-per]').forEach(x => { x.hidden = x.dataset.per !== term; });
    $('price').textContent = shown[term] || FALLBACK[term];
    paintSave();
    $('sub-note').hidden = term === 'forever';
    $('sub-app').hidden = term === 'forever' || !!uid;
    $('soon').hidden = !!C.token;
    buy.disabled = !ready() || !consent.checked;
  }
  // Ahorro del anual (frente a 12 meses) y del pago único (frente a FOREVER_VS_YEARS años del anual), en dinero y en %
  function paintSave() {
    const el = $('save'), es = document.documentElement.lang !== 'en';
    const base = term === 'year' ? amt.month * 12 : term === 'forever' ? amt.year * FOREVER_VS_YEARS : 0, pay = amt[term];
    if (!(base > pay) || !pay) { el.hidden = true; return; }
    let a; try { a = new Intl.NumberFormat(es ? 'es' : 'en', { style: 'currency', currency: cur }).format(base - pay); } catch (e) { a = (base - pay).toFixed(2) + ' ' + cur; }
    const n = Math.round((1 - pay / base) * 100);
    el.textContent = term === 'year' ? (es ? `Ahorras ${a} (${n} %) frente a 12 meses` : `You save ${a} (${n}%) compared with 12 months`)
      : (es ? `Ahorras ${a} (${n} %) frente a ${FOREVER_VS_YEARS} años del anual` : `You save ${a} (${n}%) compared with ${FOREVER_VS_YEARS} years of yearly`);
    el.hidden = false;
  }
  document.addEventListener('click', e => { if (e.target.closest('.lang-switch button')) paintSave(); });
  document.querySelectorAll('[data-term]').forEach(b => b.addEventListener('click', () => { term = b.dataset.term; paint(); }));
  consent.addEventListener('change', paint);
  paint();
  if (!C.token) return;

  const s = document.createElement('script'); s.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
  s.onload = () => {
    if (C.env === 'sandbox') window.Paddle.Environment.set('sandbox');
    window.Paddle.Initialize({ token: C.token, eventCallback: ev => { if (ev.name === 'checkout.completed') done(ev.data && ev.data.transaction_id); } });
    // Precio con la moneda y los impuestos del país de quien mira
    const items = Object.keys(P).filter(k => P[k]).map(k => ({ priceId: P[k], quantity: 1 }));
    if (items.length) window.Paddle.PricePreview({ items })
      .then(r => {
        const c = r.data.currencyCode; let dig = 2; try { dig = new Intl.NumberFormat('en', { style: 'currency', currency: c }).resolvedOptions().maximumFractionDigits; } catch (e) { /* 2 */ }
        const got = {};
        r.data.details.lineItems.forEach(li => { const k = Object.keys(P).find(x => P[x] === li.price.id); if (k) { shown[k] = li.formattedTotals.total; got[k] = +li.totals.total / Math.pow(10, dig); } });
        // Solo se usan los importes del país si llegan los tres (si no, el ahorro mezclaría monedas)
        if (got.month > 0 && got.year > 0 && got.forever > 0) { amt = got; cur = c; }
        paint();
      }).catch(() => {});
  };
  document.head.appendChild(s);

  buy.addEventListener('click', () => {
    if (!window.Paddle || !consent.checked || !ready()) return;
    window.Paddle.Checkout.open({ items: [{ priceId: P[term], quantity: 1 }], customData: uid ? { user_id: uid } : {}, settings: { displayMode: 'overlay', locale: document.documentElement.lang } });
  });

  async function done(txn) {
    $('done').hidden = false; $('done').scrollIntoView({ behavior: 'smooth' });
    if (uid) { $('done-app').hidden = false; if (embed) window.parent.postMessage({ kg: 'shop-paid' }, location.origin); return; }
    $('done-key').hidden = false;
    for (let i = 0; i < 20 && txn; i++) {
      try { const r = await fetch(C.keyUrl + '?txn=' + encodeURIComponent(txn)); if (r.ok) { $('key').textContent = (await r.json()).key; return; } } catch (e) { /* reintenta */ }
      await new Promise(res => setTimeout(res, 2000));
    }
  }
  $('copy').addEventListener('click', () => navigator.clipboard && navigator.clipboard.writeText($('key').textContent));
})();
