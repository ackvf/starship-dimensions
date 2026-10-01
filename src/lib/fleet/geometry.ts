import type { Ship } from '$lib/ships';
import type { FleetBounds, FleetItem } from './types';

const MIN_FRAME_METERS = 70;

export const isSmallFramedShip = (ship: Ship): boolean => ship.lengthMeters < MIN_FRAME_METERS;

export const getImageVisualWidth = (ship: Ship, metersToPixels: number): number =>
	Math.max(ship.lengthMeters * metersToPixels, 1);

export const getImageVisualHeight = (ship: Ship, metersToPixels: number): number => {
	const ratio = ship.heightMeters ? ship.heightMeters / ship.lengthMeters : 0.22;
	return Math.max(getImageVisualWidth(ship, metersToPixels) * ratio, 1);
};

export const getVisualWidth = (ship: Ship, metersToPixels: number): number =>
	isSmallFramedShip(ship)
		? MIN_FRAME_METERS
		: getImageVisualWidth(ship, metersToPixels);

export const getVisualHeight = (ship: Ship, metersToPixels: number): number => {
	if (isSmallFramedShip(ship)) {
		return MIN_FRAME_METERS;
	}
	return getImageVisualHeight(ship, metersToPixels);
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
