/* KeepGoing — textos de la v1.25: arreglos del chat, de «Ver la app como» y de la tienda, ahorro de los planes (ES / EN). */
(function () {
  const es = {
    back: 'Volver',
    rateTitle: 'Valoración del día', rateToday: '¿Qué tal tu día?', rateYesterday: 'Valorar el día de ayer', rateDayTitle: 'Valora el {d}', hw_dayrate: 'Valoración del día',
    tfOnce: 'Puntual', tfOnceNew: 'Turno puntual', tfOnceEdit: 'Editar turno puntual', tfOncePh: 'Médico, quedada, taxi…', tfOnceJob: 'Categoría (para sumar horas y paga)', tfOnceNoJob: 'Ninguna (no suma)',
    tfOnceHint: 'Solo para este día: no se guarda en tu lista de Turnos. Si le pones una categoría, suma horas y paga.',
    tfLayers: 'Capas de vista', tfLayersHint: 'Elige qué se ve en el calendario. Solo cambia en este dispositivo.', tfLy_shifts: 'Turnos y Rutinas', tfLy_text: 'Mostrar texto', tfLy_days: 'Días (colores)', tfLy_notes: 'Notas', tfLy_rates: 'Valoraciones',
    tfPdfRange: 'PDF del calendario', tfPdfFrom: 'Desde', tfPdfTo: 'Hasta', tfPdfSendHere: 'Enviar a este chat', tfPdfTooLong: 'Como mucho un año de una vez.', chatShareCal: 'Calendario (PDF)',
    tfPdfL_shifts: 'Turnos', tfPdfL_routines: 'Rutinas', tfPdfL_text: 'Mostrar texto', tfPdfL_days: 'Días (colores)', tfPdfL_notes: 'Notas', tfPdfL_rates: 'Valoraciones', tfPdfL_detail: 'Detalle',
    tfPdfDetailHint: 'Si lo de un día no cabe, esa semana se hace más alta (solo esa semana) para que se vea todo.',
    tfDayNote: 'Nota del día', tfDayNotePh: 'Escribe lo que quieras recordar de este día', tfSeeMore: 'Ver más', tfEditDay: 'Editar el día', tfDkMax: 'Un día puede tener como mucho 3 colores (contando los de los eventos).',
    stViewBanner: 'Viendo la app como {plan}', stViewBack: 'Volver a mi plan real',
    plSaveYear: 'Ahorras {a} ({n} %) frente a 12 meses', plSaveForever: 'Ahorras {a} ({n} %) frente a {y} años del anual',
    shopTitle: 'Usuario KeepGoing', shopBack: 'Volver a KeepGoing',
    hProjects: 'Proyectos', hProjectsHint: 'Toca para meterlo o sacarlo de un proyecto.',
    hMove: 'Mover a un proyecto', hMoveTitle: 'Mover «{name}»', hMoveHere: 'ya está aquí', hMoveNone: 'No tienes otros proyectos.',
    folderNewHabit: 'Nuevo hábito aquí', hMoveOut: 'Sacar de este proyecto', hMoveOutAll: 'Sacar de todos los proyectos',
    dbPayTitle: 'Paga una aportación', dbPayNone: 'No paga ninguna aportación', dbPayInfo: 'Acordado {e} · pagado hasta ahora {p}', dbPayHint: 'Si este ingreso es lo que alguien te devuelve de un gasto, elígelo aquí.',
    dbOwedTitle: 'Pendiente de Aportación', dbOwedHint: 'Otras personas te tienen que devolver una parte de este gasto.', dbFixed: 'Cantidad', dbPct: '%',
    dbExpected: 'Te tiene que dar {a}', dbDone: 'Resuelta', dbDoneExtra: 'Resuelta · {a} de Comisiones', dbLeft: 'Deuda: faltan {a}', dbAddPart: 'Añadir persona',
    dbBase: 'El % se calcula sobre {a} (el gasto después de sus movimientos vinculados).',
    dbDueTitle: 'Pendiente de devolver', dbDueHint: 'Se lo debes a otra persona (por ejemplo, te lo pagó ella). No cuenta en gastos ni en el patrimonio hasta que lo marques como devuelto.',
    dbDuePaid: 'Ya lo he devuelto', dbNeedWho: 'Elige a quién corresponde cada deuda.', dbWhoPick: 'Elige una persona', dbWhoNew: 'Otra persona (escribir nombre)', dbWhoName: 'Nombre',
    dbBadgeDue: 'Pendiente de devolver · {who}', dbBadgeDuePaid: 'Devuelto · {who}', dbBadgeOwed: 'Te deben {a}'
  };
  const en = {
    back: 'Back',
    rateTitle: 'Day rating', rateToday: 'How was your day?', rateYesterday: 'Rate yesterday', rateDayTitle: 'Rate {d}', hw_dayrate: 'Day rating',
    tfOnce: 'One-off', tfOnceNew: 'One-off shift', tfOnceEdit: 'Edit one-off shift', tfOncePh: 'Doctor, meet-up, taxi…', tfOnceJob: 'Category (to add hours and pay)', tfOnceNoJob: 'None (does not count)',
    tfOnceHint: 'Just for this day: it is not saved to your Shifts list. With a category, it adds hours and pay.',
    tfLayers: 'View layers', tfLayersHint: 'Choose what the calendar shows. Only changes on this device.', tfLy_shifts: 'Shifts and Routines', tfLy_text: 'Show text', tfLy_days: 'Days (colours)', tfLy_notes: 'Notes', tfLy_rates: 'Ratings',
    tfPdfRange: 'Calendar PDF', tfPdfFrom: 'From', tfPdfTo: 'To', tfPdfSendHere: 'Send to this chat', tfPdfTooLong: 'One year at most at a time.', chatShareCal: 'Calendar (PDF)',
    tfPdfL_shifts: 'Shifts', tfPdfL_routines: 'Routines', tfPdfL_text: 'Show text', tfPdfL_days: 'Days (colours)', tfPdfL_notes: 'Notes', tfPdfL_rates: 'Ratings', tfPdfL_detail: 'Detail',
    tfPdfDetailHint: 'If a day does not fit, that week gets taller (only that week) so everything shows.',
    tfDayNote: 'Day note', tfDayNotePh: 'Write anything you want to remember about this day', tfSeeMore: 'See more', tfEditDay: 'Edit day', tfDkMax: 'A day can have at most 3 colours (events included).',
    stViewBanner: 'Viewing the app as {plan}', stViewBack: 'Back to my real plan',
    plSaveYear: 'You save {a} ({n}%) compared with 12 months', plSaveForever: 'You save {a} ({n}%) compared with {y} years of yearly',
    shopTitle: 'KeepGoing User', shopBack: 'Back to KeepGoing',
    hProjects: 'Projects', hProjectsHint: 'Tap to add it to or remove it from a project.',
    hMove: 'Move to a project', hMoveTitle: 'Move “{name}”', hMoveHere: 'already here', hMoveNone: 'You have no other projects.',
    folderNewHabit: 'New habit here', hMoveOut: 'Remove from this project', hMoveOutAll: 'Remove from every project',
    dbPayTitle: 'Pays a contribution', dbPayNone: 'Does not pay any contribution', dbPayInfo: 'Agreed {e} · paid so far {p}', dbPayHint: 'If this income is someone paying you back for an expense, pick it here.',
    dbOwedTitle: 'Pending contribution', dbOwedHint: 'Other people have to pay you back part of this expense.', dbFixed: 'Amount', dbPct: '%',
    dbExpected: 'Owes you {a}', dbDone: 'Settled', dbDoneExtra: 'Settled · {a} in Fees', dbLeft: 'Debt: {a} left', dbAddPart: 'Add person',
    dbBase: 'The % is worked out on {a} (the expense after its linked movements).',
    dbDueTitle: 'Pending repayment', dbDueHint: 'You owe it to someone else (for example, they paid it for you). It does not count in expenses or net worth until you mark it as repaid.',
    dbDuePaid: 'I have paid it back', dbNeedWho: 'Choose who each debt belongs to.', dbWhoPick: 'Choose a person', dbWhoNew: 'Someone else (type a name)', dbWhoName: 'Name',
    dbBadgeDue: 'Pending repayment · {who}', dbBadgeDuePaid: 'Repaid · {who}', dbBadgeOwed: 'Owed {a}'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
