/* KeepGoing — textos de la v1.41: audio espacial, música generativa, sonidos nuevos y corona 3D (ES / EN). */
(function () {
  const es = {
    soundLabel: 'Efectos de sonido',
    auSfxHint: 'Al marcar hábitos, ganar puntos, registrar movimientos, compartir, valorar el día, entrenar y moverte por la Línea de tiempo.',
    auMusic: 'Música relajante', auMusicHint: 'Música generativa que compone la app en directo: nunca se repite y cambia con cada pestaña.',
    auMusicOn: 'Música', auMusicOnToast: 'Música relajante activada', auMusicOffToast: 'Música relajante desactivada',
    auSpatial: 'Audio espacial', auSpatialHint: 'Cada sonido sale del sitio de la pantalla donde tocas y la música gira a tu alrededor. Mejor con auriculares.',
    auAdaptive: 'Se adapta a lo que haces', auAdaptiveHint: 'Cuanto más activo estás, más viva suena; contesta a tus toques, se abre con los logros y se calma con los fallos.',
    auSfxVol: 'Volumen de los efectos', auMusicVol: 'Volumen de la música',
    auMood: 'Ambiente de la música', auMoodHint: 'Automático cambia de tonalidad y ritmo según la pestaña que tengas abierta.',
    auMood_auto: 'Automático', auMood_calm: 'Calma', auMood_focus: 'Foco', auMood_night: 'Noche', auMood_dawn: 'Amanecer',
    auTestSpatial: 'Probar audio espacial', auTestNew: 'Oír los sonidos nuevos',
    auDevice: 'La música, el audio espacial, los volúmenes y el ambiente se guardan en este dispositivo.',
    ppWeekT: '¡Semana perfecta!', ppMonthT: '¡Mes perfecto!',
    wn_1_41_0_1: 'Música relajante|En Ajustes → Sonido puedes activar música generativa propia: la app la compone en directo, nunca se repite y cada pestaña tiene su ambiente (o eliges Calma, Foco, Noche o Amanecer).',
    wn_1_41_0_2: 'Audio espacial|Cada sonido sale del punto de la pantalla donde tocas y la música gira despacio a tu alrededor. Con auriculares se nota mucho más.',
    wn_1_41_0_3: 'La música se adapta a ti|Cuanto más haces, más viva suena; a veces contesta a tus toques con una nota, se abre con un arpegio cuando consigues algo y se oscurece un momento si fallas.',
    wn_1_41_0_4: 'Sonidos nuevos|Línea de tiempo (pasos, zoom, paneles, Replay), ingresos, gastos e inversiones, compartir, semana y mes perfectos, valorar el día y empezar o acabar un entrenamiento o una serie.',
    wn_1_41_0_5: 'Semana y mes perfectos|Al empezar una semana o un mes nuevo, si el anterior fue perfecto se celebra a pantalla completa con su propia fanfarria.',
    wn_1_41_0_6: 'Corona 3D|La valoración del día tiene ahora una corona en 3D: de bronce y ladeada en los días malos, de oro con joyas y perlas que brillan en los buenos. Gírala con el dedo.'
  };
  const en = {
    soundLabel: 'Sound effects',
    auSfxHint: 'When you check habits, earn points, log money, share, rate your day, train and move around the Timeline.',
    auMusic: 'Relaxing music', auMusicHint: 'Generative music the app composes live: it never repeats and changes with each tab.',
    auMusicOn: 'Music', auMusicOnToast: 'Relaxing music on', auMusicOffToast: 'Relaxing music off',
    auSpatial: 'Spatial audio', auSpatialHint: 'Each sound comes from where you tap on the screen and the music circles around you. Best with headphones.',
    auAdaptive: 'Adapts to what you do', auAdaptiveHint: 'The more active you are, the livelier it sounds; it answers your taps, opens up with achievements and calms down after slips.',
    auSfxVol: 'Effects volume', auMusicVol: 'Music volume',
    auMood: 'Music mood', auMoodHint: 'Automatic changes key and pace with the tab you have open.',
    auMood_auto: 'Automatic', auMood_calm: 'Calm', auMood_focus: 'Focus', auMood_night: 'Night', auMood_dawn: 'Dawn',
    auTestSpatial: 'Try spatial audio', auTestNew: 'Hear the new sounds',
    auDevice: 'Music, spatial audio, volumes and mood are saved on this device.',
    ppWeekT: 'Perfect week!', ppMonthT: 'Perfect month!',
    wn_1_41_0_1: 'Relaxing music|In Settings → Sound you can turn on our own generative music: the app composes it live, it never repeats and every tab has its own mood (or pick Calm, Focus, Night or Dawn).',
    wn_1_41_0_2: 'Spatial audio|Each sound comes from the spot you tap and the music slowly circles around you. Much clearer with headphones.',
    wn_1_41_0_3: 'Music that adapts to you|The more you do, the livelier it sounds; it sometimes answers your taps, opens up with an arpeggio when you achieve something and darkens for a moment after a slip.',
    wn_1_41_0_4: 'New sounds|Timeline (steps, zoom, panels, Replay), income, expenses and investments, sharing, perfect weeks and months, rating your day and starting or finishing a workout or a set.',
    wn_1_41_0_5: 'Perfect week and month|When a new week or month starts and the last one was perfect, it is celebrated full screen with its own fanfare.',
    wn_1_41_0_6: '3D crown|Rating your day now shows a 3D crown: tarnished bronze and tilted on bad days, gold with glowing gems and pearls on good ones. Spin it with your finger.'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
