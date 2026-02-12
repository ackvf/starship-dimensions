import { parseShip } from './parseShip';
import type { Ship, ShipParseError } from './types';

const bundledLoaders = import.meta.glob('/src/lib/ships/data/*.md', {
	query: '?raw',
	import: 'default'
});

export type ShipLoadState = {
	ships: Ship[];
	errors: ShipParseError[];
};

const upsertShip = (collection: Ship[], incoming: Ship) => {
	const existingIndex = collection.findIndex((ship) => ship.id === incoming.id);
	if (existingIndex >= 0) {
		collection[existingIndex] = incoming;
		return;
	}
	collection.push(incoming);
};

export const loadBundledShips = async (): Promise<ShipLoadState> => {
	const ships: Ship[] = [];
	const errors: ShipParseError[] = [];

	for (const [path, load] of Object.entries(bundledLoaders)) {
		const source = await load();
		const result = parseShip(String(source), path.split('/').at(-1) ?? path);
		if (!result.ok) {
			errors.push(result.error);
			continue;
		}
		upsertShip(ships, result.ship);
	}

	return { ships, errors };
};

export const mergeShipUploads = (
	baseShips: Ship[],
	files: Array<{ name: string; content: string }>
): ShipLoadState => {
	const ships = [...baseShips];
	const errors: ShipParseError[] = [];

	for (const file of files) {
		const result = parseShip(file.content, file.name);
		if (!result.ok) {
			errors.push(result.error);
			continue;
		}
		upsertShip(ships, result.ship);
	}

	return { ships, errors };
};
