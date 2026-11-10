import { GeometryBox2d, GeometryPoint2d, GeometryVector2d } from '../math'
import {
  DEFAULT_TOL,
  FLOAT_TOL,
  GeometryMathUtil,
  GeometryTol,
  TAU
} from '../util'
import { GeometryCircularArc2d } from './GeometryCircularArc2d'
import { GeometryEllipseArc2d } from './GeometryEllipseArc2d'
import { GeometryLine2d } from './GeometryLine2d'

/** Natural parameter interval of a linear primitive. */
export type GeometryCurveExtent = 'bounded' | 'ray' | 'unbounded'

type GeometryIntersectPrimitiveBase = {
  /**
   * When false, `extend` flags passed to {@link geometryIntersectCurves} do not
   * change this primitive. Open polyline interior segments and closed-loop
   * edges set this false. Default true.
   */
  extendable?: boolean
}

/**
 * A WCS curve primitive used by {@link geometryIntersectCurves}.
 *
 * Linear primitives carry an {@link GeometryCurveExtent}. Arcs and ellipses use
 * their stored start/end angles; when extended they are treated as the full
 * circle or ellipse.
 */
export type GeometryIntersectPrimitive =
  | (GeometryIntersectPrimitiveBase & {
      kind: 'line'
      line: GeometryLine2d
      extent: GeometryCurveExtent
    })
  | (GeometryIntersectPrimitiveBase & {
      kind: 'circularArc'
      arc: GeometryCircularArc2d
    })
  | (GeometryIntersectPrimitiveBase & {
      kind: 'ellipseArc'
      arc: GeometryEllipseArc2d
    })

const PLANAR_SAMPLE_COUNT = 96
const POINT_TOL = DEFAULT_TOL.equalPointTol

/**
 * Finds intersection points between two sets of curve primitives.
 *
 * `extendA` / `extendB` correspond to ObjectARX `AcDb::Intersect` flags for
 * the two operands. A primitive is only extended when `extendable` is not
 * `false`. Overlapping coincident curves do not produce a continuum of points.
 *
 * @param a - Primitives from the first operand
 * @param b - Primitives from the second operand
 * @param extendA - Extend the first operand when its primitives allow it
 * @param extendB - Extend the second operand when its primitives allow it
 * @returns Intersection points in WCS, de-duplicated by the equal-point tolerance
 */
export function geometryIntersectCurves(
  a: readonly GeometryIntersectPrimitive[],
  b: readonly GeometryIntersectPrimitive[],
  extendA = false,
  extendB = false
): GeometryPoint2d[] {
  const left = flattenPrimitives(a, extendA)
  const right = flattenPrimitives(b, extendB)
  const points: GeometryPoint2d[] = []
  for (const pa of left) {
    for (const pb of right) {
      if (!boxesMayIntersect(pa, pb)) continue
      appendPoints(points, intersectPrepared(pa, pb))
    }
  }
  return dedupePoints(points)
}

type PreparedLine = {
  kind: 'line'
  start: GeometryPoint2d
  dir: GeometryVector2d
  extent: GeometryCurveExtent
  box?: GeometryBox2d
}

type PreparedPrimitive =
  | PreparedLine
  | {
      kind: 'circularArc'
      arc: GeometryCircularArc2d
      full: boolean
      box: GeometryBox2d
    }
  | {
      kind: 'ellipseArc'
      arc: GeometryEllipseArc2d
      full: boolean
      box: GeometryBox2d
    }

function flattenPrimitives(
  primitives: readonly GeometryIntersectPrimitive[],
  extend: boolean
): PreparedPrimitive[] {
  const result: PreparedPrimitive[] = []
  for (const primitive of primitives) {
    const shouldExtend = extend && primitive.extendable !== false
    switch (primitive.kind) {
      case 'line': {
        const extent = shouldExtend ? 'unbounded' : primitive.extent
        result.push(
          prepareLine(
            primitive.line.startPoint.clone(),
            primitive.line.endPoint.clone(),
            extent
          )
        )
        break
      }
      case 'circularArc': {
        const arc = expandCircularArc(primitive.arc, shouldExtend)
        result.push({
          kind: 'circularArc',
          arc,
          full: isFullCircularArc(arc),
          box: arc.box
        })
        break
      }
      case 'ellipseArc': {
        const arc = expandEllipseArc(primitive.arc, shouldExtend)
        result.push({
          kind: 'ellipseArc',
          arc,
          full: arc.closed,
          box: arc.box
        })
        break
      }
    }
  }
  return result
}

