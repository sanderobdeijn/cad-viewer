import {
  ApplicationDocManager,
  type ApplicationMeasurementRecord,
  clearLayoutMeasurements,
  focusMeasurement,
  getMeasurementValueText,
  getSelectedMeasurementId,
  listLayoutMeasurements,
  subscribeMeasurements,
  subscribeMeasurementSelection
} from '@mlightcad/cad-simple-viewer'
import { onMounted, onUnmounted, ref } from 'vue'

/**
 * Reactive bridge from the measurement store to Vue UI.
 */
export function useMeasurement() {
  const measurements = ref<ApplicationMeasurementRecord[]>([])
  const selectedId = ref<string | undefined>()
  const valueById = ref<Record<string, string>>({})

  const refresh = () => {
    const view = ApplicationDocManager.instance.curView
    const list = view ? listLayoutMeasurements(view) : []
    measurements.value = list
    selectedId.value = getSelectedMeasurementId()
    const values: Record<string, string> = {}
    for (const record of list) {
      values[record.id] = getMeasurementValueText(record.id) || '—'
    }
    valueById.value = values
  }

  let unsubscribeList: (() => void) | undefined
  let unsubscribeSelection: (() => void) | undefined

  onMounted(() => {
    refresh()
    unsubscribeList = subscribeMeasurements(refresh)
    unsubscribeSelection = subscribeMeasurementSelection(refresh)
    ApplicationDocManager.instance.events.documentActivated.addEventListener(refresh)
  })

  onUnmounted(() => {
    unsubscribeList?.()
    unsubscribeSelection?.()
    ApplicationDocManager.instance.events.documentActivated.removeEventListener(
      refresh
    )
  })

  const focus = (record: ApplicationMeasurementRecord) => {
    const view = ApplicationDocManager.instance.curView
    if (!view) return
    focusMeasurement(view, record)
  }

  const clearAll = () => {
    const view = ApplicationDocManager.instance.curView
    if (!view) return
    clearLayoutMeasurements(view)
  }

  return {
    measurements,
    selectedId,
    valueById,
    refresh,
    focus,
    clearAll
  }
}
