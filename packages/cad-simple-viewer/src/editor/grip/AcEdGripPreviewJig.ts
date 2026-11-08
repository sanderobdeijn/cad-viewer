import {
  GeometryPoint2d,
  GeometryPoint2dLike,
  GeometryVector3d
} from '@mlightcad/geometry-engine'

import {
  acapNewPreviewId,
  acapPreviewDrawable
} from '../../model/AcApItemDrawable'
import {
  type AcApItemContents,
  moveItemGrips
} from '../../model/AcApItemGeometry'
import { AcEdPreviewJig } from '../input/AcEdPreviewJig'
import { AcEdBaseView } from '../view/AcEdBaseView'

/**
 * Shows an item with one grip moved while the grip is dragged.
 */
export class AcEdGripPreviewJig extends AcEdPreviewJig<GeometryPoint2dLike> {
  private readonly _view: AcEdBaseView
  private readonly _source: AcApItemContents
  private readonly _gripIndex: number
  private readonly _gripBaseWcs: GeometryPoint2d
  private readonly _previewId = acapNewPreviewId()
  private _preview: AcApItemContents | null = null

  /**
   * @param view - The view to draw the preview in
   * @param item - The item whose grip is dragged
   * @param gripIndex - The index of the dragged grip
   * @param gripBaseWcs - Where the grip started
   */
  constructor(
    view: AcEdBaseView,
    item: AcApItemContents,
    gripIndex: number,
    gripBaseWcs: GeometryPoint2dLike
  ) {
    super(view)
    this._view = view
    this._source = item
    this._gripIndex = gripIndex
    this._gripBaseWcs = new GeometryPoint2d(gripBaseWcs)
  }

  /** The item as it looks with the grip moved, if the cursor has moved. */
  get preview(): AcApItemContents | null {
    return this._preview
  }

  update(point: GeometryPoint2dLike) {
    this._view.removeTransientEntity(this._previewId)
    this._preview = moveItemGrips(
      this._source,
      [this._gripIndex],
      this.computeOffset(point)
    )
  }

  computeOffset(point: GeometryPoint2dLike): GeometryVector3d {
    return new GeometryVector3d(
      point.x - this._gripBaseWcs.x,
      point.y - this._gripBaseWcs.y,
      0
    )
  }

  override render(): void {
    if (this._preview) {
      this._view.addTransientEntity(
        acapPreviewDrawable(this._preview, this._previewId)
      )
    }
  }

  override end(): void {
    this._view.removeTransientEntity(this._previewId)
    this._preview = null
  }
}
