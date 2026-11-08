/* KeepGoing — textos de la v1.52: Patrimonio desplegable, Comparar con la Proyección actual o varias guardadas,
   números de comparación y una sola gráfica de Ingresos y gastos con filtro (ES / EN). */
(function () {
  const es = {
    wn_1_52_0_1: 'Patrimonio más limpio|El Patrimonio actual y el Patrimonio proyectado de la Calculadora enseñan solo la cifra y su retorno. Toca «Ver detalles» para desplegar el desglose, tus inversiones y el gráfico. Se recuerda cómo lo dejaste.',
    wn_1_52_0_2: 'Comparar, a tu manera|En el Patrimonio actual, «Comparar» te deja elegir entre la Proyección actual (lo que tengas ahora en la Calculadora, guardado o no) y tus Proyecciones guardadas, con varias a la vez.',
    wn_1_52_0_3: 'Números que enseñan|Al comparar ves lo que la proyección esperaba para hoy, cuánto vas por delante o por detrás, tu ritmo frente al previsto, dónde acabarías a tu ritmo y cuándo llegarías a su final.',
    wn_1_52_0_4: 'Una sola gráfica|Fuera «Evolución» y «Filtrar por categoría y fechas»: ahora «Ingresos y gastos» tiene 12 meses, fechas a mano y filtro por categoría o evento, con sus totales.',
    foldMore: 'Ver detalles', foldLess: 'Ocultar detalles',
    ledDates: 'Fechas',
    woCurProj: 'Proyección actual', woCmpMulti: 'Puedes elegir varias.',
    woCurEmpty: 'La Calculadora está vacía. Pon tu punto de partida o fórmulas en la Calculadora para comparar.',
    woPerMonth: '{v}/mes',
    woStEyebrow: 'Lo real frente a lo previsto',
    woStExpected: 'Hoy la proyección esperaba', woStStart: 'La proyección empieza con', woStFinal: 'La proyección terminó con',
    woStYouHave: 'Tienes', woStAhead: 'Vas por delante', woStBehind: 'Vas por detrás',
    woStPaceProj: 'Ritmo previsto', woStPaceReal: 'Tu ritmo (últimos 3 meses)',
    woStAtEnd: 'A tu ritmo, el {d} tendrías', woStVsProj: '{v} frente a la proyección',
    woStReach: 'Llegar a {v}', woStReached: 'Ya lo has superado', woStNever: 'A tu ritmo actual no llegarías',
    woStReachAt: 'En {d}', woStOnTime: 'justo a tiempo', woStEarly: '{n} meses antes', woStLate: '{n} meses después',
    woTipShort: 'Para ir al ritmo de esta proyección te faltan unos {v} al mes entre ahorro y rentabilidad.',
    woTipAhead: 'Ahorras unos {v} al mes más de lo que esta proyección da por hecho. Si lo mantienes, llegarás antes.',
    woTipSame: 'Vas al mismo ritmo que la proyección: lo que planeaste se está cumpliendo.',
    woTipEnded: 'Esta proyección terminó el {d}: compara su final con lo que tienes hoy.',
    woStHint: 'Tu ritmo es la media de ingresos menos gastos de los últimos 3 meses completos; la proyección incluye además la rentabilidad que supusiste.'
  };
  const en = {
    wn_1_52_0_1: 'Cleaner net worth|Current net worth and the Calculator’s projected net worth now show just the figure and its return. Tap “See details” to open the breakdown, your investments and the chart. It remembers how you left it.',
    wn_1_52_0_2: 'Compare your way|In Current net worth, “Compare” lets you choose between the Current projection (whatever is in the Calculator now, saved or not) and your Saved projections, several at once.',
    wn_1_52_0_3: 'Numbers that teach|When comparing you see what the projection expected for today, how far ahead or behind you are, your pace versus the planned one, where you would end at your pace and when you would reach its final value.',
    wn_1_52_0_4: 'One chart|“Over time” and “Filter by category and dates” are gone: “Income and expenses” now has 12 months, custom dates and a category or event filter, with its totals.',
    foldMore: 'See details', foldLess: 'Hide details',
    ledDates: 'Dates',
    woCurProj: 'Current projection', woCmpMulti: 'You can pick several.',
    woCurEmpty: 'The Calculator is empty. Add your starting point or formulas in the Calculator to compare.',
    woPerMonth: '{v}/month',
    woStEyebrow: 'Real versus planned',
    woStExpected: 'Today the projection expected', woStStart: 'The projection starts with', woStFinal: 'The projection ended with',
    woStYouHave: 'You have', woStAhead: 'You are ahead by', woStBehind: 'You are behind by',
    woStPaceProj: 'Planned pace', woStPaceReal: 'Your pace (last 3 months)',
    woStAtEnd: 'At your pace, on {d} you would have', woStVsProj: '{v} versus the projection',
    woStReach: 'Reaching {v}', woStReached: 'You are already past it', woStNever: 'At your current pace you would not get there',
    woStReachAt: 'In {d}', woStOnTime: 'right on time', woStEarly: '{n} months early', woStLate: '{n} months late',
    woTipShort: 'To keep up with this projection you need about {v} more a month between savings and returns.',
    woTipAhead: 'You save about {v} a month more than this projection assumes. Keep it up and you will get there sooner.',
    woTipSame: 'You are on the same pace as the projection: your plan is working.',
    woTipEnded: 'This projection ended on {d}: compare its final value with what you have today.',
    woStHint: 'Your pace is the average of income minus expenses over the last 3 full months; the projection also includes the returns you assumed.'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
