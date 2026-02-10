<script lang="ts">
	import { onMount } from 'svelte';
	import { loadBundledShips, parseUploadedShipFile } from '$lib/ships';
	import type { Ship } from '$lib/ships';

	type FleetItem = {
		id: string;
		ship: Ship;
		x: number;
		y: number;
	};

	type Silhouette = {
		id: string;
		shipId: string;
		x: number;
		y: number;
	};

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

	let universeFilter = 'all';
	let tagFilter = 'all';
	let minLength = 0;
	let maxLength = 5000;
	let activeOnly = false;

	$: universes = [...new Set(ships.map((item) => item.ship.universe))].sort();
	$: tags = [...new Set(ships.flatMap((item) => item.ship.tags))].sort();

	$: filteredShips = ships.filter((item) => {
		const ship = item.ship;
		const universeMatches = universeFilter === 'all' || ship.universe === universeFilter;
		const tagMatches = tagFilter === 'all' || ship.tags.includes(tagFilter);
		const lengthMatches = ship.lengthMeters >= minLength && ship.lengthMeters <= maxLength;
		return universeMatches && tagMatches && lengthMatches;
	});

	$: filteredIds = new Set(filteredShips.map((item) => item.id));

	const getVisualWidth = (ship: Ship): number => Math.max(ship.lengthMeters * metersToPixels, 72);
	const getVisualHeight = (ship: Ship): number => {
		const ratio = ship.heightMeters ? ship.heightMeters / ship.lengthMeters : 0.22;
		return Math.max(getVisualWidth(ship) * ratio, 28);
	};

	const resetView = () => {
		scale = 0.25;
		panX = 160;
		panY = 220;
	};

	const fitFleet = () => {
		if (!ships.length) return;
		const widths = ships.map((item) => getVisualWidth(item.ship));
		const minX = Math.min(...ships.map((item, idx) => item.x - widths[idx] / 2));
		const maxX = Math.max(...ships.map((item, idx) => item.x + widths[idx] / 2));
		const minY = Math.min(...ships.map((item) => item.y - 100));
		const maxY = Math.max(...ships.map((item) => item.y + 100));
		const fleetWidth = maxX - minX;
		const fleetHeight = maxY - minY;
		scale = Math.min(0.8, Math.max(0.08, Math.min(980 / fleetWidth, 420 / fleetHeight)));
		panX = 120 - minX * scale;
		panY = 70 - minY * scale;
	};

	const startDrag = (event: PointerEvent, type: 'ship' | 'silhouette', id: string, x: number, y: number) => {
		event.stopPropagation();
		event.preventDefault();
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

	const addSilhouette = (shipId: string) => {
		const base = ships.find((item) => item.id === shipId);
		if (!base) return;
		silhouettes = [
			...silhouettes,
			{ id: `${shipId}-sil-${crypto.randomUUID()}`, shipId, x: base.x + 70, y: base.y + 70 }
		];
	};

	const removeSilhouette = (silhouetteId: string) => {
		silhouettes = silhouettes.filter((item) => item.id !== silhouetteId);
	};

	const onWheel = (event: WheelEvent) => {
		event.preventDefault();
		const delta = event.deltaY > 0 ? -0.05 : 0.05;
		scale = Math.min(1.4, Math.max(0.05, scale + delta));
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

	const loadBundled = () => {
		const loaded = loadBundledShips();
		loaderErrors = loaded.errors;
		ships = loaded.ships.map((ship, index) => ({
			id: ship.id,
			ship,
			x: 180 + index * 290,
			y: 220 + (index % 2) * 160
		}));
	};

	const openShip = (ship: Ship) => {
		selectedShip = ship;
	};

	const closeShip = () => {
		selectedShip = null;
	};

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
				ships = [
					...ships,
					{
						id: `${parsed.ship.id}-${crypto.randomUUID()}`,
						ship: parsed.ship,
						x: 180 + ships.length * 180,
						y: 140 + (ships.length % 3) * 120
					}
				];
				uploadSuccess = 'Upload complete. Ships added to fleet view.';
			}
		}
		target.value = '';
	};

	onMount(() => {
		loadBundled();
	});
