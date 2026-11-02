import { createI18n } from 'vue-i18n'

import enCommand from '../src/locale/en/command'
import enMain from '../src/locale/en/main'

const mains = { en: enMain }
type Find = typeof enMain.toolPalette.find
const findOf = (code: keyof typeof mains) =>
  mains[code].toolPalette.find as unknown as Record<string, unknown>

const KINDS = [
  'text',
  'mtext',
  'attribute',
  'block',
  'dimension',
  'leader',
  'table'
]

const create = (locale: keyof typeof mains) =>
  createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'en',
    missingWarn: false,
    fallbackWarn: false,
    messages: Object.fromEntries(
      Object.entries(mains).map(([code, main]) => [code, { main }])
    )
  }).global

describe('Find palette locale messages (cad-viewer)', () => {
  it.each(Object.keys(mains) as Array<keyof typeof mains>)(
    '%s translates every hit type, so no raw key is shown',
    code => {
      const { t } = create(code)
      for (const kind of KINDS) {
        const key = `main.toolPalette.find.kind.${kind}`
        const value = t(key)
        expect(value).not.toBe(key)
        expect(value.trim()).not.toBe('')
      }
      expect(t('main.toolPalette.find.unnamedLayout')).not.toBe(
        'main.toolPalette.find.unnamedLayout'
      )
    }
  )

  it('falls back to English when a locale lacks a hit type', () => {
    const i18n = createI18n({
      legacy: false,
      locale: 'xx',
      fallbackLocale: 'en',
      missingWarn: false,
      fallbackWarn: false,
      messages: { en: { main: enMain }, xx: { main: { toolPalette: {} } } }
    }).global
    expect(i18n.t('main.toolPalette.find.kind.table')).toBe('Table')
    expect(i18n.t('main.toolPalette.find.kind.block')).toBe('Block text')
  })

  it.each(Object.keys(mains) as Array<keyof typeof mains>)(
    '%s keeps the Find keys and placeholders of the English messages',
    code => {
      const en = findOf('en')
      const loc = findOf(code)
      for (const key of Object.keys(en)) {
        if (key === 'kind') continue
        expect(typeof loc[key]).toBe('string')
        // Plural forms repeat a placeholder; compare the set of names.
        const placeholders = (s: unknown) =>
          [...new Set(String(s).match(/\{\w+\}/g) ?? [])].sort().join(',')
        expect(placeholders(loc[key])).toBe(placeholders(en[key]))
      }
    }
  )

  it.each(['hint', 'hintLayout'] as Array<keyof Find>)(
    'the %s message names blocks, dimensions, leaders and tables',
    key => {
      expect(enMain.toolPalette.find[key]).toMatch(
        /blocks, dimensions, leaders and tables/
      )
    }
  )

  it('the FIND command description is no longer attribute-only', () => {
    expect(enCommand.ACAD.find.description).toMatch(
      /blocks, dimensions, leaders and tables/
    )
  })
})
