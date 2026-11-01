import { existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { examplePeerPackageAliases, exampleRollupOutput } from '../vite-config/pluginRollupOutput'
import {
  LIBREDWG_CONVERTER_PACKAGE,
  LIBREDWG_PARSER_WASM_FILE,
  LIBREDWG_PARSER_WORKER_FILE,
  MTEXT_RENDERER_WORKER_FILE
} from '../../tools/worker-assets.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig(() => {
  const realdwgRoot = resolve(__dirname, '../../../realdwg-web')
  return {
    base: './',
    resolve: {
      alias: examplePeerPackageAliases(__dirname)
    },
    server: {
      // Local pnpm overrides point at sibling realdwg-web packages.
      fs: {
        allow: [resolve(__dirname, '../..'), realdwgRoot]
      },
      watch: {
        // Avoid HMR reloads when realdwg-web rebuilds mid OPENPROF run.
        ignored: ['**/realdwg-web/**']
      }
    },
    build: {
      modulePreload: false,
      minify: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html')
        },
        output: exampleRollupOutput
      }
    },
    plugins: [
      vue(),
      viteStaticCopy({
        targets: [
          {
            src: `./node_modules/@mlightcad/cad-simple-viewer/dist/${MTEXT_RENDERER_WORKER_FILE}`,
            dest: 'workers',
            rename: { stripBase: true }
          }
        ]
      })
    ]
  }
})
