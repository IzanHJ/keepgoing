/* Tienda de KeepGoing: compra con Paddle (overlay). Desde la app llega ?uid=<cuenta> (y ?term=) y el pago se aplica a esa cuenta;
   desde la web, el pago único da una key que se pide a la Edge Function kg-paddle (puede tardar unos segundos en llegar el aviso de Paddle).
   Las suscripciones (mensual y anual) solo se contratan con cuenta, desde la app: así cada renovación sabe a quién aplicarse. */
(function () {
  const C = window.KG_SHOP || {}, P = C.prices || {}, $ = id => document.getElementById(id);
  const q = new URLSearchParams(location.search), uid = /^[0-9a-f-]{36}$/i.test(q.get('uid') || '') ? q.get('uid') : null;
  const FALLBACK = { month: '1,49 €', year: '14,99 €', forever: '29,99 €' }, shown = {};
  let term = ['month', 'year', 'forever'].includes(q.get('term')) ? q.get('term') : 'year';
  const ready = () => !!(C.token && P[term]) && (term === 'forever' || !!uid);
  const consent = $('consent'), buy = $('buy');

  function paint() {
    document.querySelectorAll('[data-term]').forEach(b => { const on = b.dataset.term === term; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    document.querySelectorAll('[data-per]').forEach(x => { x.hidden = x.dataset.per !== term; });
    $('price').textContent = shown[term] || FALLBACK[term];
    $('sub-note').hidden = term === 'forever';
    $('sub-app').hidden = term === 'forever' || !!uid;
    $('soon').hidden = !!C.token;
    buy.disabled = !ready() || !consent.checked;
  }
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
      .then(r => { r.data.details.lineItems.forEach(li => { const k = Object.keys(P).find(x => P[x] === li.price.id); if (k) shown[k] = li.formattedTotals.total; }); paint(); }).catch(() => {});
  };
  document.head.appendChild(s);

  buy.addEventListener('click', () => {
    if (!window.Paddle || !consent.checked || !ready()) return;
    window.Paddle.Checkout.open({ items: [{ priceId: P[term], quantity: 1 }], customData: uid ? { user_id: uid } : {}, settings: { displayMode: 'overlay', locale: document.documentElement.lang } });
  });

  async function done(txn) {
    $('done').hidden = false; $('done').scrollIntoView({ behavior: 'smooth' });
    if (uid) { $('done-app').hidden = false; return; }
    $('done-key').hidden = false;
    for (let i = 0; i < 20 && txn; i++) {
      try { const r = await fetch(C.keyUrl + '?txn=' + encodeURIComponent(txn)); if (r.ok) { $('key').textContent = (await r.json()).key; return; } } catch (e) { /* reintenta */ }
      await new Promise(res => setTimeout(res, 2000));
    }
  }
  $('copy').addEventListener('click', () => navigator.clipboard && navigator.clipboard.writeText($('key').textContent));
})();
