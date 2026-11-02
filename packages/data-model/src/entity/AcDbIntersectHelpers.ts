import {
  AcGeBoundaryEdgeType,
  AcGeCircArc2d,
  AcGeEllipseArc2d,
  AcGeIntersectPrimitive,
  AcGeLine2d,
  AcGeLoop2d,
  AcGeLoop2dType,
  AcGeMatrix3d,
  AcGePoint2dLike,
  AcGePolyline2d,
  AcGePolyline2dVertex,
  AcGeSpline2d,
  acgeTransformIntersectPrimitive,
  acgeTransformOcsPointToWcs,
  AcGeVector3d,
  AcGeVector3dLike,
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
  points: readonly AcGePoint2dLike[],
  closed: boolean,
  extendable?: boolean
): AcGeIntersectPrimitive[] {
  const count = closed ? points.length : points.length - 1
  if (count < 1 || points.length < 2) return []

  const primitives: AcGeIntersectPrimitive[] = []
  for (let i = 0; i < count; i++) {
    const start = points[i]
    const end = points[(i + 1) % points.length]
    if (isDegenerateSegment(start, end)) continue
    const isEndSegment = !closed && (i === 0 || i === count - 1)
    primitives.push({
      kind: 'line',
      line: new AcGeLine2d(start, end),
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
  vertices: readonly AcGePolyline2dVertex[],
  closed: boolean,
  normal: AcGeVector3dLike
): AcGeIntersectPrimitive[] {
  const count = closed ? vertices.length : vertices.length - 1
  if (count < 1 || vertices.length < 2) return []

  const primitives: AcGeIntersectPrimitive[] = []
  for (let i = 0; i < count; i++) {
    const start = vertices[i]
    const end = vertices[(i + 1) % vertices.length]
    const isEndSegment = !closed && (i === 0 || i === count - 1)
    const extendable = isEndSegment
    const bulge = start.bulge ?? 0
    if (Math.abs(bulge) > BULGE_EPS) {
      const primitive = circArc2dToPrimitive(
        new AcGeCircArc2d(start, end, bulge),
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
      line: new AcGeLine2d(startWcs, endWcs),
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
  loops: readonly AcGeLoop2dType[],
  normal: AcGeVector3dLike
): AcGeIntersectPrimitive[] {
  const primitives: AcGeIntersectPrimitive[] = []
  for (const loop of loops) {
    if (loop instanceof AcGePolyline2d) {
      primitives.push(
        ...acdbIntersectPrimitivesFromPolyline2d(
          loop.vertices,
          loop.closed,
          normal
        )
      )
      continue
    }
    if (loop instanceof AcGeLoop2d) {
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
  primitives: readonly AcGeIntersectPrimitive[],
  matrix: AcGeMatrix3d
): AcGeIntersectPrimitive[] {
  return primitives.map(primitive =>
    acgeTransformIntersectPrimitive(primitive, matrix)
  )
}

function boundaryEdgeToPrimitive(
  edge: AcGeBoundaryEdgeType,
  normal: AcGeVector3dLike
): AcGeIntersectPrimitive[] {
  if (edge instanceof AcGeLine2d) {
    const start = toWcs(edge.startPoint.x, edge.startPoint.y, normal)
    const end = toWcs(edge.endPoint.x, edge.endPoint.y, normal)
    if (isDegenerateSegment(start, end)) return []
    return [
      {
        kind: 'line',
        line: new AcGeLine2d(start, end),
        extent: 'bounded',
        extendable: false
      }
    ]
  }
  if (edge instanceof AcGeCircArc2d) {
    const primitive = circArc2dToPrimitive(edge, normal, false)
    return primitive ? [primitive] : []
  }
  if (edge instanceof AcGeEllipseArc2d) {
    const primitive = ellipseArc2dToPrimitive(edge, normal, false)
    return primitive ? [primitive] : []
  }
  if (edge instanceof AcGeSpline2d) {
    const spline = edge.clone()
    const matrix = ocsMatrix(normal)
    if (matrix) spline.transform3d(matrix)
    return [{ kind: 'spline', spline, extendable: false }]
  }
  return []
}

function circArc2dToPrimitive(
  arc: AcGeCircArc2d,
  normal: AcGeVector3dLike,
  extendable: boolean
): AcGeIntersectPrimitive | null {
  if (arc.closed || Math.abs(arc.deltaAngle - TAU) < 1e-10) {
    const center = toWcs(arc.center.x, arc.center.y, normal)
    return {
      kind: 'circArc',
      arc: AcGeCircArc2d.fromMathAngles(center, arc.radius, 0, 0, false),
      extendable: false
    }
  }

  const start = toWcs(arc.startPoint.x, arc.startPoint.y, normal)
  const end = toWcs(arc.endPoint.x, arc.endPoint.y, normal)
  const mid = toWcs(arc.midPoint.x, arc.midPoint.y, normal)
  const wcsArc = AcGeCircArc2d.tryCreateByThreePoints(start, mid, end)
  if (!wcsArc) {
    if (isDegenerateSegment(start, end)) return null
    return {
      kind: 'line',
      line: new AcGeLine2d(start, end),
      extent: 'bounded',
      extendable
    }
  }
  return {
    kind: 'circArc',
    arc: wcsArc,
    extendable: extendable && !wcsArc.closed
  }
}

function ellipseArc2dToPrimitive(
  arc: AcGeEllipseArc2d,
  normal: AcGeVector3dLike,
  extendable: boolean
): AcGeIntersectPrimitive | null {
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

function toWcs(x: number, y: number, normal: AcGeVector3dLike) {
  return acgeTransformOcsPointToWcs({ x, y }, normal)
}

function ocsMatrix(normal: AcGeVector3dLike) {
  const isDefaultNormal =
    Math.abs(normal.x) < 1e-10 &&
    Math.abs(normal.y) < 1e-10 &&
    Math.abs(normal.z - 1) < 1e-10
  if (isDefaultNormal) return null
  return new AcGeMatrix3d().setFromExtrusionDirection(
    new AcGeVector3d(normal.x, normal.y, normal.z)
  )
}

function isDegenerateSegment(start: AcGePoint2dLike, end: AcGePoint2dLike) {
  const dx = start.x - end.x
  const dy = start.y - end.y
  return dx * dx + dy * dy < 1e-20
}
