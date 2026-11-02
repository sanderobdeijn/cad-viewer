import {
  GeometryArea2d,
  GeometryCircularArc2d,
  GeometryEllipseArc2d,
  GeometryLine2d,
  GeometryLoop2d,
  GeometryPolyline2d,
  GeometrySpline2d,
  ORIGIN_POINT_2D,
  TAU
} from '../src'

describe('GeometryCurveTessellate', () => {
  describe('GeometryCircularArc2d.segmentCount', () => {
    it('uses circleSides segments for a full circle at the default deviation', () => {
      expect(GeometryCircularArc2d.segmentCount(1, TAU)).toBe(100)
      expect(GeometryCircularArc2d.segmentCount(10, TAU)).toBe(100)
    })

    it('uses fewer segments for a short sweep than for a full circle', () => {
      const quarter = GeometryCircularArc2d.segmentCount(1, Math.PI / 2)
      const full = GeometryCircularArc2d.segmentCount(1, TAU)
      expect(quarter).toBeLessThan(full)
      expect(quarter).toBeGreaterThanOrEqual(25)
      expect(quarter).toBeLessThanOrEqual(26)
    })

    it('gives a larger radius more segments at a fixed absolute deviation', () => {
      const options = { deviation: 0.01, maxSegments: 100, minSegments: 3 }
      const small = GeometryCircularArc2d.segmentCount(1, TAU, options)
      const large = GeometryCircularArc2d.segmentCount(100, TAU, options)
      expect(small).toBeLessThan(large)
      expect(large).toBeLessThanOrEqual(100)
    })

    it('respects maxSegments', () => {
      expect(
        GeometryCircularArc2d.segmentCount(1000, TAU, {
          deviation: 1e-9,
          maxSegments: 16
        })
      ).toBe(16)
    })

    it('falls back to minSegments when the radius is degenerate', () => {
      expect(
        GeometryCircularArc2d.segmentCount(0, TAU, {
          minSegments: 4,
          maxSegments: 20
        })
      ).toBe(4)
    })
  })

  describe('GeometryCircularArc2d.chordDeviationFromRadius', () => {
    it('returns a positive deviation that shrinks as circleSides grows', () => {
      const coarse = GeometryCircularArc2d.chordDeviationFromRadius(10, 8)
      const fine = GeometryCircularArc2d.chordDeviationFromRadius(10, 100)
      expect(coarse).toBeGreaterThan(fine)
      expect(fine).toBeGreaterThan(0)
    })
  })

  describe('circular arc tessellate', () => {
    it('samples a full 2d circle with 101 points by default', () => {
      const circle = new GeometryCircularArc2d(
        ORIGIN_POINT_2D,
        1,
        0,
        TAU,
        false
      )
      const points = circle.tessellate()
      expect(points).toHaveLength(101)
      expect(circle.getPoints(100)).toHaveLength(101)
    })

    it('samples a short 2d arc with far fewer than 101 points', () => {
      const arc = new GeometryCircularArc2d(
        ORIGIN_POINT_2D,
        1,
        0,
        Math.PI / 18,
        false
      )
      const points = arc.tessellate()
      expect(points.length).toBeGreaterThan(1)
      expect(points.length).toBeLessThan(20)
    })

    it('samples a quarter arc given as a full circle sweep with fewer points than a full circle', () => {
      const arc = new GeometryCircularArc2d(
        ORIGIN_POINT_2D,
        2,
        0,
        Math.PI / 2,
        false
      )
      const circle = new GeometryCircularArc2d(
        ORIGIN_POINT_2D,
        2,
        0,
        TAU,
        false
      )
      expect(arc.tessellate().length).toBeLessThan(circle.tessellate().length)
      expect(GeometryCircularArc2d.segmentCount(2, Math.PI / 2)).toBe(
        GeometryCircularArc2d.segmentCount(2, Math.PI / 2)
      )
    })
  })

  describe('ellipse tessellate', () => {
    it('uses the circular closed-form path when the radii are equal', () => {
      const ellipse = new GeometryEllipseArc2d(ORIGIN_POINT_2D, 3, 3, 0, TAU)
      expect(ellipse.tessellate()).toHaveLength(101)
    })

    it('keeps an eccentric ellipse within the evaluation budget', () => {
      const ellipse = new GeometryEllipseArc2d(ORIGIN_POINT_2D, 10, 1, 0, TAU)
      const points = ellipse.tessellate({ maxSegments: 40 })
      expect(points.length).toBeGreaterThan(2)
      expect(points.length).toBeLessThanOrEqual(40)
    })
  })

  describe('spline tessellate', () => {
    it('uses fewer than 100 points for a nearly linear spline', () => {
      const spline = new GeometrySpline2d(
        [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 2, y: 0 },
          { x: 3, y: 0 }
        ],
        [0, 0, 0, 0, 1, 1, 1, 1]
      )
      const points = spline.tessellate()
      expect(points.length).toBeGreaterThan(1)
      expect(points.length).toBeLessThan(100)
      expect(spline.getPoints(50)).toHaveLength(50)
    })

    it('caps output at maxSegments', () => {
      const spline = new GeometrySpline2d(
        [
          { x: 0, y: 0 },
          { x: 1, y: 4 },
          { x: 2, y: -4 },
          { x: 3, y: 0 }
        ],
        [0, 0, 0, 0, 1, 1, 1, 1]
      )
      const points = spline.tessellate({
        deviation: 1e-9,
        maxSegments: 12
      })
      expect(points.length).toBeLessThanOrEqual(12)
    })
  })

  describe('polyline tessellate', () => {
    it('emits only vertices for a straight polyline', () => {
      const polyline = new GeometryPolyline2d([
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: 3 }
      ])
      expect(polyline.tessellate()).toHaveLength(3)
    })

    it('samples a tiny bulge with far fewer than 101 points', () => {
      const polyline = new GeometryPolyline2d([
        { x: 0, y: 0, bulge: 0.02 },
        { x: 1, y: 0 }
      ])
      const points = polyline.tessellate()
      expect(points.length).toBeGreaterThan(1)
      expect(points.length).toBeLessThan(20)
      expect(polyline.getPoints(100).length).toBeGreaterThan(100)
    })
  })

  describe('loop and area tessellate', () => {
    it('emits vertices only for a square of straight edges', () => {
      const loop = new GeometryLoop2d([
        new GeometryLine2d({ x: 0, y: 0 }, { x: 1, y: 0 }),
        new GeometryLine2d({ x: 1, y: 0 }, { x: 1, y: 1 }),
        new GeometryLine2d({ x: 1, y: 1 }, { x: 0, y: 1 }),
        new GeometryLine2d({ x: 0, y: 1 }, { x: 0, y: 0 })
      ])
      const points = loop.tessellate()
      expect(points.length).toBeLessThanOrEqual(5)
      expect(points.length).toBeGreaterThanOrEqual(4)
    })

    it('samples a short circular edge with far fewer than 101 points', () => {
      const loop = new GeometryLoop2d([
        new GeometryCircularArc2d(ORIGIN_POINT_2D, 1, 0, Math.PI / 18, false),
        new GeometryLine2d({ x: 1, y: 0 }, ORIGIN_POINT_2D)
      ])
      const points = loop.tessellate()
      expect(points.length).toBeGreaterThan(2)
      expect(points.length).toBeLessThan(25)
    })

    it('samples an elliptical edge without using a fixed 100-point grid', () => {
      const ellipse = new GeometryEllipseArc2d(
        ORIGIN_POINT_2D,
        2,
        1,
        0,
        Math.PI / 18
      )
      const loop = new GeometryLoop2d([ellipse])
      const points = loop.tessellate()
      expect(points.length).toBeGreaterThan(1)
      expect(points.length).toBeLessThan(ellipse.getPoints(100).length)
    })

    it('tessellates every area loop', () => {
      const area = new GeometryArea2d()
      area.add(
        new GeometryPolyline2d(
          [
            { x: 0, y: 0 },
            { x: 2, y: 0 },
            { x: 2, y: 2 },
            { x: 0, y: 2 }
          ],
          true
        )
      )
      const loops = area.tessellate()
      expect(loops).toHaveLength(1)
      expect(loops[0].length).toBeGreaterThanOrEqual(4)
    })
  })
})