</script>

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
		<label>
			Universe
			<select bind:value={universeFilter}>
				<option value="all">All universes</option>
				{#each universes as universe (universe)}
					<option value={universe}>{universe}</option>
				{/each}
			</select>
		</label>
		<label>
			Tag
			<select bind:value={tagFilter}>
				<option value="all">All tags</option>
				{#each tags as tag (tag)}
					<option value={tag}>{tag}</option>
				{/each}
			</select>
		</label>
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

	<section
		class="fleet"
		on:wheel={onWheel}
		on:pointerdown={beginPan}
		role="application"
		aria-label="Fleet comparison canvas"
	>
		<div class="stars"></div>
		<div class="fleet-scene" style={`transform: translate(${panX}px, ${panY}px) scale(${scale});`}>
			{#each ships as item (item.id)}
				{@const ship = item.ship}
				{@const highlighted = filteredIds.has(item.id)}
				{#if !activeOnly || highlighted}
					<button
						class={`ship ${highlighted ? 'highlighted' : 'dimmed'}`}
						style={`left:${item.x}px; top:${item.y}px; width:${getVisualWidth(ship)}px; height:${getVisualHeight(ship)}px;`}
						on:click={() => openShip(ship)}
						on:pointerdown={(event) => startDrag(event, 'ship', item.id, item.x, item.y)}
					>
						<img src={ship.images.main} alt={ship.name} draggable="false" />
						<span class="label">{ship.name} · {ship.lengthMeters}m</span>
						<span class="spawn" role="button" tabindex="0" on:click|stopPropagation={() => addSilhouette(item.id)} on:keydown={(event) => event.key === "Enter" && addSilhouette(item.id)}>+ silhouette</span>
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

	<footer class="format-note">
		<h2>Ship File Format</h2>
		<p>
			Ship files are Markdown with YAML frontmatter. See <code>docs/ship-file-format.md</code> for the
			complete schema and examples.
		</p>
	</footer>
</main>

{#if selectedShip}
	<div class="modal-backdrop" role="button" tabindex="0" on:click={onBackdropClick} on:keydown={(event) => event.key === "Escape" && closeShip()}>
		<div class="modal" role="dialog" aria-modal="true" aria-label="Ship details" tabindex="-1">
			<header>
				<h2>{selectedShip.name}</h2>
				<button on:click={closeShip}>Close</button>
			</header>
			<p><strong>Universe:</strong> {selectedShip.universe}</p>
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
						<li><a href={link.url} target="_blank" rel="noreferrer">{link.label}</a></li>
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
		background: radial-gradient(circle at 20% 20%, #1f2937 0%, #020617 55%, #000 100%);
		color: #e2e8f0;
	}
	.top-bar { display:flex; justify-content:space-between; gap:1rem; flex-wrap:wrap; }
	.controls { display:flex; gap:.6rem; align-items:flex-start; }
	button, select, input { background:#0f172a; border:1px solid #334155; color:#e2e8f0; padding:.4rem .6rem; }
	.upload { display:grid; gap:.3rem; font-size:.85rem; }
	.filters { display:flex; gap:.7rem; flex-wrap:wrap; align-items:end; }
	.filters label { display:grid; font-size:.8rem; gap:.2rem; }
	.toggle { display:flex !important; align-items:center; gap:.3rem; }
	.messages { background:rgba(15,23,42,.7); border:1px solid #334155; padding:.7rem; }
	.success { color:#86efac; }
	.fleet { position:relative; overflow:hidden; border:1px solid #334155; min-height:520px; cursor:grab; }
	.stars { position:absolute; inset:0; background-image:radial-gradient(white 1px, transparent 1px); background-size:36px 36px; opacity:.16; }
	.fleet-scene { position:absolute; left:0; top:0; width:0; height:0; transform-origin:0 0; }
	.ship { position:absolute; border:1px solid #64748b; background:transparent; padding:0; transform:translate(-50%, -50%); cursor:move; }
	.ship img { width:100%; height:100%; object-fit:cover; pointer-events:none; display:block; }
	.ship .label { position:absolute; left:0; bottom:-1.5rem; font-size:.68rem; white-space:nowrap; background:#020617cc; padding:0 .3rem; }
	.ship .spawn { position:absolute; top:-1.3rem; right:0; font-size:.65rem; background:#0f172acc; padding:0 .35rem; border:1px dashed #64748b; }
	.ship.highlighted { box-shadow:0 0 0 2px #38bdf8; }
	.ship.dimmed { opacity:.3; }
	.ship.silhouette { opacity:.65; border-style:dashed; filter:grayscale(1); }
	.format-note { background:rgba(2,6,23,.8); border:1px solid #334155; padding:.7rem; }
	.modal-backdrop { position:fixed; inset:0; background:#020617c7; display:grid; place-items:center; padding:1rem; }
	.modal { width:min(720px, 96vw); max-height:90vh; overflow:auto; background:#0f172a; border:1px solid #334155; padding:1rem; display:grid; gap:.8rem; }
	.modal header { display:flex; justify-content:space-between; }
	.modal img { max-width:100%; border:1px solid #334155; }
	.gallery { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:.5rem; }
	pre { white-space:pre-wrap; background:#020617; border:1px solid #1e293b; padding:.6rem; }
</style>
