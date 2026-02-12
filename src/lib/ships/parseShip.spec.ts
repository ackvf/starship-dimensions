import { describe, expect, it } from 'vitest';
import { parseShip } from './parseShip';

describe('parseShip', () => {
	it('parses a valid ship file', () => {
		const result = parseShip(`---\nname: Test Ship\nuniverse: Demo\nlengthMeters: 99\ntags: [test]\nimages:\n  main: https://example.com/ship.png\n---\nHello`);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.ship.name).toBe('Test Ship');
			expect(result.ship.descriptionMarkdown).toBe('Hello');
		}
	});

	it('returns a structured error for invalid data', () => {
		const result = parseShip(`---\nname: Broken\nuniverse: Demo\ntags: [x]\nimages:\n  main: https://example.com\n---`);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.field).toBe('lengthMeters');
		}
	});
});
