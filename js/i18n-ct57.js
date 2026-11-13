/* KeepGoing — textos de la v1.57: «Contrato cumplido» a pantalla completa con el botón «Renovar» (ES / EN). */
(function () {
  const es = {
    wn_1_57_0_1: 'Contrato cumplido, a lo grande|Al terminar tu contrato, la carta ocupa toda la pantalla con el color de tu nivel. Pulsa «Renovar»: la carta gira, la corona baja como un sello y estampa tu nuevo periodo.',
    ctRenewBtn: 'Renovar',
    ctDoneNoRenew: 'Has completado tu periodo de compromiso.',
    ctRenewedCard: 'Nuevo compromiso',
    ctRenewedDays: 'Días por delante',
    ctRenewedPeriod: 'Periodo', ctPeriodN: '{n}º',
    ctRenewedTitle: 'Contrato renovado',
    ctRenewedUntil: 'Tu nuevo compromiso dura hasta el {date}.',
    ctGo: 'A por ello'
  };
  const en = {
    wn_1_57_0_1: 'Contract fulfilled, in style|When your contract ends, the card fills the whole screen in your tier colour. Tap «Renew»: the card turns over and the crown comes down like a seal to stamp your new period.',
    ctRenewBtn: 'Renew',
    ctDoneNoRenew: 'You completed your commitment period.',
    ctRenewedCard: 'New commitment',
    ctRenewedDays: 'Days ahead',
    ctRenewedPeriod: 'Period', ctPeriodN: '#{n}',
    ctRenewedTitle: 'Contract renewed',
    ctRenewedUntil: 'Your new commitment runs until {date}.',
    ctGo: "Let's go"
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
