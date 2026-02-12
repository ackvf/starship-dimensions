import { parseShip } from './parseShip';
import type { Ship, ShipParseError } from './types';

const bundledShipModules = import.meta.glob('$lib/ships/data/*.md', {
	eager: true,
	query: '?raw',
	import: 'default'
}) as Record<string, string>;

export const loadBundledShips = (): { ships: Ship[]; errors: ShipParseError[] } => {
	const ships: Ship[] = [];
	const errors: ShipParseError[] = [];

	for (const [path, content] of Object.entries(bundledShipModules)) {
		const result = parseShip(content, path.split('/').pop() ?? path);
		if (result.ship) {
			ships.push(result.ship);
		} else if (result.error) {
			errors.push(result.error);
		}
	}

	return { ships, errors };
};

export const parseUploadedShips = async (files: File[]): Promise<{ ships: Ship[]; errors: ShipParseError[] }> => {
	const ships: Ship[] = [];
	const errors: ShipParseError[] = [];

	for (const file of files) {
		const content = await file.text();
		const result = parseShip(content, file.name);
		if (result.ship) {
			ships.push(result.ship);
		} else if (result.error) {
			errors.push(result.error);
		}
	}

	return { ships, errors };
};
