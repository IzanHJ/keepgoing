/* KeepGoing — textos de la v1.14: modo edición (temblor y «−»), deslizar movimientos, tarta con porcentajes,
   compartir eventos y registro con mínimo de hábitos y @nametag (ES / EN) */
(function () {
  const es = {
    profileTapHint: 'Toca para ver tu perfil y tu @nametag',
    // Tarta y movimientos
    showPct: 'Porcentajes',
    swipeHint: 'Desliza un movimiento a la izquierda para editarlo o borrarlo',
    // Eventos: compartir
    evShare: 'Compartir', evShareTitle: 'Compartir evento',
    evShareFriend: 'Con un amigo, con importes', evShareFriendSub: 'Le llega cifrado de extremo a extremo, como una Libreta compartida.',
    evShareChat: 'En un chat o grupo, sin importes', evShareChatSub: 'Solo se envían el nombre, las fechas y las categorías. Los importes nunca se comparten con grupos.',
    evShared: 'Evento compartido', evNoChats: 'Todavía no tienes chats ni grupos.',
    evSharedCard: 'Evento', evAddMine: 'Añadir a mi Libreta', evAddNeedOpen: 'Abre tu Libreta para añadir el evento',
    evAdded: 'Evento añadido a tu Libreta',
    // Modo edición
    jigRemove: 'Quitar', jigDone: 'Listo', jigHidden: 'Oculto. Puedes recuperarlo en Ajustes → Widgets ocultos',
    jigRetoQ: '¿Quitar el reto de «{name}»? Lo demás se mantiene.', jigRetoGone: 'Reto quitado',
    jigChatQ: '¿Salir del grupo «{name}»?', jigDmQ: '¿Borrar el chat con {name}?',
    hwTitle: 'Widgets ocultos', hwN: '{n} ocultos', hwNone: 'No has ocultado nada.', hwRestore: 'Recuperar', hwRestored: 'Recuperado',
    hwHint: 'Mantén pulsado cualquier widget y toca el «−» para quitarlo. Los que solo se ocultan aparecen aquí.',
    hw_pet: 'Mascota', hw_energy: 'Energía del día', hw_contract: 'Contrato', hw_insights: 'Descubrimientos', hw_reviews: 'Revisiones semanales',
    hw_ledPie: 'Tarta de la Libreta', hw_ledLine: 'Evolución de la Libreta', hw_ledFilter: 'Filtro de la Libreta',
    // Registro
    obAddSubMin: 'Con el nivel {level} necesitas al menos {n} hábitos. Podrás añadir más cuando quieras.',
    obHabitsCount: '{n} de {m} hábitos mínimos', obNeedHabits: 'Te faltan {n} hábitos para el nivel {level}',
    obTagTitle: 'Tu @nametag', obTagSub: 'Es opcional. Sirve para que tus amigos te encuentren en el Chat.',
    obTagSkip: 'Saltar', obTagNeedAccount: 'Para tener un @nametag necesitas una cuenta. Puedes crearla ahora o más tarde.',
    obTagCreate: 'Crear cuenta o entrar'
  };
  const en = {
    profileTapHint: 'Tap to see your profile and your @nametag',
    showPct: 'Percentages',
    swipeHint: 'Swipe a transaction left to edit or delete it',
    evShare: 'Share', evShareTitle: 'Share event',
    evShareFriend: 'With a friend, with amounts', evShareFriendSub: 'End-to-end encrypted, like a shared Ledger.',
    evShareChat: 'In a chat or group, without amounts', evShareChatSub: 'Only the name, dates and categories are sent. Amounts are never shared with groups.',
    evShared: 'Event shared', evNoChats: 'You have no chats or groups yet.',
    evSharedCard: 'Event', evAddMine: 'Add to my Ledger', evAddNeedOpen: 'Open your Ledger to add the event',
    evAdded: 'Event added to your Ledger',
    jigRemove: 'Remove', jigDone: 'Done', jigHidden: 'Hidden. You can bring it back in Settings → Hidden widgets',
    jigRetoQ: 'Remove the challenge from “{name}”? Everything else stays.', jigRetoGone: 'Challenge removed',
    jigChatQ: 'Leave the group “{name}”?', jigDmQ: 'Delete the chat with {name}?',
    hwTitle: 'Hidden widgets', hwN: '{n} hidden', hwNone: 'Nothing hidden.', hwRestore: 'Restore', hwRestored: 'Restored',
    hwHint: 'Press and hold any widget and tap “−” to remove it. The ones that are only hidden show up here.',
    hw_pet: 'Pet', hw_energy: 'Today’s energy', hw_contract: 'Contract', hw_insights: 'Insights', hw_reviews: 'Weekly reviews',
    hw_ledPie: 'Ledger pie chart', hw_ledLine: 'Ledger trend', hw_ledFilter: 'Ledger filter',
    obAddSubMin: 'At the {level} level you need at least {n} habits. You can add more anytime.',
    obHabitsCount: '{n} of {m} minimum habits', obNeedHabits: 'You need {n} more habits for the {level} level',
    obTagTitle: 'Your @nametag', obTagSub: 'Optional. It lets your friends find you in Chat.',
    obTagSkip: 'Skip', obTagNeedAccount: 'You need an account to have a @nametag. You can create it now or later.',
    obTagCreate: 'Create account or sign in'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
