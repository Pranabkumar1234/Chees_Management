<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let editing = $state(false);

	const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

	// Group matches by round for display.
	let rounds = $derived.by(() => {
		const map = new Map<number, typeof data.matches>();
		for (const m of data.matches) {
			if (!map.has(m.round)) map.set(m.round, []);
			map.get(m.round)!.push(m);
		}
		return [...map.entries()].sort((a, b) => a[0] - b[0]);
	});

	function resultLabel(m: (typeof data.matches)[number]): string {
		if (m.result === 'bye') return 'Bye';
		if (m.result === 'draw') return 'Draw';
		return `${m.winner_name} won`;
	}
</script>

<p><a href="/tournaments">← All tournaments</a></p>

<div class="page-header">
	<div>
		<h1 style="margin-bottom:0.35rem">{data.tournament.name}</h1>
		<span class="badge badge-{data.tournament.status}">{data.tournament.status}</span>
		<span class="muted" style="margin-left:0.5rem">
			{data.tournament.location ?? 'No location'}
			{#if data.tournament.start_date}· starts {data.tournament.start_date}{/if}
		</span>
	</div>
	<div class="row" style="flex:0">
		<button class="btn-sm" type="button" onclick={() => (editing = !editing)}>
			{editing ? 'Close' : 'Edit'}
		</button>
		<form method="POST" action="?/delete" use:enhance class="inline-form">
			<button
				class="btn-danger btn-sm"
				type="submit"
				onclick={(e) => {
					if (!confirm('Delete this tournament and all its matches?')) e.preventDefault();
				}}>Delete</button
			>
		</form>
	</div>
</div>

{#if editing}
	<div class="card" style="margin-bottom:1.5rem">
		<form method="POST" action="?/update" use:enhance={() => ({ update }) => update()}>
			<div class="row">
				<div class="field">
					<label for="t-name">Name</label>
					<input id="t-name" name="name" value={data.tournament.name} required />
				</div>
				<div class="field">
					<label for="t-loc">Location</label>
					<input id="t-loc" name="location" value={data.tournament.location ?? ''} />
				</div>
				<div class="field" style="max-width:170px">
					<label for="t-date">Start date</label>
					<input id="t-date" name="start_date" type="date" value={data.tournament.start_date ?? ''} />
				</div>
				<div class="field" style="max-width:150px">
					<label for="t-status">Status</label>
					<select id="t-status" name="status" value={data.tournament.status}>
						<option value="draft">Draft</option>
						<option value="active">Active</option>
						<option value="completed">Completed</option>
					</select>
				</div>
			</div>
			<button class="btn-primary btn-sm" type="submit">Save changes</button>
		</form>
	</div>
{/if}

<div class="grid" style="grid-template-columns: 1fr 1fr; align-items:start">
	<!-- Roster management -->
	<div class="card">
		<h3 style="margin-top:0">Roster ({data.roster.length})</h3>

		<form method="POST" action="?/addPlayer" use:enhance class="row" style="margin-bottom:1rem">
			<select name="player_id" required style="flex:1">
				<option value="" disabled selected>Add a player…</option>
				{#each data.available as p}
					<option value={p.id}>{p.name} ({p.rating})</option>
				{/each}
			</select>
			<button class="btn-primary btn-sm" type="submit" style="flex:0" disabled={data.available.length === 0}>
				Add
			</button>
		</form>

		{#if data.roster.length === 0}
			<p class="muted">No players entered yet.</p>
		{:else}
			<table>
				<tbody>
					{#each data.roster as p (p.id)}
						<tr>
							<td>{p.name}</td>
							<td class="muted" style="width:60px">{p.rating}</td>
							<td style="width:40px; text-align:right">
								<form method="POST" action="?/removePlayer" use:enhance class="inline-form">
									<input type="hidden" name="player_id" value={p.id} />
									<button class="btn-danger btn-sm" type="submit" title="Remove">✕</button>
								</form>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>

	<!-- Rankings -->
	<div class="card">
		<h3 style="margin-top:0">Rankings</h3>
		{#if data.rankings.every((r) => r.played === 0)}
			<p class="muted">No matches played yet. Generate a round to build the standings.</p>
		{:else}
			<table>
				<thead>
					<tr>
						<th style="width:50px">#</th>
						<th>Player</th>
						<th style="width:50px">Pts</th>
						<th style="width:70px">W-D-L</th>
					</tr>
				</thead>
				<tbody>
					{#each data.rankings as r (r.player_id)}
						<tr class:rank-1={r.rank === 1} class:rank-2={r.rank === 2} class:rank-3={r.rank === 3}>
							<td>
								{#if medals[r.rank]}<span class="medal">{medals[r.rank]}</span>{:else}{r.rank}{/if}
							</td>
							<td>{r.name}</td>
							<td><strong>{r.points}</strong></td>
							<td class="muted">{r.wins}-{r.draws}-{r.losses}{r.byes ? ` (+${r.byes} bye)` : ''}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>

<!-- Match system -->
<div class="page-header" style="margin-top:2rem; margin-bottom:1rem">
	<h2 style="margin:0">Matches</h2>
	<div class="row" style="flex:0">
		<form method="POST" action="?/generateRound" use:enhance class="inline-form">
			<button class="btn-primary btn-sm" type="submit">🎲 Generate round</button>
		</form>
		{#if data.matches.length > 0}
			<form method="POST" action="?/complete" use:enhance class="inline-form">
				<button class="btn-sm" type="submit">Mark completed</button>
			</form>
			<form method="POST" action="?/clearMatches" use:enhance class="inline-form">
				<button
					class="btn-danger btn-sm"
					type="submit"
					onclick={(e) => {
						if (!confirm('Delete all matches for this tournament?')) e.preventDefault();
					}}>Clear all</button
				>
			</form>
		{/if}
	</div>
</div>

{#if form?.error}
	<div class="error" style="margin-bottom:1rem">{form.error}</div>
{/if}

{#if data.matches.length === 0}
	<div class="empty">
		No matches yet. Add at least 2 players to the roster, then click
		<strong>Generate round</strong> to randomly pair them and record results.
	</div>
{:else}
	{#each rounds as [roundNo, matches]}
		<h3 class="section-title">Round {roundNo}</h3>
		<div class="card" style="padding:0">
			<table>
				<thead>
					<tr>
						<th>White</th>
						<th>Black</th>
						<th style="width:160px">Result</th>
					</tr>
				</thead>
				<tbody>
					{#each matches as m (m.id)}
						<tr>
							<td class:winner={m.result === 'player1' || m.result === 'bye'}>
								{m.player1_name}
							</td>
							<td class:winner={m.result === 'player2'}>
								{m.player2_name ?? '—'}
							</td>
							<td class="muted">{resultLabel(m)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/each}
{/if}

<style>
	.winner {
		font-weight: 700;
		color: var(--text);
	}
	td.winner::after {
		content: ' ✓';
		color: var(--candle);
	}
</style>
