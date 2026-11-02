import {
  AcDbEntity,
  AcGeMatrix3d,
  AcGePoint2d,
  AcGePoint2dLike
} from '@mlightcad/data-model'

import { AcEdSelectionTransformPreviewJig } from '../../editor/input/AcEdSelectionPreviewJig'
import { AcEdBaseView } from '../../editor/view/AcEdBaseView'

/**
 * MOVE preview jig.
 *
 * Reuses GPU-resident batched geometry when possible. The legacy transient
 * clone path publishes once and then updates transforms only.
 */
export class AcApMovePreviewJig extends AcEdSelectionTransformPreviewJig<AcGePoint2dLike> {
  private _basePoint: AcGePoint2d

  constructor(
    view: AcEdBaseView,
    sourceEntities: AcDbEntity[],
    basePoint: AcGePoint2dLike
  ) {
    super(view, sourceEntities)
    this._basePoint = new AcGePoint2d(basePoint)
  }

  protected buildTransforms(point: AcGePoint2dLike) {
    const displacement = new AcGePoint2d(
      point.x - this._basePoint.x,
      point.y - this._basePoint.y
    )
    const matrix = new AcGeMatrix3d().makeTranslation(
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
