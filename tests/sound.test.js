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

test('la pantalla se convierte en una dirección alrededor del oyente', () => {
  assert.deepEqual(T.screenToPolar(0, 0, 400, 800), { az: -80, el: 30 });
  assert.deepEqual(T.screenToPolar(400, 800, 400, 800), { az: 80, el: -30 });
  assert.equal(T.screenToPolar(200, 400, 400, 800).az, 0);
  assert.deepEqual(T.screenToPolar(9999, -50, 400, 800), { az: 80, el: 30 });
  // Lo que tocas cerca del centro también se separa (curva): a un 20 % del centro ya va a 30°
  assert.ok(T.screenToPolar(240, 400, 400, 800).az >= 30);
  // Delante, a la derecha, detrás y a la izquierda (el oyente mira hacia −z)
  assert.deepEqual(T.polarToXyz({ az: 0, el: 0 }, 2), { x: 0, y: 0, z: -2 });
  assert.deepEqual(T.polarToXyz({ az: 90, el: 0 }, 2), { x: 2, y: 0, z: 0 });
  assert.deepEqual(T.polarToXyz({ az: 180, el: 0 }, 2), { x: 0, y: 0, z: 2 });
  assert.deepEqual(T.polarToXyz({ az: -90, el: 0 }, 2), { x: -2, y: 0, z: 0 });
  assert.equal(T.polarToXyz({ az: 0, el: 90 }, 2).y, 2);
  assert.ok(T.screenToSpace(0, 400, 400, 800).x < -1.5);
});

test('el acorde de la música se abre en arco y no en círculo', () => {
  for (let s = 0; s < 8; s++) {
    const a = T.arcSpread(4, s);
    assert.ok(a[0] < -40 && a[3] > 40, 'abierto a los dos lados');
    assert.ok(a.every((x, i) => !i || x > a[i - 1]), 'de izquierda a derecha');
    assert.ok(Math.abs(a.reduce((x, y) => x + y, 0) / 4) <= 18, 'centrado');
  }
});

test('sin Web Audio no falla y sigue habiendo sonidos con nombre', () => {
  for (const n of ['success', 'tlStep', 'tlZoomIn', 'income', 'expense', 'invest', 'share', 'perfectWeek', 'perfectMonth', 'rateTick', 'rateSave', 'gymStart', 'gymFinish', 'setDone', 'setStart']) assert.ok(S.names.includes(n), n);
  S.play('income'); S.configure({ music: true, mood: 'xx', sfxVol: 5 });
  assert.equal(S.config.mood, 'auto'); assert.equal(S.config.sfxVol, 1); assert.equal(S.musicOn, false);
  assert.ok(!S.names.includes('spatialTest'));
});
