import { parseShipMarkdown } from './parseShip';
import type { Ship } from './types';

const bundledShipSources = import.meta.glob('/docs/ships/**/*.md', {
	as: 'raw',
	eager: true,
}) as Record<string, string>;

const getFleetSegmentFromPath = (path: string): string | undefined => {
	const parts = path.split('/').filter(Boolean)
	const shipsIndex = parts.indexOf('ships')
	if (shipsIndex === -1) return undefined
	const universe = parts[shipsIndex + 1]
	const segment = parts[shipsIndex + 2]
	const fileName = parts[parts.length - 1]
	if (!universe || !segment || segment === fileName) return undefined
	return segment
}

export const loadBundledShips = (): { ships: Ship[]; errors: string[] } => {
	const ships: Ship[] = [];
	const errors: string[] = [];
	const sourceEntries = Object.entries(bundledShipSources)
	if (sourceEntries.length === 0) {
		errors.push('No bundled ships found under docs/ships. Check the glob path and dev server restart.')
		return { ships, errors }
	}
	for (const [path, source] of sourceEntries) {
		const fileName = path.split('/').pop() ?? path;
		const id = fileName.replace(/\.md$/, '');
		const result = parseShipMarkdown(id, source);
		if (result.success) {
			const fleetSegment = getFleetSegmentFromPath(path)
			ships.push({
				...result.ship,
				fleetSegment
			});
		} else {
			errors.push(`${fileName}: ${result.error.message}`);
		}
	}

	return { ships, errors };
};

export const parseUploadedShipFile = async (file: File): Promise<{ ship?: Ship; error?: string }> => {
	try {
		const text = await file.text();
		const id = file.name.replace(/\.md$/, '').replace(/\s+/g, '-').toLowerCase();
		const result = parseShipMarkdown(id, text);
		if (!result.success) {
			return { error: `${file.name}: ${result.error.message}` };
		}
		return { ship: result.ship };
	} catch {
		return { error: `${file.name}: failed to read file.` };
	}
};
