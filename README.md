# ♞ Chess Tournament Management System

A full-stack chess tournament manager built with **SvelteKit** and **PostgreSQL**.
It supports managing players, running tournaments, generating randomly-paired
matches with recorded results, and computing final rankings.

## Features

| Area | Capability |
| --- | --- |
| **Players** | Full CRUD — create, list, edit, delete. Each player has a name, optional email, and rating (default 1200). |
| **Tournaments** | Full CRUD, plus status tracking (`draft` → `active` → `completed`) and a many-to-many roster of players. |
| **Match system** | Randomly shuffles and pairs the roster, randomly decides each result (win / loss / draw), handles an odd player with a **bye**, and persists each round. |
| **Rankings** | Live standings computed from recorded matches (win = 1, draw = 0.5, bye = 1), with 🥇 🥈 🥉 for the top three and rating-based tie-breaks. |

## Tech stack

- [SvelteKit](https://svelte.dev/docs/kit) (Svelte 5, TypeScript) — UI + server-side form actions
- [PostgreSQL](https://www.postgresql.org/) via [postgres.js](https://github.com/porsager/postgres)
- `@sveltejs/adapter-auto` — deploys to Vercel, Netlify, Node, etc. without config

## Architecture

```
src/
├── hooks.server.ts            # ensures the schema exists on first request
├── lib/
│   ├── types.ts               # shared TypeScript types
│   └── server/
│       ├── db.ts              # postgres.js client + lazy schema creation
│       ├── schema.sql         # tables (players, tournaments, roster, matches)
│       ├── queries.ts         # all SQL, one function per operation
│       └── pairing.ts         # pure random-pairing / result logic (testable)
└── routes/
    ├── +page.svelte           # dashboard
    ├── players/               # player CRUD
    └── tournaments/
        ├── +page.svelte       # list + create
        └── [id]/+page.svelte  # roster, match generation, rankings
```

All database access is server-side only (files under `lib/server/` and
`+page.server.ts` never reach the browser). Queries use postgres.js tagged
templates, which **parameterise every value** — no string-concatenated SQL, so
the app is not exposed to SQL injection.

## Getting started (local)

**Only prerequisite:** [Node.js](https://nodejs.org) 20.19+ (or 22.12+). No
PostgreSQL install required.

```bash
npm install
npm run dev
```

Open http://localhost:5173 — that's it.

**Why nothing else is needed:** `npm run dev` runs a launcher
([scripts/dev.mjs](scripts/dev.mjs)) that, if you haven't pointed it at your own
database, automatically starts a **real PostgreSQL server** from a local folder
(`.pgdata/`) using a bundled binary — no system install, no admin rights, no
configuration. Tables are created automatically on first load. Press Ctrl+C to
stop; the database is stopped with it.

> This works on any machine that can run Node: copy the project, `npm install`,
> `npm run dev`. (A single stand-alone `.exe` isn't practical for a web app, but
> this is as close to zero-setup as it gets.)

Optional: load sample data (8 players + a tournament):

```bash
npm run db:seed
```

### Using your own PostgreSQL (Neon, Supabase, or a local install)

Set `DATABASE_URL` in a `.env` file (copy [.env.example](.env.example)) and the
launcher uses it instead of the bundled database — nothing else changes:

```
DATABASE_URL="postgres://user:pass@ep-xxx.aws.neon.tech/neondb?sslmode=require"
```

TLS is enabled automatically for any remote host.

## Deploying a live link

The project uses `adapter-auto`, so it deploys as-is to most platforms. Using
**Vercel** with **Neon** Postgres:

1. Push this repo to GitHub.
2. Import the repo at [vercel.com/new](https://vercel.com/new).
3. Add an environment variable `DATABASE_URL` = your Neon connection string
   (with `?sslmode=require`).
4. Deploy. The schema is created automatically on the first request.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the database (auto) **and** the dev server — one command |
| `npm run dev:vite` | Start only the SvelteKit dev server (assumes a DB is already available) |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run check` | Type-check the project |
| `npm run db:init` | Create the schema |
| `npm run db:seed` | Create the schema and load sample data |
| `npm test` | Run the match-engine unit tests |

## Testing

`npm test` exercises the pure pairing engine (`src/lib/server/pairing.ts`) —
33 assertions covering match counts, bye handling on odd rosters, winner
consistency, non-mutating shuffle, and draw-probability bounds. Keeping the
random-pairing logic free of database and UI concerns is what makes it directly
testable.

## Security notes

- **No SQL injection** — every query uses postgres.js tagged templates, which
  send values as bound parameters, never string concatenation.
- **Server-only data access** — all DB code lives under `src/lib/server/`, which
  SvelteKit guarantees is never bundled into client code.
- **Input validation** — player and tournament inputs are validated and length-
  bounded server-side before hitting the database.
- `npm audit` reports 3 low-severity advisories in a transitive framework
  dependency (`cookie`, via SvelteKit); these are dev/framework-level and do not
  affect the deployed runtime.

## Scoring & ranking rules

- **Win** → 1 point · **Draw** → 0.5 · **Loss** → 0 · **Bye** → 1 point.
- Standings are ranked by points, then wins, then player rating, then name.
- `RANK()` is used so tied players share a position.
