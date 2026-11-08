import { AcCmColor } from '@mlightcad/common'
import { AcGiLineWeight } from '@mlightcad/graphic-interface'
import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

import {
  getMaterialMetadata,
  setMaterialMetadata
} from '../src/style/AcTrMaterialMetadata'
import { AcTrStyleManager } from '../src/style/AcTrStyleManager'
import { AcTrSubEntityTraitsUtil } from '../src/util/AcTrEntityTraitsUtil'

describe('AcTrStyleManager', () => {
  it('preserves entity color when updateLayerMaterial receives layer name only', () => {
    const styleManager = new AcTrStyleManager()
    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = 'ROAD'
    traits.color.setRGB(255, 0, 0)

    const original = styleManager.getLineMaterial(
      traits
    ) as THREE.LineBasicMaterial
    expect(original.color.getHex()).toBe(0xff0000)

    const updates = styleManager.updateLayerMaterial('ROAD', {
      layer: 'ROAD'
    })
    const updated = updates[original.id] as THREE.LineBasicMaterial

    expect(updated).toBeDefined()
    expect(updated.color.getHex()).toBe(0xff0000)
  })

  it('binds inherited materials onto the effective layer for later layer updates', () => {
    const styleManager = new AcTrStyleManager()
    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = '0'
    traits.color.setByLayer()

    const layerZeroMaterial = styleManager.getLineMaterial(traits)
    const yellow = new AcCmColor()
    yellow.setRGB(255, 255, 0)
    const roadMaterial = styleManager.getLayerBoundMaterial(
      layerZeroMaterial,
      'ROAD',
      {
        layer: 'ROAD',
        color: yellow
      }
    )

    expect(roadMaterial).toBeDefined()
    expect(roadMaterial).not.toBe(layerZeroMaterial)
    const roadMetadata = getMaterialMetadata(roadMaterial!)
    expect(roadMetadata.layer).toBe('ROAD')
    expect('isByLayer' in roadMetadata).toBe(false)
    expect(roadMetadata.isByLayerColor).toBe(true)
    expect((roadMaterial as THREE.LineBasicMaterial).color.getHex()).toBe(
      0xffff00
    )

    const green = new AcCmColor()
    green.setRGB(0, 255, 0)
    const remappedUpdates = styleManager.updateLayerMaterial('ROAD', {
      layer: 'ROAD',
      color: green
    })
    const updatedRoadMaterial = remappedUpdates[roadMaterial!.id]

    expect(updatedRoadMaterial).toBeDefined()
    expect(
      (updatedRoadMaterial as THREE.LineBasicMaterial).color.getHex()
    ).toBe(0x00ff00)

    const blue = new AcCmColor()
    blue.setRGB(0, 0, 255)
    const layerZeroUpdates = styleManager.updateLayerMaterial('0', {
      layer: '0',
      color: blue
    })
    const updatedLayerZeroMaterial = layerZeroUpdates[layerZeroMaterial.id]

    expect(updatedLayerZeroMaterial).toBeDefined()
    expect(
      (updatedLayerZeroMaterial as THREE.LineBasicMaterial).color.getHex()
    ).toBe(0x0000ff)
    expect(updatedLayerZeroMaterial).not.toBe(updatedRoadMaterial)
  })

  it('refreshes ByLayer color even when material already targets the effective layer', () => {
    const styleManager = new AcTrStyleManager()
    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = 'ROAD'
    traits.color.setByLayer()

    const original = styleManager.getLineMaterial(
      traits
    ) as THREE.LineBasicMaterial
    expect(original.color.getHex()).toBe(0xffffff)

    const yellow = new AcCmColor()
    yellow.setRGB(255, 255, 0)
    const refreshed = styleManager.getLayerBoundMaterial(original, 'ROAD', {
      layer: 'ROAD',
      color: yellow
    }) as THREE.LineBasicMaterial

    expect(refreshed.color.getHex()).toBe(0xffff00)
  })

  it('does not share materials between ByLayer and explicit colours that resolve to the same rgb', () => {
    const styleManager = new AcTrStyleManager()
    const byLayerTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    byLayerTraits.layer = 'ROAD'
    byLayerTraits.color.setByLayer()

    const explicitTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    explicitTraits.layer = 'ROAD'
    explicitTraits.color.setRGB(255, 0, 0)

    const byLayerMaterial = styleManager.getLineMaterial(byLayerTraits)
    const explicitMaterial = styleManager.getLineMaterial(explicitTraits)

    expect(byLayerMaterial).not.toBe(explicitMaterial)

    const layerColor = new AcCmColor()
    layerColor.setRGB(255, 0, 0)
    const updates = styleManager.updateLayerMaterial('ROAD', {
      layer: 'ROAD',
      color: layerColor
    })

    expect(updates[byLayerMaterial.id]).toBe(byLayerMaterial)
    expect((byLayerMaterial as THREE.LineBasicMaterial).color.getHex()).toBe(
      0xff0000
    )
    expect((explicitMaterial as THREE.LineBasicMaterial).color.getHex()).toBe(
      0xff0000
    )
  })

  it('does not share materials across layers for the same explicit colour', () => {
    const styleManager = new AcTrStyleManager()
    const roadTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    roadTraits.layer = 'ROAD'
    roadTraits.color.setRGB(255, 0, 0)

    const wallTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    wallTraits.layer = 'WALL'
    wallTraits.color.setRGB(255, 0, 0)

    const roadMaterial = styleManager.getLineMaterial(roadTraits)
    const wallMaterial = styleManager.getLineMaterial(wallTraits)

    expect(roadMaterial).not.toBe(wallMaterial)
  })

  it('refreshes ByLayer line materials in place when the layer colour changes', () => {
    const styleManager = new AcTrStyleManager()
    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = 'Wall'
    traits.color.setByLayer()

    const original = styleManager.getLineMaterial(
      traits
    ) as THREE.LineBasicMaterial

    const red = new AcCmColor()
    red.setRGB(255, 0, 0)
    const updates = styleManager.updateLayerMaterial('Wall', {
      layer: 'Wall',
      color: red
    })
    const refreshed = updates[original.id] as THREE.LineBasicMaterial

    expect(refreshed).toBe(original)
    expect(refreshed.color.getHex()).toBe(0xff0000)

    const green = new AcCmColor()
    green.setRGB(0, 255, 0)
    const secondUpdates = styleManager.updateLayerMaterial('Wall', {
      layer: 'Wall',
      color: green
    })

    expect(secondUpdates[original.id]).toBe(original)
    expect(refreshed.color.getHex()).toBe(0x00ff00)
  })

  it('updates layer materials when traits still carry ByLayer color but metadata lost the flag', () => {
    const styleManager = new AcTrStyleManager()
    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = 'ROAD'
    traits.color.setByLayer()

    const original = styleManager.getLineMaterial(
      traits
    ) as THREE.LineBasicMaterial
    setMaterialMetadata(original, { isByLayerColor: false })

    const green = new AcCmColor()
    green.setRGB(0, 255, 0)
    const updates = styleManager.updateLayerMaterial('ROAD', {
      layer: 'ROAD',
      color: green
    })
    const updated = updates[original.id] as THREE.LineBasicMaterial

    expect(updated).toBeDefined()
    expect(updated.color.getHex()).toBe(0x00ff00)
  })

  it('preserves ByLayer resolved colour when lineweight change remaps the material key', () => {
    const styleManager = new AcTrStyleManager()
    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = 'Wall'
    traits.color.setByLayer()

    const original = styleManager.getLineMaterial(
      traits
    ) as THREE.LineBasicMaterial

    const red = new AcCmColor()
    red.setRGB(255, 0, 0)
    const colorUpdates = styleManager.updateLayerMaterial('Wall', {
      layer: 'Wall',
      color: red
    })
    expect(
      (colorUpdates[original.id] as THREE.LineBasicMaterial).color.getHex()
    ).toBe(0xff0000)

    const weightUpdates = styleManager.updateLayerMaterial('Wall', {
      layer: 'Wall',
      color: red.clone(),
      lineWeight: AcGiLineWeight.LineWeight070
    })
    const remapped = weightUpdates[original.id] as THREE.LineBasicMaterial

    expect(remapped).toBeDefined()
    expect(remapped).not.toBe(original)
    expect(remapped.color.getHex()).toBe(0xff0000)
  })

  it('remaps layer-0 foreground ByLayer materials to the bound layer color', () => {
    const styleManager = new AcTrStyleManager()
    styleManager.currentBackgroundColor = 0x000000
    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = '0'
    traits.color.setByLayer()
    traits.color.setForeground()

    const layerZeroMaterial = styleManager.getLineMaterial(
      traits
    ) as THREE.LineBasicMaterial
    const metadata = getMaterialMetadata(layerZeroMaterial)
    expect(metadata.isForeground).toBe(true)
    expect(metadata.isByLayerColor).toBe(false)

    const yellow = new AcCmColor()
    yellow.setRGB(255, 255, 0)
    setMaterialMetadata(layerZeroMaterial, { isByLayerColor: true })

    const inherited = styleManager.getLayerBoundMaterial(
      layerZeroMaterial,
      'TestLayer1',
      {
        layer: 'TestLayer1',
        color: yellow
      }
    ) as THREE.LineBasicMaterial

    expect(inherited.color.getHex()).toBe(0xffff00)
    expect(getMaterialMetadata(inherited).isForeground).toBe(false)
  })

  it('solid foreground filles invert with the theme like linework', () => {
    const styleManager = new AcTrStyleManager()
    styleManager.currentBackgroundColor = 0xffffff

    const fillTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    fillTraits.layer = 'A-WALL'
    fillTraits.color = new AcCmColor().setForeground()
    fillTraits.drawOrder = -1

    const lineworkFillTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    lineworkFillTraits.layer = 'A-WALL'
    lineworkFillTraits.color = new AcCmColor().setForeground()
    lineworkFillTraits.drawOrder = 0

    const fillMaterial = styleManager.getFillMaterial(
      fillTraits
    ) as THREE.MeshBasicMaterial
    const lineworkFillMaterial = styleManager.getFillMaterial(
      lineworkFillTraits
    ) as THREE.MeshBasicMaterial

    expect(fillMaterial).not.toBe(lineworkFillMaterial)

    const fillMetadata = getMaterialMetadata(fillMaterial)
    expect(fillMetadata.drawOrder).toBe(-1)
    expect(fillMetadata.isForeground).toBe(true)
    expect(fillMaterial.color.getHex()).toBe(0x000000)

    const lineworkFillMetadata = getMaterialMetadata(lineworkFillMaterial)
    expect(lineworkFillMetadata.drawOrder).toBe(0)
    expect(lineworkFillMetadata.isForeground).toBe(true)
    expect(lineworkFillMaterial.color.getHex()).toBe(0x000000)

    styleManager.currentBackgroundColor = 0x000000
    expect(fillMaterial.color.getHex()).toBe(0xffffff)
    expect(lineworkFillMaterial.color.getHex()).toBe(0xffffff)
  })

  it('solid fill with explicit truecolor stays at literal RGB across themes', () => {
    // A DWG author who picked an explicit RGB via the truecolor picker
    // (e.g. 255,255,255 from the colour palette) gets a literal fill.
    // `traits.color.isForeground` is only true for the ACI 7 / foreground
    // pseudo-colour, so an explicit truecolor is not repainted by theme flips.
    const styleManager = new AcTrStyleManager()
    styleManager.currentBackgroundColor = 0xffffff

    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = 'A-WALL'
    // Explicit truecolor — NOT foreground.
    traits.color.setRGB(0x80, 0x80, 0x80)
    traits.drawOrder = -1

    const material = styleManager.getFillMaterial(
      traits
    ) as THREE.MeshBasicMaterial

    const metadata = getMaterialMetadata(material)
    expect(metadata.isForeground).toBe(false)
    expect(material.color.getHex()).toBe(0x808080)

    // Theme flip must not mutate the literal truecolor.
    styleManager.currentBackgroundColor = 0x000000
    expect(material.color.getHex()).toBe(0x808080)
  })

  /**
   * Regression for #464: ByLayer entities on ACI-7 layers bake white at
   * material-create time. A later layer sync (the background-change bridge)
   * must mark them foreground-tracked and invert with the theme — without
   * that, light canvases leave white-on-white text/filles.
   */
  it('tracks ByLayer-on-ACI-7 line materials as foreground across theme flips (#464)', () => {
    const styleManager = new AcTrStyleManager()
    styleManager.currentBackgroundColor = 0x000000

    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = 'A-ANNO'
    traits.color.setByLayer()

    const material = styleManager.getLineMaterial(
      traits
    ) as THREE.LineBasicMaterial
    expect(material.color.getHex()).toBe(0xffffff)
    expect(getMaterialMetadata(material).isForeground).toBe(false)

    const layerColor = new AcCmColor().setForeground()
    styleManager.updateLayerMaterial('A-ANNO', {
      layer: 'A-ANNO',
      color: layerColor
    })

    expect(getMaterialMetadata(material).isForeground).toBe(true)
    expect(material.color.getHex()).toBe(0xffffff)

    styleManager.currentBackgroundColor = 0xffffff
    expect(material.color.getHex()).toBe(0x000000)

    styleManager.currentBackgroundColor = 0x000000
    expect(material.color.getHex()).toBe(0xffffff)
  })

  it('tracks ByLayer-on-ACI-7 fill fills as foreground across theme flips (#464)', () => {
    const styleManager = new AcTrStyleManager()
    styleManager.currentBackgroundColor = 0x000000

    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = 'A-HATCH'
    traits.color.setByLayer()
    traits.drawOrder = -1

    const material = styleManager.getFillMaterial(
      traits
    ) as THREE.MeshBasicMaterial
    expect(getMaterialMetadata(material).isForeground).toBe(false)

    const layerColor = new AcCmColor().setForeground()
    styleManager.updateLayerMaterial('A-HATCH', {
      layer: 'A-HATCH',
      color: layerColor
    })

    expect(getMaterialMetadata(material).isForeground).toBe(true)
    expect(material.color.getHex()).toBe(0xffffff)

    styleManager.currentBackgroundColor = 0xffffff
    expect(material.color.getHex()).toBe(0x000000)

    styleManager.currentBackgroundColor = 0x000000
    expect(material.color.getHex()).toBe(0xffffff)
  })

  it('marks newly layer-bound ByLayer-on-ACI-7 materials as foreground (#464)', () => {
    const styleManager = new AcTrStyleManager()
    styleManager.currentBackgroundColor = 0xffffff

    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = '0'
    traits.color.setByLayer()
    const base = styleManager.getLineMaterial(traits)

    const layerColor = new AcCmColor().setForeground()
    const bound = styleManager.getLayerBoundMaterial(base, 'TXT', {
      layer: 'TXT',
      color: layerColor
    }) as THREE.LineBasicMaterial

    expect(bound).toBeDefined()
    expect(getMaterialMetadata(bound!).isForeground).toBe(true)
    expect(bound!.color.getHex()).toBe(0x000000)

    styleManager.currentBackgroundColor = 0x000000
    expect(bound!.color.getHex()).toBe(0xffffff)
  })

  it('clears foreground tracking when an ACI-7 layer becomes an absolute colour', () => {
    const styleManager = new AcTrStyleManager()
    styleManager.currentBackgroundColor = 0x000000

    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = 'A-ANNO'
    traits.color.setByLayer()
    const material = styleManager.getLineMaterial(
      traits
    ) as THREE.LineBasicMaterial

    styleManager.updateLayerMaterial('A-ANNO', {
      layer: 'A-ANNO',
      color: new AcCmColor().setForeground()
    })
    expect(getMaterialMetadata(material).isForeground).toBe(true)

    const yellow = new AcCmColor()
    yellow.setRGB(255, 255, 0)
    styleManager.updateLayerMaterial('A-ANNO', {
      layer: 'A-ANNO',
      color: yellow
    })

    expect(getMaterialMetadata(material).isForeground).toBe(false)
    expect(material.color.getHex()).toBe(0xffff00)

    styleManager.currentBackgroundColor = 0xffffff
    expect(material.color.getHex()).toBe(0xffff00)
  })

  it('uses fat line materials when forceShowLineWeight is on even if LWDISPLAY is off', () => {
    const styleManager = new AcTrStyleManager()
    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.lineWeight = AcGiLineWeight.LineWeight211

    const hairline = styleManager.getLineMaterial(traits)
    expect(hairline).toBeInstanceOf(THREE.LineBasicMaterial)

    styleManager.forceShowLineWeight = true
    const fat = styleManager.getLineMaterial(traits)
    expect(fat).toBeInstanceOf(LineMaterial)
    expect((fat as LineMaterial).linewidth).toBeCloseTo(211 / 40)
  })
})
