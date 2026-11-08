import { ApplicationContext, EditorCommand } from '@mlightcad/cad-simple-viewer'

import { openMissingResourcesPalette } from '../composable'

/**
 * Opens the Missing / External Resources palette (fonts, images, xrefs).
 */
export class ApplicationMissedDataCmd extends EditorCommand {
  async execute(_context: ApplicationContext) {
    openMissingResourcesPalette()
  }
}
