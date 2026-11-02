import { AcGeBox2d, AcGeMatrix3d, AcGePoint2d, AcGeVector2d } from '../math'
import { AcGeMathUtil, AcGeTol, DEFAULT_TOL, FLOAT_TOL, TAU } from '../util'
import { AcGeCircArc2d } from './AcGeCircArc2d'
import { AcGeEllipseArc2d } from './AcGeEllipseArc2d'
import { AcGeLine2d } from './AcGeLine2d'
import { AcGeSpline2d } from './AcGeSpline2d'

/** Natural parameter interval of a linear primitive. */
export type AcGeCurveExtent = 'bounded' | 'ray' | 'unbounded'

type AcGeIntersectPrimitiveBase = {
  /**
   * When false, `extend` flags passed to {@link acgeIntersectCurves} do not
   * change this primitive. Open polyline interior segments and closed-loop
   * edges set this false. Default true.
   */
  extendable?: boolean
}

/**
 * A WCS curve primitive used by {@link acgeIntersectCurves}.
 *
 * Linear primitives carry an {@link AcGeCurveExtent}. Arcs and ellipses use
 * their stored start/end angles; when extended they are treated as the full
 * circle or ellipse.
 */
export type AcGeIntersectPrimitive =
  | (AcGeIntersectPrimitiveBase & {
      kind: 'line'
      line: AcGeLine2d
      extent: AcGeCurveExtent
    })
  | (AcGeIntersectPrimitiveBase & {
      kind: 'circArc'
      arc: AcGeCircArc2d
    })
  | (AcGeIntersectPrimitiveBase & {
      kind: 'ellipseArc'
      arc: AcGeEllipseArc2d
    })
  | (AcGeIntersectPrimitiveBase & {
      kind: 'spline'
      spline: AcGeSpline2d
    })

const SPLINE_SAMPLE_COUNT = 128
const PLANAR_SAMPLE_COUNT = 96
const POINT_TOL = DEFAULT_TOL.equalPointTol
const REFINE_TOL = POINT_TOL * 8

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
export function acgeIntersectCurves(
  a: readonly AcGeIntersectPrimitive[],
  b: readonly AcGeIntersectPrimitive[],
  extendA = false,
  extendB = false
): AcGePoint2d[] {
  const left = flattenPrimitives(a, extendA)
  const right = flattenPrimitives(b, extendB)
  const points: AcGePoint2d[] = []
  for (const pa of left) {
    for (const pb of right) {
      if (!boxesMayIntersect(pa, pb)) continue
      appendPoints(points, intersectPrepared(pa, pb))
    }
  }
  return dedupePoints(points)
}

/**
 * Returns a transformed copy of a curve primitive.
 */
export function acgeTransformIntersectPrimitive(
  primitive: AcGeIntersectPrimitive,
  matrix: AcGeMatrix3d
): AcGeIntersectPrimitive {
  const cloned = acgeCloneIntersectPrimitive(primitive)
  switch (cloned.kind) {
    case 'line':
      cloned.line.transform3d(matrix)
      return cloned
    case 'circArc':
      cloned.arc.transform3d(matrix)
      return cloned
    case 'ellipseArc':
      cloned.arc.transform3d(matrix)
      return cloned
    case 'spline':
      cloned.spline.transform3d(matrix)
      return cloned
  }
}

/**
 * Returns a deep-cloned curve primitive.
 */
export function acgeCloneIntersectPrimitive(
  primitive: AcGeIntersectPrimitive
): AcGeIntersectPrimitive {
  switch (primitive.kind) {
    case 'line':
      return {
        kind: 'line',
        line: primitive.line.clone(),
        extent: primitive.extent,
        extendable: primitive.extendable
      }
    case 'circArc':
      return {
        kind: 'circArc',
        arc: primitive.arc.clone(),
        extendable: primitive.extendable
      }
    case 'ellipseArc':
      return {
        kind: 'ellipseArc',
        arc: primitive.arc.clone(),
        extendable: primitive.extendable
      }
    case 'spline':
      return {
        kind: 'spline',
        spline: primitive.spline.clone(),
        extendable: primitive.extendable
      }
  }
}

