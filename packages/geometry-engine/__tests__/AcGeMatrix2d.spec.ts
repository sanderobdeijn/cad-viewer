import { AcGeMatrix2d, AcGeMatrix3d, AcGePoint2d, AcGeVector2d } from '../src'

describe('AcGeMatrix2d', () => {
  it('translates points', () => {
    const m2 = new AcGeMatrix2d().makeTranslation(2, 5)
    const p2 = new AcGePoint2d(1, 1).applyMatrix2d(m2)

    expect(p2.toArray()).toEqual([3, 6])
  })

  it('supports constructor with explicit elements', () => {
    const m2 = new AcGeMatrix2d(1, 2, 3, 4, 5, 6, 7, 8, 9)
    expect(m2.toArray()).toEqual([1, 4, 7, 2, 5, 8, 3, 6, 9])
  })
})

describe('AcGeMatrix2d.setFromAffineMatrix4', () => {
  it('keeps the XY rotation, scale and translation', () => {
    const matrix = new AcGeMatrix2d().setFromAffineMatrix4(
      new AcGeMatrix3d()
        .makeTranslation(3, 4, 5)
        .multiply(new AcGeMatrix3d().makeScale(2, -1, 1))
    )
    const point = new AcGeVector2d(1, 1).applyMatrix2d(matrix)
    expect(point.x).toBeCloseTo(5, 8)
    expect(point.y).toBeCloseTo(3, 8)
    expect(matrix.determinant()).toBeCloseTo(-2, 8)
  })
})
