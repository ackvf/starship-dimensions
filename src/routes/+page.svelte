<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as ScrollArea from '$lib/components/ui/scroll-area';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { loadBundledShips, loadUploadedShips } from '$lib/ships/loadShips';
	import { renderMarkdown } from '$lib/ships/renderMarkdown';
	import type { Ship, ShipParseError } from '$lib/ships/types';

	type FleetShip = Ship & { x: number; y: number };
	type Silhouette = { id: string; shipId: string; x: number; y: number };
	type DraggingState =
		| { type: 'pan'; pointerId: number; startX: number; startY: number; startPanX: number; startPanY: number }
		| { type: 'ship'; pointerId: number; shipId: string; startX: number; startY: number; startShipX: number; startShipY: number }
		| {
				type: 'silhouette';
				pointerId: number;
				silhouetteId: string;
				startX: number;
				startY: number;
				startSilhouetteX: number;
				startSilhouetteY: number;
		  };

	const metersToWorldPx = 0.08;
	const minShipWidthPx = 56;

	const bundled = loadBundledShips();
	let ships = $state<FleetShip[]>(
		bundled.ships.map((ship, index) => ({
			...ship,
			x: 120,
			y: 120 + index * 220
		}))
	);
	let parseErrors = $state<ShipParseError[]>([...bundled.errors]);
	let silhouettes = $state<Silhouette[]>([]);
	let selectedShipId = $state<string | null>(null);
	let isDialogOpen = $state(false);

	let pan = $state({ x: 0, y: 0 });
	let zoom = $state(1);
	let dragging = $state<DraggingState | null>(null);

	const universes = $derived(Array.from(new Set(ships.map((ship) => ship.universe))).sort());
	const tags = $derived(Array.from(new Set(ships.flatMap((ship) => ship.tags))).sort());
	const minLength = $derived(Math.min(...ships.map((ship) => ship.lengthMeters), 0));
	const maxLength = $derived(Math.max(...ships.map((ship) => ship.lengthMeters), 1000));
	let selectedUniverses = $state<string[]>([]);
	let selectedTags = $state<string[]>([]);
	let nameFilter = $state('');
	let minLengthFilter = $state(0);
	let maxLengthFilter = $state(1000);

	$effect(() => {
		const max = maxLength;
		if (maxLengthFilter > max) {
			maxLengthFilter = max;
		}
		if (minLengthFilter > maxLengthFilter) {
			minLengthFilter = Math.max(minLength, maxLengthFilter - 10);
		}
	});

	const isMatch = (ship: Ship): boolean => {
		const universeMatch = selectedUniverses.length === 0 || selectedUniverses.includes(ship.universe);
		const tagsMatch = selectedTags.length === 0 || ship.tags.some((tag) => selectedTags.includes(tag));
		const textMatch = nameFilter.trim().length === 0 || ship.name.toLowerCase().includes(nameFilter.toLowerCase());
		const sizeMatch = ship.lengthMeters >= minLengthFilter && ship.lengthMeters <= maxLengthFilter;
		return universeMatch && tagsMatch && textMatch && sizeMatch;
	};

	const selectedShip = $derived(ships.find((ship) => ship.id === selectedShipId) ?? null);

	const getShipWidth = (ship: Ship): number => Math.max(minShipWidthPx, ship.lengthMeters * metersToWorldPx);

	const startPan = (event: PointerEvent) => {
		if ((event.target as HTMLElement).dataset.draggable === 'true') {
			return;
		}
		dragging = {
			type: 'pan',
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			startPanX: pan.x,
			startPanY: pan.y
		};
	};

	const onWheel = (event: WheelEvent) => {
		event.preventDefault();
		const delta = event.deltaY > 0 ? -0.12 : 0.12;
		zoom = Math.min(2.5, Math.max(0.25, zoom + delta));
	};

	const onPointerMove = (event: PointerEvent) => {
		const current = dragging;
		if (!current || current.pointerId !== event.pointerId) {
			return;
		}

		if (current.type === 'pan') {
			pan = {
				x: current.startPanX + (event.clientX - current.startX),
				y: current.startPanY + (event.clientY - current.startY)
			};
			return;
		}

		const deltaX = (event.clientX - current.startX) / zoom;
		const deltaY = (event.clientY - current.startY) / zoom;

		if (current.type === 'ship') {
			ships = ships.map((ship) =>
				ship.id === current.shipId
					? {
							...ship,
							x: current.startShipX + deltaX,
							y: current.startShipY + deltaY
						}
					: ship
			);
		}

		if (current.type === 'silhouette') {
			silhouettes = silhouettes.map((silhouette) =>
				silhouette.id === current.silhouetteId
					? {
							...silhouette,
							x: current.startSilhouetteX + deltaX,
							y: current.startSilhouetteY + deltaY
						}
					: silhouette
			);
		}
	};

	const onPointerUp = () => {
		dragging = null;
	};

	const startShipDrag = (event: PointerEvent, ship: FleetShip) => {
		event.stopPropagation();
		dragging = {
			type: 'ship',
			pointerId: event.pointerId,
			shipId: ship.id,
			startX: event.clientX,
			startY: event.clientY,
			startShipX: ship.x,
			startShipY: ship.y
		};
	};

	const startSilhouetteDrag = (event: PointerEvent, silhouette: Silhouette) => {
		event.stopPropagation();
		dragging = {
			type: 'silhouette',
			pointerId: event.pointerId,
			silhouetteId: silhouette.id,
			startX: event.clientX,
			startY: event.clientY,
			startSilhouetteX: silhouette.x,
			startSilhouetteY: silhouette.y
		};
	};

	const addSilhouette = (ship: FleetShip) => {
		silhouettes = [
			...silhouettes,
			{
				id: `${ship.id}-${crypto.randomUUID()}`,
				shipId: ship.id,
				x: ship.x + getShipWidth(ship) + 24,
				y: ship.y
			}
		];
	};

	const fitView = () => {
		pan = { x: 24, y: 24 };
		zoom = 0.8;
	};

	const resetView = () => {
		pan = { x: 0, y: 0 };
		zoom = 1;
	};

	const toggleInFilter = (current: string[], item: string): string[] =>
		current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item];

	const openDetails = (shipId: string) => {
		selectedShipId = shipId;
		isDialogOpen = true;
	};

	const handleUpload = async (event: Event) => {
		const input = event.currentTarget as HTMLInputElement;
		const fileList = input.files ? Array.from(input.files) : [];
		if (fileList.length === 0) {
			return;
		}
		const { ships: uploaded, errors } = await loadUploadedShips(fileList);
		parseErrors = [...parseErrors, ...errors];
		ships = [
			...ships,
			...uploaded.map((ship, index) => ({
				...ship,
				x: 160 + index * 80,
				y: 720 + index * 200
			}))
		];
		input.value = '';
	};
