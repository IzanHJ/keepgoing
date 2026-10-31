/* KeepGoing — textos de la v1.29: Glassformismo, pantallas inmersivas, primer registro de cada pestaña,
   adiós a las mascotas y a la energía, grupos con ranking siempre (ES / EN). */
(function () {
  const es = {
    styleGlass: 'Glass (cristal)',
    first_habits: '¡Tu primer hábito!', firstSub_habits: 'Empieza la racha. Tócalo cada día que lo cumplas.',
    first_projects: '¡Tu primer proyecto!', firstSub_projects: 'Junta hábitos y metas en una misma carpeta y míralos crecer.',
    first_cal: '¡Primer turno en Organización!', firstSub_cal: 'Tu semana empieza a tomar forma. Pinta más días deslizando.',
    first_ledger: '¡Primer movimiento en la Libreta!', firstSub_ledger: 'Cada euro apuntado es un euro que controlas.',
    first_chat: '¡Primer mensaje!', firstSub_chat: 'Con compañía cuesta menos seguir.',
    first_journal: '¡Primera página del diario!', firstSub_journal: 'Tu semana ya tiene historia.',
    first_rate: '¡Primer día valorado!', firstSub_rate: 'Valora cada noche y verás cómo cambian tus semanas.',
    rateAvg: 'Valoración media',
    insRateUp: 'Los días que haces {h} los valoras con {a} frente a {b}.', insRateDown: 'Los días que haces {h} los valoras peor: {a} frente a {b}.',
    insRateWeekUp: 'Tu valoración media esta semana ({a}) es mejor que la anterior ({b}).', insRateWeekDown: 'Tu valoración media esta semana ({a}) es más baja que la anterior ({b}).',
    secd_energy5: '7 días seguidos valorados con 9 o más.',
    wn_1_29_0_1: 'Glassformismo|Nuevo estilo de cristal sobre un espacio profundo con auroras y estrellas. Elígelo en Ajustes → Tema → Estilo, o con los temas Nebulosa, Portal y Cristal.',
    wn_1_29_0_2: 'Perfil a pantalla completa|Se abre como el día perfecto: un círculo de tu color llena la pantalla y tus cifras cuentan.',
    wn_1_29_0_3: 'Cartas que cobran vida|Al abrir una carta o maestría, vuela desde su miniatura, aparece un halo con chispas y se inclina con el dedo. Ahora sale centrada en el móvil.',
    wn_1_29_0_4: 'Primer registro|La primera vez que apuntas algo en cada pestaña lo celebras a pantalla completa.',
    wn_1_29_0_5: 'Grupos con ranking|Todos los grupos nacen con ranking semanal; ya no hace falta activarlo.',
    wn_1_29_0_6: 'Adiós a la mascota y a la energía|La valoración del día ocupa su lugar en «Hoy», en los descubrimientos y en la insignia «A tope».'
  };
  const en = {
    styleGlass: 'Glass',
    first_habits: 'Your first habit!', firstSub_habits: 'The streak starts now. Tap it every day you do it.',
    first_projects: 'Your first project!', firstSub_projects: 'Group habits and goals in one folder and watch them grow.',
    first_cal: 'First shift in Planner!', firstSub_cal: 'Your week is taking shape. Paint more days by swiping.',
    first_ledger: 'First entry in the Ledger!', firstSub_ledger: 'Every euro you log is a euro you control.',
    first_chat: 'First message!', firstSub_chat: 'Keeping going is easier together.',
    first_journal: 'First journal page!', firstSub_journal: 'Your week now has a story.',
    first_rate: 'First day rated!', firstSub_rate: 'Rate every night and watch your weeks change.',
    rateAvg: 'Average rating',
    insRateUp: 'On days you do {h} you rate them {a} vs {b}.', insRateDown: 'On days you do {h} you rate them lower: {a} vs {b}.',
    insRateWeekUp: 'Your average rating this week ({a}) is better than last week ({b}).', insRateWeekDown: 'Your average rating this week ({a}) is lower than last week ({b}).',
    secd_energy5: '7 days in a row rated 9 or more.',
    wn_1_29_0_1: 'Glassmorphism|A new glass style over deep space with auroras and stars. Pick it in Settings → Theme → Style, or with the Nebula, Portal and Crystal themes.',
    wn_1_29_0_2: 'Full-screen profile|It opens like the perfect day: a circle in your colour fills the screen and your numbers count up.',
    wn_1_29_0_3: 'Cards come alive|Opening a card or mastery flies it from its thumbnail, with a halo, sparks and tilt. Now centred on phones.',
    wn_1_29_0_4: 'First entry|The first time you log something in each tab, you celebrate it full screen.',
    wn_1_29_0_5: 'Groups with ranking|Every group starts with a weekly ranking; no need to turn it on.',
    wn_1_29_0_6: 'Goodbye pet and energy|The day rating takes their place in Today, insights and the “Full power” badge.'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
