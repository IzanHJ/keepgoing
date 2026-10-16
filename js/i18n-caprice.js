/* KeepGoing — textos de niveles de compromiso, puntos y Dinero Caprichable (ES / EN). Sustituyen a los de la antigua tienda. */
(function () {
  const es = {
    lvTitle: 'Nivel y Dinero Caprichable',
    ptsN: '{n} pts', ptsToday: 'Puntos de hoy', ptsTotal: 'Puntos totales', ptsEarned: 'Puntos ganados',
    ptsHow: 'Un día perfecto vale 10 puntos. Cada hábito cumplido vale 10 ÷ los hábitos que exige tu nivel (Chill 5, Serio 2,5 y Locked-In ≈1,43) y los días parciales suman su parte. Los hábitos a dejar cuentan por cada día limpio ya cerrado. Los puntos cuentan desde el {since}. Tu XP (puntos × 10) marca tu nivel.',
    commitd_chill: 'Chill: 2 hábitos al día. Cada uno vale 5 puntos (día perfecto = 10).',
    commitd_serio: 'Serio: 4 hábitos al día. Cada uno vale 2,5 puntos (día perfecto = 10).',
    commitd_locked: 'Locked-In: 7 hábitos al día. Cada uno vale ≈1,43 puntos (día perfecto = 10).',
    commitPending: 'Hoy sigues en {a}. {b} se aplica desde mañana; los días pasados no cambian.',
    capTitle: 'Dinero Caprichable', capBadge: 'Visual · no es real', capConverter: 'Conversor de Dinero Caprichable',
    capNotReal: 'Es dinero visual: lo que te concedes por cumplir tus hábitos. No se suma ni se descuenta de tu saldo real.',
    capToday: 'Hoy: {p} pts → {m}', capShort: '10 pts = {m}',
    capFormula: '10 puntos = Ingreso neto total × (porcentaje del nivel ÷ 100). Los cambios cuentan desde hoy y no recalculan días pasados.',
    capEditFor: 'Ajustar el porcentaje de', capSliderLabel: 'Porcentaje del nivel', capPctFor: 'Porcentaje de {l} (escríbelo a mano si quieres)',
    capAbove: 'Por encima de 1 %: se guarda tal cual y el marcador se queda antes del punto 1.',
    capBelow: 'Por debajo de 0,1 %: se guarda tal cual y el marcador se queda después del punto 3.',
    capPctInvalid: 'Escribe un porcentaje mayor que 0', capPreview: 'Vista previa', capIncome: 'Ingreso neto total',
    capEquals: '10 puntos equivalen a:', capCurrent: 'tu nivel',
    petCaprice: 'Llevas {m} de Dinero Caprichable. Date un capricho, te lo has ganado.', petPoints: 'Llevas {n} puntos. Sigue sumando.',
    legacyTitle: 'Datos de la antigua tienda de recompensas', legacySum: '{r} recompensas · {c} canjes · {s} ⭐ sin gastar',
    legacyWhy: 'La tienda se ha sustituido por el Dinero Caprichable. Estos datos usaban ⭐ y no tienen equivalencia directa, así que no se han convertido.',
    legacyRewards: 'Recompensas', legacyKept: 'No se ha borrado nada: siguen guardados en tu copia de datos y en la sincronización.',
    legacyNoticeTitle: 'Adiós a la tienda, hola Dinero Caprichable',
    legacyNotice: 'Tus puntos ahora se convierten en Dinero Caprichable. Algunos datos de la tienda antigua no encajan en el nuevo sistema; los hemos guardado sin tocarlos:',
    legacyOk: 'Entendido'
  };
  const en = {
    lvTitle: 'Level & Treat Money',
    ptsN: '{n} pts', ptsToday: "Today's points", ptsTotal: 'Total points', ptsEarned: 'Points earned',
    ptsHow: 'A perfect day is worth 10 points. Each completed habit is worth 10 ÷ the habits your level requires (Chill 5, Serious 2.5, Locked-In ≈1.43) and partial days add their share. Quit habits count for each closed clean day. Points count from {since}. Your XP (points × 10) sets your level.',
    commitd_chill: 'Chill: 2 habits a day. Each is worth 5 points (perfect day = 10).',
    commitd_serio: 'Serious: 4 habits a day. Each is worth 2.5 points (perfect day = 10).',
    commitd_locked: 'Locked-In: 7 habits a day. Each is worth ≈1.43 points (perfect day = 10).',
    commitPending: 'Today you stay on {a}. {b} applies from tomorrow; past days do not change.',
    capTitle: 'Treat Money', capBadge: 'Visual · not real', capConverter: 'Treat Money converter',
    capNotReal: 'This is visual money: what you grant yourself for keeping your habits. It is never added to or taken from your real balance.',
    capToday: 'Today: {p} pts → {m}', capShort: '10 pts = {m}',
    capFormula: '10 points = Total net income × (level percentage ÷ 100). Changes count from today and do not recalculate past days.',
    capEditFor: 'Adjust the percentage of', capSliderLabel: 'Level percentage', capPctFor: '{l} percentage (type it if you like)',
    capAbove: 'Above 1 %: saved as is and the marker stays before point 1.',
    capBelow: 'Below 0.1 %: saved as is and the marker stays after point 3.',
    capPctInvalid: 'Enter a percentage greater than 0', capPreview: 'Preview', capIncome: 'Total net income',
    capEquals: '10 points are worth:', capCurrent: 'your level',
    petCaprice: 'You have {m} of Treat Money. Treat yourself, you earned it.', petPoints: 'You have {n} points. Keep adding up.',
    legacyTitle: 'Old rewards shop data', legacySum: '{r} rewards · {c} redemptions · {s} ⭐ unspent',
    legacyWhy: 'The shop has been replaced by Treat Money. This data used ⭐ and has no direct equivalent, so it was not converted.',
    legacyRewards: 'Rewards', legacyKept: 'Nothing was deleted: it is still stored in your data backup and sync.',
    legacyNoticeTitle: 'Goodbye shop, hello Treat Money',
    legacyNotice: 'Your points now turn into Treat Money. Some data from the old shop does not fit the new system; we kept it untouched:',
    legacyOk: 'Got it'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
