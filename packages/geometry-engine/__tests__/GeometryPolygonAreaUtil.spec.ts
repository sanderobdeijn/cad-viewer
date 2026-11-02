import {
  geometryClosedPolygonArea2d,
  geometryPolygonArea2d
} from '../src/util/GeometryPolygonAreaUtil'

describe('GeometryPolygonAreaUtil', () => {
  it('computes 2D polygon area', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 }
    ]
    expect(geometryPolygonArea2d(square)).toBeCloseTo(4, 8)
    expect(geometryClosedPolygonArea2d(square)).toBeCloseTo(4, 8)
  })

  it('returns 0 for open or degenerate loops', () => {
    expect(geometryClosedPolygonArea2d([])).toBe(0)
    expect(
      geometryClosedPolygonArea2d([
        { x: 0, y: 0 },
        { x: 1, y: 0 }
      ])
    ).toBe(0)
  })
})
