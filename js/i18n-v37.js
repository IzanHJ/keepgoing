/* KeepGoing — textos de la v1.37: Mundo en la Línea de tiempo (ES / EN). */
(function () {
  const es = {
    lwTab: 'Mundo', lwAria: 'Escena en 3D del lugar elegido', lwLoading: 'Cargando el mundo…',
    lwSceneType: 'Tipo de escenario', lwSceneHelp: 'Opcional. Es el dibujo de este lugar en Mundo (Línea de tiempo); su color es el del lugar.', lwScNone: 'Ninguno',
    lwSc_home: 'Casa', lwSc_office: 'Oficina', lwSc_park: 'Parque', lwSc_beach: 'Playa', lwSc_gym: 'Gimnasio', lwSc_restaurant: 'Restaurante', lwSc_mall: 'Centro comercial', lwSc_university: 'Universidad',
    lwSc_library: 'Biblioteca', lwSc_hospital: 'Hospital', lwSc_hotel: 'Hotel', lwSc_stadium: 'Estadio', lwSc_station: 'Estación', lwSc_neighborhood: 'Barrio', lwSc_road: 'Carretera', lwSc_airport: 'Aeropuerto',
    lwHowArrived: 'Cómo llegaste', lwTrNone: 'Sin indicar',
    lwTr_walk: 'Andando', lwTr_bike: 'Bici', lwTr_moto: 'Moto', lwTr_car: 'Coche', lwTr_bus: 'Autobús', lwTr_train: 'Tren', lwTr_plane: 'Avión', lwTr_other: 'Otro',
    lwPlaces: 'Lugares', lwCountries: 'Países', lwTrips: 'Viajes', lwOverview: 'Vista general', lwNPl1: '1 lugar', lwNPl: '{n} lugares', lwNCc1: '1 país', lwNCc: '{n} países', lwNTr1: '1 viaje', lwNTr: '{n} viajes',
    lwNoMoments: 'No hay turnos, eventos ni entrenos registrados en este periodo.',
    lwNoPlace: 'Sin lugar registrado', lwGymNoPlace: 'Entreno · lugar no registrado', lwNoGeo: 'Ciudad y país sin saber',
    lwNoScene: 'Sin tipo de escenario', lwSetScene: 'Elegir escenario', lwChangeScene: 'Cambiar escenario',
    lwNoSceneHelp1: '«{p}» no tiene tipo de escenario: se ve como una chincheta.', lwNoSceneHelp: '{n} lugares no tienen tipo de escenario (como «{p}»): se ven como una chincheta.',
    lwFrom: 'Desde {p}', lwTrUnknown: 'cómo llegaste: sin indicar', lwTrip: 'Viaje {a} → {b}',
    lwTimes1: '1 vez en este periodo', lwTimes: '{n} veces en este periodo',
    lwUnknown1: '1 momento sin lugar registrado: no se supone dónde estabas.', lwUnknownN: '{n} momentos sin lugar registrado: no se supone dónde estabas.',
    lwMapNote: 'El país «Calculado» sale de las coordenadas con un mapa simplificado: cerca de la costa o en un país muy pequeño puede no saberse. Al buscar el lugar de nuevo se guarda el de OpenStreetMap.',
    wn_1_37_0_1: 'Mundo|Nueva sección de la Línea de tiempo: los lugares, países y viajes del periodo elegido, con un globo y un pequeño escenario en 3D de cada lugar. Solo sale lo registrado: lo que no tiene lugar se queda como desconocido.',
    wn_1_37_0_2: 'Tipo de escenario y cómo llegaste|En Lugares puedes elegir el escenario (casa, oficina, parque, playa, gimnasio…) y en cada turno del calendario, cómo llegaste (andando, bici, coche, autobús, tren…). Los dos son opcionales.',
    wn_1_37_0_3: 'Vuelos y trayectos|Si cambias de país entre un turno y el siguiente, el avión vuela en el globo; si dices cómo llegaste, se ve el trayecto antes del lugar. Con Animaciones apagadas se ve directamente el resultado.',
    wn_1_37_0_4: 'Ligero|El 3D solo se descarga al abrir Mundo, va más sencillo en móviles modestos y se para cuando no está en pantalla. Al buscar un lugar se guardan su ciudad y su país.'
  };
  const en = {
    lwTab: 'World', lwAria: '3D scene of the chosen place', lwLoading: 'Loading the world…',
    lwSceneType: 'Scene type', lwSceneHelp: 'Optional. It is how this place looks in World (Timeline); its colour is the place colour.', lwScNone: 'None',
    lwSc_home: 'Home', lwSc_office: 'Office', lwSc_park: 'Park', lwSc_beach: 'Beach', lwSc_gym: 'Gym', lwSc_restaurant: 'Restaurant', lwSc_mall: 'Mall', lwSc_university: 'University',
    lwSc_library: 'Library', lwSc_hospital: 'Hospital', lwSc_hotel: 'Hotel', lwSc_stadium: 'Stadium', lwSc_station: 'Station', lwSc_neighborhood: 'Neighbourhood', lwSc_road: 'Road', lwSc_airport: 'Airport',
    lwHowArrived: 'How you got there', lwTrNone: 'Not set',
    lwTr_walk: 'Walking', lwTr_bike: 'Bike', lwTr_moto: 'Motorbike', lwTr_car: 'Car', lwTr_bus: 'Bus', lwTr_train: 'Train', lwTr_plane: 'Plane', lwTr_other: 'Other',
    lwPlaces: 'Places', lwCountries: 'Countries', lwTrips: 'Trips', lwOverview: 'Overview', lwNPl1: '1 place', lwNPl: '{n} places', lwNCc1: '1 country', lwNCc: '{n} countries', lwNTr1: '1 trip', lwNTr: '{n} trips',
    lwNoMoments: 'No shifts, events or workouts logged in this period.',
    lwNoPlace: 'No place logged', lwGymNoPlace: 'Workout · place not logged', lwNoGeo: 'City and country unknown',
    lwNoScene: 'No scene type', lwSetScene: 'Choose scene', lwChangeScene: 'Change scene',
    lwNoSceneHelp1: '“{p}” has no scene type: it shows as a pin.', lwNoSceneHelp: '{n} places have no scene type (like “{p}”): they show as a pin.',
    lwFrom: 'From {p}', lwTrUnknown: 'how you got there: not set', lwTrip: 'Trip {a} → {b}',
    lwTimes1: 'Once in this period', lwTimes: '{n} times in this period',
    lwUnknown1: '1 moment without a logged place: where you were is not guessed.', lwUnknownN: '{n} moments without a logged place: where you were is not guessed.',
    lwMapNote: '“Calculated” countries come from the coordinates and a simplified map: near a coast or in a very small country it may be unknown. Searching the place again saves the one from OpenStreetMap.',
    wn_1_37_0_1: 'World|A new Timeline section: the places, countries and trips of the chosen period, with a globe and a small 3D scene for each place. Only what you logged shows up: anything without a place stays unknown.',
    wn_1_37_0_2: 'Scene type and how you got there|In Places you can pick a scene (home, office, park, beach, gym…) and in each calendar shift, how you got there (walking, bike, car, bus, train…). Both are optional.',
    wn_1_37_0_3: 'Flights and journeys|If you change country between one shift and the next, the plane flies on the globe; if you say how you got there, you see the journey before the place. With Animations off you see the result straight away.',
    wn_1_37_0_4: 'Light|The 3D is only downloaded when you open World, runs simpler on modest phones and stops when it is off screen. Searching a place now saves its city and country.'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
