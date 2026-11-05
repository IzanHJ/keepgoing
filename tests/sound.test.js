const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../js/sound.js');
const T = S.theory;

test('las notas MIDI pasan a hercios', () => {
  assert.equal(T.midiHz(69), 440);
  assert.ok(Math.abs(T.midiHz(60) - 261.63) < .01);
});

test('cada ambiente tiene escala, acordes y valores válidos', () => {
  for (const [k, m] of Object.entries(T.MOODS)) {
    assert.ok(T.SCALES[m.scale], k);
    assert.ok(m.prog.length >= 2 && m.prog.every(d => d >= 0 && d < 7), k);
    assert.ok(m.bar > 3 && m.bright >= 0 && m.bright <= 1 && m.density >= 0 && m.density <= 1, k);
  }
  for (const c of T.MOOD_CHOICES) if (c !== 'auto') assert.ok(T.MOODS[c], c);
});

test('acordes por terceras dentro de la escala', () => {
  const m = T.MOODS.habits; // Do mayor
  assert.deepEqual(T.chordOf(m, 0), [60, 64, 67, 71]);
  assert.deepEqual(T.chordOf(m, 5, false), [69, 72, 76]); // La menor
  assert.equal(T.scaleNote(m, 7), 72);
  assert.equal(T.scaleNote(m, -1), 59);
  const sc = T.SCALES.major.map(x => x % 12);
  assert.ok(T.melodyPool(m).every(n => sc.includes(n % 12)));
});

test('la valoración del día cambia el ambiente', () => {
  const lo = T.rateMood(1), hi = T.rateMood(10);
  assert.equal(lo.scale, 'aeolian'); assert.equal(hi.scale, 'lydian'); assert.equal(T.rateMood(5).scale, 'dorian');
  assert.ok(hi.bright > lo.bright && hi.density > lo.density && hi.bar < lo.bar);
  assert.equal(T.moodOf('rate', { v: 9 }).scale, 'lydian');
  assert.equal(T.moodOf('nada'), T.MOODS.habits);
});

test('la pantalla se coloca delante del oyente', () => {
  assert.deepEqual(T.screenToSpace(0, 0, 400, 800), { x: -2.4, y: 1.2, z: -1.4 });
  assert.deepEqual(T.screenToSpace(400, 800, 400, 800), { x: 2.4, y: -1.2, z: -1.4 });
  assert.equal(T.screenToSpace(200, 400, 400, 800).x, 0);
  assert.deepEqual(T.screenToSpace(9999, -50, 400, 800), { x: 2.4, y: 1.2, z: -1.4 });
});

test('sin Web Audio no falla y sigue habiendo sonidos con nombre', () => {
  for (const n of ['tlStep', 'tlZoomIn', 'income', 'expense', 'invest', 'share', 'perfectWeek', 'perfectMonth', 'rateTick', 'rateSave', 'gymStart', 'gymFinish', 'setDone', 'setStart']) assert.ok(S.names.includes(n), n);
  S.play('income'); S.configure({ music: true, mood: 'xx', sfxVol: 5 });
  assert.equal(S.config.mood, 'auto'); assert.equal(S.config.sfxVol, 1); assert.equal(S.musicOn, false);
});
