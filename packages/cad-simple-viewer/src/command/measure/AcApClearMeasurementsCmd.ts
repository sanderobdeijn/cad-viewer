import { AcApContext } from '../../app'
import { AcEdCommand, AcEdOpenMode } from '../../editor'
import { AcTrView2d } from '../../view'
import {
  MEASUREMENT_LAYER,
  MEASUREMENT_LIVE_LAYER,
  runMeasurementEdit
} from './AcApMeasurementStore'

export {
  MEASUREMENT_LAYER,
  MEASUREMENT_LIVE_LAYER,
  commitMeasurementGroup,
  type AcApMeasurementGroupExtras
} from './AcApMeasurementStore'

/**
 * Removes committed measurement overlays on the active layout and disposes live
 * jig overlays.
 */
export function clearLayoutMeasurements(view: AcTrView2d): void {
  const ht = view.htmlTransientManager
  const layoutId = view.activeLayoutBtrId
  runMeasurementEdit(() => {
    ht.deselectAll()
    for (const group of ht.groupsOnLayer(MEASUREMENT_LAYER)) {
      if (group.layoutId == null || group.layoutId === layoutId) {
        ht.remove(group.id)
      }
    }
  })
  ht.clear(MEASUREMENT_LIVE_LAYER)
  view.isHtmlDirty = true
}

/**
 * Command that clears committed measurement overlays on the current layout.
 */
export class AcApClearMeasurementsCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  async execute(context: AcApContext) {
    clearLayoutMeasurements(context.view as AcTrView2d)
  }
}
