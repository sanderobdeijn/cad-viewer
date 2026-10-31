import { store } from '../app/store'
import { useMissedData } from './useMissedData'

export type MissingResourceTab = 'font' | 'xref'

/**
 * Picks the best Missing Resources sub-tab for the current missed-data set.
 * Prefer `xref` when unresolved xrefs are present.
 */
export function resolveMissingResourceTab(
  preferred?: MissingResourceTab
): MissingResourceTab {
  const { fonts, xrefs } = useMissedData()
  const hasExternalRefs = xrefs.length > 0

  if (preferred === 'font' && fonts.size > 0) return 'font'
  if (preferred === 'xref' && hasExternalRefs) return 'xref'

  if (fonts.size > 0) return 'font'
  if (hasExternalRefs) return 'xref'
  return preferred ?? 'font'
}

/**
 * Opens the tool palette on the Missing / External Resources tab.
 */
export function openMissingResourcesPalette(preferred?: MissingResourceTab) {
  store.dialogs.activePaletteTab = 'missingResources'
  store.dialogs.activeMissingResourceTab = resolveMissingResourceTab(preferred)
  store.dialogs.layerManager = true
}
