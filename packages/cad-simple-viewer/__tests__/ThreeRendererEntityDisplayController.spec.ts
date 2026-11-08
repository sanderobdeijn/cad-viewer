import { CommonColor } from '@mlightcad/common'
import type { GraphicsInterfaceDrawable } from '@mlightcad/graphic-interface'

import { ThreeRendererEntityDisplayController } from '../src/view/ThreeRendererEntityDisplayController'
import { ThreeRendererLayer } from '../src/view/ThreeRendererLayer'

function createDbEntity(
  objectId: string,
  layer: string,
  visibility = true
): GraphicsInterfaceDrawable {
  return { objectId, layer, visibility } as GraphicsInterfaceDrawable
}

describe('ThreeRendererEntityDisplayController', () => {
  it('skips entities on off or frozen layers while keeping entity visibility separate', () => {
    const offLayer = {
      name: 'off',
      isOff: true,
      isFrozen: false,
      color: new CommonColor()
    }
    const frozenLayer = {
      name: 'frozen',
      isOff: false,
      isFrozen: true,
      color: new CommonColor()
    }
    const onLayer = {
      name: 'on',
      isOff: false,
      isFrozen: false,
      color: new CommonColor()
    }

    const controller = new ThreeRendererEntityDisplayController(name =>
      name === 'off' ? offLayer : name === 'frozen' ? frozenLayer : onLayer
    )

    expect(controller.shouldConvert({ visibility: true, layer: 'off' })).toBe(
      false
    )
    expect(
      controller.shouldConvert({ visibility: true, layer: 'frozen' })
    ).toBe(false)
    expect(controller.shouldConvert({ visibility: false, layer: 'on' })).toBe(
      false
    )
    expect(controller.shouldConvert({ visibility: true, layer: 'on' })).toBe(
      true
    )
  })

  it('matches ThreeRendererLayer visibility resolution for drawable layers', () => {
    const layerInfo = {
      name: '0',
      isOff: false,
      isFrozen: false,
      color: new CommonColor()
    }
    const controller = new ThreeRendererEntityDisplayController(() => layerInfo)

    expect(ThreeRendererLayer.isLayerVisible(layerInfo)).toBe(true)
    expect(controller.shouldConvert({ visibility: true, layer: '0' })).toBe(
      true
    )
  })

  it('includes off-layer entities for export conversion', () => {
    const offLayer = {
      name: 'off',
      isOff: true,
      isFrozen: false,
      color: new CommonColor()
    }
    const controller = new ThreeRendererEntityDisplayController(() => offLayer)

    expect(controller.shouldConvert({ visibility: true, layer: 'off' })).toBe(
      false
    )
    expect(
      controller.shouldConvertForExport({ visibility: true, layer: 'off' })
    ).toBe(true)
    expect(
      controller.shouldConvertForExport({ visibility: false, layer: 'off' })
    ).toBe(false)
  })
})
