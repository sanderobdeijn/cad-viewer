import {
  GeometryPoint2d,
  geometryTransformOcsPointToWcs
} from '@mlightcad/geometry-engine'

import {
  AcDb2dPolyline,
  AcDbAlignedDimension,
  AcDbCircle,
  AcDbLine,
  AcDbPoly2dType,
  AcDbPolyline
} from '../src/entity'
import { AcDbIntersect } from '../src/misc'

function expectPoint(
  points: GeometryPoint2d[],
  expected: { x: number; y: number },
  digits = 5
) {
  const match = points.find(
    point =>
      Math.abs(point.x - expected.x) < 10 ** -digits &&
      Math.abs(point.y - expected.y) < 10 ** -digits
  )
  expect(match).toBeDefined()
}

describe('AcDbEntity.intersectWith', () => {
  it('intersects two crossing line segments', () => {
    const a = new AcDbLine(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(10, 0)
    )
    const b = new AcDbLine(
      new GeometryPoint2d(5, -5),
      new GeometryPoint2d(5, 5)
    )

    const points = a.intersectWith(b)
    expect(points).toHaveLength(1)
    expectPoint(points, { x: 5, y: 0 })
  })

  it('intersects a line with a circle', () => {
    const line = new AcDbLine(
      new GeometryPoint2d(-10, 0),
      new GeometryPoint2d(10, 0)
    )
    const circle = new AcDbCircle(new GeometryPoint2d(0, 0), 5)

    const points = line.intersectWith(circle)
    expect(points).toHaveLength(2)
    expectPoint(points, { x: -5, y: 0 })
    expectPoint(points, { x: 5, y: 0 })
  })

  it('intersects a line with a bulged polyline segment', () => {
    const polyline = new AcDbPolyline()
    polyline.addVertexAt(0, new GeometryPoint2d(0, 0), 1)
    polyline.addVertexAt(1, new GeometryPoint2d(2, 0))
    const line = new AcDbLine(
      new GeometryPoint2d(1, -2),
      new GeometryPoint2d(1, 2)
    )

    const points = polyline.intersectWith(line)
    expect(points).toHaveLength(1)
    expectPoint(points, { x: 1, y: -1 })
  })

  it('does not extend a closed or middle polyline segment', () => {
    const polyline = new AcDbPolyline()
    polyline.addVertexAt(0, new GeometryPoint2d(0, 0))
    polyline.addVertexAt(1, new GeometryPoint2d(2, 0))
    polyline.addVertexAt(2, new GeometryPoint2d(2, 2))
    polyline.addVertexAt(3, new GeometryPoint2d(4, 2))
    const line = new AcDbLine(
      new GeometryPoint2d(1, 5),
      new GeometryPoint2d(3, 5)
    )

    expect(polyline.intersectWith(line, AcDbIntersect.ExtendThis)).toEqual([])
  })

  it('extends a bounded line when ExtendThis is set', () => {
    const shortLine = new AcDbLine(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(4, 0)
    )
    const vertical = new AcDbLine(
      new GeometryPoint2d(8, -1),
      new GeometryPoint2d(8, 1)
    )

    expect(shortLine.intersectWith(vertical)).toEqual([])
    const extended = shortLine.intersectWith(vertical, AcDbIntersect.ExtendThis)
    expect(extended).toHaveLength(1)
    expectPoint(extended, { x: 8, y: 0 })
  })

  it('intersects the dimension line of a dimension', () => {
    const dim = new AcDbAlignedDimension(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(5, 0),
      new GeometryPoint2d(5, 1)
    )
    const cutter = new AcDbLine(
      new GeometryPoint2d(2.5, 0.5),
      new GeometryPoint2d(2.5, 4)
    )
    const points = dim.intersectWith(cutter)
    expect(points).toHaveLength(1)
    expectPoint(points, { x: 2.5, y: 1 })
  })

  it('intersects a 2d polyline using its extrusion normal', () => {
    const polyline = new AcDb2dPolyline(AcDbPoly2dType.SimplePoly, [
      { x: 0, y: 0 },
      { x: 10, y: 0 }
    ])
    polyline.normal = { x: 0, y: 0, z: -1 }
    const start = geometryTransformOcsPointToWcs(
      { x: 0, y: 0 },
      polyline.normal
    )
    const end = geometryTransformOcsPointToWcs({ x: 10, y: 0 }, polyline.normal)
    const mid = new GeometryPoint2d().addVectors(start, end).multiplyScalar(0.5)
    const cutter = new AcDbLine(
      new GeometryPoint2d(mid.x, mid.y + 1),
      new GeometryPoint2d(mid.x, mid.y - 1)
    )

    const points = polyline.intersectWith(cutter)
    expect(points).toHaveLength(1)
    expectPoint(points, mid)
  })
})
