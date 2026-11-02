import { GeometryPolyline2d } from '../geometry/GeometryPolyline2d'
import {
  geometryOffsetPolyline2d,
  geometryPreparePolylineForOffset
} from '../geometry/GeometryPolyline2dOffset'
import {
  GeometryPoint2d,
  GeometryPoint2dLike,
  GeometryVector2dLike
} from '../math'
import { GeometryTol } from './GeometryTol'

/**
 * Offsets a point perpendicular to the XY projection of a direction vector.
 *
 * @param point - Base point to translate
 * @param direction - Direction whose XY component defines the offset normal
 * @param offsetDist - Signed offset distance in drawing units
 * @returns Translated point, or `null` when the XY direction is degenerate
 */
export function geometryOffsetPointByDirectionInXY(
  point: GeometryPoint2dLike,
  direction: GeometryVector2dLike,
  offsetDist: number
): GeometryPoint2d | null {
  const len = Math.hypot(direction.x, direction.y)
  if (GeometryTol.isNonPositive(len)) return null
  const nx = (-direction.y / len) * offsetDist
  const ny = (direction.x / len) * offsetDist
  return new GeometryPoint2d(point.x + nx, point.y + ny)
}

/**
 * Offsets a planar vertex path in the XY plane.
 *
 * @param points - Sampled or vertex-derived 2D path
 * @param closed - Whether the path is treated as a closed polygon
 * @param offsetDist - Signed offset distance in drawing units
 * @returns The first offset polyline, or `null` when offsetting fails
 */
export function geometryOffsetVertexPath(
  points: GeometryPoint2d[],
  closed: boolean,
  offsetDist: number
): GeometryPolyline2d | null {
  if (points.length < 2) return null
  const polyline = geometryPreparePolylineForOffset(
    new GeometryPolyline2d(
      points.map(point => ({ x: point.x, y: point.y })),
      closed
    )
  )
  const results = geometryOffsetPolyline2d(polyline, offsetDist)
  return results[0] ?? null
}
