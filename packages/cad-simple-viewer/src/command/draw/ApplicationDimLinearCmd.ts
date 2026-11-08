import {
  type GeometryDimension,
  GeometryPoint2d,
  GeometryPoint2dLike
} from '@mlightcad/geometry-engine'
import type { GraphicsInterfaceDrawable } from '@mlightcad/graphic-interface'

import { ApplicationContext, ApplicationDocManager } from '../../app'
import {
  EditorBaseView,
  EditorCommand,
  EditorOpenMode,
  EditorPreviewJig,
  EditorPromptPointOptions,
  EditorPromptStatus
} from '../../editor'
import { ApplicationI18n } from '../../i18n'
import { applicationPreviewDrawable } from '../../model/ApplicationItemDrawable'

/**
 * Returns an aligned dimension between two points, labelled with their
 * distance.
 */
function alignedDimension(
  xLine1Point: GeometryPoint2dLike,
  xLine2Point: GeometryPoint2dLike,
  dimLinePoint: GeometryPoint2dLike
): GeometryDimension {
  const first = new GeometryPoint2d(xLine1Point)
  const second = new GeometryPoint2d(xLine2Point)
  return {
    type: 'AlignedDimension',
    points: {
      xLine1Point: first,
      xLine2Point: second,
      dimLinePoint: new GeometryPoint2d(dimLinePoint)
    },
    text: first.distanceTo(second).toFixed(3)
  }
}

export class ApplicationDimJig extends EditorPreviewJig<GeometryPoint2dLike> {
  private _dim: GeometryDimension
  private _drawable: GraphicsInterfaceDrawable

  /**
   * Creates a dimension jig.
   *
   * @param view - The associated view
   */
  constructor(
    view: EditorBaseView,
    xline1Point: GeometryPoint2dLike,
    xline2Point: GeometryPoint2dLike
  ) {
    super(view)
    this._dim = alignedDimension(xline1Point, xline2Point, xline1Point)
    this._drawable = applicationPreviewDrawable({
      kind: 'dimension',
      geometry: this._dim
    })
  }

  get entity(): GraphicsInterfaceDrawable {
    return this._drawable
  }

  update(point: GeometryPoint2dLike) {
    this._dim.points.dimLinePoint.copy(point)
  }
}

/**
 * Command to create one aligned dimension.
 */
export class ApplicationDimLinearCmd extends EditorCommand {
  constructor() {
    super()
    this.mode = EditorOpenMode.Write
  }

  async execute(context: ApplicationContext) {
    const xLine1PointPrompt = new EditorPromptPointOptions(
      ApplicationI18n.t('jig.dimlinear.xLine1Point')
    )
    const xLine1PointResult =
      await ApplicationDocManager.instance.editor.getPoint(xLine1PointPrompt)
    if (xLine1PointResult.status !== EditorPromptStatus.OK) return
    const xLine1Point = xLine1PointResult.value!

    const xLine2PointPrompt = new EditorPromptPointOptions(
      ApplicationI18n.t('jig.dimlinear.xLine2Point')
    )
    xLine2PointPrompt.useBasePoint = true
    const xLine2PointResult =
      await ApplicationDocManager.instance.editor.getPoint(xLine2PointPrompt)
    if (xLine2PointResult.status !== EditorPromptStatus.OK) return
    const xLine2Point = xLine2PointResult.value!

    const dimLinePointPrompt = new EditorPromptPointOptions(
      ApplicationI18n.t('jig.dimlinear.dimLinePoint')
    )
    dimLinePointPrompt.jig = new ApplicationDimJig(
      context.view,
      xLine1Point,
      xLine2Point
    )
    const dimLinePointResult =
      await ApplicationDocManager.instance.editor.getPoint(dimLinePointPrompt)
    if (dimLinePointResult.status !== EditorPromptStatus.OK) return
    const dimLinePoint = dimLinePointResult.value!

    context.doc.modelSync.addItems({
      kind: 'dimension',
      geometry: alignedDimension(xLine1Point, xLine2Point, dimLinePoint)
    })
  }
}
