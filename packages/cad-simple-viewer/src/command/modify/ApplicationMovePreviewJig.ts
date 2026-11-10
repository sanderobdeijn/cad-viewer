import type { ModelItem } from '@mlightcad/geometry-engine'
import {
  GeometryMatrix2d,
  GeometryPoint2d,
  GeometryPoint2dLike
} from '@mlightcad/geometry-engine'
import type { GraphicsInterfaceDrawable } from '@mlightcad/graphic-interface'

import { EditorSelectionTransformPreviewJig } from '../../editor/input/EditorSelectionPreviewJig'
import { EditorBaseView } from '../../editor/view/EditorBaseView'

/**
 * MOVE preview jig.
 *
 * Reuses GPU-resident batched geometry when possible. The legacy transient
 * clone path publishes once and then updates transforms only.
 */
export class ApplicationMovePreviewJig extends EditorSelectionTransformPreviewJig<GeometryPoint2dLike> {
  private _basePoint: GeometryPoint2d

  constructor(
    view: EditorBaseView,
    sourceEntities: ModelItem[],
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
    const matrix = new GeometryMatrix2d().makeTranslation(
      displacement.x,
      displacement.y
    )
    const targets =
      this.previewEntries.length > 0
        ? this.previewEntries
        : [
            {
              entity: { objectId: '' } as GraphicsInterfaceDrawable,
              copyFactor: 1
            }
          ]
    return targets.map(entry => ({
      objectId: entry.entity.objectId,
      matrix
    }))
  }
}
