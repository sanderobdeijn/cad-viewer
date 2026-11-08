/**
 * Geometry operations on the items of a {@link Model}: grips, object snap
 * points, transforms, offsets, intersections, extents and drawing.
 *
 * Every operation takes the contents of an item (its kind and geometry) and
 * leaves them unchanged; operations that change an item return new contents.
 *
 * @packageDocumentation
 */
import {
  GeometryBox3d,
  GeometryCircularArc2d,
  type GeometryDimension,
  GeometryEllipseArc2d,
  geometryIntersectCurves,
  type GeometryIntersectPrimitive,
  GeometryLine2d,
  GeometryMathUtil,
  GeometryMatrix3d,
  GeometryPoint2d,
  type GeometryPoint2dLike,
  GeometryPolyline2d,
  type GeometryPolyline2dVertex,
  type GeometryShape,
  geometryTransformOcsPointToWcs,
  GeometryVector2d,
  type GeometryVector2dLike,
  GeometryVector3d,
  type ModelItem,
  TAU
} from '@mlightcad/geometry-engine'
import {
  type AcGiDirectBatchPrimitive,
  acgiDrawTessellateOptions,
  type AcGiEntity,
  type AcGiRenderer
} from '@mlightcad/graphic-interface'

import {
  dimensionExtents,
  dimensionGraphics,
  dimensionGripPoints,
  drawDimension,
  moveDimensionGrips,
  transformDimension
} from './AcApDimensionGeometry'
import { AcApOsnapMode } from './AcApOsnapMode'

/** The kind and geometry of a model item, without its id. */
export type AcApItemContents = ModelItem extends infer Item
  ? Item extends ModelItem
    ? Omit<Item, 'id'>
    : never
  : never

/** How points are drawn: their display mode and size. */
export interface AcApPointDisplay {
  displayMode: number
  displaySize: number
}

const QUADRANT_ANGLES = [0, Math.PI / 2, Math.PI, (Math.PI / 2) * 3]
const BULGE_EPS = 1e-10

const translation = (offset: GeometryVector2dLike) =>
  GeometryMatrix3d.makeTranslation({ x: offset.x, y: offset.y, z: 0 })

const pickNearest = (
  pickPoint: GeometryPoint2dLike,
  candidates: readonly GeometryPoint2dLike[]
): GeometryPoint2d | undefined => {
  let best: GeometryPoint2d | undefined
  let bestDistSq = Infinity
  for (const candidate of candidates) {
    const dx = candidate.x - pickPoint.x
    const dy = candidate.y - pickPoint.y
    const distSq = dx * dx + dy * dy
    if (distSq < bestDistSq) {
      best = new GeometryPoint2d(candidate.x, candidate.y)
      bestDistSq = distSq
    }
  }
  return best
}

const lineSegmentOsnapPoints = (
  start: GeometryPoint2dLike,
  end: GeometryPoint2dLike,
  mode: AcApOsnapMode,
  pickPoint: GeometryPoint2dLike,
  out: GeometryPoint2dLike[]
) => {
  const startPoint = new GeometryPoint2d(start.x, start.y)
  const endPoint = new GeometryPoint2d(end.x, end.y)
  const line = new GeometryLine2d(startPoint, endPoint)
  switch (mode) {
    case AcApOsnapMode.EndPoint:
      out.push(startPoint, endPoint)
      break
    case AcApOsnapMode.MidPoint:
      out.push(line.midPoint)
      break
    case AcApOsnapMode.Nearest:
      out.push(line.nearestPoint(pickPoint))
      break
    case AcApOsnapMode.Perpendicular:
      out.push(line.perpPoint(pickPoint))
      break
    default:
      break
  }
}

