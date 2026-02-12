<script lang="ts">
	import { marked } from 'marked';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { loadBundledShips, loadUploadedShips, type ShipLoadError } from '$lib/ships/loadShips';
	import type { Ship } from '$lib/ships/types';

	type ShipSprite = { id: string; ship: Ship; x: number; y: number };
	type Silhouette = { id: string; shipId: string; image: string; x: number; y: number };
	type DragState = { kind: 'ship' | 'silhouette' | 'pan'; id?: string; startX: number; startY: number } | null;

	const metersToPixels = 0.25;
	const baseShipHeight = 56;
	const bundled = loadBundledShips();

	let uploadedShips = $state<Ship[]>([]);
	let errors = $state<ShipLoadError[]>(bundled.errors);
	let selectedShipId = $state<string | null>(null);

	let sprites = $state<ShipSprite[]>(
		bundled.ships.map((ship, index) => ({
			id: `sprite-${ship.id}`,
			ship,
			x: index * 360,
			y: Math.sin(index * 0.7) * 50
		}))
	);
	let silhouettes = $state<Silhouette[]>([]);

	let scale = $state(0.65);
	let offsetX = $state(240);
	let offsetY = $state(280);
	let dragState = $state<DragState>(null);

	let search = $state('');
	let minLength = $state(0);
	let maxLength = $state(5000);
	let selectedUniverses = $state<string[]>([]);
	let selectedTags = $state<string[]>([]);
	let isDragOver = $state(false);

	const allShips = $derived([...bundled.ships, ...uploadedShips]);
	const universes = $derived(Array.from(new Set(allShips.map((ship) => ship.universe))).sort());
	const tags = $derived(Array.from(new Set(allShips.flatMap((ship) => ship.tags))).sort());

	const filteredIds = $derived.by(() => {
		const query = search.trim().toLowerCase();
		return new Set(
			allShips
				.filter((ship) => ship.lengthMeters >= minLength && ship.lengthMeters <= maxLength)
				.filter((ship) => selectedUniverses.length === 0 || selectedUniverses.includes(ship.universe))
				.filter((ship) => selectedTags.length === 0 || selectedTags.every((tag) => ship.tags.includes(tag)))
				.filter((ship) => {
					if (!query) return true;
					return (
						ship.name.toLowerCase().includes(query) ||
						ship.universe.toLowerCase().includes(query) ||
						ship.tags.some((tag) => tag.toLowerCase().includes(query))
					);
				})
				.map((ship) => ship.id)
		);
	});

	const selectedShip = $derived(allShips.find((ship) => ship.id === selectedShipId) ?? null);

	const getSprite = (id: string) => sprites.find((sprite) => sprite.id === id);
	const getSilhouette = (id: string) => silhouettes.find((silhouette) => silhouette.id === id);
	const isHighlighted = (shipId: string) => filteredIds.has(shipId);
	const shipWidth = (ship: Ship) => Math.max(36, ship.lengthMeters * metersToPixels);

	const appendUploadedShips = async (files: FileList | File[]) => {
		const loaded = await loadUploadedShips(files);
		uploadedShips = [...uploadedShips, ...loaded.ships];
		errors = [...errors, ...loaded.errors];
		const newSprites = loaded.ships.map((ship, index) => ({
			id: `sprite-upload-${ship.id}-${crypto.randomUUID().slice(0, 6)}`,
			ship,
			x: (sprites.length + index) * 320,
			y: 120 + index * 40
		}));
		sprites = [...sprites, ...newSprites];
	};

	const onFileChange = async (event: Event) => {
		const input = event.currentTarget as HTMLInputElement;
		if (!input.files) return;
		await appendUploadedShips(input.files);
		input.value = '';
	};

	const onDrop = async (event: DragEvent) => {
		event.preventDefault();
		isDragOver = false;
		if (event.dataTransfer?.files) {
			await appendUploadedShips(event.dataTransfer.files);
		}
	};

	const worldDelta = (dx: number, dy: number) => ({ dx: dx / scale, dy: dy / scale });

	const beginPan = (event: PointerEvent) => {
		dragState = { kind: 'pan', startX: event.clientX, startY: event.clientY };
	};

	const beginDragShip = (event: PointerEvent, id: string) => {
		event.stopPropagation();
		dragState = { kind: 'ship', id, startX: event.clientX, startY: event.clientY };
	};

	const beginDragSilhouette = (event: PointerEvent, id: string) => {
		event.stopPropagation();
		dragState = { kind: 'silhouette', id, startX: event.clientX, startY: event.clientY };
	};

	const movePointer = (event: PointerEvent) => {
		if (!dragState) return;
		const dx = event.clientX - dragState.startX;
		const dy = event.clientY - dragState.startY;
		dragState = { ...dragState, startX: event.clientX, startY: event.clientY };
		if (dragState.kind === 'pan') {
			offsetX += dx;
			offsetY += dy;
			return;
		}
		const delta = worldDelta(dx, dy);
		if (dragState.kind === 'ship' && dragState.id) {
			const sprite = getSprite(dragState.id);
			if (sprite) {
				sprite.x += delta.dx;
				sprite.y += delta.dy;
				sprites = [...sprites];
			}
		}
		if (dragState.kind === 'silhouette' && dragState.id) {
			const silhouette = getSilhouette(dragState.id);
			if (silhouette) {
				silhouette.x += delta.dx;
				silhouette.y += delta.dy;
				silhouettes = [...silhouettes];
			}
		}
	};

	const endPointer = () => {
		dragState = null;
	};

	const onWheel = (event: WheelEvent) => {
		event.preventDefault();
		const delta = event.deltaY > 0 ? -0.08 : 0.08;
		scale = Math.min(2.5, Math.max(0.25, scale + delta));
	};

	const addSilhouette = (sprite: ShipSprite) => {
		const image = sprite.ship.images.silhouette ?? sprite.ship.images.main;
		silhouettes = [
			...silhouettes,
			{
				id: `sil-${sprite.ship.id}-${crypto.randomUUID().slice(0, 6)}`,
				shipId: sprite.ship.id,
				image,
				x: sprite.x + 24,
				y: sprite.y + baseShipHeight + 36
			}
		];
	};

	const setUniverse = (value: string, checked: boolean) => {
		selectedUniverses = checked
			? [...selectedUniverses, value]
			: selectedUniverses.filter((universe) => universe !== value);
	};

	const setTag = (value: string, checked: boolean) => {
		selectedTags = checked ? [...selectedTags, value] : selectedTags.filter((tag) => tag !== value);
	};

	const clearFilters = () => {
		search = '';
		selectedUniverses = [];
		selectedTags = [];
		minLength = 0;
		maxLength = 5000;
	};

	const resetView = () => {
		scale = 0.65;
		offsetX = 240;
		offsetY = 280;
	};

	const fitShips = () => {
		offsetX = 120;
		offsetY = 220;
		scale = 0.45;
	};
