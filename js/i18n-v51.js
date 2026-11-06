/* KeepGoing — textos de la v1.51: interfaz más limpia, ajustes bajo el orbe, orbe que evoluciona y adiós al
   Dinero Caprichable (ES / EN). */
(function () {
  const es = {
    wn_1_51_0_1: 'Pantallas más limpias|Arriba ya no están los ajustes, el nivel, los puntos ni tu @nametag, y las pestañas no repiten su título: cada una empieza directamente con lo suyo. El nivel y tu perfil siguen en Maestrías.',
    wn_1_51_0_2: 'Ajustes bajo el orbe|Toca el orbe: justo debajo aparece un orbe pequeño con la rueda de los Ajustes.',
    wn_1_51_0_3: 'Tu orbe evoluciona|Los puntos ya no se enseñan como números: se notan en el orbe. Con cada título nuevo (Constante, Disciplinado, Enfocado… hasta Mito) gana un anillo, un halo, chispas que lo orbitan, oro y, al final, un anillo iridiscente.',
    wn_1_51_0_4: 'Adiós al Dinero Caprichable|Ya no aparece en la Libreta ni en Ajustes.',
    orbNextStage: 'Orbe en fase {s} de 8 · la siguiente, en el nivel {n}',
    orbMaxStage: 'Orbe en su última fase: Mito',
    orbEvolved: '¡Nivel {n}: {title}! Tu orbe ha evolucionado',
    lvTitle: 'Nivel',
    commitd_chill: 'Chill: solo cambia el texto de tu contrato.', commitd_serio: 'Serio: solo cambia el texto de tu contrato.', commitd_locked: 'Locked-In: solo cambia el texto de tu contrato.',
    orbHow: 'Cada día perfecto te acerca al siguiente nivel. Con cada título nuevo tu orbe evoluciona: anillo, halo, segundo anillo, chispas, más chispas, oro y, en Mito, un anillo iridiscente.',
    help_habits_links: 'Cada día perfecto te sube de nivel en Maestrías y, con cada título nuevo, tu orbe evoluciona.|Puedes compartir un hábito o proyecto con amigos: se crea un grupo en el Chat con ranking y retos en vivo.|Tu contrato personal recoge tu nivel de compromiso, que sale de cuántos hábitos tienes.',
    help_ledger_links: 'Comparte la libreta o una proyección con amigos, cifrada y solo para ver, o envía un evento al chat sin importes.',
    help_mastery_links: 'Tu nivel sale de tus Hábitos y Proyectos, y con cada título nuevo tu orbe evoluciona.|La energía del día que pones en «Hoy» también cuenta para algunas medallas.'
  };
  const en = {
    wn_1_51_0_1: 'Cleaner screens|Settings, level, points and your @nametag are no longer at the top, and tabs no longer repeat their title: each one starts straight away with its content. Your level and profile are still in Masteries.',
    wn_1_51_0_2: 'Settings under the orb|Tap the orb: a small orb with the Settings gear appears right below it.',
    wn_1_51_0_3: 'Your orb evolves|Points are no longer shown as numbers: you see them in the orb. With each new title (Consistent, Disciplined, Focused… up to Myth) it gains a ring, a halo, sparks orbiting it, gold and, finally, an iridescent ring.',
    wn_1_51_0_4: 'Goodbye to Treat Money|It no longer appears in the Ledger or in Settings.',
    orbNextStage: 'Orb at stage {s} of 8 · next one at level {n}',
    orbMaxStage: 'Orb at its last stage: Myth',
    orbEvolved: 'Level {n}: {title}! Your orb has evolved',
    lvTitle: 'Level',
    commitd_chill: 'Chill: it only changes your contract text.', commitd_serio: 'Serious: it only changes your contract text.', commitd_locked: 'Locked-In: it only changes your contract text.',
    orbHow: 'Every perfect day brings you closer to the next level. With each new title your orb evolves: ring, halo, second ring, sparks, more sparks, gold and, at Myth, an iridescent ring.',
    help_habits_links: 'Every perfect day levels you up in Masteries and, with each new title, your orb evolves.|Share a habit or project with friends: a group with ranking and live challenges is created in Chat.|Your personal contract shows your commitment level, which comes from how many habits you have.',
    help_ledger_links: 'Share the ledger or a projection with friends, encrypted and view-only, or send an event to chat without amounts.',
    help_mastery_links: 'Your level comes from your Habits and Projects, and with each new title your orb evolves.|The daily energy you set in “Today” also counts for some medals.'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
