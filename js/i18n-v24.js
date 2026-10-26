/* KeepGoing — textos de la v1.24: vistas Día y Semana del Calendario, pellizcar para cambiar de vista,
   deslizar para pintar con la edición rápida, turnos seguidos unidos y «Ajustes» del Calendario (ES / EN). */
(function () {
  const es = {
    tfDay: 'Día', tfWeek: 'Semana', tfPrevDay: 'Día anterior', tfNextDay: 'Día siguiente', tfPrevWeek: 'Semana anterior', tfNextWeek: 'Semana siguiente',
    tfWeekCount: 'Semana {n} de {t}', tfDayCount: 'Día {n} de {t}', tfAllDay: 'Todo el día', tfNoDayShifts: 'Nada este día. Toca para añadir un turno.',
    tfPinchHint: 'Pellizca para cambiar entre Día, Semana, Mes y Año', tfPaintHint: 'Toca o desliza el dedo por los días para pintar',
    tfQChange: 'Cambiar lo elegido', tfQDone: 'Listo', tfQDays: 'Días', tfQNoRt: 'Aún no tienes rutinas de un día. Créalas en',
    tfQYear: 'Al elegir algo pasas a la vista Mes para pintar.', tfRtRemove: 'Quitar rutina',
    tfDkTitle: 'Tipo de día', tfDkManage: 'Añadir o editar', tfDkNew: 'Nuevo tipo de día', tfDkNewName: 'Mi día', tfDkHint: 'Colorea días enteros para distinguirlos de un vistazo. Es aparte de los turnos y las rutinas.',
    tfDkDelQ: '¿Borrar «{name}»? Se quitará de {n} días.', tfDk_dk_work: 'Laboral', tfDk_dk_off: 'Libre', tfDk_dk_holiday: 'Festivo', tfDk_dk_vac: 'Vacaciones',
    tfViewSet: 'Vista del calendario', tfSummaryQ: 'Resumen de horas y paga', tfSummaryHint: 'El recuadro con las horas, los turnos y la paga estimada debajo del calendario.', tfPreview: 'Vista previa',
    tfKindJob: 'Categoría vinculada', tfKindEditJob: 'Editar categoría', tfKindJobHint: 'Al elegir este tipo en un turno, se pone esta categoría.',
    tfKindRate: 'Tarifa', tfKindSame: 'Igual', tfKindFixed: '+ € por hora', tfKindPct: '+ %', tfKindFixedU: 'Diferencia (€/h, puede ser negativa)', tfKindPctU: 'Diferencia (%, puede ser negativa)',
    tfKindSameHint: 'Cobra lo mismo que «{job}»: {rate}/h.', tfKindJobUnpaid: '«{job}» no se cobra: activa la paga en la categoría.', tfKindResult: '«{job}» cobra {rate}/h → este tipo cobra {res}/h.',
    tfJobKinds: 'Tipos vinculados: {list}',
    tfMore: 'Ajustes', tfMenuAria: 'Menú: informes, turnos, rutinas, rotaciones y ajustes',
  };
  const en = {
    tfDay: 'Day', tfWeek: 'Week', tfPrevDay: 'Previous day', tfNextDay: 'Next day', tfPrevWeek: 'Previous week', tfNextWeek: 'Next week',
    tfWeekCount: 'Week {n} of {t}', tfDayCount: 'Day {n} of {t}', tfAllDay: 'All day', tfNoDayShifts: 'Nothing this day. Tap to add a shift.',
    tfPinchHint: 'Pinch to switch between Day, Week, Month and Year', tfPaintHint: 'Tap or slide your finger across the days to paint',
    tfQChange: 'Change selection', tfQDone: 'Done', tfQDays: 'Days', tfQNoRt: 'You have no one-day routines yet. Create them in',
    tfQYear: 'Picking something takes you to Month view to paint.', tfRtRemove: 'Remove routine',
    tfDkTitle: 'Day type', tfDkManage: 'Add or edit', tfDkNew: 'New day type', tfDkNewName: 'My day', tfDkHint: 'Colour whole days to tell them apart at a glance. It is separate from shifts and routines.',
    tfDkDelQ: 'Delete “{name}”? It will be removed from {n} days.', tfDk_dk_work: 'Work day', tfDk_dk_off: 'Day off', tfDk_dk_holiday: 'Holiday', tfDk_dk_vac: 'Vacation',
    tfViewSet: 'Calendar view', tfSummaryQ: 'Hours and pay summary', tfSummaryHint: 'The box with hours, shifts and estimated pay below the calendar.', tfPreview: 'Preview',
    tfKindJob: 'Linked category', tfKindEditJob: 'Edit category', tfKindJobHint: 'Picking this type in a shift sets this category.',
    tfKindRate: 'Rate', tfKindSame: 'Same', tfKindFixed: '+ € per hour', tfKindPct: '+ %', tfKindFixedU: 'Difference (€/h, can be negative)', tfKindPctU: 'Difference (%, can be negative)',
    tfKindSameHint: 'Paid the same as “{job}”: {rate}/h.', tfKindJobUnpaid: '“{job}” is not paid: turn pay on in the category.', tfKindResult: '“{job}” pays {rate}/h → this type pays {res}/h.',
    tfJobKinds: 'Linked types: {list}',
    tfMore: 'Settings', tfMenuAria: 'Menu: reports, shifts, routines, rotations and settings',
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
