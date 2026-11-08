import { GeometryPoint2d } from '@mlightcad/geometry-engine'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'

/**
 * Command to create point objects continuously.
 *
 * Behavior is aligned with AutoCAD POINT:
 * - Prompt for a point.
 * - Add one point to the drawing immediately after each confirmed point.
 * - Continue prompting until the user cancels the command.
 * - Point display is controlled by the current `PDMODE` and `PDSIZE`.
 */
export class AcApPointCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    while (true) {
      const pointPrompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.point.point')
      )
      const pointResult =
        await AcApDocManager.instance.editor.getPoint(pointPrompt)

      if (pointResult.status !== AcEdPromptStatus.OK || !pointResult.value) {
        return
      }

      context.doc.modelSync.addItems({
        kind: 'point',
        geometry: new GeometryPoint2d(pointResult.value)
      })
    }
  }
}
