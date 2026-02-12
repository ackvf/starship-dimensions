# Ship File Format

Ship files are markdown documents with YAML frontmatter.

## Required frontmatter fields

- `name` (string)
- `universe` (string)
- `lengthMeters` (number)
- `tags` (string array)
- `images.main` (URL string)

## Optional frontmatter fields

- `images.silhouette` (URL string)
- `images.gallery` (array of URL strings)
- `links` (array of `{ label, url }` objects)

## Full example

```md
---
name: Example Cruiser
universe: Exampleverse
lengthMeters: 950
tags: [cruiser, capital]
images:
  main: https://dummyimage.com/1200x480/111827/e5e7eb.png&text=Example+Cruiser
  silhouette: https://dummyimage.com/1200x480/020617/e5e7eb.png&text=Silhouette
  gallery:
    - https://dummyimage.com/1200x480/0f172a/e5e7eb.png&text=Gallery+1
links:
  - label: Example Wiki
    url: https://example.com/wiki
---
A markdown description of the ship that is rendered in the details modal.
```

Use external URLs for uploaded files.
