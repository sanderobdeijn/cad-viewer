import type { ModelItem } from '@mlightcad/geometry-engine'
import {
  GeometryMatrix3d,
  GeometryPoint2d,
  GeometryPoint2dLike
} from '@mlightcad/geometry-engine'
import type { AcGiDrawable } from '@mlightcad/graphic-interface'

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
export class AcApCopyPreviewJig extends AcEdSelectionTransformPreviewJig<GeometryPoint2dLike> {
  private _basePoint: GeometryPoint2d
  private _fitMode: boolean

  constructor(
    view: AcEdBaseView,
    sourceEntities: ModelItem[],
    basePoint: GeometryPoint2dLike,
    copyCount = 1,
    fitMode = false
  ) {
    super(view, sourceEntities, Math.max(0, copyCount))
    this._basePoint = new GeometryPoint2d(basePoint)
    this._fitMode = fitMode
  }

  override update(point: GeometryPoint2dLike) {
    const displacement = new GeometryPoint2d(
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

  protected buildTransforms(point: GeometryPoint2dLike) {
    const displacement = new GeometryPoint2d(
      point.x - this._basePoint.x,
      point.y - this._basePoint.y
    )
    const targets =
      this.previewEntries.length > 0
        ? this.previewEntries
        : [{ entity: { objectId: '' } as AcGiDrawable, copyFactor: 1 }]
    return targets.map(entry => {
      const scaled = scaleCopyDisplacement(
        displacement,
        entry.copyFactor,
        this.copyCount,
        this._fitMode
      )
      return {
        objectId: entry.entity.objectId,
        matrix: new GeometryMatrix3d().makeTranslation(scaled.x, scaled.y, 0)
      }
    })
  }
}
