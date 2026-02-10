import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('renders starship heading', async () => {
		render(Page);
		const heading = page.getByRole('heading', { level: 1, name: 'Starship Dimensions' });
		await expect.element(heading).toBeInTheDocument();
	});
});
