// Configuración de la tienda. Mientras token o priceId estén vacíos, la página enseña «Muy pronto» en lugar del botón de pago.
// env: 'sandbox' para pruebas (sin dinero real) o 'production'. token: «client-side token» de Paddle.
// prices: pri_… de cada tarifa (forever = pago único; month y year = suscripciones, solo desde la app con cuenta).
window.KG_SHOP = {
  env: 'sandbox',
  token: '',
  prices: { forever: '', month: '', year: '' },
  keyUrl: 'https://cciponhdxztcmprlxgbm.supabase.co/functions/v1/kg-paddle',
  appUrl: '../'
};
