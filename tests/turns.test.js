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
