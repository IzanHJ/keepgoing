/* KeepGoing — textos de la v1.69: gimnasio y deporte en el mismo entrenamiento (ES / EN). */
(function () {
  const es = {
    wn_1_69_0_1: 'Gimnasio y deporte juntos|En una sesión de gimnasio, toca «Añadir deporte» (p. ej. Baloncesto después de las pesas). Todo queda en un solo entrenamiento.',
    wn_1_69_0_2: 'También al revés|Si empiezas un deporte, toca «Añadir ejercicios de gimnasio». Al terminar pones los minutos del deporte, el tipo, los eventos y el resultado.',
    mxAddSport: 'Añadir deporte', mxAddGym: 'Añadir ejercicios de gimnasio', mxRemoveSp: 'Quitar deporte', mxChange: 'Cambiar',
    mxPickSp: '¿Qué deporte añades?', mxSport: 'Deporte', mxSportMin: 'Minutos de {s}',
    mxSportHint: 'Va en esta misma sesión. Al terminar pones sus minutos, el tipo, los eventos y el resultado.',
    mxAddSportHint: '¿Hiciste también un deporte en esta sesión? Añádelo aquí.',
    mxSportTooLong: 'Los minutos del deporte no pueden pasar de la duración de la sesión', mxDoneT: '¡Entrenamiento completado!'
  };
  const en = {
    wn_1_69_0_1: 'Gym and sport together|In a gym session, tap “Add sport” (e.g. Basketball after weights). Everything stays in one training.',
    wn_1_69_0_2: 'The other way round too|If you start a sport, tap “Add gym exercises”. When you finish you set the sport minutes, type, events and result.',
    mxAddSport: 'Add sport', mxAddGym: 'Add gym exercises', mxRemoveSp: 'Remove sport', mxChange: 'Change',
    mxPickSp: 'Which sport are you adding?', mxSport: 'Sport', mxSportMin: '{s} minutes',
    mxSportHint: 'Part of this same session. When you finish you set its minutes, type, events and result.',
    mxAddSportHint: 'Did you also play a sport in this session? Add it here.',
    mxSportTooLong: 'Sport minutes cannot be longer than the session', mxDoneT: 'Training done!'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
