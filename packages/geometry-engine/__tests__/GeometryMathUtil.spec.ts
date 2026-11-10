import { GeometryMathUtil } from '../src'

describe('Test GeometryMathUtil', () => {
  it('clamps values', () => {
    expect(GeometryMathUtil.clamp(10, 0, 5)).toBe(5)
  })

  it('converts between degrees and radians', () => {
    expect(GeometryMathUtil.degToRad(180)).toBeCloseTo(Math.PI, 12)
    expect(GeometryMathUtil.radToDeg(Math.PI)).toBeCloseTo(180, 12)
  })

  it('covers angle and epsilon helpers', () => {
    expect(GeometryMathUtil.normalizeAngle(-Math.PI / 2)).toBeCloseTo(
      Math.PI * 1.5,
      12
    )
    expect(GeometryMathUtil.intPartLength(0.8)).toBe(0)
    expect(GeometryMathUtil.intPartLength(1234.56)).toBe(4)
    expect(GeometryMathUtil.relativeEps(1234.56)).toBeGreaterThan(1.0e-7)
    expect(GeometryMathUtil.relativeEps(0.001)).toBe(1.0e-7)
  })

  it('.isBetweenAngle checks angle between start and end angle correctly', () => {
    expect(
      GeometryMathUtil.isBetweenAngle(Math.PI / 4, 0, Math.PI / 2, false)
    ).toBeTruthy()
    expect(
      GeometryMathUtil.isBetweenAngle((Math.PI * 3) / 4, 0, Math.PI / 2, false)
    ).toBeFalsy()
    expect(
      GeometryMathUtil.isBetweenAngle(Math.PI / 2, 0, Math.PI, false)
    ).toBeTruthy()
    expect(
      GeometryMathUtil.isBetweenAngle((Math.PI * 3) / 2, 0, Math.PI, false)
    ).toBeFalsy()
    expect(
      GeometryMathUtil.isBetweenAngle(0, Math.PI, Math.PI / 2, false)
    ).toBeTruthy()
    expect(
      GeometryMathUtil.isBetweenAngle(
        (Math.PI * 3) / 4,
        Math.PI,
        Math.PI / 2,
        false
      )
    ).toBeFalsy()

    expect(
      GeometryMathUtil.isBetweenAngle(Math.PI / 4, 0, Math.PI / 2, true)
    ).toBeFalsy()
    expect(
      GeometryMathUtil.isBetweenAngle((Math.PI * 3) / 4, 0, Math.PI / 2, true)
    ).toBeTruthy()
    expect(
      GeometryMathUtil.isBetweenAngle(Math.PI / 2, 0, Math.PI, true)
    ).toBeFalsy()
    expect(
      GeometryMathUtil.isBetweenAngle((Math.PI * 3) / 2, 0, Math.PI, true)
    ).toBeTruthy()
    expect(
      GeometryMathUtil.isBetweenAngle(0, Math.PI, Math.PI / 2, true)
    ).toBeFalsy()
    expect(
      GeometryMathUtil.isBetweenAngle(
        (Math.PI * 3) / 4,
        Math.PI,
        Math.PI / 2,
        true
      )
    ).toBeTruthy()
  })

  it('.isAngleOnCcwSweep checks whether an angle lies on a CCW sweep', () => {
    expect(
      GeometryMathUtil.isAngleOnCcwSweep(0, Math.PI / 4, Math.PI / 2)
    ).toBe(true)
    expect(GeometryMathUtil.isAngleOnCcwSweep(0, Math.PI, Math.PI / 2)).toBe(
      false
    )
    expect(
      GeometryMathUtil.isAngleOnCcwSweep(Math.PI, (3 * Math.PI) / 2, 0)
    ).toBe(true)
  })
})
