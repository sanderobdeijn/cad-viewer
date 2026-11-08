import { AcCmColor } from '@mlightcad/common'
import type { AcGiDrawable } from '@mlightcad/graphic-interface'

import { AcTrEntityDisplayController } from '../src/view/AcTrEntityDisplayController'
import { AcTrLayer } from '../src/view/AcTrLayer'

function createDbEntity(
  objectId: string,
  layer: string,
  visibility = true
): AcGiDrawable {
  return { objectId, layer, visibility } as AcGiDrawable
}

describe('AcTrEntityDisplayController', () => {
  it('skips entities on off or frozen layers while keeping entity visibility separate', () => {
    const offLayer = {
      name: 'off',
      isOff: true,
      isFrozen: false,
      color: new AcCmColor()
    }
    const frozenLayer = {
      name: 'frozen',
      isOff: false,
      isFrozen: true,
      color: new AcCmColor()
    }
    const onLayer = {
      name: 'on',
      isOff: false,
      isFrozen: false,
      color: new AcCmColor()
    }

    const controller = new AcTrEntityDisplayController(name =>
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

  it('matches AcTrLayer visibility resolution for drawable layers', () => {
    const layerInfo = {
      name: '0',
      isOff: false,
      isFrozen: false,
      color: new AcCmColor()
    }
    const controller = new AcTrEntityDisplayController(() => layerInfo)

    expect(AcTrLayer.isLayerVisible(layerInfo)).toBe(true)
    expect(controller.shouldConvert({ visibility: true, layer: '0' })).toBe(
      true
    )
  })

  it('includes off-layer entities for export conversion', () => {
    const offLayer = {
      name: 'off',
      isOff: true,
      isFrozen: false,
      color: new AcCmColor()
    }
    const controller = new AcTrEntityDisplayController(() => offLayer)

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
