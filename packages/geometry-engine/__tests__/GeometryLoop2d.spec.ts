import {
  GeometryLine2d,
  GeometryLoop2d,
  GeometryMatrix2d
} from '../src'

describe('GeometryLoop2d', () => {
  it('is closed and computes perimeter', () => {
    const loop = new GeometryLoop2d([
      new GeometryLine2d({ x: 0, y: 0 }, { x: 2, y: 0 }),
      new GeometryLine2d({ x: 2, y: 0 }, { x: 2, y: 2 }),
      new GeometryLine2d({ x: 2, y: 2 }, { x: 0, y: 2 }),
      new GeometryLine2d({ x: 0, y: 2 }, { x: 0, y: 0 })
    ])

    expect(loop.closed).toBe(true)
    expect(loop.length).toBe(8)
  })

  it('transforms in place', () => {
    const lineA = new GeometryLine2d({ x: 0, y: 0 }, { x: 1, y: 0 })
    const lineBReverse = new GeometryLine2d({ x: 1, y: 1 }, { x: 1, y: 0 })

    const loop = new GeometryLoop2d([lineA, lineBReverse])
    expect(loop.transform(new GeometryMatrix2d().makeTranslation(1, 2))).toBe(
      loop
    )
  })

  it('throws when accessing start point of empty loop', () => {
    const empty = new GeometryLoop2d()
    expect(() => empty.startPoint).toThrow(
      'Start point does not exist in an empty loop.'
    )
  })

  it('clones loop with independent edge instances', () => {
    const loop = new GeometryLoop2d([
      new GeometryLine2d({ x: 0, y: 0 }, { x: 2, y: 0 }),
      new GeometryLine2d({ x: 2, y: 0 }, { x: 2, y: 2 })
    ])

    const cloned = loop.clone()
    expect(cloned).not.toBe(loop)
    expect(cloned.curves.length).toBe(loop.curves.length)

    cloned.transform(new GeometryMatrix2d().makeTranslation(3, 0))
    expect(loop.startPoint.x).toBeCloseTo(0, 8)
  })
})
