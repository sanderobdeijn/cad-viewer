import { GeometryPoint2d } from '@mlightcad/geometry-engine'
import { AcDbArcDimension } from '../src/entity'
import { expectDetachedClone } from '../test-utils/cloneTestUtils'

describe('AcDbArcDimension', () => {
  it('creates a detached clone with a new objectId', () => {
    expectDetachedClone(
      () =>
        new AcDbArcDimension(
          new GeometryPoint2d(),
          new GeometryPoint2d(1, 0),
          new GeometryPoint2d(0, 1),
          new GeometryPoint2d(1, 1)
        )
    )
  })

  it('returns geometricExtents and recomputes when arc point changes', () => {
    const dim = new AcDbArcDimension(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(1, 0),
      new GeometryPoint2d(0, 1),
      new GeometryPoint2d(1, 1)
    )

    expect(dim.geometricExtents.min).toMatchObject({ x: 0, y: 0 })
    expect(dim.geometricExtents.max).toMatchObject({ x: 1, y: 1 })

    dim.arcPoint = new GeometryPoint2d(10, 20)
    dim.centerPoint = new GeometryPoint2d(5, 5)

    expect(dim.geometricExtents.min).toMatchObject({ x: 0, y: 0 })
    expect(dim.geometricExtents.max).toMatchObject({ x: 10, y: 20 })
  })
})
