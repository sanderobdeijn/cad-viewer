import { GeometryPoint2d } from '@mlightcad/geometry-engine'
import { AcDbRadialDimension } from '../src/entity'
import { expectDetachedClone } from '../test-utils/cloneTestUtils'

describe('AcDbRadialDimension', () => {
  it('creates a detached clone with a new objectId', () => {
    expectDetachedClone(
      () =>
        new AcDbRadialDimension(
          new GeometryPoint2d(),
          new GeometryPoint2d(1, 0),
          1
        )
    )
  })

  it('returns geometricExtents and recomputes when center changes', () => {
    const dim = new AcDbRadialDimension(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(5, 0),
      1
    )

    expect(dim.geometricExtents.min).toMatchObject({ x: 0, y: 0 })
    expect(dim.geometricExtents.max.x).toBeCloseTo(6)

    dim.center = new GeometryPoint2d(10, 20)
    dim.chordPoint = new GeometryPoint2d(15, 20)

    expect(dim.geometricExtents.min).toMatchObject({ x: 10, y: 20 })
    expect(dim.geometricExtents.max.x).toBeCloseTo(16)
  })
})
