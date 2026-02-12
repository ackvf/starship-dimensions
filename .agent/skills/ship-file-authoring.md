# Ship File Authoring Skill

Use this skill when creating or validating a ship Markdown file for the Starship Dimensions app.

## Required frontmatter

Every ship file must include:

- `name` (non-empty string)
- `universe` (non-empty string)
- `lengthMeters` (positive number)
- `tags` (array of non-empty strings)
- `images.main` (non-empty external URL string)

## Optional frontmatter

- `id` (string)
- `heightMeters` (positive number)
- `images.silhouette` (URL string)
- `images.gallery` (array of URL strings)
- `links` (array of `{ label, url }`)

## Body rules

- Place descriptive Markdown content below the closing `---` line.
- Keep descriptions human-readable; this content is rendered in the details modal.

## Template

```md
---
name: Example Cruiser
universe: Exampleverse
lengthMeters: 950
tags: [cruiser, capital]
images:
  main: https://example.com/ship-main.png
  silhouette: https://example.com/ship-silhouette.png
links:
  - label: Wiki
    url: https://example.com/wiki
---
Write the ship description in Markdown here.
```

## Validation checklist

1. Confirm all required fields exist and are typed correctly.
2. Confirm image fields reference external URLs.
3. Confirm `links` entries include both `label` and `url`.
4. Confirm Markdown body exists (can be short, but should not be empty for best UX).
