import {
  AcGeCircArc2d,
  AcGeLine2d,
  AcGePoint2d,
  AcGePoint2dLike
} from '@mlightcad/geometry-engine'

import type { AcDbObjectId } from '../base/AcDbObject'
import { AcDbOsnapMode } from '../misc/AcDbOsnapMode'

/**
 * Spatial-index child ids may get a `#n` suffix when the same definition
 * entity appears under more than one nested INSERT (see uniquifySpatialItemIds
 * in cad-simple-viewer). Parse that into the canonical object id and 0-based
 * occurrence index matching depth-first leaf order.
 */
export function acdbParseGsMark(gsMark: AcDbObjectId): {
  objectId: AcDbObjectId
  occurrence: number
} {
  if (typeof gsMark !== 'string') {
    return { objectId: gsMark, occurrence: 0 }
  }
  const match = /^(.*)#(\d+)$/.exec(gsMark)
  if (!match) {
    return { objectId: gsMark, occurrence: 0 }
  }
  return {
    objectId: match[1] as AcDbObjectId,
    occurrence: Number(match[2])
  }
}

function distSq2d(a: AcGePoint2dLike, b: AcGePoint2dLike): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

/**
 * Picks the candidate snap point closest to the pick point.
 */
export function acdbPickNearestOsnapPoint(
  pickPoint: AcGePoint2dLike,
  candidates: readonly AcGePoint2dLike[]
): AcGePoint2d | undefined {
  if (candidates.length === 0) return undefined

  let best = new AcGePoint2d(candidates[0].x, candidates[0].y)
  let bestDistSq = distSq2d(pickPoint, best)
  for (let i = 1; i < candidates.length; i++) {
    const candidate = candidates[i]
    const point = new AcGePoint2d(candidate.x, candidate.y)
    const distSq = distSq2d(pickPoint, point)
    if (distSq < bestDistSq) {
      best = point
      bestDistSq = distSq
    }
  }
  return best
}

/**
 * Collects object snap points for one 3D line segment.
 */
export function acdbCollectLineSegmentOsnapPoints(
  start: AcGePoint2dLike,
  end: AcGePoint2dLike,
  osnapMode: AcDbOsnapMode,
  pickPoint: AcGePoint2dLike,
  snapPoints: AcGePoint2dLike[]
) {
  const startPoint = new AcGePoint2d(start.x, start.y)
  const endPoint = new AcGePoint2d(end.x, end.y)
  const line = new AcGeLine2d(startPoint, endPoint)

  switch (osnapMode) {
    case AcDbOsnapMode.EndPoint:
      snapPoints.push(startPoint, endPoint)
      break
    case AcDbOsnapMode.MidPoint:
      snapPoints.push(line.midPoint)
      break
    case AcDbOsnapMode.Nearest:
      snapPoints.push(line.nearestPoint(pickPoint))
      break
    case AcDbOsnapMode.Perpendicular:
      snapPoints.push(line.perpPoint(pickPoint))
      break
    default:
      break
  }
}

/**
 * Collects object snap points for one 2D polyline segment, including bulge arcs.
 */
export function acdbCollectPolyline2dSegmentOsnapPoints(
  start: AcGePoint2d,
  end: AcGePoint2d,
  bulge: number | undefined,
  osnapMode: AcDbOsnapMode,
  pickPoint: AcGePoint2dLike,
  snapPoints: AcGePoint2dLike[]
) {
  if (bulge) {
    const arc = new AcGeCircArc2d(start, end, bulge)
    switch (osnapMode) {
      case AcDbOsnapMode.EndPoint:
        snapPoints.push(
          new AcGePoint2d(arc.startPoint.x, arc.startPoint.y),
          new AcGePoint2d(arc.endPoint.x, arc.endPoint.y)
        )
        break
      case AcDbOsnapMode.MidPoint:
        snapPoints.push(new AcGePoint2d(arc.midPoint.x, arc.midPoint.y))
        break
      case AcDbOsnapMode.Nearest: {
        const nearest = arc.nearestPoint({ x: pickPoint.x, y: pickPoint.y })
        snapPoints.push(new AcGePoint2d(nearest.x, nearest.y))
        break
      }
      case AcDbOsnapMode.Perpendicular: {
        const perpPoints = arc.perpendicularPoints({
          x: pickPoint.x,
          y: pickPoint.y
        })
        perpPoints.forEach(point =>
          snapPoints.push(new AcGePoint2d(point.x, point.y))
        )
        break
      }
      case AcDbOsnapMode.Tangent: {
        const tangentPoints = arc.tangentPoints({
          x: pickPoint.x,
          y: pickPoint.y
        })
        tangentPoints.forEach(point =>
          snapPoints.push(new AcGePoint2d(point.x, point.y))
        )
        break
      }
      default:
        break
    }
    return
  }

  acdbCollectLineSegmentOsnapPoints(
    new AcGePoint2d(start.x, start.y),
    new AcGePoint2d(end.x, end.y),
    osnapMode,
    pickPoint,
    snapPoints
  )
}

/**
 * Collects object snap points along a 3D vertex path.
 */
export function acdbCollectVertexPathOsnapPoints(
  vertices: readonly AcGePoint2dLike[],
  closed: boolean,
  osnapMode: AcDbOsnapMode,
  pickPoint: AcGePoint2dLike,
  snapPoints: AcGePoint2dLike[]
) {
  if (vertices.length === 0) return

  switch (osnapMode) {
    case AcDbOsnapMode.EndPoint:
      vertices.forEach(vertex =>
        snapPoints.push(new AcGePoint2d(vertex.x, vertex.y))
      )
      break
    case AcDbOsnapMode.MidPoint:
    case AcDbOsnapMode.Nearest:
    case AcDbOsnapMode.Perpendicular: {
      const segmentCount = closed ? vertices.length : vertices.length - 1
      const candidates: AcGePoint2d[] = []
      for (let index = 0; index < segmentCount; index++) {
        const segmentSnaps: AcGePoint2d[] = []
        acdbCollectLineSegmentOsnapPoints(
          vertices[index],
          vertices[(index + 1) % vertices.length],
          osnapMode,
          pickPoint,
          segmentSnaps
        )
        candidates.push(...segmentSnaps)
      }
      if (osnapMode === AcDbOsnapMode.MidPoint) {
        snapPoints.push(...candidates)
      } else {
        const nearest = acdbPickNearestOsnapPoint(pickPoint, candidates)
        if (nearest) snapPoints.push(nearest)
      }
      break
    }
    default:
      break
  }
}
