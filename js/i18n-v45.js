/* KeepGoing — textos de la v1.45: audio espacial de verdad y efectos con el estilo de la música (ES / EN). */
(function () {
  const es = {
    wn_1_50_0_1: 'Un solo tipo de nota|Las notas modulares y las plantillas son ahora lo mismo: «Nueva nota» y, si quieres, «Leer como una frase» para que se lea con flechas («Conocí a Ana → en Bar Pepe»). Las que tenías se han convertido solas.',
    wn_1_50_0_2: 'Notas sin hora por defecto|Una nota no lleva hora de inicio y fin salvo que actives «Con hora de inicio y fin».',
    wn_1_50_0_3: 'Turnos más limpios|Los bloques de Día y Semana ya no enseñan la hora ni las horas del turno (se ven por su posición) y se quitan los descansos: si quieres uno, ponlo como un turno más. Los días pasados mantienen sus horas.',
    wn_1_50_0_4: 'Salida y llegada en su sitio|En el iPhone, los campos de salida y llegada del transporte ya no se pisan ni se salen del recuadro.',
    ntTitle: 'Tus notas', ntNew: 'Nueva nota', ntEdit: 'Editar nota', ntNone: 'Aún no tienes notas.', ntMax: 'Has llegado al máximo de notas.',
    ntIntro: 'Notas con preguntas o frases con huecos: «Leer» te pregunta qué libro y cuántas páginas, lleva el progreso y suma los totales en Informes.',
    ntSeq: 'Leer como una frase', ntSeqHint: 'Los pasos van seguidos con flechas: «Conocí a … → en …». El texto de cada paso va delante de su hueco.',
    wn_1_45_2_1: 'Arrastra tus turnos|En Organización, mantén pulsado un turno y arrástralo a otra hora (Día y Semana) o a otro día (Mes y Semana). Si lo sueltas encima de otro turno, como tu tiempo libre, ese se divide alrededor: libre 14:00-15:00, peluquería, libre 15:45-17:30.',
    wn_1_45_2_2: 'Corona sin cruz|La corona 3D de «¿Qué tal tu día?» ya no lleva la cruz de arriba: solo el orbe.',
    ntWithTime: 'Con hora de inicio y fin',
    tfDragMoved: 'Movido: {t}', tfDragSplit: '{a} dividido alrededor de {b}',
    tfDragWorkQ: '¿Dividir {a}?', tfDragWorkHint: 'Es un turno de trabajo: si lo divides, sus horas bajan lo que dure {b}.',
    tfDragDoSplit: 'Dividir', tfDragBeside: 'Poner al lado',
    auSpatialHint: 'Cada sonido sale de la dirección de la pantalla donde tocas (hasta los lados), algunos se mueven y la música se abre a tu alrededor. Con auriculares.',
    wn_1_45_0_1: 'Audio espacial de verdad|Cada sonido sale de una dirección clara alrededor de tu cabeza (hasta los lados) según dónde tocas, y algunos se mueven: compartir se aleja hacia arriba, acercar viene hacia ti, avanzar en la Línea de tiempo cruza de lado y los logros te rodean. La música abre sus acordes de izquierda a derecha.',
    wn_1_45_0_2: 'Efectos con el estilo de la música|Los efectos usan los mismos instrumentos que la música (campanas, pads y pulsaciones suaves), suenan en la tonalidad del ambiente y sobre el acorde que esté sonando, y comparten su misma sala.'
  };
  const en = {
    wn_1_50_0_1: 'One kind of note|Modular notes and templates are now the same thing: «New note» and, if you like, «Read as a sentence» so it reads with arrows («Met Ana → at Bar Pepe»). Yours were converted automatically.',
    wn_1_50_0_2: 'Notes without times by default|A note has no start and end time unless you turn on «With start and end time».',
    wn_1_50_0_3: 'Cleaner shifts|Day and Week blocks no longer show the time or the hours of the shift (their position shows it) and breaks are gone: if you want one, add it as another shift. Past days keep their hours.',
    wn_1_50_0_4: 'Departure and arrival in place|On iPhone, the departure and arrival fields of your transport no longer overlap or spill out of the box.',
    ntTitle: 'Your notes', ntNew: 'New note', ntEdit: 'Edit note', ntNone: 'You have no notes yet.', ntMax: 'You have reached the note limit.',
    ntIntro: 'Notes with questions or sentences with blanks: «Read» asks which book and how many pages, tracks progress and adds up totals in Reports.',
    ntSeq: 'Read as a sentence', ntSeqHint: 'The steps follow each other with arrows: «Met … → at …». The text of each step goes before its blank.',
    wn_1_45_2_1: 'Drag your shifts|In Organisation, press and hold a shift and drag it to another time (Day and Week) or another day (Month and Week). Drop it on top of another shift, like your free time, and that one splits around it: free 14:00-15:00, haircut, free 15:45-17:30.',
    wn_1_45_2_2: 'Crown without the cross|The 3D crown in «How was your day?» no longer has the cross on top: just the orb.',
    ntWithTime: 'With start and end time',
    tfDragMoved: 'Moved: {t}', tfDragSplit: '{a} split around {b}',
    tfDragWorkQ: 'Split {a}?', tfDragWorkHint: 'It is a work shift: if you split it, its hours go down by the length of {b}.',
    tfDragDoSplit: 'Split', tfDragBeside: 'Put it beside',
    auSpatialHint: 'Each sound comes from the direction where you tap (all the way to the sides), some move and the music opens up around you. Use headphones.',
    wn_1_45_0_1: 'Real spatial audio|Each sound comes from a clear direction around your head (all the way to the sides) depending on where you tap, and some move: sharing flies up and away, zooming in comes towards you, stepping through the Timeline crosses sides and achievements surround you. The music spreads its chords from left to right.',
    wn_1_45_0_2: 'Effects in the style of the music|Effects use the same instruments as the music (bells, pads and soft plucks), play in the mood\'s key over the chord that is sounding, and share the same room.'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
