import { ApplicationI18n } from '@mlightcad/cad-simple-viewer'
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

ApplicationI18n.mergeLocaleMessage('en', messages.en)

export const i18n = createI18n({
  legacy: false,
  messages: ApplicationI18n.messages,
  locale: 'en',
  fallbackLocale: 'en',
  allowComposition: true,
  globalInjection: true
})

/**
 * vue-i18n follows {@link ApplicationI18n} — never the other way around.
 * All locale changes must go through {@link ApplicationI18n.setCurrentLocale}.
 */
ApplicationI18n.events.localeChanged.addEventListener(args => {
  i18n.global.locale.value = args.new
})

export const entityName = (type: string) => {
  const t = i18n.global.t
  const key = 'entity.entityName.' + type
  return t(key, type, { missingWarn: false })
}

export default i18n
