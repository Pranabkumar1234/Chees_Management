<script lang="ts">
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<div class="page-header">
	<h1>Tournaments</h1>
</div>

<div class="card">
	<h3 style="margin-top:0">Create a tournament</h3>
	<form method="POST" action="?/create">
		<div class="row">
			<div class="field">
				<label for="name">Name *</label>
				<input id="name" name="name" placeholder="e.g. Summer Open 2026" required />
			</div>
			<div class="field">
				<label for="location">Location</label>
				<input id="location" name="location" placeholder="optional" />
			</div>
			<div class="field" style="max-width:180px">
				<label for="start_date">Start date</label>
				<input id="start_date" name="start_date" type="date" />
			</div>
		</div>
		<button class="btn-primary" type="submit">+ Create tournament</button>
		{#if form?.error}
			<div class="error">{form.error}</div>
		{/if}
	</form>
</div>

<h2 class="section-title">All tournaments ({data.tournaments.length})</h2>

{#if data.tournaments.length === 0}
	<div class="empty">No tournaments yet. Create your first one above.</div>
{:else}
	<div class="grid grid-cards">
		{#each data.tournaments as t (t.id)}
			<a class="card" href="/tournaments/{t.id}" style="text-decoration:none; color:inherit">
				<div style="display:flex; justify-content:space-between; align-items:start; gap:0.5rem">
					<h3 style="margin:0 0 0.35rem">{t.name}</h3>
					<span class="badge badge-{t.status}">{t.status}</span>
				</div>
				<div class="muted" style="font-size:0.85rem">
					{t.location ?? 'No location'} · {t.player_count} player{t.player_count === 1 ? '' : 's'}
				</div>
			</a>
		{/each}
	</div>
{/if}
