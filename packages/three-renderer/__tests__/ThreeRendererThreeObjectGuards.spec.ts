import * as THREE from 'three'

import {
  isThreeBufferGeometry,
  isThreeGeometryLeaf,
  isThreeLine,
  isThreeLineSegments,
  isThreeMesh,
  isThreePoints
} from '../src/util/ThreeRendererThreeObjectGuards'

/**
 * Stand-in for a drawable built by a second `three` package copy: same
 * runtime flags / `type`, but a different prototype chain so `instanceof`
 * against this file's THREE fails.
 */
function alienLineSegments(): THREE.Object3D {
  const proto = {
    isObject3D: true,
    isLine: true,
    isLineSegments: true,
    type: 'LineSegments',
    geometry: { isBufferGeometry: true, type: 'BufferGeometry' },
    material: {}
  }
  return Object.create(proto) as THREE.Object3D
}

describe('ThreeRendererThreeObjectGuards', () => {

  it('recognizes alien-copy LineSegments that fail instanceof', () => {
    const alien = alienLineSegments()
    expect(alien instanceof THREE.LineSegments).toBe(false)
    expect(isThreeLineSegments(alien)).toBe(true)
    expect(isThreeLine(alien)).toBe(true)
    expect(isThreeGeometryLeaf(alien)).toBe(true)
  })
})
