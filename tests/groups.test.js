// Ejecutar con: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../js/groups.js');

const approved = (n, y, x) => G.voteResult(n, y, x).approved;

test('votación: fórmula de blancos (NO = NO + ⌈b/2⌉, SÍ = SÍ + ⌊b/2⌋)', () => {
  const r = G.voteResult(10, 3, 2);
  assert.equal(r.blank, 5);
  assert.equal(r.noTotal, 2 + 3);
  assert.equal(r.yesTotal, 3 + 2);
  assert.equal(r.approved, false); // 5 a 5: empate
});

test('votación: un empate 50/50 no se aprueba', () => {
  assert.equal(approved(2, 1, 1), false);
  assert.equal(approved(4, 2, 2), false);
  assert.equal(approved(6, 2, 1), false); // 3 blancos: SÍ 2+1=3, NO 1+2=3
});

test('votación: 1 miembro', () => {
  assert.equal(approved(1, 1, 0), true);
  assert.equal(approved(1, 0, 1), false);
  assert.equal(approved(1, 0, 0), false); // su blanco cuenta como NO
});

test('votación: 2 miembros', () => {
  assert.equal(approved(2, 2, 0), true);
  assert.equal(approved(2, 1, 0), false); // 1 SÍ vs blanco→NO: empate
  assert.equal(approved(2, 0, 0), false);
  assert.equal(approved(2, 0, 2), false);
});

test('votación: 3 miembros', () => {
  assert.equal(approved(3, 2, 0), true); // 2 vs 1
  assert.equal(approved(3, 1, 0), true); // 2 blancos: SÍ 1+1=2, NO 0+1=1
  assert.equal(approved(3, 0, 1), false); // SÍ 0+1=1, NO 1+1=2
  assert.equal(approved(3, 0, 0), false); // SÍ 1, NO 2
  assert.equal(approved(3, 2, 1), true);
  assert.equal(approved(3, 1, 1), false); // blanco → NO: 1 vs 2
});

test('votación: número par e impar de blancos', () => {
  // par: 5 miembros, 1 SÍ, 0 NO, 4 blancos → SÍ 1+2=3, NO 0+2=2 → aprobado
  assert.deepEqual(G.voteResult(5, 1, 0), { members: 5, yes: 1, no: 0, blank: 4, yesTotal: 3, noTotal: 2, approved: true });
  // impar: 6 miembros, 1 SÍ, 0 NO, 5 blancos → SÍ 1+2=3, NO 0+3=3 → empate, no
  assert.deepEqual(G.voteResult(6, 1, 0), { members: 6, yes: 1, no: 0, blank: 5, yesTotal: 3, noTotal: 3, approved: false });
});

test('votación: nadie vota nunca se aprueba', () => {
  for (const n of [0, 1, 2, 3, 4, 7, 50]) assert.equal(approved(n, 0, 0), false, `n=${n}`);
});

test('votación: todos votan, sin blancos', () => {
  assert.equal(approved(5, 3, 2), true);
  assert.equal(approved(5, 2, 3), false);
});

test('votación: más votos que miembros es un error', () => {
  assert.throws(() => G.voteResult(2, 2, 1), RangeError);
});

test('permisos: el líder puede todo, los roles antiguos tienen sus permisos', () => {
  assert.equal(G.can({ role: 'lider', perms: [] }, 'launch'), true);
  assert.deepEqual(G.roleDefaults('colider'), ['invite', 'launch', 'share', 'moderate']);
  assert.equal(G.can({ role: 'novato', perms: G.roleDefaults('novato') }, 'share'), false);
  assert.equal(G.can({ role: 'novato', perms: ['share'] }, 'share'), true); // delegado por el líder
  assert.equal(G.can({ role: 'experto', perms: G.roleDefaults('experto') }, 'launch'), true);
  assert.deepEqual(G.cleanPerms(['moderate', 'hack', 'invite']), ['invite', 'moderate']);
});

test('retos: % de cumplimiento y W-L', () => {
  assert.equal(G.completionRate(9, 2, 5), 90);
  assert.equal(G.completionRate(0, 0, 5), 0);
  assert.equal(G.challengeWon(80, 80), true);
  assert.equal(G.challengeWon(79.9, 80), false);
  assert.deepEqual(G.wl([{ status: 'won' }, { status: 'lost' }, { status: 'won' }, { status: 'rejected' }, { status: 'live' }]), { w: 2, l: 1 });
});

test('ranking: periodos semana (lunes), mes y año', () => {
  assert.deepEqual(G.period('1W', '2026-10-16'), { key: 'W2026-10-12', start: '2026-10-12', end: '2026-10-18' });
  assert.deepEqual(G.period('1W', '2026-10-12'), { key: 'W2026-10-12', start: '2026-10-12', end: '2026-10-18' });
  assert.deepEqual(G.period('1W', '2026-10-18'), { key: 'W2026-10-12', start: '2026-10-12', end: '2026-10-18' });
  assert.deepEqual(G.period('1M', '2024-02-10'), { key: 'M2024-02', start: '2024-02-01', end: '2024-02-29' });
  assert.deepEqual(G.period('1Y', '2026-10-16'), { key: 'Y2026', start: '2026-01-01', end: '2026-12-31' });
});

test('ranking: premios de reputación con empates y sin premio en MAX', () => {
  const s = [{ user: 'a', score: 7 }, { user: 'b', score: 7 }, { user: 'c', score: 5 }, { user: 'd', score: 1 }, { user: 'e', score: 0 }];
  assert.deepEqual(G.prizes(s, '1W'), [{ user: 'a', place: 1, points: 10 }, { user: 'b', place: 1, points: 10 }, { user: 'c', place: 3, points: 3 }]);
  assert.deepEqual(G.prizes(s, '1M').map(p => p.points), [30, 30, 9]);
  assert.deepEqual(G.prizes(s, 'MAX'), []);
});

test('ranking: participa por rol o por @nametag', () => {
  assert.equal(G.inRanking({ role: 'novato', user_id: 'u1' }, ['experto'], ['u1']), true);
  assert.equal(G.inRanking({ role: 'novato', user_id: 'u2' }, ['experto'], ['u1']), false);
  assert.equal(G.inRanking({ role: 'experto', user_id: 'u2' }, ['experto'], []), true);
});

test('@nametag: formato válido y normalización', () => {
  assert.equal(G.isNametag('izan_09'), true);
  assert.equal(G.isNametag('ab'), false);
  assert.equal(G.isNametag('Izan'), false);
  assert.equal(G.toNametag('@Ízan Hj!'), 'izanhj');
});
