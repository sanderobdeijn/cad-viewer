import {
  GeometryArea2d,
  GeometryPoint2d,
  GeometryPolyline2d
} from '@mlightcad/geometry-engine'
import * as THREE from 'three'

import { AcTrPolygon } from '../src/object/AcTrPolygon'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { AcTrSubEntityTraitsUtil } from '../src/util'
import { getSceneDrawableUserData } from '../src/util/AcTrObjectUserData'
import { expectWcsBboxCloseTo } from './helpers/expectWcsBbox'

const defaultTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()

function createRectangularArea(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): GeometryArea2d {
  const loop = [
    new GeometryPoint2d(minX, minY),
    new GeometryPoint2d(maxX, minY),
    new GeometryPoint2d(maxX, maxY),
    new GeometryPoint2d(minX, maxY)
  ]

  const loops = [loop]
  return {
    getPoints: () => loops,
    tessellate: () => loops,
    buildHierarchy: () => ({
      children: [{ index: 0, children: [] }]
    })
  } as unknown as GeometryArea2d
}

function rectPolyline(
  x: number,
  y: number,
  w: number,
  h: number
): GeometryPolyline2d {
  return new GeometryPolyline2d(
    [
      new GeometryPoint2d(x, y),
      new GeometryPoint2d(x + w, y),
      new GeometryPoint2d(x + w, y + h),
      new GeometryPoint2d(x, y + h)
    ],
    true
  )
}

/** True if any triangle of the polygon mesh covers (x, y) in world space. */
function isFilledAt(polygon: AcTrPolygon, x: number, y: number): boolean {
  const target = new THREE.Vector3(x, y, 0)
  let hit = false
  polygon.traverse(object => {
    if (hit || !(object instanceof THREE.Mesh)) {
      return
    }
    const position = object.geometry.getAttribute('position')
    const index = object.geometry.getIndex()
    if (!position || !index) {
      return
    }
    for (let i = 0; i < index.count; i += 3) {
      const corners = [0, 1, 2].map(k =>
        new THREE.Vector3(
          position.getX(index.getX(i + k)),
          position.getY(index.getX(i + k)),
          0
        ).applyMatrix4(object.matrixWorld)
      )
      if (
        new THREE.Triangle(corners[0], corners[1], corners[2]).containsPoint(
          target
        )
      ) {
        hit = true
        return
      }
    }
  })
  return hit
}

function getFirstMesh(polygon: AcTrPolygon): THREE.Mesh {
  let mesh: THREE.Mesh | undefined
  polygon.traverse(object => {
    if (!mesh && object instanceof THREE.Mesh) {
      mesh = object
    }
  })
  if (!mesh) {
    throw new Error('Expected fill mesh')
  }
  return mesh
}

describe('AcTrPolygon wcsBbox', () => {
  it('stores the fill bounds in wcsBbox', () => {
    const polygon = new AcTrPolygon(
      createRectangularArea(5, 10, 25, 30),
      defaultTraits,
      new AcTrRenderContext()
    )

    expectWcsBboxCloseTo(polygon.wcsBbox, [5, 10, 0], [25, 30, 0])
  })
})

describe('AcTrPolygon origin-shift', () => {
  it('origin-shifts solid fills so float32 vertices stay local (#724)', () => {
    const polygon = new AcTrPolygon(
      createRectangularArea(5, 10, 25, 30),
      defaultTraits,
      new AcTrRenderContext()
    )

    const mesh = getFirstMesh(polygon)
    expect(mesh.position.x).toBeCloseTo(15, 5)
    expect(mesh.position.y).toBeCloseTo(20, 5)

    const position = mesh.geometry.getAttribute('position')
    for (let i = 0; i < position.count; i++) {
      expect(Math.abs(position.getX(i))).toBeLessThan(20)
      expect(Math.abs(position.getY(i))).toBeLessThan(20)
    }
  })
})

