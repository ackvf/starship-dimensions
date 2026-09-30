import type { Ship, ShipLink, ShipParseResult } from './types';

type FrontmatterNode = Record<string, unknown> | unknown[];

type Context = {
	indent: number;
	node: FrontmatterNode;
	keyInParent?: string;
	parent?: Context;
};

const PLACEHOLDER_MAIN = 'https://dummyimage.com/420x120/111827/e5e7eb&text=No+Image';

const trimQuotes = (value: string): string => {
	if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
		return value.slice(1, -1);
	}
	return value;
};

const parseScalar = (value: string): unknown => {
	const cleaned = trimQuotes(value.trim());
	if (cleaned === 'true') return true;
	if (cleaned === 'false') return false;
	if (cleaned !== '' && !Number.isNaN(Number(cleaned))) return Number(cleaned);
	if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
		const inner = cleaned.slice(1, -1).trim();
		if (!inner) return [];
		return inner.split(',').map((entry) => trimQuotes(entry.trim())).filter(Boolean);
	}
	return cleaned;
};

const splitFrontmatter = (input: string): { frontmatter: string; body: string } | null => {
	if (!input.trimStart().startsWith('---')) return null;
	const lines = input.split(/\r?\n/);
	if (lines[0].trim() !== '---') return null;
	let closingIndex = -1;
	for (let i = 1; i < lines.length; i += 1) {
		if (lines[i].trim() === '---') {
			closingIndex = i;
			break;
		}
	}
	if (closingIndex === -1) return null;

	return {
		frontmatter: lines.slice(1, closingIndex).join('\n'),
		body: lines.slice(closingIndex + 1).join('\n').trim()
	};
};

const ensureObject = (value: unknown): Record<string, unknown> => {
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	return {};
};

const parseFrontmatter = (raw: string): Record<string, unknown> => {
	const root: Record<string, unknown> = {};
	const stack: Context[] = [{ indent: -1, node: root }];
	const lines = raw.split(/\r?\n/);

	for (let index = 0; index < lines.length; index += 1) {
		const original = lines[index];
		if (!original.trim() || original.trim().startsWith('#')) continue;
		const indent = original.match(/^\s*/)?.[0].length ?? 0;
		const line = original.trim();

		while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
			stack.pop();
		}

		const parent = stack[stack.length - 1];
		if (Array.isArray(parent.node) && !line.startsWith('- ')) {
			const replacement: Record<string, unknown> = {};
			if (!parent.parent || !parent.keyInParent) {
				throw new Error(`Invalid frontmatter structure near line ${index + 1}`);
			}
			(parent.parent.node as Record<string, unknown>)[parent.keyInParent] = replacement;
			parent.node = replacement;
		}

		if (line.startsWith('- ')) {
			if (!Array.isArray(parent.node)) {
				const replacement: unknown[] = [];
				if (parent.parent && parent.keyInParent) {
					(parent.parent.node as Record<string, unknown>)[parent.keyInParent] = replacement;
					parent.node = replacement;
				} else {
					throw new Error(`Top-level arrays are not supported (line ${index + 1})`);
				}
			}
			const payload = line.slice(2).trim();
			if (payload.includes(':')) {
				const splitIndex = payload.indexOf(':');
				const key = payload.slice(0, splitIndex).trim();
				const value = payload.slice(splitIndex + 1).trim();
				const item: Record<string, unknown> = { [key]: parseScalar(value) };
				(parent.node as unknown[]).push(item);
				stack.push({ indent, node: item, parent, keyInParent: String((parent.node as unknown[]).length - 1) });
			} else {
				(parent.node as unknown[]).push(parseScalar(payload));
			}
			continue;
		}

		const divider = line.indexOf(':');
		if (divider === -1) {
			throw new Error(`Invalid frontmatter key/value syntax on line ${index + 1}`);
		}
		const key = line.slice(0, divider).trim();
		const value = line.slice(divider + 1).trim();

		if (value === '') {
			(parent.node as Record<string, unknown>)[key] = {};
			stack.push({ indent, node: (parent.node as Record<string, unknown>)[key] as FrontmatterNode, keyInParent: key, parent });
		} else {
			(parent.node as Record<string, unknown>)[key] = parseScalar(value);
		}
	}

	return root;
};

const toShip = (id: string, data: Record<string, unknown>, descriptionMarkdown: string): Ship => {
	const images = ensureObject(data.images);
	const linksRaw = Array.isArray(data.links) ? data.links : [];
	const links: ShipLink[] = linksRaw
		.map((item) => ensureObject(item))
		.filter((item) => typeof item.label === 'string' && typeof item.url === 'string')
		.map((item) => ({ label: String(item.label), url: String(item.url) }));

	const mainImage = typeof images.main === 'string' ? images.main : PLACEHOLDER_MAIN;
	const gallery = Array.isArray(images.gallery)
		? images.gallery.filter((image): image is string => typeof image === 'string')
		: undefined;

	return {
		id,
		name: String(data.name ?? ''),
		universe: String(data.universe ?? ''),
		lengthMeters: Number(data.lengthMeters ?? NaN),
		heightMeters: typeof data.heightMeters === 'number' ? data.heightMeters : undefined,
		tags: Array.isArray(data.tags)
			? data.tags.filter((tag): tag is string => typeof tag === 'string')
			: [],
		images: {
			main: mainImage,
			gallery
		},
		links: links.length > 0 ? links : undefined,
		descriptionMarkdown
	};
};

const validateShip = (ship: Ship): string | null => {
	if (!ship.name) return 'Ship name is required.';
	if (!ship.universe) return 'Ship universe is required.';
	if (!Number.isFinite(ship.lengthMeters) || ship.lengthMeters <= 0) return 'lengthMeters must be a positive number.';
	return null;
};

export const parseShipMarkdown = (id: string, source: string): ShipParseResult => {
	const sections = splitFrontmatter(source);
	if (!sections) {
		return { success: false, error: { message: 'Ship file must include YAML frontmatter wrapped in --- markers.' } };
	}

	try {
		const parsed = parseFrontmatter(sections.frontmatter);
		const ship = toShip(id, parsed, sections.body);
		const validation = validateShip(ship);
		if (validation) {
			return { success: false, error: { message: validation } };
		}
		return { success: true, ship };
	} catch (error) {
		return {
			success: false,
			error: { message: error instanceof Error ? error.message : 'Failed to parse ship file.' }
		};
	}
};
