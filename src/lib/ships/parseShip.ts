import matter from 'gray-matter';
import type { Ship, ShipLink, ShipParseResult } from './types';

const asNonEmptyString = (value: unknown, field: string, issues: string[]): string | undefined => {
	if (typeof value !== 'string' || value.trim().length === 0) {
		issues.push(`${field} must be a non-empty string`);
		return undefined;
	}
	return value.trim();
};

const asStringArray = (value: unknown, field: string, issues: string[]): string[] => {
	if (!Array.isArray(value)) {
		issues.push(`${field} must be an array of strings`);
		return [];
	}

	const entries = value
		.filter((entry): entry is string => typeof entry === 'string')
		.map((entry) => entry.trim())
		.filter(Boolean);

	if (entries.length !== value.length) {
		issues.push(`${field} can only include non-empty strings`);
	}

	return entries;
};

const parseLinks = (value: unknown, issues: string[]): ShipLink[] | undefined => {
	if (value == null) {
		return undefined;
	}
	if (!Array.isArray(value)) {
		issues.push('links must be an array of { label, url } objects');
		return undefined;
	}
	return value
		.map((entry, index) => {
			if (typeof entry !== 'object' || entry == null) {
				issues.push(`links[${index}] must be an object`);
				return undefined;
			}
			const label = asNonEmptyString((entry as Record<string, unknown>).label, `links[${index}].label`, issues);
			const url = asNonEmptyString((entry as Record<string, unknown>).url, `links[${index}].url`, issues);
			if (!label || !url) {
				return undefined;
			}
			return { label, url };
		})
		.filter((entry): entry is ShipLink => Boolean(entry));
};

export const parseShip = (source: string, idHint: string): ShipParseResult => {
	const issues: string[] = [];
	const { data, content } = matter(source);

	const name = asNonEmptyString(data.name, 'name', issues);
	const universe = asNonEmptyString(data.universe, 'universe', issues);
	const lengthMeters = Number(data.lengthMeters);
	if (!Number.isFinite(lengthMeters) || lengthMeters <= 0) {
		issues.push('lengthMeters must be a positive number');
	}

	const tags = asStringArray(data.tags, 'tags', issues);

	const images = (data.images as Record<string, unknown> | undefined) ?? {};
	const main = typeof images.main === 'string' && images.main.trim() ? images.main.trim() : '';
	if (!main) {
		issues.push('images.main must be a non-empty string URL');
	}

	const silhouette =
		typeof images.silhouette === 'string' && images.silhouette.trim() ? images.silhouette.trim() : undefined;
	const gallery = images.gallery ? asStringArray(images.gallery, 'images.gallery', issues) : undefined;
	const links = parseLinks(data.links, issues);

	const id =
		typeof data.id === 'string' && data.id.trim()
			? data.id.trim()
			: idHint.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

	const heightMeters =
		typeof data.heightMeters === 'number' && Number.isFinite(data.heightMeters) && data.heightMeters > 0
			? data.heightMeters
			: undefined;

	if (!name || !universe || issues.length > 0) {
		return {
			ok: false,
			error: {
				id,
				message: `Could not parse ship file: ${idHint}`,
				issues
			}
		};
	}

	const ship: Ship = {
		id,
		name,
		universe,
		lengthMeters,
		tags,
		images: { main, silhouette, gallery },
		links,
		descriptionMarkdown: content.trim(),
		heightMeters
	};

	return { ok: true, ship };
};
