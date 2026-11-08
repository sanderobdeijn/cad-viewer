import { existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { Alias, defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import svgLoader from 'vite-svg-loader'
import { visualizer } from 'rollup-plugin-visualizer'
import vue from '@vitejs/plugin-vue'
import {
  examplePeerPackageAliases,
  exampleRollupOutput
} from '../vite-config/pluginRollupOutput'
import { MTEXT_RENDERER_WORKER_FILE } from '../../tools/worker-assets.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOCAL_UI_COMPONENTS_SRC = resolve(
  __dirname,
  '../../../ui-components/packages/ui-components/src'
)
const LOCAL_UI_COMPONENTS_ROOT = resolve(__dirname, '../../../ui-components')
const LOCAL_MTEXT_RENDERER_ROOT = resolve(
  __dirname,
  '../../../mtext-renderer/packages/mtext-renderer'
)
const LOCAL_MTEXT_RENDERER_DIST = resolve(LOCAL_MTEXT_RENDERER_ROOT, 'dist')
const LOCAL_MTEXT_RENDERER_ENTRY = resolve(
  LOCAL_MTEXT_RENDERER_DIST,
  'index.js'
)
const LOCAL_MTEXT_RENDERER_WORKER = resolve(
  LOCAL_MTEXT_RENDERER_DIST,
  MTEXT_RENDERER_WORKER_FILE
)

function isEnvFlagEnabled(name: string): boolean {
  const flag = process.env[name]
  return flag === '1' || flag?.toLowerCase() === 'true'
}

function useLocalUiComponents(mode: string): boolean {
  return (
    mode === 'local-ui-components' ||
    isEnvFlagEnabled('CAD_VIEWER_USE_LOCAL_UI_COMPONENTS')
  )
}

function useLocalMtextRenderer(mode: string): boolean {
  return (
    mode === 'local-mtext-renderer' ||
    isEnvFlagEnabled('CAD_VIEWER_USE_LOCAL_MTEXT_RENDERER')
  )
}

export default defineConfig(({ command, mode }) => {
  const aliases: Alias[] = []
  const devSourcePackages = [
    'three-renderer',
    'cad-simple-viewer',
    'cad-viewer'
  ]
  const linkLocalUiComponents =
    command === 'serve' &&
    useLocalUiComponents(mode) &&
    existsSync(LOCAL_UI_COMPONENTS_SRC)
  const linkLocalMtextRenderer =
    command === 'serve' &&
    useLocalMtextRenderer(mode) &&
    existsSync(LOCAL_MTEXT_RENDERER_ENTRY)
  if (command === 'serve') {
    aliases.push({
      find: /^@mlightcad\/(three-renderer|cad-simple-viewer|cad-viewer)$/,
      replacement: resolve(__dirname, '../$1/src')
    })
    if (linkLocalMtextRenderer) {
      console.info(
        '[cad-viewer-example] Aliasing @mlightcad/mtext-renderer to local dist:',
        LOCAL_MTEXT_RENDERER_DIST
      )
      aliases.push({
        find: '@mlightcad/mtext-renderer',
        replacement: LOCAL_MTEXT_RENDERER_DIST
      })
    } else if (
      useLocalMtextRenderer(mode) &&
      !existsSync(LOCAL_MTEXT_RENDERER_ENTRY)
    ) {
      console.warn(
        '[cad-viewer-example] Local mtext-renderer alias requested but not found at:',
        LOCAL_MTEXT_RENDERER_ENTRY
      )
    }
    if (linkLocalUiComponents) {
      console.info(
        '[cad-viewer-example] Aliasing @mlightcad/ui-components to local source:',
        LOCAL_UI_COMPONENTS_SRC
      )
      aliases.push({
        find: '@mlightcad/ui-components',
        replacement: LOCAL_UI_COMPONENTS_SRC
      })
    } else if (
      useLocalUiComponents(mode) &&
      !existsSync(LOCAL_UI_COMPONENTS_SRC)
    ) {
      console.warn(
        '[cad-viewer-example] Local ui-components alias requested but not found at:',
        LOCAL_UI_COMPONENTS_SRC
      )
    }
  }

  aliases.push(
    ...examplePeerPackageAliases(__dirname).filter(
      alias =>
        !linkLocalMtextRenderer || alias.find !== '@mlightcad/mtext-renderer'
    )
  )

  const mtextWorkerSrc = linkLocalMtextRenderer
    ? LOCAL_MTEXT_RENDERER_WORKER
    : `./node_modules/@mlightcad/cad-simple-viewer/dist/${MTEXT_RENDERER_WORKER_FILE}`

  const plugins = [
    vue(),
    svgLoader(),
    viteStaticCopy({
      targets: [
        {
          src: mtextWorkerSrc,
          dest: 'assets',
          rename: { stripBase: true }
        }
      ]
    })
  ]

  if (mode === 'analyze') {
    plugins.push(visualizer())
  }

  return {
    base: './',
    resolve: {
      alias: aliases
    },
    optimizeDeps: {
      force: command === 'serve',
      exclude:
        command === 'serve'
          ? [
              ...devSourcePackages.map(name => `@mlightcad/${name}`),
              ...(linkLocalUiComponents ? ['@mlightcad/ui-components'] : []),
              ...(linkLocalMtextRenderer ? ['@mlightcad/mtext-renderer'] : [])
            ]
          : []
    },
    server: {
      fs: {
        allow: [
          resolve(__dirname, '../..'),
          ...(linkLocalUiComponents ? [LOCAL_UI_COMPONENTS_ROOT] : []),
          ...(linkLocalMtextRenderer ? [LOCAL_MTEXT_RENDERER_ROOT] : [])
        ]
      }
    },
    build: {
      outDir: 'dist',
      modulePreload: false,
      minify: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html')
        },
        output: exampleRollupOutput
      }
    },
    plugins: plugins
  }
})