function prepareLine(
  start: GeometryPoint2d,
  end: GeometryPoint2d,
  extent: GeometryCurveExtent
): PreparedLine {
  const dir = new GeometryVector2d(end).sub(start)
  return {
    kind: 'line',
    start,
    dir,
    extent,
    box:
      extent === 'bounded'
        ? new GeometryBox2d().setFromPoints([start, end])
        : undefined
  }
}

function expandCircularArc(
  arc: GeometryCircularArc2d,
  extend: boolean
): GeometryCircularArc2d {
  if (!extend || isFullCircularArc(arc)) return arc
  return GeometryCircularArc2d.fromMathAngles(
    arc.center,
    arc.radius,
    0,
    0,
    false
  )
}

function expandEllipseArc(
  arc: GeometryEllipseArc2d,
  extend: boolean
): GeometryEllipseArc2d {
  if (!extend || arc.closed) return arc
  return new GeometryEllipseArc2d(
    arc.center,
    arc.majorAxisRadius,
    arc.minorAxisRadius,
    0,
    TAU,
    false,
    arc.rotation
  )
}

function boxesMayIntersect(a: PreparedPrimitive, b: PreparedPrimitive) {
  if (!a.box || !b.box) return true
  return a.box.intersectsBox(b.box)
}

function intersectPrepared(
  a: PreparedPrimitive,
  b: PreparedPrimitive
): GeometryPoint2d[] {
  if (a.kind === 'line' && b.kind === 'line') return intersectLineLine(a, b)
  if (a.kind === 'line' && b.kind === 'circularArc') {
    return intersectLineCircularArc(a, b.arc)
  }
  if (b.kind === 'line' && a.kind === 'circularArc') {
    return intersectLineCircularArc(b, a.arc)
  }
  if (a.kind === 'line' && b.kind === 'ellipseArc') {
    return intersectLineEllipseArc(a, b.arc)
  }
  if (b.kind === 'line' && a.kind === 'ellipseArc') {
    return intersectLineEllipseArc(b, a.arc)
  }
  if (a.kind === 'circularArc' && b.kind === 'circularArc') {
    return intersectCircles(a.arc, b.arc).filter(
      point => isOnCircularArc(a.arc, point) && isOnCircularArc(b.arc, point)
    )
  }
  if (a.kind === 'circularArc' && b.kind === 'ellipseArc') {
    return intersectCircEllipse(a.arc, b.arc)
  }
  if (a.kind === 'ellipseArc' && b.kind === 'circularArc') {
    return intersectCircEllipse(b.arc, a.arc)
  }
  if (a.kind === 'ellipseArc' && b.kind === 'ellipseArc') {
    return intersectEllipseEllipse(a.arc, b.arc)
  }
  return []
}

function intersectLineLine(
  a: PreparedLine,
  b: PreparedLine
): GeometryPoint2d[] {
  const d1 = a.dir
  const d2 = b.dir
  const len1Sq = dot(d1, d1)
  const len2Sq = dot(d2, d2)
  if (len1Sq < POINT_TOL * POINT_TOL || len2Sq < POINT_TOL * POINT_TOL) {
    return []
  }

  const denom = cross(d1, d2)
  if (denom * denom < FLOAT_TOL * FLOAT_TOL * len1Sq * len2Sq) {
    return []
  }

  const w = new GeometryVector2d(b.start).sub(a.start)
  const t = cross(w, d2) / denom
  const s = cross(w, d1) / denom
  if (!isParamOnExtent(t, a.extent) || !isParamOnExtent(s, b.extent)) {
    return []
  }
  return [pointOnLine(a.start, d1, t)]
}

function intersectLineCircularArc(
  line: PreparedLine,
  arc: GeometryCircularArc2d
): GeometryPoint2d[] {
  const f = new GeometryVector2d(line.start).sub(arc.center)
  const a = dot(line.dir, line.dir)
  if (a < POINT_TOL * POINT_TOL) return []
  const b = 2 * dot(line.dir, f)
  const c = dot(f, f) - arc.radius * arc.radius
  const points: GeometryPoint2d[] = []
  for (const t of solveQuadratic(a, b, c)) {
    if (!isParamOnExtent(t, line.extent)) continue
    const point = pointOnLine(line.start, line.dir, t)
    if (!isOnCircularArc(arc, point)) continue
    points.push(point)
  }
  return points
}

