/* KeepGoing — textos de la v1.60: el Gimnasio pasa a ser Entrenamiento y registra deportes (ES / EN). */
(function () {
  const es = {
    gyTab: 'Entrenamiento', gyFree: 'Sesión de gimnasio',
    gySexHint: 'Elige el cuerpo que verás en el mapa de músculos y en las figuras de los deportes.',
    spGym: 'Gimnasio', spGymSub: 'Pesas, rutinas y series', spAllSports: 'Deportes', spSports: 'Deportes', spPickT: '¿Qué vas a entrenar?',
    spModeNow: 'Empezar ahora', spModeLog: 'Registrar uno hecho', spGymNoLog: 'El gimnasio se registra en directo, serie a serie. Elige un deporte para apuntar uno ya hecho.',
    spMoreSoon: 'Pronto habrá más deportes.', spTime: 'Tiempo', spMinutes: 'Minutos', spLiveHint: 'Cuando acabes, toca Terminar: podrás ajustar la hora de inicio y fin, marcar si fue partido y añadir notas.',
    spCloseT: 'Cerrar entrenamiento', spEditT: 'Editar entrenamiento', spEdit: 'Editar', spDate: 'Fecha',
    spType: 'Tipo', spFree: 'Entrenamiento libre', spEvents: 'Evento importante', spResult: 'Resultado (opcional)',
    spUs: 'Nosotros', spThem: 'Rivales', spScore: 'Marcador', spOutcome: 'Resultado', spOut_w: 'Victoria', spOut_d: 'Empate', spOut_l: 'Derrota',
    spPos: 'Puesto', spKm: 'Distancia', spElev: 'Desnivel', spWaves: 'Olas', spPts: 'Puntuación', spJumps: 'Saltos', spAlt: 'Altura',
    spNotes: 'Notas modulares', spNewNote: 'Nueva', spNotesHint: 'Son las mismas notas de Organización: se guardan en ese día, a la hora del entrenamiento.',
    spComments: 'Comentarios', spCommentsPh: '¿Cómo ha ido? Sensaciones, rivales, qué mejorar…',
    spBadTime: 'Revisa las horas: el entrenamiento no puede durar más de 24 horas.', spFuture: 'Ese entrenamiento todavía no ha empezado.',
    spSaved: 'Entrenamiento guardado', spDoneT: '¡{s} completado!', spDeleteQNotes: '¿Borrar este entrenamiento? Sus notas modulares también se borrarán de Organización.',
    wn_1_60_0_1: 'Gimnasio ahora es Entrenamiento|La séptima luna cambia de nombre porque ya no es solo gimnasio: también puedes registrar deportes.',
    wn_1_60_0_2: '18 deportes con su figura|Fútbol, baloncesto, pádel, running, natación, kárate, paracaidismo y más. Cada uno tiene una figura en su postura con los músculos que trabaja iluminados con tu color.',
    wn_1_60_0_3: 'Partidos y eventos importantes|Al cerrar, marca si fue entrenamiento libre y/o partido, los eventos importantes (gol, carrera, KO, cumbre…) y el resultado: marcador, km, puesto…',
    wn_1_60_0_4: 'Cierra con tus horas, notas y comentarios|Al terminar puedes cambiar a mano la hora de inicio y fin, añadir notas modulares de Organización (o crear una nueva ahí mismo) y escribir comentarios. También sirve para el gimnasio.'
  };
  const en = {
    gyTab: 'Training', gyFree: 'Gym session',
    gySexHint: 'Choose the body you will see on the muscle map and in the sport figures.',
    spGym: 'Gym', spGymSub: 'Weights, routines and sets', spAllSports: 'Sports', spSports: 'Sports', spPickT: 'What are you training?',
    spModeNow: 'Start now', spModeLog: 'Log a past one', spGymNoLog: 'Gym sessions are logged live, set by set. Pick a sport to log one you already did.',
    spMoreSoon: 'More sports coming soon.', spTime: 'Time', spMinutes: 'Minutes', spLiveHint: 'When you finish, tap Finish: you can adjust the start and end time, mark it as a match and add notes.',
    spCloseT: 'Close training', spEditT: 'Edit training', spEdit: 'Edit', spDate: 'Date',
    spType: 'Type', spFree: 'Free training', spEvents: 'Big moment', spResult: 'Result (optional)',
    spUs: 'Us', spThem: 'Them', spScore: 'Score', spOutcome: 'Result', spOut_w: 'Win', spOut_d: 'Draw', spOut_l: 'Loss',
    spPos: 'Position', spKm: 'Distance', spElev: 'Elevation', spWaves: 'Waves', spPts: 'Score', spJumps: 'Jumps', spAlt: 'Altitude',
    spNotes: 'Modular notes', spNewNote: 'New', spNotesHint: 'These are the same notes as in Organisation: they are saved on that day, at the training time.',
    spComments: 'Comments', spCommentsPh: 'How did it go? Feelings, opponents, what to improve…',
    spBadTime: 'Check the times: a training cannot last more than 24 hours.', spFuture: 'That training has not started yet.',
    spSaved: 'Training saved', spDoneT: '{s} done!', spDeleteQNotes: 'Delete this training? Its modular notes will also be removed from Organisation.',
    wn_1_60_0_1: 'Gym is now Training|The seventh moon has a new name because it is no longer just the gym: you can log sports too.',
    wn_1_60_0_2: '18 sports with their own figure|Football, basketball, padel, running, swimming, karate, skydiving and more. Each has a figure in its pose with the muscles it works lit up in your colour.',
    wn_1_60_0_3: 'Matches and big moments|When closing, mark it as free training and/or a match, the big moments (goal, race, KO, summit…) and the result: score, km, position…',
    wn_1_60_0_4: 'Close with your times, notes and comments|When you finish you can change the start and end time by hand, add Organisation modular notes (or create a new one right there) and write comments. Works for the gym too.'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