</script>

<div class="min-h-screen bg-slate-950 text-slate-50">
	<div class="mx-auto flex max-w-[1700px] flex-col gap-4 p-4 lg:flex-row">
		<Card.Root class="w-full lg:w-96">
			<Card.Header>
				<Card.Title class="text-xl">Starship Dimensions</Card.Title>
				<Card.Description>Filter by universe, tags, or size. Upload your own ships and compare at scale.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-5">
				<div class="space-y-2">
					<Label for="name-filter">Search by name</Label>
					<Input id="name-filter" bind:value={nameFilter} placeholder="e.g. Enterprise" />
				</div>
				<div class="space-y-2">
					<Label>Length range (meters)</Label>
					<div class="grid grid-cols-2 gap-2 text-xs text-slate-300">
						<div>
							<Label for="min-length">Min</Label>
							<Input id="min-length" type="number" bind:value={minLengthFilter} min={minLength} max={maxLengthFilter} />
						</div>
						<div>
							<Label for="max-length">Max</Label>
							<Input id="max-length" type="number" bind:value={maxLengthFilter} min={minLengthFilter} max={maxLength} />
						</div>
					</div>
				</div>
				<Separator />
				<div class="space-y-2">
					<p class="text-sm font-semibold">Universes</p>
					<div class="grid grid-cols-2 gap-2">
							{#each universes as universe (universe)}
								<Button
									type="button"
									variant={selectedUniverses.includes(universe) ? 'default' : 'outline'}
									size="sm"
									class="justify-start"
									onclick={() => (selectedUniverses = toggleInFilter(selectedUniverses, universe))}
								>
									{universe}
								</Button>
							{/each}
					</div>
				</div>
				<div class="space-y-2">
					<p class="text-sm font-semibold">Tags</p>
					<div class="flex flex-wrap gap-2">
						{#each tags as tag (tag)}
							<button
								type="button"
								onclick={() => (selectedTags = toggleInFilter(selectedTags, tag))}
								class={`rounded border px-2 py-1 text-xs ${selectedTags.includes(tag) ? 'border-primary bg-primary/20' : 'border-border bg-slate-900'}`}
							>
								#{tag}
							</button>
						{/each}
					</div>
				</div>
				<Separator />
				<div class="space-y-2">
					<Label for="ship-upload">Upload ship markdown files</Label>
					<Input id="ship-upload" type="file" accept=".md,.markdown,text/markdown" multiple onchange={handleUpload} />
					<p class="text-xs text-slate-400">
						Use YAML frontmatter and markdown body.
						<Button variant="link" class="h-auto p-0" onclick={() => window.open('/SHIP_FORMAT.md', '_blank', 'noopener,noreferrer')}>Ship File Format</Button>
					</p>
				</div>
				<div class="flex gap-2">
					<Button onclick={fitView}>Fit Fleet</Button>
					<Button variant="secondary" onclick={resetView}>Reset View</Button>
				</div>
			</Card.Content>
		</Card.Root>

		<div class="flex min-h-[72vh] flex-1 flex-col gap-4">
			<Card.Root class="flex-1">
				<Card.Header>
					<Card.Title>Fleet View</Card.Title>
					<Card.Description>Drag ships and silhouettes. Scroll to zoom, drag background to pan.</Card.Description>
				</Card.Header>
				<Card.Content>
					<div
						class="relative h-[70vh] overflow-hidden rounded-md border border-border bg-[radial-gradient(circle_at_20%_20%,rgba(148,163,184,0.25),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.2),transparent_35%),linear-gradient(180deg,#020617,#030712_45%,#020617)]"
						onpointerdown={startPan}
						onpointermove={onPointerMove}
						onpointerup={onPointerUp}
						onpointerleave={onPointerUp}
						onwheel={onWheel}
						role="application"
					>
						<div class="absolute inset-0" style={`transform: translate(${pan.x}px, ${pan.y}px) scale(${zoom}); transform-origin: 0 0;`}>
							{#each ships as ship (ship.id)}
								{@const shipMatches = isMatch(ship)}
								<div
									class={`group absolute transition-opacity ${shipMatches ? 'opacity-100' : 'opacity-30'}`}
									style={`left: ${ship.x}px; top: ${ship.y}px; width: ${getShipWidth(ship)}px;`}
								>
									<button
										type="button"
										class="w-full"
										onclick={() => openDetails(ship.id)}
										onpointerdown={(event) => startShipDrag(event, ship)}
										data-draggable="true"
									>
										<img src={ship.images.main} alt={ship.name} class="pointer-events-none h-auto w-full rounded-sm border border-slate-700" />
									</button>
									<div class="mt-1 flex items-center justify-between gap-2">
										<p class="truncate text-xs">{ship.name}</p>
										<Button size="sm" class="h-6 px-2 text-[10px] opacity-0 transition-opacity group-hover:opacity-100" onclick={() => addSilhouette(ship)}>
											+ silhouette
										</Button>
									</div>
								</div>
							{/each}

							{#each silhouettes as silhouette (silhouette.id)}
								{@const sourceShip = ships.find((ship) => ship.id === silhouette.shipId)}
								{#if sourceShip}
									<div
										class="absolute opacity-60"
										style={`left:${silhouette.x}px; top:${silhouette.y}px; width:${getShipWidth(sourceShip)}px;`}
									>
										<button
											type="button"
											onpointerdown={(event) => startSilhouetteDrag(event, silhouette)}
											data-draggable="true"
										>
											<img src={sourceShip.images.silhouette ?? sourceShip.images.main} alt={`${sourceShip.name} silhouette`} class="w-full border border-dashed border-slate-500" />
										</button>
									</div>
								{/if}
							{/each}
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Ships</Card.Title>
				</Card.Header>
				<Card.Content>
					<ScrollArea.Root class="h-56 pr-3">
						<div class="space-y-2">
							{#each ships as ship (ship.id)}
								<div class={`rounded border p-2 ${isMatch(ship) ? 'border-primary/50 bg-slate-900' : 'border-border bg-slate-950/40'}`}>
									<div class="flex items-center justify-between gap-2">
										<div>
											<p class="text-sm font-semibold">{ship.name}</p>
											<p class="text-xs text-slate-400">{ship.universe} · {ship.lengthMeters.toLocaleString()}m</p>
										</div>
										<Button size="sm" variant="outline" onclick={() => openDetails(ship.id)}>Details</Button>
									</div>
									<div class="mt-1 flex flex-wrap gap-1">
										{#each ship.tags as tag (`${ship.id}-${tag}`)}
											<Badge variant="secondary">#{tag}</Badge>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</ScrollArea.Root>
				</Card.Content>
			</Card.Root>
		</div>
	</div>

	{#if parseErrors.length > 0}
		<div class="mx-auto mt-2 max-w-[1700px] px-4 pb-8">
			<Card.Root class="border-destructive/60">
				<Card.Header>
					<Card.Title class="text-destructive">Parse errors</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-2 text-sm">
					{#each parseErrors as error (`${error.id}-${error.message}`)}
						<p><strong>{error.id}:</strong> {error.message}</p>
					{/each}
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
</div>

<Dialog.Root bind:open={isDialogOpen}>
	<Dialog.Content class="max-h-[85vh] max-w-3xl overflow-hidden">
		{#if selectedShip}
			<Dialog.Header>
				<Dialog.Title>{selectedShip.name}</Dialog.Title>
				<Dialog.Description>
					{selectedShip.universe} · {selectedShip.lengthMeters.toLocaleString()} meters long
				</Dialog.Description>
			</Dialog.Header>
			<div class="space-y-4">
				<img src={selectedShip.images.main} alt={selectedShip.name} class="h-auto w-full rounded border border-border" />
				{#if selectedShip.images.gallery && selectedShip.images.gallery.length > 0}
					<div class="grid grid-cols-2 gap-2">
						{#each selectedShip.images.gallery as image (image)}
							<img src={image} alt={`${selectedShip.name} gallery`} class="rounded border border-border" />
						{/each}
					</div>
				{/if}
				<div class="flex flex-wrap gap-2">
					{#each selectedShip.tags as tag (tag)}
						<Badge>#{tag}</Badge>
					{/each}
				</div>
				{#if selectedShip.links && selectedShip.links.length > 0}
					<div class="space-y-1 text-sm">
						<p class="font-semibold">External links</p>
						{#each selectedShip.links as link (link.url)}
							<Button variant="link" class="h-auto p-0 text-left" onclick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}>{link.label}</Button>
						{/each}
					</div>
				{/if}
				{#if selectedShip.descriptionMarkdown}
					<Separator />
					<div class="markdown-body text-sm">
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html renderMarkdown(selectedShip.descriptionMarkdown)}
					</div>
				{/if}
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<style>
	:global(.markdown-body h1, .markdown-body h2, .markdown-body h3) {
		margin-top: 0.5rem;
		margin-bottom: 0.35rem;
		font-weight: 700;
	}

	:global(.markdown-body p) {
		margin-bottom: 0.4rem;
	}

	:global(.markdown-body a) {
		text-decoration: underline;
	}
</style>
