<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';

	let { children } = $props();

	const links = [
		{ href: '/', label: 'Dashboard' },
		{ href: '/players', label: 'Players' },
		{ href: '/tournaments', label: 'Tournaments' }
	];

	function isActive(href: string): boolean {
		if (href === '/') return $page.url.pathname === '/';
		return $page.url.pathname.startsWith(href);
	}
</script>

<nav class="nav">
	<div class="nav-inner">
		<a class="brand" href="/">♞ Chess Manager</a>
		<div class="nav-links">
			{#each links as link}
				<a href={link.href} class:active={isActive(link.href)}>{link.label}</a>
			{/each}
		</div>
	</div>
</nav>

<main class="container">
	{@render children()}
</main>
