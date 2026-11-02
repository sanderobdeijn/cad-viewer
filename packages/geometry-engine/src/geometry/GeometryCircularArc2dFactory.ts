import { GeometryPoint2dLike } from '../math'
import { FLOAT_TOL, GeometryMathUtil, GeometryTol, TAU } from '../util'
import { GeometryCircularArc2d } from './GeometryCircularArc2d'
import {
  geometryAngleAtCenter2d,
  geometryComputeCircumcircle2d,
  geometryDistance2d,
  geometryProjectPointOntoCircle2d
} from './GeometryCircularArcUtil'

/**
 * Create the unique circular arc from `start` through `through` to `end`.
 *
 * When `reverseDirection` is true, the complementary sweep between the same
 * endpoints is returned (AutoCAD Ctrl-toggle).
 */
export function geometryTryCreateArcByThreePoints(
  start: GeometryPoint2dLike,
  through: GeometryPoint2dLike,
  end: GeometryPoint2dLike,
  reverseDirection: boolean = false
): GeometryCircularArc2d | null {
  const circle = geometryComputeCircumcircle2d(start, through, end)
  if (!circle) return null
  const startAngle = geometryAngleAtCenter2d(circle.center, start)
  const throughAngle = geometryAngleAtCenter2d(circle.center, through)
  const endAngle = geometryAngleAtCenter2d(circle.center, end)
  let clockwise = !GeometryMathUtil.isAngleOnCcwSweep(
    startAngle,
    throughAngle,
    endAngle
  )
  if (reverseDirection) clockwise = !clockwise
  return GeometryCircularArc2d.fromMathAngles(
    circle.center,
    circle.radius,
    startAngle,
    endAngle,
    clockwise
  )
}

/**
 * Create a full circle from center and radius.
 */
export function geometryTryCreateCircle(
  center: GeometryPoint2dLike,
  radius: number
): GeometryCircularArc2d | null {
  if (!Number.isFinite(radius) || GeometryTol.isNonPositive(radius)) return null
  return new GeometryCircularArc2d(center, radius, 0, TAU, false)
}

/**
 * Create a full circle whose diameter is the segment `p1`–`p2`.
 */
