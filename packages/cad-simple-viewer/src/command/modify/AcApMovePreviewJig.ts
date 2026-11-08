import { AcDbEntity } from '@mlightcad/data-model'
import {
  GeometryMatrix3d,
  GeometryPoint2d,
  GeometryPoint2dLike
} from '@mlightcad/geometry-engine'

import { AcEdSelectionTransformPreviewJig } from '../../editor/input/AcEdSelectionPreviewJig'
import { AcEdBaseView } from '../../editor/view/AcEdBaseView'

/**
 * MOVE preview jig.
 *
 * Reuses GPU-resident batched geometry when possible. The legacy transient
 * clone path publishes once and then updates transforms only.
 */
export class AcApMovePreviewJig extends AcEdSelectionTransformPreviewJig<GeometryPoint2dLike> {
  private _basePoint: GeometryPoint2d

  constructor(
    view: AcEdBaseView,
    sourceEntities: AcDbEntity[],
    basePoint: GeometryPoint2dLike
  ) {
    super(view, sourceEntities)
    this._basePoint = new GeometryPoint2d(basePoint)
  }

  protected buildTransforms(point: GeometryPoint2dLike) {
    const displacement = new GeometryPoint2d(
      point.x - this._basePoint.x,
      point.y - this._basePoint.y
    )
    const matrix = new GeometryMatrix3d().makeTranslation(
      displacement.x,
      displacement.y,
      0
    )
    const targets =
      this.previewEntries.length > 0
        ? this.previewEntries
        : [{ entity: { objectId: '' } as AcDbEntity, copyFactor: 1 }]
    return targets.map(entry => ({
      objectId: entry.entity.objectId,
      matrix
    }))
  }
}
