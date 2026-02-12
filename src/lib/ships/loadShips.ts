import { parseShip } from './parseShip';
import type { Ship, ShipParseError } from './types';

const bundledShipModules = import.meta.glob('./data/*.md', { query: '?raw', import: 'default', eager: true });

export const loadBundledShips = (): { ships: Ship[]; errors: ShipParseError[] } => {
	const ships: Ship[] = [];
	const errors: ShipParseError[] = [];

	for (const [path, source] of Object.entries(bundledShipModules)) {
		if (typeof source !== 'string') {
			continue;
		}
		const result = parseShip(source, path.split('/').pop() ?? path);
		if (result.ok) {
			ships.push(result.ship);
		} else {
			errors.push(result.error);
		}
	}

	return { ships, errors };
};

export const loadUploadedShips = async (files: File[]): Promise<{ ships: Ship[]; errors: ShipParseError[] }> => {
	const ships: Ship[] = [];
	const errors: ShipParseError[] = [];

	for (const file of files) {
		const source = await file.text();
		const result = parseShip(source, file.name);
		if (result.ok) {
			ships.push(result.ship);
		} else {
			errors.push(result.error);
		}
	}

	return { ships, errors };
};
