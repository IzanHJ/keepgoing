const test = require('node:test');
const assert = require('assert');
const G = require('../js/gym.js');

const W = (id, date, ex, extra = {}) => ({ id, date, status: 'done', start: 1, end: 1 + 3600000, ex, ...extra });

test('Gimnasio: series, volumen y músculos', () => {
  const w = W('a', '2026-11-02', [{ eid: 'bench', sets: [{ w: 60, r: 10, done: true }, { w: 70, r: 8, done: true }, { w: 40, r: 10, done: true, warm: true }, { w: 80, r: 5 }] }]);
  const s = G.workoutStats(w);
  assert.strictEqual(s.sets, 2); // la de calentamiento y la no marcada no cuentan
  assert.strictEqual(s.volume, 600 + 560);
  assert.strictEqual(s.minutes, 60);
  assert.deepStrictEqual(s.muscles, { chest: 2, triceps: 1, shoulders: 1 });
});

test('Gimnasio: resumen semanal para el diario', () => {
  const ws = [
    W('a', '2026-11-02', [{ eid: 'squat', sets: [{ w: 100, r: 5, done: true }] }]),
    W('b', '2026-11-02', [{ eid: 'plank', sets: [{ s: 60, done: true }] }]),
    W('c', '2026-11-05', [{ eid: 'pullup', sets: [{ r: 8, done: true }, { r: 7, done: true }] }]),
    W('d', '2026-11-12', [{ eid: 'pullup', sets: [{ r: 8, done: true }] }]),
    { id: 'e', date: '2026-11-03', status: 'live', ex: [{ eid: 'bench', sets: [{ w: 50, r: 5, done: true }] }] }
  ];
  const keys = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'];
  const S = G.weekSummary(ws, keys);
  assert.deepStrictEqual(S.days, ['2026-11-02', '2026-11-05']); // días entrenados (el en curso no cuenta)
  assert.strictEqual(S.sessions, 3);
  assert.strictEqual(S.sets, 4);
  assert.strictEqual(S.muscles[0].m, 'lats');
  assert.ok(G.trainedOn(ws, '2026-11-05') && !G.trainedOn(ws, '2026-11-03'));
});

test('Gimnasio: récords y 1RM', () => {
  assert.strictEqual(G.e1rm(100, 1), 100);
  assert.strictEqual(G.e1rm(100, 10), 133.3);
  const old = W('a', '2026-11-01', [{ eid: 'bench', sets: [{ w: 80, r: 5, done: true }] }, { eid: 'pullup', sets: [{ r: 10, done: true }] }]);
  const now = W('b', '2026-11-04', [{ eid: 'bench', sets: [{ w: 85, r: 3, done: true }] }, { eid: 'pullup', sets: [{ r: 9, done: true }] }, { eid: 'squat', sets: [{ w: 100, r: 5, done: true }] }]);
  const prs = G.newRecords([old, now], now);
  assert.deepStrictEqual(prs.map(p => p.eid), ['bench']); // la sentadilla es la primera vez: no es récord
  assert.strictEqual(prs[0].type, 'w');
  const h = G.history([old, now], 'bench');
  assert.deepStrictEqual(h.map(x => x.best), [80, 85]);
  assert.deepStrictEqual(G.lastSets([old, now], 'bench'), [{ w: 85, r: 3, s: undefined, d: undefined }]);
});

test('Gimnasio: rutinas, plantillas, limpieza y catálogo', () => {
  const r = G.starterRoutine('push', 'es', 'r1');
  assert.strictEqual(r.name, 'Empuje');
  const prev = W('a', '2026-11-01', [{ eid: 'bench', sets: [{ w: 70, r: 8, done: true }] }]);
  const w = G.fromRoutine(r, [prev], [], 'w1', '2026-11-03', 5);
  assert.strictEqual(w.status, 'live');
  assert.strictEqual(w.ex[0].sets.length, 4);
  assert.strictEqual(w.ex[0].sets[0].w, 70); // propone el peso de la última vez
  assert.strictEqual(G.cleanWorkout({ id: 'x', date: 'mal' }), null);
  const c = G.cleanWorkout({ id: 'x', date: '2026-11-01', status: 'done', ex: [{ eid: 'bench', sets: [{ w: -3, r: 5.7, done: 1, hack: 1 }] }], prs: 2 });
  assert.deepStrictEqual(c.ex[0].sets[0], { r: 5, done: true });
  assert.strictEqual(c.prs, 2);
  assert.strictEqual(G.suggestHabit([{ name: 'Leer' }, { name: 'Ir al gimnasio', id: 'h' }]).id, 'h');
  const n = G.addCatalogue(require('../data/gym-exdb.json'));
  assert.ok(n > 1300);
  assert.ok(G.exercise('x0025') && G.exercise('x0025').p.includes('chest'));
  assert.ok(G.search('press banca', 'es', [], 'chest').length > 10);
  assert.strictEqual(G.search('press banca', 'es', [], 'legs').length, 0);
  // Racha de semanas: semanas ISO (lunes)
  const wk = k => { const d = new Date(k + 'T12:00:00'); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return Array.from({ length: 7 }, (_, i) => { const x = new Date(d); x.setDate(d.getDate() + i); return x.toISOString().slice(0, 10); }); };
  const ws = ['2026-10-20', '2026-10-27', '2026-11-03'].map((d, i) => W('s' + i, d, [{ eid: 'squat', sets: [{ w: 1, r: 1, done: true }] }]));
  assert.strictEqual(G.weekStreak(ws, wk, '2026-11-04', 1), 3);
});