export function geometryTryCreateCircleByDiameter(
  p1: GeometryPoint2dLike,
  p2: GeometryPoint2dLike
): GeometryCircularArc2d | null {
  const diameter = geometryDistance2d(p1, p2)
  if (GeometryTol.isNonPositive(diameter)) return null
  return geometryTryCreateCircle(
    { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
    diameter / 2
  )
}

/**
 * Create a full circle through three non-collinear points.
 */
export function geometryTryCreateCircleByThreePoints(
  p1: GeometryPoint2dLike,
  p2: GeometryPoint2dLike,
  p3: GeometryPoint2dLike
): GeometryCircularArc2d | null {
  const circle = geometryComputeCircumcircle2d(p1, p2, p3)
  if (!circle) return null
  return geometryTryCreateCircle(circle.center, circle.radius)
}

/**
 * Create the shorter arc from `start` to `end` on the circle at `center`.
 */
export function geometryTryCreateShorterArc(
  start: GeometryPoint2dLike,
  end: GeometryPoint2dLike,
  center: GeometryPoint2dLike
): GeometryCircularArc2d | null {
  const radius = geometryDistance2d(center, start)
  if (GeometryTol.isNonPositive(radius)) return null
  const startAngle = geometryAngleAtCenter2d(center, start)
  const endAngle = geometryAngleAtCenter2d(center, end)
  const ccwSpan = GeometryMathUtil.normalizeAngle(endAngle - startAngle)
  return GeometryCircularArc2d.fromMathAngles(
    center,
    radius,
    startAngle,
    endAngle,
    ccwSpan > Math.PI
  )
}

/**
 * Create an arc from center, start, and end with an explicit orientation.
 */
export function geometryTryCreateArcByCenterStartEnd(
  center: GeometryPoint2dLike,
  start: GeometryPoint2dLike,
  end: GeometryPoint2dLike,
  clockwise: boolean
): GeometryCircularArc2d | null {
  const radiusFromStart = geometryDistance2d(center, start)
  const radiusFromEnd = geometryDistance2d(center, end)
  if (
    GeometryTol.isNonPositive(radiusFromStart) ||
    GeometryTol.isNonPositive(radiusFromEnd)
  ) {
    return null
  }
  const tolerance = Math.max(FLOAT_TOL, radiusFromStart * FLOAT_TOL)
  if (Math.abs(radiusFromStart - radiusFromEnd) > tolerance) return null
  return GeometryCircularArc2d.fromMathAngles(
    center,
    radiusFromStart,
    geometryAngleAtCenter2d(center, start),
    geometryAngleAtCenter2d(center, end),
    clockwise
  )
}

/**
 * Create a center-start arc whose end is the radial projection of `rawEnd`.
 */
export function geometryTryCreateArcByCenterStartProjectedEnd(
  center: GeometryPoint2dLike,
  start: GeometryPoint2dLike,
  rawEnd: GeometryPoint2dLike,
  clockwise: boolean
): GeometryCircularArc2d | null {
  const radius = geometryDistance2d(center, start)
  if (GeometryTol.isNonPositive(radius)) return null
  const end = geometryProjectPointOntoCircle2d(center, radius, rawEnd)
  if (!end) return null
  return geometryTryCreateArcByCenterStartEnd(center, start, end, clockwise)
}

/**
 * Create a center-start arc from a signed included angle.
 * Positive sweep is counterclockwise.
 */
export function geometryTryCreateArcByCenterStartSweep(
  center: GeometryPoint2dLike,
  start: GeometryPoint2dLike,
  sweepRad: number
): GeometryCircularArc2d | null {
  const radius = geometryDistance2d(center, start)
  const sweep = Math.abs(sweepRad)
  if (
    GeometryTol.isNonPositive(radius) ||
    GeometryTol.isNonPositive(sweep) ||
    !GeometryTol.great(TAU - sweep, 0)
  ) {
    return null
  }
  const clockwise = sweepRad < 0
  const startAngle = geometryAngleAtCenter2d(center, start)
  const endAngle = clockwise ? startAngle - sweep : startAngle + sweep
  return GeometryCircularArc2d.fromMathAngles(
    center,
    radius,
    startAngle,
    endAngle,
    clockwise
  )
}

/**
 * Create a center-start arc from a signed chord length.
 */
export function geometryTryCreateArcByCenterStartChord(
  center: GeometryPoint2dLike,
  start: GeometryPoint2dLike,
  chordLength: number
): GeometryCircularArc2d | null {
  const radius = geometryDistance2d(center, start)
  const chord = Math.abs(chordLength)
  if (
    GeometryTol.isNonPositive(radius) ||
    GeometryTol.isNonPositive(chord) ||
    GeometryTol.great(chord, 2 * radius)
  ) {
    return null
  }
  const ratio = Math.max(-1, Math.min(1, chord / (2 * radius)))
  const sweep = 2 * Math.asin(ratio)
  return geometryTryCreateArcByCenterStartSweep(
    center,
    start,
    chordLength >= 0 ? sweep : -sweep
  )
}

/**
 * Create a start-end arc from a signed included angle.
 * Positive sweep is counterclockwise.
 */
export function geometryTryCreateArcByStartEndAngle(
  start: GeometryPoint2dLike,
  end: GeometryPoint2dLike,
  sweepRad: number
): GeometryCircularArc2d | null {
  const chord = geometryDistance2d(start, end)
  const sweep = Math.abs(sweepRad)
  if (
    GeometryTol.isNonPositive(chord) ||
    GeometryTol.isNonPositive(sweep) ||
    !GeometryTol.great(TAU - sweep, 0)
  ) {
    return null
  }

  const sinHalf = Math.sin(sweep / 2)
  if (GeometryTol.equalToZero(sinHalf)) return null

  const radius = chord / (2 * sinHalf)
  const offsetSquared = radius * radius - (chord * chord) / 4
  if (GeometryTol.less(offsetSquared, 0)) return null

  const offset = Math.sqrt(Math.max(0, offsetSquared))
  const midX = (start.x + end.x) / 2
  const midY = (start.y + end.y) / 2
  const dx = end.x - start.x
  const dy = end.y - start.y
  const ux = -dy / chord
  const uy = dx / chord

  const isCounterClockwise = sweepRad >= 0
  const useLeft =
    (isCounterClockwise && sweep <= Math.PI) ||
    (!isCounterClockwise && sweep > Math.PI)
  const side = useLeft ? 1 : -1
  const center = {
    x: midX + ux * offset * side,
    y: midY + uy * offset * side
  }
  return geometryTryCreateArcByCenterStartEnd(
    center,
    start,
    end,
    !isCounterClockwise
  )
}

/**
 * Create a start-end arc from a tangent direction at the start point.
 */
export function geometryTryCreateArcByStartEndDirection(
  start: GeometryPoint2dLike,
  end: GeometryPoint2dLike,
  directionRad: number
): GeometryCircularArc2d | null {
  const tx = Math.cos(directionRad)
  const ty = Math.sin(directionRad)
  const dx = end.x - start.x
  const dy = end.y - start.y
  const nx = -ty
  const ny = tx
  const denominator = 2 * (dx * nx + dy * ny)
  if (GeometryTol.equalToZero(denominator)) return null

  const lambda = (dx * dx + dy * dy) / denominator
  if (!Number.isFinite(lambda)) return null

  const center = {
    x: start.x + nx * lambda,
    y: start.y + ny * lambda
  }
  const radiusVectorX = start.x - center.x
  const radiusVectorY = start.y - center.y
  const cross = radiusVectorX * ty - radiusVectorY * tx
  if (GeometryTol.equalToZero(cross)) return null

  return geometryTryCreateArcByCenterStartEnd(center, start, end, cross < 0)
}

/**
 * Create a start-end arc from a signed radius.
 * Positive radius is counterclockwise (+Z).
 */
export function geometryTryCreateArcByStartEndRadius(
  start: GeometryPoint2dLike,
  end: GeometryPoint2dLike,
  radiusInput: number
): GeometryCircularArc2d | null {
  const radius = Math.abs(radiusInput)
  const chord = geometryDistance2d(start, end)
  if (
    GeometryTol.isNonPositive(radius) ||
    GeometryTol.isNonPositive(chord) ||
    GeometryTol.great(chord, 2 * radius)
  ) {
    return null
  }

  const midX = (start.x + end.x) / 2
  const midY = (start.y + end.y) / 2
  const dx = end.x - start.x
  const dy = end.y - start.y
  const ux = -dy / chord
  const uy = dx / chord
  const offset = Math.sqrt(Math.max(0, radius * radius - (chord * chord) / 4))
  const side = radiusInput >= 0 ? 1 : -1
  const center = {
    x: midX + ux * offset * side,
    y: midY + uy * offset * side
  }
  return geometryTryCreateArcByCenterStartEnd(
    center,
    start,
    end,
    radiusInput < 0
  )
}