const polylineSegmentOsnapPoints = (
  start: GeometryPoint2d,
  end: GeometryPoint2d,
  bulge: number | undefined,
  mode: AcApOsnapMode,
  pickPoint: GeometryPoint2dLike,
  out: GeometryPoint2dLike[]
) => {
  if (!bulge) {
    lineSegmentOsnapPoints(start, end, mode, pickPoint, out)
    return
  }
  const arc = new GeometryCircularArc2d(start, end, bulge)
  const pick = { x: pickPoint.x, y: pickPoint.y }
  const copy = (point: GeometryPoint2dLike) =>
    new GeometryPoint2d(point.x, point.y)
  switch (mode) {
    case AcApOsnapMode.EndPoint:
      out.push(copy(arc.startPoint), copy(arc.endPoint))
      break
    case AcApOsnapMode.MidPoint:
      out.push(copy(arc.midPoint))
      break
    case AcApOsnapMode.Nearest:
      out.push(copy(arc.nearestPoint(pick)))
      break
    case AcApOsnapMode.Perpendicular:
      arc.perpendicularPoints(pick).forEach(point => out.push(copy(point)))
      break
    case AcApOsnapMode.Tangent:
      arc.tangentPoints(pick).forEach(point => out.push(copy(point)))
      break
    default:
      break
  }
}

/** Operations on one kind of shape geometry. */
interface ShapeOps<G extends GeometryShape> {
  gripPoints(geometry: G): GeometryPoint2d[]
  moveGrips(
    geometry: G,
    indices: readonly number[],
    offset: GeometryVector2dLike
  ): G
  osnapPoints(
    geometry: G,
    mode: AcApOsnapMode,
    pickPoint: GeometryPoint2dLike,
    out: GeometryPoint2dLike[]
  ): void
  transform(geometry: G, matrix: GeometryMatrix3d): G
  offset(geometry: G, distance: number): G[]
  offsetSide(geometry: G, point: GeometryPoint2dLike): 1 | -1
  intersectCurves(geometry: G): GeometryIntersectPrimitive[]
  extents(geometry: G): GeometryBox3d
  draw(geometry: G, renderer: AcGiRenderer): AcGiEntity | undefined
}

const boxOf = (geometry: {
  box: { min: GeometryPoint2dLike; max: GeometryPoint2dLike }
}) =>
  new GeometryBox3d(
    { x: geometry.box.min.x, y: geometry.box.min.y, z: 0 },
    { x: geometry.box.max.x, y: geometry.box.max.y, z: 0 }
  )

const outsideCircle = (
  center: GeometryPoint2dLike,
  radius: number,
  point: GeometryPoint2dLike
): 1 | -1 =>
  Math.hypot(point.x - center.x, point.y - center.y) >= radius ? 1 : -1

const lineOps: ShapeOps<GeometryLine2d> = {
  gripPoints: line => [line.midPoint, line.startPoint, line.endPoint],
  moveGrips(line, indices, offset) {
    let moved = line.clone()
    for (const index of indices) {
      if (index === 0) {
        moved = moved.transform3d(translation(offset))
      } else if (index === 1) {
        moved = new GeometryLine2d(
          moved.startPoint.clone().add(offset),
          moved.endPoint
        )
      } else if (index === 2) {
        moved = new GeometryLine2d(
          moved.startPoint,
          moved.endPoint.clone().add(offset)
        )
      }
    }
    return moved
  },
  osnapPoints(line, mode, pickPoint, out) {
    switch (mode) {
      case AcApOsnapMode.EndPoint:
        out.push(line.startPoint, line.endPoint)
        break
      case AcApOsnapMode.MidPoint:
        out.push(line.midPoint)
        break
      case AcApOsnapMode.Nearest:
        out.push(line.project(pickPoint))
        break
      case AcApOsnapMode.Perpendicular:
        out.push(line.perpPoint(pickPoint))
        break
      default:
        break
    }
  },
  transform(line, matrix) {
    const moved = line.clone().transform3d(matrix)
    return new GeometryLine2d(moved.startPoint, moved.endPoint)
  },
  offset(line, distance) {
    const moved = line.offset(distance)
    return [new GeometryLine2d(moved.startPoint, moved.endPoint)]
  },
  offsetSide(line, point) {
    const s = line.startPoint
    const e = line.endPoint
    return (e.x - s.x) * (point.y - s.y) - (e.y - s.y) * (point.x - s.x) >= 0
      ? 1
      : -1
  },
  intersectCurves: line => [{ kind: 'line', line, extent: 'bounded' }],
  extents: boxOf,
  draw: (line, renderer) => renderer.lines([line.startPoint, line.endPoint])
}

