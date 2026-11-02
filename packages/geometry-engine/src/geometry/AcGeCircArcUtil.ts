import { AcGePoint2d, AcGePoint2dLike } from '../math'
import { AcGeTol, FLOAT_TOL } from '../util'

/**
 * Circumcircle of three points in the XY plane.
 */
export interface AcGeCircumcircle2d {
  center: AcGePoint2d
  radius: number
}

/**
 * Return the XY circumcircle of three points, or `null` when they are collinear.
 */
export function acgeComputeCircumcircle2d(
  p1: AcGePoint2dLike,
  p2: AcGePoint2dLike,
  p3: AcGePoint2dLike
): AcGeCircumcircle2d | null {
  const x1 = p1.x
  const y1 = p1.y
  const x2 = p2.x
  const y2 = p2.y
  const x3 = p3.x
  const y3 = p3.y
  const d = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2))
  if (AcGeTol.equalToZero(d)) return null

  const ux =
    ((x1 * x1 + y1 * y1) * (y2 - y3) +
      (x2 * x2 + y2 * y2) * (y3 - y1) +
      (x3 * x3 + y3 * y3) * (y1 - y2)) /
    d
  const uy =
    ((x1 * x1 + y1 * y1) * (x3 - x2) +
      (x2 * x2 + y2 * y2) * (x1 - x3) +
      (x3 * x3 + y3 * y3) * (x2 - x1)) /
    d
  const radius = Math.hypot(ux - x1, uy - y1)
  if (!Number.isFinite(radius) || AcGeTol.isNonPositive(radius)) return null
  return { center: new AcGePoint2d(ux, uy), radius }
}

/**
 * Return the mathematical polar angle of `point` around `center` in XY.
 */
export function acgeAngleAtCenter2d(
  center: AcGePoint2dLike,
  point: AcGePoint2dLike
): number {
  return Math.atan2(point.y - center.y, point.x - center.x)
}

/**
 * XY distance between two points.
 */
export function acgeDistance2d(
  p1: AcGePoint2dLike,
  p2: AcGePoint2dLike
): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y)
}

/**
 * Project `point` radially onto the circle `(center, radius)`.
 * Return `null` when the point coincides with the center.
 */
export function acgeProjectPointOntoCircle2d(
  center: AcGePoint2dLike,
  radius: number,
  point: AcGePoint2dLike
): AcGePoint2d | null {
  if (AcGeTol.isNonPositive(radius)) return null
  const dx = point.x - center.x
  const dy = point.y - center.y
  const distance = Math.hypot(dx, dy)
  if (AcGeTol.isNonPositive(distance)) return null
  const scale = radius / distance
  return new AcGePoint2d(center.x + dx * scale, center.y + dy * scale)
}

/**
 * Default absolute tolerance when comparing two circle centers/radii in XY.
 */
const ACGE_SAME_CIRCLE_EPS = 1e-8

/**
 * True when `point` lies on the circle `(center, radius)` within a radial
 * tolerance. The default tolerance is `max(FLOAT_TOL, radius * 1e-5)`.
 */
export function acgePointLiesOnCircle2d(
  point: AcGePoint2dLike,
  center: AcGePoint2dLike,
  radius: number,
  eps?: number
): boolean {
  const radial = Math.abs(acgeDistance2d(point, center) - radius)
  return radial <= (eps ?? Math.max(FLOAT_TOL, radius * 1e-5))
}

/**
 * True when two circles share the same center and radius within `eps`
 * (default `1e-8`).
 */
export function acgeSameCircle2d(
  center1: AcGePoint2dLike,
  radius1: number,
  center2: AcGePoint2dLike,
  radius2: number,
  eps: number = ACGE_SAME_CIRCLE_EPS
): boolean {
  return (
    Math.abs(center1.x - center2.x) <= eps &&
    Math.abs(center1.y - center2.y) <= eps &&
    Math.abs(radius1 - radius2) <= eps
  )
}

/**
 * Lexicographic pick among nearest-point candidates: smaller `distSq` wins;
 * on a near-tie, larger `align` wins.
 *
 * Use this when two geometries share a vertex so nearest-point distances are
 * equal and a later-wins compare would always take the second candidate.
 */
export function acgeIsBetterDistanceAlign(
  distSq: number,
  align: number,
  bestDistSq: number,
  bestAlign: number
): boolean {
  const tie = Math.max(1e-18, Math.abs(bestDistSq) * 1e-9)
  if (distSq < bestDistSq - tie) return true
  if (distSq > bestDistSq + tie) return false
  return align > bestAlign
}
