# Starship Dimensions

Interactive SvelteKit app for comparing fictional starships at relative scale.

## Features

- Fleet canvas with pan + zoom.
- Scale-based ship rendering by `lengthMeters`.
- Draggable silhouettes that can be duplicated per ship.
- Filtering by universe, tags, and ship size range.
- Details modal with images, links, and markdown description.
- Upload `.md` ship files at runtime.

## Ship format

See [Ship File Format](./static/SHIP_FILE_FORMAT.md) for the exact markdown + YAML structure.

## Development

```sh
pnpm install
pnpm dev
```

## Validation

```sh
pnpm check
pnpm test
```
