import { GeometryMatrix3d, GeometryQuaternion, GeometryVector3d } from '../src'

describe('GeometryMatrix3d', () => {
  it('composes and decomposes transforms', () => {
    const q = new GeometryQuaternion().setFromAxisAngle(
      GeometryVector3d.Z_AXIS,
      Math.PI / 2
    )
    const composed = new GeometryMatrix3d().compose(
      new GeometryVector3d(10, 0, 0),
      q,
      new GeometryVector3d(2, 2, 2)
    )

    const position = new GeometryVector3d()
    const rotation = new GeometryQuaternion()
    const scale = new GeometryVector3d()
    composed.decompose(position, rotation, scale)

    expect(position.x).toBeCloseTo(10, 8)
    expect(scale.x).toBeCloseTo(2, 8)
    expect(rotation.length()).toBeCloseTo(1, 8)
  })

  it('creates translation matrices from vectors and numbers', () => {
    const fromVector = GeometryMatrix3d.makeTranslation({ x: 1, y: 2, z: 0 })
    expect(fromVector.elements[12]).toBe(1)
    expect(fromVector.elements[13]).toBe(2)
    expect(fromVector.elements[14]).toBe(0)

    const fromNumbers = GeometryMatrix3d.makeTranslation(3, -2, 5)
    expect(fromNumbers.elements[12]).toBe(3)
    expect(fromNumbers.elements[13]).toBe(-2)
    expect(fromNumbers.elements[14]).toBe(5)
  })

  it('covers constructor and branch-heavy helpers', () => {
    const constructed = new GeometryMatrix3d(
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16
    )
    expect(constructed.elements[0]).toBe(1)

    const fromExtrusionA = new GeometryMatrix3d().setFromExtrusionDirection(
      new GeometryVector3d(0, 0, -1)
    )
    expect(fromExtrusionA.elements[10]).toBeCloseTo(-1, 8)

    const fromExtrusionB = new GeometryMatrix3d().setFromExtrusionDirection(
      new GeometryVector3d(0.2, 0.2, 0.95).normalize()
    )
    expect(fromExtrusionB.determinant()).not.toBe(0)

    const lookAtDegenerate = new GeometryMatrix3d().lookAt(
      new GeometryVector3d(1, 1, 1),
      new GeometryVector3d(1, 1, 1),
      new GeometryVector3d(0, 0, 1)
    )
    expect(lookAtDegenerate.elements[0]).toBeDefined()

    const positioned = new GeometryMatrix3d().setPosition(
      new GeometryVector3d(7, 8, 9),
      0,
      0
    )
    expect(positioned.elements[12]).toBe(7)
    expect(positioned.elements[13]).toBe(8)
    expect(positioned.elements[14]).toBe(9)

    const singular = new GeometryMatrix3d().makeScale(1, 0, 1).invert()
    expect(singular.elements.every(v => v === 0)).toBe(true)
  })
})
