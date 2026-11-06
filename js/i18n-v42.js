/* KeepGoing — textos de la v1.42: escenarios nuevos, editar los de serie, «Alternativa» y Línea de tiempo más limpia (ES / EN). */
(function () {
  const A = (es, en) => [es, en];
  const scenes = {
    supermarket: A('Supermercado', 'Supermarket'), apartments: A('Edificio de pisos', 'Apartment block'), cafe: A('Cafetería', 'Café'), school: A('Colegio', 'School'),
    cinema: A('Cine', 'Cinema'), pool: A('Piscina', 'Pool'), mountain: A('Montaña', 'Mountain'), pharmacy: A('Farmacia', 'Pharmacy'),
    office_in: A('Oficina (dentro)', 'Office (inside)'), living: A('Salón', 'Living room'), bedroom: A('Dormitorio', 'Bedroom'), classroom: A('Aula', 'Classroom'),
  };
  const pieces = {
    mountain: A('Montaña', 'Mountain'), umbrella: A('Sombrilla', 'Parasol'), sand: A('Arena', 'Sand'), parking: A('Aparcamiento', 'Parking'), rail: A('Vía', 'Railway'), runway: A('Pista', 'Runway'),
    plane: A('Avión', 'Plane'), train: A('Tren', 'Train'), bhouse: A('Casa grande', 'Big house'), office: A('Oficinas', 'Offices'), gymb: A('Gimnasio', 'Gym'), restb: A('Restaurante', 'Restaurant'),
    mallb: A('Centro comercial', 'Mall'), unib: A('Universidad', 'University'), libb: A('Biblioteca', 'Library'), hospb: A('Hospital', 'Hospital'), hotelb: A('Hotel', 'Hotel'), arena: A('Estadio', 'Stadium'),
    stationb: A('Estación', 'Station'), ctower: A('Torre de control', 'Control tower'), market: A('Supermercado', 'Supermarket'), flats: A('Pisos', 'Flats'), cafe: A('Cafetería', 'Café'),
    school: A('Colegio', 'School'), cinema: A('Cine', 'Cinema'), pool: A('Piscina', 'Pool'), pharmacy: A('Farmacia', 'Pharmacy'), desk: A('Escritorio', 'Desk'), chair: A('Silla', 'Chair'),
    sofa: A('Sofá', 'Sofa'), tv: A('Tele', 'TV'), bed: A('Cama', 'Bed'), wardrobe: A('Armario', 'Wardrobe'), shelf: A('Estantería', 'Bookshelf'), plant: A('Planta', 'Plant'),
    rug: A('Alfombra', 'Rug'), board: A('Pizarra', 'Board'), table: A('Mesa', 'Table'), flamp: A('Lámpara', 'Floor lamp'),
  };
  const groups = { nature: A('Naturaleza', 'Nature'), street: A('Calle', 'Street'), build: A('Edificios', 'Buildings'), indoor: A('Interior', 'Indoor') };
  const grounds = { tint: A('Su color', 'Its colour'), grass: A('Hierba', 'Grass'), stone: A('Piedra', 'Stone'), sand: A('Arena', 'Sand'), asphalt: A('Asfalto', 'Asphalt'), wood: A('Madera', 'Wood'), tile: A('Baldosa', 'Tiles') };
  const shapes = { sq: A('Cuadrado', 'Square'), round: A('Redondo', 'Round'), room: A('Habitación', 'Room') };
  const es = {
    lwG_x: '', lwGround: 'Suelo', lwShape: 'Forma',
    lwAlt: 'Alternativa', lwAltN: 'Alternativa {n}', lwAltOther: 'Otra', lwAltSave: 'Guardar esta',
    lwAltHint: 'Las mismas piezas con otra disposición. Toca «Otra» hasta que te guste.',
    lwRestore: 'Restaurar', lwRestoreQ: '¿Volver al escenario original? Se pierde tu versión.',
    lwEdBuilt: 'Editas «{n}». Se guarda como tu versión y siempre puedes restaurar la original.',
    tlHeroNow: 'Ahora', tlHeroMost: 'Donde más estuviste', tlHeroTimes: '{n} veces', tlHeroTimes1: 'una vez', tlHeroNone: 'Sin lugares registrados',
    tlHeroHelp: 'Pon un Lugar en tus turnos (Organización) y aquí verás dónde estás.', tlHeroAria: 'Escenario donde estás. Toca para abrir Mundo',
    tlMore: 'Más de la Línea de tiempo', tlStatsBtn: 'Estadísticas', tlSettings: 'Ajustes',
    tlSetAxis: 'Semanas en horizontal', tlSetAxisHint: 'En Semana, las carpetas pasan de lado en vez de hacia arriba.',
    tlSetViews: 'Editar las vistas de Progreso', tlSetScenes: 'Escenarios y colores',
    wn_1_42_0_1: 'Dónde estás, lo primero|La Línea de tiempo se abre en Día y enseña arriba el escenario del sitio donde estás ahora (el del turno de esta hora). Debajo, la escala, la fecha y la pista. Toca el escenario para abrir Mundo.',
    wn_1_42_0_2: 'Menos cosas a la vez|Mundo, Progreso, Comparar, Estadísticas y Ajustes pasan a una fila de botones; cada uno se abre en una hoja. En Semana, la nota se escribe en Estadísticas.',
    wn_1_42_0_3: '12 escenarios nuevos|Supermercado, Edificio de pisos, Cafetería, Colegio, Cine, Piscina, Montaña y Farmacia, y cuatro interiores en maqueta: Oficina por dentro, Salón, Dormitorio y Aula. Hay 37 piezas nuevas en el creador, por grupos.',
    wn_1_42_0_4: 'Edita los escenarios de serie|Todos los escenarios se hacen con piezas: «Editar» abre cualquiera en el creador (con suelo y forma: redondo, cuadrado o habitación) y «Restaurar» vuelve al original. «Alternativa» recoloca las mismas piezas; toca «Otra» hasta que te guste.',
    wn_1_42_0_5: 'Periodo anterior, al día|En Comparar, «Periodo anterior» compara lo que ves con los mismos días justo antes, y con Replay en marcha se recalcula en cada paso (tiene su propio botón de Replay).',
    tlCmpPrevN: 'Se compara con los {n} días justo antes. Con Replay en marcha, se recalcula en cada paso.', tlCmpPrev1: 'Se compara con el día justo antes. Con Replay en marcha, se recalcula en cada paso.',
  };
  const en = {
    lwG_x: '', lwGround: 'Ground', lwShape: 'Shape',
    lwAlt: 'Alternative', lwAltN: 'Alternative {n}', lwAltOther: 'Another', lwAltSave: 'Keep this one',
    lwAltHint: 'The same pieces laid out differently. Tap “Another” until you like it.',
    lwRestore: 'Restore', lwRestoreQ: 'Go back to the original scene? Your version will be lost.',
    lwEdBuilt: 'You’re editing “{n}”. It’s saved as your version and you can always restore the original.',
    tlHeroNow: 'Now', tlHeroMost: 'Where you were most', tlHeroTimes: '{n} times', tlHeroTimes1: 'once', tlHeroNone: 'No places yet',
    tlHeroHelp: 'Add a Place to your shifts (Organisation) and you’ll see where you are here.', tlHeroAria: 'Scene where you are. Tap to open World',
    tlMore: 'More timeline options', tlStatsBtn: 'Stats', tlSettings: 'Settings',
    tlSetAxis: 'Weeks sideways', tlSetAxisHint: 'In Week, folders move sideways instead of upwards.',
    tlSetViews: 'Edit Progress views', tlSetScenes: 'Scenes and colours',
    wn_1_42_0_1: 'Where you are, first|The timeline opens on Day and shows, at the top, the scene of the place you’re at right now (from this hour’s shift). Below are the scale, the date and the track. Tap the scene to open World.',
    wn_1_42_0_2: 'Less at once|World, Progress, Compare, Stats and Settings are now a row of buttons, each opening its own sheet. In Week, the note is written in Stats.',
    wn_1_42_0_3: '12 new scenes|Supermarket, Apartment block, Café, School, Cinema, Pool, Mountain and Pharmacy, plus four cut-away interiors: Office inside, Living room, Bedroom and Classroom. The builder has 37 new pieces, in groups.',
    wn_1_42_0_4: 'Edit the built-in scenes|Every scene is made of pieces: “Edit” opens any of them in the builder (with ground and shape: round, square or room) and “Restore” brings back the original. “Alternative” rearranges the same pieces; tap “Another” until you like it.',
    wn_1_42_0_5: 'Previous period, live|In Compare, “Previous period” compares what you see with the same number of days just before, and while Replay runs it updates at every step (it has its own Replay button).',
    tlCmpPrevN: 'Compared with the {n} days just before. While Replay runs, it updates at every step.', tlCmpPrev1: 'Compared with the day just before. While Replay runs, it updates at every step.',
  };
  for (const [k, [a, b]] of Object.entries(scenes)) { es['lwSc_' + k] = a; en['lwSc_' + k] = b; }
  for (const [k, [a, b]] of Object.entries(pieces)) { es['lwA_' + k] = a; en['lwA_' + k] = b; }
  for (const [k, [a, b]] of Object.entries(groups)) { es['lwG_' + k] = a; en['lwG_' + k] = b; }
  for (const [k, [a, b]] of Object.entries(grounds)) { es['lwGr_' + k] = a; en['lwGr_' + k] = b; }
  for (const [k, [a, b]] of Object.entries(shapes)) { es['lwSh_' + k] = a; en['lwSh_' + k] = b; }
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
