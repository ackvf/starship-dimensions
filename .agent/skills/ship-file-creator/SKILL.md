# ship-file-creator

## Purpose

Create valid starship markdown files for the Starship Dimensions app.

## Workflow

1. Create a `.md` file in `src/lib/ships/data/` for bundled ships, or any local file path for user-upload examples.
2. Add YAML frontmatter with required fields:
   - `name` (string)
   - `universe` (string)
   - `lengthMeters` (positive number)
   - `tags` (non-empty string list)
   - `images.main` (URL)
3. Optionally include:
   - `id`
   - `images.silhouette`
   - `images.gallery`
   - `links` entries `{ label, url }`
4. Add markdown body content below the closing `---` frontmatter line.
5. Validate the file by running app tests/checks, or by uploading the file in the UI and confirming no parse errors.

## Template

```md
---
name: Ship Name
universe: Franchise Name
lengthMeters: 100
tags: [role, class]
images:
  main: https://dummyimage.com/900x300/1e293b/e2e8f0&text=Ship
  silhouette: https://dummyimage.com/900x300/0f172a/ffffff&text=Ship+Silhouette
links:
  - label: Reference
    url: https://example.com
---
Describe the ship here using markdown.
```

## Rules

- Keep frontmatter valid YAML.
- Use URLs for images in upload files.
- Keep `lengthMeters` realistic and positive.
