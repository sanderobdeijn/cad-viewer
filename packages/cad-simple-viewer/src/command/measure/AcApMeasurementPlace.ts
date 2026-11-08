import type { AcTrView2d } from '../../view'
import { registerMeasurementPublish } from './AcApMeasurementRepublish'
import { getSelectedMeasurementId } from './AcApMeasurementStore'
import type { AcApMeasurementRecord } from './AcApMeasurementTypes'
import { newMeasureOverlayId } from './entity/AcApMeasureEntity'
import { createMeasureEntityFromRecord } from './entity/AcApMeasureEntityFactory'

function newImportedId(prefix: string): string {
  return newMeasureOverlayId(prefix)
}

/**
 * Recreate one measurement overlay from a sidecar record.
 * @returns true when the record was placed.
 */
export function placeMeasurementRecord(
  view: AcTrView2d,
  record: AcApMeasurementRecord
): boolean {
  const prefix =
    record.geometry.type === 'distance' ? 'dist' : record.geometry.type
  const placed: AcApMeasurementRecord = {
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
  view: AcTrView2d,
  record: AcApMeasurementRecord
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
