// Configuración de la tienda. Mientras token o priceId estén vacíos, la página enseña «Muy pronto» en lugar del botón de pago.
// env: 'sandbox' para pruebas (sin dinero real) o 'production'. token: «client-side token» de Paddle. priceId: pri_… del pago único.
window.KG_SHOP = {
  env: 'sandbox',
  token: '',
  priceId: '',
  keyUrl: 'https://cciponhdxztcmprlxgbm.supabase.co/functions/v1/kg-paddle',
  appUrl: '../'
};
