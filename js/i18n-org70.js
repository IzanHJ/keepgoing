/* KeepGoing — textos de la v1.70 de Organización: mantener pulsado el número del día para crear una rutina, copiar el día
   y pegarlo en otro (ES / EN). */
(function () {
  const es = {
    wn_1_70_0_1: 'Mantén pulsado el día|En Día, Semana o Mes, mantén pulsado el número de un día (o su casilla) y sale una ventana pequeña con Crear rutina, Copiar el día y Pegar el día.',
    wn_1_70_0_2: 'Crear rutina desde un día|Hace una rutina de un día con los turnos de ese día, sus horas y su transporte (sin las notas modulares). Solo le pones el nombre.',
    wn_1_70_0_3: 'Copiar y pegar un día entero|Copia los turnos, las notas y el tipo de día y pégalos en otro. Si ese día ya tiene algo, eliges si reemplazarlo o añadirlo a lo que hay.',
    dmRt: 'Crear rutina', dmCopy: 'Copiar el día', dmPaste: 'Pegar el día',
    dmRtName: 'Rutina del {d}', dmRtEmpty: 'Este día no tiene turnos para hacer una rutina.',
    dmRtOnce: 'Los turnos puntuales no entran en una rutina y este día solo tiene de esos.',
    dmRtSkip1: '1 turno puntual no entra en la rutina.', dmRtSkipN: '{n} turnos puntuales no entran en la rutina.',
    dmEmpty: 'Este día está vacío: no hay nada que copiar.', cpThing_day: 'el día',
    dmPasteQ: 'Este día ya tiene cosas', dmPasteHint: '{d} ya tiene turnos o notas. ¿Lo reemplazas por el {n} o lo añades a lo que hay?',
    dmReplace: 'Reemplazar', dmAdd: 'Añadir', dmPasted: 'Día pegado en el {d}'
  };
  const en = {
    wn_1_70_0_1: 'Press and hold a day|In Day, Week or Month, press and hold a day’s number (or its box) to get a small window with Create routine, Copy day and Paste day.',
    wn_1_70_0_2: 'Create a routine from a day|It makes a one-day routine with that day’s shifts, their times and transport (without modular notes). You just name it.',
    wn_1_70_0_3: 'Copy and paste a whole day|Copy the shifts, notes and day type and paste them onto another day. If that day already has something, choose to replace it or add to it.',
    dmRt: 'Create routine', dmCopy: 'Copy day', dmPaste: 'Paste day',
    dmRtName: 'Routine of {d}', dmRtEmpty: 'This day has no shifts to make a routine from.',
    dmRtOnce: 'One-off shifts can’t go in a routine and this day only has those.',
    dmRtSkip1: '1 one-off shift isn’t included in the routine.', dmRtSkipN: '{n} one-off shifts aren’t included in the routine.',
    dmEmpty: 'This day is empty: nothing to copy.', cpThing_day: 'the day',
    dmPasteQ: 'This day already has things', dmPasteHint: '{d} already has shifts or notes. Replace it with {n} or add to what’s there?',
    dmReplace: 'Replace', dmAdd: 'Add', dmPasted: 'Day pasted on {d}'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
