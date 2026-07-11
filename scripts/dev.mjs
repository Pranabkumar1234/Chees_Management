/**
 * One-command dev launcher — zero database setup.
 *
 *   npm install
 *   npm run dev
 *
 * Behaviour:
 *  - If DATABASE_URL points at a remote database (e.g. Neon), it is used as-is
 *    and no local database is started.
 *  - Otherwise a real PostgreSQL server is started automatically from a local
 *    folder (./.pgdata) using the bundled `embedded-postgres` binary — no
 *    system install, no admin rights, nothing to configure.
 *
 * Then the SvelteKit dev server is started. Ctrl+C stops both cleanly.
 */
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import net from 'node:net';
import EmbeddedPostgres from 'embedded-postgres';

if (existsSync('.env')) process.loadEnvFile('.env');

const EMBEDDED_PORT = 5433;
const EMBEDDED_URL = `postgres://postgres:postgres@localhost:${EMBEDDED_PORT}/chess`;
const url = process.env.DATABASE_URL || EMBEDDED_URL;

const usesEmbedded = url.includes(`localhost:${EMBEDDED_PORT}`) || url.includes(`127.0.0.1:${EMBEDDED_PORT}`);

/** Resolve true if something is already listening on the port. */
function portOpen(port) {
	return new Promise((resolve) => {
		const socket = net.connect({ port, host: '127.0.0.1' });
		socket.setTimeout(800);
		socket.on('connect', () => { socket.destroy(); resolve(true); });
		socket.on('timeout', () => { socket.destroy(); resolve(false); });
		socket.on('error', () => resolve(false));
	});
}

let pg = null;

async function startDatabase() {
	if (!usesEmbedded) {
		console.log('→ Using external DATABASE_URL (no local database started).');
		return;
	}
	if (await portOpen(EMBEDDED_PORT)) {
		console.log(`→ Local PostgreSQL already running on :${EMBEDDED_PORT}.`);
		return;
	}
	pg = new EmbeddedPostgres({
		databaseDir: './.pgdata',
		user: 'postgres',
		password: 'postgres',
		port: EMBEDDED_PORT,
		persistent: true
	});
	if (!existsSync('./.pgdata')) {
		console.log('→ First run: setting up a local PostgreSQL database (one-time)…');
		await pg.initialise();
	}
	await pg.start();
	try {
		await pg.createDatabase('chess');
	} catch {
		/* already exists */
	}
	console.log(`→ Local PostgreSQL ready on :${EMBEDDED_PORT}.`);
}

async function stopDatabase() {
	if (pg) {
		try {
			await pg.stop();
		} catch {
			/* ignore */
		}
		pg = null;
	}
}

await startDatabase();

console.log('→ Starting the app…\n');
const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'dev'], {
	stdio: 'inherit',
	env: { ...process.env, DATABASE_URL: url }
});

async function shutdown() {
	child.kill();
	await stopDatabase();
	process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
child.on('exit', async (code) => {
	await stopDatabase();
	process.exit(code ?? 0);
});
