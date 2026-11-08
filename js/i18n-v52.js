/* KeepGoing — textos de la v1.52: Replay en orden cronológico (del primer registro hasta hoy) y zoom en los
   escenarios (ES / EN). */
(function () {
  const es = {
    wn_1_52_0_1: 'Replay en orden|El Replay ya va como una película: empieza en tu primer registro y avanza, día a día, semana a semana, mes a mes o año a año (según la escala que elijas), hasta hoy.',
    wn_1_52_0_2: 'Acércate a los escenarios|Pellizca el escenario con dos dedos (o Ctrl + rueda en el ordenador) para acercarte o alejarte. También tienes los botones + y − arriba a la izquierda, y el de volver a como estaba.',
    rpFwdBy: 'Del primer registro hasta hoy, {by}', rpCineK2: 'Reproduciendo',
    rpEndT2: 'Del {a} al {b}',
    lwZoom: 'Zoom del escenario', lwZoomIn: 'Acercar', lwZoomOut: 'Alejar', lwZoomReset: 'Volver al tamaño normal',
    lwSpinHint: 'Arrastra para girar · pellizca para acercar'
  };
  const en = {
    wn_1_52_0_1: 'Replay in order|Replay now plays like a film: it starts at your first entry and moves forward, day by day, week by week, month by month or year by year (depending on the scale you pick), up to today.',
    wn_1_52_0_2: 'Get closer to the scenes|Pinch the scene with two fingers (or Ctrl + scroll on a computer) to zoom in or out. There are also + and − buttons at the top left, and one to go back to normal.',
    rpFwdBy: 'From your first entry to today, {by}', rpCineK2: 'Playing',
    rpEndT2: '{a} to {b}',
    lwZoom: 'Scene zoom', lwZoomIn: 'Zoom in', lwZoomOut: 'Zoom out', lwZoomReset: 'Back to normal size',
    lwSpinHint: 'Drag to rotate · pinch to zoom'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
