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
    shareSent: 'Enviado', chatPrevCard: 'Imagen compartida', saveImageBtn: 'Guardar imagen',
    // Otra moneda: convertir o dejar en su moneda
    rgKeepCur: 'En su moneda', rgConvMain: 'Convertir', rgCurHint: '«En su moneda» los apunta en esa moneda con el cambio a tu moneda principal (se ve el original). «Convertir» los guarda ya convertidos. También puedes ignorarlos.',
    fxStoreAria: 'Cómo guardarlo', fxKeepCur: 'Dejar en {c}', fxConvMain: 'Convertir a {m}',
    // Hábitos: objetivos, maneras y Continuidad
    subModeLbl: 'Cómo se cumple', subSimple: 'Simple', subGoals: 'Varios objetivos', subWays: 'Varias maneras',
    subHint_simple: 'Un solo objetivo: las veces que elijas.', subHint_goals: 'Hay que cumplir todos los objetivos para que cuente. Ej.: cepillarse 1 vez y pasar el hilo 1 vez.',
    subHint_ways: 'Vale cualquiera de las acciones y se guarda cuál hiciste. Ej.: Estudiar → Matemáticas, Finanzas o Filosofía.',
    subGoalPh: 'Ej.: Pasar el hilo', subGoalName: 'Nombre del objetivo', subGoalTimes: 'Veces al día', subAddGoal: 'Añadir objetivo',
    subWayPh: 'Ej.: Matemáticas', subWayName: 'Nombre de la acción', subAddWay: 'Añadir acción', subWaysTarget: 'Acciones distintas necesarias',
    subNeedGoal: 'Escribe al menos un objetivo', subNeedWays: 'Escribe al menos dos acciones',
    subGoalsN: '{a}/{b} objetivos', subWaysPick: 'Elige qué hiciste', subGoalsHint: 'Marca las veces de cada objetivo. Cuenta cuando están todos.',
    subWaysHint: 'Toca lo que hiciste. Con {n} ya cuenta.', subDone: 'Hábito cumplido', subNotYet: 'Aún no está cumplido',
    // Patrimonio actual
    woEyebrow: 'Patrimonio actual', woSince: 'Desde el {d}: {v}', woNoBase: 'Aún no has puesto tus saldos reales: se cuenta desde 0 con lo apuntado.',
    woSetBase: 'Poner mis saldos reales', woEditBase: 'Punto de partida', woProjEyebrow: 'Desglose y ritmo', woStart: 'Punto de partida',
    woPace: 'Al ritmo de los últimos 3 meses ({net} al mes e {inv} invertidos al mes), dentro de 12 meses tendrías unos {y}.',
    woTrajEyebrow: 'Trayectoria real', woGraph: 'Patrimonio hasta la fecha', woGraphInv: 'Invertido hasta la fecha', woSerReal: 'Patrimonio', woInvested: 'Invertido',
    woCompare: 'Comparar', woCmpPick: 'Proyecciones guardadas', woOneChart: 'En el mismo gráfico', woTwoCharts: 'Dos gráficos', woProjOf: 'Proyección: {name}',
    woNoProjs: 'Aún no tienes proyecciones guardadas. Guárdalas en la calculadora → Proyecciones.',
    woBaseTitle: 'Punto de partida de la Libreta', woBaseHint: 'Lo que tenías de verdad al empezar ese día (en {m}). Desde ahí se suman tus ingresos y se restan tus gastos. No depende de la calculadora.',
    woBaseFine: 'Los movimientos en efectivo mueven el efectivo; el resto, la cuenta digital. Una inversión pasa dinero a «invertido» sin cambiar el total.',
    woBadDate: 'Elige una fecha de hoy o anterior', woApply: 'Aplicar datos de la Libreta actual',
    woApplyQ: 'Se copiarán al punto de partida de la calculadora tus cifras de hoy: cuenta digital {d}, efectivo {c} e invertido {i}, y tus ingresos y gastos medios. La Libreta no cambia. ¿Seguir?',
    woApplied: 'Datos de la Libreta aplicados', woFundName: 'Invertido (Libreta)', woNeedDest: 'Para pasar lo invertido, crea antes un destino de inversión',
    contTitle: 'Continuidad', contHint: 'Si cambias las veces, los días, los objetivos o las maneras, los días pasados se quedan con la regla anterior y la nueva cuenta desde hoy. Apágalo para recalcular todo el historial.'
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
    shareSent: 'Sent', chatPrevCard: 'Shared image', saveImageBtn: 'Save image',
    rgKeepCur: 'In its currency', rgConvMain: 'Convert', rgCurHint: '“In its currency” logs them in that currency with the rate to your main currency (the original is shown). “Convert” stores them already converted. You can also ignore them.',
    fxStoreAria: 'How to store it', fxKeepCur: 'Keep in {c}', fxConvMain: 'Convert to {m}',
    subModeLbl: 'How it is done', subSimple: 'Simple', subGoals: 'Several goals', subWays: 'Several ways',
    subHint_simple: 'One goal: the times you choose.', subHint_goals: 'Every goal must be done for it to count. E.g. brush once and floss once.',
    subHint_ways: 'Any of the actions counts and the one you did is saved. E.g. Study → Maths, Finance or Philosophy.',
    subGoalPh: 'E.g. Floss', subGoalName: 'Goal name', subGoalTimes: 'Times per day', subAddGoal: 'Add goal',
    subWayPh: 'E.g. Maths', subWayName: 'Action name', subAddWay: 'Add action', subWaysTarget: 'Different actions needed',
    subNeedGoal: 'Write at least one goal', subNeedWays: 'Write at least two actions',
    subGoalsN: '{a}/{b} goals', subWaysPick: 'Choose what you did', subGoalsHint: 'Mark the times of each goal. It counts when all are done.',
    subWaysHint: 'Tap what you did. {n} is enough.', subDone: 'Habit done', subNotYet: 'Not done yet',
    woEyebrow: 'Current net worth', woSince: 'Since {d}: {v}', woNoBase: 'You have not set your real balances yet: it counts from 0 with what you logged.',
    woSetBase: 'Set my real balances', woEditBase: 'Starting point', woProjEyebrow: 'Breakdown and pace', woStart: 'Starting point',
    woPace: 'At the pace of the last 3 months ({net} a month and {inv} invested a month), in 12 months you would have about {y}.',
    woTrajEyebrow: 'Real path', woGraph: 'Net worth to date', woGraphInv: 'Invested to date', woSerReal: 'Net worth', woInvested: 'Invested',
    woCompare: 'Compare', woCmpPick: 'Saved projections', woOneChart: 'Same chart', woTwoCharts: 'Two charts', woProjOf: 'Projection: {name}',
    woNoProjs: 'You have no saved projections yet. Save them in the calculator → Projections.',
    woBaseTitle: 'Ledger starting point', woBaseHint: 'What you really had at the start of that day (in {m}). Your income is added and your expenses subtracted from there. It does not depend on the calculator.',
    woBaseFine: 'Cash entries move your cash; the rest, your digital account. An investment moves money to “invested” without changing the total.',
    woBadDate: 'Choose today or an earlier date', woApply: 'Apply current Ledger data',
    woApplyQ: 'Your figures of today will be copied to the calculator starting point: digital account {d}, cash {c} and invested {i}, plus your average income and expenses. The Ledger does not change. Continue?',
    woApplied: 'Ledger data applied', woFundName: 'Invested (Ledger)', woNeedDest: 'To move what you invested, create an investment destination first',
    contTitle: 'Continuity', contHint: 'If you change the times, days, goals or ways, past days keep the old rule and the new one counts from today. Turn it off to recalculate the whole history.'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