const circleOps: ShapeOps<GeometryCircularArc2d> = {
  gripPoints: circle => [
    circle.center,
    ...QUADRANT_ANGLES.map(angle => circle.getPointAtAngle(angle))
  ],
  moveGrips(circle, indices, offset) {
    let moved = circle.clone()
    for (const index of indices) {
      if (index === 0) {
        moved = moved.transform3d(translation(offset))
      } else if (index >= 1 && index <= 4) {
        const point = moved.getPointAtAngle(QUADRANT_ANGLES[index - 1])
        const radius = new GeometryPoint2d(
          point.x + offset.x,
          point.y + offset.y
        ).distanceTo(moved.center)
        if (radius > 0) {
          moved = GeometryCircularArc2d.fromMathAngles(
            moved.center,
            radius,
            0,
            0,
            false
          )
        }
      }
    }
    return moved
  },
  osnapPoints(circle, mode, pickPoint, out) {
    switch (mode) {
      case AcApOsnapMode.Center:
      case AcApOsnapMode.Centroid:
        out.push(circle.center)
        break
      case AcApOsnapMode.Quadrant:
        QUADRANT_ANGLES.forEach(angle =>
          out.push(circle.getPointAtAngle(angle))
        )
        break
      case AcApOsnapMode.Nearest:
        out.push(circle.nearestPoint(pickPoint))
        break
      case AcApOsnapMode.Tangent:
        out.push(...circle.tangentPoints(pickPoint))
        break
      case AcApOsnapMode.Perpendicular: {
        const nearest = pickNearest(
          pickPoint,
          circle.perpendicularPoints(pickPoint)
        )
        if (nearest) out.push(nearest)
        break
      }
      default:
        break
    }
  },
  transform: (circle, matrix) => circle.clone().transform3d(matrix),
  offset(circle, distance) {
    const moved = circle.offset(distance)
    return moved
      ? [
          GeometryCircularArc2d.fromMathAngles(
            moved.center,
            moved.radius,
            0,
            0,
            false
          )
        ]
      : []
  },
  offsetSide: (circle, point) =>
    outsideCircle(circle.center, circle.radius, point),
  intersectCurves: circle => [
    { kind: 'circularArc', arc: circle, extendable: false }
  ],
  extents: boxOf,
  draw: (circle, renderer) => renderer.circularArc(circle)
}

const polarAngle = (center: GeometryPoint2dLike, point: GeometryPoint2dLike) =>
  GeometryMathUtil.normalizeAngle(
    Math.atan2(point.y - center.y, point.x - center.x)
  )

const arcStartAngle = (arc: GeometryCircularArc2d) =>
  polarAngle(arc.center, arc.startPoint)
const arcEndAngle = (arc: GeometryCircularArc2d) =>
  polarAngle(arc.center, arc.endPoint)

const arcOps: ShapeOps<GeometryCircularArc2d> = {
  gripPoints: arc => [arc.center, arc.startPoint, arc.endPoint],
  moveGrips(arc, indices, offset) {
    let moved = arc.clone()
    for (const index of indices) {
      if (index === 0) {
        moved = moved.transform3d(translation(offset))
      } else if (index === 1 || index === 2) {
        const point = index === 1 ? moved.startPoint : moved.endPoint
        const angle = polarAngle(moved.center, {
          x: point.x + offset.x,
          y: point.y + offset.y
        })
        moved = GeometryCircularArc2d.fromMathAngles(
          moved.center,
          moved.radius,
          index === 1 ? angle : arcStartAngle(moved),
          index === 2 ? angle : arcEndAngle(moved),
          moved.clockwise
        )
      }
    }
    return moved
  },
  osnapPoints(arc, mode, pickPoint, out) {
    switch (mode) {
      case AcApOsnapMode.EndPoint:
        out.push(arc.startPoint, arc.endPoint)
        break
      case AcApOsnapMode.MidPoint:
        out.push(arc.midPoint)
        break
      case AcApOsnapMode.Center:
      case AcApOsnapMode.Centroid:
        out.push(arc.center)
        break
      case AcApOsnapMode.Quadrant:
        out.push(...arc.getQuadrantPoints())
        break
      case AcApOsnapMode.Nearest:
        out.push(arc.nearestPoint(pickPoint))
        break
      case AcApOsnapMode.Perpendicular: {
        const nearest = pickNearest(
          pickPoint,
          arc.perpendicularPoints(pickPoint)
        )
        if (nearest) out.push(nearest)
        break
      }
      case AcApOsnapMode.Tangent:
        out.push(...arc.tangentPoints(pickPoint))
        break
      default:
        break
    }
  },
  transform: (arc, matrix) => arc.clone().transform3d(matrix),
  offset(arc, distance) {
    const radius = arc.radius + distance
    if (radius <= 0) return []
    return [
      GeometryCircularArc2d.fromMathAngles(
        arc.center,
        radius,
        arcStartAngle(arc),
        arcEndAngle(arc),
        arc.clockwise
      )
    ]
  },
  offsetSide: (arc, point) => outsideCircle(arc.center, arc.radius, point),
  intersectCurves: arc => [
    { kind: 'circularArc', arc, extendable: !arc.closed }
  ],
  extents: boxOf,
  draw: (arc, renderer) => renderer.circularArc(arc)
}

