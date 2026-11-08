import {
  applicationDrawingFormatter,
  EditorBaseView,
  EditorMouseEventArgs
} from '@mlightcad/cad-simple-viewer'
import { GeometryPoint2d } from '@mlightcad/geometry-engine'
import { computed, onMounted, onUnmounted, ref } from 'vue'

function formatCoordinatePair(x: number, y: number): string {
  return applicationDrawingFormatter().formatPoint2d(new GeometryPoint2d(x, y))
}

export function useCurrentPos(view: EditorBaseView) {
  const x = ref(0)
  const y = ref(0)

  function update(event: EditorMouseEventArgs) {
    x.value = event.x
    y.value = event.y
  }

  onMounted(() => view.events.mouseMove.addEventListener(update))
  onUnmounted(() => view.events.mouseMove.removeEventListener(update))

  const text = computed(() => formatCoordinatePair(x.value, y.value))

  return { x, y, text }
}
