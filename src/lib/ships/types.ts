export type ShipImageSet = {
	main: string;
	silhouette?: string;
	gallery?: string[];
};

export type ShipLink = {
	label: string;
	url: string;
};

export type Ship = {
	id: string;
	name: string;
	universe: string;
	lengthMeters: number;
	tags: string[];
	images: ShipImageSet;
	links?: ShipLink[];
	descriptionMarkdown?: string;
};

export type ShipParseError = {
	id: string;
	message: string;
};
