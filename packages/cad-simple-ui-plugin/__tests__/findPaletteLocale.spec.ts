import { en } from '../src/i18n/en'

const locales: Record<string, Record<string, string>> = { en }
const findKeys = Object.keys(en).filter(key => key.startsWith('findPalette.'))

describe('Find palette locale messages', () => {
  it('defines every hit type, including block, dimension, leader and table', () => {
    for (const kind of [
      'text',
      'mtext',
      'attribute',
      'block',
      'dimension',
      'leader',
      'table'
    ]) {
      expect(findKeys).toContain(`findPalette.kind.${kind}`)
    }
    expect(findKeys).toContain('findPalette.unnamedLayout')
  })

  it.each(Object.keys(locales))(
    '%s has a non-empty message for every Find key',
    code => {
      const messages = locales[code]
      for (const key of findKeys) {
        expect(typeof messages[key]).toBe('string')
        expect(messages[key].trim()).not.toBe('')
      }
    }
  )

  it.each(Object.keys(locales))(
    '%s keeps the {count} / {layouts} / {layout} placeholders of the English messages',
    code => {
      const placeholders = (text: string) =>
        (text.match(/\{\w+\}/g) ?? []).sort().join(',')
      for (const key of findKeys) {
        expect(placeholders(locales[code][key])).toBe(placeholders(en[key]))
      }
    }
  )

  it.each(['hint', 'hintLayout'])(
    'the %s message names the text found in blocks, dimensions, leaders and tables',
    name => {
      expect(en[`findPalette.${name}`]).toMatch(
        /blocks, dimensions, leaders and tables/
      )
    }
  )
})
