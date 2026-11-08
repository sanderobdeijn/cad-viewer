import { CommonColor, CommonTransparency } from '@mlightcad/common'

import { GraphicsInterfaceLineStyle } from './GraphicsInterfaceLineStyle'
import { GraphicsInterfaceLineWeight } from './GraphicsInterfaceLineWeight'

/**
 * Trait settings for a sub‑entity in AutoCAD graphics (corresponding to GraphicsInterfaceSubEntityTraits).
 * These properties define visual attributes like color, line style, layer, thickness, etc.
 */
export interface GraphicsInterfaceSubEntityTraits {
  /**
   * Resolved semantic color of the sub-entity.
   *
   * Use {@link GraphicsInterfaceContext.resolveSubEntityTraitsRgb} with {@link GraphicsInterfaceRenderer.context}
   * to obtain the pixel RGB value at draw time (including ACI 7 foreground handling).
   */
  color: CommonColor

  /**
   * Line type (pattern) used for drawing edges / curves of the entity.
   * Corresponds to AutoCAD's `GraphicsInterfaceLineStyle` (or linetypeTableRecord).
   */
  lineType: GraphicsInterfaceLineStyle

  /**
   * Scale factor applied to the lineType.
   * Changes how dense or stretched the pattern appears. (Equivalent to
   * AutoCAD's "Linetype Scale" / ltScale).
   */
  lineTypeScale: number

  /**
   * Lineweight for the entity's drawing (i.e. the visual thickness of lines).
   * Typically corresponds to one of AutoCAD's predefined lineweights.
   */
  lineWeight: GraphicsInterfaceLineWeight

  /**
   * Transparency of the entity.
   * A numeric value controlling how transparent (or opaque) the entity is when rendered.
   */
  transparency: CommonTransparency

  /**
   * Thickness (extrusion) of the entity along the positive Z axis in WCS units.
   * Only affects certain primitive types (e.g. polylines, arcs, circles, SHX‑text),
   * similarly to AutoCAD's "thickness" property.
   */
  thickness: number

  /**
   * The name of the layer on which the entity resides.
   * Corresponds to AutoCAD layer name (i.e. current layer in drawing).
   */
  layer: string

  /**
   * Explicit render-order tier used when different primitive types
   * share the same Z plane.
   *
   * Lower values render earlier. The default `0` matches normal
   * linework / text. Under-linework fills use `-1` so they stay below
   * outlines and text, while wide polylines keep `0` because they
   * are visually linework even though they are rasterized as meshes.
   */
  drawOrder: number
}
