## Plan: Interactive Starship Size Comparison Web App (Images + Silhouettes)

Create a minimalistic, interactive web app for comparing starship sizes, inspired by the provided chart. The app will display actual ship images over a space-themed background (e.g., the solar system), allow users to zoom, pan, and drag ships, and provide filtering/highlighting by universe, size, and tags. Users can enable silhouettes for any ship, which appear as overlays at the correct scale and can be freely dragged—multiple silhouettes can be created and moved for direct comparison. Each ship is defined by a structured, user-uploadable markdown file containing metadata and image links. Clicking a ship opens a popup with detailed info and images.

**Steps**
1. **Project Setup**
   - Initialize a modern web app (React or Svelte recommended).
   - Set up file structure: `public/`, `src/`, `ships/`, `components/`, `utils/`, etc.

2. **Ship Data Format**
   - Define a structured markdown format for ship files (YAML frontmatter for metadata, markdown body for description, external image links).
   - Example fields: name, universe, size, tags, image URLs (main image, silhouette), description, capabilities, links.
   - Create a parser to read and validate these files client-side.

3. **Ship Data Management**
   - Implement a system to load ship files from a directory (e.g., `ships/`), parse them, and store them in app state.
   - Allow users to upload new ship files (drag-and-drop or file picker), with validation and preview.

4. **Rendering the Fleet**
   - Use a performant canvas or SVG-based renderer for the main fleet view.
   - Display actual ship images at correct scale over a space/solar system background.
   - Implement zoom and pan controls (mouse/touch gestures).

5. **Silhouette Overlay System**
   - Add a toggle to enable silhouette mode for any ship.
   - When enabled, create a draggable silhouette overlay at the correct scale, which can be freely moved and duplicated.
   - Allow users to create multiple silhouettes for comparison.

6. **Interactivity**
   - Enable dragging ships and silhouettes to overlay them for size comparison.
   - Add toggles/filters for universes, tags, and size ranges.
   - Highlight ships based on active filters.

7. **Ship Details Popup**
   - On ship click, show a modal with:
     - High-res image (if available)
     - All metadata (origin, name, size, tags, description, links)
     - Additional images (gallery)
   - Support external links (e.g., wiki, source).

8. **UI/UX Enhancements**
   - Minimalistic, dark-themed UI to evoke "space" feel.
   - Subtle background (solar system, stars, etc.).
   - Responsive design for desktop/tablet.

9. **Extensibility**
   - Document the ship file format for user submissions.
   - Ensure the app can work offline with local ship files (optional: PWA support).

**Verification**
- Load a sample set of ship files and verify correct parsing and rendering of both images and silhouettes.
- Test zoom, pan, and drag interactions for both ships and silhouettes.
- Apply filters and confirm correct highlighting.
- Click ships to open detail popups and check all info/images display.
- Upload a new ship file and verify it appears and is interactive.
- Test silhouette creation, duplication, and movement.
- Test on multiple browsers and devices.

**Decisions**
- Use markdown with YAML frontmatter for ship files (human-readable, easy to edit/export).
- All images are external links; no image hosting required.
- No backend—static site, all logic client-side for simplicity and offline use.
- Use React or Svelte for best balance of interactivity and maintainability.
- Ships are displayed as actual images by default; silhouettes are optional overlays, user-controlled and duplicable.
- In this initial version, use a service for placeholder images and allow users to provide their own image URLs in ship files. Image placeholder service that gives a placeholder image of a given size and color /size/bg/fg, e.g. https://dummyimage.com/160x100/f00/fff .
