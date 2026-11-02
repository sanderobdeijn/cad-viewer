import { AcGeCatmullRomCurve2d, AcGeMatrix3d } from '../src'

describe('AcGeCatmullRomCurve2d', () => {
  it('samples points along curve', () => {
    const catmull = new AcGeCatmullRomCurve2d([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 0 },
      { x: 3, y: 1 }
    ])

    const pts = catmull.getPoints(8)
    expect(pts).toHaveLength(9)
    expect(catmull.length).toBeGreaterThan(0)
  })

  it('covers empty/single/closed and bounding-box branches', () => {
    const empty = new AcGeCatmullRomCurve2d([])
    expect(empty.getPoint(0.5).toArray()).toEqual([0, 0])
    expect(empty.box.isEmpty()).toBe(true)

    const single = new AcGeCatmullRomCurve2d([{ x: 2, y: 3 }])
    expect(single.getPoint(0.2).toArray()).toEqual([2, 3])

    const closed = new AcGeCatmullRomCurve2d(
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 }
      ],
      true,
      'catmullrom'
    )
    expect(closed.length).toBeGreaterThan(2)
    closed.setClosed(true) // no-op early return branch
    expect(closed.getPoint(1).toArray()).toHaveLength(2)

    const transformed = closed.transform3d(
      new AcGeMatrix3d().makeTranslation(1, 2, 3)
    )
    expect(transformed.box.isEmpty()).toBe(false)
  })

  it('covers chordal repeated-point safety, t=1 edge and setters', () => {
    const curve = new AcGeCatmullRomCurve2d(
      [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 0 }
      ],
      false,
      'chordal'
    )

    // hits non-closed t=1 branch where intPoint/weight are adjusted
    const end = curve.getPoint(1)
    expect(end.toArray()).toHaveLength(2)

    // hits nonuniform dt safety branches with repeated points
    expect(curve.getPoint(0.5).x).toBeGreaterThanOrEqual(0)

    curve.setCurveType('catmullrom')
    curve.setTension(0.25)
    expect(curve.getPoint(0.25).toArray()).toHaveLength(2)

    curve.setPoints([
      { x: -1, y: -2 },
      { x: 2, y: 0 },
      { x: 4, y: 1 }
    ])
    curve.setClosed(false)
    expect(curve.startPoint.x).toBe(-1)
    expect(curve.endPoint.x).toBe(4)
    expect(curve.transform3d(new AcGeMatrix3d().makeTranslation(1, 0, 0))).toBe(
      curve
    )
  })

  it('covers default constructor and length short-circuit', () => {
    const curve = new AcGeCatmullRomCurve2d()
    expect(curve.points).toHaveLength(0)
    expect(curve.closed).toBe(false)
    expect(curve.curveType).toBe('centripetal')
    expect(curve.tension).toBe(0.5)
    expect(curve.length).toBe(0)
  })

  it('clones curve with deep-copied points', () => {
    const curve = new AcGeCatmullRomCurve2d(
      [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 0 }
      ],
      true,
      'catmullrom',
      0.3
    )
    const cloned = curve.clone()

    expect(cloned).not.toBe(curve)
    expect(cloned.closed).toBe(true)
    expect(cloned.curveType).toBe('catmullrom')
    expect(cloned.tension).toBeCloseTo(0.3, 8)

    cloned.points[0].x = 99
    expect(curve.points[0].x).toBe(0)
  })
})
