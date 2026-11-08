/* KeepGoing — textos de la v1.52 de Organización: Listas con selección múltiple, notas sin límite por día, escenario en
   los lugares puntuales, más portadas y color propio en las notas, transporte en el turno puntual nuevo y hora de inicio
   propuesta para el turno siguiente (ES / EN). */
(function () {
  const es = {
    wn_1_52_0_1: 'Listas con selección múltiple|En una nota unida a una Lista (por ejemplo, Personas) puedes marcar varios elementos a la vez: cada toque marca o desmarca uno.',
    wn_1_52_0_2: 'Notas sin límite|Ya no hay un máximo de notas por día ni aparece el aviso de «día lleno».',
    wn_1_52_0_3: 'Escenario en lugares puntuales|Al poner un lugar puntual puedes elegir su escenario, y también desde Mundo en la Línea de tiempo. Vale para todas las veces que uses esa dirección.',
    wn_1_52_0_4: 'Más portadas y tu color|Las notas tienen muchos más iconos de portada y puedes elegir cualquier color con el selector.',
    wn_1_52_0_5: 'Turno puntual completo|Al crear un turno puntual ya salen el medio de transporte y «Después del turno».',
    wn_1_52_0_6: 'Hora del turno siguiente|Al añadir un turno puntual después de otro, la hora de inicio propuesta es la llegada del trayecto anterior o, si no hay trayecto, la hora en que acaba el turno anterior.',
    ntColorOwn: 'Color personalizado',
    nlMultiPh: 'Toca varios o escribe separando con comas',
    nlMultiN: '{n} elegidos',
    plxSceneHelp: 'Opcional. Es el dibujo de esta dirección en Mundo (Línea de tiempo) y vale para todas las veces que la uses.'
  };
  const en = {
    wn_1_52_0_1: 'Multi-select lists|In a note linked to a List (for example, People) you can tick several items at once: each tap selects or clears one.',
    wn_1_52_0_2: 'No note limit|There is no longer a maximum number of notes per day and the “day is full” warning is gone.',
    wn_1_52_0_3: 'Scene for one-off places|When you add a one-off place you can choose its scene, also from World in the Timeline. It applies every time you use that address.',
    wn_1_52_0_4: 'More covers and your colour|Notes have many more cover icons and you can pick any colour with the picker.',
    wn_1_52_0_5: 'Complete one-off shift|When you create a one-off shift, transport and “After the shift” now show up.',
    wn_1_52_0_6: 'Next shift time|When you add a one-off shift after another, the suggested start time is the arrival of the previous trip or, with no trip, the time the previous shift ends.',
    ntColorOwn: 'Custom colour',
    nlMultiPh: 'Tap several or type them separated by commas',
    nlMultiN: '{n} selected',
    plxSceneHelp: 'Optional. It is how this address looks in World (Timeline) and it applies every time you use it.'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
