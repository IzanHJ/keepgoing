/* KeepGoing — textos de la v1.34: orbe que habla, resumen visual de hábitos y metas (ES / EN). */
(function () {
  const es = {
    orbKToday: 'Hoy', orbKGo: 'Ánimo', orbKKnow: '¿Sabías que?',
    orbTodaySum: 'Hoy llevas {d} de {t} hábitos. ¡A por el resto!', orbAllDone: 'Hoy ya has hecho los {t} hábitos. Día redondo.',
    orbMotiv: 'No hace falta que sea perfecto, solo que no pares.|Un día más cuenta más de lo que parece.|Lo pequeño, repetido, se vuelve enorme.|Hoy no compites con nadie más que con el tú de ayer.|La constancia gana a la motivación.|Si hoy cuesta, haz la versión mínima. También vale.|Nunca dos días seguidos sin hacerlo.|Vas más lejos de lo que crees.',
    knowWeekday: 'Tu mejor día es el {d}: cumples el {p} % de lo que te toca.', knowEntries: 'Llevas {n} registros desde el {d}.',
    knowBest: 'Tu mejor racha es de {n} días con «{h}».', knowPerfect: 'Has tenido {n} días perfectos.', knowActive: 'Has estado activo {n} días distintos.',
    knowRate: 'Esta semana tu día vale de media {v}/10.', knowGym: 'Este mes has entrenado {n} veces.',
    hsMet: 'metas cumplidas', hsGoals: 'Por meta', hsLess: 'Menos', hsMore: 'Más',
    wn_1_34_0_1: 'El orbe habla|Toca el orbe: sube al centro, las lunas giran a su alrededor y te cuenta cómo va tu día, te da ánimo y te descubre datos tuyos. Toca el bocadillo para pasar al siguiente.',
    wn_1_34_0_2: 'Tu recorrido, sin gráficas|En «Ver más» de un hábito o proyecto, todo el calendario se enciende día a día y cada meta suma +1 con su contador.',
    wn_1_34_0_3: 'Metas con camino|Las metas numéricas de los proyectos se ven como un camino del inicio a la meta, con cada registro como un paso.',
    wn_1_34_0_4: 'Iconos en vez de emoji|Toda la interfaz usa ya los iconos de línea de KeepGoing, y las listas entran con una cascada suave (respeta Ajustes → Animaciones).'
  };
  const en = {
    orbKToday: 'Today', orbKGo: 'Keep going', orbKKnow: 'Did you know?',
    orbTodaySum: 'You have done {d} of {t} habits today. Go for the rest!', orbAllDone: 'All {t} habits done today. A solid day.',
    orbMotiv: 'It doesn’t have to be perfect, it just has to keep going.|One more day counts more than it looks.|Small things, repeated, become huge.|Today you only compete with yesterday’s you.|Consistency beats motivation.|If today is hard, do the minimum version. It counts.|Never miss twice in a row.|You are going further than you think.',
    knowWeekday: 'Your best day is {d}: you complete {p}% of what’s due.', knowEntries: 'You have logged {n} times since {d}.',
    knowBest: 'Your best streak is {n} days with “{h}”.', knowPerfect: 'You have had {n} perfect days.', knowActive: 'You have been active on {n} different days.',
    knowRate: 'This week your days average {v}/10.', knowGym: 'You have trained {n} times this month.',
    hsMet: 'goals met', hsGoals: 'By goal', hsLess: 'Less', hsMore: 'More',
    wn_1_34_0_1: 'The orb talks|Tap the orb: it rises to the center, the moons circle around it and it tells you how your day is going, cheers you on and shares facts from your data. Tap the bubble for the next one.',
    wn_1_34_0_2: 'Your journey, no charts|In “See more” for a habit or project, the whole calendar lights up day by day and every goal adds +1 with its counter.',
    wn_1_34_0_3: 'Goals as a path|Numeric project goals show as a path from start to target, with each entry as a step.',
    wn_1_34_0_4: 'Icons instead of emoji|The whole interface now uses KeepGoing’s line icons, and lists come in with a soft cascade (follows Settings → Animations).'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