const ellipseAngleAt = (
  ellipse: GeometryEllipseArc2d,
  point: GeometryPoint2dLike
) => {
  const dx = point.x - ellipse.center.x
  const dy = point.y - ellipse.center.y
  const major = ellipse.majorAxis
  const minor = ellipse.minorAxis
  return Math.atan2(
    (dx * minor.x + dy * minor.y) / ellipse.minorAxisRadius,
    (dx * major.x + dy * major.y) / ellipse.majorAxisRadius
  )
}

const moveEllipseQuadrant = (
  ellipse: GeometryEllipseArc2d,
  angle: number,
  offset: GeometryVector2dLike
) => {
  const point = ellipse.getPointAtAngle(angle)
  const dx = point.x + offset.x - ellipse.center.x
  const dy = point.y + offset.y - ellipse.center.y
  const onMajor = angle === 0 || angle === Math.PI
  const axis = onMajor ? ellipse.majorAxis : ellipse.minorAxis
  const radius = Math.abs(dx * axis.x + dy * axis.y)
  if (radius <= 0) return
  if (onMajor) {
    ellipse.majorAxisRadius = radius
  } else {
    ellipse.minorAxisRadius = radius
  }
}

const ellipseOps: ShapeOps<GeometryEllipseArc2d> = {
  gripPoints: ellipse =>
    ellipse.closed
      ? [
          ellipse.center,
          ...QUADRANT_ANGLES.map(angle => ellipse.getPointAtAngle(angle))
        ]
      : [ellipse.center, ellipse.startPoint, ellipse.endPoint],
  moveGrips(ellipse, indices, offset) {
    let moved = ellipse.clone()
    for (const index of indices) {
      if (index === 0) {
        moved = moved.transform3d(translation(offset))
      } else if (moved.closed && index >= 1 && index <= 4) {
        moveEllipseQuadrant(moved, QUADRANT_ANGLES[index - 1], offset)
      } else if (index === 1) {
        moved.startAngle = ellipseAngleAt(
          moved,
          moved.startPoint.clone().add(offset)
        )
      } else if (index === 2) {
        moved.endAngle = ellipseAngleAt(
          moved,
          moved.endPoint.clone().add(offset)
        )
      }
    }
    return moved
  },
  osnapPoints(ellipse, mode, pickPoint, out) {
    switch (mode) {
      case AcApOsnapMode.EndPoint:
        if (!ellipse.closed) out.push(ellipse.startPoint, ellipse.endPoint)
        break
      case AcApOsnapMode.MidPoint:
        if (!ellipse.closed) out.push(ellipse.midPoint)
        break
      case AcApOsnapMode.Center:
      case AcApOsnapMode.Centroid:
        out.push(ellipse.center)
        break
      case AcApOsnapMode.Quadrant:
        if (ellipse.closed) {
          QUADRANT_ANGLES.forEach(angle =>
            out.push(ellipse.getPointAtAngle(angle))
          )
        }
        break
      case AcApOsnapMode.Nearest:
        out.push(ellipse.nearestPoint(pickPoint))
        break
      case AcApOsnapMode.Tangent:
        out.push(...ellipse.tangentPoints(pickPoint))
        break
      case AcApOsnapMode.Perpendicular: {
        const nearest = pickNearest(
          pickPoint,
          ellipse.perpendicularPoints(pickPoint)
        )
        if (nearest) out.push(nearest)
        break
      }
      default:
        break
    }
  },
  transform: (ellipse, matrix) => ellipse.clone().transform3d(matrix),
  offset(ellipse, distance) {
    const moved = ellipse.offset(distance)
    return moved
      ? [
          new GeometryEllipseArc2d(
            moved.center,
            moved.majorAxisRadius,
            moved.minorAxisRadius,
            moved.startAngle,
            moved.endAngle,
            false,
            new GeometryVector2d(moved.majorAxis.x, moved.majorAxis.y).angle()
          )
        ]
      : []
  },
  offsetSide(ellipse, point) {
    const dx = point.x - ellipse.center.x
    const dy = point.y - ellipse.center.y
    const ux = Math.cos(ellipse.rotation)
    const uy = Math.sin(ellipse.rotation)
    const u = dx * ux + dy * uy
    const v = dx * -uy + dy * ux
    const ratio = ellipse.minorAxisRadius / ellipse.majorAxisRadius || 1
    return u ** 2 + (v / ratio) ** 2 >= 1 ? 1 : -1
  },
  intersectCurves: ellipse => [
    { kind: 'ellipseArc', arc: ellipse, extendable: !ellipse.closed }
  ],
  extents: boxOf,
  draw: (ellipse, renderer) => renderer.ellipticalArc(ellipse)
}

