import {
  GeometryMatrix3d,
  GeometryPoint2d,
  GeometryQuaternion,
  GeometryVector3d
} from '../src'

describe('GeometryVector3d', () => {
  it('supports matrix and quaternion operations', () => {
    const vec = new GeometryVector3d(1, 0, 0)
    const q = new GeometryQuaternion().setFromAxisAngle(
      GeometryVector3d.Z_AXIS,
      Math.PI / 2
    )
    vec.applyQuaternion(q)

    expect(vec.x).toBeCloseTo(0, 8)
    expect(vec.y).toBeCloseTo(1, 8)

    const matrix = new GeometryMatrix3d().makeTranslation(2, 3, 4)
    const p = new GeometryPoint2d(1, 1).applyMatrix4(matrix)
    expect(p.toArray()).toEqual([3, 4])

    const flattened = GeometryPoint2d.pointArrayToNumberArray([
      new GeometryPoint2d(1, 2),
      new GeometryPoint2d(4, 5)
    ])
    expect(flattened).toEqual([1, 2, 4, 5])
  })

  it('covers constructor/index guards, angle edge cases and iterator', () => {
    expect(new GeometryVector3d([1, 2, 3]).toArray()).toEqual([1, 2, 3])
    expect(() => new (GeometryVector3d as any)(1, 2)).toThrow()

    const v = new GeometryVector3d(1, 2, 3)
    expect(() => v.setComponent(3, 1)).toThrow('index is out of range: 3')
    expect(() => v.getComponent(3)).toThrow('index is out of range: 3')

    expect(
      new GeometryVector3d(0, 0, 0).angleTo(new GeometryVector3d(1, 0, 0))
    ).toBeCloseTo(Math.PI / 2, 8)

    const a = new GeometryVector3d(1, 0, 0)
    const dotSpy = jest.spyOn(a, 'dot').mockReturnValue(2)
    expect(a.angleTo(new GeometryVector3d(1, 0, 0))).toBeCloseTo(0, 8)
    dotSpy.mockRestore()

    expect([...new GeometryVector3d(4, 5, 6)]).toEqual([4, 5, 6])
  })

  it('GeometryPoint2d clone keeps point type and value', () => {
    const point = new GeometryPoint2d(7, 8)
    const cloned = point.clone()

    expect(cloned).toBeInstanceOf(GeometryPoint2d)
    expect(cloned).not.toBe(point)
    expect(cloned.toArray()).toEqual([7, 8])
  })
})