function intersectLineEllipseArc(
  line: PreparedLine,
  arc: GeometryEllipseArc2d
): GeometryPoint2d[] {
  const u = arc.majorAxis
  const v = arc.minorAxis
  const a = arc.majorAxisRadius
  const b = arc.minorAxisRadius
  if (a < POINT_TOL || b < POINT_TOL) return []

  const startOffset = new GeometryVector2d(line.start).sub(arc.center)
  const x0 = dot(startOffset, u)
  const y0 = dot(startOffset, v)
  const dx = dot(line.dir, u)
  const dy = dot(line.dir, v)
  const A = (dx * dx) / (a * a) + (dy * dy) / (b * b)
  const B = (2 * x0 * dx) / (a * a) + (2 * y0 * dy) / (b * b)
  const C = (x0 * x0) / (a * a) + (y0 * y0) / (b * b) - 1
  const points: GeometryPoint2d[] = []
  for (const t of solveQuadratic(A, B, C)) {
    if (!isParamOnExtent(t, line.extent)) continue
    const point = pointOnLine(line.start, line.dir, t)
    if (!arc.containsAngle(ellipseArcAngle(arc, point))) continue
    points.push(point)
  }
  return points
}

function intersectCircles(
  a: GeometryCircularArc2d,
  b: GeometryCircularArc2d
): GeometryPoint2d[] {
  const offset = new GeometryVector2d(b.center).sub(a.center)
  const dist = offset.length()
  const r1 = a.radius
  const r2 = b.radius
  if (dist < POINT_TOL && GeometryTol.equal(r1, r2, POINT_TOL)) return []
  if (dist > r1 + r2 + POINT_TOL) return []
  if (dist + Math.min(r1, r2) + POINT_TOL < Math.max(r1, r2)) return []

  const dir =
    dist < POINT_TOL ? new GeometryVector2d(1, 0) : offset.clone().normalize()
  const x = (r1 * r1 - r2 * r2 + dist * dist) / (2 * Math.max(dist, POINT_TOL))
  const hSq = r1 * r1 - x * x
  const p = pointOnLine(a.center, dir, x)
  if (hSq < -POINT_TOL * POINT_TOL) return []
  if (hSq < POINT_TOL * POINT_TOL) return [p]

  const h = Math.sqrt(Math.max(0, hSq))
  const perp = new GeometryVector2d(-dir.y, dir.x)
  return [pointOnLine(p, perp, h), pointOnLine(p, perp, -h)]
}

function intersectCircEllipse(
  circle: GeometryCircularArc2d,
  ellipse: GeometryEllipseArc2d
): GeometryPoint2d[] {
  const full = isFullCircularArc(circle)
  return intersectPlanarImplicit(
    full
      ? fullCircle(circle).getPoints(PLANAR_SAMPLE_COUNT)
      : circle.getPoints(PLANAR_SAMPLE_COUNT),
    full,
    point => ellipseImplicit(ellipse, point),
    point => isOnCircularArc(circle, point) && isPointOnEllipse(point, ellipse)
  )
}

function intersectEllipseEllipse(
  a: GeometryEllipseArc2d,
  b: GeometryEllipseArc2d
): GeometryPoint2d[] {
  return intersectPlanarImplicit(
    a.getPoints(PLANAR_SAMPLE_COUNT),
    a.closed,
    point => ellipseImplicit(b, point),
    point =>
      a.containsAngle(ellipseArcAngle(a, point)) && isPointOnEllipse(point, b)
  )
}

function intersectPlanarImplicit(
  samples: GeometryPoint2d[],
  closed: boolean,
  implicit: (point: GeometryPoint2d) => number,
  accept: (point: GeometryPoint2d) => boolean
): GeometryPoint2d[] {
  const points: GeometryPoint2d[] = []
  const count = closed ? samples.length : samples.length - 1
  for (let i = 0; i < count; i++) {
    const p0 = samples[i]
    const p1 = samples[(i + 1) % samples.length]
    const e0 = implicit(p0)
    const e1 = implicit(p1)
    if (Math.abs(e0) <= POINT_TOL) {
      if (accept(p0)) points.push(p0.clone())
      continue
    }
    if (e0 * e1 > 0) continue
    let lo = 0
    let hi = 1
    let loVal = e0
    for (let step = 0; step < 40; step++) {
      const mid = (lo + hi) / 2
      const midVal = implicit(lerp(p0, p1, mid))
      if (loVal * midVal <= 0) {
        hi = mid
      } else {
        lo = mid
        loVal = midVal
      }
    }
    const hit = lerp(p0, p1, (lo + hi) / 2)
    if (accept(hit)) points.push(hit)
  }
  return points
}

