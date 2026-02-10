import { describe, expect, it } from 'vitest';
import { parseShipMarkdown } from './parseShip';

describe('parseShipMarkdown', () => {
	it('parses valid ship markdown', () => {
		const result = parseShipMarkdown(
			'test-ship',
			`---
name: Test Ship
universe: Testverse
lengthMeters: 100
tags: [alpha, beta]
images:
  main: https://dummyimage.com/100x20/000/fff
links:
  - label: Wiki
    url: https://example.com
---
Description`
		);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.ship.name).toBe('Test Ship');
			expect(result.ship.tags).toEqual(['alpha', 'beta']);
		}
	});

	it('returns error for missing required fields', () => {
		const result = parseShipMarkdown('bad', `---\nname: Missing\n---`);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.message).toContain('Ship universe is required');
		}
	});
});
