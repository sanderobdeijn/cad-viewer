import {
  GeometryArea2d,
  GeometryLine2d,
  GeometryLoop2d,
  GeometryMatrix2d,
  GeometryPolyline2d
} from '../src'

describe('GeometryArea2d', () => {
  it('computes polygon area', () => {
    const loop = new GeometryLoop2d([
      new GeometryLine2d({ x: 0, y: 0 }, { x: 2, y: 0 }),
      new GeometryLine2d({ x: 2, y: 0 }, { x: 2, y: 2 }),
      new GeometryLine2d({ x: 2, y: 2 }, { x: 0, y: 2 }),
      new GeometryLine2d({ x: 0, y: 2 }, { x: 0, y: 0 })
    ])

    const area = new GeometryArea2d()
    area.add(loop)

    expect(area.area).toBeCloseTo(4, 6)
  })

  it('covers empty-area and hierarchy branches', () => {
    const empty = new GeometryArea2d()
    expect(empty.outter).toBeUndefined()
    expect(empty.calculateBoundingBox().isEmpty()).toBe(true)

    const outer = new GeometryLoop2d([
      new GeometryLine2d({ x: 0, y: 0 }, { x: 4, y: 0 }),
      new GeometryLine2d({ x: 4, y: 0 }, { x: 4, y: 4 }),
      new GeometryLine2d({ x: 4, y: 4 }, { x: 0, y: 4 }),
      new GeometryLine2d({ x: 0, y: 4 }, { x: 0, y: 0 })
    ])
    const inner = new GeometryPolyline2d(
      [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 2, y: 2 },
        { x: 1, y: 2 }
      ],
      true
    )
    const area = new GeometryArea2d()
    area.add(outer)
    area.add(inner)

    const tree = area.buildHierarchy()
    expect(tree.children.length).toBe(1)
    expect(tree.children[0].children.length).toBe(1)
  })

  it('covers area edge paths for empty and degenerate loops', () => {
    const empty = new GeometryArea2d()
    expect(empty.area).toBe(0)

    const area = new GeometryArea2d()
    const degenerate = new GeometryPolyline2d(
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 }
      ],
      false
    )
    area.add(degenerate)
    expect(area.area).toBe(0)
  })

  it('clones area with independent loops', () => {
    const sourceLoop = new GeometryLoop2d([
      new GeometryLine2d({ x: 0, y: 0 }, { x: 1, y: 0 }),
      new GeometryLine2d({ x: 1, y: 0 }, { x: 1, y: 1 }),
      new GeometryLine2d({ x: 1, y: 1 }, { x: 0, y: 1 }),
      new GeometryLine2d({ x: 0, y: 1 }, { x: 0, y: 0 })
    ])
    const area = new GeometryArea2d()
    area.add(sourceLoop)

    const cloned = area.clone()
    expect(cloned).not.toBe(area)
    expect(cloned.loops.length).toBe(1)

    cloned.transform(new GeometryMatrix2d().makeTranslation(5, 0))
    expect((area.loops[0] as GeometryLoop2d).startPoint.x).toBeCloseTo(0, 8)
  })
})
