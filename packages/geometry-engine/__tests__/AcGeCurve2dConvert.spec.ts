import {
  AcGeCircArc2d,
  acgeCircArc2dTo3d,
  acgeCircArc3dTo2d,
  AcGeEllipseArc2d,
  acgeEllipseArc2dTo3d,
  acgeEllipseArc3dTo2d,
  AcGeLine2d,
  acgeLine2dTo3d,
  AcGeMatrix3d,
  acgePoint2dTo3d,
  AcGeSpline2d,
  TAU
} from '../src'

const expectPoint = (
  actual: { x: number; y: number },
  x: number,
  y: number
) => {
  expect(actual.x).toBeCloseTo(x, 8)
  expect(actual.y).toBeCloseTo(y, 8)
}

const mirrorX = () => new AcGeMatrix3d().makeScale(-1, 1, 1)
const rotate90 = () => new AcGeMatrix3d().makeRotationZ(Math.PI / 2)

describe('acgePoint2dTo3d and acgeLine2dTo3d', () => {
  it('places geometry at Z = 0', () => {
    expect(acgePoint2dTo3d({ x: 1, y: 2 })).toMatchObject({ x: 1, y: 2, z: 0 })
    const line = acgeLine2dTo3d(new AcGeLine2d({ x: 1, y: 2 }, { x: 3, y: 4 }))
    expect(line.startPoint).toMatchObject({ x: 1, y: 2, z: 0 })
    expect(line.endPoint).toMatchObject({ x: 3, y: 4, z: 0 })
  })
})

describe('circular arc conversion', () => {
  const sweeps: Array<[string, boolean, number, number, number, number]> = [
    ['counterclockwise', false, 0, Math.PI / 2, Math.SQRT1_2, Math.SQRT1_2],
    ['clockwise', true, Math.PI / 2, 0, Math.SQRT1_2, Math.SQRT1_2],
    ['clockwise across zero', true, Math.PI / 4, -Math.PI / 4, 1, 0]
  ]

  it.each(sweeps)(
    'keeps the end points and sweep of a %s arc',
    (_name, clockwise, start, end, midX, midY) => {
      const arc = AcGeCircArc2d.fromMathAngles(
        { x: 0, y: 0 },
        10,
        start,
        end,
        clockwise
      )
      const arc3d = acgeCircArc2dTo3d(arc)

      expectPoint(arc3d.startPoint, 10 * Math.cos(start), 10 * Math.sin(start))
      expectPoint(arc3d.endPoint, 10 * Math.cos(end), 10 * Math.sin(end))
      expectPoint(arc3d.midPoint, 10 * midX, 10 * midY)
      expect(arc3d.startPoint.z).toBe(0)

      const back = acgeCircArc3dTo2d(arc3d)
      expect(back.clockwise).toBe(clockwise)
      expectPoint(back.startPoint, arc3d.startPoint.x, arc3d.startPoint.y)
      expectPoint(back.endPoint, arc3d.endPoint.x, arc3d.endPoint.y)
      expectPoint(back.midPoint, arc3d.midPoint.x, arc3d.midPoint.y)
    }
  )

  it('keeps a full circle closed in both directions', () => {
    const circle = AcGeCircArc2d.fromMathAngles({ x: 1, y: 2 }, 3, 0, 0, false)
    expect(circle.closed).toBe(true)
    const circle3d = acgeCircArc2dTo3d(circle)
    expect(circle3d.closed).toBe(true)
    expect(circle3d.length).toBeCloseTo(TAU * 3, 8)
    expect(acgeCircArc3dTo2d(circle3d).closed).toBe(true)
  })

  it('flips direction when mirrored and keeps the same drawn points', () => {
    const arc = AcGeCircArc2d.fromMathAngles(
      { x: 0, y: 0 },
      5,
      0,
      Math.PI / 2,
      false
    )
    const mirrored = acgeCircArc3dTo2d(
      acgeCircArc2dTo3d(arc).transform(mirrorX())
    )
    expect(mirrored.clockwise).toBe(true)
    expectPoint(mirrored.startPoint, -5, 0)
    expectPoint(mirrored.endPoint, 0, 5)
    expectPoint(mirrored.midPoint, -5 * Math.SQRT1_2, 5 * Math.SQRT1_2)
  })

  it('keeps a rotated arc in place', () => {
    const arc = AcGeCircArc2d.fromMathAngles(
      { x: 0, y: 0 },
      5,
      0,
      Math.PI / 2,
      false
    )
    const rotated = acgeCircArc3dTo2d(
      acgeCircArc2dTo3d(arc).transform(rotate90())
    )
    expect(rotated.clockwise).toBe(false)
    expectPoint(rotated.startPoint, 0, 5)
    expectPoint(rotated.endPoint, -5, 0)
  })
})

