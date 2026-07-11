<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<div class="page-header">
	<div>
		<h1>♞ Chess Tournament Manager</h1>
		<p class="muted">Manage players, run tournaments, and track rankings.</p>
	</div>
</div>

<div class="grid grid-cards">
	<a class="card stat" href="/players" style="text-decoration:none">
		<span class="ico">♟️</span>
		<span class="num">{data.stats.players}</span>
		<span class="lbl">Players</span>
	</a>
	<a class="card stat stat-copper" href="/tournaments" style="text-decoration:none">
		<span class="ico">🏆</span>
		<span class="num">{data.stats.tournaments}</span>
		<span class="lbl">Tournaments</span>
	</a>
	<div class="card stat stat-candle">
		<span class="ico">🕯️</span>
		<span class="num">{data.stats.matches}</span>
		<span class="lbl">Matches Played</span>
	</div>
</div>

<h2 class="section-title">Recent tournaments</h2>
{#if data.recent.length === 0}
	<div class="empty">
		No tournaments yet. <a href="/tournaments">Create one →</a>
	</div>
{:else}
	<div class="card" style="padding:0">
		<table>
			<thead>
				<tr><th>Name</th><th>Status</th><th></th></tr>
			</thead>
			<tbody>
				{#each data.recent as t}
					<tr>
						<td><a href="/tournaments/{t.id}">{t.name}</a></td>
						<td><span class="badge badge-{t.status}">{t.status}</span></td>
						<td style="text-align:right"><a class="btn btn-sm" href="/tournaments/{t.id}">Open</a></td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
