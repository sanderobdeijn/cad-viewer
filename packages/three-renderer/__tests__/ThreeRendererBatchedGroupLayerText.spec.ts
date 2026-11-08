import { CommonColor } from '@mlightcad/common'
import * as THREE from 'three'

import { ThreeRendererBatchedGroup } from '../src/batch/ThreeRendererBatchedGroup'
import { ThreeRendererEntity } from '../src/object/ThreeRendererEntity'
import { ThreeRendererRenderContext } from '../src/renderer/ThreeRendererRenderContext'
import { ThreeRendererStyleManager } from '../src/style/ThreeRendererStyleManager'
import { ThreeRendererMTextColorUtil, ThreeRendererSubEntityTraitsUtil } from '../src/util'
import { getSceneDrawableUserData } from '../src/util/ThreeRendererObjectUserData'

function createEntity(
  objectId: string,
  ...drawables: THREE.Object3D[]
): ThreeRendererEntity {
  const entity = new ThreeRendererEntity(new ThreeRendererRenderContext())
  entity.objectId = objectId
  entity.visible = true
  for (const drawable of drawables) {
    entity.add(drawable)
  }
  return entity
}

describe('ThreeRendererBatchedGroup layer text rematerialization', () => {
  it('rematerializeLayerTextDrawables uses stored explicit entity traits', () => {
    const styleManager = new ThreeRendererStyleManager()
    const group = new ThreeRendererBatchedGroup()

    const explicitColor = new CommonColor()
    explicitColor.setRGB(255, 0, 0)
    const traits = ThreeRendererMTextColorUtil.snapshotEntityTraits({
      ...ThreeRendererSubEntityTraitsUtil.createDefaultTraits(),
      color: explicitColor,
      layer: 'TXT'
    })

    const placementRoot = new THREE.Group()
    ThreeRendererMTextColorUtil.storeTextEntityTraitsOnDrawable(placementRoot, traits)
    getSceneDrawableUserData(placementRoot).noBatch = true
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    )
    placementRoot.add(mesh)

    group.addEntity(createEntity('text-1', placementRoot))

    let targetMesh: THREE.Mesh | undefined
    group.traverse(child => {
      if (targetMesh || !(child instanceof THREE.Mesh)) {
        return
      }
      if (child.geometry instanceof THREE.PlaneGeometry) {
        targetMesh = child
      }
    })
    expect(targetMesh).toBeDefined()

    const yellow = new CommonColor()
    yellow.setRGB(255, 255, 0)
    styleManager.updateLayerMaterial('TXT', {
      layer: 'TXT',
      color: yellow
    })

    group.rematerializeLayerTextDrawables('TXT', styleManager, {
      layer: 'TXT',
      color: yellow
    })

    const material = targetMesh!.material as THREE.MeshBasicMaterial
    expect(material.color.getHex()).toBe(0xff0000)
    expect(material.color.getHex()).not.toBe(0xffff00)
  })

  it('rematerializeLayerTextDrawables refreshes ByLayer text from stored traits', () => {
    const styleManager = new ThreeRendererStyleManager()
    const group = new ThreeRendererBatchedGroup()

    const byLayerColor = new CommonColor()
    byLayerColor.setByLayer()
    const traits = ThreeRendererMTextColorUtil.snapshotEntityTraits({
      ...ThreeRendererSubEntityTraitsUtil.createDefaultTraits(),
      color: byLayerColor,
      layer: 'TXT'
    })

    const placementRoot = new THREE.Group()
    ThreeRendererMTextColorUtil.storeTextEntityTraitsOnDrawable(placementRoot, traits)
    getSceneDrawableUserData(placementRoot).noBatch = true
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    )
    placementRoot.add(mesh)

    group.addEntity(createEntity('text-2', placementRoot))

    const byLayerEntityTraits = {
      ...ThreeRendererSubEntityTraitsUtil.createDefaultTraits(),
      color: byLayerColor.clone(),
      layer: 'TXT'
    }
    styleManager.getMTextFillMaterial(byLayerEntityTraits)

    let targetMesh: THREE.Mesh | undefined
    group.traverse(child => {
      if (targetMesh || !(child instanceof THREE.Mesh)) {
        return
      }
      if (child.geometry instanceof THREE.PlaneGeometry) {
        targetMesh = child
      }
    })
    expect(targetMesh).toBeDefined()

    const yellow = new CommonColor()
    yellow.setRGB(255, 255, 0)
    styleManager.updateLayerMaterial('TXT', {
      layer: 'TXT',
      color: yellow
    })

    group.rematerializeLayerTextDrawables('TXT', styleManager, {
      layer: 'TXT',
      color: yellow
    })

    const material = targetMesh!.material as THREE.MeshBasicMaterial
    expect(material.color.getHex()).toBe(0xffff00)
  })

  /**
   * Regression for #464: after batching flattens glyph entities, layer
   * colour refresh must resolve ACI-7 against the current background —
   * raw layer RGB is always white and would bake white-on-white text.
   */
  it('rematerializeLayerTextDrawables resolves ACI-7 ByLayer text against background (#464)', () => {
    const styleManager = new ThreeRendererStyleManager()
    styleManager.currentBackgroundColor = 0xffffff
    const group = new ThreeRendererBatchedGroup()

    const byLayerColor = new CommonColor()
    byLayerColor.setByLayer()
    const traits = ThreeRendererMTextColorUtil.snapshotEntityTraits({
      ...ThreeRendererSubEntityTraitsUtil.createDefaultTraits(),
      color: byLayerColor,
      layer: 'TXT'
    })

    const placementRoot = new THREE.Group()
    ThreeRendererMTextColorUtil.storeTextEntityTraitsOnDrawable(placementRoot, traits)
    getSceneDrawableUserData(placementRoot).noBatch = true
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    )
    placementRoot.add(mesh)

    group.addEntity(createEntity('text-aci7', placementRoot))

    const byLayerEntityTraits = {
      ...ThreeRendererSubEntityTraitsUtil.createDefaultTraits(),
      color: byLayerColor.clone(),
      layer: 'TXT'
    }
    styleManager.getMTextFillMaterial(byLayerEntityTraits)

    let targetMesh: THREE.Mesh | undefined
    group.traverse(child => {
      if (targetMesh || !(child instanceof THREE.Mesh)) {
        return
      }
      if (child.geometry instanceof THREE.PlaneGeometry) {
        targetMesh = child
      }
    })
    expect(targetMesh).toBeDefined()
    expect(
      (targetMesh!.material as THREE.MeshBasicMaterial).color.getHex()
    ).toBe(0xffffff)

    const foreground = new CommonColor().setForeground()
    styleManager.updateLayerMaterial('TXT', {
      layer: 'TXT',
      color: foreground
    })

    group.rematerializeLayerTextDrawables('TXT', styleManager, {
      layer: 'TXT',
      color: foreground
    })

    const material = targetMesh!.material as THREE.MeshBasicMaterial
    expect(material.color.getHex()).toBe(0x000000)

    styleManager.currentBackgroundColor = 0x000000
    group.rematerializeLayerTextDrawables('TXT', styleManager, {
      layer: 'TXT',
      color: foreground
    })
    expect(material.color.getHex()).toBe(0xffffff)
  })
})
