<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Token } from 'marked';

	export let tokens: Token[] = [];

	const openLink = (href: string) => {
		const target = /^https?:\/\//i.test(href) ? href : resolve(href as '/');
		window.open(target, '_blank', 'noopener,noreferrer');
	};

	const getNestedTokens = (token: Token): Token[] => {
		if ('tokens' in token && Array.isArray(token.tokens)) {
			return token.tokens;
		}
		return [];
	};
</script>

<svelte:options runes={false} />

{#each tokens as token (token.raw)}
	{#if token.type === 'text' || token.type === 'escape'}
		{token.text}
	{:else if token.type === 'strong'}
		<strong><svelte:self tokens={getNestedTokens(token)} /></strong>
	{:else if token.type === 'em'}
		<em><svelte:self tokens={getNestedTokens(token)} /></em>
	{:else if token.type === 'del'}
		<s><svelte:self tokens={getNestedTokens(token)} /></s>
	{:else if token.type === 'codespan'}
		<code>{token.text}</code>
	{:else if token.type === 'br'}
		<br />
	{:else if token.type === 'link'}
		<button class="inline-link" type="button" on:click={() => openLink(token.href)}>
			<svelte:self tokens={getNestedTokens(token)} />
		</button>
	{:else if token.type === 'image'}
		<img class="inline-image" src={token.href} alt={token.text} loading="lazy" />
	{:else if 'text' in token}
		{token.text}
	{/if}
{/each}

<style>
.inline-link {
	padding: 0;
	border: 0;
	background: transparent;
	color: #93c5fd;
	text-decoration: underline;
	cursor: pointer;
	font: inherit;
}

.inline-link:hover {
	color: #bfdbfe;
}

.inline-image {
	max-width: 100%;
	height: auto;
}
</style>
