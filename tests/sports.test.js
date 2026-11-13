// Tests de js/sports.js (deportes del Entrenamiento, v1.57) y de su unión con js/gym.js
const assert = require('assert');
const S = require('../js/sports.js');
const G = require('../js/gym.js');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

ok(S.SPORTS.length === 18, '18 deportes');
const want = ['hockey', 'football', 'basketball', 'handball', 'volleyball', 'padel', 'athletics', 'kickboxing', 'boxing', 'hiking', 'swimming', 'cycling', 'running', 'surfing', 'karate', 'amfootball', 'rugby', 'skydiving'];
want.forEach(id => ok(S.get(id), 'existe ' + id));
S.SPORTS.forEach(s => {
  [...s.p, ...s.s].forEach(m => ok(G.MUSCLES.includes(m), s.id + ': músculo válido ' + m));
  s.ev.forEach(k => ok(S.EVENTS[k], s.id + ': evento ' + k));
  s.met.forEach(k => ok(S.METRICS.includes(k), s.id + ': dato ' + k));
  const svg = S.svg(s.id, null, { sex: 'f' });
  ok(svg.startsWith('<svg') && svg.includes('sp-on') && !/NaN|undefined/.test(svg), s.id + ': figura válida');
  const vb = svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
  ok(vb[2] === vb[3] && vb[2] > 50 && vb[2] < 400, s.id + ': encuadre cuadrado');
});
ok(S.name('football', 'es') === 'Fútbol' && S.name('football', 'en') === 'Football', 'nombres');
ok(S.matchWord('boxing', 'es') === 'Combate' && S.matchWord('running', 'es') === 'Competición' && S.matchWord('padel', 'es') === 'Partido', 'palabra de partido');

// Resultado
const r = S.cleanRes({ us: '3', them: 1, km: 'x', pos: 0, out: 'q', mine: 2.7 });
ok(r.us === 3 && r.them === 1 && r.mine === 2 && !('km' in r) && !('pos' in r) && !('out' in r), 'cleanRes');
ok(S.cleanRes({}) === null, 'resultado vacío');
ok(S.outcome({ us: 1, them: 1 }) === 'd' && S.outcome({ us: 2, them: 1 }) === 'w' && S.outcome({ out: 'l', us: 5, them: 0 }) === 'l', 'outcome');
const cs = S.cleanSport({ sp: 'football', st: ['match', 'match', 'zzz'], ev: ['goal', 'ko'], res: { us: 2, them: 0 } });
ok(cs.st.length === 1 && cs.ev.join() === 'goal' && cs.res.us === 2, 'cleanSport filtra eventos de otro deporte');
ok(Object.keys(S.cleanSport({ sp: 'chess' })).length === 0, 'deporte desconocido');

// Con gym.js: minutos, músculos, resumen, log y limpieza
const t0 = new Date('2026-11-10T15:00:00').getTime();
const w = { id: 'a1', date: '2026-11-10', status: 'done', sp: 'football', st: ['match'], ev: ['goal'], res: { us: 3, them: 1, mine: 1 }, start: t0, end: t0 + 120 * 60000, ex: [], note: 'bien' };
const st = G.workoutStats(w);
ok(st.minutes === 120 && st.muscles.quads === 6 && st.muscles.glutes === 3, 'músculos por minutos');
const sum = G.summary([w], '2026-11-09', '2026-11-15');
ok(sum.sessions === 1 && sum.days.length === 1 && sum.minutes === 120, 'resumen con deporte');
const log = G.logDays([w], '');
ok(log.length === 1 && log[0].items[0].kind === 'sp' && log[0].items[0].wid === 'a1', 'log con deporte');
const c = G.cleanWorkout(w);
ok(c.sp === 'football' && c.st[0] === 'match' && c.res.us === 3 && c.note === 'bien', 'cleanWorkout conserva el deporte');
ok(S.line(c, 'es').includes('Partido') && S.line(c, 'es').includes('3–1') && S.line(c, 'es').includes('Gol'), 'línea resumen');
ok(S.recent([w, { ...w, id: 'b', sp: 'padel', date: '2026-11-11' }]).join() === 'padel,football', 'recientes');
ok(!G.isSport({ ex: [] }) && G.isSport(w), 'isSport');
console.log('sports.test.js: ' + n + ' comprobaciones OK');
