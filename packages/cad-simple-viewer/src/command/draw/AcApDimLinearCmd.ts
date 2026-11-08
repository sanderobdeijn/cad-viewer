import {
  type GeometryDimension,
  GeometryPoint2d,
  GeometryPoint2dLike
} from '@mlightcad/geometry-engine'
import type { AcGiDrawable } from '@mlightcad/graphic-interface'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import { acapPreviewDrawable } from '../../model/AcApItemDrawable'

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

export class AcApDimJig extends AcEdPreviewJig<GeometryPoint2dLike> {
  private _dim: GeometryDimension
  private _drawable: AcGiDrawable

  /**
   * Creates a dimension jig.
   *
   * @param view - The associated view
   */
  constructor(
    view: AcEdBaseView,
    xline1Point: GeometryPoint2dLike,
    xline2Point: GeometryPoint2dLike
  ) {
    super(view)
    this._dim = alignedDimension(xline1Point, xline2Point, xline1Point)
    this._drawable = acapPreviewDrawable({
      kind: 'dimension',
      geometry: this._dim
    })
  }

  get entity(): AcGiDrawable {
    return this._drawable
  }

  update(point: GeometryPoint2dLike) {
    this._dim.points.dimLinePoint.copy(point)
  }
}

/**
 * Command to create one aligned dimension.
 */
export class AcApDimLinearCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const xLine1PointPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.dimlinear.xLine1Point')
    )
    const xLine1PointResult =
      await AcApDocManager.instance.editor.getPoint(xLine1PointPrompt)
    if (xLine1PointResult.status !== AcEdPromptStatus.OK) return
    const xLine1Point = xLine1PointResult.value!

    const xLine2PointPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.dimlinear.xLine2Point')
    )
    xLine2PointPrompt.useBasePoint = true
    const xLine2PointResult =
      await AcApDocManager.instance.editor.getPoint(xLine2PointPrompt)
    if (xLine2PointResult.status !== AcEdPromptStatus.OK) return
    const xLine2Point = xLine2PointResult.value!

    const dimLinePointPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.dimlinear.dimLinePoint')
    )
    dimLinePointPrompt.jig = new AcApDimJig(
      context.view,
      xLine1Point,
      xLine2Point
    )
    const dimLinePointResult =
      await AcApDocManager.instance.editor.getPoint(dimLinePointPrompt)
    if (dimLinePointResult.status !== AcEdPromptStatus.OK) return
    const dimLinePoint = dimLinePointResult.value!

    context.doc.modelSync.addItems({
      kind: 'dimension',
      geometry: alignedDimension(xLine1Point, xLine2Point, dimLinePoint)
    })
  }
}
