import { CommonColorUtil } from '../src'

describe('CommonColorUtil', () => {
  it('converts index/color/name in both directions', () => {
    expect(CommonColorUtil.getColorByIndex(1)).toBe(0xff0000)
    expect(CommonColorUtil.getIndexByColor(0xff0000)).toBe(1)
    expect(CommonColorUtil.getColorByName('Red')).toBe(0xff0000)
    expect(CommonColorUtil.getNameByColor(0xff0000)).toBe('red')
    expect(CommonColorUtil.getNameByIndex(1)).toBe('red')
  })

  it('returns undefined when no mapping exists', () => {
    expect(CommonColorUtil.getColorByIndex(9999)).toBeUndefined()
    expect(CommonColorUtil.getIndexByColor(0x123456)).toBeUndefined()
    expect(CommonColorUtil.getColorByName('not-a-color')).toBeUndefined()
    expect(CommonColorUtil.getNameByColor(0x123456)).toBeUndefined()
    expect(CommonColorUtil.getNameByIndex(9999)).toBeUndefined()
  })
})
