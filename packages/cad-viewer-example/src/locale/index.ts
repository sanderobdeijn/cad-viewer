import { AcApI18n } from '@mlightcad/cad-simple-viewer'

import en from './en'

export const initializeLocale = () => {
  AcApI18n.mergeLocaleMessage('en', en)
}
