/* KeepGoing — textos de la v1.53 de Organización: Listas con selección múltiple, notas sin límite por día, escenario en
   los lugares puntuales, más portadas y color propio en las notas, transporte en el turno puntual nuevo y hora de inicio
   propuesta para el turno siguiente (ES / EN). */
(function () {
  const es = {
    wn_1_53_0_1: 'Listas con selección múltiple|En una nota unida a una Lista (por ejemplo, Personas) puedes marcar varios elementos a la vez: cada toque marca o desmarca uno.',
    wn_1_53_0_2: 'Notas sin límite|Ya no hay un máximo de notas por día ni aparece el aviso de «día lleno».',
    wn_1_53_0_3: 'Escenario en lugares puntuales|Al poner un lugar puntual puedes elegir su escenario, y también desde Mundo en la Línea de tiempo. Vale para todas las veces que uses esa dirección.',
    wn_1_53_0_4: 'Más portadas y tu color|Las notas tienen muchos más iconos de portada y puedes elegir cualquier color con el selector.',
    wn_1_53_0_5: 'Turno puntual completo|Al crear un turno puntual ya salen el medio de transporte y «Después del turno».',
    wn_1_53_0_6: 'Hora del turno siguiente|Al añadir un turno puntual después de otro, la hora de inicio propuesta es la llegada del trayecto anterior o, si no hay trayecto, la hora en que acaba el turno anterior.',
    wn_1_53_0_7: 'Dividir turnos de un toque|En Día o Semana, activa la cuchilla (tijeras, arriba) y toca un turno donde quieras cortarlo: queda en dos trozos.',
    wn_1_53_0_8: 'Deshacer y rehacer|Arriba en Organización tienes deshacer y rehacer para cualquier cambio de turnos, notas, días, rutinas o lugares (también con Ctrl+Z y Ctrl+Y).',
    tfToolsAria: 'Herramientas', undoA: 'Deshacer', redoA: 'Rehacer', undone: 'Deshecho', redone: 'Rehecho',
    cutA: 'Dividir turnos (cuchilla)', cutHint: 'Toca un turno donde quieras cortarlo', cutNo: 'Ahí no se puede cortar: toca dentro del turno, lejos de sus bordes', cutDone: 'Turno dividido a las {h}',
    wn_1_53_0_9: 'Renombrar turnos|Toca un turno del calendario y pulsa «Renombrar»: elige si el nombre nuevo es solo para ese día o para todas las veces.',
    rnBtn: 'Renombrar', rnTitle: 'Renombrar turno', rnOne: 'Solo este día', rnAll: 'Todas las veces', rnReset: 'Nombre original',
    rnHint: '«Solo este día» no cambia el turno. «Todas las veces» cambia su nombre en todo el calendario.', rnOrig: 'nombre del turno: {n}',
    rnDone: 'Ahora se llama «{n}» ese día', rnDoneAll: 'El turno ahora se llama «{n}»',
    ntColorOwn: 'Color personalizado',
    nlMultiPh: 'Toca varios o escribe separando con comas',
    nlMultiN: '{n} elegidos',
    plxSceneHelp: 'Opcional. Es el dibujo de esta dirección en Mundo (Línea de tiempo) y vale para todas las veces que la uses.'
  };
  const en = {
    wn_1_53_0_1: 'Multi-select lists|In a note linked to a List (for example, People) you can tick several items at once: each tap selects or clears one.',
    wn_1_53_0_2: 'No note limit|There is no longer a maximum number of notes per day and the “day is full” warning is gone.',
    wn_1_53_0_3: 'Scene for one-off places|When you add a one-off place you can choose its scene, also from World in the Timeline. It applies every time you use that address.',
    wn_1_53_0_4: 'More covers and your colour|Notes have many more cover icons and you can pick any colour with the picker.',
    wn_1_53_0_5: 'Complete one-off shift|When you create a one-off shift, transport and “After the shift” now show up.',
    wn_1_53_0_6: 'Next shift time|When you add a one-off shift after another, the suggested start time is the arrival of the previous trip or, with no trip, the time the previous shift ends.',
    wn_1_53_0_7: 'Split shifts in one tap|In Day or Week, turn on the blade (scissors, at the top) and tap a shift where you want to cut it: it becomes two pieces.',
    wn_1_53_0_8: 'Undo and redo|At the top of Organisation you have undo and redo for any change to shifts, notes, days, routines or places (also Ctrl+Z and Ctrl+Y).',
    tfToolsAria: 'Tools', undoA: 'Undo', redoA: 'Redo', undone: 'Undone', redone: 'Redone',
    cutA: 'Split shifts (blade)', cutHint: 'Tap a shift where you want to cut it', cutNo: 'It cannot be cut there: tap inside the shift, away from its edges', cutDone: 'Shift split at {h}',
    wn_1_53_0_9: 'Rename shifts|Tap a shift in the calendar and press “Rename”: choose whether the new name is only for that day or for every time.',
    rnBtn: 'Rename', rnTitle: 'Rename shift', rnOne: 'Only this day', rnAll: 'Every time', rnReset: 'Original name',
    rnHint: '“Only this day” leaves the shift as it is. “Every time” changes its name across the calendar.', rnOrig: 'shift name: {n}',
    rnDone: 'It is now called “{n}” that day', rnDoneAll: 'The shift is now called “{n}”',
    ntColorOwn: 'Custom colour',
    nlMultiPh: 'Tap several or type them separated by commas',
    nlMultiN: '{n} selected',
    plxSceneHelp: 'Optional. It is how this address looks in World (Timeline) and it applies every time you use it.'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