describe('AcTrPolygon self-intersecting fill loops', () => {
  it('does not fill the concave exterior of a T-junction loop', () => {
    // Same topology as DWG hatch handle 14AE (foot without the top arc):
    // the long left edge crosses the bottom ledge, so naive earcut would
    // cover (1425, 640) which lies outside the even-odd boundary.
    const loop = [
      new GeometryPoint2d(1439.03, 691.02),
      new GeometryPoint2d(1439.03, 628.96),
      new GeometryPoint2d(1418.03, 628.96),
      new GeometryPoint2d(1418.03, 627.46),
      new GeometryPoint2d(1435.03, 627.46),
      new GeometryPoint2d(1435.03, 688.53)
    ]
    const area = {
      tessellate: () => [loop],
      buildHierarchy: () => ({
        children: [{ index: 0, children: [] }]
      })
    } as unknown as GeometryArea2d

    const polygon = new AcTrPolygon(
      area,
      defaultTraits,
      new AcTrRenderContext()
    )
    polygon.updateMatrixWorld(true)

    expect(isFilledAt(polygon, 1437, 650)).toBe(true)
    expect(isFilledAt(polygon, 1425, 628.2)).toBe(true)
    expect(isFilledAt(polygon, 1425, 640)).toBe(false)
  })
})

describe('AcTrPolygon self-intersecting outer with holes', () => {
  it('only punches holes into the repaired region that contains them', () => {
    // Bow-tie outer (self-intersecting) → two triangular lobes. A hole sits only
    // in the right lobe; the left lobe must stay solid.
    const outer = [
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(10, 10),
      new GeometryPoint2d(10, 0),
      new GeometryPoint2d(0, 10)
    ]
    const hole = [
      new GeometryPoint2d(7, 3),
      new GeometryPoint2d(9, 3),
      new GeometryPoint2d(9, 5),
      new GeometryPoint2d(7, 5)
    ]
    const area = {
      tessellate: () => [outer, hole],
      buildHierarchy: () => ({
        children: [{ index: 0, children: [{ index: 1, children: [] }] }]
      })
    } as unknown as GeometryArea2d

    const polygon = new AcTrPolygon(
      area,
      defaultTraits,
      new AcTrRenderContext()
    )
    polygon.updateMatrixWorld(true)

    expect(isFilledAt(polygon, 8, 4)).toBe(false) // inside hole (right lobe)
    expect(isFilledAt(polygon, 8, 2)).toBe(true) // right lobe outside hole
    expect(isFilledAt(polygon, 2, 2)).toBe(true) // left lobe stays solid
  })
})

describe('AcTrPolygon overlapping hole merge (#744)', () => {
  it('keeps openings open when three hole loops overlap in a chain', () => {
    // Outer 100x100; hole A and C apart; hole B overlaps both (A–B–C chain).
    const area = new GeometryArea2d()
    area.add(rectPolyline(0, 0, 100, 100))
    area.add(rectPolyline(10, 10, 20, 20)) // A
    area.add(rectPolyline(50, 10, 20, 20)) // C
    area.add(rectPolyline(20, 10, 40, 20)) // B

    const polygon = new AcTrPolygon(
      area,
      defaultTraits,
      new AcTrRenderContext()
    )
    polygon.updateMatrixWorld(true)

    // Centers of A, the A∪B∪C merge, and C must all stay unfilled.
    expect(isFilledAt(polygon, 15, 20)).toBe(false)
    expect(isFilledAt(polygon, 40, 20)).toBe(false)
    expect(isFilledAt(polygon, 65, 20)).toBe(false)
    // Solid fill outside the holes must still be present.
    expect(isFilledAt(polygon, 5, 5)).toBe(true)
  })

  it('keeps two pairwise-overlapping holes open', () => {
    const area = new GeometryArea2d()
    area.add(rectPolyline(0, 0, 100, 100))
    area.add(rectPolyline(10, 10, 30, 20))
    area.add(rectPolyline(30, 10, 30, 20))

    const polygon = new AcTrPolygon(
      area,
      defaultTraits,
      new AcTrRenderContext()
    )
    polygon.updateMatrixWorld(true)

    expect(isFilledAt(polygon, 20, 20)).toBe(false)
    expect(isFilledAt(polygon, 45, 20)).toBe(false)
    expect(isFilledAt(polygon, 5, 5)).toBe(true)
  })
})
