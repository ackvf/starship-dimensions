<script lang="ts">
	import { marked } from 'marked';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Slider } from '$lib/components/ui/slider';
	import { Textarea } from '$lib/components/ui/textarea';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import * as Dialog from '$lib/components/ui/dialog';
	import { loadBundledShips, parseUploadedShips } from '$lib/ships/loadShips';
	import type { Ship } from '$lib/ships/types';

	type ShipInstance = { id: string; shipId: string; x: number; y: number };
	type SilhouetteInstance = { id: string; shipId: string; x: number; y: number };

	const PIXELS_PER_METER = 0.18;
	const DEFAULT_SHIP_HEIGHT = 56;

	const bundled = loadBundledShips();
	let ships: Ship[] = bundled.ships;
	let loadErrors = bundled.errors.map((error) => `${error.id}: ${error.message}`);
	let uploadError = '';
	let selectedShipId: string | null = null;
	let detailsOpen = false;

	let shipInstances: ShipInstance[] = ships.map((ship, index) => ({
		id: `${ship.id}-instance`,
		shipId: ship.id,
		x: index * 420,
		y: (index % 2) * 180
	}));
	let silhouettes: SilhouetteInstance[] = [];

	let universeFilters: Record<string, boolean> = {};
	let tagFilters: Record<string, boolean> = {};
	for (const universe of new Set(ships.map((ship) => ship.universe))) universeFilters[universe] = true;
	for (const tag of new Set(ships.flatMap((ship) => ship.tags))) tagFilters[tag] = true;

	let minLength = Math.min(...ships.map((ship) => ship.lengthMeters));
	let maxLength = Math.max(...ships.map((ship) => ship.lengthMeters));
	let sizeRange: number[] = [minLength, maxLength];
	let uploadPreview = `---\nname: Example Cruiser\nuniverse: Exampleverse\nlengthMeters: 950\ntags: [cruiser, capital]\nimages:\n  main: https://dummyimage.com/1200x480/111827/e5e7eb.png&text=Example+Cruiser\n  silhouette: https://dummyimage.com/1200x480/020617/e5e7eb.png&text=Silhouette\n---\nDescription here`;

	let viewport: HTMLDivElement | null = null;
	let sceneWidth = 2400;
	let sceneHeight = 1200;
	let panX = 200;
	let panY = 260;
	let zoom = 0.65;
	let pointerMode: 'none' | 'pan' | 'ship' | 'silhouette' = 'none';
	let activePointerId = -1;
	let dragStartX = 0;
	let dragStartY = 0;
	let panStartX = 0;
	let panStartY = 0;
	let dragTargetId: string | null = null;

	const allUniverses = () => Object.keys(universeFilters);
	const allTags = () => Object.keys(tagFilters);

	const getShip = (shipId: string) => ships.find((ship) => ship.id === shipId);
	const getSelectedShip = () => ships.find((ship) => ship.id === selectedShipId) ?? null;

	const isMatch = (ship: Ship): boolean => {
		const universePass = universeFilters[ship.universe] ?? true;
		const tagPass = ship.tags.some((tag) => tagFilters[tag]);
		const sizePass = ship.lengthMeters >= sizeRange[0] && ship.lengthMeters <= sizeRange[1];
		return universePass && tagPass && sizePass;
	};

	const fitFleet = () => {
		if (!viewport || shipInstances.length === 0) return;
		const lengths = shipInstances.map((instance) => {
			const ship = getShip(instance.shipId);
			return {
				left: instance.x,
				right: instance.x + ((ship?.lengthMeters ?? 100) * PIXELS_PER_METER),
				top: instance.y,
				bottom: instance.y + DEFAULT_SHIP_HEIGHT
			};
		});
		const minX = Math.min(...lengths.map((item) => item.left));
		const maxX = Math.max(...lengths.map((item) => item.right));
		const minY = Math.min(...lengths.map((item) => item.top));
		const maxY = Math.max(...lengths.map((item) => item.bottom));
		const width = maxX - minX + 240;
		const height = maxY - minY + 240;
		zoom = Math.min(viewport.clientWidth / width, viewport.clientHeight / height, 1);
		panX = viewport.clientWidth / 2 - (minX + maxX) / 2 * zoom;
		panY = viewport.clientHeight / 2 - (minY + maxY) / 2 * zoom;
	};

	const resetView = () => {
		zoom = 0.65;
		panX = 200;
		panY = 260;
	};

	onMount(() => {
		fitFleet();
	});

	const spawnSilhouette = (shipId: string) => {
		const target = shipInstances.find((instance) => instance.shipId === shipId);
		if (!target) return;
		silhouettes = [
			...silhouettes,
			{ id: `${shipId}-sil-${crypto.randomUUID()}`, shipId, x: target.x + 40, y: target.y - 70 }
		];
	};

	const openDetails = (shipId: string) => {
		selectedShipId = shipId;
		detailsOpen = true;
	};

	const updateFromFiles = async (fileList: FileList | null) => {
		if (!fileList || fileList.length === 0) return;
		uploadError = '';
		const { ships: uploadedShips, errors } = await parseUploadedShips(Array.from(fileList));
		if (errors.length > 0) {
			uploadError = errors.map((error) => `${error.id}: ${error.message}`).join('\n');
		}
		if (uploadedShips.length === 0) return;

		for (const ship of uploadedShips) {
			if (!ships.find((existing) => existing.id === ship.id)) {
				ships = [...ships, ship];
				shipInstances = [...shipInstances, {
					id: `${ship.id}-instance-${shipInstances.length}`,
					shipId: ship.id,
					x: shipInstances.length * 260,
					y: 220 + (shipInstances.length % 3) * 120
				}];
				universeFilters[ship.universe] = true;
				for (const tag of ship.tags) tagFilters[tag] = true;
			}
		}
		minLength = Math.min(...ships.map((ship) => ship.lengthMeters));
		maxLength = Math.max(...ships.map((ship) => ship.lengthMeters));
		sizeRange = [Math.min(sizeRange[0], minLength), Math.max(sizeRange[1], maxLength)];
	};

	const startPan = (event: PointerEvent) => {
		if (event.button !== 0) return;
		pointerMode = 'pan';
		activePointerId = event.pointerId;
		dragStartX = event.clientX;
		dragStartY = event.clientY;
		panStartX = panX;
		panStartY = panY;
	};

	const startShipDrag = (event: PointerEvent, shipInstanceId: string) => {
		event.stopPropagation();
		pointerMode = 'ship';
		activePointerId = event.pointerId;
		dragTargetId = shipInstanceId;
		dragStartX = event.clientX;
		dragStartY = event.clientY;
	};

	const startSilhouetteDrag = (event: PointerEvent, silhouetteId: string) => {
		event.stopPropagation();
		pointerMode = 'silhouette';
		activePointerId = event.pointerId;
		dragTargetId = silhouetteId;
		dragStartX = event.clientX;
		dragStartY = event.clientY;
	};

	const handlePointerMove = (event: PointerEvent) => {
		if (activePointerId !== event.pointerId || pointerMode === 'none') return;
		const deltaX = (event.clientX - dragStartX) / zoom;
		const deltaY = (event.clientY - dragStartY) / zoom;
		if (pointerMode === 'pan') {
			panX = panStartX + (event.clientX - dragStartX);
			panY = panStartY + (event.clientY - dragStartY);
			return;
		}
		if (!dragTargetId) return;
		if (pointerMode === 'ship') {
			const target = shipInstances.find((instance) => instance.id === dragTargetId);
			if (!target) return;
			target.x += deltaX;
			target.y += deltaY;
			shipInstances = [...shipInstances];
			dragStartX = event.clientX;
			dragStartY = event.clientY;
		}
		if (pointerMode === 'silhouette') {
			const target = silhouettes.find((item) => item.id === dragTargetId);
			if (!target) return;
			target.x += deltaX;
			target.y += deltaY;
			silhouettes = [...silhouettes];
			dragStartX = event.clientX;
			dragStartY = event.clientY;
		}
	};

	const stopPointer = (event: PointerEvent) => {
		if (activePointerId !== event.pointerId) return;
		pointerMode = 'none';
		activePointerId = -1;
		dragTargetId = null;
	};

	const onWheel = (event: WheelEvent) => {
		event.preventDefault();
		const zoomFactor = event.deltaY < 0 ? 1.08 : 0.92;
		const nextZoom = Math.min(2.6, Math.max(0.2, zoom * zoomFactor));
		const rect = viewport?.getBoundingClientRect();
		if (!rect) {
			zoom = nextZoom;
			return;
		}
		const originX = event.clientX - rect.left;
		const originY = event.clientY - rect.top;
		const worldX = (originX - panX) / zoom;
		const worldY = (originY - panY) / zoom;
		zoom = nextZoom;
		panX = originX - worldX * zoom;
		panY = originY - worldY * zoom;
	};
