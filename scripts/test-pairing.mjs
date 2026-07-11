import { generateRound, shuffle } from '../src/lib/server/pairing.ts';

let pass = 0, fail = 0;
function check(name, cond) {
	if (cond) { pass++; console.log('  ok', name); }
	else { fail++; console.log('  FAIL', name); }
}

for (const n of [2, 4, 8, 16]) {
	const ids = Array.from({ length: n }, (_, i) => i + 1);
	const round = generateRound(ids);
	check(`n=${n}: ${n / 2} matches`, round.length === n / 2);
	check(`n=${n}: no bye`, round.every((m) => m.result !== 'bye'));
	const seen = new Set();
	round.forEach((m) => { seen.add(m.player1_id); if (m.player2_id) seen.add(m.player2_id); });
	check(`n=${n}: all players paired`, seen.size === n);
	check(`n=${n}: winners consistent`, round.every((m) =>
		(m.result === 'draw' && m.winner_id === null) ||
		(m.result === 'player1' && m.winner_id === m.player1_id) ||
		(m.result === 'player2' && m.winner_id === m.player2_id)
	));
}

for (const n of [3, 5, 7]) {
	const ids = Array.from({ length: n }, (_, i) => i + 1);
	const round = generateRound(ids);
	const byes = round.filter((m) => m.result === 'bye');
	check(`n=${n}: exactly one bye`, byes.length === 1);
	check(`n=${n}: bye has no opponent`, byes[0].player2_id === null);
	check(`n=${n}: bye player wins the point`, byes[0].winner_id === byes[0].player1_id);
	const seen = new Set();
	round.forEach((m) => { seen.add(m.player1_id); if (m.player2_id) seen.add(m.player2_id); });
	check(`n=${n}: all ${n} players covered`, seen.size === n);
}

const original = [1, 2, 3, 4, 5];
const shuffled = shuffle(original);
check('shuffle preserves length', shuffled.length === 5);
check('shuffle preserves elements', [...shuffled].sort().join() === original.join());
check('shuffle does not mutate input', original.join() === '1,2,3,4,5');

check('drawProbability=0 yields no draws', generateRound([1, 2, 3, 4], 0).every((m) => m.result !== 'draw'));
check('drawProbability=1 yields all draws', generateRound([1, 2, 3, 4], 1).every((m) => m.result === 'draw'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
