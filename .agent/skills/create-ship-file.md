# Ship File Creation Skill

## Purpose
Create valid starship markdown files for this repository so they can be parsed by `src/lib/ships/parseShip.ts` and rendered by the app.

## Steps
1. Create a `.md` file.
2. Add YAML frontmatter with required fields:
   - `name`
   - `universe`
   - `lengthMeters` (positive number)
   - `tags` (non-empty array of strings)
   - `images.main` (absolute `http(s)` URL, or a `/` static path for bundled files)
3. Optionally add:
   - `images.silhouette`
   - `images.gallery`
   - `links` with `{ label, url }`
4. Add a markdown body description after the closing `---`.
5. Validate by running `pnpm test` and opening the app.

## Example

```md
---
name: Example Corvette
universe: Exampleverse
lengthMeters: 220
tags: [corvette, escort]
images:
  main: https://dummyimage.com/1200x480/111827/e5e7eb.png&text=Example+Corvette
  silhouette: https://dummyimage.com/1200x480/020617/e5e7eb.png&text=Corvette+Silhouette
links:
  - label: Example Wiki
    url: https://example.com/corvette
---
Fast escort vessel used for patrol and screening.
```
