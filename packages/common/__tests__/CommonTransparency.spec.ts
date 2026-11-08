import { CommonTransparency, CommonTransparencyMethod } from '../src'

describe('CommonTransparency', () => {
  it('serializes and deserializes state', () => {
    const t = new CommonTransparency(128)
    expect(t.isByAlpha).toBe(true)
    expect(t.percentage).toBe(50)

    t.percentage = 100
    expect(t.alpha).toBe(0)
    expect(t.isClear).toBe(true)

    const encoded = t.serialize()
    const restored = CommonTransparency.deserialize(encoded)
    expect(restored.method).toBe(CommonTransparencyMethod.ByAlpha)
    expect(restored.percentage).toBe(100)
    expect(restored.alpha).toBe(t.alpha)
    expect(restored.toString()).toBe('0')

    const byLayer = CommonTransparency.fromString('ByLayer')
    expect(byLayer.method).toBe(CommonTransparencyMethod.ByLayer)
  })

  it('covers method/alpha setters and state predicates', () => {
    const t = new CommonTransparency()
    expect(t.method).toBe(CommonTransparencyMethod.ByLayer)
    expect(t.isByLayer).toBe(true)
    expect(t.percentage).toBeUndefined()

    t.method = CommonTransparencyMethod.ByBlock
    expect(t.isByBlock).toBe(true)
    expect(t.toString()).toBe('ByBlock')

    t.alpha = 999
    expect(t.alpha).toBe(255)
    expect(t.isSolid).toBe(true)

    t.alpha = -5
    expect(t.alpha).toBe(0)
    expect(t.isClear).toBe(true)
  })

  it('supports clone/equals/fromString-invalid/deserialize-invalid', () => {
    const source = new CommonTransparency(42)
    const cloned = source.clone()
    expect(cloned.equals(source)).toBe(true)

    const byBlock = CommonTransparency.fromString('ByBlock')
    expect(byBlock.isByBlock).toBe(true)

    const percentage = CommonTransparency.fromString('25')
    expect(percentage.percentage).toBe(25)

    const alpha = CommonTransparency.fromString('128')
    expect(alpha.alpha).toBe(128)

    const useCurrent = CommonTransparency.fromString('use current')
    expect(useCurrent.isByLayer).toBe(true)

    const invalid = CommonTransparency.fromString('bad-value')
    expect(invalid.isInvalid).toBe(true)

    const invalidMethodEncoded = 0xff0000ff
    const decoded = CommonTransparency.deserialize(invalidMethodEncoded)
    expect(decoded.isInvalid).toBe(true)
    expect(decoded.alpha).toBe(255)
  })
})
