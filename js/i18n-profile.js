/* KeepGoing — textos de tipografía, Ajustes desplegables, perfil y álbum de Maestrías (ES / EN) */
(function () {
  const es = {
    obColorTitle: 'Apariencia', obColorSub: 'Elige tu tipo de letra y tus colores. Podrás cambiarlos cuando quieras en Ajustes.',
    fontTitle: 'Tipo de letra', fontSample: 'Constancia, día a día · 123', fontDefault: 'Por defecto',
    setGroupGeneral: 'General', setGroupCommit: 'Compromiso', setGroupNotices: 'Avisos', setGroupPrivacy: 'Privacidad y datos',
    setNoAccount: 'Sin iniciar sesión', setLook: 'Apariencia', setRemN: '{n} recordatorio(s)', setOffN: '{n} silenciado(s)', setAllOn: 'Todos activos',
    setPublicOn: 'Perfil público activo', setPublicOff: 'Perfil privado',
    profileTitle: 'Tu perfil', profileYou: 'Tú', profileTapHint: 'Toca para ver tu perfil y personalizar tu mascota',
    lvShortTitle: 'Nivel {n} · {title}', memberSince: 'En KeepGoing desde el {d}',
    bioTitle: 'Tu frase', carnetShare: 'Compartir carnet', carnetTitle: 'Mi carnet de KeepGoing', profilePublicSetup: 'Hacer público',
    showcaseTitle: 'Vitrina', showcaseAdd: 'Añadir carta', showcasePick: 'Elige una carta para destacarla en tu perfil.', showcaseNone: 'Aún no tienes cartas. ¡Sigue con tus hábitos!', showcaseRemove: 'Quitar de la vitrina',
    lifeStats: 'Estadísticas de por vida', statMastered: 'Hábitos dominados', statProjects: 'Proyectos logrados',
    yearHeat: 'Tu año', achTitle: 'Línea de logros', achMore: 'Ver los {n}', achLess: 'Ver menos', achNone: 'Tus logros aparecerán aquí.',
    achStart: 'Empezaste «{name}»', achCard: 'Carta {rank} de «{name}»', achSecret: 'Carta secreta: {name}', achChallenge: 'Reto completado: {name} ({n} días)', achContract: 'Contrato cumplido · {tier}', achLevel: 'Subiste al nivel {n} · {title}',
    albumAll: 'Todas', albumAllHabits: 'Todos los hábitos', nextCard: 'Próxima carta', nextCardLeft: 'Te faltan {n} día(s)'
  };
  const en = {
    obColorTitle: 'Appearance', obColorSub: 'Choose your font and colours. You can change them any time in Settings.',
    fontTitle: 'Font', fontSample: 'Consistency, day by day · 123', fontDefault: 'Default',
    setGroupGeneral: 'General', setGroupCommit: 'Commitment', setGroupNotices: 'Notices', setGroupPrivacy: 'Privacy & data',
    setNoAccount: 'Not signed in', setLook: 'Appearance', setRemN: '{n} reminder(s)', setOffN: '{n} muted', setAllOn: 'All on',
    setPublicOn: 'Public profile on', setPublicOff: 'Private profile',
    profileTitle: 'Your profile', profileYou: 'You', profileTapHint: 'Tap to see your profile and customise your pet',
    lvShortTitle: 'Level {n} · {title}', memberSince: 'On KeepGoing since {d}',
    bioTitle: 'Your motto', carnetShare: 'Share ID card', carnetTitle: 'My KeepGoing ID card', profilePublicSetup: 'Make public',
    showcaseTitle: 'Showcase', showcaseAdd: 'Add card', showcasePick: 'Pick a card to feature on your profile.', showcaseNone: 'No cards yet. Keep going with your habits!', showcaseRemove: 'Remove from showcase',
    lifeStats: 'Lifetime stats', statMastered: 'Mastered habits', statProjects: 'Projects achieved',
    yearHeat: 'Your year', achTitle: 'Achievements timeline', achMore: 'See all {n}', achLess: 'See less', achNone: 'Your achievements will show up here.',
    achStart: 'You started “{name}”', achCard: '{rank} card for “{name}”', achSecret: 'Secret card: {name}', achChallenge: 'Challenge completed: {name} ({n} days)', achContract: 'Contract fulfilled · {tier}', achLevel: 'Reached level {n} · {title}',
    albumAll: 'All', albumAllHabits: 'All habits', nextCard: 'Next card', nextCardLeft: '{n} day(s) to go'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
