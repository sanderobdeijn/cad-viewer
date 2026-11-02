import { GeometryBox3d, GeometryPlane, GeometryVector3d } from '../src'

describe('GeometryPlane', () => {
  it('computes distance and projection and intersects box', () => {
    const plane = new GeometryPlane().setFromNormalAndCoplanarPoint(
      new GeometryVector3d(0, 0, 1),
      new GeometryVector3d(0, 0, 2)
    )

    expect(plane.distanceToPoint(new GeometryVector3d(0, 0, 5))).toBeCloseTo(
      3,
      8
    )

    const projected = plane.projectPoint(
      new GeometryVector3d(1, 1, 7),
      new GeometryVector3d()
    )
    expect(projected.z).toBeCloseTo(2, 8)

    const box = new GeometryBox3d({ x: -1, y: -1, z: 1 }, { x: 1, y: 1, z: 3 })
    expect(plane.intersectsBox(box)).toBe(true)
  })
})
