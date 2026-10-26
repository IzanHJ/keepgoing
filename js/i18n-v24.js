/* KeepGoing — textos de la v1.24: vistas Día y Semana del Calendario, pellizcar para cambiar de vista,
   deslizar para pintar con la edición rápida, turnos seguidos unidos y «Ajustes» del Calendario (ES / EN). */
(function () {
  const es = {
    tfDay: 'Día', tfWeek: 'Semana', tfPrevDay: 'Día anterior', tfNextDay: 'Día siguiente', tfPrevWeek: 'Semana anterior', tfNextWeek: 'Semana siguiente',
    tfWeekCount: 'Semana {n} de {t}', tfDayCount: 'Día {n} de {t}', tfAllDay: 'Todo el día', tfNoDayShifts: 'Nada este día. Toca para añadir un turno.',
    tfPinchHint: 'Pellizca para cambiar entre Día, Semana, Mes y Año', tfPaintHint: 'Toca o desliza el dedo por los días para pintar',
    tfQChange: 'Cambiar lo elegido', tfQDone: 'Listo', tfQDays: 'Días', tfQNoRt: 'Aún no tienes rutinas de un día. Créalas en', tfQDaysSoon: 'Muy pronto: colorear días (laboral, libre, festivo, vacaciones…).',
    tfQYear: 'Al elegir algo pasas a la vista Mes para pintar.', tfRtRemove: 'Quitar rutina',
    tfMore: 'Ajustes', tfMenuAria: 'Menú: informes, turnos, rutinas, rotaciones y ajustes',
  };
  const en = {
    tfDay: 'Day', tfWeek: 'Week', tfPrevDay: 'Previous day', tfNextDay: 'Next day', tfPrevWeek: 'Previous week', tfNextWeek: 'Next week',
    tfWeekCount: 'Week {n} of {t}', tfDayCount: 'Day {n} of {t}', tfAllDay: 'All day', tfNoDayShifts: 'Nothing this day. Tap to add a shift.',
    tfPinchHint: 'Pinch to switch between Day, Week, Month and Year', tfPaintHint: 'Tap or slide your finger across the days to paint',
    tfQChange: 'Change selection', tfQDone: 'Done', tfQDays: 'Days', tfQNoRt: 'You have no one-day routines yet. Create them in', tfQDaysSoon: 'Coming soon: colour days (work, off, holiday, vacation…).',
    tfQYear: 'Picking something takes you to Month view to paint.', tfRtRemove: 'Remove routine',
    tfMore: 'Settings', tfMenuAria: 'Menu: reports, shifts, routines, rotations and settings',
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
