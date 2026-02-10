---
name: "ship-file-authoring"
description: "Create valid ship Markdown files for the Starship Dimensions app."
---

# Ship File Authoring Skill

## Purpose
Create valid ship Markdown files for the Starship Dimensions app.

## Steps
1. Create a file in `docs/ships` (for bundled examples) or any local `.md` file for uploads.
2. Add YAML frontmatter wrapped in `---` markers.
3. Include required keys: `name`, `universe`, `lengthMeters`.
4. Prefer adding `images.main`, `tags`, and one `links` entry.
5. Write a markdown description body including key details, lore, or interesting facts about the ship. As well as links to resources and a gallery of images if available.

## Template

```md
---
name: <Ship name>
universe: <Universe>
lengthMeters: <positive number>
heightMeters: <optional number>
tags: [tag-one, tag-two]
images:
  main: https://dummyimage.com/900x220/224/eee&text=<Ship+name>
  gallery:
    - https://dummyimage.com/800x320/223/fff&text=Gallery+1
links:
  - label: Wiki
    url: https://example.com/wiki
---
A markdown description of the ship including key details, lore, or interesting facts about the ship. As well as links to resources and a gallery of images if available.

# Gallery

![Main view](https://dummyimage.com/900x220/224/eee&text=<Ship+name>)
![Gallery Image](https://dummyimage.com/800x320/223/fff&text=Gallery+1)

# Links

- [Wiki](https://example.com/wiki)
```

## Validation checklist
- Frontmatter opens and closes with `---`.
- `lengthMeters` is numeric and greater than zero.
- URLs are valid absolute URLs.
- Arrays use either `[a, b]` or `-` list syntax.
- If `images.main` is missing, `heightMeters` must be provided for correct placeholder aspect ratio.
