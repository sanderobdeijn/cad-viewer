# CAD Viewer Example

A Vue 3 demo that embeds [`@mlightcad/cad-viewer`](../cad-viewer/README.md). The app opens straight into a new blank drawing with the full UI: ribbon, command line, palettes and status bar.

## Run it

```bash
pnpm install
pnpm dev
```

Pass `?worker=1` in the URL to render MTEXT in a web worker instead of on the main thread.

## Tests

`e2e/` holds the Playwright tests:

```bash
pnpm test:e2e
```
