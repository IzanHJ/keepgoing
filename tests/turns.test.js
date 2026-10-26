const test = require('node:test');
const assert = require('assert');
const T = require('../js/turns.js');

// Pruebas de TurnoFlow (repositorio cebo) adaptadas al Calendario de KeepGoing
test('Calendario de turnos: lógica', () => {

// Ciclos: longitudes conocidas
assert.strictEqual(T.PATTERNS.dupont.cycle.length, 28);
assert.strictEqual(T.PATTERNS.panama.cycle.length, 28);
assert.strictEqual(T.PATTERNS['223'].cycle.length, 14);
assert.strictEqual(T.PATTERNS.continental.cycle.length, 8);

// Horas: noche 22-06 con 30' de descanso = 7.5h
const d = T.defaults();
const noche = d.shifts.find((s) => s.id === 's_noc');
assert.strictEqual(T.entryHours(noche, {}), 7.5);

// Rotación 4x4 durante 16 días -> 8 días de turno
const data = T.defaults();
const n = T.applyRotation(data, { cycle: '4x4' && T.PATTERNS['4x4'].cycle, map: { A: 's_man' }, start: '2026-01-05', offset: 0, days: 16, overwrite: false });
assert.strictEqual(n, 8);
assert.ok(data.days['2026-01-05'] && !data.days['2026-01-09'] && data.days['2026-01-13']);

// Extras semanales: umbral 40h, 6 mañanas de 7.5h = 45h -> 5h extra; paga = 12*(40+5*1.5)
const d2 = T.defaults();
d2.shifts.find((s) => s.id === 's_man').breakMin = 30; // 7.5h
for (let i = 0; i < 6; i++) d2.days['2026-03-0' + (2 + i)] = [{ sid: 's_man', note: '' }]; // lun 2 ... sáb 7
const r = T.report(d2, '2026-03-02', '2026-03-08', 1);
assert.strictEqual(r.hours, 45);
assert.strictEqual(r.otHours, 5);
assert.strictEqual(r.pay, 12 * (40 + 5 * 1.5));

// Sanitize: rechaza basura y limpia colores/ids inválidos
assert.throws(() => T.sanitize(null));
assert.throws(() => T.sanitize({ jobs: [{ id: '<script>' }] }));
const s = T.sanitize({ jobs: [{ id: 'j', name: 'x'.repeat(500), color: 'red' }], shifts: [{ id: 'a', jobId: 'zzz', color: 'javascript:1', start: '25:99' }], days: { '2026-01-01': [{ sid: 'a', note: 'n' }, { sid: 'nope' }], bad: [] } });
assert.strictEqual(s.jobs[0].name.length, 100);
assert.strictEqual(s.jobs[0].color, '#4f6bed');
assert.strictEqual(s.shifts[0].start, '');
assert.strictEqual(Object.keys(s.days).length, 1);
assert.strictEqual(s.days['2026-01-01'].length, 1);

// ICS ida y vuelta
const ics = T.toICS(d2, '2026-03-01', '2026-03-31', new Date('2026-01-01T00:00:00Z'));
assert.ok(ics.includes('DTSTART:20260302T060000'));
assert.strictEqual(T.parseICS(ics).length, 6);
// Tarifas especiales: noche entera a 15 €/h
const d3 = T.defaults(); d3.days['2026-03-02'] = [{ sid: 's_noc', note: '' }];
d3.jobs[0].specials = [{ rate: 15, from: '22:00', to: '06:00', mode: 'mult', plus: 1 }];
assert.strictEqual(T.report(d3, '2026-03-02', '2026-03-02', 1).pay, 7.5 * 15);
// Plus fijo (+2 €/h sobre el precio normal)
d3.jobs[0].specials = [{ rate: 0, from: '22:00', to: '06:00', mode: 'fixed', plus: 2 }];
assert.strictEqual(T.report(d3, '2026-03-02', '2026-03-02', 1).pay, 7.5 * 14);
// Solapamiento parcial: tarde 14-22 con especial 20-23 a 20 €/h -> 25 % del turno
const d4 = T.defaults(); d4.days['2026-03-02'] = [{ sid: 's_tar', note: '' }];
d4.jobs[0].specials = [{ rate: 20, from: '20:00', to: '23:00', mode: 'mult', plus: 1 }];
assert.strictEqual(T.report(d4, '2026-03-02', '2026-03-02', 1).pay, 7.5 * (0.75 * 12 + 0.25 * 20));
// Plus de extras fijo: 5 h extra a 12 + 3 = 15 €/h
const d5 = T.defaults(); d5.jobs[0].otMode = 'fixed'; d5.jobs[0].otPlus = 3;
for (let i = 0; i < 6; i++) d5.days['2026-03-0' + (2 + i)] = [{ sid: 's_man', note: '' }];
assert.strictEqual(T.report(d5, '2026-03-02', '2026-03-08', 1).pay, 40 * 12 + 5 * 15);
// Migración: otMult antiguo -> otPlus
assert.strictEqual(T.sanitize({ jobs: [{ id: 'j', otMult: 2 }] }).jobs[0].otPlus, 2);
assert.strictEqual(T.sanitize({ jobs: [{ id: 'j', specials: Array(20).fill({ rate: 5 }) }] }).jobs[0].specials.length, 6);
console.log('OK: todas las pruebas pasan');

});

