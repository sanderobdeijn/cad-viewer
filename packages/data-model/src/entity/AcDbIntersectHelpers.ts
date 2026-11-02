import {
  GeometryBoundaryEdgeType,
  GeometryCircularArc2d,
  GeometryEllipseArc2d,
  GeometryIntersectPrimitive,
  GeometryLine2d,
  GeometryLoop2d,
  GeometryLoop2dType,
  GeometryMatrix3d,
  GeometryPoint2dLike,
  GeometryPolyline2d,
  GeometryPolyline2dVertex,
  GeometrySpline2d,
  geometryTransformIntersectPrimitive,
  geometryTransformOcsPointToWcs,
  GeometryVector3d,
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

/**
 * Converts hatch / area loops into WCS intersection primitives.
 */
export function acdbIntersectPrimitivesFromAreaLoops(
  loops: readonly GeometryLoop2dType[],
  normal: GeometryVector3dLike
): GeometryIntersectPrimitive[] {
  const primitives: GeometryIntersectPrimitive[] = []
  for (const loop of loops) {
    if (loop instanceof GeometryPolyline2d) {
      primitives.push(
        ...acdbIntersectPrimitivesFromPolyline2d(
          loop.vertices,
          loop.closed,
          normal
        )
      )
      continue
    }
    if (loop instanceof GeometryLoop2d) {
      for (const edge of loop.curves) {
        const converted = boundaryEdgeToPrimitive(edge, normal)
        if (converted) primitives.push(...converted)
      }
    }
  }
  return primitives
}

/**
 * Transforms a list of intersection primitives by a WCS matrix.
 */
export function acdbTransformIntersectPrimitives(
  primitives: readonly GeometryIntersectPrimitive[],
  matrix: GeometryMatrix3d
): GeometryIntersectPrimitive[] {
  return primitives.map(primitive =>
    geometryTransformIntersectPrimitive(primitive, matrix)
  )
}

function boundaryEdgeToPrimitive(
  edge: GeometryBoundaryEdgeType,
  normal: GeometryVector3dLike
): GeometryIntersectPrimitive[] {
  if (edge instanceof GeometryLine2d) {
    const start = toWcs(edge.startPoint.x, edge.startPoint.y, normal)
    const end = toWcs(edge.endPoint.x, edge.endPoint.y, normal)
    if (isDegenerateSegment(start, end)) return []
    return [
      {
        kind: 'line',
        line: new GeometryLine2d(start, end),
        extent: 'bounded',
        extendable: false
      }
    ]
  }
  if (edge instanceof GeometryCircularArc2d) {
    const primitive = circularArc2dToPrimitive(edge, normal, false)
    return primitive ? [primitive] : []
  }
  if (edge instanceof GeometryEllipseArc2d) {
    const primitive = ellipseArc2dToPrimitive(edge, normal, false)
    return primitive ? [primitive] : []
  }
  if (edge instanceof GeometrySpline2d) {
    const spline = edge.clone()
    const matrix = ocsMatrix(normal)
    if (matrix) spline.transform3d(matrix)
    return [{ kind: 'spline', spline, extendable: false }]
  }
  return []
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

function ellipseArc2dToPrimitive(
  arc: GeometryEllipseArc2d,
  normal: GeometryVector3dLike,
  extendable: boolean
): GeometryIntersectPrimitive | null {
  const ellipse = arc.clone()
  const matrix = ocsMatrix(normal)
  if (matrix) ellipse.transform3d(matrix)
  return {
    kind: 'ellipseArc',
    arc: ellipse,
    extendable:
      extendable &&
      !ellipse.closed &&
      Math.abs(ellipse.deltaAngle - TAU) > 1e-10
  }
}

function toWcs(x: number, y: number, normal: GeometryVector3dLike) {
  return geometryTransformOcsPointToWcs({ x, y }, normal)
}

function ocsMatrix(normal: GeometryVector3dLike) {
  const isDefaultNormal =
    Math.abs(normal.x) < 1e-10 &&
    Math.abs(normal.y) < 1e-10 &&
    Math.abs(normal.z - 1) < 1e-10
  if (isDefaultNormal) return null
  return new GeometryMatrix3d().setFromExtrusionDirection(
    new GeometryVector3d(normal.x, normal.y, normal.z)
  )
}

function isDegenerateSegment(
  start: GeometryPoint2dLike,
  end: GeometryPoint2dLike
) {
  const dx = start.x - end.x
  const dy = start.y - end.y
  return dx * dx + dy * dy < 1e-20
}
