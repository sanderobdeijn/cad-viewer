import { GeometryBox2d, GeometryMatrix2d, GeometryPoint2d } from '../src'
import { GeometryCurve2d } from '../src/geometry/GeometryCurve2d'

class TestCurve2d extends GeometryCurve2d {
  get closed() {
    return false
  }

  getPoint(t: number) {
    return new GeometryPoint2d(t, 0)
  }

  transform(_matrix: GeometryMatrix2d) {
    return this
  }

  clone(): this {
    return new TestCurve2d() as this
  }

  protected calculateBoundingBox() {
    return new GeometryBox2d({ x: 0, y: 0 }, { x: 1, y: 0 })
  }
}

describe('GeometryCurve2d', () => {
  it('exposes shared curve behavior through subclass', () => {
    const curve2d = new TestCurve2d()
    expect(curve2d.length).toBeCloseTo(1, 8)
    expect(curve2d.box.min.x).toBe(0)
    expect(curve2d.boundingBoxNeedUpdate).toBe(false)
  })

  it('covers base-class helpers and edge branches', () => {
    const baseLike = Object.create(GeometryCurve2d.prototype) as GeometryCurve2d
    expect(() => baseLike.getPoint(0.5)).toThrow(
      'GeometryCurve2d: .getPoint() not implemented.'
    )

    const curve2d = new TestCurve2d()
    expect(curve2d.getPointAt(0.3).x).toBeCloseTo(0.3, 8)
    expect(curve2d.getPoints(2).map(p => p.x)).toEqual([0, 0.5, 1])
    expect(curve2d.getLengths(4)).toEqual([0, 0.25, 0.5, 0.75, 1])

    // distance branch
    expect(curve2d.getUtoTmapping(0, 0.75)).toBeCloseTo(0.75, 8)
    // binary-search exact hit branch
    expect(curve2d.getUtoTmapping(0.5)).toBeCloseTo(0.5, 8)
    // interpolation branch
    expect(curve2d.getUtoTmapping(0.1234)).toBeCloseTo(0.1234, 4)

    // t-clamping branches near start/end
    expect(curve2d.getTangent(0).x).toBeCloseTo(1, 8)
    expect(curve2d.getTangent(1).x).toBeCloseTo(1, 8)
  })
})