const vertexCountOf = (polyline: GeometryPolyline2d) =>
  polyline.numberOfVertices
const segmentCountOf = (polyline: GeometryPolyline2d) => {
  const count = vertexCountOf(polyline)
  if (count < 2) return 0
  return polyline.closed ? count : count - 1
}

const polylineWith = (
  polyline: GeometryPolyline2d,
  vertices: GeometryPolyline2dVertex[]
) => new GeometryPolyline2d(vertices, polyline.closed)

const copyVertices = (polyline: GeometryPolyline2d) =>
  polyline.vertices.map(vertex => ({ ...vertex }))

const toWcs = (x: number, y: number) =>
  geometryTransformOcsPointToWcs({ x, y }, GeometryVector3d.Z_AXIS)

const polylineArcPrimitive = (
  arc: GeometryCircularArc2d,
  extendable: boolean
): GeometryIntersectPrimitive | null => {
  if (arc.closed || Math.abs(arc.deltaAngle - TAU) < 1e-10) {
    return {
      kind: 'circularArc',
      arc: GeometryCircularArc2d.fromMathAngles(
        toWcs(arc.center.x, arc.center.y),
        arc.radius,
        0,
        0,
        false
      ),
      extendable: false
    }
  }
  const start = toWcs(arc.startPoint.x, arc.startPoint.y)
  const end = toWcs(arc.endPoint.x, arc.endPoint.y)
  const mid = toWcs(arc.midPoint.x, arc.midPoint.y)
  const wcsArc = GeometryCircularArc2d.tryCreateByThreePoints(start, mid, end)
  if (!wcsArc) {
    if ((start.x - end.x) ** 2 + (start.y - end.y) ** 2 < 1e-20) return null
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

const polylineOps: ShapeOps<GeometryPolyline2d> = {
  gripPoints(polyline) {
    const grips: GeometryPoint2d[] = []
    const count = vertexCountOf(polyline)
    for (let index = 0; index < count; index++) {
      const point = polyline.getPointAt(index)
      grips.push(new GeometryPoint2d(point.x, point.y))
    }
    // Segment midpoints, as AutoCAD shows with GRIPS set to 2.
    for (let index = 0; index < segmentCountOf(polyline); index++) {
      const snaps: GeometryPoint2dLike[] = []
      polylineSegmentOsnapPoints(
        polyline.getPointAt(index),
        polyline.getPointAt((index + 1) % count),
        polyline.vertices[index]?.bulge,
        AcApOsnapMode.MidPoint,
        { x: 0, y: 0 },
        snaps
      )
      snaps.forEach(snap => grips.push(new GeometryPoint2d(snap.x, snap.y)))
    }
    return grips
  },
  moveGrips(polyline, indices, offset) {
    const vertices = copyVertices(polyline)
    const count = vertices.length
    const segments = segmentCountOf(polyline)
    const moveVertex = (index: number) => {
      const vertex = vertices[index]
      if (!vertex) return
      vertex.x += offset.x
      vertex.y += offset.y
    }
    for (const index of indices) {
      if (index < count) {
        moveVertex(index)
      } else if (index < count + segments) {
        const segment = index - count
        moveVertex(segment)
        moveVertex((segment + 1) % count)
      }
    }
    return polylineWith(polyline, vertices)
  },
  osnapPoints(polyline, mode, pickPoint, out) {
    const count = vertexCountOf(polyline)
    if (count === 0) return
    if (mode === AcApOsnapMode.EndPoint) {
      for (let index = 0; index < count; index++) {
        const point = polyline.getPointAt(index)
        out.push(new GeometryPoint2d(point.x, point.y))
      }
      return
    }
    if (
      mode !== AcApOsnapMode.MidPoint &&
      mode !== AcApOsnapMode.Nearest &&
      mode !== AcApOsnapMode.Perpendicular &&
      mode !== AcApOsnapMode.Tangent
    ) {
      return
    }
    const segmentCount = polyline.closed ? count : count - 1
    const candidates: GeometryPoint2dLike[] = []
    for (let index = 0; index < segmentCount; index++) {
      polylineSegmentOsnapPoints(
        polyline.getPointAt(index),
        polyline.getPointAt((index + 1) % count),
        polyline.vertices[index]?.bulge,
        mode,
        pickPoint,
        candidates
      )
    }
    if (mode === AcApOsnapMode.MidPoint) {
      candidates.forEach(point =>
        out.push(new GeometryPoint2d(point.x, point.y))
      )
    } else {
      const nearest = pickNearest(pickPoint, candidates)
      if (nearest) out.push(nearest)
    }
  },
  transform(polyline, matrix) {
    const flipBulge = matrix.determinant() < 0
    const vertices = copyVertices(polyline).map(vertex => {
      const point = new GeometryPoint2d(vertex.x, vertex.y).applyMatrix4(matrix)
      return {
        ...vertex,
        x: point.x,
        y: point.y,
        bulge: flipBulge && vertex.bulge != null ? -vertex.bulge : vertex.bulge
      }
    })
    return polylineWith(polyline, vertices)
  },
  offset(polyline, distance) {
    const results = polyline.offset(distance)
    if (results.length === 0) return []
    const first = results[0]
    return [
      new GeometryPolyline2d(
        first.vertices.map(vertex => ({
          x: vertex.x,
          y: vertex.y,
          bulge: vertex.bulge ?? 0
        })),
        first.closed
      )
    ]
  },
  offsetSide(polyline, point) {
    const count = vertexCountOf(polyline)
    let bestDist = Infinity
    let bestSide: 1 | -1 = 1
    const segmentCount = polyline.closed ? count : count - 1
    for (let i = 0; i < segmentCount; i++) {
      const a = polyline.getPointAt(i)
      const b = polyline.getPointAt((i + 1) % count)
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len2 = dx * dx + dy * dy
      if (len2 === 0) continue
      const t = Math.max(
        0,
        Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / len2)
      )
      const d = (point.x - a.x - t * dx) ** 2 + (point.y - a.y - t * dy) ** 2
      if (d < bestDist) {
        bestDist = d
        bestSide = dx * (point.y - a.y) - dy * (point.x - a.x) >= 0 ? 1 : -1
      }
    }
    return bestSide
  },
  intersectCurves(polyline) {
    const vertices = polyline.vertices
    const closed = polyline.closed
    const count = closed ? vertices.length : vertices.length - 1
    if (count < 1 || vertices.length < 2) return []
    const primitives: GeometryIntersectPrimitive[] = []
    for (let i = 0; i < count; i++) {
      const start = vertices[i]
      const end = vertices[(i + 1) % vertices.length]
      const extendable = !closed && (i === 0 || i === count - 1)
      const bulge = start.bulge ?? 0
      if (Math.abs(bulge) > BULGE_EPS) {
        const primitive = polylineArcPrimitive(
          new GeometryCircularArc2d(start, end, bulge),
          extendable
        )
        if (primitive) primitives.push(primitive)
        continue
      }
      const startWcs = toWcs(start.x, start.y)
      const endWcs = toWcs(end.x, end.y)
      if ((startWcs.x - endWcs.x) ** 2 + (startWcs.y - endWcs.y) ** 2 < 1e-20) {
        continue
      }
      primitives.push({
        kind: 'line',
        line: new GeometryLine2d(startWcs, endWcs),
        extent: 'bounded',
        extendable
      })
    }
    return primitives
  },
  extents(polyline) {
    const box = polyline.box
    if (box.isEmpty()) return new GeometryBox3d()
    return new GeometryBox3d().setFromPoints([
      new GeometryPoint2d(box.min.x, box.min.y),
      new GeometryPoint2d(box.max.x, box.min.y),
      new GeometryPoint2d(box.max.x, box.max.y),
      new GeometryPoint2d(box.min.x, box.max.y)
    ])
  },
  draw(polyline, renderer) {
    const points = polyline
      .tessellate(acgiDrawTessellateOptions(renderer))
      .map(point => new GeometryPoint2d(point.x, point.y))
    return renderer.lines(points)
  }
}

const shapeOps = (shape: GeometryShape): ShapeOps<GeometryShape> => {
  if (shape instanceof GeometryLine2d) {
    return lineOps as unknown as ShapeOps<GeometryShape>
  }
  if (shape instanceof GeometryCircularArc2d) {
    return (shape.closed
      ? circleOps
      : arcOps) as unknown as ShapeOps<GeometryShape>
  }
  if (shape instanceof GeometryEllipseArc2d) {
    return ellipseOps as unknown as ShapeOps<GeometryShape>
  }
  if (shape instanceof GeometryPolyline2d) {
    return polylineOps as unknown as ShapeOps<GeometryShape>
  }
  throw new Error(`Unsupported shape ${shape.constructor.name}`)
}

const isCurve = (contents: AcApItemContents) => contents.kind === 'shape'

/** Returns a copy of item contents. */
export function cloneItemContents(
  contents: AcApItemContents
): AcApItemContents {
  switch (contents.kind) {
    case 'shape':
      return { kind: 'shape', geometry: contents.geometry.clone() }
    case 'point':
      return { kind: 'point', geometry: contents.geometry.clone() }
    case 'dimension': {
      const points: Record<string, GeometryPoint2d> = {}
      for (const [name, point] of Object.entries(contents.geometry.points)) {
        points[name] = point.clone()
      }
      return { kind: 'dimension', geometry: { ...contents.geometry, points } }
    }
  }
}

/** Returns the grip points of an item, in grip index order. */
export function itemGripPoints(contents: AcApItemContents): GeometryPoint2d[] {
  switch (contents.kind) {
    case 'shape':
      return shapeOps(contents.geometry).gripPoints(contents.geometry)
    case 'point':
      return [contents.geometry]
    case 'dimension':
      return dimensionGripPoints(contents.geometry)
  }
}

/**
 * Returns new contents with the given grips moved by an offset.
 *
 * @param contents - The item to change
 * @param indices - Indices into {@link itemGripPoints}
 * @param offset - How far to move the grips
 */
export function moveItemGrips(
  contents: AcApItemContents,
  indices: readonly number[],
  offset: GeometryVector2dLike
): AcApItemContents {
  const valid = indices.filter(index => Number.isInteger(index) && index >= 0)
  switch (contents.kind) {
    case 'shape':
      return {
        kind: 'shape',
        geometry: shapeOps(contents.geometry).moveGrips(
          contents.geometry,
          valid,
          offset
        )
      }
    case 'point':
      return {
        kind: 'point',
        geometry: valid.includes(0)
          ? contents.geometry.clone().add(offset)
          : contents.geometry.clone()
      }
    case 'dimension':
      return {
        kind: 'dimension',
        geometry: moveDimensionGrips(contents.geometry, valid, offset)
      }
  }
}

/**
 * Returns the object snap points of an item for one snap mode.
 *
 * @param contents - The item to snap to
 * @param mode - The snap mode
 * @param pickPoint - The cursor position
 */
export function itemOsnapPoints(
  contents: AcApItemContents,
  mode: AcApOsnapMode,
  pickPoint: GeometryPoint2dLike
): GeometryPoint2dLike[] {
  const out: GeometryPoint2dLike[] = []
  switch (contents.kind) {
    case 'shape':
      shapeOps(contents.geometry).osnapPoints(
        contents.geometry,
        mode,
        pickPoint,
        out
      )
      break
    case 'point':
      if (mode === AcApOsnapMode.Node) out.push(contents.geometry)
      break
    case 'dimension':
      for (const line of dimensionGraphics(contents.geometry).lines) {
        lineOps.osnapPoints(line, mode, pickPoint, out)
      }
      break
  }
  return out
}

/** Returns new contents transformed by a matrix. */
export function transformItem(
  contents: AcApItemContents,
  matrix: GeometryMatrix3d
): AcApItemContents {
  switch (contents.kind) {
    case 'shape':
      return {
        kind: 'shape',
        geometry: shapeOps(contents.geometry).transform(
          contents.geometry,
          matrix
        )
      }
    case 'point':
      return {
        kind: 'point',
        geometry: contents.geometry.clone().applyMatrix4(matrix)
      }
    case 'dimension':
      return {
        kind: 'dimension',
        geometry: transformDimension(contents.geometry, matrix)
      }
  }
}

/** Whether an item can be offset: lines, circles, arcs, ellipses and polylines. */
export function canOffsetItem(contents: AcApItemContents): boolean {
  return isCurve(contents)
}

/**
 * Returns the curves at a distance from an item. A positive distance offsets
 * to the side {@link itemOffsetSide} reports as 1.
 */
export function offsetItem(
  contents: AcApItemContents,
  distance: number
): AcApItemContents[] {
  if (contents.kind !== 'shape') return []
  return shapeOps(contents.geometry)
    .offset(contents.geometry, distance)
    .map(geometry => ({ kind: 'shape', geometry }))
}

/** Returns which side of an item a point is on, for {@link offsetItem}. */
export function itemOffsetSide(
  contents: AcApItemContents,
  point: GeometryPoint2dLike
): 1 | -1 {
  if (contents.kind !== 'shape') return 1
  return shapeOps(contents.geometry).offsetSide(contents.geometry, point)
}

/** Returns the curves of an item that intersections are computed with. */
export function itemIntersectCurves(
  contents: AcApItemContents
): GeometryIntersectPrimitive[] {
  switch (contents.kind) {
    case 'shape':
      return shapeOps(contents.geometry).intersectCurves(contents.geometry)
    case 'point':
      return []
    case 'dimension':
      return dimensionGraphics(contents.geometry).lines.map(line => ({
        kind: 'line',
        line,
        extent: 'bounded'
      }))
  }
}

/** Returns the points where two items cross. */
export function intersectItems(
  a: AcApItemContents,
  b: AcApItemContents
): GeometryPoint2d[] {
  const curvesA = itemIntersectCurves(a)
  const curvesB = itemIntersectCurves(b)
  if (curvesA.length === 0 || curvesB.length === 0) return []
  return geometryIntersectCurves(curvesA, curvesB, false, false)
}

/** Returns the bounding box of an item. */
export function itemExtents(contents: AcApItemContents): GeometryBox3d {
  switch (contents.kind) {
    case 'shape':
      return shapeOps(contents.geometry).extents(contents.geometry)
    case 'point':
      return new GeometryBox3d().expandByPoint(contents.geometry)
    case 'dimension':
      return dimensionExtents(contents.geometry as GeometryDimension)
  }
}

/**
 * Returns the single batchable primitive an item draws, or `null` when it is
 * drawn as its own object.
 */
export function itemDirectBatchPrimitive(
  contents: AcApItemContents,
  pointDisplay: AcApPointDisplay
): AcGiDirectBatchPrimitive | null {
  switch (contents.kind) {
    case 'shape':
      return 'lineStrip'
    case 'point':
      return pointDisplay.displayMode === 0 ? 'point' : null
    case 'dimension':
      return null
  }
}

/**
 * Draws an item with a renderer whose traits are already set.
 *
 * @param contents - The item to draw
 * @param renderer - The renderer to draw with
 * @param pointDisplay - How points are drawn
 */
export function drawItem(
  contents: AcApItemContents,
  renderer: AcGiRenderer,
  pointDisplay: AcApPointDisplay
): AcGiEntity | undefined {
  switch (contents.kind) {
    case 'shape':
      return shapeOps(contents.geometry).draw(contents.geometry, renderer)
    case 'point':
      return renderer.point(contents.geometry, pointDisplay)
    case 'dimension':
      return drawDimension(contents.geometry, renderer)
  }
}
