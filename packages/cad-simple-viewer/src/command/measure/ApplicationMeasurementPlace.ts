import type { ThreeRendererView2d } from '../../view'
import { registerMeasurementPublish } from './ApplicationMeasurementRepublish'
import { getSelectedMeasurementId } from './ApplicationMeasurementStore'
import type { ApplicationMeasurementRecord } from './ApplicationMeasurementTypes'
import { newMeasureOverlayId } from './entity/ApplicationMeasureEntity'
import { createMeasureEntityFromRecord } from './entity/ApplicationMeasureEntityFactory'

function newImportedId(prefix: string): string {
  return newMeasureOverlayId(prefix)
}

/**
 * Recreate one measurement overlay from a sidecar record.
 * @returns true when the record was placed.
 */
export function placeMeasurementRecord(
  view: ThreeRendererView2d,
  record: ApplicationMeasurementRecord
): boolean {
  const prefix =
    record.geometry.type === 'distance' ? 'dist' : record.geometry.type
  const placed: ApplicationMeasurementRecord = {
    ...record,
    id: newImportedId(prefix)
  }
  try {
    createMeasureEntityFromRecord(placed).commit(view)
    return true
  } catch {
    return false
  }
}

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
