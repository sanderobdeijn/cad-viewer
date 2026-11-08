import { ApplicationContext } from '../../app'
import { EditorCommand, EditorOpenMode } from '../../editor'
import { ThreeRendererView2d } from '../../view'
import {
  MEASUREMENT_LAYER,
  MEASUREMENT_LIVE_LAYER,
  runMeasurementEdit
} from './ApplicationMeasurementStore'

export {
  MEASUREMENT_LAYER,
  MEASUREMENT_LIVE_LAYER,
  commitMeasurementGroup,
  type ApplicationMeasurementGroupExtras
} from './ApplicationMeasurementStore'

/**
 * Removes committed measurement overlays on the active layout and disposes live
 * jig overlays.
 */
export function clearLayoutMeasurements(view: ThreeRendererView2d): void {
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
export class ApplicationClearMeasurementsCmd extends EditorCommand {
  constructor() {
    super()
    this.mode = EditorOpenMode.Read
  }

  async execute(context: ApplicationContext) {
    clearLayoutMeasurements(context.view as ThreeRendererView2d)
  }
}
