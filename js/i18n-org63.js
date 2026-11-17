/* KeepGoing — textos de la v1.63 de Organización: vista «Bordes», turnos creados en los huecos, mantener pulsado para elegir la
   hora, trayectos con varias paradas que se editan y se mueven, copiar y pegar, y dos arreglos (icono y lugar puntual) (ES / EN). */
(function () {
  const es = {
    wn_1_63_0_1: 'Varios trayectos en uno|Si coges dos guaguas, añade otra parada: cada tramo tiene su medio, sus horas y dónde te bajas.',
    wn_1_63_0_2: 'Edita y mueve el transporte|Toca un trayecto en Día o Semana para editarlo. Mantenlo pulsado y arrástralo a otra hora (de 5 en 5 min).',
    wn_1_63_0_3: 'Mantén pulsado para elegir la hora|En un hueco, mantén pulsado: sale una línea con la hora de 5 en 5 min. Al soltar, creas un turno o una nota desde esa hora.',
    wn_1_63_0_4: 'Tus turnos en los huecos|Al tocar un hueco también puedes poner uno de tus turnos creados. Empieza a esa hora y dura lo de siempre.',
    wn_1_63_0_5: 'Copiar y pegar|Copia un turno, un trayecto o una nota desde su editor y pégalo en un hueco, en otro día o en el transporte de otro turno.',
    wn_1_63_0_6: 'Vista «Bordes»|Actívala en Vista para ver una línea entre turnos seguidos y distinguir dónde acaba uno y empieza el otro.',
    wn_1_63_0_7: 'Arreglos|Ya puedes quitar el icono de un turno renombrado y escribir (o cambiar) la dirección de un lugar puntual.',
    tfLy26_edges: 'Bordes entre turnos',
    mtStop: 'Hasta (parada donde te bajas)', mtStopPh: 'Parada, intercambiador…', mtToShift: 'Hasta el turno', mtLegN: 'Tramo {n}', mtLegRm: 'Quitar este tramo',
    mtAdd: 'Añadir otra parada o trayecto', mtHintGo: 'Cómo llegas a este turno ese día.', mtHintBk: 'Al acabar este turno, ese día.',
    mtDragHint: 'En Día o Semana, mantén pulsado el trayecto y arrástralo para cambiar sus horas.', mtMoved: 'Trayecto movido {d} min',
    gmShifts: 'Tus turnos', gmShiftsHint: 'Empiezan a las {h} y duran lo de siempre (solo ese día).', gmAdded: '{n} añadido: {h}',
    cpCopy: 'Copiar', cpCopied: 'Copiado: {n}', cpPasted: 'Pegado', cpPasteN: 'Pegar «{n}»', cpPasteTrip: 'Pegar trayecto', cpGone: 'Ese turno ya no existe',
    cpThing_shift: 'turno', cpThing_trip: 'trayecto', cpThing_note: 'nota',
    plxChange: 'Cambiar la dirección…'
  };
  const en = {
    wn_1_63_0_1: 'Several legs in one trip|If you take two buses, add another stop: each leg has its own mode, times and where you get off.',
    wn_1_63_0_2: 'Edit and move transport|Tap a trip in Day or Week to edit it. Press and hold it and drag it to another time (in 5-minute steps).',
    wn_1_63_0_3: 'Press and hold to pick the time|In a gap, press and hold: a line shows the time in 5-minute steps. Release to create a shift or note from that time.',
    wn_1_63_0_4: 'Your shifts in the gaps|Tapping a gap also lets you add one of your shifts. It starts at that time and lasts as usual.',
    wn_1_63_0_5: 'Copy and paste|Copy a shift, a trip or a note from its editor and paste it in a gap, on another day or in another shift’s transport.',
    wn_1_63_0_6: '“Borders” view|Turn it on in View to see a line between back-to-back shifts and tell where one ends and the next begins.',
    wn_1_63_0_7: 'Fixes|You can now remove the icon of a renamed shift and type (or change) the address of a one-off place.',
    tfLy26_edges: 'Borders between shifts',
    mtStop: 'To (stop where you get off)', mtStopPh: 'Stop, station…', mtToShift: 'To the shift', mtLegN: 'Leg {n}', mtLegRm: 'Remove this leg',
    mtAdd: 'Add another stop or leg', mtHintGo: 'How you get to this shift that day.', mtHintBk: 'After this shift, that day.',
    mtDragHint: 'In Day or Week, press and hold the trip and drag it to change its times.', mtMoved: 'Trip moved {d} min',
    gmShifts: 'Your shifts', gmShiftsHint: 'They start at {h} and last as usual (that day only).', gmAdded: '{n} added: {h}',
    cpCopy: 'Copy', cpCopied: 'Copied: {n}', cpPasted: 'Pasted', cpPasteN: 'Paste “{n}”', cpPasteTrip: 'Paste trip', cpGone: 'That shift no longer exists',
    cpThing_shift: 'shift', cpThing_trip: 'trip', cpThing_note: 'note',
    plxChange: 'Change the address…'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
