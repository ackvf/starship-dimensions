<script lang="ts">
	import { marked, type Token } from 'marked';
	import InlineMarkdown from '$lib/components/InlineMarkdown.svelte';

	export let markdown = '';
	export let tokens: Token[] | null = null;

	$: sourceTokens = tokens ?? marked.lexer(markdown.trim(), { gfm: true, breaks: true });
	$: blockTokens = sourceTokens.filter((token) => token.type !== 'space' && token.type !== 'def');

	const hasTokens = (token: Token): token is Token & { tokens: Token[] } =>
		'tokens' in token && Array.isArray(token.tokens) && token.tokens.length > 0;

	const asTokens = (token: Token): Token[] => {
		if (hasTokens(token)) {
			return token.tokens;
		}
		return [];
	};
</script>

<svelte:options runes={false} />

{#if blockTokens.length === 0}
	<p>No description provided.</p>
{/if}

{#each blockTokens as token, idx (`${token.type}-${idx}`)}
	{#if token.type === 'heading'}
		<svelte:element this={`h${Math.min(6, Math.max(1, token.depth))}`}>
			<InlineMarkdown tokens={asTokens(token)} />
		</svelte:element>
	{:else if token.type === 'paragraph'}
		<p><InlineMarkdown tokens={asTokens(token)} /></p>
	{:else if token.type === 'text'}
		{#if hasTokens(token)}
			<p><InlineMarkdown tokens={token.tokens} /></p>
		{:else}
			<p>{token.text}</p>
		{/if}
	{:else if token.type === 'list'}
		<svelte:element this={token.ordered ? 'ol' : 'ul'}>
			{#each token.items as item, itemIdx (`${idx}-${itemIdx}`)}
				<li>
					{#if item.task}
						<input type="checkbox" checked={item.checked} disabled />
					{/if}
					<svelte:self tokens={item.tokens} markdown="" />
				</li>
			{/each}
		</svelte:element>
	{:else if token.type === 'blockquote'}
		<blockquote>
			<svelte:self tokens={token.tokens} markdown="" />
		</blockquote>
	{:else if token.type === 'code'}
		<pre><code>{token.text}</code></pre>
	{:else if token.type === 'hr'}
		<hr />
	{:else if token.type === 'table'}
		<table>
			<thead>
				<tr>
					{#each token.header as cell, cellIdx (`h-${idx}-${cellIdx}`)}
						<th><InlineMarkdown tokens={cell.tokens} /></th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each token.rows as row, rowIdx (`r-${idx}-${rowIdx}`)}
					<tr>
						{#each row as cell, rowCellIdx (`c-${idx}-${rowIdx}-${rowCellIdx}`)}
							<td><InlineMarkdown tokens={cell.tokens} /></td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	{:else if token.type === 'html'}
		<p>{token.text}</p>
	{/if}
{/each}

<style>
blockquote {
	margin: 0.5rem 0;
	padding-left: 0.75rem;
	border-left: 2px solid #475569;
}

pre {
	overflow-x: auto;
	background: #0f172a;
	padding: 0.55rem;
	border-radius: 0.25rem;
}

table {
	width: 100%;
	border-collapse: collapse;
}

th,
td {
	border: 1px solid #334155;
	padding: 0.35rem;
	text-align: left;
}
</style>
