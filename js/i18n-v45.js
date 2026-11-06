/* KeepGoing — textos de la v1.45: audio espacial de verdad y efectos con el estilo de la música (ES / EN). */
(function () {
  const es = {
    wn_1_45_2_1: 'Arrastra tus turnos|En Organización, mantén pulsado un turno y arrástralo a otra hora (Día y Semana) o a otro día (Mes y Semana). Si lo sueltas encima de otro turno, como tu tiempo libre, ese se divide alrededor: libre 14:00-15:00, peluquería, libre 15:45-17:30.',
    wn_1_45_2_2: 'Corona sin cruz|La corona 3D de «¿Qué tal tu día?» ya no lleva la cruz de arriba: solo el orbe.',
    tfDragMoved: 'Movido: {t}', tfDragSplit: '{a} dividido alrededor de {b}',
    tfDragWorkQ: '¿Dividir {a}?', tfDragWorkHint: 'Es un turno de trabajo: si lo divides, sus horas bajan lo que dure {b}.',
    tfDragDoSplit: 'Dividir', tfDragBeside: 'Poner al lado',
    auSpatialHint: 'Cada sonido sale de la dirección de la pantalla donde tocas (hasta los lados), algunos se mueven y la música se abre a tu alrededor. Con auriculares.',
    wn_1_45_0_1: 'Audio espacial de verdad|Cada sonido sale de una dirección clara alrededor de tu cabeza (hasta los lados) según dónde tocas, y algunos se mueven: compartir se aleja hacia arriba, acercar viene hacia ti, avanzar en la Línea de tiempo cruza de lado y los logros te rodean. La música abre sus acordes de izquierda a derecha.',
    wn_1_45_0_2: 'Efectos con el estilo de la música|Los efectos usan los mismos instrumentos que la música (campanas, pads y pulsaciones suaves), suenan en la tonalidad del ambiente y sobre el acorde que esté sonando, y comparten su misma sala.'
  };
  const en = {
    wn_1_45_2_1: 'Drag your shifts|In Organisation, press and hold a shift and drag it to another time (Day and Week) or another day (Month and Week). Drop it on top of another shift, like your free time, and that one splits around it: free 14:00-15:00, haircut, free 15:45-17:30.',
    wn_1_45_2_2: 'Crown without the cross|The 3D crown in «How was your day?» no longer has the cross on top: just the orb.',
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
