import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import { defineConfig, PluginOption } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    lib: {
      entry: 'src/index.ts',
      name: 'three-renderer',
      fileName: 'index'
    },
    minify: true,
    rollupOptions: {
      // A regular dependency; leave it for the app's bundler to resolve.
      external: ['troika-three-text']
    }
  },
  plugins: [peerDepsExternal() as PluginOption]
})
