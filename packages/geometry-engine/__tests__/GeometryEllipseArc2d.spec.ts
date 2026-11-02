import {
  GeometryEllipseArc2d,
  GeometryMatrix2d,
  GeometryMatrix3d
} from '../src'

describe('GeometryEllipseArc2d', () => {
  it('evaluates points on arc', () => {
    const ellipse = new GeometryEllipseArc2d({ x: 0, y: 0 }, 3, 2, 0, Math.PI)
    const mid = ellipse.getPoint(0.5)
    expect(mid.y).toBeCloseTo(2, 6)
  })

  it('covers full-ellipse and clockwise branches', () => {
    const full = new GeometryEllipseArc2d(
      { x: 0, y: 0 },
      3,
      2,
      0.3,
      0.3 + Math.PI * 2
    )
    expect(full.startAngle).toBe(0)
    expect(full.endAngle).toBeCloseTo(Math.PI * 2, 8)

    const cwFull = new GeometryEllipseArc2d(
      { x: 0, y: 0 },
      4,
      1,
      0,
      Math.PI * 2,
      true
    )
    const p0 = cwFull.getPoint(0)
    const p1 = cwFull.getPoint(0.25)
    expect(p0.distanceTo(p1)).toBeGreaterThan(0)

    const cwArc = new GeometryEllipseArc2d(
      { x: 0, y: 0 },
      4,
      2,
      0,
      Math.PI,
      true,
      0.2
    )
    expect(cwArc.isLargeArc).toBe(0)
    expect(cwArc.getPoint(0.5)).toBeDefined()

    const largeArc = new GeometryEllipseArc2d(
      { x: 0, y: 0 },
      4,
      2,
      0,
      Math.PI * 1.5
    )
    expect(largeArc.isLargeArc).toBe(1)

    const wrapped = new GeometryEllipseArc2d({ x: 0, y: 0 }, 3, 2, 0.3, 1.1)
    ;(wrapped as any)._startAngle = 0.3
    ;(wrapped as any)._endAngle = 0.3 - Math.PI * 2
    expect(wrapped.getPoint(0.5)).toBeInstanceOf(Object)

    const same = new GeometryEllipseArc2d({ x: 0, y: 0 }, 2, 1, 0.5, 1.2)
    ;(same as any)._startAngle = 0.5
    ;(same as any)._endAngle = 0.5 + Number.EPSILON / 2
    expect(same.getPoint(0.25)).toBeInstanceOf(Object)
  })
})

describe('GeometryEllipseArc2d in place of the 3D class', () => {
  it('computes exact extents for a rotated full ellipse', () => {
    const ellipse = new GeometryEllipseArc2d(
      { x: 1, y: 2 },
      5,
      3,
      0,
      Math.PI * 2,
      false,
      Math.PI / 2
    )
    expect(ellipse.box.min.x).toBeCloseTo(-2, 8)
    expect(ellipse.box.max.x).toBeCloseTo(4, 8)
    expect(ellipse.box.min.y).toBeCloseTo(-3, 8)
    expect(ellipse.box.max.y).toBeCloseTo(7, 8)
  })

  it('only counts extremes that lie on the arc', () => {
    const arc = new GeometryEllipseArc2d({ x: 0, y: 0 }, 5, 3, 0, Math.PI / 2)
    expect(arc.box.min.x).toBeCloseTo(0, 8)
    expect(arc.box.max.x).toBeCloseTo(5, 8)
    expect(arc.box.min.y).toBeCloseTo(0, 8)
    expect(arc.box.max.y).toBeCloseTo(3, 8)
  })

  it('keeps the drawn path when mirrored', () => {
    const arc = new GeometryEllipseArc2d({ x: 0, y: 0 }, 5, 2, 0, Math.PI / 2)
    const sample = arc.getPoints(8).map(p => ({ x: -p.x, y: p.y }))
    arc.transform(new GeometryMatrix2d().makeScale(-1, 1))
    expect(arc.clockwise).toBe(true)
    arc.getPoints(8).forEach((point, index) => {
      expect(point.x).toBeCloseTo(sample[index].x, 8)
      expect(point.y).toBeCloseTo(sample[index].y, 8)
    })
  })

  it('reports the swept angle and which angles it covers', () => {
    const ccw = new GeometryEllipseArc2d({ x: 0, y: 0 }, 5, 2, 0, Math.PI / 2)
    expect(ccw.sweepAngle).toBeCloseTo(Math.PI / 2, 8)
    expect(ccw.containsAngle(Math.PI / 4)).toBe(true)
    expect(ccw.containsAngle(Math.PI)).toBe(false)

    const cw = new GeometryEllipseArc2d(
      { x: 0, y: 0 },
      5,
      2,
      0,
      Math.PI / 2,
      true
    )
    expect(cw.sweepAngle).toBeCloseTo((-3 * Math.PI) / 2, 8)
    expect(cw.containsAngle(Math.PI)).toBe(true)
    expect(cw.containsAngle(Math.PI / 4)).toBe(false)
  })

  it('finds the middle of a clockwise arc', () => {
    const cw = new GeometryEllipseArc2d(
      { x: 0, y: 0 },
      5,
      5,
      Math.PI / 2,
      0,
      true
    )
    expect(cw.midPoint.x).toBeCloseTo(5 * Math.SQRT1_2, 8)
    expect(cw.midPoint.y).toBeCloseTo(5 * Math.SQRT1_2, 8)
  })

  it('computes length, area and offset', () => {
    const circle = new GeometryEllipseArc2d({ x: 0, y: 0 }, 2, 2)
    expect(circle.length).toBeCloseTo(4 * Math.PI, 8)
    expect(circle.area).toBeCloseTo(4 * Math.PI, 8)
    expect(new GeometryEllipseArc2d({ x: 0, y: 0 }, 2, 2, 0, 1).area).toBe(0)
    expect(circle.offset(1)?.minorAxisRadius).toBe(3)
    expect(circle.offset(-3)).toBeNull()
  })

  it('applies a 3D matrix through its XY part', () => {
    const ellipse = new GeometryEllipseArc2d(
      { x: 1, y: 0 },
      4,
      2,
      0,
      Math.PI / 2
    )
    ellipse.transform3d(new GeometryMatrix3d().makeTranslation(2, 3, 9))
    expect(ellipse.center).toMatchObject({ x: 3, y: 3 })
    expect(ellipse.startPoint.x).toBeCloseTo(7, 8)
    expect(ellipse.startPoint.y).toBeCloseTo(3, 8)
  })
})