</script>

<div class="mx-auto flex min-h-screen max-w-[1700px] flex-col gap-4 p-4 text-sm">
	<div class="grid gap-4 lg:grid-cols-[370px_1fr]">
		<Card class="h-fit bg-card/90 backdrop-blur">
			<CardHeader>
				<CardTitle>Starship Dimensions Console</CardTitle>
				<CardDescription>
					Filter ships, spawn silhouettes, and upload markdown ship definitions.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="space-y-2">
					<Label for="search">Search ship name</Label>
					<Input id="search" placeholder="type to focus list" />
				</div>

				<div class="space-y-2">
					<p class="font-semibold">Universes</p>
					{#each allUniverses() as universe (universe)}
						<div class="flex items-center gap-2">
							<Checkbox id={`uni-${universe}`} bind:checked={universeFilters[universe]} />
							<Label for={`uni-${universe}`}>{universe}</Label>
						</div>
					{/each}
				</div>

				<div class="space-y-2">
					<p class="font-semibold">Tags</p>
					<div class="flex flex-wrap gap-2">
						{#each allTags() as tag (tag)}
							<button
								type="button"
								onclick={() => (tagFilters[tag] = !tagFilters[tag])}
								class="rounded border px-2 py-1 text-xs"
							>
								<Badge variant={tagFilters[tag] ? 'default' : 'outline'}>{tag}</Badge>
							</button>
						{/each}
					</div>
				</div>

				<div class="space-y-3">
					<p class="font-semibold">Ship length range (m)</p>
					<Slider type="multiple" min={minLength} max={maxLength} step={1} bind:value={sizeRange} />
					<p class="text-muted-foreground">{Math.round(sizeRange[0])}m - {Math.round(sizeRange[1])}m</p>
				</div>

				<div class="flex flex-wrap gap-2">
					<Button onclick={fitFleet}>Fit fleet</Button>
					<Button variant="secondary" onclick={resetView}>Reset view</Button>
				</div>

				<div class="space-y-2">
					<Label for="ship-files">Upload ship markdown files</Label>
					<Input
						id="ship-files"
						type="file"
						accept=".md,.markdown,text/markdown"
						multiple
						onchange={(event) => updateFromFiles((event.currentTarget as HTMLInputElement).files)}
					/>
					{#if uploadError}
						<p class="whitespace-pre-wrap text-xs text-red-400">{uploadError}</p>
					{/if}
				</div>

				<details class="space-y-2">
					<summary class="cursor-pointer font-semibold">Ship file format quick reference</summary>
					<Textarea readonly rows={8} value={uploadPreview} class="text-xs" />
					<a class="text-xs underline" href="/SHIP_FILE_FORMAT.md" target="_blank">Open full Ship File Format docs</a>
				</details>
			</CardContent>
		</Card>

		<div class="flex flex-col gap-4">
			<Card>
				<CardHeader>
					<CardTitle>Fleet View</CardTitle>
					<CardDescription>Wheel to zoom, drag empty space to pan, drag ships/silhouettes to compare.</CardDescription>
				</CardHeader>
				<CardContent>
					<div
						bind:this={viewport}
						class="fleet h-[68vh] w-full overflow-hidden rounded border"
						role="application"
						onpointerdown={startPan}
						onpointermove={handlePointerMove}
						onpointerup={stopPointer}
						onpointercancel={stopPointer}
						onwheel={onWheel}
					>
						<div class="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"></div>
						<div
							class="absolute left-0 top-0"
							style={`width:${sceneWidth}px;height:${sceneHeight}px;transform: translate(${panX}px, ${panY}px) scale(${zoom}); transform-origin: 0 0;`}
						>
							{#each shipInstances as shipInstance (shipInstance.id)}
								{@const ship = getShip(shipInstance.shipId)}
								{#if ship}
									{@const match = isMatch(ship)}
									<div
										class="group absolute cursor-pointer text-left"
										role="button"
										tabindex="0"
										style={`left:${shipInstance.x}px; top:${shipInstance.y}px; width:${ship.lengthMeters * PIXELS_PER_METER}px;`}
										onpointerdown={(event) => startShipDrag(event, shipInstance.id)}
										onclick={() => openDetails(ship.id)}
										onkeydown={(event) => {
											if (event.key === "Enter" || event.key === " ") {
												event.preventDefault();
												openDetails(ship.id);
											}
										}}
									>
										<div class={`rounded border p-1 ${match ? 'border-amber-300 shadow-[0_0_18px_rgba(251,191,36,.35)]' : 'border-slate-700 opacity-30 grayscale'}`}>
											<img
												src={ship.images.main}
												alt={ship.name}
												class="h-14 w-full object-contain"
												draggable={false}
											/>
										</div>
										<div class="mt-1 flex items-center justify-between gap-1 text-xs">
											<span class="rounded bg-slate-900/80 px-1 py-0.5 text-white">{ship.name}</span>
											<Button
												type="button"
												size="sm"
												class="hidden h-6 px-2 group-hover:inline-flex"
												onclick={(event) => {
													event.stopPropagation();
													spawnSilhouette(ship.id);
												}}
											>
												+ silhouette
											</Button>
										</div>
									</div>
								{/if}
							{/each}

							{#each silhouettes as item (item.id)}
								{@const ship = getShip(item.shipId)}
								{#if ship}
									<button
										class="absolute cursor-move"
										type="button"
										style={`left:${item.x}px; top:${item.y}px; width:${ship.lengthMeters * PIXELS_PER_METER}px;`}
										onpointerdown={(event) => startSilhouetteDrag(event, item.id)}
									>
										<img
											src={ship.images.silhouette ?? ship.images.main}
											alt={`${ship.name} silhouette`}
											class="pointer-events-none h-10 w-full object-contain opacity-55 brightness-[1.6] contrast-150 grayscale"
											draggable={false}
										/>
									</button>
								{/if}
							{/each}
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Ships</CardTitle>
				</CardHeader>
				<CardContent>
					<ScrollArea class="h-56 rounded border p-2">
						<div class="space-y-2">
							{#each ships as ship (ship.id)}
								<button
									type="button"
									class={`w-full rounded border p-2 text-left ${isMatch(ship) ? 'border-amber-400' : 'border-slate-800 opacity-50'}`}
									onclick={() => openDetails(ship.id)}
								>
									<div class="flex items-center justify-between gap-2">
										<p class="font-medium">{ship.name}</p>
										<Badge variant="outline">{ship.lengthMeters}m</Badge>
									</div>
									<p class="text-xs text-muted-foreground">{ship.universe}</p>
								</button>
							{/each}
						</div>
					</ScrollArea>
				</CardContent>
			</Card>
		</div>
	</div>

	{#if loadErrors.length > 0}
		<Card class="border-red-500/50">
			<CardHeader>
				<CardTitle>Bundled data warnings</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="whitespace-pre-wrap text-xs text-red-400">{loadErrors.join('\n')}</p>
			</CardContent>
		</Card>
	{/if}
</div>

<Dialog.Root bind:open={detailsOpen}>
	<Dialog.Content class="sm:max-w-2xl">
		{#if getSelectedShip()}
			{@const ship = getSelectedShip()}
			{#if ship}
				<Dialog.Header>
					<Dialog.Title>{ship.name}</Dialog.Title>
					<Dialog.Description>{ship.universe} · {ship.lengthMeters} meters</Dialog.Description>
				</Dialog.Header>
				<div class="space-y-3">
					<img src={ship.images.main} alt={ship.name} class="h-44 w-full rounded border object-contain" />
					<div class="flex flex-wrap gap-1">
						{#each ship.tags as tag (tag)}
							<Badge variant="outline">{tag}</Badge>
						{/each}
					</div>
					{#if ship.links && ship.links.length > 0}
						<div class="space-y-1">
							<p class="text-xs font-semibold">Links</p>
							{#each ship.links as link (`${link.label}-${link.url}`)}
								<a href={link.url} target="_blank" class="block text-xs underline">{link.label}</a>
							{/each}
						</div>
					{/if}
					{#if ship.descriptionMarkdown}
						<div class="prose prose-invert max-w-none text-sm">{@html marked.parse(ship.descriptionMarkdown)}</div>
					{/if}
				</div>
			{/if}
		{/if}
	</Dialog.Content>
</Dialog.Root>

<style>
	.fleet {
		position: relative;
		cursor: grab;
		background-image:
			radial-gradient(circle at 20% 20%, rgb(255 255 255 / 0.35) 1px, transparent 1px),
			radial-gradient(circle at 72% 36%, rgb(255 255 255 / 0.3) 1px, transparent 1px),
			radial-gradient(circle at 42% 80%, rgb(255 255 255 / 0.4) 1px, transparent 1px),
			radial-gradient(circle at 84% 12%, rgb(255 255 255 / 0.2) 1px, transparent 1px),
			radial-gradient(circle at 12% 66%, rgb(255 255 255 / 0.25) 1px, transparent 1px);
		background-size: 280px 280px;
	}
</style>
