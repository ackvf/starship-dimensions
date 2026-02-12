# Ship File Format

Ship definitions are Markdown files with YAML frontmatter at the top. Frontmatter powers filters and rendering in the fleet view; the markdown body becomes the ship description shown in the details modal.

## Required fields

- `name` (string)
- `universe` (string)
- `lengthMeters` (number, positive)
- `tags` (array of strings)
- `images.main` (string URL)

## Optional fields

- `id` (string)
- `images.silhouette` (string URL)
- `images.gallery` (array of string URLs)
- `links` (array of `{ label, url }` objects)

## Example

```md
---
name: Example Cruiser
universe: Exampleverse
lengthMeters: 950
tags: [cruiser, capital]
images:
  main: https://dummyimage.com/1600x500/1e293b/e2e8f0&text=Example+Cruiser
  silhouette: https://dummyimage.com/1600x500/0f172a/ffffff&text=Cruiser+Silhouette
  gallery:
    - https://dummyimage.com/1280x720/334155/f8fafc&text=Bridge
links:
  - label: Wiki
    url: https://example.com/wiki
---
A markdown description for this ship.
```

## Upload notes

- Upload `.md` or `.markdown` files through the control panel.
- Uploaded ships are session-only and are cleared on page reload.
- User-uploaded image URLs should be externally accessible.

For agents, see `.agent/skills/ship-file-creator/SKILL.md` for a repeatable ship-authoring workflow.
