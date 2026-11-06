/* KeepGoing — textos de la v1.49: ampliar los gráficos por tiempo e «Importar» que lleva a lo que falta (ES / EN). */
(function () {
  const es = {
    wn_1_49_0_1: 'Amplía los gráficos por tiempo|En la Libreta, pellizca un gráfico en horizontal para acercarte a unas semanas o alejarte hasta verlo todo, como las horas en Organización; con dos dedos también te mueves. Funciona en Patrimonio actual (también al comparar con tus proyecciones), la calculadora, cada fondo, las proyecciones guardadas y los gráficos de ingresos y gastos.',
    wn_1_49_0_2: 'Botones y pista para moverte|Debajo de cada gráfico tienes − y + para ampliar, «Todo» para volver a verlo entero y, al ampliar, una pista que arrastras con un dedo. En el ordenador: Ctrl + rueda (o pellizcar en el trackpad), arrastrar con el ratón y doble clic para verlo todo.',
    wn_1_49_0_3: '«Importar» te lleva a lo que falta|Al registrar un CSV, si aún faltan respuestas, pulsa «Importar» y la ventana sube sola hasta el primer movimiento pendiente y lo resalta.',
    zcIn: 'Ampliar', zcOut: 'Alejar', zcAll: 'Todo', zcKeys: '+ y − amplían, 0 lo enseña todo',
    rgMissing: 'Faltan {n} respuestas. Pulsa «Importar» y te llevo a la primera.', rgGoMissing: 'Ir a la primera respuesta que falta'
  };
  const en = {
    wn_1_49_0_1: 'Zoom charts in time|In the Notebook, pinch a chart sideways to get close to a few weeks or zoom out to see everything, like the hours in Organisation; with two fingers you can also move around. It works in Current net worth (also when comparing with your projections), the calculator, each fund, saved projections and the income and expense charts.',
    wn_1_49_0_2: 'Buttons and a track to move|Under each chart you have − and + to zoom, «All» to see it whole again and, when zoomed, a track you drag with one finger. On a computer: Ctrl + wheel (or pinch on the trackpad), drag with the mouse and double-click to see it all.',
    wn_1_49_0_3: '«Import» takes you to what is missing|When registering a CSV, if answers are still missing, tap «Import» and the window scrolls up to the first pending transaction and highlights it.',
    zcIn: 'Zoom in', zcOut: 'Zoom out', zcAll: 'All', zcKeys: '+ and − zoom, 0 shows it all',
    rgMissing: '{n} answers missing. Tap «Import» and I\'ll take you to the first one.', rgGoMissing: 'Go to the first missing answer'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
