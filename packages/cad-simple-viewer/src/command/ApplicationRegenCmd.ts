import { ApplicationDocManager } from '../app'
import { EditorCommand } from '../editor'

/**
 * Command to redraw the current drawing in the CAD viewer.
 *
 * This command redraws the current drawing. It can be used after users set font
 * mapping for missed fonts so that the current drawing can display texts with
 * correct fonts.
 *
 * @example
 * ```typescript
 * const regenCmd = new ApplicationRegenCmd();
 * regenCmd.execute(context); // Redraw the current drawing
 * ```
 */
export class ApplicationRegenCmd extends EditorCommand {
  /**
   * Executes the regen command to redraw the current drawing
   */
  async execute() {
    ApplicationDocManager.instance.regen()
  }
}
