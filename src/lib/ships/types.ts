export type ShipImageSet = {
	main: string;
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
	heightMeters?: number;
	fleetSegment?: string;
};

export type ShipParseError = {
	message: string;
	line?: number;
};

export type ShipParseResult =
	| {
			success: true;
			ship: Ship;
	  }
	| {
			success: false;
			error: ShipParseError;
	  };
