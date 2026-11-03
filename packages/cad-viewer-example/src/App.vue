<template>
  <div id="app-root">
    <MlCadViewer
      :base-url="BASE_URL"
      :use-main-thread-draw="useMainThreadDraw"
      @create="onCreate"
    >
      <template #side-panel>
        <textarea
          v-model="editorText"
          class="text-editor"
          aria-label="Text editor"
          spellcheck="false"
          wrap="off"
        />
      </template>
    </MlCadViewer>
  </div>
</template>

<script setup lang="ts">
import {
  AcApDocManager,
  AcApModelSync,
  AcApSettingManager
} from '@mlightcad/cad-simple-viewer'
import { MlCadViewer } from '@mlightcad/cad-viewer'
import { ref } from 'vue'

// Isolate this example's prefs from cad-simple-viewer-example on localhost.
AcApSettingManager.configure({
  storageKey: 'mlightcad.settings.cad-viewer'
})

const BASE_URL = 'https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/'
/** Pass `?worker=1` to render MTEXT in a web worker. */
const useMainThreadDraw = !new URLSearchParams(window.location.search).has(
  'worker'
)

const editorText = ref('')

let shownModelText = ''
let updateScheduled = false

const showModel = (model: { toString(): string }) => {
  updateScheduled = false
  const text = model.toString()
  // Leave the editor alone when the shapes did not change its text.
  if (text !== shownModelText) {
    shownModelText = text
    editorText.value = text
  }
}

const onCreate = () => {
  const modelSync = new AcApModelSync(AcApDocManager.instance)
  showModel(modelSync.model)
  // A file can change many entities in one go, so write once per frame.
  modelSync.events.modelChanged.addEventListener(({ model }) => {
    if (!updateScheduled) {
      updateScheduled = true
      requestAnimationFrame(() => showModel(model))
    }
  })
  exposeForTests()
}

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

.text-editor {
  display: block;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 12px;
  border: 0;
  outline: none;
  resize: none;
  font-family: Consolas, Menlo, Monaco, monospace;
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-primary);
  background: var(--el-bg-color);
}

@media (max-width: 767px) {
  .text-editor {
    border-bottom: 1px solid var(--el-border-color);
  }
}
</style>
