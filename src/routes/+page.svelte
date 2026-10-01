<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';
	import {
		centerBoundsAtScale,
		computeMinScale,
		getFleetBounds,
		getImageVisualHeight as getFleetImageVisualHeight,
		getImageVisualWidth as getFleetImageVisualWidth,
		isSmallFramedShip,
		getVisualHeight as getFleetVisualHeight,
		getVisualWidth as getFleetVisualWidth,
		layoutFleet
	} from '$lib/fleet';
	import type { FleetItem, ShipDuplicate } from '$lib/fleet';
	import {
		DropdownMenu,
		DropdownMenuCheckboxGroup,
		DropdownMenuCheckboxItem,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import { loadBundledShips, parseUploadedShipFile } from '$lib/ships';
	import type { Ship } from '$lib/ships';
	import { MAX_SCALE, MIN_SCALE } from '$lib';

	let ships: FleetItem[] = [];
	let duplicates: ShipDuplicate[] = [];
	let selectedShip: Ship | null = null;
	let loaderErrors: string[] = [];
	let uploadErrors: string[] = [];
	let uploadSuccess = '';
	let uploadSuccessTimeout: ReturnType<typeof setTimeout> | null = null;

	let scale = 0.25;
	let panX = 160;
	let panY = 220;
	const metersToPixels = 1;
	const gridCellMeters = 100;
	let fleetContainer: HTMLElement | null = null;
	let minScale = MIN_SCALE;

	const attachFleetContainer = (node: HTMLElement) => {
		fleetContainer = node;
		return () => {
			if (fleetContainer === node) {
				fleetContainer = null;
			}
		};
	};

	let dragState:
		| {
				type: 'ship';
				id: string;
				startClientX: number;
				startClientY: number;
				originX: number;
				originY: number;
		  }
		| {
				type: 'duplicate';
				id: string;
				deltaX: number;
				deltaY: number;
		  }
		| null = null;

	let panning = false;
	let panPointerId: number | null = null;
	let panStartX = 0;
	let panStartY = 0;
	let panOriginX = 0;
	let panOriginY = 0;

	let universeFilter: string[] = [];
	let previewUniverseFilter: string = '';
	let tagFilter: string[] = [];
	let previewTagFilter: string = '';
	let minLength = 0;
	let maxLength = 5000;
	let activeOnly = false;

	const hasActiveFilters = () =>
		universeFilter.length > 0 || tagFilter.length > 0 || minLength > 0 || maxLength < 5000;

	const getUniverseLabel = () => {
		if (!universeFilter.length) return 'All universes';
		if (universeFilter.length === 1) return universeFilter[0];
		return `${universeFilter.length} universes`;
	};
	const getTagLabel = () => {
		if (!tagFilter.length) return 'All tags';
		if (tagFilter.length === 1) return tagFilter[0];
		return `${tagFilter.length} tags`;
	};

	$: universes = [...new Set(ships.map((item) => item.ship.universe))].sort();
	$: tags = [...new Set(ships.flatMap((item) => item.ship.tags))].sort();

	$: filteredShips = ships.filter((item) => {
		const activeUniverseFilter = previewUniverseFilter || universeFilter;
		const activeTagFilter = previewTagFilter || tagFilter;
		const ship = item.ship;
		const universeMatches = activeUniverseFilter.length === 0 || activeUniverseFilter.includes(ship.universe);
		const tagMatches = activeTagFilter.length === 0 || ship.tags.some((tag) => activeTagFilter.includes(tag));
		const lengthMatches = ship.lengthMeters >= minLength && ship.lengthMeters <= maxLength;
		return universeMatches && tagMatches && lengthMatches;
	});

	$: filteredIds = new Set(filteredShips.map((item) => item.id));

	const getVisualWidth = (ship: Ship): number => getFleetVisualWidth(ship, metersToPixels);
	const getVisualHeight = (ship: Ship): number => getFleetVisualHeight(ship, metersToPixels);
	const getImageVisualWidth = (ship: Ship): number => getFleetImageVisualWidth(ship, metersToPixels);
	const getImageVisualHeight = (ship: Ship): number => getFleetImageVisualHeight(ship, metersToPixels);
	const getCurrentFleetBounds = () => getFleetBounds(ships, metersToPixels);

	const updateMinScale = async () => {
		await tick();
		if (!fleetContainer) return;
		const bounds = getCurrentFleetBounds();
		if (!bounds) {
			minScale = MIN_SCALE;
			return;
		}
		minScale = computeMinScale(bounds, fleetContainer.clientWidth, fleetContainer.clientHeight);
	};

	const fitFleet = () => {
		if (!ships.length) return;
		if (!fleetContainer) return;
		const bounds = getCurrentFleetBounds();
		if (!bounds) return;

		const worldPadding = 100;
		const paddedBounds = {
			minX: bounds.minX - worldPadding,
			maxX: bounds.maxX + worldPadding,
			minY: bounds.minY - worldPadding,
			maxY: bounds.maxY + worldPadding
		};

		const screenPadding = 24;
		const containerWidth = Math.max(1, fleetContainer.clientWidth - screenPadding * 2);
		const containerHeight = Math.max(1, fleetContainer.clientHeight - screenPadding * 2);
		const fleetWidth = Math.max(1, paddedBounds.maxX - paddedBounds.minX);
		const fleetHeight = Math.max(1, paddedBounds.maxY - paddedBounds.minY);
		const fitScale = Math.min(containerWidth / fleetWidth, containerHeight / fleetHeight);
		const targetScale = Math.min(MAX_SCALE, Math.max(minScale, fitScale));
		const centered = centerBoundsAtScale(
			paddedBounds,
			targetScale,
			fleetContainer.clientWidth,
			fleetContainer.clientHeight
		);
		scale = centered.scale;
		panX = centered.panX;
		panY = centered.panY;
	};

	const startDrag = (event: PointerEvent, type: 'ship' | 'duplicate', id: string, x: number, y: number) => {
		event.stopPropagation();
		event.preventDefault();
		if (type === 'ship') {
			dragState = {
				type: 'ship',
				id,
				startClientX: event.clientX,
				startClientY: event.clientY,
				originX: x,
				originY: y
			};
			return;
		}
		dragState = {
			type,
			id,
			deltaX: event.clientX / scale - x,
			deltaY: event.clientY / scale - y
		};
	};

	const updateDrag = (event: PointerEvent) => {
		if (!dragState) return;

		if (dragState.type === 'ship') {
			const moved = Math.hypot(
				event.clientX - dragState.startClientX,
				event.clientY - dragState.startClientY
			);
			if (moved < 6) {
				return;
			}
			const created = addDuplicate(dragState.id, {
				x: dragState.originX,
				y: dragState.originY
			});
			if (!created) {
				dragState = null;
				return;
			}
			dragState = {
				type: 'duplicate',
				id: created,
				deltaX: event.clientX / scale - dragState.originX,
				deltaY: event.clientY / scale - dragState.originY
			};
		}

		if (!dragState || dragState.type !== 'duplicate') return;
		const worldX = event.clientX / scale - dragState.deltaX;
		const worldY = event.clientY / scale - dragState.deltaY;
		duplicates = duplicates.map((item) =>
			item.id === dragState?.id
				? {
						...item,
						x: worldX,
						y: worldY
				  }
				: item
		);
	};

	const endDrag = () => {
		dragState = null;
	};

	const addDuplicate = (shipId: string, position?: { x: number; y: number }) => {
		const base = ships.find((item) => item.id === shipId);
		if (!base) return null;
		const id = `${shipId}-dup-${crypto.randomUUID()}`;
		const spawnX = position?.x ?? base.x + 70;
		const spawnY = position?.y ?? base.y + 70;
		duplicates = [...duplicates, { id, shipId, x: spawnX, y: spawnY }];
		return id;
	};

	const removeDuplicate = (duplicateId: string) => {
		duplicates = duplicates.filter((item) => item.id !== duplicateId);
	};

	const onWheel = (event: WheelEvent) => {
		event.preventDefault();
		const delta = event.deltaY > 0 ? -0.05 : 0.05;
		const container = event.currentTarget as HTMLElement;
		const nextScale = Math.min(MAX_SCALE, Math.max(minScale, scale + delta));
		const bounds = container.getBoundingClientRect();
		const cursorX = event.clientX - bounds.left;
		const cursorY = event.clientY - bounds.top;
		const worldX = (cursorX - panX) / scale;
		const worldY = (cursorY - panY) / scale;
		scale = nextScale;
		panX = cursorX - worldX * scale;
		panY = cursorY - worldY * scale;
	};

	const beginPan = (event: PointerEvent) => {
		if (dragState || event.button !== 0) return;
		panning = true;
		panPointerId = event.pointerId;
		panStartX = event.clientX;
		panStartY = event.clientY;
		panOriginX = panX;
		panOriginY = panY;
	};

	const movePan = (event: PointerEvent) => {
		if (dragState) {
			updateDrag(event);
			return;
		}
		if (!panning || panPointerId !== event.pointerId) return;
		panX = panOriginX + (event.clientX - panStartX);
		panY = panOriginY + (event.clientY - panStartY);
	};

	const endPan = (event: PointerEvent) => {
		if (panPointerId === event.pointerId) {
			panning = false;
			panPointerId = null;
		}
	};

	const loadBundled = async () => {
		const loaded = loadBundledShips();
		loaderErrors = loaded.errors;
		const seedShips = loaded.ships.map((ship) => ({ id: ship.id, ship }));
		ships = layoutFleet(seedShips, metersToPixels);
		await updateMinScale();
		fitFleet();
	};

	const openShip = (ship: Ship) => selectedShip = ship;

	const closeShip = () => selectedShip = null;

	const openShipLink = (url: string) => {
		const href = /^https?:\/\//i.test(url) ? url : resolve(url as '/');
		window.open(href, '_blank', 'noopener,noreferrer');
	};

	const handleUpload = async (event: Event) => {
		const target = event.currentTarget as HTMLInputElement;
		if (!target.files?.length) return;
		uploadErrors = [];
		uploadSuccess = '';
		let addedCount = 0;

		for (const file of Array.from(target.files)) {
			const parsed = await parseUploadedShipFile(file);
			if (parsed.error) {
				uploadErrors = [...uploadErrors, parsed.error];
				continue;
			}
			if (parsed.ship) {
				const seedShips = [
					...ships.map((item) => ({ id: item.id, ship: item.ship })),
					{ id: `${parsed.ship.id}-${crypto.randomUUID()}`, ship: parsed.ship }
				];
				ships = layoutFleet(seedShips, metersToPixels);
				updateMinScale();
				addedCount += 1;
			}
		}

		if (addedCount > 0) {
			uploadSuccess =
				addedCount === 1
					? 'Upload complete. 1 ship added.'
					: `Upload complete. ${addedCount} ships added.`;
			if (uploadSuccessTimeout) {
				clearTimeout(uploadSuccessTimeout);
			}
			uploadSuccessTimeout = setTimeout(() => {
				uploadSuccess = '';
				uploadSuccessTimeout = null;
			}, 3200);
		}
		target.value = '';
	};

	onDestroy(() => {
		if (uploadSuccessTimeout) {
			clearTimeout(uploadSuccessTimeout);
		}
	});

	onMount(() => {
		void loadBundled();
	});
</script>

<svelte:options runes={false} />

<svelte:window on:pointermove={movePan} on:pointerup={(event) => { endPan(event); endDrag(); }} />

<main class="page">
	<header class="top-bar">
		<div>
			<h1>Starship Dimensions</h1>
			<p>Compare fleets, spawn draggable duplicates for scale checks, and upload your own ship Markdown files.</p>
		</div>
		<div class="controls">
			<button on:click={fitFleet}>Fit Fleet</button>
			<label class="upload">
				Upload ship files
				<input type="file" accept=".md,text/markdown" multiple on:change={handleUpload} />
			</label>
		</div>
	</header>

	<section class="filters">
		<div class="filter-field">
			<span>Universe</span>
			<DropdownMenu>
				<DropdownMenuTrigger>
					<Button variant="outline" class="filter-trigger">{getUniverseLabel()}</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					<DropdownMenuItem
						onSelect={() => {
							universeFilter = [];
						}}
					>
						All Universes
					</DropdownMenuItem>
					<DropdownMenuCheckboxGroup bind:value={universeFilter}>
						{#each universes as universe (universe)}
							<DropdownMenuCheckboxItem value={universe} closeOnSelect={false}>
								{universe}
							</DropdownMenuCheckboxItem>
						{/each}
					</DropdownMenuCheckboxGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
		<div class="filter-field">
			<span>Tag</span>
			<DropdownMenu>
				<DropdownMenuTrigger>
					<Button variant="outline" class="filter-trigger">{getTagLabel()}</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					<DropdownMenuItem
						onSelect={() => {
							tagFilter = [];
						}}
					>
						All Tags
					</DropdownMenuItem>
					<DropdownMenuCheckboxGroup bind:value={tagFilter}>
						{#each tags as tag (tag)}
							<DropdownMenuCheckboxItem value={tag} closeOnSelect={false}>
								{tag}
							</DropdownMenuCheckboxItem>
						{/each}
					</DropdownMenuCheckboxGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
		<label>
			Min length (m)
			<input type="number" min="0" bind:value={minLength} />
		</label>
		<label>
			Max length (m)
			<input type="number" min="1" bind:value={maxLength} />
		</label>
		<label class="toggle">
			<input type="checkbox" bind:checked={activeOnly} /> Show only matching ships
		</label>
	</section>

	{#if loaderErrors.length || uploadErrors.length}
		<section class="messages">
			{#if loaderErrors.length}
				<p><strong>Bundled parse errors:</strong></p>
				<ul>{#each loaderErrors as err (`loader-${err}`)}<li>{err}</li>{/each}</ul>
			{/if}
			{#if uploadErrors.length}
				<p><strong>Upload errors:</strong></p>
				<ul>{#each uploadErrors as err (`upload-${err}`)}<li>{err}</li>{/each}</ul>
			{/if}
		</section>
	{/if}

	{#if uploadSuccess}
		<p class="upload-toast" role="status" aria-live="polite">{uploadSuccess}</p>
	{/if}

	<section class="fleet-layout">
		<section
			class="fleet"
			{@attach attachFleetContainer}
			on:wheel={onWheel}
			on:pointerdown={beginPan}
			role="application"
			aria-label="Fleet comparison canvas"
		>
			<div
				class="stars"
				style={`background-size:${gridCellMeters * scale}px ${gridCellMeters * scale}px; background-position:${panX}px ${panY}px;`}
			></div>
			<div class="fleet-scene" style={`transform: translate(${panX}px, ${panY}px) scale(${scale});`}>
				{#each ships as item (item.id)}
					{@const ship = item.ship}
					{@const isMatch = filteredIds.has(item.id)}
					{@const highlightState = hasActiveFilters()
						? isMatch
							? 'highlighted'
							: 'dimmed'
						: ''}
					{#if !activeOnly || isMatch}
						<button
							class={`ship ${highlightState} ${isSmallFramedShip(ship) ? 'small-frame' : ''}`}
							style={`left:${item.x}px; top:${item.y}px; width:${getVisualWidth(ship)}px; height:${getVisualHeight(ship)}px; --img-width:${getImageVisualWidth(ship)}px; --img-height:${getImageVisualHeight(ship)}px;`}
							on:click={() => openShip(ship)}
							on:pointerdown={(event) => startDrag(event, 'ship', item.id, item.x, item.y)}
						>
							<img src={ship.images.main} alt={ship.name} draggable="false" />
							<span class="label">{ship.name} · {ship.lengthMeters}m</span>
						</button>
					{/if}
				{/each}

				{#each duplicates as duplicate (duplicate.id)}
					{@const host = ships.find((item) => item.id === duplicate.shipId)}
					{#if host}
						<button
							class={`ship duplicate ${isSmallFramedShip(host.ship) ? 'small-frame' : ''}`}
							style={`left:${duplicate.x}px; top:${duplicate.y}px; width:${getVisualWidth(host.ship)}px; height:${getVisualHeight(host.ship)}px; --img-width:${getImageVisualWidth(host.ship)}px; --img-height:${getImageVisualHeight(host.ship)}px;`}
							on:pointerdown={(event) =>
								startDrag(event, 'duplicate', duplicate.id, duplicate.x, duplicate.y)}
							on:dblclick={() => removeDuplicate(duplicate.id)}
						>
							<img src={host.ship.images.main} alt={`${host.ship.name} duplicate`} draggable="false" />
							<span class="label duplicate-hint">(double click to remove)</span>
						</button>
					{/if}
				{/each}
			</div>
			<div class="scale-indicator" aria-hidden="true">
				<span class="scale-zero">0</span>
				<span class="scale-mark" style={`right:${10 * scale}px;`}>10m</span>
				<span class="scale-mark" style={`right:${100 * scale}px;`}>100m</span>
				<span class="scale-mark" style={`right:${1000 * scale}px;`}>1km</span>
				<span class="scale-mark" style={`right:${10000 * scale}px;`}>10km</span>
			</div>
		</section>

		<aside class="format-note">
			{#if selectedShip}
				<header class="sidebar-header">
					<h2>{selectedShip.name}</h2>
					<button on:click={closeShip}>Clear</button>
				</header>
				<p><strong>Universe:</strong> {selectedShip.universe}</p>
				{#if selectedShip.fleetSegment}
					<p><strong>Fleet segment:</strong> {selectedShip.fleetSegment}</p>
				{/if}
				<p><strong>Length:</strong> {selectedShip.lengthMeters}m</p>
				<p><strong>Tags:</strong> {selectedShip.tags.join(', ')}</p>
				{#if selectedShip.links?.length}
					<div class="ship-links">
						<p><strong>Links</strong></p>
						<ul>
							{#each selectedShip.links as link, index (index)}
								<li>
									<button class="link-button" type="button" on:click={() => openShipLink(link.url)}>
										{link.label}
									</button>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
				<div class="markdown-body">
					<MarkdownRenderer markdown={selectedShip.descriptionMarkdown ?? ''} />
				</div>
			{:else}
				<h2>Ship File Format</h2>
				<p>
					Ship files are Markdown with YAML frontmatter. See <code>docs/ship-file-format.md</code> for the
					complete schema and examples.
				</p>
			{/if}
		</aside>
	</section>
</main>

<style>
.page {
	display: grid;
	gap: 1rem;
	padding: 1rem;
	height: 100vh;
	overflow: hidden;
	box-sizing: border-box;
	grid-template-rows: auto auto minmax(0, 1fr);
	background: radial-gradient(circle at 20% 20%, #1f2937 0%, #020617 55%, #000 100%);
	color: #e2e8f0;
}

.top-bar {
	display: flex;
	justify-content: space-between;
	gap: 1rem;
	flex-wrap: wrap;
}

.controls {
	display: flex;
	gap: .6rem;
	align-items: flex-start;
}

button,
input {
	background: #0f172a;
	border: 1px solid #334155;
	color: #e2e8f0;
	padding: .4rem .6rem;
}

.upload {
	display: grid;
	gap: .3rem;
	font-size: .85rem;
}

.filters {
	display: flex;
	gap: .7rem;
	flex-wrap: wrap;
	align-items: end;
}

	.filters label,
	.filter-field {
		display: grid;
		font-size: .8rem;
		gap: .2rem;
	}
	.filter-trigger {
		justify-content: space-between;
		min-width: 12rem;
	}

.toggle {
	display: flex !important;
	align-items: center;
	gap: .3rem;
}

.messages {
	background: rgba(15, 23, 42, .7);
	border: 1px solid #334155;
	padding: .7rem;
}

.success {
	color: #86efac;
}

.upload-toast {
	position: fixed;
	left: 50%;
	bottom: 1rem;
	transform: translateX(-50%);
	background: rgba(6, 78, 59, .95);
	color: #d1fae5;
	border: 1px solid #10b981;
	padding: .45rem .7rem;
	font-size: .78rem;
	line-height: 1.2;
	border-radius: .4rem;
	z-index: 50;
	box-shadow: 0 6px 18px rgba(0, 0, 0, .35);
	max-width: min(90vw, 380px);
	text-align: center;
}

.fleet-layout {
	display: grid;
	gap: 1rem;
	min-height: 0;
	overflow: hidden;
	grid-template-rows: minmax(0, 1fr) minmax(0, 38vh);
}

.fleet {
	position: relative;
	overflow: hidden;
	border: 1px solid #334155;
	min-height: 0;
	height: 100%;
	cursor: grab;
}

.stars {
	position: absolute;
	inset: 0;
	background-image: radial-gradient(white 1px, transparent 1px);
	background-size: 100px 100px;
	opacity: .16;
}

.fleet-scene {
	position: absolute;
	left: 0;
	top: 0;
	width: 0;
	height: 0;
	transform-origin: 0 0;
}

.scale-indicator {
	position: absolute;
	right: .55rem;
	bottom: .45rem;
	width: 0;
	height: 0;
	pointer-events: none;
	z-index: 5;
}

.scale-zero,
.scale-mark {
	position: absolute;
	bottom: 0;
	transform: translateX(50%);
	font-size: .62rem;
	line-height: 1;
	white-space: nowrap;
}

.scale-zero {
	right: 0;
	color: #f1f5f9;
}

.scale-mark {
	color: #cbd5e1;
}

.ship {
	position: absolute;
	border: 1px dashed #64748b;
	background: transparent;
	padding: 0;
	transform: translate(-50%, -50%);
	cursor: pointer;
}

.ship img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	pointer-events: none;
	display: block;
}

.ship.small-frame {
	background: rgba(148, 163, 184, 0.05);
}

.ship.small-frame img {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	width: var(--img-width);
	height: var(--img-height);
	object-fit: contain;
}

.ship .label {
	position: absolute;
	left: 0;
	bottom: -1.5rem;
	font-size: .68rem;
	white-space: nowrap;
	background: #020617cc;
	padding: 0 .3rem;
}

.ship.highlighted {
	box-shadow: 0 0 0 2px #38bdf8;
}

.ship.dimmed {
	opacity: .3;
}


.ship.duplicate {
	opacity: .65;
	border-style: dashed;
	filter: grayscale(.5) saturate(.7);
	cursor: grab;
}

.ship.duplicate .duplicate-hint {
	display: none;
}

.ship.duplicate:hover .duplicate-hint,
.ship.duplicate:focus-visible .duplicate-hint {
	display: block;
}

.format-note {
	background: rgba(2, 6, 23, .8);
	border: 1px solid #334155;
	padding: .7rem;
	min-height: 0;
	overflow: auto;
	max-height: 100%;
}

.sidebar-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: .6rem;
}

@media (min-width: 980px) {
	.fleet-layout {
		grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
		grid-template-rows: minmax(0, 1fr);
		align-items: stretch;
	}

	.format-note {
		height: 100%;
		align-self: stretch;
		max-height: 100%;
	}
}

.ship-links ul {
	margin: .3rem 0 .8rem;
	padding-left: 1rem;
}

.link-button {
	padding: 0;
	border: 0;
	background: transparent;
	color: #93c5fd;
	text-decoration: underline;
	cursor: pointer;
	font: inherit;
}

.link-button:hover {
	color: #bfdbfe;
}

.markdown-body {
	background: #020617;
	border: 1px solid #1e293b;
	padding: .7rem;
	border-radius: .35rem;
}

.markdown-body :global(h1),
.markdown-body :global(h2),
.markdown-body :global(h3) {
	margin: .8rem 0 .5rem;
	line-height: 1.2;
}

.markdown-body :global(p),
.markdown-body :global(ul),
.markdown-body :global(ol) {
	margin: .45rem 0;
}

.markdown-body :global(ul),
.markdown-body :global(ol) {
	padding-left: 1.2rem;
}

.markdown-body :global(a) {
	color: #93c5fd;
}

.markdown-body :global(img) {
	max-width: 100%;
	height: auto;
	border: 1px solid #334155;
	margin: .35rem 0;
}

.markdown-body :global(code) {
	background: #0f172a;
	padding: .1rem .28rem;
	border-radius: .2rem;
	overflow-wrap: anywhere;
}
</style>
