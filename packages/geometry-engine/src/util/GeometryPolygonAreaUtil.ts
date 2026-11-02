import { GeometryPoint2dLike } from '../math/GeometryPoint2d'

/**
 * Computes the signed area of a 2D polygon using the shoelace formula.
 */
export function geometrySignedPolygonArea2d(
  points: GeometryPoint2dLike[]
): number {
  const count = points.length
  if (count < 3) return 0

  let area = 0
  for (let i = 0, j = count - 1; i < count; j = i++) {
    const p1 = points[j]
    const p2 = points[i]
    area += p1.x * p2.y - p2.x * p1.y
  }

  return area * 0.5
}

/**
 * Computes the absolute area of a 2D polygon using the shoelace formula.
 */
export function geometryPolygonArea2d(points: GeometryPoint2dLike[]): number {
  return Math.abs(geometrySignedPolygonArea2d(points))
}

/**
 * Returns the absolute polygon area for a closed loop, or `0` when the loop is
 * open or degenerate.
 */
export function geometryClosedPolygonArea2d(
  points: GeometryPoint2dLike[]
): number {
  if (points.length < 3) return 0
  return geometryPolygonArea2d(points)
}
