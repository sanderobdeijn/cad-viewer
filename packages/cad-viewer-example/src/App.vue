<template>
  <div id="app-root">
    <MlCadViewer
      :base-url="BASE_URL"
      :use-main-thread-draw="useMainThreadDraw"
      @create="onCreate"
    >
      <template #side-panel>
        <div class="text-editor-pane">
          <textarea
            v-model="editorText"
            class="text-editor"
            aria-label="Text editor"
            :aria-invalid="editorError !== ''"
            spellcheck="false"
            wrap="off"
            @input="scheduleApply"
            @blur="onEditorBlur"
          />
          <div v-if="editorError" class="text-editor-error" role="alert">
            {{ editorError }}
          </div>
        </div>
      </template>
    </MlCadViewer>
  </div>
</template>

<script setup lang="ts">
import {
  AcApDocManager,
  type AcApModelSync,
  AcApSettingManager
} from '@mlightcad/cad-simple-viewer'
import { MlCadViewer } from '@mlightcad/cad-viewer'
import { ref } from 'vue'

// Keep this example's prefs under its own storage key on localhost.
AcApSettingManager.configure({
  storageKey: 'mlightcad.settings.cad-viewer'
})

const BASE_URL = 'https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/'
/** Pass `?worker=1` to render MTEXT in a web worker. */
const useMainThreadDraw = !new URLSearchParams(window.location.search).has(
  'worker'
)

/** How long typing must pause before the text is applied to the drawing. */
const APPLY_DELAY_MS = 300

const editorText = ref('')
const editorError = ref('')

let modelSync: AcApModelSync | undefined
let shownModelText = ''
let updateScheduled = false
let applyTimer: ReturnType<typeof setTimeout> | undefined

const cancelApply = () => {
  clearTimeout(applyTimer)
  applyTimer = undefined
}

const showModel = (model: { toString(): string }) => {
  updateScheduled = false
  const text = model.toString()
  // Leave the editor alone when the shapes did not change its text.
  if (text !== shownModelText) {
    cancelApply()
    shownModelText = text
    editorText.value = text
    editorError.value = ''
  }
}

const applyEditorText = () => {
  cancelApply()
  try {
    modelSync?.applyText(editorText.value)
    // The text already matches, so the update this causes must not rewrite it.
    shownModelText = modelSync?.model.toString() ?? ''
    editorError.value = ''
  } catch (error) {
    editorError.value = error instanceof Error ? error.message : String(error)
  }
}

const scheduleApply = () => {
  cancelApply()
  applyTimer = setTimeout(applyEditorText, APPLY_DELAY_MS)
}

const onEditorBlur = () => {
  if (applyTimer !== undefined) {
    applyEditorText()
  }
  // Tidy spacing and order once the user has finished typing.
  if (!editorError.value) {
    editorText.value = shownModelText
  }
}

// A file can change many entities in one go, so write once per frame.
const onModelChanged = ({ model }: { model: { toString(): string } }) => {
  if (!updateScheduled) {
    updateScheduled = true
    requestAnimationFrame(() => showModel(model))
  }
}

/** Shows the model of the document on screen and follows its changes. */
const followActiveDocument = () => {
  modelSync?.events.modelChanged.removeEventListener(onModelChanged)
  modelSync = AcApDocManager.instance.curDocument.modelSync
  modelSync.events.modelChanged.addEventListener(onModelChanged)
  showModel(modelSync.model)
}

const onCreate = () => {
  followActiveDocument()
  AcApDocManager.instance.events.documentActivated.addEventListener(
    followActiveDocument
  )
  exposeForTests()
}

const exposeForTests = () => {
  if (import.meta.env.DEV) {
    const testWindow = window as Window & {
      AcApDocManager?: typeof AcApDocManager
      AcApSettingManager?: typeof AcApSettingManager
    }
    testWindow.AcApDocManager = AcApDocManager
    testWindow.AcApSettingManager = AcApSettingManager
  }
}
</script>

<style scoped>
#app-root {
  height: 100vh;
  position: fixed;
}

.text-editor-pane {
  position: relative;
  height: 100%;
}

.text-editor-error {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 6px 12px;
  font-size: 12px;
  color: #fff;
  background: var(--el-color-danger-dark-2);
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
