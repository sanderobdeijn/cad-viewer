#!/usr/bin/env node
/**
 * Assembles the static Pages site in `pages/` from the built viewer and, when
 * present, the VitePress user guide. Run after `pnpm build` and `pnpm docs:build`.
 */
import { cp, mkdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const output = resolve(root, 'pages')
const viewerDist = resolve(root, 'packages/cad-viewer-example/dist')
const docsDist = resolve(root, 'docs/.vitepress/dist')

async function exists(path) {
  return stat(path).then(
    () => true,
    () => false
  )
}

if (!(await exists(viewerDist))) {
  console.error(`Missing ${viewerDist}. Run "pnpm build" first.`)
  process.exit(1)
}

await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })
await cp(viewerDist, resolve(output, 'cad-viewer'), { recursive: true })
if (await exists(docsDist)) {
  await cp(docsDist, resolve(output, 'docs'), { recursive: true })
}
await writeFile(
  resolve(output, 'index.html'),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>CAD Viewer</title>
    <meta http-equiv="refresh" content="0; url=./cad-viewer/" />
  </head>
  <body>
    <a href="./cad-viewer/">Open CAD Viewer</a>
  </body>
</html>
`
)
console.log(`Pages site written to ${output}`)
