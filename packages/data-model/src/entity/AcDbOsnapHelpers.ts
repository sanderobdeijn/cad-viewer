import {
  GeometryCircularArc2d,
  GeometryLine2d,
  GeometryPoint2d,
  GeometryPoint2dLike
} from '@mlightcad/geometry-engine'

import type { AcDbObjectId } from '../base/AcDbObject'
import { AcDbOsnapMode } from '../misc/AcDbOsnapMode'

/**
 * Spatial-index child ids may get a `#n` suffix when the same child id
 * appears more than once (see uniquifySpatialItemIds
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

function distSq2d(a: GeometryPoint2dLike, b: GeometryPoint2dLike): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

/**
 * Picks the candidate snap point closest to the pick point.
 */
export function acdbPickNearestOsnapPoint(
  pickPoint: GeometryPoint2dLike,
  candidates: readonly GeometryPoint2dLike[]
): GeometryPoint2d | undefined {
  if (candidates.length === 0) return undefined

  let best = new GeometryPoint2d(candidates[0].x, candidates[0].y)
  let bestDistSq = distSq2d(pickPoint, best)
  for (let i = 1; i < candidates.length; i++) {
    const candidate = candidates[i]
    const point = new GeometryPoint2d(candidate.x, candidate.y)
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
  start: GeometryPoint2dLike,
  end: GeometryPoint2dLike,
  osnapMode: AcDbOsnapMode,
  pickPoint: GeometryPoint2dLike,
  snapPoints: GeometryPoint2dLike[]
) {
  const startPoint = new GeometryPoint2d(start.x, start.y)
  const endPoint = new GeometryPoint2d(end.x, end.y)
  const line = new GeometryLine2d(startPoint, endPoint)

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
  start: GeometryPoint2d,
  end: GeometryPoint2d,
  bulge: number | undefined,
  osnapMode: AcDbOsnapMode,
  pickPoint: GeometryPoint2dLike,
  snapPoints: GeometryPoint2dLike[]
) {
  if (bulge) {
    const arc = new GeometryCircularArc2d(start, end, bulge)
    switch (osnapMode) {
      case AcDbOsnapMode.EndPoint:
        snapPoints.push(
          new GeometryPoint2d(arc.startPoint.x, arc.startPoint.y),
          new GeometryPoint2d(arc.endPoint.x, arc.endPoint.y)
        )
        break
      case AcDbOsnapMode.MidPoint:
        snapPoints.push(new GeometryPoint2d(arc.midPoint.x, arc.midPoint.y))
        break
      case AcDbOsnapMode.Nearest: {
        const nearest = arc.nearestPoint({ x: pickPoint.x, y: pickPoint.y })
        snapPoints.push(new GeometryPoint2d(nearest.x, nearest.y))
        break
      }
      case AcDbOsnapMode.Perpendicular: {
        const perpPoints = arc.perpendicularPoints({
          x: pickPoint.x,
          y: pickPoint.y
        })
        perpPoints.forEach(point =>
          snapPoints.push(new GeometryPoint2d(point.x, point.y))
        )
        break
      }
      case AcDbOsnapMode.Tangent: {
        const tangentPoints = arc.tangentPoints({
          x: pickPoint.x,
          y: pickPoint.y
        })
        tangentPoints.forEach(point =>
          snapPoints.push(new GeometryPoint2d(point.x, point.y))
        )
        break
      }
      default:
        break
    }
    return
  }

  acdbCollectLineSegmentOsnapPoints(
    new GeometryPoint2d(start.x, start.y),
    new GeometryPoint2d(end.x, end.y),
    osnapMode,
    pickPoint,
    snapPoints
  )
}

/**
 * Collects object snap points along a 3D vertex path.
 */
export function acdbCollectVertexPathOsnapPoints(
  vertices: readonly GeometryPoint2dLike[],
  closed: boolean,
  osnapMode: AcDbOsnapMode,
  pickPoint: GeometryPoint2dLike,
  snapPoints: GeometryPoint2dLike[]
) {
  if (vertices.length === 0) return

  switch (osnapMode) {
    case AcDbOsnapMode.EndPoint:
      vertices.forEach(vertex =>
        snapPoints.push(new GeometryPoint2d(vertex.x, vertex.y))
      )
      break
    case AcDbOsnapMode.MidPoint:
    case AcDbOsnapMode.Nearest:
    case AcDbOsnapMode.Perpendicular: {
      const segmentCount = closed ? vertices.length : vertices.length - 1
      const candidates: GeometryPoint2d[] = []
      for (let index = 0; index < segmentCount; index++) {
        const segmentSnaps: GeometryPoint2d[] = []
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
