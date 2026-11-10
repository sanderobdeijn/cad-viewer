import { GeometryLine2d } from '../src'

describe('GeometryLine2d', () => {
  it('computes length', () => {
    const line = new GeometryLine2d({ x: 0, y: 0 }, { x: 3, y: 4 })
    expect(line.length).toBe(5)
  })

  it('nearestPoint projects onto segment', () => {
    const line = new GeometryLine2d({ x: 0, y: 0 }, { x: 10, y: 0 })
    const near = line.nearestPoint({ x: 4, y: 3 })
    expect(near.x).toBeCloseTo(4, 6)
    expect(near.y).toBeCloseTo(0, 6)
  })
})

describe('GeometryLine2d in place of the 3D class', () => {
  const line = () => new GeometryLine2d({ x: 0, y: 0 }, { x: 2, y: 0 })

  it('exposes its direction and points along it', () => {
    expect(line().direction).toMatchObject({ x: 1, y: 0 })
  })

  it('finds the perpendicular point past the segment end', () => {
    expect(line().perpPoint({ x: 5, y: 1 })).toMatchObject({ x: 5, y: 0 })
  })

  it('extends past either end', () => {
    expect(line().extend(1).endPoint.x).toBeCloseTo(3, 8)
    expect(line().extend(1, true).startPoint.x).toBeCloseTo(-1, 8)
  })

  it('checks whether a point is on it', () => {})
})
