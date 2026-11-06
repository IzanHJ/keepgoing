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

// v1.39: el informe solo cuenta horas, turnos y días (ya no hay paga ni extras)
const d2 = T.defaults();
for (let i = 0; i < 6; i++) d2.days['2026-03-0' + (2 + i)] = [{ sid: 's_man', note: '' }]; // lun 2 ... sáb 7
const r = T.report(d2, '2026-03-02', '2026-03-08', 1);
assert.strictEqual(r.hours, 45);
assert.strictEqual(r.days, 6);
assert.strictEqual(r.pay, undefined);

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
// v1.39: los campos de paga antiguos desaparecen al validar
const sj = T.sanitize({ jobs: [{ id: 'j', rate: 9, otMult: 2, paid: false, specials: [{ rate: 5 }] }], shifts: [{ id: 'a', jobId: 'j', diffPct: 10, rateMode: 'fixed', rateV: 2 }] });
assert.deepStrictEqual(Object.keys(sj.jobs[0]).sort(), ['color', 'id', 'name']);
assert.ok(!('diffPct' in sj.shifts[0]) && !('rateMode' in sj.shifts[0]));
console.log('OK: todas las pruebas pasan');

});

test('v1.23: las categorías antiguas «sin paga» siguen sumando horas', () => {
  const d = T.defaults();
  d.jobs.push({ id: 'ocio', name: 'Ocio', color: '#000000', paid: false });
  d.shifts.push({ id: 'cine', jobId: 'ocio', name: 'Cine', emoji: '', color: '#000000', kind: 'work', start: '18:00', end: '20:00', breakMin: 0, alarmMin: 0 });
  d.days['2026-10-05'] = [{ sid: 'cine', note: '', start: '', end: '' }];
  assert.equal(T.report(d, '2026-10-05', '2026-10-05').hours, 2);
  assert.equal(T.report(d, '2026-10-05', '2026-10-05').byJob.ocio.hours, 2);
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
  assert.strictEqual(T.report(d, '2026-10-05', '2026-10-05').hours, 12);
  // Las rutinas marcan sus turnos con rt y sanitize lo conserva
  const data = { shifts: d.shifts, days: {} };
  T.applyRoutine(data, { id: 'r1', kind: 'day', day: [{ sid: 'b', start: '', end: '' }] }, { from: '2026-10-06', to: '2026-10-06' });
  assert.strictEqual(data.days['2026-10-06'][0].rt, 'r1');
  assert.strictEqual(T.sanitize({ ...d, days: data.days }).days['2026-10-06'][0].rt, 'r1');
}

test('v1.26: el descanso no se resta en una jornada partida y se puede cambiar por día', () => {
  const s = { id: 'p', start: '09:00', end: '20:00', breakMin: 210 };
  const day = [{ sid: 'p', start: '09:00', end: '14:00' }, { sid: 'p', start: '17:30', end: '20:00' }];
  assert.equal(T.entryHours(s, day[0], day), 5);
  assert.equal(T.entryHours(s, day[1], day), 2.5);
  assert.equal(T.entryHours(s, { sid: 'p' }, [{ sid: 'p' }]), 7.5);
  assert.equal(T.entryHours(s, { sid: 'p', brk: 60 }, [{ sid: 'p' }]), 10);
  const r = T.report({ jobs: [{ id: 'j', rate: 10, otWeekHours: 0, specials: [] }], shifts: [{ ...s, jobId: 'j', kind: 'work', diffPct: 0 }], days: { '2026-10-27': day } }, '2026-10-27', '2026-10-27', 1);
  assert.equal(r.hours, 7.5);
});

test('v1.26: .ics con hora y lugar', () => {
  const ics = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART:20261102T090000\r\nDTEND:20261102T140000\r\nSUMMARY:Turno\r\nLOCATION:Oficina\\, Calle Mayor 1\\, Madrid\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20261103\r\nSUMMARY:Fiesta\r\nEND:VEVENT\r\nEND:VCALENDAR';
  const ev = T.parseICS(ics);
  assert.deepStrictEqual(ev[0], { date: '2026-11-02', title: 'Turno', start: '09:00', end: '14:00', location: 'Oficina, Calle Mayor 1, Madrid' });
  assert.deepStrictEqual(ev[1], { date: '2026-11-03', title: 'Fiesta' });
  const z = T.parseICS('BEGIN:VEVENT\nDTSTART:20261102T080000Z\nEND:VEVENT')[0];
  const d = new Date(Date.UTC(2026, 10, 2, 8, 0));
  assert.strictEqual(z.start, String(d.getHours()).padStart(2, '0') + ':00');
  const s = T.sanitize({ jobs: [], shifts: [], days: {}, ext: [{ date: '2026-11-02', title: 'x', start: '09:00', end: 'bad', location: 'Ofi', pl: 'p1' }] });
  assert.deepStrictEqual(s.ext[0], { date: '2026-11-02', title: 'x', start: '09:00', end: '', location: 'Ofi', pl: 'p1' });
});

test('v1.26: el .ics exportado lleva el lugar', () => {
  const data = { shifts: [{ id: 's1', name: 'Mañana', emoji: '', start: '09:00', end: '14:00', placeId: 'p1' }], days: { '2026-11-02': [{ sid: 's1' }], '2026-11-03': [{ sid: 's1', pl: '-' }] }, places: [{ id: 'p1', name: 'Oficina', addr: 'Calle Mayor 1, Madrid', lat: 40.4, lon: -3.7 }] };
  const ics = T.toICS(data, '2026-11-02', '2026-11-03', new Date(0));
  assert.strictEqual((ics.match(/LOCATION:/g) || []).length, 1);
  assert.ok(ics.includes('LOCATION:Calle Mayor 1\\, Madrid'));
  assert.ok(ics.includes('GEO:40.4;-3.7'));
});

test('v1.26: un fichaje con otra categoría cuenta en la de ese día', () => {
  const data = { jobs: [{ id: 'j1', rate: 10, otWeekHours: 0, otMode: 'mult', otPlus: 1.5, specials: [] }, { id: 'j2', rate: 20, otWeekHours: 0, otMode: 'mult', otPlus: 1.5, specials: [] }], shifts: [{ id: 's1', jobId: 'j1', kind: 'work', start: '09:00', end: '11:00', breakMin: 0, diffPct: 0 }], days: { '2026-11-02': [{ sid: 's1' }, { sid: 's1', start: '15:00', end: '16:00', job: 'j2' }] } };
  const r = T.report(data, '2026-11-02', '2026-11-02', 1, () => true, null);
  assert.strictEqual(r.byJob.j1.hours, 2);
  assert.strictEqual(r.byJob.j2.hours, 1);
});

test('v1.26.1: lugar puntual en el .ics y al validar', () => {
  const data = { shifts: [{ id: 's1', name: 'Mañana', emoji: '', start: '09:00', end: '14:00', placeId: 'p1' }], days: { '2026-11-02': [{ sid: 's1', plx: { addr: 'Hospital, Madrid' } }] }, places: [{ id: 'p1', name: 'Oficina', addr: 'Calle Mayor 1' }] };
  const ics = T.toICS(data, '2026-11-02', '2026-11-02', new Date(0));
  assert.ok(ics.includes('LOCATION:Hospital\\, Madrid')); assert.ok(!ics.includes('Calle Mayor'));
  const s = T.sanitize({ jobs: [], shifts: [{ id: 's1', name: 'x' }], days: { '2026-11-02': [{ sid: 's1', plx: { addr: 'Hospital' } }, { sid: 's1', plx: { addr: '  ' } }] } });
  assert.deepStrictEqual(s.days['2026-11-02'][0].plx, { addr: 'Hospital' }); assert.strictEqual(s.days['2026-11-02'][1].plx, undefined);
});

test('v1.39: medio de transporte (la entrada del día gana; «-» lo quita ese día)', () => {
  const s = { id: 's1', start: '09:00', end: '14:00', tr: 'bus', trDep: '08:20', trArr: '08:50' };
  assert.deepStrictEqual(T.entryTransport(s, { sid: 's1' }), { mode: 'bus', dep: '08:20', arr: '08:50' });
  assert.deepStrictEqual(T.entryTransport(s, { sid: 's1', tr: 'car', trArr: '08:40' }), { mode: 'car', dep: '08:20', arr: '08:40' });
  assert.strictEqual(T.entryTransport(s, { sid: 's1', tr: '-' }), null);
  assert.strictEqual(T.entryTransport({ id: 'x' }, { sid: 'x' }), null);
  const v = T.sanitize({ jobs: [], shifts: [{ id: 's1', name: 'A', tr: 'rocket', trDep: '99:00' }, { id: 's2', name: 'B', tr: 'walk', trDep: '07:00', trArr: 'x' }], days: { '2026-11-02': [{ sid: 's1', tr: '-', trDep: '07:00' }, { sid: 's2', tr: 'train', trDep: '06:10', trArr: '06:55' }] } });
  assert.ok(!('tr' in v.shifts[0]));
  assert.deepStrictEqual([v.shifts[1].tr, v.shifts[1].trDep, v.shifts[1].trArr], ['walk', '07:00', undefined]);
  assert.deepStrictEqual(v.days['2026-11-02'][0], { sid: 's1', note: '', start: '', end: '', tr: '-' });
  assert.deepStrictEqual([v.days['2026-11-02'][1].tr, v.days['2026-11-02'][1].trDep, v.days['2026-11-02'][1].trArr], ['train', '06:10', '06:55']);
});

test('v1.39: cambiar un turno en este día, en los siguientes o en todos los iguales', () => {
  const mk = () => ({ shifts: [{ id: 'm', start: '06:00', end: '14:00' }, { id: 't', start: '14:00', end: '22:00' }], days: {
    '2026-11-01': [{ sid: 'm' }], '2026-11-02': [{ sid: 'm', note: 'hoy' }, { sid: 't' }], '2026-11-03': [{ sid: 'm', start: '07:00' }], '2026-11-04': [{ sid: 'm', note: 'otra' }],
    '2026-11-05': [{ sid: 'o_x', once: { name: 'X' } }] } });
  let d = mk();
  assert.deepStrictEqual(T.sameEntries(d, '2026-11-02', 0, 'all'), [{ k: '2026-11-01', i: 0 }, { k: '2026-11-04', i: 0 }]);
  assert.deepStrictEqual(T.sameEntries(d, '2026-11-02', 0, 'next'), [{ k: '2026-11-04', i: 0 }]);
  assert.deepStrictEqual(T.sameEntries(d, '2026-11-05', 0, 'all'), []);
  const nx = { sid: 'm', note: 'nueva', start: '06:30', pl: 'p1', tr: 'bus', trDep: '06:00' };
  assert.strictEqual(T.applyEdit(d, '2026-11-02', 0, nx, 'one'), 1);
  assert.strictEqual(d.days['2026-11-04'][0].start, undefined);
  d = mk();
  assert.strictEqual(T.applyEdit(d, '2026-11-02', 0, nx, 'next'), 2);
  assert.deepStrictEqual(d.days['2026-11-04'][0], { sid: 'm', note: 'otra', start: '06:30', pl: 'p1', tr: 'bus', trDep: '06:00' });
  assert.deepStrictEqual(d.days['2026-11-01'][0], { sid: 'm' });
  assert.strictEqual(d.days['2026-11-03'][0].start, '07:00'); // otro horario: no se toca
  assert.strictEqual(d.days['2026-11-02'][0].note, 'nueva');
  d = mk();
  assert.strictEqual(T.applyEdit(d, '2026-11-02', 0, nx, 'all'), 3);
  assert.strictEqual(d.days['2026-11-01'][0].tr, 'bus');
  // Quitar un campo vuelve a lo del turno
  d = mk(); d.days['2026-11-01'][0].pl = 'p9'; d.days['2026-11-02'][0].pl = 'p9';
  T.applyEdit(d, '2026-11-02', 0, { sid: 'm', note: 'hoy' }, 'all');
  assert.strictEqual(d.days['2026-11-01'][0].pl, undefined);
});

test('v1.43: trayecto de después del turno y trayectos enlazados del día', () => {
  const T = require('../js/turns.js');
  const sh = { w: { id: 'w', start: '08:00', end: '12:00', tr: 'bus', trDep: '07:30', trArr: '07:55' }, p: { id: 'p', start: '12:30', end: '13:30' }, w2: { id: 'w2', start: '14:00', end: '18:00', bk: 'bus', bkTo: '' } };
  // Mañana en bus al trabajo; al acabar, andando al parque (enlazado); del parque andando al trabajo; al final, bus a Casa
  const day = [{ sid: 'w', bk: 'walk', bkTo: '>' }, { sid: 'p', bk: 'walk', bkTo: '>' }, { sid: 'w2' }];
  const legs = T.dayLegs(day, sh);
  assert.deepStrictEqual(legs.map(l => [l.i, l.kind, l.mode, l.dep, l.to]), [[0, 'go', 'bus', '07:30', 'turno'], [1, 'go', 'walk', '12:00', 'turno'], [2, 'go', 'walk', '13:30', 'turno'], [2, 'back', 'bus', '18:00', '']]);
  assert.strictEqual(legs[1].linked, 0);
  // La llegada propia del siguiente turno gana sobre el enlace
  assert.deepStrictEqual(T.dayLegs([{ sid: 'w', bk: 'walk', bkTo: '>' }, { sid: 'p', tr: 'car' }], sh).map(l => [l.i, l.kind, l.mode]), [[0, 'go', 'bus'], [1, 'go', 'car']]);
  // «Al siguiente turno» sin siguiente = a Casa; '-' en el día lo quita
  assert.deepStrictEqual(T.dayLegs([{ sid: 'p', bk: 'walk', bkTo: '>' }], sh).map(l => [l.kind, l.to]), [['back', '']]);
  assert.strictEqual(T.entryReturn(sh.w2, { bk: '-' }), null);
  assert.deepStrictEqual(T.entryReturn(sh.w2, {}), { mode: 'bus', dep: '', arr: '', to: '' });
  // Se conserva al validar una copia de seguridad
  const d = T.sanitize({ jobs: [{ id: 'j', name: 'J' }], shifts: [{ id: 'w2', jobId: 'j', name: 'T', bk: 'bus', bkDep: '18:05', bkTo: 'pl1' }], days: { '2026-11-06': [{ sid: 'w2', bk: 'walk', bkTo: '>' }, { sid: 'w2', bk: '-' }] } });
  assert.deepStrictEqual([d.shifts[0].bk, d.shifts[0].bkDep, d.shifts[0].bkTo], ['bus', '18:05', 'pl1']);
  assert.deepStrictEqual(d.days['2026-11-06'].map(e => [e.bk, e.bkTo]), [['walk', '>'], ['-', undefined]]);
});

test('v1.43: una rutina pone también su ruta (llegada y después)', () => {
  const T = require('../js/turns.js');
  const data = { shifts: [{ id: 'w', start: '08:00', end: '12:00' }, { id: 'p', start: '12:30', end: '13:30' }], days: {} };
  const r = { id: 'r1', kind: 'day', day: [{ sid: 'w', tr: 'bus', bk: 'walk', bkTo: '>' }, { sid: 'p', bk: 'bus', bkTo: '' }] };
  T.applyRoutine(data, r, { from: '2026-11-09', to: '2026-11-09' });
  assert.deepStrictEqual(data.days['2026-11-09'].map(e => [e.sid, e.tr, e.bk, e.bkTo]), [['w', 'bus', 'walk', '>'], ['p', undefined, 'bus', undefined]]);
  assert.deepStrictEqual(T.dayLegs(data.days['2026-11-09'], Object.fromEntries(data.shifts.map(s => [s.id, s]))).map(l => [l.i, l.kind, l.mode]), [[0, 'go', 'bus'], [1, 'go', 'walk'], [1, 'back', 'bus']]);
});
