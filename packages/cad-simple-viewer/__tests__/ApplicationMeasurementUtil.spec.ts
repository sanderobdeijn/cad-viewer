import { CommonColor, CommonColorMethod } from '@mlightcad/common'
import { GraphicsInterfaceLineWeight } from '@mlightcad/graphic-interface'

import {
  applicationCssColor,
  applicationCssToMeasurementColor,
  applicationGetCurrentMeasurementStyle,
  applicationGetMeasurementColor,
  applicationGetMeasurementFontSize,
  applicationMeasurementCanvasLineWidth,
  MEASUREMENT_FONT_SIZE,
  MEASUREMENT_LINE_WEIGHT
} from '../src/util/ApplicationMeasurementUtil'
import { useTestSettings } from './helpers/settings'

describe('ApplicationMeasurementUtil', () => {
  beforeEach(() => {
    useTestSettings()
  })

  it('defaults to hairline line weight and factory font size', () => {
    expect(MEASUREMENT_LINE_WEIGHT).toBe(0)
    expect(applicationGetMeasurementFontSize()).toBe(MEASUREMENT_FONT_SIZE)
    expect(applicationGetCurrentMeasurementStyle().lineWeight).toBe(0)
  })

  it('maps CAD line weight 070 to a 2.5px canvas stroke', () => {
    expect(
      applicationMeasurementCanvasLineWidth(GraphicsInterfaceLineWeight.LineWeight070)
    ).toBeCloseTo(2.5)
  })

  it('maps hairline to a 0 canvas width sentinel', () => {
    expect(applicationMeasurementCanvasLineWidth(0 as GraphicsInterfaceLineWeight)).toBe(0)
  })
})

describe('applicationCssToMeasurementColor', () => {
  it('restores ACI yellow after a CSS round-trip', () => {
    const yellow = new CommonColor(CommonColorMethod.ByACI, 2)
    const restored = applicationCssToMeasurementColor(applicationCssColor(yellow))
    expect(restored.isByACI).toBe(true)
    expect(restored.colorIndex).toBe(2)
  })

  it('maps CSS rgb/hex values that match the ACI palette back to ByACI', () => {
    const rgb = applicationCssToMeasurementColor('rgb(255,0,0)')
    expect(rgb.isByACI).toBe(true)
    expect(rgb.colorIndex).toBe(1)

    const hex = applicationCssToMeasurementColor('#00FF00')
    expect(hex.isByACI).toBe(true)
    expect(hex.colorIndex).toBe(3)
  })

  it('keeps true-color RGB that is not in the ACI palette', () => {
    const custom = applicationCssToMeasurementColor('rgb(12,34,56)')
    expect(custom.isByColor).toBe(true)
    expect(custom.red).toBe(12)
    expect(custom.green).toBe(34)
    expect(custom.blue).toBe(56)
  })

  it('parses rgb() without spaces ', () => {
    const color = applicationCssToMeasurementColor('rgb(96,165,250)')
    expect(color.red).toBe(96)
    expect(color.green).toBe(165)
    expect(color.blue).toBe(250)
  })

  it('parses CSS hex without logging Unknown color name', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation()
    const color = applicationCssToMeasurementColor('#d51572')
    expect(color.red).toBe(0xd5)
    expect(color.green).toBe(0x15)
    expect(color.blue).toBe(0x72)
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
