import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import {
	getTournament,
	updateTournament,
	deleteTournament,
	listTournamentPlayers,
	listAvailablePlayers,
	addPlayerToTournament,
	removePlayerFromTournament,
	listMatches,
	getNextRound,
	insertRound,
	clearMatches,
	getRankings
} from '$lib/server/queries';
import { generateRound } from '$lib/server/pairing';

function parseId(param: string): number {
	const id = Number(param);
	if (!Number.isInteger(id)) throw error(404, 'Tournament not found');
	return id;
}

export const load: PageServerLoad = async ({ params }) => {
	const id = parseId(params.id);
	const tournament = await getTournament(id);
	if (!tournament) throw error(404, 'Tournament not found');

	const [roster, available, matches, rankings] = await Promise.all([
		listTournamentPlayers(id),
		listAvailablePlayers(id),
		listMatches(id),
		getRankings(id)
	]);

	return { tournament, roster, available, matches, rankings };
};

export const actions: Actions = {
	update: async ({ params, request }) => {
		const id = parseId(params.id);
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const location = String(form.get('location') ?? '').trim() || null;
		const startDate = String(form.get('start_date') ?? '').trim() || null;
		const status = String(form.get('status') ?? 'draft');
		if (!name) return fail(400, { error: 'Name is required.' });
		await updateTournament(id, name, location, startDate, status);
		return { success: true };
	},

	delete: async ({ params }) => {
		const id = parseId(params.id);
		await deleteTournament(id);
		throw redirect(303, '/tournaments');
	},

	addPlayer: async ({ params, request }) => {
		const id = parseId(params.id);
		const form = await request.formData();
		const playerId = Number(form.get('player_id'));
		if (Number.isInteger(playerId)) await addPlayerToTournament(id, playerId);
		return { success: true };
	},

	removePlayer: async ({ params, request }) => {
		const id = parseId(params.id);
		const form = await request.formData();
		const playerId = Number(form.get('player_id'));
		if (Number.isInteger(playerId)) await removePlayerFromTournament(id, playerId);
		return { success: true };
	},

	// The match system: randomly pair the roster, randomly decide each result,
	// and persist the round.
	generateRound: async ({ params }) => {
		const id = parseId(params.id);
		const roster = await listTournamentPlayers(id);
		if (roster.length < 2) {
			return fail(400, { error: 'Add at least 2 players before generating a round.' });
		}
		const round = await getNextRound(id);
		const matches = generateRound(roster.map((p) => p.id)).map((m) => ({ ...m, round }));
		await insertRound(id, matches);
		// Once matches exist the tournament is effectively underway.
		const t = await getTournament(id);
		if (t && t.status === 'draft') {
			await updateTournament(id, t.name, t.location, t.start_date, 'active');
		}
		return { success: true, round };
	},

	clearMatches: async ({ params }) => {
		const id = parseId(params.id);
		await clearMatches(id);
		return { success: true };
	},

	// Mark a tournament complete once the organiser is happy with the standings.
	complete: async ({ params }) => {
		const id = parseId(params.id);
		const t = await getTournament(id);
		if (t) await updateTournament(id, t.name, t.location, t.start_date, 'completed');
		return { success: true };
	}
};
