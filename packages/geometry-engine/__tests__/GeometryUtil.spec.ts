import { GeometryUtil } from '../src'

describe('GeometryUtil', () => {
  it('handles empty, disjoint and duplicate-point polygons', () => {
    expect(GeometryUtil.isPolygonIntersect([], [])).toBe(false)

    const squareA = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 }
    ]
    const squareFar = [
      { x: 10, y: 10 },
      { x: 11, y: 10 },
      { x: 11, y: 11 },
      { x: 10, y: 11 }
    ]
    expect(GeometryUtil.isPolygonIntersect(squareA, squareFar)).toBe(false)

    const withDuplicate = [
      { x: -1, y: -1 },
      { x: -1, y: -1 },
      { x: 2, y: -1 },
      { x: 2, y: 2 },
      { x: -1, y: 2 }
    ]
    expect(GeometryUtil.isPolygonIntersect(withDuplicate, squareA)).toBe(false)

    const sameBoxNoContainmentA = [
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 3, y: 3 },
      { x: 0, y: 3 }
    ]
    const sameBoxNoContainmentB = [
      { x: 3, y: 3 },
      { x: 2, y: 3 },
      { x: 3, y: 2 }
    ]
    expect(
      GeometryUtil.isPolygonIntersect(
        sameBoxNoContainmentA,
        sameBoxNoContainmentB
      )
    ).toBe(false)
  })
})
