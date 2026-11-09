import { CommonColor, CommonTransparency } from '@mlightcad/common'
import {
  GeometryCircularArc2d,
  GeometryEllipseArc2d,
  GeometryLine2d,
  GeometryPolyline2d,
  type ModelItem
} from '@mlightcad/geometry-engine'
import {
  type GraphicsInterfaceDrawable,
  type GraphicsInterfaceEntity,
  GraphicsInterfaceLineWeight,
  type GraphicsInterfaceRenderer
} from '@mlightcad/graphic-interface'

import {
  type ApplicationItemContents,
  type ApplicationPointDisplay,
  drawItem,
  itemDirectBatchPrimitive
} from './ApplicationItemGeometry'

/** How points are drawn: as a dot of the default size. */
export const applicationPointDisplay = (): ApplicationPointDisplay => ({
  displayMode: 0,
  displaySize: 0
})

let previewCount = 0

/** Returns a new id for a preview drawn while a command or grip edit runs. */
export function applicationNewPreviewId() {
  return `preview-${++previewCount}`
}

/**
 * Builds a drawable for a preview of item contents, such as a shape being
 * drawn or moved. Previews are drawn as transient objects of the view.
 *
 * @param contents - The kind and geometry to draw
 * @param id - The id of the preview, to replace or remove it later
 */
export function applicationPreviewDrawable(
  contents: ApplicationItemContents,
  id: string = applicationNewPreviewId()
): ApplicationItemDrawable {
  return new ApplicationItemDrawable(
    { ...contents, id } as ModelItem,
    '',
    applicationPointDisplay
  )
}

/** Id of model space, the one layout that items are drawn in. */
export const APPLICATION_MODEL_SPACE_ID = '*MODEL_SPACE'

/** Returns the name of an item's kind, such as `Line` or `AlignedDimension`. */
export function itemTypeName(item: ApplicationItemContents) {
  switch (item.kind) {
    case 'point':
      return 'Point'
    case 'dimension':
      return item.geometry.type
    case 'shape': {
      const shape = item.geometry
      if (shape instanceof GeometryLine2d) return 'Line'
      if (shape instanceof GeometryCircularArc2d) {
        return shape.closed ? 'Circle' : 'Arc'
      }
      if (shape instanceof GeometryEllipseArc2d) return 'Ellipse'
      if (shape instanceof GeometryPolyline2d) return 'Polyline'
      return 'Shape'
    }
  }
}

/**
 * Draws one model item for the view, in the one style every item has: the
 * foreground colour, a continuous line and the default line weight.
 */
export class ApplicationItemDrawable implements GraphicsInterfaceDrawable {
  readonly visibility = true

  /**
   * @param item - The item to draw
   * @param ownerId - Id of the space the item belongs to
   * @param pointDisplay - Returns how points are drawn
   */
  constructor(
    readonly item: ModelItem,
    readonly ownerId: string,
    private readonly pointDisplay: () => ApplicationPointDisplay
  ) {}

  get objectId() {
    return this.item.id
  }

  get type() {
    return itemTypeName(this.item)
  }

  get directBatchPrimitive() {
    return itemDirectBatchPrimitive(this.item, this.pointDisplay())
  }

  worldDraw(renderer: GraphicsInterfaceRenderer): GraphicsInterfaceEntity | undefined {
    const traits = renderer.subEntityTraits
    traits.color = new CommonColor().setForeground()
    traits.lineType = {
      type: 'UserSpecified',
      name: 'Continuous',
      standardFlag: 0,
      description: 'Solid line',
      totalPatternLength: 0
    }
    traits.lineTypeScale = 1
    traits.lineWeight = GraphicsInterfaceLineWeight.ByLineWeightDefault
    traits.transparency = new CommonTransparency()
    traits.drawOrder = 0
    traits.thickness = 0
    const drawable = drawItem(this.item, renderer, this.pointDisplay())
    if (drawable) {
      drawable.objectId = this.objectId
      drawable.ownerId = this.ownerId
    }
    return drawable
  }
}
