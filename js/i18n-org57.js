/* KeepGoing — textos de la v1.58 de Organización: notas juntas en un bloque, icono y color al renombrar un turno,
   cuchilla de precisión, capas con transparencia y color del día en las columnas de Día y Semana (ES / EN). */
(function () {
  const es = {
    wn_1_58_0_1: 'Notas juntas|Las notas seguidas o que se pisan se ven en un solo bloque: «Correr - Leer - Ducha». Toca cada una para abrirla.',
    wn_1_58_0_2: 'Icono y color de un turno|Al renombrar un turno también eliges su icono y su color, solo ese día o todas las veces.',
    wn_1_58_0_3: 'Cuchilla de precisión|Con las tijeras, mantén pulsado un turno: sale una línea discontinua con la hora exacta (de 5 en 5 min) y corta al soltar.',
    wn_1_58_0_4: 'Capas claras|Las notas van encima, luego el transporte y debajo el turno. Notas y trayectos son transparentes para que se vea lo de debajo.',
    wn_1_58_0_6: 'Notas más simples|Fuera el progreso y las metas de las notas (llevas X de Y). Lo que escribiste en cada nota sigue igual.',
    wn_1_58_0_5: 'Color del día en Día y Semana|El color del día se ve en la vista Día y tiñe los huecos de su columna, también en Semana.',
    rnBtn2: 'Nombre, icono y color', rnTitle2: 'Nombre, icono y color del turno', rnIcon: 'Icono', rnIconPh: 'O escribe otro emoji', rnNoIcon: 'Sin icono',
    rnHint2: '«Solo este día» no cambia el turno. «Todas las veces» cambia su nombre, icono y color en todo el calendario.', rnReset2: 'Como el turno',
    cutHint: 'Toca un turno donde quieras cortarlo, o mantén pulsado para elegir la hora exacta'
  };
  const en = {
    wn_1_58_0_1: 'Notes together|Notes that follow each other or overlap show as one block: “Run - Read - Shower”. Tap each one to open it.',
    wn_1_58_0_2: 'Shift icon and colour|When you rename a shift you also pick its icon and colour, just that day or every time.',
    wn_1_58_0_3: 'Precision blade|With the scissors, press and hold a shift: a dashed line shows the exact time (5-minute steps) and it cuts when you let go.',
    wn_1_58_0_4: 'Clear layers|Notes on top, then transport, then the shift underneath. Notes and trips are see-through so you can see what is below.',
    wn_1_58_0_6: 'Simpler notes|Progress and goals are gone from notes (X of Y). What you wrote in each note stays the same.',
    wn_1_58_0_5: 'Day colour in Day and Week|The day colour shows in Day view and tints the empty space of its column, in Week too.',
    rnBtn2: 'Name, icon and colour', rnTitle2: 'Shift name, icon and colour', rnIcon: 'Icon', rnIconPh: 'Or type another emoji', rnNoIcon: 'No icon',
    rnHint2: '“Only this day” leaves the shift as it is. “Every time” changes its name, icon and colour across the calendar.', rnReset2: 'Like the shift',
    cutHint: 'Tap a shift where you want to cut it, or press and hold to pick the exact time'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
