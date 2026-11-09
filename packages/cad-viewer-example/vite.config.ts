import { existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { Alias, defineConfig } from 'vite'
import svgLoader from 'vite-svg-loader'
import { visualizer } from 'rollup-plugin-visualizer'
import vue from '@vitejs/plugin-vue'
import {
  examplePeerPackageAliases,
  exampleRollupOutput
} from '../vite-config/pluginRollupOutput'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOCAL_UI_COMPONENTS_SRC = resolve(
  __dirname,
  '../../../ui-components/packages/ui-components/src'
)
const LOCAL_UI_COMPONENTS_ROOT = resolve(__dirname, '../../../ui-components')

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
  if (command === 'serve') {
    aliases.push({
      find: /^@mlightcad\/(three-renderer|cad-simple-viewer|cad-viewer)$/,
      replacement: resolve(__dirname, '../$1/src')
    })
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

  aliases.push(...examplePeerPackageAliases(__dirname))

  const plugins = [vue(), svgLoader()]

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
              ...(linkLocalUiComponents ? ['@mlightcad/ui-components'] : [])
            ]
          : []
    },
    server: {
      fs: {
        allow: [
          resolve(__dirname, '../..'),
          ...(linkLocalUiComponents ? [LOCAL_UI_COMPONENTS_ROOT] : [])
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
