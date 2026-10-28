/* KeepGoing — Lugares del Calendario (v1.26): lógica pura, sin DOM. Se usa en el navegador (window.KGPlaces) y en los tests de Node.
   Un lugar = { id, name, icon (texto o emoji), color, addr, lat, lon }. Aquí: leer coordenadas de lo que pega el usuario (un enlace
   de Google Maps o de Apple Maps, o «40.41, -3.70»), el enlace para abrirlo en la app de Mapas del dispositivo y agrupar los lugares
   que trae un calendario importado (.ics). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KGPlaces = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const okLat = v => Number.isFinite(v) && v >= -90 && v <= 90, okLon = v => Number.isFinite(v) && v >= -180 && v <= 180;
  const pair = (a, b) => { const lat = +a, lon = +b; return okLat(lat) && okLon(lon) ? { lat: Math.round(lat * 1e6) / 1e6, lon: Math.round(lon * 1e6) / 1e6 } : null; };
  // Coordenadas dentro de un texto pegado; null si no hay
  function parseCoords(text) {
    const s = String(text || '').trim();
    if (!s) return null;
    let m = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(s); // el sitio exacto de un enlace largo de Google Maps
    if (m) return pair(m[1], m[2]);
    m = /[?&](?:q|query|ll|daddr|destination|sll)=(-?\d+(?:\.\d+)?)(?:,|%2C)\s*(-?\d+(?:\.\d+)?)/i.exec(s);
    if (m) return pair(m[1], m[2]);
    m = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(s);
    if (m) return pair(m[1], m[2]);
    m = /^geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i.exec(s);
    if (m) return pair(m[1], m[2]);
    m = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(s);
    if (m) return pair(m[1], m[2]);
    return null;
  }
  const isUrl = s => /^https?:\/\//i.test(String(s || '').trim());
  // Un enlace corto (maps.app.goo.gl, goo.gl/maps) no se puede leer desde la app: hay que abrirlo
  const isShortLink = s => /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)\//i.test(String(s || '').trim());
  // Nombre del sitio en un enlace largo de Google Maps (/maps/place/Nombre+del+sitio/…)
  function placeNameOf(text) {
    const m = /\/maps\/place\/([^/@?]+)/.exec(String(text || ''));
    if (!m) return '';
    try { return decodeURIComponent(m[1].replace(/\+/g, ' ')).trim().slice(0, 200); } catch (e) { return ''; }
  }
  // Enlace para abrir el lugar en la app de Mapas: Apple Maps en iPhone, iPad y Mac; Google Maps en lo demás
  function mapUrl(place, apple) {
    const p = place || {}, has = okLat(+p.lat) && okLon(+p.lon) && p.lat !== '' && p.lat != null;
    const q = has ? p.lat + ',' + p.lon : String(p.addr || p.name || '').trim();
    if (!q) return '';
    if (apple) return 'https://maps.apple.com/?' + (has ? 'll=' + p.lat + ',' + p.lon + '&q=' + encodeURIComponent(p.name || p.addr || q) : 'q=' + encodeURIComponent(q));
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
  }
  // Lugares distintos que trae una lista de eventos importados ({ location }), con cuántas veces sale cada uno
  function distinct(events) {
    const m = new Map();
    for (const e of events || []) {
      const loc = String((e && e.location) || '').trim(); if (!loc) continue;
      const key = loc.toLowerCase();
      const r = m.get(key) || m.set(key, { key, addr: loc, n: 0 }).get(key); r.n++;
    }
    return [...m.values()].sort((a, b) => b.n - a.n || a.addr.localeCompare(b.addr));
  }
  // Nombre corto para un lugar a partir de su dirección (lo de antes de la primera coma)
  const shortName = addr => String(addr || '').split(/[,\n]/)[0].trim().slice(0, 40) || String(addr || '').trim().slice(0, 40);
  return { parseCoords, isUrl, isShortLink, placeNameOf, mapUrl, distinct, shortName };
});
