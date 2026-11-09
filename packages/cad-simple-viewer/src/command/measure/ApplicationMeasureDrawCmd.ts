import type { ApplicationContext } from '../../app/ApplicationContext'
import { EditorCommand } from '../../editor/command/EditorCommand'
import { EditorOpenMode } from '../../editor/view/EditorOpenMode'
import { withDrawOverlayInput } from '../ApplicationDrawOverlayInput'

/**
 * Shared input session for commands that create measurement overlays.
 *
 * Selection mode + crosshair, matching the historical wrap in each
 * measure-draw command.
 */
export const withMeasureInput = withDrawOverlayInput

/**
 * Base class for commands that create measurement overlays.
 *
 * Sets Read mode. Clear and visibility stay on {@link EditorCommand}.
 */
export abstract class ApplicationMeasureDrawCmd extends EditorCommand {
  constructor() {
    super()
    this.mode = EditorOpenMode.Read
  }

  /** Run a measure-draw body inside selection mode + crosshair cursor. */
  protected withMeasureInput(
    context: ApplicationContext,
    fn: () => Promise<void>
  ): Promise<void> {
    return withDrawOverlayInput(context, fn)
  }
}
