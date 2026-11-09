import type { ThreeRendererView2d } from '../../view'
import { registerMeasurementPublish } from './ApplicationMeasurementRepublish'
import { getSelectedMeasurementId } from './ApplicationMeasurementStore'
import type { ApplicationMeasurementRecord } from './ApplicationMeasurementTypes'
import { createMeasureEntityFromRecord } from './entity/ApplicationMeasureEntityFactory'

/**
 * Remove any existing measurement with `record.id` and commit a fresh visual.
 * Used by grip edits.
 */
function publishMeasurementRecord(
  view: ThreeRendererView2d,
  record: ApplicationMeasurementRecord
): void {
  const ht = view.htmlTransientManager
  const restoreSelection = getSelectedMeasurementId() === record.id
  if (ht.has(record.id)) {
    ht.remove(record.id)
  }
  createMeasureEntityFromRecord(record).commit(view)
  if (restoreSelection) {
    ht.selectGroup(record.id)
  }
}

registerMeasurementPublish(publishMeasurementRecord)
