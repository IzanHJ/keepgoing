/* KeepGoing — textos de la v1.52: Replay en orden cronológico (del primer registro hasta hoy) y zoom en los
   escenarios (ES / EN). v1.63.2: cada escala reproduce su ventana hasta hoy (Semana, los últimos 7 días…). */
(function () {
  const es = {
    wn_1_52_0_1: 'Replay en orden|El Replay ya va como una película: empieza en tu primer registro y avanza, día a día, semana a semana, mes a mes o año a año (según la escala que elijas), hasta hoy.',
    wn_1_52_0_2: 'Acércate a los escenarios|Pellizca el escenario con dos dedos (o Ctrl + rueda en el ordenador) para acercarte o alejarte. También tienes los botones + y − arriba a la izquierda, y el de volver a como estaba.',
    wn_1_63_2_1: 'Replay de tu semana|El Replay ya no empieza en tu primer registro: Día reproduce hoy; Semana, los últimos 7 días hasta hoy; Mes, los últimos 30 días; Año, los últimos 12 meses, mes a mes. Para verlo todo desde el principio, elige Todo.',
    rpWin_day: 'Hoy, {by}', rpWin_week: 'Últimos 7 días, {by}', rpWin_month: 'Últimos 30 días, {by}', rpWin_year: 'Últimos 12 meses, {by}', rpWin_all: 'Desde el primer registro, {by}',
    rpFwdBy: 'Del primer registro hasta hoy, {by}', rpCineK2: 'Reproduciendo',
    rpEndT2: 'Del {a} al {b}',
    lwZoom: 'Zoom del escenario', lwZoomIn: 'Acercar', lwZoomOut: 'Alejar', lwZoomReset: 'Volver al tamaño normal',
    lwSpinHint: 'Arrastra para girar · pellizca para acercar'
  };
  const en = {
    wn_1_52_0_1: 'Replay in order|Replay now plays like a film: it starts at your first entry and moves forward, day by day, week by week, month by month or year by year (depending on the scale you pick), up to today.',
    wn_1_52_0_2: 'Get closer to the scenes|Pinch the scene with two fingers (or Ctrl + scroll on a computer) to zoom in or out. There are also + and − buttons at the top left, and one to go back to normal.',
    wn_1_63_2_1: 'Replay of your week|Replay no longer starts at your first entry: Day plays today; Week, the last 7 days up to today; Month, the last 30 days; Year, the last 12 months, month by month. To see everything from the start, pick All.',
    rpWin_day: 'Today, {by}', rpWin_week: 'Last 7 days, {by}', rpWin_month: 'Last 30 days, {by}', rpWin_year: 'Last 12 months, {by}', rpWin_all: 'Since your first entry, {by}',
    rpFwdBy: 'From your first entry to today, {by}', rpCineK2: 'Playing',
    rpEndT2: '{a} to {b}',
    lwZoom: 'Scene zoom', lwZoomIn: 'Zoom in', lwZoomOut: 'Zoom out', lwZoomReset: 'Back to normal size',
    lwSpinHint: 'Drag to rotate · pinch to zoom'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
