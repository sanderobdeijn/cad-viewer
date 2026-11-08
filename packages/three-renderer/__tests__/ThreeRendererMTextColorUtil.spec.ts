import { CommonColor } from '@mlightcad/common'
import {
  GRAPHICS_INTERFACE_LIGHT_THEME_FOREGROUND,
  GRAPHICS_INTERFACE_PAPER_SPACE_BACKGROUND
} from '@mlightcad/graphic-interface'
import { MTextColor } from '@mlightcad/mtext-parser'
import * as THREE from 'three'

import {
  getMaterialMetadata,
  setMaterialMetadata
} from '../src/style/ThreeRendererMaterialMetadata'
import { ThreeRendererStyleManager } from '../src/style/ThreeRendererStyleManager'
import { ThreeRendererSubEntityTraitsUtil } from '../src/util/ThreeRendererEntityTraitsUtil'
import { ThreeRendererMaterialUtil } from '../src/util/ThreeRendererMaterialUtil'
import { ThreeRendererMTextColorUtil } from '../src/util/ThreeRendererMTextColorUtil'

describe('ThreeRendererMTextColorUtil', () => {
  it('uses resolved traits rgb for ByLayer instead of hard-coded white', () => {
    const traits = ThreeRendererSubEntityTraitsUtil.createDefaultTraits()
    traits.color.setRGB(0, 255, 0)

    const settings = ThreeRendererMTextColorUtil.buildColorSettingsFromTraits(
      traits,
      GRAPHICS_INTERFACE_PAPER_SPACE_BACKGROUND
    )

    expect(settings.byLayerColor).toBe(0x00ff00)
    expect(
      ThreeRendererMTextColorUtil.resolveRgbColor(settings, GRAPHICS_INTERFACE_PAPER_SPACE_BACKGROUND)
    ).toBe(0x00ff00)
  })

  it('inverts ACI 7 on a light paper background', () => {
    const color = new CommonColor()
    color.setForeground()

    const settings = {
      layer: '0',
      color: ThreeRendererMTextColorUtil.toMTextColor(color),
      byLayerColor: 0xffffff,
      byBlockColor: 0xffffff
    }

    expect(
      ThreeRendererMTextColorUtil.resolveRgbColor(settings, GRAPHICS_INTERFACE_PAPER_SPACE_BACKGROUND)
    ).toBe(GRAPHICS_INTERFACE_LIGHT_THEME_FOREGROUND)
  })

  it('keeps literal white RGB regardless of background', () => {
    const mtextColor = new MTextColor()
    mtextColor.rgbValue = 0xffffff

    const modelSpace = ThreeRendererMTextColorUtil.toAcCmColor(mtextColor)
    expect(modelSpace.isForeground).toBe(false)
    expect(modelSpace.RGB).toBe(0xffffff)

    expect(
      ThreeRendererMTextColorUtil.resolveRgbColor(
        {
          layer: '0',
          color: mtextColor,
          byLayerColor: 0xffffff,
          byBlockColor: 0xffffff
        },
        GRAPHICS_INTERFACE_PAPER_SPACE_BACKGROUND
      )
    ).toBe(0xffffff)
  })

  it('does not rematerialize inline C256 ByLayer glyphs when entity is ACI 7', () => {
    const styleManager = new ThreeRendererStyleManager()
    styleManager.currentBackgroundColor = 0x000000

    const color = new CommonColor()
    color.setForeground()
    const traits = ThreeRendererMTextColorUtil.snapshotEntityTraits({
      ...ThreeRendererSubEntityTraitsUtil.createDefaultTraits(),
      color,
      layer: 'DIM'
    })

    const byLayerTraits = ThreeRendererSubEntityTraitsUtil.createDefaultTraits()
    byLayerTraits.color.setByLayer()
    byLayerTraits.layer = 'DIM'
    const byLayerMaterial = styleManager.getMTextFillMaterial(byLayerTraits)
    // Simulate ColorSettings.byLayerColor green applied after material create.
    ThreeRendererMaterialUtil.setMaterialColor(
      byLayerMaterial,
      new THREE.Color(0x00ff00)
    )
    setMaterialMetadata(byLayerMaterial, {
      ...getMaterialMetadata(byLayerMaterial),
      isByLayerColor: true,
      isForeground: false
    })

    const root = new THREE.Group()
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), byLayerMaterial)
    mesh.userData.mtextColor = (() => {
      const c = new MTextColor()
      c.aci = 256
      return c
    })()
    root.add(mesh)

    ThreeRendererMTextColorUtil.rematerializeTextHierarchy(root, traits, styleManager)

    expect(mesh.material).toBe(byLayerMaterial)
    const material = mesh.material as THREE.MeshBasicMaterial
    expect(material.color.getHex()).toBe(0x00ff00)
    expect(getMaterialMetadata(material).isForeground).toBe(false)
  })

  it('rematerializes text meshes from entity traits with ACI 7 foreground', () => {
    const styleManager = new ThreeRendererStyleManager()
    styleManager.currentBackgroundColor = GRAPHICS_INTERFACE_PAPER_SPACE_BACKGROUND

    const color = new CommonColor()
    color.setForeground()
    const traits = ThreeRendererMTextColorUtil.snapshotEntityTraits({
      ...ThreeRendererSubEntityTraitsUtil.createDefaultTraits(),
      color,
      layer: 'Viewport'
    })

    // Start from a ByLayer-bound CAD material that lost foreground tracking.
    const byLayerTraits = ThreeRendererSubEntityTraitsUtil.createDefaultTraits()
    byLayerTraits.color.setByLayer()
    byLayerTraits.layer = 'Viewport'
    const byLayerMaterial = styleManager.getMTextFillMaterial(byLayerTraits)

    const root = new THREE.Group()
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), byLayerMaterial)
    root.add(mesh)

    ThreeRendererMTextColorUtil.rematerializeTextHierarchy(root, traits, styleManager)

    const material = mesh.material as THREE.MeshBasicMaterial
    expect(material.color.getHex()).toBe(GRAPHICS_INTERFACE_LIGHT_THEME_FOREGROUND)
    expect(material.userData.isForeground).toBe(true)
  })

  it('toAcCmColor maps ACI 7 to foreground tracking', () => {
    const mtextColor = new MTextColor()
    mtextColor.aci = 7

    const color = ThreeRendererMTextColorUtil.toAcCmColor(mtextColor)
    expect(color.isForeground).toBe(true)
    expect(color.colorIndex).toBe(7)
  })

  it('createTraitsForMText keeps worker-reconstructed ACI 7 as foreground material', () => {
    const styleManager = new ThreeRendererStyleManager()
    styleManager.currentBackgroundColor = 0x000000

    // Mimic buildWorkerMaterialColorSettings after preserving entity ACI 7.
    const colorSettings = {
      layer: 'NOTES',
      color: (() => {
        const c = new MTextColor()
        c.aci = 7
        return c
      })(),
      byLayerColor: 0xffffff,
      byBlockColor: 0xffffff
    }
    const traits = ThreeRendererSubEntityTraitsUtil.createTraitsForMText(colorSettings)
    expect(traits.color.isForeground).toBe(true)

    const material = styleManager.getMTextFillMaterial(traits)
    expect(getMaterialMetadata(material).isForeground).toBe(true)
    expect((material as THREE.MeshBasicMaterial).color.getHex()).toBe(0xffffff)

    styleManager.currentBackgroundColor = 0xffffff
    expect((material as THREE.MeshBasicMaterial).color.getHex()).toBe(0x000000)
  })

  it('createTraitsForMText keeps worker-reconstructed ACI 255 as absolute white', () => {
    const styleManager = new ThreeRendererStyleManager()
    styleManager.currentBackgroundColor = 0x000000

    const colorSettings = {
      layer: 'NOTES',
      color: (() => {
        const c = new MTextColor()
        c.aci = 255
        return c
      })(),
      byLayerColor: 0xffffff,
      byBlockColor: 0xffffff
    }
    const traits = ThreeRendererSubEntityTraitsUtil.createTraitsForMText(colorSettings)
    expect(traits.color.isForeground).toBe(false)

    const material = styleManager.getMTextFillMaterial(traits)
    expect(getMaterialMetadata(material).isForeground).toBe(false)
    expect((material as THREE.MeshBasicMaterial).color.getHex()).toBe(0xffffff)

    styleManager.currentBackgroundColor = 0xffffff
    // Absolute white must not invert with the canvas.
    expect((material as THREE.MeshBasicMaterial).color.getHex()).toBe(0xffffff)
  })

  it('rematerializes baked ACI-7 glyph meshes using stashed mtextColor', () => {
    const styleManager = new ThreeRendererStyleManager()
    styleManager.currentBackgroundColor = 0x000000

    const color = new CommonColor()
    color.setForeground()
    const traits = ThreeRendererMTextColorUtil.snapshotEntityTraits({
      ...ThreeRendererSubEntityTraitsUtil.createDefaultTraits(),
      color,
      layer: 'NOTES'
    })

    // Simulate worker reconstruct leaving absolute-white materials that still
    // carry the segment ACI on userData.
    const baked = new THREE.MeshBasicMaterial({ color: 0xffffff })
    setMaterialMetadata(baked, {
      layer: 'NOTES',
      materialKey: 'baked-rgb',
      isForeground: false,
      isByLayerColor: false,
      isByLayerLineType: false,
      isByLayerLineWeight: false,
      isByLayerTransparency: false
    })
    const root = new THREE.Group()
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), baked)
    mesh.userData.mtextColor = (() => {
      const c = new MTextColor()
      c.aci = 7
      return c
    })()
    root.add(mesh)

    ThreeRendererMTextColorUtil.rematerializeTextHierarchy(root, traits, styleManager)

    const material = mesh.material as THREE.MeshBasicMaterial
    expect(material).not.toBe(baked)
    expect(material.userData.isForeground).toBe(true)
    expect(material.color.getHex()).toBe(0xffffff)

    styleManager.currentBackgroundColor = 0xffffff
    expect(material.color.getHex()).toBe(0x000000)
  })

  it('does not rematerialize inline ACI 255 glyphs when entity is ACI 7', () => {
    const styleManager = new ThreeRendererStyleManager()
    styleManager.currentBackgroundColor = 0x000000

    const color = new CommonColor()
    color.setForeground()
    const traits = ThreeRendererMTextColorUtil.snapshotEntityTraits({
      ...ThreeRendererSubEntityTraitsUtil.createDefaultTraits(),
      color,
      layer: 'NOTES'
    })

    const inlineTraits = ThreeRendererSubEntityTraitsUtil.createDefaultTraits()
    inlineTraits.color.colorIndex = 255
    inlineTraits.layer = 'NOTES'
    const inlineMaterial = styleManager.getMTextFillMaterial(inlineTraits)

    const root = new THREE.Group()
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), inlineMaterial)
    mesh.userData.mtextColor = (() => {
      const c = new MTextColor()
      c.aci = 255
      return c
    })()
    root.add(mesh)

    ThreeRendererMTextColorUtil.rematerializeTextHierarchy(root, traits, styleManager)

    expect(mesh.material).toBe(inlineMaterial)
    styleManager.currentBackgroundColor = 0xffffff
    expect((mesh.material as THREE.MeshBasicMaterial).color.getHex()).toBe(
      0xffffff
    )
  })

  it('does not rematerialize bare mtext-renderer meshes when entity is ACI 7', () => {
    const styleManager = new ThreeRendererStyleManager()
    styleManager.currentBackgroundColor = GRAPHICS_INTERFACE_PAPER_SPACE_BACKGROUND

    const color = new CommonColor()
    color.setForeground()
    const traits = ThreeRendererMTextColorUtil.snapshotEntityTraits({
      ...ThreeRendererSubEntityTraitsUtil.createDefaultTraits(),
      color,
      layer: 'Viewport'
    })

    const root = new THREE.Group()
    const inlineMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), inlineMaterial)
    root.add(mesh)

    ThreeRendererMTextColorUtil.rematerializeTextHierarchy(root, traits, styleManager)

    expect(mesh.material).toBe(inlineMaterial)
    expect(inlineMaterial.color.getHex()).toBe(0x00ff00)
  })

  it('rematerializes baked ACI-7 glyphs using stashed mtextColor after reconstruct', () => {
    const styleManager = new ThreeRendererStyleManager()
    styleManager.currentBackgroundColor = 0x000000

    const color = new CommonColor()
    color.setForeground()
    const traits = ThreeRendererMTextColorUtil.snapshotEntityTraits({
      ...ThreeRendererSubEntityTraitsUtil.createDefaultTraits(),
      color,
      layer: 'NOTES'
    })

    // Absolute white material as produced by a baked worker reconstruct.
    const baked = new THREE.MeshBasicMaterial({ color: 0xffffff })
    setMaterialMetadata(baked, {
      layer: 'NOTES',
      materialKey: 'baked-white',
      isForeground: false,
      isByLayerColor: false,
      isByLayerLineType: false,
      isByLayerLineWeight: false,
      isByLayerTransparency: false
    })

    const root = new THREE.Group()
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), baked)
    mesh.userData.mtextColor = new MTextColor(7)
    root.add(mesh)

    const inline = new THREE.MeshBasicMaterial({ color: 0xffffff })
    setMaterialMetadata(inline, {
      layer: 'NOTES',
      materialKey: 'inline-255',
      isForeground: false,
      isByLayerColor: false,
      isByLayerLineType: false,
      isByLayerLineWeight: false,
      isByLayerTransparency: false
    })
    const inlineMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), inline)
    inlineMesh.userData.mtextColor = new MTextColor(255)
    root.add(inlineMesh)

    ThreeRendererMTextColorUtil.rematerializeTextHierarchy(root, traits, styleManager)

    expect(
      getMaterialMetadata(mesh.material as THREE.Material).isForeground
    ).toBe(true)
    expect((mesh.material as THREE.MeshBasicMaterial).color.getHex()).toBe(
      0xffffff
    )
    expect(inlineMesh.material).toBe(inline)
    expect(inline.color.getHex()).toBe(0xffffff)

    styleManager.currentBackgroundColor = 0xffffff
    expect((mesh.material as THREE.MeshBasicMaterial).color.getHex()).toBe(
      GRAPHICS_INTERFACE_LIGHT_THEME_FOREGROUND
    )
    expect(inline.color.getHex()).toBe(0xffffff)
  })

  it('preserves inline ACI materials that differ from entity base traits', () => {
    const styleManager = new ThreeRendererStyleManager()
    styleManager.currentBackgroundColor = GRAPHICS_INTERFACE_PAPER_SPACE_BACKGROUND

    const entityColor = new CommonColor()
    entityColor.setByLayer()
    const traits = ThreeRendererMTextColorUtil.snapshotEntityTraits({
      ...ThreeRendererSubEntityTraitsUtil.createDefaultTraits(),
      color: entityColor,
      layer: '0'
    })

    const inlineTraits = ThreeRendererSubEntityTraitsUtil.createDefaultTraits()
    inlineTraits.color.colorIndex = 1
    inlineTraits.layer = '0'
    const inlineMaterial = styleManager.getMTextFillMaterial(inlineTraits)

    const root = new THREE.Group()
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), inlineMaterial)
    root.add(mesh)

    ThreeRendererMTextColorUtil.rematerializeTextHierarchy(root, traits, styleManager)

    expect(mesh.material).toBe(inlineMaterial)
  })

  it('rematerializes ByLayer text materials bound to the wrong layer', () => {
    const styleManager = new ThreeRendererStyleManager()
    styleManager.currentBackgroundColor = GRAPHICS_INTERFACE_PAPER_SPACE_BACKGROUND

    const color = new CommonColor()
    color.setRGB(0, 255, 0)
    const traits = ThreeRendererMTextColorUtil.snapshotEntityTraits({
      ...ThreeRendererSubEntityTraitsUtil.createDefaultTraits(),
      color,
      layer: 'CARTOUCHE'
    })

    const wrongLayerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    setMaterialMetadata(wrongLayerMaterial, {
      layer: 'MOVED',
      materialKey: 'wrong-layer',
      isForeground: false,
      isByLayerColor: true,
      isByLayerLineType: false,
      isByLayerLineWeight: false,
      isByLayerTransparency: false
    })

    const foreignMesh = {
      type: 'Mesh',
      material: wrongLayerMaterial,
      traverse(fn: (object: THREE.Object3D) => void) {
        fn(this as unknown as THREE.Object3D)
      },
      children: []
    }

    ThreeRendererMTextColorUtil.rematerializeTextHierarchy(
      foreignMesh as unknown as THREE.Object3D,
      traits,
      styleManager
    )

    const material = foreignMesh.material as THREE.MeshBasicMaterial
    expect(material).not.toBe(wrongLayerMaterial)
    expect(material.color.getHex()).toBe(0x00ff00)
    expect(material.userData.layer).toBe('CARTOUCHE')
  })

  it('rematerializes ByLayer text when layer colour changes and material rgb is stale', () => {
    const styleManager = new ThreeRendererStyleManager()
    styleManager.currentBackgroundColor = GRAPHICS_INTERFACE_PAPER_SPACE_BACKGROUND

    const color = new CommonColor()
    color.setByLayer()
    const entityTraits = {
      ...ThreeRendererSubEntityTraitsUtil.createDefaultTraits(),
      color,
      layer: 'txt'
    }
    const traits = ThreeRendererMTextColorUtil.snapshotEntityTraits(entityTraits)

    styleManager.getMTextFillMaterial(entityTraits)
    const yellow = new CommonColor()
    yellow.setRGB(255, 255, 0)
    styleManager.updateLayerMaterial('txt', {
      layer: 'txt',
      color: yellow
    })

    const staleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })
    setMaterialMetadata(staleMaterial, {
      layer: 'txt',
      materialKey: 'stale-by-layer',
      isForeground: false,
      isByLayerColor: true,
      isByLayerLineType: false,
      isByLayerLineWeight: false,
      isByLayerTransparency: false
    })

    const root = new THREE.Group()
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), staleMaterial)
    root.add(mesh)

    ThreeRendererMTextColorUtil.rematerializeTextHierarchy(root, traits, styleManager)

    const material = mesh.material as THREE.MeshBasicMaterial
    expect(material).not.toBe(staleMaterial)
    expect(material.color.getHex()).toBe(0xffff00)
    expect(material.userData.layer).toBe('txt')
  })

  it('rematerializes ByLayer text when metadata lost the ByLayer flag but traits are ByLayer', () => {
    const styleManager = new ThreeRendererStyleManager()
    styleManager.currentBackgroundColor = GRAPHICS_INTERFACE_PAPER_SPACE_BACKGROUND

    const color = new CommonColor()
    color.setByLayer()
    const entityTraits = {
      ...ThreeRendererSubEntityTraitsUtil.createDefaultTraits(),
      color,
      layer: 'txt'
    }
    const traits = ThreeRendererMTextColorUtil.snapshotEntityTraits(entityTraits)

    styleManager.getMTextFillMaterial(entityTraits)
    const yellow = new CommonColor()
    yellow.setRGB(255, 255, 0)
    styleManager.updateLayerMaterial('txt', {
      layer: 'txt',
      color: yellow
    })

    const staleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })
    setMaterialMetadata(staleMaterial, {
      layer: 'txt',
      materialKey: 'stale-inferred-by-layer',
      isForeground: false,
      isByLayerLineType: false,
      isByLayerLineWeight: false,
      isByLayerTransparency: false
    })

    const root = new THREE.Group()
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), staleMaterial)
    root.add(mesh)

    ThreeRendererMTextColorUtil.rematerializeTextHierarchy(root, traits, styleManager)

    const material = mesh.material as THREE.MeshBasicMaterial
    expect(material).not.toBe(staleMaterial)
    expect(material.color.getHex()).toBe(0xffff00)
  })

  it('resolves inline ByLayer from the layer colour when the entity colour is explicit', () => {
    const entity = new CommonColor()
    entity.colorIndex = 4
    const layer = new CommonColor()
    layer.colorIndex = 7

    const traits = ThreeRendererSubEntityTraitsUtil.createDefaultTraits()
    traits.color = entity
    traits.layer = 'TEXT'

    const settings = ThreeRendererMTextColorUtil.buildColorSettingsFromTraits(
      traits,
      0x000000,
      layer
    )

    expect(settings.color.aci).toBe(4)
    expect(settings.byLayerColor).toBe(0xffffff)
    expect(settings.byBlockColor).toBe(0xffffff)
  })

  it('normalizes numeric trait colours when snapshotting entity traits', () => {
    const traits = ThreeRendererMTextColorUtil.snapshotEntityTraits({
      ...ThreeRendererSubEntityTraitsUtil.createDefaultTraits(),
      color: 7 as never,
      layer: '0'
    })

    expect(traits.color.isForeground).toBe(true)
  })
})
