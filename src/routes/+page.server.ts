import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db';

export const load: PageServerLoad = async () => {
	const [players, tournaments, matches] = await Promise.all([
		sql<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM players`,
		sql<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM tournaments`,
		sql<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM matches`
	]);

	const recent = await sql`
		SELECT id, name, status, created_at
		FROM tournaments
		ORDER BY created_at DESC
		LIMIT 5
	`;

	return {
		stats: {
			players: players[0].count,
			tournaments: tournaments[0].count,
			matches: matches[0].count
		},
		recent
	};
};