describe('ellipse arc conversion', () => {
  const samples = (arc: { getPoint: (t: number) => { x: number; y: number } }) =>
    [0, 0.25, 0.5, 0.75, 1].map(t => arc.getPoint(t))

  it.each([
    ['counterclockwise', false],
    ['clockwise', true]
  ])('draws the same points for a %s arc', (_name, clockwise) => {
    const arc = new AcGeEllipseArc2d(
      { x: 1, y: 2 },
      5,
      2,
      0.5,
      2,
      clockwise,
      Math.PI / 6
    )
    const arc3d = acgeEllipseArc2dTo3d(arc)
    expect(arc3d.startPoint.z).toBe(0)
    expectPoint(arc3d.startPoint, arc.startPoint.x, arc.startPoint.y)
    expectPoint(arc3d.endPoint, arc.endPoint.x, arc.endPoint.y)

    const back = acgeEllipseArc3dTo2d(arc3d)
    expect(back.clockwise).toBe(clockwise)
    expect(back.rotation).toBeCloseTo(Math.PI / 6, 8)
    samples(arc).forEach((point, index) => {
      const other = samples(back)[index]
      expectPoint(other, point.x, point.y)
    })
  })

  it('keeps a full ellipse closed', () => {
    const ellipse = new AcGeEllipseArc2d({ x: 0, y: 0 }, 5, 2)
    const ellipse3d = acgeEllipseArc2dTo3d(ellipse)
    expect(ellipse3d.area).toBeCloseTo(Math.PI * 10, 8)
    expect(acgeEllipseArc3dTo2d(ellipse3d).closed).toBe(true)
  })

  it('keeps the drawn end points when mirrored', () => {
    const arc = new AcGeEllipseArc2d({ x: 0, y: 0 }, 5, 2, 0, Math.PI / 2)
    const mirrored = acgeEllipseArc3dTo2d(
      acgeEllipseArc2dTo3d(arc).transform(mirrorX())
    )
    expectPoint(mirrored.startPoint, -5, 0)
    expectPoint(mirrored.endPoint, 0, 2)
  })
})

describe('AcGeSpline2d', () => {
  const fitPoints = [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    { x: 2, y: 0 },
    { x: 3, y: 1 }
  ]

  it('exposes 2D points only', () => {
    const spline = new AcGeSpline2d(fitPoints, 'Chord', 3, false)
    expect(spline.startPoint).toEqual(
      expect.objectContaining({ x: 0, y: 0 })
    )
    expect(spline.startPoint).not.toHaveProperty('z')
    expect(spline.endPoint.x).toBeCloseTo(3, 6)
    expect(spline.getGripPoints()).toHaveLength(4)
    expect(spline.getGripPoints()[0]).not.toHaveProperty('z')
    expect(spline.tessellate().length).toBeGreaterThan(4)
    expect(spline.tessellate()[0]).not.toHaveProperty('z')
    expect(spline.controlPoints[0]).not.toHaveProperty('z')
  })

  it('computes a bounding box that follows moved grips', () => {
    const spline = new AcGeSpline2d(fitPoints, 'Chord', 3, false)
    expect(spline.box.max.x).toBeCloseTo(3, 6)
    spline.moveGripPointsAt([3], { x: 7, y: 0 })
    expect(spline.endPoint.x).toBeCloseTo(10, 6)
    expect(spline.box.max.x).toBeCloseTo(10, 6)
  })

  it('stays flat when moved in Z and returns independent clones', () => {
    const spline = new AcGeSpline2d(fitPoints, 'Chord', 3, false)
    const clone = spline.clone()
    spline.transform3d(new AcGeMatrix3d().makeTranslation(5, 0, 9))
    expect(spline.startPoint.x).toBeCloseTo(5, 6)
    expect(spline.to3d().startPoint.z).toBe(0)
    expect(clone.startPoint.x).toBeCloseTo(0, 6)
  })

  it('creates from control points and returns null for invalid input', () => {
    const spline = AcGeSpline2d.fromControlPoints(
      fitPoints,
      [0, 0, 0, 0, 1, 1, 1, 1],
      undefined,
      3,
      false
    )
    expect(spline).not.toBeNull()
    expect(spline!.degree).toBe(3)
    expect(
      AcGeSpline2d.fromFitPoints([], 'Chord', 3, false)
    ).toBeNull()
  })

  it('samples points along the curve from start to end', () => {
    const spline = new AcGeSpline2d(fitPoints, 'Chord', 3, false)
    expectPoint(spline.getPoint(0), 0, 0)
    expectPoint(spline.getPoint(1), 3, 1)
  })
})
