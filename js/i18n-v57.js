/* KeepGoing — textos de la v1.57: una sola ventana para crear, metas totales, adelantar al siguiente periodo y vistas
   Lista y Checklist en Hábitos (ES / EN). */
(function () {
  const es = {
    wn_1_57_0_1: 'Crear todo desde una sola ventana|El «+» abre una ventana única. Pones nombre, icono y color y eliges qué quieres conseguir: Repetir algo, Llegar a una cifra, Completar pasos o Dejar algo. El plazo, el recordatorio, la carpeta y el resto de opciones están en la misma ventana.',
    wn_1_57_0_2: 'Metas con cifra total|«Llegar a una cifra» suma cada registro hasta la meta (por ejemplo, exportar 50 GB poco a poco). La tarjeta enseña una barra con lo que llevas y, al llegar, te llevas una carta y puedes empezar otra vez.',
    wn_1_57_0_3: 'Adelantar al siguiente periodo|Si ya habías cumplido el día, la semana o el mes y vuelves a marcar, un aviso te deja pasar lo que sobra al siguiente periodo. Por ejemplo, una segunda inversión de la semana cuenta para la semana que viene. Se puede deshacer.',
    wn_1_57_0_4: 'Vistas Lista y Checklist|En «Todo» eliges cómo ver tus hábitos: Tarjetas, Lista (una fila con el progreso, la racha y el % de 30 días) o Checklist (casillas para marcar rápido, separadas en pendientes y hechos).',
    advQ: 'Ya habías cumplido este periodo',
    advNextDay: 'Pasar a mañana', advNextWeek: 'Pasar a la próxima semana', advNextMonth: 'Pasar al próximo mes',
    advDone: 'Adelantado al {d}', advUndo: 'Deshacer', advIn: '{n} adelantado',
    goalReached: '¡Meta lograda!', goalReachedMsg: 'Has llegado a la meta de «{name}».', goalTotalLbl: 'en total',
    goalAgain: 'Otra vez', goalAgainToast: 'La meta vuelve a empezar desde cero',
    goalTotalField: 'Meta total (opcional)', goalTotalPh: 'Ej.: 50', goalTotalHint: 'Cada registro suma. Al llegar a la cifra, el hábito se da por logrado.',
    goalTotalNow: 'Llevas {a} de {b} {u}', goalLeft: 'quedan {n} días', tlMkGoal: 'Meta lograda: {n}',
    crWhat: '¿Qué quieres conseguir?', crNamePh: 'Ponle nombre (ej.: Exportar archivos)',
    crK_repeat: 'Repetir algo', crK_repeat_ex: 'Leer cada día, gimnasio 3 veces por semana',
    crK_amount: 'Llegar a una cifra', crK_amount_ex: 'Exportar 50 GB, ahorrar 1.000 €, pesar 72 kg',
    crK_steps: 'Completar pasos', crK_steps_ex: 'Aprender un idioma: A1, A2, B1…',
    crK_quit: 'Dejar algo', crK_quit_ex: 'Tabaco, redes antes de dormir',
    crHowOften: 'Cada cuánto', crTimesPer: 'veces por {p}', crWithAmt: 'Con cantidad', crWithAmtHint: 'Por ejemplo, 2 L de agua o 5 km.',
    crAmtHow: 'Cómo lo apuntas', crSumYes: 'Cada registro suma', crSumNo: 'Anoto el valor actual',
    crSumYesHint: 'Vas sumando hasta llegar (50 GB exportados, 1.000 € ahorrados…).', crSumNoHint: 'Apuntas cómo vas cada vez (tu peso, tu nivel…). Se guarda como proyecto.',
    crTotal: 'Meta total', crAlready: 'Ya llevo', crRhythm: 'Ritmo mínimo', crRhythmPh: 'Ej.: 5', crRhythmHint: 'Lo mínimo que quieres sumar en cada periodo para no perder la racha. Si lo dejas vacío, será una décima parte de la meta.',
    crSteps: 'Pasos', crQuitWhat: 'Dejar algo',
    crDeadline: 'Fecha límite', crChallenge: 'Hacerlo reto', crOn: 'Sí',
    crAlso: 'También:', crCreate: 'Crear', crNeedName: 'Ponle un nombre', crNeedTotal: 'Escribe la cifra a la que quieres llegar', crNeedSteps: 'Añade al menos un paso', crCreated: '«{name}» creado',
    layTitle: 'Ver como', layCards: 'Tarjetas', layList: 'Lista', layCheck: 'Checklist', layDays: 'días',
    layAllDone: 'Todo hecho por hoy', layPending: 'Pendientes', layDone: 'Hechos', layNotToday: 'Hoy no toca'
  };
  const en = {
    wn_1_57_0_1: 'Create everything from one window|The "+" opens a single window. Give it a name, icon and colour and choose what you want: Repeat something, Reach a number, Complete steps or Quit something. Deadline, reminder, folder and every other option are in the same window.',
    wn_1_57_0_2: 'Goals with a total|"Reach a number" adds up every entry until the goal (for example, export 50 GB bit by bit). The card shows a bar with your progress and, when you get there, you earn a card and can start again.',
    wn_1_57_0_3: 'Carry over to the next period|If you had already completed the day, week or month and tick again, a notice lets you move the extra to the next period. For example, a second investment this week counts for next week. It can be undone.',
    wn_1_57_0_4: 'List and Checklist views|In "All" you choose how to see your habits: Cards, List (one row with progress, streak and 30-day %) or Checklist (boxes to tick quickly, split into to-do and done).',
    advQ: 'You had already completed this period',
    advNextDay: 'Move to tomorrow', advNextWeek: 'Move to next week', advNextMonth: 'Move to next month',
    advDone: 'Carried over to {d}', advUndo: 'Undo', advIn: '{n} carried over',
    goalReached: 'Goal reached!', goalReachedMsg: 'You reached your goal for "{name}".', goalTotalLbl: 'in total',
    goalAgain: 'Again', goalAgainToast: 'The goal starts again from zero',
    goalTotalField: 'Total goal (optional)', goalTotalPh: 'E.g. 50', goalTotalHint: 'Every entry adds up. When you reach the number, the habit is done.',
    goalTotalNow: '{a} of {b} {u} so far', goalLeft: '{n} days left', tlMkGoal: 'Goal reached: {n}',
    crWhat: 'What do you want to achieve?', crNamePh: 'Name it (e.g. Export files)',
    crK_repeat: 'Repeat something', crK_repeat_ex: 'Read every day, gym 3 times a week',
    crK_amount: 'Reach a number', crK_amount_ex: 'Export 50 GB, save €1,000, weigh 72 kg',
    crK_steps: 'Complete steps', crK_steps_ex: 'Learn a language: A1, A2, B1…',
    crK_quit: 'Quit something', crK_quit_ex: 'Smoking, social media before bed',
    crHowOften: 'How often', crTimesPer: 'times per {p}', crWithAmt: 'With an amount', crWithAmtHint: 'For example, 2 L of water or 5 km.',
    crAmtHow: 'How you log it', crSumYes: 'Each entry adds up', crSumNo: 'I log the current value',
    crSumYesHint: 'You add up until you get there (50 GB exported, €1,000 saved…).', crSumNoHint: 'You note where you are each time (your weight, your level…). Saved as a project.',
    crTotal: 'Total goal', crAlready: 'Already have', crRhythm: 'Minimum pace', crRhythmPh: 'E.g. 5', crRhythmHint: 'The least you want to add each period to keep your streak. If empty, it is a tenth of the goal.',
    crSteps: 'Steps', crQuitWhat: 'Quit something',
    crDeadline: 'Deadline', crChallenge: 'Make it a challenge', crOn: 'Yes',
    crAlso: 'Also:', crCreate: 'Create', crNeedName: 'Give it a name', crNeedTotal: 'Type the number you want to reach', crNeedSteps: 'Add at least one step', crCreated: '"{name}" created',
    layTitle: 'View as', layCards: 'Cards', layList: 'List', layCheck: 'Checklist', layDays: 'days',
    layAllDone: 'All done for today', layPending: 'To do', layDone: 'Done', layNotToday: 'Not today'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
