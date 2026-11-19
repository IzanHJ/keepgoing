/* KeepGoing — textos de la v1.64 de Organización: sub-listas encadenadas en las notas, notas de horarios distintos separadas,
   notas sin límite de caracteres y vista Día más grande (ES / EN). */
(function () {
  const es = {
    wn_1_64_0_6: 'Vista Día a toda pantalla|La caja de horas llega hasta abajo de la pantalla y la fecha va en la fila de los botones, así ves más horas a la vez.',
    rhTitle: 'Buscar en el historial', rhPh: 'Busca un turno, una rutina o una nota…', rhNone: 'No hay nada con ese nombre.',
    rh_shift: 'Turnos', rh_rt: 'Rutinas', rh_tpl: 'Notas modulares y plantillas', rhOther: 'Otro',
    rhFilter: 'Filtrar por fecha, hora o texto…', rhEmpty: 'Sin registros en este periodo.', rhN: '{n} registros', rhN1: '1 registro', rhH: '{h} h en total',
    nxNext: 'Siguiente', nxHint: 'Guarda y añade otro turno o nota justo después', nxTitle: 'Siguiente, desde las {h}',
    wn_1_64_0_4: 'Buscar en el historial|En Turnos y Rutinas (o con el reloj de cada uno), elige un turno, una rutina o una nota modular y ve todos sus registros por meses, con cuántas veces y cuántas horas.',
    wn_1_64_0_5: 'Siguiente, en secuencia|Dentro de un turno o una nota, «Siguiente» guarda y te deja añadir otro turno o nota justo a la hora en que acaba. Cada uno va en su bloque, con su color y una línea entre medias.',
    wn_1_64_0_1: 'Sub-listas en las notas|En Listas, toca un elemento (Matemáticas) y crea su sub-lista (Álgebra, Estadística…). En una nota modular, une un paso a la «Sub-lista de» otro paso: al elegir Matemáticas salen sus opciones.',
    wn_1_64_0_2: 'Cada nota con su horario|Dos notas seguidas con horas distintas ya no se juntan en un bloque: cada una va en su sitio, con su color y su borde. Si se pisan, se ponen una al lado de otra.',
    wn_1_64_0_3: 'Notas sin límite de letras|Escribe todo lo que quieras en cada hueco y en el comentario de una nota.',
    slUse: 'Sub-lista de «{s}»', slStep: 'paso {n}', slTag: 'Sub-lista de lo elegido en «{l}»',
    slFirst: 'Elige primero en «{s}» y aquí salen sus opciones.',
    slEmpty: '«{x}» aún no tiene sub-lista. Créala en Listas tocando ese elemento.',
    slEmptyGrow: '«{x}» aún no tiene sub-lista: lo que escribas aquí se guardará en ella.',
    slAdded: 'Añadido a la sub-lista de {p}: {x}',
    slTap: 'Toca un elemento para ver o crear su sub-lista.',
    slHint: 'Salen al elegir «{x}» en un paso unido a la sub-lista. Toca uno para crear otra sub-lista dentro.',
    slAddPh: 'Añadir a «{x}»…', slNone: 'Sin elementos todavía.', slSeen: 'Notas con «{x}»'
  };
  const en = {
    wn_1_64_0_6: 'Full-screen Day view|The hours box reaches the bottom of the screen and the date sits in the button row, so you see more hours at once.',
    rhTitle: 'Search history', rhPh: 'Search a shift, a routine or a note…', rhNone: 'Nothing with that name.',
    rh_shift: 'Shifts', rh_rt: 'Routines', rh_tpl: 'Modular notes and templates', rhOther: 'Other',
    rhFilter: 'Filter by date, time or text…', rhEmpty: 'No records in this period.', rhN: '{n} records', rhN1: '1 record', rhH: '{h} h in total',
    nxNext: 'Next', nxHint: 'Save and add another shift or note right after', nxTitle: 'Next, from {h}',
    wn_1_64_0_4: 'Search history|In Shifts and Routines (or with each one’s clock), pick a shift, a routine or a modular note and see all its records by month, with how many times and how many hours.',
    wn_1_64_0_5: 'Next, in sequence|Inside a shift or a note, “Next” saves and lets you add another shift or note right when it ends. Each one is its own block, with its colour and a line in between.',
    wn_1_64_0_1: 'Sub-lists in notes|In Lists, tap an item (Maths) and create its sub-list (Algebra, Statistics…). In a modular note, link a step to the “Sub-list of” another step: picking Maths shows its options.',
    wn_1_64_0_2: 'Each note at its own time|Two back-to-back notes with different times are no longer merged into one block: each sits in its place with its own colour and border. If they overlap, they go side by side.',
    wn_1_64_0_3: 'Notes without a character limit|Write as much as you like in every blank and in a note’s comment.',
    slUse: 'Sub-list of “{s}”', slStep: 'step {n}', slTag: 'Sub-list of what you picked in “{l}”',
    slFirst: 'Pick something in “{s}” first and its options will show here.',
    slEmpty: '“{x}” has no sub-list yet. Create it in Lists by tapping that item.',
    slEmptyGrow: '“{x}” has no sub-list yet: what you type here will be saved in it.',
    slAdded: 'Added to the sub-list of {p}: {x}',
    slTap: 'Tap an item to see or create its sub-list.',
    slHint: 'They show when you pick “{x}” in a step linked to the sub-list. Tap one to create another sub-list inside.',
    slAddPh: 'Add to “{x}”…', slNone: 'No items yet.', slSeen: 'Notes with “{x}”'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
