<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import {
		centerBoundsAtScale,
		computeMinScale,
		getFleetBounds,
		getVisualHeight as getFleetVisualHeight,
		getVisualWidth as getFleetVisualWidth,
		layoutFleet
	} from '$lib/fleet';
	import type { FleetItem, Silhouette } from '$lib/fleet';
	import {
		DropdownMenu,
		DropdownMenuCheckboxGroup,
		DropdownMenuCheckboxItem,
		DropdownMenuContent,
		DropdownMenuLabel,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import { loadBundledShips, parseUploadedShipFile } from '$lib/ships';
	import type { Ship } from '$lib/ships';
    import { MAX_SCALE, MIN_SCALE } from '$lib'

	let ships: FleetItem[] = [];
	let silhouettes: Silhouette[] = [];
	let selectedShip: Ship | null = null;
	let loaderErrors: string[] = [];
	let uploadErrors: string[] = [];
	let uploadSuccess = '';

	let scale = 0.25;
	let panX = 160;
	let panY = 220;
	const metersToPixels = 0.18;
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
				type: 'ship' | 'silhouette';
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

	const centerFleetAtScale = (targetScale: number) => {
		if (!fleetContainer) return;
		const bounds = getCurrentFleetBounds();
		if (!bounds) return;
		const centered = centerBoundsAtScale(
			bounds,
			targetScale,
			Math.max(1, fleetContainer.clientWidth),
			Math.max(1, fleetContainer.clientHeight)
		);
		scale = centered.scale;
		panX = centered.panX;
		panY = centered.panY;
	};

	const resetView = () => {
		scale = 0.25;
		panX = 160;
		panY = 220;
	};

	const fitFleet = () => {
		if (!ships.length) return;
		const bounds = getCurrentFleetBounds();
		if (!bounds) return;
		const minX = bounds.minX;
		const maxX = bounds.maxX;
		const minY = bounds.minY - 100;
		const maxY = bounds.maxY + 100;
		const fleetWidth = maxX - minX;
		const fleetHeight = maxY - minY;
		scale = Math.min(0.8, Math.max(0.08, Math.min(980 / fleetWidth, 420 / fleetHeight)));
		panX = 120 - minX * scale;
		panY = 70 - minY * scale;
	};

	const startDrag = (event: PointerEvent, type: 'ship' | 'silhouette', id: string, x: number, y: number) => {
		event.stopPropagation();
		event.preventDefault();
		if (type === 'ship') {
			const created = addSilhouette(id, { x, y });
			if (!created) return;
			dragState = {
				type: 'silhouette',
				id: created,
				deltaX: event.clientX / scale - x,
				deltaY: event.clientY / scale - y
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
		const worldX = event.clientX / scale - dragState.deltaX;
		const worldY = event.clientY / scale - dragState.deltaY;

		if (dragState.type === 'ship') {
			ships = ships.map((item) =>
				item.id === dragState?.id
					? {
							...item,
							x: worldX,
							y: worldY
						}
					: item
			);
		} else {
			silhouettes = silhouettes.map((item) =>
				item.id === dragState?.id
					? {
							...item,
							x: worldX,
							y: worldY
						}
					: item
			);
		}
	};

	const endDrag = () => {
		dragState = null;
	};

	const addSilhouette = (shipId: string, position?: { x: number; y: number }) => {
		const base = ships.find((item) => item.id === shipId);
		if (!base) return null;
		const id = `${shipId}-sil-${crypto.randomUUID()}`;
		const spawnX = position?.x ?? base.x + 70;
		const spawnY = position?.y ?? base.y + 70;
		silhouettes = [...silhouettes, { id, shipId, x: spawnX, y: spawnY }];
		return id;
	};

	const removeSilhouette = (silhouetteId: string) => {
		silhouettes = silhouettes.filter((item) => item.id !== silhouetteId);
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
		centerFleetAtScale(minScale);
	};

	const openShip = (ship: Ship) => selectedShip = ship;

	const closeShip = () => selectedShip = null;

	const onBackdropClick = (event: MouseEvent) => {
		if (event.target === event.currentTarget) {
			closeShip();
		}
	};

	const handleUpload = async (event: Event) => {
		const target = event.currentTarget as HTMLInputElement;
		if (!target.files?.length) return;
		uploadErrors = [];
		uploadSuccess = '';

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
				uploadSuccess = 'Upload complete. Ships added to fleet view.';
			}
		}
		target.value = '';
	};

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
			<p>Compare fleets, scale silhouettes, and upload your own ship Markdown files.</p>
		</div>
		<div class="controls">
			<button on:click={fitFleet}>Fit Fleet</button>
			<button on:click={resetView}>Reset View</button>
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
						on:select={() => {
							universeFilter = [];
						}}
					>
						All Universes
					</DropdownMenuItem>
					<DropdownMenuCheckboxGroup bind:value={universeFilter}>
						{#each universes as universe (universe)}
							<DropdownMenuCheckboxItem value={universe} closeOnSelect={false} on:mouseover={() => {}}>
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
						on:select={() => {
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

	{#if loaderErrors.length || uploadErrors.length || uploadSuccess}
		<section class="messages">
			{#if loaderErrors.length}
				<p><strong>Bundled parse errors:</strong></p>
				<ul>{#each loaderErrors as err (`loader-${err}`)}<li>{err}</li>{/each}</ul>
			{/if}
			{#if uploadErrors.length}
				<p><strong>Upload errors:</strong></p>
				<ul>{#each uploadErrors as err (`upload-${err}`)}<li>{err}</li>{/each}</ul>
			{/if}
			{#if uploadSuccess}<p class="success">{uploadSuccess}</p>{/if}
		</section>
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
			<div class="stars"></div>
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
							class={`ship ${highlightState}`}
							style={`left:${item.x}px; top:${item.y}px; width:${getVisualWidth(ship)}px; height:${getVisualHeight(ship)}px;`}
							on:click={() => openShip(ship)}
							on:pointerdown={(event) => startDrag(event, 'ship', item.id, item.x, item.y)}
						>
							<img src={ship.images.main} alt={ship.name} draggable="false" />
							<span class="label">{ship.name} · {ship.lengthMeters}m</span>
						</button>
					{/if}
				{/each}

				{#each silhouettes as silhouette (silhouette.id)}
					{@const host = ships.find((item) => item.id === silhouette.shipId)}
					{#if host}
						<button
							class="ship silhouette"
							style={`left:${silhouette.x}px; top:${silhouette.y}px; width:${getVisualWidth(host.ship)}px; height:${getVisualHeight(host.ship)}px;`}
							on:pointerdown={(event) =>
								startDrag(event, 'silhouette', silhouette.id, silhouette.x, silhouette.y)}
							on:dblclick={() => removeSilhouette(silhouette.id)}
						>
							<img src={host.ship.images.silhouette ?? host.ship.images.main} alt={`${host.ship.name} silhouette`} draggable="false" />
							<span class="label">silhouette (double click to remove)</span>
						</button>
					{/if}
				{/each}
			</div>
		</section>

		<aside class="format-note">
			<h2>Ship File Format</h2>
			<p>
				Ship files are Markdown with YAML frontmatter. See <code>docs/ship-file-format.md</code> for the
				complete schema and examples.
			</p>
		</aside>
	</section>
</main>

{#if selectedShip}
	<div class="modal-backdrop" role="button" tabindex="0" on:click={onBackdropClick} on:keydown={(event) => event.key === "Escape" && closeShip()}>
		<div class="modal" role="dialog" aria-modal="true" aria-label="Ship details" tabindex="-1">
			<header>
				<h2>{selectedShip.name}</h2>
				<button on:click={closeShip}>Close</button>
			</header>
			<p><strong>Universe:</strong> {selectedShip.universe}</p>
			{#if selectedShip.fleetSegment}
				<p><strong>Fleet segment:</strong> {selectedShip.fleetSegment}</p>
			{/if}
			<p><strong>Length:</strong> {selectedShip.lengthMeters} meters</p>
			<p><strong>Tags:</strong> {selectedShip.tags.join(', ')}</p>
			<img src={selectedShip.images.main} alt={selectedShip.name} />
			{#if selectedShip.images.gallery?.length}
				<div class="gallery">
					{#each selectedShip.images.gallery as image (image)}
						<img src={image} alt={`${selectedShip.name} reference`} />
					{/each}
				</div>
			{/if}
			{#if selectedShip.links?.length}
				<ul>
					{#each selectedShip.links as link (link.url)}
						<li><a href={resolve(link.url)} target="_blank" rel="noreferrer">{link.label}</a></li>
					{/each}
				</ul>
			{/if}
			{#if selectedShip.descriptionMarkdown}
				<pre>{selectedShip.descriptionMarkdown}</pre>
			{/if}
		</div>
	</div>
{/if}

<style>
.page {
	display: grid;
	gap: 1rem;
	padding: 1rem;
	min-height: 100vh;
	grid-template-rows: auto auto 1fr auto;
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

.fleet-layout {
	display: grid;
	gap: 1rem;
	min-height: 0;
	grid-template-rows: 1fr auto;
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
	background-size: 36px 36px;
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

.ship.silhouette {
	opacity: .65;
	border-style: dashed;
	filter: grayscale(1);
	cursor: grab;
}

.format-note {
	background: rgba(2, 6, 23, .8);
	border: 1px solid #334155;
	padding: .7rem;
}

@media (min-width: 980px) {
	.fleet-layout {
		grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
		grid-template-rows: 1fr;
		align-items: stretch;
	}

	.format-note {
		align-self: stretch;
	}
}

.modal-backdrop {
	position: fixed;
	inset: 0;
	background: #020617c7;
	display: grid;
	place-items: center;
	padding: 1rem;
}

.modal {
	width: min(720px, 96vw);
	max-height: 90vh;
	overflow: auto;
	background: #0f172a;
	border: 1px solid #334155;
	padding: 1rem;
	display: grid;
	gap: .8rem;
}

.modal header {
	display: flex;
	justify-content: space-between;
}

.modal img {
	max-width: 100%;
	border: 1px solid #334155;
}

.gallery {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
	gap: .5rem;
}

pre {
	white-space: pre-wrap;
	background: #020617;
	border: 1px solid #1e293b;
	padding: .6rem;
}
</style>
