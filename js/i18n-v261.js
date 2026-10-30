/* KeepGoing — textos de la v1.26.1: «Calendario» pasa a llamarse «Organización», lugar puntual y arreglo del zoom (ES / EN). */
(function () {
  const es = {
    tabCalendar: "Organización",
    help_cal_t: "Organización",
    obCalTitle: "Tu Organización de turnos",
    obCalWhere: "Lo tienes en la pestaña Organización. Puedes empezar a usarlo cuando quieras.",
    plFreeList: "Hasta 5 hábitos y 1 proyecto|Libreta, presupuesto global y PDF|Turnos sin límite en Organización|Chat, maestrías y 1 grupo propio|Gráficos de los últimos 90 días",
    plFeatList: "Hábitos y proyectos sin límite|Calculadora de Patrimonio y proyecciones guardadas|Registrar CSV del banco y Comparar con proyecciones|Varias monedas, presupuesto por categorías e Inversiones|Rutinas en Organización|Compartir libretas, proyecciones y calendario|Todos los temas, colores y mascotas|Gráficos con todo tu historial",
    prShift: "Al menos un turno en Organización",
    prShiftHint: "Ese día tiene que tener algo puesto en Organización.",
    tfViewHint: "Lo que apagues aquí se oculta en Organización en todos tus dispositivos.",
    tfUpdated: "Organización actualizada",
    tfWiped: "Organización borrada",
    wn_1_26_0_5: "Botón «Vista»|En el menú de Organización: enciende o apaga turnos, nombres, colores de las casillas, notas, lugares y valoraciones. Se guarda igual en todos tus dispositivos.",
    wn_1_26_1_1: "«Calendario» ahora es «Organización»|La pestaña de turnos se llama Organización, como el resto de la app.",
    wn_1_26_1_2: "Lugar puntual|En un turno de un día, un turno puntual o al fichar, elige «Lugar puntual» y escribe la dirección solo para esa vez, sin guardarla en tus Lugares.",
    wn_1_26_1_3: "Sin zoom con doble toque|En el móvil, tocar dos veces seguidas ya no amplía la página.",
    tfPlOnce: 'Lugar puntual…',
    tfPlOnceT: 'Lugar puntual',
    tfPlOnceHint: 'Solo para este turno. No se guarda en tus Lugares.',
    tfPlOncePh: 'Dirección o nombre del sitio'
  };
  const en = {
    tabCalendar: "Organisation",
    help_cal_t: "Organisation",
    obCalTitle: "Your shift Organisation",
    obCalWhere: "It lives in the Organisation tab. Start using it whenever you like.",
    plFreeList: "Up to 5 habits and 1 project|Ledger, overall budget and PDF|Unlimited shifts in Organisation|Chat, masteries and 1 group of your own|Charts for the last 90 days",
    plFeatList: "Unlimited habits and projects|Net worth calculator and saved projections|Bank CSV import and Compare with projections|Multiple currencies, budgets by category and Investments|Routines in Organisation|Share ledgers, projections and calendar|Every theme, colour and pet|Charts with your whole history",
    prShift: "At least one shift in Organisation",
    prShiftHint: "That day must have something in Organisation.",
    tfViewHint: "Whatever you turn off here is hidden in Organisation on all your devices.",
    tfUpdated: "Organisation updated",
    tfWiped: "Organisation deleted",
    wn_1_26_0_5: "“View” button|In the Organisation menu: turn shifts, names, cell colours, notes, places and ratings on or off. It is saved the same on all your devices.",
    wn_1_26_1_1: "“Calendar” is now “Organisation”|The shifts tab is called Organisation, like the rest of the app.",
    wn_1_26_1_2: "One-off place|On a shift for one day, a one-off shift or when clocking out, pick “One-off place” and type the address just for that time, without saving it to your Places.",
    wn_1_26_1_3: "No double-tap zoom|On mobile, tapping twice in a row no longer zooms the page.",
    tfPlOnce: 'One-off place…',
    tfPlOnceT: 'One-off place',
    tfPlOnceHint: 'Just for this shift. It is not saved to your Places.',
    tfPlOncePh: 'Address or name of the place'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
