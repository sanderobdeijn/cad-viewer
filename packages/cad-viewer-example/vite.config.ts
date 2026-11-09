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
export default defineConfig(({ command, mode }) => {
  const aliases: Alias[] = []
  const devSourcePackages = [
    'three-renderer',
    'cad-simple-viewer',
    'cad-viewer'
  ]
  if (command === 'serve') {
    aliases.push({
      find: /^@mlightcad\/(three-renderer|cad-simple-viewer|cad-viewer)$/,
      replacement: resolve(__dirname, '../$1/src')
    })
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
          ? devSourcePackages.map(name => `@mlightcad/${name}`)
          : []
    },
    server: {
      fs: {
        allow: [resolve(__dirname, '../..')]
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
