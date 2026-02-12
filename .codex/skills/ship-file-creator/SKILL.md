# Ship File Creator Skill

## Purpose
Create valid ship definition markdown files for the Starship Dimensions app.

## Steps
1. Create a `.md` file in `src/lib/ships/data/` (for bundled ships) or anywhere local for user uploads.
2. Add YAML frontmatter with required fields:
   - `name`
   - `universe`
   - `lengthMeters`
   - `tags`
3. Optionally add:
   - `id`
   - `images.main`
   - `images.silhouette`
   - `images.gallery`
   - `links` with `label` and `url`
4. Add markdown body content after the closing `---`.
5. Validate by loading the app and checking for parse errors.

## Template

    ---
    name: Ship Name
    universe: Universe Name
    lengthMeters: 1000
    tags: [tag-one, tag-two]
    images:
      main: https://example.com/ship.png
      silhouette: https://example.com/silhouette.png
      gallery:
        - https://example.com/gallery-1.png
    links:
      - label: Wiki
        url: https://example.com/wiki
    ---
    Ship description in markdown.
