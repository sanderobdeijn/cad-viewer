<template>
  <div id="app-root">
    <MlCadViewer
      locale="default"
      :base-url="BASE_URL"
      :use-main-thread-draw="useMainThreadDraw"
      @create="exposeForTests"
    />
  </div>
</template>

<script setup lang="ts">
import {
  AcApDocManager,
  AcApSettingManager
} from '@mlightcad/cad-simple-viewer'
import { MlCadViewer } from '@mlightcad/cad-viewer'


// Isolate this example's prefs from cad-simple-viewer-example on localhost.
AcApSettingManager.configure({
  storageKey: 'mlightcad.settings.cad-viewer'
})

const BASE_URL = 'https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/'
/** Pass `?worker=1` to render MTEXT in a web worker. */
const useMainThreadDraw = !new URLSearchParams(window.location.search).has(
  'worker'
)

const exposeForTests = () => {
  if (import.meta.env.DEV) {
    ;(
      window as Window & { AcApDocManager?: typeof AcApDocManager }
    ).AcApDocManager = AcApDocManager
  }
}
</script>

<style scoped>
#app-root {
  height: 100vh;
  position: fixed;
}
</style>
