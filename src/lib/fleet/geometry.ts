import type { Ship } from '$lib/ships';
import type { FleetBounds, FleetItem } from './types';

export const getVisualWidth = (ship: Ship, metersToPixels: number): number =>
	Math.max(ship.lengthMeters * metersToPixels, 72);

export const getVisualHeight = (ship: Ship, metersToPixels: number): number => {
	const ratio = ship.heightMeters ? ship.heightMeters / ship.lengthMeters : 0.22;
	return Math.max(getVisualWidth(ship, metersToPixels) * ratio, 28);
};

export const getFleetBounds = (ships: FleetItem[], metersToPixels: number): FleetBounds | null => {
	if (!ships.length) return null;
	const widths = ships.map((item) => getVisualWidth(item.ship, metersToPixels));
	const heights = ships.map((item) => getVisualHeight(item.ship, metersToPixels));
	const minX = Math.min(...ships.map((item, idx) => item.x - widths[idx] / 2));
	const maxX = Math.max(...ships.map((item, idx) => item.x + widths[idx] / 2));
	const minY = Math.min(...ships.map((item, idx) => item.y - heights[idx] / 2));
	const maxY = Math.max(...ships.map((item, idx) => item.y + heights[idx] / 2));
	return { minX, maxX, minY, maxY };
};
