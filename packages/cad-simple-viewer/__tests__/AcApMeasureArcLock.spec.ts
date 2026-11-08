import {
  GeometryCircularArc2d,
  GeometryPoint2d,
  type GeometryPoint2dLike,
  GeometryPolyline2d
} from '@mlightcad/geometry-engine'

import type { AcApItemContents } from '../src/model/AcApItemGeometry'

const circle = (
  center: GeometryPoint2dLike,
  radius: number
): AcApItemContents => ({
  kind: 'shape',
  geometry: GeometryCircularArc2d.fromMathAngles(center, radius, 0, 0, false)
})
const arc = (
  center: GeometryPoint2dLike,
  radius: number,
  startAngle: number,
  endAngle: number,
  clockwise = false
): AcApItemContents => ({
  kind: 'shape',
  geometry: GeometryCircularArc2d.fromMathAngles(
    center,
    radius,
    startAngle,
    endAngle,
    clockwise
  )
})
/** A polyline from vertices given as [x, y, bulge]. */
const polylineOf = (
  ...vertices: [number, number, number?][]
): AcApItemContents => ({
  kind: 'shape',
  geometry: new GeometryPolyline2d(
    vertices.map(([x, y, bulge]) => ({ x, y, bulge: bulge ?? 0 })),
    false
  )
})

import {
  lockCurvesFromItem,
  pickLockOnItems,
  pointLiesOnCircle
} from '../src/command/measure/AcApMeasureArcLock'

describe('lockCurvesFromItem', () => {
  it('returns a full circle for a circle', () => {
    const curves = lockCurvesFromItem(circle({ x: 0, y: 0 }, 10))
    expect(curves).toHaveLength(1)
    expect(curves[0]!.center.x).toBeCloseTo(0)
    expect(curves[0]!.center.y).toBeCloseTo(0)
    expect(curves[0]!.radius).toBeCloseTo(10)
  })

  it('returns the drawn sweep for an arc, not the complementary gap', () => {
    const curves = lockCurvesFromItem(arc({ x: 0, y: 0 }, 10, 0, Math.PI / 2))
    expect(curves).toHaveLength(1)
    expect(curves[0]!.radius).toBeCloseTo(10)
  })

  it('ignores straight polyline chords', () => {
    const polyline = polylineOf([0, 0, 0], [40, 0, 0])
    expect(lockCurvesFromItem(polyline)).toHaveLength(0)
  })

  it('returns a bulge segment from a polyline', () => {
    const polyline = polylineOf([10, 0, Math.tan(Math.PI / 8)], [0, 10, 0])
    const curves = lockCurvesFromItem(polyline)
    expect(curves).toHaveLength(1)
    expect(curves[0]!.center.x).toBeCloseTo(0, 5)
    expect(curves[0]!.center.y).toBeCloseTo(0, 5)
    expect(curves[0]!.radius).toBeCloseTo(10, 5)
  })
})

describe('pickLockOnItems', () => {
  const quarterArc = arc({ x: 0, y: 0 }, 10, 0, Math.PI / 2)

  it('locks onto a circle circumference', () => {
    const hit = pickLockOnItems(
      [circle({ x: 0, y: 0 }, 10)],
      { x: 10.2, y: 0 },
      1
    )
    expect(hit?.geom).toEqual({ cx: 0, cy: 0, r: 10 })
  })

  it('locks onto the drawn arc, not the complementary sweep', () => {
    const hit = pickLockOnItems([quarterArc], { x: 7.071, y: 7.071 }, 1)
    expect(hit?.geom.cx).toBeCloseTo(0)
    expect(hit?.geom.cy).toBeCloseTo(0)
    expect(hit?.geom.r).toBeCloseTo(10)
    expect(pickLockOnItems([quarterArc], { x: -10, y: 0 }, 1)).toBeUndefined()
  })

  it('keeps nearest on the drawn stroke when a pick would project onto the complementary arc', () => {
    const hit = pickLockOnItems([quarterArc], { x: 9, y: -1 }, 2)
    expect(hit).toBeDefined()
    expect(hit!.nearest.y).toBeGreaterThanOrEqual(0)
    expect(hit!.nearest.x).toBeCloseTo(10, 1)
  })

  it('locks onto the drawn sweep of a clockwise arc', () => {
    const clockwiseArc = arc({ x: 0, y: 0 }, 10, Math.PI, Math.PI / 2, true)
    // Drawn stroke is Q2: (-10, 0) → (0, 10) through (−√2/2, √2/2).
    const hit = pickLockOnItems([clockwiseArc], { x: -7.071, y: 7.071 }, 1)
    expect(hit?.geom.cx).toBeCloseTo(0)
    expect(hit?.geom.cy).toBeCloseTo(0)
    expect(hit?.geom.r).toBeCloseTo(10)
    expect(
      pickLockOnItems([clockwiseArc], { x: 7.071, y: 7.071 }, 1)
    ).toBeUndefined()
  })

  it('locks onto a polyline bulge and ignores a far straight chord', () => {
    const polyline = polylineOf(
      [10, 0, Math.tan(Math.PI / 8)],
      [0, 10, 0],
      [80, 10, 0]
    )

    expect(
      pickLockOnItems([polyline], { x: 7.071, y: 7.071 }, 1)?.geom
    ).toMatchObject({
      cx: expect.closeTo(0, 5),
      cy: expect.closeTo(0, 5),
      r: expect.closeTo(10, 5)
    })
    expect(pickLockOnItems([polyline], { x: 50, y: 10 }, 1)).toBeUndefined()
  })

  it('at a shared bulge vertex, locks the arc the cursor is closer to', () => {
    const polyline = polylineOf(
      [0, 0, -Math.tan(Math.PI / 16)],
      [40, 0, 1],
      [50, 0]
    )

    const first = new GeometryCircularArc2d(
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      -Math.tan(Math.PI / 16)
    )
    const second = new GeometryCircularArc2d(
      { x: 40, y: 0 },
      { x: 50, y: 0 },
      1
    )
    const toward = (
      curve: GeometryCircularArc2d,
      fromStart: boolean,
      dist: number
    ) => {
      const pts = curve.getPoints(16)
      const origin = fromStart ? pts[0]! : pts[pts.length - 1]!
      const inward = fromStart ? pts[1]! : pts[pts.length - 2]!
      const ix = inward.x - origin.x
      const iy = inward.y - origin.y
      const len = Math.hypot(ix, iy)
      return {
        x: origin.x + (ix / len) * dist,
        y: origin.y + (iy / len) * dist,
        z: 0
      }
    }

    expect(
      pickLockOnItems([polyline], toward(first, false, 0.05), 2)?.geom.r
    ).toBeCloseTo(first.radius, 5)
    expect(
      pickLockOnItems([polyline], toward(second, true, 0.05), 2)?.geom.r
    ).toBeCloseTo(second.radius, 5)
    // Exact vertex: distances tie; do not let the later segment win.
    expect(pickLockOnItems([polyline], { x: 40, y: 0 }, 2)?.geom.r).toBeCloseTo(
      first.radius,
      5
    )
    expect(
      pointLiesOnCircle(
        { x: 40, y: 0 },
        { cx: first.center.x, cy: first.center.y, r: first.radius }
      )
    ).toBe(true)
    expect(
      pointLiesOnCircle(
        { x: 40, y: 0 },
        { cx: second.center.x, cy: second.center.y, r: second.radius }
      )
    ).toBe(true)
  })
})
