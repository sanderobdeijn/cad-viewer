import { GeometryPoint2d } from '@mlightcad/geometry-engine'

import { AcDbRotatedDimension } from '../src/entity'
import { expectDetachedClone } from '../test-utils/cloneTestUtils'

describe('AcDbRotatedDimension', () => {
  it('creates a detached clone with a new objectId', () => {
    expectDetachedClone(
      () =>
        new AcDbRotatedDimension(
          new GeometryPoint2d(),
          new GeometryPoint2d(1, 0),
          new GeometryPoint2d(0, 1)
        )
    )
  })

  it('returns geometricExtents that follow its definition points', () => {
    const dim = new AcDbRotatedDimension(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(5, 0),
      new GeometryPoint2d(5, 1)
    )
    expect(dim.geometricExtents.max.y).toBeGreaterThanOrEqual(1)

    dim.dimLinePoint = new GeometryPoint2d(5, 30)

    expect(dim.geometricExtents.max.y).toBeGreaterThanOrEqual(30)
  })
})
