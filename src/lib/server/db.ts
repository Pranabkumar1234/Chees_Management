import postgres from 'postgres';
import { env } from '$env/dynamic/private';
// Bundled as a string by Vite (?raw) so it ships with the server build.
import schema from './schema.sql?raw';

let _sql: postgres.Sql | undefined;

/**
 * Decide whether to open the connection over TLS.
 *
 * Hosted PostgreSQL (Neon, Supabase, RDS, …) requires TLS; a local database
 * does not. Rather than depend on the exact query string, we require TLS for
 * any non-local host and skip it only for localhost. This makes cloud
 * connection strings (e.g. Neon) work whether or not they include an
 * explicit `sslmode=require`.
 */
export function sslMode(url: string): 'require' | undefined {
	const isLocal = /@(localhost|127\.0\.0\.1|\[::1\]|::1)[:/]/.test(url);
	if (isLocal) return undefined;
	return 'require';
}

/**
 * Lazily create a single shared postgres.js client. Deferring creation until
 * first use keeps module import side-effect-free, which matters because
 * SvelteKit imports server modules during the build's analysis step (when no
 * DATABASE_URL is present). postgres.js pools connections internally.
 */
function client(): postgres.Sql {
	if (!_sql) {
		if (!env.DATABASE_URL) {
			throw new Error(
				'DATABASE_URL is not set. Copy .env.example to .env and set your PostgreSQL connection string.'
			);
		}
		_sql = postgres(env.DATABASE_URL, {
			ssl: sslMode(env.DATABASE_URL),
			max: 10
		});
	}
	return _sql;
}

/**
 * A proxy that forwards tagged-template calls (`sql\`...\``) and property
 * access (`sql.begin`, `sql.unsafe`, …) to the lazily-created client.
 */
export const sql = new Proxy((() => {}) as unknown as postgres.Sql, {
	apply(_target, _thisArg, args: Parameters<postgres.Sql>) {
		return (client() as (...a: unknown[]) => unknown)(...args);
	},
	get(_target, prop: string | symbol) {
		return client()[prop as keyof postgres.Sql];
	}
}) as postgres.Sql;

let initialized = false;

/**
 * Create tables if they do not exist. Runs once per process, lazily, on the
 * first request. Keeps local setup to a single `npm run dev`.
 */
export async function ensureSchema(): Promise<void> {
	if (initialized) return;
	await sql.unsafe(schema);
	initialized = true;
}
