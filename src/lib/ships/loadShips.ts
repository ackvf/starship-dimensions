import { parseShip } from './parseShip';
import { type Ship, type ShipParseError } from './types';

export type ShipLoadError = ShipParseError & { source: string };

const bundledShipModules = import.meta.glob<string>('./data/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
});

export const loadBundledShips = (): { ships: Ship[]; errors: ShipLoadError[] } => {
	const ships: Ship[] = [];
	const errors: ShipLoadError[] = [];

	for (const [source, content] of Object.entries(bundledShipModules)) {
		const result = parseShip(content, source);
		if (result.ok) {
			ships.push(result.ship);
		} else {
			errors.push({ source, ...result.error });
		}
	}

	return { ships, errors };
};

export const loadUploadedShips = async (
	files: FileList | File[]
): Promise<{ ships: Ship[]; errors: ShipLoadError[] }> => {
	const allFiles = Array.from(files);
	const markdownFiles = allFiles.filter((file) => file.name.endsWith('.md') || file.name.endsWith('.markdown'));

	const ships: Ship[] = [];
	const errors: ShipLoadError[] = [];

	for (const file of markdownFiles) {
		const content = await file.text();
		const result = parseShip(content, file.name);
		if (result.ok) {
			ships.push(result.ship);
		} else {
			errors.push({ source: file.name, ...result.error });
		}
	}

	return { ships, errors };
};
