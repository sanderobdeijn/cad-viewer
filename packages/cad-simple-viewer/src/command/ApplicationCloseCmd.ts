import { ApplicationContext, ApplicationDocManager } from '../app'
import { EditorCommand } from '../editor'

/**
 * Closes the current drawing, or the last remaining drawing after which a
 * new untitled document is created.
 */
export class ApplicationCloseCmd extends EditorCommand {
  /**
   * Closes the current drawing via {@link ApplicationDocManager.closeDocument}.
   *
   * @param _context - Unused; the command always targets the active document.
   */
  async execute(_context: ApplicationContext) {
    await ApplicationDocManager.instance.closeDocument()
  }
}
