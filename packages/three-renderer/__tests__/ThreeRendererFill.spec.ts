import { GeometryPoint2dLike } from '@mlightcad/geometry-engine'
import * as THREE from 'three'

import { ThreeRendererFill } from '../src/object/ThreeRendererFill'
import { ThreeRendererRenderContext } from '../src/renderer/ThreeRendererRenderContext'
import { ThreeRendererSubEntityTraitsUtil } from '../src/util'
import { expectWcsBboxCloseTo } from './helpers/expectWcsBbox'

const traits = ThreeRendererSubEntityTraitsUtil.createDefaultTraits()

function createFill(points: GeometryPoint2dLike[]) {
  return new ThreeRendererFill(points, traits, new ThreeRendererRenderContext())
}

function meshOf(fill: ThreeRendererFill) {
  return fill.children.find(child => child instanceof THREE.Mesh) as
    | THREE.Mesh
    | undefined
}

/** Signed area of every triangle in world space; positive faces the camera. */
function triangleAreas(mesh: THREE.Mesh) {
  const position = mesh.geometry.getAttribute('position')
  const index = mesh.geometry.getIndex()!
  const at = (i: number) =>
    new THREE.Vector2(position.getX(i), position.getY(i)).add(
      new THREE.Vector2(mesh.position.x, mesh.position.y)
    )
  const areas: number[] = []
  for (let i = 0; i < index.count; i += 3) {
    areas.push(
      THREE.ShapeUtils.area([
        at(index.getX(i)),
        at(index.getX(i + 1)),
        at(index.getX(i + 2))
      ])
    )
  }
  return areas
}

const triangle = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 0, y: 2 }
]

describe('ThreeRendererFill', () => {
  it('fills a triangle with one camera-facing triangle', () => {
    const mesh = meshOf(createFill(triangle))!
    const areas = triangleAreas(mesh)
    expect(areas).toHaveLength(1)
    expect(areas[0]).toBeCloseTo(4, 8)
  })

  it('faces the camera when the boundary is clockwise', () => {
    const mesh = meshOf(createFill([...triangle].reverse()))!
    expect(triangleAreas(mesh)[0]).toBeCloseTo(4, 8)
  })

  it('fills a concave boundary with its own area', () => {
    const arrow = [
      { x: 0, y: 0 },
      { x: 4, y: 2 },
      { x: 1, y: 2 },
      { x: 0, y: 4 }
    ]
    const areas = triangleAreas(meshOf(createFill(arrow))!)
    expect(areas.every(area => area > 0)).toBe(true)
    expect(areas.reduce((sum, area) => sum + area, 0)).toBeCloseTo(
      THREE.ShapeUtils.area(arrow.map(p => new THREE.Vector2(p.x, p.y))),
      8
    )
  })

  it('ignores a repeated closing vertex', () => {
    const mesh = meshOf(createFill([...triangle, triangle[0]]))!
    expect(mesh.geometry.getAttribute('position').count).toBe(3)
  })

  it('stores vertices relative to the bounding-box centre', () => {
    const far = triangle.map(p => ({ x: p.x + 3.85e7, y: p.y + 1e6 }))
    const fill = createFill(far)
    const mesh = meshOf(fill)!
    expect(mesh.position.x).toBeCloseTo(3.85e7 + 2, 6)
    expect(mesh.position.y).toBeCloseTo(1e6 + 1, 6)
    expectWcsBboxCloseTo(fill.wcsBbox, [3.85e7, 1e6], [3.85e7 + 4, 1e6 + 2])
    expect(triangleAreas(mesh)[0]).toBeCloseTo(4, 3)
  })

  it('draws nothing for fewer than three points', () => {
    expect(meshOf(createFill(triangle.slice(0, 2)))).toBeUndefined()
  })
})
