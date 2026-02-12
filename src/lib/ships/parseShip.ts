import matter from 'gray-matter';
import type { Ship, ShipParseError } from './types';

const URL_REGEX = /^https?:\/\//i;

const createId = (value: string): string =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');

const isStringArray = (value: unknown): value is string[] =>
	Array.isArray(value) && value.every((entry) => typeof entry === 'string' && entry.trim().length > 0);

const validateUrl = (value: unknown, fieldName: string): string | ShipParseError => {
	if (typeof value !== 'string' || value.trim().length === 0) {
		return { id: fieldName, message: `${fieldName} must be a non-empty string URL.` };
	}

	const normalized = value.trim();
	if (!URL_REGEX.test(normalized) && !normalized.startsWith('/')) {
		return { id: fieldName, message: `${fieldName} must be an absolute http(s) URL or /static path.` };
	}

	return normalized;
};

export const parseShip = (source: string, sourceName = 'uploaded-ship.md'): { ship?: Ship; error?: ShipParseError } => {
	try {
		const parsed = matter(source);
		const data = parsed.data as Record<string, unknown>;

		if (typeof data.name !== 'string' || data.name.trim().length === 0) {
			return { error: { id: sourceName, message: 'Ship frontmatter requires a non-empty name.' } };
		}
		if (typeof data.universe !== 'string' || data.universe.trim().length === 0) {
			return { error: { id: sourceName, message: 'Ship frontmatter requires a non-empty universe.' } };
		}
		if (typeof data.lengthMeters !== 'number' || Number.isNaN(data.lengthMeters) || data.lengthMeters <= 0) {
			return { error: { id: sourceName, message: 'Ship frontmatter requires a positive number lengthMeters.' } };
		}
		if (!isStringArray(data.tags)) {
			return { error: { id: sourceName, message: 'Ship frontmatter requires tags as a non-empty string array.' } };
		}

		const images = (data.images ?? {}) as Record<string, unknown>;
		const mainImage = validateUrl(images.main, 'images.main');
		if (typeof mainImage !== 'string') {
			return { error: { id: sourceName, message: mainImage.message } };
		}

		const silhouetteImage = images.silhouette
			? validateUrl(images.silhouette, 'images.silhouette')
			: undefined;
		if (silhouetteImage && typeof silhouetteImage !== 'string') {
			return { error: { id: sourceName, message: silhouetteImage.message } };
		}

		if (images.gallery && !isStringArray(images.gallery)) {
			return {
				error: { id: sourceName, message: 'images.gallery must be an array of URL strings when provided.' }
			};
		}

		const galleryImages = (images.gallery ?? []) as string[];
		for (const image of galleryImages) {
			if (!URL_REGEX.test(image) && !image.startsWith('/')) {
				return {
					error: { id: sourceName, message: 'Every images.gallery URL must be absolute http(s) URL or /static path.' }
				};
			}
		}

		const links = Array.isArray(data.links)
			? data.links
					.map((entry) => entry as Record<string, unknown>)
					.filter((entry) => typeof entry.label === 'string' && typeof entry.url === 'string')
					.map((entry) => ({ label: String(entry.label), url: String(entry.url) }))
			: undefined;

		const ship: Ship = {
			id: createId(`${data.universe}-${data.name}`),
			name: data.name.trim(),
			universe: data.universe.trim(),
			lengthMeters: data.lengthMeters,
			tags: data.tags.map((tag) => tag.trim()),
			images: {
				main: mainImage,
				silhouette: typeof silhouetteImage === 'string' ? silhouetteImage : undefined,
				gallery: galleryImages.length > 0 ? galleryImages : undefined
			},
			links,
			descriptionMarkdown: parsed.content.trim() ? parsed.content.trim() : undefined
		};

		return { ship };
	} catch (error) {
		return {
			error: {
				id: sourceName,
				message: error instanceof Error ? error.message : 'Unable to parse ship file.'
			}
		};
	}
};
