/* KeepGoing — Mundo de la Línea de tiempo (v1.37): lógica pura, sin DOM ni 3D. window.KGWorld en el navegador y require en los tests.
   · Catálogo de escenarios (casa, oficina, parque…) y de transportes. Ampliar = añadir una fila aquí y su modelo en js/lifeworld.js.
   · Mapa del mundo: decodifica el TopoJSON de data/world-110m.json (Natural Earth, dominio público) y dice en qué país cae
     una coordenada, sin internet. Es un mapa simplificado: un punto en la costa o en un país muy pequeño puede no caer en ninguno.
   · Momentos: ordena lo registrado de un periodo (turnos con lugar, transporte, entrenos) y detecta viajes entre países.
   Nunca inventa: lo que no tiene lugar queda como «desconocido» y cada dato lleva su origen (reg, calc, est, na). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KGWorld = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // Escenarios: id → icono de línea de la app (para listas y botones)
  const SCENES = [
    ['home', 'house'], ['office', 'briefcase'], ['park', 'tree'], ['beach', 'beach'], ['gym', 'dumbbell'], ['restaurant', 'fork'],
    ['mall', 'bag'], ['university', 'cap'], ['library', 'book'], ['hospital', 'cross'], ['hotel', 'bed'], ['stadium', 'trophy'],
    ['station', 'train'], ['neighborhood', 'grid'], ['road', 'road'], ['airport', 'plane'],
    // v1.42: 8 exteriores y 4 interiores (maqueta sin dos paredes)
    ['supermarket', 'cart'], ['apartments', 'building'], ['cafe', 'cup'], ['school', 'school'], ['cinema', 'film'], ['pool', 'pool'],
    ['mountain', 'mountain'], ['pharmacy', 'pill'], ['office_in', 'desk'], ['living', 'sofa'], ['bedroom', 'bed'], ['classroom', 'board'],
  ];
  const SCENE_IDS = SCENES.map(s => s[0]);
  const okScene = s => SCENE_IDS.includes(s);
  // Transportes: «cómo llegaste» a un turno o evento
  const TRANSPORTS = ['walk', 'bike', 'moto', 'car', 'bus', 'train', 'plane', 'other'];
  const okTransport = s => TRANSPORTS.includes(s);

  /* ---- TopoJSON → países. Cada país: { a2, n (nombre en inglés), polys: [[[lon, lat], …] anillos…], box: [minLon, minLat, maxLon, maxLat] } ---- */
  function decodeTopo(topo) {
    if (!topo || !topo.arcs || !topo.objects || !topo.objects.countries) return [];
    const tf = topo.transform, sx = tf ? tf.scale[0] : 1, sy = tf ? tf.scale[1] : 1, tx = tf ? tf.translate[0] : 0, ty = tf ? tf.translate[1] : 0;
    const arcs = topo.arcs.map(a => { let x = 0, y = 0; return a.map(p => { if (tf) { x += p[0]; y += p[1]; return [x * sx + tx, y * sy + ty]; } return [p[0], p[1]]; }); });
    const arc = i => (i < 0 ? arcs[~i].slice().reverse() : arcs[i]);
    const ring = ids => { const out = []; ids.forEach((i, k) => { const a = arc(i); out.push(...(k ? a.slice(1) : a)); }); return out; };
    const out = [];
    for (const g of topo.objects.countries.geometries || []) {
      let polys = [];
      if (g.type === 'Polygon') polys = [g.arcs.map(ring)];
      else if (g.type === 'MultiPolygon') polys = g.arcs.map(p => p.map(ring));
      else continue;
      let a = 180, b = 90, c = -180, d = -90;
      for (const p of polys) for (const [x, y] of p[0]) { if (x < a) a = x; if (y < b) b = y; if (x > c) c = x; if (y > d) d = y; }
      out.push({ a2: (g.properties && g.properties.a2) || '', n: (g.properties && g.properties.n) || '', polys, box: [a, b, c, d] });
    }
    return out;
  }
  // Punto dentro de un anillo (rayo horizontal)
  function inRing(x, y, r) {
    let inside = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  // País de una coordenada, o null. Un polígono con huecos: dentro del primero y fuera de los demás.
  function countryAt(countries, lat, lon) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    for (const c of countries || []) {
      const [a, b, cc, d] = c.box; if (lon < a || lon > cc || lat < b || lat > d) continue;
      for (const p of c.polys) if (inRing(lon, lat, p[0]) && !p.slice(1).some(h => inRing(lon, lat, h))) return c;
    }
    return null;
  }
  // Centro aproximado de un país (media del contorno más grande), para el globo
  function centerOf(c) {
    if (!c || !c.polys.length) return null;
    const big = c.polys.reduce((m, p) => (p[0].length > m[0].length ? p : m), c.polys[0])[0];
    let x = 0, y = 0; for (const [a, b] of big) { x += a; y += b; }
    return { lat: y / big.length, lon: x / big.length };
  }

  /* ---- Ciudad y país de una dirección de OpenStreetMap ----
     Al buscar un lugar, Nominatim devuelve address = { city | town | village | municipality, country_code }. Se guardan tal cual. */
  function fromOsmAddress(addr) {
    if (!addr || typeof addr !== 'object') return {};
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || '';
    const cc = typeof addr.country_code === 'string' && /^[a-z]{2}$/i.test(addr.country_code) ? addr.country_code.toUpperCase() : '';
    return { ...(city ? { city: String(city).slice(0, 80) } : {}), ...(cc ? { cc } : {}) };
  }

  /* ---- Geografía de un lugar ----
     place = { lat, lon, city, cc, addr }. Devuelve { cc, ccSt, city, citySt }:
     cc y city guardados al buscar = 'reg'; país sacado de las coordenadas = 'calc'; sin nada = null y 'na'. */
  function geoOf(place, countries) {
    if (!place) return { cc: null, ccSt: 'na', city: null, citySt: 'na' };
    let cc = place.cc || null, ccSt = cc ? 'reg' : 'na';
    if (!cc && place.lat != null && place.lon != null) { const c = countryAt(countries, +place.lat, +place.lon); if (c && c.a2) { cc = c.a2; ccSt = 'calc'; } }
    const city = place.city || null;
    return { cc, ccSt, city, citySt: city ? 'reg' : 'na' };
  }

  /* ---- Momentos de un periodo ----
     items = [{ date, min (minutos desde las 00:00, o null si es todo el día), kind ('shift'|'event'|'gym'), name, place (o null),
                tr (transporte o ''), color }] ya calculados por app.js. Los ordena y, con la geografía de cada lugar, marca:
       · move: cambió el lugar respecto al momento anterior con lugar (y se sabe cómo, si hay tr)
       · trip: cambió el país (los dos conocidos) → vuelo en el globo
     No rellena nada: un momento sin lugar no cambia el «último lugar conocido» ni se supone dónde estabas. */
  function moments(items, geo) {
    const xs = (items || []).filter(x => x && /^\d{4}-\d{2}-\d{2}$/.test(x.date)).slice()
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.min ?? -1) - (b.min ?? -1)));
    let last = null;
    return xs.map(x => {
      const g = x.place ? geo(x.place) : { cc: null, ccSt: 'na', city: null, citySt: 'na' };
      const m = { ...x, geo: g, move: false, trip: null };
      if (x.place) {
        if (last && last.place.id !== x.place.id) {
          m.move = true; m.from = last.place;
          if (last.geo.cc && g.cc && last.geo.cc !== g.cc) m.trip = { from: last.geo.cc, to: g.cc, fromPlace: last.place, toPlace: x.place };
        }
        last = { place: x.place, geo: g };
      }
      return m;
    });
  }
  // Resumen de un periodo: lugares (veces), países (veces) y viajes
  function summary(ms) {
    const places = new Map(), countries = new Map(), trips = [];
    let unknown = 0;
    for (const m of ms) {
      if (!m.place) { if (m.kind !== 'gym') unknown++; continue; }
      const p = places.get(m.place.id) || places.set(m.place.id, { place: m.place, n: 0, geo: m.geo }).get(m.place.id); p.n++;
      if (m.geo.cc) { const c = countries.get(m.geo.cc) || countries.set(m.geo.cc, { cc: m.geo.cc, n: 0, st: m.geo.ccSt }).get(m.geo.cc); c.n++; }
      if (m.trip) trips.push(m);
    }
    const by = (a, b) => b.n - a.n;
    return { places: [...places.values()].sort(by), countries: [...countries.values()].sort(by), trips, unknown };
  }

  /* ---- Globo: de grados a un punto de la esfera (y arriba = norte) y un arco entre dos puntos ---- */
  function toXYZ(lat, lon, r = 1) {
    const phi = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180;
    return [-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)];
  }
  // n+1 puntos sobre el círculo máximo de a a b, levantados en el centro (h = altura máxima sobre la esfera)
  function arc(a, b, n = 48, h = 0.25) {
    const A = toXYZ(a.lat, a.lon), B = toXYZ(b.lat, b.lon), dot = Math.max(-1, Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2])), w = Math.acos(dot), out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, s = Math.sin(w) || 1, k1 = w ? Math.sin((1 - t) * w) / s : 1 - t, k2 = w ? Math.sin(t * w) / s : t;
      const p = [A[0] * k1 + B[0] * k2, A[1] * k1 + B[1] * k2, A[2] * k1 + B[2] * k2], len = Math.hypot(...p) || 1, r = 1 + h * Math.sin(Math.PI * t) * Math.min(1, w / 1.2 + .25);
      out.push(p.map(v => v / len * r));
    }
    return out;
  }

  /* ---- v1.40: Recorrido. Los trayectos del periodo, sacados del «Medio de transporte» y el «Lugar» de cada turno ----
     Cada momento con transporte registrado es un trayecto: { tr, dep, arr ('HH:MM' o ''), min (duración o null), from (último lugar
     conocido, solo si cambió), to (su lugar o null) }. La duración sale de la salida y la llegada; si falta una, no se supone. */
  const hm = s => (typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s) ? +s.slice(0, 2) * 60 + +s.slice(3) : null);
  function legDur(dep, arr) { const a = hm(dep), b = hm(arr); if (a == null || b == null) return null; const d = b - a; return d < 0 ? d + 1440 : d; }
  function legs(ms) {
    const out = [];
    (ms || []).forEach((m, i) => {
      if (!m || !okTransport(m.tr)) return;
      out.push({ i, date: m.date, time: m.time || '', tr: m.tr, dep: hm(m.trDep) != null ? m.trDep : '', arr: hm(m.trArr) != null ? m.trArr : '', min: legDur(m.trDep, m.trArr),
        from: m.move ? m.from : null, to: m.place || null, name: m.name, color: m.color, trip: m.trip || null, geo: m.geo });
    });
    return out;
  }
  // Totales: por transporte (veces, minutos con hora de salida y llegada) y rutas repetidas (de → a, con el mismo transporte)
  function legSummary(ls) {
    const byTr = new Map(), routes = new Map(), total = { n: 0, min: 0, nMin: 0 };
    for (const l of ls || []) {
      const t = byTr.get(l.tr) || byTr.set(l.tr, { tr: l.tr, n: 0, min: 0, nMin: 0 }).get(l.tr);
      const rk = `${l.from ? l.from.id : '?'}>${l.to ? l.to.id : '?'}>${l.tr}`, r = routes.get(rk) || routes.set(rk, { from: l.from, to: l.to, tr: l.tr, n: 0, min: 0, nMin: 0 }).get(rk);
      for (const x of [t, r, total]) { x.n++; if (l.min != null) { x.min += l.min; x.nMin++; } }
    }
    const by = (a, b) => b.n - a.n || b.min - a.min;
    return { byTr: [...byTr.values()].sort(by), routes: [...routes.values()].filter(r => r.to).sort(by), total };
  }
  // El recorrido de un día: las paradas en orden (sin repetir la misma seguida) y cómo se llegó a cada una
  function route(ms) {
    const out = [];
    for (const m of ms || []) {
      if (!m.place) continue;
      const last = out[out.length - 1];
      if (last && last.place.id === m.place.id) continue;
      out.push({ place: m.place, tr: okTransport(m.tr) ? m.tr : '', dep: hm(m.trDep) != null ? m.trDep : '', arr: hm(m.trArr) != null ? m.trArr : '', min: legDur(m.trDep, m.trArr), time: m.time || '' });
    }
    return out;
  }

  return { SCENES, SCENE_IDS, okScene, TRANSPORTS, okTransport, decodeTopo, inRing, countryAt, centerOf, fromOsmAddress, geoOf, moments, summary, toXYZ, arc, legDur, legs, legSummary, route };
});
