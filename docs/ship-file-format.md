# Ship File Format

Ship files are Markdown documents with YAML frontmatter. They contain structured metadata about each ship along with a markdown description body that can include key details, lore, interesting facts, links to resources, and a gallery of images.

Use this document's embedded example as a generic template. For a realistic upload-ready sample, see [example ship](/docs/example-ship.md).

## Required fields

- `name`: Ship display name.
- `universe`: Franchise/origin.
- `lengthMeters`: Positive number.

## Optional fields

- `heightMeters`: Helps with on-screen aspect ratio. (required if `images.main` is missing)
- `tags`: Array of tags.
- `images.main`: URL for the ship image (placeholder used if missing).
- `images.silhouette`: URL for an optional silhouette overlay image.
- `images.gallery`: Additional image URLs used by the app's structured image gallery UI.
- `links`: Array of `{ label, url }` entries.

## Image rendering behavior

- `images.gallery` in frontmatter populates the dedicated image gallery shown by the app.
- Markdown body images (for example `![caption](url)`) render inline inside the description/wiki body.
- Markdown body images do not automatically get copied into `images.gallery`.

## Example

```md
---
name: Example Cruiser
universe: Exampleverse
lengthMeters: 950
heightMeters: 220 # optional, recommended when main image is missing
tags: [cruiser, capital]
images:
  main: https://dummyimage.com/950x220/223/eee&text=Example+Cruiser
  silhouette: https://dummyimage.com/950x220/111111/777777&text=Silhouette
  gallery:
    - https://dummyimage.com/900x300/345/fff&text=Gallery+1
    - https://dummyimage.com/900x300/456/fff&text=Gallery+2
links:
  - label: Wiki
    url: https://example.com/wiki
---
A wiki-style markdown description of the ship including key details, lore, or interesting facts about the ship. As well as links to resources and a gallery of images if available.

# Gallery

![Main view](https://dummyimage.com/950x220/223/eee&text=Example+Cruiser)
![Gallery Image](https://dummyimage.com/900x300/345/fff&text=Gallery+1)

# Links

- [Wiki](https://example.com/wiki)

```

For a ready-to-upload sample used by this repo, see `docs/example-ship.md`.
For the authoring workflow and validation checklist, see `.agents/skills/ship-file-authoring/SKILL.md`.

## Fleet clustering

Bundled ships are grouped by universe and by optional fleet role so the app can cluster them on the render plane. The folder path is part of the grouping:

```
docs/ships/<universe>/<fleet-group?>/<ship>.md
```

Each universe can define its own fleet groups to match its ships. Ships not placed in a fleet group folder will be clustered by universe.

## More examples

See the [ships directory](/docs/ships) for more examples of ship files and **fleet groups**.

## Agent skill

Use [ship-file-authoring](/.agents/skills/ship-file-authoring/SKILL.md) to generate consistent ship files quickly.
