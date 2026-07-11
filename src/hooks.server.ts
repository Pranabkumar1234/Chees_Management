import type { Handle } from '@sveltejs/kit';
import { ensureSchema } from '$lib/server/db';

export const handle: Handle = async ({ event, resolve }) => {
	// Lazily create tables on the first request (no-op afterwards).
	await ensureSchema();
	return resolve(event);
};
