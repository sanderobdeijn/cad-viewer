import { AcDbAlignedDimension } from '@mlightcad/data-model'
import { GeometryPoint2dLike } from '@mlightcad/geometry-engine'

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

export class AcApDimJig extends AcEdPreviewJig<GeometryPoint2dLike> {
  private _dim: AcDbAlignedDimension

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
    this._dim = new AcDbAlignedDimension(xline1Point, xline2Point, xline1Point)
    this._dim.rotation = 0
  }

  get entity(): AcDbAlignedDimension {
    return this._dim
  }

  update(point: GeometryPoint2dLike) {
    this._dim.dimLinePoint = point
    this._dim.rotation = this.calculateAngle(
      this._dim.xLine1Point,
      this._dim.xLine2Point
    )
    this._dim.dimensionText = this._dim.xLine1Point
      .distanceTo(this._dim.xLine2Point)
      .toFixed(3)
  }

  private calculateAngle(p1: GeometryPoint2dLike, p2: GeometryPoint2dLike) {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    return Math.atan2(dy, dx)
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

    const dimension = new AcDbAlignedDimension(
      xLine1Point,
      xLine2Point,
      dimLinePoint
    )
    context.doc.modelSync.add(dimension)
  }
}
