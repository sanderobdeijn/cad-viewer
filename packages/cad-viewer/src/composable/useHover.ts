import {
  AcApDocManager,
  AcEdViewHoverEventArgs
} from '@mlightcad/cad-simple-viewer'
import type { ModelItem } from '@mlightcad/geometry-engine'
import { onMounted, onUnmounted, type Ref, ref } from 'vue'

export interface UseHoverResult {
  hovered: Ref<boolean>
  item: Ref<ModelItem | null>
  id: Ref<string | null>
  mouse: Ref<{ x: number; y: number }>
}

/**
 * Composable: useHover
 *
 * Tracks which drawing item is currently hovered in the active view.
 *
 * This composable automatically listens to `hover` and `unhover` events
 * from the `AcApDocManager.instance.curView.events` system in the CAD viewer.
 * It exposes reactive state containing:
 *
 * - The currently hovered model item (`item`)
 * - The hovered item's id (`id`)
 * - The mouse position when hovering (`mouse`)
 * - A boolean indicating if an item is hovered (`hovered`)
 *
 * When the component using this composable unmounts,
 * all event listeners are automatically cleaned up.
 *
 * ---
 * @example
 * ```ts
 * import { useHover } from '@/composables/useHover'
 * import { computed } from 'vue'
 * import { itemTypeName } from '@mlightcad/cad-simple-viewer'
 * import { entityName } from '@/locale'
 *
 * export default {
 *   setup() {
 *     const { hovered, item, mouse } = useHover()
 *
 *     // Example: the kind of the hovered item, for display
 *     const info = computed(() =>
 *       item.value ? { type: entityName(itemTypeName(item.value)) } : null
 *     )
 *
 *     // Example: compute tooltip position
 *     const tooltipStyle = computed(() => ({
 *       left: `${mouse.value.x + 10}px`,
 *       top: `${mouse.value.y + 10}px`
 *     }))
 *
 *     return { hovered, info, tooltipStyle }
 *   }
 * }
 * ```
 *
 * ---
 * @returns {{
 *   hovered: import('vue').Ref<boolean>;
 *   item: import('vue').Ref<ModelItem | null>;
 *   id: import('vue').Ref<string | null>;
 *   mouse: import('vue').Ref<{ x: number; y: number }>;
 * }}
 * Reactive state tracking the current hover context.
 */
export function useHover(): UseHoverResult {
  /** Whether an item is currently hovered */
  const hovered = ref(false)
  /** The hovered model item (null if none) */
  const item = ref<ModelItem | null>(null)
  /** Id of the hovered item */
  const id = ref<string | null>(null)
  /** Current mouse coordinates during hover */
  const mouse = ref({ x: -1, y: -1 })
  /** Handler for CAD viewer hover events */
  const updateHoverEntity = (args: AcEdViewHoverEventArgs) => {
    const view = AcApDocManager.instance.curView
    const hoveredItem = AcApDocManager.instance.curDocument.modelSync.item(
      args.id
    )
    if (hoveredItem) {
      item.value = hoveredItem
      id.value = args.id
      hovered.value = true
      const viewportPos = view.canvasToViewport({ x: args.x, y: args.y })
      mouse.value = { x: viewportPos.x, y: viewportPos.y }
    } else {
      hovered.value = false
      item.value = null
      id.value = null
    }
  }

  /** Clears hover state when the cursor leaves an entity */
  const clearHover = () => {
    hovered.value = false
    item.value = null
    id.value = null
  }

  /** Register event listeners when the component mounts */
  onMounted(() => {
    const events = AcApDocManager.instance.curView.events
    events.hover.addEventListener(updateHoverEntity)
    events.unhover.addEventListener(clearHover)
  })

  /** Unregister event listeners when the component unmounts */
  onUnmounted(() => {
    const events = AcApDocManager.instance.curView.events
    events.hover.removeEventListener(updateHoverEntity)
    events.unhover.removeEventListener(clearHover)
  })

  return {
    hovered,
    // Assert to the imported public type so vue-tsc can emit portable declarations.
    item: item as UseHoverResult['item'],
    id,
    mouse
  }
}
