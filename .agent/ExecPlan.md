# Build the Interactive Starship Size Comparison App

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This plan must be maintained in accordance with [.agent/PLANS.md](/.agent/PLANS.md).

## Purpose / Big Picture

Deliver a minimal but highly interactive web app where someone can explore and compare 2D images of starship sizes as a fleet in space, zoom and pan around, drag optional ship silhouettes to compare scale, filter and highlight by origin universe, size, or tags, and open a detail panel with images and metadata. After implementation, a user can start the SvelteKit app and immediately see ships rendered at scale over a space themed background, interact with them, and load their own ship definitions from local files.

## Progress

- [x] (2026-02-10 00:00Z) Rewrite ExecPlan to comply with PLANS.md and capture confirmed scope and decisions.
- [ ] Establish data model and parser for ship files in Markdown with YAML frontmatter.
- [ ] Add several example ship files with dummy image placeholders.
- [ ] Build fleet view with pan and zoom plus scale-accurate rendering.
- [ ] Add drag and drop for ship's silhouettes overlays with duplication.
- [ ] Implement filtering, highlighting, and selection details modal.
- [ ] Add upload flow for ship files and document the ship format.
- [ ] Validate behaviors with local run and tests, then record outcomes.
- [ ] Write an Agent Skill for creating ship files.

## Surprises & Discoveries

- Observation: None yet.
   Evidence: Not applicable.

## Decision Log

- Decision: Use SvelteKit in the existing root workspace as the implementation target.
   Rationale: The repository already contains a SvelteKit app scaffolded for development.
   Date/Author: 2026-02-10, GitHub Copilot.

- Decision: Ship files will be Markdown with YAML frontmatter and a markdown body.
   Rationale: This format is readable, easy to edit, and can be shared offline.
   Date/Author: 2026-02-10, GitHub Copilot.

- Decision: User uploads require external image URLs. Owners may optionally include local images in [static](/static).
   Rationale: Keeps user uploads simple and avoids hosting requirements while enabling owner curated assets.
   Date/Author: 2026-02-10, GitHub Copilot.

- Decision: In this initial version, to implement example ships,use a service for placeholder images and allow users to provide their own image URLs in ship files. Image placeholder service that gives a placeholder image of a given size and color `/size/bg/fg`, e.g. https://dummyimage.com/160x100/f00/fff .


## Outcomes & Retrospective

No outcomes yet. This will be updated after each milestone with what was achieved and what remains.

## Context and Orientation

The implementation target is the SvelteKit app under root. SvelteKit is the framework that serves routes from [src/routes](/src/routes) and shared code from [src/lib](/src/lib). The initial UI for the app is in [src/routes/+page.svelte](/src/routes/+page.svelte) with layout assets in [src/routes/+layout.svelte](/src/routes/+layout.svelte) and styles in [src/routes/layout.css](/src/routes/layout.css). Static files live in [static](/static) and are served as-is at runtime. Ship data will be stored as markdown files in a new directory under [src/lib/ships](/src/lib/ships), and optional owner curated images can live in [static](/static).

In this plan, a ship is a single starship definition with metadata that includes name, origin universe, size, and tags, plus image links. A silhouette is a single ship outline image rendered at the same scale as the ship image and can be duplicated and moved freely by the user. A fleet view is the main interactive canvas where ship images and silhouettes are rendered over a space background and can be panned and zoomed.

## Plan of Work

Start by defining a ship file schema and a parser to read Markdown with YAML frontmatter, then build a typed data model in [src/lib/ships](/src/lib/ships). Add a loader that pulls initial ships from that directory and also accepts user uploaded ship files through a drag and drop or file picker on the UI. Next, build the fleet view in [src/routes/+page.svelte](/src/routes/+page.svelte), using a canvas or SVG based renderer that scales ships by length and supports pan and zoom with mouse and touch input. Add drag and drop behavior so users can move ships and silhouettes, including a control to spawn multiple silhouettes per ship.

Implement filtering and highlighting UI controls, such as checkboxes or chips for universes and tags plus a size range filter, with visual emphasis on the ships that match. Add a detail modal for a selected ship that shows images, metadata, and links, and ensure it opens from both the fleet view and the list of ships. Finish by documenting the ship file format in the app UI and in a repository doc under [README.md](/README.md) or a new file in root, and by validating the behaviors with a local run plus tests where applicable. After implementation, write an Agent Skill that encodes the process for creating a ship file, including required fields, formatting, and how to reference images. Test the skill by asking the agent to create a new ship file and verifying it parses correctly and renders in the app when uploaded.

## Concrete Steps

1. Define the ship schema and parser in [src/lib/ships](/src/lib/ships). Create a module that reads Markdown files, extracts YAML frontmatter, validates required fields, and produces a typed `Ship` object. Include example ship files in [src/lib/ships/data](/src/lib/ships/data) so the UI has initial content.

