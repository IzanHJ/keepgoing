/* KeepGoing — textos de la v1.72 de Organización: mantener pulsado el número del día para crear una rutina, copiar el día
   y pegarlo en otro (ES / EN). */
(function () {
  const es = {
    wn_1_72_0_1: 'Mantén pulsado el día|En Día, Semana o Mes, mantén pulsado el número de un día (o su casilla) y sale una ventana pequeña con Crear rutina, Copiar el día y Pegar el día.',
    wn_1_72_0_2: 'Crear rutina desde un día|Hace una rutina de un día con los turnos de ese día, sus horas y su transporte (sin las notas modulares). Si hay turnos puntuales, te pregunta si incluirlos tal cual, convertirlos en turnos o dejarlos fuera.',
    wn_1_72_0_3: 'Copiar y pegar un día entero|Copia los turnos, las notas y el tipo de día y pégalos en otro. Si ese día ya tiene algo, eliges si reemplazarlo o añadirlo a lo que hay.',
    dmRt: 'Crear rutina', dmCopy: 'Copiar el día', dmPaste: 'Pegar el día',
    dmRtName: 'Rutina del {d}', dmRtEmpty: 'Este día no tiene turnos para hacer una rutina.',
    dmRtOnceQ1: '¿Incluir el turno puntual?', dmRtOnceQN: '¿Incluir los {n} turnos puntuales?',
    dmRtOnceHint: 'Este día tiene turnos puntuales ({x}). Como puntuales van en la rutina con su nombre, color y horas sin tocar tu lista de Turnos. Si los conviertes, pasan a ser turnos como los demás (los usarás también en otros días).',
    dmRtOnceYes: 'Incluirlos como puntuales', dmRtOnceConv: 'Convertirlos en turnos', dmRtOnceNo: 'Sin ellos',
    dmEmpty: 'Este día está vacío: no hay nada que copiar.', cpThing_day: 'el día',
    dmPasteQ: 'Este día ya tiene cosas', dmPasteHint: '{d} ya tiene turnos o notas. ¿Lo reemplazas por el {n} o lo añades a lo que hay?',
    dmReplace: 'Reemplazar', dmAdd: 'Añadir', dmPasted: 'Día pegado en el {d}'
  };
  const en = {
    wn_1_72_0_1: 'Press and hold a day|In Day, Week or Month, press and hold a day’s number (or its box) to get a small window with Create routine, Copy day and Paste day.',
    wn_1_72_0_2: 'Create a routine from a day|It makes a one-day routine with that day’s shifts, their times and transport (without modular notes). If there are one-off shifts, it asks whether to include them as they are, turn them into shifts or leave them out.',
    wn_1_72_0_3: 'Copy and paste a whole day|Copy the shifts, notes and day type and paste them onto another day. If that day already has something, choose to replace it or add to it.',
    dmRt: 'Create routine', dmCopy: 'Copy day', dmPaste: 'Paste day',
    dmRtName: 'Routine of {d}', dmRtEmpty: 'This day has no shifts to make a routine from.',
    dmRtOnceQ1: 'Include the one-off shift?', dmRtOnceQN: 'Include the {n} one-off shifts?',
    dmRtOnceHint: 'This day has one-off shifts ({x}). As one-off they go in the routine with their name, color and times without touching your Shifts list. If you turn them into shifts, they become regular shifts you can use on other days too.',
    dmRtOnceYes: 'Include as one-off', dmRtOnceConv: 'Turn them into shifts', dmRtOnceNo: 'Without them',
    dmEmpty: 'This day is empty: nothing to copy.', cpThing_day: 'the day',
    dmPasteQ: 'This day already has things', dmPasteHint: '{d} already has shifts or notes. Replace it with {n} or add to what’s there?',
    dmReplace: 'Replace', dmAdd: 'Add', dmPasted: 'Day pasted on {d}'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
