import {
  GeometryCircularArc2d,
  type GeometryTessellateOptions
} from '@mlightcad/geometry-engine'

import type { GraphicsInterfaceRenderer } from './GraphicsInterfaceRenderer'

/** Segments of a full circle in draft drawing quality. */
export const GRAPHICS_INTERFACE_DRAW_CIRCLE_SIDES_DRAFT = 50
/** Segments of a full circle in standard drawing quality. */
export const GRAPHICS_INTERFACE_DRAW_CIRCLE_SIDES_STANDARD =
  GeometryCircularArc2d.DEFAULT_CIRCLE_SIDES
/** Segments of a full circle in high drawing quality. */
export const GRAPHICS_INTERFACE_DRAW_CIRCLE_SIDES_HIGH = 1000

/**
 * Returns the number of segments a full circle is drawn with in this render
 * context: its `circleSides`, else the `drawCircleSides` of its database,
 * else the standard quality.
 *
 * @param context - The render context, if any
 */
export function graphicsInterfaceDrawCircleSides(context?: {
  circleSides?: number
}): number {
  const sides = context?.circleSides
  return typeof sides === 'number' && Number.isFinite(sides)
    ? GeometryCircularArc2d.resolveCircleSides(sides)
    : GeometryCircularArc2d.DEFAULT_CIRCLE_SIDES
}

/**
 * Returns the options to tessellate curves with when drawing through this
 * renderer.
 *
 * @param renderer - The renderer, if any
 */
export function graphicsInterfaceDrawTessellateOptions(
  renderer?:
    | Pick<GraphicsInterfaceRenderer, 'context'>
    | { context?: { database?: unknown } }
): GeometryTessellateOptions {
  const circleSides = graphicsInterfaceDrawCircleSides(
    renderer?.context as { circleSides?: number; database?: unknown }
  )
  return { circleSides, maxSegments: circleSides }
}
