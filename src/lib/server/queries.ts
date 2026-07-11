import { sql } from './db';
import type { Player, Tournament, MatchView, RankingRow, MatchResult } from '$lib/types';

/* ------------------------------------------------------------------ */
/* Players                                                            */
/* ------------------------------------------------------------------ */

export function listPlayers(): Promise<Player[]> {
	return sql<Player[]>`
		SELECT id, name, email, rating, created_at
		FROM players
		ORDER BY rating DESC, name ASC
	`;
}

export async function getPlayer(id: number): Promise<Player | undefined> {
	const [row] = await sql<Player[]>`
		SELECT id, name, email, rating, created_at FROM players WHERE id = ${id}
	`;
	return row;
}

export async function createPlayer(
	name: string,
	email: string | null,
	rating: number
): Promise<Player> {
	const [row] = await sql<Player[]>`
		INSERT INTO players (name, email, rating)
		VALUES (${name}, ${email}, ${rating})
		RETURNING id, name, email, rating, created_at
	`;
	return row;
}

export async function updatePlayer(
	id: number,
	name: string,
	email: string | null,
	rating: number
): Promise<void> {
	await sql`
		UPDATE players
		SET name = ${name}, email = ${email}, rating = ${rating}
		WHERE id = ${id}
	`;
}

export async function deletePlayer(id: number): Promise<void> {
	await sql`DELETE FROM players WHERE id = ${id}`;
}

/* ------------------------------------------------------------------ */
/* Tournaments                                                        */
/* ------------------------------------------------------------------ */

export function listTournaments(): Promise<(Tournament & { player_count: number })[]> {
	return sql<(Tournament & { player_count: number })[]>`
		SELECT t.id, t.name, t.location, t.start_date, t.status, t.created_at,
		       COUNT(tp.player_id)::int AS player_count
		FROM tournaments t
		LEFT JOIN tournament_players tp ON tp.tournament_id = t.id
		GROUP BY t.id
		ORDER BY t.created_at DESC
	`;
}

export async function getTournament(id: number): Promise<Tournament | undefined> {
	const [row] = await sql<Tournament[]>`
		SELECT id, name, location, start_date, status, created_at
		FROM tournaments WHERE id = ${id}
	`;
	return row;
}

export async function createTournament(
	name: string,
	location: string | null,
	startDate: string | null
): Promise<Tournament> {
	const [row] = await sql<Tournament[]>`
		INSERT INTO tournaments (name, location, start_date)
		VALUES (${name}, ${location}, ${startDate})
		RETURNING id, name, location, start_date, status, created_at
	`;
	return row;
}

export async function updateTournament(
	id: number,
	name: string,
	location: string | null,
	startDate: string | null,
	status: string
): Promise<void> {
	await sql`
		UPDATE tournaments
		SET name = ${name}, location = ${location}, start_date = ${startDate}, status = ${status}
		WHERE id = ${id}
	`;
}

export async function deleteTournament(id: number): Promise<void> {
	await sql`DELETE FROM tournaments WHERE id = ${id}`;
}

/* ------------------------------------------------------------------ */
/* Tournament roster (many-to-many)                                   */
/* ------------------------------------------------------------------ */

export function listTournamentPlayers(tournamentId: number): Promise<Player[]> {
	return sql<Player[]>`
		SELECT p.id, p.name, p.email, p.rating, p.created_at
		FROM players p
		JOIN tournament_players tp ON tp.player_id = p.id
		WHERE tp.tournament_id = ${tournamentId}
		ORDER BY p.rating DESC, p.name ASC
	`;
}

/** Players not yet entered in the given tournament. */
export function listAvailablePlayers(tournamentId: number): Promise<Player[]> {
	return sql<Player[]>`
		SELECT p.id, p.name, p.email, p.rating, p.created_at
		FROM players p
		WHERE p.id NOT IN (
			SELECT player_id FROM tournament_players WHERE tournament_id = ${tournamentId}
		)
		ORDER BY p.rating DESC, p.name ASC
	`;
}

export async function addPlayerToTournament(
	tournamentId: number,
	playerId: number
): Promise<void> {
	await sql`
		INSERT INTO tournament_players (tournament_id, player_id)
		VALUES (${tournamentId}, ${playerId})
		ON CONFLICT DO NOTHING
	`;
}

export async function removePlayerFromTournament(
	tournamentId: number,
	playerId: number
): Promise<void> {
	await sql`
		DELETE FROM tournament_players
		WHERE tournament_id = ${tournamentId} AND player_id = ${playerId}
	`;
}

/* ------------------------------------------------------------------ */
/* Matches                                                            */
/* ------------------------------------------------------------------ */

