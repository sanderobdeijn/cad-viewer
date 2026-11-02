import { GeometryPoint2d } from '@mlightcad/geometry-engine'
import { AcDbOrdinateDimension } from '../src/entity'
import { expectDetachedClone } from '../test-utils/cloneTestUtils'

describe('AcDbOrdinateDimension', () => {
  it('creates a detached clone with a new objectId', () => {
    expectDetachedClone(
      () =>
        new AcDbOrdinateDimension(
          new GeometryPoint2d(),
          new GeometryPoint2d(1, 0)
        )
    )
  })

  it('returns geometricExtents and recomputes when defining point changes', () => {
    const dim = new AcDbOrdinateDimension(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(5, 0)
    )

    expect(dim.geometricExtents.min).toMatchObject({ x: 0, y: 0 })
    expect(dim.geometricExtents.max).toMatchObject({ x: 5, y: 0 })

    dim.definingPoint = new GeometryPoint2d(10, 20)
    dim.leaderEndPoint = new GeometryPoint2d(15, 25)

    expect(dim.geometricExtents.min).toMatchObject({ x: 10, y: 20 })
    expect(dim.geometricExtents.max).toMatchObject({ x: 15, y: 25 })
  })
})
