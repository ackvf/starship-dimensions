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

	it('fits the fleet on initial load', async () => {
		render(Page)
		await tick()
		await tick()
		const scene = document.querySelector<HTMLElement>('.fleet-scene')
		if (!scene) throw new Error('Missing fleet scene')
		const initialTransform = scene.style.transform
		await page.getByRole('button', { name: 'Fit Fleet' }).click()
		expect(scene.style.transform).toBe(initialTransform)
	})

	it('shows uploaded ship details on click and lets the user clear them', async () => {
		render(Page)
		await tick()
		await tick()
		const upload = document.querySelector<HTMLInputElement>('input[type="file"]')
		if (!upload) throw new Error('Missing ship upload input')
		const files = new DataTransfer()
		files.items.add(new File([`---
name: Uploaded Test Ship
universe: Testverse
lengthMeters: 100
links:
	- label: Reference
		url: https://example.com
	- label: Alternate reference
		url: https://example.com
---
# Uploaded ship
This **test** ship and another **test** ship.`], 'uploaded-test-ship.md', { type: 'text/markdown' }))
		Object.defineProperty(upload, 'files', { configurable: true, value: files.files })
		upload.dispatchEvent(new Event('change', { bubbles: true }))
		await expect.element(page.getByRole('status')).toHaveTextContent('Upload complete. 1 ship added.')
		const uploaded = [...document.querySelectorAll<HTMLButtonElement>('.ship')].find(
			(button) => button.querySelector('img')?.alt === 'Uploaded Test Ship'
		)
		if (!uploaded) throw new Error('Missing uploaded ship')
		uploaded.click()
		await expect.element(page.getByRole('button', { name: 'Clear' })).toBeInTheDocument()
		await expect.element(page.getByRole('heading', { name: 'Uploaded Test Ship' })).toBeInTheDocument()
		await page.getByRole('button', { name: 'Clear' }).click()
		await expect.element(page.getByRole('heading', { name: 'Ship File Format' })).toBeInTheDocument()
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
