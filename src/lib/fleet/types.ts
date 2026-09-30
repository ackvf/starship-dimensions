import type { Ship } from '$lib/ships';

export type FleetItem = {
	id: string;
	ship: Ship;
	x: number;
	y: number;
};

export type ShipDuplicate = {
	id: string;
	shipId: string;
	x: number;
	y: number;
};

export type FleetBounds = {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
};

export type FleetViewport = {
	scale: number;
	panX: number;
	panY: number;
};

export type SeedFleetShip = {
	id: string;
	ship: Ship;
};

export type FleetLayoutOptions = {
	groupSpacing?: number;
	rowMaxWidth?: number;
};
