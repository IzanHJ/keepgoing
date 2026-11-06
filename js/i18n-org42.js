/* KeepGoing — textos de Organización v1.42: historial de notas, transporte de vuelta, notas en turnos y listas (ES / EN). */
(function () {
  const es = {
    nhTitle: 'Historial', nhEmpty: 'Todavía no hay notas en este periodo.', nhCount: '{n} notas', nhCount1: '1 nota',
    nhR_all: 'Todo', nhR_y: 'Último año', nhR_q: '90 días', nhR_m: '30 días', nhSum: 'Total {v}', nhAvg: 'Media {v}'
  };
  const en = {
    nhTitle: 'History', nhEmpty: 'No notes in this period yet.', nhCount: '{n} notes', nhCount1: '1 note',
    nhR_all: 'All', nhR_y: 'Last year', nhR_q: '90 days', nhR_m: '30 days', nhSum: 'Total {v}', nhAvg: 'Average {v}'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
