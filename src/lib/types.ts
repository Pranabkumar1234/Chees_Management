export interface Player {
	id: number;
	name: string;
	email: string | null;
	rating: number;
	created_at: string;
}

export type TournamentStatus = 'draft' | 'active' | 'completed';

export interface Tournament {
	id: number;
	name: string;
	location: string | null;
	start_date: string | null;
	status: TournamentStatus;
	created_at: string;
}

export type MatchResult = 'player1' | 'player2' | 'draw' | 'bye';

export interface Match {
	id: number;
	tournament_id: number;
	round: number;
	player1_id: number;
	player2_id: number | null;
	winner_id: number | null;
	result: MatchResult;
	played_at: string;
}

/** A match row joined with player names, ready for display. */
export interface MatchView extends Match {
	player1_name: string;
	player2_name: string | null;
	winner_name: string | null;
}

/** A computed standings row for a tournament. */
export interface RankingRow {
	player_id: number;
	name: string;
	rating: number;
	played: number;
	wins: number;
	draws: number;
	losses: number;
	byes: number;
	points: number;
	rank: number;
}
