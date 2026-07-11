import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import {
	listPlayers,
	createPlayer,
	updatePlayer,
	deletePlayer
} from '$lib/server/queries';

export const load: PageServerLoad = async () => {
	return { players: await listPlayers() };
};

/** Parse and validate the shared player form fields. */
function parsePlayer(form: FormData) {
	const name = String(form.get('name') ?? '').trim();
	const emailRaw = String(form.get('email') ?? '').trim();
	const ratingRaw = String(form.get('rating') ?? '').trim();

	const errors: Record<string, string> = {};
	if (!name) errors.name = 'Name is required.';
	if (name.length > 120) errors.name = 'Name is too long.';
	if (emailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
		errors.email = 'Enter a valid email address.';
	}
	const rating = ratingRaw === '' ? 1200 : Number(ratingRaw);
	if (!Number.isInteger(rating) || rating < 0 || rating > 4000) {
		errors.rating = 'Rating must be a whole number between 0 and 4000.';
	}

	return { name, email: emailRaw || null, rating, errors };
}

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData();
		const { name, email, rating, errors } = parsePlayer(form);
		if (Object.keys(errors).length) {
			return fail(400, { errors, values: { name, email, rating } });
		}
		try {
			await createPlayer(name, email, rating);
		} catch (e) {
			return fail(400, {
				errors: { email: 'That email is already registered.' },
				values: { name, email, rating }
			});
		}
		return { success: true };
	},

	update: async ({ request }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		const { name, email, rating, errors } = parsePlayer(form);
		if (!Number.isInteger(id)) return fail(400, { errors: { name: 'Invalid player.' } });
		if (Object.keys(errors).length) {
			return fail(400, { errors, editId: id, values: { name, email, rating } });
		}
		try {
			await updatePlayer(id, name, email, rating);
		} catch (e) {
			return fail(400, {
				errors: { email: 'That email is already registered.' },
				editId: id,
				values: { name, email, rating }
			});
		}
		return { success: true };
	},

	delete: async ({ request }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		if (Number.isInteger(id)) await deletePlayer(id);
		return { success: true };
	}
};
