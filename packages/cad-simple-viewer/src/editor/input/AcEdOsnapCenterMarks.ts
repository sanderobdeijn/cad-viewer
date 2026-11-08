import {
  GeometryCircularArc2d,
  GeometryEllipseArc2d,
  GeometryPoint2dLike,
  GeometryPolyline2d
} from '@mlightcad/geometry-engine'

import type { AcApItemContents } from '../../model/AcApItemGeometry'
/** Geometric center acquired by hovering circular geometry. */
export interface AcEdOsnapCenterMark {
  x: number
  y: number
  z: number
}

const BULGE_EPS = 1e-10

/**
 * Max AutoCAD-style acquired center ticks kept during one point prompt.
 *
 * Hovering many circles/arcs appends a tick per unique center. Without a
 * cap, a fast sweep recreates hundreds of DOM markers on every pointer
 * move and the canvas appears frozen.
 */
export const ACED_MAX_ACQUIRED_CENTER_MARKS = 32

function hypot2(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by)
}

function distToSegment(
  px: number,
  py: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number
) {
  const dx = x1 - x0
  const dy = y1 - y0
  const lenSq = dx * dx + dy * dy
  if (lenSq < 1e-18) return hypot2(px, py, x0, y0)
  let t = ((px - x0) * dx + (py - y0) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return hypot2(px, py, x0 + t * dx, y0 + t * dy)
}

function tryBulgeArc(
  start: GeometryPoint2dLike,
  end: GeometryPoint2dLike,
  bulge: number
): GeometryCircularArc2d | undefined {
  if (!(Math.abs(bulge) > BULGE_EPS)) return undefined
  try {
    const arc = new GeometryCircularArc2d(start, end, bulge)
    if (!(arc.radius > 0) || !Number.isFinite(arc.radius)) return undefined
    return arc
  } catch {
    return undefined
  }
}

function markFromPoint(point: GeometryPoint2dLike): AcEdOsnapCenterMark {
  return {
    x: point.x,
    y: point.y,
    z: 0
  }
}

function collectPolylineArcCenter(
  polyline: GeometryPolyline2d,
  pickPoint: GeometryPoint2dLike
): AcEdOsnapCenterMark | undefined {
  const vertices = polyline.vertices
  if (vertices.length < 2) return undefined

  const segmentCount = polyline.closed ? vertices.length : vertices.length - 1
  let bestDist = Number.POSITIVE_INFINITY
  let bestArc: GeometryCircularArc2d | undefined

  for (let i = 0; i < segmentCount; i++) {
    const start = vertices[i]!
    const end = vertices[(i + 1) % vertices.length]!
    const arc = tryBulgeArc(start, end, start.bulge ?? 0)
    let dist: number
    if (arc) {
      const nearest = arc.nearestPoint(pickPoint)
      dist = hypot2(pickPoint.x, pickPoint.y, nearest.x, nearest.y)
    } else {
      dist = distToSegment(
        pickPoint.x,
        pickPoint.y,
        start.x,
        start.y,
        end.x,
        end.y
      )
    }
    if (dist < bestDist) {
      bestDist = dist
      bestArc = arc
    }
  }

  if (!bestArc) return undefined
  return markFromPoint({
    x: bestArc.center.x,
    y: bestArc.center.y
  })
}

/**
 * Returns the center marks an item offers near the cursor: the center of a
 * circle, arc or ellipse, or of the polyline arc segment nearest the cursor.
 */
export function collectCenterMarksFromItem(
  item: AcApItemContents,
  pickPoint: GeometryPoint2dLike
): AcEdOsnapCenterMark[] {
  if (item.kind !== 'shape') return []
  const shape = item.geometry
  if (
    shape instanceof GeometryCircularArc2d ||
    shape instanceof GeometryEllipseArc2d
  ) {
    return [markFromPoint(shape.center)]
  }
  if (shape instanceof GeometryPolyline2d) {
    const mark = collectPolylineArcCenter(shape, pickPoint)
    return mark ? [mark] : []
  }
  return []
}

export function mergeAcquiredCenterMarks(
  existing: readonly AcEdOsnapCenterMark[],
  incoming: readonly AcEdOsnapCenterMark[]
): AcEdOsnapCenterMark[] {
  if (incoming.length === 0) {
    return existing.length <= ACED_MAX_ACQUIRED_CENTER_MARKS
      ? (existing as AcEdOsnapCenterMark[])
      : existing.slice(-ACED_MAX_ACQUIRED_CENTER_MARKS)
  }

  const merged = [...existing]
  let changed = existing.length > ACED_MAX_ACQUIRED_CENTER_MARKS
  for (const mark of incoming) {
    const idx = merged.findIndex(item => centerMarksCoincide(item, mark))
    if (idx >= 0) {
      if (idx !== merged.length - 1) {
        const [kept] = merged.splice(idx, 1)
        merged.push(kept!)
        changed = true
      }
    } else {
      merged.push(mark)
      changed = true
    }
  }

  if (merged.length > ACED_MAX_ACQUIRED_CENTER_MARKS) {
    return merged.slice(merged.length - ACED_MAX_ACQUIRED_CENTER_MARKS)
  }
  return changed ? merged : (existing as AcEdOsnapCenterMark[])
}

export function centerMarksCoincide(
  mark: GeometryPoint2dLike,
  snap: GeometryPoint2dLike,
  tol = 1e-8
) {
  return hypot2(mark.x, mark.y, snap.x, snap.y) <= tol
}
