/**
 * Create the database schema. Optional — the app also creates tables lazily on
 * first request — but handy for CI or a clean setup.
 *
 *   npm run db:init
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

if (existsSync('.env')) process.loadEnvFile('.env');

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is not set. Copy .env.example to .env first.');
	process.exit(1);
}

// TLS for any remote host (Neon, Supabase, …); skip only for localhost.
const isLocal = /@(localhost|127\.0\.0\.1|\[::1\]|::1)[:/]/.test(url);
const sql = postgres(url, { ssl: isLocal ? undefined : 'require' });
const schemaPath = fileURLToPath(new URL('../src/lib/server/schema.sql', import.meta.url));

try {
	await sql.unsafe(readFileSync(schemaPath, 'utf-8'));
	console.log('✓ Schema created (or already up to date).');
} catch (err) {
	console.error('Failed to create schema:', err.message);
	process.exitCode = 1;
} finally {
	await sql.end();
}
