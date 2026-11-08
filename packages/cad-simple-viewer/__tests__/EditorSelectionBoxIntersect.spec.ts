import { GeometryBox2d } from '@mlightcad/geometry-engine'

import {
  editorLineSegmentIntersectsBox2d,
  editorNeedsCrossingGeometryRefine
} from '../src/editor/view/EditorSelectionBoxIntersect'

describe('editorLineSegmentIntersectsBox2d', () => {
  const box = new GeometryBox2d({ x: 0, y: 0 }, { x: 10, y: 10 })

  it('hits when an endpoint lies inside the box', () => {
    expect(
      editorLineSegmentIntersectsBox2d({ x: 5, y: 5 }, { x: 20, y: 20 }, box)
    ).toBe(true)
  })

  it('hits when the segment crosses a box edge', () => {
    expect(
      editorLineSegmentIntersectsBox2d({ x: -5, y: 5 }, { x: 15, y: 5 }, box)
    ).toBe(true)
  })

  it('misses a large closed frame when the pick box sits in empty interior', () => {
    // Outer rectangle edges around a 100x100 frame; pick box at center.
    const pick = new GeometryBox2d({ x: 40, y: 40 }, { x: 60, y: 60 })
    const edges = [
      [
        { x: 0, y: 0, z: 0 },
        { x: 100, y: 0, z: 0 }
      ],
      [
        { x: 100, y: 0, z: 0 },
        { x: 100, y: 100, z: 0 }
      ],
      [
        { x: 100, y: 100, z: 0 },
        { x: 0, y: 100, z: 0 }
      ],
      [
        { x: 0, y: 100, z: 0 },
        { x: 0, y: 0, z: 0 }
      ]
    ] as const
    for (const [a, b] of edges) {
      expect(editorLineSegmentIntersectsBox2d(a, b, pick)).toBe(false)
    }
  })
})

describe('editorNeedsCrossingGeometryRefine', () => {
  it('skips group hits that already have child boxes', () => {
    expect(editorNeedsCrossingGeometryRefine({ children: [{ id: 'a' }] })).toBe(
      false
    )
  })

  it('refines plain root hits without children', () => {
    expect(editorNeedsCrossingGeometryRefine({})).toBe(true)
  })
})
