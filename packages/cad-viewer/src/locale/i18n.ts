import { AcApI18n } from '@mlightcad/cad-simple-viewer'
import { AcDbEntity } from '@mlightcad/data-model'
import { createI18n } from 'vue-i18n'

import enCommand from './en/command'
import enDialog from './en/dialog'
import enEntity from './en/entity'
import enMain from './en/main'

const messages = {
  en: {
    main: enMain,
    command: enCommand,
    dialog: enDialog,
    entity: enEntity
  }

}

AcApI18n.mergeLocaleMessage('en', messages.en)

export const i18n = createI18n({
  legacy: false,
  messages: AcApI18n.messages,
  locale: 'en',
  fallbackLocale: 'en',
  allowComposition: true,
  globalInjection: true
})

/**
 * vue-i18n follows {@link AcApI18n} — never the other way around.
 * All locale changes must go through {@link AcApI18n.setCurrentLocale}.
 */
AcApI18n.events.localeChanged.addEventListener(args => {
  i18n.global.locale.value = args.new
})

export const entityName = (entity: AcDbEntity) => {
  const t = i18n.global.t
  const key = 'entity.entityName.' + entity.type
  return t(key, entity.type, { missingWarn: false })
}

export const entityPropName = (name: string) => {
  const t = i18n.global.t
  const key = 'entity.property.' + name
  return t(key, name, { missingWarn: false })
}

export const entityPropEnum = (name: string) => {
  const t = i18n.global.t
  const key = 'entity.enum.' + name
  return t(key, name, { missingWarn: true })
}

export const colorName = (colorKeyName: string) => {
  const value = colorKeyName.trim()

  // Numeric values are AutoCAD Color Index (ACI) values.
  // They are identifiers, not locale message keys.
  if (/^\d+$/.test(value)) {
    return value
  }

  if (value === 'ByLayer' || value === 'ByBlock') {
    return value
  }

  const t = i18n.global.t
  const key = 'entity.color.' + value.toLowerCase()
  return t(key, value, {
    missingWarn: false,
    fallbackWarn: false
  })
}
export const toolPaletteTitle = (name: string) => {
  const t = i18n.global.t
  const key = `main.toolPalette.${name}.title`
  return t(key, name, { missingWarn: false })
}

export const toolPaletteTabName = (name: string) => {
  const t = i18n.global.t
  const key = `main.toolPalette.${name}.tab`
  return t(key, name, { missingWarn: false })
}

export default i18n