</script>

<div class="min-h-screen bg-[radial-gradient(circle_at_20%_10%,#1e293b_0,#020617_45%,#000_100%)] p-4 text-slate-100 lg:p-6">
	<div class="mx-auto grid max-w-[1500px] gap-4 lg:grid-cols-[320px_1fr]">
		<Card.Root class="h-fit border-slate-700/70 bg-slate-950/70 backdrop-blur">
			<Card.Header>
				<Card.Title>Fleet Controls</Card.Title>
				<Card.Description>Filter, upload, and navigate your starship comparison fleet.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="space-y-2">
					<label class="text-sm" for="search-input">Search ships</label>
					<Input id="search-input" bind:value={search} placeholder="name, universe, tag" />
				</div>
				<div class="grid grid-cols-2 gap-2">
					<div class="space-y-2">
						<label class="text-sm" for="min-length">Min meters</label>
						<Input id="min-length" type="number" bind:value={minLength} min={0} />
					</div>
					<div class="space-y-2">
						<label class="text-sm" for="max-length">Max meters</label>
						<Input id="max-length" type="number" bind:value={maxLength} min={1} />
					</div>
				</div>
				<div class="space-y-2">
					<p class="text-sm font-medium">Universes</p>
					{#each universes as universe (universe)}
						<label class="flex items-center gap-2 text-sm">
							<Checkbox
								checked={selectedUniverses.includes(universe)}
								onCheckedChange={(checked) => setUniverse(universe, checked === true)}
							/>
							{universe}
						</label>
					{/each}
				</div>
				<div class="space-y-2">
					<p class="text-sm font-medium">Tags (must include all)</p>
					<div class="grid grid-cols-2 gap-2">
						{#each tags as tag (tag)}
							<label class="flex items-center gap-2 text-xs">
								<Checkbox
									checked={selectedTags.includes(tag)}
									onCheckedChange={(checked) => setTag(tag, checked === true)}
								/>
								{tag}
							</label>
						{/each}
					</div>
				</div>
				<div class="space-y-2">
					<label class="text-sm font-medium" for="upload-input">Upload ship markdown files</label>
					<div
						role="region"
						aria-label="Drop zone for ship markdown files"
						class={`rounded-md border border-dashed p-3 text-xs ${isDragOver ? 'border-primary bg-primary/20' : 'border-slate-600'}`}
						ondragover={(event) => {
							event.preventDefault();
							isDragOver = true;
						}}
						ondragleave={() => (isDragOver = false)}
						ondrop={onDrop}
					>
						Drop .md files here or pick below. Uploaded ships are in-memory for this session.
					</div>
					<Input id="upload-input" type="file" accept=".md,.markdown" multiple onchange={onFileChange} />
				</div>
				<div class="flex flex-wrap gap-2">
					<Button variant="secondary" onclick={resetView}>Reset View</Button>
					<Button variant="secondary" onclick={fitShips}>Fit Fleet</Button>
					<Button variant="outline" onclick={clearFilters}>Clear Filters</Button>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-slate-700/70 bg-slate-950/40">
			<Card.Header>
				<Card.Title>Fleet View</Card.Title>
				<Card.Description>
					Scroll to zoom, drag background to pan, drag ships and silhouettes to compare scale.
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div
					role="application"
					aria-label="Fleet interaction canvas"
					class="relative h-[70vh] overflow-hidden rounded-lg border border-slate-700 bg-slate-900/40"
					onpointerdown={beginPan}
					onpointermove={movePointer}
					onpointerup={endPointer}
					onpointercancel={endPointer}
					onwheel={onWheel}
				>
					<div
						class="absolute inset-0"
						style={`transform: translate(${offsetX}px, ${offsetY}px) scale(${scale}); transform-origin: top left;`}
					>
						{#each sprites as sprite (sprite.id)}
							<div
								role="presentation"
								class={`group absolute cursor-grab ${isHighlighted(sprite.ship.id) ? 'opacity-100' : 'opacity-25'}`}
								style={`left:${sprite.x}px; top:${sprite.y}px; width:${shipWidth(sprite.ship)}px;`}
								onpointerdown={(event) => beginDragShip(event, sprite.id)}
							>
								<img
									src={sprite.ship.images.main}
									alt={sprite.ship.name}
									draggable={false}
									class="pointer-events-none h-auto w-full select-none rounded-sm border border-slate-700/70"
								/>
								<Button
									class="absolute -top-8 left-0 hidden h-6 text-xs group-hover:inline-flex"
									size="sm"
									onclick={(event) => {
										event.stopPropagation();
										addSilhouette(sprite);
									}}
								>
									Add silhouette
								</Button>
								<button
									type="button"
									class="mt-1 text-left text-[11px] underline"
									onclick={(event) => {
										event.stopPropagation();
										selectedShipId = sprite.ship.id;
									}}
								>
									{sprite.ship.name} · {Math.round(sprite.ship.lengthMeters)}m
								</button>
							</div>
						{/each}

						{#each silhouettes as silhouette (silhouette.id)}
							{@const sourceShip = allShips.find((ship) => ship.id === silhouette.shipId)}
							{#if sourceShip}
								<div
									role="presentation"
									class="absolute cursor-grab opacity-80"
									style={`left:${silhouette.x}px; top:${silhouette.y}px; width:${shipWidth(sourceShip)}px;`}
									onpointerdown={(event) => beginDragSilhouette(event, silhouette.id)}
								>
									<img
										src={silhouette.image}
										alt={`${sourceShip.name} silhouette`}
										draggable={false}
										class="pointer-events-none h-auto w-full select-none rounded border border-primary/30"
									/>
								</div>
							{/if}
						{/each}
					</div>
				</div>

				<div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
					{#each allShips as ship (ship.id)}
						<button
							type="button"
							class={`rounded border p-3 text-left transition ${isHighlighted(ship.id) ? 'border-primary/80 bg-primary/10' : 'border-slate-700/70 bg-slate-900/60'}`}
							onclick={() => (selectedShipId = ship.id)}
						>
							<p class="text-sm font-semibold">{ship.name}</p>
							<p class="text-xs text-slate-400">{ship.universe}</p>
							<div class="mt-2 flex flex-wrap gap-1">
								{#each ship.tags as tag (`${ship.id}-${tag}`)}
									<Badge variant="secondary" class="text-[10px]">{tag}</Badge>
								{/each}
							</div>
						</button>
					{/each}
				</div>

				{#if errors.length > 0}
					<div class="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs">
						<p class="mb-2 font-semibold">Ship file errors</p>
						<ul class="space-y-1">
							{#each errors as error (`${error.source}-${error.field ?? 'none'}-${error.message}`)}
								<li>{error.source}: {error.field ?? 'parse'} — {error.message}</li>
							{/each}
						</ul>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>

<Dialog.Root open={selectedShip !== null} onOpenChange={(open) => !open && (selectedShipId = null)}>
	<Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
		{#if selectedShip}
			<Dialog.Header>
				<Dialog.Title>{selectedShip.name}</Dialog.Title>
				<Dialog.Description>{selectedShip.universe}</Dialog.Description>
			</Dialog.Header>
			<div class="space-y-3">
				<img src={selectedShip.images.main} alt={selectedShip.name} class="w-full rounded-md border" />
				<p class="text-sm">Length: {selectedShip.lengthMeters.toLocaleString()} meters</p>
				<div class="flex flex-wrap gap-1">
					{#each selectedShip.tags as tag (`${selectedShip.id}-${tag}`)}
						<Badge variant="secondary">{tag}</Badge>
					{/each}
				</div>
				{#if selectedShip.links && selectedShip.links.length > 0}
					<ul class="list-disc space-y-1 pl-5 text-sm">
						{#each selectedShip.links as link (`${selectedShip.id}-${link.url}`)}
							<li><button type="button" class="underline" onclick={() => window.open(link.url, "_blank", "noopener,noreferrer")}>{link.label}</button></li>
						{/each}
					</ul>
				{/if}
				{#if selectedShip.images.gallery && selectedShip.images.gallery.length > 0}
					<div class="grid gap-2 sm:grid-cols-2">
						{#each selectedShip.images.gallery as image (`${selectedShip.id}-${image}`)}
							<img src={image} alt={`${selectedShip.name} gallery`} class="w-full rounded border" />
						{/each}
					</div>
				{/if}
				{#if selectedShip.descriptionMarkdown}
					<article class="prose prose-invert max-w-none text-sm">
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html marked.parse(selectedShip.descriptionMarkdown)}
					</article>
				{/if}
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
