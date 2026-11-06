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
  };
  const en = {
    lwG_x: '', lwGround: 'Ground', lwShape: 'Shape',
    lwAlt: 'Alternative', lwAltN: 'Alternative {n}', lwAltOther: 'Another', lwAltSave: 'Keep this one',
    lwAltHint: 'The same pieces laid out differently. Tap “Another” until you like it.',
    lwRestore: 'Restore', lwRestoreQ: 'Go back to the original scene? Your version will be lost.',
    lwEdBuilt: 'You’re editing “{n}”. It’s saved as your version and you can always restore the original.',
  };
  for (const [k, [a, b]] of Object.entries(scenes)) { es['lwSc_' + k] = a; en['lwSc_' + k] = b; }
  for (const [k, [a, b]] of Object.entries(pieces)) { es['lwA_' + k] = a; en['lwA_' + k] = b; }
  for (const [k, [a, b]] of Object.entries(groups)) { es['lwG_' + k] = a; en['lwG_' + k] = b; }
  for (const [k, [a, b]] of Object.entries(grounds)) { es['lwGr_' + k] = a; en['lwGr_' + k] = b; }
  for (const [k, [a, b]] of Object.entries(shapes)) { es['lwSh_' + k] = a; en['lwSh_' + k] = b; }
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();
