import type { MatchResult } from '$lib/types';

export interface GeneratedMatch {
	player1_id: number;
	player2_id: number | null;
	winner_id: number | null;
	result: MatchResult;
}

/** Fisher–Yates shuffle, returning a new array. */
export function shuffle<T>(items: readonly T[]): T[] {
	const a = [...items];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

/**
 * Generate one round of matches from a set of player ids:
 *  - players are randomly shuffled and paired up,
 *  - each pair gets a random result (player1 win / player2 win / draw),
 *  - if the count is odd, the leftover player receives a bye.
 *
 * `drawProbability` controls how often a match is scored as a draw.
 */
export function generateRound(
	playerIds: readonly number[],
	drawProbability = 0.15
): GeneratedMatch[] {
	const shuffled = shuffle(playerIds);
	const matches: GeneratedMatch[] = [];

	// Odd player out gets a bye.
	let byePlayer: number | null = null;
	if (shuffled.length % 2 === 1) {
		byePlayer = shuffled.pop() as number;
	}

	for (let i = 0; i < shuffled.length; i += 2) {
		const p1 = shuffled[i];
		const p2 = shuffled[i + 1];

		if (Math.random() < drawProbability) {
			matches.push({ player1_id: p1, player2_id: p2, winner_id: null, result: 'draw' });
		} else {
			const p1Wins = Math.random() < 0.5;
			matches.push({
				player1_id: p1,
				player2_id: p2,
				winner_id: p1Wins ? p1 : p2,
				result: p1Wins ? 'player1' : 'player2'
			});
		}
	}

	if (byePlayer !== null) {
		matches.push({ player1_id: byePlayer, player2_id: null, winner_id: byePlayer, result: 'bye' });
	}

	return matches;
}
