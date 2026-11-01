/**
 * Copy web worker assets for packages in this monorepo.
 *
 * Producer (cad-simple-viewer):
 *   node tools/copy-workers.mjs
 *   → copies mtext worker into ./dist
 *   → copies proprietary dwg workers when that package is available
 *   → does NOT copy LibreDWG (GPL) — hosts/examples must depend on
 *     @mlightcad/libredwg-converter and copy those assets themselves
 *
 * Consumer (examples):
 *   node tools/copy-workers.mjs dist/workers
 *   → copies *-worker.js from @mlightcad/cad-simple-viewer/dist
 *   → copies LibreDWG worker + wasm from @mlightcad/libredwg-converter when present
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync
} from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import {
  MTEXT_RENDERER_PACKAGE,
  MTEXT_RENDERER_WORKER_FILE
} from './worker-assets.mjs'

const packageRoot = process.cwd()
const require = createRequire(join(packageRoot, 'package.json'))
const destRelative = process.argv[2]

function pkgRoot(name) {
  const entry = require.resolve(name)
  let dir = dirname(entry)
  while (true) {
    const pkgPath = join(dir, 'package.json')
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
      if (pkg.name === name) {
        return dir
      }
    }
    const parent = dirname(dir)
    if (parent === dir) {
      throw new Error(`Package root not found: ${name}`)
    }
    dir = parent
  }
}

function copy(from, to) {
  if (!existsSync(from)) {
    throw new Error(`Missing asset: ${from}`)
  }
  copyFileSync(from, to)
  console.log(`Copied ${from} -> ${to}`)
}

function copyProducerWorkers() {
  const outDir = join(packageRoot, 'dist')
  mkdirSync(outDir, { recursive: true })
  copy(
    join(pkgRoot(MTEXT_RENDERER_PACKAGE), 'dist', MTEXT_RENDERER_WORKER_FILE),
    join(outDir, MTEXT_RENDERER_WORKER_FILE)
  )
}

function copyFromCadSimpleViewer(destRelativePath) {
  const srcDir = join(pkgRoot('@mlightcad/cad-simple-viewer'), 'dist')
  if (!existsSync(srcDir)) {
    throw new Error(
      `Missing ${srcDir}. Run copy:workers in @mlightcad/cad-simple-viewer first.`
    )
  }

  const workers = readdirSync(srcDir).filter(
    name => name.endsWith('-worker.js')
  )
  if (workers.length === 0) {
    throw new Error(
      `No *-worker.js files in ${srcDir}. Run copy:workers in @mlightcad/cad-simple-viewer first.`
    )
  }

  const outDir = resolve(packageRoot, destRelativePath)
  mkdirSync(outDir, { recursive: true })

  for (const name of workers) {
    copy(join(srcDir, name), join(outDir, name))
  }
}

if (destRelative) {
  copyFromCadSimpleViewer(destRelative)
} else {
  copyProducerWorkers()
}
