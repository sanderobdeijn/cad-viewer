import {
  GeometryArea2d,
  GeometryCircularArc2d,
  GeometryEllipseArc2d,
  GeometryPoint2d,
  GeometryPoint2dLike
} from '@mlightcad/geometry-engine'

import { GraphicsInterfaceContext } from './GraphicsInterfaceContext'
import { GraphicsInterfaceEntity } from './GraphicsInterfaceEntity'
import { GraphicsInterfacePointStyle } from './GraphicsInterfacePointStyle'
import { GraphicsInterfaceSubEntityTraits } from './GraphicsInterfaceSubEntityTraits'
import { GraphicsInterfaceTextData } from './GraphicsInterfaceText'

export interface GraphicsInterfaceRenderer<T extends GraphicsInterfaceEntity = GraphicsInterfaceEntity> {
  /**
   * The entity traits object gives the user control of, and access to, the attribute
   * (color, linetype, etc.) settings of the current geometry.
   */
  get subEntityTraits(): GraphicsInterfaceSubEntityTraits

  /**
   * Draw-time context for resolving semantic trait colors (for example ACI 7
   * foreground) into pixel RGB values.
   */
  get context(): GraphicsInterfaceContext

  /**
   * Create one group
   * @param entities Input entities to group together
   * @returns Return created group
   */
  group(entities: T[]): T

  /**
   * Draw a point.
   * @param point Input point to draw
   * @param style Input point style applied to point
   * @returns Return an object which can be added to scene
   */
  point(point: GeometryPoint2d, style: GraphicsInterfacePointStyle): T

  /**
   * Draw a circular arc or full circle.
   *
   * Tessellate using {@link GraphicsInterfaceContext.circleSides}.
   *
   * @param arc Input circular arc to draw
   * @returns Return an object which can be added to scene
   */
  circularArc(arc: GeometryCircularArc2d): T

  /**
   * Draw an elliptical arc or full ellipse.
   *
   * Tessellate using {@link GraphicsInterfaceContext.circleSides}.
   *
   * @param ellipseArc Input elliptical arc to draw
   * @returns Return an object which can be added to scene
   */
  ellipticalArc(ellipseArc: GeometryEllipseArc2d): T

  /**
   * Draw lines using gl.LINE_STRIP.
   * @param points Input a point array which contains all line vertices
   * @returns Return an object which can be added to scene
   */
  lines(points: GeometryPoint2dLike[]): T

  /**
   * Draw lines using gl.LINES.
   * @param array Must be a `TypedArray`. Used to instantiate the buffer. This array should have
   * `itemSize * numVertices` elements, where numVertices is the number of vertices.
   * @param itemSize The number of values of the {@link array} that should be associated with a
   * particular vertex. If the vertex is one 2d point, then itemSize should be `2`. If the vertex
   * is one 3d point, then itemSize should be `3`.
   * @param indices Index buffer.
   * @returns Return an object which can be added to scene
   */
  lineSegments(array: Float32Array, itemSize: number, indices: Uint16Array): T

  /**
   * Draw one area
   *
   * Tessellate loop boundaries using {@link GraphicsInterfaceContext.circleSides}.
   *
   * @param area Input area to draw
   * @returns Return an object which can be added to scene
   */
  area(area: GeometryArea2d): T

  /**
   * Draw a closed wide polyline as an index-aligned offset ring.
   *
   * `outer[i]` and `inner[i]` are the two offsets of the same centerline
   * sample. The renderer triangulates that band directly. Callers use this
   * only when both loops are valid and have the same vertex count; a collapsed
   * inner offset still goes through {@link area}.
   *
   * @param outer - Outer boundary in draw order, without a repeated closing vertex
   * @param inner - Inner boundary in the same order and count as `outer`
   * @returns Return an object which can be added to scene
   */
  offsetRing(outer: GeometryPoint2dLike[], inner: GeometryPoint2dLike[]): T

  /**
   * Draw one line of text, centred on its position.
   * @param text Input text and placement to draw
   * @returns Return an object which can be added to scene
   */
  text(text: GraphicsInterfaceTextData): T
}
