/**
 * Zero-setup local PostgreSQL for development.
 *
 * Downloads and runs a real PostgreSQL server from a local data directory
 * (./.pgdata) — no system install or admin rights required. Handy for trying
 * the app without provisioning a cloud database.
 *
 *   node scripts/dev-db.mjs        # starts Postgres on localhost:5433/chess
 *
 * Leave it running in one terminal, put the printed DATABASE_URL in .env,
 * then run `npm run dev` in another. Press Ctrl+C to stop.
 */
import { existsSync } from 'node:fs';
import EmbeddedPostgres from 'embedded-postgres';

const PORT = 5433;
const DB = 'chess';
const dataDir = new URL('../.pgdata', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const pg = new EmbeddedPostgres({
	databaseDir: dataDir,
	user: 'postgres',
	password: 'postgres',
	port: PORT,
	persistent: true
});

const firstRun = !existsSync(dataDir);
if (firstRun) {
	console.log('Initialising a fresh PostgreSQL cluster in .pgdata …');
	await pg.initialise();
}

await pg.start();

try {
	await pg.createDatabase(DB);
	console.log(`✓ Created database "${DB}".`);
} catch {
	console.log(`✓ Database "${DB}" already exists.`);
}

const url = `postgres://postgres:postgres@localhost:${PORT}/${DB}`;
console.log('\nPostgreSQL is running.');
console.log('Put this in your .env:\n');
console.log(`  DATABASE_URL="${url}"\n`);
console.log('Press Ctrl+C to stop.');

async function shutdown() {
	console.log('\nStopping PostgreSQL …');
	try {
		await pg.stop();
	} catch {
		/* ignore */
	}
	process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
