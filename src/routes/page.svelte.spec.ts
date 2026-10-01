import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { tick } from 'svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('renders starship heading', async () => {
		render(Page);
		const heading = page.getByRole('heading', { level: 1, name: 'Starship Dimensions' });
		await expect.element(heading).toBeInTheDocument();
	});

	it('keeps ruler labels bottom-aligned and scaled with the grid when zooming', async () => {
		render(Page);
		const fleet = document.querySelector<HTMLElement>('.fleet');
		const grid = document.querySelector<HTMLElement>('.stars');
		const zero = document.querySelector<HTMLElement>('.scale-zero');
		const marks = [...document.querySelectorAll<HTMLElement>('.scale-mark')];
		if (!fleet || !grid || !zero || marks.length !== 4) throw new Error('Missing ruler elements');

		const assertScale = () => {
			const gridPixels = parseFloat(grid.style.backgroundSize);
			const originBottom = zero.getBoundingClientRect().bottom;
			for (const [index, meters] of [10, 100, 1000, 10000].entries()) {
				const mark = marks[index];
				expect(parseFloat(mark.style.right)).toBeCloseTo((meters / 100) * gridPixels);
				expect(mark.getBoundingClientRect().bottom).toBeCloseTo(originBottom);
			}
			return gridPixels;
		};

		await tick();
		await tick();
		const beforeZoom = assertScale();
		fleet.dispatchEvent(new WheelEvent('wheel', { deltaY: -60, bubbles: true, cancelable: true }));
		await tick();
		expect(assertScale()).toBeGreaterThan(beforeZoom);
	});
});
