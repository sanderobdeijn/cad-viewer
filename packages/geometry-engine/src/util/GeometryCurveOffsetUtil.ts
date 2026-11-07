import { GeometryPolyline2d } from '../geometry/GeometryPolyline2d'
import {
  geometryOffsetPolyline2d,
  geometryPreparePolylineForOffset
} from '../geometry/GeometryPolyline2dOffset'
import { GeometryPoint2d } from '../math'

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
