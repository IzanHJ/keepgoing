/* KeepGoing — textos de Organización v1.43: historial de notas, transporte de vuelta, notas en turnos y listas (ES / EN). */
(function () {
  const es = {
    nhTitle: 'Historial', nhEmpty: 'Todavía no hay notas en este periodo.', nhCount: '{n} notas', nhCount1: '1 nota',
    nhR_all: 'Todo', nhR_y: 'Último año', nhR_q: '90 días', nhR_m: '30 días', nhSum: 'Total {v}', nhAvg: 'Media {v}',
    bkTitle: 'Después del turno', bkHint: 'Cómo vuelves a Casa o adónde vas al acabar.', bkTo: 'Destino', bkHome: 'Casa',
    bkHintShift: 'Se pone en cada día con este turno. «Al siguiente turno» lo enlaza con el turno que venga después ese día (si es el último, vas a Casa).',
    bkHintDayInh: 'Este turno sigue en {m} al acabar. Apágalo si hoy no lo usas.', bkHintNext: 'Después tienes «{s}»: elige «Al siguiente turno» para enlazarlos o vuelve a Casa.',
    bkToNext: 'Siguiente turno', bkToNextOpt: 'Al siguiente turno', bkToShort: 'Después: {p}',
    bkDepDef: 'Sin hora de salida, sales al acabar ({h}).', bkLinkedHint: 'Llegas en {m} desde «{s}» (enlazado). Enciéndelo solo si hoy llegas de otra forma.',
    ntpTitle: 'Notas del turno', ntpDef: 'Nota predeterminada', ntpNone: 'Ninguna', ntpEmpty: 'Crea notas modulares o plantillas en Turnos y Rutinas → Notas.',
    nlTitle: 'Listas', nlIntro: 'Listas tuyas (Personas, Sitios…) que puedes usar en cualquier nota. Con «Añadir respuestas nuevas», lo que escribas entra en la lista para la próxima vez.',
    nlNew: 'Nueva lista', nlEdit: 'Editar lista', nlNamePh: 'Por ejemplo, Personas', nlAddPh: 'Añadir a la lista', nlEmpty: 'Lista vacía', nlUsedBy: 'La usan: {n}',
    nlDelQ: '¿Borrar la lista «{name}»? Las notas que ya escribiste no cambian.', nlMax: 'Has llegado al máximo de listas.', nlLink: 'Lista', nlNone: 'Sin lista', nlUse: 'Lista: {l}',
    nlGrow: 'Añadir respuestas nuevas a la lista', nlGrowShort: 'añade lo nuevo', nlAdded: 'Añadido a {l}: {x}',
    ndDep: 'Depende de', ndNone: 'Nada (opciones fijas)', ndHint: 'Escribe las opciones para cada respuesta, separadas por comas.', ndIf: 'Si eliges «{o}»', ndFirst: 'Elige antes «{f}».'
  };
  const en = {
    nhTitle: 'History', nhEmpty: 'No notes in this period yet.', nhCount: '{n} notes', nhCount1: '1 note',
    nhR_all: 'All', nhR_y: 'Last year', nhR_q: '90 days', nhR_m: '30 days', nhSum: 'Total {v}', nhAvg: 'Average {v}',
    bkTitle: 'After the shift', bkHint: 'How you get home or where you go when it ends.', bkTo: 'Destination', bkHome: 'Home',
    bkHintShift: 'It is added to every day with this shift. “To the next shift” links it to whatever shift comes next that day (if it is the last one, you go home).',
    bkHintDayInh: 'This shift continues by {m} when it ends. Turn it off if you do not use it today.', bkHintNext: '“{s}” comes next: pick “To the next shift” to link them, or go home.',
    bkToNext: 'Next shift', bkToNextOpt: 'To the next shift', bkToShort: 'After: {p}',
    bkDepDef: 'With no departure time, you leave when it ends ({h}).', bkLinkedHint: 'You arrive by {m} from “{s}” (linked). Turn it on only if you arrive another way today.',
    ntpTitle: 'Shift notes', ntpDef: 'Default note', ntpNone: 'None', ntpEmpty: 'Create modular notes or templates in Shifts & Routines → Notes.',
    nlTitle: 'Lists', nlIntro: 'Your own lists (People, Places…) you can use in any note. With “Add new answers”, whatever you type joins the list for next time.',
    nlNew: 'New list', nlEdit: 'Edit list', nlNamePh: 'For example, People', nlAddPh: 'Add to the list', nlEmpty: 'Empty list', nlUsedBy: 'Used by: {n}',
    nlDelQ: 'Delete the list “{name}”? Notes you already wrote do not change.', nlMax: 'You have reached the maximum number of lists.', nlLink: 'List', nlNone: 'No list', nlUse: 'List: {l}',
    nlGrow: 'Add new answers to the list', nlGrowShort: 'adds new ones', nlAdded: 'Added to {l}: {x}',
    ndDep: 'Depends on', ndNone: 'Nothing (fixed options)', ndHint: 'Write the options for each answer, separated by commas.', ndIf: 'If you pick “{o}”', ndFirst: 'Pick “{f}” first.'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
