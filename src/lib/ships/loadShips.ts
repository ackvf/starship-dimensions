import { parseShipMarkdown } from './parseShip';
import type { Ship } from './types';

const bundledShipSources = import.meta.glob('./data/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

export const loadBundledShips = (): { ships: Ship[]; errors: string[] } => {
	const ships: Ship[] = [];
	const errors: string[] = [];

	for (const [path, source] of Object.entries(bundledShipSources)) {
		const fileName = path.split('/').pop() ?? path;
		const id = fileName.replace(/\.md$/, '');
		const result = parseShipMarkdown(id, source);
		if (result.success) {
			ships.push(result.ship);
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
