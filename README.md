# Starship Dimensions

Interactive SvelteKit app for comparing sci-fi ships at scale.

## Features

- Fleet canvas with pan, zoom, drag, and fit/reset controls.
- Ship silhouettes that can be spawned and dragged independently.
- Real-time filters (universe, tags, and size buckets) with highlight/dim behavior.
- Details modal with gallery images, links, and rendered Markdown description.
- Markdown ship upload flow with frontmatter validation and UI error reporting.

## Ship file documentation

See [SHIP_FILE_FORMAT.md](./SHIP_FILE_FORMAT.md) for the complete format and an example.

## Development

```sh
pnpm install
pnpm dev
```

Then open <http://localhost:5173>.
