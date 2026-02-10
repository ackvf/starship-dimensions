// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ClassValue = any;

const flattenClassValue = (value: ClassValue): string[] => {
	if (!value) return [];
	if (typeof value === 'string' || typeof value === 'number') return String(value).split(/\s+/).filter(Boolean);
	if (Array.isArray(value)) return value.flatMap(flattenClassValue);
	if (typeof value === 'object') {
		return Object.entries(value)
			.filter(([, enabled]) => Boolean(enabled))
			.map(([key]) => key);
	}
	return [];
};

export function cn(...inputs: ClassValue[]) {
	const seen = new Set<string>();
	for (const token of inputs.flatMap(flattenClassValue)) {
		seen.add(token);
	}
	return [...seen].join(' ');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
