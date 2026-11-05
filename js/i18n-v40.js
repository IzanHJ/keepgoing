/* KeepGoing — textos de la v1.40: recorrido, Transporte y Escenarios 3D en Mundo (ES / EN). */
(function () {
  const A = (es, en) => [es, en];
  const pieces = { house: A('Casa', 'House'), block: A('Edificio', 'Building'), tower: A('Torre', 'Tower'), tree: A('Árbol', 'Tree'), pine: A('Pino', 'Pine'), bush: A('Arbusto', 'Bush'), rock: A('Roca', 'Rock'), hill: A('Colina', 'Hill'), water: A('Agua', 'Water'), path: A('Camino', 'Path'), road: A('Carretera', 'Road'), bench: A('Banco', 'Bench'), lamp: A('Farola', 'Lamp'), fence: A('Valla', 'Fence'), fountain: A('Fuente', 'Fountain'), tent: A('Tienda', 'Tent'), car: A('Coche', 'Car'), person: A('Persona', 'Person') };
  const tpls = { village: A('Pueblo', 'Village'), city: A('Ciudad', 'City'), forest: A('Bosque', 'Forest'), coast: A('Costa', 'Coast'), campus: A('Campus', 'Campus'), plaza: A('Plaza', 'Square') };
  const es = {
    lwSubPlace: 'Lugares', lwSubTr: 'Transporte', lwSubSc: 'Escenarios',
    lwMin: '{n} min', lwH: '{h} h', lwHMin: '{h} h {m} min',
    lwTrAll: 'Todo el recorrido', lwRoute: 'Recorrido', lwNoPlaceShort: 'sin lugar', lwFromUnknown: 'Origen no registrado',
    lwDep: 'Salida', lwArr: 'Llegada', lwNoHours: 'Sin hora de salida y llegada',
    lwNLeg1: '1 trayecto', lwNLeg: '{n} trayectos', lwOnTheWay: '{d} en camino', lwAvg: 'media {d}',
    lwNoLegs: 'No hay trayectos en este periodo. Activa «Medio de transporte» en tus turnos (Organización) para ver por dónde te mueves.',
    lwByTr: 'Por transporte', lwRoutes: 'Rutas', lwLegs: 'Trayectos',
    lwNoHours1: '1 trayecto no tiene hora de salida o de llegada: no cuenta en el tiempo en camino.', lwNoHoursN: '{n} trayectos no tienen hora de salida o de llegada: no cuentan en el tiempo en camino.',
    lwNoTr1: 'En 1 cambio de lugar no consta cómo fuiste.', lwNoTrN: 'En {n} cambios de lugar no consta cómo fuiste.',
    lwMine: 'tuyo', lwScPlaces: 'Lugares', lwScTr: 'Transporte', lwScAria: 'Carrusel de escenarios', lwNewScene: 'Crear',
    lwScColor: 'Color del escenario', lwMono: 'Monocromo', lwMonoHint: 'Todo el escenario en tonos de su color', lwScReset: 'Color de serie',
    lwDup: 'Duplicar', lwUsedBy: 'Lugares con este escenario', lwUsedNone: 'Ningún lugar lo usa todavía.', lwAssign: 'Usar en un lugar…',
    lwScTrHint: 'Este escenario se ve en Transporte al tocar un trayecto hecho con este medio.',
    lwFromTpl: 'Empezar desde', lwTplEmpty: 'Vacío', lwScNamePh: 'Nombre del escenario', lwMyScene: 'Mi escenario',
    lwPieces: 'Piezas', lwSize: 'Tamaño', lwErase: 'Borrar', lwGridAria: 'Rejilla del escenario', lwEmptyCell: 'Casilla vacía', lwClear: 'Vaciar',
    lwEdHint: 'Elige una pieza y toca una casilla. Toca otra vez la misma pieza para girarla. Coches y personas van encima de otra pieza.',
    lwScMax: 'Puedes tener hasta {n} escenarios propios.', lwDelQ: '¿Eliminar este escenario?', lwDelUsedQ: '¿Eliminar este escenario? {n} lugar(es) lo usan y volverán a verse sin escenario.',
    wn_1_40_0_1: 'Mundo en tres apartados|Mundo ahora tiene Lugares (el escenario de cada sitio), Transporte (tus trayectos) y Escenarios (el carrusel 3D). Las animaciones de transporte y los escenarios de lugar ya no salen mezclados.',
    wn_1_40_0_2: 'Tu recorrido|Transporte saca el medio de transporte, la salida, la llegada y el lugar de cada turno: el recorrido del día parada a parada, el tiempo en camino, cada medio y tus rutas repetidas.',
    wn_1_40_0_3: 'Escenarios 3D en carrusel|Pasa por todos los escenarios de lugar y de transporte y elige un único color para cada uno. Por defecto se ven monocromos, en tonos de su color.',
    wn_1_40_0_4: 'Crea tus escenarios|Empieza desde una plantilla (pueblo, ciudad, bosque, costa, campus o plaza) o desde cero, y coloca piezas low-poly en una rejilla. Después úsalo en tus lugares.'
  };
  const en = {
    lwSubPlace: 'Places', lwSubTr: 'Transport', lwSubSc: 'Scenes',
    lwMin: '{n} min', lwH: '{h} h', lwHMin: '{h} h {m} min',
    lwTrAll: 'Whole route', lwRoute: 'Route', lwNoPlaceShort: 'no place', lwFromUnknown: 'Origin not logged',
    lwDep: 'Departure', lwArr: 'Arrival', lwNoHours: 'No departure or arrival time',
    lwNLeg1: '1 journey', lwNLeg: '{n} journeys', lwOnTheWay: '{d} on the way', lwAvg: 'avg {d}',
    lwNoLegs: 'No journeys in this period. Turn on “Transport” in your shifts (Organisation) to see how you move around.',
    lwByTr: 'By transport', lwRoutes: 'Routes', lwLegs: 'Journeys',
    lwNoHours1: '1 journey has no departure or arrival time: it does not count in time on the way.', lwNoHoursN: '{n} journeys have no departure or arrival time: they do not count in time on the way.',
    lwNoTr1: '1 change of place has no transport logged.', lwNoTrN: '{n} changes of place have no transport logged.',
    lwMine: 'yours', lwScPlaces: 'Places', lwScTr: 'Transport', lwScAria: 'Scene carousel', lwNewScene: 'Create',
    lwScColor: 'Scene colour', lwMono: 'Monochrome', lwMonoHint: 'The whole scene in shades of its colour', lwScReset: 'Default colour',
    lwDup: 'Duplicate', lwUsedBy: 'Places with this scene', lwUsedNone: 'No place uses it yet.', lwAssign: 'Use in a place…',
    lwScTrHint: 'This scene appears in Transport when you tap a journey made with this transport.',
    lwFromTpl: 'Start from', lwTplEmpty: 'Empty', lwScNamePh: 'Scene name', lwMyScene: 'My scene',
    lwPieces: 'Pieces', lwSize: 'Size', lwErase: 'Erase', lwGridAria: 'Scene grid', lwEmptyCell: 'Empty cell', lwClear: 'Clear',
    lwEdHint: 'Pick a piece and tap a cell. Tap the same piece again to rotate it. Cars and people go on top of another piece.',
    lwScMax: 'You can have up to {n} scenes of your own.', lwDelQ: 'Delete this scene?', lwDelUsedQ: 'Delete this scene? {n} place(s) use it and will be shown without a scene again.',
    wn_1_40_0_1: 'World in three sections|World now has Places (each spot’s scene), Transport (your journeys) and Scenes (the 3D carousel). Transport animations and place scenes are no longer mixed.',
    wn_1_40_0_2: 'Your route|Transport uses each shift’s transport, departure, arrival and place: the day’s route stop by stop, time on the way, each transport and your repeated routes.',
    wn_1_40_0_3: '3D scene carousel|Browse every place and transport scene and pick a single colour for each one. By default they are monochrome, in shades of their colour.',
    wn_1_40_0_4: 'Build your scenes|Start from a template (village, city, forest, coast, campus or square) or from scratch, and place low-poly pieces on a grid. Then use it in your places.'
  };
  for (const [k, [a, b]] of Object.entries(pieces)) { es['lwA_' + k] = a; en['lwA_' + k] = b; }
  for (const [k, [a, b]] of Object.entries(tpls)) { es['lwTpl_' + k] = a; en['lwTpl_' + k] = b; }
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
