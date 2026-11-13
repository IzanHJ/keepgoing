/* KeepGoing — textos de las Propuestas de Organización (v1.62): lo que apuntas en Entrenamiento y en la Libreta sale como
   propuesta de turno o nota a la misma hora (ES / EN). */
(function () {
  const es = {
    wn_1_62_0_1: 'Organización te propone lo que ya hiciste|Si terminas un entrenamiento de 15:00 a 17:00, en Organización aparece a esa hora un bloque con borde discontinuo: tócalo y añádelo como turno con un toque. Lo que apuntes a mano en la Libreta se propone como nota a la hora en que lo apuntaste.',
    wn_1_62_0_2: 'Vincula y se recuerda|Puedes añadir la propuesta como turno o nota nuevos, o vincularla a un turno o una nota modular tuya. La próxima vez que entrenes igual o apuntes en esa categoría, la propuesta ya sale vinculada. «Propuestas» en la barra de herramientas las reúne todas para añadirlas de golpe.',
    sgTitle: 'Propuestas', sgOne: 'Propuesta',
    sgFromGym: 'Viene de un entrenamiento terminado. Añádelo a tu Organización a la misma hora.',
    sgFromLed: 'Viene de un movimiento que apuntaste en la Libreta. Añádelo como nota a la misma hora.',
    sgAddAs: 'Añadir como', sgNewShift: 'Turno nuevo', sgNewNote: 'Nota nueva',
    sgLinkShift: 'O vincular a uno de tus turnos', sgLinkNote: 'O a una de tus notas modulares',
    sgAmt: 'Incluir el importe', sgAmtHint: 'La Libreta está cifrada y Organización no: sin esto, el importe no sale de la Libreta.',
    sgKeep: 'Recordar para la próxima', sgKeepHint: 'Lo próximo igual que «{x}» saldrá ya así.',
    sgAdd: 'Añadir', sgDismiss: 'Descartar', sgAddAll: 'Añadir todas',
    sgAdded: 'Añadido a Organización', sgAddedN: '{n} propuestas añadidas', sgDismissed: 'Propuesta descartada',
    sgNone: 'No hay propuestas en estas fechas.',
    sgTrayHint: 'Lo que apuntaste en Entrenamiento y en la Libreta. Toca una para elegir cómo añadirla; el tick la añade tal cual.',
    sgLedLocked: 'Abre la Libreta para ver también las propuestas de sus movimientos.',
    tfLy26_sug: 'Propuestas (de Entrenamiento y Libreta)'
  };
  const en = {
    wn_1_62_0_1: 'Organisation suggests what you already did|Finish a workout from 15:00 to 17:00 and a dashed block appears at that time in Organisation: tap it to add it as a shift in one go. What you enter by hand in the Ledger is suggested as a note at the time you entered it.',
    wn_1_62_0_2: 'Link it once, it is remembered|Add a suggestion as a new shift or note, or link it to one of your shifts or modular notes. Next time you do the same workout or use that category, the suggestion already comes linked. «Suggestions» in the toolbar gathers them all to add at once.',
    sgTitle: 'Suggestions', sgOne: 'Suggestion',
    sgFromGym: 'From a finished workout. Add it to your Organisation at the same time.',
    sgFromLed: 'From an entry you made in the Ledger. Add it as a note at the same time.',
    sgAddAs: 'Add as', sgNewShift: 'New shift', sgNewNote: 'New note',
    sgLinkShift: 'Or link to one of your shifts', sgLinkNote: 'Or to one of your modular notes',
    sgAmt: 'Include the amount', sgAmtHint: 'The Ledger is encrypted and Organisation is not: without this, the amount stays in the Ledger.',
    sgKeep: 'Remember for next time', sgKeepHint: 'The next one like «{x}» will come this way.',
    sgAdd: 'Add', sgDismiss: 'Dismiss', sgAddAll: 'Add all',
    sgAdded: 'Added to Organisation', sgAddedN: '{n} suggestions added', sgDismissed: 'Suggestion dismissed',
    sgNone: 'No suggestions for these dates.',
    sgTrayHint: 'What you logged in Training and in the Ledger. Tap one to choose how to add it; the tick adds it as is.',
    sgLedLocked: 'Open the Ledger to also see suggestions from its entries.',
    tfLy26_sug: 'Suggestions (from Training and Ledger)'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
