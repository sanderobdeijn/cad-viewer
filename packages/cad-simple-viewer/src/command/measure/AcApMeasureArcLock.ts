import { AcDbArc, AcDbCircle, AcDbPolyline } from '@mlightcad/data-model'
import {
  GeometryCircularArc2d,
  GeometryPoint2dLike,
  TAU
} from '@mlightcad/geometry-engine'

import type { AcApMeasureCircleGeom } from './entity/AcApMeasureDrawUtil'

/** Ignore polyline bulge values that are effectively a straight chord. */
const BULGE_EPS = 1e-12

type Point2 = { x: number; y: number }

function geomFromCurve(curve: GeometryCircularArc2d): AcApMeasureCircleGeom {
  return { cx: curve.center.x, cy: curve.center.y, r: curve.radius }
}

function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

/**
 * How much `mouse - nearest` points into this arc.
 *
 * Used when two bulge segments share a vertex (osnap endpoint): both
 * nearest-point distances are zero, so the later segment would always win.
 * A positive value means the cursor is on this arc's side of the junction.
 */
export function inwardLockAlignment(
  curve: GeometryCircularArc2d,
  nearest: Point2,
  mouse: Point2
): number {
  const mx = mouse.x - nearest.x
  const my = mouse.y - nearest.y
  if (mx * mx + my * my < 1e-24) return 0

  const r = curve.radius > 0 ? curve.radius : 1
  const endTolSq = Math.max(1e-16, 1e-12 * r * r)
  const atStart =
    distSq(nearest.x, nearest.y, curve.startPoint.x, curve.startPoint.y) <=
    endTolSq
  const atEnd =
    distSq(nearest.x, nearest.y, curve.endPoint.x, curve.endPoint.y) <= endTolSq
  if (!atStart && !atEnd) return 0

  const pts = curve.getPoints(8)
  if (pts.length < 3) return 0
  const inward = atStart && !atEnd ? pts[1]! : pts[pts.length - 2]!
  const ix = inward.x - nearest.x
  const iy = inward.y - nearest.y
  const ilen = Math.hypot(ix, iy)
  if (!(ilen > 1e-18)) return 0
  return (mx * ix + my * iy) / ilen
}

/** True when `distSq`/`align` should replace the current lock winner. */
export function isBetterLockCandidate(
  distSqValue: number,
  align: number,
  bestDistSq: number,
  bestAlign: number
): boolean {
  const tie = Math.max(1e-18, Math.abs(bestDistSq) * 1e-9)
  if (distSqValue < bestDistSq - tie) return true
  if (distSqValue > bestDistSq + tie) return false
  return align > bestAlign
}

/** True when `p` lies on circle `g` within a relative radial tolerance. */
export function pointLiesOnCircle(
  p: Point2,
  g: AcApMeasureCircleGeom,
  eps?: number
): boolean {
  const radial = Math.abs(Math.hypot(p.x - g.cx, p.y - g.cy) - g.r)
  return radial <= (eps ?? Math.max(1e-6, g.r * 1e-5))
}

/** True when two lock circles are the same center and radius. */
export function sameCircleGeom(
  a: AcApMeasureCircleGeom,
  b: AcApMeasureCircleGeom
): boolean {
  return (
    Math.abs(a.cx - b.cx) <= 1e-8 &&
    Math.abs(a.cy - b.cy) <= 1e-8 &&
    Math.abs(a.r - b.r) <= 1e-8
  )
}

function ccwDelta(startAngle: number, endAngle: number): number {
  let delta = endAngle - startAngle
  while (delta <= 0) delta += TAU
  while (delta > TAU) delta -= TAU
  return delta
}

function lockCurveFromDbArc(
  entity: AcDbArc
): GeometryCircularArc2d | undefined {
  if (!(entity.radius > 0)) return undefined
  const clockwise = entity.clockwise
  const delta = clockwise
    ? ccwDelta(entity.endAngle, entity.startAngle)
    : ccwDelta(entity.startAngle, entity.endAngle)
  if (!(delta > 1e-12) || delta >= TAU - 1e-12) return undefined
  const curve = new GeometryCircularArc2d(
    entity.startPoint,
    entity.endPoint,
    (clockwise ? -1 : 1) * Math.tan(delta / 4)
  )
  return curve.radius > 0 ? curve : undefined
}

