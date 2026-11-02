import { GeometryTol } from '../src'

describe('GeometryTol', () => {
  it('compares values and points with tolerance', () => {
    const tol = new GeometryTol()
    expect(tol.equalPoint2d({ x: 1, y: 1 }, { x: 1 + 1e-9, y: 1 })).toBe(true)
    expect(GeometryTol.equal(1, 1 + 1e-9)).toBe(true)
    expect(GeometryTol.equalToZero(1e-12)).toBe(true)
    expect(GeometryTol.great(2, 1)).toBe(true)
    expect(GeometryTol.great(1, 2)).toBe(false)
    expect(GeometryTol.less(1, 2)).toBe(true)
    expect(GeometryTol.less(2, 1)).toBe(false)
    expect(GeometryTol.isPositive(1e-5)).toBe(true)
    expect(GeometryTol.isPositive(1e-7)).toBe(false)
    expect(GeometryTol.isNonPositive(1e-7)).toBe(true)
    expect(GeometryTol.isNonPositive(1e-5)).toBe(false)
  })

  it('clones tolerance values', () => {
    const tol = new GeometryTol()
    tol.equalPointTol = 1e-3
    tol.equalVectorTol = 1e-4

    const cloned = tol.clone()
    cloned.equalPointTol = 2e-3

    expect(cloned).not.toBe(tol)
    expect(cloned.equalVectorTol).toBe(1e-4)
    expect(tol.equalPointTol).toBe(1e-3)
  })
})
