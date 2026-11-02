import { GeometryMathUtil } from '../src'

describe('Test GeometryMathUtil', () => {
  it('covers scalar conversion and interpolation helpers', () => {
    expect(GeometryMathUtil.clamp(10, 0, 5)).toBe(5)
    expect(GeometryMathUtil.euclideanModulo(-1, 5)).toBe(4)
    expect(GeometryMathUtil.mapLinear(5, 0, 10, 0, 100)).toBe(50)
    expect(GeometryMathUtil.inverseLerp(0, 10, 5)).toBe(0.5)
    expect(GeometryMathUtil.inverseLerp(1, 1, 10)).toBe(0)
    expect(GeometryMathUtil.lerp(10, 20, 0.25)).toBe(12.5)
    expect(GeometryMathUtil.damp(0, 10, 2, 0.5)).toBeGreaterThan(0)
    expect(GeometryMathUtil.pingpong(2.5, 2)).toBeCloseTo(1.5, 8)
    expect(GeometryMathUtil.smoothstep(-1, 0, 1)).toBe(0)
    expect(GeometryMathUtil.smoothstep(2, 0, 1)).toBe(1)
    expect(GeometryMathUtil.smoothstep(0.5, 0, 1)).toBeCloseTo(0.5, 12)
    expect(GeometryMathUtil.smootherstep(-1, 0, 1)).toBe(0)
    expect(GeometryMathUtil.smootherstep(2, 0, 1)).toBe(1)
    expect(GeometryMathUtil.smootherstep(0.5, 0, 1)).toBeCloseTo(0.5, 12)
  })

  it('covers random and power-of-two helpers', () => {
    const uuid = GeometryMathUtil.generateUUID()
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    )

    const rInt = GeometryMathUtil.randInt(3, 6)
    expect(rInt).toBeGreaterThanOrEqual(3)
    expect(rInt).toBeLessThanOrEqual(6)

    const rFloat = GeometryMathUtil.randFloat(2, 3)
    expect(rFloat).toBeGreaterThanOrEqual(2)
    expect(rFloat).toBeLessThan(3)

    const spread = GeometryMathUtil.randFloatSpread(10)
    expect(spread).toBeGreaterThanOrEqual(-5)
    expect(spread).toBeLessThanOrEqual(5)

    const seededA = GeometryMathUtil.seededRandom(12345)
    const seededB = GeometryMathUtil.seededRandom(12345)
    expect(seededA).toBeCloseTo(seededB, 12)
    expect(GeometryMathUtil.seededRandom(54321)).toBeGreaterThanOrEqual(0)
    expect(GeometryMathUtil.seededRandom(54321)).toBeLessThan(1)

    expect(GeometryMathUtil.degToRad(180)).toBeCloseTo(Math.PI, 12)
    expect(GeometryMathUtil.radToDeg(Math.PI)).toBeCloseTo(180, 12)
    expect(GeometryMathUtil.isPowerOfTwo(8)).toBe(true)
    expect(GeometryMathUtil.isPowerOfTwo(6)).toBe(false)
    expect(GeometryMathUtil.ceilPowerOfTwo(9)).toBe(16)
    expect(GeometryMathUtil.floorPowerOfTwo(9)).toBe(8)
  })

  it('covers angle and epsilon helpers', () => {
    expect(GeometryMathUtil.normalizeAngle(-Math.PI / 2)).toBeCloseTo(
      Math.PI * 1.5,
      12
    )
    expect(GeometryMathUtil.isBetween(3, 1, 5)).toBe(true)
    expect(GeometryMathUtil.isBetween(0, 1, 5)).toBe(false)
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
