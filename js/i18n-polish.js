/* KeepGoing — textos de sonidos y subida de nivel (ES / EN) */
(function () {
  const es = {
    soundTitle: 'Sonidos', soundOn: 'Activados', soundOff: 'Desactivados', soundLabel: 'Sonidos al marcar y ganar puntos',
    soundHint: 'Suenan al completar hábitos, ganar puntos, tener un día perfecto, subir de nivel y conseguir cartas. Generados en el propio dispositivo.',
    soundTest: 'Probar sonidos', soundOnToast: 'Sonidos activados', soundOffToast: 'Sonidos desactivados',
    levelUpToast: '⬆️ ¡Subes a nivel {n}: {title}!'
  };
  const en = {
    soundTitle: 'Sounds', soundOn: 'On', soundOff: 'Off', soundLabel: 'Sounds when checking in and earning points',
    soundHint: 'Play when you complete habits, earn points, have a perfect day, level up and unlock cards. Generated on your device.',
    soundTest: 'Test sounds', soundOnToast: 'Sounds on', soundOffToast: 'Sounds off',
    levelUpToast: '⬆️ Level {n}: {title}!'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