type PreparedLine = {
  kind: 'line'
  start: AcGePoint2d
  dir: AcGeVector2d
  extent: AcGeCurveExtent
  box?: AcGeBox2d
}

type PreparedPrimitive =
  | PreparedLine
  | {
      kind: 'circArc'
      arc: AcGeCircArc2d
      full: boolean
      box: AcGeBox2d
    }
  | {
      kind: 'ellipseArc'
      arc: AcGeEllipseArc2d
      full: boolean
      box: AcGeBox2d
    }
  | {
      kind: 'spline'
      spline: AcGeSpline2d
      samples: PreparedLine[]
      box?: AcGeBox2d
    }

function flattenPrimitives(
  primitives: readonly AcGeIntersectPrimitive[],
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
      case 'circArc': {
        const arc = expandCircArc(primitive.arc, shouldExtend)
        result.push({
          kind: 'circArc',
          arc,
          full: isFullCircArc(arc),
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
      case 'spline': {
        result.push(prepareSpline(primitive.spline))
        break
      }
    }
  }
  return result
}

function prepareLine(
  start: AcGePoint2d,
  end: AcGePoint2d,
  extent: AcGeCurveExtent
): PreparedLine {
  const dir = new AcGeVector2d(end).sub(start)
  return {
    kind: 'line',
    start,
    dir,
    extent,
    box:
      extent === 'bounded'
        ? new AcGeBox2d().setFromPoints([start, end])
        : undefined
  }
}

function prepareSpline(spline: AcGeSpline2d): PreparedPrimitive {
  const samples: PreparedLine[] = []
  const points = spline.getPoints(SPLINE_SAMPLE_COUNT)
  if (points.length >= 2) {
    const count = spline.closed ? points.length : points.length - 1
    for (let i = 0; i < count; i++) {
      const start = points[i]
      const end = points[(i + 1) % points.length]
      if (start.distanceToSquared(end) < POINT_TOL * POINT_TOL) continue
      samples.push(prepareLine(start.clone(), end.clone(), 'bounded'))
    }
  }
  const box = new AcGeBox2d()
  for (const sample of samples) {
    if (sample.box) box.union(sample.box)
  }
  return {
    kind: 'spline',
    spline,
    samples,
    box: samples.length > 0 ? box : undefined
  }
}

function expandCircArc(arc: AcGeCircArc2d, extend: boolean): AcGeCircArc2d {
  if (!extend || isFullCircArc(arc)) return arc
  return AcGeCircArc2d.fromMathAngles(arc.center, arc.radius, 0, 0, false)
}

function expandEllipseArc(
  arc: AcGeEllipseArc2d,
  extend: boolean
): AcGeEllipseArc2d {
  if (!extend || arc.closed) return arc
  return new AcGeEllipseArc2d(
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
): AcGePoint2d[] {
  if (a.kind === 'spline' && b.kind === 'spline') {
    return intersectSplineSpline(a, b)
  }
  if (a.kind === 'spline') return intersectSplineOther(a, b)
  if (b.kind === 'spline') return intersectSplineOther(b, a)
  if (a.kind === 'line' && b.kind === 'line') return intersectLineLine(a, b)
  if (a.kind === 'line' && b.kind === 'circArc') {
    return intersectLineCircArc(a, b.arc)
  }
  if (b.kind === 'line' && a.kind === 'circArc') {
    return intersectLineCircArc(b, a.arc)
  }
  if (a.kind === 'line' && b.kind === 'ellipseArc') {
    return intersectLineEllipseArc(a, b.arc)
  }
  if (b.kind === 'line' && a.kind === 'ellipseArc') {
    return intersectLineEllipseArc(b, a.arc)
  }
  if (a.kind === 'circArc' && b.kind === 'circArc') {
    return intersectCircles(a.arc, b.arc).filter(
      point => isOnCircArc(a.arc, point) && isOnCircArc(b.arc, point)
    )
  }
  if (a.kind === 'circArc' && b.kind === 'ellipseArc') {
    return intersectCircEllipse(a.arc, b.arc)
  }
  if (a.kind === 'ellipseArc' && b.kind === 'circArc') {
    return intersectCircEllipse(b.arc, a.arc)
  }
  if (a.kind === 'ellipseArc' && b.kind === 'ellipseArc') {
    return intersectEllipseEllipse(a.arc, b.arc)
  }
  return []
}

function intersectSplineOther(
  spline: Extract<PreparedPrimitive, { kind: 'spline' }>,
  other: PreparedPrimitive
): AcGePoint2d[] {
  const hits: AcGePoint2d[] = []
  for (const sample of spline.samples) {
    if (!boxesMayIntersect(sample, other)) continue
    appendPoints(hits, intersectPrepared(sample, other))
  }
  return refineSplineHits(spline.spline, hits, other)
}

function intersectSplineSpline(
  a: Extract<PreparedPrimitive, { kind: 'spline' }>,
  b: Extract<PreparedPrimitive, { kind: 'spline' }>
): AcGePoint2d[] {
  const hits: AcGePoint2d[] = []
  for (const sa of a.samples) {
    for (const sb of b.samples) {
      if (!boxesMayIntersect(sa, sb)) continue
      appendPoints(hits, intersectLineLine(sa, sb))
    }
  }
  const points: AcGePoint2d[] = []
  for (const hit of hits) {
    const pa = a.spline.nearestPoint(hit, SPLINE_SAMPLE_COUNT)
    const pb = b.spline.nearestPoint(hit, SPLINE_SAMPLE_COUNT)
    if (pa.distanceTo(pb) <= REFINE_TOL) points.push(pa)
  }
  return points
}

function refineSplineHits(
  spline: AcGeSpline2d,
  hits: AcGePoint2d[],
  other: PreparedPrimitive
): AcGePoint2d[] {
  const points: AcGePoint2d[] = []
  for (const hit of hits) {
    const refined = spline.nearestPoint(hit, SPLINE_SAMPLE_COUNT)
    if (distanceToPrepared(other, refined) <= REFINE_TOL) {
      points.push(refined)
    }
  }
  return points
}

function distanceToPrepared(
  primitive: PreparedPrimitive,
  point: AcGePoint2d
): number {
  if (primitive.kind === 'line') {
    const dirLenSq = dot(primitive.dir, primitive.dir)
    if (dirLenSq < POINT_TOL * POINT_TOL) return Number.POSITIVE_INFINITY
    const t =
      dot(new AcGeVector2d(point).sub(primitive.start), primitive.dir) /
      dirLenSq
    if (!isParamOnExtent(t, primitive.extent)) return Number.POSITIVE_INFINITY
    return pointOnLine(primitive.start, primitive.dir, t).distanceTo(point)
  }
  if (primitive.kind === 'circArc') {
    const radial = Math.abs(
      point.distanceTo(primitive.arc.center) - primitive.arc.radius
    )
    if (radial > REFINE_TOL) return radial
    return isOnCircArc(primitive.arc, point) ? 0 : Number.POSITIVE_INFINITY
  }
  if (primitive.kind === 'ellipseArc') {
    return isPointOnEllipse(point, primitive.arc)
      ? 0
      : Math.abs(ellipseImplicit(primitive.arc, point))
  }
  return Number.POSITIVE_INFINITY
}

function intersectLineLine(a: PreparedLine, b: PreparedLine): AcGePoint2d[] {
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

  const w = new AcGeVector2d(b.start).sub(a.start)
  const t = cross(w, d2) / denom
  const s = cross(w, d1) / denom
  if (!isParamOnExtent(t, a.extent) || !isParamOnExtent(s, b.extent)) {
    return []
  }
  return [pointOnLine(a.start, d1, t)]
}

function intersectLineCircArc(
  line: PreparedLine,
  arc: AcGeCircArc2d
): AcGePoint2d[] {
  const f = new AcGeVector2d(line.start).sub(arc.center)
  const a = dot(line.dir, line.dir)
  if (a < POINT_TOL * POINT_TOL) return []
  const b = 2 * dot(line.dir, f)
  const c = dot(f, f) - arc.radius * arc.radius
  const points: AcGePoint2d[] = []
  for (const t of solveQuadratic(a, b, c)) {
    if (!isParamOnExtent(t, line.extent)) continue
    const point = pointOnLine(line.start, line.dir, t)
    if (!isOnCircArc(arc, point)) continue
    points.push(point)
  }
  return points
}

function intersectLineEllipseArc(
  line: PreparedLine,
  arc: AcGeEllipseArc2d
): AcGePoint2d[] {
  const u = arc.majorAxis
  const v = arc.minorAxis
  const a = arc.majorAxisRadius
  const b = arc.minorAxisRadius
  if (a < POINT_TOL || b < POINT_TOL) return []

  const startOffset = new AcGeVector2d(line.start).sub(arc.center)
  const x0 = dot(startOffset, u)
  const y0 = dot(startOffset, v)
  const dx = dot(line.dir, u)
  const dy = dot(line.dir, v)
  const A = (dx * dx) / (a * a) + (dy * dy) / (b * b)
  const B = (2 * x0 * dx) / (a * a) + (2 * y0 * dy) / (b * b)
  const C = (x0 * x0) / (a * a) + (y0 * y0) / (b * b) - 1
  const points: AcGePoint2d[] = []
  for (const t of solveQuadratic(A, B, C)) {
    if (!isParamOnExtent(t, line.extent)) continue
    const point = pointOnLine(line.start, line.dir, t)
    if (!arc.containsAngle(ellipseArcAngle(arc, point))) continue
    points.push(point)
  }
  return points
}

function intersectCircles(a: AcGeCircArc2d, b: AcGeCircArc2d): AcGePoint2d[] {
  const offset = new AcGeVector2d(b.center).sub(a.center)
  const dist = offset.length()
  const r1 = a.radius
  const r2 = b.radius
  if (dist < POINT_TOL && AcGeTol.equal(r1, r2, POINT_TOL)) return []
  if (dist > r1 + r2 + POINT_TOL) return []
  if (dist + Math.min(r1, r2) + POINT_TOL < Math.max(r1, r2)) return []

  const dir =
    dist < POINT_TOL ? new AcGeVector2d(1, 0) : offset.clone().normalize()
  const x = (r1 * r1 - r2 * r2 + dist * dist) / (2 * Math.max(dist, POINT_TOL))
  const hSq = r1 * r1 - x * x
  const p = pointOnLine(a.center, dir, x)
  if (hSq < -POINT_TOL * POINT_TOL) return []
  if (hSq < POINT_TOL * POINT_TOL) return [p]

  const h = Math.sqrt(Math.max(0, hSq))
  const perp = new AcGeVector2d(-dir.y, dir.x)
  return [pointOnLine(p, perp, h), pointOnLine(p, perp, -h)]
}

function intersectCircEllipse(
  circle: AcGeCircArc2d,
  ellipse: AcGeEllipseArc2d
): AcGePoint2d[] {
  const full = isFullCircArc(circle)
  return intersectPlanarImplicit(
    full
      ? fullCircle(circle).getPoints(PLANAR_SAMPLE_COUNT)
      : circle.getPoints(PLANAR_SAMPLE_COUNT),
    full,
    point => ellipseImplicit(ellipse, point),
    point => isOnCircArc(circle, point) && isPointOnEllipse(point, ellipse)
  )
}

function intersectEllipseEllipse(
  a: AcGeEllipseArc2d,
  b: AcGeEllipseArc2d
): AcGePoint2d[] {
  return intersectPlanarImplicit(
    a.getPoints(PLANAR_SAMPLE_COUNT),
    a.closed,
    point => ellipseImplicit(b, point),
    point =>
      a.containsAngle(ellipseArcAngle(a, point)) && isPointOnEllipse(point, b)
  )
}

function intersectPlanarImplicit(
  samples: AcGePoint2d[],
  closed: boolean,
  implicit: (point: AcGePoint2d) => number,
  accept: (point: AcGePoint2d) => boolean
): AcGePoint2d[] {
  const points: AcGePoint2d[] = []
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

function isParamOnExtent(t: number, extent: AcGeCurveExtent) {
  if (extent === 'unbounded') return true
  if (extent === 'ray') return t >= -POINT_TOL
  return t >= -POINT_TOL && t <= 1 + POINT_TOL
}

function pointOnLine(
  start: { x: number; y: number },
  dir: { x: number; y: number },
  t: number
) {
  return new AcGePoint2d(start.x + dir.x * t, start.y + dir.y * t)
}

function lerp(a: AcGePoint2d, b: AcGePoint2d, t: number) {
  return new AcGePoint2d(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)
}

function dot(a: { x: number; y: number }, b: { x: number; y: number }) {
  return a.x * b.x + a.y * b.y
}

function cross(a: { x: number; y: number }, b: { x: number; y: number }) {
  return a.x * b.y - a.y * b.x
}

function ellipseArcAngle(arc: AcGeEllipseArc2d, point: AcGePoint2d) {
  const offset = new AcGeVector2d(point).sub(arc.center)
  const x = dot(offset, arc.majorAxis) / arc.majorAxisRadius
  const y = dot(offset, arc.minorAxis) / arc.minorAxisRadius
  return Math.atan2(y, x)
}

function fullCircle(arc: AcGeCircArc2d) {
  return AcGeCircArc2d.fromMathAngles(arc.center, arc.radius, 0, 0, false)
}

function isFullCircArc(arc: AcGeCircArc2d) {
  return arc.closed || Math.abs(arc.deltaAngle - TAU) < 1e-10
}

function isOnCircArc(arc: AcGeCircArc2d, point: AcGePoint2d) {
  if (isFullCircArc(arc)) return true
  const center = arc.center
  const start = arc.startPoint
  const startAngle = Math.atan2(start.y - center.y, start.x - center.x)
  const angle = Math.atan2(point.y - center.y, point.x - center.x)
  const t = arc.clockwise
    ? AcGeMathUtil.normalizeAngle(startAngle - angle)
    : AcGeMathUtil.normalizeAngle(angle - startAngle)
  return t <= arc.deltaAngle + 1e-8 || t >= TAU - 1e-8
}

function ellipseImplicit(arc: AcGeEllipseArc2d, point: AcGePoint2d) {
  const offset = new AcGeVector2d(point).sub(arc.center)
  const x = dot(offset, arc.majorAxis) / arc.majorAxisRadius
  const y = dot(offset, arc.minorAxis) / arc.minorAxisRadius
  return x * x + y * y - 1
}

function isPointOnEllipse(point: AcGePoint2d, arc: AcGeEllipseArc2d) {
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

function appendPoints(target: AcGePoint2d[], points: AcGePoint2d[]) {
  for (const point of points) target.push(point)
}

function dedupePoints(points: AcGePoint2d[]): AcGePoint2d[] {
  const unique: AcGePoint2d[] = []
  for (const point of points) {
    if (unique.some(existing => existing.distanceTo(point) <= POINT_TOL)) {
      continue
    }
    unique.push(point)
  }
  return unique
}
