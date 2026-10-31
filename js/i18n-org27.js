/* KeepGoing — textos de Organización en la v1.28: notas, huecos vacíos y animaciones (ES / EN). */
(function () {
  const es = {
    ntTitle: 'Plantillas de notas',
    ntIntro: 'Notas con preguntas: «Leer» te pregunta qué libro y cuántas páginas. Te propone lo último que pusiste, lleva el progreso y suma los totales en Informes.',
    ntMine: 'Tus plantillas', ntNew: 'Nueva plantilla', ntEdit: 'Editar plantilla', ntNone: 'Aún no tienes plantillas.', ntMax: 'Has llegado al máximo de plantillas.',
    ntNoFields: 'Sin preguntas', ntHasProg: 'con progreso', ntName: 'Nombre', ntNamePh: 'Por ejemplo, Leer', ntIcon: 'Icono', ntFields: 'Preguntas',
    ntFieldPh: 'Pregunta (por ejemplo, Libro)', ntType: 'Tipo de respuesta', ntUnit: 'Unidad', ntOptsPh: 'Opciones separadas por comas', ntAddField: 'Añadir pregunta',
    ntT_text: 'Texto', ntT_num: 'Número', ntT_bool: 'Sí / No', ntT_rate: 'Valoración 0-10', ntT_pick: 'Elegir de una lista',
    ntProg: 'Progreso', ntProgHint: 'Suma un número por cada valor de un texto. Por ejemplo, las páginas de cada libro, con la meta que le pongas.',
    ntProgAmt: 'Sumar', ntProgKey: 'Por cada', ntProgNone: 'Sin progreso', ntProgNeed: 'Para el progreso hace falta una pregunta de texto y otra de número.',
    ntNeedName: 'Ponle un nombre a la plantilla.', ntNeedOpts: 'Escribe las opciones de la lista, separadas por comas.',
    ntNeed: 'Responde al menos una pregunta o escribe un comentario.', ntExtraPh: 'Comentario (opcional)', ntLast: 'La última vez: {v}',
    ntGoal: 'Meta de «{k}»', ntProgGoal: '{done} de {goal} {u} ({p} %)', ntProgSum: '{done} {u} en total', ntFinished: '¡Terminado: {k}!',
    ntRepTitle: 'Notas con plantilla', ntRepN: '{n} veces',
    ntRead: 'Leer', ntBook: 'Libro', ntPages: 'Páginas', ntPagesU: 'págs', ntGym: 'Entreno', ntGymKind: 'Tipo', ntGymOpts: 'Fuerza|Cardio|Movilidad|Deporte',
    ntMinutes: 'Minutos', ntSets: 'Series', ntEffort: 'Esfuerzo', ntStudy: 'Estudio', ntSubject: 'Asignatura', ntHours: 'Horas', ntDate: 'Cita', ntWho: 'Con quién', ntWhere: 'Dónde', ntDone: 'Hecha',
    wn_1_28_0_6: 'Plantillas de notas|Menú de Organización → Plantillas de notas. «Leer» te pregunta qué libro y cuántas páginas, recuerda lo último, lleva el progreso de cada libro y Informes suma los totales. Vienen Leer, Entreno, Estudio y Cita, y puedes crear las tuyas.',
    tfNotes27: 'Notas',
    tfGapNew: 'Añadir nota',
    help_cal_start: 'Abre el menú (icono de 4 cuadrados) → Turnos y crea tus turnos, sus categorías (con o sin paga) y tus lugares.|Toca el pincel (abajo a la derecha), elige un turno y toca o desliza por los días para ponerlo o quitarlo.|Toca un día para ver su detalle, cambiar sus horas o su descanso, añadir una nota o poner una rutina.|En Día y Semana, toca cualquier hueco libre para añadir un turno puntual o una nota en esa hora.|Para fichar, toca «Fichar entrada» en el Día de hoy o en el pincel, y «Fichar salida» al acabar.',
    wn_1_28_0_1: 'Zoom al cambiar de vista|Como en Apple Calendar: al alejar, el día se encoge hasta su casilla del Mes y el mes hasta su sitio en el Año. Al acercar, la vista nueva sale de la casilla que tocas.',
    wn_1_28_0_2: 'Onda al pintar|Al poner un turno, un tipo de día o una rutina con el pincel, las casillas de alrededor laten como una onda.',
    wn_1_28_0_3: 'Notas en cualquier hueco|Toca cualquier hueco libre de Día o Semana, aunque ese día no tenga turnos, y elige «Añadir nota». En el editor del día también puedes añadirlas.',
    wn_1_28_0_4: 'Notas a la vista|Con «Notas» encendido en Vista, la nota de cada turno sale dentro del turno en Día y Semana, y en el Mes hay un icono con cuántas notas tiene el día.',
    wn_1_28_0_5: 'Arreglos|Apagar «Nombres» en Vista ya oculta los nombres también en Día y Semana. Las rutinas ya no llevan su símbolo y se quita la nota del día.'
  };
  const en = {
    ntTitle: 'Note templates',
    ntIntro: 'Notes with questions: «Read» asks which book and how many pages. It suggests what you entered last, tracks progress and adds up totals in Reports.',
    ntMine: 'Your templates', ntNew: 'New template', ntEdit: 'Edit template', ntNone: 'You have no templates yet.', ntMax: 'You have reached the template limit.',
    ntNoFields: 'No questions', ntHasProg: 'with progress', ntName: 'Name', ntNamePh: 'For example, Read', ntIcon: 'Icon', ntFields: 'Questions',
    ntFieldPh: 'Question (for example, Book)', ntType: 'Answer type', ntUnit: 'Unit', ntOptsPh: 'Options separated by commas', ntAddField: 'Add question',
    ntT_text: 'Text', ntT_num: 'Number', ntT_bool: 'Yes / No', ntT_rate: 'Rating 0-10', ntT_pick: 'Pick from a list',
    ntProg: 'Progress', ntProgHint: 'Adds up a number for each value of a text. For example, the pages of each book, with the goal you set.',
    ntProgAmt: 'Add up', ntProgKey: 'For each', ntProgNone: 'No progress', ntProgNeed: 'Progress needs one text question and one number question.',
    ntNeedName: 'Give the template a name.', ntNeedOpts: 'Write the list options, separated by commas.',
    ntNeed: 'Answer at least one question or write a comment.', ntExtraPh: 'Comment (optional)', ntLast: 'Last time: {v}',
    ntGoal: 'Goal for «{k}»', ntProgGoal: '{done} of {goal} {u} ({p} %)', ntProgSum: '{done} {u} in total', ntFinished: 'Finished: {k}!',
    ntRepTitle: 'Template notes', ntRepN: '{n} times',
    ntRead: 'Read', ntBook: 'Book', ntPages: 'Pages', ntPagesU: 'pages', ntGym: 'Workout', ntGymKind: 'Type', ntGymOpts: 'Strength|Cardio|Mobility|Sport',
    ntMinutes: 'Minutes', ntSets: 'Sets', ntEffort: 'Effort', ntStudy: 'Study', ntSubject: 'Subject', ntHours: 'Hours', ntDate: 'Appointment', ntWho: 'With whom', ntWhere: 'Where', ntDone: 'Done',
    wn_1_28_0_6: 'Note templates|Organisation menu → Note templates. «Read» asks which book and how many pages, remembers the last one, tracks each book and Reports adds up the totals. Read, Workout, Study and Appointment come ready, and you can make your own.',
    tfNotes27: 'Notes',
    tfGapNew: 'Add note',
    help_cal_start: 'Open the menu (4-squares icon) → Shifts and create your shifts, their categories (paid or not) and your places.|Tap the brush (bottom right), pick a shift and tap or swipe across days to add or remove it.|Tap a day to see its detail, change its times or break, add a note or apply a routine.|In Day and Week, tap any free slot to add a one-off shift or a note at that time.|To clock in, tap “Clock in” on today’s Day view or in the brush, and “Clock out” when you finish.',
    wn_1_28_0_1: 'Zoom when you change view|Like Apple Calendar: zooming out, the day shrinks into its Month cell and the month into its place in the Year. Zooming in, the new view grows from the cell you tap.',
    wn_1_28_0_2: 'Ripple when painting|When you paint a shift, day type or routine with the brush, the cells around it pulse like a ripple.',
    wn_1_28_0_3: 'Notes in any slot|Tap any free slot in Day or Week, even on a day with no shifts, and choose «Add note». You can also add them from the day editor.',
    wn_1_28_0_4: 'Notes you can see|With «Notes» on in View, each shift note shows inside the shift in Day and Week, and Month shows an icon with how many notes the day has.',
    wn_1_28_0_5: 'Fixes|Turning off «Names» in View now hides names in Day and Week too. Routines no longer show their symbol and the day note is gone.'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
