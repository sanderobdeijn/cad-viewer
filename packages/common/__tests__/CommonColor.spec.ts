import { CommonColor, CommonColorMethod, CommonColorUtil } from '../src'

describe('CommonColor', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('handles constructor branches for ByColor and ByACI', () => {
    const byColorDefault = new CommonColor(CommonColorMethod.ByColor)
    expect(byColorDefault.RGB).toBe(0xffffff)

    const byAciDefault = new CommonColor(CommonColorMethod.ByACI)
    expect(byAciDefault.colorIndex).toBe(8)

    const byAciZero = new CommonColor(CommonColorMethod.ByACI, 0)
    expect(byAciZero.isByBlock).toBe(true)

    const byAciLayer = new CommonColor(CommonColorMethod.ByACI, 256)
    expect(byAciLayer.isByLayer).toBe(true)
  })

  it('covers constructor/default branches and colorMethod setter', () => {
    const byLayerDefault = new CommonColor()
    expect(byLayerDefault.colorMethod).toBe(CommonColorMethod.ByLayer)
    expect(byLayerDefault.RGB).toBeUndefined()

    byLayerDefault.colorMethod = 999 as CommonColorMethod
    expect(byLayerDefault.RGB).toBeUndefined()
    expect(byLayerDefault.hexColor).toBeUndefined()
    expect(byLayerDefault.cssColor).toBeUndefined()
    expect(byLayerDefault.cssColorAlpha(0.5)).toBeUndefined()
    expect(byLayerDefault.colorName).toBeUndefined()
    expect(byLayerDefault.toString()).toBe('')
  })

  it('supports RGB setters and CSS conversion helpers', () => {
    const color = new CommonColor()
      .setRGB(255, -10, 260)
      .setRGBFromCss('#00ff00')
      .setRGBFromCss('#f0f')
      .setRGBFromCss('rgba(1,2,3,0.5)')
      .setRGBFromCss('red')

    expect(color.colorMethod).toBe(CommonColorMethod.ByColor)
    expect(color.red).toBe(255)
    expect(color.green).toBe(0)
    expect(color.blue).toBe(0)
    expect(color.cssColor).toBe('rgb(255,0,0)')
    expect(color.cssColorAlpha(0.25)).toBe('rgba(255,0,0,0.25)')
    expect(color.hexColor).toBe('0xFF0000')
  })

  it('supports setRGBValue, setScalar, and warns for invalid values', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const color = new CommonColor().setRGBValue(0x123456).setScalar(17)

    expect(color.hexColor).toBe('0x111111')
    expect(color.isByColor).toBe(true)
    expect(new CommonColor(CommonColorMethod.ByColor, 1).colorIndex).toBeUndefined()

    color.setRGBValue(undefined)
    expect(warn).toHaveBeenCalled()
  })

  it('warns for invalid CSS inputs', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const color = new CommonColor().setRGBFromCss('#12')

    color.setRGBFromCss('unknown-css-color')

    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('supports ACI/layer/block/foreground mode switches', () => {
    const color = new CommonColor()

    color.colorIndex = 1
    expect(color.isByACI).toBe(true)
    expect(color.RGB).toBe(CommonColorUtil.getColorByIndex(1))

    color.setForeground()
    expect(color.isForeground).toBe(true)
    expect(color.colorIndex).toBe(7)

    color.colorIndex = 0
    expect(color.isByBlock).toBe(true)
    expect(color.colorIndex).toBe(0)

    color.colorIndex = 256
    expect(color.isByLayer).toBe(true)
    expect(color.colorIndex).toBe(256)

    color.setByLayer()
    expect(color.colorName).toBe('ByLayer')
    color.setByBlock()
    expect(color.colorName).toBe('ByBlock')
  })

  it('supports setByLayer/setByBlock with explicit values and ignores undefined colorIndex input', () => {
    const color = new CommonColor()
    color.setByLayer(123)
    expect(color.toString()).toBe('ByLayer')

    color.setByBlock(456)
    expect(color.toString()).toBe('ByBlock')

    color.colorIndex = undefined
    expect(color.isByBlock).toBe(true)
  })

  it('supports None color method with toString and fromString', () => {
    const noneColor = new CommonColor(CommonColorMethod.None)
    expect(noneColor.colorMethod).toBe(CommonColorMethod.None)
    expect(noneColor.toString()).toBe('None')

    const parsedNone = CommonColor.fromString('None')
    expect(parsedNone?.colorMethod).toBe(CommonColorMethod.None)
    expect(parsedNone?.toString()).toBe('None')

    const parsedNoneUpperCase = CommonColor.fromString('NONE')
    expect(parsedNoneUpperCase?.colorMethod).toBe(CommonColorMethod.None)
    expect(parsedNoneUpperCase?.toString()).toBe('None')

    const clonedNone = noneColor.clone()
    expect(clonedNone.colorMethod).toBe(CommonColorMethod.None)
    expect(clonedNone.equals(noneColor)).toBe(true)
  })

  it('supports colorName getter/setter, clone/copy/equals, and toString', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const color = new CommonColor(CommonColorMethod.ByACI, 1)
    expect(color.colorName).toBe(CommonColorUtil.getNameByIndex(1))

    color.colorName = 'red'
    expect(color.hexColor).toBe('0xFF0000')
    expect(color.toString()).toBe('RGB:255,0,0')

    color.colorIndex = 30
    expect(color.toString()).toBe('30')

    const copied = new CommonColor().copy(color)
    expect(copied.equals(color)).toBe(true)
    expect(color.clone().equals(color)).toBe(true)

    color.colorName = 'not-a-known-color'
    color.colorName = undefined
    expect(warn).toHaveBeenCalled()
  })

  it('returns empty string when ByColor value is 0', () => {
    const color = new CommonColor(CommonColorMethod.ByColor, 0)
    expect(color.toString()).toBe('')
    expect(color.colorName).toBe('')
  })

  it('parses colors from string for supported formats', () => {
    expect(CommonColor.fromString('None')?.colorMethod).toBe(CommonColorMethod.None)
    expect(CommonColor.fromString('ByLayer')?.isByLayer).toBe(true)
    expect(CommonColor.fromString('ByBlock')?.isByBlock).toBe(true)
    expect(CommonColor.fromString('RGB:255,0,0')?.hexColor).toBe('0xFF0000')
    expect(CommonColor.fromString('255,0,0')?.hexColor).toBe('0xFF0000')
    expect(CommonColor.fromString('1')?.isByACI).toBe(true)
    expect(CommonColor.fromString('Book$red')?.hexColor).toBe('0xFF0000')
    expect(CommonColor.fromString('red')?.hexColor).toBe('0xFF0000')
  })

  it('returns undefined for invalid fromString input and warns', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    expect(CommonColor.fromString('')).toBeUndefined()
    expect(CommonColor.fromString('Book$unknown-color-name')).toBeUndefined()
    expect(CommonColor.fromString('unknown-color-name')).toBeUndefined()
    expect(warn).toHaveBeenCalled()
  })
})