test('v1.23: tipos sin paga y categorías sin paga suman horas pero no dinero', () => {
  const T = require('../js/turns.js');
  const d = T.defaults();
  d.jobs.push({ id: 'ocio', name: 'Ocio', color: '#000000', rate: 50, otWeekHours: 0, otMode: 'mult', otPlus: 1.5, specials: [], paid: false });
  d.shifts.push({ id: 'cine', jobId: 'ocio', name: 'Cine', emoji: '', color: '#000000', kind: 'work', start: '18:00', end: '20:00', breakMin: 0, diffPct: 0, alarmMin: 0 });
  d.shifts.push({ id: 'gym', jobId: 'job1', name: 'Gym', emoji: '', color: '#000000', kind: 'k_gym', start: '10:00', end: '11:00', breakMin: 0, diffPct: 0, alarmMin: 0 });
  d.days['2026-10-05'] = [{ sid: 'cine', note: '', start: '', end: '' }, { sid: 'gym', note: '', start: '', end: '' }];
  const r = T.report(d, '2026-10-05', '2026-10-05', 1, (k) => k === 'work');
  assert.equal(r.hours, 3); assert.equal(r.pay, 0);
  assert.equal(T.sanitize(d).shifts.find((s) => s.id === 'gym').kind, 'k_gym');
  assert.equal(T.sanitize(d).jobs.find((j) => j.id === 'ocio').paid, false);
});

test('v1.23: rutinas de un día y semana tipo', () => {
  const T = require('../js/turns.js');
  const d = T.defaults();
  const day = { kind: 'day', day: [{ sid: 's_man' }, { sid: 'nope' }, { sid: 's_for', start: '15:00', end: '16:00' }] };
  assert.equal(T.applyRoutine(d, day, { from: '2026-10-05', to: '2026-10-11', weekdays: [0, 2] }), 2); // lunes y miércoles
  assert.deepEqual(d.days['2026-10-07'].map((e) => e.sid), ['s_man', 's_for']);
  assert.equal(d.days['2026-10-07'][1].start, '15:00');
  const week = { kind: 'week', week: { 5: [{ sid: 's_lib' }] } };
  assert.equal(T.applyRoutine(d, week, { from: '2026-10-05', to: '2026-10-18', overwrite: true }), 2); // dos sábados
  assert.deepEqual(d.days['2026-10-10'].map((e) => e.sid), ['s_lib']);
  T.applyRoutine(d, day, { from: '2026-10-05', to: '2026-10-05' });
  assert.equal(d.days['2026-10-05'].length, 4); // se añade a lo que había
});

// v1.24: tarifa propia del tipo (+€/h o +%) sobre la de su categoría
{
  const d = T.sanitize({ jobs: [{ id: 'j1', name: 'J', rate: 10, otWeekHours: 0 }], shifts: [{ id: 'a', jobId: 'j1', name: 'A', kind: 'night', start: '22:00', end: '06:00' }, { id: 'b', jobId: 'j1', name: 'B', kind: 'work', start: '09:00', end: '13:00' }], days: { '2026-10-05': [{ sid: 'a' }, { sid: 'b' }] } });
  const paid = () => true;
  assert.strictEqual(T.report(d, '2026-10-05', '2026-10-05', 1, paid).pay, 120);
  assert.strictEqual(T.report(d, '2026-10-05', '2026-10-05', 1, paid, (k) => k === 'night' ? { mode: 'fixed', v: 2 } : null).pay, 8 * 12 + 4 * 10);
  assert.strictEqual(T.report(d, '2026-10-05', '2026-10-05', 1, paid, (k) => k === 'night' ? { mode: 'pct', v: 25 } : { mode: 'same', v: 0 }).pay, 8 * 12.5 + 4 * 10);
  // Las rutinas marcan sus turnos con rt y sanitize lo conserva
  const data = { shifts: d.shifts, days: {} };
  T.applyRoutine(data, { id: 'r1', kind: 'day', day: [{ sid: 'b', start: '', end: '' }] }, { from: '2026-10-06', to: '2026-10-06' });
  assert.strictEqual(data.days['2026-10-06'][0].rt, 'r1');
  assert.strictEqual(T.sanitize({ ...d, days: data.days }).days['2026-10-06'][0].rt, 'r1');
}
