import {
  GeometryCircularArc2d,
  GeometryIntersectPrimitive,
  GeometryLine2d,
  GeometryPoint2dLike,
  GeometryPolyline2dVertex,
  geometryTransformOcsPointToWcs,
  GeometryVector3dLike,
  TAU
} from '@mlightcad/geometry-engine'

const BULGE_EPS = 1e-10

/**
 * Builds bounded line primitives from a point path.
 *
 * Open paths mark the first and last segments as extendable; closed paths
 * mark every segment as not extendable. Pass `extendable` to override that
 * default for every segment (for example mesh edges).
 */
export function acdbIntersectPrimitivesFromPointPath(
  points: readonly GeometryPoint2dLike[],
  closed: boolean,
  extendable?: boolean
): GeometryIntersectPrimitive[] {
  const count = closed ? points.length : points.length - 1
  if (count < 1 || points.length < 2) return []

  const primitives: GeometryIntersectPrimitive[] = []
  for (let i = 0; i < count; i++) {
    const start = points[i]
    const end = points[(i + 1) % points.length]
    if (isDegenerateSegment(start, end)) continue
    const isEndSegment = !closed && (i === 0 || i === count - 1)
    primitives.push({
      kind: 'line',
      line: new GeometryLine2d(start, end),
      extent: 'bounded',
      extendable: extendable ?? isEndSegment
    })
  }
  return primitives
}

/**
 * Converts a 2D polyline (including bulge arcs) into WCS intersection primitives.
 */
export function acdbIntersectPrimitivesFromPolyline2d(
  vertices: readonly GeometryPolyline2dVertex[],
  closed: boolean,
  normal: GeometryVector3dLike
): GeometryIntersectPrimitive[] {
  const count = closed ? vertices.length : vertices.length - 1
  if (count < 1 || vertices.length < 2) return []

  const primitives: GeometryIntersectPrimitive[] = []
  for (let i = 0; i < count; i++) {
    const start = vertices[i]
    const end = vertices[(i + 1) % vertices.length]
    const isEndSegment = !closed && (i === 0 || i === count - 1)
    const extendable = isEndSegment
    const bulge = start.bulge ?? 0
    if (Math.abs(bulge) > BULGE_EPS) {
      const primitive = circularArc2dToPrimitive(
        new GeometryCircularArc2d(start, end, bulge),
        normal,
        extendable
      )
      if (primitive) primitives.push(primitive)
      continue
    }
    const startWcs = toWcs(start.x, start.y, normal)
    const endWcs = toWcs(end.x, end.y, normal)
    if (isDegenerateSegment(startWcs, endWcs)) continue
    primitives.push({
      kind: 'line',
      line: new GeometryLine2d(startWcs, endWcs),
      extent: 'bounded',
      extendable
    })
  }
  return primitives
}

function circularArc2dToPrimitive(
  arc: GeometryCircularArc2d,
  normal: GeometryVector3dLike,
  extendable: boolean
): GeometryIntersectPrimitive | null {
  if (arc.closed || Math.abs(arc.deltaAngle - TAU) < 1e-10) {
    const center = toWcs(arc.center.x, arc.center.y, normal)
    return {
      kind: 'circularArc',
      arc: GeometryCircularArc2d.fromMathAngles(
        center,
        arc.radius,
        0,
        0,
        false
      ),
      extendable: false
    }
  }

  const start = toWcs(arc.startPoint.x, arc.startPoint.y, normal)
  const end = toWcs(arc.endPoint.x, arc.endPoint.y, normal)
  const mid = toWcs(arc.midPoint.x, arc.midPoint.y, normal)
  const wcsArc = GeometryCircularArc2d.tryCreateByThreePoints(start, mid, end)
  if (!wcsArc) {
    if (isDegenerateSegment(start, end)) return null
    return {
      kind: 'line',
      line: new GeometryLine2d(start, end),
      extent: 'bounded',
      extendable
    }
  }
  return {
    kind: 'circularArc',
    arc: wcsArc,
    extendable: extendable && !wcsArc.closed
  }
}

function toWcs(x: number, y: number, normal: GeometryVector3dLike) {
  return geometryTransformOcsPointToWcs({ x, y }, normal)
}

function isDegenerateSegment(
  start: GeometryPoint2dLike,
  end: GeometryPoint2dLike
) {
  const dx = start.x - end.x
  const dy = start.y - end.y
  return dx * dx + dy * dy < 1e-20
}
