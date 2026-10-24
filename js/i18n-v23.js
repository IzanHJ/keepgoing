/* KeepGoing — textos de la v1.23: Inversión, desglose del CSV, Patrimonio actual, hábitos con objetivos o maneras,
   Continuidad, Rutinas, categorías y tipos de turno y Compartir por el chat (ES / EN). Las listas van separadas por «|». */
(function () {
  const es = {
    // Libreta: tipo Inversión
    ledgerInvestOne: 'Inversión', ctype_invest: 'Inversión', catInvest: 'Inversión', ledgerInvest: 'Inversiones',
    ledgerCatNew: 'Movimiento', ledgerInvested: 'Invertido',
    // «Registrar»: desglosar
    rgSplit: 'Desglosar ({n})', rgSplitHide: 'Ocultar el desglose', rgOwnN: '{n} por separado', rgAsGroup: 'Grupo', rgNote_deposit: 'Depósito', rgNote_withdrawal: 'Retirada',
    rgWhatRest: '¿Qué son los otros {n}?', rgAllOwn: 'Todos los movimientos de este grupo tienen su propia respuesta.',
    rgMoreRows: 'Y {n} más (siguen la respuesta del grupo).',
    // Cambios sin guardar
    unsavedTitle: 'Vas a cerrar sin guardar los cambios', unsavedSub: 'Si cierras, se perderá lo que has cambiado.',
    unsavedClose: 'Cerrar', unsavedSave: 'Guardar cambios y salir',
    // Compartir por el chat
    shareToChat: 'Enviar por el chat', shareToChatSub: 'A un grupo o a un amigo de la app', shareOut: 'Compartir fuera o guardar',
    shareOutSub: 'Otras apps del móvil, o descargar la imagen', shareNoChats: 'Aún no tienes chats. Añade amigos o crea un grupo en la pestaña Chat.',
    shareSent: 'Enviado', chatPrevCard: 'Imagen compartida', saveImageBtn: 'Guardar imagen'
  };
  const en = {
    ledgerInvestOne: 'Investment', ctype_invest: 'Investment', catInvest: 'Investment', ledgerInvest: 'Investments',
    ledgerCatNew: 'Entry type', ledgerInvested: 'Invested',
    rgSplit: 'Break down ({n})', rgSplitHide: 'Hide breakdown', rgOwnN: '{n} separately', rgAsGroup: 'Group', rgNote_deposit: 'Deposit', rgNote_withdrawal: 'Withdrawal',
    rgWhatRest: 'What are the other {n}?', rgAllOwn: 'Every entry in this group has its own answer.',
    rgMoreRows: 'And {n} more (they follow the group’s answer).',
    unsavedTitle: 'You are closing without saving your changes', unsavedSub: 'If you close, what you changed will be lost.',
    unsavedClose: 'Close', unsavedSave: 'Save changes and exit',
    shareToChat: 'Send in chat', shareToChatSub: 'To a group or a friend in the app', shareOut: 'Share outside or save',
    shareOutSub: 'Other apps on your phone, or download the image', shareNoChats: 'You have no chats yet. Add friends or create a group in the Chat tab.',
    shareSent: 'Sent', chatPrevCard: 'Shared image', saveImageBtn: 'Save image'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
