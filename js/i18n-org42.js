/* KeepGoing — textos de Organización v1.42: historial de notas, transporte de vuelta, notas en turnos y listas (ES / EN). */
(function () {
  const es = {
    nhTitle: 'Historial', nhEmpty: 'Todavía no hay notas en este periodo.', nhCount: '{n} notas', nhCount1: '1 nota',
    nhR_all: 'Todo', nhR_y: 'Último año', nhR_q: '90 días', nhR_m: '30 días', nhSum: 'Total {v}', nhAvg: 'Media {v}',
    bkTitle: 'Después del turno', bkHint: 'Cómo vuelves a Casa o adónde vas al acabar.', bkTo: 'Destino', bkHome: 'Casa',
    bkHintShift: 'Se pone en cada día con este turno. «Al siguiente turno» lo enlaza con el turno que venga después ese día (si es el último, vas a Casa).',
    bkHintDayInh: 'Este turno sigue en {m} al acabar. Apágalo si hoy no lo usas.', bkHintNext: 'Después tienes «{s}»: elige «Al siguiente turno» para enlazarlos o vuelve a Casa.',
    bkToNext: 'Siguiente turno', bkToNextOpt: 'Al siguiente turno', bkToShort: 'Después: {p}',
    bkDepDef: 'Sin hora de salida, sales al acabar ({h}).', bkLinkedHint: 'Llegas en {m} desde «{s}» (enlazado). Enciéndelo solo si hoy llegas de otra forma.'
  };
  const en = {
    nhTitle: 'History', nhEmpty: 'No notes in this period yet.', nhCount: '{n} notes', nhCount1: '1 note',
    nhR_all: 'All', nhR_y: 'Last year', nhR_q: '90 days', nhR_m: '30 days', nhSum: 'Total {v}', nhAvg: 'Average {v}',
    bkTitle: 'After the shift', bkHint: 'How you get home or where you go when it ends.', bkTo: 'Destination', bkHome: 'Home',
    bkHintShift: 'It is added to every day with this shift. “To the next shift” links it to whatever shift comes next that day (if it is the last one, you go home).',
    bkHintDayInh: 'This shift continues by {m} when it ends. Turn it off if you do not use it today.', bkHintNext: '“{s}” comes next: pick “To the next shift” to link them, or go home.',
    bkToNext: 'Next shift', bkToNextOpt: 'To the next shift', bkToShort: 'After: {p}',
    bkDepDef: 'With no departure time, you leave when it ends ({h}).', bkLinkedHint: 'You arrive by {m} from “{s}” (linked). Turn it on only if you arrive another way today.'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