function isParamOnExtent(t: number, extent: GeometryCurveExtent) {
  if (extent === 'unbounded') return true
  if (extent === 'ray') return t >= -POINT_TOL
  return t >= -POINT_TOL && t <= 1 + POINT_TOL
}

function pointOnLine(
  start: { x: number; y: number },
  dir: { x: number; y: number },
  t: number
) {
  return new GeometryPoint2d(start.x + dir.x * t, start.y + dir.y * t)
}

function lerp(a: GeometryPoint2d, b: GeometryPoint2d, t: number) {
  return new GeometryPoint2d(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)
}

function dot(a: { x: number; y: number }, b: { x: number; y: number }) {
  return a.x * b.x + a.y * b.y
}

function cross(a: { x: number; y: number }, b: { x: number; y: number }) {
  return a.x * b.y - a.y * b.x
}

function ellipseArcAngle(arc: GeometryEllipseArc2d, point: GeometryPoint2d) {
  const offset = new GeometryVector2d(point).sub(arc.center)
  const x = dot(offset, arc.majorAxis) / arc.majorAxisRadius
  const y = dot(offset, arc.minorAxis) / arc.minorAxisRadius
  return Math.atan2(y, x)
}

function fullCircle(arc: GeometryCircularArc2d) {
  return GeometryCircularArc2d.fromMathAngles(
    arc.center,
    arc.radius,
    0,
    0,
    false
  )
}

function isFullCircularArc(arc: GeometryCircularArc2d) {
  return arc.closed || Math.abs(arc.deltaAngle - TAU) < 1e-10
}

function isOnCircularArc(arc: GeometryCircularArc2d, point: GeometryPoint2d) {
  if (isFullCircularArc(arc)) return true
  const center = arc.center
  const start = arc.startPoint
  const startAngle = Math.atan2(start.y - center.y, start.x - center.x)
  const angle = Math.atan2(point.y - center.y, point.x - center.x)
  const t = arc.clockwise
    ? GeometryMathUtil.normalizeAngle(startAngle - angle)
    : GeometryMathUtil.normalizeAngle(angle - startAngle)
  return t <= arc.deltaAngle + 1e-8 || t >= TAU - 1e-8
}

function ellipseImplicit(arc: GeometryEllipseArc2d, point: GeometryPoint2d) {
  const offset = new GeometryVector2d(point).sub(arc.center)
  const x = dot(offset, arc.majorAxis) / arc.majorAxisRadius
  const y = dot(offset, arc.minorAxis) / arc.minorAxisRadius
  return x * x + y * y - 1
}

function isPointOnEllipse(point: GeometryPoint2d, arc: GeometryEllipseArc2d) {
  if (Math.abs(ellipseImplicit(arc, point)) > 1e-4) return false
  return arc.containsAngle(ellipseArcAngle(arc, point))
}

function solveQuadratic(a: number, b: number, c: number): number[] {
  if (Math.abs(a) < FLOAT_TOL) {
    if (Math.abs(b) < FLOAT_TOL) return []
    return [-c / b]
  }
  const disc = b * b - 4 * a * c
  if (disc < -POINT_TOL) return []
  if (disc < POINT_TOL) return [-b / (2 * a)]
  const sqrtDisc = Math.sqrt(Math.max(0, disc))
  return [(-b - sqrtDisc) / (2 * a), (-b + sqrtDisc) / (2 * a)]
}

function appendPoints(target: GeometryPoint2d[], points: GeometryPoint2d[]) {
  for (const point of points) target.push(point)
}

function dedupePoints(points: GeometryPoint2d[]): GeometryPoint2d[] {
  const unique: GeometryPoint2d[] = []
  for (const point of points) {
    if (unique.some(existing => existing.distanceTo(point) <= POINT_TOL)) {
      continue
    }
    unique.push(point)
  }
  return unique
}
