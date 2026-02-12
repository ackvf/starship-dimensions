# Ship File Format

Ship files are Markdown documents with YAML frontmatter. The frontmatter drives the fleet view and details modal, while the Markdown body becomes the long description shown in the modal.

## Required fields

- `name`: ship display name.
- `universe`: franchise or setting name.
- `lengthMeters`: positive number used for scale in the fleet view.
- `tags`: array of strings used by filters.
- `images.main`: external image URL used as the default ship render.

## Optional fields

- `id`: stable ID. If omitted, one is generated from the filename.
- `heightMeters`: positive number for metadata.
- `images.silhouette`: external URL for silhouette overlays.
- `images.gallery`: array of external URLs for detail modal gallery images.
- `links`: array of objects with `label` and `url`.

## Example

```yaml
---
name: Example Cruiser
universe: Exampleverse
lengthMeters: 950
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
```

Use externally hosted image URLs for uploads. Bundled example ships may also use curated images from `static/` if desired.

For a strict authoring workflow for agents, see `.agent/skills/ship-file-authoring.md`.
