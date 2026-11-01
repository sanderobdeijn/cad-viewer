import { store } from '../app/store'

/**
 * Opens the tool palette on the Missing Resources tab.
 */
export function openMissingResourcesPalette() {
  store.dialogs.activePaletteTab = 'missingResources'
  store.dialogs.toolPalette = true
}
