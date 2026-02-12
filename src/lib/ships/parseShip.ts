import matter from 'gray-matter';
import { type ParseShipResult, type Ship, type ShipImageSet, type ShipLink } from './types';

const toSlug = (value: string): string =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');

const getString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

const getStringArray = (value: unknown): string[] | undefined => {
	if (!Array.isArray(value)) return undefined;
	if (!value.every((entry) => typeof entry === 'string')) return undefined;
	return value;
};

const parseLinks = (value: unknown): ShipLink[] | undefined => {
	if (value === undefined) return undefined;
	if (!Array.isArray(value)) return undefined;
	const links: ShipLink[] = [];
	for (const entry of value) {
		if (!entry || typeof entry !== 'object') return undefined;
		const label = getString((entry as Record<string, unknown>).label);
		const url = getString((entry as Record<string, unknown>).url);
		if (!label || !url) return undefined;
		links.push({ label, url });
	}
	return links;
};

const parseImages = (value: unknown): ShipImageSet | undefined => {
	if (!value || typeof value !== 'object') return undefined;
	const object = value as Record<string, unknown>;
	const main = getString(object.main);
	if (!main) return undefined;
	return {
		main,
		silhouette: getString(object.silhouette),
		gallery: getStringArray(object.gallery)
	};
};

export const parseShip = (rawMarkdown: string, sourceId: string = crypto.randomUUID()): ParseShipResult => {
	try {
		const parsed = matter(rawMarkdown);
		const data = parsed.data as Record<string, unknown>;

		const name = getString(data.name);
		if (!name) return { ok: false, error: { field: 'name', message: 'Ship name is required.' } };

		const universe = getString(data.universe);
		if (!universe) return { ok: false, error: { field: 'universe', message: 'Universe is required.' } };

		const lengthMeters = data.lengthMeters;
		if (typeof lengthMeters !== 'number' || Number.isNaN(lengthMeters) || lengthMeters <= 0) {
			return {
				ok: false,
				error: { field: 'lengthMeters', message: 'lengthMeters must be a positive number.' }
			};
		}

		const tags = getStringArray(data.tags);
		if (!tags || tags.length === 0) {
			return { ok: false, error: { field: 'tags', message: 'tags must be a non-empty list of strings.' } };
		}

		const images = parseImages(data.images);
		if (!images) {
			return {
				ok: false,
				error: {
					field: 'images',
					message: 'images.main is required and must be a string URL. Optional silhouette and gallery are supported.'
				}
			};
		}

		const links = parseLinks(data.links);
		if (data.links !== undefined && !links) {
			return { ok: false, error: { field: 'links', message: 'links must be a list of {label, url} entries.' } };
		}

		const id = getString(data.id) ?? toSlug(`${name}-${sourceId}`);
		const ship: Ship = {
			id,
			name,
			universe,
			lengthMeters,
			tags,
			images,
			links,
			descriptionMarkdown: parsed.content.trim()
		};

		return { ok: true, ship };
	} catch {
		return { ok: false, error: { message: 'Unable to parse markdown frontmatter.' } };
	}
};
