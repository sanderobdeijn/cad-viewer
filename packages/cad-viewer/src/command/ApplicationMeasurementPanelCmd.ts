import { ApplicationContext, EditorCommand } from '@mlightcad/cad-simple-viewer'

import { store } from '../app'

/**
 * Opens the measurement list palette.
 */
export class ApplicationMeasurementPanelCmd extends EditorCommand {
  async execute(_context: ApplicationContext) {
    store.dialogs.activePaletteTab = 'measurements'
    store.dialogs.toolPalette = true
  }
}
