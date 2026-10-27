/* KeepGoing — textos de la v1.25: arreglos del chat, de «Ver la app como» y de la tienda, ahorro de los planes (ES / EN). */
(function () {
  const es = {
    back: 'Volver',
    stViewBanner: 'Viendo la app como {plan}', stViewBack: 'Volver a mi plan real',
    plSaveYear: 'Ahorras {a} ({n} %) frente a 12 meses', plSaveForever: 'Ahorras {a} ({n} %) frente a {y} años del anual',
    shopTitle: 'Usuario KeepGoing', shopBack: 'Volver a KeepGoing'
  };
  const en = {
    back: 'Back',
    stViewBanner: 'Viewing the app as {plan}', stViewBack: 'Back to my real plan',
    plSaveYear: 'You save {a} ({n}%) compared with 12 months', plSaveForever: 'You save {a} ({n}%) compared with {y} years of yearly',
    shopTitle: 'KeepGoing User', shopBack: 'Back to KeepGoing'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
