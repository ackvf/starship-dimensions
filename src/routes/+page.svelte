<script lang="ts">
	import { onMount } from 'svelte';
	import { marked } from 'marked';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Separator } from '$lib/components/ui/separator';
	import { loadBundledShips, mergeShipUploads } from '$lib/ships/loadShips';
	import type { Ship, ShipParseError } from '$lib/ships/types';

	type PositionedShip = Ship & { x: number; y: number };
	type Silhouette = { id: string; shipId: string; x: number; y: number };
	type SizeFilter = 'all' | 'small' | 'medium' | 'large';

	let ships = $state<PositionedShip[]>([]);
	let parseErrors = $state<ShipParseError[]>([]);
	let uploadedFiles = $state<Array<{ name: string; content: string }>>([]);
	let loading = $state(true);

	let universeFilter = $state('all');
	let tagFilter = $state('');
	let sizeFilter = $state<SizeFilter>('all');

	let selectedShip = $state<PositionedShip | null>(null);
	let detailsOpen = $state(false);

	let silhouettes = $state<Silhouette[]>([]);
	let canvasElement: HTMLDivElement | undefined;
	let viewportElement: HTMLDivElement | undefined;

	let viewportX = $state(220);
	let viewportY = $state(220);
	let zoom = $state(0.22);

	let activePanPointer: number | null = null;
	let panStartX = 0;
	let panStartY = 0;
	let panOriginX = 0;
	let panOriginY = 0;

	const SHIP_HEIGHT = 48;
	const WORLD_GAP = 400;
	const SIZE_SCALE = 0.22;

	const uniqueUniverses = $derived(['all', ...new Set(ships.map((ship) => ship.universe))]);
	const uniqueTags = $derived([...new Set(ships.flatMap((ship) => ship.tags))]);

	const filteredShips = $derived(
		ships.filter((ship) => {
			const universeMatch = universeFilter === 'all' || ship.universe === universeFilter;
			const tagMatch = !tagFilter || ship.tags.some((tag) => tag.toLowerCase().includes(tagFilter.toLowerCase()));
			const sizeMatch =
				sizeFilter === 'all'
					? true
					: sizeFilter === 'small'
						? ship.lengthMeters < 300
						: sizeFilter === 'medium'
							? ship.lengthMeters >= 300 && ship.lengthMeters < 1000
							: ship.lengthMeters >= 1000;
			return universeMatch && tagMatch && sizeMatch;
		})
	);

	const isHighlighted = (ship: PositionedShip) => filteredShips.some((candidate) => candidate.id === ship.id);

	const measuredShipWidth = (ship: Ship) => Math.max(120, ship.lengthMeters * SIZE_SCALE);

	const resetView = () => {
		viewportX = 220;
		viewportY = 220;
		zoom = 0.22;
	};

	const fitAllShips = () => {
		if (!viewportElement || ships.length === 0) {
			return;
		}
		const viewportRect = viewportElement.getBoundingClientRect();
		const minX = Math.min(...ships.map((ship) => ship.x));
		const maxX = Math.max(...ships.map((ship) => ship.x + measuredShipWidth(ship)));
		const minY = Math.min(...ships.map((ship) => ship.y));
		const maxY = Math.max(...ships.map((ship) => ship.y + SHIP_HEIGHT));
		const worldWidth = maxX - minX + 240;
		const worldHeight = maxY - minY + 240;
		zoom = Math.max(0.08, Math.min(1, Math.min(viewportRect.width / worldWidth, viewportRect.height / worldHeight)));
		viewportX = (viewportRect.width - (minX + maxX) * zoom) / 2;
		viewportY = (viewportRect.height - (minY + maxY) * zoom) / 2;
	};

	const hydrateShips = async () => {
		loading = true;
		const bundled = await loadBundledShips();
		const merged = mergeShipUploads(bundled.ships, uploadedFiles);
		parseErrors = [...bundled.errors, ...merged.errors];
		ships = merged.ships.map((ship, index) => ({ ...ship, x: index * WORLD_GAP, y: index % 2 === 0 ? 0 : 180 }));
		if (ships.length > 0) {
			fitAllShips();
		}
		loading = false;
	};

	onMount(() => {
		hydrateShips();
	});

	const onCanvasWheel = (event: WheelEvent) => {
		event.preventDefault();
		if (!viewportElement) return;
		const rect = viewportElement.getBoundingClientRect();
		const pointerX = event.clientX - rect.left;
		const pointerY = event.clientY - rect.top;
		const worldX = (pointerX - viewportX) / zoom;
		const worldY = (pointerY - viewportY) / zoom;
		const factor = event.deltaY < 0 ? 1.1 : 0.9;
		const nextZoom = Math.min(1.5, Math.max(0.08, zoom * factor));
		zoom = nextZoom;
		viewportX = pointerX - worldX * zoom;
		viewportY = pointerY - worldY * zoom;
	};

	const beginPan = (event: PointerEvent) => {
		if ((event.target as HTMLElement).dataset.draggable === 'item') {
			return;
		}
		activePanPointer = event.pointerId;
		panStartX = event.clientX;
		panStartY = event.clientY;
		panOriginX = viewportX;
		panOriginY = viewportY;
		canvasElement?.setPointerCapture(event.pointerId);
	};

	const onPanMove = (event: PointerEvent) => {
		if (activePanPointer !== event.pointerId) return;
		viewportX = panOriginX + (event.clientX - panStartX);
		viewportY = panOriginY + (event.clientY - panStartY);
	};

	const endPan = (event: PointerEvent) => {
		if (activePanPointer !== event.pointerId) return;
		activePanPointer = null;
		canvasElement?.releasePointerCapture(event.pointerId);
	};

	const spawnSilhouette = (ship: PositionedShip) => {
		silhouettes = [
			...silhouettes,
			{ id: `${ship.id}-${crypto.randomUUID()}`, shipId: ship.id, x: ship.x + 40, y: ship.y + 70 }
		];
	};

	const parseUpload = async (event: Event) => {
		const input = event.currentTarget as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		const newUploads = await Promise.all(
			files.map(async (file) => ({
				name: file.name,
				content: await file.text()
			}))
		);
		uploadedFiles = [...uploadedFiles, ...newUploads];
		hydrateShips();
		input.value = '';
	};

	const openDetails = (ship: PositionedShip) => {
		selectedShip = ship;
		detailsOpen = true;
	};

	let draggedEntity = $state<{ id: string; kind: 'ship' | 'silhouette'; startX: number; startY: number } | null>(null);

	const startDrag = (event: PointerEvent, id: string, kind: 'ship' | 'silhouette') => {
		event.stopPropagation();
		draggedEntity = {
			id,
			kind,
			startX: event.clientX,
			startY: event.clientY
		};
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	};

	const onDragMove = (event: PointerEvent) => {
		if (!draggedEntity) return;
		const dx = (event.clientX - draggedEntity.startX) / zoom;
		const dy = (event.clientY - draggedEntity.startY) / zoom;
		draggedEntity.startX = event.clientX;
		draggedEntity.startY = event.clientY;

		if (draggedEntity.kind === 'ship') {
			const draggedId = draggedEntity.id;
			ships = ships.map((ship) => (ship.id === draggedId ? { ...ship, x: ship.x + dx, y: ship.y + dy } : ship));
			return;
		}

		silhouettes = silhouettes.map((silhouette) =>
			silhouette.id === draggedEntity?.id
				? { ...silhouette, x: silhouette.x + dx, y: silhouette.y + dy }
				: silhouette
		);
	};

	const endDrag = () => {
		draggedEntity = null;
	};
