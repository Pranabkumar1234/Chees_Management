<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Which player row is currently being edited (null = none, 'new' handled separately).
	let editId = $state<number | null>(null);

	function startEdit(id: number) {
		editId = id;
	}
	function cancelEdit() {
		editId = null;
	}
</script>

<div class="page-header">
	<h1>Players</h1>
</div>

<!-- Create form -->
<div class="card">
	<h3 style="margin-top:0">Add a player</h3>
	<form
		method="POST"
		action="?/create"
		use:enhance={() =>
			({ update }) =>
				update({ reset: true })}
	>
		<div class="row">
			<div class="field">
				<label for="name">Name *</label>
				<input id="name" name="name" placeholder="e.g. Magnus Carlsen" required />
			</div>
			<div class="field">
				<label for="email">Email</label>
				<input id="email" name="email" type="email" placeholder="optional" />
			</div>
			<div class="field" style="max-width:140px">
				<label for="rating">Rating</label>
				<input id="rating" name="rating" type="number" value="1200" min="0" max="4000" />
			</div>
		</div>
		<button class="btn-primary" type="submit">+ Add player</button>
		{#if form?.errors && !form?.editId}
			{#each Object.values(form.errors) as msg}
				<div class="error">{msg}</div>
			{/each}
		{/if}
	</form>
</div>

<h2 class="section-title">All players ({data.players.length})</h2>

{#if data.players.length === 0}
	<div class="empty">No players yet. Add your first player above.</div>
{:else}
	<div class="card" style="padding:0">
		<table>
			<thead>
				<tr>
					<th>Name</th>
					<th>Email</th>
					<th style="width:90px">Rating</th>
					<th style="width:160px; text-align:right">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each data.players as p (p.id)}
					{#if editId === p.id}
						<tr>
							<td colspan="4">
								<form
									method="POST"
									action="?/update"
									use:enhance={() =>
										({ update, result }) => {
											if (result.type === 'success') editId = null;
											update();
										}}
								>
									<input type="hidden" name="id" value={p.id} />
									<div class="row">
										<div class="field">
											<label for="en-{p.id}">Name *</label>
											<input id="en-{p.id}" name="name" value={p.name} required />
										</div>
										<div class="field">
											<label for="ee-{p.id}">Email</label>
											<input id="ee-{p.id}" name="email" type="email" value={p.email ?? ''} />
										</div>
										<div class="field" style="max-width:120px">
											<label for="er-{p.id}">Rating</label>
											<input id="er-{p.id}" name="rating" type="number" value={p.rating} />
										</div>
									</div>
									<button class="btn-primary btn-sm" type="submit">Save</button>
									<button class="btn-sm" type="button" onclick={cancelEdit}>Cancel</button>
									{#if form?.errors && form?.editId === p.id}
										{#each Object.values(form.errors) as msg}
											<div class="error">{msg}</div>
										{/each}
									{/if}
								</form>
							</td>
						</tr>
					{:else}
						<tr>
							<td>{p.name}</td>
							<td class="muted">{p.email ?? '—'}</td>
							<td>{p.rating}</td>
							<td style="text-align:right">
								<button class="btn-sm" type="button" onclick={() => startEdit(p.id)}>Edit</button>
								<form
									class="inline-form"
									method="POST"
									action="?/delete"
									use:enhance
								>
									<input type="hidden" name="id" value={p.id} />
									<button
										class="btn-danger btn-sm"
										type="submit"
										onclick={(e) => {
											if (!confirm(`Delete ${p.name}? This also removes them from tournaments and matches.`))
												e.preventDefault();
										}}>Delete</button
									>
								</form>
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	</div>
{/if}
