/* KeepGoing — textos de la v1.15: grupos con ranking desde un chat, solicitudes por ID, reto en vivo, puntuaciones,
   foto del grupo, fotos de una vez, notas de voz, stickers y «Ver» en lo compartido (ES / EN) */
(function () {
  const es = {
    // Lista de chats
    liveBand: 'Reto en vivo', reqPending: 'Solicitudes',
    chatPrevPhoto: 'Foto', chatPrevAudio: 'Nota de voz',
    // Unirse por ID
    reqJoinTitle: 'Unirse con un ID', reqJoinSub: 'Pide entrar en un grupo con su ID. El líder o un colíder lo aprueban.',
    reqJoinHint: 'El ID aparece en el perfil del grupo. Te avisaremos en el chat del grupo cuando te acepten.',
    reqSend: 'Enviar solicitud', reqSent: 'Solicitud enviada a {name}', reqNoGroup: 'No hay ningún grupo con ese ID',
    reqAlready: 'Ya estás en ese grupo', reqTitle: 'Solicitudes para unirse ({n})',
    sys_join_request: '🆔 {name} quiere unirse al grupo',
    // Foto del grupo
    gPicChange: 'Cambiar la foto del grupo', gPicRemove: 'Quitar la foto', gPicRemoveQ: '¿Quitar la foto del grupo?',
    // Hábitos vinculados y vincular lo del grupo
    gLinkHabit: 'Añade «{name}» a tus hábitos', gLinkProject: 'Añade «{name}» a tus proyectos',
    gLinkSub: 'Así tu progreso cuenta en el ranking y las estadísticas del grupo.',
    gLinkHabits: 'Faltan {n} hábitos del proyecto en tu panel', gHabitsAdded: '{n} hábitos añadidos al proyecto',
    pvHabits: 'Hábitos vinculados', chatView: 'Ver',
    // Pasar de chat a grupo con ranking
    gUpgrade: 'Convertir en grupo con ranking', gUpgradeSub: 'El chat pasa a tener un proyecto o hábito, ID, estadísticas, retos y ranking. Se mantienen los mensajes y los miembros.',
    gUpgradeBtn: 'Convertir', gUpgradePick: 'Elige qué vais a hacer juntos. A los demás les aparecerá para añadirlo a su panel.',
    gUpgradeNone: 'Crea primero un proyecto o un hábito que no esté ya en otro grupo.',
    gUpgradeQ: '¿Convertir este chat en un grupo de «{name}»? No se puede deshacer.', gUpgraded: 'Ahora es un grupo con ranking',
    sys_upgraded: '🏆 El chat ahora es un grupo de «{name}» con ranking',
    // Puntuaciones del ranking
    rateTitle: 'Puntúa a tus compañeros', rateHint: 'De 0 a 10, una vez por periodo. Las puntuaciones y las notas se publican en el chat cuando se cierra el ranking y suman a la puntuación final.',
    rateBtn: 'Puntuar', rateDone: 'Puntuado', rateNobody: 'No hay nadie más a quien puntuar.',
    ratePoints: 'Puntos', rateNote: 'Nota (opcional)', rateNotePh: 'Lo que quieras decirle…', rateSend: 'Enviar puntuación',
    ratePick: 'Elige de 0 a 10', rateSaved: 'Puntuación guardada. Se verá cuando se publique el ranking.', rateAlready: 'Ya le has puntuado en este periodo',
    ratePubTitle: 'Puntuaciones del periodo',
    // Fotos de una vez
    photoOnceSend: 'Enviar foto (se ve una vez)', photoOnceSent: 'Foto enviada · se ve una vez', photoOpened: 'Foto abierta',
    photoOnceOpen: 'Ver foto (una vez)', photoOnceNote: 'Esta foto solo se puede ver una vez. Al cerrarla ya no se podrá abrir.',
    photoAlready: 'Esa foto ya se ha visto', photoSending: 'Enviando foto…',
    // Notas de voz
    recStart: 'Grabar nota de voz', recHint: 'Toca el micro para enviar', recUnsupported: 'Este navegador no puede grabar audio',
    recDenied: 'Sin permiso para usar el micrófono',
    // Stickers
    stkSave: 'Guardar sticker', stkSaved: 'Sticker guardado', stkImport: 'Importar', stkEmpty: 'Aún no tienes stickers. Importa imágenes o guarda los que te envíen.',
    stkPaste: 'O pega aquí un sticker copiado', stkImported: 'Stickers añadidos: {n}', stkNone: 'No se ha encontrado ninguna imagen', stkFull: 'No queda espacio para más stickers',
    stkWaTitle: 'Traer stickers de WhatsApp',
    stkWaHint: 'Android: los stickers están en Archivos → WhatsApp → Media → WhatsApp Stickers (.webp); pulsa «Importar» y elige varios a la vez. iPhone: en WhatsApp mantén pulsado el sticker → Copiar y pégalo en la casilla de arriba. También puedes guardar cualquier sticker que te envíen en KeepGoing.'
  };
  const en = {
    liveBand: 'Live challenge', reqPending: 'Requests',
    chatPrevPhoto: 'Photo', chatPrevAudio: 'Voice note',
    reqJoinTitle: 'Join with an ID', reqJoinSub: 'Ask to join a group with its ID. The leader or a co-leader approves it.',
    reqJoinHint: 'The ID is on the group profile. You’ll see the group chat once you’re accepted.',
    reqSend: 'Send request', reqSent: 'Request sent to {name}', reqNoGroup: 'No group has that ID',
    reqAlready: 'You’re already in that group', reqTitle: 'Requests to join ({n})',
    sys_join_request: '🆔 {name} wants to join the group',
    gPicChange: 'Change the group photo', gPicRemove: 'Remove photo', gPicRemoveQ: 'Remove the group photo?',
    gLinkHabit: 'Add “{name}” to your habits', gLinkProject: 'Add “{name}” to your projects',
    gLinkSub: 'That way your progress counts in the group’s ranking and stats.',
    gLinkHabits: '{n} of the project’s habits are missing from your board', gHabitsAdded: '{n} habits added to the project',
    pvHabits: 'Linked habits', chatView: 'View',
    gUpgrade: 'Turn into a group with ranking', gUpgradeSub: 'The chat gets a project or habit, an ID, stats, challenges and a ranking. Messages and members stay.',
    gUpgradeBtn: 'Convert', gUpgradePick: 'Choose what you’ll do together. Everyone else will be offered to add it to their board.',
    gUpgradeNone: 'First create a project or habit that isn’t already in another group.',
    gUpgradeQ: 'Turn this chat into a “{name}” group? This can’t be undone.', gUpgraded: 'It’s now a group with ranking',
    sys_upgraded: '🏆 The chat is now a “{name}” group with ranking',
    rateTitle: 'Rate your teammates', rateHint: 'From 0 to 10, once per period. Ratings and notes are posted in the chat when the ranking closes and add to the final score.',
    rateBtn: 'Rate', rateDone: 'Rated', rateNobody: 'There’s nobody else to rate.',
    ratePoints: 'Points', rateNote: 'Note (optional)', rateNotePh: 'Anything you want to tell them…', rateSend: 'Send rating',
    ratePick: 'Pick from 0 to 10', rateSaved: 'Rating saved. It will show when the ranking is posted.', rateAlready: 'You already rated them this period',
    ratePubTitle: 'Ratings for the period',
    photoOnceSend: 'Send photo (view once)', photoOnceSent: 'Photo sent · view once', photoOpened: 'Photo opened',
    photoOnceOpen: 'View photo (once)', photoOnceNote: 'This photo can only be viewed once. After closing it, it can’t be opened again.',
    photoAlready: 'That photo has already been viewed', photoSending: 'Sending photo…',
    recStart: 'Record voice note', recHint: 'Tap the mic to send', recUnsupported: 'This browser can’t record audio',
    recDenied: 'No permission to use the microphone',
    stkSave: 'Save sticker', stkSaved: 'Sticker saved', stkImport: 'Import', stkEmpty: 'No stickers yet. Import images or save the ones people send you.',
    stkPaste: 'Or paste a copied sticker here', stkImported: 'Stickers added: {n}', stkNone: 'No image found', stkFull: 'No room left for more stickers',
    stkWaTitle: 'Bring stickers from WhatsApp',
    stkWaHint: 'Android: stickers are in Files → WhatsApp → Media → WhatsApp Stickers (.webp); tap “Import” and pick several at once. iPhone: in WhatsApp press and hold the sticker → Copy and paste it into the box above. You can also save any sticker someone sends you in KeepGoing.'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