2. Add a ship loader and upload flow. The loader should read the bundled example files at startup and merge them with any user uploaded files in memory. The upload flow should accept Markdown files, parse them, and present errors in the UI when required fields are missing.

3. Build the fleet view in [src/routes/+page.svelte](/src/routes/+page.svelte). Render ships with correct scale based on their `lengthMeters` field. Provide pan and zoom with pointer input and simple UI controls to reset view or fit all ships.

4. Add silhouette overlay support. Add a hidden interactive element that appears on hover for each ship to spawn a semi-transparent silhouette overlay, render it as a draggable element with the same scale, and allow multiple silhouettes to be duplicated and moved independently.

5. Add filters, highlights, and the details modal. Filters update the fleet view in real time and highlight matches while dimming others. The details modal opens on click and shows metadata, images, and external links with clear labels.

6. Document the ship format. Add a short “Ship File Format” section in a new doc under root and link it from the README and UI. Describe required fields, example frontmatter, and how external images should be referenced. Include an example ship file in the docs using dummy image URLs. Create an Agent Skill that encodes how to create a ship file, including required fields, formatting, and referencing images. The documentation can refer to the agent skill for exhaustive instructions. 

## Validation and Acceptance

Run the app from root with the standard dev command and verify the UI.

Expected behavior to verify:

- On load, the fleet view shows at least two ships rendered at different sizes over a space background.
- Pan and zoom respond to mouse or touch, and resetting the view brings ships back into frame.
- Dragging a ship moves it, and spawning a silhouette creates a second, movable overlay at the correct scale.
- Filters by universe, tag, and size immediately highlight matching ships and dim non matches.
- Clicking a ship opens a detail modal with its images, tags, and links.
- Uploading a valid ship file adds it to the fleet without a page reload, while invalid files show a clear error message.

If tests are added, run the project test command in root and expect the suite to pass. If no tests exist yet, note that validation is manual and document the observed behaviors.

## Idempotence and Recovery

All steps are additive and safe to repeat. If a ship file fails to parse, keep the UI running and surface the error without changing existing data. If the loader is updated, reloading the page should restore the bundled example ships and reapply any user uploads in the current session only, since no persistence is planned yet.

## Artifacts and Notes

Expected example ship file format to include in docs:

      ---
      name: Example Cruiser
      universe: Exampleverse
      lengthMeters: 950
      # heightMeters is optional
      tags: [cruiser, capital]
      images:
         main: https://example.com/ship-main.png
         silhouette: https://example.com/ship-silhouette.png
         gallery:
            - https://example.com/ship-1.png
            - https://example.com/ship-2.png
      links:
         - label: Wiki
            url: https://example.com/wiki
      ---
      A description of the ship in markdown using the body of the file. This can include **formatting**, lists, images, links and more.

The frontmatter is parsed and used in the UI, while the markdown body is rendered in the details modal and poses as a standalone ship description document usable also outside of the app.

`heightMeters` is necessary when the `images.main` is not provided or the aspect ratio is wrong. If the silhouette image is not provided, the app can generate a silhouette by applying a filter to the main image or using a placeholder. `images` are optional, placeholders will be used.

## Interfaces and Dependencies

The app will use SvelteKit and Svelte components in [src/lib/components](/src/lib/components). All UI components must use [shadcn-svelte](https://www.shadcn-svelte.com/docs/components) for consistency, accessibility, and maintainability. When a new UI component is needed, find it in the shadcn-svelte docs website and install it using pnpm as described in the [shadcn-svelte agent skill](/.agent/skills/shadcn-svelte.md). If a component is not available, prefer building on top of shadcn-svelte primitives.

Define the following data structures in [src/lib/ships/types.ts](/src/lib/ships/types.ts):

      export type ShipImageSet = {
         main: string;
         silhouette?: string;
         gallery?: string[];
      }

      export type ShipLink = {
         label: string;
         url: string;
      }

      export type Ship = {
         id: string;
         name: string;
         universe: string;
         lengthMeters: number;
         tags: string[];
         images: ShipImageSet;
         links?: ShipLink[];
         descriptionMarkdown?: string;
      }

The parser in [src/lib/ships/parseShip.ts](/src/lib/ships/parseShip.ts) will accept Markdown with YAML frontmatter and return a `Ship` or a structured error. The loader in [src/lib/ships/loadShips.ts](/src/lib/ships/loadShips.ts) will combine bundled ships from [src/lib/ships/data](/src/lib/ships/data) with user uploads.

Note on images: user uploads must reference external URLs. The app may use owner curated images stored under [static](/static) for bundled ships.

Plan change note: Rewrote the ExecPlan to follow [.agent/PLANS.md](/.agent/PLANS.md), add the mandatory living sections, and encode confirmed decisions and full feature scope so the plan is self contained for a novice.
