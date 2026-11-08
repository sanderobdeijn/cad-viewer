import {
  ApplicationDocManager,
  EditorSelectionEventArgs
} from '@mlightcad/cad-simple-viewer'
import { onMounted, onUnmounted, ref } from 'vue'

export function useSelectionSet() {
  const selectionSet = ref<string[]>([])
  const added = ref<string[]>([])
  const removed = ref<string[]>([])

  const selectionAdded = (args: EditorSelectionEventArgs) => {
    added.value = args.ids
    selectionSet.value = ApplicationDocManager.instance.curView.selectionSet.ids
  }

  const selectionRemoved = (args: EditorSelectionEventArgs) => {
    removed.value = args.ids
    selectionSet.value = ApplicationDocManager.instance.curView.selectionSet.ids
  }

  /** Register event listeners when the component mounts */
  onMounted(() => {
    const events = ApplicationDocManager.instance.curView.selectionSet.events
    events.selectionAdded.addEventListener(selectionAdded)
    events.selectionRemoved.addEventListener(selectionRemoved)
  })

  /** Unregister event listeners when the component unmounts */
  onUnmounted(() => {
    const events = ApplicationDocManager.instance.curView.selectionSet.events
    events.selectionAdded.removeEventListener(selectionAdded)
    events.selectionRemoved.removeEventListener(selectionRemoved)
  })

  return {
    selectionSet,
    added,
    removed
  }
}
