import {
  GeometryCircularArc2d,
  GeometryCurveExtent,
  GeometryEllipseArc2d,
  geometryIntersectCurves,
  GeometryIntersectPrimitive,
  GeometryLine2d,
  GeometryPoint2d,
  TAU
} from '../src'

function linePrim(
  start: [number, number],
  end: [number, number],
  extent: GeometryCurveExtent = 'bounded',
  extendable = true
): GeometryIntersectPrimitive {
  return {
    kind: 'line',
    line: new GeometryLine2d(
      { x: start[0], y: start[1] },
      { x: end[0], y: end[1] }
    ),
    extent,
    extendable
  }
}

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

describe('geometryIntersectCurves', () => {
  it('intersects two crossing line segments', () => {
    const points = geometryIntersectCurves(
      [linePrim([0, 0], [10, 0])],
      [linePrim([5, -5], [5, 5])]
    )
    expect(points).toHaveLength(1)
    expectPoint(points, { x: 5, y: 0 })
  })

  it('returns empty for parallel lines', () => {
    const points = geometryIntersectCurves(
      [linePrim([0, 0], [10, 0])],
      [linePrim([0, 1], [10, 1])]
    )
    expect(points).toEqual([])
  })

  it('returns empty for collinear overlapping segments', () => {
    const points = geometryIntersectCurves(
      [linePrim([0, 0], [10, 0])],
      [linePrim([5, 0], [15, 0])]
    )
    expect(points).toEqual([])
  })

  it('extends a bounded segment to meet another line', () => {
    const points = geometryIntersectCurves(
      [linePrim([0, 0], [4, 0])],
      [linePrim([8, -1], [8, 1])],
      true,
      false
    )
    expect(points).toHaveLength(1)
    expectPoint(points, { x: 8, y: 0 })
  })

  it('does not extend when extendable is false', () => {
    const points = geometryIntersectCurves(
      [linePrim([0, 0], [4, 0], 'bounded', false)],
      [linePrim([8, -1], [8, 1])],
      true,
      false
    )
    expect(points).toEqual([])
  })

  it('intersects a ray but not behind its origin', () => {
    const ray = linePrim([0, 0], [1, 0], 'ray')
    const ahead = geometryIntersectCurves([ray], [linePrim([5, -1], [5, 1])])
    expect(ahead).toHaveLength(1)
    const behind = geometryIntersectCurves([ray], [linePrim([-5, -1], [-5, 1])])
    expect(behind).toEqual([])
  })

  it('intersects a line with a circle at two points', () => {
    const circle: GeometryIntersectPrimitive = {
      kind: 'circularArc',
      arc: new GeometryCircularArc2d({ x: 0, y: 0 }, 5, 0, TAU, false),
      extendable: false
    }
    const points = geometryIntersectCurves(
      [linePrim([-10, 0], [10, 0])],
      [circle]
    )
    expect(points).toHaveLength(2)
    expectPoint(points, { x: 5, y: 0 })
    expectPoint(points, { x: -5, y: 0 })
  })

  it('clips circle intersections to an arc sweep', () => {
    const arc: GeometryIntersectPrimitive = {
      kind: 'circularArc',
      arc: new GeometryCircularArc2d({ x: 0, y: 0 }, 5, 0, Math.PI / 2, false)
    }
    const points = geometryIntersectCurves([linePrim([-10, 0], [10, 0])], [arc])
    expect(points).toHaveLength(1)
    expectPoint(points, { x: 5, y: 0 })
  })

  it('extends an arc to a full circle', () => {
    const arc: GeometryIntersectPrimitive = {
      kind: 'circularArc',
      arc: new GeometryCircularArc2d({ x: 0, y: 0 }, 5, 0, Math.PI / 2, false)
    }
    const points = geometryIntersectCurves(
      [linePrim([-10, 0], [10, 0])],
      [arc],
      false,
      true
    )
    expect(points).toHaveLength(2)
    expectPoint(points, { x: 5, y: 0 })
    expectPoint(points, { x: -5, y: 0 })
  })

  it('finds a tangent line-circle intersection', () => {
    const circle: GeometryIntersectPrimitive = {
      kind: 'circularArc',
      arc: new GeometryCircularArc2d({ x: 0, y: 0 }, 5, 0, TAU, false),
      extendable: false
    }
    const points = geometryIntersectCurves(
      [linePrim([-10, 5], [10, 5])],
      [circle]
    )
    expect(points).toHaveLength(1)
    expectPoint(points, { x: 0, y: 5 })
  })

  it('intersects two coplanar circles', () => {
    const a: GeometryIntersectPrimitive = {
      kind: 'circularArc',
      arc: new GeometryCircularArc2d({ x: 0, y: 0 }, 5, 0, TAU, false),
      extendable: false
    }
    const b: GeometryIntersectPrimitive = {
      kind: 'circularArc',
      arc: new GeometryCircularArc2d({ x: 6, y: 0 }, 5, 0, TAU, false),
      extendable: false
    }
    const points = geometryIntersectCurves([a], [b])
    expect(points).toHaveLength(2)
    expectPoint(points, { x: 3, y: 4 }, 4)
    expectPoint(points, { x: 3, y: -4 }, 4)
  })

  it('intersects a line with an ellipse', () => {
    const ellipse: GeometryIntersectPrimitive = {
      kind: 'ellipseArc',
      arc: new GeometryEllipseArc2d({ x: 0, y: 0 }, 10, 5, 0, TAU),
      extendable: false
    }
    const points = geometryIntersectCurves(
      [linePrim([-20, 0], [20, 0])],
      [ellipse]
    )
    expect(points).toHaveLength(2)
    expectPoint(points, { x: 10, y: 0 })
    expectPoint(points, { x: -10, y: 0 })
  })

  it('clips to a clockwise arc sweep', () => {
    // Clockwise from +Y down to +X, so only the +X hit is on the arc.
    const arc: GeometryIntersectPrimitive = {
      kind: 'circularArc',
      arc: GeometryCircularArc2d.fromMathAngles(
        { x: 0, y: 0 },
        5,
        Math.PI / 2,
        0,
        true
      ),
      extendable: false
    }
    const points = geometryIntersectCurves([linePrim([-10, 0], [10, 0])], [arc])
    expect(points).toHaveLength(1)
    expectPoint(points, { x: 5, y: 0 })
  })

  it('keeps a hit at the start of an arc', () => {
    const arc: GeometryIntersectPrimitive = {
      kind: 'circularArc',
      arc: GeometryCircularArc2d.fromMathAngles(
        { x: 0, y: 0 },
        5,
        0,
        Math.PI / 2,
        false
      ),
      extendable: false
    }
    const points = geometryIntersectCurves([linePrim([0, 0], [10, 0])], [arc])
    expect(points).toHaveLength(1)
    expectPoint(points, { x: 5, y: 0 })
  })

  it('intersects a rotated ellipse arc using its own axes', () => {
    const ellipse: GeometryIntersectPrimitive = {
      kind: 'ellipseArc',
      arc: new GeometryEllipseArc2d(
        { x: 0, y: 0 },
        10,
        5,
        0,
        Math.PI,
        false,
        Math.PI / 2
      ),
      extendable: false
    }
    // The major axis points up and the half-arc covers the -X side.
    const points = geometryIntersectCurves(
      [linePrim([-20, 0], [20, 0])],
      [ellipse]
    )
    expect(points).toHaveLength(1)
    expectPoint(points, { x: -5, y: 0 })
  })

  it('clips to a clockwise ellipse sweep', () => {
    const ellipse: GeometryIntersectPrimitive = {
      kind: 'ellipseArc',
      arc: new GeometryEllipseArc2d(
        { x: 0, y: 0 },
        10,
        5,
        0,
        Math.PI / 2,
        true
      ),
      extendable: false
    }
    // Clockwise from +X round through -Y and -X to +Y, so both hits count.
    const points = geometryIntersectCurves(
      [linePrim([-20, 0], [20, 0])],
      [ellipse]
    )
    expect(points).toHaveLength(2)
  })

  it('intersects a circle with an ellipse', () => {
    const circle: GeometryIntersectPrimitive = {
      kind: 'circularArc',
      arc: GeometryCircularArc2d.fromMathAngles({ x: 0, y: 0 }, 7, 0, 0, false),
      extendable: false
    }
    const ellipse: GeometryIntersectPrimitive = {
      kind: 'ellipseArc',
      arc: new GeometryEllipseArc2d({ x: 0, y: 0 }, 10, 5),
      extendable: false
    }
    expect(geometryIntersectCurves([circle], [ellipse])).toHaveLength(4)
  })

  it('intersects two ellipses', () => {
    const a: GeometryIntersectPrimitive = {
      kind: 'ellipseArc',
      arc: new GeometryEllipseArc2d({ x: 0, y: 0 }, 10, 5),
      extendable: false
    }
    const b: GeometryIntersectPrimitive = {
      kind: 'ellipseArc',
      arc: new GeometryEllipseArc2d({ x: 0, y: 0 }, 5, 10),
      extendable: false
    }
    expect(geometryIntersectCurves([a], [b])).toHaveLength(4)
  })
})
