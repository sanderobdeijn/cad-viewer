import { GeometryMatrix3d, GeometryPoint2d, GeometryVector2d } from '../src'

describe('GeometryVector2d', () => {
  it('supports basic vector ops', () => {
    const v = new GeometryVector2d(3, 4)
    expect(v.length()).toBe(5)

    const rotated = new GeometryVector2d(1, 0).rotateAround(
      { x: 0, y: 0 },
      Math.PI / 2
    )
    expect(rotated.x).toBeCloseTo(0, 8)
    expect(rotated.y).toBeCloseTo(1, 8)
  })

  it('covers constructor/index guards and iterator', () => {
    expect(new GeometryVector2d([7, 8]).toArray()).toEqual([7, 8])

    const v = new GeometryVector2d(1, 2)
    expect(() => v.setComponent(2, 1)).toThrow('index is out of range: 2')
    expect(() => v.getComponent(2)).toThrow('index is out of range: 2')
    expect([...v]).toEqual([1, 2])
  })

  it('GeometryPoint2d flattens points', () => {
    const points = GeometryPoint2d.pointArrayToNumberArray([
      new GeometryPoint2d(1, 2),
      new GeometryPoint2d(3, 4)
    ])
    expect(points).toEqual([1, 2, 3, 4])
  })

  it('GeometryPoint2d clone keeps point type and value', () => {
    const point = new GeometryPoint2d(3, 5)
    const cloned = point.clone()

    expect(cloned).toBeInstanceOf(GeometryPoint2d)
    expect(cloned).not.toBe(point)
    expect(cloned.toArray()).toEqual([3, 5])
  })
})

describe('GeometryVector2d.applyMatrix4', () => {
  it('keeps the XY part of a 4x4 transform', () => {
    const point = new GeometryVector2d(1, 2)
    point.applyMatrix4(new GeometryMatrix3d().makeTranslation(3, 4, 5))
    expect(point.x).toBeCloseTo(4, 8)
    expect(point.y).toBeCloseTo(6, 8)
  })

  it('applies rotation about Z', () => {
    const point = new GeometryVector2d(1, 0)
    point.applyMatrix4(new GeometryMatrix3d().makeRotationZ(Math.PI / 2))
    expect(point.x).toBeCloseTo(0, 8)
    expect(point.y).toBeCloseTo(1, 8)
  })
})
