import { getVisualHeight, getVisualWidth } from './geometry';
import type { FleetItem, FleetLayoutOptions, SeedFleetShip } from './types';

export const layoutFleet = (
	seedShips: SeedFleetShip[],
	metersToPixels: number,
	options: FleetLayoutOptions = {}
): FleetItem[] => {
	const groupSpacing = options.groupSpacing ?? 160;
	const rowMaxWidth = options.rowMaxWidth ?? 1400;
	const byGroup: Record<string, SeedFleetShip[]> = {};

	for (const seed of seedShips) {
		const segment = seed.ship.fleetSegment ?? 'universe';
		const key = `${seed.ship.universe}::${segment}`;
		const group = byGroup[key] ?? [];
		group.push(seed);
		byGroup[key] = group;
	}

	const groupKeys = Object.keys(byGroup).sort((a, b) => a.localeCompare(b));
	const items: FleetItem[] = [];
	let cursorX = 0;
	let cursorY = 0;
	let rowHeight = 0;

	for (const key of groupKeys) {
		const groupShips = byGroup[key] ?? [];
		const placed: Array<{ id: string; ship: SeedFleetShip['ship']; x: number; y: number; width: number; height: number }> = [];
		const sorted = [...groupShips].sort((a, b) => b.ship.lengthMeters - a.ship.lengthMeters);

		for (const seed of sorted) {
			const width = getVisualWidth(seed.ship, metersToPixels);
			const height = getVisualHeight(seed.ship, metersToPixels);
			let x = 0;
			let y = 0;
			let placedOk = false;
			const padding = 18 + Math.min(width, height) * 0.08;

			for (let attempt = 0; attempt < 1200; attempt += 1) {
				const angle = attempt * 0.55;
				const radius = 12 + attempt * 6;
				x = Math.cos(angle) * radius;
				y = Math.sin(angle) * radius;
				const overlaps = placed.some(
					(other) =>
						Math.abs(x - other.x) < (width + other.width) / 2 + padding &&
						Math.abs(y - other.y) < (height + other.height) / 2 + padding
				);
				if (!overlaps) {
					placedOk = true;
					break;
				}
			}

			if (!placedOk && placed.length) {
				x = placed[placed.length - 1].x + width + padding;
				y = placed[placed.length - 1].y;
			}

			placed.push({ id: seed.id, ship: seed.ship, x, y, width, height });
		}

		const minX = Math.min(...placed.map((item) => item.x - item.width / 2));
		const maxX = Math.max(...placed.map((item) => item.x + item.width / 2));
		const minY = Math.min(...placed.map((item) => item.y - item.height / 2));
		const maxY = Math.max(...placed.map((item) => item.y + item.height / 2));
		const groupWidth = maxX - minX;
		const groupHeight = maxY - minY;

		if (cursorX && cursorX + groupWidth > rowMaxWidth) {
			cursorX = 0;
			cursorY += rowHeight + groupSpacing;
			rowHeight = 0;
		}

		const offsetX = cursorX - minX;
		const offsetY = cursorY - minY;
		for (const item of placed) {
			items.push({
				id: item.id,
				ship: item.ship,
				x: item.x + offsetX,
				y: item.y + offsetY
			});
		}

		cursorX += groupWidth + groupSpacing;
		rowHeight = Math.max(rowHeight, groupHeight);
	}

	return items;
};
