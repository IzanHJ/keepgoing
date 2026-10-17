/* KeepGoing — textos de la v1.16: huella / Face ID con permiso una sola vez, «Ver» detallado, contraseña propia en la Libreta
   compartida, «Notas para ti», privacidad con movimiento y arreglos (ES / EN) */
(function () {
  const es = {
    // Huella / Face ID: permiso una sola vez
    bioOnceLabel: 'Pedir la huella / Face ID una sola vez',
    bioOnceHint: 'Tras la primera vez, la Libreta se abre sola en este dispositivo hasta que la bloquees con el candado.',
    bioOnceOn: 'Listo: solo se pedirá la primera vez', bioOnceOff: 'Se pedirá cada vez que abras la Libreta',
    // Privacidad con movimiento (Ajustes)
    motionLabel: 'Alternar la privacidad con movimiento',
    motionHint: 'Pon el móvil boca abajo un momento para ocultar los importes, y otra vez para mostrarlos.',
    flipOnToast: 'Pon el móvil boca abajo para ocultar o mostrar los importes', flipOffToast: 'Privacidad con movimiento desactivada',
    privacyFlipToast: 'Importes ocultos', privacyFlipOffToast: 'Importes visibles',
    // Libreta compartida con contraseña
    lsSendHint: 'Solo a amigos, nunca a grupos. Eliges una contraseña y tu amigo solo podrá abrirla si la acierta (5 intentos, luego se bloquea 15 minutos).',
    lsPwTitle: 'Contraseña de la libreta', lsPwSub: 'Elige la contraseña que tendrá que escribir {tag} para abrirla.',
    lsPwNew: 'Contraseña (mínimo 4 caracteres)', lsPwHint: 'Díselo tú en persona o por otra vía. No se guarda en ningún sitio: si se olvida, tendrás que compartirla otra vez.',
    lsPwSend: 'Compartir con contraseña', lsPwSending: 'Cifrando…', lsPwShort: 'La contraseña necesita al menos 4 caracteres',
    lsPwAsk: 'Escribe la contraseña que eligió {tag} para abrir esta libreta.', lsPwAskMine: 'Escribe la contraseña que elegiste al compartirla con {tag}.',
    lsPwEnter: 'Contraseña', lsPwWrong: 'Contraseña incorrecta. Te quedan {n} intentos.', lsPwLocked: 'Demasiados intentos. Prueba de nuevo en {n} min.',
    evShareFriendSub: 'Le llega cifrado de extremo a extremo: solo tu amigo puede verlo.',
    // «Ver» detallado
    pvMulti: 'Varias veces al día', pvDates: 'Fechas', pvLength: 'Duración', pvDays: '{n} días',
    pvAllCats: 'Todas las categorías', pvNoAmounts: 'Los importes nunca se comparten: solo el nombre, las fechas y las categorías.',
    pvGoal: 'Objetivo', pvDeadline: 'Fecha límite', pvHabits: 'Hábitos vinculados', pvNoHabits: 'Este proyecto no tiene hábitos vinculados.',
    pvUnit: 'Unidad', pvMembers: '{n} miembros',
    // «Notas para ti»
    notesTitle: 'Notas para ti', notesHide: 'Quitar', notesAll: 'Ver todas ({n})', notesSeen: 'Marcar como vistas', notesNone: 'Aún no tienes notas.',
    // Ranking
    rankLiveHint: 'La clasificación en vivo solo cuenta la actividad. Las puntuaciones de los compañeros se suman al cerrar el periodo.'
  };
  const en = {
    bioOnceLabel: 'Ask for fingerprint / Face ID only once',
    bioOnceHint: 'After the first time, the Expense Book opens by itself on this device until you lock it with the padlock.',
    bioOnceOn: 'Done: you’ll only be asked the first time', bioOnceOff: 'You’ll be asked every time you open the Expense Book',
    motionLabel: 'Toggle privacy with motion',
    motionHint: 'Turn your phone face down for a moment to hide amounts, and again to show them.',
    flipOnToast: 'Turn your phone face down to hide or show amounts', flipOffToast: 'Privacy with motion turned off',
    privacyFlipToast: 'Amounts hidden', privacyFlipOffToast: 'Amounts visible',
    lsSendHint: 'Friends only, never groups. You choose a password and your friend can only open it if they get it right (5 tries, then it locks for 15 minutes).',
    lsPwTitle: 'Book password', lsPwSub: 'Choose the password {tag} will need to type to open it.',
    lsPwNew: 'Password (at least 4 characters)', lsPwHint: 'Tell them in person or another way. It isn’t stored anywhere: if it’s forgotten, you’ll have to share again.',
    lsPwSend: 'Share with password', lsPwSending: 'Encrypting…', lsPwShort: 'The password needs at least 4 characters',
    lsPwAsk: 'Type the password {tag} chose to open this book.', lsPwAskMine: 'Type the password you chose when sharing it with {tag}.',
    lsPwEnter: 'Password', lsPwWrong: 'Wrong password. {n} tries left.', lsPwLocked: 'Too many tries. Try again in {n} min.',
    evShareFriendSub: 'End-to-end encrypted: only your friend can see it.',
    pvMulti: 'Several times a day', pvDates: 'Dates', pvLength: 'Length', pvDays: '{n} days',
    pvAllCats: 'All categories', pvNoAmounts: 'Amounts are never shared: only the name, dates and categories.',
    pvGoal: 'Goal', pvDeadline: 'Deadline', pvHabits: 'Linked habits', pvNoHabits: 'This project has no linked habits.',
    pvUnit: 'Unit', pvMembers: '{n} members',
    notesTitle: 'Notes for you', notesHide: 'Remove', notesAll: 'See all ({n})', notesSeen: 'Mark as seen', notesNone: 'No notes yet.',
    rankLiveHint: 'The live board only counts activity. Teammates’ ratings are added when the period closes.'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
