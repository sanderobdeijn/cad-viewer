import {
  GeometryCircularArc2d,
  GeometryEllipseArc2d,
  GeometryLine2d,
  GeometryMatrix2d,
  GeometryPoint2d,
  GeometryPolyline2d
} from '../src'

const expectPoint2dClose = (
  actual: { x: number; y: number },
  expected: { x: number; y: number }
) => {
  expect(actual.x).toBeCloseTo(expected.x, 8)
  expect(actual.y).toBeCloseTo(expected.y, 8)
}

const transformPoint2d = (
  point: { x: number; y: number },
  matrix: GeometryMatrix2d
) => new GeometryPoint2d(point).applyMatrix2d(matrix)

describe('Geometry transform regression', () => {
  it('keeps line geometry aligned across common matrix families', () => {
    const line2dCases = [
      {
        name: 'translation',
        matrix: new GeometryMatrix2d().makeTranslation(3, -2)
      },
      {
        name: 'rotation',
        matrix: new GeometryMatrix2d().makeRotation(Math.PI / 2)
      },
      {
        name: 'mirror',
        matrix: new GeometryMatrix2d().makeScale(-1, 1)
      },
      {
        name: 'non-uniform-scale',
        matrix: new GeometryMatrix2d().makeScale(2, 3)
      }
    ]
    line2dCases.forEach(({ matrix }) => {
      const start = { x: 1, y: 2 }
      const end = { x: 4, y: -1 }
      const line = new GeometryLine2d(start, end)

      line.transform(matrix)

      expectPoint2dClose(line.startPoint, transformPoint2d(start, matrix))
      expectPoint2dClose(line.endPoint, transformPoint2d(end, matrix))
    })
  })

  it('transforms lines directly', () => {
    const line2d = new GeometryLine2d({ x: 0, y: 0 }, { x: 2, y: 1 })
    const line3d = new GeometryLine2d(
      new GeometryPoint2d(1, 2),
      new GeometryPoint2d(4, 5)
    )

    line2d.transform(new GeometryMatrix2d().makeTranslation(3, -4))
    line3d.transform(new GeometryMatrix2d().makeTranslation(-1, 2))

    expectPoint2dClose(line2d.startPoint, { x: 3, y: -4 })
    expectPoint2dClose(line2d.endPoint, { x: 5, y: -3 })
    expectPoint2dClose(line3d.startPoint, { x: 0, y: 4 })
    expectPoint2dClose(line3d.endPoint, { x: 3, y: 7 })
  })

  it('transforms 2d circular arcs and flips orientation on mirror', () => {
    const arc = new GeometryCircularArc2d(
      { x: 0, y: 0 },
      2,
      0,
      Math.PI / 2,
      false
    )
    arc.transform(new GeometryMatrix2d().makeScale(1, -1))

    expectPoint2dClose(arc.center, { x: 0, y: 0 })
    expect(arc.radius).toBeCloseTo(2, 8)
    expect(arc.clockwise).toBe(true)
    expectPoint2dClose(arc.startPoint, { x: 2, y: 0 })
    expectPoint2dClose(arc.endPoint, { x: 0, y: -2 })
  })

  it('transforms 2d ellipse arcs with rotation', () => {
    const ellipse = new GeometryEllipseArc2d(
      { x: 0, y: 0 },
      4,
      2,
      0,
      Math.PI / 2
    )
    ellipse.transform(new GeometryMatrix2d().makeRotation(Math.PI / 2))

    expectPoint2dClose(ellipse.center, { x: 0, y: 0 })
    expect(ellipse.rotation).toBeCloseTo(Math.PI / 2, 8)
    expectPoint2dClose(ellipse.startPoint, { x: 0, y: 4 })
    expectPoint2dClose(ellipse.endPoint, { x: -2, y: 0 })
  })

  it('transforms 2d polylines and mirrored bulges', () => {
    const polyline = new GeometryPolyline2d([
      { x: 0, y: 0, bulge: 1 },
      { x: 2, y: 0 }
    ])

    polyline.transform(new GeometryMatrix2d().makeScale(1, -1))

    expectPoint2dClose(polyline.getPointAt(0), { x: 0, y: 0 })
    expectPoint2dClose(polyline.getPointAt(1), { x: 2, y: 0 })
    expect(polyline.vertices[0].bulge).toBe(-1)
  })

  it('keeps polyline vertices consistent across translation rotation and mirror', () => {
    const cases = [
      {
        matrix: new GeometryMatrix2d().makeTranslation(5, 6),
        expectedBulge: 1
      },
      {
        matrix: new GeometryMatrix2d().makeRotation(Math.PI / 2),
        expectedBulge: 1
      },
      {
        matrix: new GeometryMatrix2d().makeScale(-1, 1),
        expectedBulge: -1
      }
    ]

    cases.forEach(({ matrix, expectedBulge }) => {
      const vertices = [
        { x: 0, y: 0, bulge: 1 },
        { x: 2, y: 1 }
      ]
      const polyline = new GeometryPolyline2d(
        vertices.map(vertex => ({ ...vertex }))
      )

      polyline.transform(matrix)

      expectPoint2dClose(
        polyline.getPointAt(0),
        transformPoint2d(vertices[0], matrix)
      )
      expectPoint2dClose(
        polyline.getPointAt(1),
        transformPoint2d(vertices[1], matrix)
      )
      expect(polyline.vertices[0].bulge).toBe(expectedBulge)
    })
  })

  it('transforms circular arcs using transformed points instead of origin-relative vectors', () => {
    const arc = new GeometryCircularArc2d(
      new GeometryPoint2d(5, 5),
      2,
      0,
      Math.PI / 2,
      false
    )

    arc.transform(new GeometryMatrix2d().makeTranslation(3, -1))

    expectPoint2dClose(arc.center, { x: 8, y: 4 })
    expectPoint2dClose(arc.startPoint, { x: 10, y: 4 })
    expectPoint2dClose(arc.endPoint, { x: 8, y: 6 })
  })

  it('transforms mirrored circular arcs and flips their direction', () => {
    const arc = new GeometryCircularArc2d(
      new GeometryPoint2d(0, 0),
      2,
      0,
      Math.PI / 2,
      false
    )

    arc.transform(new GeometryMatrix2d().makeScale(-1, 1))

    expectPoint2dClose(arc.center, { x: 0, y: 0 })
    expectPoint2dClose(arc.startPoint, { x: -2, y: 0 })
    expectPoint2dClose(arc.endPoint, { x: 0, y: 2 })
    expect(arc.clockwise).toBe(true)
  })

  it('transforms ellipse arcs and preserves endpoints', () => {
    const ellipse = new GeometryEllipseArc2d(
      new GeometryPoint2d(1, 0),
      4,
      2,
      0,
      Math.PI / 2
    )
    const matrix = new GeometryMatrix2d().makeTranslation(2, 3)

    ellipse.transform(matrix)

    expectPoint2dClose(ellipse.center, { x: 3, y: 3 })
    expectPoint2dClose(ellipse.startPoint, { x: 7, y: 3 })
    expectPoint2dClose(ellipse.endPoint, { x: 3, y: 5 })
  })

  it('transforms ellipse arcs under non-uniform scaling', () => {
    const ellipse = new GeometryEllipseArc2d(
      new GeometryPoint2d(0, 0),
      2,
      1,
      0,
      Math.PI / 2
    )

    ellipse.transform(new GeometryMatrix2d().makeScale(3, 4))

    expect(ellipse.majorAxisRadius).toBeCloseTo(6, 8)
    expect(ellipse.minorAxisRadius).toBeCloseTo(4, 8)
    expectPoint2dClose(ellipse.startPoint, { x: 6, y: 0 })
    expectPoint2dClose(ellipse.endPoint, { x: 0, y: 4 })
  })
})
