import * as THREE from 'three'

import {
  buildLineSegmentsGeometry,
  buildPointGeometry,
  isDirectBatchRejectedMaterial
} from '../src/object/ThreeRendererLineGeometryBuilder'

describe('direct geometry builders', () => {
  it('buildPointGeometry rebases to the point world offset', () => {
    const material = new THREE.PointsMaterial()
    const built = buildPointGeometry({ x: 100, y: 200 }, material)

    expect(built.kind).toBe('point')
    expect(built.worldOffset.x).toBe(100)
    expect(built.worldOffset.y).toBe(200)
    expect(built.worldOffset.z).toBe(0)
    expect(built.position).toEqual({ x: 100, y: 200 })
    expect(built.geometry.getAttribute('position').getX(0)).toBe(0)
    built.geometry.dispose()
  })

  it('isDirectBatchRejectedMaterial allows basic materials', () => {
    expect(isDirectBatchRejectedMaterial(new THREE.LineBasicMaterial())).toBe(
      false
    )
    expect(isDirectBatchRejectedMaterial(new THREE.MeshBasicMaterial())).toBe(
      false
    )
  })
})