export function listMatches(tournamentId: number): Promise<MatchView[]> {
	return sql<MatchView[]>`
		SELECT m.id, m.tournament_id, m.round, m.player1_id, m.player2_id,
		       m.winner_id, m.result, m.played_at,
		       p1.name AS player1_name,
		       p2.name AS player2_name,
		       w.name  AS winner_name
		FROM matches m
		JOIN players p1 ON p1.id = m.player1_id
		LEFT JOIN players p2 ON p2.id = m.player2_id
		LEFT JOIN players w  ON w.id  = m.winner_id
		WHERE m.tournament_id = ${tournamentId}
		ORDER BY m.round ASC, m.id ASC
	`;
}

export async function getNextRound(tournamentId: number): Promise<number> {
	const [row] = await sql<{ next: number }[]>`
		SELECT COALESCE(MAX(round), 0) + 1 AS next
		FROM matches WHERE tournament_id = ${tournamentId}
	`;
	return row.next;
}

interface NewMatch {
	round: number;
	player1_id: number;
	player2_id: number | null;
	winner_id: number | null;
	result: MatchResult;
}

/** Insert a whole round of matches in one transaction. */
export async function insertRound(tournamentId: number, rounds: NewMatch[]): Promise<void> {
	await sql.begin(async (tx) => {
		for (const m of rounds) {
			await tx`
				INSERT INTO matches (tournament_id, round, player1_id, player2_id, winner_id, result)
				VALUES (${tournamentId}, ${m.round}, ${m.player1_id}, ${m.player2_id}, ${m.winner_id}, ${m.result})
			`;
		}
	});
}

export async function clearMatches(tournamentId: number): Promise<void> {
	await sql`DELETE FROM matches WHERE tournament_id = ${tournamentId}`;
}

/* ------------------------------------------------------------------ */
/* Rankings                                                           */
/* ------------------------------------------------------------------ */

/**
 * Standings for a tournament, computed from recorded matches.
 * Scoring: win = 1.0, draw = 0.5, bye = 1.0 (standard Swiss scoring), loss = 0.
 * Ties are broken by number of wins, then rating, then name.
 */
export function getRankings(tournamentId: number): Promise<RankingRow[]> {
	return sql<RankingRow[]>`
		WITH roster AS (
			SELECT p.id, p.name, p.rating
			FROM players p
			JOIN tournament_players tp ON tp.player_id = p.id
			WHERE tp.tournament_id = ${tournamentId}
		),
		-- Flatten each match into one row per participating player.
		results AS (
			SELECT player1_id AS player_id,
			       CASE result WHEN 'player1' THEN 1 WHEN 'bye' THEN 1 ELSE 0 END AS win,
			       CASE result WHEN 'draw' THEN 1 ELSE 0 END AS draw,
			       CASE result WHEN 'player2' THEN 1 ELSE 0 END AS loss,
			       CASE result WHEN 'bye' THEN 1 ELSE 0 END AS bye,
			       CASE result WHEN 'bye' THEN 0 ELSE 1 END AS played
			FROM matches WHERE tournament_id = ${tournamentId}
			UNION ALL
			SELECT player2_id AS player_id,
			       CASE result WHEN 'player2' THEN 1 ELSE 0 END AS win,
			       CASE result WHEN 'draw' THEN 1 ELSE 0 END AS draw,
			       CASE result WHEN 'player1' THEN 1 ELSE 0 END AS loss,
			       0 AS bye,
			       1 AS played
			FROM matches
			WHERE tournament_id = ${tournamentId} AND player2_id IS NOT NULL AND result <> 'bye'
		),
		agg AS (
			SELECT player_id,
			       SUM(win)::int   AS wins,
			       SUM(draw)::int  AS draws,
			       SUM(loss)::int  AS losses,
			       SUM(bye)::int   AS byes,
			       SUM(played)::int AS played,
			       (SUM(win) + 0.5 * SUM(draw))::float AS points
			FROM results
			GROUP BY player_id
		)
		SELECT r.id AS player_id, r.name, r.rating,
		       COALESCE(a.played, 0) AS played,
		       COALESCE(a.wins, 0)   AS wins,
		       COALESCE(a.draws, 0)  AS draws,
		       COALESCE(a.losses, 0) AS losses,
		       COALESCE(a.byes, 0)   AS byes,
		       COALESCE(a.points, 0) AS points,
		       RANK() OVER (
		           ORDER BY COALESCE(a.points, 0) DESC,
		                    COALESCE(a.wins, 0) DESC,
		                    r.rating DESC,
		                    r.name ASC
		       )::int AS rank
		FROM roster r
		LEFT JOIN agg a ON a.player_id = r.id
		ORDER BY rank ASC
	`;
}
