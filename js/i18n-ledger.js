/* KeepGoing — textos de la Libreta de Gastos y del modo privacidad (ES / EN) */
(function () {
  const es = {
    tabLedger: 'Libreta', ledgerAdd: 'Añadir movimiento', ledgerCalendar: 'Calendario de gastos e ingresos',
    ledgerPrev: 'Mes anterior', ledgerNext: 'Mes siguiente', ledgerMonthSel: 'Mes', ledgerYearSel: 'Año',
    ledgerIncome: 'Ingresos', ledgerExpense: 'Gastos', ledgerBalance: 'Saldo del mes', ledgerDayNet: 'Neto del día',
    ledgerPickDay: 'Toca un día del calendario para ver sus movimientos.', ledgerDayEmpty: 'Sin gastos ni ingresos este día.',
    ledgerNew: 'Nuevo movimiento', ledgerEdit: 'Editar movimiento', ledgerType: 'Tipo', ledgerExpenseOne: 'Gasto', ledgerIncomeOne: 'Ingreso',
    ledgerAmount: 'Importe', ledgerCategory: 'Categoría', ledgerDate: 'Fecha', ledgerNote: 'Nota', ledgerNotePh: 'Ej. Menú del día',
    ledgerMethod: 'Método de pago', method_card: 'Tarjeta', method_cash: 'Efectivo', method_transfer: 'Transferencia', method_other: 'Otro',
    ledgerRepeat: 'Repetir', repeat_none: 'No se repite', repeat_weekly: 'Cada semana', repeat_monthly: 'Cada mes', repeat_yearly: 'Cada año',
    ledgerRepeatTo: 'Hasta (opcional)', ledgerFromRec: 'Creado por una repetición. Los cambios solo afectan a este movimiento.',
    ledgerRecFuture: 'Se añadirá cuando llegue la fecha', ledgerNeedAmount: 'Escribe un importe mayor que 0', ledgerDelQ: '¿Borrar este movimiento?',
    ledgerCats: 'Categorías', ledgerCatIcon: 'Icono', ledgerCatName: 'Nombre de la categoría', ledgerCatNew: 'Nueva categoría', ledgerCatNeedName: 'Escribe un nombre',
    ctype_expense: 'Gasto', ctype_income: 'Ingreso', ctype_both: 'Ambos', archive: 'Archivar', restore: 'Recuperar',
    ledgerRecs: 'Repeticiones', ledgerRecEmpty: 'No tienes movimientos que se repitan. Al añadir uno, elige «Repetir».',
    ledgerRecHint: 'Detener una repetición conserva los movimientos ya creados hasta hoy.', ledgerRecStop: 'Detener repetición', ledgerRecStopQ: '¿Detener esta repetición? Los movimientos hasta hoy se conservan.',
    ledgerSince: 'desde {d}', ledgerUntil: 'hasta {d}',
    catFood: 'Comida', catTransport: 'Transporte', catHome: 'Casa', catLeisure: 'Ocio', catHealth: 'Salud', catShopping: 'Compras', catSubs: 'Suscripciones', catOther: 'Otros', catSalary: 'Nómina', catExtra: 'Extra', catGift: 'Regalo',
    capOpen: 'Ver nivel y conversor de Dinero Caprichable', capUseIncome: 'Usar los ingresos de este mes ({m})',
    privacyMode: 'Modo privacidad', privacyModeOn: 'Importes ocultos', privacyModeOff: 'Importes visibles', privacyModeLabel: 'Ocultar importes (modo privacidad)',
    privacyModeHint: 'Muestra «•••••» en lugar de las cantidades. Puedes alternarlo al momento con el icono del ojo en la Libreta.',
    privacyHide: 'Ocultar importes', privacyShow: 'Mostrar importes', privacyOnToast: 'Importes ocultos', privacyOffToast: 'Importes visibles'
  };
  const en = {
    tabLedger: 'Ledger', ledgerAdd: 'Add entry', ledgerCalendar: 'Spending and income calendar',
    ledgerPrev: 'Previous month', ledgerNext: 'Next month', ledgerMonthSel: 'Month', ledgerYearSel: 'Year',
    ledgerIncome: 'Income', ledgerExpense: 'Spending', ledgerBalance: 'Month balance', ledgerDayNet: 'Day net',
    ledgerPickDay: 'Tap a day in the calendar to see its entries.', ledgerDayEmpty: 'No spending or income on this day.',
    ledgerNew: 'New entry', ledgerEdit: 'Edit entry', ledgerType: 'Type', ledgerExpenseOne: 'Expense', ledgerIncomeOne: 'Income',
    ledgerAmount: 'Amount', ledgerCategory: 'Category', ledgerDate: 'Date', ledgerNote: 'Note', ledgerNotePh: 'e.g. Lunch',
    ledgerMethod: 'Payment method', method_card: 'Card', method_cash: 'Cash', method_transfer: 'Transfer', method_other: 'Other',
    ledgerRepeat: 'Repeat', repeat_none: 'Does not repeat', repeat_weekly: 'Every week', repeat_monthly: 'Every month', repeat_yearly: 'Every year',
    ledgerRepeatTo: 'Until (optional)', ledgerFromRec: 'Created by a repeat. Changes only affect this entry.',
    ledgerRecFuture: 'It will be added when the date arrives', ledgerNeedAmount: 'Enter an amount greater than 0', ledgerDelQ: 'Delete this entry?',
    ledgerCats: 'Categories', ledgerCatIcon: 'Icon', ledgerCatName: 'Category name', ledgerCatNew: 'New category', ledgerCatNeedName: 'Enter a name',
    ctype_expense: 'Expense', ctype_income: 'Income', ctype_both: 'Both', archive: 'Archive', restore: 'Restore',
    ledgerRecs: 'Repeats', ledgerRecEmpty: 'You have no repeating entries. When adding one, choose “Repeat”.',
    ledgerRecHint: 'Stopping a repeat keeps the entries already created up to today.', ledgerRecStop: 'Stop repeat', ledgerRecStopQ: 'Stop this repeat? Entries up to today are kept.',
    ledgerSince: 'from {d}', ledgerUntil: 'until {d}',
    catFood: 'Food', catTransport: 'Transport', catHome: 'Home', catLeisure: 'Leisure', catHealth: 'Health', catShopping: 'Shopping', catSubs: 'Subscriptions', catOther: 'Other', catSalary: 'Salary', catExtra: 'Extra', catGift: 'Gift',
    capOpen: 'Open level and Treat Money converter', capUseIncome: "Use this month's income ({m})",
    privacyMode: 'Privacy mode', privacyModeOn: 'Amounts hidden', privacyModeOff: 'Amounts visible', privacyModeLabel: 'Hide amounts (privacy mode)',
    privacyModeHint: 'Shows “•••••” instead of amounts. Toggle it instantly with the eye icon in the Ledger.',
    privacyHide: 'Hide amounts', privacyShow: 'Show amounts', privacyOnToast: 'Amounts hidden', privacyOffToast: 'Amounts visible'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
