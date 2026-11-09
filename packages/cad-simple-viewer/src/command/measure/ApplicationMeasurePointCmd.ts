import { GeometryPoint2dLike } from '@mlightcad/geometry-engine'

import { ApplicationContext } from '../../app'
import { EditorPromptPointOptions, EditorPromptStatus } from '../../editor'
import { ApplicationI18n } from '../../i18n'
import {
  applicationGetCurrentMeasurementStyle,
  type ApplicationMeasurementStyle
} from '../../util'
import { ThreeRendererView2d } from '../../view'
import { ApplicationMeasureDrawCmd } from './ApplicationMeasureDrawCmd'
import { ApplicationMeasurePointEntity } from './entity'

/**
 * Commit a coordinate measurement overlay.
 */
export function placePointMeasurement(
  view: ThreeRendererView2d,
  point: GeometryPoint2dLike,
  style: ApplicationMeasurementStyle,
  options?: { id?: string; layoutId?: string }
): void {
  ApplicationMeasurePointEntity.create(point, style, options).commit(view)
}

/**
 * Command that measures the world X/Y coordinates of a picked point.
 *
 * Prompts the user to pick one world point, then places a persistent dot and
 * coordinate badge via {@link ThreeRendererHtmlTransientManager}. The overlays are
 * cleared by {@link commitMeasurementGroup}.
 */
export class ApplicationMeasurePointCmd extends ApplicationMeasureDrawCmd {
  async execute(context: ApplicationContext) {
    const editor = context.view.editor

    await this.withMeasureInput(context, async () => {
      const pointPrompt = new EditorPromptPointOptions(
        ApplicationI18n.t('jig.measurePoint.point')
      )
      const pointResult = await editor.getPoint(pointPrompt)
      if (pointResult.status !== EditorPromptStatus.OK) return
      const point = pointResult.value!
      placePointMeasurement(
        context.view as ThreeRendererView2d,
        point,
        applicationGetCurrentMeasurementStyle()
      )
    })
  }
}
