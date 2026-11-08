import { AcDbEntity } from '@mlightcad/data-model'
import {
  GeometryPoint2d,
  GeometryPoint2dLike,
  GeometryVector3d
} from '@mlightcad/geometry-engine'

import { AcEdPreviewJig } from '../input/AcEdPreviewJig'
import { AcEdBaseView } from '../view/AcEdBaseView'

/**
 * Preview jig that applies {@link AcDbEntity.subMoveGripPointsAt} on a clone
 * while the user drags a grip handle.
 */
export class AcEdGripPreviewJig extends AcEdPreviewJig<GeometryPoint2dLike> {
  private readonly _view: AcEdBaseView
  private readonly _sourceClone: AcDbEntity
  private readonly _gripIndex: number
  private readonly _gripBaseWcs: GeometryPoint2d
  private _previewEntity: AcDbEntity | null = null

  constructor(
    view: AcEdBaseView,
    entity: AcDbEntity,
    gripIndex: number,
    gripBaseWcs: GeometryPoint2dLike
  ) {
    super(view)
    this._view = view
    const sourceClone = entity.clone()
    if (!sourceClone) {
      throw new Error('Failed to clone entity for grip preview.')
    }
    this._sourceClone = sourceClone
    this._gripIndex = gripIndex
    this._gripBaseWcs = new GeometryPoint2d(gripBaseWcs)
  }

  get entity(): AcDbEntity | null {
    return this._previewEntity
  }

  update(point: GeometryPoint2dLike) {
    if (this._previewEntity) {
      this._view.removeTransientEntity(this._previewEntity.objectId)
      this._previewEntity = null
    }

    const preview = this._sourceClone.clone()
    if (!preview) return

    preview.subMoveGripPointsAt([this._gripIndex], this.computeOffset(point))
    this._previewEntity = preview
  }

  computeOffset(point: GeometryPoint2dLike): GeometryVector3d {
    return new GeometryVector3d(
      point.x - this._gripBaseWcs.x,
      point.y - this._gripBaseWcs.y,
      0
    )
  }

  override render(): void {
    if (this._previewEntity) {
      this._view.addTransientEntity(this._previewEntity)
    }
  }

  override end(): void {
    if (this._previewEntity) {
      this._view.removeTransientEntity(this._previewEntity.objectId)
      this._previewEntity = null
    }
  }
}
