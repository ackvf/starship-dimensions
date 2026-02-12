import matter from 'gray-matter';
import type { Ship, ShipLink, ShipParseResult } from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const toStringArray = (value: unknown): string[] | null => {
	if (!Array.isArray(value)) {
		return null;
	}
	if (!value.every((entry) => typeof entry === 'string')) {
		return null;
	}
	return value;
};

const buildId = (value: string): string =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

export const parseShip = (source: string, fileName = 'uploaded-ship.md'): ShipParseResult => {
	const parsed = matter(source);

	if (!isRecord(parsed.data)) {
		return {
			ok: false,
			error: {
				id: fileName,
				message: 'Frontmatter is missing or not valid YAML.'
			}
		};
	}

	const { data, content } = parsed;

	if (typeof data.name !== 'string' || data.name.trim().length === 0) {
		return {
			ok: false,
			error: { id: fileName, message: 'Field "name" is required and must be a string.' }
		};
	}

	if (typeof data.universe !== 'string' || data.universe.trim().length === 0) {
		return {
			ok: false,
			error: { id: fileName, message: 'Field "universe" is required and must be a string.' }
		};
	}

	if (typeof data.lengthMeters !== 'number' || data.lengthMeters <= 0) {
		return {
			ok: false,
			error: { id: fileName, message: 'Field "lengthMeters" must be a positive number.' }
		};
	}

	const tags = toStringArray(data.tags);
	if (!tags) {
		return {
			ok: false,
			error: { id: fileName, message: 'Field "tags" must be an array of strings.' }
		};
	}

	let imagesMain = '';
	let imagesSilhouette: string | undefined;
	let imagesGallery: string[] | undefined;

	if (isRecord(data.images)) {
		if (typeof data.images.main === 'string') {
			imagesMain = data.images.main;
		}
		if (typeof data.images.silhouette === 'string') {
			imagesSilhouette = data.images.silhouette;
		}
		if (Array.isArray(data.images.gallery) && data.images.gallery.every((entry) => typeof entry === 'string')) {
			imagesGallery = data.images.gallery;
		}
	}

	const fallbackWidth = Math.max(Math.round(data.lengthMeters / 8), 160);
	const fallbackHeight = Math.max(Math.round(data.lengthMeters / 20), 90);
	const fallbackMain = `https://dummyimage.com/${fallbackWidth}x${fallbackHeight}/111827/e5e7eb&text=${encodeURIComponent(data.name)}`;
	const fallbackSilhouette = `https://dummyimage.com/${fallbackWidth}x${fallbackHeight}/0f172a/9ca3af&text=${encodeURIComponent(
		`${data.name} silhouette`
	)}`;

	const links = Array.isArray(data.links)
		? data.links
				.filter((entry): entry is ShipLink => isRecord(entry) && typeof entry.label === 'string' && typeof entry.url === 'string')
				.map((entry) => ({ label: entry.label, url: entry.url }))
		: undefined;

	const id = typeof data.id === 'string' && data.id.length > 0 ? data.id : buildId(data.name);

	const ship: Ship = {
		id,
		name: data.name,
		universe: data.universe,
		lengthMeters: data.lengthMeters,
		tags,
		images: {
			main: imagesMain || fallbackMain,
			silhouette: imagesSilhouette || fallbackSilhouette,
			gallery: imagesGallery
		},
		links,
		descriptionMarkdown: content.trim().length > 0 ? content.trim() : undefined
	};

	return { ok: true, ship };
};
