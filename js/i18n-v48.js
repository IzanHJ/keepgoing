/* KeepGoing — textos de la v1.48: Línea de tiempo con ambiente vivo, escenario que se gira y Replay de cine hacia atrás (ES / EN). */
(function () {
  const es = {
    rpPlay: 'Replay', rpToday: 'Volver a hoy', rpBackBy: 'Desde hoy hacia atrás, {by}', rpCineK: 'Rebobinando',
    rpEndK: 'Fin del Replay', rpEndT: 'Del {b} al {a}', rpEndDays: 'días recorridos', rpEndPerfect: 'días perfectos', rpEndPlaces: 'lugares', rpEndGym: 'entrenos', rpEndShifts: 'días con turnos', rpAgain: 'Otra vez',
    lwSpinHint: 'Arrastra para girar', lwAmb: 'Cielo y estaciones', lwAmbHint: 'El escenario cambia con la hora (amanecer, día, atardecer, noche con luces y estrellas) y con el mes (nieve, hojas, pétalos, luciérnagas).',
    wn_1_48_0_1: 'Replay desde hoy hacia atrás|Replay ahora empieza siempre en hoy y va hacia atrás, día a día, semana a semana, mes a mes o momento a momento, hasta tu primer registro. Si lo pausas y le das otra vez, sigue donde estaba. El botón de al lado te devuelve a hoy.',
    wn_1_48_0_2: 'Replay de cine|Mientras rebobina, la fecha gira como un cuentakilómetros, una barra enseña cuánto llevas recorrido, la cámara rodea el escenario y cada paso tiene su destello. Al llegar al principio, una tarjeta resume lo recorrido: días, días perfectos, lugares y entrenos.',
    wn_1_48_0_3: 'Gira el escenario|Arrastra el escenario 3D con el dedo o con el ratón para girarlo (con el ratón también puedes subir o bajar la vista). Al soltar sigue un poco por inercia. En el carrusel de Escenarios, cambia de uno a otro con las flechas.',
    wn_1_48_0_4: 'Ambiente vivo|El escenario tiene cielo según la hora del momento que ves: amanecer, día, atardecer y noche con las ventanas encendidas y estrellas. Y según el mes: nieve en invierno, hojas en otoño, pétalos en primavera y luciérnagas en las noches de verano. Se apaga en Ajustes de la Línea de tiempo.'
  };
  const en = {
    rpPlay: 'Replay', rpToday: 'Back to today', rpBackBy: 'From today backwards, {by}', rpCineK: 'Rewinding',
    rpEndK: 'Replay finished', rpEndT: '{b} back to {a}', rpEndDays: 'days covered', rpEndPerfect: 'perfect days', rpEndPlaces: 'places', rpEndGym: 'workouts', rpEndShifts: 'days with shifts', rpAgain: 'Again',
    lwSpinHint: 'Drag to rotate', lwAmb: 'Sky and seasons', lwAmbHint: 'The scene changes with the time of day (sunrise, day, sunset, night with lights and stars) and with the month (snow, leaves, petals, fireflies).',
    wn_1_48_0_1: 'Replay from today backwards|Replay now always starts at today and goes backwards, day by day, week by week, month by month or moment by moment, down to your first record. Pause and play again to carry on where it was. The button next to it takes you back to today.',
    wn_1_48_0_2: 'Cinematic Replay|While it rewinds, the date rolls like an odometer, a bar shows how far back you are, the camera circles the scene and every step has its flash. At the start, a card sums up the journey: days, perfect days, places and workouts.',
    wn_1_48_0_3: 'Rotate the scene|Drag the 3D scene with your finger or mouse to rotate it (with a mouse you can also tilt the view). It keeps spinning a little when you let go. In the Scenes carousel, switch with the arrows.',
    wn_1_48_0_4: 'Living ambience|The scene has a sky for the time of the moment you are viewing: sunrise, day, sunset and night with lit windows and stars. And for the month: snow in winter, leaves in autumn, petals in spring and fireflies on summer nights. Turn it off in Timeline settings.'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
