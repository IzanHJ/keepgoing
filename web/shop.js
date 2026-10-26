/* Tienda de KeepGoing: compra con Paddle (overlay). Desde la app llega ?uid=<cuenta> y el pago se aplica a esa cuenta;
   desde la web, al pagar se pide la key a la Edge Function kg-paddle (puede tardar unos segundos en llegar el aviso de Paddle). */
(function () {
  const C = window.KG_SHOP || {}, $ = id => document.getElementById(id);
  const q = new URLSearchParams(location.search), uid = /^[0-9a-f-]{36}$/i.test(q.get('uid') || '') ? q.get('uid') : null;
  const ready = !!(C.token && C.priceId);
  const consent = $('consent'), buy = $('buy');
  consent.addEventListener('change', () => { buy.disabled = !ready || !consent.checked; });
  if (!ready) { $('soon').hidden = false; return; }

  const s = document.createElement('script'); s.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
  s.onload = () => {
    if (C.env === 'sandbox') window.Paddle.Environment.set('sandbox');
    window.Paddle.Initialize({ token: C.token, eventCallback: ev => { if (ev.name === 'checkout.completed') done(ev.data && ev.data.transaction_id); } });
    // Precio con la moneda y los impuestos del país de quien mira
    window.Paddle.PricePreview({ items: [{ priceId: C.priceId, quantity: 1 }] })
      .then(r => { const li = r.data.details.lineItems[0]; if (li) $('price').textContent = li.formattedTotals.total; }).catch(() => {});
  };
  document.head.appendChild(s);

  buy.addEventListener('click', () => {
    if (!window.Paddle || !consent.checked) return;
    window.Paddle.Checkout.open({ items: [{ priceId: C.priceId, quantity: 1 }], customData: uid ? { user_id: uid } : {}, settings: { displayMode: 'overlay', locale: document.documentElement.lang } });
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
