import {
  AcDbEntity,
  AcGeMatrix3d,
  AcGePoint2d,
  AcGePoint2dLike
} from '@mlightcad/data-model'

import { scaleCopyDisplacement } from '../../editor/input/AcEdBatchPreview'
import { AcEdSelectionTransformPreviewJig } from '../../editor/input/AcEdSelectionPreviewJig'
import { AcEdBaseView } from '../../editor/view/AcEdBaseView'

/**
 * COPY preview jig.
 *
 * Reuses GPU-resident batched geometry when possible. Array previews create one
 * overlay per copy placement, each with its own translation matrix. The legacy
 * transient clone path publishes once and then updates transforms only.
 */
export class AcApCopyPreviewJig extends AcEdSelectionTransformPreviewJig<AcGePoint2dLike> {
  private _basePoint: AcGePoint2d
  private _fitMode: boolean

  constructor(
    view: AcEdBaseView,
    sourceEntities: AcDbEntity[],
    basePoint: AcGePoint2dLike,
    copyCount = 1,
    fitMode = false
  ) {
    super(view, sourceEntities, Math.max(0, copyCount))
    this._basePoint = new AcGePoint2d(basePoint)
    this._fitMode = fitMode
  }

  override update(point: AcGePoint2dLike) {
    const displacement = new AcGePoint2d(
      point.x - this._basePoint.x,
      point.y - this._basePoint.y
    )

    if (this.batchPreview.useBatchPreview && this.copyCount > 1) {
      this.batchPreview.updatePlacements(
        this._view,
        displacement,
        this._fitMode
      )
      return
    }

    super.update(point)
  }

  protected buildTransforms(point: AcGePoint2dLike) {
    const displacement = new AcGePoint2d(
      point.x - this._basePoint.x,
      point.y - this._basePoint.y
    )
    const targets =
      this.previewEntries.length > 0
        ? this.previewEntries
        : [{ entity: { objectId: '' } as AcDbEntity, copyFactor: 1 }]
    return targets.map(entry => {
      const scaled = scaleCopyDisplacement(
        displacement,
        entry.copyFactor,
        this.copyCount,
        this._fitMode
      )
      return {
        objectId: entry.entity.objectId,
        matrix: new AcGeMatrix3d().makeTranslation(scaled.x, scaled.y, 0)
      }
    })
  }
}
