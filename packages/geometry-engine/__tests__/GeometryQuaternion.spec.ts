import { GeometryMatrix3d, GeometryQuaternion, GeometryVector3d } from '../src'

describe('GeometryQuaternion', () => {
  it('slerp result remains normalized', () => {
    const q = new GeometryQuaternion(0, 0, 0, 1)
    const target = new GeometryQuaternion().set(0.5, 0.5, 0.5, 0.5).normalize()

    const midway = q.slerp(target, 0.5)
    expect(midway.length()).toBeCloseTo(1, 8)
  })

  it('covers static helpers and branchy quaternion operations', () => {
    const out = [0, 0, 0, 0]
    GeometryQuaternion.slerpFlat(out, 0, [1, 2, 3, 4], 0, [5, 6, 7, 8], 0, 0)
    expect(out).toEqual([1, 2, 3, 4])

    GeometryQuaternion.slerpFlat(out, 0, [1, 2, 3, 4], 0, [5, 6, 7, 8], 0, 1)
    expect(out).toEqual([5, 6, 7, 8])

    // tiny-angle path that falls back to lerp and normalization
    GeometryQuaternion.slerpFlat(
      out,
      0,
      [0, 0, 0, 1],
      0,
      [1e-12, 0, 0, 1],
      0,
      0.5
    )
    expect(out[3]).toBeGreaterThan(0)

    // setFromRotationMatrix branches
    expect(
      new GeometryQuaternion().setFromRotationMatrix(
        new GeometryMatrix3d().set(
          2,
          0,
          0,
          0,
          0,
          -1,
          0,
          0,
          0,
          0,
          -1,
          0,
          0,
          0,
          0,
          1
        )
      )
    ).toBeInstanceOf(GeometryQuaternion)
    expect(
      new GeometryQuaternion().setFromRotationMatrix(
        new GeometryMatrix3d().set(
          -1,
          0,
          0,
          0,
          0,
          2,
          0,
          0,
          0,
          0,
          -1,
          0,
          0,
          0,
          0,
          1
        )
      )
    ).toBeInstanceOf(GeometryQuaternion)
    expect(
      new GeometryQuaternion().setFromRotationMatrix(
        new GeometryMatrix3d().set(
          -1,
          0,
          0,
          0,
          0,
          -1,
          0,
          0,
          0,
          0,
          2,
          0,
          0,
          0,
          0,
          1
        )
      )
    ).toBeInstanceOf(GeometryQuaternion)

    // opposite-direction branches in setFromUnitVectors
    expect(
      new GeometryQuaternion().setFromUnitVectors(
        new GeometryVector3d(1, 0, 0),
        new GeometryVector3d(-1, 0, 0)
      )
    ).toBeInstanceOf(GeometryQuaternion)
    expect(
      new GeometryQuaternion().setFromUnitVectors(
        new GeometryVector3d(0, 0, 1),
        new GeometryVector3d(0, 0, -1)
      )
    ).toBeInstanceOf(GeometryQuaternion)

    // zero-length normalize branch
    const normalizedZero = new GeometryQuaternion(0, 0, 0, 0).normalize()
    expect(normalizedZero.w).toBe(1)

    const qa = new GeometryQuaternion(0, 0, 0, 1)
    const qbNeg = new GeometryQuaternion(0, 0, 0, -1)
    expect(qa.clone().slerp(qbNeg, 0.3).w).toBeCloseTo(1, 8) // cosHalfTheta < 0 then >=1

    const qbNear = new GeometryQuaternion(0, 0, 0, 0.9999999999999999)
    const qNear = qa.clone()
    const normalizeSpy = jest.spyOn(qNear, 'normalize')
    qNear.slerp(qbNear, 0.5) // sqrSin<=EPS branch calls normalize()
    expect(normalizeSpy).toHaveBeenCalled()
    normalizeSpy.mockRestore()

    const iterValues = [...new GeometryQuaternion(1, 2, 3, 4)]
    expect(iterValues).toEqual([1, 2, 3, 4])
  })
})
