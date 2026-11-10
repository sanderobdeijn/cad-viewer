import {
  GeometryPoint2d,
  GeometryPoint2dLike,
  GeometryVector2d
} from '@mlightcad/geometry-engine'

import {
  applicationNewPreviewId,
  applicationPreviewDrawable
} from '../../model/ApplicationItemDrawable'
import {
  type ApplicationItemContents,
  moveItemGrips
} from '../../model/ApplicationItemGeometry'
import { EditorPreviewJig } from '../input/EditorPreviewJig'
import { EditorBaseView } from '../view/EditorBaseView'

/**
 * Shows an item with one grip moved while the grip is dragged.
 */
export class EditorGripPreviewJig extends EditorPreviewJig<GeometryPoint2dLike> {
  private readonly _view: EditorBaseView
  private readonly _source: ApplicationItemContents
  private readonly _gripIndex: number
  private readonly _gripBaseWcs: GeometryPoint2d
  private readonly _previewId = applicationNewPreviewId()
  private _preview: ApplicationItemContents | null = null

  /**
   * @param view - The view to draw the preview in
   * @param item - The item whose grip is dragged
   * @param gripIndex - The index of the dragged grip
   * @param gripBaseWcs - Where the grip started
   */
  constructor(
    view: EditorBaseView,
    item: ApplicationItemContents,
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
  get preview(): ApplicationItemContents | null {
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

  computeOffset(point: GeometryPoint2dLike): GeometryVector2d {
    return new GeometryVector2d(
      point.x - this._gripBaseWcs.x,
      point.y - this._gripBaseWcs.y
    )
  }

  override render(): void {
    if (this._preview) {
      this._view.addTransientEntity(
        applicationPreviewDrawable(this._preview, this._previewId)
      )
    }
  }

  override end(): void {
    this._view.removeTransientEntity(this._previewId)
    this._preview = null
  }
}
