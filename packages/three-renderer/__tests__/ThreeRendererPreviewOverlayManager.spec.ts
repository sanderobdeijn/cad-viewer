import * as THREE from 'three'

import { ThreeRendererPreviewOverlayManager } from '../src/object/ThreeRendererPreviewOverlayManager'

describe('ThreeRendererPreviewOverlayManager', () => {
  it('keeps the preview overlay attached to the scene across manager recreation', () => {
    const scene = new THREE.Scene()
    let manager = new ThreeRendererPreviewOverlayManager(scene)
    expect(
      scene.children.some(child => child.name === 'Entity_Preview_Group')
    ).toBe(true)

    manager.clear()
    scene.clear()
    manager = new ThreeRendererPreviewOverlayManager(scene)

    const root = new THREE.Group()
    root.add(new THREE.Group())
    manager.add(root)

    const overlay = scene.getObjectByName('Entity_Preview_Group')
    expect(overlay).toBeDefined()
    expect(overlay?.children).toHaveLength(1)
  })

  it('skips redundant matrix updates', () => {
    const scene = new THREE.Scene()
    const manager = new ThreeRendererPreviewOverlayManager(scene)
    const root = new THREE.Group()
    const handle = manager.add(root)
    const matrix = new THREE.Matrix4().makeTranslation(3, 4, 0)

    expect(manager.update(handle.id, matrix)).toBe(true)
    expect(manager.update(handle.id, matrix.clone())).toBe(false)
  })
})