function polylineVertices(entity: AcDbPolyline): Array<{
  x: number
  y: number
  bulge: number
}> {
  const runtimeVertices = (
    entity as unknown as {
      _geo?: { vertices?: Array<{ x: number; y: number; bulge?: number }> }
    }
  )._geo?.vertices

  if (runtimeVertices && runtimeVertices.length > 1) {
    return runtimeVertices.map(v => ({
      x: v.x,
      y: v.y,
      bulge: v.bulge ?? 0
    }))
  }

  const count = entity.numberOfVertices
  const getBulgeAt = (
    entity as unknown as { getBulgeAt?: (index: number) => number }
  ).getBulgeAt
  return Array.from({ length: count }, (_, i) => {
    const p = entity.getPoint2dAt(i)
    return {
      x: p.x,
      y: p.y,
      bulge: getBulgeAt?.(i) ?? 0
    }
  })
}

/**
 * Circular curves on `entity` that arc-length measure can lock onto:
 * CIRCLE, ARC, and polyline bulge segments (not straight chords).
 */
export function lockCurvesFromEntity(entity: unknown): GeometryCircularArc2d[] {
  if (entity instanceof AcDbCircle) {
    if (!(entity.radius > 0)) return []
    return [
      new GeometryCircularArc2d(
        { x: entity.center.x, y: entity.center.y },
        entity.radius,
        0,
        Math.PI * 2,
        false
      )
    ]
  }

  if (entity instanceof AcDbArc) {
    const curve = lockCurveFromDbArc(entity)
    return curve ? [curve] : []
  }

  if (!(entity instanceof AcDbPolyline)) return []
  const vertices = polylineVertices(entity)
  if (vertices.length < 2) return []

  const last = entity.closed ? vertices.length : vertices.length - 1
  const curves: GeometryCircularArc2d[] = []
  for (let i = 0; i < last; i++) {
    const start = vertices[i]
    const end = vertices[(i + 1) % vertices.length]
    if (!(Math.abs(start.bulge) > BULGE_EPS)) continue
    const curve = new GeometryCircularArc2d(start, end, start.bulge)
    if (curve.radius > 0) curves.push(curve)
  }
  return curves
}

/**
 * Closest CIRCLE / ARC / polyline-bulge curve to `p` among `entities`,
 * measured to the actual stroke (not the complementary full circle).
 *
 * @param entities - Candidate CAD entities.
 * @param p - Pick point in world XY.
 * @param worldThreshold - Maximum distance in drawing units.
 * @returns Circle geometry of the winning curve, or `undefined`.
 */
export function pickLockOnEntities(
  entities: unknown[],
  p: GeometryPoint2dLike,
  worldThreshold: number
): { geom: AcApMeasureCircleGeom; nearest: Point2 } | undefined {
  if (!(worldThreshold > 0) || entities.length === 0) return undefined
  const threshSq = worldThreshold * worldThreshold
  let bestDistSq = threshSq
  let best: { geom: AcApMeasureCircleGeom; nearest: Point2 } | undefined
  const pick = { x: p.x, y: p.y }

  let bestAlign = -Infinity
  for (const entity of entities) {
    for (const curve of lockCurvesFromEntity(entity)) {
      const nearest = curve.nearestPoint(pick)
      const d2 = distSq(nearest.x, nearest.y, p.x, p.y)
      if (d2 > threshSq) continue
      const align = inwardLockAlignment(
        curve,
        { x: nearest.x, y: nearest.y },
        { x: p.x, y: p.y }
      )
      if (!best || isBetterLockCandidate(d2, align, bestDistSq, bestAlign)) {
        bestDistSq = d2
        bestAlign = align
        best = {
          geom: geomFromCurve(curve),
          nearest: { x: nearest.x, y: nearest.y }
        }
      }
    }
  }
  return best
}
