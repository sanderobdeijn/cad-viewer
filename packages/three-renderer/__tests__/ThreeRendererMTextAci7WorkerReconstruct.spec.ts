import { CommonColor } from '@mlightcad/common'
import { GRAPHICS_INTERFACE_LIGHT_THEME_FOREGROUND } from '@mlightcad/graphic-interface'
import { MTextColor } from '@mlightcad/mtext-parser'
import {
  buildWorkerMaterialColorSettings,
  serializeMTextColor
} from '@mlightcad/mtext-renderer'
import * as THREE from 'three'

import { getMaterialMetadata } from '../src/style/ThreeRendererMaterialMetadata'
import { ThreeRendererStyleManager } from '../src/style/ThreeRendererStyleManager'
import { ThreeRendererSubEntityTraitsUtil } from '../src/util/ThreeRendererEntityTraitsUtil'
import { ThreeRendererMTextColorUtil } from '../src/util/ThreeRendererMTextColorUtil'

/**
 * End-to-end regression for entity ACI-7 MTEXT after worker reconstruct:
 * materials must track foreground so switchbg can invert white↔black.
 */
describe('ACI-7 MTEXT worker reconstruct → foreground materials', () => {
  it('reconstructed ACI-7 ColorSettings produce isForeground materials that invert', () => {
    const styleManager = new ThreeRendererStyleManager()
    styleManager.currentBackgroundColor = 0x000000

    const base = {
      layer: 'NOTES',
      color: new MTextColor(7),
      byLayerColor: 0xffffff,
      byBlockColor: 0xffffff
    }

    // New processor path: serialize keeps aci=7.
    const fromAci = buildWorkerMaterialColorSettings(
      base,
      0xffffff,
      false,
      serializeMTextColor(new MTextColor(7))
    )
    expect(fromAci.color.aci).toBe(7)

    // Old bake path: rgb white payload must still recover entity ACI 7.
    const baked = new MTextColor()
    baked.rgbValue = 0xffffff
    const fromBaked = buildWorkerMaterialColorSettings(
      base,
      0xffffff,
      false,
      serializeMTextColor(baked)
    )
    expect(fromBaked.color.aci).toBe(7)

    const traits = ThreeRendererSubEntityTraitsUtil.createTraitsForMText(fromAci)
    expect(traits.color.isForeground).toBe(true)

    const material = styleManager.getMTextFillMaterial(traits)
    expect(getMaterialMetadata(material).isForeground).toBe(true)
    expect((material as THREE.MeshBasicMaterial).color.getHex()).toBe(0xffffff)

    styleManager.currentBackgroundColor = 0xffffff
    expect((material as THREE.MeshBasicMaterial).color.getHex()).toBe(
      GRAPHICS_INTERFACE_LIGHT_THEME_FOREGROUND
    )
    expect((material as THREE.MeshBasicMaterial).color.getHex()).toBe(0x000000)
  })

  it('keeps serialized ACI 255 absolute across background switch', () => {
    const styleManager = new ThreeRendererStyleManager()
    styleManager.currentBackgroundColor = 0x000000

    const base = {
      layer: 'NOTES',
      color: new MTextColor(7),
      byLayerColor: 0xffffff,
      byBlockColor: 0xffffff
    }
    const settings = buildWorkerMaterialColorSettings(base, 0xffffff, false, {
      aci: 255
    })
    expect(settings.color.aci).toBe(255)

    const traits = ThreeRendererSubEntityTraitsUtil.createTraitsForMText(settings)
    expect(traits.color.isForeground).toBe(false)

    const material = styleManager.getMTextFillMaterial(traits)
    expect(getMaterialMetadata(material).isForeground).toBe(false)

    styleManager.currentBackgroundColor = 0xffffff
    expect((material as THREE.MeshBasicMaterial).color.getHex()).toBe(0xffffff)
  })

  it('toAcCmColor from worker ACI 7 matches setForeground entity traits', () => {
    const color = ThreeRendererMTextColorUtil.toAcCmColor(new MTextColor(7))
    expect(color.isForeground).toBe(true)

    const explicit = new CommonColor().setForeground()
    expect(explicit.isForeground).toBe(true)
    expect(color.colorIndex).toBe(explicit.colorIndex)
  })
})
