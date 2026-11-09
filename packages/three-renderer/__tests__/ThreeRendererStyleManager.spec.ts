import { CommonColor } from '@mlightcad/common'
import { GraphicsInterfaceLineWeight } from '@mlightcad/graphic-interface'
import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

import { getMaterialMetadata } from '../src/style/ThreeRendererMaterialMetadata'
import { ThreeRendererStyleManager } from '../src/style/ThreeRendererStyleManager'
import { ThreeRendererSubEntityTraitsUtil } from '../src/util/ThreeRendererEntityTraitsUtil'

describe('ThreeRendererStyleManager', () => {
  it('solid foreground filles invert with the theme like linework', () => {
    const styleManager = new ThreeRendererStyleManager()
    styleManager.currentBackgroundColor = 0xffffff

    const fillTraits = ThreeRendererSubEntityTraitsUtil.createDefaultTraits()
    fillTraits.color = new CommonColor().setForeground()
    fillTraits.drawOrder = -1

    const lineworkFillTraits = ThreeRendererSubEntityTraitsUtil.createDefaultTraits()
    lineworkFillTraits.color = new CommonColor().setForeground()
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
    const styleManager = new ThreeRendererStyleManager()
    styleManager.currentBackgroundColor = 0xffffff

    const traits = ThreeRendererSubEntityTraitsUtil.createDefaultTraits()
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

  it('uses fat line materials when forceShowLineWeight is on even if LWDISPLAY is off', () => {
    const styleManager = new ThreeRendererStyleManager()
    const traits = ThreeRendererSubEntityTraitsUtil.createDefaultTraits()
    traits.lineWeight = GraphicsInterfaceLineWeight.LineWeight211

    const hairline = styleManager.getLineMaterial(traits)
    expect(hairline).toBeInstanceOf(THREE.LineBasicMaterial)

    styleManager.forceShowLineWeight = true
    const fat = styleManager.getLineMaterial(traits)
    expect(fat).toBeInstanceOf(LineMaterial)
    expect((fat as LineMaterial).linewidth).toBeCloseTo(211 / 40)
  })
})
