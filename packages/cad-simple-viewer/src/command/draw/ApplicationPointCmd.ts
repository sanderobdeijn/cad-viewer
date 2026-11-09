import { GeometryPoint2d } from '@mlightcad/geometry-engine'

import { ApplicationContext, ApplicationDocManager } from '../../app'
import {
  EditorCommand,
  EditorOpenMode,
  EditorPromptPointOptions,
  EditorPromptStatus
} from '../../editor'
import { ApplicationI18n } from '../../i18n'

/**
 * Command to create point objects continuously.
 *
 * Behavior is aligned with AutoCAD POINT:
 * - Prompt for a point.
 * - Add one point to the drawing immediately after each confirmed point.
 * - Continue prompting until the user cancels the command.
 */
export class ApplicationPointCmd extends EditorCommand {
  constructor() {
    super()
    this.mode = EditorOpenMode.Write
  }

  async execute(context: ApplicationContext) {
    while (true) {
      const pointPrompt = new EditorPromptPointOptions(
        ApplicationI18n.t('jig.point.point')
      )
      const pointResult =
        await ApplicationDocManager.instance.editor.getPoint(pointPrompt)

      if (pointResult.status !== EditorPromptStatus.OK || !pointResult.value) {
        return
      }

      context.doc.modelSync.addItems({
        kind: 'point',
        geometry: new GeometryPoint2d(pointResult.value)
      })
    }
  }
}
