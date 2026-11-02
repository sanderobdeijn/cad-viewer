import { GeometryPoint2d } from '@mlightcad/geometry-engine'
import { AcDbDiametricDimension } from '../src/entity'
import { expectDetachedClone } from '../test-utils/cloneTestUtils'

describe('AcDbDiametricDimension', () => {
  it('creates a detached clone with a new objectId', () => {
    expectDetachedClone(
      () =>
        new AcDbDiametricDimension(
          new GeometryPoint2d(1, 0),
          new GeometryPoint2d(-1, 0),
          1
        )
    )
  })

  it('returns geometricExtents and recomputes when chord points change', () => {
    const dim = new AcDbDiametricDimension(
      new GeometryPoint2d(1, 0),
      new GeometryPoint2d(-1, 0),
      1
    )

    expect(dim.geometricExtents.min.x).toBeCloseTo(-2)
    expect(dim.geometricExtents.max.x).toBeCloseTo(1)

    dim.chordPoint = new GeometryPoint2d(10, 0)
    dim.farChordPoint = new GeometryPoint2d(20, 0)

    expect(dim.geometricExtents.min.x).toBeCloseTo(10)
    expect(dim.geometricExtents.max.x).toBeCloseTo(21)
  })
})