</script>

<div class="min-h-screen bg-slate-950 text-slate-100">
	<div class="mx-auto flex max-w-[1600px] flex-col gap-4 p-4">
		<Card class="border-slate-700 bg-slate-900/80">
			<CardHeader>
				<CardTitle>Starship Dimensions</CardTitle>
				<CardDescription>Compare ships by scale, clone silhouettes, and inspect metadata.</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="grid gap-3 md:grid-cols-4">
					<div class="space-y-1">
						<p class="text-xs text-slate-400">Universe</p>
						<div class="flex flex-wrap gap-2">
							{#each uniqueUniverses as universe (universe)}
								<Button
									variant={universeFilter === universe ? 'default' : 'outline'}
									size="sm"
									onclick={() => (universeFilter = universe)}
								>{universe}</Button
								>
							{/each}
						</div>
					</div>

					<div class="space-y-1">
						<p class="text-xs text-slate-400">Tag filter</p>
						<Input placeholder="e.g. capital" bind:value={tagFilter} />
						<div class="mt-1 flex flex-wrap gap-1">
							{#each uniqueTags as tag (tag)}
								<Badge class="cursor-pointer" onclick={() => (tagFilter = tag)}>{tag}</Badge>
							{/each}
						</div>
					</div>

					<div class="space-y-1">
						<p class="text-xs text-slate-400">Size filter</p>
						<div class="flex gap-2">
							{#each ['all', 'small', 'medium', 'large'] as size (size)}
								<Button
									variant={sizeFilter === size ? 'default' : 'outline'}
									size="sm"
									onclick={() => (sizeFilter = size as SizeFilter)}>{size}</Button
								>
							{/each}
						</div>
					</div>

					<div class="space-y-2">
						<p class="text-xs text-slate-400">Upload ship markdown</p>
						<Input type="file" accept=".md,.markdown,text/markdown" multiple onchange={parseUpload} />
						<div class="flex gap-2">
							<Button size="sm" variant="outline" onclick={resetView}>Reset view</Button>
							<Button size="sm" onclick={fitAllShips}>Fit all</Button>
						</div>
					</div>
				</div>
				<p class="text-sm text-slate-300">
					Need help authoring ships?
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a class="underline" href="/ship-file-format.md" target="_blank" rel="noreferrer">Ship File Format</a>
				</p>
			</CardContent>
		</Card>

		{#if parseErrors.length > 0}
			<Card class="border-red-500/60 bg-red-900/20">
				<CardHeader>
					<CardTitle class="text-red-200">Ship parsing errors</CardTitle>
				</CardHeader>
				<CardContent>
					<ul class="space-y-2 text-sm text-red-100">
						{#each parseErrors as error (`${error.id}-${error.message}`)}
							<li>
								<strong>{error.message}</strong>
								<ul class="ml-4 list-disc">
									{#each error.issues as issue (`${error.id}-${issue}`)}
										<li>{issue}</li>
									{/each}
								</ul>
							</li>
						{/each}
					</ul>
				</CardContent>
			</Card>
		{/if}

		<div
			bind:this={viewportElement}
			class="relative h-[65vh] overflow-hidden rounded-lg border border-slate-700 bg-[radial-gradient(circle_at_20%_20%,#334155_0,#020617_50%)]"
		>
			<div
				bind:this={canvasElement}
				role="application"
				aria-label="Fleet comparison canvas"
				class="h-full w-full touch-none"
				onwheel={onCanvasWheel}
				onpointerdown={beginPan}
				onpointermove={(event) => {
					onPanMove(event);
					onDragMove(event);
				}}
				onpointerup={(event) => {
					endPan(event);
					endDrag();
				}}
				onpointercancel={(event) => {
					endPan(event);
					endDrag();
				}}
			>
				<div
					class="absolute left-0 top-0 origin-top-left"
					style={`transform: translate(${viewportX}px, ${viewportY}px) scale(${zoom}); width: 4000px; height: 2200px;`}
				>
					{#if loading}
						<p class="text-slate-200">Loading ships...</p>
					{/if}
					{#each ships as ship (ship.id)}
						<div
							role="group"
							aria-label={`Draggable ship ${ship.name}`}
							class={`group absolute rounded border p-1 transition ${
								isHighlighted(ship)
									? 'border-cyan-300/70 bg-cyan-400/20 opacity-100'
									: 'border-slate-600/60 bg-slate-700/25 opacity-35'
							}`}
							style={`left:${ship.x}px; top:${ship.y}px; width:${measuredShipWidth(ship)}px; height:${SHIP_HEIGHT}px;`}
							onpointerdown={(event) => startDrag(event, ship.id, 'ship')}
							data-draggable="item"
						>
							<button type="button" class="h-full w-full" onclick={() => openDetails(ship)} aria-label={`Open details for ${ship.name}`}>
								<img
									class="h-full w-full rounded object-cover"
									src={ship.images.main}
									alt={ship.name}
									loading="lazy"
								/>
							</button>
							<button
								type="button"
								class="absolute -right-3 -top-3 rounded-full border border-cyan-300 bg-slate-900 px-2 py-0.5 text-[10px] opacity-0 transition group-hover:opacity-100"
								onclick={() => spawnSilhouette(ship)}
							>
								+ silhouette
							</button>
							<div class="pointer-events-none absolute -bottom-6 left-0 text-[11px] text-slate-300">
								{ship.name} ({ship.lengthMeters}m)
							</div>
						</div>
					{/each}

					{#each silhouettes as silhouette (silhouette.id)}
						{@const parentShip = ships.find((ship) => ship.id === silhouette.shipId)}
						{#if parentShip}
							<div
								role="group"
								aria-label={`Draggable silhouette for ${parentShip.name}`}
								class="absolute rounded border border-violet-300/80 bg-violet-400/15 p-1"
								style={`left:${silhouette.x}px; top:${silhouette.y}px; width:${measuredShipWidth(parentShip)}px; height:${SHIP_HEIGHT}px;`}
								onpointerdown={(event) => startDrag(event, silhouette.id, 'silhouette')}
								data-draggable="item"
							>
								<img
									class="h-full w-full rounded object-cover opacity-60 grayscale"
									src={parentShip.images.silhouette ?? parentShip.images.main}
									alt={`${parentShip.name} silhouette`}
								/>
							</div>
						{/if}
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>

<Dialog bind:open={detailsOpen}>
	<DialogContent class="sm:max-w-3xl">
		{#if selectedShip}
			<DialogHeader>
				<DialogTitle>{selectedShip.name}</DialogTitle>
				<DialogDescription>
					{selectedShip.universe} · {selectedShip.lengthMeters}m · {selectedShip.tags.join(', ')}
				</DialogDescription>
			</DialogHeader>

			<div class="grid gap-4 md:grid-cols-[1.2fr_1fr]">
				<div class="space-y-2">
					<img class="w-full rounded border" src={selectedShip.images.main} alt={selectedShip.name} />
					{#if selectedShip.images.gallery?.length}
						<div class="grid grid-cols-2 gap-2">
							{#each selectedShip.images.gallery as image (image)}
								<img class="rounded border" src={image} alt={`${selectedShip.name} gallery image`} />
							{/each}
						</div>
					{/if}
				</div>

				<div class="space-y-3">
					<div class="flex flex-wrap gap-2">
						{#each selectedShip.tags as tag (tag)}
							<Badge>{tag}</Badge>
						{/each}
					</div>
					<Separator />
					{#if selectedShip.links?.length}
						<div class="space-y-2">
							<p class="text-sm font-semibold">External links</p>
							<ul class="space-y-1 text-sm">
								{#each selectedShip.links as link (link.url)}
									<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
									<li><a class="underline" href={link.url} target="_blank" rel="noreferrer">{link.label}</a></li>
								{/each}
							</ul>
						</div>
					{/if}
					<ScrollArea class="h-56 rounded border p-3">
						<div class="prose prose-sm dark:prose-invert max-w-none">
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							{@html marked.parse(selectedShip.descriptionMarkdown ?? '')}
						</div>
					</ScrollArea>
				</div>
			</div>
		{/if}
	</DialogContent>
</Dialog>
