/**
 * Seed some sample players and a tournament so the app has data to explore.
 *
 *   npm run db:seed
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

const PLAYERS = [
	['Magnus Carlsen', 'magnus@example.com', 2830],
	['Hikaru Nakamura', 'hikaru@example.com', 2790],
	['Fabiano Caruana', 'fabiano@example.com', 2780],
	['Ding Liren', 'ding@example.com', 2770],
	['Ian Nepomniachtchi', 'ian@example.com', 2760],
	['Alireza Firouzja', 'alireza@example.com', 2750],
	['Gukesh D', 'gukesh@example.com', 2740],
	['Anish Giri', 'anish@example.com', 2730]
];

try {
	await sql.unsafe(readFileSync(schemaPath, 'utf-8'));

	const inserted = [];
	for (const [name, email, rating] of PLAYERS) {
		const [row] = await sql`
			INSERT INTO players (name, email, rating)
			VALUES (${name}, ${email}, ${rating})
			ON CONFLICT (email) DO UPDATE SET rating = EXCLUDED.rating
			RETURNING id
		`;
		inserted.push(row.id);
	}

	const [t] = await sql`
		INSERT INTO tournaments (name, location, status)
		VALUES ('Candidates 2026', 'Toronto', 'active')
		RETURNING id
	`;

	for (const pid of inserted) {
		await sql`
			INSERT INTO tournament_players (tournament_id, player_id)
			VALUES (${t.id}, ${pid}) ON CONFLICT DO NOTHING
		`;
	}

	console.log(`✓ Seeded ${inserted.length} players and tournament #${t.id} (Candidates 2026).`);
	console.log('  Open the tournament and click "Generate round" to create matches.');
} catch (err) {
	console.error('Seed failed:', err.message);
	process.exitCode = 1;
} finally {
	await sql.end();
}
