import { ApplicationContext } from '../app'
import { EditorCommand, EditorCorsorType, EditorViewMode } from '../editor'

/**
 * Command for enabling pan mode in the CAD viewer.
 *
 * This command switches the view to pan mode, allowing users to drag
 * and move the drawing around the canvas. When executed, it:
 * - Sets the view mode to PAN
 * - Changes the cursor to a grab cursor for visual feedback
 *
 * Pan mode allows users to click and drag to move the viewport,
 * providing an intuitive way to navigate large drawings.
 *
 * @example
 * ```typescript
 * const panCmd = new ApplicationPanCmd();
 * panCmd.execute(context); // Enables pan mode
 * ```
 */
export class ApplicationPanCmd extends EditorCommand {
  /**
   * Executes the pan command.
   *
   * Sets the view to pan mode and updates the cursor appearance
   * to indicate that panning is active.
   *
   * @param context - The application context containing the view
   */
  async execute(context: ApplicationContext) {
    context.view.mode = EditorViewMode.PAN
    context.view.setCursor(EditorCorsorType.Grab)
  }
}
