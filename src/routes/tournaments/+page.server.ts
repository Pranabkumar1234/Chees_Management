import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { listTournaments, createTournament } from '$lib/server/queries';

export const load: PageServerLoad = async () => {
	return { tournaments: await listTournaments() };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const location = String(form.get('location') ?? '').trim() || null;
		const startDate = String(form.get('start_date') ?? '').trim() || null;

		if (!name) {
			return fail(400, { error: 'Tournament name is required.', values: { name, location, startDate } });
		}

		const t = await createTournament(name, location, startDate);
		// Send the user straight into the new tournament to add players.
		throw redirect(303, `/tournaments/${t.id}`);
	}
};
